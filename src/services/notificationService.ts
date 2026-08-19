import { toast } from "react-hot-toast";
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import i18n from "../i18n";
import { stopAllAudio } from '../lib/audioUtils';

const VAPID_KEY = 'BDpTWMeEWqqbg9i1S4P33GC51S2TgPs_cozqFLQrYJl0y6RXMXUym50gG-1d3xvGsSH7EjVGRyERPQ1i-K2h3D4';

export const notificationService = {
  async initChannels() {
    if (Capacitor.isNativePlatform()) {
      try {
        try { await LocalNotifications.deleteChannel({ id: 'glucose_alerts_v10' }); } catch(e) {}
        try { await LocalNotifications.deleteChannel({ id: 'glucose_alerts_v11' }); } catch(e) {}
        try { await LocalNotifications.deleteChannel({ id: 'glucose_alerts_v12' }); } catch(e) {}
        try { await LocalNotifications.deleteChannel({ id: 'glucose_alerts_v13' }); } catch(e) {}
        try { await LocalNotifications.deleteChannel({ id: 'glucose_alerts_v14' }); } catch(e) {}
        
        await LocalNotifications.createChannel({
          id: 'glucose_alerts_v15',
          name: 'Krytyczne Alerty Glikemii',
          description: 'Powiadomienia o niskim lub wysokim poziomie cukru z dźwiękiem MP3',
          importance: 5,
          visibility: 1,
          sound: 'status_clear.mp3',
          vibration: true
        });

        await LocalNotifications.createChannel({
          id: 'glikocontrol_reminders_v1',
          name: 'Przypomnienia GlikoControl',
          description: 'Powiadomienia o lekach, wymianach osprzętu i prognozach',
          importance: 4,
          visibility: 1,
          vibration: true
        });

        // Register Action Button (Wycisz) directly on Android Notification Bar
        await LocalNotifications.registerActionTypes({
          types: [
            {
              id: 'GLUCOSE_ALARM_ACTIONS',
              actions: [
                {
                  id: 'snooze_alarm',
                  title: '🔕 Wycisz alarm'
                }
              ]
            }
          ]
        }).catch(() => {});

        // Listen to notification clicks or action button clicks on Android notification bar
        if (!(window as any).__localNotifListenerRegistered) {
          (window as any).__localNotifListenerRegistered = true;
          LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
            console.log('[NotificationService] Action clicked on Android notification bar:', action);
            const isHigh = action.notification.id === 888 || action.notification.extra?.isHigh;
            const snoozeMs = isHigh ? 30 * 60 * 1000 : 15 * 60 * 1000;
            const snoozeUntil = Date.now() + snoozeMs;

            // Set snooze flag immediately when notification is clicked/snoozed from Android status bar
            localStorage.setItem('glucose_alarm_snooze_until', snoozeUntil.toString());
            localStorage.setItem('glucose_alarm_snooze_type', isHigh ? 'high' : 'low');

            // Stop any active playing audio immediately
            stopAllAudio();
          });
        }
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
              channelId: 'glucose_alerts_v15',
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

  async scheduleMedicationReminders(medications: any[]) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') return;

      const idsToCancel = Array.from({ length: 100 }, (_, i) => ({ id: 2000 + i }));
      await LocalNotifications.cancel({ notifications: idsToCancel }).catch(() => {});

      const notificationsToSchedule: any[] = [];
      let notifId = 2000;

      const activeMeds = (medications || []).filter((m: any) => m.active && m.reminders?.length > 0);

      for (const med of activeMeds) {
        for (const rem of med.reminders) {
          if (!rem.time) continue;
          const [hours, minutes] = rem.time.split(':').map(Number);
          const now = new Date();
          const scheduledTime = new Date();
          scheduledTime.setHours(hours, minutes, 0, 0);

          if (scheduledTime.getTime() <= now.getTime()) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
          }

          notificationsToSchedule.push({
            id: notifId++,
            title: `⏰ Czas na lek: ${med.name}`,
            body: `Dawka: ${rem.dose || med.dose || '1 szt.'}`,
            schedule: { at: scheduledTime, repeats: true, every: 'day' },
            channelId: 'glikocontrol_reminders_v1',
            attachments: null,
            actionTypeId: '',
            extra: { medicationId: med.id }
          });
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.log(`Scheduled ${notificationsToSchedule.length} medication reminders.`);
      }
    } catch (e) {
      console.error('Failed to schedule medication reminders', e);
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
    const body = `${i18n.t('auto.twoj_aktualny_poziom_cukru_to', { defaultValue: 'Twój aktualny poziom cukru to' })} ${value} mg/dL.`;

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
              id: isHigh ? 888 : 889,
              channelId: 'glucose_alerts_v15',
              sound: 'status_clear.mp3',
              attachments: null,
              actionTypeId: 'GLUCOSE_ALARM_ACTIONS',
              extra: { isHigh, value }
            }
          ]
        });
      }
    } else {
      // Wersja web/PWA
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
