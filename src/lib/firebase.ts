import { initializeFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';
import { getApps, getApp, initializeApp } from 'firebase/app';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Using initializeFirestore with long polling for better reliability in some environments
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    host: 'firestore.googleapis.com',
    ssl: true,
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

async function testConnection() {
    try {
        // Try to fetch a non-existent doc from server to verify connectivity
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
        console.log('[Firestore] Connection verified');
        updateConnectionStatus(true);
    } catch (error: any) {
        if (error.message?.includes('offline')) {
            console.error("[Firestore] Connection issue: Client appears to be offline.");
            updateConnectionStatus(false);
        } else {
            // Permission errors etc still mean we reached the server
            console.log('[Firestore] Server reached (status: ' + (error.code || 'connected') + ')');
            updateConnectionStatus(true);
        }
    }
}
testConnection();

// Enable offline persistence with better error handling
const enablePersistence = async () => {
    if (typeof window === 'undefined') return;
    try {
        await enableMultiTabIndexedDbPersistence(db);
        console.log('[Firestore] Multi-tab persistence enabled');
    } catch (err: any) {
        if (err.code === 'failed-precondition') {
            console.warn('[Firestore] Persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
            console.warn('[Firestore] Persistence failed: Browser not supported');
        } else {
            console.error('[Firestore] Persistence unexpected error:', err.message);
        }
    }
};

enablePersistence();

export const messaging = async () => {
    if (typeof window === 'undefined') return null;
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
};

console.log("Firebase initialized for project:", firebaseConfig.projectId);
