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
  BatteryMedium,
  FileText,
  X,
  AlertCircle
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedReimbursementBanner, setDismissedReimbursementBanner] = useState<boolean>(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      return localStorage.getItem(`reimbursement_pill_dismissed_${todayStr}`) === 'true';
    } catch {
      return false;
    }
  });
  const scrollRef = React.useRef<HTMLDivElement>(null);

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

  // Lista wszystkich dostępnych, aktualnych kart kontekstowych
  const contextItems = useMemo(() => {
    const items: Array<{
      id: string;
      icon: React.ReactNode;
      title: string;
      desc: string;
      action: () => void;
      badge: string;
      badgeColor: string;
    }> = [];

    // 1. Pilne wygaśnięcie zlecenia refundacji (<= 7 dni lub wygasłe) - najwyższy priorytet
    if (userSettings?.reimbursementEndDate) {
      const diffMs = new Date(userSettings.reimbursementEndDate).getTime() - Date.now();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        items.push({
          id: 'reimbursement_urgent_expiry',
          icon: <FileText size={16} className="text-rose-500 shrink-0 animate-pulse" />,
          title: diffDays > 0 
            ? t('at_a_glance.reimbursement_urgent_title', { defaultValue: 'Pilne: Zlecenie wygasa za {{days}} dni!', days: diffDays })
            : t('at_a_glance.reimbursement_expired_title', { defaultValue: 'Zlecenie refundacji wygasło' }),
          desc: userSettings.reimbursementNotes
            ? `${userSettings.reimbursementNotes} • ${t('at_a_glance.reimbursement_urgent_desc', { defaultValue: 'Odnów zlecenie u lekarza' })}`
            : t('at_a_glance.reimbursement_urgent_desc', { defaultValue: 'Odnów zlecenie u lekarza, by zachować ciągłość refundacji' }),
          action: () => setTab('profile'),
          badge: diffDays > 0 ? `${diffDays}d` : '!',
          badgeColor: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30'
        });
      }
    }

    // 2. Aktywny stoper przedposiłkowy
    if (preBolusState.active) {
      const mins = Math.floor(preBolusState.remainingSeconds / 60);
      const secs = preBolusState.remainingSeconds % 60;
      const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      
      if (preBolusState.isReady || preBolusState.remainingSeconds <= 0) {
        items.push({
          id: 'prebolus_ready',
          icon: <CheckCircle2 size={16} className="text-emerald-500 animate-pulse shrink-0" />,
          title: t('bolus.ready_to_eat_title', { defaultValue: 'Odliczanie zakończone' }),
          desc: t('bolus.ready_to_eat_desc', { defaultValue: 'Upłynął zaplanowany czas oczekiwania' }),
          action: () => setTab('plate'),
          badge: t('at_a_glance.badge_time', { defaultValue: 'CZAS' }),
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        });
      } else {
        items.push({
          id: 'prebolus_timer',
          icon: <Clock size={16} className="text-accent-500 animate-pulse shrink-0" />,
          title: `${t('bolus.timer_active', { defaultValue: 'Stoper:' })} ${timeStr}`,
          desc: preBolusState.bolusUnits 
            ? t('at_a_glance.timer_bolus_logged', { defaultValue: 'Zarejestrowano {{units}}j • Odliczanie czasu', units: preBolusState.bolusUnits })
            : t('at_a_glance.timer_countdown', { defaultValue: 'Odliczanie zaplanowanego odstępu czasowego' }),
          action: () => setTab('plate'),
          badge: timeStr,
          badgeColor: 'bg-accent-500/15 text-accent-600 dark:text-accent-400 border-accent-500/20'
        });
      }
    }

    // 3. Niski poziom rezerwy zbiornika w pompie (< 20j)
    const reservoirVal = typeof pumpStatus?.reservoir === 'number' ? pumpStatus.reservoir : undefined;
    if (isInsulinMode && reservoirVal !== undefined && reservoirVal > 0 && reservoirVal <= 20) {
      items.push({
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
      });
    }

    // 4. Zbliżająca się wymiana osprzętu
    if (equipmentStatus.sensorHoursLeft !== null && equipmentStatus.sensorHoursLeft <= 12 && equipmentStatus.sensorHoursLeft > 0) {
      items.push({
        id: 'sensor_expiry',
        icon: <Signal size={16} className="text-amber-500 shrink-0" />,
        title: t('at_a_glance.sensor_expiry_title', { defaultValue: 'Harmonogram: sensor za {{hours}} godz.', hours: equipmentStatus.sensorHoursLeft }),
        desc: t('at_a_glance.sensor_expiry_desc', { defaultValue: 'Zbliża się zaplanowany w profilu czas wymiany sensora' }),
        action: () => setTab('profile'),
        badge: `${equipmentStatus.sensorHoursLeft}h`,
        badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
      });
    }

    if (isInsulinMode && equipmentStatus.cannulaHoursLeft !== null && equipmentStatus.cannulaHoursLeft <= 8 && equipmentStatus.cannulaHoursLeft > 0) {
      items.push({
        id: 'cannula_expiry',
        icon: <Droplets size={16} className="text-teal-500 shrink-0" />,
        title: t('at_a_glance.cannula_expiry_title', { defaultValue: 'Harmonogram: wkłucie za {{hours}} godz.', hours: equipmentStatus.cannulaHoursLeft }),
        desc: t('at_a_glance.cannula_expiry_desc', { defaultValue: 'Zbliża się zaplanowany w profilu czas rotacji wkłucia' }),
        action: () => setTab('profile'),
        badge: `${equipmentStatus.cannulaHoursLeft}h`,
        badgeColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20'
      });
    }

    // 5. Standardowe zbliżające się zakończenie zlecenia (od 8 do 30 dni)
    if (userSettings?.reimbursementEndDate) {
      const diffMs = new Date(userSettings.reimbursementEndDate).getTime() - Date.now();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 7 && diffDays <= 30) {
        items.push({
          id: 'reimbursement_global_expiry',
          icon: <FileText size={16} className="text-indigo-400 shrink-0 animate-pulse" />,
          title: t('at_a_glance.reimbursement_soon_title', { defaultValue: 'Refundacja: koniec za {{days}} dni', days: diffDays }),
          desc: userSettings.reimbursementNotes
            ? `${userSettings.reimbursementNotes} • ${t('at_a_glance.reimbursement_check_desc', { defaultValue: 'Warto zaplanować odnowienie zlecenia' })}`
            : t('at_a_glance.reimbursement_check_desc', { defaultValue: 'Zbliża się koniec okresu zlecenia na zaopatrzenie' }),
          action: () => setTab('profile'),
          badge: `${diffDays}d`,
          badgeColor: 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border-indigo-500/30'
        });
      }
    }

    // Dodatkowo: sprawdzenie poszczególnych pozycji sprzętu w apteczce ze zleceniem
    if (userSettings?.inventory && userSettings.inventory.length > 0) {
      for (const invItem of userSettings.inventory) {
        if (invItem.isReimbursed && invItem.reimbursementEndDate) {
          const itemDiffDays = Math.ceil((new Date(invItem.reimbursementEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (itemDiffDays <= 30) {
            items.push({
              id: `reimbursement_item_${invItem.id}`,
              icon: <FileText size={16} className="text-indigo-400 shrink-0" />,
              title: itemDiffDays > 0
                ? `${invItem.name}: ${t('at_a_glance.reimbursement_item_days', { defaultValue: 'zlecenie za {{days}}d', days: itemDiffDays })}`
                : `${invItem.name}: ${t('at_a_glance.reimbursement_expired', { defaultValue: 'zlecenie wygasło' })}`,
              desc: t('at_a_glance.reimbursement_item_desc', { defaultValue: 'Zaplanuj wizytę lub kontakt w sprawie nowego zlecenia' }),
              action: () => setTab('profile'),
              badge: itemDiffDays > 0 ? `${itemDiffDays}d` : '!',
              badgeColor: itemDiffDays <= 7
                ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30'
                : 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border-indigo-500/30'
            });
          }
        }
      }
    }

    // 4. Stan bieżący odczytu glukozy
    if (latestGlucose) {
      const val = latestGlucose.value;
      const minTarget = userSettings?.targetMin || 70;
      const maxTarget = userSettings?.targetMax || 180;
      const isTarget = val >= minTarget && val <= maxTarget;
      const isLow = val < minTarget;
      const isHigh = val > maxTarget;

      if (isLow) {
        items.push({
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
        });
      } else if (isHigh) {
        items.push({
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
        });
      } else if (isTarget) {
        items.push({
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
        });
      }
    }

    // 5. Dzienne podsumowanie TIR (jeśli są dane z co najmniej 5 pomiarów)
    if (todayStats) {
      items.push({
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
      });
    }

    // 6. Domyślny stan powiadomień i rejestratora (jako karta bazowa/uzupełniająca)
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

    if (items.length === 0 || (!items.some(i => i.id === 'default_glance_active') && items.length < 2)) {
      if (notificationsActive) {
        items.push({
          id: 'default_glance_active',
          icon: <ShieldCheck size={16} className="text-indigo-500 shrink-0" />,
          title: t('at_a_glance.gliko_ready', { defaultValue: 'Rejestrator danych aktywny' }),
          desc: t('at_a_glance.gliko_ready_desc', { defaultValue: 'Powiadomienia i synchronizacja włączone' }),
          action: () => setTab('chart'),
          badge: 'OK',
          badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
        });
      } else {
        items.push({
          id: 'default_glance_muted',
          icon: <BellOff size={16} className="text-amber-500 shrink-0" />,
          title: t('at_a_glance.gliko_standby', { defaultValue: 'Rejestrator w trybie pasywnym' }),
          desc: t('at_a_glance.notifications_disabled_desc', { defaultValue: 'Powiadomienia w aplikacji są wyłączone' }),
          action: () => setTab('profile'),
          badge: t('at_a_glance.badge_off', { defaultValue: 'WYŁ.' }),
          badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
        });
      }
    }

    return items;
  }, [preBolusState, equipmentStatus, latestGlucose, userSettings, isInsulinMode, pumpStatus, todayStats, t, setTab]);

  // Śledzenie przewijania karuzeli dla wskaźników stron (kropek)
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const scrollLeft = el.scrollLeft;
    const width = el.clientWidth;
    if (width > 0) {
      const newIdx = Math.round(scrollLeft / width);
      if (newIdx !== activeIndex && newIdx >= 0 && newIdx < contextItems.length) {
        setActiveIndex(newIdx);
      }
    }
  };

  const scrollToIndex = (idx: number) => {
    Haptics.tick();
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({
      left: idx * width,
      behavior: 'smooth'
    });
    setActiveIndex(idx);
  };

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
      {/* Górna linia: Data oraz opcjonalny licznik stron */}
      <div className="flex items-center justify-between text-xs font-black dark:text-white px-1 mb-2 tracking-tight">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
          <span className="capitalize">{formattedDate}</span>
        </div>

        {contextItems.length > 1 && (
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
            {activeIndex + 1} / {contextItems.length}
          </span>
        )}
      </div>

      {/* Subtelny baner / Pigułka priorytetowa końca refundacji (<= 30 dni lub wygasłe) */}
      {(() => {
        if (dismissedReimbursementBanner) return null;

        // 1. Sprawdź główne zlecenie
        let urgentDate = userSettings?.reimbursementEndDate;
        let urgentName = '';
        let minDays: number | null = null;

        if (urgentDate) {
          const diffMs = new Date(urgentDate).getTime() - Date.now();
          const d = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (d <= 30) {
            minDays = d;
          }
        }

        // 2. Sprawdź pozycje w apteczce (jeśli mają bliższy termin)
        if (userSettings?.inventory && userSettings.inventory.length > 0) {
          for (const item of userSettings.inventory) {
            if (item.isReimbursed && item.reimbursementEndDate) {
              const diffMs = new Date(item.reimbursementEndDate).getTime() - Date.now();
              const d = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              if (d <= 30 && (minDays === null || d < minDays)) {
                minDays = d;
                urgentName = item.name;
              }
            }
          }
        }

        if (minDays === null) return null;

        const isExpired = minDays <= 0;
        const isVeryUrgent = minDays <= 7;

        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "mb-2.5 px-3 py-2 rounded-2xl border flex items-center justify-between gap-2 shadow-xs transition-all",
              isVeryUrgent
                ? "bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300"
                : "bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300"
            )}
          >
            <button
              type="button"
              onClick={() => {
                Haptics.light();
                setTab('profile');
              }}
              className="flex items-center gap-2 min-w-0 text-left flex-1"
            >
              <div className={cn(
                "w-6 h-6 rounded-xl flex items-center justify-center shrink-0",
                isVeryUrgent ? "bg-rose-500/20 text-rose-500 animate-pulse" : "bg-indigo-500/20 text-indigo-500"
              )}>
                <AlertCircle size={13} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black leading-tight truncate">
                  {isExpired 
                    ? (urgentName ? `${urgentName}: ${t('at_a_glance.pill_expired', { defaultValue: 'Zlecenie wygasło!' })}` : t('at_a_glance.pill_expired', { defaultValue: 'Zlecenie refundacji wygasło!' }))
                    : (urgentName 
                        ? `${urgentName}: ${t('at_a_glance.pill_days_left', { defaultValue: 'Koniec zlecenia za {{days}} dni!', days: minDays })}`
                        : t('at_a_glance.pill_days_left', { defaultValue: 'Zlecenie NFZ kończy się za {{days}} dni!', days: minDays })
                      )}
                </p>
                <p className="text-[9px] opacity-80 truncate font-semibold">
                  {t('at_a_glance.pill_tap_action', { defaultValue: 'Dotknij, aby sprawdzić apteczkę i profil' })}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                Haptics.light();
                setDismissedReimbursementBanner(true);
                try {
                  const todayStr = new Date().toISOString().split('T')[0];
                  localStorage.setItem(`reimbursement_pill_dismissed_${todayStr}`, 'true');
                  if (urgentDate) {
                    localStorage.setItem(`reimbursement_pill_dismissed_date_${urgentDate}`, 'true');
                  }
                } catch (err) {
                  console.warn('Failed to save dismissal:', err);
                }
              }}
              aria-label="Zamknij powiadomienie"
              className="p-2 -mr-1 rounded-xl opacity-70 hover:opacity-100 active:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 active:bg-black/15 dark:active:bg-white/15 shrink-0 transition-all flex items-center justify-center touch-manipulation cursor-pointer z-10"
            >
              <X size={15} className="shrink-0 pointer-events-none" />
            </button>
          </motion.div>
        );
      })()}

      {/* Karuzela z przesuwanymi kartami (Snap Carousel) */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-2 w-full touch-pan-x"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {contextItems.map((item, idx) => (
          <div key={item.id || idx} className="w-full shrink-0 snap-center">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                Haptics.light();
                item.action();
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
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black dark:text-white leading-tight truncate">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                  item.badgeColor
                )}>
                  {item.badge}
                </span>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.button>
          </div>
        ))}
      </div>

      {/* Kropki wskaźnika stron (Page Indicator Dots) */}
      {contextItems.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {contextItems.map((item, idx) => (
            <button
              key={item.id || idx}
              type="button"
              onClick={() => scrollToIndex(idx)}
              aria-label={`Przejdź do karty ${idx + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                activeIndex === idx
                  ? "w-4 bg-accent-500 dark:bg-accent-400"
                  : "w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
              )}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
