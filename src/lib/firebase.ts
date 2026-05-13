import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app);

// Enable offline persistence with better error handling
const enablePersistence = async () => {
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

// Connectivity fix removed to prevent 10s timeouts

export const messaging = async () => {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
};

console.log("Firebase initialized for project:", firebaseConfig.projectId);
