import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Flower2, Sun, CloudRain, Trophy, Ruler } from 'lucide-react';

export default function GlikoGarden({ logs }: { logs: any[] }) {
  const tir = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    const todayLogs = logs.filter(l => l.timestamp >= today && l.type === 'glucose');
    if (todayLogs.length === 0) return 0;
    const inRange = todayLogs.filter(l => l.value >= 70 && l.value <= 180).length;
    return (inRange / todayLogs.length) * 100;
  }, [logs]);

  const plants = [
    { id: 1, name: 'Słonecznik Sukcesu', threshold: 50, icon: '🌻' },
    { id: 2, name: 'Róża Regularności', threshold: 75, icon: '🌹' },
    { id: 3, name: 'Drzewo Dyscypliny', threshold: 90, icon: '🌳' },
    { id: 4, name: 'Złoty Kwiatek TIR', threshold: 100, icon: '🌼' },
  ];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="font-black text-sm dark:text-white flex items-center gap-2"><Flower2 size={16} className="text-emerald-500" /> Ogród TIR</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Twoje rośliny rosną dzięki dobrym cukrom</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{tir.toFixed(0)}% TIR</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {plants.map(plant => {
          const isGrown = tir >= plant.threshold;
          const progress = Math.min(100, (tir / plant.threshold) * 100);

          return (
            <div key={plant.id} className={cn("p-3 rounded-2xl border transition-all", isGrown ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-60')}>
              <div className="text-3xl mb-2 flex justify-center h-10 items-center">
                {isGrown ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>{plant.icon}</motion.span>
                ) : (
                  <span className="grayscale opacity-30 text-xl">🌱</span>
                )}
              </div>
              <h5 className="text-[10px] font-black text-center dark:text-white leading-tight mb-2">{plant.name}</h5>
              <div className="space-y-1">
                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full ${isGrown ? 'bg-emerald-500' : 'bg-amber-400'}`}
                  />
                </div>
                <p className="text-[8px] font-bold text-slate-400 text-center uppercase tracking-tighter">Cel: {plant.threshold}% TIR</p>
              </div>
            </div>
          );
        })}
      </div>

      {tir < 70 && (
         <div className="mt-6 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 flex items-start gap-3">
            <Sun className="text-amber-500 shrink-0" size={16} />
            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
              Podlewaj swój ogród dobrą glikemią! Rośliny potrzebują słońca (70-180 mg/dL), żeby rozkwitnąć.
            </p>
         </div>
      )}
    </div>
  );
}

import { cn } from '../lib/utils';
