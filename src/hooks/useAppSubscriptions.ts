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
        queryClient.setQueryData([queryKey, uid], snapshot.docs.map(mapDoc));
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

    // 1. Logs
    const safeTs = localStorage.getItem("lastSafeTimestamp") || (Date.now() - 30 * 24 * 60 * 60 * 1000).toString();
    const isEco = localStorage.getItem("ecoMode") === "true";
    createCollectionSub(
      "logs",
      "fbLogs",
      (coll) => isEco ? query(coll, where("timestamp", ">", safeTs), orderBy("timestamp", "desc"), limit(5000)) : query(coll, orderBy("timestamp", "desc"), limit(10000)),
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
