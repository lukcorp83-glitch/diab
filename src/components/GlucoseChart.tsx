import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry, UserSettings } from '../types';
import { MLAnalyzer } from '../services/mlSugarAnalyzer';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ReferenceLine,
  Tooltip,
  Area
} from 'recharts';
import { Plus, Minus, Maximize2, Move } from 'lucide-react';

// Insulin on Board calculation using a more realistic decay model
const calculateIOBAt = (time: number, boluses: LogEntry[], diaHours: number) => {
  const diaMs = diaHours * 60 * 60 * 1000;
  return boluses.reduce((sum, b) => {
    const timeSince = time - b.timestamp;
    if (timeSince < 0 || timeSince >= diaMs) return sum;
    
    const x = timeSince / diaMs;
    // Cubic decay for realistic sigmoid shape
    const remaining = Math.max(0, 1 - (3 * Math.pow(x, 2) - 2 * Math.pow(x, 3)));
    
    return sum + b.value * remaining;
  }, 0);
};

// Insulin Activity Profile (Action Curve) - peaks around 60-90 min then decays
const calculateActivityAt = (time: number, boluses: LogEntry[], diaHours: number) => {
  const diaMs = diaHours * 60 * 60 * 1000;
  return boluses.reduce((sum, b) => {
    const timeSince = time - b.timestamp;
    if (timeSince < 0 || timeSince >= diaMs) return sum;
    
    const x = timeSince / diaMs;
    // A skewed curve that peaks around 0.2-0.25 (approx 1h for 4h DIA)
    // and returns to 0 at the end of DIA.
    const activity = Math.max(0, 15 * x * Math.pow(1 - x, 3));
    
    return sum + b.value * activity;
  }, 0);
};

const StackingWarning = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload.stackingWarning || isNaN(cx) || isNaN(cy)) return null;
  return null; // Removed pulse red warning as per request
};

interface GlucoseChartProps {
  logs: LogEntry[];
  hours: number;
  targetMin: number;
  targetMax: number;
  theme: 'light' | 'dark';
  settings?: UserSettings;
  showLoopSimulation?: boolean;
  showMLPrediction?: boolean;
}

const CustomGlucoseDot = (props: any) => {
  const { cx, cy, payload, targetMin, targetMax, isDark, onDotClick } = props;
  if (isNaN(cx) || isNaN(cy) || payload.glucose === undefined || payload.glucose === null) return null;
  const val = payload.glucose;
  let fill = isDark ? '#818cf8' : '#4f46e5';
  if (val < targetMin) fill = '#f59e0b'; // Amber instead of red
  else if (val > targetMax) fill = '#f59e0b';

  return (
    <circle 
      cx={cx} cy={cy} r={5} 
      fill={fill} 
      stroke={isDark ? '#0f172a' : '#ffffff'} 
      strokeWidth={2}
      onClick={(e) => {
          e.stopPropagation();
          onDotClick && onDotClick(payload.originalG);
      }}
      style={{ cursor: 'pointer', outline: 'none' }}
    />
  );
};

const CustomBolusShape = (props: any) => {
  const { cx, cy, payload, onDotClick } = props;
  if (!payload.bolusVal || isNaN(cx) || isNaN(cy)) return null;
  
  const val = payload.originalB?.value || 0;
  const h = Math.min(40, val * 5);
  return (
    <g onClick={(e) => { e.stopPropagation(); onDotClick && onDotClick(payload.originalB); }} style={{ cursor: 'pointer', outline: 'none' }}>
      <rect x={cx - 2} y={cy - h} width={4} height={h} fill="rgba(79, 70, 229, 0.4)" />
      <text x={cx} y={cy - h - 5} textAnchor="middle" fontSize={14}>💉</text>
    </g>
  );
};

const CustomMealShape = (props: any) => {
  const { cx, cy, payload, onDotClick } = props;
  if (!payload.mealVal || isNaN(cx) || isNaN(cy)) return null;

  const hasBolus = !!payload.bolusVal;
  const bolusVal = payload.originalB?.value || 0;
  const h = hasBolus ? Math.min(40, bolusVal * 5) : 0;
  
  const baseCy = cy - h - (hasBolus ? 20 : 10);

  return (
    <g onClick={(e) => { e.stopPropagation(); onDotClick && onDotClick(payload.originalM); }} style={{ cursor: 'pointer', outline: 'none' }}>
      <text x={cx} y={baseCy} textAnchor="middle" fontSize={16}>🍽️</text>
    </g>
  );
};

const LoopSimulationDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload.loopPrediction || !payload.loopAction || isNaN(cx) || isNaN(cy)) return null;
  return (
    <g>
      {payload.loopAction === 'bolus' && <text x={cx} y={cy - 8} textAnchor="middle" fontSize={12}>💉</text>}
      {payload.loopAction === 'suspend' && <rect x={cx - 4} y={cy + 8} width={8} height={8} fill="#ef4444" />}
    </g>
  );
};

const MLPredictionLabel = (props: any) => {
  const { x, y, payload, isDark, lastMlTimestamp } = props;
  if (payload.timestamp === lastMlTimestamp && payload.mlPrediction !== undefined && !isNaN(x) && !isNaN(y)) {
    return (
      <text x={x} y={y - 10} fill={isDark ? '#fcd34d' : '#b45309'} fontSize={8} fontWeight="bold" textAnchor="middle" className="uppercase tracking-widest pointer-events-none">
        GlikoSense
      </text>
    );
  }
  return null;
};

export default function GlucoseChart({ logs, hours, targetMin, targetMax, theme, settings, showLoopSimulation, showMLPrediction }: GlucoseChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<LogEntry | null>(null);
  const [mlPredictionDataState, setMlPredictionDataState] = useState<{timestamp: number, value: number}[]>([]);
  const [isMlProcessing, setIsMlProcessing] = useState(false);
  
  // Interactive View State
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = default (hours), higher = zoom in
  const [panOffsetMs, setPanOffsetMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastX, setLastX] = useState<number | null>(null);

  useEffect(() => {
    // Reset view when base hours change
    setZoomLevel(1);
    setPanOffsetMs(0);
  }, [hours]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.min(prev * 1.4, 30));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.max(prev / 1.4, 0.1));
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
    setPanOffsetMs(0);
  };

  const handleMouseDown = (e: any) => {
    if (e && e.chartX) {
      setIsDragging(true);
      setLastX(e.chartX);
    }
  };

  const handleMouseMove = (e: any) => {
    if (isDragging && e && e.chartX && lastX !== null && containerRef.current) {
      const width = containerRef.current.clientWidth || 1000;
      const rangeMs = (hours * 60 * 60 * 1000) / zoomLevel;
      const msPerPixel = rangeMs / width;
      const deltaX = e.chartX - lastX;
      setPanOffsetMs(prev => prev - (deltaX * msPerPixel));
      setLastX(e.chartX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setLastX(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Only zoom if ctrl key is pressed or just scroll? 
    // Usually on mobile it's pinch. On desktop wheel is good.
    if (Math.abs(e.deltaY) > 0) {
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoomLevel(prev => {
        const next = prev * factor;
        return Math.max(0.1, Math.min(30, next));
      });
    }
  };

  const { chartData, chartMinY, chartMaxY, now, lastMlTimestamp, xAxisTicks, start, end } = useMemo(() => {
    let now = Date.now();
    
    // Logic for 'now' focus
    if (logs.length > 0) {
      const gLogs = logs.filter(l => l.type === 'glucose');
      if (gLogs.length > 0) {
        let latestLogTime = 0;
        for (const l of gLogs) {
           if (l.timestamp > latestLogTime) latestLogTime = l.timestamp;
        }
        if (Date.now() - latestLogTime > 2 * 60 * 60 * 1000) {
          now = latestLogTime + 30 * 60 * 1000;
        }
      }
    }

    const predictionTime = 2 * 60 * 60 * 1000;
    const baseRangeMs = hours * 60 * 60 * 1000;
    const rangeMs = baseRangeMs / zoomLevel;
    
    const totalMs = (showMLPrediction || showLoopSimulation) ? rangeMs + predictionTime : rangeMs;
    const start = now - rangeMs + panOffsetMs;
    const end = start + totalMs;

    const dataG = logs.filter(l => l.type === 'glucose' && l.timestamp >= start - rangeMs).sort((a, b) => a.timestamp - b.timestamp);
    const dataB = logs.filter(l => l.type === 'bolus' && l.timestamp >= start - rangeMs).sort((a, b) => a.timestamp - b.timestamp);
    const dataM = logs.filter(l => l.type === 'meal' && l.timestamp >= start - rangeMs);

    const diaHours = settings?.dia || 4;
    const diaMs = diaHours * 60 * 60 * 1000;

    // Detect insulin stacking (overlapping boluses)
    const stackingEvents = new Set<number>();
    for (let i = 1; i < dataB.length; i++) {
      const current = dataB[i];
      const previousBoluses = dataB.slice(0, i);
      const activeInsulinBefore = calculateIOBAt(current.timestamp - 1000, previousBoluses, diaHours);
      
      // If we take a bolus while more than 0.5 units or 20% of previous dose is active
      if (activeInsulinBefore > 0.5) {
        stackingEvents.add(current.timestamp);
      }
    }

    let loopPredictions: { timestamp: number, value: number, actionType?: 'bolus' | 'suspend', actionAmount?: number }[] = [];
    let mlPredictionData = mlPredictionDataState;
    
    if (dataG.length > 0) {
       const lastG = dataG[dataG.length - 1];
       mlPredictionData = mlPredictionData.filter(p => p.timestamp >= lastG.timestamp);
    }
    
    if ((showLoopSimulation || showMLPrediction) && dataG.length >= 2) {
      const last = dataG[dataG.length - 1];
      let prev = dataG[dataG.length - 2];
      
      for (let i = dataG.length - 2; i >= 0; i--) {
        if (last.timestamp - dataG[i].timestamp >= 20 * 60000) {
          prev = dataG[i];
          break;
        }
      }
      
      let velocity = 0;
      const timeDiffMin = (last.timestamp - prev.timestamp) / 60000;
      if (timeDiffMin > 0) {
         velocity = (last.value - prev.value) / timeDiffMin;
      }
      
      const diaMs = (settings?.dia || 4) * 60 * 60 * 1000;
      const nowMs = last.timestamp; 
      
      const iob = logs
        .filter(l => l.type === 'bolus' && nowMs - l.timestamp < diaMs && nowMs - l.timestamp >= 0)
        .reduce((sum, b) => {
          const timeSince = nowMs - b.timestamp;
          const x = timeSince / diaMs;
          const decay = Math.max(0, 1 - (3 * Math.pow(x, 2) - 2 * Math.pow(x, 3)));
          return sum + (b.value * decay);
        }, 0);
        
      const digestionMs = 2.5 * 60 * 60 * 1000;
      const cob = logs
        .filter(l => l.type === 'meal' && nowMs - l.timestamp < digestionMs && nowMs - l.timestamp >= 0)
        .reduce((sum, m) => {
          const timeSince = nowMs - m.timestamp;
          const decay = Math.max(0, 1 - (timeSince / digestionMs));
          return sum + (m.value * decay);
        }, 0);

      const isf = settings?.isf || 50; 
      const cr = settings?.wwRatio || 15;
      
      const expectedBgRise = (cob / cr) * isf;
      
      const steps = 12; 
      let loopVal = last.value;
      let simulatedIob = iob;
      
      for (let i = 1; i <= steps; i++) {
        const pTime = last.timestamp + i * 10 * 60000;
        
        const dampening = Math.max(0, 1 - (i / (steps * 0.6)));
        const trendImpact = velocity * 10 * dampening;
        
        if (showLoopSimulation) {
          const targetMiddle = (targetMin + targetMax) / 2;
          let loopAdjustment = 0;
          let actionType: 'bolus' | 'suspend' | undefined;
          let actionAmount: number | undefined;
          
          if (loopVal > targetMax) {
            if (simulatedIob < 2) {
              const neededDrop = loopVal - targetMiddle;
              const insulinNeeded = neededDrop / isf;
              const appliedInsulin = Math.min(insulinNeeded * 0.2, 0.5); 
              if (appliedInsulin > 0.05) {
                simulatedIob += appliedInsulin;
                actionType = 'bolus';
                actionAmount = appliedInsulin;
              }
            }
          } else if (loopVal < targetMin + 10) {
            const preventedDrop = (0.2 / 6) * isf;
            loopAdjustment = preventedDrop; 
            simulatedIob = Math.max(0, simulatedIob - 0.05);
            actionType = 'suspend';
            actionAmount = 0.2;
          }
          
          const loopNetExpectedChange = expectedBgRise - (simulatedIob * isf);
          const loopTheoreticalImpact = (loopNetExpectedChange / steps) * (1 - dampening * 0.5);
          
          loopVal += trendImpact + loopTheoreticalImpact + loopAdjustment;
          
          loopVal += (targetMiddle - loopVal) * 0.1;

          if (loopVal < 40) loopVal = 40;
          if (loopVal > 400) loopVal = 400;
          
          loopPredictions.push({ timestamp: pTime, value: loopVal, actionType, actionAmount });
        }
      }
    }

    const allVals = [
      ...dataG.map(l => l.value), 
      ...loopPredictions.map(p => p.value),
      ...mlPredictionData.map(p => p.value)
    ].filter(v => typeof v === 'number' && !isNaN(v));

    let chartMinY = 0;
    let chartMaxY = Math.max(200, (targetMax || 140) + 20);

    if (allVals.length > 0) {
      const minData = Math.min(...allVals);
      const maxData = Math.max(...allVals);
      const dynamicMin = Math.max(0, minData - 20);
      const dynamicMax = maxData + 20;

      chartMinY = Math.min(dynamicMin, (targetMin || 70) - 10);
      if (chartMinY < 0) chartMinY = 0;
      
      chartMaxY = Math.max(dynamicMax, (targetMax || 140) + 10);
    }

    let timeMap = new Map<number, any>();
    const addPoint = (time: number, key: string, value: any, extra?: any) => {
       if (!timeMap.has(time)) timeMap.set(time, { timestamp: time });
       const p = timeMap.get(time);
       p[key] = value;
       if (extra) Object.assign(p, extra);
    };

    dataG.forEach(d => addPoint(d.timestamp, 'glucose', d.value, { originalG: d }));
    dataB.forEach(d => {
      addPoint(d.timestamp, 'bolusVal', true, { 
        originalB: d, 
        bolusY: chartMinY,
        stackingWarning: stackingEvents.has(d.timestamp)
      });
      if (d.linkedMeal && d.linkedMeal.carbs > 0) {
        addPoint(d.timestamp, 'mealVal', true, { 
          originalM: { ...d, type: 'meal', value: d.linkedMeal.carbs }, 
          mealY: chartMinY 
        });
      }
    });

    // Add points for the IOB curve every 10 minutes to ensure smoothness
    for (let t = start; t <= end; t += 10 * 60000) {
      if (!timeMap.has(t)) timeMap.set(t, { timestamp: t });
    }

    // Now calculate IOB and Activity for EVERY point in the map to prevent gaps
    const bolusLogs = logs.filter(l => l.type === 'bolus');
    timeMap.forEach((point, t) => {
      point.iob = calculateIOBAt(t, bolusLogs, diaHours);
      point.activity = calculateActivityAt(t, bolusLogs, diaHours);
    });

    dataM.forEach(d => addPoint(d.timestamp, 'mealVal', true, { originalM: d, mealY: chartMinY }));

    loopPredictions.forEach(p => addPoint(p.timestamp, 'loopPrediction', p.value, { loopAction: p.actionType }));
    mlPredictionData.forEach(p => addPoint(p.timestamp, 'mlPrediction', p.value));

    // Stitch predictions to the last actual glucose point to ensure lines are connected
    if (dataG.length > 0) {
      const lastG = dataG[dataG.length - 1];
      const lastPoint = timeMap.get(lastG.timestamp);
      if (lastPoint) {
        if (showLoopSimulation && loopPredictions.length > 0) {
          lastPoint.loopPrediction = lastG.value;
        }
        if (showMLPrediction && mlPredictionData.length > 0) {
          lastPoint.mlPrediction = lastG.value;
        }
      }
    }

    if (!timeMap.has(start)) timeMap.set(start, { timestamp: start });
    if (!timeMap.has(end)) timeMap.set(end, { timestamp: end });

    const sortedData = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    const lastMlTimestamp = mlPredictionDataState.length > 0 ? mlPredictionDataState[mlPredictionDataState.length - 1].timestamp : 0;
    
    // Generate helpful ticks: Every hour or 2, Now
    const xAxisTicks: number[] = [];
    const interval = hours > 12 ? 4 * 60 * 60000 : (hours > 6 ? 2 * 60 * 60000 : 60 * 60000);
    
    let currentTick = Math.ceil(start / interval) * interval;
    while (currentTick < end) {
      if (Math.abs(currentTick - now) > 20 * 60000) { 
        xAxisTicks.push(currentTick);
      }
      currentTick += interval;
    }
    xAxisTicks.push(now);
    
    // Ensure we have space for prediction labeling if enabled
    if (showMLPrediction || showLoopSimulation) {
      const predLabel = end - (10 * 60000);
      if (Math.abs(predLabel - now) > 30 * 60000) {
        xAxisTicks.push(end);
      }
    }

    xAxisTicks.sort((a, b) => a - b);

    return { chartData: sortedData, chartMinY, chartMaxY, now, lastMlTimestamp, xAxisTicks, start, end };
  }, [logs, hours, targetMin, targetMax, theme, settings, showLoopSimulation, showMLPrediction, mlPredictionDataState, zoomLevel, panOffsetMs]);

  const isDark = theme === 'dark';

  return (
    <div ref={containerRef} className="relative w-full h-full select-none" style={{ touchAction: 'none' }} onClick={() => setSelectedPoint(null)} onWheel={handleWheel}>
      {/* View Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <button 
          onClick={handleZoomIn}
          className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-white/10 text-slate-600 dark:text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
          title="Powiększ"
        >
          <Plus size={20} className="font-black" />
        </button>
        <button 
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-white/10 text-slate-600 dark:text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
          title="Pomniejsz"
        >
          <Minus size={20} className="font-black" />
        </button>
        <button 
          onClick={handleReset}
          className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-white/10 text-slate-600 dark:text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
          title="Reset"
        >
          <Maximize2 size={18} className="font-black" />
        </button>
      </div>

      {(panOffsetMs !== 0 || zoomLevel !== 1) && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-accent-500/10 backdrop-blur-xl border border-accent-500/20 px-4 py-2 rounded-full flex items-center gap-2">
            <Move size={12} className="text-accent-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-500">Tryb swobodny</span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -25, bottom: 20 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
          <XAxis 
            dataKey="timestamp" 
            type="number" 
            domain={[start, end]} 
            allowDataOverflow={true}
            ticks={xAxisTicks}
            tickFormatter={(unixTime) => {
                const diff = Math.abs(unixTime - now);
                if (diff < 30000) return 'TERAZ';
                if (unixTime > now + 30000) {
                   const futureDiffMin = Math.round((unixTime - now) / 60000);
                   if (futureDiffMin >= 110) return '+2H';
                   return '';
                }
                const date = new Date(unixTime);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }}
            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            tickLine={false}
            tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 8, fontWeight: 'bold' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            domain={[0, (data) => Math.max(5, data * 1.2)]} 
            hide={true}
          />
          <YAxis 
            domain={[chartMinY, chartMaxY]} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 9, fontWeight: 'bold' }}
          />
          
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-slate-900 border border-slate-700 p-2 rounded-xl text-white text-[10px] shadow-xl backdrop-blur-md">
                    <div className="flex justify-between items-center gap-4 mb-1">
                      <p className="font-black text-accent-400">
                        {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {data.originalG?.source && (
                        <span className="text-[7px] font-black bg-white/10 px-1.5 py-0.5 rounded text-slate-300 uppercase">
                          {data.originalG.source === 'nightscout' ? 'Nightscout' : 'Manual'}
                        </span>
                      )}
                    </div>
                    {data.glucose && <p className="font-bold">Glukoza: <span className="text-white">{Math.round(data.glucose)} mg/dL</span></p>}
                    {data.iob !== undefined && data.iob > 0 && (
                      <div className="mt-1 border-t border-white/10 pt-1">
                        <p className="text-pink-400 font-bold">Profil działania insuliny (IOB): {data.iob.toFixed(2)} j.</p>
                        <div className="flex gap-2 text-[7px] text-pink-300/70 font-medium uppercase tracking-tighter">
                          <span>Początek: ~20m</span>
                          <span>Szczyt: ~75m</span>
                        </div>
                      </div>
                    )}
                    {data.loopPrediction && <p className="text-emerald-400">Pętla: {Math.round(data.loopPrediction)} mg/dL</p>}
                    {data.mlPrediction && <p className="text-amber-400">GlikoSense: {Math.round(data.mlPrediction)} mg/dL</p>}
                    {data.stackingWarning && <p className="text-red-400 font-black mt-1 uppercase text-[8px]">Ostrzeżenie: Nakładanie dawek!</p>}
                  </div>
                );
              }
              return null;
            }}
          />

          <ReferenceArea y1={targetMin || 70} y2={targetMax || 140} fill={isDark ? 'rgba(79, 70, 229, 0.1)' : 'rgba(79, 70, 229, 0.05)'} />
          
          <ReferenceLine x={now} stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} strokeDasharray="3 3" />

          {/* Lines */}
          <Area
            type="monotone"
            dataKey="activity"
            yAxisId="right"
            stroke="none"
            fill="url(#iobGradient)"
            fillOpacity={0.3}
            connectNulls
            isAnimationActive={false}
          />
          
          <defs>
            <linearGradient id="iobGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <Line 
            type="monotone" 
            dataKey="glucose" 
            stroke={isDark ? '#818cf8' : '#4f46e5'} 
            strokeWidth={3} 
            dot={<CustomGlucoseDot targetMin={targetMin} targetMax={targetMax} isDark={isDark} onDotClick={setSelectedPoint} />}
            activeDot={{ r: 6, fill: '#4f46e5' }}
            connectNulls
            isAnimationActive={false}
          />
          
          {showLoopSimulation && (
             <Line 
               type="natural" 
               dataKey="loopPrediction" 
               stroke="#10b981" 
               strokeWidth={2.5}
               strokeDasharray="3 4"
               dot={<LoopSimulationDot />}
               activeDot={false}
               connectNulls
               isAnimationActive={false}
             />
          )}

          {showMLPrediction && (
             <Line 
                 type="natural" 
                 dataKey="mlPrediction" 
                 stroke="#fbbf24" 
                 strokeWidth={3} 
                 strokeDasharray="5 5"
                 dot={false}
                 activeDot={{ r: 5, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
                 connectNulls
                 isAnimationActive={false}
               />
          )}

          {/* Scatters for Bolus and Meal Icons */}
          <Scatter dataKey="bolusY" shape={<CustomBolusShape onDotClick={setSelectedPoint} />} isAnimationActive={false} />
          <Scatter dataKey="bolusY" shape={<StackingWarning />} isAnimationActive={false} />
          <Scatter dataKey="mealY" shape={<CustomMealShape onDotClick={setSelectedPoint} />} isAnimationActive={false} />

        </ComposedChart>
      </ResponsiveContainer>

      <AnimatePresence>
        {isMlProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/50 flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full border-2 border-accent-500 border-t-transparent animate-spin" />
            <span className="text-[8px] font-black uppercase tracking-widest text-accent-400">GlikoSense myśli...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPoint && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white p-4 rounded-[2rem] border border-slate-700 shadow-2xl backdrop-blur-md z-10 min-w-[160px]"
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-accent-400 uppercase tracking-widest">
                  {selectedPoint.type === 'meal' ? 'Posiłek' : selectedPoint.type === 'bolus' ? 'Insulina' : 'Glukoza'}
                </span>
                {selectedPoint.source && (
                  <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">Źródło: {selectedPoint.source}</span>
                )}
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedPoint(null); }} 
                className="text-slate-500 hover:text-white p-1 ml-2"
              >✕</button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black">
                {selectedPoint.type === 'glucose' 
                  ? Math.round(Number(selectedPoint.value)) 
                  : +Number(selectedPoint.value).toFixed(2)}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {selectedPoint.type === 'glucose' ? 'mg/dL' : selectedPoint.type === 'bolus' ? 'j' : 'g WW'}
              </span>
            </div>
            {selectedPoint.notes && (
              <p className="text-[10px] text-slate-300 mt-2 font-medium line-clamp-2 italic">"{selectedPoint.notes}"</p>
            )}
            <p className="text-[8px] font-bold text-slate-500 mt-3 uppercase tracking-widest border-t border-slate-800 pt-2">
              {new Date(selectedPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(selectedPoint.timestamp).toLocaleDateString()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
