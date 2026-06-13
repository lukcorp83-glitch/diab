import React, { useState, useEffect } from 'react';
import { CloudUpload, CloudDownload, Loader2, Cloud, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { loadLocalLogs, saveLocalLogs } from '../lib/localLogs';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid, cn } from '../lib/utils';
import { UserSettings } from '../types';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function CloudPackageSync({ 
  settings,
  user,
  onImport
}: { 
  settings: UserSettings,
  user: any,
  onImport?: (s: any) => void;
}) {
    const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    const ls = localStorage.getItem('last_cloud_package_sync');
    if (ls) setLastSync(parseInt(ls));
  }, []);

  const handleUpload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const lsData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('firebase')) {
          lsData[key] = localStorage.getItem(key) || '';
        }
      }
      
      const logs = await loadLocalLogs();
      const recentLogs = logs.slice(0, 500); // Prevent size exceeding Firestore limits

      const exportData = {
        timestamp: Date.now(),
        localStorage: lsData,
        logs: recentLogs,
        settings: settings
      };

      const jsonStr = JSON.stringify(exportData);
      
      await setDoc(
        doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "syncPackage", "latest"),
        { payload: jsonStr, timestamp: Date.now() }
      );
      
      setLastSync(Date.now());
      localStorage.setItem('last_cloud_package_sync', Date.now().toString());
      toast.success(i18n.t('auto.dane_wyslane_do_paczki_w_chmur', { defaultValue: "Dane wysłane do paczki w chmurze" }));
    } catch (e) {
      console.error(e);
      toast.error(i18n.t('auto.blad_zapisu_zbyt_duzo_danych', { defaultValue: "Błąd zapisu (zbyt dużo danych?)." }));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snap = await getDoc(
        doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "syncPackage", "latest")
      );
      
      if (!snap.exists()) {
        toast.error("Brak zapisanej paczki w chmurze");
        return;
      }
      
      const data = snap.data();
      if (!data.payload) throw new Error("Empty payload");
      
      const parsed = JSON.parse(data.payload);

      if (parsed.localStorage) {
        Object.keys(parsed.localStorage).forEach(key => {
          localStorage.setItem(key, parsed.localStorage[key]);
        });
      }

      if (parsed.logs && Array.isArray(parsed.logs)) {
        await saveLocalLogs(parsed.logs);
      }

      if (parsed.settings && user) {
        await setDoc(
          doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile"),
          parsed.settings,
          { merge: true }
        );
      }

      setLastSync(Date.now());
      localStorage.setItem('last_cloud_package_sync', Date.now().toString());

      toast.success(i18n.t('auto.pobrano_paczke_chmurowa_przela', { defaultValue: "Pobrano paczkę chmurową. Przeładowuję..." }));
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      console.error(e);
      toast.error(i18n.t('auto.blad_podczas_pobierania_paczki', { defaultValue: "Błąd podczas pobierania paczki" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 glass-target relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 bg-sky-500 text-white font-black text-[8px] uppercase tracking-widest rounded-bl-xl shadow-lg z-10">
        
                      {t('auto.eksperymentalne', { defaultValue: 'Eksperymentalne' })}
                    </div>
      <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-3">
           <Cloud className="text-sky-500" size={20} />
           <span className="text-xs font-bold dark:text-white">{t('auto.paczka_synchr_chmura', { defaultValue: 'Paczka Synchr. (Chmura)' })}</span>
         </div>
         {lastSync && (
           <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
             <Clock size={10} /> {new Date(lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
           </span>
         )}
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mb-2">
        
                      {t('auto.pozwala_zredukować_zużycie_odczytów', { defaultValue: 'Pozwala zredukować zużycie odczytów bazy Firebase. Aplikacja zamiast przesyłać poszczególne zdarzenia jedno po drugim, przesyła historię, dziennik i ustawienia w formie pojedynczej paczki zbiorczej (aktualizowane ręcznie). Idealne do przenoszenia stanu na drugie urządzenie lub robienia kopii w chmurze bez ciągłego obciążania bazy.' })}
                    </p>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button 
          onClick={handleUpload}
          disabled={loading}
          className="bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 border border-sky-500/20 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all w-full"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />} 
           
                            {t('auto.wyślij_do_chmury', { defaultValue: 'Wyślij do chmury' })}
                          </button>
        
        <button 
          onClick={handleDownload}
          disabled={loading}
          className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all w-full"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />} 
           
                            {t('auto.pobierz_i_nadpisz', { defaultValue: 'Pobierz i nadpisz' })}
                          </button>
      </div>
    </div>
  );
}
