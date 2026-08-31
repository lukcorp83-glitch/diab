import React, { useState, useEffect } from 'react';
import { Activity, Footprints, Edit2, Check, X, Play, Flame, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SPORTS } from '../../GlikoTraining';
import { healthService } from '../../../services/healthService';
import { useAppStore } from '../../../stores/useAppStore';
import { Haptics } from '../../../lib/haptics';
import { useTranslation } from 'react-i18next';
import { cn, getEffectiveUid } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import { db } from '../../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { UserSettings } from '../../../types';

interface TrainingWidgetProps {
  activeTraining: any;
  isEditingLayout: boolean;
  setTab: (tab: string) => void;
  size: "1x1" | "2x1" | "1x2" | "2x2";
  onAction?: (action: string) => void;
  settings?: UserSettings;
  user?: any;
  onOpenTraining?: () => void;
}

export default function TrainingWidget({
  activeTraining,
  isEditingLayout,
  setTab,
  size,
  settings,
  user,
  onOpenTraining,
}: TrainingWidgetProps) {
  const { t } = useTranslation();
  const [steps, setSteps] = useState<number | null>(null);
  
  // Tryby edycji: 'none' | 'steps' | 'goal'
  const [editMode, setEditMode] = useState<'none' | 'steps' | 'goal'>('none');
  const [manualInput, setManualInput] = useState("");
  const [customGoalInput, setCustomGoalInput] = useState("");

  const todayKey = new Date().toISOString().split('T')[0];

  // Odczyt celu kroków: z ustawień profilu -> localStorage -> fallback 10000
  const savedGoal = typeof window !== 'undefined' ? localStorage.getItem("glikocontrol_step_goal") : null;
  const currentGoal = settings?.dailyStepGoal || (savedGoal ? parseInt(savedGoal, 10) : 10000);
  const [stepGoal, setStepGoal] = useState<number>(currentGoal);

  useEffect(() => {
    if (settings?.dailyStepGoal && settings.dailyStepGoal > 0) {
      setStepGoal(settings.dailyStepGoal);
    }
  }, [settings?.dailyStepGoal]);

  useEffect(() => {
    let mounted = true;
    const fetchSteps = async () => {
      try {
        const saved = localStorage.getItem(`glikocontrol_steps_${todayKey}`);
        let localVal = saved !== null ? parseInt(saved, 10) : null;

        if (healthService.isAvailable()) {
          const hasAccess = await healthService.requestAuthorization();
          if (hasAccess) {
            const count = await healthService.getStepsLast24h();
            if (mounted && count !== null && count >= 0) {
              setSteps(count);
              localStorage.setItem(`glikocontrol_steps_${todayKey}`, count.toString());
              return;
            }
          }
        }

        if (mounted) {
          setSteps(localVal !== null && !isNaN(localVal) ? localVal : 0);
        }
      } catch (err) {
        console.error("TrainingWidget steps error", err);
        const saved = localStorage.getItem(`glikocontrol_steps_${todayKey}`);
        if (mounted) {
          setSteps(saved !== null ? parseInt(saved, 10) : 0);
        }
      }
    };

    fetchSteps();
    const interval = setInterval(fetchSteps, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [todayKey]);

  // Zapis ręcznej liczby kroków
  const handleSaveManualSteps = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const parsed = parseInt(manualInput, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setSteps(parsed);
      localStorage.setItem(`glikocontrol_steps_${todayKey}`, parsed.toString());
      toast.success(t('auto.zapisano_kroki', { defaultValue: `Zapisano kroki: ${parsed.toLocaleString()}` }));
    }
    setEditMode('none');
  };

  // Zapis nowego dziennego celu kroków
  const handleSaveStepGoal = async (newGoal: number) => {
    if (newGoal <= 0 || isNaN(newGoal)) return;
    setStepGoal(newGoal);
    localStorage.setItem("glikocontrol_step_goal", newGoal.toString());
    Haptics.success();
    toast.success(`Ustawiono cel dzienny: ${newGoal.toLocaleString()} kroków 🎯`);
    setEditMode('none');

    if (user) {
      try {
        await setDoc(
          doc(db, "users", getEffectiveUid(user), "settings", "profile"),
          { dailyStepGoal: newGoal },
          { merge: true }
        );
      } catch (err) {
        console.error("Błąd zapisu celu kroków w Firestore:", err);
      }
    }
  };

  const hasActiveTraining = !!activeTraining;
  const isCompact = size === "1x1";
  const isWide = size === "2x1";
  const isBig = size === "2x2";

  const activeSport = SPORTS.find(s => s.id === activeTraining?.sportId);
  const SportIcon = activeSport?.icon || Activity;

  const progressPercent = steps && stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0;

  return (
    <div
      onClick={() => {
        if (!isEditingLayout && editMode === 'none') {
          Haptics.light();
          if (onOpenTraining) {
            onOpenTraining();
          } else {
            useAppStore.getState().setInitialAction("training");
            setTab("profile");
          }
        }
      }}
      className={cn(
        "glass-card cursor-pointer active:scale-98 transition-all w-full h-full relative overflow-hidden border border-emerald-500/10 dark:border-emerald-500/5 flex flex-col justify-between group select-none",
        isCompact ? "!p-3.5 min-h-[120px]" : "!p-4 sm:!p-5 min-h-[140px]"
      )}
    >
      <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none group-hover:bg-emerald-500/10 transition-all" />

      {/* Górna belka widżetu */}
      <div className="flex justify-between items-center w-full z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
            <Footprints size={14} className={cn(hasActiveTraining && "animate-pulse")} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
            {t('auto.aktywnosc', { defaultValue: 'Aktywność & Trening' })}
          </span>
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {hasActiveTraining ? (
            <span className="text-[8px] font-black uppercase tracking-widest py-0.5 px-2 rounded-full border text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse">
              {t('auto.live_trening', { defaultValue: 'LIVE' })}
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 tabular-nums">
                {progressPercent}%
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  Haptics.light();
                  setCustomGoalInput(stepGoal.toString());
                  setEditMode(editMode === 'goal' ? 'none' : 'goal');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                title="Dopasuj cel kroków"
              >
                <Edit2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Środek: Kroki oraz formularze edycji */}
      <div className="my-auto w-full z-10">
        <AnimatePresence mode="wait">
          {editMode === 'steps' ? (
            <motion.form
              key="form-steps"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              onSubmit={handleSaveManualSteps}
              className="flex items-center gap-1.5 my-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="number"
                inputMode="numeric"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="np. 6000"
                className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-emerald-500/50 rounded-lg text-xs font-black text-slate-800 dark:text-white focus:outline-none"
                autoFocus
              />
              <button type="submit" className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 active:scale-95">
                <Check size={12} />
              </button>
              <button type="button" onClick={() => setEditMode('none')} className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-400 rounded-lg active:scale-95">
                <X size={12} />
              </button>
            </motion.form>
          ) : editMode === 'goal' ? (
            <motion.div
              key="form-goal"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="space-y-1.5 my-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Ustal dzienny cel:
                </span>
                <button type="button" onClick={() => setEditMode('none')} className="text-slate-400 hover:text-slate-600">
                  <X size={11} />
                </button>
              </div>
              <div className="flex items-center gap-1">
                {[6000, 8000, 10000, 12000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSaveStepGoal(preset)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight transition-all active:scale-90",
                      stepGoal === preset
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    )}
                  >
                    {preset / 1000}k
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = parseInt(customGoalInput, 10);
                  if (!isNaN(val) && val > 0) handleSaveStepGoal(val);
                }}
                className="flex items-center gap-1 mt-1"
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={customGoalInput}
                  onChange={(e) => setCustomGoalInput(e.target.value)}
                  placeholder="Inny cel..."
                  className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[9px] font-bold text-slate-800 dark:text-white focus:outline-none"
                />
                <button type="submit" className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-black uppercase">
                  Zapisz
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="view-steps"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col text-left"
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1">
                  <span className={cn("font-black tracking-tight text-slate-800 dark:text-white leading-none", isCompact ? "text-xl" : "text-2xl sm:text-3xl")}>
                    {steps !== null ? steps.toLocaleString() : "---"}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {t('auto.krokow', { defaultValue: 'kroków' })}
                  </span>
                </div>
                {!isCompact && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      Haptics.light();
                      setCustomGoalInput(stepGoal.toString());
                      setEditMode('goal');
                    }}
                    className="text-[9px] font-bold text-emerald-500 tabular-nums hover:underline flex items-center gap-0.5"
                    title="Kliknij, aby zmienić cel"
                  >
                    <span>{progressPercent}%</span>
                    <span className="text-[7.5px] text-slate-400">({(stepGoal / 1000).toFixed(0)}k)</span>
                  </button>
                )}
              </div>

              {/* Pasek postępu kroków */}
              <div
                className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden mt-1.5 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  Haptics.light();
                  setCustomGoalInput(stepGoal.toString());
                  setEditMode('goal');
                }}
                title="Kliknij, aby ustalić cel kroków"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Informacja o trwającym treningu lub szybki start */}
        {hasActiveTraining ? (
          <div className="mt-2.5 p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-left">
            <div className="flex items-center gap-2 min-w-0">
              <SportIcon size={14} className="text-rose-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-black text-rose-500 truncate leading-none">
                  {activeSport?.name || t('auto.trening', { defaultValue: 'Trening' })}
                </p>
                <p className="text-[8px] font-bold text-slate-400 leading-tight mt-0.5">
                  {activeTraining.duration} min • Kliknij, aby zakończyć
                </p>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0 mr-1" />
          </div>
        ) : (
          !isCompact && editMode === 'none' && (
            <div className="mt-2 flex items-center justify-between text-left">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Flame size={12} className="text-amber-500" />
                <span className="text-[9px] font-bold">
                  {isWide ? "GlikoTrening & Sport" : "Kontroluj spadki cukru"}
                </span>
              </div>
              <span className="text-[9px] font-black uppercase text-emerald-500 flex items-center gap-0.5">
                {t('auto.trenuj', { defaultValue: 'Start' })} <Play size={10} className="fill-emerald-500" />
              </span>
            </div>
          )
        )}
      </div>

      {/* Dostępne dyscypliny w dużym kafelku 2x2 */}
      {isBig && !hasActiveTraining && editMode === 'none' && (
        <div className="border-t border-slate-100 dark:border-white/5 pt-2.5 mt-2 z-10">
          <p className="text-[8px] uppercase tracking-wider text-slate-400 font-black mb-1 text-left">
            {t('auto.dostępne_dyscypliny', { defaultValue: 'SZYBKI WYBÓR DYSCYPLINY:' })}
          </p>
          <div className="flex flex-wrap gap-1">
            {SPORTS.slice(0, 4).map((s) => (
              <span
                key={s.id}
                className="text-[9px] font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1"
              >
                <s.icon size={11} /> {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
