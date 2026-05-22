
import { LogEntry } from '../types';

export interface NightscoutEntry {
  sgv: number;
  date: number;
  dateString: string;
  type: string;
  direction?: string;
  delta?: number;
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

async function fetchWithFallbacks(directUrl: string, headers: Record<string, string>): Promise<any> {
  let errorMsg = "";
  try {
    const directResponse = await fetch(directUrl, { headers });
    if (directResponse.ok) return await directResponse.json();
    errorMsg = `Direct fetch status: ${directResponse.status}`;
  } catch (err: any) {
    errorMsg = err instanceof Error ? err.message : String(err);
    console.warn("Direct fetch failed, attempted CORS proxies...", err);
  }

  // Fallback proxies in order of preference
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
    // thingsproxy.freeboard.io can sometimes work, but is very strict on some headers.
  ];

  for (const proxyUrl of proxies) {
    try {
      // For proxies, headers often don't pass through correctly, so relying on token query param
      const proxyResponse = await fetch(proxyUrl);
      if (proxyResponse.ok) {
        const textData = await proxyResponse.text();
        return JSON.parse(textData);
      }
    } catch (err) {
      console.warn(`Proxy failed: ${proxyUrl}`, err);
    }
  }

  throw new Error(`All proxies failed. Initial error: ${errorMsg}`);
}

const CACHE_TTL = 5 * 60 * 1000;

function getCachedData<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      const parsed = JSON.parse(item);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed.data as T;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cache', e);
  }
  return null;
}

function setCachedData<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn('Failed to set cache', e);
  }
}

export const nightscoutService = {
  async fetchEntries(url: string, secret?: string, count = 1000, forceSync = false): Promise<LogEntry[]> {
    const cacheKey = `ns-entries-${url}-${count}`;
    if (!forceSync) {
      const cached = getCachedData<LogEntry[]>(cacheKey);
      if (cached) return cached;
    }

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

      try {
        data = await fetchWithFallbacks(directUrl, headers);
      } catch (err) {
        console.warn("Failed fetching entries:", err);
        return [];
      }

      if (!Array.isArray(data)) return [];
      
      const result = data.filter(e => e.sgv).map((e, index) => ({
        id: `ns-entry-${e.date}-${index}`,
        type: 'glucose' as const,
        value: e.sgv,
        timestamp: e.date,
        source: 'nightscout' as const,
        direction: e.direction,
        delta: e.delta,
      }));
      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Nightscout entries error:", error instanceof Error ? error.message : error);
      return [];
    }
  },

  async fetchTreatments(url: string, secret?: string, count = 1000, forceSync = false): Promise<LogEntry[]> {
    const cacheKey = `ns-treatments-${url}-${count}`;
    if (!forceSync) {
      const cached = getCachedData<LogEntry[]>(cacheKey);
      if (cached) return cached;
    }

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

      try {
         data = await fetchWithFallbacks(directUrl, headers);
      } catch (err) {
        console.warn("Failed fetching treatments:", err);
        return [];
      }

      if (!Array.isArray(data)) return [];
      const logs: LogEntry[] = [];


      data.forEach(t => {
        // Nightscout treatments can have created_at as string or date as number
        let ts = t.created_at ? new Date(t.created_at).getTime() : ((t as any).date || (t as any).timestamp);
        if (!ts) return;
        
        // If timestamp is in seconds (Unix convention), convert to ms
        if (ts < 10000000000) ts *= 1000;
        
        const timestamp = ts;
        
        const insulin = Number(t.insulin || (t as any).amount || 0);
        const carbs = Number(t.carbs || 0);

        if (insulin > 0) {
          const payload: any = {
            id: `ns-insulin-${t._id || timestamp}`,
            type: 'bolus',
            value: insulin,
            timestamp,
            notes: t.notes || t.eventType,
            source: 'nightscout'
          };

          if (carbs > 0) {
            payload.linkedMeal = {
              carbs,
              protein: 0,
              fat: 0
            };
          }

          logs.push(payload);
        } else if (carbs > 0) {
          logs.push({
            id: `ns-meal-${t._id || timestamp}`,
            type: 'meal',
            value: carbs,
            timestamp,
            notes: t.notes || t.eventType,
            source: 'nightscout'
          });
        }

        const lowerEventType = (t.eventType || '').toLowerCase();
        
        if (lowerEventType === 'site change' || lowerEventType === 'cartridge change' || lowerEventType === 'pump battery change') {
          logs.push({
            id: `ns-site-${t._id || timestamp}`,
            type: 'site_change',
            value: 1,
            timestamp,
            notes: t.notes || t.eventType,
            source: 'nightscout'
          });
        }

        if (lowerEventType === 'sensor change' || lowerEventType === 'sensor start') {
          logs.push({
            id: `ns-sensor-${t._id || timestamp}`,
            type: 'sensor_change',
            value: 1,
            timestamp,
            notes: t.notes || t.eventType,
            source: 'nightscout'
          });
        }
      });
      
      setCachedData(cacheKey, logs);
      return logs;
    } catch (error) {
      console.error("Nightscout treatments error:", error instanceof Error ? error.message : error);
      return [];
    }
  },

  async fetchDeviceStatus(url: string, secret?: string, count = 1, forceSync = false): Promise<any> {
    const cacheKey = `ns-devicestatus-${url}-${count}`;
    if (!forceSync) {
      const cached = getCachedData<any>(cacheKey);
      if (cached) return cached;
    }

    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (secret) {
        headers['api-secret'] = secret;
      }

      const baseUrl = url.replace(/\/$/, '');
      const cacheBust = `_t=${Date.now()}`;
      const baseApiPath = `/api/v1/devicestatus.json?count=${count}&${cacheBust}`;
      const directUrl = secret && secret.includes('-') ? `${baseUrl}${baseApiPath}&token=${secret}` : `${baseUrl}${baseApiPath}`;
      
      let data: any[] | null = null;

      try {
         data = await fetchWithFallbacks(directUrl, headers);
      } catch (err) {
        console.warn("Failed fetching devicestatus:", err);
        return null;
      }

      if (!Array.isArray(data) || data.length === 0) return null;
      
      const latest = data[0];
      const pumpInfo = latest.pump;
      const uploaderInfo = latest.uploader;

      // Try to find battery in different common places (standard Nightscout vs xDrip vs different pump drivers)
      const batteryPercent = pumpInfo?.battery?.percent ?? 
                            uploaderInfo?.battery ?? 
                            latest.battery ?? 
                            pumpInfo?.battery?.voltage ?? // fallback to voltage if percent missing
                            0;

      // If no pump info, but we have uploader info, still return something
      if (!pumpInfo && !uploaderInfo) return null;
      
      const result = {
        battery: batteryPercent,
        reservoir: pumpInfo?.reservoir ?? 0,
        activeInsulin: pumpInfo?.iob?.iob ?? 0,
        basal: {
           rate: pumpInfo?.status?.currentbasal ?? 0,
           isTemp: !!pumpInfo?.status?.tempbasal
        },
        uploader: uploaderInfo ? {
           battery: uploaderInfo.battery,
           type: uploaderInfo.type || uploaderInfo.name || 'Uploader'
        } : null,
        lastUpdate: { seconds: Math.floor(new Date(latest.created_at).getTime() / 1000) }
      };

      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Nightscout devicestatus error:", error instanceof Error ? error.message : error);
      return null;
    }
  }
};

