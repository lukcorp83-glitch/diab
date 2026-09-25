import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LogEntry } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to normalize timestamps from various sources (number, string, Date, or Firestore Timestamp)
export function getTs(t: any): number {
  if (!t) return 0;
  if (typeof t === 'number') return t;
  if (t instanceof Date) return t.getTime();
  if (typeof t === 'string') {
    const num = Number(t);
    if (!isNaN(num) && num > 0) return num;
    const parsed = Date.parse(t);
    if (!isNaN(parsed)) return parsed;
  }
  if (t && typeof t === 'object') {
    if (typeof t.seconds === 'number') return t.seconds * 1000;
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (typeof t.getTime === 'function') return t.getTime();
  }
  return 0;
}

/** 
 * Zgodnie z wytycznymi Warszawskiej Szkoły Pompowej i Polskiego Towarzystwa Diabetologicznego:
 * - Węglowodany wchłaniają się w zależności od porcji (do ~3-4h)
 * - WBT (Wymienniki Białkowo-Tłuszczowe) wchłaniają się znacznie dłużej (pizza, fast food nawet 8+ godzin)
 * 1 WBT = 100 kcal z białka i tłuszczu
 * Do 1 WBT = ~3h
 * 1-2 WBT = ~4h
 * 2-3 WBT = ~5h
 * >3 WBT = ~8h
 */
export function getMealAbsorptionTime(ww: number, wbt: number): number {
  let carbTime = 0.5;
  if (ww > 0 && ww <= 2) carbTime = 1.5;
  else if (ww > 2 && ww <= 4) carbTime = 2.5;
  else if (ww > 4 && ww <= 6) carbTime = 3.5;
  else if (ww > 6) carbTime = 4.0;

  let wbtTime = 0;
  if (wbt >= 0.5 && wbt < 1.5) wbtTime = 3;
  else if (wbt >= 1.5 && wbt < 2.5) wbtTime = 4;
  else if (wbt >= 2.5 && wbt < 3.5) wbtTime = 5;
  else if (wbt >= 3.5) wbtTime = 8; // np. Pizza

  return Math.max(carbTime, wbtTime);
}

/**
 * Zwraca ułamek intensywności wchłaniania węglowodanów w godzinie `t` od posiłku.
 * Gwarantuje płynny rozkład ze szczytem zależnym od IG i łagodnym wygasaniem dokładnie do durationH.
 */
export function getCarbAbsorptionRate(t: number, durationH: number, gi = 50): number {
  if (t <= 0 || t >= durationH || durationH <= 0) return 0;
  // Szczyt glikemii: wysokie IG ~30-45min (0.5-0.75h), niskie IG ~60-90min (1-1.5h)
  const peakFraction = gi > 70 ? 0.25 : gi < 50 ? 0.45 : 0.35;
  const peakT = Math.max(0.3, Math.min(durationH * peakFraction, 1.5));
  if (t <= peakT) {
    return Math.pow(t / peakT, 1.5);
  } else {
    const remaining = (durationH - t) / (durationH - peakT);
    return Math.max(0, Math.pow(remaining, 1.5));
  }
}

/**
 * Zwraca ułamek intensywności wchłaniania WBT w godzinie `t` od posiłku.
 * WBT zaczynają uwalniać glukozę po 1-1.5h i trwają do durationH (4-8h).
 */
export function getWbtAbsorptionRate(t: number, durationH: number): number {
  if (t <= 0.5 || t >= durationH || durationH <= 0.5) return 0;
  const startT = 0.5;
  const peakT = Math.max(1.5, Math.min(3.0, durationH * 0.45));
  if (t <= peakT) {
    return (t - startT) / (peakT - startT);
  } else {
    const remaining = (durationH - t) / (durationH - peakT);
    return Math.max(0, Math.pow(remaining, 1.2));
  }
}

export interface ActiveAbsorptionMealInfo {
  log: LogEntry;
  mSrc: any;
  name: string;
  ww: number;
  wbt: number;
  startTime: number;
  durationH: number;
  endTime: number;
}

export interface CumulativeAbsorptionState {
  activeMeals: ActiveAbsorptionMealInfo[];
  totalActiveWW: number;
  totalActiveWBT: number;
  earliestStartTime: number;
  latestEndTime: number;
  overallProgress: number; // 0..1
  isAbsorbing: boolean;
}

/**
 * Analizuje wszystkie wciąż wchłaniające się posiłki (Multi-Meal Engine).
 */
export function getCumulativeAbsorption(logs: LogEntry[], currentTime = Date.now()): CumulativeAbsorptionState {
  if (!logs || logs.length === 0) {
    return {
      activeMeals: [],
      totalActiveWW: 0,
      totalActiveWBT: 0,
      earliestStartTime: currentTime,
      latestEndTime: currentTime,
      overallProgress: 0,
      isAbsorbing: false,
    };
  }

  // Okno posiłków z ostatnich 10 godzin
  const windowMs = 10 * 60 * 60 * 1000;
  const candidates = logs.filter((l) => {
    const ts = getTs(l.eatenAt || l.timestamp);
    if (!ts || currentTime - ts > windowMs || currentTime < ts - 60000) return false;
    return l.type === 'meal' || l.type === 'carbs' || !!l.linkedMeal;
  });

  const activeMeals: ActiveAbsorptionMealInfo[] = [];

  for (const m of candidates) {
    const mSrc = m.linkedMeal ? m.linkedMeal : m;
    const mWW =
      (mSrc as any).value !== undefined
        ? Number((mSrc as any).value) / 10
        : (mSrc as any).carbs !== undefined
        ? Number((mSrc as any).carbs) / 10
        : 0;
    const mWBT = ((Number(mSrc.protein) || 0) * 4 + (Number(mSrc.fat) || 0) * 9) / 100;
    const durationH = getMealAbsorptionTime(mWW, mWBT);
    if (durationH <= 0 || (mWW <= 0 && mWBT <= 0)) continue;

    const startTime = getTs(m.eatenAt || m.timestamp);
    const endTime = startTime + durationH * 60 * 60 * 1000;

    // Czy wciąż się wchłania w danej minucie?
    if (currentTime >= startTime && currentTime < endTime) {
      const name =
        m.type === 'bolus' && m.linkedMeal
          ? m.linkedMeal.name || 'Posiłek z pompy'
          : (m as any).name || m.notes || 'Posiłek';
      activeMeals.push({
        log: m,
        mSrc,
        name,
        ww: mWW,
        wbt: mWBT,
        startTime,
        durationH,
        endTime,
      });
    }
  }

  if (activeMeals.length === 0) {
    return {
      activeMeals: [],
      totalActiveWW: 0,
      totalActiveWBT: 0,
      earliestStartTime: currentTime,
      latestEndTime: currentTime,
      overallProgress: 0,
      isAbsorbing: false,
    };
  }

  const totalActiveWW = activeMeals.reduce((acc, m) => acc + m.ww, 0);
  const totalActiveWBT = activeMeals.reduce((acc, m) => acc + m.wbt, 0);
  const earliestStartTime = Math.min(...activeMeals.map((m) => m.startTime));
  const latestEndTime = Math.max(...activeMeals.map((m) => m.endTime));

  // Ważony postęp trawienia w oparciu o łączną energię (WW + WBT)
  let totalEnergy = 0;
  let digestedEnergy = 0;

  for (const m of activeMeals) {
    const energy = m.ww * 10 + m.wbt * 10; // w jednostkach równoważnika węglowodanów
    if (energy <= 0) continue;
    const ageH = (currentTime - m.startTime) / (1000 * 60 * 60);
    const frac = Math.max(0, Math.min(1, ageH / m.durationH));
    totalEnergy += energy;
    digestedEnergy += energy * frac;
  }

  const overallProgress = totalEnergy > 0 ? Math.max(0, Math.min(1, digestedEnergy / totalEnergy)) : 0;

  return {
    activeMeals,
    totalActiveWW,
    totalActiveWBT,
    earliestStartTime,
    latestEndTime,
    overallProgress,
    isAbsorbing: true,
  };
}

export function calculateIOB(logs: LogEntry[], diaHours: number = 4) {
  const now = Date.now();
  const diaMs = diaHours * 60 * 60 * 1000;
  
  // Track processed timestamps to avoid double counting
  const processedTimestamps = new Set<string>();

  return logs
    .filter(l => l.type === 'bolus' && (now - getTs(l.timestamp)) < diaMs)
    .sort((a, b) => getTs(b.timestamp) - getTs(a.timestamp))
    .reduce((sum, b) => {
      const ts = getTs(b.timestamp);
      const tsKey = `${Math.floor(ts / 120000)}`; // 2-minute precision
      if (processedTimestamps.has(tsKey)) return sum;
      processedTimestamps.add(tsKey);

      const timeSince = now - ts;
      const x = timeSince / diaMs;
      
      const decay = Math.max(0, 1 - (3 * Math.pow(x, 2) - 2 * Math.pow(x, 3)));
      
      return sum + (b.value * decay);
    }, 0);
}

/**
 * Reconciles calculated IOB with Pump Reported IOB from Nightscout.
 * Prefers Pump IOB if it's fresh (less than 15 mins old).
 */
export function getEffectiveIOB(logs: LogEntry[], pumpStatus: any, diaHours: number = 4): number {
  const localIOB = calculateIOB(logs, diaHours);
  
  if (!pumpStatus || pumpStatus.activeInsulin === undefined || pumpStatus.activeInsulin === null) return localIOB;
  
  // Check age of pump data (lastUpdate is in seconds)
  const lastUpdateMs = pumpStatus.lastUpdate?.seconds ? pumpStatus.lastUpdate.seconds * 1000 : 0;
  const ageMs = Date.now() - lastUpdateMs;
  
  // If pump data is fresh (less than 20 mins), we consider it.
  if (ageMs < 20 * 60 * 1000) {
    const pumpIOB = Number(pumpStatus.activeInsulin);
    // If pump says 0 but we have recent boluses, trust local
    if (pumpIOB === 0 && localIOB > 0.1) return localIOB;
    
    // Check if there is any brand new bolus in the logs from the last 15 minutes,
    // which might not have been synchronized back to the pump status yet.
    const now = Date.now();
    const hasRecentNewBolus = logs.some(l => l.type === 'bolus' && (now - getTs(l.timestamp)) < 15 * 60 * 1000);
    
    if (hasRecentNewBolus) {
      // If we have a very brand new bolus, trust the maximum to be safe against hypo
      return Math.max(localIOB, pumpIOB);
    } else {
      // If there are no raw boluses in the last 15 minutes, the pump's native activeInsulin is 100% correct,
      // as it uses the pump's accurate DIA curve. Avoid over-summing older boluses with a static local curve.
      return pumpIOB;
    }
  }
  
  return localIOB;
}

export function calculateCOB(logs: LogEntry[], absorptionMinutes: number = 180) {
  const now = Date.now();
  const absMs = absorptionMinutes * 60 * 1000;
  
  // Track processed timestamps to avoid double counting if meal and bolus are separate but for same time
  const processedTimestamps = new Set<string>();

  return logs
    .filter(l => {
      const ts = getTs(l.timestamp);
      return (l.type === 'meal' || l.linkedMeal) && now - ts < absMs;
    })
    .sort((a, b) => getTs(b.timestamp) - getTs(a.timestamp)) // processing newest first
    .reduce((sum, l) => {
      const ts = getTs(l.timestamp);
      const tsKey = `${Math.floor(ts / 60000)}`; // Minute precision
      
      const carbValue = l.type === 'meal' ? (l.value || 0) : (l.linkedMeal?.carbs || 0);
      if (carbValue <= 0) return sum;

      // Avoid double counting if we already processed a meal/bolus at this same minute
      // (This handles legacy Nightscout data where carbs and insulin were separate entries)
      if (processedTimestamps.has(tsKey)) return sum;
      processedTimestamps.add(tsKey);

      const timeSince = now - ts;
      const decay = Math.max(0, 1 - (timeSince / absMs));
      return sum + (carbValue * decay);
    }, 0);
}

export function getEffectiveUid(user: any): string {
  if (!user || !user.uid) return '';
  return localStorage.getItem('diacontrol_linked_uid') || user.uid;
}

/**
 * Zwraca true jeśli aplikacja działa wewnątrz wtyczki (APK Webview) lub z ekranu początkowego (PWA standalone).
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const isWebView = ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
  const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return isWebView || isStandalone || !!(window as any).Capacitor || !!(window as any).cordova;
}

/**
 * Zwraca poprawną formę w języku polskim w zależności od liczby.
 * Przykłady:
 * pluralize(1, 'składnik', 'składniki', 'składników') // 'składnik'
 * pluralize(2, 'składnik', 'składniki', 'składników') // 'składniki'
 * pluralize(5, 'składnik', 'składniki', 'składników') // 'składników'
 */
export function pluralize(count: number, singular: string, plural1: string, plural2: string): string {
  if (count === 1) return singular;
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 10 || lastTwo >= 20)) {
    return plural1;
  }
  return plural2;
}
export const getTimestampMs = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') return new Date(ts).getTime();
  if (typeof ts === 'object' && ts.toMillis) return ts.toMillis();
  if (typeof ts === 'object' && ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime();
};

/**
 * Niezawodnie wyciąga nazwę miejsca wkłucia z logu (np. z pola site lub notes)
 */
export function extractInfusionSite(log?: any): string {
  if (!log) return "Lewy brzuch";
  if (log.site && typeof log.site === "string" && log.site.trim() && !log.site.toLowerCase().includes("zbiorniczk")) {
    return log.site.trim();
  }
  const rawNote = (log.notes || "").trim();
  if (rawNote) {
    if (rawNote.includes(" - ")) {
      const part = rawNote.split(" - ")[1]?.replace(/\(Smart Equipment\)/gi, "").trim();
      if (part && !part.toLowerCase().includes("zbiorniczk")) return part;
    }
    if (rawNote.includes(":")) {
      const part = rawNote.split(":")[1]?.replace(/\(Smart Equipment\)/gi, "").trim();
      if (part && !part.toLowerCase().includes("zbiorniczk")) return part;
    }
    const match = rawNote.match(/\(([^)]+)\)/);
    if (match && match[1] && !match[1].toLowerCase().includes("smart equipment") && !match[1].toLowerCase().includes("zbiorniczk")) {
      return match[1].trim();
    }
  }
  return "Lewy brzuch";
}

/**
 * Konwertuje techniczny kierunek trendu CGM (np. 'SingleUp', 'FortyFiveDown', 'Flat')
 * na czytelną strzałkę oraz zlokalizowany opis (PL / EN).
 */
export function getTrendInfo(trendRaw?: string | null, t?: (key: string, opts?: any) => string): { arrow: string; label: string } {
  if (!trendRaw) return { arrow: '→', label: '' };
  const tStr = String(trendRaw).toLowerCase().trim();

  // DoubleUp
  if (tStr.includes('doubleup') || tStr === '⇈' || tStr === '↑↑') {
    return {
      arrow: '⇈',
      label: t ? t('trend.double_up', { defaultValue: 'szybko rośnie' }) : 'szybko rośnie'
    };
  }

  // SingleUp
  if (tStr.includes('singleup') || tStr === 'up' || tStr === '↑') {
    return {
      arrow: '↑',
      label: t ? t('trend.single_up', { defaultValue: 'rośnie' }) : 'rośnie'
    };
  }

  // FortyFiveUp
  if (tStr.includes('fortyfiveup') || tStr.includes('45up') || tStr === '↗') {
    return {
      arrow: '↗',
      label: t ? t('trend.forty_five_up', { defaultValue: 'rośnie powoli' }) : 'rośnie powoli'
    };
  }

  // DoubleDown
  if (tStr.includes('doubledown') || tStr === '⇊' || tStr === '↓↓') {
    return {
      arrow: '⇊',
      label: t ? t('trend.double_down', { defaultValue: 'szybko spada' }) : 'szybko spada'
    };
  }

  // SingleDown
  if (tStr.includes('singledown') || tStr === 'down' || tStr === '↓') {
    return {
      arrow: '↓',
      label: t ? t('trend.single_down', { defaultValue: 'spada' }) : 'spada'
    };
  }

  // FortyFiveDown
  if (tStr.includes('fortyfivedown') || tStr.includes('45down') || tStr === '↘') {
    return {
      arrow: '↘',
      label: t ? t('trend.forty_five_down', { defaultValue: 'spada powoli' }) : 'spada powoli'
    };
  }

  // Flat / Stable
  if (tStr.includes('flat') || tStr.includes('stable') || tStr === '→' || tStr === 'none') {
    return {
      arrow: '→',
      label: t ? t('trend.flat', { defaultValue: 'stabilnie' }) : 'stabilnie'
    };
  }

  return { arrow: '→', label: '' };
}
