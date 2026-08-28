import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, onSnapshot, orderBy } from 'firebase/firestore';
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
  const queryClient = useQueryClient();
  const uid = user ? getEffectiveUid(user) : '';

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "customProducts"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isCustom: true,
      })) as Product[];
      try {
        localStorage.setItem(`glikocontrol_custom_products_${uid}`, JSON.stringify(products));
      } catch (e) {}
      queryClient.setQueryData(['customProducts', uid], products);
      queryClient.setQueryData(['customProducts', ''], products);
    }, (error) => {
      console.warn("useCustomProducts onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, [uid, queryClient]);

  return useQuery({
    queryKey: ['customProducts', uid],
    queryFn: async () => {
      if (!uid) return [];
      try {
        const cached = localStorage.getItem(`glikocontrol_custom_products_${uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}

      const q = query(collection(db, "users", uid, "customProducts"));
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isCustom: true,
      })) as Product[];
      try {
        localStorage.setItem(`glikocontrol_custom_products_${uid}`, JSON.stringify(products));
      } catch (e) {}
      return products;
    },
    initialData: () => {
      if (!uid) return [];
      try {
        const cached = localStorage.getItem(`glikocontrol_custom_products_${uid}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch (e) {
        return undefined;
      }
    },
    enabled: !!uid,
    staleTime: Infinity,
  });
};
