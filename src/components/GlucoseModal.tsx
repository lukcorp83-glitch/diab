import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { X } from 'lucide-react';

interface GlucoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function GlucoseModal({ isOpen, onClose, user }: GlucoseModalProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!value || !user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'logs'), {
        type: 'glucose',
        value: parseFloat(value),
        timestamp: Date.now(),
        description: 'Pomiar ręczny'
      });
      onClose();
      setValue('');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="bg-slate-50 dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Zapisz Cukier</h2>
              <button onClick={onClose} className="text-slate-300 hover:text-slate-500 p-2 text-xl font-bold transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-inner flex flex-col items-center justify-center">
                <div className="flex items-baseline gap-2">
                  <input 
                    type="number" 
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0" 
                    className="w-24 bg-transparent text-5xl font-black text-center outline-none dark:text-white"
                    autoFocus
                  />
                  <span className="text-slate-300 font-black text-xl">mg/dL</span>
                </div>
              </div>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-[12px] uppercase active:scale-95 shadow-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Zapisywanie...' : 'Zatwierdź'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
