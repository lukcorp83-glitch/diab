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
    experimentalAutoDetectLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId || '(default)');

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
