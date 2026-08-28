import { PredictionAccuracyTracker } from '../lib/predictionAccuracyTracker';
﻿import * as tf from '@tensorflow/tfjs';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import i18n from "../i18n";

export const GlikoSenseLearner = {
  async sendTelemetry(learnedRule: string, contextString: string) {
    if (localStorage.getItem('glikosense_telemetry') === 'true') {
      try {
        await addDoc(collection(db, 'glikosense_training'), {
          ruleLearned: learnedRule,
          context: contextString,
          timestamp: serverTimestamp(),
          source: 'GlikoSense Client',
          model: 'v3.0.0-lstm'
        });
        console.log(i18n.t('auto.glikosense_anonimowe_dane_o_uc', { defaultValue: i18n.t('auto.glikosense_anonimowe_dane', { defaultValue: "GlikoSense: Anonimowe dane o uczeniu wysłane z powodzeniem." }) }));
      } catch (e) {
        console.warn(i18n.t('auto.glikosense_blad_wysylania_tele', { defaultValue: i18n.t('auto.glikosense_blad_wysylania', { defaultValue: "GlikoSense: Błąd wysyłania telemetrii" }) }), e);
      }
    }
  },
  learnFromGemini(analysisText: string) {
    const text = analysisText.toLowerCase();
    try {
      let rules = JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}');
      
      if (text.includes(i18n.t('auto.insulinoopornosc', { defaultValue: i18n.t('auto.insulinoopornosc', { defaultValue: "insulinooporność" }) })) || text.includes(i18n.t('auto.opornosc_na_insuline', { defaultValue: i18n.t('auto.opornosc_na_insuline', { defaultValue: "oporność na insulinę" }) })) || text.includes('wysokie dawki')) {
        rules.insulinResistanceMultiplier = (rules.insulinResistanceMultiplier || 1.0) * 1.05;
        this.sendTelemetry("insulinResistanceMultiplier_increase", i18n.t('auto.wykryto_slowo_klucz_opornosci', { defaultValue: i18n.t('auto.wykryto_slowo_klucz_oporn', { defaultValue: "Wykryto słowo-klucz oporności w raporcie AI." }) }));
      }
      if (text.includes(i18n.t('auto.zwiekszona_wrazliwosc', { defaultValue: i18n.t('auto.zwiekszona_wrazliwosc', { defaultValue: "zwiększona wrażliwość" }) })) || text.includes('bardzo spada') || text.includes('szybki spadek')) {
        rules.insulinResistanceMultiplier = Math.max(0.5, (rules.insulinResistanceMultiplier || 1.0) * 0.95);
        this.sendTelemetry("insulinResistanceMultiplier_decrease", i18n.t('auto.wykryto_slowo_klucz_wrazliwosc', { defaultValue: i18n.t('auto.wykryto_slowo_klucz_wrazl', { defaultValue: "Wykryto słowo-klucz wrażliwości w raporcie AI." }) }));
      }
      if (text.includes('brzask') || text.includes('wzrosty poranne')) {
        rules.dawnPhenomenonEnabled = true;
        this.sendTelemetry("dawnPhenomenonEnabled_true", i18n.t('auto.aktywowano_regule_poranna', { defaultValue: i18n.t('auto.aktywowano_regule_poranna', { defaultValue: "Aktywowano regułę poranną." }) }));
      }
      if (text.includes('somogyi') || text.includes('odbicie po hipo')) {
        rules.somogyiEnabled = true;
        this.sendTelemetry("somogyiEnabled_true", "Aktywowano zjawisko somogyi z porad Gemini.");
      }
      if (text.includes('pizza') || text.includes(i18n.t('auto.tluste_posilki', { defaultValue: i18n.t('auto.tluste_posilki', { defaultValue: "tłuste posiłki" }) })) || text.includes(i18n.t('auto.przedluzone_wchlanianie', { defaultValue: i18n.t('auto.przedluzone_wchlanianie', { defaultValue: "przedłużone wchłanianie" }) }))) {
        rules.pizzaEffectMultiplier = 1.2;
        this.sendTelemetry("pizzaEffectMultiplier_1.2", i18n.t('auto.korekta_bazy_wchlaniania_efekt', { defaultValue: i18n.t('auto.korekta_bazy_wchlaniania', { defaultValue: "Korekta bazy wchłaniania (Efekt Pizzy)." }) }));
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

let _currentFullAnalysisPromise: Promise<any> | null = null;
let _currentQuickAnalysisPromise: Promise<any> | null = null;
let _cachedResult: any = null;
let _lastLogsFingerprint: string | null = null;

export const MLAnalyzer = {
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  },

  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes.buffer;
  },

  async exportCurrentModel(): Promise<{ modelTopology: any, weightSpecs: any, weightDataB64: string, timestamp: number } | null> {
    try {
      let model;
      try {
        model = await tf.loadLayersModel('indexeddb://glikosense-lstm-v5');
      } catch (e) {
        return null;
      }
      
      let exportedArtifacts: tf.io.ModelArtifacts | null = null;
      await model.save({
        save: async (artifacts) => {
          exportedArtifacts = artifacts;
          return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
        }
      });

      if (!exportedArtifacts) return null;

      const weightDataB64 = exportedArtifacts.weightData ? this.arrayBufferToBase64(exportedArtifacts.weightData) : "";
      return {
        modelTopology: exportedArtifacts.modelTopology || null,
        weightSpecs: exportedArtifacts.weightSpecs || null,
        weightDataB64,
        timestamp: Date.now()
      };
    } catch (err) {
      console.error("Failed to export GlikoSense model", err);
      throw err;
    }
  },

  async importModelFromBackup(backup: { modelTopology: any, weightSpecs: any, weightDataB64: string, datasetSize?: number }): Promise<boolean> {
    try {
      if (!backup || !backup.modelTopology || !backup.weightSpecs || !backup.weightDataB64) {
        throw new Error("Invalid backup data format.");
      }
      
      const topoString = JSON.stringify(backup.modelTopology);
      if (!topoString.includes('LSTM') && !topoString.includes('lstm')) {
        console.error("Backup model is not an LSTM model. Refusing to restore to avoid shape mismatch.");
        return false;
      }
      
      const weightData = this.base64ToArrayBuffer(backup.weightDataB64);
      const artifacts: tf.io.ModelArtifacts = {
        modelTopology: backup.modelTopology,
        weightSpecs: backup.weightSpecs,
        weightData: weightData,
      };

      const loadedModel = await tf.loadLayersModel({ load: async () => artifacts });
      await loadedModel.save('indexeddb://glikosense-lstm-v5');
      
      if (backup.datasetSize) localStorage.setItem('glikosense_dataset_size', backup.datasetSize.toString());
      localStorage.setItem('glikosense_last_train_time', Date.now().toString());
      
      _cachedResult = null;
      _lastLogsFingerprint = null;
      
      console.log(i18n.t('auto.glikosense_pomyslnie_przywroco', { defaultValue: i18n.t('auto.glikosense_pomyslnie_przy', { defaultValue: "GlikoSense: Pomyślnie przywrócono model (LSTM) z kopii zapasowej." }) }));
      return true;
    } catch (err) {
      console.error("Failed to import GlikoSense model", err);
      throw err;
    }
  },

    async runHindsightVerification(logs: any[]) {
      try {
        if (!logs || logs.length < 200) return;
        const now = Date.now();
        const cutoffTime = now - 60 * 60 * 1000;
        const pastLogs = logs.filter(l => {
          const t = l.timestamp || new Date(l.createdAt).getTime();
          return t < cutoffTime;
        });
        if (pastLogs.length < 200) return;
        
        // Ciche wywołanie w trybie 'quick' na danych sprzed 1h
        const result = await this.analyzeData(pastLogs, true, 'quick');
        if (result && result.predictedNextHour) {
          const historyStr = localStorage.getItem('glikosense_prediction_history_v1') || '[]';
          const history = JSON.parse(historyStr);
          history.push({
            id: `hindsight_${now}`,
            predictedAt: cutoffTime,
            targetTime: now,
            predictedBg: Math.round(result.predictedNextHour),
          });
          if (history.length > 50) history.shift();
          localStorage.setItem('glikosense_prediction_history_v1', JSON.stringify(history));
          
          PredictionAccuracyTracker.evaluateHistoryWithLogs(logs);
        }
      } catch (e) {
        // Cicha porażka
      }
    },

  analyzeData(logs: any[], force: boolean = false, mode: 'quick' | 'full' = 'full'): Promise<any> {
    const currentEngine = typeof window !== 'undefined' ? localStorage.getItem('glikosense_engine_mode') || 'v3_lstm' : 'v3_lstm';
    const logsFingerprint = logs && logs.length > 0 
      ? `gliko-${currentEngine}-${mode}-${i18n.language}-${logs.length}-${logs[0].timestamp || logs[0].createdAt}` 
      : `empty-${currentEngine}-${i18n.language}`;

    if (!force) {
      if (_cachedResult && _lastLogsFingerprint === logsFingerprint) {
        return Promise.resolve(_cachedResult);
      }
      
      if (mode === 'full') {
        const persistentCache = localStorage.getItem('glikosense_last_result_v5_lstm');
        const persistentFingerprint = localStorage.getItem('glikosense_last_fingerprint_v5');
        if (persistentCache && persistentFingerprint === logsFingerprint) {
          try {
            const parsed = JSON.parse(persistentCache);
            _cachedResult = parsed;
            _lastLogsFingerprint = logsFingerprint;
            return Promise.resolve(parsed);
          } catch (e) {
            console.warn(i18n.t('auto.blad_odczytu_cache_glikosense', { defaultValue: i18n.t('auto.blad_odczytu_cache_glikos', { defaultValue: "Błąd odczytu cache GlikoSense" }) }));
          }
        }
      }
    }

    if (mode === 'full' && _currentFullAnalysisPromise) return _currentFullAnalysisPromise;
    if (mode === 'quick' && _currentQuickAnalysisPromise) return _currentQuickAnalysisPromise;

    const analysisPromise = new Promise((resolve, reject) => {
      // Setup Web Worker using standard URL module approach for Capacitor compatibility
      const worker = new Worker(new URL('../workers/glikosense.worker.ts', import.meta.url), { type: 'module' });
      
      // Timeout to prevent hanging if worker is killed by WebView
      const timeoutId = setTimeout(() => {
        worker.terminate();
        reject(new Error("GlikoSense Worker timeout"));
      }, mode === 'quick' ? 15000 : 45000);

      worker.onmessage = (e) => {
        clearTimeout(timeoutId);
        const { type, payload, value, key, error } = e.data;
        if (type === 'result') {
          worker.terminate();
          if (payload.learnedPkParams) {
             const rules = GlikoSenseLearner.getRules();
             rules.pkParams = payload.learnedPkParams;
             localStorage.setItem('glikosense_medical_rules', JSON.stringify(rules));
          }
          
          if (payload.predictedNextHour) {
            try {
              PredictionAccuracyTracker.recordPrediction(payload.predictedNextHour, Date.now() + 60 * 60 * 1000);
            } catch(e) {}
          }
          
          if (payload.riskOfHypo) {
            const hasEnoughData = !(payload.insights || []).some((i: string) => i.includes('Zbyt mało'));
            const latestBg = payload.predictionCurve?.[0]?.value || 0;
            const trough = payload.predictedTrough?.value || 100;
            const pred1h = payload.predictedNextHour || 100;
            const isGenuineHypoRisk = (latestBg <= 130 || (payload.metrics?.iob || 0) > 2.5) && (trough < 80 || pred1h < 80);

            if (hasEnoughData && isGenuineHypoRisk) {
              window.dispatchEvent(new CustomEvent('glikosense_hypo_alert', { detail: payload }));
            }
          }
          
          if (payload.nutriProfile) {
            try {
              localStorage.setItem('glikosense_nutri_profile', JSON.stringify(payload.nutriProfile));
              window.dispatchEvent(new CustomEvent('glikosense_nutri_update', { detail: payload.nutriProfile }));
            } catch(e) {}
          }
          
          // Persistent Brain: save valid insights, restore if missing data
          const hasEnoughData = !(payload.insights || []).some((i: string) => i.includes('Zbyt mało'));
          if (hasEnoughData && payload.insights?.length > 0) {
             localStorage.setItem('glikosense_memorized_insights', JSON.stringify(payload.insights));
          } else {
             const memorized = localStorage.getItem('glikosense_memorized_insights');
             if (memorized) {
                try {
                   const parsed = JSON.parse(memorized);
                   if (Array.isArray(parsed) && parsed.length > 0) {
                      payload.insights = [...(payload.insights || []), ...parsed];
                   }
                } catch(e) {}
             }
          }
          
          if (payload && payload.discoveredRules && typeof window !== 'undefined') {
            try {
              const existingRules = JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}');
              const merged = { ...existingRules, ...payload.discoveredRules };
              localStorage.setItem('glikosense_medical_rules', JSON.stringify(merged));
            } catch (e) {}
          }

          resolve(payload);
        } else if (type === 'storage_update') {
          localStorage.setItem(key, value);
        } else if (type === 'error') {
          worker.terminate();
          console.error("GlikoSense Worker Error:", error);
          reject(new Error(error));
        }
      };
      
      worker.onerror = (err) => {
        clearTimeout(timeoutId);
        worker.terminate();
        console.error("GlikoSense Worker runtime error:", err);
        reject(err);
      };

      const rules = GlikoSenseLearner.getRules();
      const lastTrainTimeStr = localStorage.getItem('glikosense_last_train_time');
      const datasetSizeStr = localStorage.getItem('glikosense_dataset_size');
        const engineModeStr = localStorage.getItem('glikosense_engine_mode');

      worker.postMessage({
        logs,
        force,
        language: i18n.language || 'pl',
          engineMode: engineModeStr || 'v3_lstm',
        mode,
        rules,
        lastTrainTime: lastTrainTimeStr ? parseInt(lastTrainTimeStr, 10) : 0,
        datasetSizeFromStorage: datasetSizeStr ? parseInt(datasetSizeStr, 10) : 0
      });
    }).then((res: any) => {
      _cachedResult = res;
      _lastLogsFingerprint = logsFingerprint;
      
      if (mode === 'full') {
        try {
          localStorage.setItem('glikosense_last_result_v5_lstm', JSON.stringify(res));
          localStorage.setItem('glikosense_last_fingerprint_v5', logsFingerprint);
        } catch (e) {
          console.warn(i18n.t('auto.blad_zapisu_do_localstorage_gl', { defaultValue: i18n.t('auto.blad_zapisu_do_localstora', { defaultValue: "Błąd zapisu do LocalStorage GlikoSense" }) }), e);
        }
      }
      return res;
    }).catch((err) => {
      console.warn("GlikoSense Worker analysis failed, using fallback:", err?.message || err);
      if (_cachedResult) return _cachedResult;
      const persistentCache = localStorage.getItem('glikosense_last_result_v5_lstm');
      if (persistentCache) {
        try { return JSON.parse(persistentCache); } catch(e) {}
      }
      return { predictedNextHour: 0, predictedNext2Hours: 0, riskOfHypo: false, insights: [], accuracy: 0, datasetSize: logs.length };
    }).finally(() => {
      if (mode === 'full') _currentFullAnalysisPromise = null;
      else _currentQuickAnalysisPromise = null;
    });

    if (mode === 'full') _currentFullAnalysisPromise = analysisPromise;
    else _currentQuickAnalysisPromise = analysisPromise;

    return analysisPromise;
  }
};

declare global {
  interface Window {
    glikosenseExportModel: () => Promise<string | null>;
    glikosenseImportModel: (backupJson: string) => Promise<boolean>;
    glikosenseHasModel: () => Promise<boolean>;
  }
}

if (typeof window !== 'undefined') {
  window.glikosenseExportModel = async () => {
    try {
      const modelData = await MLAnalyzer.exportCurrentModel();
      return modelData ? JSON.stringify(modelData) : null;
    } catch (e) { return null; }
  };
  window.glikosenseImportModel = async (backupJson: string) => {
    try {
      const data = JSON.parse(backupJson);
      return await MLAnalyzer.importModelFromBackup(data);
    } catch (e) { return false; }
  };
  window.glikosenseHasModel = async () => {
    try {
      const loaded = await tf.loadLayersModel('indexeddb://glikosense-lstm-v5');
      return !!loaded;
    } catch (e) { return false; }
  };
}


