import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { collection, query, onSnapshot, orderBy, limit, doc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid } from '../lib/utils';
import { LogEntry } from '../types';

export const useAppSubscriptions = (user: any) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const uid = getEffectiveUid(user);

    const unsubs: (() => void)[] = [];

    // Helper for single collection fetching
    const createCollectionSub = (
      pathSuffix: string, 
      queryKey: string,
      buildQuery: (coll: any) => any,
      mapDoc: (doc: any) => any
    ) => {
      const q = buildQuery(collection(db, "users", uid, ...pathSuffix.split('/')));
      const unsub = onSnapshot(q, (snapshot) => {
        const mapped = snapshot.docs.map(mapDoc);
        console.log(`[AppSub] ${queryKey}: received ${mapped.length} docs from users/${uid}/${pathSuffix}`);
        queryClient.setQueryData([queryKey, uid], mapped);
      }, (error) => {
        console.error(`[AppSub] ${queryKey} onSnapshot error:`, error);
      });
      unsubs.push(unsub);
    };

    // Helper for single document fetching
    const createDocSub = (pathSuffix: string, queryKey: string) => {
      const unsub = onSnapshot(doc(db, "users", uid, ...pathSuffix.split('/')), (s) => {
        if (s.exists()) queryClient.setQueryData([queryKey, uid], s.data());
      });
      unsubs.push(unsub);
    };

    // 1. Logs - pobieramy pełne 35 dni danych (ok. 10-12k logów przy pomiarze co 5 min + posiłki/bolusy)
    const thirtyFiveDaysAgo = Date.now() - 35 * 24 * 60 * 60 * 1000;
    const isEco = localStorage.getItem("ecoMode") === "true";
    createCollectionSub(
      "logs",
      "fbLogs",
      (coll) => isEco 
        ? query(coll, where("timestamp", ">=", Date.now() - 7 * 24 * 60 * 60 * 1000), orderBy("timestamp", "desc"), limit(2500)) 
        : query(coll, where("timestamp", ">=", thirtyFiveDaysAgo), orderBy("timestamp", "desc"), limit(12000)),
      (doc) => ({ ...doc.data(), id: doc.id })
    );

    // 2. AI Reports
    createCollectionSub(
      "aiReports",
      "aiInsights",
      (coll) => query(coll, orderBy("timestamp", "desc"), limit(3)),
      (doc) => doc.data().content?.replace(/<[^>]*>/g, " ").substring(0, 500) || ""
    );

    // 3. Pump Status
    createDocSub("status/pump", "pumpStatus");

    // 4. Pet Status
    createDocSub("pet/status", "petStatus");

    // 5. User Settings (Profile)
    createDocSub("settings/profile", "userSettings");

    // 6. Nightscout Settings
    createDocSub("settings/nightscout", "nightscoutSettings");

    return () => {
      unsubs.forEach(u => u());
    };
  }, [user, queryClient]);
};
