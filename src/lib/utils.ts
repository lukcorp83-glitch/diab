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

export function getEffectiveUid(user: any): string {
  if (!user || !user.uid) return '';
  return localStorage.getItem('diacontrol_linked_uid') || user.uid;
}
