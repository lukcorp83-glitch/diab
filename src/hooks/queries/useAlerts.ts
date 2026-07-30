import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';

export const useAlerts = (user: any) => {
 return useQuery({
 queryKey: ['alerts', user ? getEffectiveUid(user) : ''],
 queryFn: async () => {
 if (!user) return [];
 const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
 const q = query(
 collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'alerts'),
 where('acknowledged', '==', false),
 where('createdAt', '>', twelveHoursAgo)
 );
 const snapshot = await getDocs(q);
 const alerts = snapshot.docs.map((doc) => ({
 id: doc.id,
 ...doc.data(),
 }));
 // Sort in memory to match the original behavior
 alerts.sort((a: any, b: any) => a.createdAt - b.createdAt);
 return alerts;
 },
 enabled: !!user,
 refetchInterval: 15000, // Poll every 15 seconds instead of onSnapshot
 staleTime: 1000 * 10, // 10 seconds
 });
};
