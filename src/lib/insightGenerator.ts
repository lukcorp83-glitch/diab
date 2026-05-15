import { LogEntry } from '../types';
import { calculateIOB, calculateCOB } from './utils';

export function getGlikoSenseInsights(logs: LogEntry[]): string[] {
  const iob = calculateIOB(logs);
  const cob = calculateCOB(logs);
  const recentGlucose = logs.filter(l => l.type === 'glucose').slice(0, 10);
  
  const insights: string[] = [];

  if (iob > 0.5) {
    insights.push(`Aktywna insulina: ok. ${iob.toFixed(1)} j.`);
  }

  if (cob > 5) {
    insights.push(`Aktywne węglowodany: ok. ${Math.round(cob)}g.`);
  }

  if (recentGlucose.length >= 3) {
    const vals = recentGlucose.slice(0, 3).map(l => l.value);
    if (vals[2] > vals[1] && vals[1] > vals[0]) { // Historical logs are newest first in some parts, but here we expect newest first?
      // Wait, let's check App.tsx logs sorting.
    }
  }

  // Monday-Sunday pattern detection
  const weekdayPatterns: Record<number, number[]> = {};
  logs.filter(l => l.type === 'glucose' && l.value < 80).forEach(l => {
    const d = new Date(l.timestamp || l.createdAt);
    const day = d.getDay();
    if (!weekdayPatterns[day]) weekdayPatterns[day] = [];
    weekdayPatterns[day].push(d.getHours());
  });

  Object.entries(weekdayPatterns).forEach(([day, hours]) => {
    if (hours.length >= 3) {
      const dayName = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'][Number(day)];
      insights.push(`Wykryto powtarzające się niskie cukry w dni: ${dayName}.`);
    }
  });

  const nightLows = logs.filter(l => {
    const d = new Date(l.timestamp || l.createdAt);
    return l.type === 'glucose' && l.value < 70 && (d.getHours() < 6 || d.getHours() > 23);
  });

  if (nightLows.length >= 2) {
    insights.push(`Wykryto powtarzające się nocne hipoglikemie.`);
  }

  return insights;
}
