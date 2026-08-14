import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';
import { Product } from '../../types';

export const useCommunityProducts = () => {
 return useQuery({
 queryKey: ['communityProducts'],
 queryFn: async () => {
 const qNew = query(collection(db, "communityProducts"));
 const qLegacy = query(collection(db, "artifacts/diacontrolapp/communityProducts"));
 
 const [snapshotNew, snapshotLegacy] = await Promise.all([
   getDocs(qNew),
   getDocs(qLegacy)
 ]);

 const combined = [...snapshotNew.docs, ...snapshotLegacy.docs];
 const uniqueMap = new Map();
 
 combined.forEach((doc) => {
   // Nadpisujemy nowszym, w razie wystąpienia tego samego id
   uniqueMap.set(doc.id, {
     id: doc.id,
     ...doc.data(),
     isCommunity: true,
   });
 });

 return Array.from(uniqueMap.values()) as Product[];
 },
 staleTime: 1000 * 60 * 60, // 1 hour
 gcTime: 1000 * 60 * 60 * 24, // 24 hours
 placeholderData: (previousData) => previousData,
 });
};

export const useCustomProducts = (user: any) => {
 return useQuery({
 queryKey: ['customProducts', user ? getEffectiveUid(user) : ''],
 queryFn: async () => {
 if (!user) return [];
 const q = query(collection(db, "users", getEffectiveUid(user), "customProducts"));
 const snapshot = await getDocs(q);
 return snapshot.docs.map((doc) => ({
 id: doc.id,
 ...doc.data(),
 isCustom: true,
 })) as Product[];
 },
 enabled: !!user,
 staleTime: 1000 * 60 * 5, // 5 minutes
 placeholderData: (previousData) => previousData,
 });
};
