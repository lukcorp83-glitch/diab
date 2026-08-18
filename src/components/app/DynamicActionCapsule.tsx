import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, AlertTriangle, Plus, X, Pizza, Signal, Droplet, ChevronUp, Merge, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';
import { useTranslation } from "react-i18next";
import { useLogsStore } from '../../stores/useLogsStore';
import UnlinkedCarbsWidget from '../UnlinkedCarbsWidget';

interface DynamicActionCapsuleProps {
  lastGlucose: number | null;
  mealProgress: number | null;
  shortcuts?: any[];
  onClickMain: () => void;
  onQuickAdd: (shortcut: any) => void;
  plateCount?: number;
  userSettings?: any;
  getEffectiveIOB?: () => number;
  changeTab?: (tab: string) => void;
  user?: any;
}

export function DynamicActionCapsule({ 
  lastGlucose, 
  mealProgress, 
  shortcuts, 
  onClickMain, 
  onQuickAdd,
  plateCount = 0,
  userSettings,
  getEffectiveIOB,
  changeTab,
  user
}: DynamicActionCapsuleProps) {
  const { t } = useTranslation();
  const logs = useLogsStore((state) => state.logs);
  const [dismissed, setDismissed] = useState(() => {
    const val = sessionStorage.getItem('capsule_hypo_dismissed');
    if (val && Date.now() - Number(val) < 60 * 60 * 1000) return true;
    return false;
  });

  const [dismissedUnlinkedTime, setDismissedUnlinkedTime] = useState<number>(() => Number(sessionStorage.getItem('capsule_unlinked_dismissed_time') || 0));
  const [showUnlinkedModal, setShowUnlinkedModal] = useState(false);

  // Wykrywanie bolusa/posiłku bez składników (z ostatnich 3h, nowszych niż czas wyciszenia)
  const latestUnlinked = useMemo(() => {
    const timeLimit = 3 * 60 * 60 * 1000;
    const now = Date.now();

    const unlinkedLogs = logs.filter(l => 
      (l.type === "bolus" || l.type === "meal") &&
      now - Number(l.timestamp) < timeLimit &&
      now - Number(l.timestamp) >= 0 &&
      Number(l.timestamp) > dismissedUnlinkedTime &&
      (!l.items || l.items.length === 0) &&
      ((l as any).carbs > 0 || l.linkedMeal?.carbs > 0 || (l.type === "meal" && l.value > 0))
    ).sort((a,b) => b.timestamp - a.timestamp);

    return unlinkedLogs.length > 0 ? unlinkedLogs[0] : null;
  }, [logs, dismissedUnlinkedTime]);

  const unlinkedCarbs = latestUnlinked 
    ? Math.round(((latestUnlinked as any).carbs || latestUnlinked.linkedMeal?.carbs || (latestUnlinked.type === 'meal' ? latestUnlinked.value : 0)) * 10) / 10 
    : 0;

  const isLow = useMemo(() => {
    if (dismissed) return false;
    if (!lastGlucose || lastGlucose > 70) return false;
    
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    
    const sortedLogs = [...logs].sort((a, b) => {
      const tsA = a.timestamp || new Date(a.createdAt).getTime();
      const tsB = b.timestamp || new Date(b.createdAt).getTime();
      return tsB - tsA;
    });

    const recentCarbs = sortedLogs.filter(l => {
      if (l.type !== 'meal') return false;
      const ts = l.timestamp || new Date(l.createdAt).getTime();
      return ts >= twoHoursAgo;
    });

    return recentCarbs.length === 0;
  }, [logs, lastGlucose, dismissed]);

  // Calculate hardware warnings
  const hardwareWarning = useMemo(() => {
    if (!userSettings) return null;

    const effSensorDate = Math.max(
      userSettings.sensorChangeDate || 0,
      Number(localStorage.getItem('sensorChangeDate') || 0),
      logs.filter((l: any) => l.type === 'sensor_change' || l.type === 'sensor').reduce((max: number, l: any) => Math.max(max, l.timestamp || 0), 0)
    ) || 0;

    const effInfusionDate = Math.max(
      userSettings.infusionSetChangeDate || 0,
      Number(localStorage.getItem('infusionSetChangeDate') || 0),
      logs.filter((l: any) => l.type === 'site_change' || l.type === 'site').reduce((max: number, l: any) => Math.max(max, l.timestamp || 0), 0)
    ) || 0;

    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    if (effSensorDate > 0) {
      const sensorMsLeft = effSensorDate + (userSettings.sensorDurationDays || 10) * 24 * 60 * 60 * 1000 - now;
      if (sensorMsLeft > 0 && sensorMsLeft <= TWO_HOURS_MS) {
        const hoursLeft = Math.ceil(sensorMsLeft / (1000 * 60 * 60));
        return { type: 'sensor', icon: <Signal className="text-violet-500 relative z-10" size={24} />, text: `${hoursLeft}h` };
      }
    }

    if (effInfusionDate > 0) {
      const infusionMsLeft = effInfusionDate + (userSettings.infusionSetDurationDays || 3) * 24 * 60 * 60 * 1000 - now;
      if (infusionMsLeft > 0 && infusionMsLeft <= TWO_HOURS_MS) {
        const hoursLeft = Math.ceil(infusionMsLeft / (1000 * 60 * 60));
        return { type: 'infusion', icon: <Droplet className="text-cyan-500 relative z-10" size={24} />, text: `${hoursLeft}h` };
      }
    }

    return null;
  }, [logs, userSettings]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    sessionStorage.setItem('capsule_hypo_dismissed', Date.now().toString());
  };

  const handleDismissUnlinked = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.light();
    const now = Date.now();
    sessionStorage.setItem('capsule_unlinked_dismissed_time', now.toString());
    setDismissedUnlinkedTime(now);
    setShowUnlinkedModal(false);
  };

  const isAbsorbing = mealProgress !== null && mealProgress !== undefined && mealProgress > 0;
  
  // Filter shortcuts for quick carbs if available
  const quickCarbs = useMemo(() => {
    if (!shortcuts) return [];
    return shortcuts.slice(0, 4);
  }, [shortcuts]);

  const springTransition = { type: "spring", stiffness: 340, damping: 28, mass: 0.75 };

  const hasUnlinked = latestUnlinked !== null && unlinkedCarbs > 0 && !isLow;

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <AnimatePresence>
        {isLow ? (
          <motion.div
            layoutId="action-capsule"
            key="low-glucose-capsule"
            initial={{ width: 56, height: 56, borderRadius: 28, x: "-50%" }}
            animate={{ width: 340, height: 'auto', borderRadius: 24, x: "-50%" }}
            exit={{ width: 56, height: 56, borderRadius: 28, x: "-50%", opacity: 0 }}
            transition={springTransition}
            className="absolute bottom-0 left-1/2 flex flex-col bg-gradient-to-r from-red-500 to-rose-600 shadow-xl shadow-red-500/30 overflow-hidden min-w-[56px] max-w-[95vw] z-[100] -translate-y-5"
            style={{ transformOrigin: "bottom center" }}
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col w-full h-full z-10 p-2 gap-1"
            >
              {/* Top Row: Warning + Buttons */}
              <div className="flex items-center justify-between w-full px-2 pt-1 pb-1">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => { Haptics.light(); onClickMain(); }}>
                  <div className="bg-white/20 p-1.5 rounded-full">
                    <AlertTriangle size={14} className="animate-pulse text-white" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[11px] font-black text-white/90 uppercase tracking-widest leading-none mb-0.5">
                      {t('auto.niski_cukier', { defaultValue: 'Niski Cukier' })}
                    </span>
                    <span className="text-[10px] text-white/80 uppercase font-bold leading-none">{lastGlucose} mg/dL</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      Haptics.light();
                      onClickMain(); 
                    }}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white active:scale-90 transition-transform hover:bg-white/30"
                  >
                    <Plus size={16} strokeWidth={3} />
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 active:scale-95 transition-all"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Bottom Row: Quick Carbs */}
              {quickCarbs.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto w-full px-1 pb-1 pt-1 scrollbar-hide">
                  {quickCarbs.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { Haptics.selection(); onQuickAdd(s); setDismissed(true); }}
                      className="shrink-0 flex items-center gap-2 bg-black/20 hover:bg-black/30 active:scale-95 transition-all rounded-2xl px-3 py-2 border border-white/10"
                    >
                      <span className="text-xl leading-none">{s.icon || '🥤'}</span>
                      <div className="flex flex-col items-start justify-center">
                        <span className="text-[10px] font-bold text-white line-clamp-1 max-w-[70px] text-left leading-tight">{s.name}</span>
                        <span className="text-[9px] font-black text-emerald-300 leading-none mt-0.5">{Number(s.carbs).toFixed(0)}g W</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : hasUnlinked ? (
          /* Wysuwana w bok pozioma kapsuła oczekującego posiłku z majestatycznym morfingiem */
          <motion.div
            layoutId="action-capsule"
            key="unlinked-glucose-capsule"
            initial={{ width: 56, height: 56, borderRadius: 28, x: "-50%" }}
            animate={{ width: 330, height: 56, borderRadius: 28, x: "-50%" }}
            exit={{ width: 56, height: 56, borderRadius: 28, x: "-50%" }}
            transition={springTransition}
            className="absolute bottom-0 left-1/2 flex items-center justify-between px-3 z-[100] bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 shadow-2xl shadow-indigo-500/40 border border-indigo-300/30 -translate-y-5 min-w-[56px] max-w-[95vw] overflow-hidden"
            style={{ transformOrigin: "bottom center" }}
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>

            {/* Left side: Icon + Info */}
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 cursor-pointer z-10 select-none overflow-hidden" 
              onClick={() => { Haptics.medium(); setShowUnlinkedModal(true); }}
            >
              <div className="bg-white/20 p-2 rounded-full shrink-0 flex items-center justify-center shadow-inner">
                <Merge size={16} className="text-amber-300 animate-pulse" />
              </div>
              <div className="flex flex-col justify-center truncate">
                <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-0.5">
                  {t('auto.oczekujący_posiłek', { defaultValue: 'Oczekujący Posiłek' })}
                </span>
                <span className="text-[12px] text-white uppercase font-black tracking-tight leading-none truncate">
                  +{unlinkedCarbs}g Węglowodanów
                </span>
              </div>
            </motion.div>

            {/* Right side: Action + Dismiss Button */}
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 shrink-0 z-10"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  Haptics.medium();
                  setShowUnlinkedModal(true);
                }}
                className="bg-white text-indigo-600 hover:bg-indigo-50 active:scale-95 font-black text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-full shadow-md transition-all flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={12} className="text-amber-500" />
                <span>AI / Baza</span>
              </button>
              <button
                onClick={handleDismissUnlinked}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
                title="Pomiń"
              >
                <X size={14} strokeWidth={3} />
              </button>
            </motion.div>
          </motion.div>
        ) : isAbsorbing ? (
          <motion.div
            layoutId="action-capsule"
            key="absorbing-capsule"
            initial={{ scale: 0.8, opacity: 0, width: 56, height: 56, borderRadius: 28, x: "-50%" }}
            animate={{ scale: 1, opacity: 1, width: 56, height: 56, borderRadius: 28, x: "-50%" }}
            exit={{ scale: 0.8, opacity: 0, width: 56, height: 56, borderRadius: 28, x: "-50%" }}
            transition={springTransition}
            onClick={() => { Haptics.light(); onClickMain(); }}
            className="absolute bottom-0 left-1/2 flex items-center justify-center z-50 bg-amber-500 shadow-lg shadow-amber-500/30 cursor-pointer overflow-hidden active:scale-95 -translate-y-5 w-14 h-14 rounded-full"
            style={{ transformOrigin: "bottom center" }}
          >
            <div 
              className="absolute top-0 left-0 right-0 bg-black/30 transition-all duration-1000 ease-linear pointer-events-none"
              style={{ height: `${(mealProgress || 0) * 100}%` }}
            />
            <motion.div
              initial={{ scale: 0.5, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.05 }}
            >
              <Utensils className="text-white relative z-10" size={24} />
            </motion.div>
            <div className="absolute inset-0 border-[3px] border-amber-400 rounded-full z-20 pointer-events-none" />
            
            {plateCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-50 dark:border-slate-950 shadow-sm z-30"
              >
                {plateCount}
              </motion.div>
            )}
            <motion.div
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase tracking-widest text-slate-400 pointer-events-none"
            >
              {t("nav.plate")}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            layoutId="action-capsule"
            key="default-capsule"
            initial={{ scale: 0.8, opacity: 0, width: 56, height: 56, borderRadius: 28, x: "-50%" }}
            animate={{ scale: 1, opacity: 1, width: 56, height: 56, borderRadius: 28, x: "-50%" }}
            exit={{ scale: 0.8, opacity: 0, width: 56, height: 56, borderRadius: 28, x: "-50%" }}
            transition={springTransition}
            onClick={() => { Haptics.light(); onClickMain(); }}
            className={cn(
              "absolute bottom-0 left-1/2 flex items-center justify-center z-50 shadow-lg cursor-pointer overflow-hidden active:scale-95 -translate-y-5 w-14 h-14 rounded-full",
              hardwareWarning ? "bg-slate-800 shadow-slate-900/30" : "bg-indigo-600 shadow-indigo-500/30"
            )}
            style={{ transformOrigin: "bottom center" }}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.05 }}
            >
              {hardwareWarning ? hardwareWarning.icon : <Utensils className="text-white relative z-10" size={24} />}
            </motion.div>
            
            {plateCount > 0 && !hardwareWarning && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-50 dark:border-slate-950 shadow-sm z-30"
              >
                {plateCount}
              </motion.div>
            )}

            {hardwareWarning && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0 right-0 bg-slate-700 text-white text-[9px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm z-30"
              >
                {hardwareWarning.text}
              </motion.div>
            )}

            <motion.div
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase tracking-widest text-slate-400 pointer-events-none"
            >
              {hardwareWarning ? (hardwareWarning.type === 'sensor' ? t('auto.sensor', { defaultValue: 'Sensor' }) : t('auto.wkłucie', { defaultValue: 'Wkłucie' })) : t("nav.plate")}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlinked Meal Modal / Bottom Sheet */}
      {showUnlinkedModal && (
        <UnlinkedCarbsWidget
          user={user}
          isModal={true}
          onClose={() => setShowUnlinkedModal(false)}
          onAddCarbs={() => {
            setShowUnlinkedModal(false);
            onClickMain();
          }}
        />
      )}
    </div>
  );
}
