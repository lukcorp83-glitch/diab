import { getEffectiveUid } from '../lib/utils';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { X, ChevronRight } from 'lucide-react';
import { fetchCurrentWeather } from '../services/weatherService';

interface GlucoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function GlucoseModal({ isOpen, onClose, user }: GlucoseModalProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
  const [entryTime, setEntryTime] = useState(localISOTime);

  const handleSave = async () => {
    if (!value || !user) return;
    setLoading(true);
    
    const glucoseValue = parseFloat(value);
    const logTime = new Date(entryTime).getTime();
    
    // Close optimistically for better UX
    onClose();
    setValue('');
    setLoading(false);
    
    try {
      // Check if weather is enabled
      const settingsDocRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile');
      const settingsDoc = await getDoc(settingsDocRef);
      const settingsData = settingsDoc.exists() ? settingsDoc.data() : null;
      const weatherEnabled = settingsData?.weatherNeuralEnabled === true;

      // Pobieramy pogodę w tle, nie blokując użytkownika
      const weather = weatherEnabled ? await fetchCurrentWeather() : null;
      const logData: any = {
        type: 'glucose',
        value: glucoseValue,
        timestamp: logTime,
        description: 'Pomiar ręczny'
      };
      
      if (weather) {
        logData.weather = weather;
      }
      
      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs'), logData);
    } catch (e) {
      console.error(e);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-md p-4"
        >
          <motion.div 
            initial={{ y: "20%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "20%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="glass w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight font-display uppercase tracking-tighter italic">Zapisz Cukier</h2>
                <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mt-1">Pomiar ręczny glukozy</p>
              </div>
              <button 
                onClick={onClose} 
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all active:scale-90 border border-transparent dark:hover:border-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8">
              <div className="flex justify-center mb-4">
                <input 
                  type="datetime-local" 
                  value={entryTime}
                  onChange={e => setEntryTime(e.target.value)}
                  className="bg-white/5 dark:bg-white/5 text-slate-500 text-[10px] font-black p-3 rounded-2xl outline-none border border-black/5 dark:border-white/10 focus:border-accent-500 transition-all uppercase tracking-tight"
                />
              </div>

              <div className="glass-card !p-8 flex flex-col items-center justify-center border border-black/5 dark:border-white/5">
                <div className="flex items-baseline gap-3">
                  <input 
                    type="number" 
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                    }}
                    placeholder="100" 
                    className="w-32 bg-transparent text-6xl font-black text-center outline-none dark:text-white caret-accent-500 placeholder:opacity-20"
                    autoFocus
                  />
                  <span className="text-slate-400 font-black text-xl uppercase tracking-tighter opacity-40">mg/dL</span>
                </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-accent-600 hover:bg-accent-500 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-accent-600/20 active:scale-95 transition-all disabled:opacity-50 font-display flex items-center justify-center gap-2 group"
              >
                {loading ? 'Przetwarzanie...' : (
                  <>
                    Zatwierdź pomiar
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
