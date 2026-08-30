import { toast } from "react-hot-toast";
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import i18n from "../i18n";
import { stopAllAudio } from '../lib/audioUtils';
import { NotificationBridge } from '../lib/notificationBridge';

const VAPID_KEY = 'BDpTWMeEWqqbg9i1S4P33GC51S2TgPs_cozqFLQrYJl0y6RXMXUym50gG-1d3xvGsSH7EjVGRyERPQ1i-K2h3D4';

export const notificationService = {
  async initChannels() {
    if (Capacitor.isNativePlatform()) {
      try {
        const oldChannels = ['glucose_alerts', 'glucose_alerts_v2', 'glucose_alerts_v10', 'glucose_alerts_v11', 'glucose_alerts_v12', 'glucose_alerts_v13', 'glucose_alerts_v14', 'glucose_alerts_v15', 'glucose_alerts_v16', 'glucose_alerts_v17', 'glucose_alerts_v20'];
        for (const ch of oldChannels) {
          try { await LocalNotifications.deleteChannel({ id: ch }); } catch(e) {}
        }
        
        await LocalNotifications.createChannel({
          id: 'gliko_glucose_alerts_v25',
          name: '🚨 Alerty Glikemii (Hipo / Hiper)',
          description: 'Głośne alarmy wysokiego i niskiego poziomu cukru z unikalnym dźwiękiem MP3',
          importance: 5,
          visibility: 1,
          sound: 'status_clear.mp3',
          vibration: true
        });

        await LocalNotifications.createChannel({
          id: 'glikocontrol_reminders_v1',
          name: 'Przypomnienia GlikoControl',
          description: 'Powiadomienia o wymianach osprzętu i prognozach',
          importance: 4,
          visibility: 1,
          vibration: true
        });

        await LocalNotifications.createChannel({
          id: 'glikocontrol_medications_v2',
          name: '💊 Przypomnienia o Lekach',
          description: 'Punktualne przypomnienia o zażyciu leków i insuliny (wysoki priorytet)',
          importance: 5,
          visibility: 1,
          vibration: true
        });
      } catch (err) {
        console.warn('Failed to create notification channel:', err);
      }
    }
  },

  async requestPermission(): Promise<string | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        return await this.registerToken();
      }

      if (!window.Notification) {
        toast(i18n.t('auto.twoja_przegladarka_lub_aplikac', { defaultValue: i18n.t('auto.twoja_przegladarka_lub_ap', { defaultValue: "Twoja przeglądarka lub aplikacja może nie obsługiwać systemowych powiadomień Push. Krytyczne alerty będą wyświetlane wewnątrz aplikacji." }) }), { icon: 'ℹ️', duration: 8000 });
        return null;
      }
      const permission = await window.Notification.requestPermission();
      if (permission === 'granted') {
        return await this.registerToken();
      }
      alert(i18n.t('auto.odmowa_dostepu_do_powiadomien', { defaultValue: i18n.t('auto.odmowa_dostepu_do_powiado', { defaultValue: "Odmowa dostępu do powiadomień.\nAby to naprawić:\n- Android: Ustawienia -> Aplikacje -> Uprawnienia -> Powiadomienia.\n- iOS: Ustawienia -> GlikoControl -> Powiadomienia -> 'Zezwalaj'." }) }));
      return null;
    } catch (error) {
      console.error('Permission request failed:', error);
      toast(i18n.t('auto.nie_udalo_sie_aktywowac_powiad', { defaultValue: i18n.t('auto.nie_udalo_sie_aktywowac_p', { defaultValue: "Nie udało się aktywować powiadomień systemowych. Alerty będą wyświetlane jako komunikaty wewnątrz aplikacji." }) }), { icon: 'ℹ️' });
      return null;
    }
  },

  async registerToken(): Promise<string | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        await this.initChannels();
        const result = await PushNotifications.requestPermissions();
        if (result.receive === 'granted') {
          await PushNotifications.removeAllListeners();
          return new Promise((resolve) => {
             PushNotifications.addListener('registration', async (token) => {
                console.log('Native Push Registration token:', token.value);
                await this.saveTokenToFirestore(token.value);
                resolve(token.value);
             });
             PushNotifications.addListener('registrationError', (error: any) => {
                console.error('Native Push registration error:', error);
                resolve(null);
             });
             PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('Push received in foreground:', notification);
                const body = notification.body || '';
                import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
                    Haptics.impact({ style: ImpactStyle.Heavy });
                }).catch(() => {
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                });
                toast(body, {
                  icon: '⚠️',
                  duration: 20000,
                  position: 'top-center',
                  style: { border: '2px solid #f43f5e', padding: '16px', color: '#1e293b', fontWeight: 'bold' }
                });
             });
             PushNotifications.register();
          });
        }
        return null;
      }

      const msg = await messaging();
      if (!msg) {
        alert(i18n.t('auto.twoja_przegladarka_nie_obslugu', { defaultValue: i18n.t('auto.twoja_przegladarka_nie_ob', { defaultValue: "Twoja przeglądarka nie obsługuje powiadomień Firebase PUSH." }) }));
        return null;
      }

      const swPath = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`.replace(/\/+/g, '/');
      let registration = await navigator.serviceWorker.getRegistration(swPath);
      
      if (!registration) {
        console.log('Registering new service worker:', swPath);
        registration = await navigator.serviceWorker.register(swPath);
      }

      const token = await getToken(msg, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('FCM Token obtained:', token);
        await this.saveTokenToFirestore(token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  },

  async saveTokenToFirestore(token: string) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: serverTimestamp(),
        platform: Capacitor.getPlatform(),
        isNative: Capacitor.isNativePlatform()
      }, { merge: true });

      console.log('FCM token saved to Firestore for user:', user.uid);
    } catch (error) {
      console.error('Error saving FCM token to Firestore:', error);
    }
  },

  listenForegroundMessages(callback: (payload: any) => void) {
    messaging().then(msg => {
      if (!msg) return;
      onMessage(msg, (payload) => {
        console.log('Foreground FCM Message received:', payload);
        callback(payload);
      });
    }).catch(err => {
      console.warn('Foreground messaging listener setup failed:', err);
    });
  },

  async sendHypoProtectionAlert() {
    const title = i18n.t('auto.ochrona_przed_hipo', { defaultValue: "Ochrona przed hipo (AI)" });
    const body = i18n.t('auto.uwaga_glikosense_przewiduje_hipo', { defaultValue: "Ostrzeżenie: GlikoSense przewiduje spadek poniżej normy (hipoglikemia)!" });
    
    if (Capacitor.isNativePlatform()) {
      await this.initChannels();
      let perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') {
        perms = await LocalNotifications.requestPermissions();
      }
      if (perms.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: 887,
              schedule: { at: new Date(Date.now() + 500) },
              channelId: 'gliko_glucose_alerts_v25',
              sound: 'status_clear.mp3',
              attachments: null,
              actionTypeId: '',
              extra: null
            }
          ]
        });
      }
    } else {
      if (window.Notification && window.Notification.permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
             registration.showNotification(title, {
              body,
              icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/')
            });
          }
        } catch (e) { console.warn(e); }
      }
    }
  },

  async scheduleLocalNotification(title: string, body: string, delayMinutes: number, id?: number) {
    const notifId = id || Math.floor(Date.now() % 1000000);
    const scheduledTime = new Date(Date.now() + Math.max(1, delayMinutes) * 60 * 1000);
    if (Capacitor.isNativePlatform()) {
      await this.initChannels();
      let perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') {
        perms = await LocalNotifications.requestPermissions();
      }
      if (perms.display === 'granted') {
        try {
          await LocalNotifications.schedule({
            notifications: [
              {
                title,
                body,
                id: notifId,
                schedule: { at: scheduledTime },
                channelId: 'glikocontrol_reminders_v1',
                sound: 'status_clear.mp3',
                attachments: null,
                actionTypeId: '',
                extra: null
              }
            ]
          });
        } catch (e) {
          console.warn('[NotificationService] Failed scheduling local notification:', e);
        }
      }
    } else {
      if (window.Notification && window.Notification.permission === 'granted') {
        setTimeout(async () => {
          try {
            const registration = await navigator.serviceWorker.ready;
            if (registration) {
              registration.showNotification(title, {
                body,
                icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/')
              });
            }
          } catch (e) { console.warn(e); }
        }, Math.max(1, delayMinutes) * 60 * 1000);
      }
    }
  },

  _liveTimerInterval: null as any,

  async startOngoingTimerNotification(targetTime: number, totalMinutes: number, bolusUnits?: number) {
    if (this._liveTimerInterval) {
      clearInterval(this._liveTimerInterval);
      this._liveTimerInterval = null;
    }

    const roundedTotalMin = Math.round(Number(totalMinutes) || 0);
    const roundedUnits = bolusUnits !== undefined && bolusUnits !== null && !isNaN(Number(bolusUnits))
      ? Number(bolusUnits).toFixed(1).replace(/\.0$/, '')
      : '';
    const unitsStr = roundedUnits ? ` (${roundedUnits} j.)` : '';

    const finishTitle = i18n.t('bolus.reminder_title', { defaultValue: 'Czas na posiłek! 🍽️' });
    const finishBody = i18n.t('bolus.reminder_body', {
      minutes: roundedTotalMin,
      defaultValue: `Minęło ${roundedTotalMin} minut od bolusa. Insulina zaczęła działać – możesz zjeść posiłek!`
    });

    // 1. ZAWSZE planujemy natywne powiadomienie alarmowe w systemie Android DOKŁADNIE na moment zakończenia (targetTime)
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 778,
              title: finishTitle,
              body: finishBody,
              schedule: { at: new Date(targetTime) },
              channelId: 'glikocontrol_reminders_v1',
              sound: 'status_clear.mp3',
              ongoing: false,
              autoCancel: true
            }
          ]
        });
      } catch (e) {
        console.warn('Failed to schedule finish pre-bolus notification:', e);
      }
    }

    const updateNotification = async () => {
      const now = Date.now();
      const remainingSec = Math.max(0, Math.round((targetTime - now) / 1000));
      const remainingMin = Math.max(1, Math.ceil(remainingSec / 60));

      if (remainingSec <= 0) {
        if (this._liveTimerInterval) {
          clearInterval(this._liveTimerInterval);
          this._liveTimerInterval = null;
        }

        if (!Capacitor.isNativePlatform() && window.Notification && window.Notification.permission === 'granted') {
          try {
            new window.Notification(finishTitle, { body: finishBody });
          } catch (e) {}
        }
        return;
      }

      const ongoingTitle = `⏱️ Czas do posiłku: ${remainingMin} min${unitsStr}`;
      const ongoingBody = `Odliczanie przedposiłkowe w toku... Insulina zaczyna działać.`;

      if (!Capacitor.isNativePlatform() && window.Notification && window.Notification.permission === 'granted') {
        try {
          new window.Notification(ongoingTitle, { body: ongoingBody });
        } catch (e) {}
      }
    };

    // 2. Wyświetl powiadomienie
    await updateNotification();

    // 3. Aktualizuj co 30 sekund na Web
    this._liveTimerInterval = setInterval(updateNotification, 30000);
  },

  async cancelOngoingTimerNotification() {
    if (this._liveTimerInterval) {
      clearInterval(this._liveTimerInterval);
      this._liveTimerInterval = null;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: 777 }, { id: 778 }] });
      } catch (e) {}
    }
  },

  async scheduleDeviceReminder(title: string, body: string, id?: number) {
    if (Capacitor.isNativePlatform()) {
      await this.initChannels();
      let perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') {
        perms = await LocalNotifications.requestPermissions();
      }
      if (perms.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: id || Date.now(),
              schedule: { at: new Date(Date.now() + 1000) },
              channelId: 'glikocontrol_reminders_v1',
              attachments: null,
              actionTypeId: '',
              extra: null
            }
          ]
        });
      }
    } else {
      if (window.Notification && window.Notification.permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
             registration.showNotification(title, {
              body,
              icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/')
            });
          }
        } catch (e) { console.warn(e); }
      }
    }
  },

  async updateDeviceReminders(settings: any) {
    if (!settings) return;
    try {
      const notificationsToSchedule: any[] = [];
      const now = Date.now();

      // 1. Wymiana sensora (12h przed wygaśnięciem)
      if (settings.sensorChangeDate && settings.sensorDurationDays) {
        const expiryDate = settings.sensorChangeDate + (settings.sensorDurationDays * 24 * 60 * 60 * 1000);
        const reminderDate = new Date(expiryDate - (12 * 60 * 60 * 1000));
        
        if (reminderDate.getTime() > now) {
          notificationsToSchedule.push({
            id: 998,
            title: 'Wymiana sensora',
            body: i18n.t('auto.twoj_sensor_wygasa_za_12_godzi', { defaultValue: 'Twój sensor wygasa za 12 godzin!' }),
            schedule: { at: reminderDate },
            channelId: 'glikocontrol_reminders_v1',
            attachments: null,
            actionTypeId: '',
            extra: null
          });
        } else if (now >= reminderDate.getTime() && now < expiryDate) {
          const notifKey = `notif_12h_sensor_${new Date(expiryDate).toDateString()}`;
          if (!localStorage.getItem(notifKey)) {
            localStorage.setItem(notifKey, 'true');
            this.scheduleDeviceReminder('Wymiana sensora', i18n.t('auto.twoj_sensor_wygasa_za_12_godzi', { defaultValue: 'Twój sensor wygasa za mniej niż 12 godzin!' }));
          }
        }
      }

      // 2. Wymiana wkłucia (12h przed wygaśnięciem)
      if (settings.infusionSetChangeDate && settings.infusionSetDurationDays) {
        const expiryDate = settings.infusionSetChangeDate + (settings.infusionSetDurationDays * 24 * 60 * 60 * 1000);
        const reminderDate = new Date(expiryDate - (12 * 60 * 60 * 1000));
        
        if (reminderDate.getTime() > now) {
          notificationsToSchedule.push({
            id: 999,
            title: i18n.t('auto.wymiana_wklucia', { defaultValue: 'Wymiana wkłucia' }),
            body: i18n.t('auto.twoje_wklucie_wygasa_za_12_god', { defaultValue: 'Twoje wkłucie wygasa za 12 godzin!' }),
            schedule: { at: reminderDate },
            channelId: 'glikocontrol_reminders_v1',
            attachments: null,
            actionTypeId: '',
            extra: null
          });
        } else if (now >= reminderDate.getTime() && now < expiryDate) {
          const notifKey = `notif_12h_infusion_${new Date(expiryDate).toDateString()}`;
          if (!localStorage.getItem(notifKey)) {
            localStorage.setItem(notifKey, 'true');
            this.scheduleDeviceReminder(i18n.t('auto.wymiana_wklucia', { defaultValue: 'Wymiana wkłucia' }), i18n.t('auto.twoje_wklucie_wygasa_za_12_god', { defaultValue: 'Twoje wkłucie wygasa za mniej niż 12 godzin!' }));
          }
        }
      }

      if (Capacitor.isNativePlatform()) {
        await this.initChannels();
        let perms = await LocalNotifications.checkPermissions();
        if (perms.display !== 'granted') {
          perms = await LocalNotifications.requestPermissions();
        }
        if (perms.display === 'granted') {
          await LocalNotifications.cancel({ notifications: [{ id: 998 }, { id: 999 }] }).catch(() => {});
          if (notificationsToSchedule.length > 0) {
            await LocalNotifications.schedule({ notifications: notificationsToSchedule });
            console.log('[NotificationService] Zaplanowano natywne powiadomienia 12h o sprzęcie:', notificationsToSchedule);
          }
        }
      }
    } catch (e) {
      console.error('Failed to schedule device reminders', e);
    }
  },

  _webReminderInterval: null as any,
  _lastTriggeredReminders: {} as Record<string, number>,

  async scheduleMedicationReminders(medications: any[]) {
    const activeMeds = (medications || []).filter((m: any) => m && m.active && Array.isArray(m.reminders) && m.reminders.length > 0);

    // 1. Android Native (Capacitor LocalNotifications)
    if (Capacitor.isNativePlatform()) {
      try {
        const perms = await LocalNotifications.checkPermissions();
        if (perms.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') return;
        }

        const idsToCancel = Array.from({ length: 200 }, (_, i) => ({ id: 2000 + i }));
        await LocalNotifications.cancel({ notifications: idsToCancel }).catch(() => {});

        const notificationsToSchedule: any[] = [];
        let notifId = 2000;

        for (const med of activeMeds) {
          for (const rem of med.reminders) {
            const timeStr = typeof rem === 'string' ? rem : (rem.time || rem.hour || '');
            if (!timeStr || !timeStr.includes(':')) continue;
            const [hours, minutes] = timeStr.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) continue;

            const now = new Date();
            const scheduledTime = new Date();
            scheduledTime.setHours(hours, minutes, 0, 0);

            if (scheduledTime.getTime() <= now.getTime()) {
              scheduledTime.setDate(scheduledTime.getDate() + 1);
            }

            const doseStr = med.dosage ? `Dawka: ${med.dosage}` : '1 dawka';
            const stockStr = typeof med.stockQuantity === 'number' ? ` • Zapas: ${med.stockQuantity} szt.` : '';

            notificationsToSchedule.push({
              id: notifId++,
              title: `💊 Czas na lek: ${med.name}`,
              body: `${doseStr}${stockStr}`,
              schedule: { 
                at: scheduledTime, 
                repeats: true, 
                every: 'day',
                allowWhileIdle: true // Budzi urządzenie z trybu Doze/uśpienia o wyznaczonej minucie
              },
              channelId: 'glikocontrol_medications_v2',
              attachments: null,
              actionTypeId: '',
              extra: { medicationId: med.id, medicationName: med.name }
            });
          }
        }

        if (notificationsToSchedule.length > 0) {
          await LocalNotifications.schedule({ notifications: notificationsToSchedule });
          console.log(`[NotificationService] Scheduled ${notificationsToSchedule.length} native medication reminders.`);
        }
      } catch (e) {
        console.error('Failed to schedule native medication reminders', e);
      }
    }

    // 2. Web / PWA (Browser Web Notifications API & Foreground Timer)
    if (this._webReminderInterval) {
      clearInterval(this._webReminderInterval);
    }
    this._webReminderInterval = setInterval(() => {
      this._checkWebReminders(activeMeds);
    }, 30000);
  },

  _checkWebReminders(activeMeds: any[]) {
    const now = new Date();
    const currentHHMM = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const todayDateStr = now.toISOString().split('T')[0];

    for (const med of activeMeds) {
      for (const rem of med.reminders) {
        const timeStr = typeof rem === 'string' ? rem : (rem.time || rem.hour || '');
        if (timeStr === currentHHMM) {
          const triggerKey = `${med.id}_${todayDateStr}_${timeStr}`;
          const lastTriggered = this._lastTriggeredReminders[triggerKey] || 0;
          if (Date.now() - lastTriggered > 60000) {
            this._lastTriggeredReminders[triggerKey] = Date.now();
            this.sendMedicationAlert(med);
          }
        }
      }
    }
  },

  sendMedicationAlert(med: any) {
    const title = `💊 Czas na lek: ${med.name}`;
    const body = `${med.dosage ? `Dawka: ${med.dosage}` : '1 dawka'}${typeof med.stockQuantity === 'number' ? ` • Zapas: ${med.stockQuantity} szt.` : ''}`;

    toast(body ? `${title}\n${body}` : title, {
      icon: '💊',
      duration: 15000,
      position: 'top-center',
      style: { border: '2px solid #0d9488', padding: '16px', color: '#0f172a', fontWeight: 'bold' }
    });

    if (window.Notification && window.Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              body,
              icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/'),
              vibrate: [200, 100, 200],
              tag: `med_${med.id}_${Date.now()}`
            } as any);
          });
        } else {
          new Notification(title, { body, icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/') });
        }
      } catch(e) {
        console.warn('Web notification error:', e);
      }
    }
  },

  setupForegroundListener() {
    this.setupForegroundNotificationHandler();
  },

  setupForegroundNotificationHandler() {
    this.listenForegroundMessages((payload) => {
      const title = payload.notification?.title || i18n.t('auto.alerty_glikemii', { defaultValue: 'Alert Glikemii' });
      const body = payload.notification?.body || '';

      toast(body ? `${title}: ${body}` : title, {
        icon: '🚨',
        duration: 20000, 
        position: 'top-center',
        style: { border: '2px solid #f43f5e', padding: '16px', color: '#1e293b', fontWeight: 'bold' }
      });

      const apkPref = localStorage.getItem('apkSystemNotificationsEnabled');
      if (apkPref !== 'false' && window.Notification && window.Notification.permission === 'granted') {
        try {
          const registration = navigator.serviceWorker.ready;
          registration.then(reg => {
            if (reg) {
              reg.showNotification(title, {
                body,
                icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/'),
                vibrate: [200, 100, 200],
                tag: 'glikosense-alert'
              } as any);
            } else {
              new window.Notification(title, { body });
            }
          }).catch(() => {
            try { new window.Notification(title, { body }) } catch(err) {}
          });
        } catch(e) {
          try { new window.Notification(title, { body }) } catch(err) {}
        }
      }
    });
  },

  async triggerGlucoseAlarm(isHigh: boolean, value: number) {
    const title = isHigh ? i18n.t('auto.wysoki_cukier', { defaultValue: 'Wysoki Cukier!' }) : i18n.t('auto.niski_cukier', { defaultValue: 'Niski Cukier!' });
    if (Capacitor.isNativePlatform()) {
      try {
        await NotificationBridge.triggerNativeGlucoseAlert({
          title,
          body,
          isHigh,
          value
        });
      } catch (e) {
        console.warn('[NotificationService] Failed to trigger native glucose alert:', e);
      }
    } else {
      // Wersja web/PWA (Browser Web Notifications API)
      const apkPref = localStorage.getItem('apkSystemNotificationsEnabled');
      if (apkPref !== 'false' && window.Notification && window.Notification.permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
            registration.showNotification(title, {
              body,
              icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/'),
              vibrate: [500, 250, 500, 250, 500],
              tag: 'glikosense-critical-alert'
            } as any);
          } else {
            new window.Notification(title, { body });
          }
        } catch(e) {
          try { new window.Notification(title, { body }) } catch(err) {}
        }
      }
    }
  }
};
