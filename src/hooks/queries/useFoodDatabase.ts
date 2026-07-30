import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';
import { Product } from '../../types';

export const useCommunityProducts = () => {
 return useQuery({
 queryKey: ['communityProducts'],
 queryFn: async () => {
 const q = query(collection(db, "artifacts", "diacontrolapp", "communityProducts"));
 const snapshot = await getDocs(q);
 return snapshot.docs.map((doc) => ({
 id: doc.id,
 ...doc.data(),
 })) as Product[];
 },
 staleTime: 1000 * 60 * 60, // 1 hour
 gcTime: 1000 * 60 * 60 * 24, // 24 hours
 });
};

export const useCustomProducts = (user: any) => {
 return useQuery({
 queryKey: ['customProducts', user ? getEffectiveUid(user) : ''],
 queryFn: async () => {
 if (!user) return [];
 const q = query(collection(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "customProducts"));
 const snapshot = await getDocs(q);
 return snapshot.docs.map((doc) => ({
 id: doc.id,
 ...doc.data(),
 })) as Product[];
 },
 enabled: !!user,
 staleTime: 1000 * 60 * 5, // 5 minutes
 });
};
