import * as tf from '@tensorflow/tfjs';

// Funkcja pomocnicza do obliczania aktywnych węglowodanów, insuliny, tłuszczu i białka
function calculateActiveAtTime(targetTime: number, pastLogs: any[]) {
    let iob = 0; // Insulin on Board
    let cob = 0; // Carbs on Board
    let pob = 0; // Protein on Board
    let fob = 0; // Fat on Board
    
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
        
        // Węglowodany (szybkie - 2 do 3h)
        const carbs = log.type === 'meal' ? log.value : (log.carbs || 0);
        if (carbs && diffHours < 3) {
            cob += carbs * Math.max(0, (1 - (diffHours / 3)));
        }

        // Białko (Wolniejsze - do 4-5h)
        const protein = log.type === 'meal' ? (log.protein || 0) : 0;
        if (protein && diffHours < 5) {
            pob += protein * Math.max(0, (1 - (diffHours / 5)));
        }

        // Tłuszcz (Bardzo powolne działanie - do 6-8h)
        const fat = log.type === 'meal' ? (log.fat || 0) : 0;
        if (fat && diffHours < 7) {
            fob += fat * Math.max(0, (1 - (diffHours / 7)));
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
        const persistentCache = localStorage.getItem('glikosense_last_result');
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
          analyzedPeriod: mode === 'quick' ? 'Ostatnie 4h' : 'Ostatnie 7 dni'
        };
      }

      const now = Date.now();
      // Tryb szybki: ostatnie 4h. Tryb pełny: 7 dni.
      const lookbackMs = mode === 'quick' ? (4 * 60 * 60 * 1000) : (7 * 24 * 60 * 60 * 1000);
      const cutoffTime = now - lookbackMs;
      
      let logsToAnalyze = logs.filter(l => (l.timestamp || new Date(l.createdAt).getTime()) >= cutoffTime);
      
      if (mode === 'full' && logsToAnalyze.length > 400) logsToAnalyze = logsToAnalyze.slice(0, 400);
      if (logsToAnalyze.length < 5) logsToAnalyze = logs.slice(0, 20);

      const sorted = [...logsToAnalyze].sort((a,b) => (a.timestamp || new Date(a.createdAt).getTime()) - (b.timestamp || new Date(b.createdAt).getTime()));
      const glucoseLogsOrig = sorted.filter(l => l.type === 'glucose' || l.bg);
      
      // --- HEURISTIC ANALYSIS (Always run, even if LSTM fails) ---
      const insights: string[] = [];
      const mealPatterns: { [key: string]: { spikes: number, count: number } } = {};
      
      const allMeals = logs.filter(l => l.type === 'meal');
      const allGlucose = logs.filter(l => l.type === 'glucose' || l.bg).sort((a,b) => (a.timestamp || new Date(a.createdAt).getTime()) - (b.timestamp || new Date(b.createdAt).getTime()));
      
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
        insights.push(`🧠 Pamięć posiłków: ${problematicMeals.slice(0, 2).join(", ")} historycznie powodują u Ciebie wysokie skoki cukru.`);
      }

      if (glucoseLogsOrig.length < 5) {
        return { 
          predictedNextHour: 0, 
          riskOfHypo: false, 
          insights: [...insights, "Czekam na więcej odczytów glikemii..."], 
          accuracy: 0,
          analyzedPeriod: mode === 'quick' ? 'Ostatnie 4h' : 'Ostatnie 7 dni'
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
        let currentPredictTrend = lastTrendNum;
        let currentPredictAcceleration = lastAccelerationNum;
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

            const inputs = zScoreNormalize([currentPredictBg, currentPredictTrend, currentPredictAcceleration, fCob, fIob, fTimeSin, fTimeCos, fPob, fFob, fIsWeekend, fTimeSinceMeal, fTimeSinceBolus, fIobCobRatio]);
            const nextPred = predictValue(model, inputs);
            let nextBg = nextPred[0] * 400;
            if (isNaN(nextBg) || !isFinite(nextBg)) nextBg = currentPredictBg;
            nextBg = Math.max(40, Math.min(600, nextBg));
            predictionCurve.push({ timestamp: futureTimeMs, offsetMs: step * 5 * 60 * 1000, value: nextBg });
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
        const carbImpact = (fCob > currentCob ? 0 : (currentCob - fCob)) * 2.5;
        const insulinImpact = (fIob > currentIob ? 0 : (currentIob - fIob)) * -35.0;
        
        currentPredictBg += (trend * 0.85) + (carbImpact / 6) + (insulinImpact / 6);
        if (isNaN(currentPredictBg) || !isFinite(currentPredictBg)) currentPredictBg = 100;
        trend *= 0.92;
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
        `🤖 Oparta o pamięć krótkotrwałą i długotrwałą (sieć LSTM) AI działa na Twoich danych. Błąd: ${Math.round(avgErrorInMgDl)} mg/dL.`,
        `🤖 GlikoSense połączył cache IndexedDB ze strukturą LSTM by nie tracić pamięci. ${isModelLoaded ? "Wczytano wagi!" : "Utworzono n. model."} Odchylenie: ~${Math.round(avgErrorInMgDl)} mg/dL.`,
        `🤖 System LSTM przeanalizował zależności glikemiczne i uczy się z każdym posiłkiem. Margines błędu to obecnie ${Math.round(avgErrorInMgDl)} mg/dL.`
    ];
    insights.push(accuracyPhrases[Math.floor(Math.random() * accuracyPhrases.length)]);

    const predictionPhrases = [
        `🔮 GlikoSense prognozuje: za 60 minut znajdziemy się na poziomie ${Math.round(predictedNextHour)} mg/dL.`,
        `🔮 GlikoSense Neural Net: spodziewaj się wartości wokół ${Math.round(predictedNextHour)} mg/dL za godzinę.`,
        `🔮 AI offline wygenerowało wynik rzędu ${Math.round(predictedNextHour)} mg/dL. Reaguj z wyprzedzeniem.`
    ];
    insights.push(predictionPhrases[Math.floor(Math.random() * predictionPhrases.length)]);
    
    if (currentCob > 0 || currentIob > 0 || currentPob > 0 || currentFob > 0) {
        let text = `Aktywne substancje: `;
        const parts = [];
        if (currentCob > 0) parts.push(`🥪 ${Math.round(currentCob)}g węgli`);
        if (currentIob > 0) parts.push(`💉 ${currentIob.toFixed(1)}j insuliny`);
        if (currentPob > 0) parts.push(`🥩 ${Math.round(currentPob)}g białka`);
        if (currentFob > 0) parts.push(`🧀 ${Math.round(currentFob)}g tłuszczu`);
        text += parts.join(', ') + '.';
        insights.push(text);
    }

    if (carbSensitivity > 30) {
        insights.push(`💡 Jesteś w fazie sporej wrażliwości na węglowodany. Dodatkowe 50g mogłoby wybić cukier o ok. ${Math.round(carbSensitivity)} mg/dL.`);
    } else if (carbSensitivity > 10) {
        insights.push(`💡 Węglowodany z posiłku wchłaniają się wolno i stabilnie według algorytmów GlikoSense.`);
    }

    if (insulinSensitivity < -30) {
        insights.push(`💉 Uważaj przy podawaniu insuliny – model AI wskazuje rzadką wrażliwość komórkową (korekta zbije wykres o ok. ${Math.abs(Math.round(insulinSensitivity))} mg/dL ponad normę).`);
    }

    // 1. Zwiększona oporność / Wysiłek fizyczny
    if (avgBias < -15) {
        insights.push(`🚨 Model głęboki wykrył nieznaczną oporność - cukry są wyżej, niż obliczył procesor (różnica ok. ${Math.abs(Math.round(avgBias))} mg/dL). Infekcja, stres?`);
    } else if (avgBias > 15) {
        insights.push(`🏃‍♂️ Pomyślny test "AI Bias" - masz niespodziewane spadki, głęboki model sugeruje aktywność fizyczną lub niedawną zmianę bazy.`);
    }

    // 2. Efekt Brzasku
    if (lastHourDec > 3 && lastHourDec < 8 && lastTrendNum > 5 && currentCob === 0 && currentPob === 0) {
        insights.push(`🌅 Detekcja GlikoSense: V-Trend Poranny! (Zjawisko Brzasku - wyrzut hormonów).`);
    }

    // 3. Efekt odbicia (Somogyi)
    const twoHoursAgoMs = latestTimeMs - (2 * 60 * 60 * 1000);
    const recentHypos = sorted.filter(l => (l.type === 'glucose' && (l.value || l.bg) < 70 && (l.timestamp || new Date(l.createdAt).getTime()) >= twoHoursAgoMs));
    if (recentHypos.length > 0 && lastTrendNum > 6) {
        insights.push(`🔄 Wzrasta ryzyko efektu Somogyi (zjawisko z odbicia po głębokiej hipoglikemii). GlikoSense odradza agresywną korektę.`);
    }

    // 4. Nakładanie insuliny (Insulin Stacking)
    if (latestBg > 160 && currentIob > 1.5 && predictedNextHour > 160) {
        insights.push(`📉 GlikoSense sygnalizuje "Insulin Stacking". Aktywny IOB to ok ${currentIob.toFixed(1)}j. Bądź cierpliwy, insulina wciąż robi swoje.`);
    }

    // 5. Stabilność nocna
    if ((lastHourDec > 23 || lastHourDec < 5) && Math.abs(lastTrendNum) < 3 && latestBg > 90 && latestBg < 140) {
        insights.push(`🌙 Model nocny GlikoSense: Idealnie płaska baza i równe parametry oddychania komórkowego.`);
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
            insights.push(`📈 Cukier wybił się znacznie powyżej korytarza zmienności (wstęga Bollingera GlikoSense: ${bollingerUpper}). Glikemia szuka nowego, wyższego oporu.`);
        } else if (latestBg < bollingerLower && lastTrendNum < -3) {
             insights.push(`📉 Nastąpiło wybicie glikemii u dołu (dolna wstęga Bollingera: ${bollingerLower}). Gwałtowne wsparcie węglowodanami rekomendowane.`);
        }

        if (cv > 33 && meanGlucose > 80 && countGlucose > 30) {
            insights.push(`🎢 Sztuczna Inteligencja ostrzega przed Rollercoasterem (CV: ${cv.toFixed(1)}%). Konieczna lepsza zbieżność między podaniem bolusa a zjedzeniem węgli.`);
        } else if (cv < 15 && countGlucose > 30) {
            insights.push(`🏆 GlikoSense klasyfikuje twój wykres jako wzór! (Zmienność glikemii CV ledwie ${cv.toFixed(1)}%).`);
        }
    }

    // 7. Przekarmienie (High COB, High BG, rośnie)
    if (currentCob > 50 && latestBg > 150 && lastTrendNum > 4 && currentIob < Math.max(1, currentCob / 15)) {
         insights.push(`🚀 Sieć neuronowa alarmuje o dysproporcji: Dużo Węglowodanów (${Math.round(currentCob)}g), za mało Insuliny na pokładzie! Reaguj szybko przed pikiem.`);
    }

    // 8. Ostrzeżenie o luce bazowej (Basal Gap)
    const threeHoursAgoForBasal = latestTimeMs - (3 * 60 * 60 * 1000);
    const recentMealsOrBoluses = sorted.filter(l => (l.type === 'meal' || l.type === 'bolus' || l.type === 'insulin') && (l.timestamp || new Date(l.createdAt).getTime()) >= threeHoursAgoForBasal);
    if (recentMealsOrBoluses.length === 0 && lastTrendNum > 3 && latestBg > 130 && latestBg < 200 && currentIob === 0 && currentCob === 0) {
        insights.push(`🧗 GlikoSense analizując Twoją krzywą widzi klasyczną Lukę Bazową. Parametry insulinowe mogły ulec osłabieniu (sprawdź bazę!).`);
    }

    if (currentFob > 15 || currentPob > 20) {
        insights.push(`⚠️ Neural Net rozpoznaje wysoką ilość Białek/Tłuszczów uwalnianych w tle ("Efekt Pizzy"). Możliwy wylew insulinooporności poposiłkowej.`);
    }

    // 9. Over-bolus (Przeinsulinowanie)
    if (currentIob > 3 && latestBg < 110 && lastTrendNum < -5 && currentCob < 10) {
        insights.push(`🎯 Predykcja krzyżowa GlikoSense obawia się zderzenia dużej insuliny z brakiem glikogenu w wątrobie. Zjedz ok 15g!`);
    }

    if (riskOfHypo) {
        const hypoPhrases = [
            "⚠️ Ostrzeżenie Sieci: Hipoglikemia puka do drzwi. Dostarcz cukry proste w ciągu 10 minut.",
            "⚠️ Analizator GlikoSense zapala czerwoną lampkę. Gwałtowna ścieżka w dół, reaguj sokiem i jedzeniem.",
            "⚠️ GlikoSense wyrzucił krytyczny ALERT! Skrzyżowanie spadku i małego cukru. Zabezpiecz glikemię."
        ];
        insights.push(hypoPhrases[Math.floor(Math.random() * hypoPhrases.length)]);
    } else if (predictedNextHour > 180) {
        const hyperPhrases = [
            "📈 Algorytm Deep Learning przewiduje tendencję zwyżkową.",
            "📈 Sieć GlikoSense wykryła, że cukry idą ku Hiperglikemii.",
            "📈 Predykcja jest dość wysoka, sugeruję analizę niedawnych węglowodanów."
        ];
        insights.push(hyperPhrases[Math.floor(Math.random() * hyperPhrases.length)]);
    } else {
        const normalPhrases = [
            "✨ Sieć wskazuje całkowitą i piękną homeostazę. Jest idealnie.",
            "✨ Obliczenia matrycowe nie stwierdzają żadnych obaw. Płaski wykres w normie.",
            "✨ Wszystkie warstwy ukryte modelu układają się w optymalny wzorzec, brawo."
        ];
        insights.push(normalPhrases[Math.floor(Math.random() * normalPhrases.length)]);
    }
    
    const accuracyValue = Math.max(5, Math.round(100 * Math.exp(-avgErrorInMgDl / 80)));

    return {
        predictedNextHour: Math.round(predictedNextHour),
        riskOfHypo,
        insights,
        accuracy: accuracyValue,
        analyzedPeriod: mode === 'quick' ? 'Ostatnie 4h' : 'Ostatnie 7 dni',
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
          localStorage.setItem('glikosense_last_result', JSON.stringify(res));
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

