import { LogEntry } from '../types';
import { dbService } from '../services/databaseService';

const DB_NAME = 'GlikoControlLocalLogs';
const STORE_NAME = 'logs';

export function openLocalLogsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onerror = (e) => {
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
}

export async function saveLocalLogs(logs: LogEntry[]): Promise<void> {
  // 1. Zapisz w IndexedDB
  const idbPromise = (async () => {
    try {
      const db = await openLocalLogsDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        logs.forEach(l => {
          if (l.id) {
            store.put(l);
          }
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn("IndexedDB saveLocalLogs failed", e);
    }
  })();

  // 2. Równolegle zapisz w SQLite (dbService)
  const sqlitePromise = dbService.saveMultipleLogs(logs).catch(e => console.warn("dbService saveLocalLogs failed", e));

  await Promise.all([idbPromise, sqlitePromise]);
}

export async function loadLocalLogs(): Promise<LogEntry[]> {
  const [idbLogs, sqliteLogs] = await Promise.all([
    (async () => {
      try {
        const db = await openLocalLogsDB();
        return await new Promise<LogEntry[]>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const request = store.getAll();
          request.onsuccess = () => {
            const data = request.result as LogEntry[];
            resolve(data || []);
          };
          request.onerror = () => reject(request.error);
        });
      } catch (e) {
        return [];
      }
    })(),
    dbService.getLogs(45000).catch(() => [] as LogEntry[])
  ]);

  const map = new Map<string, LogEntry>();
  idbLogs.forEach(l => {
    const key = l.nsId || l.id;
    if (key) map.set(key, l);
  });
  sqliteLogs.forEach(l => {
    const key = l.nsId || l.id;
    if (key) map.set(key, l);
  });

  return Array.from(map.values()).sort((a,b) => b.timestamp - a.timestamp);
}

export async function deleteLocalLog(id: string): Promise<void> {
  const idbPromise = (async () => {
    try {
      const db = await openLocalLogsDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {}
  })();

  const sqlitePromise = dbService.deleteLog(id).catch(() => {});
  await Promise.all([idbPromise, sqlitePromise]);
}
