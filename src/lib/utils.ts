import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LogEntry } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to normalize timestamps from various sources (number or Firestore Timestamp)
function getTs(t: any): number {
  if (typeof t === 'number') return t;
  if (t?.seconds) return t.seconds * 1000;
  if (t?.toMillis) return t.toMillis();
  return 0;
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
  // HOWEVER, if our local calculation is significantly higher, it might mean 
  // the pump hasn't reported the bolus yet, or we're in a dual-logging scenario.
  if (ageMs < 20 * 60 * 1000) {
    const pumpIOB = Number(pumpStatus.activeInsulin);
    // If pump says 0 but we have recent boluses, trust local
    if (pumpIOB === 0 && localIOB > 0.1) return localIOB;
    // Otherwise trust the higher value to be safe (avoid hypo if bolus is still working)
    return Math.max(localIOB, pumpIOB);
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
      return (l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal)) && now - ts < absMs;
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
