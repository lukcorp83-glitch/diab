import React from 'react';
import { motion } from 'motion/react';
import { Activity, Droplet, Clock, ChevronRight, Utensils } from 'lucide-react';
import { LogEntry } from '../types';
import { cn } from '../lib/utils';

interface GlikoWidgetProps {
  logs: LogEntry[];
  setTab: (t: string) => void;
  iob: number;
  todayStats: { carbs: number; insulin: number };
  trend?: { icon: React.ReactNode, color: string, text: string } | null;
  tir: { low: number; inRange: number; high: number };
  hba1c: number;
}

export default function GlikoWidget({ logs, setTab, iob, todayStats, trend, tir, hba1c }: GlikoWidgetProps) {
  const lastGlucose = logs.find(l => l.type === 'glucose');
  const lastBolus = logs.find(l => l.type === 'bolus');
  const lastMeal = logs.find(l => l.type === 'meal');

  const getTimeAgo = (timestamp: number) => {
    const min = Math.round((Date.now() - timestamp) / 60000);
    if (min < 1) return 'teraz';
    if (min < 60) return `${min}m temu`;
    return `${Math.round(min / 60)}h temu`;
  };

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => setTab('dashboard')}
      className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl border-l-[6px] border-emerald-500 overflow-hidden relative group"
    >
      {/* Background Accent (Animated Pulse) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1], 
          opacity: [0.3, 0.5, 0.3] 
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={cn(
          "absolute top-0 right-0 w-48 h-48 blur-[80px] -mr-16 -mt-16 transition-colors duration-1000",
          (lastGlucose?.value || 100) > 180 ? 'bg-indigo-500' :
          (lastGlucose?.value || 100) < 70 ? 'bg-rose-500' :
          'bg-emerald-500'
        )}
      />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="p-2 bg-emerald-500/20 rounded-xl"
          >
            <Activity size={16} className="text-emerald-400" />
          </motion.div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Status Na Żywo</span>
        </div>
        
        <div className="bg-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md border border-white/5">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">EST. HbA1c</span>
          <span className="text-[10px] font-black text-indigo-300">{hba1c > 0 ? hba1c.toFixed(1) : '--'}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="flex items-end justify-between border-b border-white/5 pb-6">
          <div>
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block mb-1">Ostatni Cukier</span>
            <div className="flex items-baseline gap-2">
              <motion.span 
                key={lastGlucose?.value}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="text-5xl font-black text-white leading-none"
              >
                {lastGlucose?.value || '--'}
              </motion.span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-tighter">mg/dL</span>
                {trend && (
                  <motion.div 
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={cn("flex items-center gap-0.5", trend.color)}
                  >
                    <div className="scale-75 origin-left">
                      {trend.icon}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1 mb-2">
               <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">Aktywna Insulina</span>
               <span className="text-xl font-black text-indigo-400">{iob.toFixed(2)}<span className="text-[10px] ml-0.5 opacity-50">j</span></span>
            </div>
            <motion.div 
              key={lastGlucose?.value}
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className={`p-1 px-3 rounded-full text-[9px] font-black uppercase inline-block ${
              (lastGlucose?.value || 100) > 180 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' :
              (lastGlucose?.value || 100) < 70 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
            }`}>
              {(lastGlucose?.value || 100) > 180 ? 'Wysoki' : (lastGlucose?.value || 100) < 70 ? 'Niski' : 'W Normie'}
            </motion.div>
            <span className="text-[9px] font-bold text-slate-500 flex items-center justify-end gap-1 mt-2">
              <Clock size={10} /> {lastGlucose ? getTimeAgo(lastGlucose.timestamp) : '--'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div whileHover={{ scale: 1.02 }} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Droplet size={12} className="text-indigo-400" />
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Dziś Insulina</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{todayStats.insulin.toFixed(1)}</span>
                <span className="text-[10px] font-bold text-slate-500">j.</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5">
               <span className="text-[8px] font-bold text-slate-600 block">Ostatnia: {lastBolus ? getTimeAgo(lastBolus.timestamp) : '--'}</span>
            </div>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Utensils size={12} className="text-amber-400" />
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Dziś Posiłki</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{(todayStats.carbs / 10).toFixed(1)}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">WW</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5">
               <span className="text-[8px] font-bold text-slate-600 block">Ostatni: {lastMeal ? getTimeAgo(lastMeal.timestamp) : '--'}</span>
            </div>
          </motion.div>
        </div>

        {/* TIR Bar Integrated */}
        <div className="pt-4 border-t border-white/5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Czas w Zakresie (TIR)</p>
            <motion.span 
              key={tir.inRange}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[10px] font-black text-emerald-400"
            >
              {tir.inRange}%
            </motion.span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/5">
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
              className="bg-indigo-500 h-full" 
            />
          </div>
          <div className="flex justify-between mt-2">
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-rose-500" />
              <span className="text-[7px] font-black text-slate-600 uppercase">{tir.low}% NISKI</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
              <span className="text-[7px] font-black text-slate-600 uppercase">{tir.inRange}% OK</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-indigo-500" />
              <span className="text-[7px] font-black text-slate-600 uppercase">{tir.high}% WYSOKI</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
