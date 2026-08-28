import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';
import { DEFAULT_SETTINGS } from '../../constants';
import { UserSettings } from '../../types';

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
        console.error("Błąd pobierania pet/status", e);
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
        console.error("Błąd pobierania settings/nightscout", e);
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
           const data = d.data();
           const merged = { ...DEFAULT_SETTINGS, ...localSettings, ...data };
           try { 
             localStorage.setItem("glikocontrol_user_settings", JSON.stringify(merged));
             if (data.treatmentMode) {
               localStorage.setItem("treatmentMode", data.treatmentMode);
             }
             localStorage.setItem("hasSeenTutorial", "true");
           } catch(e){}
           return merged;
        }
      } catch (e: any) {
        console.error("Błąd pobierania settings/profile", e);
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



