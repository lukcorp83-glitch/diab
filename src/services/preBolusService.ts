import { LogEntry, UserSettings } from '../types';
import { notificationService } from './notificationService';
import { NotificationBridge } from '../lib/notificationBridge';
import { Haptics } from '../lib/haptics';
import { toast } from 'react-hot-toast';
import i18n from '../i18n';

export interface PreBolusCalculation {
  waitMinutes: number;
  reason: string;
}

export interface PreBolusTimerState {
  active: boolean;
  remainingSeconds: number;
  totalMinutes: number;
  targetTime: number;
  startTime: number;
  bolusUnits?: number;
  elapsedSeconds: number;
  isReady: boolean;
}

/**
 * Wylicza optymalny czas odstępu między podaniem bolusa a posiłkiem (Pre-Bolus Lag Time)
 */
export function calculatePreBolusWaitTime(
  glucoseValue: number | null,
  trend: string | null,
  insulinType?: string
): PreBolusCalculation {
  const normInsulin = (insulinType || '').toLowerCase();
  const isUltraFast = normInsulin.includes('fiasp') || normInsulin.includes('lyumjev') || normInsulin.includes('ultrafast');
  const isRegular = normInsulin.includes('actrapid') || normInsulin.includes('regular') || normInsulin.includes('gensulin') || normInsulin.includes('humulin') || normInsulin.includes('polhumin');

  if (glucoseValue === null || glucoseValue === undefined) {
    const defaultWait = isUltraFast ? 5 : (isRegular ? 25 : 10);
    return {
      waitMinutes: defaultWait,
      reason: `Czas bazowy dla insuliny (${defaultWait} min)`
    };
  }

  // 1. Precyzyjne progi kliniczne (wg wytycznych diabetologicznych PTD / ISPAD)
  let waitMinutes = 10;
  let reason = '';

  if (glucoseValue < 80) {
    return {
      waitMinutes: 0,
      reason: i18n.t('bolus.timing_hypo', { defaultValue: '⚠️ Niski cukier! Zjedz posiłek natychmiast, bez czekania.' })
    };
  } else if (glucoseValue < 100) {
    // 80 - 99: niska norma
    waitMinutes = isUltraFast ? 0 : (isRegular ? 15 : 5);
    reason = 'glikemia 80-100 mg/dL (niska norma)';
  } else if (glucoseValue <= 130) {
    // 100 - 130: idealna norma
    waitMinutes = isUltraFast ? 3 : (isRegular ? 20 : 10);
    reason = 'glikemia w normie';
  } else if (glucoseValue <= 160) {
    // 131 - 160: lekko podwyższona (np. 141 mg/dL -> 12 min)
    waitMinutes = isUltraFast ? 6 : (isRegular ? 25 : 12);
    reason = 'glikemia lekko podwyższona';
  } else if (glucoseValue <= 200) {
    // 161 - 200: podwyższona
    waitMinutes = isUltraFast ? 10 : (isRegular ? 30 : 18);
    reason = 'glikemia podwyższona';
  } else if (glucoseValue <= 250) {
    // 201 - 250: wysoka
    waitMinutes = isUltraFast ? 15 : (isRegular ? 35 : 22);
    reason = 'wysoka glikemia';
  } else {
    // > 250: bardzo wysoka
    waitMinutes = isUltraFast ? 20 : (isRegular ? 40 : 25);
    reason = 'bardzo wysoka glikemia';
  }

  // 2. Korekta trendem CGM
  let trendMod = 0;
  let trendReason = '';
  if (trend === 'SingleUp' || trend === 'DoubleUp' || trend === 'FortyFiveUp' || trend === '↑' || trend === '⇈' || trend === '↗') {
    trendMod = 3;
    trendReason = ', trend rosnący (+3 min)';
  } else if (trend === 'SingleDown' || trend === 'DoubleDown' || trend === 'FortyFiveDown' || trend === '↓' || trend === '⇊' || trend === '↘') {
    trendMod = -3;
    trendReason = ', trend spadkowy (-3 min)';
  }

  const finalWait = Math.max(0, Math.min(35, waitMinutes + trendMod));

  return {
    waitMinutes: finalWait,
    reason: `Sugerowany odstęp: ${finalWait} min (${reason}${trendReason})`
  };
}

/**
 * Uruchamia stoper przedposiłkowy i planuje powiadomienie
 */
export function startPreBolusTimer(
  totalWaitMinutes: number,
  bolusUnits?: number,
  customStartTime?: number
): void {
  const startTime = customStartTime || Date.now();
  const targetTime = startTime + totalWaitMinutes * 60 * 1000;
  const remainingMinutes = Math.max(1, Math.ceil((targetTime - Date.now()) / 60000));

  const state = {
    startTime,
    targetTime,
    totalMinutes: totalWaitMinutes,
    bolusUnits
  };

  localStorage.setItem('prebolus_timer_state', JSON.stringify(state));

  // 1. Planujemy powiadomienie lokalne na telefonie
  notificationService.scheduleLocalNotification(
    i18n.t('bolus.reminder_title', { defaultValue: 'Czas na posiłek! 🍽️' }),
    i18n.t('bolus.reminder_body', { 
      minutes: totalWaitMinutes, 
      defaultValue: `Minęło ${totalWaitMinutes} minut od bolusa. Insulina zaczęła działać – możesz zjeść posiłek!` 
    }),
    remainingMinutes,
    777
  );

  // 2. Uruchamiamy natywny chronometr Androida na belce i ekranie blokady (Live Chronometer)
  try {
    NotificationBridge.startLiveTimer({
      targetTime,
      title: i18n.t('bolus.live_timer_title', { defaultValue: 'Czas do posiłku 🍽️' }),
      text: i18n.t('bolus.live_timer_desc', { 
        units: bolusUnits ? `(${bolusUnits} j.) ` : '',
        defaultValue: `Odliczanie przedposiłkowe ${bolusUnits ? `(${bolusUnits} j.) ` : ''}w toku...` 
      }),
      id: 777
    }).catch((e: any) => console.log('Live timer non-native or unsupported:', e));
  } catch (e) {
    // Ignore on Web
  }

  window.dispatchEvent(new CustomEvent('prebolus_timer_update', { detail: getPreBolusTimerState() }));
}

/**
 * Zwraca bieżący stan stopera przedposiłkowego
 */
export function getPreBolusTimerState(): PreBolusTimerState {
  const saved = localStorage.getItem('prebolus_timer_state');
  if (!saved) {
    return {
      active: false,
      remainingSeconds: 0,
      totalMinutes: 0,
      targetTime: 0,
      startTime: 0,
      elapsedSeconds: 0,
      isReady: false
    };
  }

  try {
    const parsed = JSON.parse(saved);
    const now = Date.now();
    const targetTime = parsed.targetTime;
    const startTime = parsed.startTime;
    const remainingSeconds = Math.round((targetTime - now) / 1000);
    const elapsedSeconds = Math.round((now - startTime) / 1000);

    // Jeśli od zakończenia minęło ponad 45 minut, wygaszamy stoper
    if (remainingSeconds < -45 * 60) {
      localStorage.removeItem('prebolus_timer_state');
      try {
        NotificationBridge.stopLiveTimer({ id: 777 }).catch(() => {});
      } catch (e) {}
      return {
        active: false,
        remainingSeconds: 0,
        totalMinutes: 0,
        targetTime: 0,
        startTime: 0,
        elapsedSeconds: 0,
        isReady: false
      };
    }

    return {
      active: true,
      remainingSeconds,
      totalMinutes: parsed.totalMinutes,
      targetTime,
      startTime,
      bolusUnits: parsed.bolusUnits,
      elapsedSeconds,
      isReady: remainingSeconds <= 0
    };
  } catch (e) {
    return {
      active: false,
      remainingSeconds: 0,
      totalMinutes: 0,
      targetTime: 0,
      startTime: 0,
      elapsedSeconds: 0,
      isReady: false
    };
  }
}

/**
 * Anuluje / zamyka stoper przedposiłkowy
 */
export function cancelPreBolusTimer(): void {
  localStorage.removeItem('prebolus_timer_state');
  try {
    NotificationBridge.stopLiveTimer({ id: 777 }).catch(() => {});
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('prebolus_timer_update', { detail: getPreBolusTimerState() }));
}

/**
 * Automatycznie wykrywa nowy bolus POSIŁKOWY z pompy i uruchamia stoper z kompensacją opóźnienia
 * UWAGA: Ignoruje czyste korekty / mikro-bolusy bez węglowodanów (np. 0.1j z pętli/pompy)!
 */
export function checkAndNotifyPumpBolus(
  logs: LogEntry[],
  currentGlucose: number | null,
  currentTrend: string | null,
  userSettings?: UserSettings
): void {
  if (!logs || logs.length === 0) return;

  // Sprawdzamy czy powiadomienia o bolusie z pompy są włączone w ustawieniach
  if (userSettings?.notificationPrefs && userSettings.notificationPrefs.pumpBolusPreMeal === false) {
    return;
  }

  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;

  // Szukamy najnowszego bolusa z pompy / historii
  const latestBolus = logs
    .filter(l => (l.type === 'bolus' || (l.type as any) === 'correction_bolus') && Number(l.value || (l as any).carbsBolus || 0) > 0)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

  if (!latestBolus || !latestBolus.timestamp) return;

  const bolusAgeMs = now - latestBolus.timestamp;
  if (bolusAgeMs < 0 || bolusAgeMs > THIRTY_MINUTES) {
    return; // Zbyt stary bolus
  }

  // Sprawdzamy czy ten bolus jest związany z posiłkiem / węglowodanami:
  const bolusCarbs = Number((latestBolus as any).carbs || (latestBolus as any).carb_input || (latestBolus as any).carbsBolus || 0);
  
  // Szukamy wpisu posiłku zarejestrowanego w pobliżu tego bolusa (w przedziale +/- 12 minut)
  const hasNearbyMeal = logs.some(l => 
    l.type === 'meal' && 
    Math.abs((l.timestamp || 0) - latestBolus.timestamp) <= 12 * 60 * 1000 &&
    Number(l.value || (l as any).carbs || 0) > 0
  );

  const isExplicitMealBolus = bolusCarbs > 0 || hasNearbyMeal;

  // Jeśli to jest czysta mikro-korekta (np. 0.05j, 0.1j bez węglowodanów) - ignorujemy!
  if (!isExplicitMealBolus) {
    return;
  }

  // Identyfikator bolusa zapobiegający wielokrotnym alertom na ten sam wpis
  const bolusId = `${latestBolus.id || latestBolus.timestamp}_${latestBolus.value}`;
  const lastProcessed = sessionStorage.getItem('last_processed_pump_bolus');

  if (lastProcessed === bolusId) {
    return; // Już obsłużony w bieżącej sesji
  }

  sessionStorage.setItem('last_processed_pump_bolus', bolusId);

  // Rzeczywisty czas, jaki upłynął od wykonania bolusa w pompie do przyjścia do aplikacji
  const elapsedMinutes = Math.floor(bolusAgeMs / 60000);
  const units = Number(latestBolus.value || 0).toFixed(1);

  // Wyliczamy optymalny czas odstępu
  const { waitMinutes, reason } = calculatePreBolusWaitTime(currentGlucose, currentTrend, userSettings?.insulinType);
  const remainingMinutes = waitMinutes - elapsedMinutes;

  if (remainingMinutes > 0) {
    Haptics.notification();
    startPreBolusTimer(waitMinutes, Number(latestBolus.value), latestBolus.timestamp);

    const delayNote = elapsedMinutes > 0 
      ? ` (${i18n.t('auto.podano_w_pompie', { count: elapsedMinutes, defaultValue: `podano ${elapsedMinutes} min temu w pompie` })})` 
      : '';

    toast.success(
      i18n.t('prebolus.pump_detected_waiting', { 
        units, 
        delayNote, 
        remaining: remainingMinutes,
        defaultValue: `⏱️ Wykryto bolus z pompy ${units} j.${delayNote}. Odczekaj jeszcze ${remainingMinutes} min do posiłku.`
      }),
      { duration: 8000 }
    );
  } else {
    // Bolus dotarł ze sporym opóźnieniem i czas oczekiwania już minął
    Haptics.light();
    toast(
      i18n.t('prebolus.pump_detected_ready', {
        units,
        elapsed: elapsedMinutes,
        defaultValue: `🍽️ Wykryto bolus z pompy ${units} j. (podano ${elapsedMinutes} min temu). Możesz już zjeść posiłek!`
      }),
      { icon: '🍽️', duration: 7000 }
    );
  }
}

/**
 * Wykrywa nowy posiłek (np. wprowadzony przez dziecko / zdalne urządzenie) i powiadamia opiekuna
 */
export function checkAndNotifyNewMeal(
  logs: LogEntry[],
  userSettings?: UserSettings
): void {
  if (!logs || logs.length === 0) return;

  // Sprawdzamy czy powiadomienia o posiłkach są włączone
  if (userSettings?.notificationPrefs && userSettings.notificationPrefs.mealDetected === false) {
    return;
  }

  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;

  const latestMeal = logs
    .filter(l => l.type === 'meal' && (Number(l.value || 0) > 0 || Number((l as any).carbs || 0) > 0))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

  if (!latestMeal || !latestMeal.timestamp) return;

  const mealAgeMs = now - latestMeal.timestamp;
  if (mealAgeMs < 0 || mealAgeMs > THIRTY_MINUTES) {
    return;
  }

  const mealId = `meal_${latestMeal.id || latestMeal.timestamp}_${latestMeal.value || (latestMeal as any).carbs}`;
  const lastProcessed = sessionStorage.getItem('last_processed_meal_alert');

  if (lastProcessed === mealId) {
    return;
  }

  sessionStorage.setItem('last_processed_meal_alert', mealId);

  const carbs = Math.round(Number(latestMeal.value || (latestMeal as any).carbs || 0) * 10) / 10;
  const mealName = latestMeal.description || latestMeal.notes || (latestMeal.items && latestMeal.items[0]?.name) || i18n.t('auto.posilek', { defaultValue: 'Posiłek' });
  const timeStr = new Date(latestMeal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  Haptics.notification();
  toast(
    i18n.t('prebolus.meal_registered_body', {
      carbs,
      mealName,
      timeStr,
      defaultValue: `🍲 Zarejestrowano posiłek: ${carbs}g W (${mealName}) o ${timeStr}`
    }),
    { icon: '🍲', duration: 7000 }
  );

  // Natywne powiadomienie w systemie (np. dla telefonu rodzica)
  notificationService.scheduleDeviceReminder(
    i18n.t('prebolus.meal_registered_title', { defaultValue: 'Zarejestrowano posiłek 🍲' }),
    i18n.t('prebolus.meal_registered_body', {
      carbs,
      mealName,
      timeStr,
      defaultValue: `${carbs}g węglowodanów (${mealName}) o godz. ${timeStr}.`
    }),
    Math.floor(Date.now() % 1000000)
  );
}
