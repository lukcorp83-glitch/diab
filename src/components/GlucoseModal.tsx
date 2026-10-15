import { getEffectiveUid, cn } from '../lib/utils';
import { Haptics } from '../lib/haptics';
import { dbService } from '../services/databaseService';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { X, ChevronRight } from 'lucide-react';
import { fetchCurrentWeather } from '../services/weatherService';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { toast } from 'react-hot-toast';

interface GlucoseModalProps {
 isOpen: boolean;
 onClose: () => void;
 
}

export default function GlucoseModal({ isOpen, onClose, user }: GlucoseModalProps) {
 const { t } = useTranslation();
 const [value, setValue] = useState('');
 const [loading, setLoading] = useState(false);
 const [entryTime, setEntryTime] = useState('');

 const [mounted, setMounted] = useState(false);
 useEffect(() => {
 setMounted(true);
 }, []);

 // Sync date/time only on open to prevent hydration mismatches and keep it fresh
 useEffect(() => {
 if (isOpen) {
 const now = new Date();
 const tzOffset = now.getTimezoneOffset() * 60000;
 const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
 setEntryTime(localISOTime);
 setValue('');
 }
 }, [isOpen]);

 const handleSave = async () => {
 if (!value || !user) return;
 setLoading(true);
 
 const glucoseValue = parseFloat(value);
 let logTime = new Date(entryTime).getTime();
 if (isNaN(logTime)) {
 logTime = Date.now();
 }
 
 // Close optimistically for better UX
 onClose();
 setValue('');
 setLoading(false);
 
 try {
 // Check if weather is enabled
 const settingsDocRef = doc(db, 'users', getEffectiveUid(user), 'settings', 'profile');
 const settingsDoc = await getDoc(settingsDocRef);
 const settingsData = settingsDoc.exists() ? settingsDoc.data() : null;
 const weatherEnabled = settingsData?.weatherNeuralEnabled === true;

 // Pobieramy pogodę w tle, nie blokując użytkownika
 const weather = weatherEnabled ? await fetchCurrentWeather() : null;
 const logData: any = {
 type: 'glucose',
 value: glucoseValue,
 timestamp: logTime,
 createdAt: serverTimestamp(),
 source: 'manual',
 description: i18n.t('auto.pomiar_reczny', { defaultValue: i18n.t('auto.pomiar_reczny', { defaultValue: "Pomiar ręczny" }) })
 };
 
 if (weather) {
 logData.weather = weather;
 }
 
 const docRef = await addDoc(collection(db, 'users', getEffectiveUid(user), 'logs'), logData);
 await dbService.saveLog({ ...logData, id: docRef.id });
 window.dispatchEvent(new CustomEvent('localLogAdd', { detail: { ...logData, id: docRef.id } }));
 } catch (e) {
 console.error(e);
 toast.error(i18n.t('auto.blad_zapisu', { defaultValue: i18n.t('auto.blad_zapisu', { defaultValue: "Błąd zapisu" }) }));
 }
 };

 if (!mounted || !isOpen) return null;

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      className="fixed inset-0 pt-safe pb-safe z-[100] flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-md p-2 sm:p-4"
    >
      <motion.div 
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.5 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 100 || info.velocity.y > 400) {
            onClose();
          }
        }}
        initial={{ y: "20%", opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden"
      >
        {/* Pixel Bottom Sheet Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-400/40 dark:bg-slate-500/40 rounded-full mx-auto -mt-2 mb-5 sm:hidden" />

        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight font-display uppercase tracking-tighter italic">{t('auto.zapisz_cukier', { defaultValue: 'Zapisz Cukier' })}</h2>
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mt-1">{t('auto.pomiar_ręczny_glukozy', { defaultValue: i18n.t('auto.pomiar_reczny_glukozy', { defaultValue: "Pomiar ręczny glukozy" }) })}</p>
          </div>
          <button 
            type="button"
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

        <div className="glass-card !p-6 flex flex-col items-center justify-center border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-center gap-3 w-full">
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                Haptics.tick();
                const cur = parseFloat(value) || 100;
                setValue(String(Math.max(20, Math.round(cur - 1))));
              }}
              className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 active:bg-slate-200 shrink-0 transition-colors"
            >
              <span className="text-2xl font-black leading-none select-none">−</span>
            </motion.button>

            <div className="flex items-baseline gap-2 justify-center">
              <input 
                type="number" 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
                placeholder="100" 
                className="w-28 bg-transparent text-5xl sm:text-6xl font-black text-center outline-none dark:text-white caret-accent-500 placeholder:opacity-20"
                autoFocus
              />
              <span className="text-slate-400 font-black text-sm sm:text-base uppercase tracking-tighter opacity-50">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => {
                Haptics.tick();
                const cur = parseFloat(value) || 100;
                setValue(String(Math.min(600, Math.round(cur + 1))));
              }}
              className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 active:bg-slate-200 shrink-0 transition-colors"
            >
              <span className="text-2xl font-black leading-none select-none">+</span>
            </motion.button>
          </div>

          {/* Szybkie skróty w stylu Pixel Chips */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200/40 dark:border-white/5 w-full justify-center">
            {[70, 100, 120, 150].map((quickVal) => (
              <button
                key={quickVal}
                type="button"
                onClick={() => {
                  Haptics.tick();
                  setValue(String(quickVal));
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 border",
                  value === String(quickVal)
                    ? "bg-accent-500/20 text-accent-600 dark:text-accent-400 border-accent-500/30"
                    : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-white/10"
                )}
              >
                {quickVal}
              </button>
            ))}
          </div>
        </div>

 <button 
 type="button"
 onClick={handleSave}
 disabled={loading}
 className="w-full bg-accent-600 hover:bg-accent-500 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-accent-600/20 active:scale-95 transition-all disabled:opacity-50 font-display flex items-center justify-center gap-2 group"
 >
 {loading ? 'Przetwarzanie...' : (
 <>
 
 {t('auto.zatwierdź_pomiar', { defaultValue: i18n.t('auto.zatwierdz_pomiar', { defaultValue: "Zatwierdź pomiar" }) })}
 <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
 </>
 )}
 </button>
 </div>
 </motion.div>
 </motion.div>,
 document.body
 );
}

