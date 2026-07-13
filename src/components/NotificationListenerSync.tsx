import React, { useEffect } from 'react';
import { NotificationBridge } from '../lib/notificationBridge';
import { loadLocalLogs } from '../lib/localLogs';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import i18n from "../i18n";

export const NotificationListenerSync: React.FC<{ user: any }> = ({ user }) => {
  useEffect(() => {
    if (!user) return;
    if (!Capacitor.isNativePlatform()) return;
    let listener: any = null;
    let appStateListener: any = null;

    const fetchHistoryAndActive = async () => {
      try {
        // Pobierz historię zczytaną w tle
        const histRet = await NotificationBridge.getGlucoseHistory();
        if (histRet && histRet.history) {
          const parts = histRet.history.split('|');
          const localLogs = await loadLocalLogs();
          const newLogsBatch: any[] = [];
          
          for (const part of parts) {
            if (!part.trim()) continue;
            const [valStr, timeStr, pkg] = part.split(':');
            if (!valStr || !timeStr) continue;
            
            const val = parseInt(valStr, 10);
            const timestamp = parseInt(timeStr, 10);
            if (isNaN(val) || isNaN(timestamp)) continue;
            
            // Deduplikacja
            let skip = false;
            for (const doc of localLogs) {
              if (doc.type === 'glucose' && doc.timestamp >= timestamp - 3 * 60 * 1000 && doc.timestamp <= timestamp + 3 * 60 * 1000) {
                if (doc.value === val) {
                  skip = true;
                  break;
                }
              }
            }
            if (!skip) {
              const logData = {
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
                value: val,
                unit: 'mg/dL',
                date: new Date(timestamp).toISOString(),
                timestamp: timestamp,
                type: 'glucose' as const,
                tags: [i18n.t('auto.z_powiadomien', { defaultValue: i18n.t('auto.z_powiadomien', { defaultValue: "Z powiadomień" }) })],
                notes: `Zczytane w tle z aplikacji (${pkg || 'unknown'})`,
                source: 'NotificationListener',
                createdAt: new Date(timestamp).toISOString()
              };
              newLogsBatch.push(logData);
              // Dodajemy do localLogs w pamięci by deduplikować kolejne wpisy z historii
              localLogs.push(logData);
            }
          }
          
          if (newLogsBatch.length > 0) {
            window.dispatchEvent(new CustomEvent('localLogAddBatch', { detail: newLogsBatch }));
            window.dispatchEvent(new CustomEvent('wsSendLogBatch', { detail: newLogsBatch }));
          }
        }
      } catch(e) {
        console.error("Failed to load glucose history", e);
      }
      
      // Poproś o aktualne powiadomienie
      NotificationBridge.requestActiveNotifications().catch(e => console.warn(e));
    };

    const init = async () => {
      try {
        const { granted } = await NotificationBridge.checkPermission();
        if (!granted) return; // Silently ignore if not enabled
        listener = await NotificationBridge.addListener('glucoseNotificationReceived', async (data) => {
          if (!data || !data.glucose || data.glucose <= 0) return;
          try {
            const now = Date.now();
            let skip = false;
            try {
              const localLogs = await loadLocalLogs();
              for (const doc of localLogs) {
                if (doc.type === 'glucose' && doc.timestamp >= now - 3 * 60 * 1000) {
                  if (doc.value === data.glucose) {
                    skip = true;
                    break;
                  }
                }
              }
            } catch(e) {
              console.error("Blad odczytu lokalnych logow do deduplikacji", e);
            }
            if (skip) {
              console.log("Skipping duplicate glucose from notification", data.glucose);
              return;
            }
            const logData = {
              id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
              value: data.glucose,
              unit: 'mg/dL',
              date: new Date(now).toISOString(),
              timestamp: now,
              type: 'glucose',
              tags: [i18n.t('auto.z_powiadomien', { defaultValue: i18n.t('auto.z_powiadomien', { defaultValue: "Z powiadomień" }) })],
              notes: `Zczytane w tle z aplikacji (${data.package})`,
              source: 'NotificationListener',
              createdAt: new Date(now).toISOString()
            };
            window.dispatchEvent(new CustomEvent('localLogAdd', { detail: logData }));
            window.dispatchEvent(new CustomEvent('wsSendLog', { detail: logData }));
            console.log("Dodano cukier z powiadomienia (lokalnie)", data.glucose);
            
          } catch (e) {
            console.error('Blad zapisu z powiadomienia:', e);
          }
        });
        
        // --- NATYCHMIASTOWE POBRANIE BIEŻĄCYCH I HISTORII ---
        setTimeout(() => fetchHistoryAndActive(), 1000);

        // --- NASŁUCHIWANIE POWROTU Z TŁA ---
        App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                console.log("App resumed to foreground, fetching background glucose history...");
                fetchHistoryAndActive();
            }
        }).then(res => {
            appStateListener = res;
        });

      } catch (e) {
        console.error("NotificationListener setup error:", e);
      }
    };
    init();
    
    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
      if (appStateListener && typeof appStateListener.remove === 'function') {
        appStateListener.remove();
      }
    };
  }, [user]);
  return null;
};

