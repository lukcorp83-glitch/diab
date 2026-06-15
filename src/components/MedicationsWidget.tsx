import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Medication } from '../types';
import { cn } from '../lib/utils';
import { Haptics } from '../lib/haptics';
import { useTranslation } from "react-i18next";

interface MedicationsWidgetProps {
  medications: Medication[];
  size: string;
}

export default function MedicationsWidget({ medications, size }: MedicationsWidgetProps) {
    const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [takenMeds, setTakenMeds] = useState<Record<string, string>>({}); // id -> iso date

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('glikosense_taken_meds');
    if (saved) {
      try {
        setTakenMeds(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  const markTaken = (medId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.success();
    const todayStr = new Date().toISOString().split('T')[0];
    const newTaken = { ...takenMeds, [medId]: todayStr };
    setTakenMeds(newTaken);
    localStorage.setItem('glikosense_taken_meds', JSON.stringify(newTaken));
  };

  const activeMeds = medications.filter(m => m.active);
  const isCompact = size === '1x1';

  if (activeMeds.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
        <Pill className="text-slate-300 dark:text-slate-700 mb-2" size={24} />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('auto.brak_aktywnych_leków', { defaultValue: i18n.t('auto.brak_aktywnych_lekow', { defaultValue: "Brak aktywnych leków" }) })}</p>
      </div>
    );
  }

  const currentHHMM = currentTime.getHours().toString().padStart(2, '0') + ':' + currentTime.getMinutes().toString().padStart(2, '0');
  const addHours = (hhmm: string, hours: number) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    d.setHours(d.getHours() + hours);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
          <Pill size={12} />
        </div>
        {!isCompact && <span className="font-black text-[11px] uppercase tracking-widest text-slate-500">{t('auto.twoje_leki', { defaultValue: 'Twoje Leki' })}</span>}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none space-y-2">
        {activeMeds.map(med => {
          const isTakenToday = takenMeds[med.id] === todayStr;
          
          let isTimeNow = false;
          let nextReminder = "";
          
          if (med.reminders && med.reminders.length > 0) {
             // check if any reminder is within -30 min to +60 min of now
             isTimeNow = med.reminders.some(r => {
               const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
               const [rh, rm] = r.split(':').map(Number);
               const rMins = rh * 60 + rm;
               const diff = nowMins - rMins;
               return diff >= -30 && diff <= 60; // highlight active window
             });
             nextReminder = med.reminders[0]; // just grab first for compact
          }

          const highlight = isTimeNow && !isTakenToday;

          return (
            <div key={med.id} className={cn(
              "p-3 rounded-2xl border transition-all flex items-center justify-between",
              highlight 
                ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800" 
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800/50"
            )}>
              <div className="flex flex-col min-w-0 pr-2">
                <span className={cn(
                  "font-bold truncate",
                  isCompact ? "text-xs" : "text-sm",
                  highlight ? "text-indigo-900 dark:text-indigo-100" : "text-slate-700 dark:text-slate-300",
                  isTakenToday && "line-through opacity-50"
                )}>
                  {med.name}
                </span>
                {!isCompact && (
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    highlight ? "text-indigo-500" : "text-slate-400"
                  )}>
                    {med.reminders?.join(', ') || med.dosage}
                  </span>
                )}
              </div>

              {highlight ? (
                <button 
                  onClick={(e) => markTaken(med.id, e)}
                  className="shrink-0 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-colors active:scale-95"
                >
                  
                                            {t('auto.przyjąłem', { defaultValue: i18n.t('auto.przyjalem', { defaultValue: "Przyjąłem" }) })}
                                          </button>
              ) : isTakenToday ? (
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
