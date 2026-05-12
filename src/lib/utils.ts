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
      const decay = Math.max(0, 1 - (timeSince / diaMs));
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
