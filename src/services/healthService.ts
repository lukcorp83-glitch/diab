import { Capacitor, registerPlugin } from '@capacitor/core';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getEffectiveUid } from '../lib/utils';

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
  },

  async syncStepsToCloud(user: any, steps: number, isManual = false, dateKey?: string): Promise<void> {
    if (typeof steps !== 'number' || isNaN(steps) || steps < 0) return;
    const todayKey = dateKey || new Date().toISOString().split('T')[0];
    
    // 1. Zapis lokalny
    try {
      localStorage.setItem(`glikocontrol_steps_${todayKey}`, steps.toString());
      window.dispatchEvent(new CustomEvent('glikocontrol_steps_update', { 
        detail: { steps, todayKey, isManual } 
      }));
    } catch (e) {}

    // 2. Synchronizacja z chmurą Firebase Firestore
    if (user) {
      try {
        const uid = getEffectiveUid(user);
        await setDoc(
          doc(db, "users", uid, "daily_stats", todayKey),
          {
            steps,
            updatedAt: Date.now(),
            isManual: !!isManual
          },
          { merge: true }
        );
        console.log(`[HealthService] Zsynchronizowano ${steps} kroków z chmurą (${todayKey})`);
      } catch (err) {
        console.warn('[HealthService] Błąd synchronizacji kroków z Firestore:', err);
      }
    }
  },

  listenToCloudSteps(user: any, todayKey: string, onUpdate: (steps: number, isManual?: boolean) => void): () => void {
    // 1. Nasłuch lokalny w ramach tej samej przeglądarki/aplikacji
    const handleLocalUpdate = (e: any) => {
      if (e.detail && e.detail.todayKey === todayKey && typeof e.detail.steps === 'number') {
        onUpdate(e.detail.steps, e.detail.isManual);
      }
    };
    window.addEventListener('glikocontrol_steps_update', handleLocalUpdate);

    if (!user) {
      return () => {
        window.removeEventListener('glikocontrol_steps_update', handleLocalUpdate);
      };
    }

    // 2. Real-time synchronizacja między urządzeniami przez Firestore onSnapshot
    try {
      const uid = getEffectiveUid(user);
      const unsubFirestore = onSnapshot(
        doc(db, "users", uid, "daily_stats", todayKey),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data && typeof data.steps === 'number') {
              const saved = localStorage.getItem(`glikocontrol_steps_${todayKey}`);
              const localVal = saved !== null ? parseInt(saved, 10) : null;
              
              // Jeśli w chmurze jest wpis ręczny lub liczba kroków jest większa/równa lokalnej
              if (data.isManual || localVal === null || data.steps >= localVal) {
                localStorage.setItem(`glikocontrol_steps_${todayKey}`, data.steps.toString());
                onUpdate(data.steps, data.isManual);
              } else if (localVal !== null && localVal > data.steps && !data.isManual) {
                // Jeśli ten telefon ma wyższy stan z sensora niż chmura, zsynchronizuj w górę
                healthService.syncStepsToCloud(user, localVal, false, todayKey).catch(() => {});
              }
            }
          }
        },
        (error) => {
          console.warn('[HealthService] Błąd nasłuchu kroków z Firestore:', error);
        }
      );

      return () => {
        window.removeEventListener('glikocontrol_steps_update', handleLocalUpdate);
        unsubFirestore();
      };
    } catch (err) {
      console.warn('[HealthService] Nie udało się zainicjować nasłuchu Firestore:', err);
      return () => {
        window.removeEventListener('glikocontrol_steps_update', handleLocalUpdate);
      };
    }
  }
};
