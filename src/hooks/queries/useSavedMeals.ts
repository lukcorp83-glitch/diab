import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';

export const useSavedMeals = (user: any) => {
  const queryClient = useQueryClient();
  const uid = user ? getEffectiveUid(user) : '';

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "users", uid, "savedMeals"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meals = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      try {
        localStorage.setItem(`glikocontrol_saved_meals_${uid}`, JSON.stringify(meals));
      } catch (e) {}
      queryClient.setQueryData(['savedMeals', uid], meals);
      queryClient.setQueryData(['savedMeals', ''], meals);
    }, (error) => {
      console.warn("useSavedMeals onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, [uid, queryClient]);

  return useQuery({
    queryKey: ['savedMeals', uid],
    queryFn: async () => {
      if (!uid) return [];
      try {
        const cached = localStorage.getItem(`glikocontrol_saved_meals_${uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}

      const q = query(
        collection(db, "users", uid, "savedMeals"),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      const meals = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      try {
        localStorage.setItem(`glikocontrol_saved_meals_${uid}`, JSON.stringify(meals));
      } catch (e) {}
      return meals;
    },
    initialData: () => {
      if (!uid) return [];
      try {
        const cached = localStorage.getItem(`glikocontrol_saved_meals_${uid}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch (e) {
        return undefined;
      }
    },
    enabled: !!uid,
    staleTime: Infinity,
  });
};
