import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid, cn } from '../lib/utils';
import { Droplet, Plus, Minus, Info } from 'lucide-react';
import { Haptics } from '../lib/haptics';
import { toast } from 'react-hot-toast';

interface HydrationWidgetProps {
  user: User;
  tdee: number | undefined;
}

export default function HydrationWidget({ user, tdee }: HydrationWidgetProps) {
  const [waterIntake, setWaterIntake] = useState(0); // in ml
  
  // Rule of thumb: 1ml per 1kcal of TDEE, or standard 2500ml if not set.
  const target = tdee ? Math.max(2000, tdee) : 2500;
  
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'water_logs', dateStr);
    
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setWaterIntake(docSnap.data().amount || 0);
      } else {
        setWaterIntake(0);
      }
    });
    return unsub;
  }, [user, dateStr]);

  const updateWater = async (amountDelta: number) => {
    Haptics.light();
    const newAmount = Math.max(0, waterIntake + amountDelta);
    setWaterIntake(newAmount); // optimistic update
    
    try {
      const docRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'water_logs', dateStr);
      await setDoc(docRef, { amount: newAmount, timestamp: Date.now() }, { merge: true });
    } catch (e) {
      console.error(e);
      toast.error('Błąd podczas zapisywania');
    }
  };

  const currentPct = Math.min(100, Math.round((waterIntake / target) * 100));

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 relative overflow-hidden glass-target">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Droplet size={80} />
      </div>
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 flex items-center gap-1.5 mb-1">
            <Droplet size={14} fill="currentColor" />
            Nawodnienie
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            Cel: {target} ml
          </p>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateWater(-250)}
              disabled={waterIntake === 0}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-500 transition-colors disabled:opacity-50"
            >
              <Minus size={16} />
            </button>
            
            <div className="flex-1 text-center font-black">
              <span className="text-2xl text-slate-900 dark:text-white leading-none">{waterIntake}</span>
              <span className="text-xs text-slate-400 ml-1">ml</span>
            </div>
            
            <button
              onClick={() => updateWater(250)}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-sky-500 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full mt-4 overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-sky-500 transition-all duration-500 ease-out"
          style={{ width: `${currentPct}%` }}
        />
      </div>
      <p className="text-center text-[9px] font-black uppercase tracking-widest mt-2 text-sky-500">
        {currentPct}% celu
      </p>
    </div>
  );
}
