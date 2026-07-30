/// <reference lib="webworker" />

interface NightscoutEntry {
  sgv: number;
  date: number;
  dateString: string;
  type: string;
  direction?: string;
  delta?: number;
}

interface NightscoutTreatment {
  _id: string;
  eventType: string;
  created_at: string;
  glucose?: number;
  insulin?: number;
  carbs?: number;
  notes?: string;
  amount?: number;
  timestamp?: number;
  date?: number;
}

async function fetchWithFallbacks(directUrl: string, headers: Record<string, string>): Promise<any> {
  let lastError = null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout per fetch
  try {
    const directResponse = await fetch(directUrl, { headers, signal: controller.signal });
    clearTimeout(timeoutId);
    if (directResponse.ok) return await directResponse.json();
    lastError = `Direct fetch failed with status ${directResponse.status}`;
  } catch (e: any) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      lastError = "Request timed out (5s limit)";
    } else {
      lastError = e.message || "Network error on direct fetch";
    }
  }

  // Try proxies if direct fails
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
  ];

  for (const proxyUrl of proxies) {
    const proxyController = new AbortController();
    const proxyTimeoutId = setTimeout(() => proxyController.abort(), 5000);
    try {
      const proxyResponse = await fetch(proxyUrl, { headers, signal: proxyController.signal });
      clearTimeout(proxyTimeoutId);
      if (proxyResponse.ok) return await proxyResponse.json();
      lastError = `Proxy fetch failed with status ${proxyResponse.status}`;
    } catch (e: any) {
      clearTimeout(proxyTimeoutId);
      if (e.name === 'AbortError') {
        lastError = "Proxy request timed out (5s limit)";
      } else {
        lastError = e.message || "Network error on proxy";
      }
    }
  }

  throw new Error(`Wszystkie próby połączenia (bezpośrednie i proxy) zawiodły. Ostatni błąd: ${lastError}`);
}

function processEntries(data: any[]): any[] {
  if (!Array.isArray(data)) return [];
  return data.filter((e: any) => e.sgv).map((e: any, index: number) => ({
    id: `ns-entry-${e.date}-${index}`,
    type: 'glucose',
    value: Number(e.sgv),
    timestamp: typeof e.date === 'string' ? parseInt(e.date, 10) : (e.date || new Date(e.dateString).getTime()),
    source: 'nightscout',
    direction: e.direction,
    delta: e.delta,
  }));
}

function processTreatments(data: any[]): any[] {
  if (!Array.isArray(data)) return [];
  const logs: any[] = [];
  data.forEach((t: any) => {
    let ts = t.created_at ? new Date(t.created_at).getTime() : (t.date || t.timestamp);
    if (!ts) return;
    if (ts < 10000000000) ts *= 1000;
    const timestamp = ts;
    const insulin = Number(t.insulin || t.amount || 0);
    const carbs = Number(t.carbs || 0);
    const rawNotes = t.notes || t.eventType || "";
    const cleanNotes = rawNotes === "<none>" ? "" : rawNotes;
    const nsSource = t.enteredBy ? `nightscout (${t.enteredBy})` : 'nightscout';
    
    if (insulin > 0) {
      const payload: any = {
        id: `ns-insulin-${t._id || timestamp}`,
        nsId: t._id,
        type: 'bolus',
        value: insulin,
        timestamp,
        notes: cleanNotes,
        source: nsSource
      };
      if (carbs > 0) {
        payload.linkedMeal = { carbs, protein: 0, fat: 0 };
      }
      logs.push(payload);
    } else if (carbs > 0) {
      logs.push({
        id: `ns-meal-${t._id || timestamp}`,
        nsId: t._id,
        type: 'meal',
        value: carbs,
        timestamp,
        notes: cleanNotes,
        source: nsSource
      });
    }

    const lowerEventType = (t.eventType || '').toLowerCase();
    if (lowerEventType === 'site change' || lowerEventType === 'cartridge change' || lowerEventType === 'pump battery change') {
      logs.push({
        id: `ns-site-${t._id || timestamp}`,
        nsId: t._id,
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
        nsId: t._id,
        type: 'sensor_change',
        value: 1,
        timestamp,
        notes: cleanNotes,
        source: nsSource
      });
    }
  });
  return logs;
}

function processDeviceStatus(data: any[]): any {
  if (!Array.isArray(data) || data.length === 0) return null;
  const latest = data[0];
  const pumpInfo = latest.pump;
  const uploaderInfo = latest.uploader;
  const batteryPercent = pumpInfo?.battery?.percent ?? 
                        uploaderInfo?.battery ?? 
                        latest.battery ?? 
                        pumpInfo?.battery?.voltage ?? 0;
  if (!pumpInfo && !uploaderInfo) return null;
  
  return {
    battery: batteryPercent,
    reservoir: pumpInfo?.reservoir ?? 0,
    activeInsulin: pumpInfo?.iob?.iob ?? 0,
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
}

async function fetchNightscoutData(url: string, secret: string | undefined, count: number) {
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (secret) headers['api-secret'] = secret;
  const baseUrl = url.replace(/\/$/, '');
  const cacheBust = `_t=${Date.now()}`;
  
  const entriesUrl = secret && secret.includes('-') 
    ? `${baseUrl}/api/v1/entries.json?count=${count}&${cacheBust}&token=${secret}` 
    : `${baseUrl}/api/v1/entries.json?count=${count}&${cacheBust}`;
    
  const treatmentsUrl = secret && secret.includes('-') 
    ? `${baseUrl}/api/v1/treatments.json?count=${count}&${cacheBust}&token=${secret}` 
    : `${baseUrl}/api/v1/treatments.json?count=${count}&${cacheBust}`;

  const deviceUrl = secret && secret.includes('-') 
    ? `${baseUrl}/api/v1/devicestatus.json?count=1&${cacheBust}&token=${secret}` 
    : `${baseUrl}/api/v1/devicestatus.json?count=1&${cacheBust}`;

  const entriesRaw = await fetchWithFallbacks(entriesUrl, headers);
  const treatmentsRaw = await fetchWithFallbacks(treatmentsUrl, headers).catch(() => []);
  const deviceRaw = await fetchWithFallbacks(deviceUrl, headers).catch(() => null);
  console.log("Nightscout RAW devicestatus fetch:", deviceRaw);

  const processedDeviceStatus = processDeviceStatus(deviceRaw);
  console.log("Nightscout PROCESSED devicestatus:", processedDeviceStatus);

  return {
    entries: processEntries(entriesRaw),
    treatments: processTreatments(treatmentsRaw),
    deviceStatus: processedDeviceStatus
  };
}

let syncInterval: any = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'START_SYNC') {
    const { url, secret, intervalMs = 5 * 60 * 1000, count = 3000 } = payload;
    
    const runSync = async (fetchCount: number) => {
      try {
        const { entries, treatments, deviceStatus } = await fetchNightscoutData(url, secret, fetchCount);
        self.postMessage({ type: 'SYNC_SUCCESS', payload: { entries, treatments, deviceStatus } });
      } catch (err: any) {
        self.postMessage({ type: 'SYNC_ERROR', payload: err.message });
      }
    };

    runSync(count); // Initial fetch can be large

    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => runSync(150), intervalMs); // Subsequent fetches are small
  }

  if (type === 'STOP_SYNC') {
    if (syncInterval) clearInterval(syncInterval);
  }
};
