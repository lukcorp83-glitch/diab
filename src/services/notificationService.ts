import { toast } from "react-hot-toast";
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import i18n from "../i18n";

const VAPID_KEY = 'BDpTWMeEWqqbg9i1S4P33GC51S2TgPs_cozqFLQrYJl0y6RXMXUym50gG-1d3xvGsSH7EjVGRyERPQ1i-K2h3D4';

export const notificationService = {
  async requestPermission(): Promise<string | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        return await this.registerToken();
      }

      if (!window.Notification) {
        toast(i18n.t('auto.twoja_przegladarka_lub_aplikac', { defaultValue: "Twoja przeglądarka lub aplikacja może nie obsługiwać systemowych powiadomień Push. Krytyczne alerty będą wyświetlane wewnątrz aplikacji." }), { icon: 'ℹ️', duration: 8000 });
        return null;
      }
      const permission = await window.Notification.requestPermission();
      if (permission === 'granted') {
        return await this.registerToken();
      }
      alert(i18n.t('auto.odmowa_dostepu_do_powiadomien', { defaultValue: "Odmowa dostępu do powiadomień.\nAby to naprawić:\n- Android: Ustawienia -> Aplikacje -> Uprawnienia -> Powiadomienia.\n- iOS: Ustawienia -> GlikoControl -> Powiadomienia -> 'Zezwalaj'." }));
      return null;
    } catch (error) {
      console.error('Permission request failed:', error);
      toast(i18n.t('auto.nie_udalo_sie_aktywowac_powiad', { defaultValue: "Nie udało się aktywować powiadomień systemowych. Alerty będą wyświetlane jako komunikaty wewnątrz aplikacji." }), { icon: 'ℹ️' });
      return null;
    }
  },

  async registerToken(): Promise<string | null> {
    try {
      if (Capacitor.isNativePlatform()) {
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
        alert(i18n.t('auto.twoja_przegladarka_nie_obslugu', { defaultValue: "Twoja przeglądarka nie obsługuje powiadomień Firebase PUSH." }));
        return null;
      }

      // Use base URL for service worker to handle subdirectories (like GitHub Pages)
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
        console.log('FCM Token:', token);
        await this.saveTokenToFirestore(token);
        return token;
      }
      return null;
    } catch (error) {
      console.error('Token registration failed:', error);
      // More descriptive error for common issues
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('Permission denied')) {
        alert(i18n.t('auto.dostep_do_powiadomien_zostal_z', { defaultValue: "Dostęp do powiadomień został zablokowany. Zresetuj uprawnienia w ustawieniach przeglądarki." }));
      } else if (errMsg.includes('bad HTTP response code (404)')) {
        alert(i18n.t('auto.blad_serwera_404_przy_pobieran', { defaultValue: "Błąd serwera (404) przy pobieraniu pliku powiadomień. Spróbuj odświeżyć stronę." }));
      } else {
        alert(`Błąd rejestracji tokena Push: ${errMsg}`);
      }
      return null;
    }
  },

  async updateDeviceReminders(settings: any) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') return;

      const notificationsToSchedule = [];

      if (settings.sensorChangeDate && settings.sensorDurationDays) {
        const expiryDate = settings.sensorChangeDate + (settings.sensorDurationDays * 24 * 60 * 60 * 1000);
        const reminderDate = new Date(expiryDate - (12 * 60 * 60 * 1000));
        
        if (reminderDate.getTime() > Date.now()) {
          notificationsToSchedule.push({
            id: 998,
            title: 'Wymiana sensora',
            body: i18n.t('auto.twoj_sensor_wygasa_za_12_godzi', { defaultValue: "Twój sensor wygasa za 12 godzin!" }),
            schedule: { at: reminderDate },
            sound: null,
            attachments: null,
            actionTypeId: '',
            extra: null
          });
        }
      }

      if (settings.infusionSetChangeDate && settings.infusionSetDurationDays) {
        const expiryDate = settings.infusionSetChangeDate + (settings.infusionSetDurationDays * 24 * 60 * 60 * 1000);
        const reminderDate = new Date(expiryDate - (12 * 60 * 60 * 1000));
        
        if (reminderDate.getTime() > Date.now()) {
          notificationsToSchedule.push({
            id: 999,
            title: i18n.t('auto.wymiana_wklucia', { defaultValue: "Wymiana wkłucia" }),
            body: i18n.t('auto.twoje_wklucie_wygasa_za_12_god', { defaultValue: "Twoje wkłucie wygasa za 12 godzin!" }),
            schedule: { at: reminderDate },
            sound: null,
            attachments: null,
            actionTypeId: '',
            extra: null
          });
        }
      }

      await LocalNotifications.cancel({ notifications: [{ id: 998 }, { id: 999 }] }).catch(() => {});
      
      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      }
    } catch (e) {
      console.error('Failed to schedule device reminders', e);
    }
  },

  async scheduleLocalNotification(title: string, body: string, delayMinutes: number) {
    const delayMs = delayMinutes * 60 * 1000;
    toast.success(`Przypomnienie ustawione na za ${delayMinutes} minut! ⏰`);

    if (Capacitor.isNativePlatform()) {
      const scheduleDate = new Date(Date.now() + delayMs);
      await LocalNotifications.requestPermissions();
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: Math.floor(Math.random() * 100000),
            schedule: { at: scheduleDate },
            sound: null,
            attachments: null,
            actionTypeId: "",
            extra: null
          }
        ]
      });
      return;
    }

    if (!window.Notification) {
      toast.error(i18n.t('auto.powiadomienia_nie_sa_obslugiwa', { defaultValue: "Powiadomienia nie są obsługiwane na tym urządzeniu." }));
      return;
    }

    if (window.Notification && window.Notification.permission !== 'granted') {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error(i18n.t('auto.brak_uprawnien_do_powiadomien', { defaultValue: "Brak uprawnień do powiadomień. Nie można ustawić przypomnienia." }));
        return;
      }
    }

    setTimeout(async () => {
      // Wibracje fallback
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
      
      // Pokazujemy zawsze wyraźny toast w aplikacji
      toast(body, { 
        icon: '🍽️', 
        duration: 20000, 
        position: 'top-center',
        style: { border: '2px solid #6366f1', padding: '16px', color: '#1e293b', fontWeight: 'bold' }
      });

      const apkPref = localStorage.getItem('apkSystemNotificationsEnabled');
      if (apkPref !== 'false') {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
             registration.showNotification(title, {
              body,
              icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/'),
              vibrate: [200, 100, 200, 100, 200],
              tag: 'glikocontrol-reminder',
              requireInteraction: true
            } as any);
          } else {
             new window.Notification(title, { body });
          }
        } catch (e) {
          console.log("Fallback powiadomienia", e);
          try {
             new window.Notification(title, { body });
          } catch(err) {}
        }
      }
    }, delayMs);
  },

  async updateStickyNotification(glucoseText: string, trendArrow: string, iob: number, cob: number, delta: number) {
    // Usunięto na życzenie użytkownika (skasowano powiadomienie glikemii na belce)
  },

  async saveTokenToFirestore(token: string) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, 'fcm_tokens', user.uid), {
        token,
        updatedAt: serverTimestamp(),
        userId: user.uid,
        email: user.email,
        platform: 'web'
      }, { merge: true });
    } catch (e) {
      console.error('Error saving FCM token:', e);
    }
  },

  async setupForegroundListener() {
    if (Capacitor.isNativePlatform()) {
      // Listeners are added inside registerToken() to avoid duplicates
      return;
    }

    const msg = await messaging();
    if (!msg) return;

    onMessage(msg, async (payload) => {
      console.log('Message received in foreground:', payload);
      
      const title = payload.notification?.title || 'GlikoSense';
      const body = payload.notification?.body || '';

      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      
      toast(body, { 
        icon: '⚠️', 
        duration: 20000, 
        position: 'top-center',
        style: { border: '2px solid #f43f5e', padding: '16px', color: '#1e293b', fontWeight: 'bold' }
      });

      const apkPref = localStorage.getItem('apkSystemNotificationsEnabled');
      if (apkPref !== 'false' && window.Notification && window.Notification.permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
            registration.showNotification(title, {
              body,
              icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/'),
              vibrate: [200, 100, 200],
              tag: 'glikosense-alert'
            } as any);
          } else {
            new window.Notification(title, { body });
          }
        } catch(e) {
          try { new window.Notification(title, { body }) } catch(err) {}
        }
      }
    });
  }
};
