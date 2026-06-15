import React from 'react';
import { Download, X } from 'lucide-react';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { Browser } from '@capacitor/browser';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export const UpdateNotifier: React.FC = () => {
    const { t } = useTranslation();
  const { updateInfo, dismissUpdate } = useUpdateCheck();

  if (!updateInfo || !updateInfo.isAvailable) return null;

  const handleDownload = async () => {
    // URL pobierania pliku APK
    // Ponieważ PWA oraz aplikacja są hostowane na tej samej domenie,
    // możemy otworzyć relatywny URL do /pobierz/glikocontrol.apk
    // Browser.open z Capacitora poradzi sobie zarówno z absolutnymi jak i relatywnymi.
    // Aby zadziałało bezpiecznie, składamy z window.location.origin
    const fullUrl = window.location.origin + updateInfo.downloadUrl;
    
    await Browser.open({ url: fullUrl });
    dismissUpdate();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm" style={{ paddingTop: 'calc(env(safe-area-inset-top, 24px) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 24px) + 16px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-sm overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10"
        >
          {/* Header */}
          <div className="relative h-32 bg-gradient-to-br from-indigo-500 to-accent-500 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-white/10 mix-blend-overlay" />
            <div className="relative flex flex-col items-center">
              <div className="p-3 bg-white/20 rounded-full backdrop-blur-md mb-2">
                <Download className="w-8 h-8 text-white drop-shadow-md" />
              </div>
              <h3 className="font-bold text-white text-lg tracking-wide drop-shadow-md">
                
                                              {t('auto.dostępna_aktualizacja', { defaultValue: i18n.t('auto.dostepna_aktualizacja', { defaultValue: "Dostępna Aktualizacja!" }) })}
                                            </h3>
            </div>
            
            <button
              onClick={dismissUpdate}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                
                                              {t('auto.glikocontrol', { defaultValue: 'GlikoControl' })}
                                            </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-400">
                
                                              {t('auto.wersja', { defaultValue: 'Wersja' })} {updateInfo.latestVersionName}
              </span>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
              {updateInfo.releaseNotes}
            </p>

            <div className="flex gap-3">
              <button
                onClick={dismissUpdate}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                
                                              {t('auto.później', { defaultValue: i18n.t('auto.pozniej', { defaultValue: "Później" }) })}
                                            </button>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-accent-500 hover:from-indigo-400 hover:to-accent-400 rounded-xl shadow-lg shadow-accent-500/30 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                
                                              {t('auto.pobierz', { defaultValue: 'Pobierz' })}
                                            </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
