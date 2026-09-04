import { Capacitor, registerPlugin } from '@capacitor/core';
import { toast } from 'react-hot-toast';

const StepCounter: any = Capacitor.Plugins?.StepCounter || registerPlugin('StepCounter');

export interface HealthDataResult {
  startDate: Date;
  endDate: Date;
  value: number;
  unit: string;
}

export const healthService = {
  getHealthObj(): any {
    if (typeof window === 'undefined') return null;
    const win = window as any;
    return win.navigator?.health || 
           win.cordova?.plugins?.health || 
           win.Capacitor?.Plugins?.Health || 
           win.Capacitor?.Plugins?.HealthConnect ||
           win.Health;
  },

  isAvailable(): boolean {
    if (this.getHealthObj()) return true;
    if (Capacitor.isNativePlatform()) return true;
    return false;
  },

  async requestAuthorization(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        await StepCounter.requestPermissions();
      } catch (e) {
        console.warn('[StepCounter] Permission request error:', e);
      }
      return true;
    }

    const healthObj = this.getHealthObj();
    if (healthObj) {
      return new Promise((resolve) => {
        healthObj.requestAuthorization(
          {
            read: ['steps', 'blood_glucose'],
            write: ['blood_glucose']
          },
          () => {
            console.log('[HealthConnect] Authorization granted');
            resolve(true);
          },
          (err: any) => {
            console.error('[HealthConnect] Authorization failed:', err);
            resolve(true);
          }
        );
      });
    }

    return true;
  },

  async getStepsLast24h(): Promise<number | null> {
    // 1. Priorytet: Natywny sensor kroków Androida (Hardware Step Counter)
    if (Capacitor.isNativePlatform()) {
      try {
        const nativeResult = await StepCounter.getTodaySteps();
        if (nativeResult && typeof nativeResult.steps === 'number') {
          console.log('[StepCounter] Natywny odczyt kroków z sensora telefonu:', nativeResult.steps);
          return Math.max(0, Math.round(nativeResult.steps));
        }
      } catch (nativeErr) {
        console.warn('[StepCounter] Błąd natywnego sensora kroków:', nativeErr);
      }
    }

    const healthObj = this.getHealthObj();
    if (!healthObj) return null;

    return new Promise((resolve) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      healthObj.queryAggregated(
        {
          startDate: today,
          endDate: now,
          dataType: 'steps',
        },
        (data: any) => {
          console.log('[HealthConnect] Aggregated steps data:', data);
          if (!data) {
            resolve(0);
            return;
          }
          let totalSteps = 0;
          if (Array.isArray(data)) {
            totalSteps = data.reduce((acc, curr) => acc + (Number(curr?.value) || 0), 0);
          } else {
            totalSteps = Number(data.value) || Number(data) || 0;
          }
          resolve(Math.round(totalSteps));
        },
        (err: any) => {
          console.warn('[HealthConnect] Error querying aggregated steps, fallback to raw query:', err);
          // Fallback to raw query if queryAggregated fails
          healthObj.query(
            {
              startDate: today,
              endDate: now,
              dataType: 'steps',
            },
            (rawData: any) => {
              if (Array.isArray(rawData)) {
                const total = rawData.reduce((acc, curr) => acc + (Number(curr?.value) || 0), 0);
                resolve(Math.round(total));
              } else {
                resolve(0);
              }
            },
            () => resolve(null)
          );
        }
      );
    });
  },

  async writeBloodGlucose(value: number, timestamp: number): Promise<boolean> {
    if (!this.isAvailable()) return false;

    return new Promise((resolve) => {
      const date = new Date(timestamp);
      const healthObj = this.getHealthObj();
      if (!healthObj) { 
        resolve(false); 
        return; 
      }

      const mmolVal = Number((value / 18.0182).toFixed(2));

      healthObj.store(
        {
          startDate: date,
          endDate: date,
          dataType: 'blood_glucose',
          value: {
            glucose: mmolVal,
            source: 'interstitial_fluid'
          },
          unit: 'mmol/L',
        },
        () => {
          console.log('[HealthConnect] Successfully wrote blood glucose:', value, 'mg/dL (', mmolVal, 'mmol/L)');
          resolve(true);
        },
        (err: any) => {
          console.warn('[HealthConnect] Structured store failed, trying scalar value:', err);
          // Fallback na prostą wartość liczbową
          healthObj.store(
            {
              startDate: date,
              endDate: date,
              dataType: 'blood_glucose',
              value: mmolVal,
              unit: 'mmol/L',
            },
            () => {
              console.log('[HealthConnect] Successfully wrote blood glucose (fallback scalar):', value);
              resolve(true);
            },
            (fallbackErr: any) => {
              console.error('[HealthConnect] Error writing blood glucose:', fallbackErr);
              resolve(false);
            }
          );
        }
      );
    });
  },

  async syncRecentGlucose(measurements: Array<{ value: number; timestamp: number }>): Promise<number> {
    if (!this.isAvailable() || !measurements || measurements.length === 0) return 0;
    let successCount = 0;
    for (const m of measurements) {
      if (m.value && m.value > 0 && m.timestamp) {
        const ok = await this.writeBloodGlucose(m.value, m.timestamp);
        if (ok) successCount++;
      }
    }
    return successCount;
  }
};
