import * as tf from '@tensorflow/tfjs';
import i18n from "../i18n";

export interface GlikoWorkerInput {
    logs: any[];
    force: boolean;
    mode: 'quick' | 'full';
    rules: any;
    datasetSizeFromStorage: number;
    lastTrainTime: number;
}

function calculateActiveAtTime(targetTime: number, pastLogs: any[], rules: any) {
    let iob = 0, cob = 0, fastCobActive = 0, slowCobActive = 0, pob = 0, fob = 0;
    const pizzaMult = rules.pizzaEffectMultiplier || 1.0;
    const pkFast = rules.pkParams?.fastCarbDuration || 1.5;
    const pkNormal = rules.pkParams?.normalCarbDuration || 3.0;
    const pkSlow = rules.pkParams?.slowCarbDuration || 5.0;
    const pkInsulin = rules.pkParams?.insulinTau || 1.25;

    const cutoffTime = targetTime - (8 * 60 * 60 * 1000);
    
    const classifyMealGlycemia = (meal: any) => {
        const text = ((meal.description || meal.notes || meal.note || meal.nameValue || "") + " " + (meal.linkedMeal?.name || "")).toLowerCase();
        let isFastCarb = 0, isSlowCarb = 0;
        const fastKeywords = ["sok", "cukier", "glukoza", "glucose", i18n.t('auto.zel', { defaultValue: i18n.t('auto.zel', { defaultValue: "żel" }) }), "dextro", i18n.t('auto.miod', { defaultValue: i18n.t('auto.miod', { defaultValue: "miód" }) }), "honey", "cola", i18n.t('auto.slodkie', { defaultValue: i18n.t('auto.slodkie', { defaultValue: "słodkie" }) }), i18n.t('auto.slodki', { defaultValue: i18n.t('auto.slodki', { defaultValue: "słodki" }) }), i18n.t('auto.zelki', { defaultValue: i18n.t('auto.zelki', { defaultValue: "żelki" }) }), "banan", i18n.t('auto.dzem', { defaultValue: i18n.t('auto.dzem', { defaultValue: "dżem" }) }), "sprite", "fanta", i18n.t('auto.oranzada', { defaultValue: i18n.t('auto.oranzada', { defaultValue: "oranżada" }) }), "herbata z cukrem", "cukierki", "czekolada", "owoce", "juice"];
        const slowKeywords = ["pizza", "kebab", "burger", "ser", "cheese", "orzechy", i18n.t('auto.mieso', { defaultValue: i18n.t('auto.mieso', { defaultValue: "mięso" }) }), "meat", "pasta", "spaghetti", "makaron", "boczek", "frytki", i18n.t('auto.maslo', { defaultValue: i18n.t('auto.maslo', { defaultValue: "masło" }) }), i18n.t('auto.tluszcz', { defaultValue: i18n.t('auto.tluszcz', { defaultValue: "tłuszcz" }) }), i18n.t('auto.bialko', { defaultValue: i18n.t('auto.bialko', { defaultValue: "białko" }) }), i18n.t('auto.karkowka', { defaultValue: i18n.t('auto.karkowka', { defaultValue: "karkówka" }) }), i18n.t('auto.kielbasa', { defaultValue: i18n.t('auto.kielbasa', { defaultValue: "kiełbasa" }) }), "nuts", "chocolate"];
        if (fastKeywords.some(kw => text.includes(kw))) isFastCarb = 1;
        if (slowKeywords.some(kw => text.includes(kw))) isSlowCarb = 1;
        const protein = meal.protein || meal.linkedMeal?.protein || 0;
        const fat = meal.fat || meal.linkedMeal?.fat || 0;
        const carbs = meal.value || meal.carbs || meal.linkedMeal?.carbs || 0;
        if (protein > 15 || fat > 12) isSlowCarb = 1;
        if (carbs > 0 && (fat + protein) / carbs > 0.8) isSlowCarb = 1;
        if (carbs > 15 && (fat + protein) < 3) isFastCarb = 1;
        return { isFastCarb, isSlowCarb };
    };

    for (let i = pastLogs.length - 1; i >= 0; i--) {
        const log = pastLogs[i];
        const logTime = log.timestamp || new Date(log.createdAt).getTime();
        
        if (logTime < cutoffTime) break;
        const diffMs = targetTime - logTime;
        if (diffMs < 0) continue; 
        
        const diffHours = diffMs / (1000 * 60 * 60);
        
        const insulin = log.type === 'bolus' ? log.value : (log.insulin || 0);
        if (insulin && diffHours < 5.0) { 
            const tau = pkInsulin;
            const remaining = (1 + diffHours / tau) * Math.exp(-diffHours / tau);
            const adjustedRemaining = Math.max(0, remaining - 0.05);
            iob += insulin * adjustedRemaining;
        }
        
        const carbs = log.type === 'meal' ? log.value : (log.linkedMeal?.carbs || log.carbs || 0);
        if (carbs) {
            const { isFastCarb, isSlowCarb } = classifyMealGlycemia(log);
            let carbDuration = pkNormal * pizzaMult;
            if (isFastCarb) carbDuration = pkFast;
            else if (isSlowCarb) carbDuration = pkSlow * pizzaMult;
            
            if (diffHours < carbDuration) {
                const remaining = Math.max(0, (1 - (diffHours / carbDuration)));
                cob += carbs * remaining;
                if (isFastCarb) fastCobActive += carbs * remaining;
                else if (isSlowCarb) slowCobActive += carbs * remaining;
            }
        }

        const protein = log.type === 'meal' ? (log.protein || 0) : (log.linkedMeal?.protein || 0);
        const protDuration = pkSlow * pizzaMult;
        if (protein && diffHours < protDuration) pob += protein * Math.max(0, (1 - (diffHours / protDuration)));

        const fat = log.type === 'meal' ? (log.fat || 0) : (log.linkedMeal?.fat || 0);
        const fatDuration = (pkSlow + 2) * pizzaMult;
        if (fat && diffHours < fatDuration) fob += fat * Math.max(0, (1 - (diffHours / fatDuration)));
    }
    
    return { 
        iob: Math.max(0, iob), cob: Math.max(0, cob), fastCobActive: Math.max(0, fastCobActive),
        slowCobActive: Math.max(0, slowCobActive), pob: Math.max(0, pob), fob: Math.max(0, fob)
    };
}

const physiologicalNormalize = (inputs: number[]): number[] => {
  const [
    bg = 120, trend = 0, acc = 0, cob = 0, fastCobActive = 0, slowCobActive = 0, iob = 0,
    timeSin = 0, timeCos = 0, pob = 0, fob = 0, isWeekend = 0, sinceMeal = 1440, sinceBolus = 1440, iobCobRatio = 0
  ] = inputs;

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  return [
    (clamp(bg, 40, 450) - 40) / 410,
    (clamp(trend, -15, 15) + 15) / 30,
    (clamp(acc, -5, 5) + 5) / 10,
    clamp(cob, 0, 150) / 150,
    clamp(fastCobActive, 0, 150) / 150,
    clamp(slowCobActive, 0, 150) / 150,
    clamp(iob, 0, 30) / 30,
    (clamp(timeSin, -1, 1) + 1) / 2,
    (clamp(timeCos, -1, 1) + 1) / 2,
    clamp(pob, 0, 100) / 100,
    clamp(fob, 0, 100) / 100,
    clamp(isWeekend, 0, 1),
    clamp(sinceMeal, 0, 1440) / 1440,
    clamp(sinceBolus, 0, 1440) / 1440,
    clamp(iobCobRatio, 0, 10) / 10
  ];
};

const generateSyntheticPhysiologyLSTM = () => {
  const synthetic: any[] = [];
  for (let s = 0; s < 150; s++) {
    const sequence = [];
    const bgStart = 80 + Math.random() * 220;
    const iobStart = Math.random() * 8;
    const cobStart = Math.random() * 60;
    let currentBg = bgStart;

    for(let t = 5; t >= 0; t--) {
        const bg = currentBg - (t * 5); 
        const iob = Math.max(0, iobStart - (t * 0.1));
        const cob = Math.max(0, cobStart - (t * 1.0));
        const fastCob = Math.random() > 0.5 ? cob * 0.8 : 0;
        const slowCob = cob - fastCob;
        const sinceMeal = cob > 0 ? 30 + Math.random() * 180 : 1440;
        const sinceBolus = iob > 0 ? 30 + Math.random() * 240 : 1440;
        const trend = (cob * 0.5) - (iob * 15.0); 
        const acc = 0;
        const pob = Math.random() * 30;
        const fob = Math.random() * 30;
        const ratio = (iob + 0.1) / (cob + 0.1);

        const inputs = [bg, trend, acc, cob, fastCob, slowCob, iob, 0, 0, pob, fob, 0, sinceMeal, sinceBolus, ratio];
        sequence.push(physiologicalNormalize(inputs));
    }

    const output = [
      (currentBg + (cobStart * 0.15) - (iobStart * 4.0)) / 400, 
      (currentBg + (cobStart * 0.3) - (iobStart * 8.0)) / 400,  
      (currentBg + (cobStart * 0.45) - (iobStart * 12.0)) / 400, 
      (currentBg + (cobStart * 0.55) - (iobStart * 15.0)) / 400, 
      (currentBg + (cobStart * 0.70) - (iobStart * 20.0)) / 400, 
      (currentBg + (cobStart * 0.60) - (iobStart * 25.0)) / 400, 
      (currentBg + (cobStart * 0.45) - (iobStart * 27.0)) / 400,  
      (currentBg + (cobStart * 0.30) - (iobStart * 28.0)) / 400  
    ];
    synthetic.push({ inputs: sequence, output });
  }
  return synthetic;
};

let _cachedModel: tf.LayersModel | null = null;
let isModelLoaded = false;

self.onmessage = async (e: MessageEvent<GlikoWorkerInput>) => {
  const { logs, force, mode, rules, datasetSizeFromStorage, lastTrainTime } = e.data;

  try {
    if (!logs || logs.length < 3) {
      self.postMessage({ type: 'result', payload: { predictedNextHour: 0, predictedNext2Hours: 0, riskOfHypo: false, insights: [i18n.t('auto.zbyt_malo_danych_dla_glikosens', { defaultValue: i18n.t('auto.zbyt_malo_danych_dla_glik', { defaultValue: "Zbyt mało danych dla GlikoSense." }) })], accuracy: 0, analyzedPeriod: mode === 'quick' ? 'Ostatnie 4h' : 'Ostatnie 14 dni' } });
      return;
    }

    await tf.ready();
    if (tf.getBackend() === null) {
        await tf.setBackend('cpu');
    }

    const now = Date.now();
    const lookbackMs = mode === 'quick' ? (24 * 60 * 60 * 1000) : (14 * 24 * 60 * 60 * 1000);
    const cutoffTime = now - lookbackMs;
    
    let logsToAnalyze = logs.filter(l => (l.timestamp || new Date(l.createdAt).getTime()) >= cutoffTime);
    if (logsToAnalyze.filter(l => l.type === 'glucose').length < 5) {
      logsToAnalyze = logs.filter(l => l.type === 'glucose').slice(-20);
    }
    if (mode === 'full' && logsToAnalyze.length > 1500) logsToAnalyze = logsToAnalyze.slice(0, 1500);
    if (logsToAnalyze.length < 5) logsToAnalyze = logs.slice(0, 20);

    const sorted = [...logsToAnalyze].sort((a,b) => (a.timestamp || new Date(a.createdAt).getTime()) - (b.timestamp || new Date(b.createdAt).getTime()));
    const glucoseLogsOrig = sorted.filter(l => l.type === 'glucose' || l.bg);
    
    // HEURISTIC INSIGHTS
    const insights: string[] = [];
    const mealPatterns: { [key: string]: { spikes: number, count: number } } = {};
    const timeBlocks = {
      morning: { label: 'Poranek', starts: 6, ends: 11, sensitivity: 0, count: 0, drops: [] as number[] },
      afternoon: { label: i18n.t('auto.popoludnie', { defaultValue: i18n.t('auto.popoludnie', { defaultValue: "Popołudnie" }) }), starts: 11, ends: 17, sensitivity: 0, count: 0, drops: [] as number[] },
      evening: { label: i18n.t('auto.wieczor', { defaultValue: i18n.t('auto.wieczor', { defaultValue: "Wieczór" }) }), starts: 17, ends: 23, sensitivity: 0, count: 0, drops: [] as number[] },
      night: { label: 'Noc', starts: 23, ends: 6, sensitivity: 0, count: 0, drops: [] as number[] }
    };

    const allMeals = logs.filter(l => l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal?.carbs));
    const allBoluses = logs.filter(l => l.type === 'bolus' || l.type === 'insulin');
    const allGlucose = logs.filter(l => l.type === 'glucose' || l.bg).sort((a,b) => (a.timestamp || new Date(a.createdAt).getTime()) - (b.timestamp || new Date(b.createdAt).getTime()));
    
    allBoluses.forEach(b => {
      const bTime = b.timestamp || new Date(b.createdAt).getTime();
      const bHour = new Date(bTime).getHours();
      const bVal = b.value || b.insulin || 0;
      if (bVal <= 0) return;
      const targetSugar = allGlucose.find(g => {
        const gt = g.timestamp || new Date(g.createdAt).getTime();
        return gt > bTime + 110*60*1000 && gt < bTime + 190*60*1000;
      });
      const startSugar = allGlucose.find(g => {
        const gt = g.timestamp || new Date(g.createdAt).getTime();
        return gt > bTime - 15*60*1000 && gt < bTime + 15*60*1000;
      });
      if (targetSugar && startSugar) {
        const drop = (startSugar.value || startSugar.bg) - (targetSugar.value || targetSugar.bg);
        const block = Object.values(timeBlocks).find(tb => tb.starts <= tb.ends ? (bHour >= tb.starts && bHour < tb.ends) : (bHour >= tb.starts || bHour < tb.ends));
        if (block) block.drops.push(drop / bVal);
      }
    });

    Object.values(timeBlocks).forEach(tb => {
      if (tb.drops.length > 0) {
        tb.sensitivity = tb.drops.reduce((a, b) => a + b, 0) / tb.drops.length;
        tb.count = tb.drops.length;
      }
    });

    if (Object.values(timeBlocks).some(tb => tb.count > 0)) {
        const mostSensitive = Object.values(timeBlocks).reduce((prev, current) => (prev.sensitivity > current.sensitivity) ? prev : current);
        const leastSensitive = Object.values(timeBlocks).reduce((prev, current) => (prev.sensitivity < current.sensitivity && current.count > 0) ? prev : current);

        if (mostSensitive.count > 1 && leastSensitive.count > 1 && mostSensitive !== leastSensitive) {
          const ratio = mostSensitive.sensitivity / (leastSensitive.sensitivity || 1);
          if (ratio > 1.4) {
            insights.push(`🕰️ Pora dnia ma znaczenie. Na podstawie ostatnich dni widzę, że w fazie "${mostSensitive.label}" Twoja wrażliwość na insulinę jest o ${Math.round((ratio-1)*100)}% wyższa niż w fazie "${leastSensitive.label}". Pamiętaj o tym dobierając dawki!`);
          }
        }
    }

    allMeals.slice(0, 100).forEach(m => {
      const mealTime = m.timestamp || new Date(m.createdAt).getTime();
      const mealName = m.note || m.name || m.description || i18n.t('auto.posilek', { defaultValue: i18n.t('auto.posilek', { defaultValue: "Posiłek" }) });
      if (!mealName || mealName.length < 3 || mealName === i18n.t('auto.posilek', { defaultValue: i18n.t('auto.posilek', { defaultValue: "Posiłek" }) })) return;
      const postMealBg = allGlucose.filter(g => {
        const gt = g.timestamp || new Date(g.createdAt).getTime();
        return gt > mealTime + 45*60*1000 && gt < mealTime + 180*60*1000;
      });
      if (postMealBg.length > 0) {
        const maxBg = Math.max(...postMealBg.map(g => g.value || g.bg));
        if (!mealPatterns[mealName]) mealPatterns[mealName] = { spikes: 0, count: 0 };
        mealPatterns[mealName].count++;
        if (maxBg > 180) mealPatterns[mealName].spikes++;
      }
    });

    const problematicMeals = Object.entries(mealPatterns).filter(([_, stats]) => stats.spikes > 0 && (stats.spikes / stats.count) >= 0.5).map(([name]) => name);
    if (problematicMeals.length > 0) insights.push(`🧠 Z moich obserwacji z 14 dni: pozycje takie jak: ${problematicMeals.slice(0, 2).join(", ")} powtarzały się z wyższymi poziomami cukru potem. Możesz tu rozważyć wcześniejszy bolus.`);

    if (mode === 'full') {
      const daysStats: { [day: string]: { sum: number, count: number } } = { "Niedziela": { sum: 0, count: 0 }, "Poniedziałek": { sum: 0, count: 0 }, "Wtorek": { sum: 0, count: 0 }, "Środa": { sum: 0, count: 0 }, "Czwartek": { sum: 0, count: 0 }, "Piątek": { sum: 0, count: 0 }, "Sobota": { sum: 0, count: 0 } };
      const dayNames = ["Niedziela", i18n.t('auto.poniedzialek', { defaultValue: i18n.t('auto.poniedzialek', { defaultValue: "Poniedziałek" }) }), "Wtorek", i18n.t('auto.sroda', { defaultValue: i18n.t('auto.sroda', { defaultValue: "Środa" }) }), "Czwartek", i18n.t('auto.piatek', { defaultValue: i18n.t('auto.piatek', { defaultValue: "Piątek" }) }), "Sobota"];
      allGlucose.forEach(g => {
        const d = new Date(g.timestamp || new Date(g.createdAt).getTime());
        const dayName = dayNames[d.getDay()];
        daysStats[dayName].sum += (g.value || g.bg);
        daysStats[dayName].count++;
      });
      const activeDays = Object.entries(daysStats).filter(([_, s]) => s.count > 10);
      if (activeDays.length >= 3) {
         activeDays.sort((a,b) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count));
         const worstDay = activeDays[0];
         const bestDay = activeDays[activeDays.length - 1];
         if ((worstDay[1].sum / worstDay[1].count) - (bestDay[1].sum / bestDay[1].count) > 25) {
             insights.push(`📅 Analiza 14-dniowa ujawnia: Twój cukier jest stale niższy w te dni tygodnia: ${bestDay[0]} (prawdopodobnie większa wrażliwość, może regularny trening?). Z kolei ${worstDay[0]} często bywa trudny i wymaga więcej insuliny lub ostrożności.`);
         }
      }
    }

    if (glucoseLogsOrig.length < 5) {
      self.postMessage({ type: 'result', payload: { predictedNextHour: 0, predictedNext2Hours: 0, riskOfHypo: false, insights: [...insights, i18n.t('auto.czekam_na_wiecej_odczytow_glik', { defaultValue: i18n.t('auto.czekam_na_wiecej_odczytow', { defaultValue: "Czekam na więcej odczytów glikemii..." }) })], accuracy: 0, analyzedPeriod: mode === 'quick' ? 'Ostatnie 4h' : 'Ostatnie 14 dni' } });
      return;
    }
    
    const resampledGlucose: { timestamp: number, value: number, trend: number }[] = [];
    let startTime = glucoseLogsOrig[0].timestamp || new Date(glucoseLogsOrig[0].createdAt).getTime();
    if (startTime < cutoffTime) startTime = cutoffTime;
    const endTime = glucoseLogsOrig[glucoseLogsOrig.length - 1].timestamp || new Date(glucoseLogsOrig[glucoseLogsOrig.length - 1].createdAt).getTime();
    const stepMs = 5 * 60 * 1000;

    let origIdx = 0;
    for (let t = startTime; t <= endTime; t += stepMs) {
      while (origIdx < glucoseLogsOrig.length - 1 && (glucoseLogsOrig[origIdx + 1].timestamp || new Date(glucoseLogsOrig[origIdx + 1].createdAt).getTime()) <= t) origIdx++;
      const before = glucoseLogsOrig[origIdx];
      const beforeTime = before.timestamp || new Date(before.createdAt).getTime();
      if (t < beforeTime) { t = beforeTime - stepMs; continue; }
      const after = (origIdx < glucoseLogsOrig.length - 1) ? glucoseLogsOrig[origIdx + 1] : null;

      if (before && after) {
        const t1 = beforeTime, t2 = after.timestamp || new Date(after.createdAt).getTime();
        const v1 = before.value || before.bg, v2 = after.value || after.bg;
        resampledGlucose.push({ timestamp: t, value: v1 + (v2 - v1) * ((t - t1) / (t2 - t1)), trend: 0 });
      } else if (before) {
        resampledGlucose.push({ timestamp: t, value: before.value || before.bg, trend: 0 });
      }
      if (resampledGlucose.length > 2016) break;
    }
    
    if (resampledGlucose.length === 0) {
      self.postMessage({ type: 'result', payload: { predictedNextHour: 0, predictedNext2Hours: 0, riskOfHypo: false, insights: [i18n.t('auto.zbyt_malo_poprawnych_danych_gl', { defaultValue: i18n.t('auto.zbyt_malo_poprawnych_dany', { defaultValue: "Zbyt mało poprawnych danych glikemii po przetworzeniu." }) })], accuracy: 0 } });
      return;
    }

    let smoothedValue = resampledGlucose[0].value;
    const alpha = 0.4;
    resampledGlucose.forEach((p, idx) => {
      smoothedValue = (p.value * alpha) + (smoothedValue * (1 - alpha));
      p.value = smoothedValue;
      if (idx > 0) p.trend = p.value - resampledGlucose[idx-1].value;
    });
    
    const dataset = [];
    const treatmentLogs = sorted.filter(l => l.type === 'meal' || l.type === 'bolus' || l.type === 'insulin');
    
    // --- DEEP PHARMACOKINETIC ENCODER (SELF-LEARNING) ---
    if (mode === 'full' && resampledGlucose.length > 50 && treatmentLogs.length > 0) {
        const pkCandidates = [
            { label: "Bardzo szybki", fastCarbDuration: 1.0, normalCarbDuration: 2.0, slowCarbDuration: 4.0, insulinTau: 1.0 },
            { label: "Szybki", fastCarbDuration: 1.2, normalCarbDuration: 2.5, slowCarbDuration: 4.5, insulinTau: 1.15 },
            { label: "Standardowy", fastCarbDuration: 1.5, normalCarbDuration: 3.0, slowCarbDuration: 5.0, insulinTau: 1.25 },
            { label: "Wolny", fastCarbDuration: 1.8, normalCarbDuration: 3.5, slowCarbDuration: 6.0, insulinTau: 1.35 },
            { label: "Bardzo wolny", fastCarbDuration: 2.0, normalCarbDuration: 4.0, slowCarbDuration: 7.0, insulinTau: 1.5 },
        ];
        let bestParams = rules.pkParams || pkCandidates[2];
        let bestScore = Infinity;
        const evalPoints = resampledGlucose.slice(-400); // Ostatnie kilkanaście/dziesiąt godzin do ewaluacji

        for (const cand of pkCandidates) {
            let errorSum = 0;
            const testRules = { ...rules, pkParams: cand };
            let treatIdx = 0;
            for (let i = 5; i < evalPoints.length; i++) {
                const cur = evalPoints[i];
                while (treatIdx < treatmentLogs.length && (treatmentLogs[treatIdx].timestamp || new Date(treatmentLogs[treatIdx].createdAt).getTime()) <= cur.timestamp) treatIdx++;
                const relLogs = treatmentLogs.slice(0, treatIdx);
                const { iob, cob } = calculateActiveAtTime(cur.timestamp, relLogs, testRules);
                const expectedTrend = (cob * 0.4) - (iob * 15.0); // Uproszczona fizjologia (Heurystyka)
                errorSum += Math.abs(expectedTrend - cur.trend);
            }
            if (errorSum < bestScore) {
                bestScore = errorSum;
                bestParams = cand;
            }
        }
        rules.pkParams = bestParams; // Użyj wyuczonych wag do generowania wejść dla LSTM
        if (rules.pkParams.label !== "Standardowy") {
             insights.push(`🧬 GlikoSense wykrył, że Twój metabolizm węglowodanów i insuliny wpisuje się w profil: "${rules.pkParams.label}". Zaktualizowałem model krzywych trawienia!`);
        }
    }
    
    let treatmentIdx = 0;

    for(let i=5; i < resampledGlucose.length - 36; i++) {
      const sequence = [];
      for(let step = 5; step >= 0; step--) {
          const current = resampledGlucose[i - step];
          const currentTimeMs = current.timestamp;

          while (treatmentIdx < treatmentLogs.length && (treatmentLogs[treatmentIdx].timestamp || new Date(treatmentLogs[treatmentIdx].createdAt).getTime()) <= currentTimeMs) treatmentIdx++;
          const relevantLogs = treatmentLogs.slice(0, treatmentIdx);
          
          let trendNum = current.trend;
          let prevTrendNum = (i-step) > 0 ? resampledGlucose[i-step-1].trend : 0;
          let accelerationNum = trendNum - prevTrendNum;

          const { iob, cob, fastCobActive, slowCobActive, pob, fob } = calculateActiveAtTime(currentTimeMs, relevantLogs, rules);

          let timeSinceMeal = 1440;
          let timeSinceBolus = 1440;
          for (let j = relevantLogs.length - 1; j >= 0; j--) {
               const t = relevantLogs[j].timestamp || new Date(relevantLogs[j].createdAt).getTime();
               const minutes = (currentTimeMs - t) / 60000;
               if (relevantLogs[j].type === 'meal' && minutes < timeSinceMeal && timeSinceMeal === 1440) timeSinceMeal = minutes;
               if ((relevantLogs[j].type === 'bolus' || relevantLogs[j].type === 'insulin') && minutes < timeSinceBolus && timeSinceBolus === 1440) timeSinceBolus = minutes;
               if (minutes > 480) break;
          }

          const date = new Date(currentTimeMs);
          const hourDecimal = date.getHours() + (date.getMinutes() / 60);
          const timeSin = Math.sin((hourDecimal / 24) * Math.PI * 2);
          const timeCos = Math.cos((hourDecimal / 24) * Math.PI * 2);
          const isWeekend = (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0;
          const iobCobRatio = (iob + 0.1) / (cob + 0.1);

          sequence.push(physiologicalNormalize([
            current.value, trendNum, accelerationNum, cob, fastCobActive, slowCobActive, iob, 
            timeSin, timeCos, pob, fob, isWeekend, timeSinceMeal, timeSinceBolus, iobCobRatio
          ]));
      }

      dataset.push({
          inputs: sequence, 
          output: [
              resampledGlucose[i + 3].value / 400, resampledGlucose[i + 6].value / 400, resampledGlucose[i + 9].value / 400,
              resampledGlucose[i + 12].value / 400, resampledGlucose[i + 18].value / 400, resampledGlucose[i + 24].value / 400,
              resampledGlucose[i + 30].value / 400, resampledGlucose[i + 36].value / 400
          ]
      });
    }

    let model: tf.LayersModel;
    try {
        if (_cachedModel) {
            model = _cachedModel;
            isModelLoaded = true;
        } else {
            model = await Promise.race([
                tf.loadLayersModel('indexeddb://glikosense-lstm-v4'),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout loading model")), 1500))
            ]) as tf.LayersModel;
            _cachedModel = model;
            isModelLoaded = true;
        }
        model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
    } catch(e) {
        model = tf.sequential();
        (model as tf.Sequential).add(tf.layers.lstm({ units: 32, inputShape: [6, 15], returnSequences: false }));
        (model as tf.Sequential).add(tf.layers.dense({ units: 24, activation: 'relu' })); 
        (model as tf.Sequential).add(tf.layers.dense({ units: 8, activation: 'linear' }));
        model.compile({ optimizer: tf.train.adam(0.005), loss: 'meanSquaredError' });
        _cachedModel = model;

        try {
            const syntheticData = generateSyntheticPhysiologyLSTM();
            const synInputsTensor = tf.tensor3d(syntheticData.map(d => d.inputs), [syntheticData.length, 6, 15]);
            const synOutputsTensor = tf.tensor2d(syntheticData.map(d => d.output));
            await model.fit(synInputsTensor, synOutputsTensor, { epochs: 10, shuffle: true, verbose: 0 });
            synInputsTensor.dispose();
            synOutputsTensor.dispose();
        } catch (synErr) {}
    }

    const trainingDataset = dataset.slice(-250);
    let shouldTrain = force || !isModelLoaded || (mode === 'full' && (Date.now() - lastTrainTime > 2 * 60 * 60 * 1000));

    if (shouldTrain && trainingDataset.length > 0) {
        const inputsTensor = tf.tensor3d(trainingDataset.map(d => d.inputs), [trainingDataset.length, 6, 15]);
        const outputTensor = tf.tensor2d(trainingDataset.map(d => d.output));
        await model.fit(inputsTensor, outputTensor, { epochs: mode === 'quick' ? (isModelLoaded ? 2 : 5) : (isModelLoaded ? 5 : 15), shuffle: true, verbose: 0 });
        inputsTensor.dispose(); outputTensor.dispose();
        self.postMessage({ type: 'storage_update', payload: { key: 'glikosense_last_train_time', value: Date.now().toString() } });
        if (mode === 'full') { try { await model.save('indexeddb://glikosense-lstm-v4'); } catch(err) {} }
    }

    let avgErrorInMgDl = 50;
    tf.tidy(() => {
      if (trainingDataset.length === 0) return;
      const evalInputs = tf.tensor3d(trainingDataset.map(d => d.inputs), [trainingDataset.length, 6, 15]);
      const preds = model.predict(evalInputs) as tf.Tensor;
      const predsArray = preds.dataSync();
      let errorSum = 0;
      for(let j = 0; j < trainingDataset.length; j++) errorSum += Math.abs(predsArray[j * 8 + 3] - trainingDataset[j].output[3]); 
      avgErrorInMgDl = (errorSum / (trainingDataset.length || 1)) * 400;
    });

    const predictValue = (mdl: tf.LayersModel, sequence: number[][]) => {
        return tf.tidy(() => {
            const pred = mdl.predict(tf.tensor3d([sequence], [1, 6, 15])) as tf.Tensor;
            return (pred.arraySync() as number[][])[0];
        });
    };

    const latest = glucoseLogsOrig[glucoseLogsOrig.length-1];
    const latestBg = latest.value || latest.bg;
    const latestTimeMs = latest.timestamp || new Date(latest.createdAt).getTime();

    let lastTrendNum = 0;
    let prevLastTrendNum = 0;
    if(glucoseLogsOrig.length > 1) {
        const l1 = glucoseLogsOrig[glucoseLogsOrig.length-1], l2 = glucoseLogsOrig[glucoseLogsOrig.length-2];
        const tDiffMs = (l1.timestamp || new Date(l1.createdAt).getTime()) - (l2.timestamp || new Date(l2.createdAt).getTime());
        lastTrendNum = ((l1.value || l1.bg) - (l2.value || l2.bg)) / Math.max(1, (tDiffMs / 300000));
        if(glucoseLogsOrig.length > 2) {
             const l3 = glucoseLogsOrig[glucoseLogsOrig.length-3];
             const tDiffMs2 = (l2.timestamp || new Date(l2.createdAt).getTime()) - (l3.timestamp || new Date(l3.createdAt).getTime());
             prevLastTrendNum = ((l2.value || l2.bg) - (l3.value || l3.bg)) / Math.max(1, (tDiffMs2 / 300000));
        }
    }
    const lastAccelerationNum = lastTrendNum - prevLastTrendNum;
    const { iob: currentIob, cob: currentCob, fastCobActive: currentFastCob, slowCobActive: currentSlowCob, pob: currentPob, fob: currentFob } = calculateActiveAtTime(latestTimeMs, sorted, rules);

    let weatherTemp: number | null = null;
    let weatherCondition: string | null = null;
    for (let i = glucoseLogsOrig.length - 1; i >= Math.max(0, glucoseLogsOrig.length - 20); i--) {
      if (glucoseLogsOrig[i].weather?.temp !== undefined) {
        weatherTemp = glucoseLogsOrig[i].weather!.temp;
        weatherCondition = glucoseLogsOrig[i].weather!.condition;
        break;
      }
    }

    let weatherBgModifier = 0;
    if (weatherTemp !== null && currentIob > 0) {
       if (weatherTemp > 25) weatherBgModifier = -((weatherTemp - 25) * 0.1 * currentIob); 
       else if (weatherTemp < 5) weatherBgModifier = ((5 - weatherTemp) * 0.05 * currentIob);
    }

    const sequenceForPrediction = [];
    for(let step = 5; step >= 0; step--) {
      const idx = resampledGlucose.length - 1 - step;
      if (idx >= 0) {
        const cur = resampledGlucose[idx];
        const { iob, cob, fastCobActive, slowCobActive, pob, fob } = calculateActiveAtTime(cur.timestamp, treatmentLogs, rules);
        const date = new Date(cur.timestamp);
        const hourDecimal = date.getHours() + (date.getMinutes() / 60);
        sequenceForPrediction.push(physiologicalNormalize([
            cur.value, cur.trend, 0, cob, fastCobActive, slowCobActive, iob,
            Math.sin((hourDecimal / 24) * Math.PI * 2), Math.cos((hourDecimal / 24) * Math.PI * 2),
            pob, fob, (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0, 120, 120, (iob + 0.1)/(cob + 0.1)
        ]));
      } else {
        sequenceForPrediction.push(physiologicalNormalize([latestBg, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
      }
    }

    const nextPredNormal = predictValue(model, sequenceForPrediction);
    const predValues = nextPredNormal.map((val, idx) => {
      let actualVal = val * 400;
      if (isNaN(actualVal) || !isFinite(actualVal)) actualVal = latestBg + lastTrendNum * [3,6,9,12,18,24,30,36][idx];
      return Math.max(40, Math.min(450, actualVal));
    });

    const predictionCurve = [{ timestamp: latestTimeMs, offsetMs: 0, value: latestBg }];
    const keypoints = [
      { step: 0, val: latestBg }, { step: 3, val: predValues[0] }, { step: 6, val: predValues[1] },
      { step: 9, val: predValues[2] }, { step: 12, val: predValues[3] }, { step: 18, val: predValues[4] },
      { step: 24, val: predValues[5] }, { step: 30, val: predValues[6] }, { step: 36, val: predValues[7] },
    ];

    const getInterpolatedValue = (s: number) => {
      for (let idx = 0; idx < keypoints.length - 1; idx++) {
        if (s >= keypoints[idx].step && s <= keypoints[idx + 1].step) {
          const frac = (s - keypoints[idx].step) / (keypoints[idx+1].step - keypoints[idx].step);
          return keypoints[idx].val + frac * (keypoints[idx+1].val - keypoints[idx].val);
        }
      }
      return latestBg;
    };

    for(let step = 1; step <= 24; step++) {
        let nextBg = getInterpolatedValue(step);
        nextBg += weatherBgModifier * (step / 12); 
        nextBg = Math.max(40, Math.min(600, nextBg));
        predictionCurve.push({ timestamp: latestTimeMs + (step * 5 * 60 * 1000), offsetMs: step * 5 * 60 * 1000, value: nextBg });
    }

    const predictedNextHour = predictionCurve[12]?.value || latestBg;
    const predictedNext2Hours = predictionCurve[24]?.value || latestBg;
    const riskOfHypo = predictedNextHour < 80 || predictedNext2Hours < 80 || (latestBg < 100 && lastTrendNum < -3);
    
    // HEURISTIC: Calculate GMI & Avg Bias
    let sumGlucose = 0;
    let countGlucose = 0;
    logsToAnalyze.forEach(l => {
        if (l.type === 'glucose' || l.bg) {
            sumGlucose += (l.value || l.bg);
            countGlucose++;
        }
    });
    
    let gmiPercentage = 0;
    if (countGlucose > 50) {
        const meanGlucose = sumGlucose / countGlucose;
        gmiPercentage = 3.31 + (0.02392 * meanGlucose);
    }

    let avgBias = 0;

    // SENSITIVITY CALCULATION
    const sequenceMoreCarbs = [...sequenceForPrediction];
    sequenceMoreCarbs[sequenceMoreCarbs.length - 1] = physiologicalNormalize([latestBg, lastTrendNum, lastAccelerationNum, currentCob + 50, currentFastCob, currentSlowCob + 50, currentIob, 0, 0, currentPob, currentFob, 0, 120, 120, 0]);
    const nextPredCarbs = predictValue(model, sequenceMoreCarbs);
    let carbSensitivity = (nextPredCarbs[3] * 400) - (nextPredNormal[3] * 400);

    const sequenceMoreInsulin = [...sequenceForPrediction];
    sequenceMoreInsulin[sequenceMoreInsulin.length - 1] = physiologicalNormalize([latestBg, lastTrendNum, lastAccelerationNum, currentCob, currentFastCob, currentSlowCob, currentIob + 5, 0, 0, currentPob, currentFob, 0, 120, 120, 0]);
    const nextPredInsulin = predictValue(model, sequenceMoreInsulin);
    let insulinSensitivity = (nextPredInsulin[5] * 400) - (nextPredNormal[5] * 400);

    // RESTORING 400 LINES OF INSIGHTS
    const accuracyPhrases = [
        i18n.t('auto.oparlem_sie_o_moje_doswia', { defaultValue: "🧠 Oparłem się o moje doświadczenie z Twoich ostatnich dni. Mój margines błędu to około {{var0}} mg/dL.", var0: Math.round(avgErrorInMgDl) }),
        i18n.t('auto.wciaz_zbieram_dane_moje_o', { defaultValue: "🧠 Wciąż zbieram dane. Moje odchylenie na tę chwilę to ok. {{var0}} mg/dL. Im więcej danych, tym mniejszy błąd.", var0: Math.round(avgErrorInMgDl) }),
        i18n.t('auto.przeanalizowalem_twoje_wy', { defaultValue: "🧠 Przeanalizowałem Twoje wykresy używając silnika LSTM. Błąd w przewidywaniach to {{var0}} mg/dL.", var0: Math.round(avgErrorInMgDl) })
    ];
    insights.push(accuracyPhrases[Math.floor(Math.random() * accuracyPhrases.length)]);

    const predictionPhrases = [
        i18n.t('auto.jezeli_trend_sie_nie_zmie', { defaultValue: "🔮 Jeżeli trend się nie zmieni, w ciągu godziny powinniśmy dotrzeć do {{var0}} mg/dL.", var0: Math.round(predictedNextHour) }),
        i18n.t('auto.wybiegajac_do_przodu_prze', { defaultValue: "🔮 Wybiegając do przodu - przewiduję okolice {{var0}} mg/dL za godzinkę.", var0: Math.round(predictedNextHour) }),
        i18n.t('auto.analizujac_tempo_spodziew', { defaultValue: "🔮 Analizując tempo, spodziewam się poziomu ok. {{var0}} mg/dL w ciągu 60 minut.", var0: Math.round(predictedNextHour) })
    ];
    insights.push(predictionPhrases[Math.floor(Math.random() * predictionPhrases.length)]);
    
    if (weatherTemp !== null && weatherBgModifier !== 0) {
        if (weatherTemp > 25) insights.push(`🌡️ Uwzględniłem upał (${weatherTemp}°C) w mojej analizie. Insulina w takich warunkach zazwyczaj działa mocniej.`);
        else if (weatherTemp < 5) insights.push(`❄️ Uwzględniłem niską temperaturę (${weatherTemp}°C). Chłód może powodować wolniejsze wchłanianie insuliny.`);
    }
    
    if (Math.round(currentCob) > 0 || currentIob > 0.05 || Math.round(currentPob) > 0 || Math.round(currentFob) > 0) {
        let text = `Twoje aktywne substancje w tle to teraz: `;
        const parts = [];
        if (Math.round(currentCob) > 0) parts.push(`🥪 ${Math.round(currentCob)}g węgli`);
        if (currentIob > 0.05) parts.push(`💉 ${currentIob.toFixed(1)}j insuliny`);
        if (Math.round(currentPob) > 0) parts.push(`🥩 ${Math.round(currentPob)}g białka`);
        if (Math.round(currentFob) > 0) parts.push(`🧀 ${Math.round(currentFob)}g tłuszczu`);
        insights.push(text + parts.join(', ') + '.');
    }

    if (carbSensitivity > 30) insights.push(i18n.t('auto.wydaje_mi_sie_ze_weglowodany_d', { defaultValue: i18n.t('auto.wydaje_mi_sie_ze_weglowod', { defaultValue: "💡 Wydaje mi się, że węglowodany dość szybko wchłaniają się teraz u Ciebie do krwi. Porcja np. 50g może mieć duży wpływ!" }) }));
    else if (carbSensitivity > 10) insights.push(i18n.t('auto.to_co_zjadles_uwalnia_sie_moim', { defaultValue: i18n.t('auto.to_co_zjadles_uwalnia_sie', { defaultValue: "💡 To co zjadłeś, uwalnia się moim zdaniem bardzo spokojnie i bez skoków. Dobra nasza!" }) }));

    if (insulinSensitivity < -30) insights.push(i18n.t('auto.masz_w_tym_momencie_podwyzszon', { defaultValue: i18n.t('auto.masz_w_tym_momencie_podwy', { defaultValue: "💉 Masz w tym momencie podwyższoną wrażliwość na insulinę. Postaraj się delikatniej podejść do ewentualnych korekt." }) }));

    if (avgBias < -15) insights.push(`🚨 Z moich szacunków wynika, że masz lekką oporność (byłem o ${Math.abs(Math.round(avgBias))} mg/dL w błędzie w dół). Jakieś emocje, stres?`);
    else if (avgBias > 15) insights.push(i18n.t('auto.cukier_trzyma_sie_nizej_niz_pr', { defaultValue: i18n.t('auto.cukier_trzyma_sie_nizej_n', { defaultValue: "🏃‍♂️ Cukier trzyma się niżej niż przewidywałem! Miałeś ukryty wysiłek fizyczny, o którym mi nie powiedziałeś?" }) }));

    const latestDate = new Date(latestTimeMs);
    const lastHourDec = latestDate.getHours() + (latestDate.getMinutes() / 60);

    if (rules.dawnPhenomenonEnabled && lastHourDec > 2 && lastHourDec < 9 && lastTrendNum > 3) {
         insights.push(i18n.t('auto.poranne_wstawanie_twoj_organiz', { defaultValue: i18n.t('auto.poranne_wstawanie_twoj_or', { defaultValue: "🌅 Poranne wstawanie... Twój organizm włącza Zjawisko Brzasku. Zapisuję, że w ostatnich dniach u Ciebie to częste." }) }));
    } else if (lastHourDec > 3 && lastHourDec < 8 && lastTrendNum > 5 && currentCob === 0 && currentPob === 0) {
        insights.push(i18n.t('auto.prawdopodobnie_organizm_budzi', { defaultValue: i18n.t('auto.prawdopodobnie_organizm_b', { defaultValue: "🌅 Prawdopodobnie organizm budzi Cię właśnie hormonami porannymi. Tzw. zjawisko brzasku, rośniemy nawet bez jedzenia." }) }));
    }

    const twoHoursAgoMs = latestTimeMs - (2 * 60 * 60 * 1000);
    const recentHypos = sorted.filter(l => (l.type === 'glucose' && (l.value || l.bg) < 70 && (l.timestamp || new Date(l.createdAt).getTime()) >= twoHoursAgoMs));
    if (rules.somogyiEnabled && recentHypos.length > 0 && lastTrendNum > 3) {
        insights.push(i18n.t('auto.uwaga_ostatnio_miales_hipo_wie', { defaultValue: i18n.t('auto.uwaga_ostatnio_miales_hip', { defaultValue: "🔄 Uwaga! Ostatnio miałeś hipo, więc widzę jak Twój organizm zaczął walczyć wypuszczając zapasy glukozy (tzw. efekt Somogyi). Powoli z korektami." }) }));
    } else if (recentHypos.length > 0 && lastTrendNum > 6) {
        insights.push(i18n.t('auto.miales_przed_chwila_gleboki_sp', { defaultValue: i18n.t('auto.miales_przed_chwila_glebo', { defaultValue: "🔄 Miałeś przed chwilą głęboki spadek. Ten gwałtowny wzrost to odbicie po-hipowe. Uważnie z potężną korektą, by znów nie spaść!" }) }));
    }

    if (rules.insulinResistanceMultiplier && rules.insulinResistanceMultiplier > 1.1) insights.push(i18n.t('auto.w_moim_cenniku_twojego_uodporn', { defaultValue: i18n.t('auto.w_moim_cenniku_twojego_uo', { defaultValue: "💪 W moim cenniku Twojego uodpornienia, widnieje lekka blokada na insulinę. Licz się z trochę chłodniejszą reakcją organizmu." }) }));
    else if (rules.insulinResistanceMultiplier && rules.insulinResistanceMultiplier < 0.9) insights.push(i18n.t('auto.moje_ukryte_wagi_mowia_ze_powi', { defaultValue: i18n.t('auto.moje_ukryte_wagi_mowia_ze', { defaultValue: "📉 Moje ukryte wagi mówią, że powinieneś w najbliższym czasie być podwójnie ostrożny z dawkami. Będziesz zbijał cukier skuteczniej!" }) }));

    if (latestBg > 160 && currentIob > 1.5 && predictedNextHour > 160) {
        insights.push(i18n.t('auto.jest_wysoko_ale_uwaga_ustrzez', { defaultValue: i18n.t('auto.jest_wysoko_ale_uwaga_ust', { defaultValue: "📉 Jest wysoko, ale uwaga! Ustrzeż się nawarstwienia insuliny, masz już zgromadzoną u siebie aktywną porcję. Wymaga to tylko chwili cierpliwości." }) }));
    }

    if ((lastHourDec > 23 || lastHourDec < 5) && Math.abs(lastTrendNum) < 3 && latestBg > 90 && latestBg < 140) {
        insights.push(i18n.t('auto.widze_spokojna_i_udana_nocke_p', { defaultValue: i18n.t('auto.widze_spokojna_i_udana_no', { defaultValue: "🌙 Widzę spokojną i udaną nockę. Parametry ucięte jak od sznurka do snu!" }) }));
    }

    let varianceSum = 0;
    if (countGlucose > 10) {
        const meanGlucose = sumGlucose / countGlucose;
        logsToAnalyze.forEach(l => {
            if (l.type === 'glucose' || l.bg) {
                varianceSum += Math.pow((l.value || l.bg) - meanGlucose, 2);
            }
        });
        const stdDev = Math.sqrt(varianceSum / countGlucose);
        const cv = (stdDev / meanGlucose) * 100;
        const bollingerUpper = Math.round(meanGlucose + (2 * stdDev));
        const bollingerLower = Math.max(40, Math.round(meanGlucose - (2 * stdDev)));

        if (latestBg > bollingerUpper && lastTrendNum > 3) insights.push(i18n.t('auto.oho_poszlismy_wyzej_niz_zaklad', { defaultValue: i18n.t('auto.oho_poszlismy_wyzej_niz_z', { defaultValue: "📈 Oho, poszliśmy wyżej niż zakładałem! Cukier chyba poszukuje nowego miejsca żeby odpocząć, musisz zareagować." }) }));
        else if (latestBg < bollingerLower && lastTrendNum < -3) insights.push(i18n.t('auto.cukier_zapikowal_ostrzej_niz_m', { defaultValue: i18n.t('auto.cukier_zapikowal_ostrzej', { defaultValue: "📉 Cukier zapikował ostrzej niż można by sądzić! Polecam szybko zabezpieczyć się węglowodanami." }) }));

        if (cv > 33 && meanGlucose > 80 && countGlucose > 30) insights.push(i18n.t('auto.hej_jedziemy_na_sporym_roller', { defaultValue: i18n.t('auto.hej_jedziemy_na_sporym_ro', { defaultValue: "🎢 Hej, jedziemy na sporym roller-coasterze. Zwróć większą uwagę na wcześniejsze podanie insuliny by ograniczyć piki!" }) }));
        else if (cv < 15 && countGlucose > 30) insights.push(i18n.t('auto.chcialbym_ci_bardzo_podziekowa', { defaultValue: i18n.t('auto.chcialbym_ci_bardzo_podzi', { defaultValue: "🏆 Chciałbym Ci bardzo podziękować - Twoje wykresy trzymają tak mało huśtawek, to powód do zadowolenia!" }) }));
    }

    if (currentCob > 50 && latestBg > 150 && lastTrendNum > 4 && currentIob < Math.max(1, currentCob / 15)) {
         insights.push(`🚀 Ostrzegam! Masz sporo węgli zgromadzonych do zjedzenia (${Math.round(currentCob)}g), ale brak ubezpieczenia insulinowego, i idzie do góry. Działaj!`);
    }

    const threeHoursAgoForBasal = latestTimeMs - (3 * 60 * 60 * 1000);
    const recentMealsOrBoluses = sorted.filter(l => (l.type === 'meal' || l.type === 'bolus' || l.type === 'insulin') && (l.timestamp || new Date(l.createdAt).getTime()) >= threeHoursAgoForBasal);
    if (recentMealsOrBoluses.length === 0 && lastTrendNum > 3 && latestBg > 130 && latestBg < 200 && currentIob === 0 && currentCob === 0) {
        insights.push(i18n.t('auto.nic_nie_bylo_jedzone_nie_bylo', { defaultValue: i18n.t('auto.nic_nie_bylo_jedzone_nie', { defaultValue: "🧗 Nic nie było jedzone, nie było insuliny, a mimo to pomalutku brniemy w góry. Tzw. pusta luka - sprawdź, czy Ci lekko baza nie nawala!" }) }));
    }

    if (currentFob > 15 || currentPob > 20) insights.push(i18n.t('auto.mam_u_siebie_zapisana_mase_tlu', { defaultValue: i18n.t('auto.mam_u_siebie_zapisana_mas', { defaultValue: "⚠️ Mam u siebie zapisaną masę tłuszczów lub białek czekającą by się strawić! Zwracaj uwagę na ukryte wyskoki potraw za ok. 3-4 godziny - efekt pizzy wisi w powietrzu!" }) }));

    const last4h = sorted.filter(l => (l.timestamp || new Date(l.createdAt).getTime()) > (latestTimeMs - 4 * 3600000));
    const recentBolusesIn4h = last4h.filter(l => l.type === 'bolus' || l.type === 'insulin');
    const totalRecentBolus = recentBolusesIn4h.reduce((sum, b) => sum + (b.value || b.insulin || 0), 0);
    
    if (latestBg > 200 && totalRecentBolus > 1.5 && lastTrendNum >= -1 && currentIob > 0.5) {
        const highCounts = last4h.filter(l => (l.type === 'glucose' || l.bg) && (l.value || l.bg) > 180).length;
        const totalCounts = last4h.filter(l => l.type === 'glucose' || l.bg).length;
        if (highCounts > 0 && highCounts / (totalCounts || 1) > 0.8) {
            insights.push(`🚨 UWAGA! Cukier utknął wysoko i nie idzie w dół nawet przy podanych ${totalRecentBolus}j insuliny od 4 godzin. Istnieje powód by zerknąć na miejsce wkłucia, mogła wygiąć się kaniula!`);
        }
    }

    if (currentIob > 3 && latestBg < 110 && lastTrendNum < -5 && currentCob < 10) {
        insights.push(i18n.t('auto.trend_leci_masz_solidny_ladune', { defaultValue: i18n.t('auto.trend_leci_masz_solidny_l', { defaultValue: "🎯 Trend leci! Masz solidny ładunek aktywnej insuliny w ciele i ani trochę zabezpieczonych węglowodanów w żołądku. Koniecznie zjedz ok. 15g soku lub glukozy!" }) }));
    }

    if (riskOfHypo) {
        const hypoPhrases = [i18n.t('auto.przeczucie_mi_mowi_ze_zbliza_s', { defaultValue: i18n.t('auto.przeczucie_mi_mowi_ze_zbl', { defaultValue: "⚠️ Przeczucie mi mówi, że zbliża się niezłe hipo! Zjedz szybko trochę cukrów prostych tak by nie zlecieć całkiem ze skały." }) }), i18n.t('auto.bardzo_czerwone_swiatlo_u_mnie', { defaultValue: i18n.t('auto.bardzo_czerwone_swiatlo_u', { defaultValue: "⚠️ Bardzo czerwone światło u mnie - potężnie wylatujesz na dół! Zaserwuj sobie łyk soku." }) }), i18n.t('auto.spadek_i_maly_zakres_konieczni', { defaultValue: i18n.t('auto.spadek_i_maly_zakres_koni', { defaultValue: "⚠️ Spadek i mały zakres! Koniecznie przerzuć zębatkę wyżej zabezpieczając te skoki odpowiednią glukozą!" }) })];
        insights.push(hypoPhrases[Math.floor(Math.random() * hypoPhrases.length)]);
    } else if (predictedNextHour > 180) {
        const hyperPhrases = [i18n.t('auto.powoli_wybiegamy_w_teren_wysok', { defaultValue: i18n.t('auto.powoli_wybiegamy_w_teren', { defaultValue: "📈 Powoli wybiegamy w teren wysokich cukrów. Zorientuj się skąd to zmierza, ja mogę nie wszystkiego wiedzieć o jedzeniu by to sprowadzić z powrotem." }) }), i18n.t('auto.sklaniamy_sie_gwaltownie_przed', { defaultValue: i18n.t('auto.sklaniamy_sie_gwaltownie', { defaultValue: "📈 Skłaniamy się gwałtownie przed drzwiami hiperglikemii, mała poprawka da nam sporego kopa rześkości na kolejną godzinę." }) }), i18n.t('auto.wydaje_mi_sie_ze_ostatnio_musi', { defaultValue: i18n.t('auto.wydaje_mi_sie_ze_ostatnio', { defaultValue: "📈 Wydaje mi się, że ostatnio musiało wpaść troszkę niezaznaczonych słodkości... Spodziewaj się lotu powyżej linii." }) })]
        insights.push(hyperPhrases[Math.floor(Math.random() * hyperPhrases.length)]);
    } else {
        const normalPhrases = [i18n.t('auto.piekna_chwila_homeostazy_napra', { defaultValue: i18n.t('auto.piekna_chwila_homeostazy', { defaultValue: "✨ Piękna chwila homeostazy, naprawdę warto ją celebrować, i dla takich widoków na ekranie staram się bywały zawsze!" }) }), i18n.t('auto.krok_po_kroku_i_mamy_idealny_m', { defaultValue: i18n.t('auto.krok_po_kroku_i_mamy_idea', { defaultValue: "✨ Krok po kroku i mamy idealny moment równowagi... Oby tak dalej przez całą resztę dnia!" }) }), i18n.t('auto.w_tej_minucie_mozna_powiedziec', { defaultValue: i18n.t('auto.w_tej_minucie_mozna_powie', { defaultValue: "✨ W tej minucie można powiedzieć jedynie brawo byczku - jest ok, żadnych niespodziewanych kłopotów na moje oko!" }) })];
        insights.push(normalPhrases[Math.floor(Math.random() * normalPhrases.length)]);
    }

    const accuracyValue = Math.max(5, Math.round(100 * Math.exp(-avgErrorInMgDl / 80)));

    self.postMessage({ 
      type: 'result', 
      payload: {
        predictedNextHour: Math.round(predictedNextHour),
        predictedNext2Hours: Math.round(predictedNext2Hours),
        riskOfHypo,
        insights,
        accuracy: accuracyValue,
        datasetSize: datasetSizeFromStorage || dataset.length,
        analyzedPeriod: mode === 'quick' ? 'Ostatnie 4h' : 'Ostatnie 14 dni',
        predictionCurve: predictionCurve.map(p => ({ ...p, value: Math.round(p.value) })),
        metrics: { iob: currentIob, cob: currentCob, carbSensitivity: Math.round(carbSensitivity), insulinSensitivity: Math.round(insulinSensitivity), gmiPercentage: gmiPercentage > 0 ? parseFloat(gmiPercentage.toFixed(2)) : undefined, avgBias: Math.round(avgBias) },
        learnedPkParams: rules.pkParams
      } 
    });

  } catch (error: any) {
    if (error && error.message && (error.message.includes('dimension') || error.message.includes('shape'))) {
      // Shape mismatch due to old model version restore from backup. 
      // Delete the corrupted model from IndexedDB.
      try { tf.io.removeModel('indexeddb://glikosense-lstm-v4'); } catch(e) {}
    }
    self.postMessage({ type: 'error', error: error.message });
  }
};
