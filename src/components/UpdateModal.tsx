import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Star, Loader2 } from 'lucide-react';
import { Haptics } from '../lib/haptics';
import { CURRENT_VERSION } from '../constants/versions';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function UpdateModal() {
    const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [versionData, setVersionData] = useState<any>(null);

  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const res = await fetch('https://raw.githubusercontent.com/lukcorp83-glitch/diab/main/version.json?t=' + Date.now());
        const data = await res.json();
        
        const dismissed = localStorage.getItem("dismissedApkVersion");
        if (data && data.version > CURRENT_VERSION && dismissed !== data.version) {
          setVersionData(data);
          setShow(true);
        }
      } catch (e) {
        console.error("Failed to check version", e);
      }
    };
    // Opóźniamy wyświetlenie, aby nie blokować UI na starcie
    setTimeout(checkUpdate, 2000);
  }, []);

  if (!show || !versionData) return null;

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
              Haptics.light();
              localStorage.setItem("dismissedApkVersion", versionData.version);
              setShow(false);
            }}
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
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t('auto.oficjalna_aplikacja_apk', { defaultValue: 'Oficjalna aplikacja APK' })}</p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {versionData.whatsNew}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-bold">
              
                                        {t('auto.zalecamy_instalację_tej_wersji_dla_', { defaultValue: i18n.t('auto.zalecamy_instalacje_tej_w', { defaultValue: "Zalecamy instalację tej wersji dla wszystkich użytkowników (również wersji 1.1) dla poprawnego działania widżetów." }) })}
                                      </p>
          </div>

          <div className="flex flex-col gap-3">
            {Capacitor.isNativePlatform() ? (
              <button
                disabled={isUpdating}
                onClick={async () => {
                  Haptics.light();
                  try {
                    setIsUpdating(true);
                    const version = await CapacitorUpdater.download({
                      url: versionData.url,
                      version: versionData.version
                    });
                    await CapacitorUpdater.set(version);
                    alert(i18n.t('auto.aktualizacja_zakonczona_sukces', { defaultValue: i18n.t('auto.aktualizacja_zakonczona_s', { defaultValue: "Aktualizacja zakończona sukcesem! Aplikacja zostanie teraz zrestartowana." }) }));
                    window.location.reload();
                  } catch (e: any) {
                    console.error("Failed to update", e);
                    alert(i18n.t('auto.blad_aktualizacji_sprawdz_czy', { defaultValue: i18n.t('auto.blad_aktualizacji_sprawdz', { defaultValue: "Błąd aktualizacji (sprawdź czy podano poprawny link do pliku ZIP w polu 'url'):" }) }) + e?.message);
                    setIsUpdating(false);
                  }
                }}
                className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {isUpdating ? "Pobieranie i instalacja..." : "Zaktualizuj teraz"}
              </button>
            ) : (
              <a
                href={versionData.apkUrl || versionData.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  Haptics.light();
                  localStorage.setItem("dismissedApkVersion", versionData.version);
                  setShow(false);
                }}
                className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
              >
                <Download size={18} />
                
                                                  {t('auto.pobierz_aplikację_android_apk', { defaultValue: i18n.t('auto.pobierz_aplikacje_android', { defaultValue: "Pobierz aplikację Android (APK)" }) })}
                                                </a>
            )}
            <button
              onClick={() => {
                Haptics.light();
                localStorage.setItem("dismissedApkVersion", versionData.version);
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

