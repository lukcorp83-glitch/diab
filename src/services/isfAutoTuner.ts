import { LogEntry } from '../types';

export interface AutoTunerResult {
  suggestionAvailable: boolean;
  proposedISF: number | null;
  reasonType: 'decreased_sensitivity' | 'increased_sensitivity' | null;
}

export const detectIsfChanges = (logs: LogEntry[], currentIsf: number): AutoTunerResult => {
  if (!logs || logs.length === 0 || !currentIsf) {
    return { suggestionAvailable: false, proposedISF: null, reasonType: null };
  }

  const now = Date.now();
  const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
  const recentLogs = logs.filter(l => l.timestamp >= threeDaysAgo);

  // We look for boluses (insulin) that are correction boluses
  const insulinLogs = recentLogs.filter(l => l.type === 'insulin' && l.value > 0);
  
  if (insulinLogs.length < 3) {
    // Not enough data to suggest a change safely
    return { suggestionAvailable: false, proposedISF: null, reasonType: null };
  }

  let totalExpectedDrop = 0;
  let totalActualDrop = 0;
  let validEvaluations = 0;

  insulinLogs.forEach(bolus => {
    const bolusTime = bolus.timestamp;
    // Find glucose at the time of bolus
    const glucoseAtBolus = recentLogs.find(l => l.type === 'glucose' && Math.abs(l.timestamp - bolusTime) < 15 * 60 * 1000);
    // Find glucose 3 hours later (duration of rapid-acting insulin action peak/end)
    const threeHoursLater = bolusTime + (3 * 60 * 60 * 1000);
    const glucoseAfter = recentLogs.find(l => l.type === 'glucose' && Math.abs(l.timestamp - threeHoursLater) < 30 * 60 * 1000);

    // Also check if there were any meals during these 3 hours which would ruin the correction analysis
    const mealsDuringWindow = recentLogs.some(l => l.type === 'meal' && l.timestamp >= bolusTime && l.timestamp <= threeHoursLater);

    if (glucoseAtBolus && glucoseAfter && !mealsDuringWindow) {
      const expectedDrop = bolus.value * currentIsf;
      const actualDrop = glucoseAtBolus.value - glucoseAfter.value;

      totalExpectedDrop += expectedDrop;
      totalActualDrop += actualDrop;
      validEvaluations++;
    }
  });

  if (validEvaluations < 3) {
    return { suggestionAvailable: false, proposedISF: null, reasonType: null };
  }

  // Calculate efficiency
  const averageEfficiency = totalActualDrop / totalExpectedDrop;
  
  // If actual drop is significantly less than expected drop (e.g. < 75%), sensitivity decreased (ISF needs to be lower)
  if (averageEfficiency < 0.75 && averageEfficiency > 0.1) {
    // Propose a lower ISF (meaning 1 unit lowers less sugar). Round to nearest whole number.
    // e.g. if efficiency is 0.7, new ISF should be currentIsf * 0.7. But let's be conservative.
    const calculatedNewIsf = Math.round(currentIsf * averageEfficiency);
    // Safety boundaries (don't suggest drastic >30% drops in one go)
    const proposedISF = Math.max(calculatedNewIsf, Math.round(currentIsf * 0.75));
    if (proposedISF < currentIsf) {
      return { suggestionAvailable: true, proposedISF, reasonType: 'decreased_sensitivity' };
    }
  }

  // If actual drop is significantly more than expected drop (e.g. > 130%), sensitivity increased (ISF needs to be higher)
  if (averageEfficiency > 1.3 && averageEfficiency < 3.0) {
    const calculatedNewIsf = Math.round(currentIsf * averageEfficiency);
    // Safety boundary
    const proposedISF = Math.min(calculatedNewIsf, Math.round(currentIsf * 1.3));
    if (proposedISF > currentIsf) {
      return { suggestionAvailable: true, proposedISF, reasonType: 'increased_sensitivity' };
    }
  }

  return { suggestionAvailable: false, proposedISF: null, reasonType: null };
};
