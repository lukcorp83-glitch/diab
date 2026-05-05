import { getToken, onMessage } from 'firebase/messaging';
import { messaging, auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const VAPID_KEY = 'BDpTWMeEWqqbg9i1S4P33GC51S2TgPs_cozqFLQrYJl0y6RXMXUym50gG-1d3xvGsSH7EjVGRyERPQ1i-K2h3D4';

export const notificationService = {
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        return await this.registerToken();
      }
      return false;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  },

  async registerToken() {
    try {
      const msg = await messaging();
      if (!msg) return false;

      const token = await getToken(msg, { vapidKey: VAPID_KEY });
      if (token) {
        console.log('FCM Token:', token);
        await this.saveTokenToFirestore(token);
        return token;
      }
      return false;
    } catch (error) {
      console.error('Token registration failed:', error);
      return false;
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

    onMessage(msg, (payload) => {
      console.log('Message received in foreground:', payload);
      // You can show a custom UI or a toast here
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'GlikoSense', {
          body: payload.notification?.body,
          icon: '/pwa-icon.svg'
        });
      }
    });
  }
};
