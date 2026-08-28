import { initializeFirestore, persistentLocalCache, memoryLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';
import { getApps, getApp, initializeApp } from 'firebase/app';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Wymuszamy localStorage (browserLocalPersistence) dla autoryzacji, aby ominąć zepsute IndexedDB na telefonach!
setPersistence(auth, browserLocalPersistence).catch(err => console.warn("Failed to set auth persistence", err));

import { Capacitor } from '@capacitor/core';

// Using initializeFirestore with modern persistence API
export const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: Capacitor.isNativePlatform() ? memoryLocalCache() : persistentLocalCache({tabManager: persistentSingleTabManager({})}),
    experimentalForceLongPolling: Capacitor.isNativePlatform() ? true : false
});

// Verification function as per Firestore guidelines
import { doc, getDocFromServer } from 'firebase/firestore';

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
        console.error("[Firestore] Navigator reports offline.");
        updateConnectionStatus(false);
        return false;
    }
    
    try {
        // Try to fetch a non-existent doc from server to verify connectivity
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
        console.log('[Firestore] Connection verified');
        updateConnectionStatus(true);
        return true;
    } catch (error: any) {
        if (error.message?.includes('offline') || error.code === 'unavailable') {
            console.error("[Firestore] Connection issue: Client appears to be offline.", error);
            updateConnectionStatus(false);
            return false;
        } else {
            console.log(`[Firestore] Connection test successful (server reachable, expected ${error.code})`);
            updateConnectionStatus(true);
            return true;
        }
    }
}
testConnection();

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => testConnection());
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

