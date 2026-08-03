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

let workingProxyIndex = -1; // -1 means direct, 0-3 means proxies

async function fetchWithFallbacks(directUrl: string, headers: Record<string, string>): Promise<any> {
  console.log(`[Worker] Rozpoczynam fetchWithFallbacks dla URL: ${directUrl}, używany proxy: ${workingProxyIndex}`);
  let lastError = null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for large history // 10 second timeout per fetch
  
  if (workingProxyIndex === -1) {
    console.log(`[Worker] Próbuję połączenia bezpośredniego...`);
    try {
      const directResponse = await fetch(directUrl, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      console.log(`[Worker] Bezpośrednie połączenie zakończone ze statusem: ${directResponse.status}`);
      if (directResponse.ok) return await directResponse.json();
      lastError = `Direct fetch failed with status ${directResponse.status}`;
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        console.warn(`[Worker] Bezpośrednie połączenie: TIMEOUT (60s)`);
        lastError = "Request timed out (60s limit)";
      } else {
        console.warn(`[Worker] Bezpośrednie połączenie: BŁĄD SIECI - ${e.message}`);
        lastError = e.message || "Network error on direct fetch";
      }
    }
  }

  // Try proxies if direct fails
  const proxies = [
    `/api/ns-proxy?url=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
    `https://proxy.cors.sh/${directUrl}`
  ];

  const startIndex = workingProxyIndex !== -1 ? workingProxyIndex : 0;

  for (let i = startIndex; i < proxies.length; i++) {
    const proxyUrl = proxies[i];
    console.log(`[Worker] Próbuję połączenia przez proxy [${i}]: ${proxyUrl}`);
    const proxyController = new AbortController();
    const proxyTimeoutId = setTimeout(() => proxyController.abort(), 10000);
    try {
      const proxyResponse = await fetch(proxyUrl, { headers, signal: proxyController.signal });
      clearTimeout(proxyTimeoutId);
      console.log(`[Worker] Proxy [${i}] zakończone ze statusem: ${proxyResponse.status}`);
      if (proxyResponse.ok) {
        workingProxyIndex = i; // Save working proxy for future requests
        return await proxyResponse.json();
      }
      lastError = `Proxy fetch failed with status ${proxyResponse.status}`;
    } catch (e: any) {
      clearTimeout(proxyTimeoutId);
      if (e.name === 'AbortError') {
        console.warn(`[Worker] Proxy [${i}] TIMEOUT (60s)`);
        lastError = "Proxy request timed out (10s limit)";
      } else {
        console.warn(`[Worker] Proxy [${i}] BŁĄD SIECI - ${e.message}`);
        lastError = e.message || "Network error on proxy";
      }
    }
  }

  console.error(`[Worker] Wszystkie próby fetch (direct i proxy) zawiodły.`);
  throw new Error(lastError || "All fetch attempts failed");
}

function processEntries(data: any[]): any[] {
  if (!Array.isArray(data)) return [];
  return data.filter((e: any) => e.sgv).map((e: any) => {
    let ts = Date.now();
    if (e.date) {
      if (typeof e.date === 'number') {
        ts = e.date;
      } else if (typeof e.date === 'string') {
        const parsed = parseInt(e.date, 10);
        if (!isNaN(parsed) && parsed > 1000000000) {
          ts = parsed;
        } else {
          ts = new Date(e.date).getTime() || Date.now();
        }
      }
    } else if (e.dateString) {
      ts = new Date(e.dateString).getTime() || Date.now();
    }
    
    return {
      id: e._id || `ns-entry-${ts}-${e.sgv}`,
      type: 'glucose',
      value: Number(e.sgv),
      timestamp: ts,
      source: 'nightscout',
      direction: e.direction,
      delta: e.delta,
    };
  });
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
  
  // Znajdź najświeższe dane z pompy (z ostatniej godziny). Jeśli nie ma, użyj po prostu pierwszego z brzegu wpisu.
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const now = Date.now();
  
  let latest = data[0]; 
  for (const item of data) {
    if (item.pump) {
      const itemTime = new Date(item.created_at).getTime();
      if (now - itemTime < ONE_HOUR_MS) {
        latest = item;
        break;
      }
    }
  }

  const pumpInfo = latest.pump;
  const uploaderInfo = latest.uploader;
  const batteryPercent = pumpInfo?.battery?.percent ?? 
                        uploaderInfo?.battery ?? 
                        latest.battery ?? 
                        pumpInfo?.battery?.voltage ?? 0;
  if (!pumpInfo && !uploaderInfo) return null;
  
  return {
    battery: batteryPercent,
    reservoir: pumpInfo?.reservoir ?? undefined,
    activeInsulin: pumpInfo?.iob?.iob ?? undefined,
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
    ? `${baseUrl}/api/v1/devicestatus.json?count=5&${cacheBust}&token=${secret}` 
    : `${baseUrl}/api/v1/devicestatus.json?count=5&${cacheBust}`;

  console.log(`[Worker] Pobieranie wpisów (entries)...`);
  const entriesRaw = await fetchWithFallbacks(entriesUrl, headers);
  console.log(`[Worker] Pobieranie zabiegów (treatments)...`);
  const treatmentsRaw = await fetchWithFallbacks(treatmentsUrl, headers).catch(() => []);
  console.log(`[Worker] Pobieranie statusu urządzenia (devicestatus)...`);
  const deviceRaw = await fetchWithFallbacks(deviceUrl, headers).catch(() => null);
  console.log("[Worker] Zakończono pobieranie z Nightscout.");

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
      console.log(`[Worker] Wywołanie runSync z ilością: ${fetchCount}`);
      try {
        const { entries, treatments, deviceStatus } = await fetchNightscoutData(url, secret, fetchCount);
        console.log(`[Worker] runSync(${fetchCount}) SUCCESS. Wysyłam zdarzenie SYNC_SUCCESS.`);
        self.postMessage({ type: 'SYNC_SUCCESS', payload: { entries, treatments, deviceStatus } });
      } catch (err: any) {
        console.error(`[Worker] runSync(${fetchCount}) ERROR:`, err);
        self.postMessage({ type: 'SYNC_ERROR', payload: err.message });
      }
    };

    console.log(`[Worker] Inicjalizuję pobieranie progresywne...`);
    // Progressive loading: first fetch a small batch (very fast), then the massive history batch in background
    runSync(150).then(() => {
        if (count > 150) {
            console.log(`[Worker] Pierwszy etap (150) gotowy, uruchamiam pełne pobranie (${count}).`);
            runSync(count);
        }
    });

    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => runSync(150), intervalMs); // Subsequent fetches are small
  }

  if (type === 'STOP_SYNC') {
    if (syncInterval) clearInterval(syncInterval);
  }
};

