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

async function fetchWithFallbacks(directUrl: string, headers: Record<string, string>, parentSignal?: AbortSignal): Promise<any> {
  if (parentSignal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  console.log(`[Worker] Rozpoczynam fetchWithFallbacks dla URL: ${directUrl}, używany proxy: ${workingProxyIndex}`);
  let lastError = null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s max na bezpośrednie połączenie

  const abortListener = () => controller.abort();
  if (parentSignal) {
    parentSignal.addEventListener('abort', abortListener, { once: true });
  }
  
  if (workingProxyIndex === -1) {
    console.log(`[Worker] Próbuję połączenia bezpośredniego...`);
    try {
      const directResponse = await fetch(directUrl, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      if (parentSignal) parentSignal.removeEventListener('abort', abortListener);
      console.log(`[Worker] Bezpośrednie połączenie zakończone ze statusem: ${directResponse.status}`);
      if (directResponse.ok) return await directResponse.json();
      lastError = `Direct fetch failed with status ${directResponse.status}`;
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (parentSignal) parentSignal.removeEventListener('abort', abortListener);
      if (parentSignal?.aborted) throw e;
      if (e.name === 'AbortError') {
        console.warn(`[Worker] Bezpośrednie połączenie: TIMEOUT (15s)`);
        lastError = "Request timed out (15s limit)";
      } else {
        console.warn(`[Worker] Bezpośrednie połączenie: BŁĄD SIECI - ${e.message}`);
        lastError = e.message || "Network error on direct fetch";
      }
    }
  }

  if (parentSignal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
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
    if (parentSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const proxyUrl = proxies[i];
    console.log(`[Worker] Próbuję połączenia przez proxy [${i}]: ${proxyUrl}`);
    const proxyController = new AbortController();
    const proxyTimeoutId = setTimeout(() => proxyController.abort(), 8000);
    const proxyAbortListener = () => proxyController.abort();
    if (parentSignal) parentSignal.addEventListener('abort', proxyAbortListener, { once: true });

    try {
      const proxyResponse = await fetch(proxyUrl, { headers, signal: proxyController.signal });
      clearTimeout(proxyTimeoutId);
      if (parentSignal) parentSignal.removeEventListener('abort', proxyAbortListener);
      console.log(`[Worker] Proxy [${i}] zakończone ze statusem: ${proxyResponse.status}`);
      if (proxyResponse.ok) {
        workingProxyIndex = i; // Save working proxy for future requests
        return await proxyResponse.json();
      }
      lastError = `Proxy fetch failed with status ${proxyResponse.status}`;
    } catch (e: any) {
      clearTimeout(proxyTimeoutId);
      if (parentSignal) parentSignal.removeEventListener('abort', proxyAbortListener);
      if (parentSignal?.aborted) throw e;
      if (e.name === 'AbortError') {
        console.warn(`[Worker] Proxy [${i}] TIMEOUT (8s)`);
        lastError = "Proxy request timed out (8s limit)";
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
    const mealName = t.food || t.description || (t.notes && t.notes !== '<none>' ? t.notes : '') || '';
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
          protein: Number(t.protein || 0),
          fat: Number(t.fat || 0),
          name: mealName || undefined
        };
      }
      logs.push(payload);
    } else if (carbs > 0) {
      logs.push({
        id: `ns-meal-${t._id || timestamp}`,
        nsId: t._id,
        type: 'meal',
        value: carbs,
        carbs,
        protein: Number(t.protein || 0),
        fat: Number(t.fat || 0),
        timestamp,
        notes: cleanNotes,
        description: mealName || undefined,
        name: mealName || undefined,
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
  
  // Znajdź najświeższy wpis zawierający rzeczywiste dane z pompy lub poziom zbiorniczka.
  // Nie ograniczamy się sztywno do 60 minut – jeśli uploader nie miał zasięgu pompy przez 2h,
  // nadal zachowujemy ostatni znany stan pompy, zamiast zastępować go pustym rekordem z telefonu!
  let latestWithPump: any = null;
  for (const item of data) {
    if (!item) continue;
    const hasPumpObj = !!item.pump;
    const hasReservoir = item.reservoir !== undefined || item.pump?.reservoir !== undefined || item.openaps?.enacted?.reservoir !== undefined;
    if (hasPumpObj || hasReservoir) {
      latestWithPump = item;
      break;
    }
  }

  const latest = latestWithPump || data[0]; 

  const pumpInfo = latest?.pump;
  const uploaderInfo = latest?.uploader;
  const batteryPercent = pumpInfo?.battery?.percent ?? 
                        uploaderInfo?.battery ?? 
                        latest?.battery ?? 
                        pumpInfo?.battery?.voltage ?? 0;
  if (!pumpInfo && !uploaderInfo && !latest?.reservoir && !latest?.openaps) return null;

  let resVal = pumpInfo?.reservoir ?? latest?.reservoir ?? pumpInfo?.status?.reservoir ?? latest?.openaps?.enacted?.reservoir ?? latest?.openaps?.suggested?.reservoir;
  if (resVal && typeof resVal === 'object') {
    resVal = resVal.amount ?? resVal.units ?? resVal.value ?? resVal.reservoir;
  }
  if (typeof resVal === 'string') {
    resVal = parseFloat(resVal);
  }
  // Zbiornik musi być prawidłową liczbą dodatnią > 0. Wartości <= 0 oznaczają brak odczytu z pompy.
  const parsedRes = (typeof resVal === 'number' && !isNaN(resVal) && resVal > 0) ? resVal : undefined;
  
  return {
    battery: batteryPercent,
    reservoir: parsedRes,
    activeInsulin: pumpInfo?.iob?.iob ?? latest?.openaps?.enacted?.iob ?? undefined,
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

async function fetchNightscoutData(url: string, secret: string | undefined, count: number, signal?: AbortSignal) {
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (secret) headers['api-secret'] = secret;
  const baseUrl = url.replace(/\/$/, '');
  const cacheBust = `_t=${Date.now()}`;
  
  const entriesCount = count;
  // Optymalizacja: dla małych/szybkich odświeżeń pobieramy tylko bieżące zabiegi (100), dla pełnej historii max 2000 (nigdy 20 000!)
  const treatmentsCount = count <= 150 ? 100 : (count <= 1000 ? 500 : 2000);
  
  const entriesUrl = secret && secret.includes('-') 
    ? `${baseUrl}/api/v1/entries.json?count=${entriesCount}&${cacheBust}&token=${secret}` 
    : `${baseUrl}/api/v1/entries.json?count=${entriesCount}&${cacheBust}`;
    
  const treatmentsUrl = secret && secret.includes('-') 
    ? `${baseUrl}/api/v1/treatments.json?count=${treatmentsCount}&${cacheBust}&token=${secret}` 
    : `${baseUrl}/api/v1/treatments.json?count=${treatmentsCount}&${cacheBust}`;

  const deviceUrl = secret && secret.includes('-') 
    ? `${baseUrl}/api/v1/devicestatus.json?count=5&${cacheBust}&token=${secret}` 
    : `${baseUrl}/api/v1/devicestatus.json?count=5&${cacheBust}`;

  console.log(`[Worker] Pobieranie wpisów (entries: ${entriesCount})...`);
  const entriesRaw = await fetchWithFallbacks(entriesUrl, headers, signal);
  console.log(`[Worker] Pobieranie zabiegów (treatments: ${treatmentsCount})...`);
  const treatmentsRaw = await fetchWithFallbacks(treatmentsUrl, headers, signal).catch(() => []);
  console.log(`[Worker] Pobieranie statusu urządzenia (devicestatus)...`);
  const deviceRaw = await fetchWithFallbacks(deviceUrl, headers, signal).catch(() => null);
  console.log("[Worker] Zakończono pobieranie z Nightscout.");

  const processedDeviceStatus = processDeviceStatus(deviceRaw);

  return {
    entries: processEntries(entriesRaw),
    treatments: processTreatments(treatmentsRaw),
    deviceStatus: processedDeviceStatus
  };
}

let syncInterval: any = null;
let currentSyncController: AbortController | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'START_SYNC') {
    const { url, secret, intervalMs = 5 * 60 * 1000, count = 3000 } = payload;
    
    // Przerwij wszelkie trwające w tle zapytania z poprzedniej sesji
    if (currentSyncController) {
      try { currentSyncController.abort(); } catch (ignored) {}
    }
    const syncController = new AbortController();
    currentSyncController = syncController;

    const runSync = async (fetchCount: number) => {
      if (syncController.signal.aborted) return;
      console.log(`[Worker] Wywołanie runSync z ilością: ${fetchCount}`);
      try {
        const { entries, treatments, deviceStatus } = await fetchNightscoutData(url, secret, fetchCount, syncController.signal);
        if (syncController.signal.aborted) return;
        console.log(`[Worker] runSync(${fetchCount}) SUCCESS. Wysyłam zdarzenie SYNC_SUCCESS.`);
        self.postMessage({ type: 'SYNC_SUCCESS', payload: { entries, treatments, deviceStatus } });
      } catch (err: any) {
        if (syncController.signal.aborted || err?.name === 'AbortError') {
          console.log(`[Worker] runSync(${fetchCount}) przerwane (nowa sesja).`);
          return;
        }
        console.error(`[Worker] runSync(${fetchCount}) ERROR:`, err);
        self.postMessage({ type: 'SYNC_ERROR', payload: err.message });
      }
    };

    console.log(`[Worker] Inicjalizuję pobieranie progresywne...`);
    // Szybkie odświeżenie najnowszych wpisów (150), a w tle dociągnięcie historii
    runSync(150).then(() => {
      if (!syncController.signal.aborted && count > 150) {
        console.log(`[Worker] Pierwszy etap (150) gotowy, uruchamiam pełne pobranie (${count}).`);
        runSync(count);
      }
    });

    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => runSync(150), intervalMs); // Cykliczne małe paczki
  }

  if (type === 'STOP_SYNC') {
    if (syncInterval) clearInterval(syncInterval);
    if (currentSyncController) {
      try { currentSyncController.abort(); } catch (ignored) {}
      currentSyncController = null;
    }
  }
};


