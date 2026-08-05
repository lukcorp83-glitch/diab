export interface PredictionAuditRecord {
  id: string;
  predictedAt: number;     // timestamp when prediction was made
  targetTime: number;      // timestamp for target forecast time (e.g. +1h)
  predictedBg: number;     // predicted bg value
  actualBg?: number;       // actual matched CGM value
  errorMgDl?: number;      // absolute error in mg/dL
  isHit?: boolean;         // true if error <= 15 mg/dL or <= 15%
}

export interface AccuracyStats {
  totalEvaluated: number;
  avgErrorMgDl: number;
  realAccuracyPercentage: number;
  exactHitRatePercentage: number;
  recentRecords: PredictionAuditRecord[];
}

const STORAGE_KEY = 'glikosense_prediction_history_v1';

export const PredictionAccuracyTracker = {
  getHistory(): PredictionAuditRecord[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  recordPrediction(predictedBg: number, targetTimeMs: number) {
    if (!predictedBg || predictedBg <= 0) return;
    const history = this.getHistory();
    const now = Date.now();

    // Avoid recording predictions made too close to each other (min 20 min gap)
    const lastRecord = history[history.length - 1];
    if (lastRecord && Math.abs(now - lastRecord.predictedAt) < 20 * 60000) {
      return;
    }

    const newRecord: PredictionAuditRecord = {
      id: `pred_${now}_${Math.random().toString(36).substring(2, 6)}`,
      predictedAt: now,
      targetTime: targetTimeMs,
      predictedBg: Math.round(predictedBg),
    };

    history.push(newRecord);
    // Keep maximum 50 recent prediction audit records
    if (history.length > 50) history.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  },

  evaluateHistoryWithLogs(logs: any[]): AccuracyStats {
    let history = this.getHistory();
    const glucoseLogs = logs
      .filter(l => (l.type === 'glucose' || l.bg) && (l.value || l.bg))
      .map(l => ({ timestamp: l.timestamp || new Date(l.createdAt).getTime(), value: l.value || l.bg }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (glucoseLogs.length === 0 || history.length === 0) {
      return { totalEvaluated: 0, avgErrorMgDl: 0, realAccuracyPercentage: 0, exactHitRatePercentage: 0, recentRecords: [] };
    }

    let updated = false;
    history.forEach(record => {
      if (record.actualBg === undefined && record.targetTime <= Date.now()) {
        // Find closest real glucose reading within +/- 15 minutes of targetTime
        const matched = glucoseLogs.find(g => Math.abs(g.timestamp - record.targetTime) <= 15 * 60000);
        if (matched) {
          record.actualBg = Math.round(matched.value);
          record.errorMgDl = Math.abs(record.predictedBg - record.actualBg);
          const percentDiff = (record.errorMgDl / record.actualBg) * 100;
          record.isHit = record.errorMgDl <= 15 || percentDiff <= 15;
          updated = true;
        }
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }

    const evaluated = history.filter(r => r.actualBg !== undefined && r.errorMgDl !== undefined);
    if (evaluated.length === 0) {
      return { totalEvaluated: 0, avgErrorMgDl: 0, realAccuracyPercentage: 0, exactHitRatePercentage: 0, recentRecords: [] };
    }

    const totalError = evaluated.reduce((sum, r) => sum + (r.errorMgDl || 0), 0);
    const avgError = totalError / evaluated.length;
    const hitsCount = evaluated.filter(r => r.isHit).length;
    const exactHitRate = (hitsCount / evaluated.length) * 100;
    
    // Overall accuracy percentage: 100% minus relative error %
    const totalRelativeError = evaluated.reduce((sum, r) => sum + ((r.errorMgDl || 0) / (r.actualBg || 1)), 0);
    const avgRelativeError = totalRelativeError / evaluated.length;
    const realAccuracy = Math.max(0, Math.min(100, Math.round((1 - avgRelativeError) * 100)));

    return {
      totalEvaluated: evaluated.length,
      avgErrorMgDl: Math.round(avgError),
      realAccuracyPercentage: realAccuracy,
      exactHitRatePercentage: Math.round(exactHitRate),
      recentRecords: evaluated.slice(-5)
    };
  }
};
