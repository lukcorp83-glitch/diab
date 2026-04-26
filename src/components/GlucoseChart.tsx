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
}

export default function GlucoseChart({ logs, hours, targetMin, targetMax, theme, settings }: GlucoseChartProps) {
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
    if (showPrediction && dataG.length >= 2) {
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
        
        predictions.push({ timestamp: pTime, value: currentVal });
      }
    }

    const isDark = theme === 'dark';
    const allVals = [...dataG.map(l => l.value), ...predictions.map(p => p.value)];
    const maxVal = Math.max(...allVals, 200, targetMax + 20);

    const padL = 30;
    const padR = 10;
    const padT = 10;
    const padB = 25;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const getX = (time: number) => padL + ((time - start) / totalMs) * chartW;
    const getY = (val: number) => H - padB - (val / (maxVal * 1.1)) * chartH;

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
    const yMin = getY(targetMin);
    const yMax = getY(targetMax);
    ctx.fillRect(padL, yMax, chartW, yMin - yMax);

    // Draw Grid Lines & Labels
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    ctx.font = '8px font-black uppercase tracking-widest';
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';

    [targetMin, targetMax, 200].forEach(val => {
      const y = getY(val);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(val.toString(), padL - 5, y + 3);
    });

    // Time Labels
    ctx.textAlign = 'center';
    const labels = showPrediction 
      ? [start, now, end]
      : [start, start + rangeMs / 2, now];
    
    labels.forEach((time, i) => {
      const x = getX(time);
      let label = '';
      if (showPrediction) {
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

    // Draw Bolus Bars & Dots
    dataB.forEach(b => {
      const x = getX(b.timestamp);
      const h = Math.min(40, b.value * 5);
      
      // Bar
      ctx.fillStyle = 'rgba(79, 70, 229, 0.4)';
      ctx.fillRect(x - 2, H - padB - h, 4, h);
      
      // Dot for Bolus
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath(); ctx.arc(x, H - padB - 5, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
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
    }
  }, [logs, hours, targetMin, targetMax, theme, settings]);

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
