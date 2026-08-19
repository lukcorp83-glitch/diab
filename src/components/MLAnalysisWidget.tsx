import { PredictionAccuracyTracker, AccuracyStats } from '../lib/predictionAccuracyTracker';
﻿import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLogsStore } from "../stores/useLogsStore";
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Activity, AlertTriangle, TrendingUp, TrendingDown, Target, Loader2, RefreshCw, Zap, Sparkles, CalendarDays, Syringe, Cloud, CloudUpload, CloudDownload, Info, ShieldAlert, CheckSquare, Square, Trash2, Bot, Settings, Wind, ChevronDown, ChevronUp, Dna, Fingerprint } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { LogEntry, UserSettings } from '../types';
import { MLAnalyzer } from '../services/mlSugarAnalyzer';
import { detectIsfChanges, AutoTunerResult } from '../services/isfAutoTuner';
import { cn, getEffectiveUid } from '../lib/utils';
import GlikoSenseIcon from './GlikoSenseIcon';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface MLAnalysisWidgetProps {
 settings?: UserSettings;
 user?: any;
 setTab?: (tab: string) => void;
}

enum OperationType {
 CREATE = 'create',
 UPDATE = 'update',
 DELETE = 'delete',
 LIST = 'list',
 GET = 'get',
 WRITE = 'write',
}

export default function MLAnalysisWidget({ settings, user, setTab }: MLAnalysisWidgetProps) {
 const logs = useLogsStore((state) => state.logs);
 const { t } = useTranslation();
 const glassmorphismEnabled = settings?.glassmorphismEnabled || false;
  const [engineMode, setEngineMode] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('glikosense_engine_mode') || 'v3_lstm' : 'v3_lstm');
  const [autoTuningEnabled, setAutoTuningEnabled] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('glikosense_autotuning') === 'true' : false);
  const [autoTunerResult, setAutoTunerResult] = useState<AutoTunerResult | null>(null);
  const glikoName = engineMode === 'v4_tcn' ? 'GlikoSense 4.0' : 'GlikoSense 3.0';
  const [showEngineSettings, setShowEngineSettings] = useState(false);
 const [isAnalyzing, setIsAnalyzing] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [mlResult, setMlResult] = useState<{
 predictedNextHour: number,
 predictedNext2Hours: number,
 riskOfHypo: boolean,
 insights: string[],
 accuracy: number,
 datasetSize?: number,
 predictionCurve?: { timestamp: number, offsetMs: number, value: number, confidenceMin?: number, confidenceMax?: number }[],
  predictedPeak?: { value: number, timestamp: number },
  predictedTrough?: { value: number, timestamp: number },
  stackingAlert?: { isStacking: boolean, timeAgoMin?: number } | null,
 metrics?: { iob: number, cob: number, carbSensitivity: number, insulinSensitivity: number, gmiPercentage: number, avgBias: number },
 analyzedPeriod?: string
 } | null>(() => {
 // Inicjalizacja z cache, aby uniknąć migania loaderem
 const cached = localStorage.getItem('glikosense_last_result_v2');
 if (cached) {
 try {
 return JSON.parse(cached);
 } catch (e) {
 return null;
 }
 }
 return null;
 });

 // Backup-related state variables
 const realAccuracyStats: AccuracyStats = useMemo(() => {
    return PredictionAccuracyTracker.evaluateHistoryWithLogs(logs);
 }, [logs, mlResult]);

 const [backupInfo, setBackupInfo] = useState<{ timestamp: number; datasetSize?: number } | null>(null);
 const [loadingBackup, setLoadingBackup] = useState(false);
 const [hasBackupConsent, setHasBackupConsent] = useState(() => {
 return localStorage.getItem('glikosense_backup_consent') === 'true';
 });
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [isBackupActionRunning, setIsBackupActionRunning] = useState(false);
  const [isInsightsExpanded, setIsInsightsExpanded] = useState(false);
  const [isPatternsExpanded, setIsPatternsExpanded] = useState(false);

  const activePatterns = useMemo(() => {
    let localRules: any = {};
    try {
      localRules = JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}');
    } catch {}
    const rules = { ...localRules, ...(mlResult?.discoveredRules || {}) };
    const patterns: { id: string; title: string; desc: string; icon: string; tag: string }[] = [];

    if (rules.dawnPhenomenonEnabled) {
      patterns.push({
        id: 'dawn',
        title: t('auto.wzorzec_brzask_tytul', { defaultValue: 'Zjawisko Brzasku' }),
        desc: t('auto.wzorzec_brzask_opis', { defaultValue: 'Wykryto poranny wyrzut hormonów budzących i podwyższoną glikemię rano bez posiłku.' }),
        icon: '🌅',
        tag: 'Hormonalny'
      });
    }

    if (rules.somogyiEnabled) {
      patterns.push({
        id: 'somogyi',
        title: t('auto.wzorzec_somogyi_tytul', { defaultValue: 'Efekt Somogyi (Odbicie)' }),
        desc: t('auto.wzorzec_somogyi_opis', { defaultValue: 'Wykryto obronny wyrzut zapasów glukozy po głębokim nocnym lub popołudniowym spadku.' }),
        icon: '🔄',
        tag: 'Obronny'
      });
    }

    if (rules.pizzaEffectMultiplier && rules.pizzaEffectMultiplier > 1.0) {
      patterns.push({
        id: 'pizza',
        title: t('auto.wzorzec_pizza_tytul', { defaultValue: 'Efekt Pizzy (FPU / Tłuszcze-Białka)' }),
        desc: t('auto.wzorzec_pizza_opis', { defaultValue: 'Wykryto opóźniony szczyt glikemii po 3-5 godzinach od spożycia potraw tłustych i bogatobiałkowych.' }),
        icon: '🍕',
        tag: 'Trawienny'
      });
    }

    if (rules.weekendInertiaEnabled) {
      patterns.push({
        id: 'weekend',
        title: t('auto.wzorzec_weekend_tytul', { defaultValue: 'Bezwładność Weekendowa' }),
        desc: t('auto.wzorzec_weekend_opis', { defaultValue: 'Wykryto istotną zmianę średniej glikemii i wrażliwości na insulinę w dni wolne od pracy.' }),
        icon: '🏖️',
        tag: 'Rytm dobowy'
      });
    }

    if (rules.delayedExerciseEnabled) {
      patterns.push({
        id: 'exercise',
        title: t('auto.wzorzec_sport_tytul', { defaultValue: 'Opóźniony Spadek Powysiłkowy' }),
        desc: t('auto.wzorzec_sport_opis', { defaultValue: 'Wykryto wydłużone działanie insuliny (do 12h po treningu). Zwiększona wrażliwość w nocy.' }),
        icon: '🏃',
        tag: 'Wysiłkowy'
      });
    }

    if (rules.stressSensitivityEnabled) {
      patterns.push({
        id: 'stress',
        title: t('auto.wzorzec_stres_tytul', { defaultValue: 'Wrażliwość na Stres / Kortyzol' }),
        desc: t('auto.wzorzec_stres_opis', { defaultValue: 'Wykryto regularne wahania porannej glikemii w dni robocze związane z rytmem pracy.' }),
        icon: '⚡',
        tag: 'Stres'
      });
    }

    if (rules.insulinResistanceMultiplier && (rules.insulinResistanceMultiplier > 1.05 || rules.insulinResistanceMultiplier < 0.95)) {
      const isResistant = rules.insulinResistanceMultiplier > 1.05;
      patterns.push({
        id: 'resistance',
        title: isResistant ? t('auto.wzorzec_opornosc_tytul', { defaultValue: 'Lekka Oporność na Insulinę' }) : t('auto.wzorzec_wrazliwosc_tytul', { defaultValue: 'Zwiększona Wrażliwość na Dawkę' }),
        desc: t('auto.wzorzec_mnoznik_opis', { mult: Math.round(rules.insulinResistanceMultiplier * 100), defaultValue: `Wyuczony mnożnik wrażliwości: ${Math.round(rules.insulinResistanceMultiplier * 100)}% normy.` }),
        icon: isResistant ? '💪' : '📉',
        tag: 'Metaboliczny'
      });
    }

    return patterns;
  }, [mlResult, t]);

 function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
 const errInfo = {
 error: error instanceof Error ? error.message : String(error),
 authInfo: {
 userId: auth.currentUser?.uid,
 email: auth.currentUser?.email,
 emailVerified: auth.currentUser?.emailVerified,
 },
 operationType,
 path
 };
 console.error('Firestore Error: ', JSON.stringify(errInfo));
 throw new Error(JSON.stringify(errInfo));
 }

 // Fetch backup info from Cloud Firestore
 useEffect(() => {
 if (!user || user.isAnonymous) {
 setBackupInfo(null);
 return;
 }

 const fetchBackupStatus = async () => {
 setLoadingBackup(true);
 try {
 const docRef = doc(db, 'users', getEffectiveUid(user), 'neural_model', 'backup');
 const docSnap = await getDoc(docRef);
 if (docSnap.exists()) {
 const data = docSnap.data();
 setBackupInfo({
 timestamp: data.timestamp,
 datasetSize: data.datasetSize
 });
 } else {
 setBackupInfo(null);
 }
 } catch (err) {
 console.warn("Failed to fetch backup status", err);
 } finally {
 setLoadingBackup(false);
 }
 };

 fetchBackupStatus();
 }, [user]);

 const handleBackupConsentChange = (checked: boolean) => {
 setHasBackupConsent(checked);
 localStorage.setItem('glikosense_backup_consent', checked ? 'true' : 'false');
 if (checked) {
 toast.success(i18n.t('', { glikoName, defaultValue: i18n.t('auto.zgoda_udzielona_mozesz_te', { glikoName, defaultValue: "Zgoda udzielona. Możesz teraz zarządzać kopią zapasową." }) }));
 }
 };

 const handleBackupToCloud = async () => {
 if (!user || user.isAnonymous) {
 toast.error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.unknown_key', { glikoName, defaultValue: "Zaloguj się na pełne konto (E-mail lub Google), aby korzystać z kopii zapasowej." }) }));
 return;
 }
 if (!hasBackupConsent) {
 toast.error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.musisz_najpierw_zaakcepto', { glikoName, defaultValue: "Musisz najpierw zaakceptować informację o zgodzie." }) }));
 return;
 }

 setIsBackupActionRunning(true);
 const toastId = toast.loading(`Archiwizowanie modelu {glikoName} w chmurze...`);;
 const docPath = `/users/${getEffectiveUid(user)}/neural_model/backup`;
 try {
 const modelData = await MLAnalyzer.exportCurrentModel();
 if (!modelData) {
 toast.dismiss(toastId);
 toast.error("Nie znaleziono wyuczonego lokalnego modelu. Przeanalizuj panel najpierw!");
 setIsBackupActionRunning(false);
 return;
 }

 const docRef = doc(db, 'users', getEffectiveUid(user), 'neural_model', 'backup');
 await setDoc(docRef, {
 ...modelData,
 datasetSize: mlResult?.datasetSize || 0
 });

 setBackupInfo({
 timestamp: modelData.timestamp,
 datasetSize: mlResult?.datasetSize || 0
 });

 toast.success(i18n.t('auto.kopia_zapasowa_modelu_glikosen', { glikoName, defaultValue: i18n.t('auto.kopia_zapasowa_modelu_gli', { glikoName, defaultValue: `Kopia zapasowa modelu ${glikoName} została zapisana pomyślnie!` }) }), { id: toastId });
 } catch (err) {
 toast.error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.blad_podczas_eksportowani', { glikoName, defaultValue: "Błąd podczas eksportowania lub zapisu kopii zapasowej." }) }), { id: toastId });
 handleFirestoreError(err, OperationType.WRITE, docPath);
 } finally {
 setIsBackupActionRunning(false);
 }
 };

 const handleRestoreFromCloud = async () => {
 if (!user || user.isAnonymous) {
 toast.error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.zaloguj_sie_na_pelne_konto_e_m', { glikoName, defaultValue: "Zaloguj się na pełne konto (E-mail lub Google), aby pobrać kopię zapasową." }) }));
 return;
 }
 if (!hasBackupConsent) {
 toast.error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.udziel_najpierw_zgody_na', { glikoName, defaultValue: "Udziel najpierw zgody na zarządzanie kopią zapasową." }) }));
 return;
 }

 const confirmRestore = window.confirm(
 i18n.t('auto.uwaga_przywrocenie_modelu_z_ch', { glikoName, defaultValue: i18n.t('auto.uwaga_przywrocenie_modelu', { glikoName, defaultValue: `UWAGA: Przywrócenie modelu z chmury CAŁKOWICIE nadpisze obecne lokalne parametry sieci neuronowej ${glikoName} zainstalowane w przeglądarce. Czy chcesz kontynuować?` }) })
 );
 if (!confirmRestore) return;

 setIsBackupActionRunning(true);
 const toastId = toast.loading(`Archiwizowanie modelu {glikoName} w chmurze...`);;
 const docPath = `/users/${getEffectiveUid(user)}/neural_model/backup`;
 try {
 const docRef = doc(db, 'users', getEffectiveUid(user), 'neural_model', 'backup');
 const docSnap = await getDoc(docRef);

 if (!docSnap.exists()) {
 toast.dismiss(toastId);
 toast.error("Brak kopii zapasowej w chmurze.");
 setIsBackupActionRunning(false);
 return;
 }

 const backupData = docSnap.data();
 const success = await MLAnalyzer.importModelFromBackup({
 modelTopology: backupData.modelTopology,
 weightSpecs: backupData.weightSpecs,
 weightDataB64: backupData.weightDataB64
 });

 if (success) {
 toast.success(i18n.t('auto.model_glikosense_3_0_zostal_po', { glikoName, defaultValue: i18n.t('auto.model_glikosense_3_0_zost', { glikoName, defaultValue: `Model ${glikoName} został pomyślnie przywrócony z chmury!` }) }), { id: toastId });
 runML(true);
 } else {
 toast.error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.wystapil_nieznany_problem', { glikoName, defaultValue: "Wystąpił nieznany problem z plikiem modelu." }) }), { id: toastId });
 }
 } catch (err) {
 toast.error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.blad_podczas_przywracania', { glikoName, defaultValue: "Błąd podczas przywracania kopii zapasowej." }) }), { id: toastId });
 handleFirestoreError(err, OperationType.GET, docPath);
 } finally {
 setIsBackupActionRunning(false);
 }
 };

 const handleDeleteBackup = async () => {
 if (!user || user.isAnonymous) return;
 const confirmDelete = window.confirm(i18n.t('', { glikoName, defaultValue: i18n.t('auto.czy_na_pewno_chcesz_usunac_kop', { glikoName, defaultValue: "Czy na pewno chcesz usunąć kopię zapasową modelu z chmury? Ta operacja jest nieodwracalna." }) }));
 if (!confirmDelete) return;

 setIsBackupActionRunning(true);
 const toastId = toast.loading(`Archiwizowanie modelu {glikoName} w chmurze...`);;
 const docPath = `/users/${getEffectiveUid(user)}/neural_model/backup`;
 try {
 const docRef = doc(db, 'users', getEffectiveUid(user), 'neural_model', 'backup');
 await deleteDoc(docRef);
 setBackupInfo(null);
 toast.success(i18n.t('', { glikoName, defaultValue: i18n.t('auto.kopia_zapasowa_w_chmurze', { glikoName, defaultValue: "Kopia zapasowa w chmurze została usunięta." }) }), { id: toastId });
 } catch (err) {
 toast.error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.blad_podczas_usuwania_kop', { glikoName, defaultValue: "Błąd podczas usuwania kopii zapasowej." }) }), { id: toastId });
 handleFirestoreError(err, OperationType.DELETE, docPath);
 } finally {
 setIsBackupActionRunning(false);
 }
 };

 const handleExportToFile = async () => {
 try {
 const modelData = await MLAnalyzer.exportCurrentModel();
 if (!modelData) {
 toast.error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.brak_wytrenowanego_modelu', { glikoName, defaultValue: "Brak wytrenowanego modelu do pobrania. Wykonaj najpierw analizę!" }) }));
 return;
 }
 
 const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
 JSON.stringify(modelData, null, 2)
 )}`;
 const downloadAnchor = document.createElement('a');
 downloadAnchor.setAttribute("href", jsonString);
 downloadAnchor.setAttribute("download", `glikosense_model_backup_${Date.now()}.json`);
 downloadAnchor.click();
 downloadAnchor.remove();
 toast.success(i18n.t('', { glikoName, defaultValue: i18n.t('auto.pomyslnie_pobrano_model_d', { glikoName, defaultValue: "Pomyślnie pobrano model do pliku JSON!" }) }));
 } catch (err) {
 toast.error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.blad_eksportu_do_pliku', { glikoName, defaultValue: "Błąd eksportu do pliku." }) }));
 console.error(err);
 }
 };

  const handleAcceptAutoTune = async () => {
    if (!autoTunerResult?.proposedISF || !user || !settings || !autoTunerResult.timeBlock) return;
    try {
      const uid = getEffectiveUid(user, settings);
      
      let newProfiles = [...(settings.hourlyProfiles || [])];
      
      if (newProfiles.length === 0) {
        newProfiles = [
          { time: '00:00', isf: settings.isf, wwRatio: settings.wwRatio },
          { time: '06:00', isf: settings.isf, wwRatio: settings.wwRatio },
          { time: '12:00', isf: settings.isf, wwRatio: settings.wwRatio },
          { time: '18:00', isf: settings.isf, wwRatio: settings.wwRatio }
        ];
      }
      
      const blockIndex = newProfiles.findIndex(p => p.time === autoTunerResult.timeBlock!.start);
      if (blockIndex !== -1) {
        newProfiles[blockIndex] = { ...newProfiles[blockIndex], isf: autoTunerResult.proposedISF };
      } else {
        newProfiles.push({ time: autoTunerResult.timeBlock!.start, isf: autoTunerResult.proposedISF, wwRatio: settings.wwRatio });
      }

      await setDoc(doc(db, "users", uid), { hourlyProfiles: newProfiles }, { merge: true });
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { hourlyProfiles: newProfiles } }));
      localStorage.setItem('lastIsfAutoTuneTime', Date.now().toString());
      toast.success(t('auto.glikosense_autotune_success', { defaultValue: 'Profil ISF został zaktualizowany.' }));
      setAutoTunerResult(null);
    } catch (e) {
      console.error(e);
      toast.error("Błąd zapisu!");
    }
  };

  const handleDismissAutoTune = () => {
    localStorage.setItem('lastIsfAutoTuneTime', Date.now().toString());
    setAutoTunerResult(null);
  };

 const handleImportFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
 const fileReader = new FileReader();
 const files = e.target.files;
 if (!files || files.length === 0) return;
 
 fileReader.readAsText(files[0], "UTF-8");
 fileReader.onload = async (event) => {
 try {
 const textStr = event.target?.result as string;
 if (!textStr) throw new Error("Plik jest pusty.");
 
 const parsed = JSON.parse(textStr);
 if (!parsed.modelTopology || !parsed.weightSpecs || !parsed.weightDataB64) {
 throw new Error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.nieprawidlowy_format_plik', { glikoName, defaultValue: "Nieprawidłowy format pliku modelu GlikoSense." }) }));
 }
 
 const confirmRestore = window.confirm(
 i18n.t('', { glikoName, defaultValue: i18n.t('auto.uwaga_wgranie_modelu_z_pl', { glikoName, defaultValue: "Uwaga: Wgranie modelu z pliku nadpisze aktualny model w przeglądarce. Czy chcesz kontynuować?" }) })
 );
 if (!confirmRestore) return;
 
 const success = await MLAnalyzer.importModelFromBackup(parsed);
 if (success) {
 toast.success(i18n.t('', { glikoName, defaultValue: i18n.t('auto.pomyslnie_wgrano_model_z', { glikoName, defaultValue: "Pomyślnie wgrano model z pliku JSON!" }) }));
 runML(true);
 } else {
 toast.error(i18n.t('', { glikoName, defaultValue: i18n.t('auto.blad_podczas_importu_mode', { glikoName, defaultValue: "Błąd podczas importu modelu." }) }));
 }
 } catch (err) {
 toast.error(err instanceof Error ? err.message : i18n.t('', { glikoName, defaultValue: i18n.t('auto.blad_odczytu_pliku_upewni', { glikoName, defaultValue: "Błąd odczytu pliku. Upewnij się, że plik jest poprawnym JSONem modelu." }) }));
 console.error(err);
 } finally {
 e.target.value = '';
 }
 };
 };

 const lastProcessedLogsRef = React.useRef<string>("");

 useEffect(() => {
 const logsKey = logs.length > 0 
 ? `${logs.length}-${logs[0].timestamp || logs[0].createdAt}`
 : "empty";

 let timer: NodeJS.Timeout;

 if (logs && logs.length >= 5 && logsKey !== lastProcessedLogsRef.current) {
 timer = setTimeout(() => {
 lastProcessedLogsRef.current = logsKey;
 runML();
 }, 1000); // 1 second debounce
 }

 // Dodatkowy interwał do odświeżania cyklicznego co 5 minut
 const interval = setInterval(() => {
 runML();
 }, 5 * 60 * 1000);

 return () => {
 if (timer) clearTimeout(timer);
 clearInterval(interval);
 };
 }, [logs]);

 const runML = async (force: boolean = false) => {
 if (isAnalyzing && !force) return;
 
 setIsAnalyzing(true);
 setError(null);
 
 // Safety timeout in case ML analysis hangs completely (e.g. indexedDB or tfjs issues)
 const safetyTimeout = setTimeout(() => {
 setIsAnalyzing(false);
 setError("Przekroczono czas oczekiwania na model.");
 }, 40000); // 40 seconds max
 
 try {
 // Uruchamiamy weryfikację wsteczną w tle (szybki test skuteczności na danych sprzed godziny)
 MLAnalyzer.runHindsightVerification(logs);

 if (autoTuningEnabled && settings?.isf) {
    const isfRes = detectIsfChanges(logs, settings.isf, settings.hourlyProfiles);
    setAutoTunerResult(isfRes);
  } else {
    setAutoTunerResult(null);
  }

 // Start quick analysis immediately
 const quickPromise = MLAnalyzer.analyzeData(logs, force, 'quick');
 
 // Wait for quick result to show something to the user
 const qResult = await quickPromise;
 setMlResult(qResult);
 setIsAnalyzing(false); // Stop the main "Calculations" indicator
 
 // Now start full analysis in the background without blocking the result display
 MLAnalyzer.analyzeData(logs, force, 'full')
 .then(fullResult => {
 setMlResult(fullResult);
 setError(null);
 })
 .catch(e => {
 console.error("GlikoSense Full Analysis Error:", e);
 // Nie ustawiamy błędu globalnego jeśli mamy już wynik quick
 if (!qResult) setError(i18n.t('', { glikoName, defaultValue: i18n.t('auto.blad_pelnej_analizy', { glikoName, defaultValue: "Błąd pełnej analizy." }) }));
 })
 .finally(() => {
 clearTimeout(safetyTimeout);
 });
 
 } catch (e) {
 console.error("GlikoSense Quick Analysis Error:", e);
 setError(i18n.t('', { glikoName, defaultValue: i18n.t('auto.nie_udalo_sie_przeanalizo', { glikoName, defaultValue: "Nie udało się przeanalizować danych. Spróbuj później." }) }));
 clearTimeout(safetyTimeout);
 setIsAnalyzing(false);
 }
 };

 const chartData = useMemo(() => {
 if (!mlResult) return [];
 
 // Use last 5 glucose readings
 const glucoseLogs = logs
 .filter(l => l.type === 'glucose' || l.bg)
 .sort((a, b) => {
 const ta = a.timestamp || new Date(a.createdAt).getTime();
 const tb = b.timestamp || new Date(b.createdAt).getTime();
 return tb - ta;
 })
 .slice(0, 5)
 .reverse();
 
 const data = glucoseLogs.map((log, i) => ({
 name: `T-${5 - i}`,
 value: log.value || log.bg,
 isPrediction: false
 }));
 
 // If no data, provide some realistic dummy pattern
 if (data.length === 0) {
 data.push({ name: 'T-2', value: 100, isPrediction: false }, { name: 'T-1', value: 110, isPrediction: false });
 }
 
 // Add the prediction
 data.push({
 name: 'T-0',
 value: data[data.length - 1].value, // Connector
 isPrediction: false
 });
 
 data.push({
 name: 'Pred',
 value: mlResult.predictedNext2Hours,
 isPrediction: true
 });
 
 return data;
 }, [logs, mlResult, i18n.language, t]);

 const dailyStats = useMemo(() => {
 const now = new Date();
 const days = [0, 1, 2].map(offset => {
 const d = new Date(now);
 d.setDate(d.getDate() - offset);
 d.setHours(0, 0, 0, 0);
 return {
 date: d.getTime(),
 label: offset === 0 ? t('auto.dzis_ml', { defaultValue: 'Dziś' }) : offset === 1 ? t('auto.wczoraj_ml', { defaultValue: 'Wczoraj' }) : d.toLocaleDateString(i18n.language || 'pl-PL', { weekday: 'short' }),
 glucoseLogs: [] as LogEntry[],
 bolusTotal: 0
 };
 });

 logs.forEach(log => {
 const logTime = log.timestamp || (log.createdAt && new Date(log.createdAt).getTime()) || 0;
 if (!logTime) return;
 
 for (const day of days) {
 if (logTime >= day.date && logTime < day.date + 86400000) {
 if (log.type === 'glucose' || log.bg) {
 day.glucoseLogs.push(log);
 } else if (log.type === 'bolus') {
 day.bolusTotal += log.value || 0;
 }
 }
 }
 });

 return days.map(day => {
 let tir = 0;
 let avg = 0;
 if (day.glucoseLogs.length > 0) {
 const inRange = day.glucoseLogs.filter(l => {
 const v = l.value || l.bg || 0;
 const min = settings?.targetMin ?? 70;
 const max = settings?.targetMax ?? 180;
 return v >= min && v <= max;
 }).length;
 tir = Math.round((inRange / day.glucoseLogs.length) * 100);
 avg = Math.round(day.glucoseLogs.reduce((sum, l) => sum + (l.value || l.bg || 0), 0) / day.glucoseLogs.length);
 }
 return {
 label: day.label,
 tir: day.glucoseLogs.length > 0 ? tir : null,
 avg: day.glucoseLogs.length > 0 ? avg : null,
 bolus: day.bolusTotal
 };
 });
 }, [logs, settings]);

 // --- Analiza GlikoSense (Nowa sekcja) ---
 const glikosenseAnalysis = useMemo(() => {
 let cv = 0;
 let sd = 0;
 let mean = 0;
 
 const cutoff14 = Date.now() - 14 * 24 * 60 * 60 * 1000;
 const recentGlucose = logs.filter(l => (l.type === 'glucose' || l.bg) && l.timestamp >= cutoff14);
 
 if (recentGlucose.length > 0) {
 const sum = recentGlucose.reduce((acc, l) => acc + (l.value || l.bg || 0), 0);
 mean = sum / recentGlucose.length;
 
 const sumSqDiff = recentGlucose.reduce((acc, l) => {
 const diff = (l.value || l.bg || 0) - mean;
 return acc + (diff * diff);
 }, 0);
 
 sd = Math.sqrt(sumSqDiff / recentGlucose.length);
 cv = mean > 0 ? (sd / mean) * 100 : 0;
 }

 const mealBlocks = {
 breakfast: { name: i18n.t('auto.sniadanie', { glikoName, defaultValue: 'Śniadanie' }), icon: '🌅', hours: [6, 11], carbs: 0, bolus: 0, count: 0, totalDelta: 0 },
 lunch: { name: i18n.t('auto.obiad', { glikoName, defaultValue: 'Obiad' }), icon: '☀️', hours: [11, 16], carbs: 0, bolus: 0, count: 0, totalDelta: 0 },
 dinner: { name: i18n.t('auto.kolacja', { glikoName, defaultValue: 'Kolacja' }), icon: '🌙', hours: [16, 22], carbs: 0, bolus: 0, count: 0, totalDelta: 0 },
 night: { name: i18n.t('auto.noc', { glikoName, defaultValue: 'Noc' }), icon: '🌌', hours: [22, 6], carbs: 0, bolus: 0, count: 0, totalDelta: 0 }
 };

 const recentMeals = logs.filter(l => l.type === 'meal' && l.timestamp >= cutoff14);
 
 recentMeals.forEach(meal => {
 const date = new Date(meal.timestamp);
 const hour = date.getHours();
 
 let blockKey: keyof typeof mealBlocks = 'night';
 if (hour >= 6 && hour < 11) blockKey = 'breakfast';
 else if (hour >= 11 && hour < 16) blockKey = 'lunch';
 else if (hour >= 16 && hour < 22) blockKey = 'dinner';
 
 const block = mealBlocks[blockKey];
 
 block.count += 1;
 block.carbs += meal.value || 0;
 
 const relatedBoluses = logs.filter(l => 
 l.type === 'bolus' && 
 l.timestamp >= meal.timestamp - 15 * 60000 && 
 l.timestamp <= meal.timestamp + 60 * 60000
 );
 block.bolus += relatedBoluses.reduce((acc, b) => acc + (b.value || 0), 0);
 
 const glucoseAroundMeal = logs.filter(l => 
 (l.type === 'glucose' || l.bg) && 
 Math.abs(l.timestamp - meal.timestamp) <= 15 * 60000
 );
 const startGlucose = glucoseAroundMeal.length > 0 ? (glucoseAroundMeal[0].value || glucoseAroundMeal[0].bg || 0) : mean || 100;
 
 const glucoseAfterMeal = logs.filter(l => 
 (l.type === 'glucose' || l.bg) && 
 l.timestamp > meal.timestamp && 
 l.timestamp <= meal.timestamp + 2 * 60 * 60 * 1000
 );
 
 let maxGlucose = startGlucose;
 glucoseAfterMeal.forEach(g => {
 const val = g.value || g.bg || 0;
 if (val > maxGlucose) maxGlucose = val;
 });
 
 block.totalDelta += (maxGlucose - startGlucose);
 });

 const mealStats = Object.values(mealBlocks).map(b => ({
 name: b.name,
 icon: b.icon,
 avgCarbs: b.count > 0 ? (b.carbs / b.count).toFixed(1) : '0',
 avgBolus: b.count > 0 ? (b.bolus / b.count).toFixed(1) : '0',
 avgDelta: b.count > 0 ? Math.round(b.totalDelta / b.count) : 0,
 count: b.count
 }));

 const hasBasalData = settings?.hourlyProfiles && settings.hourlyProfiles.length > 0 && settings?.treatmentMode === 'pump';
 let totalBasal = 0;
 let totalBolus = 0;
 
 // Użytkownik: "jesli nie mamy danych o bazie nie mozemy pokazywac sekcji bolus i baza"
 // Obecnie w logs nie mamy "basal" rate, więc ustawiam totalBasal = 0 by ukryć tę sekcję.
 
 totalBolus = logs.filter(l => l.type === 'bolus' && l.timestamp >= cutoff14).reduce((acc, l) => acc + (l.value || 0), 0);

 return { cv, sd, mean, mealStats, totalBasal, totalBolus };
 }, [logs, settings]);

 return (
 <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900 overflow-y-auto overflow-x-hidden p-4 pb-24 gap-4">
    
    <AnimatePresence>
      {autoTuningEnabled && autoTunerResult?.suggestionAvailable && autoTunerResult.proposedISF && settings?.isf && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800 p-5 rounded-3xl shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
              <Bot size={22} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  {t('auto.glikosense_autotune_title_hourly', { defaultValue: `Wrażliwość ${autoTunerResult.timeBlock.start} - ${autoTunerResult.timeBlock.end}`, start: autoTunerResult.timeBlock.start, end: autoTunerResult.timeBlock.end })}
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {t('auto.glikosense_autotune_desc_hourly', { defaultValue: `Twoje bolusy w godzinach ${autoTunerResult.timeBlock.start} - ${autoTunerResult.timeBlock.end} działają słabiej. Zaktualizować ISF dla tego przedziału?`, start: autoTunerResult.timeBlock.start, end: autoTunerResult.timeBlock.end })}
                </p>
                
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleAcceptAutoTune}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    {t('auto.glikosense_autotune_action_hourly', { defaultValue: `Zmień na ${autoTunerResult.proposedISF} mg/dL`, newISF: autoTunerResult.proposedISF })}
                  </button>
                  <button
                    onClick={handleDismissAutoTune}
                    className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                  >
                    {t('auto.glikosense_autotune_reject', { defaultValue: 'Zignoruj' })}
                  </button>
                </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

 <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-accent-100 dark:border-accent-900/40 relative overflow-hidden group">
 {/* Background decoration */}
 <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-accent-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-accent-500/20 transition-all duration-1000" />
 <div className="absolute -bottom-32 -left-32 w-[20rem] h-[20rem] bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
 
 <div className="flex items-center justify-between mb-8 relative z-10">
 <div className="flex items-center gap-4">
 <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50 dark:ring-indigo-900/30">
 <GlikoSenseIcon size={24} isAnalyzing={isAnalyzing} />
 </div>
 <div className="flex flex-col">
 <div className="flex items-center gap-2">
 <h3 className="text-xl font-black tracking-tighter text-slate-800 dark:text-white">{t('auto.glikosense', { defaultValue: 'GlikoSense' })}<span className="text-indigo-500 text-2xl leading-none">.</span></h3>
 <button 
 onClick={() => setShowEngineSettings(!showEngineSettings)} 
 className="p-1 text-slate-400 hover:text-indigo-500 transition-colors"
 >
 <Settings size={16} />
 </button>
 </div>
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1.5 mt-0.5">
 {isAnalyzing ? (
 <>
 <Loader2 size={10} className="animate-spin text-accent-500" /> {t('auto.obliczanie', { defaultValue: 'OBLICZANIE...' })}
 </>
 ) : (
 <>
 {mlResult?.analyzedPeriod ? mlResult.analyzedPeriod : 'GlikoSense ENGINE'}
 </>
 )}
 </span>
 </div>
 </div>
 
 <button 
 onClick={() => runML(true)} 
 disabled={isAnalyzing}
 className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-accent-500 dark:text-slate-400 rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50"
 title={t('', { glikoName, defaultValue: i18n.t('auto.odswiez_analize', { glikoName, defaultValue: "Odśwież analizę" }) })}
 >
 <RefreshCw size={18} className={isAnalyzing ? 'animate-spin' : ''} />
 </button>
 </div>

 <AnimatePresence>
        {showEngineSettings && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-6 flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    🧠 {t('auto.architektura_sieci_glikosense', { defaultValue: 'Wersja Silnika GlikoSense' })}
                  </span>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-full border border-slate-200/50 dark:border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('glikosense_engine_mode', 'v3_lstm');
                      setEngineMode('v3_lstm');
                      toast.success(t('auto.przelaczono_na_silnik_lstm', { defaultValue: "Przełączono na GlikoSense 3.0 LSTM Klasyczny" }));
                      if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
                      setTimeout(() => runML(true), 50);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center py-2.5 rounded-lg text-[10px] font-black uppercase transition-all duration-300",
                      engineMode === 'v3_lstm'
                        ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                  >
                    v3.0 Klasyczny (LSTM)
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('glikosense_engine_mode', 'v4_tcn');
                      setEngineMode('v4_tcn');
                      toast.success(t('auto.przelaczono_na_silnik_tcn', { defaultValue: "Przełączono na GlikoSense 4.0 Pro TCN + INT8" }));
                      if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'));
                      setTimeout(() => runML(true), 50);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center py-2.5 rounded-lg text-[10px] font-black uppercase transition-all duration-300 gap-1.5",
                      (typeof window !== 'undefined' && (
                        typeof OffscreenCanvas === 'undefined' || 
                        typeof window.WebGLRenderingContext === 'undefined' || 
                        localStorage.getItem('glikosense_active_backend') === 'cpu' || 
                        (navigator.deviceMemory && navigator.deviceMemory < 3)
                      )) ? "opacity-50 cursor-not-allowed" : "",
                      engineMode === 'v4_tcn'
                        ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400"
                        : "text-slate-500 dark:text-slate-400 hover:text-indigo-500"
                    )}
                  >
                    🚀 v4.0 Pro (TCN)
                  </button>
                </div>
                
                <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center px-4 font-medium leading-relaxed">
                  {engineMode === 'v4_tcn' 
                    ? t('auto.opis_silnika_tcn', { defaultValue: 'Sploty dylatowane (TCN) z kwantyzacją wag INT8 i bezpiecznikiem skrajnych próbek. Wysoka precyzja.' })
                    : t('auto.opis_silnika_lstm', { defaultValue: 'Pamięć sekwencyjna (LSTM). Sprawdzony, klasyczny wariant asystenta o mniejszym zapotrzebowaniu na moc.' })}
                </p>

                <div className="mt-2 border-t border-slate-200/50 dark:border-slate-700/50 pt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Auto-Tuning ISF (AI Sugestie)
                      </span>
                      <span className="text-[8px] text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                        Pozwól GlikoSense wykrywać i sugerować zmiany we wrażliwości na insulinę
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const newState = !autoTuningEnabled;
                        setAutoTuningEnabled(newState);
                        localStorage.setItem('glikosense_autotuning', newState.toString());
                        toast.success(newState ? 'Auto-Tuning włączony (Tryb sugestii)' : 'Auto-Tuning wyłączony');
                      }}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        autoTuningEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          autoTuningEnabled ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

 {/* GlikoSense Neural Backup Control Trigger & Panel */}
 <div className="relative z-20 mb-6 bg-slate-50 dark:bg-slate-800/20 p-4 border border-slate-200/40 dark:border-slate-800/40 rounded-[2rem] hover:border-indigo-500/20 transition-all">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <Cloud size={18} className="text-indigo-500" />
 <div className="flex flex-col">
 <span className="text-sm font-black text-slate-700 dark:text-slate-100 leading-none">{t('auto.sieć_neuronowa_glikosense_3_0', { glikoName, defaultValue: i18n.t('auto.siec_neuronowa_glikosense', { glikoName, defaultValue: `Sieć neuronowa ${glikoName}` }) })}</span>
 <span className="text-[10px] font-bold text-slate-400 opacity-80 mt-1">{t('auto.kopia_zapasowa_modelu_w_zabezpieczo', { defaultValue: 'Kopia zapasowa modelu w zabezpieczonej chmurze' })}</span>
 </div>
 </div>
 <button
 onClick={() => setShowBackupPanel(!showBackupPanel)}
 className="px-3 py-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-500/5 hover:bg-indigo-500/10 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15 rounded-xl transition-all"
 >
 {showBackupPanel ? i18n.t('', { glikoName, defaultValue: i18n.t('auto.zwin', { glikoName, defaultValue: "Zwiń" }) }) : i18n.t('', { glikoName, defaultValue: i18n.t('auto.zarzadzaj', { glikoName, defaultValue: "Zarządzaj" }) })}
 </button>
 </div>

 {showBackupPanel && (
 <motion.div 
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: "auto" }}
 className="mt-4 pt-4 border-t border-slate-200/40 dark:border-slate-800/40 space-y-4 overflow-hidden"
 >
 {/* Warning / Risk Info Panel */}
 <div className="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3 text-amber-700 dark:text-amber-400">
 <ShieldAlert size={20} className="shrink-0 mt-0.5" />
 <div className="space-y-1">
 <span className="text-xs font-black uppercase tracking-wider block">{t('', { glikoName, defaultValue: i18n.t('auto.wazna_informacja_o_modelu', { glikoName, defaultValue: "Ważna Informacja o Modelu" }) })}</span>
 <p className="text-xs font-medium leading-relaxed">
 
 {t('', { glikoName, defaultValue: i18n.t('auto.twoja_siec_neuronowa_uczy', { glikoName, defaultValue: "Twoja sieć neuronowa uczy się lokalnie na Twoim urządzeniu. Czyszczenie pamięci podręcznej przeglądarki lub zmiana urządzenia spowoduje" }) })}{" "}
 <strong className="font-extrabold text-amber-600 dark:text-amber-300">{t('auto.bezzwrotną_utratę_wyuczonego_modelu', { glikoName, defaultValue: i18n.t('auto.bezzwrotna_utrate_wyuczon', { glikoName, defaultValue: `bezzwrotną utratę wyuczonego modelu ${glikoName}` }) })}</strong>{" "}
 
 {t('', { glikoName, defaultValue: i18n.t('auto.i_przywrocenie_wartosci_p', { glikoName, defaultValue: "i przywrócenie wartości podstawowych. Kopia w chmurze chroni przed utratą Twojej spersonalizowanej inteligencji." }) })}
 </p>
 </div>
 </div>

 {/* Checkbox for explicit consent */}
 <div 
 onClick={() => handleBackupConsentChange(!hasBackupConsent)}
 className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer transition-all"
 >
 <div className="text-indigo-500 shrink-0 mt-0.5">
 {hasBackupConsent ? (
 <CheckSquare size={18} className="fill-indigo-500/10" />
 ) : (
 <Square size={18} />
 )}
 </div>
 <div className="space-y-0.5">
 <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
 
 {t('', { glikoName, defaultValue: i18n.t('auto.rozumiem_ryzyko_i_wyrazam', { glikoName, defaultValue: "Rozumiem ryzyko i wyrażam świadomą zgodę" }) })}
 </span>
 <p className="text-[10px] text-slate-400">
 
 {t('', { glikoName, defaultValue: i18n.t('auto.wyrazam_zgode_na_bezpiecz', { glikoName, defaultValue: "Wyrażam zgodę na bezpieczny, szyfrowany zapis wag i topologii mojej lokalnej sieci neuronowej w moim profilu bazy danych Firebase." }) })}
 </p>
 </div>
 </div>

 {/* If user is not logged in or is guest */}
 {!user ? (
 <div className="bg-indigo-500/5 border border-indigo-500/15 p-3 rounded-2xl text-center text-xs text-indigo-500 font-bold">
 
 {t('', { glikoName, defaultValue: i18n.t('auto.zaloguj_sie_na_pelne_kont', { glikoName, defaultValue: "⚠️ Zaloguj się na pełne konto (e-mailem lub Google), aby uzyskać dostęp do kopii zapasowej w bezpiecznej chmurze." }) })}
 </div>
 ) : user.isAnonymous ? (
 <div className="bg-amber-500/5 border border-amber-500/15 p-3 rounded-2xl text-center text-xs text-amber-600 dark:text-amber-400 font-bold">
 
 {t('', { glikoName, defaultValue: i18n.t('auto.kopia_zapasowa_modelu_jes', { glikoName, defaultValue: "⚠️ Kopia zapasowa modelu jest niedostępna w trybie gościa. Zapobiegaj utracie modelu logując się na pełne konto (E-mail lub Google)." }) })}
 </div>
 ) : (
 <div className="space-y-3">
 {/* Last backup info */}
 <div className="flex items-center justify-between text-xs p-3 bg-slate-100/60 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/40">
 <span className="font-black uppercase text-slate-400 tracking-wider text-[9px]">{t('auto.stan_kopii_chmury', { defaultValue: 'Stan kopii chmury' })}</span>
 {loadingBackup ? (
 <div className="flex items-center gap-1.5 text-slate-400">
 <Loader2 size={12} className="animate-spin" /> {t('auto.sprawdzanie', { defaultValue: 'Sprawdzanie...' })}
 </div>
 ) : backupInfo ? (
 <div className="flex flex-col items-end gap-0.5">
 <span className="font-bold text-emerald-500">{t('auto.kopia_jest_aktywna', { defaultValue: 'Kopia jest aktywna' })}</span>
 <span className="text-[10px] text-slate-400 font-medium">
 
 {t('auto.zapisano', { defaultValue: 'Zapisano:' })} {new Date(backupInfo.timestamp).toLocaleString('pl-PL')}
 </span>
 </div>
 ) : (
 <span className="text-amber-500 font-bold">{t('auto.brak_zapisu_w_chmurze', { defaultValue: 'Brak zapisu w chmurze' })}</span>
 )}
 </div>

 {/* Cloud Actions Row */}
 <div className="flex flex-wrap items-center gap-2">
 <button
 onClick={handleBackupToCloud}
 disabled={isBackupActionRunning || !hasBackupConsent}
 className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/30 disabled:text-indigo-500/50 rounded-xl transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
 >
 <CloudUpload size={14} /> {t('auto.eksportuj_do_chmury', { defaultValue: 'EKSPORTUJ DO CHMURY' })}
 </button>

 <button
 onClick={handleRestoreFromCloud}
 disabled={isBackupActionRunning || !hasBackupConsent || !backupInfo}
 className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 disabled:text-emerald-500/50 rounded-xl transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
 >
 <CloudDownload size={14} /> {t('', { glikoName, defaultValue: i18n.t('auto.przywroc_z_chmury', { glikoName, defaultValue: "PRZYWRÓĆ Z CHMURY" }) })}
 </button>

 {backupInfo && (
 <button
 onClick={handleDeleteBackup}
 disabled={isBackupActionRunning}
 className="p-2.5 text-red-500 hover:text-red-600 bg-red-500/5 hover:bg-red-500/10 rounded-xl transition-all shrink-0 cursor-pointer disabled:opacity-50"
 title={t('', { glikoName, defaultValue: i18n.t('auto.usun_kopie_zapasowa_z_chm', { glikoName, defaultValue: "Usuń kopię zapasową z chmury" }) })}
 >
 <Trash2 size={14} />
 </button>
 )}
 </div>
 </div>
 )}

 {/* Opcja offline dla gości, urządzeń lokalnych oraz eksportu dla APK */}
 <div className="pt-3.5 border-t border-slate-200/40 dark:border-slate-800/40 space-y-3">
 <div className="flex flex-col">
 <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{t('', { glikoName, defaultValue: i18n.t('auto.kopia_lokalna_plik_idealn', { glikoName, defaultValue: "Kopia Lokalna / Plik (Idealne dla pliku APK & Gości)" }) })}</span>
 <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
 
 {t('', { glikoName, defaultValue: i18n.t('auto.calkowicie_bezplatne_pobi', { glikoName, defaultValue: "Całkowicie bezpłatne pobieranie spersonalizowanych wag sieci neuronowej bezpośrednio na pamięć urządzenia lub ich wczytywanie z pliku JSON." }) })}
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 <button
 onClick={handleExportToFile}
 className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
 >
 
 {t('auto.pobierz_plik_modelu_json', { defaultValue: '📥 Pobierz plik modelu (.json)' })}
 </button>
 <label className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer text-center">
 
 {t('auto.wgraj_plik_modelu_json', { defaultValue: '📤 Wgraj plik modelu (.json)' })}
 <input
 type="file"
 accept=".json"
 onChange={handleImportFromFile}
 className="hidden"
 />
 </label>
 </div>
 </div>
 </motion.div>
 )}
 </div>

 <AnimatePresence mode="wait">
 {logs.filter(l => l.type === 'glucose' || l.bg).length < 5 ? (
 <motion.div 
 key="nodata"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="h-48 flex items-center justify-center relative z-10 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 glass-target"
 >
 <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('', { glikoName, defaultValue: i18n.t('auto.zbyt_malo_danych_do_anali', { glikoName, defaultValue: "Zbyt mało danych do analizy (min. 5 wpisów)" }) })}</span>
 </motion.div>
 ) : error && !mlResult ? (
 <motion.div 
 key="error"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="h-48 flex flex-col items-center justify-center relative z-10 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30"
 >
 <AlertTriangle size={32} className="text-amber-500 mb-4" />
 <span className="text-xs font-bold uppercase tracking-widest text-amber-500 text-center px-6">{error}</span>
 <button 
 onClick={() => runML(true)}
 className="mt-4 text-[10px] font-bold text-accent-500 uppercase tracking-widest hover:underline"
 >
 
 {t('', { glikoName, defaultValue: i18n.t('auto.sprobuj_ponownie', { glikoName, defaultValue: "Spróbuj ponownie" }) })}
 </button>
 </motion.div>
 ) : isAnalyzing && !mlResult ? (
 <motion.div 
 key="analyzing_fresh"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="h-48 flex flex-col p-6 space-y-4 relative z-10 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 glass-target animate-pulse"
 >
 <div className="w-1/3 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg" />
 <div className="flex gap-4">
 <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-[1.5rem]" />
 <div className="flex-1 space-y-2 py-2">
 <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-md" />
 <div className="w-5/6 h-4 bg-slate-200 dark:bg-slate-700 rounded-md" />
 <div className="w-4/6 h-4 bg-slate-200 dark:bg-slate-700 rounded-md" />
  </div>
  </div>
  </motion.div>
  ) : mlResult ? (
  <motion.div 
  key="result"
  initial={{ opacity: 0, y: 15 }} 
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
  className="space-y-4 relative z-10 w-full overflow-hidden"
  >
 {/* Top Cards Grid: 1 column if day, 2 columns if night */}
 <div className={`grid ${(localStorage.getItem('glikosense_engine_mode') === 'v4_tcn' && (new Date().getHours() >= 21 || new Date().getHours() < 6)) ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3 md:gap-4 w-full`}>
 {/* 2h Direction Prediction Box */}
 <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 dark:from-slate-950 dark:via-indigo-950 dark:to-violet-950 p-5 md:p-6 rounded-3xl text-white shadow-xl relative overflow-hidden group border border-indigo-500/20 flex flex-col w-full">
 <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:opacity-20 transition-all duration-700 group-hover:scale-110 transform-gpu">
 <Activity size={180} />
 </div>
 
 <div className="flex justify-between items-start relative z-10">
 <div className="flex flex-col">
 <span className="text-[10px] font-black text-indigo-300/80 uppercase tracking-widest">{t('auto.kierunek_za_2h', { defaultValue: 'Kierunek za 2h' })}</span>
 <div className="flex items-center gap-1.5 mt-0.5">
 <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
 <span className="text-[8px] font-bold text-indigo-200/50 uppercase tracking-wider">{t('auto.na_podstawie_ai', { defaultValue: 'Na podstawie AI' })}</span>
 </div>
 </div>
 <div className="p-2 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 shrink-0">
 <Wind size={16} className="text-indigo-300" />
 </div>
 </div>
 
 <div className="flex items-baseline gap-2 relative z-10 my-auto pt-4">
 <span className="text-5xl sm:text-6xl font-black tracking-tight leading-none">{mlResult.predictedNext2Hours}</span>
 <div className="flex flex-col">
   <span className="text-xs font-bold text-indigo-300 tracking-widest">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
   {realAccuracyStats && realAccuracyStats.totalEvaluated > 0 && (
     <span className="text-[9px] font-bold text-indigo-400/80 mt-1 uppercase tracking-widest">
       BŁĄD: ±{realAccuracyStats.avgErrorMgDl} mg/dL
     </span>
   )}
 </div>
 </div>
 
 {/* Mini sparkline visualization */}
 <div className="h-12 w-full mt-3 pr-2 opacity-100 shrink-0">
 <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 300, height: 48 }}>
 <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
 <defs>
 <linearGradient id="colorSparkline" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#818cf8" stopOpacity={0.6}/>
 <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
 </linearGradient>
 </defs>
 <Area 
 type="monotone" 
 dataKey="value" 
 stroke="#a5b4fc" 
 strokeWidth={3} 
 fill="url(#colorSparkline)" 
 isAnimationActive={true}
 animationDuration={1500}
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* 6h Prediction Box for v4 TCN (Night Protect) */}
 {(localStorage.getItem('glikosense_engine_mode') === 'v4_tcn' && (new Date().getHours() >= 21 || new Date().getHours() < 6)) ? (
 <div className="bg-gradient-to-br from-slate-900 via-cyan-950 to-indigo-950 dark:from-slate-950 dark:via-cyan-950 dark:to-indigo-950 p-5 md:p-6 rounded-3xl text-white shadow-xl relative overflow-hidden group border border-cyan-500/20 flex flex-col w-full">
 <div className="absolute inset-0 z-0 opacity-40">
 {mlResult.predictionCurve && (
 <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 300, height: 120 }}>
 <AreaChart data={mlResult.predictionCurve} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
 <defs>
 <linearGradient id="nightProtect" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
 <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
 </linearGradient>
 </defs>
 <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} fill="url(#nightProtect)" />
 </AreaChart>
 </ResponsiveContainer>
 )}
 </div>
 
 <div className="flex items-center gap-2 mb-3 relative z-10">
 <div className="bg-cyan-500/30 p-2 rounded-xl backdrop-blur-md">
 <ShieldAlert size={16} className="text-cyan-200" />
 </div>
 <span className="text-xs font-black text-cyan-100 uppercase tracking-wider opacity-90">{t('auto.najniższy_spadek', { defaultValue: 'Nocne Minimum' })}</span>
 </div>
 <div className="flex items-baseline gap-2 relative z-10 my-auto">
 <span className="text-5xl sm:text-6xl font-black tracking-tight leading-none">{Math.round(Math.min(...(mlResult.predictionCurve?.map((p: any) => p.value) || [999])))}</span>
 <span className="text-xs font-bold text-cyan-300 tracking-widest">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
 </div>
 <div className="mt-3 text-[10px] font-bold text-cyan-300/80 uppercase tracking-wider relative z-10">
 🛸 TCN Pro • Horyzont Nocny
 </div>
 </div>
 ) : null}
 </div>

 {/* Real-World Prediction Verification Box - FULL WIDTH */}
 {mlResult && (
 <div className="bg-gradient-to-br from-indigo-900/80 via-slate-900/90 to-purple-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-indigo-500/30 text-white shadow-xl w-full relative overflow-hidden">
 <div className="flex items-center justify-between mb-3 pb-2 border-b border-indigo-500/20">
 <div className="flex items-center gap-2.5">
 <div className="bg-indigo-500/25 p-2 rounded-xl border border-indigo-500/30 shrink-0">
 <Target size={16} className="text-indigo-300 animate-pulse" />
 </div>
 <div>
 <h4 className="text-xs font-black uppercase tracking-wider text-indigo-100">
 {t('auto.glikosense_real_accuracy', { defaultValue: 'Trafność Prognoz GlikoSense' })}
 </h4>
 <p className="text-[10px] text-indigo-300/80 font-medium">
 {t('auto.glikosense_evaluated_forecasts', { defaultValue: 'Zweryfikowano prognoz' })}: {realAccuracyStats.totalEvaluated}
 </p>
 </div>
 </div>

 {realAccuracyStats.totalEvaluated > 0 && (
 <div className="text-right shrink-0">
 <span className="text-2xl font-black text-emerald-400 tracking-tight">{realAccuracyStats.realAccuracyPercentage}%</span>
 </div>
 )}
 </div>

 {realAccuracyStats.totalEvaluated > 0 ? (
 <div className="grid grid-cols-2 gap-3 mt-2">
 <div className="bg-slate-950/50 rounded-2xl p-2.5 border border-indigo-500/15 flex items-center justify-between">
 <span className="text-[10px] text-slate-400 font-bold uppercase">{t('auto.glikosense_avg_error', { defaultValue: 'Śr. błąd' })}</span>
 <span className="text-sm font-black text-amber-300">±{realAccuracyStats.avgErrorMgDl} mg/dL</span>
 </div>
 <div className="bg-slate-950/50 rounded-2xl p-2.5 border border-indigo-500/15 flex items-center justify-between">
 <span className="text-[10px] text-slate-400 font-bold uppercase">{t('auto.glikosense_hit_rate', { defaultValue: 'Trafienia' })}</span>
 <span className="text-sm font-black text-emerald-400">🎯 {realAccuracyStats.exactHitRatePercentage}%</span>
 </div>
 </div>
 ) : (
 <p className="text-[10px] text-indigo-200/70 italic mt-1">
 {t('auto.glikosense_no_evaluated_yet', { defaultValue: 'Zbieram dane do weryfikacji (weryfikacja po 1-2 godzinach od pierwszej analizy)...' })}
 </p>
 )}
 </div>
 )}

 {/* Unified Extrema Range Card (Peak & Trough) - FULL WIDTH */}
 {mlResult.predictedPeak && mlResult.predictedTrough && (
 <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-md space-y-3 w-full">
 <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
 <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
 {t('auto.glikosense_extrema_range', { defaultValue: 'Ekstrema Prognozy (2h)' })}
 </span>
 </div>
 <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
 ⚡ GlikoSense 4.0
 </span>
 </div>

 <div className="space-y-2.5">
 {/* Peak Row */}
 <div className="bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/20 rounded-2xl p-3 flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-rose-500/20 rounded-xl text-rose-500 shrink-0">
 <TrendingUp size={18} />
 </div>
 <div>
 <div className="text-xs font-black uppercase text-rose-500 tracking-tight">
 {t('auto.glikosense_predicted_peak', { defaultValue: 'Przewidywany Szczyt' })}
 </div>
 <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
 {t('auto.glikosense_at', { defaultValue: 'Godz.' })} <span className="text-rose-600 dark:text-rose-300 font-extrabold">{new Date(mlResult.predictedPeak.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
 </div>
 </div>
 </div>
 <div className="text-right shrink-0">
 <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{mlResult.predictedPeak.value}</span>
 <span className="text-[10px] font-bold text-slate-400 block">mg/dL</span>
 </div>
 </div>

 {/* Trough Row */}
 <div className="bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-500 shrink-0">
 <TrendingDown size={18} />
 </div>
 <div>
 <div className="text-xs font-black uppercase text-emerald-500 tracking-tight">
 {t('auto.glikosense_predicted_trough', { defaultValue: 'Przewidywany Dołek' })}
 </div>
 <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
 {t('auto.glikosense_at', { defaultValue: 'Godz.' })} <span className="text-emerald-600 dark:text-emerald-300 font-extrabold">{new Date(mlResult.predictedTrough.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
 </div>
 </div>
 </div>
 <div className="text-right shrink-0">
 <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{mlResult.predictedTrough.value}</span>
 <span className="text-[10px] font-bold text-slate-400 block">mg/dL</span>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Ostatnie 3 Dni */}
 <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-md space-y-3 w-full mb-4">
 <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
 <CalendarDays size={16} className="text-indigo-500" />
 <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
 {t('auto.ostatnie_3_dni', { defaultValue: 'Ostatnie 3 dni' })}
 </span>
 </div>
 <div className="grid grid-cols-3 gap-2">
 {dailyStats.map((stat, idx) => (
 <div key={idx} className="bg-white dark:bg-slate-950/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
 <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{stat.label}</span>
 <div className="flex flex-col items-center gap-0.5">
 {stat.tir !== null ? (
 <>
 <span className="text-xl font-black text-slate-700 dark:text-slate-200">{stat.tir}%</span>
 <span className="text-[8px] font-bold text-emerald-500 uppercase">TIR</span>
 </>
 ) : (
 <span className="text-xs font-bold text-slate-300">-</span>
 )}
 </div>
 <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 w-full grid grid-cols-2 gap-1">
 <div className="flex flex-col items-center justify-center">
 {stat.avg !== null ? (
 <span className="text-xs font-black text-amber-500">{stat.avg}</span>
 ) : (
 <span className="text-xs font-bold text-slate-300">-</span>
 )}
 <span className="text-[7px] font-bold text-slate-400 uppercase">Śr.</span>
 </div>
 <div className="flex flex-col items-center justify-center border-l border-slate-100 dark:border-slate-800">
 <span className="text-xs font-black text-indigo-500">{stat.bolus > 0 ? stat.bolus.toFixed(1) : '0'}</span>
 <span className="text-[7px] font-bold text-slate-400 uppercase">Jedn.</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Insulin Stacking Warning */}
 {mlResult.stackingAlert && mlResult.stackingAlert.isStacking && (
 <motion.div 
 initial={{ opacity: 0, y: 5 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-2.5 text-amber-600 dark:text-amber-300 w-full"
 >
 <AlertTriangle size={16} className="shrink-0 animate-bounce text-amber-500" />
 <span className="text-[10px] font-bold leading-snug">
 {t('auto.glikosense_stacking_warning', { min: mlResult.stackingAlert.timeAgoMin || 60, defaultValue: `Ostrzeżenie TCN: Nakładanie dawek insuliny (bolus sprzed ${mlResult.stackingAlert.timeAgoMin || 60} min). Zachowaj ostrożność!` })}
 </span>
 </motion.div>
 )}

 {/* Zaawansowana Analiza GlikoSense */}
 <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-md w-full mt-4">
 <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
 <Activity size={16} className="text-indigo-500" />
 <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
 {t('auto.zaawansowana_analiza_glikosense', { defaultValue: 'Zaawansowana Analiza GlikoSense' })}
 </span>
 </div>
 
 <div className={`grid grid-cols-1 ${glikosenseAnalysis.totalBasal > 0 ? 'md:grid-cols-2' : ''} gap-4`}>
 {/* Zmienność glikemii (CV i SD) */}
 <div className="bg-white dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
 <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${glikosenseAnalysis.cv > 36 ? 'text-rose-500/80' : 'text-emerald-500/80'}`}>
 Zmienność Glikemii (CV)
 </h4>
 <span className={`text-4xl font-black tracking-tighter ${glikosenseAnalysis.cv > 36 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
 {glikosenseAnalysis.cv.toFixed(1)}
 <span className={`text-sm font-bold ${glikosenseAnalysis.cv > 36 ? 'text-rose-500/60' : 'text-emerald-500/60'}`}>%</span>
 </span>
 <p className={`mt-2 text-[10px] font-bold ${glikosenseAnalysis.cv > 36 ? 'text-rose-800/70 dark:text-rose-200/60' : 'text-emerald-800/70 dark:text-emerald-200/60'}`}>
 {t('auto.odchylenie_standardowe_sd', { defaultValue: 'Odchylenie standardowe (SD):' })} <strong className="font-black">{glikosenseAnalysis.sd.toFixed(1)} mg/dL</strong>
 </p>
 <p className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-500 dark:text-slate-400 leading-tight w-full">
 <strong className="text-slate-600 dark:text-slate-300">Cel: &lt; 36%.</strong> Zmienność glikemii (CV) określa stabilność cukrów. Zależy m.in. od precyzji szacowania posiłków (WBT), wyprzedzenia bolusa (timing) oraz stresu. Im mniejsza, tym lepsza jakość wyrównania.
 </p>
 </div>
 
 {/* Sekcja Bolus i Baza (tylko jeśli baza > 0, wg wymagań) */}
 {glikosenseAnalysis.totalBasal > 0 && (
 <div className="bg-white dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
 <h4 className="text-[10px] font-black uppercase tracking-widest mb-1 text-indigo-500/80">
 Stosunek Bolus / Baza
 </h4>
 <div className="flex items-center gap-2 mt-1">
 <div className="text-center">
 <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{glikosenseAnalysis.totalBolus.toFixed(1)}</span>
 <span className="text-[9px] font-bold text-slate-400 block uppercase">Bolus</span>
 </div>
 <div className="text-slate-300 font-black">:</div>
 <div className="text-center">
 <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">{glikosenseAnalysis.totalBasal.toFixed(1)}</span>
 <span className="text-[9px] font-bold text-slate-400 block uppercase">Baza</span>
 </div>
 </div>
 </div>
 )}
 
 {/* Podsumowanie posiłków */}
 <div className={`col-span-1 ${glikosenseAnalysis.totalBasal > 0 ? 'md:col-span-2' : ''} grid grid-cols-2 gap-2 mt-2`}>
 {glikosenseAnalysis.mealStats.map((meal, idx) => {
 const delta = meal.avgDelta;
 const colorClass = delta <= 40 ? 'text-emerald-500' : delta <= 70 ? 'text-amber-500' : 'text-rose-500';
 const bgClass = delta <= 40 ? 'bg-emerald-500/10' : delta <= 70 ? 'bg-amber-500/10' : 'bg-rose-500/10';
 
 return (
 <div key={idx} className="bg-white dark:bg-slate-950/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 <div className={`p-1.5 rounded-lg ${bgClass}`}>
 <span className="text-sm">{meal.icon}</span>
 </div>
 <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase">{meal.name}</span>
 </div>
 <div className="text-right flex flex-col">
 <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{meal.avgCarbs}g W</span>
 <span className={`text-[9px] font-bold ${colorClass}`}>Δ {meal.avgDelta} mg/dL</span>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>

            {/* Sekcja Odkryte Wzorce i Reguły Metaboliczne */}
            <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-md w-full transition-all">
              <button
                type="button"
                onClick={() => setIsPatternsExpanded(prev => !prev)}
                className="w-full flex items-center justify-between text-left group focus:outline-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 rounded-xl">
                    <Dna size={16} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {t('auto.odkryte_wzorce_glikosense', { defaultValue: 'Odkryte Wzorce i Reguły' })}
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 text-[9px] font-black uppercase rounded-full border",
                      activePatterns.length > 0
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700"
                    )}>
                      {activePatterns.length > 0 ? activePatterns.length : t('auto.monitorowanie', { defaultValue: 'Aktywne uczenie' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50 transition-colors">
                  <span>{isPatternsExpanded ? (t('auto.zwin', { defaultValue: 'Zwiń' })) : (t('auto.pokaz_wzorce', { defaultValue: 'Pokaż wzorce' }))}</span>
                  {isPatternsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              <AnimatePresence>
                {isPatternsExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
                      {activePatterns.length > 0 ? (
                        activePatterns.map((pat) => (
                          <div key={pat.id} className="flex items-start gap-3 bg-white dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <span className="text-xl shrink-0 mt-0.5">{pat.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="text-xs font-black dark:text-white leading-tight">{pat.title}</h4>
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  {pat.tag}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug font-medium">{pat.desc}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3.5 bg-white dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            {t('auto.brak_odkrytych_wzorcow_info', { defaultValue: 'Silnik GlikoSense stale analizuje Twoje reakcje na posiłki, aktywność i pory dnia. Nowo wykryte reguły (np. Zjawisko Brzasku, Efekt Pizzy, Bezwładność Weekendowa) pojawią się tutaj automatycznie.' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

 {mlResult.insights && mlResult.insights.length > 0 && (
 <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-md w-full transition-all">
 <button
 type="button"
 onClick={() => setIsInsightsExpanded(prev => !prev)}
 className="w-full flex items-center justify-between text-left group focus:outline-none"
 >
 <div className="flex items-center gap-2.5">
 <div className="p-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 rounded-xl">
 <Sparkles size={16} />
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
 {t('auto.wnioski_glikosense', { defaultValue: 'Wnioski GlikoSense' })}
 </span>
 <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-500/20">
 {mlResult.insights.length}
 </span>
 </div>
 </div>
 <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
 <span>{isInsightsExpanded ? (t('auto.zwin', { defaultValue: 'Zwiń' })) : (t('auto.pokaz_wnioski', { defaultValue: 'Pokaż wnioski' }))}</span>
 {isInsightsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 </div>
 </button>

 <AnimatePresence>
 {isInsightsExpanded && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 transition={{ duration: 0.25, ease: 'easeInOut' }}
 className="overflow-hidden"
 >
 <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
 {mlResult.insights.map((insight, idx) => (
 <div key={idx} className="flex items-start gap-2.5 bg-white dark:bg-slate-950/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
 <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
 <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-snug">{insight}</p>
 </div>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )}
  </motion.div>
  ) : null}
  </AnimatePresence>
  </div>
  </div>
 );
};
