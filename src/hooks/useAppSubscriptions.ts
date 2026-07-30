import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { collection, query, onSnapshot, orderBy, limit, doc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid } from '../lib/utils';
import { useLogsStore } from '../stores/useLogsStore';
import { LogEntry } from '../types';

export const useAppSubscriptions = (user: any) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const uid = getEffectiveUid(user);

    // 1. Logs
    const safeTs = localStorage.getItem("lastSafeTimestamp") || (Date.now() - 30 * 24 * 60 * 60 * 1000).toString();
    const logsCollection = collection(db, "artifacts", "diacontrolapp", "users", uid, "logs");
    let logsQuery;
    if (localStorage.getItem("ecoMode") === "true") {
      logsQuery = query(logsCollection, where("timestamp", ">", safeTs), orderBy("timestamp", "desc"), limit(1500));
    } else {
      logsQuery = query(logsCollection, orderBy("timestamp", "desc"), limit(1500));
    }
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as LogEntry[];
      queryClient.setQueryData(['fbLogs', uid], data);
    });

    // 2. AI Reports
    const aiReportsQuery = query(collection(db, "artifacts", "diacontrolapp", "users", uid, "aiReports"), orderBy("timestamp", "desc"), limit(3));
    const unsubAi = onSnapshot(aiReportsQuery, (snapshot) => {
      const texts = snapshot.docs.map(doc => doc.data().content?.replace(/<[^>]*>/g, " ").substring(0, 500) || "");
      queryClient.setQueryData(['aiInsights', uid], texts);
    });

    // 3. Pump Status
    const unsubPump = onSnapshot(doc(db, "artifacts", "diacontrolapp", "users", uid, "status", "pump"), (docSnap) => {
      queryClient.setQueryData(['pumpStatus', uid], docSnap.data() || null);
    });

    // 4. Pet Status
    const unsubPet = onSnapshot(doc(db, "artifacts", "diacontrolapp", "users", uid, "pet", "status"), (docSnap) => {
      if (docSnap.exists()) queryClient.setQueryData(['petStatus', uid], docSnap.data());
    });

    // 5. User Settings (Profile)
    const unsubSettings = onSnapshot(doc(db, "artifacts", "diacontrolapp", "users", uid, "settings", "profile"), (docSnap) => {
      if (docSnap.exists()) queryClient.setQueryData(['userSettings', uid], docSnap.data());
    });

    // 6. Nightscout Settings
    const unsubNightscout = onSnapshot(doc(db, "artifacts", "diacontrolapp", "users", uid, "settings", "nightscout"), (docSnap) => {
      if (docSnap.exists()) queryClient.setQueryData(['nightscoutSettings', uid], docSnap.data());
    });

    return () => {
      unsubLogs();
      unsubAi();
      unsubPump();
      unsubPet();
      unsubSettings();
      unsubNightscout();
    };
  }, [user, queryClient]);
};
