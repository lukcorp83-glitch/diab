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
  status: 'safe' | 'pending_peak' | 'occlusion_risk';
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
      .filter(l => l.type === 'site_change' || (l.type as any) === 'site')
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

    // 2. Filtrujemy dane WYŁĄCZNIE dla bieżącego wkłucia
    const getInsulinVal = (l: any): number => Number(l.value || l.insulin || l.amount || (l.type === 'bolus' ? l.value : 0) || 0);
    const getGlucoseVal = (l: any): number => Number(l.value || l.sgv || 0);
    const hasCarbs = (l: any): boolean => Boolean(l.carbs > 0 || l.linkedMeal?.carbs > 0 || l.type === 'meal');

    const currentSiteLogs = logs.filter(l => Number(l.timestamp) >= latestSiteChange && Number(l.timestamp) <= now);
    const currentSiteBoluses = currentSiteLogs.filter(l => (l.type === 'bolus' || (l.type as any) === 'insulin') && getInsulinVal(l) > 0);
    const currentSiteGlucoses = currentSiteLogs.filter(l => (l.type === 'glucose' || (l.type as any) === 'cgm' || (l.type as any) === 'sgv') && getGlucoseVal(l) > 0);

    const allGlucosesVals = currentSiteGlucoses.map(getGlucoseVal);
    const avgSiteGlucose = allGlucosesVals.length > 0 
      ? Math.round(allGlucosesVals.reduce((a, b) => a + b, 0) / allGlucosesVals.length) 
      : null;

    const siteHighs = allGlucosesVals.filter(v => v > 180).length;
    const siteLows = allGlucosesVals.filter(v => v < 70).length;
    const highRatio = allGlucosesVals.length > 0 ? (siteHighs / allGlucosesVals.length) : 0;

    // 3. Analiza skuteczności bolusów korekcyjnych z podziałem na doby wkłucia
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
      const glucoseAfter = logs.find(g => (g.type === 'glucose' || (g.type as any) === 'cgm' || (g.type as any) === 'sgv') && Math.abs(Number(g.timestamp) - threeHoursLater) < 35 * 60 * 1000);
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
        eff = Math.min(100, Math.max(20, Math.round((totalActual / totalExpected) * 100)));
      } else {
        // Oblicz sprawność szacunkową z profilu glikemii danej doby
        const dayGlucoses = b.glucoses;
        if (dayGlucoses.length >= 5) {
          const dayHighRatio = b.highs.length / dayGlucoses.length;
          const baselineEff = day === 1 ? 98 : day === 2 ? 92 : day === 3 ? 82 : 60;
          eff = Math.max(40, Math.round(baselineEff - (dayHighRatio * 25)));
        }
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
        statusText = eff ? (eff >= 80 ? 'Optymalnie' : 'Spadek') : 'Zakończona';
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

    // 4. Zaawansowana ocena farmakokinetyki i detekcja zagięcia kaniuli (Occlusion vs Pending Peak)
    let isRiskDetected = false;
    let occlusionStatus: 'safe' | 'pending_peak' | 'occlusion_risk' = 'safe';
    let recentFailedBolusCount = 0;
    let riskMessage = '';

    const fourHoursAgo = now - 4 * 60 * 60 * 1000;
    const recentBolusesInWindow = currentSiteBoluses
      .filter(b => Number(b.timestamp) >= fourHoursAgo)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    const recentCorrectionsInWindow = recentBolusesInWindow.filter(b => !hasCarbs(b));

    // Ostatnie odczyty glikemii z ostatnich 4 godzin
    const recentGlucosesInWindow = currentSiteGlucoses
      .filter(g => Number(g.timestamp) >= fourHoursAgo - 15 * 60 * 1000)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    const latestGlucose = recentGlucosesInWindow.length > 0 
      ? getGlucoseVal(recentGlucosesInWindow[recentGlucosesInWindow.length - 1]) 
      : 0;

    // Trend z ostatnich 30 minut
    let isDroppingNow = false;
    if (recentGlucosesInWindow.length >= 3) {
      const gNow = latestGlucose;
      const g30m = getGlucoseVal(recentGlucosesInWindow[Math.max(0, recentGlucosesInWindow.length - 4)]);
      if (gNow <= g30m - 12) {
        isDroppingNow = true; // Cukier wyraźnie spada – kaniula drożna!
      }
    }

    if (recentCorrectionsInWindow.length > 0 && latestGlucose > 160) {
      const latestBolus = recentCorrectionsInWindow[recentCorrectionsInWindow.length - 1];
      const firstBolus = recentCorrectionsInWindow[0];
      const timeSinceLatestMin = (now - Number(latestBolus.timestamp)) / 60000;
      const timeSinceFirstMin = (now - Number(firstBolus.timestamp)) / 60000;
      const totalCorrectionUnits = recentCorrectionsInWindow.reduce((sum, b) => sum + getInsulinVal(b), 0);

      const formatUnits = (val: number) => {
        const rounded = Math.round(val * 100) / 100;
        return rounded.toString().replace('.', ',');
      };

      // A. Jeśli od ostatniego bolusa minęło MNIEJ niż 60 minut:
      // Insulina jest jeszcze w fazie wchłaniania (szczyt następuje po 60-90 min). NIE straszymy zgięciem!
      if (timeSinceLatestMin < 60) {
        occlusionStatus = 'pending_peak';
        const latestVal = getInsulinVal(latestBolus);
        riskMessage = `Podano korektę ${formatUnits(latestVal)}j (${Math.round(timeSinceLatestMin)} min temu). Insulina dopiero wnika do krwiobiegu – szczyt działania nastąpi po 60-90 min.`;
      }
      // B. Jeśli minęło co najmniej 75 min od ostatniej dawki (lub >=120 min od pierwszej) i podano >=2 dawki lub >=2.0j
      else if ((recentCorrectionsInWindow.length >= 2 || totalCorrectionUnits >= 2.0) && timeSinceLatestMin >= 75 && timeSinceFirstMin >= 110) {
        if (!isDroppingNow && latestGlucose >= 180) {
          const firstBolusGEntry = recentGlucosesInWindow.find(g => Math.abs(Number(g.timestamp) - Number(firstBolus.timestamp)) < 25 * 60 * 1000);
          const startG = firstBolusGEntry ? getGlucoseVal(firstBolusGEntry) : latestGlucose;

          // Jeśli cukier nie spadł o co najmniej 15 mg/dL mimo upływu czasu szczytu działania
          if (latestGlucose >= startG - 15) {
            isRiskDetected = true;
            occlusionStatus = 'occlusion_risk';
            recentFailedBolusCount = recentCorrectionsInWindow.length;
            riskMessage = `Podano łącznie ${formatUnits(totalCorrectionUnits)}j insuliny korekcyjnej (${recentCorrectionsInWindow.length} dawki), od ostatniej minęło ${Math.round(timeSinceLatestMin)} min, a glikemia nie reaguje (${startG} ➔ ${latestGlucose} mg/dL). Sprawdź wkłucie pod kątem zagięcia kaniuli lub zrostu.`;
          }
        }
      }
    }

    // 5. Szacowanie ogólnej sprawności bieżącego wkłucia (spójne z alertem o zagięciu!)
    let calculatedEfficiency = 95;
    const activeDayIdx = Math.min(3, Math.max(0, currentDayNumber - 1));
    const dayEff = daysBreakdown[activeDayIdx]?.efficiencyPercent;

    if (dayEff !== null && dayEff !== undefined) {
      calculatedEfficiency = dayEff;
    } else {
      if (currentAgeHours <= 24) calculatedEfficiency = 96;
      else if (currentAgeHours <= 48) calculatedEfficiency = 88;
      else if (currentAgeHours <= 72) calculatedEfficiency = 76;
      else calculatedEfficiency = 50;

      // Korekta o średnią hiperglikemię na wkłuciu
      if (highRatio > 0.4) {
        calculatedEfficiency = Math.max(40, calculatedEfficiency - 15);
      }
    }

    // KRYTYCZNA SPÓJNOŚĆ: Jeśli wykryto zagięcie kaniuli, sprawność MUSI spaść drastycznie!
    if (isRiskDetected) {
      calculatedEfficiency = Math.min(calculatedEfficiency, 42);
    }

    let statusLevel: 'optimal' | 'good' | 'degraded' | 'expired' = 'optimal';
    if (currentAgeHours > 72 || isRiskDetected) {
      statusLevel = isRiskDetected ? 'degraded' : 'expired';
    } else if (calculatedEfficiency < 75 || currentAgeHours > 54) {
      statusLevel = 'degraded';
    } else if (currentAgeHours <= 24 && calculatedEfficiency >= 85) {
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

    let recommendation = 'Bieżące wkłucie założono ' + currentAgeHours + 'h temu. ';
    if (isRiskDetected) {
      recommendation = '🚨 Wykryto opór na podawaną insulinę korekcyjną po minięciu czasu szczytu działania. Zalecana kontrola miejsca wkłucia!';
    } else if (currentAgeHours <= 24) {
      recommendation += 'Doba 1 cyklu – tkanki w pełni chłonne i zregenerowane.';
    } else if (currentAgeHours <= 48) {
      recommendation += 'Doba 2 cyklu – stabilne wchłanianie. Pozostało ok. ' + hoursRemaining + 'h do zalecanej wymiany.';
    } else if (currentAgeHours <= 72) {
      recommendation += 'Doba 3 cyklu – naturalny spadek wchłaniania. Obserwuj reakcję na bolusy posiłkowe.';
    } else {
      recommendation += 'Wkłucie przekroczyło zalecane 72h (3 doby) – wymień wkłucie, aby zapobiec zrostom i skokom cukru.';
    }

    return {
      hasData: true,
      currentSite,
      daysBreakdown,
      recommendation,
      occlusionRisk: {
        isRiskDetected,
        status: occlusionStatus,
        recentFailedBolusCount,
        message: riskMessage
      }
    };
  }
}
