import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pill, CheckCircle2, Check, Clock, Package, Syringe, Droplets, Wind, X } from 'lucide-react';
import { Medication } from '../types';
import { cn, getEffectiveUid } from '../lib/utils';
import { Haptics } from '../lib/haptics';
import { useTranslation } from "react-i18next";
import { useAuthStore } from '../stores/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { useBackButton } from '../hooks/useBackButton';

interface MedicationsWidgetProps {
  medications: Medication[];
  size: string;
}

const PILL_THEMES = [
  {
    iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400 dark:bg-teal-500/20",
    doseBg: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
    timeBg: "bg-teal-500/5 text-teal-600 dark:text-teal-400",
    borderActive: "border-teal-400 dark:border-teal-600 bg-teal-50/70 dark:bg-teal-950/30",
  },
  {
    iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/20",
    doseBg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    timeBg: "bg-indigo-500/5 text-indigo-600 dark:text-indigo-400",
    borderActive: "border-indigo-400 dark:border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30",
  },
  {
    iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 dark:bg-purple-500/20",
    doseBg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    timeBg: "bg-purple-500/5 text-purple-600 dark:text-purple-400",
    borderActive: "border-purple-400 dark:border-purple-600 bg-purple-50/70 dark:bg-purple-950/30",
  },
  {
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20",
    doseBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    timeBg: "bg-amber-500/5 text-amber-600 dark:text-amber-400",
    borderActive: "border-amber-400 dark:border-amber-600 bg-amber-50/70 dark:bg-amber-950/30",
  },
  {
    iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400 dark:bg-sky-500/20",
    doseBg: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    timeBg: "bg-sky-500/5 text-sky-600 dark:text-sky-400",
    borderActive: "border-sky-400 dark:border-sky-600 bg-sky-50/70 dark:bg-sky-950/30",
  },
  {
    iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20",
    doseBg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    timeBg: "bg-rose-500/5 text-rose-600 dark:text-rose-400",
    borderActive: "border-rose-400 dark:border-rose-600 bg-rose-50/70 dark:bg-rose-950/30",
  },
];

const getMedicationIcon = (name: string = '', dosage: string = '') => {
  const text = `${name} ${dosage}`.toLowerCase();
  if (text.includes('inj') || text.includes('zastrzyk') || text.includes('ozempic') || text.includes('trulicity') || text.includes('saxenda') || text.includes('mounjaro') || text.includes('victoza') || text.includes('pen') || text.includes('ampułk')) {
    return Syringe;
  }
  if (text.includes('kropl') || text.includes('drop') || text.includes('syrop') || text.includes('płyn') || text.includes('liquid') || text.includes('zawiesin')) {
    return Droplets;
  }
  if (text.includes('spray') || text.includes('aerozol') || text.includes('inhal') || text.includes('wziew')) {
    return Wind;
  }
  if (text.includes('saszetk') || text.includes('proszek') || text.includes('sachet')) {
    return Package;
  }
  return Pill;
};

export default function MedicationsWidget({ medications, size }: MedicationsWidgetProps) {
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [takenMeds, setTakenMeds] = useState<Record<string, string>>({}); // id -> iso date
  const [confirmingMed, setConfirmingMed] = useState<Medication | null>(null);

  // Obsługa systemowego przycisku Wstecz
  useBackButton(!!confirmingMed, () => setConfirmingMed(null));

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

  const markTaken = async (med: Medication) => {
    Haptics.success();
    const todayStr = new Date().toISOString().split('T')[0];
    const newTaken = { ...takenMeds, [med.id]: todayStr };
    setTakenMeds(newTaken);
    localStorage.setItem('glikosense_taken_meds', JSON.stringify(newTaken));

    // Jeśli lek ma zdefiniowany stan zapasu, odejmij dawkę z bazy
    if (user && typeof med.stockQuantity === 'number') {
      try {
        const pillsToDeduct = med.pillsPerDose || 1;
        const newStock = Math.max(0, med.stockQuantity - pillsToDeduct);
        const updatedMeds = medications.map(m => m.id === med.id ? { ...m, stockQuantity: newStock } : m);
        await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"), { medications: updatedMeds }, { merge: true });
        queryClient.invalidateQueries({ queryKey: ['userSettings', getEffectiveUid(user)] });
      } catch (err) {
        console.error("Błąd aktualizacji zapasu leku:", err);
      }
    }

    toast.success(`${t('auto.zazyto_lek', { defaultValue: 'Zażyto' })}: ${med.name}`);
  };

  const activeMeds = medications.filter(m => m.active);
  const isCompact = size === '1x1';

  if (activeMeds.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2">
          <Pill size={20} />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {t('auto.brak_aktywnych_leków', { defaultValue: "Brak aktywnych leków" })}
        </p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-hidden relative">
      {/* Nagłówek widżetu */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Pill size={14} />
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 leading-none">
              {t('auto.twoje_leki', { defaultValue: 'Leki & Apteczka' })}
            </h4>
            {!isCompact && (
              <span className="text-[8.5px] text-slate-400 font-bold tracking-tight">
                {activeMeds.length} {t('auto.aktywnych_lekow', { defaultValue: 'aktywne' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lista leków */}
      <div className="flex-1 overflow-y-auto scrollbar-none space-y-2 pr-0.5">
        {activeMeds.map((med, index) => {
          const isTakenToday = takenMeds[med.id] === todayStr;
          const theme = PILL_THEMES[index % PILL_THEMES.length];
          const IconComponent = getMedicationIcon(med.name, med.dosage);
          
          let isTimeNow = false;
          if (med.reminders && med.reminders.length > 0) {
            const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
            isTimeNow = med.reminders.some(r => {
              const [rh, rm] = r.split(':').map(Number);
              const rMins = rh * 60 + rm;
              const diff = nowMins - rMins;
              return diff >= -30 && diff <= 60; // Aktywne okno przyjęcia
            });
          }

          // Kalkulacja zapasu
          let runoutText = "";
          let isLow = false;
          if (typeof med.stockQuantity === 'number' && med.stockQuantity > 0) {
            const remindersCount = Array.isArray(med.reminders) && med.reminders.length > 0 ? med.reminders.length : 1;
            const pillsPerDose = med.pillsPerDose && med.pillsPerDose > 0 ? med.pillsPerDose : 1;
            const dailyDose = remindersCount * pillsPerDose;
            const daysRemaining = Math.floor(med.stockQuantity / dailyDose);
            isLow = med.stockQuantity <= (med.stockThreshold || 7) || daysRemaining <= 5;
            runoutText = `${med.stockQuantity} szt. (~${daysRemaining} dni)`;
          }

          return (
            <div 
              key={med.id} 
              className={cn(
                "p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5",
                isTimeNow && !isTakenToday
                  ? cn(theme.borderActive, "shadow-sm")
                  : isTakenToday
                  ? "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/40 opacity-75"
                  : "bg-slate-50 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/60"
              )}
            >
              {/* Kolorowa pigułka / ikona leku */}
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner", theme.iconBg)}>
                <IconComponent size={16} />
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn(
                    "font-black truncate text-xs text-slate-800 dark:text-slate-100",
                    isTakenToday && "line-through opacity-60 text-slate-500"
                  )}>
                    {med.name}
                  </span>
                  {med.dosage && (
                    <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border", theme.doseBg)}>
                      {med.dosage}
                    </span>
                  )}
                </div>

                {/* Harmonogram & Zapas */}
                {!isCompact && (
                  <div className="flex items-center gap-2 mt-1 text-[9px] font-bold text-slate-400 dark:text-slate-400">
                    {med.reminders && med.reminders.length > 0 && (
                      <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md", theme.timeBg)}>
                        <Clock size={10} />
                        <span className="tabular-nums font-bold">{med.reminders.join(', ')}</span>
                      </span>
                    )}
                    {runoutText && (
                      <span className={cn(
                        "flex items-center gap-1",
                        isLow ? "text-rose-500 font-black" : "text-slate-500 dark:text-slate-400"
                      )}>
                        <Package size={10} className={isLow ? "text-rose-500" : "text-slate-400"} />
                        <span className="tabular-nums">{runoutText}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Akcja Zażycia / Status */}
              <div className="shrink-0 flex items-center">
                {isTakenToday ? (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                    <CheckCircle2 size={13} />
                    {!isCompact && <span>{t('auto.zazyto_dzisiaj', { defaultValue: 'Zażyto' })}</span>}
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      Haptics.light();
                      setConfirmingMed(med);
                    }}
                    className={cn(
                      "flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl transition-all active:scale-95 shadow-sm",
                      isTimeNow
                        ? "bg-teal-600 hover:bg-teal-700 text-white animate-pulse"
                        : "bg-slate-200/80 dark:bg-slate-700 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-slate-200"
                    )}
                  >
                    <Check size={12} />
                    <span>{t('auto.zazyj_dawke', { defaultValue: 'Zażyj' })}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Okno Potwierdzenia Zażycia Leku montowane bezpośrednio do document.body */}
      {confirmingMed && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setConfirmingMed(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs sm:max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-inner shrink-0">
                {React.createElement(getMedicationIcon(confirmingMed.name, confirmingMed.dosage), { size: 22 })}
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {t('auto.potwierdz_zazycie_leku', { defaultValue: 'Potwierdź zażycie leku' })}
                </h3>
                <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                  {confirmingMed.name} {confirmingMed.dosage ? `(${confirmingMed.dosage})` : ''}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/50 space-y-1.5 text-[11px] text-left">
              <p className="text-slate-700 dark:text-slate-200 font-bold leading-relaxed">
                {t('auto.czy_na_pewno_zazyles', { name: confirmingMed.name, defaultValue: `Czy potwierdzasz przyjęcie leku ${confirmingMed.name}?` })}
              </p>
              {typeof confirmingMed.stockQuantity === 'number' && (
                <p className="text-slate-400 font-bold text-[10px]">
                  {t('auto.zapas_po_zazyciu', { 
                    count: Math.max(0, confirmingMed.stockQuantity - (confirmingMed.pillsPerDose || 1)), 
                    defaultValue: `Zapas po zażyciu: ${Math.max(0, confirmingMed.stockQuantity - (confirmingMed.pillsPerDose || 1))} szt.` 
                  })}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  Haptics.light();
                  setConfirmingMed(null);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <X size={14} />
                {t('auto.anuluj', { defaultValue: 'Anuluj' })}
              </button>
              <button
                type="button"
                onClick={() => {
                  markTaken(confirmingMed);
                  setConfirmingMed(null);
                }}
                className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-600/30 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                {t('auto.potwierdz', { defaultValue: 'Potwierdź' })}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


