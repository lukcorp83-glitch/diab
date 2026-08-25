import { useEffect, useState } from 'react';
import { LogEntry } from '../types';
import { useAppStore } from '../stores/useAppStore';
import { notificationService } from '../services/notificationService';

export function useNightscoutWorker(user: any, nsUrl: string, nsSecret: string, userSettingsRef: any, deletedNsIdsRef: any) {
  const [nsLogs, setNsLogs] = useState<LogEntry[]>([]);
  const [nsDeviceStatus, setNsDeviceStatus] = useState<any>(null);

  useEffect(() => {
    const handleNsLogDelete = (e: any) => {
      const id = e.detail.id;
      setNsLogs(prev => prev.filter(l => l.nsId !== id && l.id !== id));
    };
    window.addEventListener('nsLogDelete', handleNsLogDelete);

    const effectiveUrl = nsUrl || (typeof window !== 'undefined' ? localStorage.getItem('nightscout_url') || '' : '');
    console.log("==== HOOK: useEffect uruchomiony ====", { user: !!user, nsUrl: effectiveUrl });
    if (!effectiveUrl) {
      console.log("==== HOOK: Brak Nightscout URL, przerywam ====");
      return;
    }

    console.log("==== HOOK: Tworzę workera ====");
    const worker = new Worker(new URL('../workers/nightscout.worker.ts', import.meta.url), { type: 'module' });
    console.log("==== HOOK: Worker utworzony ====", worker);

    worker.onmessage = (e) => {
      const { type, payload } = e.data;

                      if (type === 'SYNC_SUCCESS') {
          // --- SMART EQUIPMENT DETECTION ---
          if (userSettingsRef.current?.smartEquipmentDetection) {
            import('../lib/smartEquipment').then(({ detectSmartEquipmentChanges }) => {
              // We use localStorage as a reliable backup of the previous reservoir level
              const prevReservoir = localStorage.getItem('last_known_reservoir') ? parseFloat(localStorage.getItem('last_known_reservoir')!) : undefined;
              const newReservoir = payload.deviceStatus?.reservoir;
              
              if (newReservoir !== undefined) {
                localStorage.setItem('last_known_reservoir', newReservoir.toString());
              }

              const { triggerReservoir, triggerSensor } = detectSmartEquipmentChanges(newReservoir, prevReservoir, payload.entries || []);
              
              if (triggerReservoir) {
                window.dispatchEvent(new CustomEvent('smart-equipment-trigger', { detail: 'reservoir' }));
              } else if (triggerSensor) {
                window.dispatchEvent(new CustomEvent('smart-equipment-trigger', { detail: 'sensor' }));
              }
            });
          }
          // ---------------------------------
          if (payload.deviceStatus) {
           setNsDeviceStatus(prev => {
               if (!prev || JSON.stringify(prev) !== JSON.stringify(payload.deviceStatus)) {
                 return payload.deviceStatus;
               }
               return prev;
             });
        }

        const uniqueNSLogs: LogEntry[] = [];
        const seen = new Set<string>();

        const allLogs = [...(payload.entries || []), ...(payload.treatments || [])];
        allLogs.forEach((n: LogEntry) => {
          const key = n.id || (n.timestamp + n.type + (n.value || ''));
          if (!seen.has(key)) {
            seen.add(key);
            uniqueNSLogs.push(n);
          }
        });

        const newLogsToSync = uniqueNSLogs.filter(
          (newLog) => (!newLog.id || !deletedNsIdsRef.current.has(newLog.id))
        );

        if (newLogsToSync.length > 0) {
          console.log(`Worker synced ${newLogsToSync.length} new records to memory`);
          setNsLogs((prev) => {
            const all = [...prev, ...newLogsToSync];
            const uniqueMap = new Map();
            all.forEach(log => {
                const key = log.id || (log.timestamp + log.type + (log.value || ''));
                uniqueMap.set(key, log);
            });
            return Array.from(uniqueMap.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 45000);
          });
        }
        
        useAppStore.getState().setSyncStatus({ status: "success", lastSync: Date.now() });
        window.dispatchEvent(new CustomEvent("nightscout-sync-result", { detail: { success: true } }));
      }

      if (type === 'SYNC_ERROR') {
        console.error("Worker sync error:", payload);
        useAppStore.getState().setSyncStatus({ status: "error", lastSync: Date.now() });
        window.dispatchEvent(new CustomEvent("nightscout-sync-result", { detail: { success: false, payload } }));
      }
    };

    if (nsUrl) {
      worker.postMessage({ type: 'START_SYNC', payload: { url: nsUrl, secret: nsSecret, intervalMs: 5 * 60 * 1000, count: 6000 } });
      useAppStore.getState().setSyncStatus({ status: "syncing" });
    }

    const handleForceSync = (e: any) => {
      console.log("==== HOOK: Zdarzenie force-nightscout-sync otrzymane! ====", e);
      const urlToUse = e?.detail?.url || nsUrl;
      const secretToUse = e?.detail?.secret !== undefined ? e.detail.secret : nsSecret;
      
      if (!urlToUse) {
         console.warn("==== HOOK: Brak URL do synchronizacji ====");
         return;
      }

      console.log("Force sync manually triggered (Worker)", { urlToUse });
      useAppStore.getState().setSyncStatus({ status: "syncing" });
      worker.postMessage({ type: 'STOP_SYNC' });
      worker.postMessage({ type: 'START_SYNC', payload: { url: urlToUse, secret: secretToUse, intervalMs: 5 * 60 * 1000, count: 6000 } });
    };

    console.log("==== HOOK: Rejestruję event listener na force-nightscout-sync ====");
    window.addEventListener("force-nightscout-sync", handleForceSync);
    
    const handleHypoAlert = (e: any) => {
      if (userSettingsRef.current?.notificationsEnabled === false) return;
      const prefs = userSettingsRef.current?.notificationPrefs;
      if (prefs?.hypoProtection !== false) {
        const payload = e?.detail;
        const latestBg = payload?.predictionCurve?.[0]?.value;
        const pred1h = payload?.predictedNextHour;
        const trough = payload?.predictedTrough?.value;

        // Jeśli aktualny cukier jest wysoki (>130) i prognoza nie wykazuje drastycznego spadku <80, zignoruj alert
        if (latestBg && latestBg > 130 && (pred1h === undefined || pred1h >= 80)) {
          console.log(`[HypoProtection] Zignorowano fałszywy alert: aktualny cukier jest wysoki (${latestBg} mg/dL)`);
          return;
        }

        if (trough !== undefined && trough >= 80 && (pred1h === undefined || pred1h >= 80)) {
          console.log(`[HypoProtection] Zignorowano alert: prognoza jest bezpieczna (trough: ${trough} mg/dL)`);
          return;
        }

        const lastSent = parseInt(localStorage.getItem('last_hypo_protect_alert') || '0', 10);
        if (Date.now() - lastSent > 60 * 60 * 1000) {
          localStorage.setItem('last_hypo_protect_alert', Date.now().toString());
          notificationService.sendHypoProtectionAlert();
        }
      }
    };
    window.addEventListener("glikosense_hypo_alert", handleHypoAlert);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("App returned to foreground, forcing nightscout worker sync...");
        handleForceSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      worker.postMessage({ type: 'STOP_SYNC' });
      worker.terminate();
      window.removeEventListener("force-nightscout-sync", handleForceSync);
      window.removeEventListener("glikosense_hypo_alert", handleHypoAlert);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener('nsLogDelete', handleNsLogDelete);
    };
  }, [user, nsUrl, nsSecret, userSettingsRef, deletedNsIdsRef]);

  return { nsLogs, setNsLogs, nsDeviceStatus };
}



