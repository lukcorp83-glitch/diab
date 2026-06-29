import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Star, CloudDownload, Loader2 } from 'lucide-react';
import { Haptics } from '../lib/haptics';
import { CURRENT_VERSION, CURRENT_OTA_REVISION } from '../constants/versions';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import toast from 'react-hot-toast';

import localVersionData from '../../version.json';

export default function UpdateModal() {
    const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [versionData, setVersionData] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        let data;
        if (import.meta.env.DEV) {
          data = localVersionData;
        } else {
          try {
            const res = await fetch('https://lukcorp83-glitch.github.io/diab/version.json?t=' + Date.now());
            if (!res.ok) throw new Error("HTTP error");
            data = await res.json();
          } catch (fetchError) {
             console.log("CORS/Fetch error on Pages, falling back to raw...", fetchError);
             const resOld = await fetch('https://raw.githubusercontent.com/lukcorp83-glitch/diab/main/version.json?t=' + Date.now());
             data = await resOld.json();
          }
        }

        
        const dismissed = localStorage.getItem("dismissedApkVersion");
        const dismissedOta = localStorage.getItem("dismissedOtaRevision");
        
        const isNewApkVersion = data && data.version > CURRENT_VERSION;
        const isNewOtaRevision = data && data.version === CURRENT_VERSION && data.otaRevision && data.otaRevision > CURRENT_OTA_REVISION;

        if ((isNewApkVersion && dismissed !== data.version) || (isNewOtaRevision && dismissedOta !== String(data.otaRevision))) {
          setVersionData(data);
          setShow(true);
        }
      } catch (e) {
        console.error("Failed to check version", e);
      }
    };
    // Opóźniamy wyświetlenie, aby nie blokować UI na starcie
    setTimeout(checkUpdate, 2000);
    
    // Sprawdzaj dostępność aktualizacji co 5 minut w tle, by aplikacja nie musiała być restartowana
    const intervalId = setInterval(checkUpdate, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const handleOTAUpdate = async () => {
    try {
      setIsUpdating(true);
      Haptics.light();
      toast.loading(i18n.t('auto.pobieranie_aktualizacji', { defaultValue: 'Pobieranie aktualizacji...' }), { id: 'ota-update' });
      
      const versionInfo = await CapacitorUpdater.download({
        url: 'https://lukcorp83-glitch.github.io/diab/update.zip',
        version: versionData.version + (versionData.otaRevision ? "-ota" + versionData.otaRevision : ""),
      });
      
      toast.success(i18n.t('auto.pobrano_instaluje', { defaultValue: 'Pobrano, instalacja...' }), { id: 'ota-update' });
      await CapacitorUpdater.set({ id: versionInfo.id });
    } catch (e: any) {
      setIsUpdating(false);
      toast.error("Błąd OTA: " + e.message, { id: 'ota-update' });
    }
  };

  if (!show || !versionData) return null;

  const apkDownloadUrl = versionData.apkUrl || versionData.url;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 pt-safe pb-safe z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 24px) + 16px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 24px) + 16px)',
          paddingLeft: 'calc(env(safe-area-inset-left) + 16px)',
          paddingRight: 'calc(env(safe-area-inset-right) + 16px)'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative overflow-y-auto max-h-full"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          
          <button
            onClick={() => {
              if (isUpdating) return;
              Haptics.light();
              localStorage.setItem("dismissedApkVersion", versionData.version);
              if (versionData.otaRevision) {
                localStorage.setItem("dismissedOtaRevision", String(versionData.otaRevision));
              }
              setShow(false);
            }}
            disabled={isUpdating}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
              <Star size={24} className="fill-current" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">{t('auto.dostępna_wersja', { defaultValue: i18n.t('auto.dostepna_wersja', { defaultValue: "Dostępna Wersja" }) })} {versionData.version}</h2>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t('auto.oficjalna_aplikacja_apk', { defaultValue: 'Oficjalna aktualizacja' })}</p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {i18n.language?.startsWith('en') && versionData.whatsNewEn ? versionData.whatsNewEn : versionData.whatsNew}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {Capacitor.isNativePlatform() && (
               <button
                 onClick={handleOTAUpdate}
                 disabled={isUpdating}
                 className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
               >
                 {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <CloudDownload size={18} />}
                 {isUpdating ? t('auto.pobieranie', { defaultValue: 'Pobieranie...' }) : t('auto.szybka_aktualizacja_ota', { defaultValue: 'Szybka aktualizacja (OTA)' })}
               </button>
            )}
            
            {/* Zawsze pokazujemy przycisk pobierania APK – przez link */}
            <a
              href={apkDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                Haptics.light();
                localStorage.setItem("dismissedApkVersion", versionData.version);
                if (versionData.otaRevision) {
                  localStorage.setItem("dismissedOtaRevision", String(versionData.otaRevision));
                }
              }}
              className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white py-3.5 rounded-2xl font-bold transition-all"
            >
              <Download size={18} />
              {t('auto.pobierz_aplikację_android_apk', { defaultValue: i18n.t('auto.pobierz_aplikacje_android', { defaultValue: "Pobierz plik APK" }) })}
            </a>
            <button
              onClick={() => {
                Haptics.light();
                localStorage.setItem("dismissedApkVersion", versionData.version);
                if (versionData.otaRevision) {
                  localStorage.setItem("dismissedOtaRevision", String(versionData.otaRevision));
                }
                setShow(false);
              }}
              className="w-full py-3.5 font-bold text-slate-500 dark:text-slate-400 active:scale-95 transition-all text-sm"
            >
              {t('auto.przypomnij_później', { defaultValue: i18n.t('auto.przypomnij_pozniej', { defaultValue: "Przypomnij później" }) })}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
