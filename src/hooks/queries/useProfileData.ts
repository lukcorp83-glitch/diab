import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';

export const usePetStatus = (user: any) => {
 return useQuery({
 queryKey: ['petStatus', user ? getEffectiveUid(user) : ''],
 queryFn: async () => {
 if (!user) return null;
 const petRef = doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "pet", "status");
 const d = await getDoc(petRef);
 if (d.exists()) {
 return d.data();
 }
 return null;
 },
 enabled: !!user,
 staleTime: 1000 * 60 * 5, // 5 minutes
 });
};

export const useNightscoutSettings = (user: any) => {
 return useQuery({
 queryKey: ['nightscoutSettings', user ? getEffectiveUid(user) : ''],
 queryFn: async () => {
 if (!user) return null;
 const nsSettingsRef = doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "nightscout");
 const d = await getDoc(nsSettingsRef);
 if (d.exists()) {
 return d.data();
 }
 return null;
 },
 enabled: !!user,
 staleTime: 1000 * 60 * 5, // 5 minutes
 });
};

export const useUserSettings = (user: any) => {
  return useQuery({
    queryKey: ['userSettings', user ? getEffectiveUid(user) : ''],
    queryFn: async () => {
      if (!user) return null;
      const settingsRef = doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile");
      const d = await getDoc(settingsRef);
      if (d.exists()) {
        return d.data();
      }
      return null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
};

export const usePumpStatus = (user: any) => {
  return useQuery({
    queryKey: ['pumpStatus', user ? getEffectiveUid(user) : ''],
    queryFn: async () => {
      if (!user) return null;
      const pumpRef = doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "status", "pump");
      const d = await getDoc(pumpRef);
      if (d.exists()) {
        return d.data();
      }
      return null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
};
