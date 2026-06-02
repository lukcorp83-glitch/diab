import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Star } from 'lucide-react';
import { Haptics } from '../lib/haptics';

export default function UpdateModal() {
  const [show, setShow] = useState(false);
  const [versionData, setVersionData] = useState<any>(null);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const res = await fetch('./pobierz/version.json?t=' + Date.now());
        const data = await res.json();
        const currentApkVersion = "1.2.0"; // Zmieniamy to za każdym buildem
        
        // Sprawdźmy, czy już odrzucono lub jest to nowa wersja (1.2)
        const dismissed = localStorage.getItem("dismissedApkVersion");
        if (data && data.version === "1.2" && dismissed !== "1.2") {
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
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden"
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
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Dostępna Wersja {versionData.version}</h2>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Oficjalna aplikacja APK</p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-700">
            <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {versionData.whatsNew}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-bold">
              Zalecamy instalację tej wersji dla wszystkich użytkowników (również wersji 1.1) dla poprawnego działania widżetów.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={versionData.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                Haptics.success();
                localStorage.setItem("dismissedApkVersion", versionData.version);
                setShow(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Download size={18} />
              Pobierz teraz
            </a>
            <button
              onClick={() => {
                Haptics.light();
                localStorage.setItem("dismissedApkVersion", versionData.version);
                setShow(false);
              }}
              className="w-full py-3.5 font-bold text-slate-500 dark:text-slate-400 active:scale-95 transition-all text-sm"
            >
              Przypomnij później
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
