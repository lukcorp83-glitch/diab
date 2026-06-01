import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { LogEntry, UserSettings } from '../types';
import { MLAnalyzer } from '../services/mlSugarAnalyzer';
import { getTs } from '../lib/utils';
import { Haptics } from '../lib/haptics';

import { Plus, Minus, Maximize2, Move, Droplets, Signal } from 'lucide-react';

// Insulin on Board calculation using a more realistic decay model
const calculateIOBAt = (time: number, boluses: LogEntry[], diaHours: number) => {
  const diaMs = diaHours * 60 * 60 * 1000;
  return boluses.reduce((sum, b) => {
    const timeSince = time - getTs(b.timestamp);
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
    const timeSince = time - getTs(b.timestamp);
    if (timeSince < 0 || timeSince >= diaMs) return sum;
    
    const x = timeSince / diaMs;
    // A skewed curve that peaks around 0.2-0.25 (approx 1h for 4h DIA)
    // and returns to 0 at the end of DIA.
    const activity = Math.max(0, 15 * x * Math.pow(1 - x, 3));
    
    return sum + b.value * activity;
  }, 0);
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
       mlPredictionData = mlPredictionData.filter(p => p.timestamp >= lastG.timestamp - 300000); // 5 minute buffer
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
          const loopTheoreticalImpact = (loopNetExpectedChange / steps) * (1 - dampening * 0.3);
          
          loopVal += trendImpact + loopTheoreticalImpact + loopAdjustment;
          
          // Smoother regression to mean, only if far out
          const meanPull = (targetMiddle - loopVal) * 0.02;
          loopVal += meanPull;

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
       const roundedTime = Math.round(time / 60000) * 60000;
       if (!timeMap.has(roundedTime)) timeMap.set(roundedTime, { timestamp: roundedTime });
       const p = timeMap.get(roundedTime);
       p[key] = value;
       if (extra) Object.assign(p, extra);
    };

    const allG = logs.filter(l => l.type === 'glucose').sort((a,b) => a.timestamp - b.timestamp);
    const absoluteLatest = allG.length > 0 ? allG[allG.length - 1].timestamp : 0;
    
    let globalVelocity = 0;
    if (allG.length >= 2) {
      const last = allG[allG.length - 1];
      let prev = allG[allG.length - 2];
      for (let i = allG.length - 2; i >= 0; i--) {
        if (last.timestamp - allG[i].timestamp >= 20 * 60000) {
          prev = allG[i];
          break;
        }
      }
      const timeDiffMin = (last.timestamp - prev.timestamp) / 60000;
      if (timeDiffMin > 0) {
         globalVelocity = (last.value - prev.value) / timeDiffMin;
      }
    }

    const startRoundedMap = Math.round(start / 60000) * 60000;
    
    dataG.forEach(d => addPoint(d.timestamp, 'glucose', d.value, { 
      originalG: d, 
      isLatest: d.timestamp === absoluteLatest,
      velocity: d.timestamp === absoluteLatest ? globalVelocity : undefined
    }));
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

    // Add points for the IOB curve every 5 minutes on clean 5-minute ticks to ensure perfect alignment
    const roundedStart = Math.floor(start / 300000) * 300000;
    const roundedEnd = Math.ceil(end / 300000) * 300000;
    for (let t = roundedStart; t <= roundedEnd; t += 5 * 60000) {
      if (!timeMap.has(t)) timeMap.set(t, { timestamp: t });
    }

    // Now calculate IOB and Activity for EVERY point in the map to prevent gaps
    const bolusLogs = logs.filter(l => l.type === 'bolus');
    timeMap.forEach((point, t) => {
      point.iob = calculateIOBAt(t, bolusLogs, diaHours);
      point.activity = calculateActivityAt(t, bolusLogs, diaHours);
    });

    dataM.forEach(d => addPoint(d.timestamp, 'mealVal', true, { originalM: d, mealY: chartMinY }));
    dataSite.forEach(d => addPoint(d.timestamp, 'siteVal', true, { originalSite: d, yVal: chartMaxY }));
    dataSensor.forEach(d => addPoint(d.timestamp, 'sensorVal', true, { originalSensor: d, yVal: chartMaxY }));

    loopPredictions.forEach(p => addPoint(p.timestamp, 'loopPrediction', p.value, { loopAction: p.actionType }));
    mlPredictionData.forEach(p => addPoint(p.timestamp, 'mlPrediction', p.value));

    // Stitch predictions to the last actual glucose point to ensure lines are connected
    if (dataG.length > 0) {
      const lastG = dataG[dataG.length - 1];
      const lastGTimeRounded = Math.round(lastG.timestamp / 60000) * 60000;
      const lastPoint = timeMap.get(lastGTimeRounded);
      const lastVal = lastG.value;
      if (lastPoint) {
        if (showLoopSimulation && loopPredictions.length > 0) {
          lastPoint.loopPrediction = lastVal;
        }
        if (showMLPrediction && mlPredictionData.length > 0) {
          lastPoint.mlPrediction = lastVal;
        }
      }
    }

    const startRounded = Math.round(start / 60000) * 60000;
    const endRounded = Math.round(end / 60000) * 60000;
    if (!timeMap.has(startRounded)) timeMap.set(startRounded, { timestamp: startRounded });
    if (!timeMap.has(endRounded)) timeMap.set(endRounded, { timestamp: endRounded });

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;
      
      ctx.clearRect(0, 0, w, h);
      
      const pL = 20, pR = 10, pT = 10, pB = 20;
      const cw = w - pL - pR;
      const ch = h - pT - pB;
      
      const getX = (t) => pL + ((t - start) / (end - start)) * cw;
      const getY = (v) => pT + ch - ((v - chartMinY) / (chartMaxY - chartMinY)) * ch;
      
      // Target area
      const yMin = getY(targetMin || 70);
      const yMax = getY(targetMax || 140);
      ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)';
      ctx.fillRect(pL, Math.max(0, yMax), cw, Math.max(0, yMin - yMax));

      // Target boundaries
      ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pL, yMin);
      ctx.lineTo(pL + cw, yMin);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pL, yMax);
      ctx.lineTo(pL + cw, yMax);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // X axis ticks
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      
      for (const t of xAxisTicks) {
         const x = getX(t);
         const diff = Math.abs(t - now);
         let text = '';
         if (diff < 30000) text = 'TERAZ';
         else if (t > now + 30000) { if (t - now >= 110*60*1000) text = '+2H'; }
         else text = new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
         
         ctx.beginPath();
         ctx.moveTo(x, pT);
         ctx.lineTo(x, h - pB);
         ctx.stroke();
         if (text) ctx.fillText(text, x, h - pB + 5);
      }
      
      // Y axis labels
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      [chartMinY, targetMin, targetMax, chartMaxY].filter(Boolean).forEach(v => {
         // handle safely
         ctx.fillText(Math.round(v).toString(), pL - 2, getY(v));
      });
      
      // Now Line
      const xNow = getX(now);
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(xNow, pT);
      ctx.lineTo(xNow, h - pB);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Activity
      ctx.beginPath();
      let firstA = true;
      for (const d of chartData) {
         if (d.activity !== undefined && !isNaN(d.activity)) {
             const x = getX(d.timestamp);
             const y = pT + ch - Math.min(1, Math.max(0, d.activity / 5)) * ch;
             if (firstA) { ctx.moveTo(x, pT + ch); ctx.lineTo(x, y); firstA = false; }
             else ctx.lineTo(x, y);
         }
      }
      if (!firstA && chartData.length > 0) {
          ctx.lineTo(getX(chartData[chartData.length-1].timestamp), pT + ch);
          const grad = ctx.createLinearGradient(0, pT, 0, pT + ch);
          grad.addColorStop(0, 'rgba(236,72,153,0.3)');
          grad.addColorStop(1, 'rgba(236,72,153,0)');
          ctx.fillStyle = grad;
          ctx.fill();
      }
      
      // ML Prediction
      if (showMLPrediction) {
         ctx.beginPath();
         let first = true;
         for (const d of chartData) {
            if (d.mlPrediction !== undefined) {
               const x = getX(d.timestamp);
               const y = getY(d.mlPrediction);
               if (first) { ctx.moveTo(x, y); first = false; }
               else ctx.lineTo(x, y);
            }
         }
         ctx.strokeStyle = '#fbbf24';
         ctx.lineWidth = 3;
         ctx.setLineDash([6,4]);
         ctx.stroke();
         ctx.setLineDash([]);
         
         const lastMl = chartData.find(d => d.timestamp === lastMlTimestamp);
         if (lastMl && lastMl.mlPrediction !== undefined) {
            const x = getX(lastMl.timestamp);
            const y = getY(lastMl.mlPrediction);
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2*Math.PI);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
         }
      }
      
      // Loop
      if (showLoopSimulation) {
         ctx.beginPath();
         let first = true;
         for (const d of chartData) {
            if (d.loopPrediction !== undefined) {
               const x = getX(d.timestamp);
               const y = getY(d.loopPrediction);
               if (first) { ctx.moveTo(x, y); first = false; }
               else ctx.lineTo(x, y);
            }
         }
         ctx.strokeStyle = '#10b981';
         ctx.lineWidth = 2.5;
         ctx.setLineDash([4,4]);
         ctx.stroke();
         ctx.setLineDash([]);
         
         ctx.font = '12px serif';
         ctx.textBaseline = 'middle';
         ctx.textAlign = 'center';
         for (const d of chartData) {
            if (d.loopPrediction !== undefined && d.loopAction) {
               const x = getX(d.timestamp);
               const y = getY(d.loopPrediction);
               if (d.loopAction === 'bolus') ctx.fillText('💉', x, y - 8);
               if (d.loopAction === 'suspend') {
                  ctx.fillStyle = '#ef4444';
                  ctx.fillRect(x - 4, y + 4, 8, 8);
               }
            }
         }
      }
      
      // Glucose Line
      ctx.beginPath();
      let firstG = true;
      for (const d of chartData) {
         if (d.glucose !== undefined && !isNaN(d.glucose)) {
            const x = getX(d.timestamp);
            const y = getY(d.glucose);
            if (firstG) { ctx.moveTo(x, y); firstG = false; }
            else ctx.lineTo(x, y);
         }
      }
      ctx.strokeStyle = isDark ? '#818cf8' : '#4f46e5';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Glucose dots
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      for (const d of chartData) {
         if (d.glucose !== undefined && !isNaN(d.glucose)) {
            const x = getX(d.timestamp);
            const y = getY(d.glucose);
            let fill = isDark ? '#818cf8' : '#4f46e5';
            if (d.value < (targetMin||70) || d.value > (targetMax||140)) fill = '#f59e0b';
            
            ctx.beginPath();
            ctx.arc(x, y, d.isLatest ? 5 : 2.5, 0, 2*Math.PI);
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.lineWidth = d.isLatest ? 2 : 1;
            ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
            ctx.stroke();
            
            if (d.isLatest && d.velocity !== undefined) {
               let arrow = '→';
               if (d.velocity > 2) arrow = '⇈';
               else if (d.velocity > 1) arrow = '↑';
               else if (d.velocity > 0.5) arrow = '↗';
               else if (d.velocity < -2) arrow = '⇊';
               else if (d.velocity < -1) arrow = '↓';
               else if (d.velocity < -0.5) arrow = '↘';
               ctx.font = '900 24px sans-serif';
               ctx.fillStyle = fill;
               ctx.shadowColor = 'rgba(0,0,0,0.8)';
               ctx.shadowBlur = 6;
               ctx.fillText(arrow, x + 24, y);
               ctx.shadowBlur = 0;
            }
         }
      }
      
      // Bolus, Meal, Site, Sensor
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const dropletsPathStrings = [
        "M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z",
        "M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"
      ];
      
      const signalPathStrings = [
        "M2 20h.01",
        "M7 20v-4",
        "M12 20v-8",
        "M17 20V8",
        "M22 4v16"
      ];

      for (const d of chartData) {
         const x = Math.round(getX(d.timestamp));
         if (d.bolusVal && d.originalB) {
             const yObj = Math.round(getY(chartMinY));
             const bh = Math.round(Math.min(40, (d.originalB.value || 0) * 5));
             ctx.fillStyle = 'rgba(79, 70, 229, 0.4)';
             ctx.fillRect(x - 2, yObj - bh, 4, bh);
             ctx.font = '16px serif';
             ctx.fillText('💉', x, yObj - bh - 10);
             if (d.stackingWarning) {
                 ctx.font = '12px serif';
                 ctx.fillText('⚠️', x, yObj - bh - 24);
             }
             ctx.font = '14px serif';
         }
         if (d.mealVal) {
             let baseCy = Math.round(getY(chartMinY)) - 10;
             if (d.bolusVal) baseCy -= Math.round(Math.min(40, (d.originalB?.value||0)*5)) + 10;
             ctx.font = '16px serif';
             ctx.fillText('🍽️', x, baseCy);
             ctx.font = '14px serif';
         }
         if (d.siteVal) {
             const cy = Math.round(getY(chartMaxY) + 15);
             ctx.save();
             ctx.translate(x - 8, cy - 8);
             ctx.scale(0.65, 0.65);
             ctx.strokeStyle = '#14b8a6'; // teal-500
             ctx.lineWidth = 2 / 0.65;
             ctx.lineCap = 'round';
             ctx.lineJoin = 'round';
             dropletsPathStrings.forEach(s => ctx.stroke(new Path2D(s)));
             ctx.restore();
         }
         if (d.sensorVal) {
             const cy = Math.round(getY(chartMaxY) + 15);
             ctx.save();
             ctx.translate(x - 8, cy - 8);
             ctx.scale(0.65, 0.65);
             ctx.strokeStyle = '#6366f1'; // indigo-500
             ctx.lineWidth = 2.5 / 0.65;
             ctx.lineCap = 'round';
             ctx.lineJoin = 'round';
             signalPathStrings.forEach(s => ctx.stroke(new Path2D(s)));
             ctx.restore();
         }
      }
    };
    
    let frameId;
    const triggerDraw = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(draw);
    };
    
    triggerDraw();
    window.addEventListener('resize', triggerDraw);
    return () => {
      window.removeEventListener('resize', triggerDraw);
      cancelAnimationFrame(frameId);
    };
  }, [chartData, start, end, chartMinY, chartMaxY, targetMin, targetMax, now, isDark, showLoopSimulation, showMLPrediction, xAxisTicks, lastMlTimestamp]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    
    const pL = 20, pR = 10;
    const cw = rect.width - pL - pR;
    const tClick = start + ((clickX - pL) / cw) * (end - start);
    
    let closestTimeDiff = Infinity;
    let closestData: any = null;
    
    for (const d of chartData) {
       const diff = Math.abs(d.timestamp - tClick);
       if (diff < closestTimeDiff && diff < 20 * 60000) { 
          closestTimeDiff = diff;
          closestData = d;
       }
    }
    
    if (closestData) {
       Haptics.selection();
       let point = null;
       if (closestData.originalG) point = closestData.originalG;
       else if (closestData.originalB) point = closestData.originalB;
       else if (closestData.originalM) point = closestData.originalM;
       else if (closestData.originalSite) point = closestData.originalSite;
       else if (closestData.originalSensor) point = closestData.originalSensor;

       if (point) {
         setSelectedPoint(point);
         let msg = '';
         if (point.type === 'glucose') {
           msg = `Poziom cukru: ${Math.round(Number(point.value))} mg/dL`;
         } else if (point.type === 'bolus') {
           msg = `Insulina: ${Number(point.value).toFixed(2)} j`;
         } else if (point.type === 'meal') {
           msg = `Węglowodany: ${Number(point.value).toFixed(1)} g`;
         } else if (point.type === 'site' || point.type === 'sensor') {
            msg = point.type === 'site' ? 'Wymiana wkłucia/Podaż' : 'Wymiana sensora';
         }
         
         if (msg) toast.success(msg, { icon: point.type === 'glucose' ? '🩸' : point.type === 'bolus' ? '💉' : point.type === 'meal' ? '🍽️' : '🔄' });
       }
    } else {
       setSelectedPoint(null);
    }
  };

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
          className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-white/10 text-slate-600 dark:text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all glass-target"
          title="Powiększ"
        >
          <Plus size={20} className="font-black" />
        </button>
        <button 
          onClick={handleZoomOut}
          className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-white/10 text-slate-600 dark:text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all glass-target"
          title="Pomniejsz"
        >
          <Minus size={20} className="font-black" />
        </button>
        <button 
          onClick={handleReset}
          className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-white/10 text-slate-600 dark:text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all glass-target"
          title="Reset"
        >
          <Maximize2 size={18} className="font-black" />
        </button>
      </div>


      <div className="w-full relative h-[400px] landscape:h-[230px] md:landscape:h-[320px] lg:landscape:h-[400px] outline-none focus:outline-none focus-visible:outline-none">
        {!hasData && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-[2px] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 glass-target">
            <div className="w-12 h-12 rounded-full bg-accent-500/10 flex items-center justify-center mb-4 animate-pulse">
              <Move className="text-accent-500" size={24} />
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter italic mb-1">Brak danych do wyświetlenia</h3>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 max-w-[200px] leading-relaxed">System właśnie synchronizuje Twoje ostatnie wyniki z Nightscout. Zaraz się pojawią!</p>
          </div>
        )}
        <canvas 
          className="w-full h-full outline-none select-none touch-none" 
          onClick={handleCanvasClick}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          style={{ cursor: "pointer", touchAction: "none" }} 
        />
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
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white p-4 rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-2xl backdrop-blur-xl z-30 min-w-[180px] glass-target"
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
