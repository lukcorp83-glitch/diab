import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isWeb: boolean;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.isWeb = Capacitor.getPlatform() === 'web';
  }

  async init(): Promise<void> {
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
          // Setting the secret globally for CapacitorSQLite
          await CapacitorSQLite.setEncryptionSecret({ passphrase: dbSecret });
        } catch(e) {
          console.error("Set encryption secret failed", e);
        }
      }

      // Połączenie z bazą
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(dbName, false)).result;

      try {
        if (ret.result && isConn) {
          this.db = await this.sqlite.retrieveConnection(dbName, false);
        } else {
          this.db = await this.sqlite.createConnection(dbName, isEncrypted, mode, 1, false);
        }
        await this.db.open();
      } catch (openError) {
        console.warn("DB Open failed (likely migration from unencrypted). Wiping old database.", openError);
        try {
          await CapacitorSQLite.deleteDatabase({ database: dbName });
        } catch (delError) {
          console.error("Failed to delete database", delError);
        }
        
        // Re-create the connection after wipe
        this.db = await this.sqlite.createConnection(dbName, isEncrypted, mode, 1, false);
        await this.db.open();
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
    if (!this.db) return;
    const id = log.id || log.nsId || `${log.type}_${log.timestamp}`;
    const payloadStr = JSON.stringify(log);
    const query = `INSERT OR REPLACE INTO application_logs (id, timestamp, type, payload, is_synced) VALUES (?, ?, ?, ?, 0)`;
    await this.db.run(query, [id, log.timestamp, log.type, payloadStr]);
    
    if (this.isWeb) {
      await this.sqlite.saveToStore('glikocontrol_db');
    }
  }

  async saveMultipleLogs(logs: any[]) {
    if (!this.db || logs.length === 0) return;
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
        
        await this.db.executeSet(statements);
      }
      
      if (this.isWeb) {
        await this.sqlite.saveToStore('glikocontrol_db');
      }
    } catch (e) {
      console.error("Batch save error", e);
    }
  }

  async getLogs(limit: number = 15000): Promise<any[]> {
    if (!this.db) return [];
    try {
      const res = await this.db.query(`SELECT payload FROM application_logs ORDER BY timestamp DESC LIMIT ?`, [limit]);
      if (res.values) {
        return res.values.map((row: any) => JSON.parse(row.payload));
      }
    } catch (e) {
      console.error("Get logs error", e);
    }
    return [];
  }
  
  async deleteLog(id: string) {
    if (!this.db) return;
    const query = `DELETE FROM application_logs WHERE id = ? OR payload LIKE ?`;
    await this.db.run(query, [id, `%"nsId":"${id}"%`]);
    if (this.isWeb) {
      await this.sqlite.saveToStore('glikocontrol_db');
    }
  }
}

export const dbService = new DatabaseService();
