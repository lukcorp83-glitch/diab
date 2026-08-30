import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, AlertTriangle, Plus, X, Signal, Droplet, Merge, Sparkles, Clock, Check, CheckCircle2 } from 'lucide-react';
import { cn, getEffectiveUid } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';
import { useTranslation } from 'react-i18next';
import { useLogsStore } from '../../stores/useLogsStore';
import UnlinkedCarbsWidget from '../UnlinkedCarbsWidget';
import { getPreBolusTimerState, cancelPreBolusTimer, PreBolusTimerState } from '../../services/preBolusService';
import { dbService } from '../../services/databaseService';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

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
    if (val && Date.now() - Number(val) < 15 * 60 * 1000) return true;
    return false;
  });

  const [dismissedUnlinkedTime, setDismissedUnlinkedTime] = useState<number>(() => Number(sessionStorage.getItem('capsule_unlinked_dismissed_time') || 0));
  const [dismissedPreBolusTime, setDismissedPreBolusTime] = useState<number>(() => Number(sessionStorage.getItem('capsule_prebolus_dismissed_time') || 0));
  const [showUnlinkedModal, setShowUnlinkedModal] = useState(false);

  // Stan aktywnego stopera przedposiłkowego
  const [preBolusState, setPreBolusState] = useState<PreBolusTimerState>(() => getPreBolusTimerState());

  useEffect(() => {
    const handleUpdate = () => setPreBolusState(getPreBolusTimerState());
    window.addEventListener('prebolus_timer_update', handleUpdate);
    const timer = setInterval(() => {
      const current = getPreBolusTimerState();
      if (current.active) {
        setPreBolusState(current);
      }
    }, 1000);
    return () => {
      window.removeEventListener('prebolus_timer_update', handleUpdate);
      clearInterval(timer);
    };
  }, []);

  // Wykrywanie bolusa/posiłku bez składników (z ostatnich 3h, nowszych niż czas wyciszenia)
  const latestUnlinked = useMemo(() => {
    const timeLimit = 3 * 60 * 60 * 1000;
    const now = Date.now();

    const unlinkedLogs = (logs || []).filter(l => 
      (l.type === 'bolus' || l.type === 'meal') &&
      now - Number(l.timestamp) < timeLimit &&
      now - Number(l.timestamp) >= 0 &&
      Number(l.timestamp) > dismissedUnlinkedTime &&
      (!l.items || l.items.length === 0) &&
      (((l as any).carbs || 0) > 0 || ((l.linkedMeal?.carbs) || 0) > 0 || (l.type === 'meal' && (l.value || 0) > 0))
    ).sort((a,b) => b.timestamp - a.timestamp);

    return unlinkedLogs.length > 0 ? unlinkedLogs[0] : null;
  }, [logs, dismissedUnlinkedTime]);

  const unlinkedCarbs = latestUnlinked 
    ? Math.round((((latestUnlinked as any).carbs || latestUnlinked.linkedMeal?.carbs || (latestUnlinked.type === 'meal' ? latestUnlinked.value : 0))) * 10) / 10 
    : 0;

  const isLow = useMemo(() => {
    if (dismissed) return false;
    // Cukier poniżej lub równy 70 mg/dL to bezwzględna hipoglikemia o najwyższym priorytecie
    if (!lastGlucose || lastGlucose > 70) return false;
    return true;
  }, [lastGlucose, dismissed]);

  // Calculate hardware warnings
  const hardwareWarning = useMemo(() => {
    if (!userSettings) return null;

    const effSensorDate = Math.max(
      userSettings.sensorChangeDate || 0,
      Number(localStorage.getItem('sensorChangeDate') || 0),
      (logs || []).filter((l: any) => l.type === 'sensor_change' || l.type === 'sensor').reduce((max: number, l: any) => Math.max(max, l.timestamp || 0), 0)
    ) || 0;

    const effInfusionDate = Math.max(
      userSettings.infusionSetChangeDate || 0,
      Number(localStorage.getItem('infusionSetChangeDate') || 0),
      (logs || []).filter((l: any) => l.type === 'site_change' || l.type === 'site').reduce((max: number, l: any) => Math.max(max, l.timestamp || 0), 0)
    ) || 0;

    const now = Date.now();
    const sensorDurationMs = (userSettings.sensorDurationDays || 10) * 24 * 60 * 60 * 1000;
    const infusionDurationMs = (userSettings.infusionSetDurationDays || 3) * 24 * 60 * 60 * 1000;

    const sensorExpiresIn = effSensorDate ? (effSensorDate + sensorDurationMs) - now : null;
    const infusionExpiresIn = effInfusionDate ? (effInfusionDate + infusionDurationMs) - now : null;

    const TWO_HOURS = 2 * 60 * 60 * 1000;

    if (sensorExpiresIn !== null && sensorExpiresIn <= TWO_HOURS) {
      const isExpired = sensorExpiresIn <= 0;
      return {
        type: 'sensor',
        icon: <Signal className={cn('text-white relative z-10', isExpired ? 'animate-pulse' : '')} size={24} />,
        text: isExpired ? '!' : Math.ceil(sensorExpiresIn / (60 * 1000)) + 'm',
        action: () => changeTab ? changeTab('profile') : onClickMain(),
        isExpired
      };
    }

    if (infusionExpiresIn !== null && infusionExpiresIn <= TWO_HOURS) {
      const isExpired = infusionExpiresIn <= 0;
      return {
        type: 'infusion',
        icon: <Droplet className={cn('text-white relative z-10', isExpired ? 'animate-pulse' : '')} size={24} />,
        text: isExpired ? '!' : Math.ceil(infusionExpiresIn / (60 * 1000)) + 'm',
        action: () => changeTab ? changeTab('profile') : onClickMain(),
        isExpired
      };
    }

    return null;
  }, [userSettings, logs, changeTab, onClickMain]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.light();
    setDismissed(true);
    sessionStorage.setItem('capsule_hypo_dismissed', Date.now().toString());
  };

  const handleDismissUnlinked = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.light();
    const now = Date.now();
    setDismissedUnlinkedTime(now);
    sessionStorage.setItem('capsule_unlinked_dismissed_time', now.toString());
  };

  const handleMinimizePreBolus = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.light();
    setDismissedPreBolusTime(Date.now());
    sessionStorage.setItem('capsule_prebolus_dismissed_time', Date.now().toString());
    toast(t('bolus.timer_minimized', { defaultValue: 'Pigułka zwinięta. Powiadomienie zadzwoni o czasie.' }), { icon: '⏱️', duration: 2500 });
  };

  const handleCancelPreBolus = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.warning();
    cancelPreBolusTimer();
    toast(t('bolus.timer_cancelled', { defaultValue: 'Stoper przedposiłkowy został anulowany' }), { icon: '⏹️' });
  };

  const handleMarkEatenFromCapsule = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    Haptics.success();

    const now = Date.now();
    const recentMeal = (logs || []).find((l: any) => 
      (l.type === 'meal' || l.type === 'carbs' || (l.type === 'bolus' && l.linkedMeal)) && 
      (now - (l.timestamp || l.createdAt || 0)) < 60 * 60 * 1000
    );

    if (recentMeal) {
      const eid = recentMeal.id || recentMeal.nsId || (recentMeal as any)._id;
      if (eid) {
        useLogsStore.getState().updateLog(eid, { eatenAt: now });
        dbService.saveLog({ ...recentMeal, eatenAt: now }).catch(() => {});
        window.dispatchEvent(new CustomEvent('localLogUpdate', { detail: { id: eid, updates: { eatenAt: now } } }));
        if (user && recentMeal.id) {
          updateDoc(doc(db, "users", getEffectiveUid(user), "logs", recentMeal.id), { eatenAt: now }).catch(() => {});
        }
      }
    }

    cancelPreBolusTimer();
    toast.success(t('history.marked_as_eaten_short', { defaultValue: '🍽️ Smacznego! Zapisano moment posiłku.' }), { icon: '🍽️', duration: 4000 });
  };

  const isAbsorbing = mealProgress !== null && mealProgress !== undefined && mealProgress > 0;
  
  const quickCarbs = useMemo(() => {
    if (!shortcuts) return [];
    return shortcuts.slice(0, 4);
  }, [shortcuts]);

  const springTransition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 };

  const hasUnlinked = latestUnlinked !== null && unlinkedCarbs > 0 && !isLow;
  
  const hasActivePreBolus = preBolusState.active && (preBolusState.startTime > dismissedPreBolusTime) && !isLow;

  const capsuleState = isLow 
    ? 'hypo' 
    : hasActivePreBolus 
    ? 'prebolus' 
    : hasUnlinked 
    ? 'unlinked' 
    : isAbsorbing 
    ? 'absorbing' 
    : 'default';

  // Formatowanie sekund stopera do mm:ss
  const formattedTimer = useMemo(() => {
    if (!preBolusState.active) return '00:00';
    const totalSec = Math.max(0, preBolusState.remainingSeconds);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [preBolusState.active, preBolusState.remainingSeconds]);

  // Zaokrąglone i czyste jednostki insuliny (np. "4.5j" lub "4j")
  const formattedUnits = useMemo(() => {
    if (!preBolusState.bolusUnits) return '';
    const num = Number(preBolusState.bolusUnits);
    if (isNaN(num) || num <= 0) return '';
    const rounded = Math.round(num * 10) / 10;
    return ` • ${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}j`;
  }, [preBolusState.bolusUnits]);

  return (
    <div className="relative w-14 h-14 flex items-center justify-center pointer-events-auto">
      {/* Główny, zunifikowany kontener morfujący – uniesiony nad dolny pasek nawigacji aby nie zasłaniać sąsiednich ikon */}
      <motion.div
        layout
        transition={springTransition}
        className={cn(
          "absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center z-50 transition-colors duration-300 pointer-events-auto select-none",
          capsuleState === 'default' || capsuleState === 'absorbing' ? 'overflow-visible' : 'overflow-hidden',
          capsuleState === 'hypo' 
            ? "bg-gradient-to-r from-red-500 to-rose-600 shadow-xl shadow-red-500/30 -translate-y-16 rounded-[1.5rem]" 
            : capsuleState === 'prebolus'
            ? preBolusState.remainingSeconds > 0
              ? "bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 shadow-2xl shadow-orange-500/40 border border-orange-300/30 -translate-y-16 rounded-full"
              : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 shadow-2xl shadow-emerald-500/40 border border-emerald-300/30 -translate-y-16 rounded-full"
            : capsuleState === 'unlinked'
            ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 shadow-2xl shadow-indigo-500/40 border border-indigo-300/30 -translate-y-16 rounded-full"
            : capsuleState === 'absorbing'
            ? "bg-amber-500 shadow-lg shadow-amber-500/30 -translate-y-5 rounded-full cursor-pointer active:scale-95"
            : cn(
                "shadow-lg -translate-y-5 rounded-full cursor-pointer active:scale-95",
                hardwareWarning ? "bg-slate-800 shadow-slate-900/30" : "bg-indigo-600 shadow-indigo-500/30"
              )
        )}
        style={{
          width: capsuleState === 'hypo' ? 320 : capsuleState === 'prebolus' ? 340 : capsuleState === 'unlinked' ? 285 : 56,
          height: capsuleState === 'hypo' ? 'auto' : (capsuleState === 'prebolus' || capsuleState === 'unlinked') ? 48 : 56,
          maxWidth: '90vw',
          transformOrigin: 'bottom center'
        }}
        onClick={() => {
          if (capsuleState === 'default' || capsuleState === 'absorbing') {
            Haptics.light();
            if (hardwareWarning) hardwareWarning.action();
            else onClickMain();
          }
        }}
      >
        {/* Odznaka z liczbą składników na talerzu na zewnętrznym rogu przycisku */}
        {plateCount > 0 && capsuleState === 'default' && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md shadow-rose-500/40 z-30 pointer-events-none"
          >
            {plateCount}
          </motion.span>
        )}

        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay" />

        {capsuleState === 'absorbing' && (
          <>
            <div 
              className="absolute top-0 left-0 right-0 bg-black/30 transition-all duration-1000 ease-linear pointer-events-none"
              style={{ height: ((mealProgress || 0) * 100) + '%' }}
            />
            <div className="absolute inset-0 border-[3px] border-amber-400 rounded-full z-20 pointer-events-none" />
          </>
        )}

        {/* Zawartość wewnętrzna z płynnym cross-fadem */}
        <AnimatePresence mode="wait">
          {capsuleState === 'hypo' ? (
            <motion.div
              key="hypo-content"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col w-full p-2.5 space-y-2 z-10"
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1.5 rounded-full animate-bounce">
                    <AlertTriangle size={16} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-white uppercase tracking-wider block leading-none">
                      {t('auto.niski_cukier', { defaultValue: 'Niski cukier' })} ({lastGlucose} mg/dL)
                    </span>
                    <span className="text-[9px] font-bold text-white/80 leading-tight">
                      {t('auto.zjedz_węglowodany_proste', { defaultValue: 'Zjedz węglowodany proste!' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDismiss}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 active:scale-95 transition-all"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>

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
          ) : capsuleState === 'prebolus' ? (
            /* Kompaktowy widok aktywnego stopera przedposiłkowego unoszący się nad paskiem */
            <motion.div
              key="prebolus-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between w-full h-full px-2.5 z-10 select-none overflow-hidden"
            >
              <div 
                className="flex items-center gap-2 cursor-pointer overflow-hidden min-w-0"
                onClick={() => { Haptics.medium(); onClickMain(); }}
              >
                <div className={cn(
                  "p-1.5 rounded-full shrink-0 flex items-center justify-center shadow-inner",
                  preBolusState.remainingSeconds > 0 ? "bg-white/20" : "bg-white/30"
                )}>
                  {preBolusState.remainingSeconds > 0 ? (
                    <Clock size={14} className="text-amber-200 animate-pulse" />
                  ) : (
                    <Utensils size={14} className="text-emerald-200 animate-bounce" />
                  )}
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[8px] font-black text-white/90 uppercase tracking-widest leading-none mb-0.5 truncate">
                    {preBolusState.remainingSeconds > 0 ? 'Odczekaj' : 'Możesz jeść!'}
                  </span>
                  <span className="text-[11px] text-white uppercase font-black tracking-tight leading-none truncate font-mono">
                    {preBolusState.remainingSeconds > 0 ? (
                      <span className="text-amber-200">{formattedTimer}</span>
                    ) : (
                      <span className="text-emerald-100">Gotowe</span>
                    )}
                    <span className="text-white/80 text-[10px]">{formattedUnits}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button
                  onClick={handleMarkEatenFromCapsule}
                  className="bg-white text-emerald-700 hover:bg-emerald-50 active:scale-95 font-black text-[9px] uppercase tracking-wider py-1 px-2 rounded-full shadow-md transition-all flex items-center gap-0.5 cursor-pointer"
                  title="Oznacz, że posiłek został zjedzony"
                >
                  <CheckCircle2 size={10} className="text-emerald-600" />
                  <span>Zjadłem</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Haptics.medium();
                    onClickMain();
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white active:scale-95 font-black text-[9px] uppercase tracking-wider py-1 px-1.5 rounded-full transition-all flex items-center gap-0.5 cursor-pointer"
                  title="Przejdź do Talerza"
                >
                  <Utensils size={10} />
                  <span>Talerz</span>
                </button>
                <button
                  onClick={handleCancelPreBolus}
                  className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-100 active:scale-95 font-black text-[8.5px] uppercase tracking-wider py-1 px-1.5 rounded-full border border-rose-400/30 transition-all flex items-center gap-0.5 cursor-pointer"
                  title="Całkowicie anuluj stoper"
                >
                  <span>Anuluj</span>
                </button>
                <button
                  onClick={handleMinimizePreBolus}
                  className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
                  title="Zwiń pigułkę (stoper działa w tle)"
                >
                  <X size={11} strokeWidth={3} />
                </button>
              </div>
            </motion.div>
          ) : capsuleState === 'unlinked' ? (
            <motion.div
              key="unlinked-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between w-full h-full px-2.5 z-10 select-none overflow-hidden"
            >
              <div 
                className="flex items-center gap-2 cursor-pointer overflow-hidden min-w-0" 
                onClick={() => { Haptics.medium(); onClickMain(); }}
                title="Przejdź do talerza"
              >
                <div className="bg-white/20 p-1.5 rounded-full shrink-0 flex items-center justify-center shadow-inner">
                  <Merge size={14} className="text-amber-300 animate-pulse" />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[8px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-0.5 truncate">
                    {t('auto.oczekujący_posiłek', { defaultValue: 'Oczekujący Posiłek' })}
                  </span>
                  <span className="text-[11px] text-white uppercase font-black tracking-tight leading-none truncate">
                    +{unlinkedCarbs}g W
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Haptics.medium();
                    onClickMain();
                  }}
                  className="bg-white text-indigo-600 hover:bg-indigo-50 active:scale-95 font-black text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-full shadow-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Utensils size={10} className="text-indigo-500" />
                  <span>Talerz</span>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Haptics.medium();
                    setShowUnlinkedModal(true);
                  }}
                  className="bg-indigo-500/30 hover:bg-indigo-500/50 text-white active:scale-95 font-black text-[9px] uppercase tracking-wider py-1 px-2 rounded-full border border-white/20 transition-all flex items-center gap-1 cursor-pointer"
                  title="Rozpoznaj składniki AI"
                >
                  <Sparkles size={10} className="text-amber-300" />
                  <span>AI</span>
                </button>
                <button
                  onClick={handleDismissUnlinked}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
                  title="Pomiń"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="default-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center w-full h-full relative"
            >
              {hardwareWarning ? (
                <div className="flex flex-col items-center justify-center">
                  {hardwareWarning.icon}
                  <span className="text-[8px] font-black text-white mt-0.5 leading-none">{hardwareWarning.text}</span>
                </div>
              ) : isAbsorbing ? (
                <div className="flex flex-col items-center justify-center">
                  <Utensils className="text-white relative z-10" size={20} />
                  <span className="text-[7px] font-black text-white/90 uppercase tracking-tighter mt-0.5 z-10">
                    {Math.round((mealProgress || 0) * 100)}%
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Utensils className="text-white relative z-10" size={24} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal uzupełniania posiłku bez składników */}
      {showUnlinkedModal && (
        <UnlinkedCarbsWidget
          user={user}
          isModal={true}
          onClose={() => setShowUnlinkedModal(false)}
          onAddCarbs={() => {
            setShowUnlinkedModal(false);
            if (changeTab) changeTab('meal');
          }}
        />
      )}
    </div>
  );
}
