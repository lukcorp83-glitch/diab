import { LogEntry, UserSettings } from '../types';
import i18n from '../i18n';

export interface AnatomicalZone {
  id: string;
  name: string;
  shortName: string;
  view: 'front' | 'back';
  side: 'left' | 'right';
  group: 'abdomen' | 'thigh' | 'arm' | 'buttock' | 'flank';
  dotPos: { top: string; left: string };
  absorptionSpeed: 'fast' | 'medium' | 'slow';
  absorptionDesc: string;
}

export interface ZoneRecoveryInfo {
  zone: AnatomicalZone;
  lastUsedTimestamp: number | null;
  daysSinceLastUse: number | null;
  useCountLast30Days: number;
  status: 'active' | 'fresh' | 'recovering' | 'tired';
  recoveryPercentage: number; // 0 - 100%
}

export const ANATOMICAL_ZONES: AnatomicalZone[] = [
  // --- PRZÓD (FRONT) ---
  {
    id: 'left_abdomen',
    name: 'Lewy brzuch',
    shortName: 'L. Brzuch',
    view: 'front',
    side: 'left',
    group: 'abdomen',
    dotPos: { top: '45%', left: '38%' },
    absorptionSpeed: 'fast',
    absorptionDesc: 'Szybkie wchłanianie, polecane przy dynamicznych posiłkach.'
  },
  {
    id: 'right_abdomen',
    name: 'Prawy brzuch',
    shortName: 'P. Brzuch',
    view: 'front',
    side: 'right',
    group: 'abdomen',
    dotPos: { top: '45%', left: '62%' },
    absorptionSpeed: 'fast',
    absorptionDesc: 'Szybkie wchłanianie, polecane przy dynamicznych posiłkach.'
  },
  {
    id: 'left_arm',
    name: 'Lewe ramię',
    shortName: 'L. Ramię',
    view: 'front',
    side: 'left',
    group: 'arm',
    dotPos: { top: '38%', left: '20%' },
    absorptionSpeed: 'medium',
    absorptionDesc: 'Średnie tempo wchłaniania, wygodne przy siedzącym trybie.'
  },
  {
    id: 'right_arm',
    name: 'Prawe ramię',
    shortName: 'P. Ramię',
    view: 'front',
    side: 'right',
    group: 'arm',
    dotPos: { top: '38%', left: '80%' },
    absorptionSpeed: 'medium',
    absorptionDesc: 'Średnie tempo wchłaniania, wygodne przy siedzącym trybie.'
  },
  {
    id: 'left_thigh',
    name: 'Lewe udo',
    shortName: 'L. Udo',
    view: 'front',
    side: 'left',
    group: 'thigh',
    dotPos: { top: '65%', left: '34%' },
    absorptionSpeed: 'slow',
    absorptionDesc: 'Wolne i stabilne wchłanianie, dobre na spokojne dni.'
  },
  {
    id: 'right_thigh',
    name: 'Prawe udo',
    shortName: 'P. Udo',
    view: 'front',
    side: 'right',
    group: 'thigh',
    dotPos: { top: '65%', left: '66%' },
    absorptionSpeed: 'slow',
    absorptionDesc: 'Wolne i stabilne wchłanianie, dobre na spokojne dni.'
  },

  // --- TYŁ (BACK) ---
  {
    id: 'left_buttock',
    name: 'Lewy pośladek',
    shortName: 'L. Pośladek',
    view: 'back',
    side: 'left',
    group: 'buttock',
    dotPos: { top: '52%', left: '36%' },
    absorptionSpeed: 'slow',
    absorptionDesc: 'Bardzo stabilne, długie uwalnianie. Doskonałe na noc.'
  },
  {
    id: 'right_buttock',
    name: 'Prawy pośladek',
    shortName: 'P. Pośladek',
    view: 'back',
    side: 'right',
    group: 'buttock',
    dotPos: { top: '52%', left: '64%' },
    absorptionSpeed: 'slow',
    absorptionDesc: 'Bardzo stabilne, długie uwalnianie. Doskonałe na noc.'
  },
  {
    id: 'left_flank',
    name: 'Lewy boczek / plecy',
    shortName: 'L. Boczek',
    view: 'back',
    side: 'left',
    group: 'flank',
    dotPos: { top: '42%', left: '28%' },
    absorptionSpeed: 'medium',
    absorptionDesc: 'Zbalansowane wchłanianie, odciąża przednią część brzucha.'
  },
  {
    id: 'right_flank',
    name: 'Prawy boczek / plecy',
    shortName: 'P. Boczek',
    view: 'back',
    side: 'right',
    group: 'flank',
    dotPos: { top: '42%', left: '72%' },
    absorptionSpeed: 'medium',
    absorptionDesc: 'Zbalansowane wchłanianie, odciąża przednią część brzucha.'
  }
];

export const DEFAULT_ALLOWED_SITES = [
  'left_abdomen',
  'right_abdomen',
  'left_buttock',
  'right_buttock'
];

/**
 * Normalizuje tekst nazwy miejsca na identyfikator strefy anatomicznej
 */
export function normalizeSiteToZoneId(siteNameOrNote?: string): string {
  if (!siteNameOrNote || typeof siteNameOrNote !== 'string') return 'right_abdomen';
  const clean = siteNameOrNote.toLowerCase().trim();

  const isLeft = clean.includes('lew') || clean.includes('left');
  const isRight = clean.includes('praw') || clean.includes('right');

  if (clean.includes('poslad') || clean.includes('buttock') || clean.includes('pupa')) {
    return isLeft ? 'left_buttock' : 'right_buttock';
  }
  if (clean.includes('boczek') || clean.includes('plecy') || clean.includes('flank') || clean.includes('lędźwi')) {
    return isLeft ? 'left_flank' : 'right_flank';
  }
  if (clean.includes('udo') || clean.includes('uda') || clean.includes('thigh') || clean.includes('noga')) {
    return isLeft ? 'left_thigh' : 'right_thigh';
  }
  if (clean.includes('ramie') || clean.includes('ramię') || clean.includes('arm') || clean.includes('bark')) {
    return isLeft ? 'left_arm' : 'right_arm';
  }
  if (clean.includes('brzuch') || clean.includes('abdomen') || clean.includes('belly')) {
    return isLeft ? 'left_abdomen' : 'right_abdomen';
  }

  // Fallback bazujący na stronie
  if (isLeft) return 'left_abdomen';
  if (isRight) return 'right_abdomen';

  return 'right_abdomen';
}

/**
 * Znajduje strefę anatomiczną po identyfikatorze
 */
export function getZoneById(zoneId: string): AnatomicalZone {
  return ANATOMICAL_ZONES.find(z => z.id === zoneId) || ANATOMICAL_ZONES[1]; // default: right_abdomen
}

/**
 * Automatycznie wykrywa strefy używane przez pacjenta na podstawie historii wpisów
 */
export function detectUserActiveSitesFromHistory(logs: LogEntry[]): string[] {
  const siteLogs = (logs || []).filter(l => l.type === 'site_change');
  const counts = new Map<string, number>();

  siteLogs.forEach(l => {
    const zoneId = normalizeSiteToZoneId(l.notes || l.description || '');
    counts.set(zoneId, (counts.get(zoneId) || 0) + 1);
  });

  const detected = Array.from(counts.keys());
  if (detected.length >= 2) {
    return detected;
  }

  return DEFAULT_ALLOWED_SITES;
}

/**
 * Uczy się naturalnych przejść (sekwencji) między strefami z historii pacjenta
 */
export function learnUserRotationTransitions(logs: LogEntry[]): Map<string, Map<string, number>> {
  const transitions = new Map<string, Map<string, number>>();
  
  // Sortujemy logi chronologicznie rosnąco
  const siteLogs = (logs || [])
    .filter(l => l.type === 'site_change')
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  for (let i = 0; i < siteLogs.length - 1; i++) {
    const fromZone = normalizeSiteToZoneId(siteLogs[i].notes || siteLogs[i].description || '');
    const toZone = normalizeSiteToZoneId(siteLogs[i + 1].notes || siteLogs[i + 1].description || '');

    if (fromZone !== toZone) {
      if (!transitions.has(fromZone)) {
        transitions.set(fromZone, new Map());
      }
      const targetMap = transitions.get(fromZone)!;
      targetMap.set(toZone, (targetMap.get(toZone) || 0) + 1);
    }
  }

  return transitions;
}

/**
 * Oblicza stan regeneracji tkanek dla wszystkich stref na podstawie historii logów
 */
export function calculateTissueRecovery(
  logs: LogEntry[],
  currentSiteId: string,
  siteChangeTimestamp?: number
): Map<string, ZoneRecoveryInfo> {
  const recoveryMap = new Map<string, ZoneRecoveryInfo>();
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Filtrujemy wymiany wkłuć
  const siteLogs = (logs || [])
    .filter(l => l.type === 'site_change' && (l.timestamp || 0) >= thirtyDaysAgo)
    .sort((a, b) => b.timestamp - a.timestamp);

  ANATOMICAL_ZONES.forEach(zone => {
    let lastUsedTime: number | null = null;
    let count = 0;

    if (zone.id === currentSiteId) {
      lastUsedTime = siteChangeTimestamp || now;
      count++;
    }

    siteLogs.forEach(l => {
      const zId = normalizeSiteToZoneId(l.notes || l.description || '');
      if (zId === zone.id) {
        count++;
        const logTime = l.timestamp || new Date(l.createdAt || 0).getTime();
        if (!lastUsedTime || logTime > lastUsedTime) {
          lastUsedTime = logTime;
        }
      }
    });

    let daysSince: number | null = null;
    let status: 'active' | 'fresh' | 'recovering' | 'tired' = 'fresh';
    let recoveryPct = 100;

    if (zone.id === currentSiteId) {
      status = 'active';
      daysSince = 0;
      recoveryPct = 0;
    } else if (lastUsedTime !== null) {
      daysSince = Math.max(0, Math.floor((now - lastUsedTime) / (24 * 60 * 60 * 1000)));
      if (daysSince >= 14) {
        status = 'fresh';
        recoveryPct = 100;
      } else if (daysSince >= 4) {
        status = 'recovering';
        recoveryPct = Math.round((daysSince / 14) * 100);
      } else {
        status = 'tired';
        recoveryPct = Math.round((daysSince / 14) * 100);
      }
    } else {
      // Nigdy nie używana lub > 30 dni temu
      daysSince = 99;
      status = 'fresh';
      recoveryPct = 100;
    }

    recoveryMap.set(zone.id, {
      zone,
      lastUsedTimestamp: lastUsedTime,
      daysSinceLastUse: daysSince,
      useCountLast30Days: count,
      status,
      recoveryPercentage: Math.min(100, Math.max(0, recoveryPct))
    });
  });

  return recoveryMap;
}

/**
 * Algorytm wyboru optymalnego kolejnego miejsca wkłucia (z auto-uczeniem sekwencji i nawyków pacjenta)
 */
export function getNextRecommendedSite(
  currentSiteId: string,
  allowedSiteIds?: any,
  sensorSiteName?: any,
  recoveryMap?: any,
  logs: LogEntry[] = []
): { zone: AnatomicalZone; reason: string; daysRested: number; isLearnedPattern?: boolean } {
  let effAllowedSiteIds: string[] | undefined = allowedSiteIds;
  let effSensorSiteName: string | undefined = sensorSiteName;
  let effRecoveryMap: Map<string, ZoneRecoveryInfo> | undefined = recoveryMap;
  let effLogs: LogEntry[] = logs;

  // Obsługa elastycznej kolejności parametrów
  if (allowedSiteIds instanceof Map) {
    effRecoveryMap = allowedSiteIds;
    effAllowedSiteIds = Array.isArray(sensorSiteName) ? sensorSiteName : undefined;
    effSensorSiteName = typeof recoveryMap === 'string' ? recoveryMap : undefined;
    effLogs = Array.isArray(logs) ? logs : [];
  }

  if (!effRecoveryMap || !(effRecoveryMap instanceof Map) || typeof effRecoveryMap.get !== 'function') {
    effRecoveryMap = calculateTissueRecovery(effLogs, currentSiteId);
  }

  const currentZone = getZoneById(currentSiteId);
  const sensorZoneId = effSensorSiteName ? normalizeSiteToZoneId(effSensorSiteName) : null;

  // Jeśli użytkownik nie zdefiniował ręcznie stref, auto-uczymy się stref z historii
  const effectiveAllowed = (effAllowedSiteIds && effAllowedSiteIds.length > 0)
    ? effAllowedSiteIds
    : detectUserActiveSitesFromHistory(effLogs);

  // Uczymy się sekwencji rotacji pacjenta z historii
  const transitions = learnUserRotationTransitions(effLogs);
  const fromTransitions = transitions.get(currentSiteId);

  // Filtrujemy kandydatów
  let candidates = ANATOMICAL_ZONES.filter(z => {
    if (!effectiveAllowed.includes(z.id)) return false;
    if (z.id === currentSiteId) return false;
    if (sensorZoneId && z.id === sensorZoneId) return false;
    return true;
  });

  if (candidates.length === 0) {
    candidates = ANATOMICAL_ZONES.filter(z => z.id !== currentSiteId);
  }

  // Punktacja kandydatów:
  const scoredCandidates = candidates.map(zone => {
    const recInfo = recoveryMap.get(zone.id);
    const daysRested = recInfo?.daysSinceLastUse ?? 99;
    
    let score = daysRested * 10;

    // Bonus za wyuczoną z historii sekwencję pacjenta (Transition habit)
    let isHabit = false;
    if (fromTransitions && fromTransitions.has(zone.id)) {
      const habitCount = fromTransitions.get(zone.id) || 0;
      score += habitCount * 30; // Bardzo silny bonus za wyuczony cykl pacjenta
      if (habitCount >= 2) isHabit = true;
    }

    // Bonus za zmianę strony (lewa <-> prawa)
    if (zone.side !== currentZone.side) {
      score += 25;
    }

    // Bonus za zmianę grupy (np. brzuch -> pośladek)
    if (zone.group !== currentZone.group) {
      score += 15;
    }

    return { zone, score, daysRested, isHabit };
  });

  scoredCandidates.sort((a, b) => b.score - a.score);
  const best = scoredCandidates[0] || { zone: ANATOMICAL_ZONES[1], daysRested: 14, isHabit: false };

  const daysText = best.daysRested >= 30 ? 'ponad 30 dni' : `${best.daysRested} dni`;
  
  let reason = `Tkanka odpoczywała ${daysText}. Zapewnia optymalną wchłanialność.`;
  if (best.isHabit) {
    reason = `Wyuczony cykl pacjenta (odpoczywa ${daysText} • wysoka wchłanialność).`;
  }

  return {
    zone: best.zone,
    reason,
    daysRested: best.daysRested,
    isLearnedPattern: best.isHabit
  };
}

/**
 * Wykrywa ryzyko zrostów (lipohipertrofii) przy zbyt częstym wbijaniu w to samo miejsce
 */
export function detectLipohypertrophyWarning(logs: LogEntry[]): { hasWarning: boolean; warningMsg: string; zoneName?: string } {
  const recentChanges = (logs || [])
    .filter(l => l.type === 'site_change')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);

  if (recentChanges.length >= 2) {
    const z1 = normalizeSiteToZoneId(recentChanges[0].notes || recentChanges[0].description || '');
    const z2 = normalizeSiteToZoneId(recentChanges[1].notes || recentChanges[1].description || '');

    if (z1 === z2) {
      const zone = getZoneById(z1);
      return {
        hasWarning: true,
        warningMsg: `Strefa "${zone.name}" była używana dwukrotnie z rzędu. Zmień obszar, aby zapobiec powstawaniu zrostów tłuszczowych.`,
        zoneName: zone.name
      };
    }
  }

  return { hasWarning: false, warningMsg: '' };
}
