import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Star, AlertTriangle, ExternalLink, CheckCircle2, RefreshCw } from 'lucide-react';
import { Haptics } from '../lib/haptics';
import { CURRENT_VERSION } from '../constants/versions';
import { IS_BETA_CHANNEL } from '../constants';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import localVersionData from '../../version.json';
import { resolveApkDownloadUrl, triggerApkDownload, ApkDownloadInfo } from '../utils/apkDownloader';
import { notificationService } from '../services/notificationService';
import { Capacitor } from '@capacitor/core';

export default function UpdateModal() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [versionData, setVersionData] = useState<any>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [apkInfo, setApkInfo] = useState<ApkDownloadInfo | null>(null);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const isBeta = IS_BETA_CHANNEL || localStorage.getItem("betaProgramEnabled") === "true" || localStorage.getItem("gliko_beta_channel") === "true";
        
        let data: any = null;
        if (import.meta.env.DEV) {
          data = localVersionData;
        } else {
          const urlsToTry = isBeta 
            ? [
                'https://github.com/lukcorp83-glitch/diab/releases/download/aktualizacja-beta/beta.json?t=' + Date.now(),
                'https://raw.githubusercontent.com/lukcorp83-glitch/diab/beta/version.json?t=' + Date.now(),
                'https://glikocontrol.pl/version.json?t=' + Date.now()
              ]
            : [
                'https://glikocontrol.pl/version.json?t=' + Date.now(),
                'https://raw.githubusercontent.com/lukcorp83-glitch/diab/main/version.json?t=' + Date.now(),
                'https://github.com/lukcorp83-glitch/diab/releases/download/aktualizacja/version.json?t=' + Date.now()
              ];

          for (const url of urlsToTry) {
            try {
              const res = await fetch(url);
              if (res.ok) {
                const parsed = await res.json();
                if (parsed && (parsed.version || parsed.buildNumber)) {
                  data = parsed;
                  break;
                }
              }
            } catch (err) {
              // Następny URL w łańcuchu
            }
          }
        }

        if (!data || !data.version) return;

        // Dynamiczne rozwiązanie działającego adresu APK
        const resolvedApk = await resolveApkDownloadUrl();
        setApkInfo(resolvedApk);
        if (resolvedApk?.url) {
          data.apkUrl = resolvedApk.url;
        }

        const dismissed = localStorage.getItem("dismissedApkVersion");
        
        // Bezpieczne numeryczne porównanie wersji, odporne na przyrostki "-beta"
        const compareVersions = (v1: string, v2: string) => {
          if (!v1 || !v2) return false;
          const clean1 = v1.replace(/^v/i, '').split('.').map(s => parseInt(s.replace(/\D+/g, ''), 10) || 0);
          const clean2 = v2.replace(/^v/i, '').split('.').map(s => parseInt(s.replace(/\D+/g, ''), 10) || 0);
          for (let i = 0; i < Math.max(clean1.length, clean2.length); i++) {
            const n1 = clean1[i] || 0;
            const n2 = clean2[i] || 0;
            if (n1 > n2) return true;
            if (n1 < n2) return false;
          }
          return false;
        };

        const isNewApkVersion = compareVersions(data.version, CURRENT_VERSION);

        if (isNewApkVersion && dismissed !== data.version) {
          // Wyślij powiadomienie push / lokalne w belce powiadomień Androida natychmiast
          notificationService.notifyAppUpdateAvailable(data.version, isBeta);

          const updateKey = `updateDetectedAt_${data.version}`;
          const detectedAt = localStorage.getItem(updateKey);
          
          if (!detectedAt) {
            localStorage.setItem(updateKey, String(Date.now()));
            // Po 30 sekundach od pierwszego wykrycia w bieżącej sesji wyświetlamy okno
            setTimeout(() => {
              if (localStorage.getItem("dismissedApkVersion") !== data.version) {
                setVersionData(data);
                setShow(true);
              }
            }, 30000);
          } else {
            // Jeśli aktualizacja była już wcześniej wykryta w storage, pokazujemy okno od razu
            setVersionData(data);
            setShow(true);
          }
        }
      } catch (e) {
        console.error("Failed to check version", e);
      }
    };

    // Sprawdzenie dostępności aktualizacji po załadowaniu
    setTimeout(checkUpdate, 2000);
    
    // Sprawdzaj dostępność aktualizacji co 5 minut w tle
    const intervalId = setInterval(checkUpdate, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  if (!show || !versionData) return null;

  const currentApkUrl = apkInfo?.url || versionData.apkUrl || 'https://github.com/lukcorp83-glitch/diab/releases';

  const handleDownloadApk = async () => {
    Haptics.success();
    localStorage.setItem("dismissedApkVersion", versionData.version);
    
    // Bezpieczne wywołanie pobierania w tle
    const isBeta = localStorage.getItem("betaProgramEnabled") === "true";
    triggerApkDownload(currentApkUrl, versionData.version, isBeta);
    setDownloadStarted(true);
  };

  const handleClose = () => {
    Haptics.light();
    localStorage.setItem("dismissedApkVersion", versionData.version);
    setShow(false);
    setDownloadStarted(false);
  };

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
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>

          {!downloadStarted ? (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                  <Star size={24} className="fill-current" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">
                    {t('auto.dostępna_wersja', { defaultValue: i18n.t('auto.dostepna_wersja', { defaultValue: "Dostępna Wersja" }) })} {versionData.version}
                  </h2>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {t('auto.oficjalna_aplikacja_apk', { defaultValue: 'Oficjalna aplikacja APK' })}
                  </p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {i18n.language?.startsWith('en') && versionData.whatsNewEn ? versionData.whatsNewEn : versionData.whatsNew}
                </p>
              </div>

              {/* Wskazówka o pobieraniu */}
              <div className="mb-6 p-3.5 bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl border border-amber-500/25 text-left">
                <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                  💡 <b>{t('update.tip_title', { defaultValue: 'Wskazówka:' })}</b>{' '}
                  {t('update.tip_text', {
                    defaultValue: 'W przeglądarce Chrome na Androidzie kliknij "Pobierz mimo to" / "Zachowaj", jeśli pojawi się ostrzeżenie o pliku APK.'
                  })}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDownloadApk}
                  className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Download size={18} />
                  {t('auto.pobierz_aplikację_android_apk', { defaultValue: i18n.t('auto.pobierz_aplikacje_android', { defaultValue: "Pobierz plik APK" }) })}
                </button>
                <button
                  onClick={handleClose}
                  className="w-full py-3 font-bold text-slate-500 dark:text-slate-400 active:scale-95 transition-all text-sm cursor-pointer"
                >
                  {t('auto.przypomnij_później', { defaultValue: i18n.t('auto.przypomnij_pozniej', { defaultValue: "Przypomnij później" }) })}
                </button>
              </div>
            </>
          ) : (
            /* EKRAN PO KLIKNIĘCIU POBIERZ: DOKŁADNE INSTRUKCJE FINALIZACJI CHROME ANDROID */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center animate-pulse">
                  <Download size={26} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">
                    Pobieranie w toku...
                  </h3>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    Sygnał wysłany do przeglądarki
                  </p>
                </div>
              </div>

              {Capacitor.isNativePlatform() ? (
                /* WIDOK DLA NATYWNEGO ANDROIDA */
                <>
                  <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-left space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>Pobieranie natywne w toku</span>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      Aplikacja pobiera plik bezpośrednio przez systemowy menedżer pobierania Androida (bez użycia zewnętrznej przeglądarki). Postęp możesz sprawdzić w <b>górnej belce powiadomień</b>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-left space-y-1">
                    <div className="text-indigo-800 dark:text-indigo-300 font-bold text-xs">
                      Automatyczne uruchomienie instalatora
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Zaraz po zakończeniu pobierania na ekranie pojawi się systemowe okno z pytaniem: <b>„Czy chcesz zainstalować aktualizację tej aplikacji?”</b>. Jeśli się nie pojawi, dotknij powiadomienia o pobraniu na belce.
                    </p>
                  </div>
                </>
              ) : (
                /* WIDOK DLA PRZEGLĄDARKI (CHROME / PWA) */
                <>
                  <div className="p-3.5 bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 rounded-2xl text-left space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                      <AlertTriangle size={16} className="shrink-0" />
                      <span>Krok 1: Zaakceptuj pobieranie w Chrome</span>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      Przeglądarka wyświetla ostrzeżenie o pliku APK:
                      <br />
                      <b className="text-rose-700 dark:text-rose-300">„Plik może być szkodliwy. Czy chcesz zachować plik...?”</b>
                      <br />
                      👉 <b>Koniecznie kliknij „Zachowaj” lub „Pobierz mimo to”!</b>
                    </p>
                  </div>

                  <div className="p-3.5 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 rounded-2xl text-left space-y-1">
                    <div className="text-amber-800 dark:text-amber-300 font-bold text-xs">
                      Krok 2: Instalacja z folderu Pobrane
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Jeśli plik ma rozszerzenie <code>.crdownload</code>, rozwiń pasek powiadomień i potwierdź jego zachowanie. Następnie otwórz aplikację <b>„Pliki” ➔ „Pobrane”</b> i kliknij pobrany plik .apk.
                    </p>
                  </div>
                </>
              )}

              {/* PRZYCISKI AWARYJNE */}
              <div className="pt-2 flex flex-col gap-2">
                <a
                  href={currentApkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  <RefreshCw size={14} />
                  Pobierz ponownie (link bezpośredni)
                </a>

                <a
                  href="https://glikocontrol.pl/pobierz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full text-indigo-600 dark:text-indigo-400 py-2 font-bold text-xs hover:underline"
                >
                  <ExternalLink size={14} />
                  Otwórz dedykowaną stronę pobierania
                </a>

                <button
                  onClick={handleClose}
                  className="w-full mt-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95"
                >
                  Rozumiem, zamknij
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

