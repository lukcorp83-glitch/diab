import { LogEntry, HourlyProfile } from '../types';

export interface AutoTunerResult {
  suggestionAvailable: boolean;
  proposedISF: number | null;
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
    return { suggestionAvailable: false, proposedISF: null, reasonType: null };
  }

  // Zabezpieczenie przed SPAMem - 48h
  if (typeof window !== 'undefined') {
    const lastTune = localStorage.getItem('lastIsfAutoTuneTime');
    if (lastTune && Date.now() - parseInt(lastTune) < 48 * 60 * 60 * 1000) {
      return { suggestionAvailable: false, proposedISF: null, reasonType: null };
    }
  }

  const now = Date.now();
  const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
  const recentLogs = logs.filter(l => (l.timestamp || 0) >= threeDaysAgo);

  const insulinLogs = recentLogs.filter(l => l.type === 'insulin' && l.value > 0);
  if (insulinLogs.length < 3) {
    return { suggestionAvailable: false, proposedISF: null, reasonType: null };
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

    if (blockBoluses.length < 3) continue;

    let totalExpectedDrop = 0;
    let totalActualDrop = 0;
    let validEvaluations = 0;
    
    // Używamy ISF z profilu użytkownika dla tego bloku, jeśli istnieje, w przeciwnym razie głównego ISF
    let blockIsf = currentIsf;
    if (block.profileIndex !== undefined && hourlyProfiles) {
      blockIsf = hourlyProfiles[block.profileIndex].isf;
    }

    blockBoluses.forEach(bolus => {
      const bolusTime = bolus.timestamp;
      const glucoseAtBolus = recentLogs.find(l => l.type === 'glucose' && Math.abs(l.timestamp - bolusTime) < 15 * 60 * 1000);
      const threeHoursLater = bolusTime + (3 * 60 * 60 * 1000);
      const glucoseAfter = recentLogs.find(l => l.type === 'glucose' && Math.abs(l.timestamp - threeHoursLater) < 30 * 60 * 1000);
      const mealsDuringWindow = recentLogs.some(l => l.type === 'meal' && l.timestamp >= bolusTime && l.timestamp <= threeHoursLater);

      if (glucoseAtBolus && glucoseAfter && !mealsDuringWindow) {
        const expectedDrop = bolus.value * blockIsf;
        const actualDrop = glucoseAtBolus.value - glucoseAfter.value;
        totalExpectedDrop += expectedDrop;
        totalActualDrop += actualDrop;
        validEvaluations++;
      }
    });

    if (validEvaluations >= 3) {
      const averageEfficiency = totalActualDrop / totalExpectedDrop;

      if (averageEfficiency < 0.75 && averageEfficiency > 0.1) {
        const calculatedNewIsf = Math.round(blockIsf * averageEfficiency);
        const proposedISF = Math.max(calculatedNewIsf, Math.round(blockIsf * 0.75));
        if (proposedISF < blockIsf) {
          return { suggestionAvailable: true, proposedISF, reasonType: 'decreased_sensitivity', timeBlock: block };
        }
      }

      if (averageEfficiency > 1.3 && averageEfficiency < 3.0) {
        const calculatedNewIsf = Math.round(blockIsf * averageEfficiency);
        const proposedISF = Math.min(calculatedNewIsf, Math.round(blockIsf * 1.3));
        if (proposedISF > blockIsf) {
          return { suggestionAvailable: true, proposedISF, reasonType: 'increased_sensitivity', timeBlock: block };
        }
      }
    }
  }

  return { suggestionAvailable: false, proposedISF: null, reasonType: null };
};
