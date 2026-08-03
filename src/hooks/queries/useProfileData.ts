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
        const uid = getEffectiveUid(user);
        const settingsRef = doc(db, "users", uid, "settings", "profile");
        const d = await getDoc(settingsRef);
        if (d.exists()) {
           return d.data();
        } else {
           import('react-hot-toast').then(m => m.toast("Baza główna pusta dla UID: " + uid.substring(0,5) + "... Szukam w awaryjnej."));
        }
      } catch (e: any) {
        import('react-hot-toast').then(m => m.toast.error("Błąd odczytu nowej bazy: " + e.message));
        console.warn("Brak dostępu do nowej struktury settings/profile. Próba ze starej ścieżki...");
      }
      try {
        const uid = getEffectiveUid(user);
        const oldSettingsRef = doc(db, "artifacts", "diacontrolapp", "users", uid, "settings", "profile");
        const oldD = await getDoc(oldSettingsRef);
        if (oldD.exists()) {
           return oldD.data();
        } else {
           import('react-hot-toast').then(m => m.toast.error("UWAGA: Obie bazy są całkowicie PUSTE dla UID: " + uid.substring(0,5) + "... Dlatego tryb dziecka gaśnie!"));
        }
      } catch (err: any) {
        import('react-hot-toast').then(m => m.toast.error("Błąd odczytu starej bazy: " + err.message));
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



