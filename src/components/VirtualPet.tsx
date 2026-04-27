import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles } from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LogEntry } from '../types';

export default function VirtualPet({ user, logs, glucose }: { user: any, logs: LogEntry[], glucose: number | null }) {
  const [petData, setPetData] = useState<{ 
    type: string, 
    name: string, 
    level: number, 
    xp: number, 
    happiness: number, 
    lastFed: number 
  } | null>(null);

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), (d) => {
      if (d.exists()) {
        setPetData(d.data() as any);
      } else {
        // Initialize pet
        setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
          type: '🐉',
          name: 'Gliko-Smok',
          level: 1,
          xp: 0,
          happiness: 100,
          lastFed: Date.now()
        });
      }
    });
    return unsub;
  }, [user]);

  // Optionally could add a listener to logs to increase XP when user logs data.

  if (!petData) return null;

  const xpRequired = petData.level * 100;
  const progress = (petData.xp / xpRequired) * 100;

  const handleFeed = async () => {
     if (!user) return;
     const newXp = petData.xp + 15;
     let newLevel = petData.level;
     let nextXp = newXp;
     if (newXp >= xpRequired) {
        newLevel++;
        nextXp = newXp - xpRequired;
     }

     await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
       happiness: Math.min(100, petData.happiness + 20),
       lastFed: Date.now(),
       xp: nextXp,
       level: newLevel
     });
  };

  return (
    <div className="fixed bottom-24 left-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -20, y: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20, y: 20 }}
            className="absolute bottom-16 left-0 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 w-60 overflow-hidden"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-black text-sm dark:text-white flex items-center gap-1">
                  {petData.name} <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-md">Lvl {petData.level}</span>
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">Twój wirtualny przyjaciel</p>
              </div>
              <span className="text-3xl">{petData.type}</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  <span>Doświadczenie</span>
                  <span>{petData.xp} / {xpRequired} XP</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                  <span>Humor</span>
                  <span className="flex items-center gap-0.5"><Heart size={8} className="text-rose-500" fill="currentColor" /> {petData.happiness}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-400 rounded-full transition-all duration-500" style={{ width: `${petData.happiness}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button 
                onClick={handleFeed}
                className="flex-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] py-2 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <Sparkles size={12} /> Pogłaszcz
              </button>
            </div>
            
            <p className="text-[9px] text-center text-slate-400 mt-2 font-medium leading-tight">
              Kiedy wpisujesz pomiary lub zjadasz posiłek,<br/>Twój zwierzak staje się szczęśliwszy!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="w-14 h-14 bg-white dark:bg-slate-800 rounded-full shadow-lg border-4 border-indigo-100 dark:border-indigo-900/50 flex flex-col items-center justify-center relative z-10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-2xl drop-shadow-sm">{petData.type}</span>
        {petData.happiness < 50 && (
           <span className="absolute -top-1 -right-1 bg-rose-500 rounded-full w-4 h-4 flex items-center justify-center text-[8px] text-white font-bold border-2 border-white dark:border-slate-800">!</span>
        )}
      </motion.button>
    </div>
  );
}
