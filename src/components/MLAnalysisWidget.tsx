import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Activity, AlertTriangle, TrendingUp, TrendingDown, Target, Loader2, RefreshCw, Zap, Sparkles, CalendarDays, Syringe } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { LogEntry, UserSettings } from '../types';
import { MLAnalyzer } from '../services/mlSugarAnalyzer';
import { cn } from '../lib/utils';
import GlikoSenseIcon from './GlikoSenseIcon';

interface MLAnalysisWidgetProps {
  logs: LogEntry[];
  settings?: UserSettings;
}

export default function MLAnalysisWidget({ logs, settings }: MLAnalysisWidgetProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mlResult, setMlResult] = useState<{
    predictedNextHour: number,
    riskOfHypo: boolean,
    insights: string[],
    accuracy: number,
    datasetSize?: number,
    predictionCurve?: { timestamp: number, offsetMs: number, value: number }[],
    metrics?: { iob: number, cob: number, carbSensitivity: number, insulinSensitivity: number, gmiPercentage: number, avgBias: number },
    analyzedPeriod?: string
  } | null>(() => {
    // Inicjalizacja z cache, aby uniknąć migania loaderem
    const cached = localStorage.getItem('glikosense_last_result_v2');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const lastProcessedLogsRef = React.useRef<string>("");

  useEffect(() => {
    const logsKey = logs.length > 0 
      ? `${logs.length}-${logs[logs.length - 1].timestamp || logs[logs.length - 1].createdAt}`
      : "empty";

    let timer: NodeJS.Timeout;

    if (logs && logs.length >= 5 && logsKey !== lastProcessedLogsRef.current) {
        timer = setTimeout(() => {
          lastProcessedLogsRef.current = logsKey;
          runML();
        }, 1000); // 1 second debounce
    }

    // Dodatkowy interwał do odświeżania cyklicznego co 5 minut
    const interval = setInterval(() => {
      runML();
    }, 5 * 60 * 1000);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
    };
  }, [logs]);

  const runML = async (force: boolean = false) => {
    if (isAnalyzing && !force) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    // Safety timeout in case ML analysis hangs completely (e.g. indexedDB or tfjs issues)
    const safetyTimeout = setTimeout(() => {
        setIsAnalyzing(false);
        setError("Przekroczono czas oczekiwania na model.");
    }, 40000); // 40 seconds max
    
    try {
        // Start quick analysis immediately
        const quickPromise = MLAnalyzer.analyzeData(logs, force, 'quick');
        
        // Wait for quick result to show something to the user
        const qResult = await quickPromise;
        setMlResult(qResult);
        setIsAnalyzing(false); // Stop the main "Calculations" indicator
        
        // Now start full analysis in the background without blocking the result display
        MLAnalyzer.analyzeData(logs, force, 'full')
          .then(fullResult => {
              setMlResult(fullResult);
              setError(null);
          })
          .catch(e => {
              console.error("GlikoSense Full Analysis Error:", e);
              // Nie ustawiamy błędu globalnego jeśli mamy już wynik quick
              if (!qResult) setError("Błąd pełnej analizy.");
          })
          .finally(() => {
              clearTimeout(safetyTimeout);
          });
          
    } catch (e) {
        console.error("GlikoSense Quick Analysis Error:", e);
        setError("Nie udało się przeanalizować danych. Spróbuj później.");
        clearTimeout(safetyTimeout);
        setIsAnalyzing(false);
    }
  };

  const chartData = useMemo(() => {
    if (!mlResult) return [];
    
    // Use last 5 glucose readings
    const glucoseLogs = logs
      .filter(l => l.type === 'glucose' || l.bg)
      .sort((a, b) => {
        const ta = a.timestamp || new Date(a.createdAt).getTime();
        const tb = b.timestamp || new Date(b.createdAt).getTime();
        return tb - ta;
      })
      .slice(0, 5)
      .reverse();
      
    const data = glucoseLogs.map((log, i) => ({
      name: `T-${5 - i}`,
      value: log.value || log.bg,
      isPrediction: false
    }));
    
    // If no data, provide some realistic dummy pattern
    if (data.length === 0) {
       data.push({ name: 'T-2', value: 100, isPrediction: false }, { name: 'T-1', value: 110, isPrediction: false });
    }
    
    // Add the prediction
    data.push({
       name: 'T-0',
       value: data[data.length - 1].value, // Connector
       isPrediction: false
    });
    
    data.push({
      name: 'Pred',
      value: mlResult.predictedNextHour,
      isPrediction: true
    });
    
    return data;
  }, [logs, mlResult]);

  const dailyStats = useMemo(() => {
    const now = new Date();
    const days = [0, 1, 2].map(offset => {
        const d = new Date(now);
        d.setDate(d.getDate() - offset);
        d.setHours(0, 0, 0, 0);
        return {
            date: d.getTime(),
            label: offset === 0 ? 'Dzis' : offset === 1 ? 'Wczor' : d.toLocaleDateString('pl-PL', { weekday: 'short' }),
            glucoseLogs: [] as LogEntry[],
            bolusTotal: 0
        };
    });

    logs.forEach(log => {
        const logTime = log.timestamp || (log.createdAt && new Date(log.createdAt).getTime()) || 0;
        if (!logTime) return;
        
        for (const day of days) {
           if (logTime >= day.date && logTime < day.date + 86400000) {
              if (log.type === 'glucose' || log.bg) {
                  day.glucoseLogs.push(log);
              } else if (log.type === 'bolus') {
                  day.bolusTotal += log.value || 0;
              }
           }
        }
    });

    return days.map(day => {
        let tir = 0;
        let avg = 0;
        if (day.glucoseLogs.length > 0) {
            const inRange = day.glucoseLogs.filter(l => {
                const v = l.value || l.bg || 0;
                const min = settings?.targetMin ?? 70;
                const max = settings?.targetMax ?? 180;
                return v >= min && v <= max;
            }).length;
            tir = Math.round((inRange / day.glucoseLogs.length) * 100);
            avg = Math.round(day.glucoseLogs.reduce((sum, l) => sum + (l.value || l.bg || 0), 0) / day.glucoseLogs.length);
        }
        return {
            label: day.label,
            tir: day.glucoseLogs.length > 0 ? tir : null,
            avg: day.glucoseLogs.length > 0 ? avg : null,
            bolus: day.bolusTotal
        };
    });
  }, [logs, settings]);

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-accent-100 dark:border-accent-900/40 relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-accent-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-accent-500/20 transition-all duration-1000" />
      <div className="absolute -bottom-32 -left-32 w-[20rem] h-[20rem] bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50 dark:ring-indigo-900/30">
            <GlikoSenseIcon size={24} isAnalyzing={isAnalyzing} />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xl font-black tracking-tighter text-slate-800 dark:text-white">GlikoSense<span className="text-indigo-500 text-2xl leading-none">.</span></h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1.5 mt-0.5">
              {isAnalyzing ? (
                <>
                  <Loader2 size={10} className="animate-spin text-accent-500" /> OBLICZANIE...
                </>
              ) : (
                <>
                  {mlResult?.analyzedPeriod ? mlResult.analyzedPeriod : 'GlikoSense ENGINE'}
                </>
              )}
            </span>
          </div>
        </div>
        
        <button 
          onClick={() => runML(true)} 
          disabled={isAnalyzing}
          className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-accent-500 dark:text-slate-400 rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50"
          title="Odśwież analizę"
        >
          <RefreshCw size={18} className={isAnalyzing ? 'animate-spin' : ''} />
        </button>
      </div>

      <AnimatePresence mode="wait">
          {logs.filter(l => l.type === 'glucose' || l.bg).length < 5 ? (
            <motion.div 
               key="nodata"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="h-48 flex items-center justify-center relative z-10 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50"
            >
               <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Zbyt mało danych do analizy (min. 5 wpisów)</span>
            </motion.div>
          ) : error && !mlResult ? (
            <motion.div 
               key="error"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="h-48 flex flex-col items-center justify-center relative z-10 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30"
            >
               <AlertTriangle size={32} className="text-amber-500 mb-4" />
               <span className="text-xs font-bold uppercase tracking-widest text-amber-500 text-center px-6">{error}</span>
               <button 
                 onClick={() => runML(true)}
                 className="mt-4 text-[10px] font-bold text-accent-500 uppercase tracking-widest hover:underline"
               >
                 Spróbuj ponownie
               </button>
            </motion.div>
          ) : isAnalyzing && !mlResult ? (
            <motion.div 
               key="analyzing_fresh"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="h-48 flex flex-col items-center justify-center relative z-10 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700"
            >
               <Loader2 size={32} className="animate-spin text-accent-500 mb-4 opacity-50" />
               <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Pierwsza analiza GlikoSense...</span>
               <span className="text-[10px] text-slate-400 mt-2">To może potrwać kilka sekund</span>
            </motion.div>
          ) : mlResult ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="space-y-5 relative z-10"
              >
                  <div className="grid grid-cols-2 gap-3 md:gap-5">
                      {/* Prediction Box */}
                      <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 dark:from-slate-950 dark:via-indigo-950 dark:to-violet-950 p-5 md:p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group border border-indigo-500/20 flex flex-col">
                          <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:opacity-20 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 transform-gpu">
                             <TrendingUp size={160} />
                          </div>
                          {/* Inner glow */}
                          <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent pointer-events-none" />
                          
                          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4 relative z-10">
                              <div className="bg-indigo-500/30 p-1.5 md:p-2 rounded-xl backdrop-blur-md">
                                <Target size={16} className="text-indigo-200" />
                              </div>
                              <span className="text-[10px] md:text-[11px] font-black text-indigo-100 uppercase tracking-[0.1em] md:tracking-[0.2em] opacity-90">Kierunek (1h)</span>
                          </div>
                          <div className="flex items-baseline gap-1 md:gap-2 relative z-10 mt-auto">
                              <span className="text-5xl md:text-7xl font-black tracking-tighter drop-shadow-sm leading-none">{mlResult.predictedNextHour}</span>
                              <span className="text-[10px] md:text-sm font-bold text-indigo-300 tracking-wider md:tracking-widest">mg/dL</span>
                          </div>
                          
                          {/* Mini sparkline visualization */}
                          <div className="h-10 md:h-16 w-full mt-3 md:mt-4 pr-2 md:pr-4 opacity-100 mix-blend-screen shrink-0">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                   <defs>
                                      <linearGradient id="colorSparkline" x1="0" y1="0" x2="0" y2="1">
                                         <stop offset="5%" stopColor="#818cf8" stopOpacity={0.6}/>
                                         <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                      </linearGradient>
                                   </defs>
                                   <Area 
                                      type="monotone" 
                                      dataKey="value" 
                                      stroke="#a5b4fc" 
                                      strokeWidth={3} 
                                      fill="url(#colorSparkline)" 
                                      isAnimationActive={true}
                                      animationDuration={1500}
                                   />
                                </AreaChart>
                             </ResponsiveContainer>
                          </div>
                      </div>

                      {/* Confidence & Alerts Box */}
                      <div className="flex flex-col gap-3 md:gap-5">
                          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-5 md:p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-700/60 shadow-lg flex-1 flex flex-col justify-center relative overflow-hidden group">
                              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                              <div className="flex items-center gap-2 mb-2 md:mb-3 relative z-10">
                                  <div className="bg-emerald-100 dark:bg-emerald-900/40 p-1.5 md:p-2 rounded-xl">
                                    <GlikoSenseIcon size={16} isAnalyzing={true} />
                                  </div>
                                  <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] md:tracking-[0.2em] leading-tight">Pewność Modelu</span>
                              </div>
                              <div className="flex items-end gap-2 relative z-10 mt-auto">
                                  <span className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{mlResult.accuracy}%</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700/50 h-2 md:h-2.5 rounded-full mt-3 md:mt-4 overflow-hidden relative z-10">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${mlResult.accuracy}%` }}
                                    transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
                                    className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full" 
                                  />
                              </div>
                              {mlResult.datasetSize && (
                                <div className="mt-3 flex items-center justify-between relative z-10">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Model Wyuczony:</span>
                                  <span className="text-[10px] font-black text-indigo-500">{mlResult.datasetSize} pkt danych</span>
                                </div>
                              )}
                          </div>
                          
                          {mlResult.riskOfHypo && (
                             <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-900/20 border-2 border-amber-200 dark:border-amber-800/50 p-3 md:p-4 rounded-[2rem] flex items-center justify-center gap-2 md:gap-3 text-amber-600 dark:text-amber-400 shadow-sm"
                             >
                                <div className="bg-white/50 dark:bg-black/20 p-1.5 md:p-2 rounded-full">
                                  <AlertTriangle size={16} className="animate-pulse" />
                                </div>
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-[0.2em]">Ryzyko Hipo</span>
                             </motion.div>
                          )}
                      </div>
                  </div>

                  {mlResult.metrics && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-indigo-500 transition-colors">Profil Działania Insuliny</span>
                              <div className="flex flex-col">
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">{mlResult.metrics.iob.toFixed(1)} <span className="text-xs font-bold text-slate-400 tracking-normal">j</span></span>
                                {mlResult.metrics.iob > 0 && (
                                  <span className="text-[7px] font-bold text-pink-500/80 uppercase mt-0.5 tracking-tighter">Start: ~20m • Szczyt: ~75m</span>
                                )}
                              </div>
                          </div>
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-amber-500 transition-colors">Aktywne Węglow.</span>
                              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">{mlResult.metrics.cob.toFixed(0)} <span className="text-xs font-bold text-slate-400 tracking-normal">g</span></span>
                          </div>
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-amber-500 transition-colors">Oporność (Bias)</span>
                              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                {mlResult.metrics.avgBias > 0 ? '+' : ''}{mlResult.metrics.avgBias.toFixed(0)} <span className="text-xs font-bold text-slate-400 tracking-normal">mg/dL</span>
                              </span>
                          </div>
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-emerald-500 transition-colors">GMI (Wskaźnik)</span>
                              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">{mlResult.metrics.gmiPercentage > 0 ? mlResult.metrics.gmiPercentage.toFixed(1) : '--'} <span className="text-xs font-bold text-slate-400 tracking-normal">%</span></span>
                          </div>
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-orange-500 transition-colors">Czułość (Węg.)</span>
                              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                {mlResult.metrics.carbSensitivity > 0 ? '+' : ''}{mlResult.metrics.carbSensitivity.toFixed(0)} <span className="text-xs font-bold text-slate-400 tracking-normal whitespace-nowrap">/ 50g</span>
                              </span>
                          </div>
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-cyan-500 transition-colors">Wrażliwość (Ins.)</span>
                              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                {mlResult.metrics.insulinSensitivity > 0 ? '+' : ''}{mlResult.metrics.insulinSensitivity.toFixed(0)} <span className="text-xs font-bold text-slate-400 tracking-normal whitespace-nowrap">/ 1j</span>
                              </span>
                          </div>
                      </div>
                  )}

                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-900/40 p-6 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-700/50 space-y-4">
                      <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-500" /> Wnioski Systemu
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mlResult.insights.map((insight, idx) => {
                            const isWarning = insight.includes('⚠️') || insight.includes('🚨') || insight.includes('🎯');
                            return (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3 + (idx * 0.1) }}
                                  key={`insight-text-${idx}`} 
                                  className={`p-4 rounded-3xl flex gap-3 text-sm font-medium leading-relaxed shadow-sm ${
                                    isWarning 
                                    ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-800 border-amber-200 dark:from-amber-950/40 dark:to-amber-900/20 dark:text-amber-300 dark:border-amber-900/50' 
                                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700/50'
                                  } border`}
                                >
                                    {insight}
                                </motion.div>
                            );
                        })}
                      </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-900/40 p-6 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-700/50 space-y-4">
                      <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <CalendarDays size={14} className="text-indigo-500" /> Ostatnie 3 Dni
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        {dailyStats.map((stat, idx) => (
                           <div key={`insight-${idx}`} className="bg-white dark:bg-slate-800/80 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all hover:border-indigo-500/30">
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</span>
                             <div className="flex flex-col items-center">
                               <span className={cn(
                                 "text-lg font-black leading-none",
                                 stat.avg ? (stat.avg > 180 || stat.avg < 70 ? 'text-amber-500' : 'text-emerald-500') : 'text-slate-300'
                               )}>
                                 {stat.avg || '--'}
                               </span>
                               <span className="text-[8px] font-bold text-slate-400 uppercase">mg/dL</span>
                             </div>
                             <div className="flex flex-col items-center w-full pt-1 border-t border-slate-50 dark:border-slate-700/30">
                               <div className="flex items-center gap-1">
                                 <Target size={10} className="text-emerald-500" />
                                 <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">{stat.tir != null ? `${stat.tir}%` : '--'}</span>
                               </div>
                               <div className="flex items-center gap-1 text-slate-400">
                                 <Syringe size={10} className="text-indigo-400" />
                                 <span className="text-[9px] font-bold">{stat.bolus > 0 ? stat.bolus.toFixed(1) : '0'} j</span>
                               </div>
                             </div>
                           </div>
                        ))}
                      </div>
                  </div>
              </motion.div>
          ) : (
            <motion.div 
               key="loading"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="h-48 flex items-center justify-center relative z-10"
            >
               <div className="flex flex-col items-center gap-4 text-accent-500">
                 <Loader2 size={32} className="animate-spin opacity-80" />
                 <span className="text-xs font-bold uppercase tracking-widest opacity-80">Przetwarzanie danych lokalnych...</span>
               </div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
