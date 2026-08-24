import { LogEntry, UserSettings } from '../types';

export interface DayPerformance {
  dayNumber: number;
  label: string;
  efficiencyPercent: number | null;
  sampleCount: number;
  avgGlucose: number | null;
  highCount: number;
  isActive: boolean;
  isPast: boolean;
  statusText: string;
}

export interface CurrentSiteStatus {
  ageHours: number;
  ageDays: number;
  hoursRemaining: number;
  currentEfficiency: number;
  statusLevel: 'optimal' | 'good' | 'degraded' | 'expired';
  lastChangeTimestamp: number;
  bolusCount: number;
  avgGlucose: number | null;
  highCount: number;
  lowCount: number;
}

export interface OcclusionRiskAlert {
  isRiskDetected: boolean;
  recentFailedBolusCount: number;
  message: string;
}

export interface InfusionAnalysisResult {
  hasData: boolean;
  currentSite: CurrentSiteStatus;
  daysBreakdown: DayPerformance[];
  recommendation: string;
  occlusionRisk: OcclusionRiskAlert;
}

export class InfusionAnalysisService {
  public static analyze(logs: LogEntry[], settings?: UserSettings): InfusionAnalysisResult {
    const now = Date.now();
    const isf = settings?.isf || 40;

    // 1. Znalezienie momentu założenia bieżącego wkłucia
    const siteChangeLogs = logs
      .filter(l => l.type === 'site_change' || l.type === 'site')
      .map(l => Number(l.timestamp))
      .sort((a, b) => a - b);

    const settingSiteChange = Number(settings?.infusionSetChangeDate || (typeof window !== 'undefined' ? localStorage.getItem('infusionSetChangeDate') : 0) || 0);
    if (settingSiteChange > 0 && !siteChangeLogs.includes(settingSiteChange)) {
      siteChangeLogs.push(settingSiteChange);
      siteChangeLogs.sort((a, b) => a - b);
    }

    const latestSiteChange = siteChangeLogs.length > 0 
      ? siteChangeLogs[siteChangeLogs.length - 1] 
      : (settingSiteChange > 0 ? settingSiteChange : now - 2 * 60 * 60 * 1000);

    const currentAgeHours = Math.max(0, Math.floor((now - latestSiteChange) / (1000 * 60 * 60)));
    const currentAgeDays = Number((currentAgeHours / 24).toFixed(1));
    const hoursRemaining = Math.max(0, 72 - currentAgeHours);

    // 2. Filtrujemy dane WYŁĄCZNIE dla bieżącego wkłucia (od momentu ostatniej wymiany)
    const getInsulinVal = (l: any): number => Number(l.value || l.insulin || l.amount || (l.type === 'bolus' ? l.value : 0) || 0);
    const getGlucoseVal = (l: any): number => Number(l.value || l.sgv || 0);
    const hasCarbs = (l: any): boolean => Boolean(l.carbs > 0 || l.linkedMeal?.carbs > 0 || l.type === 'meal');

    const currentSiteLogs = logs.filter(l => Number(l.timestamp) >= latestSiteChange && Number(l.timestamp) <= now);
    const currentSiteBoluses = currentSiteLogs.filter(l => (l.type === 'bolus' || l.type === 'insulin') && getInsulinVal(l) > 0);
    const currentSiteGlucoses = currentSiteLogs.filter(l => (l.type === 'glucose' || l.type === 'cgm' || l.type === 'sgv') && getGlucoseVal(l) > 0);

    const allGlucosesVals = currentSiteGlucoses.map(getGlucoseVal);
    const avgSiteGlucose = allGlucosesVals.length > 0 
      ? Math.round(allGlucosesVals.reduce((a, b) => a + b, 0) / allGlucosesVals.length) 
      : null;

    const siteHighs = allGlucosesVals.filter(v => v > 180).length;
    const siteLows = allGlucosesVals.filter(v => v < 70).length;

    // 3. Analiza skuteczności bolusów korekcyjnych w bieżącym wkłuciu
    const dayBuckets: {
      [day: number]: {
        expectedDrops: number[];
        actualDrops: number[];
        glucoses: number[];
        highs: number[];
      }
    } = {
      1: { expectedDrops: [], actualDrops: [], glucoses: [], highs: [] },
      2: { expectedDrops: [], actualDrops: [], glucoses: [], highs: [] },
      3: { expectedDrops: [], actualDrops: [], glucoses: [], highs: [] },
      4: { expectedDrops: [], actualDrops: [], glucoses: [], highs: [] },
    };

    currentSiteGlucoses.forEach(g => {
      const gTime = Number(g.timestamp);
      const ageH = (gTime - latestSiteChange) / (1000 * 60 * 60);
      const day = Math.min(4, Math.max(1, Math.floor(ageH / 24) + 1));
      const val = getGlucoseVal(g);
      dayBuckets[day].glucoses.push(val);
      if (val > 180) dayBuckets[day].highs.push(val);
    });

    const pureCorrectionBoluses = currentSiteBoluses.filter(b => !hasCarbs(b));
    pureCorrectionBoluses.forEach(b => {
      const bTime = Number(b.timestamp);
      const ageH = (bTime - latestSiteChange) / (1000 * 60 * 60);
      const day = Math.min(4, Math.max(1, Math.floor(ageH / 24) + 1));
      const bVal = getInsulinVal(b);

      const glucoseAtBolus = currentSiteGlucoses.find(g => Math.abs(Number(g.timestamp) - bTime) < 20 * 60 * 1000);
      const threeHoursLater = bTime + 3 * 60 * 60 * 1000;
      const glucoseAfter = logs.find(g => (g.type === 'glucose' || g.type === 'cgm' || g.type === 'sgv') && Math.abs(Number(g.timestamp) - threeHoursLater) < 35 * 60 * 1000);
      const mealsDuringWindow = logs.some(l => hasCarbs(l) && Number(l.timestamp) >= bTime && Number(l.timestamp) <= threeHoursLater);

      if (glucoseAtBolus && glucoseAfter && !mealsDuringWindow) {
        const startG = getGlucoseVal(glucoseAtBolus);
        const endG = getGlucoseVal(glucoseAfter);
        const actualDrop = startG - endG;
        const expectedDrop = bVal * isf;

        if (expectedDrop > 0) {
          dayBuckets[day].expectedDrops.push(expectedDrop);
          dayBuckets[day].actualDrops.push(actualDrop);
        }
      }
    });

    const currentDayNumber = Math.floor(currentAgeHours / 24) + 1;

    const daysBreakdown: DayPerformance[] = [1, 2, 3, 4].map(day => {
      const b = dayBuckets[day];
      const totalExpected = b.expectedDrops.reduce((a, c) => a + c, 0);
      const totalActual = b.actualDrops.reduce((a, c) => a + c, 0);
      const hasSamples = b.expectedDrops.length >= 1;
      
      let eff: number | null = null;
      if (hasSamples && totalExpected > 0) {
        eff = Math.min(120, Math.max(20, Math.round((totalActual / totalExpected) * 100)));
      }

      const avgG = b.glucoses.length > 0 
        ? Math.round(b.glucoses.reduce((a, c) => a + c, 0) / b.glucoses.length) 
        : null;

      const isActive = day === currentDayNumber;
      const isPast = day < currentDayNumber;

      let statusText = 'Oczekuje';
      if (isActive) {
        statusText = 'W trakcie';
      } else if (isPast) {
        statusText = eff ? (eff >= 85 ? 'Optymalnie' : 'Spadek') : 'Zakończona';
      }

      return {
        dayNumber: day,
        label: day === 4 ? 'Doba 4+' : 'Doba ' + day + ' (' + ((day-1)*24) + '-' + (day*24) + 'h)',
        efficiencyPercent: eff,
        sampleCount: b.expectedDrops.length,
        avgGlucose: avgG,
        highCount: b.highs.length,
        isActive,
        isPast,
        statusText
      };
    });

    // Szacowanie sprawności bieżącego wkłucia
    let calculatedEfficiency = 100;
    if (currentAgeHours <= 24) {
      calculatedEfficiency = daysBreakdown[0].efficiencyPercent ?? 100;
    } else if (currentAgeHours <= 48) {
      calculatedEfficiency = daysBreakdown[1].efficiencyPercent ?? 95;
    } else if (currentAgeHours <= 72) {
      calculatedEfficiency = daysBreakdown[2].efficiencyPercent ?? 80;
    } else {
      calculatedEfficiency = daysBreakdown[3].efficiencyPercent ?? 55;
    }

    let statusLevel: 'optimal' | 'good' | 'degraded' | 'expired' = 'optimal';
    if (currentAgeHours > 72) {
      statusLevel = 'expired';
    } else if (calculatedEfficiency < 75 || currentAgeHours > 54) {
      statusLevel = 'degraded';
    } else if (currentAgeHours <= 24) {
      statusLevel = 'optimal';
    } else {
      statusLevel = 'good';
    }

    const currentSite: CurrentSiteStatus = {
      ageHours: currentAgeHours,
      ageDays: currentAgeDays,
      hoursRemaining,
      currentEfficiency: calculatedEfficiency,
      statusLevel,
      lastChangeTimestamp: latestSiteChange,
      bolusCount: currentSiteBoluses.length,
      avgGlucose: avgSiteGlucose,
      highCount: siteHighs,
      lowCount: siteLows
    };

    // Detektor zagięcia kaniuli w bieżącym wkłuciu (ostatnie 3h)
    let isRiskDetected = false;
    let recentFailedBolusCount = 0;
    let riskMessage = '';

    const threeHoursAgo = now - 3 * 60 * 60 * 1000;
    const recentBoluses = currentSiteBoluses
      .filter(b => Number(b.timestamp) >= threeHoursAgo && !hasCarbs(b))
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    
    // Weryfikacja: Wymagamy co najmniej 2 bolusów korekcyjnych z odstępem min. 45 min lub min. 60 min od pierwszego bolusa
    if (recentBoluses.length >= 2) {
      const firstBolusTime = Number(recentBoluses[0].timestamp);
      const timeSinceFirstBolusMin = (now - firstBolusTime) / (1000 * 60);

      // Czekamy min. 50 minut od pierwszego bolusa, aby insulina miała fizjologiczny czas rozwinąć działanie
      if (timeSinceFirstBolusMin >= 50) {
        const recentGlucoses = currentSiteGlucoses
          .filter(g => Number(g.timestamp) >= firstBolusTime - 15 * 60 * 1000)
          .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

        if (recentGlucoses.length >= 2) {
          const firstG = getGlucoseVal(recentGlucoses[0]);
          const lastG = getGlucoseVal(recentGlucoses[recentGlucoses.length - 1]);
          // Jeśli cukier wzrósł lub nie spadł mimo podania korekt i wynosi > 160 mg/dL
          if (lastG >= firstG - 10 && lastG > 160) {
            isRiskDetected = true;
            recentFailedBolusCount = recentBoluses.length;
            riskMessage = `Podano ${recentBoluses.length} bolusy korekcyjne w ostatnich ${Math.round(timeSinceFirstBolusMin)} min, a cukier nie spadł (${firstG} ➔ ${lastG} mg/dL). Sprawdź drożność tego wkłucia!`;
          }
        }
      }
    }

    // Jeśli wykryto ryzyko zatkania w tej chwili, dostosuj bieżącą sprawność i status
    if (isRiskDetected) {
      calculatedEfficiency = Math.min(calculatedEfficiency, 60);
      statusLevel = 'degraded';
    }

    let recommendation = 'Bieżące wkłucie założono ' + currentAgeHours + 'h temu. ';
    if (currentAgeHours <= 24) {
      recommendation += 'To początek cyklu (Doba 1) – wchłanianie jest optymalne. Kolejne doby odblokują się w miarę upływu czasu.';
    } else if (currentAgeHours <= 48) {
      recommendation += 'Wkłucie jest w 2. dobie – stabilny stan pracy. Pozostało ok. ' + hoursRemaining + 'h do zalecanej wymiany.';
    } else if (currentAgeHours <= 72) {
      recommendation += 'Wkłucie jest w 3. dobie – zwracaj uwagę na ewentualne opóźnienia wchłaniania bolusów poposiłkowych.';
    } else {
      recommendation += 'Wkłucie przekroczyło 72h (3 doby) – zalecana natychmiastowa wymiana kaniuli, aby uniknąć niewyjaśnionych hiperglikemii.';
    }

    return {
      hasData: true,
      currentSite,
      daysBreakdown,
      recommendation,
      occlusionRisk: {
        isRiskDetected,
        recentFailedBolusCount,
        message: riskMessage
      }
    };
  }
}
