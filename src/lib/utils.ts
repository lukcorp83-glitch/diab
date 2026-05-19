import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LogEntry } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateIOB(logs: LogEntry[], diaHours: number = 4) {
  const now = Date.now();
  const diaMs = diaHours * 60 * 60 * 1000;
  
  // Track processed timestamps to avoid double counting
  const processedTimestamps = new Set<string>();

  return logs
    .filter(l => l.type === 'bolus' && now - l.timestamp < diaMs)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .reduce((sum, b) => {
      const tsKey = `${Math.floor(b.timestamp / 120000)}`; // 2-minute precision
      if (processedTimestamps.has(tsKey)) return sum;
      processedTimestamps.add(tsKey);

      const timeSince = now - b.timestamp;
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
  
  if (!pumpStatus || pumpStatus.activeInsulin === undefined) return localIOB;
  
  // Check age of pump data (lastUpdate is in seconds)
  const lastUpdateMs = pumpStatus.lastUpdate?.seconds ? pumpStatus.lastUpdate.seconds * 1000 : 0;
  const ageMs = Date.now() - lastUpdateMs;
  
  // If pump data is fresh (less than 20 mins), prefer it
  if (ageMs < 20 * 60 * 1000) {
    return Number(pumpStatus.activeInsulin);
  }
  
  return localIOB;
}

export function calculateCOB(logs: LogEntry[], absorptionMinutes: number = 180) {
  const now = Date.now();
  const absMs = absorptionMinutes * 60 * 1000;
  
  // Track processed timestamps to avoid double counting if meal and bolus are separate but for same time
  const processedTimestamps = new Set<string>();

  return logs
    .filter(l => (l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal)) && now - (l.timestamp || 0) < absMs)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) // processing newest first
    .reduce((sum, l) => {
      const ts = l.timestamp || 0;
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
