import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isWeb: boolean;
  private savePromise: Promise<void> | null = null;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.isWeb = Capacitor.getPlatform() === 'web';
  }

  async init(): Promise<void> {
    // Guard: if already initialized, skip to avoid double-init on hot reload / OTA
    if (this.db) {
      return;
    }

    try {
      if (this.isWeb) {
        // Inicjalizacja dla przeglądarki (PWA) z jeep-sqlite
        const jeepEl = document.createElement('jeep-sqlite');
        
        // Build absolute path to ensure jeep-sqlite can resolve it regardless of base URL
        let basePath = import.meta.env.BASE_URL;
        if (basePath === './') {
            basePath = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
        }
        // jeep-sqlite expects the DIRECTORY path where sql-wasm.wasm is located
        const wasmDirUrl = new URL(`${basePath}assets`, window.location.origin).href;
        
        (jeepEl as any).wasmPath = wasmDirUrl;
        jeepEl.setAttribute('wasmPath', wasmDirUrl);
        document.body.appendChild(jeepEl);
        await customElements.whenDefined('jeep-sqlite');
        await this.sqlite.initWebStore();
      }

      const dbName = 'glikocontrol_db';
      const isEncrypted = !this.isWeb;
      const mode = isEncrypted ? 'encryption' : 'no-encryption';

      if (isEncrypted) {
        let dbSecret = "";
        try {
          const result = await SecureStoragePlugin.get({ key: "db_encryption_key" });
          if (result && result.value) {
            dbSecret = result.value;
          } else {
            dbSecret = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            await SecureStoragePlugin.set({ key: "db_encryption_key", value: dbSecret });
          }
        } catch(e) {
          dbSecret = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
          await SecureStoragePlugin.set({ key: "db_encryption_key", value: dbSecret }).catch(() => {});
        }

        try {
          // setEncryptionSecret() can only be called once per process lifetime.
          // On hot-reload or OTA restarts it throws "passphrase already set" – that's fine, ignore it.
          await CapacitorSQLite.setEncryptionSecret({ passphrase: dbSecret });
        } catch(e: any) {
          if (!String(e?.message || e).includes('passphrase')) {
            console.error("Set encryption secret failed", e);
          }
        }
      }

      // Połączenie z bazą
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(dbName, false)).result;

      try {
        if (ret.result && isConn) {
          // Reuse existing connection (e.g. after hot-reload)
          this.db = await this.sqlite.retrieveConnection(dbName, false);
        } else {
          // Close any stale connection that exists without consistency
          if (isConn) {
            try { await this.sqlite.closeConnection(dbName, false); } catch { /* ignore */ }
          }
          this.db = await this.sqlite.createConnection(dbName, isEncrypted, mode, 1, false);
        }
        await this.db.open();
      } catch (openError: any) {
        const msg = String(openError?.message || openError);

        if (msg.includes('already exists')) {
          // Connection object exists but is stale – retrieve it and try to open
          try {
            this.db = await this.sqlite.retrieveConnection(dbName, false);
            await this.db.open();
          } catch (retrieveErr) {
            console.error("Could not retrieve stale connection", retrieveErr);
          }
        } else {
          // Zamiast kasować bazę w ciemno (co niszczy całą historię użytkownika),
          // spróbujmy bezpiecznie zamknąć stare lub zawieszone połączenie i otworzyć ponownie po krótkiej przerwie.
          console.warn("DB Open failed – attempting safe close and reopen without data wipe.", openError);
          try {
            await this.sqlite.closeConnection(dbName, false);
          } catch { /* ignore */ }
          
          try {
            await new Promise(r => setTimeout(r, 250));
            this.db = await this.sqlite.createConnection(dbName, isEncrypted, mode, 1, false);
            await this.db.open();
          } catch (reopenErr) {
            console.error("Failed to reopen database safely after error. Database wipe will NOT be performed automatically to protect user history.", reopenErr);
            throw reopenErr;
          }
        }
      }

      if (!this.db) {
        throw new Error("Database connection could not be established after all recovery attempts.");
      }

      // Utworzenie tabel dla logów glikemii (jeśli nie istnieją)
      await this.createTables();

    } catch (e) {
      console.error('Database initialization failed', e);
    }
  }

  private async createTables() {
    if (!this.db) return;
    const query = `
      CREATE TABLE IF NOT EXISTS application_logs (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0
      );
    `;
    await this.db.execute(query);
  }

  async saveLog(log: any) {
    if (!this.db || !log) return;
    
    // Zapobiegamy równoległemu zapisowi (mutex), aby wyeliminować "database is locked" w SQLite
    while (this.savePromise) {
      await this.savePromise;
    }
    
    let resolveSave: () => void;
    this.savePromise = new Promise(resolve => { resolveSave = resolve; });

    try {
      const id = log.id || log.nsId || `${log.type}_${log.timestamp}`;
      const payloadStr = JSON.stringify(log);
      const query = `INSERT OR REPLACE INTO application_logs (id, timestamp, type, payload, is_synced) VALUES (?, ?, ?, ?, 0)`;
      
      try {
        await this.db.run(query, [id, log.timestamp, log.type, payloadStr]);
      } catch (e: any) {
        if (e?.message?.includes("not opened") || e?.message?.includes("closed")) {
          console.warn("DB not opened, attempting to open and retry", e);
          await this.db.open();
          await this.db.run(query, [id, log.timestamp, log.type, payloadStr]);
        } else {
          throw e;
        }
      }
      
      if (this.isWeb) {
        await this.sqlite.saveToStore('glikocontrol_db');
      }
    } catch (e) {
      console.error("Save log error", e);
    } finally {
      if (resolveSave!) {
        resolveSave();
      }
      this.savePromise = null;
    }
  }

  async saveMultipleLogs(logs: any[]) {
    if (!this.db || logs.length === 0) return;
    
    // Zapobiegamy równoległemu zapisowi (mutex), co mogłoby wywołać błąd "database is locked" w SQLite na Androidzie
    while (this.savePromise) {
      await this.savePromise;
    }
    
    let resolveSave: () => void;
    this.savePromise = new Promise(resolve => { resolveSave = resolve; });

    try {
      const BATCH_SIZE = 500;
      for (let i = 0; i < logs.length; i += BATCH_SIZE) {
        const chunk = logs.slice(i, i + BATCH_SIZE);
        const statements = chunk.map(log => {
          const id = log.id || log.nsId || `${log.type}_${log.timestamp}`;
          const payloadStr = JSON.stringify(log);
          return {
            statement: `INSERT OR REPLACE INTO application_logs (id, timestamp, type, payload, is_synced) VALUES (?, ?, ?, ?, 0)`,
            values: [id, log.timestamp, log.type, payloadStr]
          };
        });
        
        try {
          await this.db.executeSet(statements);
        } catch(innerE: any) {
          if (innerE?.message?.includes("not opened") || innerE?.message?.includes("closed")) {
             console.warn("DB not opened in batch save, attempting to open and retry", innerE);
             await this.db.open();
             await this.db.executeSet(statements);
          } else {
             throw innerE;
          }
        }
      }
      
      if (this.isWeb) {
        await this.sqlite.saveToStore('glikocontrol_db');
      }
    } catch (e) {
      console.error("Batch save error", e);
    } finally {
      if (resolveSave!) {
        resolveSave();
      }
      this.savePromise = null;
    }
  }

  async getLogs(limit: number = 45000): Promise<any[]> {
    if (!this.db) return [];
    try {
      const res = await this.db.query(`SELECT payload FROM application_logs ORDER BY timestamp DESC LIMIT ?`, [limit]);
      if (res.values) {
        return res.values.map((row: any) => JSON.parse(row.payload));
      }
    } catch (e: any) {
      if (e?.message?.includes("not opened") || e?.message?.includes("closed")) {
         console.warn("DB not opened in getLogs, attempting to open and retry", e);
         try {
           await this.db.open();
           const res = await this.db.query(`SELECT payload FROM application_logs ORDER BY timestamp DESC LIMIT ?`, [limit]);
           if (res.values) {
             return res.values.map((row: any) => JSON.parse(row.payload));
           }
         } catch(innerE) {
           console.error("Get logs retry error", innerE);
         }
      } else {
        console.error("Get logs error", e);
      }
    }
    return [];
  }
  
  async deleteLog(id: string) {
    if (!this.db || !id) return;
    
    while (this.savePromise) {
      await this.savePromise;
    }
    
    let resolveSave: () => void;
    this.savePromise = new Promise(resolve => { resolveSave = resolve; });

    try {
      const query = `DELETE FROM application_logs WHERE id = ? OR payload LIKE ?`;
      
      try {
        await this.db.run(query, [id, `%"nsId":"${id}"%`]);
      } catch(e: any) {
        if (e?.message?.includes("not opened") || e?.message?.includes("closed")) {
           console.warn("DB not opened in deleteLog, attempting to open and retry", e);
           await this.db.open();
           await this.db.run(query, [id, `%"nsId":"${id}"%`]);
        } else {
           throw e;
        }
      }
      
      if (this.isWeb) {
        await this.sqlite.saveToStore('glikocontrol_db');
      }
    } catch (e) {
      console.error("Delete log error", e);
    } finally {
      if (resolveSave!) {
        resolveSave();
      }
      this.savePromise = null;
    }
  }
}

export const dbService = new DatabaseService();
