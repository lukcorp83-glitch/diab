import React, { useEffect, useState } from 'react';
import { getEffectiveUid } from '../lib/utils';
import { doc, getDoc, collection, getDocs, writeBatch, setDoc, query, limit, orderBy, startAfter } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';
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
        // Sprawdzamy czy wymuszono ponowną migrację (np. po przypadkowym Pomiń)
        const forceRemigrate = localStorage.getItem(`force_remigrate_${uid}`) === 'true';
        
        // Sprawdzamy czy już zmigrowano (lokalnie lub w Firebase)
        const localMigrated = localStorage.getItem(`migrated_${uid}`) === 'true';
        const profileSnap = await getDoc(doc(db, "users", uid, "settings", "profile"));
        
        // Jeśli wymuszono ponowną migrację, czyścimy flagę i kontynuujemy
        if (forceRemigrate) {
          localStorage.removeItem(`force_remigrate_${uid}`);
          localStorage.removeItem(`migrated_${uid}`);
          await setDoc(doc(db, "users", uid, "settings", "profile"), { hasMigratedFromV1: false }, { merge: true });
        } else if (localMigrated || (profileSnap.exists() && profileSnap.data().hasMigratedFromV1)) {
          // INTELIGENTNA DETEKCJA: Jeśli użytkownik ma stare logi, ale nowa ścieżka Firebase jest (prawie) pusta.
          // (Stary kod zapisywał tylko lokalnie, a nowa ścieżka może mieć kilka nowych logów, więc limit(1) nie działał)
          try {
            const { getCountFromServer } = await import('firebase/firestore');
            
            const newLogsRef = collection(db, "users", uid, "logs");
            const newCountSnap = await getCountFromServer(newLogsRef);
            const newCount = newCountSnap.data().count;

            if (newCount < 100) {
              const oldLogsRef = collection(db, "artifacts/diacontrolapp/users", uid, "logs");
              const oldCountSnap = await getCountFromServer(oldLogsRef);
              const oldCount = oldCountSnap.data().count;

              if (oldCount > newCount) {
                console.warn(`[Migration] Smart detect: Old DB has ${oldCount} logs, new DB only has ${newCount}. Re-running migration...`);
                // Zezwól na kontynuację migracji (nie robimy return)
              } else {
                setMigrationState('done');
                return;
              }
            } else {
              setMigrationState('done');
              return;
            }
          } catch (countErr) {
            console.error("Failed to verify migration count, assuming done", countErr);
            setMigrationState('done');
            return;
          }
        }
        
        // Sprawdzamy czy użytkownik MA starą bazę (czytamy jeden log)
        const oldLogsRef = collection(db, "artifacts/diacontrolapp/users", uid, "logs");
        const q = query(oldLogsRef, limit(1));
        const oldLogsSnap = await getDocs(q);
        
        // Sprawdzamy też czy ma starą paczkę cloud (jeśli nie używał logs, ale miał paczkę)
        const oldPackageSnap = await getDoc(doc(db, "artifacts/diacontrolapp/users", uid, "syncPackage", "latest"));
        
        if (oldLogsSnap.empty && !oldPackageSnap.exists()) {
          // Nie ma starych danych, nie ma czego migrować
          await setDoc(doc(db, "users", uid, "settings", "profile"), { hasMigratedFromV1: true }, { merge: true });
          localStorage.setItem(`migrated_${uid}`, 'true');
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
        setProgress(Math.round((copied / docsToCopy.length) * 4));
      }
    }));

    // Migracja kolekcji "shortcuts" (Szybkie skróty) - bez tego skróty giną
    try {
      const oldShortcutsRef = collection(db, "artifacts/diacontrolapp/users", uid, "shortcuts");
      const shortcutsSnap = await getDocs(oldShortcutsRef);
      if (!shortcutsSnap.empty) {
        const batch = writeBatch(db);
        shortcutsSnap.forEach(docSnap => {
          batch.set(doc(db, "users", uid, "shortcuts", docSnap.id), docSnap.data(), { merge: true });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error(`Failed to copy shortcuts`, err);
    }

    // 2. Kopiujemy logi w małych partiach i od razu zapisujemy do bazy (streaming)
    setProgress(10);
    try {
      const oldLogsRef = collection(db, "artifacts/diacontrolapp/users", uid, "logs");
      const MAX_LOGS = 30000;
      const CHUNK_SIZE = 250;
      let lastDocSnap: any = null;
      let hasMore = true;
      let totalFetched = 0;

      while (hasMore && totalFetched < MAX_LOGS) {
         let q;
         if (lastDocSnap) {
           q = query(oldLogsRef, orderBy("timestamp", "desc"), startAfter(lastDocSnap), limit(CHUNK_SIZE));
         } else {
           q = query(oldLogsRef, orderBy("timestamp", "desc"), limit(CHUNK_SIZE));
         }

         const snap = await getDocs(q);
         if (snap.empty) {
           hasMore = false;
           break;
         }

         const chunkLogs = snap.docs.map(d => d.data());
         
         // Kopiujemy logi do NOWEJ ścieżki Firestore (users/{uid}/logs) — bez tego inne urządzenia nie widzą danych!
         const fbBatch = writeBatch(db);
         snap.docs.forEach(docSnap => {
           fbBatch.set(doc(db, "users", uid, "logs", docSnap.id), docSnap.data(), { merge: true });
         });
         try {
           await fbBatch.commit();
           console.log(`[Migration] Wysłano ${snap.docs.length} logów do chmury (łącznie: ${totalFetched + snap.size})`);
         } catch (batchErr) {
           console.error("[Migration] Błąd wysyłania paczki do chmury:", batchErr);
         }

         // Zapisujemy też lokalnie (SQLite + localStorage) żeby ten komputer miał dane offline
         await Promise.all([
           saveLocalLogs(chunkLogs as any).catch(console.error),
           dbService.saveMultipleLogs(chunkLogs).catch(console.error)
         ]);

         lastDocSnap = snap.docs[snap.docs.length - 1];
         totalFetched += snap.size;
         
         setProgress(10 + Math.round((totalFetched / MAX_LOGS) * 90)); 
         await new Promise(r => setTimeout(r, 150));
      }

      setProgress(100);
    } catch (err) {
      console.error("Logs migration failed", err);
      setProgress(100);
    }
  };

  const confirmMigration = async () => {
    if (!user) return;
    try {
      const uid = getEffectiveUid(user);
      
      await Promise.race([
        setDoc(doc(db, "users", uid, "settings", "profile"), { hasMigratedFromV1: true }, { merge: true }),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);
      
      setMigrationState('done');
      toast.success(t('auto.migracja_zakonczona', { defaultValue: "Migracja poprawnie potwierdzona!" }));
      
      localStorage.setItem(`migrated_${uid}`, 'true');
      
      setTimeout(() => window.location.reload(), 500); 
    } catch (e) {
      toast.error(t('auto.blad', { defaultValue: "Wystąpił błąd podczas potwierdzania." }));
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  // Pomiń w trakcie MIGROWANIA — tylko zamykamy baner, NIE ustawiamy flagi (dane nie zostały skopiowane!)
  const skipDuringMigration = () => {
    setMigrationState('done');
    toast("Migracja pominięta tymczasowo. Przy kolejnym uruchomieniu spróbujemy ponownie.", { icon: "⚠️" });
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
        <button 
          onClick={migrationState === 'migrating' ? skipDuringMigration : confirmMigration}
          className="shrink-0 bg-blue-900/40 text-blue-100 hover:bg-blue-900/60 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 w-full md:w-auto justify-center"
        >
          Pomiń
        </button>
      </div>
    );
  }

  return null;
};
