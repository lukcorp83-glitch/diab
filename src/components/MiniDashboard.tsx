import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { calculateIOB, calculateCOB, getEffectiveUid, getEffectiveIOB } from '../lib/utils';
import { Droplet, Utensils, Zap, Plus } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { LogEntry, UserSettings } from '../types';

interface MiniDashboardProps {
  logs: LogEntry[];
  userSettings: UserSettings | null;
}

export default function MiniDashboard({ logs, userSettings }: MiniDashboardProps) {
  const [loading, setLoading] = useState(false);
  
  const latestGlucose = logs.find(l => l.type === 'glucose')?.value || null;
  const iob = getEffectiveIOB(logs, userSettings);
  const cob = calculateCOB(logs);
  
  const handleQuickAdd = async (type: 'bolus' | 'meal') => {
    if (!auth.currentUser) return;
    setLoading(true);
    
    try {
      const uid = getEffectiveUid(auth.currentUser);
      
      let entry: any = {
        userId: uid,
        timestamp: serverTimestamp(),
      };

      if (type === 'bolus') {
        const amount = window.prompt("Podaj dawkę insuliny (U):");
        if (!amount || isNaN(parseFloat(amount))) {
          setLoading(false);
          return;
        }
        entry = {
          ...entry,
          type: 'bolus',
          value: parseFloat(amount),
          unit: 'U'
        };
      } else if (type === 'meal') {
        const carbs = window.prompt("Podaj ilość węglowodanów (g):");
        if (!carbs || isNaN(parseFloat(carbs))) {
          setLoading(false);
          return;
        }
        entry = {
          ...entry,
          type: 'meal',
          value: parseFloat(carbs),
          unit: 'g'
        };
      }

      await addDoc(collection(db, 'logs'), entry);
      toast.success("Zapisano!");
      
      // Attempt to close the window
      setTimeout(() => {
        window.close();
      }, 500);

    } catch (error) {
      console.error(error);
      toast.error("Błąd zapisu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col items-center justify-center sm:p-8">
      <div className="w-full max-w-sm space-y-6">
        
        {/* Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-700 text-center"
        >
          <p className="text-slate-400 font-medium mb-2">Aktualny Poziom</p>
          <div className="text-6xl font-black mb-4">
            {latestGlucose ? `${latestGlucose}` : '--'}
            <span className="text-2xl text-slate-500 ml-2">mg/dL</span>
          </div>
          
          <div className="flex justify-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-slate-400">IOB</p>
              <p className="font-bold text-lg text-blue-400">{iob.toFixed(1)} <span className="text-xs">U</span></p>
            </div>
            <div className="text-center">
              <p className="text-slate-400">COB</p>
              <p className="font-bold text-lg text-orange-400">{Math.round(cob)} <span className="text-xs">g</span></p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleQuickAdd('bolus')}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 transition-colors shadow-lg shadow-blue-900/50"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Droplet size={24} className="text-white" />
            </div>
            <span className="font-bold">Podaj Insulinę</span>
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleQuickAdd('meal')}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-400 rounded-3xl p-4 flex flex-col items-center justify-center gap-3 transition-colors shadow-lg shadow-orange-900/50"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Utensils size={24} className="text-white" />
            </div>
            <span className="font-bold">Dodaj Posiłek</span>
          </motion.button>
        </div>
        
        <p className="text-center text-xs text-slate-500 mt-8">
          Po dodaniu wpisu okno powinno zamknąć się automatycznie.
        </p>

      </div>
    </div>
  );
}
