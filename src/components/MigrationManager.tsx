import React, { useEffect, useState } from 'react';
import { getEffectiveUid } from '../lib/utils';
import { doc, getDoc, collection, getDocs, writeBatch, setDoc, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const MigrationManager: React.FC<{ user: any }> = ({ user }) => {
  const { t } = useTranslation();
  const [migrationState, setMigrationState] = useState<'idle' | 'checking' | 'migrating' | 'verify' | 'done'>('idle');
  
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
        
        if (oldLogsSnap.empty) {
          // Nie ma starych danych, nie ma czego migrować, oznaczamy jako done by nie pytać ponownie
          await setDoc(doc(db, "users", uid, "settings", "profile"), { hasMigratedFromV1: true }, { merge: true });
          setMigrationState('done');
          return;
        }

        // Musimy zmigrować
        setMigrationState('migrating');
        await performMigration(uid);
        
        // Po udanym kopiowaniu prosimy o weryfikację
        setMigrationState('verify');

      } catch (err) {
        console.error("Migration check failed", err);
        setMigrationState('idle'); // W razie błędu można ponowić
      }
    };
    checkMigration();
  }, [user]);

  const performMigration = async (uid: string) => {
    // 1. Kopiujemy profil, pet, status, nightscout
    const docsToCopy = [
      ["settings", "profile"],
      ["settings", "nightscout"],
      ["settings", "fcm_token"],
      ["status", "pump"],
      ["pet", "status"]
    ];

    for (const [col, docId] of docsToCopy) {
      const snap = await getDoc(doc(db, "artifacts/diacontrolapp/users", uid, col, docId));
      if (snap.exists()) {
        await setDoc(doc(db, "users", uid, col, docId), snap.data(), { merge: true });
      }
    }

    // 2. Kopiujemy logi (w paczkach po 400)
    const oldLogsRef = collection(db, "artifacts/diacontrolapp/users", uid, "logs");
    const oldLogsSnap = await getDocs(oldLogsRef);
    
    let batch = writeBatch(db);
    let count = 0;
    
    for (const d of oldLogsSnap.docs) {
      const newRef = doc(db, "users", uid, "logs", d.id);
      batch.set(newRef, d.data(), { merge: true });
      count++;
      
      if (count === 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
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
        <div className="flex items-center gap-3">
          {migrationState === 'migrating' ? (
            <Loader2 className="animate-spin shrink-0" size={24} />
          ) : (
            <Database className="shrink-0 animate-pulse" size={24} />
          )}
          <div className="text-sm">
            <p className="font-bold">
              {migrationState === 'migrating' ? "Aktualizacja bazy danych..." : "Weryfikacja bazy danych"}
            </p>
            <p className="text-blue-100 text-xs">
              {migrationState === 'migrating' 
                ? "Przenosimy Twoją historię do nowego, szybszego formatu. To potrwa tylko chwilę." 
                : "Sprawdź swoje stare wpisy. Jeśli wszystko poprawnie się załadowało ze starej wersji, zatwierdź."}
            </p>
          </div>
        </div>
        
        {migrationState === 'verify' && (
          <button 
            onClick={confirmMigration}
            className="shrink-0 bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95"
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
