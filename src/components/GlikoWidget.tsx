import React from 'react';
import { motion } from 'motion/react';
import { Radio, Droplet, Clock, ChevronRight, Utensils } from 'lucide-react';
import { LogEntry } from '../types';
import { cn } from '../lib/utils';

interface GlikoWidgetProps {
  logs: LogEntry[];
  setTab: (t: string) => void;
  iob: number;
  todayStats: { carbs: number; insulin: number };
  trend?: { icon: React.ReactNode, color: string, text: string, deltaText?: string } | null;
  tir: { low: number; inRange: number; high: number };
  hba1c: number;
  glassmorphismEnabled?: boolean;
  compact?: boolean;
}

export default function GlikoWidget({ logs, setTab, iob, todayStats, trend, tir, hba1c, glassmorphismEnabled, compact }: GlikoWidgetProps) {
  const lastGlucose = logs.find(l => l.type === 'glucose');
  const lastBolus = logs.find(l => l.type === 'bolus');
  const lastMeal = logs.find(l => l.type === 'meal');

  const getTimeAgo = (timestamp: number) => {
    const min = Math.round((Date.now() - timestamp) / 60000);
    if (min < 1) return 'teraz';
    if (min < 60) return `${min}m temu`;
    return `${Math.round(min / 60)}h temu`;
  };

  if (compact) {
    return (
      <motion.div 
        whileTap={{ scale: 0.98 }}
        onClick={() => setTab('chart')}
        className={cn(
          "p-4 text-slate-900 dark:text-white shadow-2xl rounded-[2rem] border-l-[6px] overflow-hidden relative group h-full flex flex-col justify-between min-h-[160px] cursor-pointer",
          glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white/60 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-800",
          (lastGlucose?.value || 100) > 180 ? 'border-l-amber-500' :
          (lastGlucose?.value || 100) < 70 ? 'border-l-rose-500' :
          'border-l-emerald-500'
        )}
      >
        {/* Background Accent (Animated Pulse) */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1], 
            opacity: [0.05, 0.1, 0.05] 
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={cn(
            "absolute top-0 right-0 w-32 h-32 blur-[50px] -mr-16 -mt-16 transition-colors duration-1000",
            (lastGlucose?.value || 100) > 180 ? 'bg-amber-500/30' :
            (lastGlucose?.value || 100) < 70 ? 'bg-rose-500/30' :
            'bg-emerald-500/30'
          )}
        />

        <div className="flex justify-between items-center relative z-10 mb-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Glikemia</span>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
            {lastGlucose ? getTimeAgo(lastGlucose.timestamp) : '--'}
          </span>
        </div>

        <div className="relative z-10 my-auto flex flex-col justify-center">
          <div className="flex items-baseline gap-1 justify-center py-1">
            <motion.span 
              key={`val-${lastGlucose?.timestamp || 'none'}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-black text-slate-900 dark:text-white leading-none tracking-tighter"
            >
              {lastGlucose?.value || '--'}
            </motion.span>
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-tighter leading-none">mg/dL</span>
              {trend && (
                <div className={cn("scale-90 origin-left mt-0.5", trend.color)}>
                  {trend.icon}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-center mt-1">
            <span className={`p-0.5 px-2 rounded-full text-[8px] font-black uppercase inline-block border ${
              (lastGlucose?.value || 100) > 180 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
              (lastGlucose?.value || 100) < 70 ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
              'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            }`}>
              {(lastGlucose?.value || 100) > 180 ? 'Wysoki' : (lastGlucose?.value || 100) < 70 ? 'Niski' : 'Norma'}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 relative z-10 flex items-center justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400">
          <span>IOB: <span className="font-black text-accent-500">{iob.toFixed(1)}j</span></span>
          <span>HbA1c: <span className="font-black text-accent-500">{hba1c > 0 ? hba1c.toFixed(1) : '--'}%</span></span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => setTab('chart')}
      className={cn(
        "p-6 text-slate-900 dark:text-white shadow-2xl rounded-[2rem] border-l-[6px] overflow-hidden relative group breath",
        glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white/60 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-800",
        (lastGlucose?.value || 100) > 180 ? 'border-l-amber-500' :
        (lastGlucose?.value || 100) < 70 ? 'border-l-rose-500' :
        'border-l-emerald-500'
      )}
    >
      {/* Background Accent (Animated Pulse) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1], 
          opacity: [0.1, 0.2, 0.1] 
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={cn(
          "absolute top-0 right-0 w-64 h-64 blur-[100px] -mr-32 -mt-32 transition-colors duration-1000",
          (lastGlucose?.value || 100) > 180 ? 'bg-amber-500/30' :
          (lastGlucose?.value || 100) < 70 ? 'bg-rose-500/30' :
          'bg-emerald-500/30'
        )}
      />

      <div className="flex justify-between items-center mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
          >
            <Radio size={16} className="text-emerald-500" />
          </motion.div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Stan Glikemii</span>
        </div>
        
        <div className="bg-slate-100/50 dark:bg-white/5 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md border border-slate-200/50 dark:border-white/5">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">EST. HbA1c</span>
          <span className="text-[10px] font-black text-accent-600 dark:text-accent-400">{hba1c > 0 ? hba1c.toFixed(1) : '--'}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 relative z-10">
        <div className="flex items-end justify-between border-b border-slate-200/50 dark:border-white/5 pb-6">
          <div>
            <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-1">Ostatni Pomiar</span>
            <div className="flex items-baseline gap-2">
              <motion.span 
                key={`val-${lastGlucose?.timestamp || 'none'}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.3 }}
                className="text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tighter"
              >
                {lastGlucose?.value || '--'}
              </motion.span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter leading-none">mg/dL</span>
                {trend && (
                  <motion.div 
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={cn("flex items-center gap-0.5", trend.color)}
                  >
                    <div className="scale-75 origin-left">
                      {trend.icon}
                    </div>
                    {trend.deltaText && (
                      <span className="text-[10px] font-black tracking-tighter opacity-80 mt-0.5">
                        {trend.deltaText}
                      </span>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1.5 mb-2">
               <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">Insulina Aktywna</span>
               <span className="text-xl font-black text-accent-600 dark:text-accent-400 tracking-tight">{iob.toFixed(2)}<span className="text-[10px] ml-0.5 opacity-50">j</span></span>
            </div>
            
            <motion.div 
              key={`label-${lastGlucose?.timestamp || 'none'}`}
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className={`p-1 px-3 rounded-full text-[9px] font-black uppercase inline-block border ${
              (lastGlucose?.value || 100) > 180 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
              (lastGlucose?.value || 100) < 70 ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
              'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            }`}>
              {(lastGlucose?.value || 100) > 180 ? 'Wysoki' : (lastGlucose?.value || 100) < 70 ? 'Niski' : 'W Normie'}
            </motion.div>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1 mt-2">
              <Clock size={10} /> {lastGlucose ? getTimeAgo(lastGlucose.timestamp) : '--'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div whileHover={{ scale: 1.02 }} className="bg-slate-100/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 flex flex-col justify-between glass-target">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Droplet size={12} className="text-accent-500" />
                <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Dziś Jednostek</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{todayStats.insulin.toFixed(1)}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">j.</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/30 dark:border-white/5">
               <span className="text-[8px] font-bold text-slate-400 block">Ostatnia: {lastBolus ? getTimeAgo(lastBolus.timestamp) : '--'}</span>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} className="bg-slate-100/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 flex flex-col justify-between glass-target">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Utensils size={12} className="text-amber-500" />
                <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Dziś Węglowodany</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800 dark:text-white">{todayStats.carbs}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">g</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/30 dark:border-white/5">
               <span className="text-[8px] font-bold text-slate-400 block">Ostatni: {lastMeal ? getTimeAgo(lastMeal.timestamp) : '--'}</span>
            </div>
          </motion.div>
        </div>

        {/* TIR Bar Integrated */}
        <div className="pt-4 border-t border-slate-200/50 dark:border-white/5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">W Zakresie (TIR)</p>
            <motion.span 
              key={tir.inRange}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[10px] font-black text-emerald-600 dark:text-emerald-400"
            >
              {tir.inRange}%
            </motion.span>
          </div>
          <div className="h-1.5 w-full bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden flex">
            <motion.div 
              initial={{ width: 0 }} animate={{ width: `${tir.low}%` }} transition={{ duration: 1, ease: 'easeOut' }}
              className="bg-rose-500 h-full" 
            />
            <motion.div 
              initial={{ width: 0 }} animate={{ width: `${tir.inRange}%` }} transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
              className="bg-emerald-500 h-full" 
            />
            <motion.div 
              initial={{ width: 0 }} animate={{ width: `${tir.high}%` }} transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
              className="bg-amber-500 h-full" 
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
