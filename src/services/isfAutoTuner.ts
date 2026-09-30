import { LogEntry, HourlyProfile } from '../types';

/**
 * Obserwator efektywności bolusów korekcyjnych (MDR & Responsible AI Compliance).
 * Algorytm NIE wylicza ani NIE narzuca nowej wartości parametru medycznego (ISF/bazy).
 * Prezentuje wyłącznie retrospektywną statystykę dla pacjenta do dyskusji z lekarzem.
 */
export interface AutoTunerResult {
  observationAvailable: boolean;
  efficiencyPercent: number;
  reasonType: 'decreased_sensitivity' | 'increased_sensitivity' | null;
  timeBlock?: {
    start: string;
    end: string;
    profileIndex?: number;
  };
}

const parseTime = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export const detectIsfChanges = (logs: LogEntry[], currentIsf: number, hourlyProfiles?: HourlyProfile[]): AutoTunerResult => {
  if (!logs || logs.length === 0 || !currentIsf) {
    return { observationAvailable: false, efficiencyPercent: 100, reasonType: null };
  }

  // Zabezpieczenie przed SPAMem - 48h
  if (typeof window !== 'undefined') {
    const lastTune = localStorage.getItem('lastIsfAutoTuneTime');
    if (lastTune && Date.now() - parseInt(lastTune) < 48 * 60 * 60 * 1000) {
      return { observationAvailable: false, efficiencyPercent: 100, reasonType: null };
    }
  }

  const now = Date.now();
  const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
  const recentLogs = logs.filter(l => (Number(l.timestamp) || 0) >= threeDaysAgo);

  const getInsulinVal = (l: any): number => Number(l.value || l.insulin || l.amount || (l.type === 'bolus' ? l.value : 0) || 0);
  const getGlucoseVal = (l: any): number => Number(l.value || l.sgv || 0);
  const hasCarbs = (l: any): boolean => Boolean(l.carbs > 0 || l.linkedMeal?.carbs > 0 || l.type === 'meal');

  const insulinLogs = recentLogs.filter(l => 
    ((l.type as any) === 'insulin' || l.type === 'bolus') && 
    getInsulinVal(l) > 0 &&
    !hasCarbs(l) // Tylko czyste bolusy korekcyjne bez posiłku
  );

  if (insulinLogs.length < 2) {
    return { observationAvailable: false, efficiencyPercent: 100, reasonType: null };
  }

  let blocks: { start: string, end: string, profileIndex?: number }[] = [];
  
  if (hourlyProfiles && hourlyProfiles.length > 0) {
    const sorted = [...hourlyProfiles].sort((a, b) => parseTime(a.time) - parseTime(b.time));
    for (let i = 0; i < sorted.length; i++) {
      const nextTime = i < sorted.length - 1 ? sorted[i+1].time : '24:00';
      const originalIndex = hourlyProfiles.findIndex(p => p.time === sorted[i].time);
      blocks.push({ start: sorted[i].time, end: nextTime, profileIndex: originalIndex });
    }
  } else {
    blocks = [
      { start: '06:00', end: '12:00' },
      { start: '12:00', end: '18:00' },
      { start: '18:00', end: '24:00' },
      { start: '00:00', end: '06:00' }
    ];
  }

  for (const block of blocks) {
    const startMins = parseTime(block.start);
    const endMins = parseTime(block.end);

    const blockBoluses = insulinLogs.filter(bolus => {
      const d = new Date(bolus.timestamp);
      const m = d.getHours() * 60 + d.getMinutes();
      if (endMins === 24 * 60) return m >= startMins;
      if (startMins > endMins) return m >= startMins || m < endMins;
      return m >= startMins && m < endMins;
    });

    if (blockBoluses.length < 2) continue;

    let totalExpectedDrop = 0;
    let totalActualDrop = 0;
    let validEvaluations = 0;
    
    let blockIsf = currentIsf;
    if (block.profileIndex !== undefined && hourlyProfiles && hourlyProfiles[block.profileIndex]?.isf) {
      blockIsf = hourlyProfiles[block.profileIndex].isf;
    }

    blockBoluses.forEach(bolus => {
      const bolusTime = Number(bolus.timestamp);
      const bolusVal = getInsulinVal(bolus);
      if (bolusVal <= 0) return;

      const glucoseAtBolus = recentLogs.find(l => 
        (l.type === 'glucose' || (l.type as any) === 'cgm' || (l.type as any) === 'sgv') && 
        Math.abs(Number(l.timestamp) - bolusTime) < 20 * 60 * 1000
      );
      const threeHoursLater = bolusTime + (3 * 60 * 60 * 1000);
      const glucoseAfter = recentLogs.find(l => 
        (l.type === 'glucose' || (l.type as any) === 'cgm' || (l.type as any) === 'sgv') && 
        Math.abs(Number(l.timestamp) - threeHoursLater) < 35 * 60 * 1000
      );
      const mealsDuringWindow = recentLogs.some(l => 
        hasCarbs(l) && 
        Number(l.timestamp) >= bolusTime && 
        Number(l.timestamp) <= threeHoursLater
      );

      if (glucoseAtBolus && glucoseAfter && !mealsDuringWindow) {
        const startG = getGlucoseVal(glucoseAtBolus);
        const endG = getGlucoseVal(glucoseAfter);
        if (startG > 0 && endG > 0) {
          const expectedDrop = bolusVal * blockIsf;
          const actualDrop = startG - endG;
          totalExpectedDrop += expectedDrop;
          totalActualDrop += actualDrop;
          validEvaluations++;
        }
      }
    });

    if (validEvaluations >= 2 && totalExpectedDrop > 0) {
      const averageEfficiency = totalActualDrop / totalExpectedDrop;

      if (averageEfficiency < 0.78 && averageEfficiency > 0.1) {
        return { 
          observationAvailable: true, 
          efficiencyPercent: Math.round(averageEfficiency * 100), 
          reasonType: 'decreased_sensitivity', 
          timeBlock: block 
        };
      }

      if (averageEfficiency > 1.28 && averageEfficiency < 3.0) {
        return { 
          observationAvailable: true, 
          efficiencyPercent: Math.round(averageEfficiency * 100), 
          reasonType: 'increased_sensitivity', 
          timeBlock: block 
        };
      }
    }
  }

  return { observationAvailable: false, efficiencyPercent: 100, reasonType: null };
};
