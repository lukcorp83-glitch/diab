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
  return (
    <g className="pointer-events-none">
       <text x={cx} y={cy + 15} textAnchor="middle" fontSize={12} className="drop-shadow-sm">⚠️</text>
    </g>
  );
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
    <g 
      onClick={(e) => {
          e.stopPropagation();
          onDotClick && onDotClick(payload.originalG);
      }}
      style={{ cursor: 'pointer', outline: 'none' }}
    >
      <circle cx={cx} cy={cy} r={20} fill="transparent" />
      <circle 
        cx={cx} cy={cy} r={5} 
        fill={fill} 
        stroke={isDark ? '#0f172a' : '#ffffff'} 
        strokeWidth={2}
      />
    </g>
  );
};

const CustomBolusShape = (props: any) => {
  const { cx, cy, payload, onDotClick } = props;
  if (!payload.bolusVal || isNaN(cx) || isNaN(cy)) return null;
  
  const val = payload.originalB?.value || 0;
  const h = Math.min(40, val * 5);
  return (
    <g onClick={(e) => { e.stopPropagation(); onDotClick && onDotClick(payload.originalB); }} style={{ cursor: 'pointer', outline: 'none' }}>
      <rect x={cx - 15} y={cy - 50} width={30} height={60} fill="transparent" />
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
      <circle cx={cx} cy={baseCy - 10} r={20} fill="transparent" />
      <text x={cx} y={baseCy} textAnchor="middle" fontSize={16}>🍽️</text>
    </g>
  );
};

const CustomSiteShape = (props: any) => {
  const { cx, cy, payload, onDotClick } = props;
  if (!payload.siteVal || isNaN(cx) || isNaN(cy)) return null;
  return (
    <g onClick={(e) => { e.stopPropagation(); onDotClick && onDotClick(payload.originalSite); }} style={{ cursor: 'pointer', outline: 'none' }}>
      <circle cx={cx} cy={cy - 10} r={15} fill="transparent" />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={18}>🔄</text>
    </g>
  );
};

const CustomSensorShape = (props: any) => {
  const { cx, cy, payload, onDotClick } = props;
  if (!payload.sensorVal || isNaN(cx) || isNaN(cy)) return null;
  return (
    <g onClick={(e) => { e.stopPropagation(); onDotClick && onDotClick(payload.originalSensor); }} style={{ cursor: 'pointer', outline: 'none' }}>
      <circle cx={cx} cy={cy - 10} r={15} fill="transparent" />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={18}>🩹</text>
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
  if (payload && payload.timestamp === lastMlTimestamp && payload.mlPrediction !== undefined && !isNaN(x) && !isNaN(y)) {
    return (
      <g>
        <text x={x} y={y - 12} fill={isDark ? '#fcd34d' : '#b45309'} fontSize={8} fontWeight="black" textAnchor="middle" className="uppercase tracking-widest pointer-events-none">
          GlikoSense
        </text>
        <text x={x} y={y - 22} textAnchor="middle" fontSize={16} className="pointer-events-none drop-shadow-md">
          🦄
        </text>
      </g>
    );
  }
  return null;
};

const CustomTooltip = ({ active, payload, isDark }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const points: LogEntry[] = [];
    if (data.originalG) points.push(data.originalG);
    if (data.originalB) points.push(data.originalB);
    if (data.originalM) points.push(data.originalM);
    if (data.originalSite) points.push(data.originalSite);
    if (data.originalSensor) points.push(data.originalSensor);
    
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-3 rounded-2xl border border-slate-200/50 dark:border-white/10 shadow-2xl min-w-[160px] pointer-events-none select-none">
        {points.length > 0 ? (
          points.map((p, idx) => (
            <div key={idx} className={idx > 0 ? "mt-2 pt-2 border-t border-slate-100 dark:border-slate-800" : ""}>
               <div className="text-[7px] font-black uppercase text-accent-500 tracking-[0.2em] mb-0.5">
                 {p.type === 'meal' ? 'Posiłek' : p.type === 'bolus' ? 'Bolus' : p.type === 'glucose' ? 'Glukoza' : 'Wymiana'}
               </div>
               <div className="flex items-baseline gap-1">
                 <span className="text-lg font-black dark:text-white tracking-tighter">
                 {p.type === 'glucose' ? Math.round(Number(p.value)) : Number(p.value).toFixed(2)}
               </span>
               <span className="text-[9px] font-bold text-slate-500 uppercase">
                 {p.type === 'glucose' ? 'mg/dL' : p.type === 'bolus' ? 'j' : 'g'}
               </span>
               </div>
               {p.notes && <div className="text-[9px] text-slate-400 italic line-clamp-1 truncate max-w-[160px] mt-0.5 leading-tight">"{p.notes}"</div>}
               {p.type === 'bolus' && data.stackingWarning && (
                 <div className="mt-1.5 flex items-center gap-1 text-[7px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/5 px-2 py-1 rounded-lg border border-rose-500/10">
                   <span>⚠️</span> Nakładanie dawek
                 </div>
               )}
            </div>
          ))
        ) : (
          <div className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Status</div>
        )}

        {/* IOB and Activity */}
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[7px] font-black uppercase text-pink-500 tracking-wider">Aktualna IOB</span>
            <span className="text-[10px] font-black dark:text-pink-400">{(data.iob || 0).toFixed(2)} j</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[7px] font-black uppercase text-slate-500 tracking-wider">Aktywność</span>
            <div className="flex items-center gap-1">
              <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-pink-500" 
                  style={{ width: `${Math.min(100, (data.activity || 0) * 100)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 text-[7px] font-black text-slate-400 text-right uppercase tracking-widest border-t border-slate-100 dark:border-slate-800 pt-1.5">
           {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  }
  return null;
};

export default function GlucoseChart({ logs, hours, targetMin, targetMax, theme, settings, showLoopSimulation, showMLPrediction }: GlucoseChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<LogEntry | null>(null);
  const [mlPredictionDataState, setMlPredictionDataState] = useState<{timestamp: number, value: number}[]>([]);
  const [isMlProcessing, setIsMlProcessing] = useState(false);

  useEffect(() => {
    if (!showMLPrediction || logs.length < 5) {
      setMlPredictionDataState([]);
      return;
    }

    let isMounted = true;
    const runAnalysis = async () => {
      setIsMlProcessing(true);
      try {
        // Use 'quick' mode for the chart to keep it responsive
        const result = await MLAnalyzer.analyzeData(logs, false, 'quick');
        if (isMounted && result.predictionCurve) {
          setMlPredictionDataState(result.predictionCurve.map(p => ({
            timestamp: p.timestamp,
            value: p.value
          })));
        }
      } catch (err) {
        console.error("ML Prediction error in chart:", err);
      } finally {
        if (isMounted) setIsMlProcessing(false);
      }
    };

    runAnalysis();
    return () => { isMounted = false; };
  }, [logs, showMLPrediction]);
  
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

  const handleMouseDownNative = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastX(e.clientX);
  };

  const handleMouseMoveNative = (e: React.MouseEvent) => {
    if (isDragging && lastX !== null && containerRef.current) {
      const width = containerRef.current.clientWidth || 1000;
      const rangeMs = (hours * 60 * 60 * 1000) / zoomLevel;
      const msPerPixel = rangeMs / width;
      const deltaX = e.clientX - lastX;
      setPanOffsetMs(prev => prev - (deltaX * msPerPixel));
      setLastX(e.clientX);
    }
  };

  const handleMouseUpNative = () => {
    setIsDragging(false);
    setLastX(null);
  };

  const handleTouchStartNative = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastX(e.touches[0].clientX);
    }
  };

  const handleTouchMoveNative = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1 && lastX !== null && containerRef.current) {
      const width = containerRef.current.clientWidth || 1000;
      const rangeMs = (hours * 60 * 60 * 1000) / zoomLevel;
      const msPerPixel = rangeMs / width;
      const currentX = e.touches[0].clientX;
      const deltaX = currentX - lastX;
      setPanOffsetMs(prev => prev - (deltaX * msPerPixel));
      setLastX(currentX);
    }
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

  const { chartData, chartMinY, chartMaxY, now, lastMlTimestamp, xAxisTicks, start, end, hasData } = useMemo(() => {
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
    const dataSite = logs.filter(l => l.type === 'site_change' && l.timestamp >= start - rangeMs);
    const dataSensor = logs.filter(l => l.type === 'sensor_change' && l.timestamp >= start - rangeMs);

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
    dataSite.forEach(d => addPoint(d.timestamp, 'siteVal', true, { originalSite: d, yVal: chartMinY }));
    dataSensor.forEach(d => addPoint(d.timestamp, 'sensorVal', true, { originalSensor: d, yVal: chartMinY }));

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
    
    // Check if we actually have any data to show
    const hasData = logs.length > 0 || loopPredictions.length > 0 || mlPredictionData.length > 0;

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

    return { chartData: sortedData, chartMinY, chartMaxY, now, lastMlTimestamp, xAxisTicks, start, end, hasData };
  }, [logs, hours, targetMin, targetMax, theme, settings, showLoopSimulation, showMLPrediction, mlPredictionDataState, zoomLevel, panOffsetMs]);

  const isDark = theme === 'dark';

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full min-h-[300px] flex-1 flex flex-col select-none touch-none" 
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'none' 
      }} 
      onClick={() => setSelectedPoint(null)} 
      onWheel={handleWheel}
      onMouseDown={handleMouseDownNative}
      onMouseMove={handleMouseMoveNative}
      onMouseUp={handleMouseUpNative}
      onMouseLeave={handleMouseUpNative}
      onTouchStart={handleTouchStartNative}
      onTouchMove={handleTouchMoveNative}
      onTouchEnd={handleMouseUpNative}
      onTouchCancel={handleMouseUpNative}
    >
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


      <div className="w-full relative h-[400px] outline-none focus:outline-none focus-visible:outline-none">
        {!hasData && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-[2px] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-full bg-accent-500/10 flex items-center justify-center mb-4 animate-pulse">
              <Move className="text-accent-500" size={24} />
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter italic mb-1">Brak danych do wyświetlenia</h3>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 max-w-[200px] leading-relaxed">System właśnie synchronizuje Twoje ostatnie wyniki z Nightscout. Zaraz się pojawią!</p>
          </div>
        )}
        <ResponsiveContainer width="100%" height={400} className="outline-none focus:outline-none focus-visible:outline-none border-none">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -25, bottom: 20 }}
            className="outline-none focus:outline-none focus-visible:outline-none border-none"
            style={{ outline: 'none' }}
            onClick={(data: any) => {
               if (data && data.activePayload && data.activePayload.length > 0) {
                 const payload = data.activePayload[0].payload;
                 if (payload.originalG) setSelectedPoint(payload.originalG);
                 else if (payload.originalB) setSelectedPoint(payload.originalB);
                 else if (payload.originalM) setSelectedPoint(payload.originalM);
                 else if (payload.originalSite) setSelectedPoint(payload.originalSite);
                 else if (payload.originalSensor) setSelectedPoint(payload.originalSensor);
               }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} vertical={false} />
            <Tooltip 
              content={<CustomTooltip isDark={isDark} />} 
              cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', strokeWidth: 1 }}
            />
          <XAxis 
            dataKey="timestamp" 
            type="number" 
            domain={[start, end]} 
            ticks={xAxisTicks}
            className="outline-none"
            style={{ outline: 'none' }}
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
            style={{ outline: 'none' }}
          />
          <YAxis 
            domain={[chartMinY, chartMaxY]} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 9, fontWeight: 'bold' }}
            style={{ outline: 'none' }}
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
                 label={<MLPredictionLabel isDark={isDark} lastMlTimestamp={lastMlTimestamp} />}
                 activeDot={{ r: 5, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
                 connectNulls
                 isAnimationActive={false}
               />
          )}

          {/* Scatters for Bolus and Meal Icons */}
          <Scatter key="scatter-bolus" dataKey="bolusY" shape={<CustomBolusShape onDotClick={setSelectedPoint} />} isAnimationActive={false} />
          <Scatter key="scatter-stacking" dataKey="bolusY" shape={<StackingWarning />} isAnimationActive={false} />
          <Scatter key="scatter-meal" dataKey="mealY" shape={<CustomMealShape onDotClick={setSelectedPoint} />} isAnimationActive={false} />
          <Scatter key="scatter-site" dataKey="yVal" shape={<CustomSiteShape onDotClick={setSelectedPoint} />} isAnimationActive={false} />
          <Scatter key="scatter-sensor" dataKey="yVal" shape={<CustomSensorShape onDotClick={setSelectedPoint} />} isAnimationActive={false} />

        </ComposedChart>
      </ResponsiveContainer>
      </div>

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
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white p-4 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-2xl backdrop-blur-xl z-30 min-w-[180px]"
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
              <span className="text-3xl font-black tracking-tighter">
                {selectedPoint.type === 'glucose' 
                  ? Math.round(Number(selectedPoint.value)) 
                  : +Number(selectedPoint.value).toFixed(2)}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {selectedPoint.type === 'glucose' ? 'mg/dL' : selectedPoint.type === 'bolus' ? 'j' : 'g WW'}
              </span>
            </div>
            {selectedPoint.notes && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 font-medium line-clamp-2 italic">"{selectedPoint.notes}"</p>
            )}
            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-3 uppercase tracking-widest border-t border-slate-200/50 dark:border-slate-800 pt-2">
              {new Date(selectedPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(selectedPoint.timestamp).toLocaleDateString()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
