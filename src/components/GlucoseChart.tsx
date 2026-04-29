import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry, UserSettings } from '../types';

interface GlucoseChartProps {
  logs: LogEntry[];
  hours: number;
  targetMin: number;
  targetMax: number;
  theme: 'light' | 'dark';
  settings?: UserSettings;
  showLoopSimulation?: boolean;
}

export default function GlucoseChart({ logs, hours, targetMin, targetMax, theme, settings, showLoopSimulation }: GlucoseChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPoint, setSelectedPoint] = React.useState<LogEntry | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    
    canvas.width = W * scale;
    canvas.height = H * scale;
    ctx.scale(scale, scale);

    let now = Date.now();
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

    const predictionTime = 2 * 60 * 60 * 1000; // 2 hours prediction
    const rangeMs = hours * 60 * 60 * 1000;
    const showPrediction = settings?.showPrediction;
    
    // Total window on chart
    const totalMs = showPrediction ? rangeMs + predictionTime : rangeMs;
    const start = now - rangeMs;
    const end = start + totalMs;

    const dataG = logs
      .filter(l => l.type === 'glucose' && l.timestamp >= start)
      .sort((a, b) => a.timestamp - b.timestamp);
    const dataB = logs.filter(l => l.type === 'bolus' && l.timestamp >= start);
    const dataM = logs.filter(l => l.type === 'meal' && l.timestamp >= start);

    // Prediction Logic (Improved with IOB/COB)
    let predictions: { timestamp: number, value: number }[] = [];
    let loopPredictions: { timestamp: number, value: number, actionType?: 'bolus' | 'suspend', actionAmount?: number }[] = [];
    
    if ((showPrediction || showLoopSimulation) && dataG.length >= 2) {
      const last = dataG[dataG.length - 1];
      let prev = dataG[dataG.length - 2];
      
      // Look back up to 20 mins for a better trend to avoid noise
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
      
      // Calculate IOB (Insulin on Board) and COB (Carbs on Board) manually based on logs
      const diaMs = (settings?.dia || 4) * 60 * 60 * 1000;
      const nowMs = last.timestamp; 
      
      const iob = logs
        .filter(l => l.type === 'bolus' && nowMs - l.timestamp < diaMs && nowMs - l.timestamp >= 0)
        .reduce((sum, b) => {
          const timeSince = nowMs - b.timestamp;
          const decay = Math.max(0, 1 - (timeSince / diaMs));
          return sum + (b.value * decay);
        }, 0);
        
      // Simple COB assuming 2.5 hours digestion (150 mins)
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
      
      // Net expected change from remaining active insulin and carbs
      const expectedBgDrop = iob * isf;
      const expectedBgRise = (cob / cr) * isf;
      const netExpectedChange = expectedBgRise - expectedBgDrop;
      
      const steps = 12; // every 10 min
      let currentVal = last.value;
      let loopVal = last.value;
      let simulatedIob = iob;
      
      // Distribute net change non-linearly (more impact sooner)
      for (let i = 1; i <= steps; i++) {
        const pTime = last.timestamp + i * 10 * 60000;
        
        // Dampen historical trend over time
        const dampening = Math.max(0, 1 - (i / (steps * 0.6)));
        const trendImpact = velocity * 10 * dampening;
        
        // Calculate remaining theoretical change component
        // 12 steps, we apply a portion of the net expected change per step
        const theoreticalImpact = (netExpectedChange / steps) * (1 - dampening * 0.5); 
        
        currentVal += trendImpact + theoreticalImpact;
        
        // Boundaries
        if (currentVal < 40) currentVal = 40;
        if (currentVal > 400) currentVal = 400;
        
        if (showPrediction) {
          predictions.push({ timestamp: pTime, value: currentVal });
        }

        if (showLoopSimulation) {
          // Simulate Closed Loop Algorithm (Artificial Pancreas)
          // Adjust based on target and current trend
          const targetMiddle = (targetMin + targetMax) / 2;
          let loopAdjustment = 0;
          let actionType: 'bolus' | 'suspend' | undefined;
          let actionAmount: number | undefined;
          
          if (loopVal > targetMax) {
            // Auto bolus / basal increase
            if (simulatedIob < 2) { // Max allowed auto-iob
              const neededDrop = loopVal - targetMiddle;
              const insulinNeeded = neededDrop / isf;
              const appliedInsulin = Math.min(insulinNeeded * 0.2, 0.5); // Administer up to 0.5u
              if (appliedInsulin > 0.05) {
                simulatedIob += appliedInsulin;
                actionType = 'bolus';
                actionAmount = appliedInsulin;
              }
            }
          } else if (loopVal < targetMin + 10) {
            // Basal suspend
            const preventedDrop = (0.2 / 6) * isf; // simulate suspending 0.2u/hr basal
            loopAdjustment = preventedDrop; // BG goes up relative to what it would have done
            simulatedIob = Math.max(0, simulatedIob - 0.05); // IOB decays faster due to no basal
            actionType = 'suspend';
            actionAmount = 0.2;
          }
          
          const loopNetExpectedChange = expectedBgRise - (simulatedIob * isf);
          const loopTheoreticalImpact = (loopNetExpectedChange / steps) * (1 - dampening * 0.5);
          
          loopVal += trendImpact + loopTheoreticalImpact + loopAdjustment;
          
          // Loop tends to stabilize faster
          loopVal += (targetMiddle - loopVal) * 0.1;

          if (loopVal < 40) loopVal = 40;
          if (loopVal > 400) loopVal = 400;
          
          loopPredictions.push({ timestamp: pTime, value: loopVal, actionType, actionAmount });
        }
      }
    }

    const isDark = theme === 'dark';
    const allVals = [...dataG.map(l => l.value), ...predictions.map(p => p.value), ...loopPredictions.map(p => p.value)];

    // Dynamic Y-Axis (Zoom)
    let chartMinY = 0;
    let chartMaxY = Math.max(200, targetMax + 20);

    // Auto-detect if we should zoom in (if variance is high or if user wants to see details)
    // We'll calculate min/max and apply a 10% padding
    if (allVals.length > 0) {
      const minData = Math.min(...allVals);
      const maxData = Math.max(...allVals);
      
      // If we have a significant spike or drop, dynamically adjust bounds to focus on data
      // For zooming on large fluctuations, we can set bounds closer to the data
      const dynamicMin = Math.max(0, minData - 20);
      const dynamicMax = maxData + 20;

      // Always ensure we see the target range if possible, but if data is extremely high, 
      // we focus on data + targets.
      chartMinY = Math.min(dynamicMin, targetMin - 10);
      if (chartMinY < 0) chartMinY = 0;
      
      chartMaxY = Math.max(dynamicMax, targetMax + 10);
    }

    const padL = 30;
    const padR = 10;
    const padT = 10;
    const padB = 25;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const getX = (time: number) => padL + ((time - start) / totalMs) * chartW;
    const getY = (val: number) => H - padB - ((val - chartMinY) / (chartMaxY - chartMinY)) * chartH;

    ctx.clearRect(0, 0, W, H);

    // Click handler for points
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found = null;
      
      // Check Glucose
      for (const p of dataG) {
        const px = getX(p.timestamp);
        const py = getY(p.value);
        if (Math.sqrt((mouseX - px)**2 + (mouseY - py)**2) < 20) {
          found = p; break;
        }
      }
      
      // Check Meals
      if (!found) {
        for (const p of dataM) {
          const px = getX(p.timestamp);
          const py = padT + 12; // Matches draw
          if (Math.sqrt((mouseX - px)**2 + (mouseY - py)**2) < 30) {
            found = p; break;
          }
        }
      }

      // Check Bolus if not found info
      if (!found) {
        for (const p of dataB) {
          const px = getX(p.timestamp);
          const py = H - padB - 20;
          if (Math.sqrt((mouseX - px)**2 + (mouseY - py)**2) < 25) {
            found = p; break;
          }
        }
      }

      setSelectedPoint(found);
    };

    canvas.onmousedown = handleCanvasClick;

    // Draw Axes
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, H - padB);
    ctx.lineTo(W - padR, H - padB);
    ctx.stroke();

    // Target Range Background
    ctx.fillStyle = isDark ? 'rgba(79, 70, 229, 0.1)' : 'rgba(79, 70, 229, 0.05)';
    const yMin = getY(Math.max(chartMinY, targetMin));
    const yMax = getY(Math.min(chartMaxY, targetMax));
    if (targetMin <= chartMaxY && targetMax >= chartMinY) {
      ctx.fillRect(padL, yMax, chartW, yMin - yMax);
    }

    // Draw Grid Lines & Labels
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    ctx.font = '8px font-black uppercase tracking-widest';
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';

    let gridLinesParams = [targetMin, targetMax, 200];
    
    // Add dynamic grid lines based on range
    const range = chartMaxY - chartMinY;
    const step = range > 100 ? 50 : 20;
    for (let v = Math.ceil(chartMinY / step) * step; v <= chartMaxY; v += step) {
      if (!gridLinesParams.includes(v)) {
        gridLinesParams.push(v);
      }
    }

    gridLinesParams.forEach(val => {
      if (val >= chartMinY && val <= chartMaxY) {
        const y = getY(val);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.fillText(val.toString(), padL - 5, y + 3);
      }
    });

    // Time Labels
    ctx.textAlign = 'center';
    const labels = (showPrediction || showLoopSimulation) 
      ? [start, now, end]
      : [start, start + rangeMs / 2, now];
    
    labels.forEach((time, i) => {
      const x = getX(time);
      let label = '';
      if (showPrediction || showLoopSimulation) {
        label = i === 1 ? 'NOW' : i === 0 ? `-${hours}H` : `+2H`;
      } else {
        label = i === 2 ? 'NOW' : i === 0 ? `-${hours}H` : `-${hours/2}H`;
      }
      ctx.fillText(label, x, H - 5);
      
      // Vertical line for NOW
      if (label === 'NOW') {
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, H - padB);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Draw Bolus Bars & Icons
    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    dataB.forEach(b => {
      const x = getX(b.timestamp);
      const h = Math.min(40, b.value * 5);
      
      // Bar
      ctx.fillStyle = 'rgba(79, 70, 229, 0.4)';
      ctx.fillRect(x - 2, H - padB - h, 4, h);
      
      // Icon for Bolus (Syringe/Ampoule)
      ctx.fillText('💉', x, H - padB - 5);
    });

    // Draw Meal Icons & Dots
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    dataM.forEach(m => {
      const x = getX(m.timestamp);
      const iconY = padT + 12;
      
      // Icon
      ctx.fillText('🍽️', x, iconY);
      
      // Dot for Meal
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.arc(x, iconY + 8, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw Glucose Line
    if (dataG.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = isDark ? '#818cf8' : '#4f46e5';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      dataG.forEach((l, i) => {
        const x = getX(l.timestamp);
        const y = getY(l.value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw Glucose Points
      dataG.forEach(l => {
        const x = getX(l.timestamp);
        const y = getY(l.value);
        ctx.beginPath();
        if (l.value < targetMin) {
          ctx.fillStyle = '#ef4444'; // red
        } else if (l.value > targetMax) {
          ctx.fillStyle = '#f59e0b'; // amber
        } else {
          ctx.fillStyle = isDark ? '#818cf8' : '#4f46e5'; // match line
        }
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Prediction Line (Dashed)
      if (predictions.length > 0) {
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = isDark ? 'rgba(129, 140, 248, 0.5)' : 'rgba(79, 70, 229, 0.5)';
        const last = dataG[dataG.length - 1];
        ctx.moveTo(getX(last.timestamp), getY(last.value));
        predictions.forEach(p => {
          ctx.lineTo(getX(p.timestamp), getY(p.value));
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Loop Simulation Line (Dashed + Different color)
      if (loopPredictions.length > 0) {
        ctx.beginPath();
        ctx.setLineDash([3, 4]); // Different dash pattern
        ctx.strokeStyle = '#10b981'; // Emerald color for loop simulation
        ctx.lineWidth = 2.5;
        const last = dataG[dataG.length - 1];
        ctx.moveTo(getX(last.timestamp), getY(last.value));
        loopPredictions.forEach(p => {
          ctx.lineTo(getX(p.timestamp), getY(p.value));
        });
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.textAlign = 'center';
        // Draw loop actions
        loopPredictions.forEach(p => {
          if (p.actionType) {
            const x = getX(p.timestamp);
            const py = getY(p.value);
            
            ctx.beginPath();
            if (p.actionType === 'bolus') {
              ctx.fillText('💉', x, py - 8);
            } else if (p.actionType === 'suspend') {
              ctx.fillStyle = '#ef4444'; // Red square for suspend
              ctx.fillRect(x - 4, py + 8, 8, 8);
            }
          }
        });
      }
    }
  }, [logs, hours, targetMin, targetMax, theme, settings, showLoopSimulation]);

  return (
    <div className="relative w-full h-full">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        style={{ touchAction: 'pan-y' }}
      />
      <AnimatePresence>
        {selectedPoint && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white p-4 rounded-[2rem] border border-slate-700 shadow-2xl backdrop-blur-md z-10 min-w-[160px]"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                {selectedPoint.type === 'meal' ? 'Posiłek' : selectedPoint.type === 'bolus' ? 'Insulina' : 'Glukoza'}
              </span>
              <button onClick={() => setSelectedPoint(null)} className="text-slate-500 hover:text-white p-1">✕</button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black">{selectedPoint.value}</span>
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
