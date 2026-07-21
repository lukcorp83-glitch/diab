import * as tf from '@tensorflow/tfjs';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import i18n from "../i18n";

export const GlikoSenseLearner = {
  async sendTelemetry(learnedRule: string, contextString: string) {
    if (localStorage.getItem('glikosense_telemetry') === 'true') {
      try {
        await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'glikosense_training'), {
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
  learnFromGemini(analysisText: string | string[]) {
    const text = (Array.isArray(analysisText) ? analysisText.join(" ") : analysisText).toLowerCase();
    try {
      let rules = JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}');
      let changed = false;
      
      if (/insulinooporn|opornoś.*insulin|wysokie dawki|zapotrzebowanie/i.test(text)) {
        rules.insulinResistanceMultiplier = (rules.insulinResistanceMultiplier || 1.0) * 1.05;
        this.sendTelemetry("insulinResistanceMultiplier_increase", i18n.t('auto.wykryto_slowo_klucz_opornosci', { defaultValue: "Wykryto słowo-klucz oporności w raporcie AI." }));
        changed = true;
      }
      if (/zwiększona wrażliwość|wzrost wrażliwości|bardzo spada|szybki spadek/i.test(text)) {
        rules.insulinResistanceMultiplier = Math.max(0.5, (rules.insulinResistanceMultiplier || 1.0) * 0.95);
        this.sendTelemetry("insulinResistanceMultiplier_decrease", i18n.t('auto.wykryto_slowo_klucz_wrazliwosc', { defaultValue: "Wykryto słowo-klucz wrażliwości w raporcie AI." }));
        changed = true;
      }
      if (/brzask|porann.*(wzrost|hormon|wstawani)|poranne wzrosty/i.test(text)) {
        rules.dawnPhenomenonEnabled = true;
        this.sendTelemetry("dawnPhenomenonEnabled_true", i18n.t('auto.aktywowano_regule_poranna', { defaultValue: "Aktywowano regułę poranną." }));
        changed = true;
      }
      if (/somogyi|odbici.*hipo|hipo.*odbici/i.test(text)) {
        rules.somogyiEnabled = true;
        this.sendTelemetry("somogyiEnabled_true", "Aktywowano zjawisko somogyi z porad Gemini/ML.");
        changed = true;
      }
      if (/pizza|pizzy|tłust.*(posił|jedzen)|przedłużon.*wchłanian|białkowo-tłuszcz/i.test(text)) {
        rules.pizzaEffectMultiplier = 1.2;
        this.sendTelemetry("pizzaEffectMultiplier_1.2", i18n.t('auto.korekta_bazy_wchlaniania_efekt', { defaultValue: "Korekta bazy wchłaniania (Efekt Pizzy)." }));
        changed = true;
      }
      if (/bezwładność weekendowa|weekend/i.test(text)) {
        rules.weekendInertiaEnabled = true;
        this.sendTelemetry("weekendInertiaEnabled_true", "Aktywowano regułę Bezwładności Weekendowej.");
        changed = true;
      }
      if (/opóźniony spadek powysiłkowy|aktywność fizyczna|trening/i.test(text)) {
        rules.delayedExerciseEnabled = true;
        this.sendTelemetry("delayedExerciseEnabled_true", "Aktywowano regułę Opóźnionego Spadku Powysiłkowego.");
        changed = true;
      }
      if (/wrażliwość cykliczna|stres|wahania poranne/i.test(text)) {
        rules.stressSensitivityEnabled = true;
        this.sendTelemetry("stressSensitivityEnabled_true", "Aktywowano regułę Wrażliwości Cyklicznej/Stresowej.");
        changed = true;
      }
      
      if (changed || Object.keys(rules).length > 0) {
        localStorage.setItem('glikosense_medical_rules', JSON.stringify(rules));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('glikosense_rules_updated', { detail: rules }));
        }
      }
    } catch (e) {
      console.warn("GlikoSense Learner error", e);
    }
  },
  learnFromInsights(insights: string[]) {
    if (insights && insights.length > 0) {
      this.learnFromGemini(insights);
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

  analyzeData(logs: any[], force: boolean = false, mode: 'quick' | 'full' = 'full'): Promise<any> {
    const logsFingerprint = logs && logs.length > 0 
      ? `v4-lstm-${mode}-${i18n.language}-${logs.length}-${logs[0].timestamp || logs[0].createdAt}` 
      : `empty-${i18n.language}`;

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
      if (typeof window === 'undefined') {
        resolve(null);
        return;
      }
      
      // Setup Web Worker using standard URL module approach for Capacitor compatibility
      const worker = new Worker(new URL('../workers/glikosense.worker.ts', import.meta.url), { type: 'module' });
      
      // Timeout to prevent hanging if worker is killed by WebView
      const timeoutId = setTimeout(() => {
        worker.terminate();
        reject(new Error("GlikoSense Worker timeout"));
      }, mode === 'quick' ? 300000 : 600000);

      worker.onmessage = (e) => {
        const { type, payload, value, key, error } = e.data;
        if (type === 'result') {
          clearTimeout(timeoutId);
          worker.terminate();
          if (payload.learnedPkParams || payload.discoveredRules) {
             const rules = GlikoSenseLearner.getRules();
             const updated = { ...rules, ...(payload.learnedPkParams ? { pkParams: payload.learnedPkParams } : {}), ...(payload.discoveredRules || {}) };
             localStorage.setItem('glikosense_medical_rules', JSON.stringify(updated));
             if (typeof window !== 'undefined') {
               window.dispatchEvent(new CustomEvent('glikosense_rules_updated', { detail: updated }));
             }
          }
          if (payload.insights && Array.isArray(payload.insights)) {
            GlikoSenseLearner.learnFromInsights(payload.insights);
          }
          
          if (payload.riskOfHypo) {
            const hasEnoughData = !(payload.insights || []).some((i: string) => i.includes('Zbyt mało'));
            if (hasEnoughData) {
              window.dispatchEvent(new CustomEvent('glikosense_hypo_alert', { detail: payload }));
            }
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
          
          
          resolve(payload);
        } else if (type === 'storage_update') {
          localStorage.setItem(key, value);
        } else if (type === 'error') {
          clearTimeout(timeoutId);
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
      const engineMode = localStorage.getItem('glikosense_engine_mode') || 'v3_lstm';

      worker.postMessage({
        logs,
        force,
        language: i18n.language || 'pl',
        mode,
        rules,
        lastTrainTime: lastTrainTimeStr ? parseInt(lastTrainTimeStr, 10) : 0,
        datasetSizeFromStorage: datasetSizeStr ? parseInt(datasetSizeStr, 10) : 0,
        engineMode
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

