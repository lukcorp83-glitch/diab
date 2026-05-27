import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ApkVersion {
  version: string;
  url: string;
  releaseDate: string;
  whatsNew: string;
}

export default function ApkDownloadBanner() {
  const [apkInfo, setApkInfo] = useState<ApkVersion | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkApkUpdate = async () => {
      try {
        const response = await fetch('/pobierz/version.json?t=' + Date.now());
        if (response.ok) {
          const data = await response.json();
          const lastDismissedVersion = localStorage.getItem('dismissedApkVersion');
          
          // Jeśli zignorowano tę wersję, nie pokazuj ponownie
          if (lastDismissedVersion === data.version) {
            return;
          }
          
          // Wykrywanie czy aplikacja jest uruchomiona wewnątrz Android WebView (Aplikacja natywna APK)
          // Zwykłe PWA oraz przeglądarka nie pokażą tego banera
          const ua = navigator.userAgent;
          const isAndroidWebView = /wv/.test(ua) || (/Android/.test(ua) && /Version\/[\d.]+/.test(ua));
          
          // W trybie deweloperskim pokazujmy (localhost/127.0.0.1) albo tylko gdy to faktycznie APK
          const isDev = window.location.hostname === 'localhost';
          
          if (!isAndroidWebView && !isDev) {
            // Użytkownik przeglądarki / PWA - nie pokazujemy baneru automatycznie
            return;
          }
          
          setApkInfo(data);
        }
      } catch (err) {
        // failed to fetch, ignorujemy
      }
    };
    
    checkApkUpdate();
  }, []);

  if (!apkInfo || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('dismissedApkVersion', apkInfo.version);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-gradient-to-br from-indigo-600 to-blue-600 text-white p-4 rounded-2xl shadow-xl z-[100] flex items-start gap-4 border border-indigo-400/30"
      >
         <div className="bg-white/20 p-2.5 rounded-full mt-0.5 shrink-0">
           <Smartphone className="w-6 h-6 text-white" />
         </div>
         <div className="flex-1 min-w-0">
           <h3 className="font-bold text-sm leading-tight pr-4">Aplikacja Android (v{apkInfo.version})</h3>
           <p className="text-xs text-indigo-100 mt-1.5 leading-relaxed">{apkInfo.whatsNew}</p>
           <a 
             href={apkInfo.url} 
             onClick={handleDismiss}
             className="inline-flex items-center gap-1.5 mt-3 bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors shadow-sm"
           >
             <Download className="w-4 h-4" />
             Pobierz .apk
           </a>
         </div>
         <button 
           onClick={handleDismiss}
           className="absolute top-2.5 right-2.5 p-1.5 text-indigo-100 hover:text-white hover:bg-white/10 rounded-full transition-colors"
           aria-label="Zamknij"
         >
           <X className="w-5 h-5" />
         </button>
      </motion.div>
    </AnimatePresence>
  );
}
