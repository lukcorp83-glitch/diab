
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
      const apiPath = `/api/v1/entries.json?count=${count}`;
      const directUrl = secret && secret.includes('-') ? `${baseUrl}${apiPath}&token=${secret}` : `${baseUrl}${apiPath}`;
      
      let data: NightscoutEntry[] | null = null;
      let fetchError = null;

      // Try proxy first (best for CORS on hosted solutions)
      try {
        const proxyUrl = `/api/nightscout-proxy?url=${encodeURIComponent(baseUrl)}&path=${encodeURIComponent(apiPath)}`;
        const proxyHeaders: Record<string, string> = {};
        if (secret) proxyHeaders['api-secret'] = secret;
        
        const response = await fetch(proxyUrl, proxyHeaders);
        // If it returns HTML (e.g., github pages static site), it's not the proxy
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
           data = await response.json();
        } else {
           throw new Error("Proxy not available or invalid response");
        }
      } catch (err) {
        fetchError = err;
      }

      // Fallback to direct fetch (for local xDrip+ IPs or if proxy is unavailable)
      if (!data) {
        try {
          const directResponse = await fetch(directUrl, { headers });
          if (!directResponse.ok) throw new Error(`Direct fetch failed: ${directResponse.statusText}`);
          data = await directResponse.json();
        } catch (err) {
           console.warn("Direct fetch also failed:", err);
           throw fetchError || err;
        }
      }

      if (!data) return [];
      
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
      const apiPath = `/api/v1/treatments.json?count=${count}`;
      const directUrl = secret && secret.includes('-') ? `${baseUrl}${apiPath}&token=${secret}` : `${baseUrl}${apiPath}`;

      let data: NightscoutTreatment[] | null = null;
      let fetchError = null;

      try {
        const proxyUrl = `/api/nightscout-proxy?url=${encodeURIComponent(baseUrl)}&path=${encodeURIComponent(apiPath)}`;
        const proxyHeaders: Record<string, string> = {};
        if (secret) proxyHeaders['api-secret'] = secret;

        const response = await fetch(proxyUrl, { headers: proxyHeaders });
        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.includes("application/json")) {
           data = await response.json();
        } else {
           throw new Error("Proxy not available or invalid response");
        }
      } catch (err) {
        fetchError = err;
      }

      if (!data) {
        try {
          const directResponse = await fetch(directUrl, { headers });
          if (!directResponse.ok) throw new Error(`Direct fetch failed: ${directResponse.statusText}`);
          data = await directResponse.json();
        } catch (err) {
           console.warn("Direct fetch also failed:", err);
           throw fetchError || err;
        }
      }

      if (!data) return [];
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
