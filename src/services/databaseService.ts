import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

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
        const wasmUrl = new URL(`${basePath}assets/sql-wasm.wasm`, window.location.origin).href;
        
        (jeepEl as any).wasmPath = wasmUrl;
        jeepEl.setAttribute('wasm-path', wasmUrl);
        document.body.appendChild(jeepEl);
        await customElements.whenDefined('jeep-sqlite');
        await this.sqlite.initWebStore();
      }

      // Połączenie z bazą "glikocontrol_db"
      const ret = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection('glikocontrol_db', false)).result;

      if (ret.result && isConn) {
        this.db = await this.sqlite.retrieveConnection('glikocontrol_db', false);
      } else {
        this.db = await this.sqlite.createConnection('glikocontrol_db', false, 'no-encryption', 1, false);
      }

      await this.db.open();

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
      let sqlString = "BEGIN TRANSACTION;\n";
      for (const log of logs) {
        const id = log.id || log.nsId || `${log.type}_${log.timestamp}`;
        const payloadStr = JSON.stringify(log).replace(/'/g, "''"); // escape single quotes for literal
        sqlString += `INSERT OR REPLACE INTO application_logs (id, timestamp, type, payload, is_synced) VALUES ('${id}', ${log.timestamp}, '${log.type}', '${payloadStr}', 0);\n`;
      }
      sqlString += "COMMIT;";
      await this.db.execute(sqlString);
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
