import React, { useEffect } from 'react';
import { NotificationBridge } from '../lib/notificationBridge';
import { loadLocalLogs } from '../lib/localLogs';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import i18n from "../i18n";

export const NotificationListenerSync: React.FC<{ user?: any }> = ({ user }) => {
 useEffect(() => {
 if (!Capacitor.isNativePlatform()) return;
 let listener: any = null;
 let treatmentListener: any = null;
 let appStateListener: any = null;

 const processTreatment = async (treatment: { insulin: number; carbs: number; eventType?: string; notes?: string; timestamp: number }, localLogs: any[]) => {
   const { insulin, carbs, eventType, notes, timestamp } = treatment;
   const time = timestamp && timestamp > 0 ? timestamp : Date.now();
   const newLogs: any[] = [];

   // 1. Zapis węglowodanów / posiłku (Meal)
   if (carbs > 0) {
     let skipMeal = false;
     for (const doc of localLogs) {
       if (doc.type === 'meal' && Math.abs(doc.timestamp - time) <= 3 * 60 * 1000) {
         if (doc.value === carbs) {
           skipMeal = true;
           break;
         }
       }
     }
     if (!skipMeal) {
       const mealLog = {
         id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
         type: 'meal' as const,
         value: carbs,
         timestamp: time,
         date: new Date(time).toISOString(),
         notes: notes ? `xDrip+: ${notes}` : `Posiłek z xDrip+ (${carbs}g W)`,
         source: 'XDripBroadcast',
         createdAt: new Date(time).toISOString(),
         tags: ['xDrip Treatment']
       };
       newLogs.push(mealLog);
       localLogs.push(mealLog);
       window.dispatchEvent(new CustomEvent('localLogAdd', { detail: mealLog }));
       window.dispatchEvent(new CustomEvent('wsSendLog', { detail: mealLog }));
       console.log("Dodano węglowodany z xDrip (lokalnie):", carbs);
     }
   }

   // 2. Zapis dawki insuliny / bolusa (Bolus)
   if (insulin > 0) {
     let skipBolus = false;
     for (const doc of localLogs) {
       if (doc.type === 'bolus' && Math.abs(doc.timestamp - time) <= 3 * 60 * 1000) {
         if (Math.abs(doc.value - insulin) < 0.05) {
           skipBolus = true;
           break;
         }
       }
     }
     if (!skipBolus) {
       const bolusLog = {
         id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
         type: 'bolus' as const,
         value: insulin,
         timestamp: time,
         date: new Date(time).toISOString(),
         notes: notes ? `xDrip+: ${notes}` : `Bolus z xDrip+ (${eventType || 'Dawka'})`,
         source: 'XDripBroadcast',
         createdAt: new Date(time).toISOString(),
         tags: ['xDrip Treatment']
       };
       newLogs.push(bolusLog);
       localLogs.push(bolusLog);
       window.dispatchEvent(new CustomEvent('localLogAdd', { detail: bolusLog }));
       window.dispatchEvent(new CustomEvent('wsSendLog', { detail: bolusLog }));
       console.log("Dodano bolus z xDrip (lokalnie):", insulin);
     }
   }
 };

 const fetchHistoryAndActive = async () => {
   try {
     const localLogs = await loadLocalLogs();

     // 1. Pobierz historię glikemii zczytaną w tle (z powiadomień lub rozgłoszeń xDrip)
     const histRet = await NotificationBridge.getGlucoseHistory();
     if (histRet && histRet.history) {
       const parts = histRet.history.split('|');
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
           if (doc.type === 'glucose' && Math.abs(doc.timestamp - timestamp) <= 3 * 60 * 1000) {
             if (doc.value === val) {
               skip = true;
               break;
             }
           }
         }
         if (!skip) {
           const isXDrip = pkg === 'com.eveningoutpost.dexdrip';
           const logData = {
             id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
             value: val,
             unit: 'mg/dL',
             date: new Date(timestamp).toISOString(),
             timestamp: timestamp,
             type: 'glucose' as const,
             tags: [isXDrip ? 'xDrip Broadcast' : i18n.t('auto.z_powiadomien', { defaultValue: "Z powiadomień" })],
             notes: isXDrip ? 'Zczytane w tle z transmisji lokalnej xDrip+' : `Zczytane w tle z aplikacji (${pkg || 'unknown'})`,
             source: isXDrip ? 'XDripBroadcast' : 'NotificationListener',
             createdAt: new Date(timestamp).toISOString()
           };
           newLogsBatch.push(logData);
           localLogs.push(logData);
         }
       }
       
       if (newLogsBatch.length > 0) {
         window.dispatchEvent(new CustomEvent('localLogAddBatch', { detail: newLogsBatch }));
         window.dispatchEvent(new CustomEvent('wsSendLogBatch', { detail: newLogsBatch }));
       }
     }

     // 2. Pobierz historię zabiegów (bolusy / węglowodany z xDrip) z tła
     try {
       const treatRet = await NotificationBridge.getTreatmentHistory();
       if (treatRet && treatRet.history) {
         const treatParts = treatRet.history.split('|');
         for (const tp of treatParts) {
           if (!tp.trim()) continue;
           const [insStr, carbStr, timeStr, eventType, notes] = tp.split(';');
           const ins = parseFloat(insStr) || 0;
           const carbs = parseFloat(carbStr) || 0;
           const tTime = parseInt(timeStr, 10) || Date.now();
           await processTreatment({ insulin: ins, carbs: carbs, eventType, notes, timestamp: tTime }, localLogs);
         }
       }
     } catch (err) {
       console.warn("Blad odczytu historii zabiegow z tła:", err);
     }

   } catch(e) {
     console.error("Failed to load glucose history", e);
   }
 };

 const init = async () => {
   try {
     // 1. Zawsze nasłuchuj zdarzeń glikemii (działa dla transmisji xDrip bez żadnych uprawnień systemowych)
     listener = await NotificationBridge.addListener('glucoseNotificationReceived', async (data: any) => {
       if (!data || !data.glucose || data.glucose <= 0) return;
       try {
         const readingTime = (data.timestamp && data.timestamp > 0) ? data.timestamp : Date.now();
         let skip = false;
         try {
           const localLogs = await loadLocalLogs();
           for (const doc of localLogs) {
             if (doc.type === 'glucose' && Math.abs(doc.timestamp - readingTime) < 3 * 60 * 1000) {
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
           console.log("Skipping duplicate glucose from broadcast/notification", data.glucose);
           return;
         }
         const isXDrip = data.package === 'com.eveningoutpost.dexdrip';
         const logData = {
           id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
           value: data.glucose,
           unit: 'mg/dL',
           date: new Date(readingTime).toISOString(),
           timestamp: readingTime,
           type: 'glucose' as const,
           tags: [isXDrip ? 'xDrip Broadcast' : i18n.t('auto.z_powiadomien', { defaultValue: "Z powiadomień" })],
           notes: isXDrip ? 'Zczytane natychmiastowo z transmisji lokalnej xDrip+' : `Zczytane w tle z aplikacji (${data.package})`,
           source: isXDrip ? 'XDripBroadcast' : 'NotificationListener',
           createdAt: new Date(readingTime).toISOString()
         };
         window.dispatchEvent(new CustomEvent('localLogAdd', { detail: logData }));
         window.dispatchEvent(new CustomEvent('wsSendLog', { detail: logData }));
         console.log("Dodano cukier z transmisji/powiadomienia (lokalnie)", data.glucose);
       } catch (e) {
         console.error('Blad zapisu z powiadomienia/transmisji:', e);
       }
     });

     // 2. Nasłuchuj zdarzeń zabiegów (bolusy i węglowodany z xDrip+)
     treatmentListener = await NotificationBridge.addListener('treatmentNotificationReceived', async (data: any) => {
       if (!data) return;
       try {
         const localLogs = await loadLocalLogs();
         await processTreatment(data, localLogs);
       } catch (e) {
         console.error('Blad zapisu zabiegu z xDrip:', e);
       }
     });

     // 3. Natychmiastowe pobranie historii z tła
     setTimeout(() => fetchHistoryAndActive(), 1000);

     // 4. Nasłuchiwanie powrotu z tła
     App.addListener('appStateChange', ({ isActive }) => {
       if (isActive) {
         console.log("App resumed to foreground, fetching background glucose/treatment history...");
         fetchHistoryAndActive();
       }
     }).then(res => {
       appStateListener = res;
     });

     // 5. Jeśli uprawnienia powiadomień są włączone, poproś o bieżące aktywne powiadomienie
     try {
       const { granted } = await NotificationBridge.checkPermission();
       if (granted) {
         NotificationBridge.requestActiveNotifications().catch((e: any) => console.warn(e));
       }
     } catch (e) {}

   } catch (e) {
     console.error("NotificationListener setup error:", e);
   }
 };
 init();
 
 return () => {
   if (listener && typeof listener.remove === 'function') {
     listener.remove();
   }
   if (treatmentListener && typeof treatmentListener.remove === 'function') {
     treatmentListener.remove();
   }
   if (appStateListener && typeof appStateListener.remove === 'function') {
     appStateListener.remove();
   }
 };
 }, [user]);
 return null;
};
