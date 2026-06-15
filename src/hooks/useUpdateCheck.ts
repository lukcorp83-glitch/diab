import { useState, useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import i18n from "../i18n";

export interface AppUpdateInfo {
  isAvailable: boolean;
  latestVersionCode: number;
  latestVersionName: string;
  downloadUrl: string;
  releaseNotes: string;
}

export const useUpdateCheck = () => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const checkForUpdate = async () => {
    // Sprawdzamy aktualizacje tylko jeśli aplikacja działa natywnie na Androidzie
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    setChecking(true);
    try {
      // 1. Pobierz dane o obecnie zainstalowanej aplikacji
      const currentAppInfo = await App.getInfo();
      const currentVersionCode = parseInt(currentAppInfo.build || '1', 10);

      // 2. Pobierz public/version.json z serwera, omijając cache
      const response = await fetch('/version.json?t=' + new Date().getTime());
      if (!response.ok) {
        throw new Error('Failed to fetch version.json');
      }
      
      const latestInfo = await response.json();
      const latestVersionCode = latestInfo.apkVersionCode;

      // 3. Sprawdź, czy numer builda na serwerze jest wyższy niż lokalny
      if (latestVersionCode > currentVersionCode) {
        setUpdateInfo({
          isAvailable: true,
          latestVersionCode: latestInfo.apkVersionCode,
          latestVersionName: latestInfo.apkVersionName,
          downloadUrl: latestInfo.downloadUrl,
          releaseNotes: latestInfo.releaseNotes
        });
      }
    } catch (err) {
      console.error(i18n.t('auto.blad_sprawdzania_aktualizacji', { defaultValue: i18n.t('auto.blad_sprawdzania_aktualiz', { defaultValue: "Błąd sprawdzania aktualizacji:" }) }), err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkForUpdate();
    
    // Opcjonalnie: sprawdzaj również za każdym razem, gdy aplikacja wraca z tła (resume)
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        checkForUpdate();
      }
    });
    
    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  return { updateInfo, checking, checkForUpdate, dismissUpdate: () => setUpdateInfo(null) };
};
