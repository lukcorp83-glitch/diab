import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

// Safety check for config
if (!firebaseConfig || !firebaseConfig.projectId) {
  console.error("Firebase config is missing or invalid! Check firebase-applet-config.json");
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, (firebaseConfig as any).firestoreDatabaseId || '(default)');

export const messaging = async () => {
    const supported = await isSupported();
    return supported ? getMessaging(app) : null;
};

console.log("Firebase initialized for project:", firebaseConfig.projectId);
