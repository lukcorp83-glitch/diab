import React, { useEffect, useState } from 'react';
import { getEffectiveUid } from '../lib/utils';
import { doc, getDoc, collection, getDocs, writeBatch, setDoc, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { downloadCloudPackage } from './CloudPackageSync';
import { dbService } from '../services/databaseService';
import { saveLocalLogs } from '../lib/localLogs';

export const MigrationManager: React.FC<{ user: any }> = ({ user }) => {
  const { t } = useTranslation();
  const [migrationState, setMigrationState] = useState<'idle' | 'checking' | 'migrating' | 'verify' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!user) return;
    const checkMigration = async () => {
      setMigrationState('checking');
      const uid = getEffectiveUid(user);
      
      try {
        // Sprawdzamy czy już zmigrowano
        const profileSnap = await getDoc(doc(db, "users", uid, "settings", "profile"));
        if (profileSnap.exists() && profileSnap.data().hasMigratedFromV1) {
          setMigrationState('done');
          return;
        }

        // Sprawdzamy czy użytkownik MA starą bazę (czytamy jeden log)
        const oldLogsRef = collection(db, "artifacts/diacontrolapp/users", uid, "logs");
        const q = query(oldLogsRef, limit(1));
        const oldLogsSnap = await getDocs(q);
        
        // Sprawdzamy też czy ma starą paczkę cloud (jeśli nie używał logs, ale miał paczkę)
        const oldPackageSnap = await getDoc(doc(db, "artifacts/diacontrolapp/users", uid, "syncPackage", "latest"));
        
        if (oldLogsSnap.empty && !oldPackageSnap.exists()) {
          // Nie ma starych danych, nie ma czego migrować, oznaczamy jako done by nie pytać ponownie
          await setDoc(doc(db, "users", uid, "settings", "profile"), { hasMigratedFromV1: true }, { merge: true });
          setMigrationState('done');
          return;
        }

        // Musimy zmigrować
        setMigrationState('migrating');
        await performMigration(uid, user);
        
        // Po udanym kopiowaniu prosimy o weryfikację
        setMigrationState('verify');

      } catch (err) {
        console.error("Migration check failed", err);
        setMigrationState('idle'); // W razie błędu można ponowić
      }
    };
    checkMigration();
  }, [user]);

  const performMigration = async (uid: string, userObj: any) => {
    // 1. Kopiujemy profil, pet, status, nightscout ze starej lokalizacji (równolegle dla przyspieszenia)
    const docsToCopy = [
      ["settings", "profile"],
      ["settings", "nightscout"],
      ["settings", "fcm_token"],
      ["status", "pump"],
      ["pet", "status"]
    ];

    let copied = 0;
    await Promise.all(docsToCopy.map(async ([col, docId]) => {
      try {
        const snap = await getDoc(doc(db, "artifacts/diacontrolapp/users", uid, col, docId));
        if (snap.exists()) {
          await setDoc(doc(db, "users", uid, col, docId), snap.data(), { merge: true });
        }
      } catch (err) {
        console.error(`Failed to copy ${col}/${docId}`, err);
      } finally {
        copied++;
        setProgress(Math.round((copied / docsToCopy.length) * 4)); // Postęp od 0% do 4% w trakcie szybkiego kopiowania
      }
    }));

    // 2. Kopiujemy logi. Najpierw próbujemy pobrać jedną szybką paczkę cloud.
    const success = await downloadCloudPackage(userObj, (p) => setProgress(p));
    
    // Fallback: jeśli użytkownik nie miał utworzonej paczki cloud backup, pobieramy klasycznie (z Firestore logs)
    if (!success) {
      setProgress(10);
      try {
        const oldLogsRef = collection(db, "artifacts/diacontrolapp/users", uid, "logs");
        const snap = await getDocs(oldLogsRef);
        if (!snap.empty) {
          const logs = snap.docs.map(d => d.data());
          let sqliteP = 0, idbP = 0;
          const updateP = () => setProgress(10 + Math.round((sqliteP + idbP) / 2 * 0.9)); // 10% - 100%
          
          await Promise.all([
            saveLocalLogs(logs as any, (p) => { idbP = p; updateP(); }).catch(console.error),
            dbService.saveMultipleLogs(logs, (p) => { sqliteP = p; updateP(); }).catch(console.error)
          ]);
        } else {
          setProgress(100);
        }
      } catch (err) {
        console.error("Fallback logs migration failed", err);
        setProgress(100);
      }
    }
  };

  const confirmMigration = async () => {
    if (!user) return;
    try {
      const uid = getEffectiveUid(user);
      await setDoc(doc(db, "users", uid, "settings", "profile"), { hasMigratedFromV1: true }, { merge: true });
      setMigrationState('done');
      toast.success(t('auto.migracja_zakonczona', { defaultValue: "Migracja poprawnie potwierdzona!" }));
      setTimeout(() => window.location.reload(), 1500); // Przeładuj by upewnić się, że ładuje nową ścieżkę z nowym state
    } catch (e) {
      toast.error(t('auto.blad', { defaultValue: "Wystąpił błąd podczas potwierdzania." }));
    }
  };

  if (migrationState === 'migrating' || migrationState === 'verify') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-500/90 backdrop-blur-md text-white p-3 px-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-full">
        <div className="flex items-center gap-3 w-full">
          {migrationState === 'migrating' ? (
            <Loader2 className="animate-spin shrink-0" size={24} />
          ) : (
            <Database className="shrink-0 animate-pulse" size={24} />
          )}
          <div className="text-sm flex-1">
            <p className="font-bold flex justify-between items-center">
              <span>{migrationState === 'migrating' ? "Aktualizacja bazy danych..." : "Weryfikacja bazy danych"}</span>
              {migrationState === 'migrating' && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{progress}%</span>}
            </p>
            <p className="text-blue-100 text-xs mt-1">
              {migrationState === 'migrating' 
                ? "Przenosimy Twoją historię do nowego, szybszego formatu. To potrwa tylko chwilę." 
                : "Sprawdź swoje stare wpisy. Jeśli wszystko poprawnie się załadowało ze starej wersji, zatwierdź."}
            </p>
            {migrationState === 'migrating' && (
              <div className="w-full bg-blue-900/40 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-white h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
            )}
          </div>
        </div>
        
        {migrationState === 'verify' && (
          <button 
            onClick={confirmMigration}
            className="shrink-0 bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 w-full md:w-auto justify-center"
          >
            <CheckCircle size={16} />
            Potwierdź odbiór danych
          </button>
        )}
      </div>
    );
  }

  return null;
};

