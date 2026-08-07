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
        // Sprawdzamy czy już zmigrowano (lokalnie lub w Firebase)
        const localMigrated = localStorage.getItem(`migrated_${uid}`) === 'true';
        const profileSnap = await getDoc(doc(db, "users", uid, "settings", "profile"));
        
        // Zabezpieczenie przed pętlą (np. przycisk Pomiń): Jeśli użytkownik ma już flagę migracji, kończymy proces.
        if (localMigrated || (profileSnap.exists() && profileSnap.data().hasMigratedFromV1)) {
          setMigrationState('done');
          return;
        }
        
        // Jeśli nie zmigrował, kontynuujemy sprawdzanie, czy ma jakieś dane w V1.
        
        // Sprawdzamy czy zmigrowano skróty i czy w V1 one w ogóle istnieją
        const newShortcutsRef = collection(db, "users", uid, "shortcuts");
        const newShortcutsSnap = await getDocs(query(newShortcutsRef, limit(1)));

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

    // 2. Kopiujemy logi klasycznie (z Firestore logs) - omijamy zepsutą paczkę chmurową
    setProgress(10);
    try {
      const oldLogsRef = collection(db, "artifacts/diacontrolapp/users", uid, "logs");
      const MAX_LOGS = 30000;
      const CHUNK_SIZE = 500;
      let lastDocSnap: any = null;
      let hasMore = true;
      let totalFetched = 0;
      let allLogs: any[] = [];

      // Pobieramy logi w małych partiach, aby nie zawiesić silnika przeglądarki ani kolejki Firebase na telefonach
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

         allLogs.push(...snap.docs.map(d => d.data()));
         lastDocSnap = snap.docs[snap.docs.length - 1];
         totalFetched += snap.size;
         
         // Dajemy UI chwilę oddechu na przerysowanie ekranu między partiami (bardzo ważne dla stabilności na Androidzie)
         setProgress(10 + Math.round((totalFetched / MAX_LOGS) * 40)); 
         await new Promise(r => setTimeout(r, 100));
      }

      if (allLogs.length > 0) {
        let sqliteP = 0, idbP = 0;
        const updateP = () => setProgress(50 + Math.round((sqliteP + idbP) / 2 * 0.5)); // 50% - 100%
        
        await Promise.all([
          saveLocalLogs(allLogs as any, (p) => { idbP = p; updateP(); }).catch(console.error),
          dbService.saveMultipleLogs(allLogs, (p) => { sqliteP = p; updateP(); }).catch(console.error)
        ]);
      } else {
        setProgress(100);
      }
    } catch (err) {
      console.error("Logs migration failed", err);
      setProgress(100);
    }
  };

  const confirmMigration = async () => {
    if (!user) return;
    try {
      const uid = getEffectiveUid(user);
      
      // Zapisujemy do Firebase i bezwzględnie czekamy na odpowiedź serwera (aby flaga zsynchronizowała się z chmurą)
      // Używamy Promise.race jako bezpiecznika na wypadek zawieszenia sieci (max 3 sekundy)
      await Promise.race([
        setDoc(doc(db, "users", uid, "settings", "profile"), { hasMigratedFromV1: true }, { merge: true }),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);
      
      setMigrationState('done');
      toast.success(t('auto.migracja_zakonczona', { defaultValue: "Migracja poprawnie potwierdzona!" }));
      
      // Dodatkowo zapisujemy w localStorage jako szybki fallback
      localStorage.setItem(`migrated_${uid}`, 'true');
      
      setTimeout(() => window.location.reload(), 500); 
    } catch (e) {
      toast.error(t('auto.blad', { defaultValue: "Wystąpił błąd podczas potwierdzania." }));
      setTimeout(() => window.location.reload(), 1000);
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
        {(migrationState === 'migrating' || migrationState === 'verify') && (
          <button 
            onClick={confirmMigration}
            className="shrink-0 bg-blue-900/40 text-blue-100 hover:bg-blue-900/60 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 w-full md:w-auto justify-center"
          >
            Pomiń
          </button>
        )}
      </div>
    );
  }

  return null;
};

