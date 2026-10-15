export interface DailySummary {
  dateStr: string; // YYYY-MM-DD
  carbs: number;
  insulin: number;
  hypos: number;
  hypers: number;
  siteChange: boolean;
  sensorChange: boolean;
  glucoseCount: number;
  avgGlucose?: number;
  tir?: number;
  updatedAt: number;
}

const LOCAL_STORAGE_KEY = 'glikocontrol_daily_summaries';

class DailyStatsService {
  private memoryCache: Map<string, DailySummary> = new Map();
  private isLoadedFromStorage = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.keys(parsed).forEach(key => {
            this.memoryCache.set(key, parsed[key]);
          });
        }
      }
      this.isLoadedFromStorage = true;
    } catch (e) {
      console.warn('[DailyStatsService] Failed to load local summaries:', e);
    }
  }

  private persistToLocalStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, DailySummary> = {};
      this.memoryCache.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('[DailyStatsService] Failed to persist summaries locally:', e);
    }
  }

  /**
   * Zwraca lokalnie zapisane podsumowania dni (błyskawiczne z pamięci/localStorage telefonu)
   * 100% offline, zero zapytań do chmury.
   */
  getLocalSummaries(): Record<string, DailySummary> {
    if (!this.isLoadedFromStorage) {
      this.loadFromLocalStorage();
    }
    const result: Record<string, DailySummary> = {};
    this.memoryCache.forEach((val, key) => {
      result[key] = val;
    });
    return result;
  }

  /**
   * Zapisuje zagregowane statystyki dzienne w trwałej pamięci telefonu (localStorage)
   */
  saveSummaries(summaries: DailySummary[]): void {
    if (!summaries || summaries.length === 0) return;

    let hasChange = false;
    summaries.forEach(s => {
      if (!s || !s.dateStr) return;
      const prev = this.memoryCache.get(s.dateStr);
      if (!prev || prev.carbs !== s.carbs || prev.insulin !== s.insulin || prev.avgGlucose !== s.avgGlucose || prev.tir !== s.tir || prev.glucoseCount !== s.glucoseCount) {
        this.memoryCache.set(s.dateStr, s);
        hasChange = true;
      }
    });

    if (hasChange) {
      this.persistToLocalStorage();
    }
  }
}

export const dailyStatsService = new DailyStatsService();
