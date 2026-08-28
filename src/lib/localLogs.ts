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

export async function saveLocalLogs(logs: LogEntry[], onProgress?: (progress: number) => void): Promise<void> {
  const db = await openLocalLogsDB();
  const BATCH_SIZE = 1500;
  const total = logs.length;
  if (total === 0) {
    onProgress?.(100);
    return;
  }
  
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = logs.slice(i, i + BATCH_SIZE);
    
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      chunk.forEach(l => {
        if (l.id) {
          store.put(l);
        }
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    onProgress?.(Math.min(100, Math.round(((i + chunk.length) / total) * 100)));
    // Oddajemy kontrolę głównemu wątkowi (UI) by zapobiec tzw. 'białemu ekranowi' (hang/freeze)
    await new Promise(r => setTimeout(r, 10));
  }
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

export async function deleteLocalLog(id: string): Promise<void> {
  const db = await openLocalLogsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
