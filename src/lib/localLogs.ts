import { LogEntry } from '../types';

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
  const db = await openLocalLogsDB();
  return new Promise((resolve, reject) => {
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
}

export async function loadLocalLogs(): Promise<LogEntry[]> {
  const db = await openLocalLogsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const data = request.result as LogEntry[];
      // Zwracamy posortowane malejąco
      resolve(data.sort((a,b) => b.timestamp - a.timestamp));
    };
    request.onerror = () => reject(request.error);
  });
}
