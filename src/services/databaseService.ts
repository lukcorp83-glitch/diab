import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Product } from '../types';
import { LIB_BASE } from '../data/foodDatabase';

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
            const fallback = localStorage.getItem("db_encryption_key_fallback");
            if (fallback) {
              dbSecret = fallback;
              SecureStoragePlugin.set({ key: "db_encryption_key", value: dbSecret }).catch(()=>{});
            } else {
              dbSecret = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
              await SecureStoragePlugin.set({ key: "db_encryption_key", value: dbSecret });
              localStorage.setItem("db_encryption_key_fallback", dbSecret);
            }
          }
        } catch(e) {
          console.warn("SecureStorage failed, falling back to localStorage", e);
          const fallback = localStorage.getItem("db_encryption_key_fallback");
          if (fallback) {
            dbSecret = fallback;
          } else {
            dbSecret = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            localStorage.setItem("db_encryption_key_fallback", dbSecret);
          }
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
          // Attempt graceful recovery without deleting user data!
          console.warn("DB Open initial attempt failed, attempting to close stale connections and re-open safely:", openError);
          try {
            await this.sqlite.closeConnection(dbName, false);
          } catch { /* ignore */ }
          try {
            this.db = await this.sqlite.retrieveConnection(dbName, false);
            if (this.db) await this.db.open();
          } catch (retryConnErr) {
            console.warn("Retrieve connection failed during recovery, retrying createConnection without wiping data:", retryConnErr);
            try {
              this.db = await this.sqlite.createConnection(dbName, isEncrypted, mode, 1, false);
              if (this.db) await this.db.open();
            } catch (createErr) {
              console.error("Critical: Could not establish SQLite connection without wipe", createErr);
            }
          }
        }
      }

      if (!this.db) {
        throw new Error("Database connection could not be established after all recovery attempts.");
      }

      // Utworzenie tabel dla logów glikemii oraz bazy produktów (jeśli nie istnieją)
      await this.createTables();

      // Zapewnienie, że baza produktów w telefonie jest zawsze zasiana i nie zniknie
      this.ensureFoodDatabaseSeeded().catch(e => console.warn("Food database seeding error:", e));

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
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON application_logs (timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_logs_type ON application_logs (type);

      CREATE TABLE IF NOT EXISTS food_products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_pl TEXT,
        name_en TEXT,
        carbs REAL NOT NULL,
        protein REAL DEFAULT 0,
        fat REAL DEFAULT 0,
        fiber REAL DEFAULT 0,
        kcal REAL DEFAULT 0,
        gi INTEGER DEFAULT 50,
        category TEXT,
        serving_size REAL DEFAULT 100,
        is_custom INTEGER DEFAULT 0,
        barcode TEXT,
        is_favorite INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_food_name_pl ON food_products (name_pl);
      CREATE INDEX IF NOT EXISTS idx_food_name_en ON food_products (name_en);
      CREATE INDEX IF NOT EXISTS idx_food_category ON food_products (category);
    `;
    await this.db.execute(query);

    // Bezpieczne migracje kolumn dla istniejącej bazy w telefonie / na webie
    try {
      await this.db.execute(`ALTER TABLE food_products ADD COLUMN barcode TEXT;`);
    } catch { /* kolumna może już istnieć */ }
    try {
      await this.db.execute(`ALTER TABLE food_products ADD COLUMN is_favorite INTEGER DEFAULT 0;`);
    } catch { /* kolumna może już istnieć */ }

    // Indeksy dla nowych kolumn tworzymy dopiero po upewnieniu się, że kolumny istnieją
    try {
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_food_barcode ON food_products (barcode);`);
    } catch { /* indeks może już istnieć */ }
    try {
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_food_favorite ON food_products (is_favorite);`);
    } catch { /* indeks może już istnieć */ }

    if (this.isWeb) {
      try {
        await this.sqlite.saveToStore('glikocontrol_db');
      } catch {}
    }
  }

  async saveLog(log: any) {
    if (!this.db) return;
    const id = log.id || log.nsId || `${log.type}_${log.timestamp}`;
    
    // Bezpieczna serializacja, usuwająca potencjalnie problematyczne obiekty (np. FieldValue.serverTimestamp())
    const safeLog = { ...log };
    for (const key in safeLog) {
      if (typeof safeLog[key] === 'object' && safeLog[key] !== null) {
        if (safeLog[key]._methodName === 'serverTimestamp' || typeof safeLog[key].isEqual === 'function') {
          safeLog[key] = Date.now();
        }
      }
    }
    
    const payloadStr = JSON.stringify(safeLog);
    const query = `INSERT OR REPLACE INTO application_logs (id, timestamp, type, payload, is_synced) VALUES (?, ?, ?, ?, 0)`;
    
    try {
      await this.db.run(query, [id, log.timestamp, log.type, payloadStr]);
    } catch (e: any) {
      if (e?.message?.includes("not opened") || e?.message?.includes("closed")) {
        console.warn("DB not opened, attempting to open and retry", e);
        await this.db.open();
        await this.db.run(query, [id, log.timestamp, log.type, payloadStr]);
      } else {
        console.warn("Failed to save log to SQLite, skipping throw to prevent UI block", e);
      }
    }
    
    if (this.isWeb) {
      await this.sqlite.saveToStore('glikocontrol_db');
    }
  }

  async addLog(log: any) {
    return this.saveLog(log);
  }

  async saveMultipleLogs(logs: any[], onProgress?: (progress: number) => void) {
    if (!this.db || logs.length === 0) {
      onProgress?.(100);
      return;
    }
    
    // Zapobiegamy równoległemu zapisowi (mutex), co mogłoby wywołać błąd "database is locked" w SQLite na Androidzie
    while (this.savePromise) {
      await this.savePromise;
    }
    
    let resolveSave: () => void;
    this.savePromise = new Promise(resolve => { resolveSave = resolve; });

    try {
      const BATCH_SIZE = 100;
      const total = logs.length;
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunk = logs.slice(i, i + BATCH_SIZE);
        const statements = chunk.map(log => {
          const id = log.id || log.nsId || `${log.type}_${log.timestamp}`;
          const safeLog = { ...log };
          for (const key in safeLog) {
            if (typeof safeLog[key] === 'object' && safeLog[key] !== null) {
              if (safeLog[key]._methodName === 'serverTimestamp' || typeof safeLog[key].isEqual === 'function') {
                safeLog[key] = Date.now();
              }
            }
          }
          const payloadStr = JSON.stringify(safeLog);
          return {
            statement: `INSERT OR REPLACE INTO application_logs (id, timestamp, type, payload, is_synced) VALUES (?, ?, ?, ?, 0)`,
            values: [id, log.timestamp || Date.now(), log.type || 'unknown', payloadStr]
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
             console.warn("Failed batch save to SQLite, skipping throw", innerE);
          }
        }
        onProgress?.(Math.min(100, Math.round(((i + chunk.length) / total) * 100)));
        // Yield to prevent UI thread starvation and SQLite plugin overload
        await new Promise(r => setTimeout(r, 15));
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
    const cleanId = String(id).replace(/^ns-(meal|insulin|site|sensor|cgm|entry|glucose)-/, '');
    const query = `DELETE FROM application_logs WHERE id = ? OR id = ? OR payload LIKE ? OR payload LIKE ? OR payload LIKE ? OR payload LIKE ?`;
    const params = [
      id,
      cleanId,
      `%"id":"${id}"%`,
      `%"nsId":"${id}"%`,
      `%"id":"${cleanId}"%`,
      `%"nsId":"${cleanId}"%`
    ];
    
    try {
      await this.db.run(query, params);
    } catch(e: any) {
      if (e?.message?.includes("not opened") || e?.message?.includes("closed")) {
         console.warn("DB not opened in deleteLog, attempting to open and retry", e);
         await this.db.open();
         await this.db.run(query, params);
      } else {
         throw e;
      }
    }
    
    if (this.isWeb) {
      await this.sqlite.saveToStore('glikocontrol_db');
    }
  }

  /**
   * Zapewnia, że baza produktów w telefonie jest zawsze zasiana i nie znika.
   * Jeśli tabela jest pusta lub zawiera mniej produktów niż wersja w kodzie,
   * wykonuje szybki bulk insert w transakcji SQLite.
   */
  async ensureFoodDatabaseSeeded(force: boolean = false): Promise<void> {
    if (!this.db) return;
    try {
      const res = await this.db.query("SELECT COUNT(*) as count FROM food_products WHERE is_custom = 0;");
      const currentCount = res?.values?.[0]?.count || 0;
      
      if (currentCount < LIB_BASE.length || force) {
        const BATCH_SIZE = 50;
        for (let i = 0; i < LIB_BASE.length; i += BATCH_SIZE) {
          const chunk = LIB_BASE.slice(i, i + BATCH_SIZE);
          const statements = chunk.map((p) => ({
            statement: `INSERT OR REPLACE INTO food_products 
              (id, name, name_pl, name_en, carbs, protein, fat, fiber, kcal, gi, category, serving_size, is_custom) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            values: [
              p.id || `food_${Math.random()}`,
              p.name,
              p.namePl || p.name,
              p.nameEn || p.name,
              p.carbs || 0,
              p.protein || 0,
              p.fat || 0,
              p.fiber || 0,
              p.kcal || 0,
              p.gi !== undefined ? p.gi : 50,
              p.category || 'Inne',
              p.servingSize || 100
            ]
          }));
          await this.db.executeSet(statements);
        }
        if (this.isWeb) {
          await this.sqlite.saveToStore('glikocontrol_db');
        }
      }
    } catch (e) {
      console.warn("Food products seeding warning:", e);
    }
  }

  /**
   * Szybkie wyszukiwanie produktów bezpośrednio w SQLite z indeksem i limitowaniem.
   * Działa w 2-5ms niezależnie od liczby produktów w bazie.
   */
  async searchFoodProducts(searchTerm: string = '', category: string = 'all', limit: number = 40): Promise<Product[]> {
    const rawTerm = searchTerm.trim().toLowerCase();

    // Fallback gdy połączenie z bazą nie jest jeszcze gotowe
    if (!this.db) {
      let filtered = LIB_BASE;
      if (category && category !== 'all' && category !== 'Wszystko') {
        filtered = filtered.filter(p => (p.category || '').toLowerCase().includes(category.toLowerCase()));
      }
      if (rawTerm) {
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(rawTerm) ||
          (p.namePl && p.namePl.toLowerCase().includes(rawTerm)) ||
          (p.nameEn && p.nameEn.toLowerCase().includes(rawTerm))
        );
      }
      return filtered.slice(0, limit);
    }

    try {
      let query = `SELECT * FROM food_products WHERE 1=1`;
      const params: any[] = [];

      if (category && category !== 'all' && category !== 'Wszystko') {
        query += ` AND (LOWER(category) LIKE ?)`;
        params.push(`%${category.toLowerCase()}%`);
      }

      if (rawTerm) {
        query += ` AND (LOWER(name_pl) LIKE ? OR LOWER(name_en) LIKE ? OR LOWER(name) LIKE ?)`;
        params.push(`%${rawTerm}%`, `%${rawTerm}%`, `%${rawTerm}%`);
        query += ` ORDER BY 
          CASE 
            WHEN LOWER(name_pl) LIKE ? THEN 1
            WHEN LOWER(name_pl) LIKE ? THEN 2
            ELSE 3
          END, LOWER(name_pl) ASC`;
        params.push(`${rawTerm}%`, `% ${rawTerm}%`);
      } else {
        query += ` ORDER BY LOWER(name_pl) ASC`;
      }

      query += ` LIMIT ?`;
      params.push(limit);

      const res = await this.db.query(query, params);
      if (res.values && res.values.length > 0) {
        return res.values.map((row: any) => ({
          id: row.id,
          name: row.name,
          namePl: row.name_pl,
          nameEn: row.name_en,
          carbs: Number(row.carbs) || 0,
          protein: Number(row.protein) || 0,
          fat: Number(row.fat) || 0,
          fiber: Number(row.fiber) || 0,
          kcal: Number(row.kcal) || 0,
          gi: Number(row.gi) || 50,
          category: row.category,
          servingSize: Number(row.serving_size) || 100,
          isCustom: Boolean(row.is_custom),
          barcode: row.barcode || undefined,
          isFavorite: Boolean(row.is_favorite)
        }));
      }
    } catch (e: any) {
      console.warn("searchFoodProducts SQLite error, using memory fallback", e);
    }

    // Bezpieczny fallback do pamięci RAM
    let fallback = LIB_BASE;
    if (category && category !== 'all' && category !== 'Wszystko') {
      fallback = fallback.filter(p => (p.category || '').toLowerCase().includes(category.toLowerCase()));
    }
    if (rawTerm) {
      fallback = fallback.filter(p => 
        p.name.toLowerCase().includes(rawTerm) ||
        (p.namePl && p.namePl.toLowerCase().includes(rawTerm)) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(rawTerm))
      );
    }
    return fallback.slice(0, limit);
  }

  /**
   * Trwały zapis własnego produktu do bazy SQLite telefonu oraz pamięci offline.
   */
  async saveFoodProduct(p: Product): Promise<void> {
    if (p.barcode) {
      try {
        localStorage.setItem(`gliko_bc_${p.barcode.trim()}`, JSON.stringify(p));
      } catch {}
    }
    if (!this.db) return;
    try {
      const id = p.id || (p.barcode ? `barcode_${p.barcode.trim()}` : `custom_${Date.now()}`);
      const statement = `INSERT OR REPLACE INTO food_products 
        (id, name, name_pl, name_en, carbs, protein, fat, fiber, kcal, gi, category, serving_size, is_custom, barcode, is_favorite)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`;
      await this.db.run(statement, [
        id,
        p.name,
        p.namePl || p.name,
        p.nameEn || p.name,
        p.carbs || 0,
        p.protein || 0,
        p.fat || 0,
        p.fiber || 0,
        p.kcal || 0,
        p.gi !== undefined ? p.gi : 50,
        p.category || 'Inne',
        p.servingSize || 100,
        p.barcode ? p.barcode.trim() : null,
        p.isFavorite ? 1 : 0
      ]);
      if (this.isWeb) {
        await this.sqlite.saveToStore('glikocontrol_db');
      }
    } catch (e) {
      console.warn("Failed to save food product to SQLite", e);
    }
  }

  /**
   * Błyskawiczne pobranie produktu po kodzie kreskowym z bazy SQLite telefonu (100% offline).
   */
  async getFoodProductByBarcode(barcode: string): Promise<Product | null> {
    if (!barcode) return null;
    const cleanBarcode = barcode.trim();

    // 1. Sprawdź natychmiastową pamięć podręczną localStorage
    try {
      const cached = localStorage.getItem(`gliko_bc_${cleanBarcode}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.name || parsed.carbs !== undefined)) {
          return parsed;
        }
      }
    } catch { /* ignore */ }

    if (!this.db) return null;

    try {
      const res = await this.db.query(
        `SELECT * FROM food_products WHERE barcode = ? LIMIT 1`,
        [cleanBarcode]
      );
      if (res.values && res.values.length > 0) {
        const row = res.values[0];
        const prod: Product = {
          id: row.id,
          name: row.name,
          namePl: row.name_pl,
          nameEn: row.name_en,
          carbs: Number(row.carbs) || 0,
          protein: Number(row.protein) || 0,
          fat: Number(row.fat) || 0,
          fiber: Number(row.fiber) || 0,
          kcal: Number(row.kcal) || 0,
          gi: Number(row.gi) || 50,
          category: row.category || 'Skanowane',
          servingSize: Number(row.serving_size) || 100,
          isCustom: Boolean(row.is_custom),
          barcode: row.barcode,
          isFavorite: Boolean(row.is_favorite)
        };
        try {
          localStorage.setItem(`gliko_bc_${cleanBarcode}`, JSON.stringify(prod));
        } catch {}
        return prod;
      }
    } catch (e) {
      console.warn("getFoodProductByBarcode error:", e);
    }
    return null;
  }

  /**
   * Przełączenie statusu ulubionego produktu w SQLite.
   */
  async toggleFoodFavorite(id: string, isFavorite: boolean): Promise<void> {
    if (!this.db || !id) return;
    try {
      await this.db.run(
        `UPDATE food_products SET is_favorite = ? WHERE id = ?`,
        [isFavorite ? 1 : 0, id]
      );
      if (this.isWeb) {
        await this.sqlite.saveToStore('glikocontrol_db');
      }
    } catch (e) {
      console.warn("toggleFoodFavorite SQLite error:", e);
    }
  }

  /**
   * Pobranie wszystkich ulubionych produktów z SQLite.
   */
  async getFavoriteFoodProducts(): Promise<Product[]> {
    if (!this.db) return [];
    try {
      const res = await this.db.query(
        `SELECT * FROM food_products WHERE is_favorite = 1 ORDER BY LOWER(name_pl) ASC`
      );
      if (res.values && res.values.length > 0) {
        return res.values.map((row: any) => ({
          id: row.id,
          name: row.name,
          namePl: row.name_pl,
          nameEn: row.name_en,
          carbs: Number(row.carbs) || 0,
          protein: Number(row.protein) || 0,
          fat: Number(row.fat) || 0,
          fiber: Number(row.fiber) || 0,
          kcal: Number(row.kcal) || 0,
          gi: Number(row.gi) || 50,
          category: row.category,
          servingSize: Number(row.serving_size) || 100,
          isCustom: Boolean(row.is_custom),
          barcode: row.barcode,
          isFavorite: true
        }));
      }
    } catch (e) {
      console.warn("getFavoriteFoodProducts SQLite error:", e);
    }
    return [];
  }

  /**
   * Trwałe usunięcie produktu z bazy SQLite telefonu.
   */
  async deleteFoodProduct(id: string): Promise<void> {
    if (!this.db || !id) return;
    try {
      await this.db.run(`DELETE FROM food_products WHERE id = ?`, [id]);
      if (this.isWeb) {
        await this.sqlite.saveToStore('glikocontrol_db');
      }
    } catch (e) {
      console.warn("Failed to delete food product from SQLite", e);
    }
  }

  /**
   * Zwraca podsumowanie i statystyki lokalnej bazy danych SQLite.
   */
  async getDatabaseInfo(): Promise<{
    status: string;
    isWeb: boolean;
    totalLogs: number;
    logTypes: Record<string, number>;
    totalFoodProducts: number;
    customFoodProducts: number;
    favoriteFoodProducts: number;
    oldestLogDate?: string;
    newestLogDate?: string;
  } | null> {
    if (!this.db) return null;
    try {
      const logsCountRes = await this.db.query("SELECT COUNT(*) as count FROM application_logs;");
      const totalLogs = logsCountRes?.values?.[0]?.count || 0;

      const typesRes = await this.db.query("SELECT type, COUNT(*) as count FROM application_logs GROUP BY type;");
      const logTypes: Record<string, number> = {};
      if (typesRes?.values) {
        typesRes.values.forEach((row: any) => {
          logTypes[row.type] = row.count;
        });
      }

      const rangeRes = await this.db.query("SELECT MIN(timestamp) as min_ts, MAX(timestamp) as max_ts FROM application_logs;");
      const minTs = rangeRes?.values?.[0]?.min_ts;
      const maxTs = rangeRes?.values?.[0]?.max_ts;

      const foodCountRes = await this.db.query("SELECT COUNT(*) as count FROM food_products;");
      const customFoodRes = await this.db.query("SELECT COUNT(*) as count FROM food_products WHERE is_custom = 1;");
      const favFoodRes = await this.db.query("SELECT COUNT(*) as count FROM food_products WHERE is_favorite = 1;");

      return {
        status: "connected",
        isWeb: this.isWeb,
        totalLogs,
        logTypes,
        totalFoodProducts: foodCountRes?.values?.[0]?.count || 0,
        customFoodProducts: customFoodRes?.values?.[0]?.count || 0,
        favoriteFoodProducts: favFoodRes?.values?.[0]?.count || 0,
        oldestLogDate: minTs ? new Date(minTs).toLocaleString() : undefined,
        newestLogDate: maxTs ? new Date(maxTs).toLocaleString() : undefined,
      };
    } catch (e) {
      console.error("Failed to get database info:", e);
      return null;
    }
  }
}

export const dbService = new DatabaseService();

if (typeof window !== 'undefined') {
  (window as any).dbService = dbService;
  (window as any).getDbInfo = () => dbService.getDatabaseInfo();
}
