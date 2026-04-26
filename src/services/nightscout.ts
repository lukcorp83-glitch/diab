
import { LogEntry } from '../types';

export interface NightscoutEntry {
  sgv: number;
  date: number;
  dateString: string;
  type: string;
  direction?: string;
}

export interface NightscoutTreatment {
  _id: string;
  eventType: string;
  created_at: string;
  glucose?: number;
  insulin?: number;
  carbs?: number;
  notes?: string;
}

export const nightscoutService = {
  async fetchEntries(url: string, secret?: string, count = 1000): Promise<LogEntry[]> {
    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (secret) {
        // Simple direct fetch token addition
        headers['api-secret'] = secret;
      }
      
      const baseUrl = url.replace(/\/$/, '');
      const cacheBust = `_t=${Date.now()}`;
      const baseApiPath = `/api/v1/entries.json?count=${count}&${cacheBust}`;
      const directUrl = secret && secret.includes('-') ? `${baseUrl}${baseApiPath}&token=${secret}` : `${baseUrl}${baseApiPath}`;
      
      let data: NightscoutEntry[] | null = null;
      let usedProxy = false;

      try {
        const directResponse = await fetch(directUrl, { headers });
        if (!directResponse.ok) throw new Error(`Direct fetch failed: ${directResponse.status}`);
        data = await directResponse.json();
      } catch (err: any) {
        console.warn("Direct fetch failed, attempted CORS proxy...", err);
        try {
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`;
          const proxyResponse = await fetch(proxyUrl);
          if (!proxyResponse.ok) throw new Error(`Proxy fetch failed: ${proxyResponse.status}`);
          const proxyData = await proxyResponse.json();
          if (proxyData.contents) {
             data = JSON.parse(proxyData.contents);
          } else {
             data = [];
          }
          usedProxy = true;
        } catch (proxyErr) {
          console.warn("Proxy fetch also failed for entries. Direct error was:", err instanceof Error ? err.message : String(err));
          // return empty array instead of throwing
          return [];
        }
      }

      if (!Array.isArray(data)) return [];
      
      return data.filter(e => e.sgv).map((e, index) => ({
        id: `ns-entry-${e.date}-${index}`,
        type: 'glucose',
        value: e.sgv,
        timestamp: e.date,
        source: 'nightscout'
      }));
    } catch (error) {
      console.error("Nightscout entries error:", error instanceof Error ? error.message : error);
      return [];
    }
  },

  async fetchTreatments(url: string, secret?: string, count = 1000): Promise<LogEntry[]> {
    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (secret) {
        headers['api-secret'] = secret;
      }

      const baseUrl = url.replace(/\/$/, '');
      const cacheBust = `_t=${Date.now()}`;
      const baseApiPath = `/api/v1/treatments.json?count=${count}&${cacheBust}`;
      const directUrl = secret && secret.includes('-') ? `${baseUrl}${baseApiPath}&token=${secret}` : `${baseUrl}${baseApiPath}`;
      let data: NightscoutTreatment[] | null = null;
      let usedProxy = false;

      try {
        const directResponse = await fetch(directUrl, { headers });
        if (!directResponse.ok) throw new Error(`Direct fetch failed: ${directResponse.status}`);
        data = await directResponse.json();
      } catch (err: any) {
        console.warn("Direct fetch failed, attempted CORS proxy...", err);
        try {
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`;
          const proxyResponse = await fetch(proxyUrl);
          if (!proxyResponse.ok) throw new Error(`Proxy fetch failed: ${proxyResponse.status}`);
          const proxyData = await proxyResponse.json();
          if (proxyData.contents) {
             data = JSON.parse(proxyData.contents);
          } else {
             data = [];
          }
          usedProxy = true;
        } catch (proxyErr) {
          console.warn("Proxy fetch also failed for treatments. Direct error was:", err instanceof Error ? err.message : String(err));
          // return empty array instead of throwing
          return [];
        }
      }

      if (!Array.isArray(data)) return [];
      const logs: LogEntry[] = [];


      data.forEach(t => {
        // Nightscout treatments can have created_at as string or date as number
        const ts = t.created_at ? new Date(t.created_at).getTime() : (t as any).date;
        if (!ts) return;
        
        const timestamp = ts;
        
        // Comprehensive check for insulin - some systems use 'amount' or 'insulin'
        const insulin = t.insulin || (t as any).amount || 0;
        
        if (insulin > 0) {
          logs.push({
            id: `ns-insulin-${t._id || timestamp}`,
            type: 'bolus',
            value: insulin,
            timestamp,
            notes: t.notes || t.eventType,
            source: 'nightscout'
          });
        }
        
        if (t.carbs && t.carbs > 0) {
          logs.push({
            id: `ns-meal-${t._id || timestamp}`,
            type: 'meal',
            value: t.carbs,
            timestamp,
            notes: t.notes || t.eventType,
            source: 'nightscout'
          });
        }
      });
      
      return logs;
    } catch (error) {
      console.error("Nightscout treatments error:", error instanceof Error ? error.message : error);
      return [];
    }
  }
};
