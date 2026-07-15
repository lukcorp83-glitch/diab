import React, { useState, useEffect } from 'react';
import { CloudUpload, CloudDownload, Loader2, Cloud, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { loadLocalLogs, saveLocalLogs } from '../lib/localLogs';
import { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid, cn } from '../lib/utils';
import { UserSettings } from '../types';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { dbService } from '../services/databaseService';
import { MLAnalyzer } from '../services/mlSugarAnalyzer';
import * as LZString from 'lz-string';

export const uploadCloudPackage = async (user: any, settings: UserSettings) => {
  if (!user) return false;
  try {
    const lsData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('firebase')) {
        lsData[key] = localStorage.getItem(key) || '';
      }
    }
    
    // Pobierz logi zarówno z natywnej bazy SQLite jak i starego IndexedDB
    const sqliteLogs = await dbService.getLogs(45000);
    const oldIndexedDbLogs = await loadLocalLogs().catch(() => []);
    
    // Dociągnij również pełną historię z kolekcji w Firestore w tle, by mieć 100% pewności, że paczka ma komplet odczytów (a nie tylko te z limitu 1500 na żywo)
    let firestoreLogs: any[] = [];
    try {
      const logsRef = collection(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs");
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(45000));
      const snap = await getDocs(q);
      firestoreLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn("Could not fetch historical logs from Firestore during upload:", err);
    }

    // Połącz logi i usuń duplikaty (priorytet ma SQLite, potem Firestore, potem stary IDB)
    const allLogsMap = new Map();
    oldIndexedDbLogs.forEach(log => allLogsMap.set(log.id || log.nsId || `${log.type}_${log.timestamp}`, log));
    firestoreLogs.forEach(log => allLogsMap.set(log.id || log.nsId || `${log.type}_${log.timestamp}`, log));
    sqliteLogs.forEach(log => allLogsMap.set(log.id || log.nsId || `${log.type}_${log.timestamp}`, log));
    
    const combinedLogs = Array.from(allLogsMap.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 45000);
    
    // Zapisz też lokalnie na tym urządzeniu połączone logi (żeby od razu tu też były pełne)
    if (combinedLogs.length > sqliteLogs.length) {
      await dbService.saveMultipleLogs(combinedLogs).catch(console.error);
      await saveLocalLogs(combinedLogs).catch(console.error);
    }
    
    // Zrzut (Eksport) całej wyuczonej struktury i wag sieci neuronowej GlikoSense
    const mlModelBackup = await MLAnalyzer.exportCurrentModel().catch(e => {
        console.warn("Could not export ML model during cloud sync", e);
        return null;
    });

    const exportData = {
      timestamp: Date.now(),
      localStorage: lsData,
      logs: combinedLogs,
      mlModel: mlModelBackup,
      settings: settings
    };

    const jsonStr = JSON.stringify(exportData);
    const compressedPayload = LZString.compressToUTF16(jsonStr);

    await setDoc(
      doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "syncPackage", "latest"),
      { payload: compressedPayload, timestamp: Date.now(), isCompressed: true }
    );
    localStorage.setItem('last_cloud_package_sync', Date.now().toString());
    return true;
  } catch (e) {
    console.error("Cloud package upload failed:", e);
    return false;
  }
};

export const downloadCloudPackage = async (user: any) => {
  if (!user) return false;
  try {
    const snap = await getDoc(
      doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "syncPackage", "latest")
    );
    
    let parsedLogs: any[] = [];
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.payload) {
        let parsed: any;
        try {
          if (data.isCompressed) {
            const decompressed = LZString.decompressFromUTF16(data.payload);
            if (!decompressed) throw new Error("Decompression returned null");
            parsed = JSON.parse(decompressed);
          } else {
            // Fallback for older uncompressed packages
            parsed = JSON.parse(data.payload);
          }
        } catch (e) {
          console.error("Failed to parse package payload", e);
        }

        if (parsed) {
          // Przywróć ustawienia localStorage
          if (parsed.localStorage) {
            Object.keys(parsed.localStorage).forEach(key => {
              localStorage.setItem(key, parsed.localStorage[key]);
            });
          }
          // Przywróć model sieci neuronowej
          if (parsed.mlModel && parsed.mlModel.weightDataB64) {
            console.log("Restoring ML Model from Cloud Package...");
            await MLAnalyzer.importModelFromBackup(parsed.mlModel).catch(console.error);
          }
          if (parsed.logs && Array.isArray(parsed.logs)) {
            parsedLogs = parsed.logs;
          }
          // Przywróć ustawienia profilu w Firebase
          if (parsed.settings) {
            await setDoc(
              doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile"),
              parsed.settings,
              { merge: true }
            );
          }
        }
      }
    }

    // Dodatkowo: pobierz pełne historyczne logi z kolekcji w Firestore, by zapewnić, że lokalna baza SQLite ma całe 50+ dni (a nie tylko ograniczenie do zrzutu)
    let firestoreLogs: any[] = [];
    try {
      const logsRef = collection(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs");
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(45000));
      const fsSnap = await getDocs(q);
      firestoreLogs = fsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn("Could not fetch historical logs from Firestore during download:", err);
    }

    const allLogsMap = new Map();
    firestoreLogs.forEach(log => allLogsMap.set(log.id || log.nsId || `${log.type}_${log.timestamp}`, log));
    parsedLogs.forEach(log => allLogsMap.set(log.id || log.nsId || `${log.type}_${log.timestamp}`, log));

    const combinedRestoredLogs = Array.from(allLogsMap.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 45000);

    if (combinedRestoredLogs.length > 0) {
      console.log(`Restoring ${combinedRestoredLogs.length} logs from Cloud Package and Firestore history...`);
      await saveLocalLogs(combinedRestoredLogs).catch(console.error);
      await dbService.saveMultipleLogs(combinedRestoredLogs).catch(console.error);
    } else if (parsedLogs.length === 0 && firestoreLogs.length === 0 && !snap.exists()) {
      return false;
    }

    localStorage.setItem('last_cloud_package_sync', Date.now().toString());
    return true;
  } catch (e) {
    console.error("Cloud package download failed:", e);
    return false;
  }
};

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
    const ok = await uploadCloudPackage(user, settings);
    if (ok) {
      setLastSync(Date.now());
      toast.success(i18n.t('auto.dane_wyslane_do_paczki_w_chmur', { defaultValue: i18n.t('auto.dane_wyslane_do_paczki_w', { defaultValue: "Dane wysłane do paczki w chmurze" }) }));
    } else {
      toast.error(i18n.t('auto.blad_zapisu_zbyt_duzo_danych', { defaultValue: i18n.t('auto.blad_zapisu_zbyt_duzo_dan', { defaultValue: "Błąd zapisu (zbyt dużo danych?)." }) }));
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!user) return;
    setLoading(true);
    const ok = await downloadCloudPackage(user);
    if (ok) {
      setLastSync(Date.now());
      toast.success(i18n.t('auto.pobrano_paczke_chmurowa_przela', { defaultValue: i18n.t('auto.pobrano_paczke_chmurowa_p', { defaultValue: "Pobrano paczkę chmurową. Przeładowuję..." }) }));
      setTimeout(() => window.location.reload(), 1500);
    } else {
      toast.error(i18n.t('auto.blad_podczas_pobierania_paczki', { defaultValue: i18n.t('auto.blad_podczas_pobierania_p', { defaultValue: "Błąd podczas pobierania paczki lub brak kopii" }) }));
    }
    setLoading(false);
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
        
                      {t('auto.pozwala_zredukować_zużycie_odczytów', { defaultValue: i18n.t('auto.pozwala_zredukowac_zuzyci', { defaultValue: "Pozwala zredukować zużycie odczytów bazy Firebase. Aplikacja zamiast przesyłać poszczególne zdarzenia jedno po drugim, przesyła historię, dziennik i ustawienia w formie pojedynczej paczki zbiorczej (aktualizowane ręcznie). Idealne do przenoszenia stanu na drugie urządzenie lub robienia kopii w chmurze bez ciągłego obciążania bazy." }) })}
                    </p>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button 
          onClick={handleUpload}
          disabled={loading}
          className="bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 border border-sky-500/20 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all w-full"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />} 
           
                            {t('auto.wyślij_do_chmury', { defaultValue: i18n.t('auto.wyslij_do_chmury', { defaultValue: "Wyślij do chmury" }) })}
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

