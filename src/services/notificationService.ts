import { getToken, onMessage } from 'firebase/messaging';
import { messaging, auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const VAPID_KEY = 'BDpTWMeEWqqbg9i1S4P33GC51S2TgPs_cozqFLQrYJl0y6RXMXUym50gG-1d3xvGsSH7EjVGRyERPQ1i-K2h3D4';

export const notificationService = {
  async requestPermission(): Promise<string | null> {
    try {
      if (!('Notification' in window)) {
        alert("Twoja przeglądarka (lub urządzenie) nie obsługuje powiadomień. Na iOS upewnij się, że masz system w wersji 16.4+ oraz aplikację dodaną do ekranu głównego.");
        return null;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        return await this.registerToken();
      }
      alert(`Odmowa dostępu do powiadomień. 
Aby to naprawić:
- Android: Ustawienia -> Aplikacje lub Chrome -> Uprawnienia -> Powiadomienia.
- iOS (iPhone): Ustawienia -> GlikoControl (lub Safari) -> Powiadomienia -> 'Zezwalaj'.`);
      return null;
    } catch (error) {
      alert(`Błąd podczas żądania uprawnień: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Permission request failed:', error);
      return null;
    }
  },

  async registerToken(): Promise<string | null> {
    try {
      const msg = await messaging();
      if (!msg) {
        alert("Twoja przeglądarka nie obsługuje powiadomień Firebase PUSH.");
        return null;
      }

      // Check if service worker is already registered
      let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      
      if (!registration) {
        console.log('Registering new service worker...');
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
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
        alert("Dostęp do powiadomień został zablokowany. Zresetuj uprawnienia w ustawieniach przeglądarki.");
      } else if (errMsg.includes('bad HTTP response code (404)')) {
        alert("Błąd serwera (404) przy pobieraniu pliku powiadomień. Spróbuj odświeżyć stronę.");
      } else {
        alert(`Błąd rejestracji tokena Push: ${errMsg}`);
      }
      return null;
    }
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
    const msg = await messaging();
    if (!msg) return;

    onMessage(msg, async (payload) => {
      console.log('Message received in foreground:', payload);
      
      if (Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(payload.notification?.title || 'GlikoSense', {
          body: payload.notification?.body,
          icon: '/pwa-icon.svg',
          vibrate: [200, 100, 200],
          tag: 'glikosense-alert'
        } as any);
      }
    });
  }
};
