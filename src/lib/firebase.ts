import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Using firestoreDatabaseId from config if present, otherwise default
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');

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
