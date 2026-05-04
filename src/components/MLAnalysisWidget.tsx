import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Cpu, AlertTriangle, TrendingUp, TrendingDown, Target, Loader2, RefreshCw } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { LogEntry } from '../types';
import { MLAnalyzer } from '../services/mlSugarAnalyzer';

interface MLAnalysisWidgetProps {
  logs: LogEntry[];
}

export default function MLAnalysisWidget({ logs }: MLAnalysisWidgetProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mlResult, setMlResult] = useState<{
    predictedNextHour: number,
    riskOfHypo: boolean,
    insights: string[],
    accuracy: number,
    metrics?: { iob: number, cob: number, carbSensitivity: number, insulinSensitivity: number, gmiPercentage: number, avgBias: number }
  } | null>(null);

  useEffect(() => {
    if (logs && logs.length >= 5) {
      runML();
    }
  }, [logs]);

  const runML = async () => {
    setIsAnalyzing(true);
    // Symulujemy małe opóźnienie dla UX, ale tensorflow może potrzebować chwilki
    setTimeout(async () => {
        try {
            const result = await MLAnalyzer.analyzeData(logs);
            setMlResult(result);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    }, 100);
  };

  const chartData = useMemo(() => {
    if (!mlResult) return [];
    
    // Use last 5 glucose readings
    const glucoseLogs = logs
      .filter(l => l.type === 'glucose')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .reverse();
      
    const data = glucoseLogs.map((log, i) => ({
      name: `T-${5 - i}`,
      value: log.value,
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

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-xl border border-accent-100 dark:border-accent-900/40 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-accent-500/10 blur-3xl rounded-full pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg ring-4 ring-indigo-50 dark:ring-indigo-900/50">
            <Cpu size={24} className="text-white" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">GlikoSense</h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              {isAnalyzing ? (
                <>
                  <Loader2 size={10} className="animate-spin text-accent-500" /> W RAMACH OBLICZEŃ...
                </>
              ) : (
                'GlikoSense ENGINE'
              )}
            </span>
          </div>
        </div>
        
        <button 
          onClick={runML} 
          disabled={isAnalyzing}
          className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-accent-500 dark:text-slate-400 rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50"
          title="Odśwież analizę"
        >
          <RefreshCw size={18} className={isAnalyzing ? 'animate-spin' : ''} />
        </button>
      </div>

      <AnimatePresence mode="wait">
          {logs.length < 5 ? (
            <motion.div 
               key="nodata"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="h-48 flex items-center justify-center relative z-10 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50"
            >
               <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Zbyt mało danych do analizy (min. 5 wpisów)</span>
            </motion.div>
          ) : mlResult && !isAnalyzing ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 relative z-10"
              >
                  <div className="grid grid-cols-2 gap-4">
                      {/* Prediction Box */}
                      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-20">
                             <TrendingUp size={80} />
                          </div>
                          <div className="flex items-center gap-2 mb-2 relative z-10">
                              <Target size={16} className="text-indigo-200" />
                              <span className="text-[11px] font-black text-indigo-100 uppercase tracking-wider">Za 1 godzinę</span>
                          </div>
                          <div className="flex items-baseline gap-1 relative z-10">
                              <span className="text-4xl font-black">{mlResult.predictedNextHour}</span>
                              <span className="text-xs font-bold text-indigo-200">mg/dL</span>
                          </div>
                          
                          {/* Mini sparkline visualization */}
                          <div className="h-12 w-full mt-3 opacity-90">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                   <defs>
                                      <linearGradient id="colorSparkline" x1="0" y1="0" x2="0" y2="1">
                                         <stop offset="5%" stopColor="#fff" stopOpacity={0.5}/>
                                         <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                                      </linearGradient>
                                   </defs>
                                   <Area 
                                      type="monotone" 
                                      dataKey="value" 
                                      stroke="#fff" 
                                      strokeWidth={2} 
                                      fill="url(#colorSparkline)" 
                                      isAnimationActive={true}
                                   />
                                </AreaChart>
                             </ResponsiveContainer>
                          </div>
                      </div>

                      {/* Confidence & Alerts Box */}
                      <div className="flex flex-col gap-4">
                          <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex-1 flex flex-col justify-center">
                              <div className="flex items-center gap-2 mb-1">
                                  <Brain size={14} className="text-emerald-500" />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Pewność Modelu</span>
                              </div>
                              <div className="flex items-end gap-2">
                                  <span className="text-2xl font-black text-slate-800 dark:text-white">{mlResult.accuracy}%</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${mlResult.accuracy}%` }} />
                              </div>
                          </div>
                          
                          {mlResult.riskOfHypo && (
                             <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 p-3 rounded-2xl flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400">
                                <AlertTriangle size={16} className="animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-wider">Ryzyko Hipo</span>
                             </div>
                          )}
                      </div>
                  </div>

                  {mlResult.metrics && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Aktywna Insulina</span>
                              <span className="text-xl font-black text-slate-800 dark:text-slate-200">{mlResult.metrics.iob.toFixed(1)} <span className="text-[10px] text-slate-400">j</span></span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Aktywne Węglow.</span>
                              <span className="text-xl font-black text-slate-800 dark:text-slate-200">{mlResult.metrics.cob.toFixed(0)} <span className="text-[10px] text-slate-400">g</span></span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Oporność (Bias)</span>
                              <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                                {mlResult.metrics.avgBias > 0 ? '+' : ''}{mlResult.metrics.avgBias.toFixed(0)} <span className="text-[10px] text-slate-400">mg/dL</span>
                              </span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">GMI (Szacunkowe)</span>
                              <span className="text-xl font-black text-slate-800 dark:text-slate-200">{mlResult.metrics.gmiPercentage > 0 ? mlResult.metrics.gmiPercentage.toFixed(1) : '--'} <span className="text-[10px] text-slate-400">%</span></span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Czułość (Węglowodany)</span>
                              <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                                {mlResult.metrics.carbSensitivity > 0 ? '+' : ''}{mlResult.metrics.carbSensitivity.toFixed(0)} <span className="text-[10px] text-slate-400">/ 50g</span>
                              </span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Wrażliwość (Insulina)</span>
                              <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                                {mlResult.metrics.insulinSensitivity > 0 ? '+' : ''}{mlResult.metrics.insulinSensitivity.toFixed(0)} <span className="text-[10px] text-slate-400">/ 5j</span>
                              </span>
                          </div>
                      </div>
                  )}

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 space-y-3">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Brain size={14} /> Wnioski Systemu
                      </h4>
                      <div className="space-y-3">
                        {mlResult.insights.map((insight, idx) => {
                            const isWarning = insight.includes('⚠️');
                            return (
                                <div key={idx} className={`p-4 rounded-2xl flex gap-3 text-sm font-medium ${isWarning ? 'bg-rose-100/50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-sm'}`}>
                                    {insight}
                                </div>
                            );
                        })}
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
