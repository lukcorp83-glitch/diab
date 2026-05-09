import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Connectivity fix for restricted environments
// Connectivity fix for restricted environments
// Try to get databaseId from environment or fallback to (default)
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)';

console.log(`[Firebase Initializing] Project: ${firebaseConfig.projectId}, Requested DB: ${databaseId}`);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId);

// Test connection to Firestore
const testConnection = async () => {
    try {
        // Use a simple path for basic connectivity check
        const testPath = 'connection_tests/ping';
        
        console.log(`[Firestore Test] Starting test on DB: ${databaseId}, Path: ${testPath}`);
        const ref = doc(db, testPath);
        await getDocFromServer(ref);
        console.log(`[Firestore Test] ${databaseId} SUCCESS - Read operation permitted`);
    } catch (error: any) {
        console.error(`[Firestore Test] ${databaseId} FAILED - Details:`, {
            message: error.message,
            code: error.code,
            name: error.name
        });
        
        // If we failed with permission error on a custom DB, maybe we should've used (default)?
        if (databaseId !== '(default)' && (error.message?.includes('permission') || error.message?.includes('Permission'))) {
            console.warn(`[Firestore Test] Permission error on '${databaseId}'. Retrying with '(default)'...`);
            try {
                const dbDefault = initializeFirestore(app, { experimentalForceLongPolling: true }, '(default)');
                await getDocFromServer(doc(dbDefault, 'connection_tests/ping'));
                console.log("[Firestore Test] '(default)' DB SUCCESS - Consider updating VITE_FIREBASE_DATABASE_ID");
            } catch (e: any) {
                console.error("[Firestore Test] '(default)' DB also failed:", e.message);
            }
        }
    }
};

testConnection();

export const messaging = async () => {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
};

console.log("Firebase initialized for project:", firebaseConfig.projectId);
