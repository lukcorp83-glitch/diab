import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';
import { DEFAULT_SETTINGS } from '../../constants';

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
    queryKey: ['userSettings', user ? getEffectiveUid(user) : 'local'],
    queryFn: async () => {
      let localSettings: Partial<UserSettings> = {};
      try {
        const saved = localStorage.getItem("glikocontrol_user_settings");
        if (saved) localSettings = JSON.parse(saved);
      } catch (e) {}

      if (!user) {
        return { ...DEFAULT_SETTINGS, ...localSettings };
      }

      try {
        const uid = getEffectiveUid(user);
        const settingsRef = doc(db, "users", uid, "settings", "profile");
        const d = await getDoc(settingsRef);
        if (d.exists()) {
           const merged = { ...DEFAULT_SETTINGS, ...localSettings, ...d.data() };
           try { localStorage.setItem("glikocontrol_user_settings", JSON.stringify(merged)); } catch(e){}
           return merged;
        }
      } catch (e: any) {
        console.warn("Brak dostępu do nowej struktury settings/profile.");
      }

      try {
        const uid = getEffectiveUid(user);
        const oldSettingsRef = doc(db, "artifacts", "diacontrolapp", "users", uid, "settings", "profile");
        const oldD = await getDoc(oldSettingsRef);
        if (oldD.exists()) {
           const merged = { ...DEFAULT_SETTINGS, ...localSettings, ...oldD.data() };
           try { localStorage.setItem("glikocontrol_user_settings", JSON.stringify(merged)); } catch(e){}
           return merged;
        }
      } catch (err: any) {
        console.error("Ścieżka ustawień zawiodła", err);
      }

      return { ...DEFAULT_SETTINGS, ...localSettings };
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
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



