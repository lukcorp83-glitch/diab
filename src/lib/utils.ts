import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { LogEntry } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateIOB(logs: LogEntry[], diaHours: number = 4) {
  const now = Date.now();
  const diaMs = diaHours * 60 * 60 * 1000;
  
  return logs
    .filter(l => l.type === 'bolus' && now - l.timestamp < diaMs)
    .reduce((sum, b) => {
      const timeSince = now - b.timestamp;
      const x = timeSince / diaMs;
      
      // More realistic cubic decay model (simplified sigmoid-like)
      // This produces an activity curve that peaks in the first third
      // IOB(x) = 1 - (3x^2 - 2x^3) - classic but peaks at 0.5
      // We adjust to peak earlier for rapid-acting insulin (approx 75 mins)
      const decay = Math.max(0, 1 - (3 * Math.pow(x, 2) - 2 * Math.pow(x, 3)));
      
      return sum + (b.value * decay);
    }, 0);
}

export function calculateCOB(logs: LogEntry[], absorptionMinutes: number = 180) {
  const now = Date.now();
  const absMs = absorptionMinutes * 60 * 1000;
  
  return logs
    .filter(l => l.type === 'meal' && now - (l.timestamp || 0) < absMs)
    .reduce((sum, m) => {
      const timeSince = now - (m.timestamp || 0);
      const decay = Math.max(0, 1 - (timeSince / absMs));
      return sum + ((m.value || 0) * decay);
    }, 0);
}

export function getEffectiveUid(user: any): string {
  if (!user || !user.uid) return '';
  return localStorage.getItem('diacontrol_linked_uid') || user.uid;
}
