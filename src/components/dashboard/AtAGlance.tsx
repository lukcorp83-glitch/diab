import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Clock, 
  Signal, 
  Droplets, 
  ChevronRight,
  CheckCircle2,
  Calendar,
  Activity,
  ShieldCheck,
  AlertTriangle,
  BellOff,
  BatteryMedium
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Haptics } from '../../lib/haptics';
import { getPreBolusTimerState, PreBolusTimerState } from '../../services/preBolusService';
import { LogEntry, UserSettings } from '../../types';
import { cn } from '../../lib/utils';

interface AtAGlanceProps {
  userSettings?: UserSettings;
  logs?: LogEntry[];
  setTab: (tab: string) => void;
  isInsulinMode?: boolean;
  pumpStatus?: any;
}

export default function AtAGlance({ userSettings, logs = [], setTab, isInsulinMode = true, pumpStatus }: AtAGlanceProps) {
  const { t, i18n } = useTranslation();
  const [preBolusState, setPreBolusState] = useState<PreBolusTimerState>(() => getPreBolusTimerState());
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Zegar dla nagłówka daty
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Nasłuchiwanie stopera przedposiłkowego
  useEffect(() => {
    const handleUpdate = () => {
      setPreBolusState(getPreBolusTimerState());
    };
    window.addEventListener('prebolus_timer_update', handleUpdate);
    const interval = setInterval(handleUpdate, 1000);
    return () => {
      window.removeEventListener('prebolus_timer_update', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Najświeższy pomiar glukozy
  const latestGlucose = useMemo(() => {
    return logs.find(l => l.type === 'glucose');
  }, [logs]);

  // Dzienne statystyki TIR (dla wieczornego podsumowania)
  const todayStats = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const minTarget = userSettings?.targetMin || 70;
    const maxTarget = userSettings?.targetMax || 180;

    const todayGlucose = logs.filter(l => l.type === 'glucose' && (l.timestamp || 0) >= startOfDay.getTime());
    if (todayGlucose.length < 5) return null;

    const inRange = todayGlucose.filter(l => (l.value || 0) >= minTarget && (l.value || 0) <= maxTarget).length;
    const tirPercent = Math.round((inRange / todayGlucose.length) * 100);
    const sum = todayGlucose.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const avg = Math.round(sum / todayGlucose.length);

    return { tirPercent, avg, count: todayGlucose.length };
  }, [logs, userSettings?.targetMin, userSettings?.targetMax]);

  // Obliczenie zbliżających się wymian sensora i wkłucia
  const equipmentStatus = useMemo(() => {
    const now = Date.now();
    let sensorHoursLeft: number | null = null;
    let cannulaHoursLeft: number | null = null;

    if (userSettings?.sensorChangeDate) {
      const durationDays = userSettings.sensorDurationDays || 10;
      const expiry = userSettings.sensorChangeDate + durationDays * 24 * 60 * 60 * 1000;
      sensorHoursLeft = Math.round((expiry - now) / (1000 * 60 * 60));
    }

    if (userSettings?.infusionSetChangeDate) {
      const durationDays = userSettings.infusionSetDurationDays || 3;
      const expiry = userSettings.infusionSetChangeDate + durationDays * 24 * 60 * 60 * 1000;
      cannulaHoursLeft = Math.round((expiry - now) / (1000 * 60 * 60));
    }

    return { sensorHoursLeft, cannulaHoursLeft };
  }, [userSettings]);

  // Wyznaczenie priorytetu kontekstu
  const contextItem = useMemo(() => {
    // 1. Priorytet: Aktywny stoper przedposiłkowy (czysto organizacyjny timer użytkownika)
    if (preBolusState.active) {
      const mins = Math.floor(preBolusState.remainingSeconds / 60);
      const secs = preBolusState.remainingSeconds % 60;
      const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      
      if (preBolusState.isReady || preBolusState.remainingSeconds <= 0) {
        return {
          id: 'prebolus_ready',
          icon: <CheckCircle2 size={16} className="text-emerald-500 animate-pulse shrink-0" />,
          title: t('bolus.ready_to_eat_title', { defaultValue: 'Odliczanie zakończone' }),
          desc: t('bolus.ready_to_eat_desc', { defaultValue: 'Upłynął zaplanowany czas oczekiwania' }),
          action: () => setTab('plate'),
          badge: t('at_a_glance.badge_time', { defaultValue: 'CZAS' }),
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        };
      }

      return {
        id: 'prebolus_timer',
        icon: <Clock size={16} className="text-accent-500 animate-pulse shrink-0" />,
        title: `${t('bolus.timer_active', { defaultValue: 'Stoper:' })} ${timeStr}`,
        desc: preBolusState.bolusUnits 
          ? t('at_a_glance.timer_bolus_logged', { defaultValue: 'Zarejestrowano {{units}}j • Odliczanie czasu', units: preBolusState.bolusUnits })
          : t('at_a_glance.timer_countdown', { defaultValue: 'Odliczanie zaplanowanego odstępu czasowego' }),
        action: () => setTab('plate'),
        badge: timeStr,
        badgeColor: 'bg-accent-500/15 text-accent-600 dark:text-accent-400 border-accent-500/20'
      };
    }

    // 2. Priorytet: Niski poziom rezerwy zbiornika w pompie (< 20j)
    const reservoirVal = typeof pumpStatus?.reservoir === 'number' ? pumpStatus.reservoir : undefined;
    if (isInsulinMode && reservoirVal !== undefined && reservoirVal > 0 && reservoirVal <= 20) {
      return {
        id: 'pump_reservoir_low',
        icon: <Droplets size={16} className="text-amber-500 shrink-0 animate-pulse" />,
        title: t('at_a_glance.reservoir_low_title', { defaultValue: 'Zbiornik pompy: rezerwa' }),
        desc: t('at_a_glance.reservoir_low_desc', { 
          defaultValue: `Wskaźnik poziomu: pozostało ${reservoirVal.toFixed(1)}j w zbiorniczku`,
          units: reservoirVal.toFixed(1)
        }),
        action: () => setTab('profile'),
        badge: `${reservoirVal.toFixed(0)}j`,
        badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
      };
    }

    // 3. Priorytet: Zbliżająca się wymiana osprzętu według kalendarza użytkownika
    if (equipmentStatus.sensorHoursLeft !== null && equipmentStatus.sensorHoursLeft <= 12 && equipmentStatus.sensorHoursLeft > 0) {
      return {
        id: 'sensor_expiry',
        icon: <Signal size={16} className="text-amber-500 shrink-0" />,
        title: t('at_a_glance.sensor_expiry_title', { defaultValue: 'Harmonogram: sensor za {{hours}} godz.', hours: equipmentStatus.sensorHoursLeft }),
        desc: t('at_a_glance.sensor_expiry_desc', { defaultValue: 'Zbliża się zaplanowany w profilu czas wymiany sensora' }),
        action: () => {
          setTab('profile');
        },
        badge: `${equipmentStatus.sensorHoursLeft}h`,
        badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
      };
    }

    if (isInsulinMode && equipmentStatus.cannulaHoursLeft !== null && equipmentStatus.cannulaHoursLeft <= 8 && equipmentStatus.cannulaHoursLeft > 0) {
      return {
        id: 'cannula_expiry',
        icon: <Droplets size={16} className="text-teal-500 shrink-0" />,
        title: t('at_a_glance.cannula_expiry_title', { defaultValue: 'Harmonogram: wkłucie za {{hours}} godz.', hours: equipmentStatus.cannulaHoursLeft }),
        desc: t('at_a_glance.cannula_expiry_desc', { defaultValue: 'Zbliża się zaplanowany w profilu czas rotacji wkłucia' }),
        action: () => {
          setTab('profile');
        },
        badge: `${equipmentStatus.cannulaHoursLeft}h`,
        badgeColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20'
      };
    }

    // 4. Priorytet: Stan bieżący odczytu (obiektywny fakt liczbowy i zakresy z profilu)
    if (latestGlucose) {
      const val = latestGlucose.value;
      const minTarget = userSettings?.targetMin || 70;
      const maxTarget = userSettings?.targetMax || 180;
      const isTarget = val >= minTarget && val <= maxTarget;
      const isLow = val < minTarget;
      const isHigh = val > maxTarget;

      // 4a. Odczyt poniżej normy użytkownika
      if (isLow) {
        return {
          id: 'glucose_low',
          icon: <AlertTriangle size={16} className="text-rose-500 animate-pulse shrink-0" />,
          title: t('at_a_glance.glucose_low_title', { defaultValue: 'Odczyt poniżej zakresu docelowego' }),
          desc: t('at_a_glance.glucose_low_desc', { 
            defaultValue: `Wartość ${val} mg/dL • Poniżej progu ${minTarget} mg/dL`,
            val,
            min: minTarget
          }),
          action: () => setTab('chart'),
          badge: `${val} mg/dL`,
          badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20'
        };
      }

      // 4b. Odczyt powyżej normy użytkownika
      if (isHigh) {
        return {
          id: 'glucose_high',
          icon: <AlertTriangle size={16} className="text-orange-500 shrink-0" />,
          title: t('at_a_glance.glucose_high_title', { defaultValue: 'Odczyt powyżej zakresu docelowego' }),
          desc: t('at_a_glance.glucose_high_desc', { 
            defaultValue: `Wartość ${val} mg/dL • Powyżej progu ${maxTarget} mg/dL`,
            val,
            max: maxTarget
          }),
          action: () => setTab('chart'),
          badge: `${val} mg/dL`,
          badgeColor: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20'
        };
      }

      // 4c. W normie
      if (isTarget) {
        // Jeśli jest wieczór (po 19:30) i mamy statystyki z całego dnia, wyświetl dzienne podsumowanie TIR
        const currentHour = new Date().getHours();
        if (currentHour >= 19 && todayStats) {
          return {
            id: 'daily_tir_summary',
            icon: <Activity size={16} className="text-teal-500 shrink-0" />,
            title: t('at_a_glance.daily_tir_title', { 
              defaultValue: `Dzisiaj: ${todayStats.tirPercent}% w zakresie docelowym`,
              tir: todayStats.tirPercent
            }),
            desc: t('at_a_glance.daily_tir_desc', { 
              defaultValue: `Średni odczyt: ${todayStats.avg} mg/dL • ${todayStats.count} pomiarów`,
              avg: todayStats.avg,
              count: todayStats.count
            }),
            action: () => setTab('chart'),
            badge: `${todayStats.tirPercent}% TIR`,
            badgeColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20'
          };
        }

        return {
          id: 'glucose_target',
          icon: <Activity size={16} className="text-emerald-500 shrink-0" />,
          title: t('at_a_glance.glucose_in_range', { defaultValue: 'Odczyt w zakresie docelowym' }),
          desc: t('at_a_glance.glucose_in_range_desc', { 
            defaultValue: `Ostatni odczyt: ${val} mg/dL • Zakres ${minTarget}-${maxTarget} mg/dL`,
            val,
            min: minTarget,
            max: maxTarget
          }),
          action: () => setTab('chart'),
          badge: `${val} mg/dL`,
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        };
      }
    }

    // 5. Domyślny stan powitania z rzetelną weryfikacją powiadomień
    let notificationsActive = true;
    try {
      const localNotif = localStorage.getItem('notificationsEnabled');
      if (localNotif !== null) {
        notificationsActive = localNotif !== 'false';
      } else if (userSettings?.notificationsEnabled !== undefined) {
        notificationsActive = Boolean(userSettings.notificationsEnabled);
      }
    } catch {
      notificationsActive = Boolean(userSettings?.notificationsEnabled ?? true);
    }

    if (notificationsActive) {
      return {
        id: 'default_glance_active',
        icon: <ShieldCheck size={16} className="text-indigo-500 shrink-0" />,
        title: t('at_a_glance.gliko_ready', { defaultValue: 'Rejestrator danych aktywny' }),
        desc: t('at_a_glance.gliko_ready_desc', { defaultValue: 'Powiadomienia i synchronizacja włączone' }),
        action: () => setTab('chart'),
        badge: 'OK',
        badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      };
    }

    return {
      id: 'default_glance_muted',
      icon: <BellOff size={16} className="text-amber-500 shrink-0" />,
      title: t('at_a_glance.gliko_standby', { defaultValue: 'Rejestrator w trybie pasywnym' }),
      desc: t('at_a_glance.notifications_disabled_desc', { defaultValue: 'Powiadomienia w aplikacji są wyłączone' }),
      action: () => setTab('profile'),
      badge: t('at_a_glance.badge_off', { defaultValue: 'WYŁ.' }),
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
    };
  }, [preBolusState, equipmentStatus, latestGlucose, userSettings, isInsulinMode, pumpStatus, todayStats, t, setTab]);

  // Format daty po polsku/angielsku
  const formattedDate = useMemo(() => {
    const isPl = i18n.language.startsWith('pl');
    return currentDate.toLocaleDateString(isPl ? 'pl-PL' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }, [currentDate, i18n.language]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="px-2 pt-1 pb-1 select-none"
    >
      {/* Górna linia: Data */}
      <div className="flex items-center text-xs font-black dark:text-white px-1 mb-2 tracking-tight">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
          <span className="capitalize">{formattedDate}</span>
        </div>
      </div>

      {/* Dolna linia: Dynamiczna pigułka kontekstowa W skrócie */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          Haptics.light();
          contextItem.action();
        }}
        className={cn(
          "w-full flex items-center justify-between p-3 sm:p-3.5 rounded-[1.75rem] border text-left transition-all group",
          userSettings?.glassmorphismEnabled
            ? "backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border-white/40 dark:border-white/10 shadow-sm"
            : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 shadow-xs"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0">
            {contextItem.icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black dark:text-white leading-tight truncate">
              {contextItem.title}
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              {contextItem.desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
            contextItem.badgeColor
          )}>
            {contextItem.badge}
          </span>
          <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </motion.button>
    </motion.div>
  );
}
