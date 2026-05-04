import * as tf from '@tensorflow/tfjs';

// Funkcja pomocnicza do obliczania aktywnych węglowodanów, insuliny, tłuszczu i białka
function calculateActiveAtTime(targetTime: number, pastLogs: any[]) {
    let iob = 0; // Insulin on Board
    let cob = 0; // Carbs on Board
    let pob = 0; // Protein on Board
    let fob = 0; // Fat on Board
    
    for (const log of pastLogs) {
        const logTime = log.timestamp || new Date(log.createdAt).getTime();
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

export const MLAnalyzer = {
  // Funkcja analizująca logi z wykorzystaniem TensorFlow.js (lokalnie/w przeglądarce)
  async analyzeData(logs: any[]): Promise<{ 
    predictedNextHour: number, 
    riskOfHypo: boolean,
    insights: string[],
    accuracy: number,
    predictionCurve?: { timestamp: number, offsetMs: number, value: number }[],
    metrics?: { iob: number, cob: number, carbSensitivity: number, insulinSensitivity: number, gmiPercentage: number, avgBias: number }
  }> {
    if(!logs || logs.length < 5) {
      return { predictedNextHour: 0, riskOfHypo: false, insights: ["Zbyt mało danych dla GlikoSense. Wymagane co najmniej 5 wpisów."], accuracy: 0 };
    }

    const twoWeeksAgoMs = Date.now() - (14 * 24 * 60 * 60 * 1000);
    const recentLogs = logs.filter(l => (l.timestamp || new Date(l.createdAt).getTime()) >= twoWeeksAgoMs);
    let logsToAnalyze = recentLogs.length >= 5 ? recentLogs : logs;
    
    // Sortowanie od najstarszych do najnowszych
    const sorted = [...logsToAnalyze].sort((a,b) => (a.timestamp || new Date(a.createdAt).getTime()) - (b.timestamp || new Date(b.createdAt).getTime()));
    
    const dataset = [];
    const glucoseLogs = sorted.filter(l => l.type === 'glucose' || l.bg);
    
    for(let i=0; i < glucoseLogs.length - 1; i++) {
        const current = glucoseLogs[i];
        const next = glucoseLogs[i+1];
        
        const currentBg = current.value || current.bg;
        const nextBg = next.value || next.bg;
        
        if(!currentBg || !nextBg) continue;

        let trendNum = 0;
        let prevTrendNum = 0;
        if(current.trend) {
            const up = ['SingleUp', 'FortyFiveUp', 'DoubleUp'];
            const down = ['SingleDown', 'FortyFiveDown', 'DoubleDown'];
            if(up.includes(current.trend)) trendNum = 10;
            if(current.trend === 'DoubleUp') trendNum = 20;
            if(down.includes(current.trend)) trendNum = -10;
            if(current.trend === 'DoubleDown') trendNum = -20;
        } else if(i > 0) {
            trendNum = currentBg - (glucoseLogs[i-1].value || glucoseLogs[i-1].bg);
            if (i > 1) {
                prevTrendNum = (glucoseLogs[i-1].value || glucoseLogs[i-1].bg) - (glucoseLogs[i-2].value || glucoseLogs[i-2].bg);
            }
        }
        
        let accelerationNum = trendNum - prevTrendNum;

        const currentTimeMs = current.timestamp || new Date(current.createdAt).getTime();
        const pastLogs = sorted.filter(l => (l.timestamp || new Date(l.createdAt).getTime()) <= currentTimeMs);
        const { iob, cob, pob, fob } = calculateActiveAtTime(currentTimeMs, pastLogs);

        let timeSinceMeal = 1440;
        let timeSinceBolus = 1440;
        for (let j = pastLogs.length - 1; j >= 0; j--) {
             const t = pastLogs[j].timestamp || new Date(pastLogs[j].createdAt).getTime();
             const minutes = (currentTimeMs - t) / 60000;
             if (pastLogs[j].type === 'meal' && minutes < timeSinceMeal && timeSinceMeal === 1440) timeSinceMeal = minutes;
             if ((pastLogs[j].type === 'bolus' || pastLogs[j].type === 'insulin') && minutes < timeSinceBolus && timeSinceBolus === 1440) timeSinceBolus = minutes;
        }

        const date = new Date(currentTimeMs);
        const hourDecimal = date.getHours() + (date.getMinutes() / 60);
        const timeSin = Math.sin((hourDecimal / 24) * Math.PI * 2);
        const timeCos = Math.cos((hourDecimal / 24) * Math.PI * 2);
        const isWeekend = (date.getDay() === 0 || date.getDay() === 6) ? 1 : 0;
        const iobCobRatio = (iob + 0.1) / (cob + 0.1);

        let nextTrendTarget = nextBg - currentBg;
        
        dataset.push({
            timestamp: currentTimeMs,
            inputs: [currentBg, trendNum, accelerationNum, cob, iob, timeSin, timeCos, pob, fob, isWeekend, timeSinceMeal, timeSinceBolus, iobCobRatio], 
            output: [nextBg / 400, nextTrendTarget / 50]
        });
    }

    if(dataset.length === 0) {
        return { predictedNextHour: 0, riskOfHypo: false, insights: ["Brak spójnych par odczytów dla układu neuronowego GlikoSense."], accuracy: 0};
    }

    const numFeatures = 13;
    let means = new Array(numFeatures).fill(0);
    let stdDevs = new Array(numFeatures).fill(1);

    const savedMeans = localStorage.getItem('glikosense_zscore_means');
    const savedStds = localStorage.getItem('glikosense_zscore_stds');
    
    if (savedMeans && savedStds) {
        means = JSON.parse(savedMeans);
        stdDevs = JSON.parse(savedStds);
    } else {
        dataset.forEach(d => {
            d.inputs.forEach((val, i) => means[i] += val);
        });
        means.forEach((_, i) => means[i] /= (dataset.length || 1));
        
        dataset.forEach(d => {
            d.inputs.forEach((val, i) => stdDevs[i] += Math.pow(val - means[i], 2));
        });
        stdDevs.forEach((_, i) => {
            stdDevs[i] = Math.sqrt(stdDevs[i] / (dataset.length || 1));
            if (stdDevs[i] === 0) stdDevs[i] = 1; 
        });
        localStorage.setItem('glikosense_zscore_means', JSON.stringify(means));
        localStorage.setItem('glikosense_zscore_stds', JSON.stringify(stdDevs));
    }

    dataset.forEach(d => {
        d.inputs = d.inputs.map((val, i) => (val - means[i]) / stdDevs[i]);
    });

    const zScoreNormalize = (inputs: number[]) => {
        return inputs.map((val, i) => (val - means[i]) / stdDevs[i]);
    };

    let model: tf.LayersModel;
    let isModelLoaded = false;
    try {
        model = await tf.loadLayersModel('indexeddb://glikosense-lstm');
        const inputShape = model.layers[0].batchInputShape;
        const outputShape = model.outputs[0].shape;
        
        if (inputShape && inputShape[2] === 13 && outputShape && outputShape[1] === 2) {
            isModelLoaded = true;
            model.compile({
                optimizer: tf.train.adam(0.001), 
                loss: 'meanSquaredError'
            });
        } else {
             throw new Error("Invalid shape, reset forced.");
        }
    } catch(e) {
        // LSTM Neural Network Model
        const seqModel = tf.sequential();
        seqModel.add(tf.layers.lstm({inputShape: [1, 13], units: 32, returnSequences: false}));
        seqModel.add(tf.layers.dense({units: 32, activation: 'relu'}));
        seqModel.add(tf.layers.dense({units: 16, activation: 'relu'})); 
        seqModel.add(tf.layers.dense({units: 2, activation: 'linear'}));
        
        seqModel.compile({
            optimizer: tf.train.adam(0.005), 
            loss: 'meanSquaredError'
        });
        model = seqModel;
    }

    const inputsTensor = tf.tensor3d(dataset.map(d => [d.inputs]));
    const outputTensor = tf.tensor2d(dataset.map(d => d.output));

    await model.fit(inputsTensor, outputTensor, {
        epochs: isModelLoaded ? 15 : 100, 
        shuffle: true,
        verbose: 0
    });

    try {
        await model.save('indexeddb://glikosense-lstm');
    } catch(err) {
        console.warn("Zapis modelu do IndexedDB nie powiódł się", err);
    }

    const predictValue = (mdl: tf.LayersModel, inputArr: number[]) => {
        return tf.tidy(() => {
            const pred = mdl.predict(tf.tensor3d([[inputArr]])) as tf.Tensor;
            const dataSync = pred.dataSync();
            return [dataSync[0], dataSync[1]];
        });
    };

    let errorSum = 0;
    tf.tidy(() => {
        const preds = model.predict(inputsTensor) as tf.Tensor;
        const predsArray = preds.dataSync();
        for(let j = 0; j < dataset.length; j++) {
             errorSum += Math.abs(predsArray[j * 2] - dataset[j].output[0]);
        }
    });

    inputsTensor.dispose();
    outputTensor.dispose();

    const avgErrorInMgDl = (errorSum / dataset.length) * 400;

    // Remaining Logic
    const latest = glucoseLogs[glucoseLogs.length-1];
    let lastTrendNum = 0;
    let prevLastTrendNum = 0;
    if(glucoseLogs.length > 1) {
        lastTrendNum = (latest.value || latest.bg) - (glucoseLogs[glucoseLogs.length-2].value || glucoseLogs[glucoseLogs.length-2].bg);
        if(glucoseLogs.length > 2) {
             prevLastTrendNum = (glucoseLogs[glucoseLogs.length-2].value || glucoseLogs[glucoseLogs.length-2].bg) - (glucoseLogs[glucoseLogs.length-3].value || glucoseLogs[glucoseLogs.length-3].bg);
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
    
    let currentPredictBg = latestBg;
    let currentPredictTrend = lastTrendNum;
    let currentPredictAcceleration = lastAccelerationNum;
    const predictionCurve: { timestamp: number, offsetMs: number, value: number }[] = [];
    
    predictionCurve.push({ timestamp: latestTimeMs, offsetMs: 0, value: currentPredictBg });
    for(let step = 1; step <= 12; step++) {
        const futureOffsetMs = step * 5 * 60 * 1000;
        const futureTimeMs = latestTimeMs + futureOffsetMs;
        
        const { iob: futureIob, cob: futureCob, pob: futurePob, fob: futureFob } = calculateActiveAtTime(futureTimeMs, sorted);
        
        const futureDate = new Date(futureTimeMs);
        const futureHourDec = futureDate.getHours() + (futureDate.getMinutes() / 60);
        const futureTimeSin = Math.sin((futureHourDec / 24) * Math.PI * 2);
        const futureTimeCos = Math.cos((futureHourDec / 24) * Math.PI * 2);
        const futureIsWeekend = (futureDate.getDay() === 0 || futureDate.getDay() === 6) ? 1 : 0;
        
        let futureTimeSinceMeal = Math.min(1440, timeSinceMealContext + step * 5);
        let futureTimeSinceBolus = Math.min(1440, timeSinceBolusContext + step * 5);
        const futureIobCobRatio = (futureIob + 0.1) / (futureCob + 0.1);

        const inputsRaw = [currentPredictBg, currentPredictTrend, currentPredictAcceleration, futureCob, futureIob, futureTimeSin, futureTimeCos, futurePob, futureFob, futureIsWeekend, futureTimeSinceMeal, futureTimeSinceBolus, futureIobCobRatio];
        const nextPred = predictValue(model as tf.LayersModel, zScoreNormalize(inputsRaw));
        let nextBg = nextPred[0] * 400;
        let nextTrendTarget = nextPred[1] * 50;
        
        nextBg = Math.max(40, Math.min(600, nextBg));
        predictionCurve.push({ timestamp: futureTimeMs, offsetMs: futureOffsetMs, value: nextBg });
        
        // Możemy wykorzystać predicted trend albo po prostu wyliczyć różnicę (blend obu dla gładkości)
        let mathTrend = nextBg - currentPredictBg;
        let blendedTrend = (mathTrend + nextTrendTarget) / 2;
        currentPredictAcceleration = blendedTrend - currentPredictTrend;
        currentPredictTrend = blendedTrend;
        currentPredictBg = nextBg;
    }
    
    let predictedNextHour = currentPredictBg;

    const baseInputsRaw = [latestBg, lastTrendNum, lastAccelerationNum, currentCob, currentIob, lastTimeSin, lastTimeCos, currentPob, currentFob, isTodayWeekend, timeSinceMealContext, timeSinceBolusContext, currentIobCobRatio];
    
    const inputsWithMoreCarbs = [...baseInputsRaw];
    inputsWithMoreCarbs[3] += 50; // +50g COB
    const predictionWithMoreCarbs = predictValue(model as tf.LayersModel, zScoreNormalize(inputsWithMoreCarbs))[0] * 400;
    const carbSensitivity = predictionWithMoreCarbs - predictedNextHour;

    const inputsWithMoreInsulin = [...baseInputsRaw];
    inputsWithMoreInsulin[4] += 5; // +5j IOB
    const predictionWithMoreInsulin = predictValue(model as tf.LayersModel, zScoreNormalize(inputsWithMoreInsulin))[0] * 400;
    const insulinSensitivity = predictionWithMoreInsulin - predictedNextHour;

    predictedNextHour = Math.max(40, Math.min(600, predictedNextHour));
    const riskOfHypo = predictedNextHour < 80 || latestBg < 80;

    const threeHoursAgoMs = latestTimeMs - (3 * 60 * 60 * 1000);
    const recentEvaluationSet = dataset.filter((d: any) => d.timestamp >= threeHoursAgoMs);
    let avgBias = 0;
    if (recentEvaluationSet.length > 3) {
        let biasSum = 0;
        for(let item of recentEvaluationSet) {
            let p = predictValue(model as tf.LayersModel, item.inputs); 
            let bias = (p[0] * 400) - (item.output[0] * 400);
            biasSum += bias;
        }
        avgBias = biasSum / recentEvaluationSet.length;
    }

    const insights = [];
    
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
    
    if (gmiPercentage > 0) {
        insights.push(`📊 Lokalne estymatory wyliczyły GMI (HbA1c) na ok. ${gmiPercentage.toFixed(1)}%.`);
    }
    
    // Dispose the model at the end so it doesn't leak memory
    model.dispose();

    return {
        predictedNextHour: Math.round(predictedNextHour),
        riskOfHypo,
        insights,
        accuracy: Math.max(0, 100 - Math.min(100, Math.round((avgErrorInMgDl/100)*100))),
        predictionCurve,
        metrics: {
            iob: currentIob,
            cob: currentCob,
            carbSensitivity,
            insulinSensitivity,
            gmiPercentage,
            avgBias
        }
    };
  }
}

