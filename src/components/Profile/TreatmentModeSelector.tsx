import React from 'react';
import { cn } from '../../lib/utils';
import { Activity, Apple, Zap, Signal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import { getEffectiveUid } from '../../lib/utils';
import { useQueryClient } from '@tanstack/react-query';

export default function TreatmentModeSelector({ user, settings, setSettings }: any) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  return (
    <div className={cn(
      "p-5 rounded-[2.5rem] border transition-all hover:shadow-md space-y-4",
      settings.glassmorphismEnabled
        ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
        : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
    )}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center shadow-inner">
          <Activity size={22} />
        </div>
        <div className="text-left">
          <p className="text-sm font-black dark:text-white leading-tight">
            {t('auto.treatment_mode_title', { defaultValue: 'Typ leczenia' })}
          </p>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
            {t('auto.treatment_mode_desc', { defaultValue: 'Dostosuj interfejs do swoich potrzeb' })}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {[
          { id: 'diet_only', icon: <Apple size={16} />, label: t('auto.treatment_mode_diet', { defaultValue: 'Dieta i tabletki' }), desc: t('auto.treatment_mode_diet_desc', { defaultValue: 'Ukrywa funkcje insulinowe' }) },
          { id: 'insulin', icon: <Zap size={16} />, label: t('auto.treatment_mode_insulin', { defaultValue: 'Insulina' }), desc: t('auto.treatment_mode_insulin_desc', { defaultValue: 'Peny lub strzykawki' }) },
          { id: 'pump', icon: <Signal size={16} />, label: t('auto.treatment_mode_pump', { defaultValue: 'Pompa' }), desc: t('auto.treatment_mode_pump_desc', { defaultValue: 'Zamknięta pętla / AID' }) }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={async () => {
              const newVal = mode.id as 'diet_only' | 'insulin' | 'pump';
              setSettings((prev: any) => ({ ...prev, treatmentMode: newVal }));
              
              // Natychmiastowa aktualizacja cache'u (Optimistic Update)
              localStorage.setItem("treatmentMode", newVal);
              if (user) {
                queryClient.setQueryData(['userSettings', getEffectiveUid(user)], (old: any) => ({
                  ...(old || {}),
                  treatmentMode: newVal
                }));
              }
             
              if (user) {
                try {
                  await setDoc(
                    doc(db, "users", getEffectiveUid(user), "settings", "profile"),
                    { treatmentMode: newVal },
                    { merge: true }
                  );
                  queryClient.invalidateQueries({ queryKey: ['userSettings'] });
                  toast.success(t('auto.zapisano_tryb', { defaultValue: 'Zapisano: ' }) + mode.label);
                } catch (e: any) {
                  console.error("Failed to save treatmentMode", e);
                  toast.error("Błąd zapisu: " + e.message);
                  // Revert optimistic update
                  queryClient.invalidateQueries({ queryKey: ['userSettings'] });
                }
              } else {
                toast.success(mode.label + ' ' + t('auto.wymaga_odswiezenia_w_trybie_goscia', { defaultValue: '(Tryb Gościa: odśwież stronę, by zobaczyć efekt)' }));
              }
            }}
            className={cn(
              "p-3 rounded-2xl border transition-all text-left flex flex-col gap-1 items-start justify-center",
              (settings.treatmentMode === mode.id || (!settings.treatmentMode && mode.id === 'insulin'))
                ? "bg-indigo-500 border-indigo-500 text-white shadow-lg"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300"
            )}
          >
            <div className="flex items-center gap-2">
              {mode.icon}
              <span className="text-xs font-bold">{mode.label}</span>
            </div>
            <span className="text-[9px] opacity-80">{mode.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
