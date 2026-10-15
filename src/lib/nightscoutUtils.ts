/**
 * Narzędzia pomocnicze do interpretacji danych z Nightscout (profile, devicestatus, baza).
 */

export function getBasalFromProfile(profileData: any, targetDate: Date = new Date()): number | null {
  if (!profileData) return null;
  const raw = Array.isArray(profileData) ? profileData[0] : profileData;
  if (!raw) return null;

  const store = raw.store;
  const defaultProfileName = raw.defaultProfile;
  if (!store || !defaultProfileName) return null;

  const profile = store[defaultProfileName];
  if (!profile || !Array.isArray(profile.basal) || profile.basal.length === 0) return null;

  // Oblicz sekundy od początku doby w strefie czasowej
  const secondsOfDay = targetDate.getHours() * 3600 + targetDate.getMinutes() * 60 + targetDate.getSeconds();

  const sorted = [...profile.basal].sort((a, b) => {
    const secA = a.timeAsSeconds ?? (parseInt((a.time || '00:00').split(':')[0], 10) * 3600 + parseInt((a.time || '00:00').split(':')[1], 10) * 60);
    const secB = b.timeAsSeconds ?? (parseInt((b.time || '00:00').split(':')[0], 10) * 3600 + parseInt((b.time || '00:00').split(':')[1], 10) * 60);
    return secA - secB;
  });

  let currentBasal = sorted[0].value;
  for (const item of sorted) {
    const sec = item.timeAsSeconds ?? (parseInt((item.time || '00:00').split(':')[0], 10) * 3600 + parseInt((item.time || '00:00').split(':')[1], 10) * 60);
    if (sec <= secondsOfDay) {
      currentBasal = item.value;
    } else {
      break;
    }
  }

  const num = typeof currentBasal === 'number' ? currentBasal : parseFloat(currentBasal);
  return !isNaN(num) && num >= 0 ? num : null;
}

/**
 * Zwraca precyzyjną dawkę bazy (j/h) oraz informację czy jest to baza tymczasowa dla zadanego znacznika czasu.
 */
export function getBasalRateAtTime(
  timestamp: number,
  settings?: any,
  pumpStatus?: any,
  basalLogs?: any[]
): { rate: number; isTemp: boolean } {
  // 1. Sprawdź czy dla danego timestampu był aktywny wpis Temp Basal z logów
  if (basalLogs && basalLogs.length > 0) {
    const activeTemp = basalLogs.find((l: any) => {
      const start = l.timestamp;
      const durationMs = (l.duration || 30) * 60 * 1000;
      return timestamp >= start && timestamp < start + durationMs;
    });
    if (activeTemp) {
      const r = typeof activeTemp.rate === 'number' ? activeTemp.rate : Number(activeTemp.value || 0);
      return { rate: Math.max(0, r), isTemp: true };
    }
  }

  // 2. Jeśli timestamp jest blisko teraz (< 45 min) i pompa ma aktywny temp basal
  const now = Date.now();
  if (pumpStatus?.basal?.isTemp && Math.abs(now - timestamp) < 45 * 60 * 1000) {
    const r = Number(pumpStatus.basal.rate);
    if (!isNaN(r) && r >= 0) {
      return { rate: r, isTemp: true };
    }
  }

  // 3. Sprawdź profile godzinowe w settings (hourlyProfiles)
  if (settings?.hourlyProfiles && Array.isArray(settings.hourlyProfiles) && settings.hourlyProfiles.length > 0) {
    const d = new Date(timestamp);
    const targetMin = d.getHours() * 60 + d.getMinutes();

    const validProfiles = settings.hourlyProfiles
      .filter((p: any) => typeof p.basal === 'number' && p.basal >= 0)
      .map((p: any) => {
        const parts = (p.time || '00:00').split(':');
        const min = parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
        return { min, basal: Number(p.basal) };
      })
      .sort((a: any, b: any) => a.min - b.min);

    if (validProfiles.length > 0) {
      let matched = validProfiles[0].basal;
      for (const vp of validProfiles) {
        if (vp.min <= targetMin) {
          matched = vp.basal;
        } else {
          break;
        }
      }
      return { rate: matched, isTemp: false };
    }
  }

  // 4. Jeśli brak profili w settings, ale znamy bazę z pompy (pumpStatus)
  if (pumpStatus?.basal?.rate !== undefined && pumpStatus?.basal?.rate !== null) {
    const r = Number(pumpStatus.basal.rate);
    if (!isNaN(r) && r >= 0) {
      try {
        localStorage.setItem('last_known_basal', String(r));
      } catch (_) {}
      return { rate: r, isTemp: Boolean(pumpStatus.basal.isTemp) };
    }
  }

  // 5. Fallback z pamięci podręcznej (ostatnia znana baza)
  try {
    const cached = localStorage.getItem('last_known_basal');
    if (cached) {
      const parsed = parseFloat(cached);
      if (!isNaN(parsed) && parsed > 0) {
        return { rate: parsed, isTemp: false };
      }
    }
  } catch (_) {}

  return { rate: 0, isTemp: false };
}

export interface DailyBasalResult {
  deliveredBasal: number;   // Szacunkowa rzeczywiście podana baza z uwzględnieniem wyłączeń i temp basali
  scheduledBasal: number;   // Teoretyczna baza z profilu
  savedBasal: number;       // Insulina wstrzymana przez pompę (np. przy spadkach / hipo)
  isApproximate: boolean;   // Zawsze true - wartość przybliżona na podstawie telemetrii
  activeHours: number;      // Liczba godzin brana pod uwagę
}

/**
 * Oblicza szacunkową dobową bazę (TDD Basal) poprzez całkowanie krokowe (co 5 minut).
 * Uwzględnia wyłączenia pompy do 0.00 j/h przy spadkach cukru, redukcje i zwiększenia bazy.
 * UWAGA: Zwracana wartość jest zawsze wartością przybliżoną (telemetryczną estymacją).
 */
export function getActualDailyBasal(
  targetDate: Date | number = new Date(),
  settings?: any,
  pumpStatus?: any,
  basalLogs?: any[]
): DailyBasalResult {
  const d = new Date(targetDate);
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
  const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
  const now = Date.now();
  
  // Jeśli sprawdzamy dzień dzisiejszy, liczymy do chwili obecnej
  const cutoff = Math.min(now, endOfDay);
  if (cutoff <= startOfDay) {
    return { deliveredBasal: 0, scheduledBasal: 0, savedBasal: 0, isApproximate: true, activeHours: 0 };
  }

  const stepMinutes = 5;
  const stepMs = stepMinutes * 60 * 1000;
  const stepHours = stepMinutes / 60; // 0.08333 h

  let deliveredBasal = 0;
  let scheduledBasal = 0;

  for (let t = startOfDay; t <= cutoff; t += stepMs) {
    // 1. Rzeczywiste tempo w danym momencie (z wyłączeniami 0 j/h i temp basalami)
    const actual = getBasalRateAtTime(t, settings, pumpStatus, basalLogs);
    deliveredBasal += (actual.rate || 0) * stepHours;

    // 2. Teoretyczny profil standardowy bez nakładek tymczasowych
    const profileOnly = getBasalRateAtTime(t, settings, null, []);
    scheduledBasal += (profileOnly.rate || 0) * stepHours;
  }

  const activeHours = (cutoff - startOfDay) / (1000 * 60 * 60);
  const savedBasal = Math.max(0, scheduledBasal - deliveredBasal);

  return {
    deliveredBasal: Math.round(deliveredBasal * 100) / 100,
    scheduledBasal: Math.round(scheduledBasal * 100) / 100,
    savedBasal: Math.round(savedBasal * 100) / 100,
    isApproximate: true,
    activeHours: Math.round(activeHours * 10) / 10
  };
}

