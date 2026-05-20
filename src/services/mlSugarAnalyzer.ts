import * as tf from '@tensorflow/tfjs';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const GlikoSenseLearner = {
  async sendTelemetry(learnedRule: string, contextString: string) {
    if (localStorage.getItem('glikosense_telemetry') === 'true') {
      try {
        await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'glikosense_training'), {
          ruleLearned: learnedRule,
          context: contextString,
          timestamp: serverTimestamp(),
          source: 'GlikoSense Client',
          model: 'v2.4.1'
        });
        console.log("GlikoSense: Anonimowe dane o uczeniu wysłane z powodzeniem.");
      } catch (e) {
        console.warn("GlikoSense: Błąd wysyłania telemetrii", e);
      }
    }
  },
  learnFromGemini(analysisText: string) {
    const text = analysisText.toLowerCase();
    try {
      let rules = JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}');
      
      if (text.includes('insulinooporność') || text.includes('oporność na insulinę') || text.includes('wysokie dawki')) {
        rules.insulinResistanceMultiplier = (rules.insulinResistanceMultiplier || 1.0) * 1.05;
        this.sendTelemetry("insulinResistanceMultiplier_increase", "Wykryto słowo-klucz oporności w raporcie AI.");
        console.log("GlikoSense: Nauczyłem się o insulinooporności z raportu AI Gemini.");
      }
      if (text.includes('zwiększona wrażliwość') || text.includes('bardzo spada') || text.includes('szybki spadek')) {
        rules.insulinResistanceMultiplier = Math.max(0.5, (rules.insulinResistanceMultiplier || 1.0) * 0.95);
        this.sendTelemetry("insulinResistanceMultiplier_decrease", "Wykryto słowo-klucz wrażliwości w raporcie AI.");
        console.log("GlikoSense: Nauczyłem się o zwiększonej wrażliwości z raportu AI Gemini.");
      }
      if (text.includes('brzask') || text.includes('wzrosty poranne')) {
        rules.dawnPhenomenonEnabled = true;
        this.sendTelemetry("dawnPhenomenonEnabled_true", "Aktywowano regułę poranną.");
        console.log("GlikoSense: Aktywowano regułę Zjawiska Brzasku na podstawie rad z Gemini.");
      }
      if (text.includes('somogyi') || text.includes('odbicie po hipo')) {
        rules.somogyiEnabled = true;
        this.sendTelemetry("somogyiEnabled_true", "Aktywowano zjawisko somogyi z porad Gemini.");
        console.log("GlikoSense: Aktywowano czujność efektu Somogyi z medycznych porad.");
      }
      if (text.includes('pizza') || text.includes('tłuste posiłki') || text.includes('przedłużone wchłanianie')) {
        rules.pizzaEffectMultiplier = 1.2;
        this.sendTelemetry("pizzaEffectMultiplier_1.2", "Korekta bazy wchłaniania (Efekt Pizzy).");
        console.log("GlikoSense: Zaadaptowano algorytm do dłuższego wchłaniania tłuszczy z AI.");
      }
      
      localStorage.setItem('glikosense_medical_rules', JSON.stringify(rules));
    } catch (e) {
      console.warn("GlikoSense Learner error", e);
    }
  },
  getRules() {
    try {
      return JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}');
    } catch {
      return {};
    }
  }
};

// Funkcja pomocnicza do obliczania aktywnych węglowodanów, insuliny, tłuszczu i białka
function calculateActiveAtTime(targetTime: number, pastLogs: any[]) {
    let iob = 0; // Insulin on Board
    let cob = 0; // Carbs on Board
    let pob = 0; // Protein on Board
    let fob = 0; // Fat on Board
    
    const rules = GlikoSenseLearner.getRules();
    const pizzaMult = rules.pizzaEffectMultiplier || 1.0;
    
    // Optymalizacja: patrzymy tylko na logi z ostatnich 8h względem targetTime
    const cutoffTime = targetTime - (8 * 60 * 60 * 1000);
    
    for (let i = pastLogs.length - 1; i >= 0; i--) {
        const log = pastLogs[i];
        const logTime = log.timestamp || new Date(log.createdAt).getTime();
        
        if (logTime < cutoffTime) break; // Skoro logi są posortowane, dalsze są jeszcze starsze
        const diffMs = targetTime - logTime;
        if (diffMs < 0) continue; 
        
        const diffHours = diffMs / (1000 * 60 * 60);
        
        // Insulina - szybkodziałająca (peak ok. 1-1.5h, koniec działania ok. 4h)
        const insulin = log.type === 'bolus' ? log.value : (log.insulin || 0);
        if (insulin && diffHours < 4.5) {
            const remaining = diffHours < 1.0 
                ? (1 - diffHours * 0.25)
                : (1 - (diffHours / 4.5));
            iob += insulin * Math.max(0, remaining);
        }
        
        // Węglowodany (szybkie - 2 do 3h), adaptacja do tłuszczy
        const carbs = log.type === 'meal' ? log.value : (log.carbs || 0);
        const carbDuration = 3 * pizzaMult;
        if (carbs && diffHours < carbDuration) {
            cob += carbs * Math.max(0, (1 - (diffHours / carbDuration)));
        }

        // Białko (Wolniejsze - do 4-5h)
        const protein = log.type === 'meal' ? (log.protein || 0) : 0;
        const protDuration = 5 * pizzaMult;
        if (protein && diffHours < protDuration) {
            pob += protein * Math.max(0, (1 - (diffHours / protDuration)));
        }

        // Tłuszcz (Bardzo powolne działanie - do 6-8h)
        const fat = log.type === 'meal' ? (log.fat || 0) : 0;
        const fatDuration = 7 * pizzaMult;
        if (fat && diffHours < fatDuration) {
            fob += fat * Math.max(0, (1 - (diffHours / fatDuration)));
        }
    }
    
    return { 
        iob: Math.max(0, iob), 
        cob: Math.max(0, cob),
        pob: Math.max(0, pob),
        fob: Math.max(0, fob)
    };
}

let _currentFullAnalysisPromise: Promise<any> | null = null;
let _currentQuickAnalysisPromise: Promise<any> | null = null;
let _cachedResult: any = null;
let _lastAnalysisTime: number = 0;
let _lastLogsFingerprint: string | null = null;

export const MLAnalyzer = {
  // Funkcja analizująca logi z wykorzystaniem TensorFlow.js (lokalnie/w przeglądarce)
  analyzeData(logs: any[], force: boolean = false, mode: 'quick' | 'full' = 'full'): Promise<{ 
    predictedNextHour: number, 
    riskOfHypo: boolean,
    insights: string[],
    accuracy: number,
    datasetSize?: number,
    analyzedPeriod?: string,
    predictionCurve?: { timestamp: number, offsetMs: number, value: number }[],
    metrics?: { iob: number, cob: number, carbSensitivity: number, insulinSensitivity: number, gmiPercentage: number, avgBias: number }
  }> {
    const logsFingerprint = logs && logs.length > 0 
      ? `v2-${mode}-${logs.length}-${logs[logs.length - 1].timestamp || logs[logs.length - 1].createdAt}` 
      : 'empty';

    // 1. Sprawdź Cache w pamięci i LocalStorage
    if (!force) {
      if (_cachedResult && _lastLogsFingerprint === logsFingerprint) {
        return Promise.resolve(_cachedResult);
      }
      
      if (mode === 'full') {
        const persistentCache = localStorage.getItem('glikosense_last_result_v2');
        const persistentFingerprint = localStorage.getItem('glikosense_last_fingerprint');
        
        if (persistentCache && persistentFingerprint === logsFingerprint) {
          try {
            const parsed = JSON.parse(persistentCache);
            _cachedResult = parsed;
            _lastLogsFingerprint = logsFingerprint;
            _lastAnalysisTime = Date.now();
            return Promise.resolve(parsed);
          } catch (e) {
            console.warn("Błąd odczytu cache GlikoSense");
          }
        }
      }
    }

    if (mode === 'full' && _currentFullAnalysisPromise) {
      return _currentFullAnalysisPromise;
    }
    if (mode === 'quick' && _currentQuickAnalysisPromise) {
      return _currentQuickAnalysisPromise;
    }

    const doAnalysis = async () => {
      // Basic checks
      if (!logs || logs.length < 3) {
        return { 
          predictedNextHour: 0, 
          riskOfHypo: false, 
          insights: ["Zbyt mało danych dla GlikoSense."], 
          accuracy: 0,
          analyzedPeriod: mode === 'quick' ? 'Ostatnie 4h' : 'Ostatnie 14 dni'
        };
      }

      const now = Date.now();
      // Tryb szybki: ostatnie 4h. Tryb pełny: 14 dni.
      const lookbackMs = mode === 'quick' ? (24 * 60 * 60 * 1000) : (14 * 24 * 60 * 60 * 1000);
      const cutoffTime = now - lookbackMs;
      
      let logsToAnalyze = logs.filter(l => (l.timestamp || new Date(l.createdAt).getTime()) >= cutoffTime);
      
      if (mode === 'full' && logsToAnalyze.length > 1500) logsToAnalyze = logsToAnalyze.slice(0, 1500);
      if (logsToAnalyze.length < 5) logsToAnalyze = logs.slice(0, 20);

      const sorted = [...logsToAnalyze].sort((a,b) => (a.timestamp || new Date(a.createdAt).getTime()) - (b.timestamp || new Date(b.createdAt).getTime()));
      const glucoseLogsOrig = sorted.filter(l => l.type === 'glucose' || l.bg);
      
      // --- HEURISTIC ANALYSIS (Always run, even if LSTM fails) ---
      const insights: string[] = [];
      const mealPatterns: { [key: string]: { spikes: number, count: number } } = {};
      
      // Feature F: Daily Sensitivity Analysis
      const timeBlocks = {
        morning: { label: 'Poranek', starts: 6, ends: 11, sensitivity: 0, count: 0, drops: [] as number[] },
        afternoon: { label: 'Popołudnie', starts: 11, ends: 17, sensitivity: 0, count: 0, drops: [] as number[] },
        evening: { label: 'Wieczór', starts: 17, ends: 23, sensitivity: 0, count: 0, drops: [] as number[] },
        night: { label: 'Noc', starts: 23, ends: 6, sensitivity: 0, count: 0, drops: [] as number[] }
      };

      const allMeals = logs.filter(l => l.type === 'meal');
      const allBoluses = logs.filter(l => l.type === 'bolus' || l.type === 'insulin');
      const allGlucose = logs.filter(l => l.type === 'glucose' || l.bg).sort((a,b) => (a.timestamp || new Date(a.createdAt).getTime()) - (b.timestamp || new Date(b.createdAt).getTime()));
      
      // Analyze time blocks sensitivity
      allBoluses.forEach(b => {
        const bTime = b.timestamp || new Date(b.createdAt).getTime();
        const bHour = new Date(bTime).getHours();
        const bVal = b.value || b.insulin || 0;
        if (bVal <= 0) return;

        // Found sugar 2-3h after bolus
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
          const block = Object.values(timeBlocks).find(tb => 
            tb.starts <= tb.ends ? (bHour >= tb.starts && bHour < tb.ends) : (bHour >= tb.starts || bHour < tb.ends)
          );
          if (block) {
            block.drops.push(drop / bVal); // drops per 1 unit
          }
        }
      });

      // Calculate averages for blocks
      Object.values(timeBlocks).forEach(tb => {
        if (tb.drops.length > 0) {
          tb.sensitivity = tb.drops.reduce((a, b) => a + b, 0) / tb.drops.length;
          tb.count = tb.drops.length;
        }
      });

      const mostSensitive = Object.values(timeBlocks).reduce((prev, current) => (prev.sensitivity > current.sensitivity) ? prev : current);
      const leastSensitive = Object.values(timeBlocks).reduce((prev, current) => (prev.sensitivity < current.sensitivity && current.count > 0) ? prev : current);

      if (mostSensitive.count > 1 && leastSensitive.count > 1 && mostSensitive !== leastSensitive) {
        const ratio = mostSensitive.sensitivity / (leastSensitive.sensitivity || 1);
        if (ratio > 1.4) {
          insights.push(`🕰️ Pora dnia ma znaczenie. Na podstawie ostatnich dni widzę, że w fazie "${mostSensitive.label}" Twoja wrażliwość na insulinę jest o ${Math.round((ratio-1)*100)}% wyższa niż w fazie "${leastSensitive.label}". Pamiętaj o tym dobierając dawki!`);
        }
      }

      allMeals.slice(0, 100).forEach(m => {
        const mealTime = m.timestamp || new Date(m.createdAt).getTime();
        const mealName = m.note || m.name || m.description || "Posiłek";
        if (!mealName || mealName.length < 3 || mealName === "Posiłek") return;

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

      const problematicMeals = Object.entries(mealPatterns)
        .filter(([_, stats]) => stats.spikes > 0 && (stats.spikes / stats.count) >= 0.5)
        .map(([name]) => name);

      if (problematicMeals.length > 0) {
        insights.push(`🧠 Z moich obserwacji z 14 dni: pozycje takie jak: ${problematicMeals.slice(0, 2).join(", ")} powtarzały się z wyższymi poziomami cukru potem. Możesz tu rozważyć wcześniejszy bolus.`);
      }

      // 0. Weekly day analysis (Tuesdays etc)
      if (mode === 'full') {
        const daysStats: { [day: string]: { sum: number, count: number } } = {
          "Niedziela": { sum: 0, count: 0 },
          "Poniedziałek": { sum: 0, count: 0 },
          "Wtorek": { sum: 0, count: 0 },
          "Środa": { sum: 0, count: 0 },
          "Czwartek": { sum: 0, count: 0 },
          "Piątek": { sum: 0, count: 0 },
          "Sobota": { sum: 0, count: 0 }
        };
        const dayNames = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

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
        return { 
          predictedNextHour: 0, 
          riskOfHypo: false, 
          insights: [...insights, "Czekam na więcej odczytów glikemii..."], 
          accuracy: 0,
          analyzedPeriod: mode === 'quick' ? 'Ostatnie 4h' : 'Ostatnie 14 dni'
        };
      }

      let useLSTM = true;
      try {
        await Promise.race([
          tf.ready(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("TF Timeout")), 2500))
        ]);
        // Sprawdź czy WebGL jest dostępny, jeśli nie, upewnij się że CPU działa
        if (tf.getBackend() === null) {
           await tf.setBackend('cpu');
        }
      } catch (e) {
        console.warn("TF not ready, using heuristic fallback", e);
        useLSTM = false;
      }

      // Tworzymy siatkę co 5 minut dla stabilności LSTM
      const resampledGlucose: { timestamp: number, value: number, trend: number }[] = [];
      let startTime = glucoseLogsOrig[0].timestamp || new Date(glucoseLogsOrig[0].createdAt).getTime();
      // Zabezpieczenie: nie cofamy się dalej niż wybrany okres nawet jeśli logi są stare
      if (startTime < cutoffTime) startTime = cutoffTime;
      
      const endTime = glucoseLogsOrig[glucoseLogsOrig.length - 1].timestamp || new Date(glucoseLogsOrig[glucoseLogsOrig.length - 1].createdAt).getTime();
      const stepMs = 5 * 60 * 1000;

      let origIdx = 0;
      for (let t = startTime; t <= endTime; t += stepMs) {
        // Efektywne szukanie punktów "przed" i "po"
        while (origIdx < glucoseLogsOrig.length - 1 && (glucoseLogsOrig[origIdx + 1].timestamp || new Date(glucoseLogsOrig[origIdx + 1].createdAt).getTime()) <= t) {
          origIdx++;
        }

        const before = glucoseLogsOrig[origIdx];
        const beforeTime = before.timestamp || new Date(before.createdAt).getTime();
        
        // Optymalizacja: jeśli t jest znacznie dalej niż obecny log, przeskocz do przodu
        if (t < beforeTime) {
             t = beforeTime - stepMs;
             continue;
        }

        const after = (origIdx < glucoseLogsOrig.length - 1) ? glucoseLogsOrig[origIdx + 1] : null;

        if (before && after) {
          const t1 = beforeTime;
          const t2 = after.timestamp || new Date(after.createdAt).getTime();
          const v1 = before.value || before.bg;
          const v2 = after.value || after.bg;
          
          const val = v1 + (v2 - v1) * ((t - t1) / (t2 - t1));
          resampledGlucose.push({ timestamp: t, value: val, trend: 0 });
        } else if (before) {
          resampledGlucose.push({ timestamp: t, value: before.value || before.bg, trend: 0 });
        }
        
        if (resampledGlucose.length > 2016) break; // Max 7 dni danych (7 * 24 * 12)
      }
      
      if (resampledGlucose.length === 0) {
        return { predictedNextHour: 0, riskOfHypo: false, insights: ["Zbyt mało poprawnych danych glikemii po przetworzeniu."], accuracy: 0 };
      }

      await new Promise(r => setTimeout(r, 0)); // Pozwól UI odetchnąć po resamplingu - setTimeout działa też w background tab, tf.nextFrame nie.

      // Proste wygładzanie (EMA)
      let smoothedValue = resampledGlucose[0].value;
      const alpha = 0.4;
      resampledGlucose.forEach((p, idx) => {
        smoothedValue = (p.value * alpha) + (smoothedValue * (1 - alpha));
        p.value = smoothedValue;
        if (idx > 0) {
          p.trend = p.value - resampledGlucose[idx-1].value;
        }
      });
      
      const dataset = [];
      
      // Optymalizacja datasetu - pre-filtrowanie logów nie-glikemicznych
      const treatmentLogs = sorted.filter(l => l.type === 'meal' || l.type === 'bolus' || l.type === 'insulin');
      let treatmentIdx = 0;

      for(let i=0; i < resampledGlucose.length - 1; i++) {
        if (i % 500 === 0) await new Promise(r => setTimeout(r, 0)); // UI breather dla długich pętli
        const current = resampledGlucose[i];
        const next = resampledGlucose[i+1];
        const currentTimeMs = current.timestamp;

        // Przesuwamy okno logów aktywnych
        while (treatmentIdx < treatmentLogs.length && (treatmentLogs[treatmentIdx].timestamp || new Date(treatmentLogs[treatmentIdx].createdAt).getTime()) <= currentTimeMs) {
          treatmentIdx++;
        }
        const relevantLogs = treatmentLogs.slice(0, treatmentIdx);
        
        let trendNum = current.trend;
        let prevTrendNum = i > 0 ? resampledGlucose[i-1].trend : 0;
        let accelerationNum = trendNum - prevTrendNum;

        const { iob, cob, pob, fob } = calculateActiveAtTime(currentTimeMs, relevantLogs);

        let timeSinceMeal = 1440;
        let timeSinceBolus = 1440;
        for (let j = relevantLogs.length - 1; j >= 0; j--) {
             const t = relevantLogs[j].timestamp || new Date(relevantLogs[j].createdAt).getTime();
             const minutes = (currentTimeMs - t) / 60000;
             if (relevantLogs[j].type === 'meal' && minutes < timeSinceMeal && timeSinceMeal === 1440) timeSinceMeal = minutes;
             if ((relevantLogs[j].type === 'bolus' || relevantLogs[j].type === 'insulin') && minutes < timeSinceBolus && timeSinceBolus === 1440) timeSinceBolus = minutes;
             if (minutes > 480) break; // Optymalizacja wsteczna
        }

        const date = new Date(currentTimeMs);
        const hourDecimal = date.getHours() + (date.getMinutes() / 60);
        const timeSin = Math.sin((hourDecimal / 24) * Math.PI * 2);
        const timeCos = Math.cos((hourDecimal / 24) * Math.PI * 2);
        const isWeekend = (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0;
        const iobCobRatio = (iob + 0.1) / (cob + 0.1);

        let nextTrendTarget = next.value - current.value;
        
        dataset.push({
            timestamp: currentTimeMs,
            inputs: [current.value, trendNum, accelerationNum, cob, iob, timeSin, timeCos, pob, fob, isWeekend, timeSinceMeal, timeSinceBolus, iobCobRatio], 
            output: [next.value / 400, nextTrendTarget / 50]
        });
      }

      if(dataset.length === 0) {
        return { predictedNextHour: 0, riskOfHypo: false, insights: ["Brak spójnych par odczytów dla układu neuronowego GlikoSense."], accuracy: 0};
      }

    let predictedNextHour = 0;
    const predictionCurve: { timestamp: number, offsetMs: number, value: number }[] = [];
    let carbSensitivity = 20;
    let insulinSensitivity = -30;
    let accuracy = useLSTM ? 15 : 45; 
    let avgBias = 0;
    let avgErrorInMgDl = 50;
    let isModelLoaded = false;

    // Remaining Logic Prep
    const latest = glucoseLogsOrig[glucoseLogsOrig.length-1];
    let lastTrendNum = 0;
    let prevLastTrendNum = 0;
    if(glucoseLogsOrig.length > 1) {
        const l1 = glucoseLogsOrig[glucoseLogsOrig.length-1];
        const l2 = glucoseLogsOrig[glucoseLogsOrig.length-2];
        const tDiffMs = (l1.timestamp || new Date(l1.createdAt).getTime()) - (l2.timestamp || new Date(l2.createdAt).getTime());
        lastTrendNum = ((l1.value || l1.bg) - (l2.value || l2.bg)) / Math.max(1, (tDiffMs / 300000));
        
        if(glucoseLogsOrig.length > 2) {
             const l3 = glucoseLogsOrig[glucoseLogsOrig.length-3];
             const tDiffMs2 = (l2.timestamp || new Date(l2.createdAt).getTime()) - (l3.timestamp || new Date(l3.createdAt).getTime());
             prevLastTrendNum = ((l2.value || l2.bg) - (l3.value || l3.bg)) / Math.max(1, (tDiffMs2 / 300000));
        }
    }
    
    let lastAccelerationNum = lastTrendNum - prevLastTrendNum;
    const latestTimeMs = latest.timestamp || new Date(latest.createdAt).getTime();
    const { iob: currentIob, cob: currentCob, pob: currentPob, fob: currentFob } = calculateActiveAtTime(latestTimeMs, sorted);

    const latestDate = new Date(latestTimeMs);
    const lastHourDec = latestDate.getHours() + (latestDate.getMinutes() / 60);
    const lastTimeSin = Math.sin((lastHourDec / 24) * Math.PI * 2);
    const lastTimeCos = Math.cos((lastHourDec / 24) * Math.PI * 2);
    const isTodayWeekend = (latestDate.getDay() === 0 || latestDate.getDay() === 6) ? 1 : 0;

    // Pobieranie pogody z ostatnich logów
    let weatherTemp: number | null = null;
    let weatherCondition: string | null = null;
    for (let i = glucoseLogsOrig.length - 1; i >= Math.max(0, glucoseLogsOrig.length - 20); i--) {
      if (glucoseLogsOrig[i].weather?.temp !== undefined) {
        weatherTemp = glucoseLogsOrig[i].weather!.temp;
        weatherCondition = glucoseLogsOrig[i].weather!.condition;
        break;
      }
    }

    // Dodatkowy mnożnik pogody w mg/dL per 5 minut przy aktywnej insulinie
    let weatherBgModifier = 0;
    if (weatherTemp !== null && currentIob > 0) {
       if (weatherTemp > 25) {
          weatherBgModifier = -((weatherTemp - 25) * 0.1 * currentIob); 
       } else if (weatherTemp < 5) {
          weatherBgModifier = ((5 - weatherTemp) * 0.05 * currentIob);
       }
    }

    const latestBg = latest.value || latest.bg;
    
    let timeSinceMealContext = 1440;
    let timeSinceBolusContext = 1440;
    for (let j = sorted.length - 1; j >= 0; j--) {
        const t = sorted[j].timestamp || new Date(sorted[j].createdAt).getTime();
        const minutes = (latestTimeMs - t) / 60000;
        if (sorted[j].type === 'meal' && minutes >= 0 && minutes < timeSinceMealContext && timeSinceMealContext === 1440) timeSinceMealContext = minutes;
        if ((sorted[j].type === 'bolus' || sorted[j].type === 'insulin') && minutes >= 0 && minutes < timeSinceBolusContext && timeSinceBolusContext === 1440) timeSinceBolusContext = minutes;
    }
    const currentIobCobRatio = (currentIob + 0.1) / (currentCob + 0.1);

    if (useLSTM) {
      try {
        const numFeatures = 13;
        let means = new Array(numFeatures).fill(0);
        let stdDevs = new Array(numFeatures).fill(1);

        const trainingDataset = dataset.slice(-250);
        const savedMeans = localStorage.getItem('glikosense_zscore_means');
        const savedStds = localStorage.getItem('glikosense_zscore_stds');
        
        if (savedMeans && savedStds) {
            means = JSON.parse(savedMeans);
            stdDevs = JSON.parse(savedStds);
        } else {
            trainingDataset.forEach(d => d.inputs.forEach((val, i) => means[i] += val));
            means.forEach((_, i) => means[i] /= (trainingDataset.length || 1));
            trainingDataset.forEach(d => d.inputs.forEach((val, i) => stdDevs[i] += Math.pow(val - means[i], 2)));
            stdDevs.forEach((_, i) => {
                stdDevs[i] = Math.sqrt(stdDevs[i] / (trainingDataset.length || 1));
                if (stdDevs[i] === 0) stdDevs[i] = 1; 
            });
            localStorage.setItem('glikosense_zscore_means', JSON.stringify(means));
            localStorage.setItem('glikosense_zscore_stds', JSON.stringify(stdDevs));
        }

        const zScoreNormalize = (inputs: number[]) => inputs.map((val, i) => (val - (means[i] || 0)) / (stdDevs[i] || 1));

        let model: tf.LayersModel;
        try {
            model = await Promise.race([
                tf.loadLayersModel('indexeddb://glikosense-lstm'),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout loading model")), 1500))
            ]) as tf.LayersModel;
            isModelLoaded = true;
            model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
        } catch(e) {
            const seqModel = tf.sequential();
            seqModel.add(tf.layers.lstm({inputShape: [1, 13], units: 24, returnSequences: false}));
            seqModel.add(tf.layers.dense({units: 16, activation: 'relu'})); 
            seqModel.add(tf.layers.dense({units: 2, activation: 'linear'}));
            seqModel.compile({ optimizer: tf.train.adam(0.005), loss: 'meanSquaredError' });
            model = seqModel;
        }

        const inputsTensor = tf.tensor3d(trainingDataset.map(d => [zScoreNormalize(d.inputs)]));
        const outputTensor = tf.tensor2d(trainingDataset.map(d => d.output));

        await model.fit(inputsTensor, outputTensor, {
            epochs: mode === 'quick' ? (isModelLoaded ? 2 : 5) : (isModelLoaded ? 5 : 15), 
            shuffle: true,
            verbose: 0
        });

        let errorSum = 0;
        tf.tidy(() => {
          const preds = model.predict(inputsTensor) as tf.Tensor;
          const predsArray = preds.dataSync();
          for(let j = 0; j < trainingDataset.length; j++) {
               errorSum += Math.abs(predsArray[j * 2] - trainingDataset[j].output[0]);
          }
        });
        avgErrorInMgDl = (errorSum / (trainingDataset.length || 1)) * 400;

        if (mode === 'full') {
          try { await model.save('indexeddb://glikosense-lstm'); } catch(err) {}
        }

        const predictValue = (mdl: tf.LayersModel, inputArr: number[]) => {
            return tf.tidy(() => {
                const pred = mdl.predict(tf.tensor3d([[inputArr]])) as tf.Tensor;
                const d = pred.dataSync();
                return [d[0], d[1]];
            });
        };

        // Prediction Loop
        let currentPredictBg = latestBg;
        let lastInPredictionBg = latestBg;
        let secondLastInPredictionBg = glucoseLogsOrig.length > 1 ? (glucoseLogsOrig[glucoseLogsOrig.length-2].value || glucoseLogsOrig[glucoseLogsOrig.length-2].bg) : latestBg;
        
        predictionCurve.push({ timestamp: latestTimeMs, offsetMs: 0, value: currentPredictBg });

        for(let step = 1; step <= 12; step++) {
            const futureTimeMs = latestTimeMs + (step * 5 * 60 * 1000);
            const { iob: fIob, cob: fCob, pob: fPob, fob: fFob } = calculateActiveAtTime(futureTimeMs, sorted);
            const fDate = new Date(futureTimeMs);
            const fHourDec = fDate.getHours() + (fDate.getMinutes() / 60);
            const fTimeSin = Math.sin((fHourDec / 24) * Math.PI * 2);
            const fTimeCos = Math.cos((fHourDec / 24) * Math.PI * 2);
            const fIsWeekend = (fDate.getDay() === 0 || fDate.getDay() === 6) ? 1 : 0;
            const fTimeSinceMeal = Math.min(1440, timeSinceMealContext + step * 5);
            const fTimeSinceBolus = Math.min(1440, timeSinceBolusContext + step * 5);
            const fIobCobRatio = (fIob + 0.1) / (fCob + 0.1);

            const cTrend = lastInPredictionBg - secondLastInPredictionBg;
            const cAcc = cTrend - (secondLastInPredictionBg - (predictionCurve.length >= 3 ? predictionCurve[predictionCurve.length-3].value : secondLastInPredictionBg));

            const inputs = zScoreNormalize([currentPredictBg, cTrend, cAcc, fCob, fIob, fTimeSin, fTimeCos, fPob, fFob, fIsWeekend, fTimeSinceMeal, fTimeSinceBolus, fIobCobRatio]);
            const nextPred = predictValue(model, inputs);
            let rawNextBg = nextPred[0] * 400;
            if (isNaN(rawNextBg) || !isFinite(rawNextBg)) rawNextBg = currentPredictBg;
            
            let bgDiff = rawNextBg - currentPredictBg;
            const maxJump = 18; 
            if (bgDiff > maxJump) bgDiff = maxJump;
            if (bgDiff < -maxJump) bgDiff = -maxJump;
            
            let nextBg = currentPredictBg + (bgDiff * 0.7); 
            
            // Aplikacja modyfikatora pogody (tylko w kierunku spadków/wzrostów w zależności od IOA)
            nextBg += weatherBgModifier;
            
            nextBg = Math.max(40, Math.min(600, nextBg));
            predictionCurve.push({ timestamp: futureTimeMs, offsetMs: step * 5 * 60 * 1000, value: nextBg });
            
            secondLastInPredictionBg = lastInPredictionBg;
            lastInPredictionBg = nextBg;
            currentPredictBg = nextBg;
        }
        predictedNextHour = currentPredictBg;

        const baseInputs = zScoreNormalize([latestBg, lastTrendNum, lastAccelerationNum, currentCob, currentIob, lastTimeSin, lastTimeCos, currentPob, currentFob, isTodayWeekend, timeSinceMealContext, timeSinceBolusContext, currentIobCobRatio]);
        const moreCarbs = [...baseInputs]; 
        // More sophisticated sensitivity estimation
        const nextPredNormal = predictValue(model, baseInputs);
        // We need to re-normalize after adding 50g
        const moreCarbsInputsRaw = [latestBg, lastTrendNum, lastAccelerationNum, currentCob + 50, currentIob, lastTimeSin, lastTimeCos, currentPob, currentFob, isTodayWeekend, timeSinceMealContext, timeSinceBolusContext, currentIobCobRatio];
        carbSensitivity = (predictValue(model, zScoreNormalize(moreCarbsInputsRaw))[0] * 400) - (nextPredNormal[0] * 400);

        const moreInsulinInputsRaw = [latestBg, lastTrendNum, lastAccelerationNum, currentCob, currentIob + 5, lastTimeSin, lastTimeCos, currentPob, currentFob, isTodayWeekend, timeSinceMealContext, timeSinceBolusContext, currentIobCobRatio];
        insulinSensitivity = (predictValue(model, zScoreNormalize(moreInsulinInputsRaw))[0] * 400) - (nextPredNormal[0] * 400);

        inputsTensor.dispose(); outputTensor.dispose(); model.dispose();
      } catch (err) {
        console.error("LSTM analysis failed, falling back", err);
        useLSTM = false;
      }
    }

    if (!useLSTM) {
      let currentPredictBg = latestBg;
      let trend = lastTrendNum;
      predictionCurve.length = 0; 
      predictionCurve.push({ timestamp: latestTimeMs, offsetMs: 0, value: currentPredictBg });
      
      for(let step = 1; step <= 12; step++) {
        const futureTimeMs = latestTimeMs + (step * 5 * 60 * 1000);
        const { iob: fIob, cob: fCob } = calculateActiveAtTime(futureTimeMs, sorted);
        const carbImpact = (fCob > currentCob ? 0 : (currentCob - fCob)) * 3.0; // was 2.5
        const insulinImpact = (fIob > currentIob ? 0 : (currentIob - fIob)) * -40.0; // was -35.0
        
        currentPredictBg += (trend * 0.92) + (carbImpact / 5) + (insulinImpact / 5);
        currentPredictBg += weatherBgModifier;
        if (isNaN(currentPredictBg) || !isFinite(currentPredictBg)) currentPredictBg = latestBg;
        trend *= 0.96; // was 0.92
        currentPredictBg = Math.max(40, Math.min(600, currentPredictBg));
        predictionCurve.push({ timestamp: futureTimeMs, offsetMs: step * 5 * 60 * 1000, value: currentPredictBg });
      }
      predictedNextHour = currentPredictBg;
    }

    const riskOfHypo = predictedNextHour < 80 || (latestBg < 100 && lastTrendNum < -3);
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

    
    const accuracyPhrases = [
        `🧠 Oparłem się o moje doświadczenie z Twoich ostatnich dni. Mój margines błędu w tej chwili to około ${Math.round(avgErrorInMgDl)} mg/dL.`,
        `🧠 Wciąż zbieram dane żeby dobrze Ci doradzać. Moje odchylenie na tę chwilę to ok. ${Math.round(avgErrorInMgDl)} mg/dL. Im więcej danych, tym mniejszy margines.`,
        `🧠 Przeanalizowałem Twoje wykresy i powoli rozumiem jak działa Twój cukier. Uśredniony błąd w moich przewidywaniach to ${Math.round(avgErrorInMgDl)} mg/dL.`
    ];
    insights.push(accuracyPhrases[Math.floor(Math.random() * accuracyPhrases.length)]);

    const predictionPhrases = [
        `🔮 Jeżeli trend się nie zmieni, w ciągu godziny powinniśmy dotrzeć do punktu około ${Math.round(predictedNextHour)} mg/dL.`,
        `🔮 Wybiegając do przodu - przewiduję, że zmierzamy w okolice ${Math.round(predictedNextHour)} mg/dL za godzinkę.`,
        `🔮 Analizując tempo, spodziewam się poziomic ok. ${Math.round(predictedNextHour)} mg/dL w ciągu 60 minut.`
    ];
    insights.push(predictionPhrases[Math.floor(Math.random() * predictionPhrases.length)]);
    
    if (weatherTemp !== null && weatherBgModifier !== 0) {
        if (weatherTemp > 25) {
            insights.push(`🌡️ Uwzględniłem upał (${weatherTemp}°C) w mojej analizie. Insulina w takich warunkach zazwyczaj działa mocniej.`);
        } else if (weatherTemp < 5) {
            insights.push(`❄️ Uwzględniłem niską temperaturę (${weatherTemp}°C). Chłód może powodować obkurczenie naczyń i wolniejsze wchłanianie insuliny.`);
        }
    }
    
    if (Math.round(currentCob) > 0 || currentIob > 0.05 || Math.round(currentPob) > 0 || Math.round(currentFob) > 0) {
        let text = `Twoje aktywne substancje w tle to teraz: `;
        const parts = [];
        if (Math.round(currentCob) > 0) parts.push(`🥪 ${Math.round(currentCob)}g węgli`);
        if (currentIob > 0.05) parts.push(`💉 ${currentIob.toFixed(1)}j insuliny`);
        if (Math.round(currentPob) > 0) parts.push(`🥩 ${Math.round(currentPob)}g białka`);
        if (Math.round(currentFob) > 0) parts.push(`🧀 ${Math.round(currentFob)}g tłuszczu`);
        text += parts.join(', ') + '.';
        insights.push(text);
    }

    if (carbSensitivity > 30) {
        insights.push(`💡 Wydaje mi się, że węglowodany dość szybko wchłaniają się teraz u Ciebie do krwi. Porcja np. 50g może mieć duży wpływ na obecny cukier!`);
    } else if (carbSensitivity > 10) {
        insights.push(`💡 To co zjadłeś, uwalnia się moim zdaniem bardzo spokojnie i bez skoków. Dobra nasza!`);
    }

    if (insulinSensitivity < -30) {
        insights.push(`💉 Masz w tym momencie podwyższoną wrażliwość na insulinę. Postaraj się delikatniej podejść do ewentualnych korekt, bo zbije Ci glikemię bardziej niż przypuszczasz!`);
    }

    // 1. Zwiększona oporność / Wysiłek fizyczny
    if (avgBias < -15) {
        insights.push(`🚨 Z moich szacunków wynika, że pomimo odpowiedniego zliczenia insuliny masz lekką oporność (byłem o ${Math.abs(Math.round(avgBias))} mg/dL w błędzie w dół). Jakieś emocje, stres, a może infekcja za rogiem?`);
    } else if (avgBias > 15) {
        insights.push(`🏃‍♂️ Bywam omylny, bo Twój cukier trzyma się niżej niż przewidywałem! Miałeś ukryty wysiłek fizyczny, czy sprzątanie, o którym mi nie powiedziałeś?`);
    }

    // 2. Efekt Brzasku
    const rules = GlikoSenseLearner.getRules();
    
    if (rules.dawnPhenomenonEnabled && lastHourDec > 2 && lastHourDec < 9 && lastTrendNum > 3) {
         insights.push(`🌅 Poranne wstawanie... Twój organizm włącza Zjawisko Brzasku. Zapisuję, że w ostatnich dniach u Ciebie to częste.`);
    } else if (lastHourDec > 3 && lastHourDec < 8 && lastTrendNum > 5 && currentCob === 0 && currentPob === 0) {
        insights.push(`🌅 Prawdopodobnie organizm budzi Cię właśnie hormonami porannymi. Tzw. zjawisko brzasku, rośniemy nawet bez jedzenia.`);
    }

    // 3. Efekt odbicia (Somogyi)
    const twoHoursAgoMs = latestTimeMs - (2 * 60 * 60 * 1000);
    const recentHypos = sorted.filter(l => (l.type === 'glucose' && (l.value || l.bg) < 70 && (l.timestamp || new Date(l.createdAt).getTime()) >= twoHoursAgoMs));
    if (rules.somogyiEnabled && recentHypos.length > 0 && lastTrendNum > 3) {
        insights.push(`🔄 Uwaga! Ostatnio miałeś hipo, więc widzę jak Twój organizm zaczął walczyć wypuszczając zapasy glukozy (tzw. efekt Somogyi). Powolnie i bez nerwów z korektami.`);
    } else if (recentHypos.length > 0 && lastTrendNum > 6) {
        insights.push(`🔄 Miałeś przed chwilą dość głęboki spadek. Ten gwałtowny wzrost to odbicie po-hipowe. Uważnie z potężną korektą, by znów nie spaść!`);
    }

    if (rules.insulinResistanceMultiplier && rules.insulinResistanceMultiplier > 1.1) {
        insights.push(`💪 W moim cenniku Twojego uodpornienia, widnieje lekka blokada na insulinę. Licz się z trochę chłodniejszą reakcją organizmu na dodane jednostki.`);
    } else if (rules.insulinResistanceMultiplier && rules.insulinResistanceMultiplier < 0.9) {
        insights.push(`📉 Moje ukryte wagi mówią, że powinieneś w najbliższym czasie być podwójnie ostrożny z dawkami. Będziesz zbijał cukier skuteczniej!`);
    }

    // 4. Nakładanie insuliny (Insulin Stacking)
    if (latestBg > 160 && currentIob > 1.5 && predictedNextHour > 160) {
        insights.push(`📉 Jest wysoko, ale uwaga! - ustrzeż się nawarstwienia insuliny, masz już zgromadzoną u siebie aktywną porcję. Wymaga to tylko chwili cierpliwości.`);
    }

    // 5. Stabilność nocna
    if ((lastHourDec > 23 || lastHourDec < 5) && Math.abs(lastTrendNum) < 3 && latestBg > 90 && latestBg < 140) {
        insights.push(`🌙 Widzę spokojną i udaną nockę. Parametry ucięte jak od sznurka do snu!`);
    }

    // 6. Rollercoaster / Zmienność (Standard Deviation i Wstęgi Bollingera)
    let varianceSum = 0;
    if (countGlucose > 10) {
        const meanGlucose = sumGlucose / countGlucose;
        logsToAnalyze.forEach(l => {
            if (l.type === 'glucose' || l.bg) {
                const val = (l.value || l.bg);
                varianceSum += Math.pow(val - meanGlucose, 2);
            }
        });
        const stdDev = Math.sqrt(varianceSum / countGlucose);
        const cv = (stdDev / meanGlucose) * 100;
        
        const bollingerUpper = Math.round(meanGlucose + (2 * stdDev));
        const bollingerLower = Math.max(40, Math.round(meanGlucose - (2 * stdDev)));

        if (latestBg > bollingerUpper && lastTrendNum > 3) {
            insights.push(`📈 Oho, poszliśmy wyżej niż zakładałem w swoich wskaźnikach stabilności! Cukier chyba poszukuje nowego miejsca żeby odpocząć, musisz zareagować.`);
        } else if (latestBg < bollingerLower && lastTrendNum < -3) {
             insights.push(`📉 Cukier zapikował ostrzej niż można by sądzić! Polecam szybko zabezpieczyć się węglowodanami byśmy się nie obudzili w gorszym miejscu.`);
        }

        if (cv > 33 && meanGlucose > 80 && countGlucose > 30) {
            insights.push(`🎢 Hej, jedziemy nieco zbyt sporym roller-coasterem. Zwróć większą uwagę na wcześniejsze podanie insuliny by ograniczyć piki po węglowodanach :)`);
        } else if (cv < 15 && countGlucose > 30) {
            insights.push(`🏆 Chciałbym Ci bardzo podziękować w imieniu organizmu - Twoje wykresy trzymają tak mało huśtawek, to powód do zadowolenia dla nas obu!`);
        }
    }

    // 7. Przekarmienie (High COB, High BG, rośnie)
    if (currentCob > 50 && latestBg > 150 && lastTrendNum > 4 && currentIob < Math.max(1, currentCob / 15)) {
         insights.push(`🚀 Ostrzegam! Zauważyłem, że masz sporo węgli zgromadzonych do zjedzenia (${Math.round(currentCob)}g), ale brak ubezpieczenia insulinowego, i idzie do góry. Działaj!`);
    }

    // 8. Ostrzeżenie o luce bazowej (Basal Gap)
    const threeHoursAgoForBasal = latestTimeMs - (3 * 60 * 60 * 1000);
    const recentMealsOrBoluses = sorted.filter(l => (l.type === 'meal' || l.type === 'bolus' || l.type === 'insulin') && (l.timestamp || new Date(l.createdAt).getTime()) >= threeHoursAgoForBasal);
    if (recentMealsOrBoluses.length === 0 && lastTrendNum > 3 && latestBg > 130 && latestBg < 200 && currentIob === 0 && currentCob === 0) {
        insights.push(`🧗 Nic nie było jedzone, nie było insuliny, a mimo to pomalutku brniemy w góry. Tzw. pusta luka - sprawdź, czy Ci lekko baza nie nawala!`);
    }

    if (currentFob > 15 || currentPob > 20) {
        insights.push(`⚠️ Mam u siebie zapisaną masę tłuszczów lub białek czekającą by się strawić! Zwracaj uwagę na ukryte wyskoki potraw za ok. 3-4 godziny - efekt pizzy wisi w powietrzu!`);
    }

    // 10. Wykrywanie zużytego wkłucia (delivery failure)
    const last4h = sorted.filter(l => (l.timestamp || new Date(l.createdAt).getTime()) > (latestTimeMs - 4 * 3600000));
    const recentBolusesIn4h = last4h.filter(l => l.type === 'bolus' || l.type === 'insulin');
    const totalRecentBolus = recentBolusesIn4h.reduce((sum, b) => sum + (b.value || b.insulin || 0), 0);
    
    if (latestBg > 200 && totalRecentBolus > 1.5 && lastTrendNum >= -1 && currentIob > 0.5) {
        // Dodatkowo sprawdź czy cukier był wysoki przez większość czasu w tych 4h mimo bolusów
        const highCounts = last4h.filter(l => (l.type === 'glucose' || l.bg) && (l.value || l.bg) > 180).length;
        const totalCounts = last4h.filter(l => l.type === 'glucose' || l.bg).length;
        
        if (highCounts > 0 && highCounts / (totalCounts || 1) > 0.8) {
            insights.push(`🚨 UWAGA! Cukier utknął wysoko i nie idzie w dół nawet przy podanych ${totalRecentBolus}j insuliny od 4 godzin. Istnieje powód by zerknąć na miejsce wkłucia, mogła wygiąć się kaniula!`);
        }
    }

    // 9. Over-bolus (Przeinsulinowanie)
    if (currentIob > 3 && latestBg < 110 && lastTrendNum < -5 && currentCob < 10) {
        insights.push(`🎯 Trend leci! Masz solidny ładunek aktywnej insuliny w ciele i ani trochę zabezpieczonych węglowodanów w żołądku. Koniecznie zjedz ok. 15g soku lub glukozy!`);
    }

    if (riskOfHypo) {
        const hypoPhrases = [
            "⚠️ Przeczucie mi mówi, że zbliża się niezłe hipo! Zjedz szybko trochę cukrów prostych tak by nie zlecieć całkiem ze skały.",
            "⚠️ Bardzo czerwone światło u mnie - potężnie wylatujesz na dół! Zaserwuj sobie łyk soku by nie pogorszyć tego wyniku.",
            "⚠️ Spadek i mały zakres! Koniecznie przerzuć zębatkę wyżej zabezpieczając te skoki odpowiednią glukozą, trzymam kciuki!"
        ];
        insights.push(hypoPhrases[Math.floor(Math.random() * hypoPhrases.length)]);
    } else if (predictedNextHour > 180) {
        const hyperPhrases = [
            "📈 Powoli wybiegamy w teren wysokich cukrów. Zorientuj się skąd to zmierza, ja mogę nie wszystkiego wiedzieć o jedzeniu by to sprowadzić z powrotem.",
            "📈 Skłaniamy się gwałtownie przed drzwiami hiperglikemii, mała poprawka da nam sporego kopa rześkości na kolejną godzinę.",
            "📈 Wydaje mi się, że ostatnio musiało wpaść troszkę niezaznaczonych słodkości... Biorąc trend w opiekę - spodziewaj się lotu powyżej linii :)"
        ];
        insights.push(hyperPhrases[Math.floor(Math.random() * hyperPhrases.length)]);
    } else {
        const normalPhrases = [
            "✨ Piękna chwila homeostazy, naprawdę warto ją celebrować, i dla takich widoków na ekranie staram się bywały zawsze!",
            "✨ Krok po kroku i mamy idealny moment równowagi... Oby tak dalej przez całą resztę dnia!",
            "✨ W tej minucie można powiedzieć jedynie brawo byczku - jest ok, żadnych niespodziewanych kłopotów na moje oko!"
        ];
        insights.push(normalPhrases[Math.floor(Math.random() * normalPhrases.length)]);
    }

    const accuracyValue = Math.max(5, Math.round(100 * Math.exp(-avgErrorInMgDl / 80)));
    const datasetSize = dataset.length;

    return {
        predictedNextHour: Math.round(predictedNextHour),
        riskOfHypo,
        insights,
        accuracy: accuracyValue,
        datasetSize,
        analyzedPeriod: mode === 'quick' ? 'Ostatnie 4h' : 'Ostatnie 14 dni',
        predictionCurve: predictionCurve.map(p => ({
            ...p,
            value: Math.round(p.value)
        })),
        metrics: {
            iob: currentIob,
            cob: currentCob,
            carbSensitivity: Math.round(carbSensitivity),
            insulinSensitivity: Math.round(insulinSensitivity),
            gmiPercentage: gmiPercentage > 0 ? parseFloat(gmiPercentage.toFixed(2)) : undefined,
            avgBias: Math.round(avgBias)
        }
    };
    };

    const analysisPromise = doAnalysis().then(res => {
      _cachedResult = res;
      _lastAnalysisTime = Date.now();
      _lastLogsFingerprint = logsFingerprint;
      
      // Zapisz do pamięci trwałej (tylko pełne wyniki)
      if (mode === 'full') {
        try {
          localStorage.setItem('glikosense_last_result_v2', JSON.stringify(res));
          localStorage.setItem('glikosense_last_fingerprint', logsFingerprint);
        } catch (e) {
          console.warn("Błąd zapisu do LocalStorage GlikoSense (możliwy brak miejsca)");
        }
      }
      
      return res;
    }).finally(() => {
      if (mode === 'full') _currentFullAnalysisPromise = null;
      else _currentQuickAnalysisPromise = null;
    });

    if (mode === 'full') _currentFullAnalysisPromise = analysisPromise;
    else _currentQuickAnalysisPromise = analysisPromise;

    return analysisPromise;
  }
}

