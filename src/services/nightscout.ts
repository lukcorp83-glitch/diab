
import { LogEntry } from '../types';
import i18n from "../i18n";
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface NightscoutEntry {
  sgv: number;
  date: number;
  dateString: string;
  type: string;
  direction?: string;
  delta?: number;
}

export interface NightscoutTreatment {
  enteredBy?: string;
  _id: string;
  eventType: string;
  created_at: string;
  glucose?: number;
  insulin?: number;
  carbs?: number;
  notes?: string;
}

export async function hashSecret(secret: string): Promise<string> {
  const trimmed = secret.trim();
  // Jeśli to już poprawny 40-znakowy hash SHA-1, nie haszujemy go powtórnie
  if (/^[a-f0-9]{40}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  const hashBuffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(trimmed));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sendNsRequest(options: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}): Promise<{ ok: boolean; status: number; data?: any }> {
  // 1. Natywny Android / iOS (CapacitorHttp działa na poziomie natywnego klienta Java/OkHttp bez ograniczeń CORS)
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.request({
        method: options.method,
        url: options.url,
        headers: options.headers,
        data: options.body,
      });
      return {
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        data: res.data,
      };
    } catch (capErr) {
      console.warn("CapacitorHttp native request failed, fallbacking:", capErr);
    }
  }

  // 2. Środowisko lokalne (localhost:3000 / dev) - bezpośrednio używamy lokalnego proxy, zapobiegając błędom preflight CORS w przeglądarce
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocal) {
    try {
      const proxyUrl = `/api/ns-proxy?url=${encodeURIComponent(options.url)}`;
      const proxyRes = await fetch(proxyUrl, {
        method: options.method,
        headers: options.headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      let data: any = null;
      try { data = await proxyRes.json(); } catch { /* ignore non-json */ }
      return { ok: proxyRes.ok, status: proxyRes.status, data };
    } catch (proxyErr) {
      console.warn("Local proxy /api/ns-proxy failed, falling back to direct fetch:", proxyErr);
    }
  }

  // 3. Bezpośrednie wywołanie fetch (np. PWA / Web z poprawnym CORS)
  try {
    const res = await fetch(options.url, {
      method: options.method,
      headers: options.headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (res.ok) {
      let data: any = null;
      try { data = await res.json(); } catch { /* ignore non-json */ }
      return { ok: true, status: res.status, data };
    }
    if (res.status > 0) {
      return { ok: false, status: res.status };
    }
  } catch (directErr) {
    console.warn("Direct NS fetch failed (CORS or network):", directErr);
  }

  // 4. Proxy awaryjne dla środowiska przeglądarkowego
  const fallbackProxies = [
    `/api/ns-proxy?url=${encodeURIComponent(options.url)}`,
    `https://corsproxy.io/?${encodeURIComponent(options.url)}`,
  ];

  for (const pUrl of fallbackProxies) {
    try {
      const pRes = await fetch(pUrl, {
        method: options.method,
        headers: options.headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      if (pRes.ok) {
        let data: any = null;
        try { data = await pRes.json(); } catch { /* ignore */ }
        return { ok: true, status: pRes.status, data };
      }
    } catch {
      // kontynuuj do kolejnego proxy
    }
  }

  return { ok: false, status: 0 };
}

async function fetchWithFallbacks(directUrl: string, headers: Record<string, string>): Promise<any> {
  // 1. Na natywnym urządzeniu użyj CapacitorHttp
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.request({
        method: 'GET',
        url: directUrl,
        headers,
      });
      if (res.status >= 200 && res.status < 300) {
        return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      }
    } catch (capErr) {
      console.warn("CapacitorHttp GET failed, falling back:", capErr);
    }
  }

  // 2. Na localhost priorytetem jest lokalne proxy serwera
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocal) {
    try {
      const proxyUrl = `/api/ns-proxy?url=${encodeURIComponent(directUrl)}`;
      const proxyResponse = await fetch(proxyUrl, { headers });
      if (proxyResponse.ok) {
        const textData = await proxyResponse.text();
        return JSON.parse(textData);
      }
    } catch (err) {
      console.warn("Local proxy failed on localhost, trying direct fetch:", err);
    }
  }

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
    `/api/ns-proxy?url=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
    `https://proxy.cors.sh/${directUrl}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const proxyResponse = await fetch(proxyUrl, { headers });
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
  async fetchEntries(url: string, secret?: string, count = 10000, forceSync = false): Promise<LogEntry[]> {
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

  async fetchTreatments(url: string, secret?: string, count = 4000, forceSync = false): Promise<LogEntry[]> {
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
        
        const rawInsulin = t.insulin ?? (t as any).units ?? (t as any).dose ?? (t as any).enteredinsulin ?? (t as any).amount ?? (t as any).bolus ?? 0;
        const normalInsulin = Number((t as any).normal || 0);
        const extendedInsulin = Number((t as any).extended || 0);
        const comboSum = (normalInsulin + extendedInsulin) > 0 ? (normalInsulin + extendedInsulin) : 0;
        const insulin = Number(rawInsulin || comboSum || 0);
        const carbs = Number(t.carbs || 0);

          const mealName = (t as any).food || (t as any).description || (t.notes && t.notes !== '<none>' ? t.notes : '') || '';
          const cleanNotes = mealName || (t.eventType && t.eventType !== '<none>' ? t.eventType : '');
          const nsSource = t.enteredBy ? `nightscout (${t.enteredBy})` : 'nightscout';
          
          if (insulin > 0) {
            const payload: any = {
              id: `ns-insulin-${t._id || timestamp}`,
              nsId: t._id,
              type: 'bolus',
              value: insulin,
              timestamp,
              notes: cleanNotes,
              description: mealName || undefined,
              source: nsSource
            };

            if (carbs > 0) {
              payload.linkedMeal = {
                carbs,
                protein: Number((t as any).protein || 0),
                fat: Number((t as any).fat || 0),
                name: mealName || undefined
              };
            }

            logs.push(payload);
          } else if (carbs > 0) {
            const payload: any = {
              id: `ns-meal-${t._id || timestamp}`,
              nsId: t._id,
              type: 'meal',
              value: carbs,
              carbs,
              protein: Number((t as any).protein || 0),
              fat: Number((t as any).fat || 0),
              timestamp,
              notes: cleanNotes,
              description: mealName || undefined,
              name: mealName || undefined,
              source: nsSource
            };
            logs.push(payload);
          }

          const lowerEventType = (t.eventType || '').toLowerCase();
          
          if (lowerEventType === 'site change' || lowerEventType === 'cartridge change' || lowerEventType === 'pump battery change') {
            logs.push({
              id: `ns-site-${t._id || timestamp}`,
              type: 'site_change',
              value: 1,
              timestamp,
              notes: cleanNotes,
              source: nsSource
            });
          }

          if (lowerEventType === 'sensor change' || lowerEventType === 'sensor start') {
            logs.push({
              id: `ns-sensor-${t._id || timestamp}`,
              type: 'sensor_change',
              value: 1,
              timestamp,
              notes: cleanNotes,
              source: nsSource
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
      
      let resVal = pumpInfo?.reservoir ?? latest?.reservoir ?? pumpInfo?.status?.reservoir ?? latest?.openaps?.enacted?.reservoir ?? latest?.openaps?.suggested?.reservoir;
      if (resVal && typeof resVal === 'object') {
        resVal = resVal.amount ?? resVal.units ?? resVal.value ?? resVal.reservoir;
      }
      if (typeof resVal === 'string') {
        resVal = parseFloat(resVal);
      }
      const parsedRes = (typeof resVal === 'number' && !isNaN(resVal)) ? resVal : 0;

      const result = {
        battery: batteryPercent,
        reservoir: parsedRes,
        activeInsulin: pumpInfo?.iob?.iob ?? latest?.openaps?.enacted?.iob ?? 0,
        model: pumpInfo?.model ?? pumpInfo?.name ?? null,
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
  },

  async deleteTreatment(nsId: string, url?: string, apiSecret?: string): Promise<boolean> {
    const effUrl = url || (typeof window !== 'undefined' ? localStorage.getItem('nightscout_url') || '' : '');
    const effSecret = apiSecret || (typeof window !== 'undefined' ? localStorage.getItem('nightscout_secret') || '' : '');
    if (!effUrl || !nsId) return false;

    let cleanUrl = effUrl.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = "https://" + cleanUrl;
    cleanUrl = cleanUrl.replace(/\/$/, "");

    // Usuwamy ewentualne prefiksy wewnętrzne aplikacji (np. ns-meal-, ns-insulin-)
    const cleanNsId = nsId.replace(/^ns-(meal|insulin|site|sensor)-/, '');

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      let finalUrl = `${cleanUrl}/api/v1/treatments/${cleanNsId}`;

      if (effSecret) {
        const trimmedSecret = effSecret.trim();
        if (trimmedSecret.includes('-')) {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(trimmedSecret)}`;
        } else {
          const hash = await hashSecret(trimmedSecret);
          headers["api-secret"] = hash;
        }
      }

      const res = await sendNsRequest({
        url: finalUrl,
        method: "DELETE",
        headers,
      });

      // 200, 204 lub 404 (Not Found = wpis już został wcześniej usunięty z serwera)
      if (res.ok || res.status === 404) {
        console.log(i18n.t('auto.pomyslnie_usunieto_treatm', { defaultValue: "Pomyślnie usunięto treatment z NS: {{var0}}", var0: cleanNsId }));
        return true;
      } else {
        console.error(i18n.t('auto.blad_przy_usuwaniu_z_ns_v', { defaultValue: "Błąd przy usuwaniu z NS: {{var0}}", var0: res.status }));
        return false;
      }
    } catch (error) {
      console.error("Nightscout deleteTreatment error:", error instanceof Error ? error.message : error);
      return false;
    }
  },

  async deleteEntry(entryId: string, url?: string, apiSecret?: string): Promise<boolean> {
    const effUrl = url || (typeof window !== 'undefined' ? localStorage.getItem('nightscout_url') || '' : '');
    const effSecret = apiSecret || (typeof window !== 'undefined' ? localStorage.getItem('nightscout_secret') || '' : '');
    if (!effUrl || !entryId) return false;

    let cleanUrl = effUrl.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = "https://" + cleanUrl;
    cleanUrl = cleanUrl.replace(/\/$/, "");

    const cleanEntryId = entryId.replace(/^ns-(cgm|entry|glucose)-/, '');

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      let finalUrl = `${cleanUrl}/api/v1/entries/${cleanEntryId}`;

      if (effSecret) {
        const trimmedSecret = effSecret.trim();
        if (trimmedSecret.includes('-')) {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(trimmedSecret)}`;
        } else {
          const hash = await hashSecret(trimmedSecret);
          headers["api-secret"] = hash;
        }
      }

      const res = await sendNsRequest({
        url: finalUrl,
        method: "DELETE",
        headers,
      });

      if (res.ok || res.status === 404) {
        console.log("Pomyślnie usunięto entry z NS:", cleanEntryId);
        return true;
      } else {
        console.error("Błąd przy usuwaniu entry z NS:", res.status);
        return false;
      }
    } catch (error) {
      console.error("Nightscout deleteEntry error:", error instanceof Error ? error.message : error);
      return false;
    }
  },

  async postTreatment(treatment: any, url: string, apiSecret: string): Promise<boolean> {
    if (!url || !treatment) return false;

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http")) cleanUrl = "https://" + cleanUrl;
    cleanUrl = cleanUrl.replace(/\/$/, "");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      let finalUrl = `${cleanUrl}/api/v1/treatments`;

      if (apiSecret) {
        const trimmedSecret = apiSecret.trim();
        if (trimmedSecret.includes('-')) {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + `token=${encodeURIComponent(trimmedSecret)}`;
        } else {
          const hash = await hashSecret(trimmedSecret);
          headers["api-secret"] = hash;
        }
      }

      const res = await sendNsRequest({
        url: finalUrl,
        method: "POST",
        headers,
        body: treatment,
      });

      if (res.ok) {
        console.log("Successfully posted treatment to NS");
        return true;
      } else {
        console.warn("NS postTreatment returned status:", res.status);
        return false;
      }
    } catch (error) {
      console.error("Nightscout postTreatment error:", error instanceof Error ? error.message : error);
      return false;
    }
  }
};


