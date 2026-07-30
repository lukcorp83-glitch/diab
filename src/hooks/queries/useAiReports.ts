import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';
import { useEffect } from 'react';

export const useAiReports = (user: any) => {
 const queryClient = useQueryClient();
 const queryKey = ['aiReports', user ? getEffectiveUid(user) : ''];

 useEffect(() => {
 if (!user) return;
 
 const q = query(
 collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'aiReports'),
 orderBy('timestamp', 'desc')
 );
 
 const unsubscribe = onSnapshot(q, (snapshot) => {
 const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 queryClient.setQueryData(queryKey, reports);
 });

 return () => unsubscribe();
 }, [user, queryClient]); // queryKey is derived, no need to include, but better to keep deps clean

 return useQuery({
 queryKey,
 queryFn: async () => {
 if (!user) return [];
 
 const q = query(
 collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'aiReports'),
 orderBy('timestamp', 'desc')
 );
 const snapshot = await getDocs(q);
 return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 },
 enabled: !!user,
 staleTime: Infinity, // We update it manually via onSnapshot, so it's always "fresh" when subscribed
 });
};
