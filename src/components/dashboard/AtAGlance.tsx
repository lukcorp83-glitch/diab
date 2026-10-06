import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CloudRain, 
  Sun, 
  Cloud, 
  Sparkles, 
  Clock, 
  Signal, 
  Droplets, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Haptics } from '../../lib/haptics';
import { fetchCurrentWeather } from '../../services/weatherService';
import { getPreBolusTimerState, PreBolusTimerState } from '../../services/preBolusService';
import { LogEntry, UserSettings } from '../../types';
import { cn } from '../../lib/utils';

interface AtAGlanceProps {
  userSettings?: UserSettings;
  logs?: LogEntry[];
  setTab: (tab: string) => void;
  isInsulinMode?: boolean;
}

export default function AtAGlance({ userSettings, logs = [], setTab, isInsulinMode = true }: AtAGlanceProps) {
  const { t, i18n } = useTranslation();
  const [weather, setWeather] = useState<any>(null);
  const [preBolusState, setPreBolusState] = useState<PreBolusTimerState>(() => getPreBolusTimerState());
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Zegar dla nagłówka daty
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Pobieranie pogody
  useEffect(() => {
    let mounted = true;
    fetchCurrentWeather().then((data) => {
      if (mounted && data) setWeather(data);
    });
    return () => { mounted = false; };
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
    // 1. Priorytet: Aktywny stoper przedposiłkowy
    if (preBolusState.active) {
      const mins = Math.floor(preBolusState.remainingSeconds / 60);
      const secs = preBolusState.remainingSeconds % 60;
      const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      
      if (preBolusState.isReady || preBolusState.remainingSeconds <= 0) {
        return {
          id: 'prebolus_ready',
          icon: <CheckCircle2 size={16} className="text-emerald-500 animate-pulse shrink-0" />,
          title: t('bolus.ready_to_eat_title', { defaultValue: 'Czas na posiłek!' }),
          desc: t('bolus.ready_to_eat_desc', { defaultValue: 'Możesz bezpiecznie rozpocząć jedzenie' }),
          action: () => setTab('plate'),
          badge: 'GOTOWE',
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        };
      }

      return {
        id: 'prebolus_timer',
        icon: <Clock size={16} className="text-accent-500 animate-pulse shrink-0" />,
        title: `${t('bolus.timer_active', { defaultValue: 'Posiłek za' })} ${timeStr}`,
        desc: preBolusState.bolusUnits ? `Podano ${preBolusState.bolusUnits}j • Oczekiwanie na rozkręcenie insuliny` : 'Odliczanie optymalnego odstępu przed posiłkiem',
        action: () => setTab('plate'),
        badge: timeStr,
        badgeColor: 'bg-accent-500/15 text-accent-600 dark:text-accent-400 border-accent-500/20'
      };
    }

    // 2. Priorytet: Zbliżająca się wymiana osprzętu (< 24h)
    if (equipmentStatus.sensorHoursLeft !== null && equipmentStatus.sensorHoursLeft <= 12 && equipmentStatus.sensorHoursLeft > 0) {
      return {
        id: 'sensor_expiry',
        icon: <Signal size={16} className="text-amber-500 shrink-0" />,
        title: `Wymiana sensora za ${equipmentStatus.sensorHoursLeft} godz.`,
        desc: 'Przygotuj nowy sensor CGM do aplikacji',
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
        title: `Wymiana wkłucia za ${equipmentStatus.cannulaHoursLeft} godz.`,
        desc: 'Zbliża się rekomendowany czas rotacji wkłucia pompy',
        action: () => {
          setTab('profile');
        },
        badge: `${equipmentStatus.cannulaHoursLeft}h`,
        badgeColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20'
      };
    }

    // 3. Priorytet: Stabilna norma lub stan bieżący glikemii
    if (latestGlucose) {
      const val = latestGlucose.value;
      const isTarget = val >= (userSettings?.targetMin || 70) && val <= (userSettings?.targetMax || 180);
      
      if (isTarget) {
        return {
          id: 'glucose_target',
          icon: <Sparkles size={16} className="text-emerald-500 shrink-0" />,
          title: t('at_a_glance.glucose_in_range', { defaultValue: 'Glikemia w docelowym zakresie' }),
          desc: `Ostatni odczyt ${val} mg/dL • Profil stabilny`,
          action: () => setTab('chart'),
          badge: `${val} mg/dL`,
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        };
      }
    }

    // Domyślny stan powitania z datą
    return {
      id: 'default_glance',
      icon: <Sparkles size={16} className="text-indigo-500 shrink-0" />,
      title: t('at_a_glance.gliko_ready', { defaultValue: 'GlikoSense czuwa nad glikemią' }),
      desc: t('at_a_glance.gliko_ready_desc', { defaultValue: 'Wszystkie systemy i powiadomienia aktywne' }),
      action: () => setTab('chart'),
      badge: 'OK',
      badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    };
  }, [preBolusState, equipmentStatus, latestGlucose, userSettings, isInsulinMode, t, setTab]);

  // Format daty po polsku/angielsku
  const formattedDate = useMemo(() => {
    const isPl = i18n.language.startsWith('pl');
    return currentDate.toLocaleDateString(isPl ? 'pl-PL' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }, [currentDate, i18n.language]);

  // Ikona pogody
  const weatherIcon = useMemo(() => {
    if (!weather) return <Sun size={15} className="text-amber-500" />;
    const cond = (weather.condition || '').toLowerCase();
    if (cond.includes('deszcz') || cond.includes('rain')) return <CloudRain size={15} className="text-sky-500" />;
    if (cond.includes('chm') || cond.includes('cloud')) return <Cloud size={15} className="text-slate-400" />;
    return <Sun size={15} className="text-amber-500" />;
  }, [weather]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="px-2 pt-1 pb-1 select-none"
    >
      {/* Górna linia: Data i Temperatura w stylu Pixel At a Glance */}
      <div className="flex items-center justify-between text-xs font-black dark:text-white px-1 mb-2 tracking-tight">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
          <span className="capitalize">{formattedDate}</span>
        </div>

        {weather && (
          <div 
            onClick={() => { Haptics.light(); setTab('chart'); }}
            className="flex items-center gap-1.5 cursor-pointer opacity-85 hover:opacity-100 transition-opacity"
          >
            {weatherIcon}
            <span>{Math.round(weather.temp)}°C</span>
            {weather.city && <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">• {weather.city}</span>}
          </div>
        )}
      </div>

      {/* Dolna linia: Dynamiczna pigułka kontekstowa Google Pixel */}
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
