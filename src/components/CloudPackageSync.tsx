import { useAuthStore } from '../stores/useAuthStore';
import { useLogsStore } from '../stores/useLogsStore';
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
import { dbService } from '../services/databaseService';
import { MLAnalyzer } from '../services/mlSugarAnalyzer';
import * as LZString from 'lz-string';

export const uploadCloudPackage = async (user: any, settings: UserSettings) => {
  const currentUser = user || auth.currentUser;
  if (!currentUser) return false;
  const uid = getEffectiveUid(currentUser) || currentUser.uid;
  if (!uid) return false;

  try {
    const lsData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('firebase')) {
        lsData[key] = localStorage.getItem(key) || '';
      }
    }
  
    // Pobierz pełną historię: łączymy wpisy z bazy SQLite telefonu oraz pamięci RAM
    const activeLogs = useLogsStore.getState().logs || [];
    const dbLogs = await dbService.getLogs(60000).catch(() => []);
    const allMap = new Map();
    dbLogs.forEach((l: any) => { if (l && l.id) allMap.set(l.id, l); });
    activeLogs.forEach((l: any) => { if (l && l.id) allMap.set(l.id, l); });
    let logsToSave = Array.from(allMap.values()).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Zrzut (Eksport) całej wyuczonej struktury i wag sieci neuronowej GlikoSense
    const mlModelBackup = await MLAnalyzer.exportCurrentModel().catch(e => {
      console.warn("Could not export ML model during cloud sync", e);
      return null;
    });

    // Inteligentny kompresor z bezpiecznym buforem Firebase (max 900 KB, twardy limit Firestore to 1048576 B)
    const MAX_SAFE_BYTES = 900 * 1024;
    let compressedPayload = '';
    let maxLogsLimit = Math.min(logsToSave.length, 30000);

    while (maxLogsLimit >= 2000) {
      const candidateLogs = logsToSave.slice(0, maxLogsLimit);
      const exportData = {
        timestamp: Date.now(),
        localStorage: lsData,
        logs: candidateLogs,
        mlModel: mlModelBackup,
        settings: settings
      };

      const jsonStr = JSON.stringify(exportData);
      compressedPayload = LZString.compressToUTF16(jsonStr);
      const estimatedBytes = compressedPayload.length * 2;

      console.log(`[CloudPackageSync] Packing ${candidateLogs.length} logs: size is ${Math.round(estimatedBytes / 1024)} KB / 1024 KB max`);

      if (estimatedBytes < MAX_SAFE_BYTES) {
        break;
      }
      // Jeśli paczka zbliża się do limitu Firebase, delikatnie redukujemy najstarsze logi
      maxLogsLimit = Math.floor(maxLogsLimit * 0.75);
    }

    await Promise.all([
      setDoc(
        doc(db, "users", uid, "syncPackage", "latest"),
        { payload: compressedPayload, timestamp: Date.now(), isCompressed: true }
      ),
      setDoc(
        doc(db, "artifacts/diacontrolapp/users", uid, "syncPackage", "latest"),
        { payload: compressedPayload, timestamp: Date.now(), isCompressed: true }
      ).catch(() => {})
    ]);
    localStorage.setItem('last_cloud_package_sync', Date.now().toString());
    console.log(`[CloudPackageSync] Successfully saved package to Firestore (well under 1MB limit).`);
    return true;
  } catch (e) {
    console.error("Cloud package upload failed:", e);
    return false;
  }
};

export const downloadCloudPackage = async (user: any, onProgress?: (progress: number) => void) => {
  const currentUser = user || auth.currentUser;
  if (!currentUser) {
    console.error("[CloudPackageSync] Brak zalogowanego użytkownika.");
    return false;
  }
  const uid = getEffectiveUid(currentUser) || currentUser.uid;
  if (!uid) return false;

  try {
    onProgress?.(5);
    
    // Szukamy paczki we wszystkich potencjalnych lokalizacjach Firestore
    let snap: any = await getDoc(doc(db, "users", uid, "syncPackage", "latest")).catch(() => null);
    if (!snap || !snap.exists()) {
      snap = await getDoc(doc(db, "artifacts/diacontrolapp/users", uid, "syncPackage", "latest")).catch(() => null);
    }
    if (!snap || !snap.exists()) {
      snap = await getDoc(doc(db, "users", uid, "backup", "latest")).catch(() => null);
    }
    if (!snap || !snap.exists()) {
      snap = await getDoc(doc(db, "artifacts/diacontrolapp/users", uid, "backup", "latest")).catch(() => null);
    }

    let parsed: any = null;

    if (snap && snap.exists()) {
      const data = snap.data();
      if (data && data.payload) {
        try {
          if (data.isCompressed) {
            let decompressed = LZString.decompressFromUTF16(data.payload);
            if (!decompressed) decompressed = LZString.decompressFromBase64(data.payload);
            if (!decompressed) decompressed = LZString.decompress(data.payload);
            if (!decompressed) decompressed = LZString.decompressFromEncodedURIComponent(data.payload);
            if (decompressed) {
              parsed = JSON.parse(decompressed);
            }
          } else if (typeof data.payload === 'object') {
            parsed = data.payload;
          } else if (typeof data.payload === 'string') {
            parsed = JSON.parse(data.payload);
          }
        } catch (e) {
          console.warn("[CloudPackageSync] Nie udało się sparsować paczki, próbuję odzyskiwania bezpośredniego...", e);
        }
      }
    }

    // FALLBACK / ODZYSKIWANIE BEZPOŚREDNIE Z KOLEKCJI LOGÓW FIRESTORE
    if (!parsed || !parsed.logs || parsed.logs.length === 0) {
      console.log("[CloudPackageSync] Rozpoczynam bezpośrednie pobieranie logów z Firestore...");
      onProgress?.(25);
      
      const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
      
      let recoveredLogs: any[] = [];
      
      // 1. Sprawdź users/{uid}/logs
      try {
        const q1 = query(collection(db, "users", uid, "logs"), orderBy("timestamp", "desc"), limit(10000));
        const s1 = await getDocs(q1);
        if (!s1.empty) {
          s1.forEach(d => {
            const l = d.data();
            recoveredLogs.push({ ...l, id: l.id || d.id });
          });
        }
      } catch (err) {
        console.warn("[CloudPackageSync] Błąd pobierania z users/logs:", err);
      }

      // 2. Sprawdź artifacts/diacontrolapp/users/{uid}/logs
      if (recoveredLogs.length === 0) {
        try {
          const q2 = query(collection(db, "artifacts/diacontrolapp/users", uid, "logs"), orderBy("timestamp", "desc"), limit(10000));
          const s2 = await getDocs(q2);
          if (!s2.empty) {
            s2.forEach(d => {
              const l = d.data();
              recoveredLogs.push({ ...l, id: l.id || d.id });
            });
          }
        } catch (err) {
          console.warn("[CloudPackageSync] Błąd pobierania z artifacts logs:", err);
        }
      }

      // 3. Pobierz ustawienia profilu
      let recoveredSettings: any = null;
      try {
        const setSnap = await getDoc(doc(db, "users", uid, "settings", "profile"));
        if (setSnap.exists()) {
          recoveredSettings = setSnap.data();
        } else {
          const oldSetSnap = await getDoc(doc(db, "artifacts/diacontrolapp/users", uid, "settings", "profile"));
          if (oldSetSnap.exists()) recoveredSettings = oldSetSnap.data();
        }
      } catch (err) {}

      if (recoveredLogs.length > 0 || recoveredSettings) {
        parsed = {
          timestamp: Date.now(),
          logs: recoveredLogs,
          settings: recoveredSettings
        };
      }
    }

    if (!parsed) {
      console.error("[CloudPackageSync] Nie odnaleziono żadnych danych w chmurze dla UID:", uid);
      return false;
    }

    onProgress?.(60);

    // Przywróć ustawienia localStorage
    if (parsed.localStorage && typeof parsed.localStorage === 'object') {
      Object.keys(parsed.localStorage).forEach(key => {
        try {
          if (key) localStorage.setItem(key, parsed.localStorage[key]);
        } catch (e) {}
      });
    }

    // Przywróć model sieci neuronowej
    if (parsed.mlModel && parsed.mlModel.weightDataB64) {
      console.log("Restoring ML Model from Cloud Package...");
      await MLAnalyzer.importModelFromBackup(parsed.mlModel).catch(console.error);
    }

    // Przywróć pełne logi do bazy natywnej SQLite i do IndexedDB (fallback)
    if (parsed.logs && Array.isArray(parsed.logs) && parsed.logs.length > 0) {
      console.log(`[CloudPackageSync] Przywracanie ${parsed.logs.length} logów z chmury...`);
      let sqliteP = 0, idbP = 0;
      const updateP = () => onProgress?.(60 + Math.round((sqliteP + idbP) / 5));

      await Promise.all([
        saveLocalLogs(parsed.logs, (p) => { idbP = p; updateP(); }).catch(console.error),
        dbService.saveMultipleLogs(parsed.logs, (p) => { sqliteP = p; updateP(); }).catch(console.error)
      ]);

      // Natychmiastowa aktualizacja pamięci RAM i aplikacji po pobraniu paczki chmurowej
      useLogsStore.getState().setLogs(parsed.logs);
      window.dispatchEvent(new CustomEvent('localLogAddBatch', { detail: parsed.logs }));
      localStorage.setItem("lastSafeTimestamp", Date.now().toString());
    } else {
      onProgress?.(100);
    }

    // Przywróć ustawienia profilu w Firebase
    if (parsed.settings) {
      await setDoc(
        doc(db, "users", uid, "settings", "profile"),
        parsed.settings,
        { merge: true }
      ).catch(console.error);
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
 user: propUser,
 onImport}: { 
 settings: UserSettings;
 user?: any;
 onImport?: (s: any) => void;
}) {
  const authUser = useAuthStore(state => state.user);
  const user = propUser || authUser;

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


