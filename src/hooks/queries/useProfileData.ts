import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';

export const usePetStatus = (user: any) => {
 return useQuery({
 queryKey: ['petStatus', user ? getEffectiveUid(user) : ''],
 queryFn: async () => {
 if (!user) return null;
 try {
   const petRef = doc(db, "users", getEffectiveUid(user), "pet", "status");
   const d = await getDoc(petRef);
   if (d.exists()) return d.data();
 } catch (e) {
   console.warn("Brak dostępu do nowej struktury pet/status. Próba ze starej ścieżki...");
 }
 try {
   const oldPetRef = doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "pet", "status");
   const oldD = await getDoc(oldPetRef);
   if (oldD.exists()) return oldD.data();
 } catch (err) {
   console.error("Zarówno nowa jak i stara ścieżka zwierzaka zawiodła", err);
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
 try {
   const nsSettingsRef = doc(db, "users", getEffectiveUid(user), "settings", "nightscout");
   const d = await getDoc(nsSettingsRef);
   if (d.exists()) return d.data();
 } catch (e) {
   console.warn("Brak dostępu do nowej struktury settings/nightscout. Próba ze starej ścieżki...");
 }
 try {
   const oldNsSettingsRef = doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "nightscout");
   const oldD = await getDoc(oldNsSettingsRef);
   if (oldD.exists()) return oldD.data();
 } catch (err) {
   console.error("Zarówno nowa jak i stara ścieżka ustawień nightscout zawiodła", err);
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
      try {
        const settingsRef = doc(db, "users", getEffectiveUid(user), "settings", "profile");
        const d = await getDoc(settingsRef);
        if (d.exists()) return d.data();
      } catch (e) {
        console.warn("Brak dostępu do nowej struktury settings/profile. Próba ze starej ścieżki...");
      }
      try {
        const oldSettingsRef = doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile");
        const oldD = await getDoc(oldSettingsRef);
        if (oldD.exists()) return oldD.data();
      } catch (err) {
        console.error("Zarówno nowa jak i stara ścieżka ustawień profilu zawiodła", err);
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
      const pumpRef = doc(db, "users", getEffectiveUid(user), "status", "pump");
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

