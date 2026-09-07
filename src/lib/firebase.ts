import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache,
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, GoogleAuthProvider } from 'firebase/auth';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inicjalizujemy autoryzację synchronicznie z wielopoziomową trwałością sesji (IndexedDB + localStorage fallback)
// Zapobiega to wylogowywaniu użytkownika po aktualizacjach OTA/APK i restarcie WebView!
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence]
});
export const googleProvider = new GoogleAuthProvider();

// Inicjalizacja Firestore z obsługą wielu kart (MultipleTabManager) oraz automatycznym fallbackiem Long Polling
export const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: Capacitor.isNativePlatform() 
      ? memoryLocalCache() 
      : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ...(Capacitor.isNativePlatform()
      ? { experimentalForceLongPolling: true }
      : { experimentalAutoDetectLongPolling: true })
});

// Verification function as per Firestore guidelines
export let isFirebaseConnected = false;
const connectionListeners: ((status: boolean) => void)[] = [];

export function onConnectionChange(listener: (status: boolean) => void) {
    connectionListeners.push(listener);
    listener(isFirebaseConnected);
    return () => {
        const index = connectionListeners.indexOf(listener);
        if (index > -1) connectionListeners.splice(index, 1);
    };
}

function updateConnectionStatus(status: boolean) {
    isFirebaseConnected = status;
    connectionListeners.forEach(l => l(status));
}

export async function testConnection() {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
        updateConnectionStatus(false);
        return false;
    }
    
    try {
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
        console.log('[Firestore] Connection verified');
        updateConnectionStatus(true);
        return true;
    } catch (error: any) {
        if (error.message?.includes('offline') || error.code === 'unavailable') {
            updateConnectionStatus(false);
            return false;
        } else {
            updateConnectionStatus(true);
            return true;
        }
    }
}

// Opóźniony start testu połączenia (aby nie blokować pierwszego renderu i dać czas na ustanowienie socketu)
if (typeof window !== 'undefined') {
    setTimeout(() => { testConnection().catch(() => {}); }, 2500);
    window.addEventListener('online', () => testConnection().catch(() => {}));
    window.addEventListener('offline', () => updateConnectionStatus(false));
}

export const messaging = async () => {
    if (typeof window === 'undefined') return null;
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
};

export let analytics: any = null;
isAnalyticsSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log("[Firebase] Analytics initialized");
  }
}).catch(console.error);

console.log("Firebase initialized for project:", firebaseConfig.projectId);

