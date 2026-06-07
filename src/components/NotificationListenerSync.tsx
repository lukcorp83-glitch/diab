import React, { useEffect } from 'react';
import { NotificationBridge } from '../lib/notificationBridge';
import { loadLocalLogs } from '../lib/localLogs';

export const NotificationListenerSync: React.FC<{ user: any, isGuest?: boolean }> = ({ user, isGuest }) => {
  useEffect(() => {
    if (!user && !isGuest) return;
    let listener: any = null;
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
              tags: ['Z powiadomień'],
              notes: `Zczytane w tle z aplikacji (${data.package})`,
              source: 'NotificationListener',
              createdAt: new Date(now).toISOString()
            };
            // Wyślij zdarzenie do App.tsx, by zapisało lokalnie w cachedLogs i IDB
            window.dispatchEvent(new CustomEvent('localLogAdd', { detail: logData }));
            console.log("Dodano cukier z powiadomienia (lokalnie)", data.glucose);
            
          } catch (e) {
            console.error('Blad zapisu z powiadomienia:', e);
          }
        });
        
        // --- NATYCHMIASTOWE POBRANIE BIEŻĄCYCH I HISTORII ---
        try {
           setTimeout(async () => {
              try {
                  // Pobierz historię zczytaną w tle
                  const histRet = await NotificationBridge.getGlucoseHistory();
                  if (histRet && histRet.history) {
                      const parts = histRet.history.split('|');
                      const localLogs = await loadLocalLogs();
                      
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
                                  type: 'glucose',
                                  tags: ['Z powiadomień'],
                                  notes: `Zczytane w tle z aplikacji (${pkg || 'unknown'})`,
                                  source: 'NotificationListener',
                                  createdAt: new Date(timestamp).toISOString()
                              };
                              window.dispatchEvent(new CustomEvent('localLogAdd', { detail: logData }));
                              // Dodajemy do localLogs w pamięci by deduplikować kolejne wpisy z historii
                              localLogs.push(logData);
                          }
                      }
                  }
              } catch(e) {
                  console.error("Failed to load glucose history", e);
              }
              
              // Poproś o aktualne powiadomienie
              NotificationBridge.requestActiveNotifications().catch(e => console.warn(e));
           }, 1000); // 1 sekunda opóźnienia, by listener JS zdążył się dobrze zamontować
        } catch(e) {}
      } catch (e) {
        console.error("NotificationListener setup error:", e);
      }
    };
    init();
    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  }, [user]);
  return null;
};
