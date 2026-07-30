import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';

export const useNotebooks = (user: any) => {
 return useQuery({
 queryKey: ['notebooks', user ? getEffectiveUid(user) : ''],
 queryFn: async () => {
 if (!user) return [];
 const q = query(
 collection(
 db,
 "artifacts",
 "diacontrolapp",
 "users",
 getEffectiveUid(user),
 "notebook"
 ),
 orderBy("createdAt", "desc")
 );
 const snapshot = await getDocs(q);
 return snapshot.docs.map((doc) => ({
 id: doc.id,
 ...doc.data(),
 }));
 },
 enabled: !!user,
 staleTime: 1000 * 60 * 5, // 5 minutes
 });
};
