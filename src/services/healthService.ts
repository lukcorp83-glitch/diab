import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';

export interface HealthDataResult {
  startDate: Date;
  endDate: Date;
  value: number;
  unit: string;
}

export const healthService = {
  isAvailable(): boolean {
    if (!Capacitor.isNativePlatform()) return false;
    const win = window as any;
    return !!(win.navigator && (win.navigator.health || (win.cordova && win.cordova.plugins && win.cordova.plugins.health)));
  },

  async requestAuthorization(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    return new Promise((resolve) => {
      
      const win = window as any;
      const healthObj = (win.navigator.health || (win.cordova && win.cordova.plugins && win.cordova.plugins.health));
      if (!healthObj) { resolve(false); return; }

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
          toast.error('Odmowa: ' + (typeof err === 'string' ? err : JSON.stringify(err)));
          resolve(false);
        }
      );
    });
  },

  async getStepsLast24h(): Promise<number> {
    if (!this.isAvailable()) return 0;

    return new Promise((resolve) => {
      
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      
      const win = window as any;
      const healthObj = (win.navigator.health || (win.cordova && win.cordova.plugins && win.cordova.plugins.health));
      if (!healthObj) { resolve(0); return; }

      healthObj.queryAggregated(
        {
          startDate: yesterday,
          endDate: now,
          dataType: 'steps',
        },
        (data: any) => {
          console.log('[HealthConnect] Aggregated steps data:', data);
          if (!data) {
            resolve(0);
            return;
          }
          // queryAggregated zwraca obiekt z polem value, czasami w data.value, czasami po prostu value
          const totalSteps = Number(data.value) || 0;
          resolve(Math.round(totalSteps));
        },
        (err: any) => {
          console.warn('[HealthConnect] Error querying steps:', err);
          resolve(0);
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
          value: value,
          unit: 'mg/dL',
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
