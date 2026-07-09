import React from "react";
import { Syringe, AlertCircle, PlusCircle } from "lucide-react";
import { UserSettings } from "../types";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/utils";
import { motion } from "motion/react";
import { getAuth } from "firebase/auth";
import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { getEffectiveUid } from "../lib/utils";
import toast from "react-hot-toast";

interface PenTrackerWidgetProps {
  settings: UserSettings;
}

export function PenTrackerWidget({ settings }: PenTrackerWidgetProps) {
  const { t } = useTranslation();

  const penItem = settings.inventory?.find(item => item.category === 'pens');
  const penCapacity = penItem?.penCapacity || 300;
  const currentUnits = penItem?.currentPenUnits !== undefined ? penItem.currentPenUnits : penCapacity;
  const penCount = penItem?.quantity || 0;

  const percentage = Math.max(0, Math.min(100, (currentUnits / penCapacity) * 100));

  let colorClass = "text-indigo-500";
  let bgClass = "bg-indigo-500";
  if (percentage < 20) {
    colorClass = "text-rose-500";
    bgClass = "bg-rose-500";
  } else if (percentage < 50) {
    colorClass = "text-amber-500";
    bgClass = "bg-amber-500";
  }

  const isLow = percentage < 20 && penCount === 0;

  const handleRefill = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!penItem) {
        toast.error(t('auto.brak_penow_w_apteczce', { defaultValue: 'Najpierw dodaj wstrzykiwacz do Apteczki!' }));
        return;
    }

    if (penCount <= 0 && currentUnits <= 0) {
      toast.error(t('auto.brak_penow_alert', { defaultValue: 'Uwaga! Kończy się ostatni pen!' }));
      return;
    }

    const auth = getAuth();
    if (!auth.currentUser) return;

    let newCount = penCount;
    if (currentUnits < penCapacity && penCount > 0) {
        newCount = Math.max(0, penCount - 1);
    }
    
    const updatedInventory = [...(settings.inventory || [])];
    const penIndex = updatedInventory.findIndex(i => i.id === penItem.id);
    if (penIndex >= 0) {
        updatedInventory[penIndex] = {
            ...updatedInventory[penIndex],
            quantity: newCount,
            currentPenUnits: penCapacity
        };
    }

    const updates = { inventory: updatedInventory };

    try {
      await setDoc(doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(auth.currentUser), "settings", "profile"), updates, { merge: true });
      // Notify App.tsx about the setting update
      window.dispatchEvent(new CustomEvent('localSettingsUpdate', { detail: updates }));
      toast.success(t('auto.rozpoczal_sie_nowy_pen', { defaultValue: 'Rozpoczęto nowego pena ({{units}}j)', units: penCapacity }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "h-full rounded-[2rem] p-4 flex flex-col justify-between relative overflow-hidden group cursor-pointer border",
        settings.glassmorphismEnabled
          ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10"
          : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-xl"
      )}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 ${bgClass}/5 blur-2xl -mr-8 -mt-8`}></div>

      <div className="flex justify-between items-start z-10 relative">
        <div className={cn("p-2.5 rounded-2xl", settings.glassmorphismEnabled ? "bg-white/50 dark:bg-white/10 backdrop-blur-md" : "bg-slate-50 dark:bg-slate-800", colorClass)}>
          <Syringe size={20} strokeWidth={2.5} />
        </div>
        <button 
            onClick={handleRefill} 
            title={t('auto.rozpocznij_nowego_pena_z_zapasow', { defaultValue: 'Rozpocznij nowego pena z zapasów' })}
            className={cn("px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors border shadow-sm", settings.glassmorphismEnabled ? "bg-white/30 dark:bg-white/5 border-white/20 dark:border-white/10" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700")}
        >
          {t('auto.nastepny_pen', { defaultValue: 'Następny pen' })}
        </button>
      </div>

      <div className="relative z-10 mt-2">
        <div className="flex items-end gap-1 mb-1">
          <span className={cn("text-2xl font-black tracking-tighter leading-none font-display", colorClass)}>
            {currentUnits}
          </span>
          <span className="text-xs font-bold text-slate-400 mb-0.5">j</span>
        </div>

        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate mb-3">
          {t('auto.zostalo_jednostek_w_penie', { defaultValue: 'Zostało {{units}}j', units: currentUnits })}
        </p>

        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 50 }}
            className={cn("h-full rounded-full", bgClass)}
          />
        </div>

        <div className="flex justify-between items-center mt-2">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                {isLow ? <AlertCircle size={8} className="text-rose-500 animate-pulse" /> : null}
                {t('auto.ilosc_penow', { defaultValue: 'Sztuki' })}: {penCount}
            </span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{penCapacity} MAX</span>
        </div>
      </div>
    </motion.div>
  );
}
