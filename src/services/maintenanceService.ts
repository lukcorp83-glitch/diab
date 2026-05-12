import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  limit 
} from 'firebase/firestore';

export const maintenanceService = {
  /**
   * Cleans up old data from Firestore to keep usage within free tier limits.
   * Runs client-side when the user logs in.
   */
  async cleanupOldData(uid: string, days: number = 30) {
    if (!uid) return;

    const metadataKey = `last_maintenance_${uid}`;
    const lastRun = localStorage.getItem(metadataKey);
    const now = Date.now();

    // Only run maintenance once every 24 hours per user
    if (lastRun && now - parseInt(lastRun) < 24 * 60 * 60 * 1000) {
      return;
    }

    console.log(`[Maintenance] Starting data cleanup for user: ${uid}`);
    
    try {
      const threshold = now - (days * 24 * 60 * 60 * 1000);
      
      // 1. Clean up logs
      await this.cleanupCollection(
        collection(db, 'artifacts', 'diacontrolapp', 'users', uid, 'logs'),
        threshold
      );

      // 2. Clean up AI Reports (they can be large)
      await this.cleanupCollection(
        collection(db, 'artifacts', 'diacontrolapp', 'users', uid, 'aiReports'),
        threshold
      );

      localStorage.setItem(metadataKey, now.toString());
      console.log(`[Maintenance] Cleanup finished.`);
    } catch (error) {
      console.error("[Maintenance] Error during cleanup:", error);
    }
  },

  async cleanupCollection(colRef: any, threshold: number) {
    // Limit to 100 deletions per run to stay well within single batch and time limits
    const q = query(colRef, where('timestamp', '<', threshold), limit(100));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
    console.log(`[Maintenance] Deleted ${snapshot.size} expired documents from ${colRef.path}`);
  }
};
