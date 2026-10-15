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
  isEstimated?: boolean;
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
  sampleCount: number;
  isEstimated: boolean;
}

export interface OcclusionRiskAlert {
  isRiskDetected: boolean;
  status: 'safe' | 'pending_peak' | 'occlusion_risk' | 'delayed_absorption';
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

interface BolusSample {
  timestamp: number;
  dayNumber: number;
  type: 'pure_correction' | 'combo_correction' | 'meal_response';
  dose: number;
  expectedDrop: number;
  actualDrop: number;
  efficiency: number;
  startG: number;
  evalG: number;
  durationMin: number;
}

export class InfusionAnalysisService {
  public static analyze(logs: LogEntry[], settings?: UserSettings): InfusionAnalysisResult {
    const now = Date.now();
    const isf = Math.max(10, settings?.isf || 40);
    const wwRatio = Math.max(0.2, settings?.wwRatio || 1.0);
    const targetMin = settings?.targetMin || 70;
    const targetMax = settings?.targetMax || 140;

    // 1. Moment założenia bieżącego wkłucia
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
    const currentDayNumber = Math.min(4, Math.max(1, Math.floor(currentAgeHours / 24) + 1));

    // 2. Filtrujemy dane dla bieżącego wkłucia
    const getInsulinVal = (l: any): number => Number(l.value || l.insulin || l.amount || (l.type === 'bolus' ? l.value : 0) || 0);
    const getGlucoseVal = (l: any): number => Number(l.value || l.sgv || l.glucose || 0);
    const getCarbsVal = (l: any): number => Number(l.carbs || l.linkedMeal?.carbs || (l.type === 'meal' ? l.value : 0) || 0);
    const hasCarbs = (l: any): boolean => getCarbsVal(l) > 0 || l.type === 'meal';

    const currentSiteLogs = logs.filter(l => Number(l.timestamp) >= latestSiteChange && Number(l.timestamp) <= now);
    const currentSiteBoluses = currentSiteLogs
      .filter(l => (l.type === 'bolus' || (l.type as any) === 'insulin') && getInsulinVal(l) > 0)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    const currentSiteGlucoses = currentSiteLogs
      .filter(l => (l.type === 'glucose' || (l.type as any) === 'cgm' || (l.type as any) === 'sgv') && getGlucoseVal(l) > 0)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    const currentSiteMeals = currentSiteLogs
      .filter(l => hasCarbs(l))
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    const allGlucosesVals = currentSiteGlucoses.map(getGlucoseVal);
    const avgSiteGlucose = allGlucosesVals.length > 0 
      ? Math.round(allGlucosesVals.reduce((a, b) => a + b, 0) / allGlucosesVals.length) 
      : null;

    const siteHighs = allGlucosesVals.filter(v => v > 180).length;
    const siteLows = allGlucosesVals.filter(v => v < 70).length;
    const highRatio = allGlucosesVals.length > 0 ? (siteHighs / allGlucosesVals.length) : 0;

    // 3. Zaawansowana ekstrakcja próbek wchłaniania insuliny
    // Uwzględniamy:
    // a) Czyste korekty z elastycznym oknem 75-180 min (lub do następnego posiłku)
    // b) Dawki łączone (posiłek + korekta), gdzie podano więcej insuliny niż wymagały węglowodany
    // c) Bolusy posiłkowe z prawidłowym spadkiem/powrotem poposiłkowym (potwierdzenie drożności)
    const validSamples: BolusSample[] = [];

    currentSiteBoluses.forEach(b => {
      const bTime = Number(b.timestamp);
      const bDose = getInsulinVal(b);
      if (bDose < 0.3) return; // Pomijamy mikro-bolusy < 0.3U

      const ageH = (bTime - latestSiteChange) / (1000 * 60 * 60);
      const day = Math.min(4, Math.max(1, Math.floor(ageH / 24) + 1));

      // Szukamy pomiaru glikemii w okolicy podania bolusa (-20 min do +10 min)
      const glucoseAtBolus = currentSiteGlucoses.find(g => Math.abs(Number(g.timestamp) - bTime) <= 20 * 60 * 1000);
      if (!glucoseAtBolus) return;

      const startG = getGlucoseVal(glucoseAtBolus);

      // Sprawdzamy węglowodany powiązane z tym bolusem
      let bCarbs = getCarbsVal(b);
      if (bCarbs === 0) {
        // Sprawdzamy czy w odstępie ±15 minut nie było wpisu posiłku
        const nearbyMeal = currentSiteMeals.find(m => Math.abs(Number(m.timestamp) - bTime) <= 15 * 60 * 1000);
        if (nearbyMeal) {
          bCarbs = getCarbsVal(nearbyMeal);
        }
      }

      // Następny posiłek po tym bolusie
      const nextMeal = currentSiteMeals.find(m => Number(m.timestamp) > bTime + 15 * 60 * 1000);
      const nextMealTime = nextMeal ? Number(nextMeal.timestamp) : Infinity;

      // SCENARIUSZ A: Czysty bolus korekcyjny (brak węglowodanów)
      if (bCarbs === 0) {
        // Jeśli kolejny posiłek był za szybko (< 70 min), nie ocenimy czystego spadku
        if (nextMealTime - bTime < 70 * 60 * 1000) return;

        // Idealny czas ewaluacji: 120-150 min lub tuż przed kolejnym posiłkiem
        const maxWindowMs = Math.min(180 * 60 * 1000, nextMealTime - bTime - 5 * 60 * 1000, now - bTime);
        if (maxWindowMs < 70 * 60 * 1000) return; // Jeszcze za wcześnie na ocenę

        // Szukamy odczytu glikemii w docelowym punkcie
        const targetTime = bTime + maxWindowMs;
        const evalGlucose = currentSiteGlucoses.find(g => Math.abs(Number(g.timestamp) - targetTime) <= 25 * 60 * 1000);
        if (!evalGlucose) return;

        const evalG = getGlucoseVal(evalGlucose);
        const durationMin = (Number(evalGlucose.timestamp) - bTime) / 60000;
        if (durationMin < 70) return;

        // Skalowanie oczekiwanego spadku wg krzywej działania insuliny (DIA)
        // 70-85 min: ~65% spadku, 85-110 min: ~80%, 110-140 min: ~90%, >=140 min: 100%
        let timeFraction = 1.0;
        if (durationMin < 85) timeFraction = 0.65;
        else if (durationMin < 110) timeFraction = 0.80;
        else if (durationMin < 140) timeFraction = 0.90;

        const expectedDrop = bDose * isf * timeFraction;
        const actualDrop = startG - evalG;

        if (expectedDrop > 10) {
          // Efektywność w granicach 20-100%
          const sampleEff = Math.min(100, Math.max(20, Math.round((actualDrop / expectedDrop) * 100)));
          validSamples.push({
            timestamp: bTime,
            dayNumber: day,
            type: 'pure_correction',
            dose: bDose,
            expectedDrop,
            actualDrop,
            efficiency: sampleEff,
            startG,
            evalG,
            durationMin
          });
        }
      }
      // SCENARIUSZ B: Bolus z posiłkiem zawierający naddatek korekcyjny
      else if (bCarbs > 0 && startG >= 140) {
        const mealInsulin = (bCarbs / 10) * wwRatio;
        const correctionExcess = bDose - mealInsulin;

        // Jeśli podano wyraźny naddatek na zbicie wysokiego cukru (np. >= 0.4j)
        if (correctionExcess >= 0.4) {
          if (nextMealTime - bTime < 90 * 60 * 1000) return;
          const maxWindowMs = Math.min(180 * 60 * 1000, nextMealTime - bTime - 5 * 60 * 1000, now - bTime);
          if (maxWindowMs < 90 * 60 * 1000) return;

          const targetTime = bTime + maxWindowMs;
          const evalGlucose = currentSiteGlucoses.find(g => Math.abs(Number(g.timestamp) - targetTime) <= 30 * 60 * 1000);
          if (!evalGlucose) return;

          const evalG = getGlucoseVal(evalGlucose);
          const durationMin = (Number(evalGlucose.timestamp) - bTime) / 60000;
          const actualDrop = startG - evalG;
          const expectedExcessDrop = correctionExcess * isf;

          // Jeśli cukier po posiłku spadł lub wrócił w okolice normy, kaniula zadziałała
          if (expectedExcessDrop > 10 && actualDrop > 0) {
            const sampleEff = Math.min(100, Math.max(25, Math.round((actualDrop / expectedExcessDrop) * 100)));
            validSamples.push({
              timestamp: bTime,
              dayNumber: day,
              type: 'combo_correction',
              dose: correctionExcess,
              expectedDrop: expectedExcessDrop,
              actualDrop,
              efficiency: sampleEff,
              startG,
              evalG,
              durationMin
            });
          }
        }
      }
    });

    // 4. Podział na doby wkłucia (Day Breakdown)
    const dayBuckets: {
      [day: number]: {
        samples: BolusSample[];
        glucoses: number[];
        highs: number[];
      }
    } = {
      1: { samples: [], glucoses: [], highs: [] },
      2: { samples: [], glucoses: [], highs: [] },
      3: { samples: [], glucoses: [], highs: [] },
      4: { samples: [], glucoses: [], highs: [] },
    };

    currentSiteGlucoses.forEach(g => {
      const gTime = Number(g.timestamp);
      const ageH = (gTime - latestSiteChange) / (1000 * 60 * 60);
      const day = Math.min(4, Math.max(1, Math.floor(ageH / 24) + 1));
      const val = getGlucoseVal(g);
      dayBuckets[day].glucoses.push(val);
      if (val > 180) dayBuckets[day].highs.push(val);
    });

    validSamples.forEach(s => {
      if (dayBuckets[s.dayNumber]) {
        dayBuckets[s.dayNumber].samples.push(s);
      }
    });

    const daysBreakdown: DayPerformance[] = [1, 2, 3, 4].map(day => {
      const b = dayBuckets[day];
      const samples = b.samples;
      const hasSamples = samples.length >= 1;

      let eff: number | null = null;
      let isEstimated = false;

      if (hasSamples) {
        // Średnia ważona z zarejestrowanych dawek
        const sumEff = samples.reduce((acc, s) => acc + s.efficiency, 0);
        eff = Math.round(sumEff / samples.length);
        isEstimated = false;
      } else {
        // Szacunek z profilu glikemii doby
        const dayGlucoses = b.glucoses;
        if (dayGlucoses.length >= 4) {
          const dayHighRatio = b.highs.length / dayGlucoses.length;
          const baselineEff = day === 1 ? 95 : day === 2 ? 88 : day === 3 ? 78 : 55;
          eff = Math.max(35, Math.round(baselineEff - (dayHighRatio * 25)));
          isEstimated = true;
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
        sampleCount: samples.length,
        avgGlucose: avgG,
        highCount: b.highs.length,
        isActive,
        isPast,
        statusText,
        isEstimated
      };
    });

    // 5. Analiza niedrożności / opóźnionego wchłaniania (Occlusion vs WBT vs Pending Peak)
    let isRiskDetected = false;
    let occlusionStatus: 'safe' | 'pending_peak' | 'occlusion_risk' | 'delayed_absorption' = 'safe';
    let recentFailedBolusCount = 0;
    let riskMessage = '';

    const fourHoursAgo = now - 4 * 60 * 60 * 1000;
    const recentBolusesInWindow = currentSiteBoluses
      .filter(b => Number(b.timestamp) >= fourHoursAgo)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    const recentCorrectionsInWindow = recentBolusesInWindow.filter(b => getCarbsVal(b) === 0);

    const recentGlucosesInWindow = currentSiteGlucoses
      .filter(g => Number(g.timestamp) >= fourHoursAgo - 15 * 60 * 1000)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    const latestGlucose = recentGlucosesInWindow.length > 0 
      ? getGlucoseVal(recentGlucosesInWindow[recentGlucosesInWindow.length - 1]) 
      : 0;

    // Sprawdzamy czy cukier obecnie wykazuje spadek (kaniula drożna)
    let isDroppingNow = false;
    if (recentGlucosesInWindow.length >= 3) {
      const gNow = latestGlucose;
      const g30m = getGlucoseVal(recentGlucosesInWindow[Math.max(0, recentGlucosesInWindow.length - 4)]);
      if (gNow <= g30m - 10) {
        isDroppingNow = true;
      }
    }

    // Sprawdzamy czy w oknie 4h był posiłek bogaty w tłuszcz/białko (WBT / Wymienniki Białkowo-Tłuszczowe)
    const recentMealsInWindow = currentSiteMeals.filter(m => Number(m.timestamp) >= fourHoursAgo);
    const hasHeavyMealRecent = recentMealsInWindow.some(m => {
      const fat = Number(m.fat || m.linkedMeal?.fat || 0);
      const protein = Number(m.protein || m.linkedMeal?.protein || 0);
      const desc = `${m.notes || ''} ${m.description || ''} ${m.linkedMeal?.name || ''}`.toLowerCase();
      return fat >= 10 || protein >= 20 || /pizza|burger|frytki|tłuszcz|wbt|mięso|ser/i.test(desc);
    });

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

      // Faza wniknięcia insuliny (< 60 min)
      if (timeSinceLatestMin < 60) {
        occlusionStatus = 'pending_peak';
        const latestVal = getInsulinVal(latestBolus);
        riskMessage = `Zarejestrowano dawkę ${formatUnits(latestVal)}j (${Math.round(timeSinceLatestMin)} min temu). Insulina jest w fazie rozwijania działania (szczyt po ok. 60-90 min).`;
      }
      // Faza po szczycie działania (> 75 min od ostatniej dawki, > 110 min od pierwszej)
      else if ((recentCorrectionsInWindow.length >= 2 || totalCorrectionUnits >= 2.0) && timeSinceLatestMin >= 75 && timeSinceFirstMin >= 110) {
        if (!isDroppingNow && latestGlucose >= 180) {
          const firstBolusGEntry = recentGlucosesInWindow.find(g => Math.abs(Number(g.timestamp) - Number(firstBolus.timestamp)) < 25 * 60 * 1000);
          const startG = firstBolusGEntry ? getGlucoseVal(firstBolusGEntry) : latestGlucose;

          if (latestGlucose >= startG - 12) {
            // Jeśli niedawno był posiłek WBT, to prawdopodobnie opóźnione wchłanianie z żołądka, a nie zagięte wkłucie!
            if (hasHeavyMealRecent) {
              occlusionStatus = 'delayed_absorption';
              riskMessage = `Glikemia ${latestGlucose} mg/dL utrzymuje się mimo dawek korekcyjnych (${formatUnits(totalCorrectionUnits)}j), prawdopodobnie z uwagi na przedłużone wchłanianie posiłku bogatego w tłuszcze/białka (efekt WBT).`;
            } else {
              isRiskDetected = true;
              occlusionStatus = 'occlusion_risk';
              recentFailedBolusCount = recentCorrectionsInWindow.length;
              riskMessage = `Zarejestrowano łącznie ${formatUnits(totalCorrectionUnits)}j w ${recentCorrectionsInWindow.length} dawkach, od ostatniej minęło ${Math.round(timeSinceLatestMin)} min, a glikemia nie spada (${startG} ➔ ${latestGlucose} mg/dL). Sprawdź stan osprzętu lub kaniuli.`;
            }
          }
        }
      }
    }

    // 6. Stabilne szacowanie ogólnej sprawności wkłucia (bez gwałtownych skoków 42% -> 100%)
    let calculatedEfficiency = 92;
    const activeDayIdx = Math.min(3, Math.max(0, currentDayNumber - 1));
    const activeDay = daysBreakdown[activeDayIdx];

    if (activeDay?.efficiencyPercent !== null && activeDay?.efficiencyPercent !== undefined) {
      calculatedEfficiency = activeDay.efficiencyPercent;
    } else {
      if (currentAgeHours <= 24) calculatedEfficiency = 95;
      else if (currentAgeHours <= 48) calculatedEfficiency = 88;
      else if (currentAgeHours <= 72) calculatedEfficiency = 76;
      else calculatedEfficiency = 50;

      if (highRatio > 0.4) {
        calculatedEfficiency = Math.max(40, calculatedEfficiency - 12);
      }
    }

    // Płynne dostosowanie przy wykryciu trudności z wchłanianiem:
    if (isRiskDetected) {
      // Przy ryzyku niedrożności sprawność spada do przedziału 45-52%, bez zerowania
      calculatedEfficiency = Math.min(calculatedEfficiency, 48);
    } else if (occlusionStatus === 'delayed_absorption') {
      // Przy posiłku WBT lekkie obniżenie wskaźnika sprawności (72-78%)
      calculatedEfficiency = Math.min(calculatedEfficiency, 75);
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

    const totalSamplesCount = validSamples.length;
    const isEstimated = totalSamplesCount === 0;

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
      lowCount: siteLows,
      sampleCount: totalSamplesCount,
      isEstimated
    };

    let recommendation = 'Bieżące wkłucie założono ' + currentAgeHours + 'h temu. ';
    if (isRiskDetected) {
      recommendation = '⚠️ Zauważono opóźnioną reakcję glikemii na zarejestrowaną dawkę insuliny. Sprawdź stan osprzętu lub kaniuli.';
    } else if (occlusionStatus === 'delayed_absorption') {
      recommendation += 'Utrzymujące się wartości mogą wynikać z powolnego trawienia posiłku (WBT). Monitoruj odczyty.';
    } else if (currentAgeHours <= 24) {
      recommendation += 'Doba 1 cyklu – tkanki w pełni chłonne i zregenerowane.';
    } else if (currentAgeHours <= 48) {
      recommendation += 'Doba 2 cyklu – stabilne wchłanianie. Pozostało ok. ' + hoursRemaining + 'h do zalecanego okresu użytkowania.';
    } else if (currentAgeHours <= 72) {
      recommendation += 'Doba 3 cyklu – naturalny spadek wchłaniania kaniuli. Zwróć uwagę na reakcję po posiłkach.';
    } else {
      recommendation += 'Wkłucie przekroczyło standardowe 72h (3 doby) – zaplanuj odświeżenie miejsca, aby zachować równomierne wchłanianie.';
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
