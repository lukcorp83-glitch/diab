import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';

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
    const healthObj = this.getHealthObj();
    if (!healthObj) return false;

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
          resolve(false);
        }
      );
    });
  },

  async getStepsLast24h(): Promise<number | null> {
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

      
      const win = window as any;
      const healthObj = (win.navigator.health || (win.cordova && win.cordova.plugins && win.cordova.plugins.health));
      if (!healthObj) { resolve(false); return; }

      healthObj.store(
        {
          startDate: date,
          endDate: date,
          dataType: 'blood_glucose',
          value: {
            glucose: value / 18.0182, // Health Connect expects mmol/L for blood_glucose in this plugin
            source: 'interstitial_fluid'
          },
          unit: 'mmol/L',
        },
        () => {
          console.log('[HealthConnect] Successfully wrote blood glucose:', value);
          resolve(true);
        },
        (err: any) => {
          console.error('[HealthConnect] Error writing blood glucose:', err);
          resolve(false);
        }
      );
    });
  },
};
