import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Safety check for config
if (!firebaseConfig || !firebaseConfig.projectId) {
  console.error("Firebase config is missing or invalid! Check firebase-applet-config.json");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  databaseId: firebaseConfig.firestoreDatabaseId || undefined
});

console.log("Firebase initialized for project:", firebaseConfig.projectId);
