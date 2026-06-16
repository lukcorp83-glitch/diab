import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Activity, AlertTriangle, TrendingUp, TrendingDown, Target, Loader2, RefreshCw, Zap, Sparkles, CalendarDays, Syringe, Cloud, CloudUpload, CloudDownload, Info, ShieldAlert, CheckSquare, Square, Trash2 } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { LogEntry, UserSettings } from '../types';
import { MLAnalyzer } from '../services/mlSugarAnalyzer';
import { cn, getEffectiveUid } from '../lib/utils';
import GlikoSenseIcon from './GlikoSenseIcon';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface MLAnalysisWidgetProps {
  logs: LogEntry[];
  settings?: UserSettings;
  user?: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export default function MLAnalysisWidget({ logs, settings, user }: MLAnalysisWidgetProps) {
    const { t } = useTranslation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mlResult, setMlResult] = useState<{
    predictedNextHour: number,
    predictedNext2Hours: number,
    riskOfHypo: boolean,
    insights: string[],
    accuracy: number,
    datasetSize?: number,
    predictionCurve?: { timestamp: number, offsetMs: number, value: number }[],
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
  const [backupInfo, setBackupInfo] = useState<{ timestamp: number; datasetSize?: number } | null>(null);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [hasBackupConsent, setHasBackupConsent] = useState(() => {
    return localStorage.getItem('glikosense_backup_consent') === 'true';
  });
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [isBackupActionRunning, setIsBackupActionRunning] = useState(false);

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
        const docRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'neural_model', 'backup');
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
      toast.success(i18n.t('auto.zgoda_udzielona_mozesz_teraz_z', { defaultValue: i18n.t('auto.zgoda_udzielona_mozesz_te', { defaultValue: "Zgoda udzielona. Możesz teraz zarządzać kopią zapasową." }) }));
    }
  };

  const handleBackupToCloud = async () => {
    if (!user || user.isAnonymous) {
      toast.error(i18n.t('auto.zaloguj_sie_na_pelne_konto_e_m', { defaultValue: i18n.t('auto.zaloguj_sie_na_pelne_kont', { defaultValue: "Zaloguj się na pełne konto (E-mail lub Google), aby korzystać z kopii zapasowej." }) }));
      return;
    }
    if (!hasBackupConsent) {
      toast.error(i18n.t('auto.musisz_najpierw_zaakceptowac_i', { defaultValue: i18n.t('auto.musisz_najpierw_zaakcepto', { defaultValue: "Musisz najpierw zaakceptować informację o zgodzie." }) }));
      return;
    }

    setIsBackupActionRunning(true);
    const toastId = toast.loading("Archiwizowanie modelu GlikoSense 3.0 w chmurze...");
    const docPath = `/artifacts/diacontrolapp/users/${getEffectiveUid(user)}/neural_model/backup`;
    try {
      const modelData = await MLAnalyzer.exportCurrentModel();
      if (!modelData) {
        toast.dismiss(toastId);
        toast.error("Nie znaleziono wyuczonego lokalnego modelu. Przeanalizuj panel najpierw!");
        setIsBackupActionRunning(false);
        return;
      }

      const docRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'neural_model', 'backup');
      await setDoc(docRef, {
        ...modelData,
        datasetSize: mlResult?.datasetSize || 0
      });

      setBackupInfo({
        timestamp: modelData.timestamp,
        datasetSize: mlResult?.datasetSize || 0
      });

      toast.success(i18n.t('auto.kopia_zapasowa_modelu_glikosen', { defaultValue: i18n.t('auto.kopia_zapasowa_modelu_gli', { defaultValue: "Kopia zapasowa modelu GlikoSense 3.0 została zapisana pomyślnie!" }) }), { id: toastId });
    } catch (err) {
      toast.error(i18n.t('auto.blad_podczas_eksportowania_lub', { defaultValue: i18n.t('auto.blad_podczas_eksportowani', { defaultValue: "Błąd podczas eksportowania lub zapisu kopii zapasowej." }) }), { id: toastId });
      handleFirestoreError(err, OperationType.WRITE, docPath);
    } finally {
      setIsBackupActionRunning(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!user || user.isAnonymous) {
      toast.error(i18n.t('auto.zaloguj_sie_na_pelne_konto_e_m', { defaultValue: i18n.t('auto.zaloguj_sie_na_pelne_kont', { defaultValue: "Zaloguj się na pełne konto (E-mail lub Google), aby pobrać kopię zapasową." }) }));
      return;
    }
    if (!hasBackupConsent) {
      toast.error(i18n.t('auto.udziel_najpierw_zgody_na_zarza', { defaultValue: i18n.t('auto.udziel_najpierw_zgody_na', { defaultValue: "Udziel najpierw zgody na zarządzanie kopią zapasową." }) }));
      return;
    }

    const confirmRestore = window.confirm(
      i18n.t('auto.uwaga_przywrocenie_modelu_z_ch', { defaultValue: i18n.t('auto.uwaga_przywrocenie_modelu', { defaultValue: "UWAGA: Przywrócenie modelu z chmury CAŁKOWICIE nadpisze obecne lokalne parametry sieci neuronowej GlikoSense 3.0 zainstalowane w przeglądarce. Czy chcesz kontynuować?" }) })
    );
    if (!confirmRestore) return;

    setIsBackupActionRunning(true);
    const toastId = toast.loading("Pobieranie i importowanie modelu z chmury...");
    const docPath = `/artifacts/diacontrolapp/users/${getEffectiveUid(user)}/neural_model/backup`;
    try {
      const docRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'neural_model', 'backup');
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
        toast.success(i18n.t('auto.model_glikosense_3_0_zostal_po', { defaultValue: i18n.t('auto.model_glikosense_3_0_zost', { defaultValue: "Model GlikoSense 3.0 został pomyślnie przywrócony z chmury!" }) }), { id: toastId });
        runML(true);
      } else {
        toast.error(i18n.t('auto.wystapil_nieznany_problem_z_pl', { defaultValue: i18n.t('auto.wystapil_nieznany_problem', { defaultValue: "Wystąpił nieznany problem z plikiem modelu." }) }), { id: toastId });
      }
    } catch (err) {
      toast.error(i18n.t('auto.blad_podczas_przywracania_kopi', { defaultValue: i18n.t('auto.blad_podczas_przywracania', { defaultValue: "Błąd podczas przywracania kopii zapasowej." }) }), { id: toastId });
      handleFirestoreError(err, OperationType.GET, docPath);
    } finally {
      setIsBackupActionRunning(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!user || user.isAnonymous) return;
    const confirmDelete = window.confirm(i18n.t('auto.czy_na_pewno_chcesz_usunac_kop', { defaultValue: i18n.t('auto.czy_na_pewno_chcesz_usuna', { defaultValue: "Czy na pewno chcesz usunąć kopię zapasową modelu z chmury? Ta operacja jest nieodwracalna." }) }));
    if (!confirmDelete) return;

    setIsBackupActionRunning(true);
    const toastId = toast.loading("Usuwanie kopii zapasowej...");
    const docPath = `/artifacts/diacontrolapp/users/${getEffectiveUid(user)}/neural_model/backup`;
    try {
      const docRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'neural_model', 'backup');
      await deleteDoc(docRef);
      setBackupInfo(null);
      toast.success(i18n.t('auto.kopia_zapasowa_w_chmurze_zosta', { defaultValue: i18n.t('auto.kopia_zapasowa_w_chmurze', { defaultValue: "Kopia zapasowa w chmurze została usunięta." }) }), { id: toastId });
    } catch (err) {
      toast.error(i18n.t('auto.blad_podczas_usuwania_kopii_za', { defaultValue: i18n.t('auto.blad_podczas_usuwania_kop', { defaultValue: "Błąd podczas usuwania kopii zapasowej." }) }), { id: toastId });
      handleFirestoreError(err, OperationType.DELETE, docPath);
    } finally {
      setIsBackupActionRunning(false);
    }
  };

  const handleExportToFile = async () => {
    try {
      const modelData = await MLAnalyzer.exportCurrentModel();
      if (!modelData) {
        toast.error(i18n.t('auto.brak_wytrenowanego_modelu_do_p', { defaultValue: i18n.t('auto.brak_wytrenowanego_modelu', { defaultValue: "Brak wytrenowanego modelu do pobrania. Wykonaj najpierw analizę!" }) }));
        return;
      }
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(modelData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `glikosense_model_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success(i18n.t('auto.pomyslnie_pobrano_model_do_pli', { defaultValue: i18n.t('auto.pomyslnie_pobrano_model_d', { defaultValue: "Pomyślnie pobrano model do pliku JSON!" }) }));
    } catch (err) {
      toast.error(i18n.t('auto.blad_eksportu_do_pliku', { defaultValue: i18n.t('auto.blad_eksportu_do_pliku', { defaultValue: "Błąd eksportu do pliku." }) }));
      console.error(err);
    }
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
          throw new Error(i18n.t('auto.nieprawidlowy_format_pliku_mod', { defaultValue: i18n.t('auto.nieprawidlowy_format_plik', { defaultValue: "Nieprawidłowy format pliku modelu GlikoSense." }) }));
        }
        
        const confirmRestore = window.confirm(
          i18n.t('auto.uwaga_wgranie_modelu_z_pliku_n', { defaultValue: i18n.t('auto.uwaga_wgranie_modelu_z_pl', { defaultValue: "Uwaga: Wgranie modelu z pliku nadpisze aktualny model w przeglądarce. Czy chcesz kontynuować?" }) })
        );
        if (!confirmRestore) return;
        
        const success = await MLAnalyzer.importModelFromBackup(parsed);
        if (success) {
          toast.success(i18n.t('auto.pomyslnie_wgrano_model_z_pliku', { defaultValue: i18n.t('auto.pomyslnie_wgrano_model_z', { defaultValue: "Pomyślnie wgrano model z pliku JSON!" }) }));
          runML(true);
        } else {
          toast.error(i18n.t('auto.blad_podczas_importu_modelu', { defaultValue: i18n.t('auto.blad_podczas_importu_mode', { defaultValue: "Błąd podczas importu modelu." }) }));
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : i18n.t('auto.blad_odczytu_pliku_upewnij_sie', { defaultValue: i18n.t('auto.blad_odczytu_pliku_upewni', { defaultValue: "Błąd odczytu pliku. Upewnij się, że plik jest poprawnym JSONem modelu." }) }));
        console.error(err);
      } finally {
        e.target.value = '';
      }
    };
  };

  const lastProcessedLogsRef = React.useRef<string>("");

  useEffect(() => {
    const logsKey = logs.length > 0 
      ? `${logs.length}-${logs[logs.length - 1].timestamp || logs[logs.length - 1].createdAt}`
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
              if (!qResult) setError(i18n.t('auto.blad_pelnej_analizy', { defaultValue: i18n.t('auto.blad_pelnej_analizy', { defaultValue: "Błąd pełnej analizy." }) }));
          })
          .finally(() => {
              clearTimeout(safetyTimeout);
          });
          
    } catch (e) {
        console.error("GlikoSense Quick Analysis Error:", e);
        setError(i18n.t('auto.nie_udalo_sie_przeanalizowac_d', { defaultValue: i18n.t('auto.nie_udalo_sie_przeanalizo', { defaultValue: "Nie udało się przeanalizować danych. Spróbuj później." }) }));
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
  }, [logs, mlResult]);

  const dailyStats = useMemo(() => {
    const now = new Date();
    const days = [0, 1, 2].map(offset => {
        const d = new Date(now);
        d.setDate(d.getDate() - offset);
        d.setHours(0, 0, 0, 0);
        return {
            date: d.getTime(),
            label: offset === 0 ? 'Dzis' : offset === 1 ? 'Wczor' : d.toLocaleDateString('pl-PL', { weekday: 'short' }),
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

  return (
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
            <h3 className="text-xl font-black tracking-tighter text-slate-800 dark:text-white">{t('auto.glikosense', { defaultValue: 'GlikoSense' })}<span className="text-indigo-500 text-2xl leading-none">.</span></h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1.5 mt-0.5">
              {isAnalyzing ? (
                <>
                  <Loader2 size={10} className="animate-spin text-accent-500" />  {t('auto.obliczanie', { defaultValue: 'OBLICZANIE...' })}
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
          title={t('auto.odśwież_analizę', { defaultValue: i18n.t('auto.odswiez_analize', { defaultValue: "Odśwież analizę" }) })}
        >
          <RefreshCw size={18} className={isAnalyzing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* GlikoSense Neural Backup Control Trigger & Panel */}
      <div className="relative z-20 mb-6 bg-slate-50 dark:bg-slate-800/20 p-4 border border-slate-200/40 dark:border-slate-800/40 rounded-[2rem] hover:border-indigo-500/20 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cloud size={18} className="text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-700 dark:text-slate-100 leading-none">{t('auto.sieć_neuronowa_glikosense_3_0', { defaultValue: i18n.t('auto.siec_neuronowa_glikosense', { defaultValue: "Sieć neuronowa GlikoSense 3.0" }) })}</span>
              <span className="text-[10px] font-bold text-slate-400 opacity-80 mt-1">{t('auto.kopia_zapasowa_modelu_w_zabezpieczo', { defaultValue: 'Kopia zapasowa modelu w zabezpieczonej chmurze' })}</span>
            </div>
          </div>
          <button
            onClick={() => setShowBackupPanel(!showBackupPanel)}
            className="px-3 py-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-500/5 hover:bg-indigo-500/10 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15 rounded-xl transition-all"
          >
            {showBackupPanel ? i18n.t('auto.zwin', { defaultValue: i18n.t('auto.zwin', { defaultValue: "Zwiń" }) }) : i18n.t('auto.zarzadzaj', { defaultValue: i18n.t('auto.zarzadzaj', { defaultValue: "Zarządzaj" }) })}
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
                <span className="text-xs font-black uppercase tracking-wider block">{t('auto.ważna_informacja_o_modelu', { defaultValue: i18n.t('auto.wazna_informacja_o_modelu', { defaultValue: "Ważna Informacja o Modelu" }) })}</span>
                <p className="text-xs font-medium leading-relaxed">
                  
                                                    {t('auto.twoja_sieć_neuronowa_uczy_się_lokal', { defaultValue: i18n.t('auto.twoja_siec_neuronowa_uczy', { defaultValue: "Twoja sieć neuronowa uczy się lokalnie na Twoim urządzeniu. Czyszczenie pamięci podręcznej przeglądarki lub zmiana urządzenia spowoduje" }) })}{" "}
                  <strong className="font-extrabold text-amber-600 dark:text-amber-300">{t('auto.bezzwrotną_utratę_wyuczonego_modelu', { defaultValue: i18n.t('auto.bezzwrotna_utrate_wyuczon', { defaultValue: "bezzwrotną utratę wyuczonego modelu GlikoSense 3.0" }) })}</strong>{" "}
                  
                                                    {t('auto.i_przywrócenie_wartości_podstawowyc', { defaultValue: i18n.t('auto.i_przywrocenie_wartosci_p', { defaultValue: "i przywrócenie wartości podstawowych. Kopia w chmurze chroni przed utratą Twojej spersonalizowanej inteligencji." }) })}
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
                  
                                                    {t('auto.rozumiem_ryzyko_i_wyrażam_świadomą_', { defaultValue: i18n.t('auto.rozumiem_ryzyko_i_wyrazam', { defaultValue: "Rozumiem ryzyko i wyrażam świadomą zgodę" }) })}
                                                  </span>
                <p className="text-[10px] text-slate-400">
                  
                                                    {t('auto.wyrażam_zgodę_na_bezpieczny_szyfrow', { defaultValue: i18n.t('auto.wyrazam_zgode_na_bezpiecz', { defaultValue: "Wyrażam zgodę na bezpieczny, szyfrowany zapis wag i topologii mojej lokalnej sieci neuronowej w moim profilu bazy danych Firebase." }) })}
                                                  </p>
              </div>
            </div>

            {/* If user is not logged in or is guest */}
            {!user ? (
              <div className="bg-indigo-500/5 border border-indigo-500/15 p-3 rounded-2xl text-center text-xs text-indigo-500 font-bold">
                
                                              {t('auto.zaloguj_się_na_pełne_konto_e_mailem', { defaultValue: i18n.t('auto.zaloguj_sie_na_pelne_kont', { defaultValue: "⚠️ Zaloguj się na pełne konto (e-mailem lub Google), aby uzyskać dostęp do kopii zapasowej w bezpiecznej chmurze." }) })}
                                            </div>
            ) : user.isAnonymous ? (
              <div className="bg-amber-500/5 border border-amber-500/15 p-3 rounded-2xl text-center text-xs text-amber-600 dark:text-amber-400 font-bold">
                
                                                  {t('auto.kopia_zapasowa_modelu_jest_niedostę', { defaultValue: i18n.t('auto.kopia_zapasowa_modelu_jes', { defaultValue: "⚠️ Kopia zapasowa modelu jest niedostępna w trybie gościa. Zapobiegaj utracie modelu logując się na pełne konto (E-mail lub Google)." }) })}
                                                </div>
            ) : (
              <div className="space-y-3">
                {/* Last backup info */}
                <div className="flex items-center justify-between text-xs p-3 bg-slate-100/60 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/40">
                  <span className="font-black uppercase text-slate-400 tracking-wider text-[9px]">{t('auto.stan_kopii_chmury', { defaultValue: 'Stan kopii chmury' })}</span>
                  {loadingBackup ? (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Loader2 size={12} className="animate-spin" />  {t('auto.sprawdzanie', { defaultValue: 'Sprawdzanie...' })}
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
                    <CloudUpload size={14} />  {t('auto.eksportuj_do_chmury', { defaultValue: 'EKSPORTUJ DO CHMURY' })}
                                                                </button>

                  <button
                    onClick={handleRestoreFromCloud}
                    disabled={isBackupActionRunning || !hasBackupConsent || !backupInfo}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 disabled:text-emerald-500/50 rounded-xl transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <CloudDownload size={14} />  {t('auto.przywróć_z_chmury', { defaultValue: i18n.t('auto.przywroc_z_chmury', { defaultValue: "PRZYWRÓĆ Z CHMURY" }) })}
                                                                </button>

                  {backupInfo && (
                    <button
                      onClick={handleDeleteBackup}
                      disabled={isBackupActionRunning}
                      className="p-2.5 text-red-500 hover:text-red-600 bg-red-500/5 hover:bg-red-500/10 rounded-xl transition-all shrink-0 cursor-pointer disabled:opacity-50"
                      title={t('auto.usuń_kopię_zapasową_z_chmury', { defaultValue: i18n.t('auto.usun_kopie_zapasowa_z_chm', { defaultValue: "Usuń kopię zapasową z chmury" }) })}
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
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{t('auto.kopia_lokalna_plik_idealne_dla_plik', { defaultValue: i18n.t('auto.kopia_lokalna_plik_idealn', { defaultValue: "Kopia Lokalna / Plik (Idealne dla pliku APK & Gości)" }) })}</span>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  
                                                    {t('auto.całkowicie_bezpłatne_pobieranie_spe', { defaultValue: i18n.t('auto.calkowicie_bezplatne_pobi', { defaultValue: "Całkowicie bezpłatne pobieranie spersonalizowanych wag sieci neuronowej bezpośrednio na pamięć urządzenia lub ich wczytywanie z pliku JSON." }) })}
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
               <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('auto.zbyt_mało_danych_do_analizy_min_5_w', { defaultValue: i18n.t('auto.zbyt_malo_danych_do_anali', { defaultValue: "Zbyt mało danych do analizy (min. 5 wpisów)" }) })}</span>
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
                 
                                               {t('auto.spróbuj_ponownie', { defaultValue: i18n.t('auto.sprobuj_ponownie', { defaultValue: "Spróbuj ponownie" }) })}
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
                className="space-y-5 relative z-10"
              >
                  <div className="grid grid-cols-2 gap-3 md:gap-5">
                      {/* Prediction Box */}
                      <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 dark:from-slate-950 dark:via-indigo-950 dark:to-violet-950 p-5 md:p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden group border border-indigo-500/20 flex flex-col">
                          <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:opacity-20 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 transform-gpu">
                             <TrendingUp size={160} />
                          </div>
                          {/* Inner glow */}
                          <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent pointer-events-none" />
                          
                          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4 relative z-10">
                              <div className="bg-indigo-500/30 p-1.5 md:p-2 rounded-xl backdrop-blur-md">
                                <Target size={16} className="text-indigo-200" />
                              </div>
                              <span className="text-[10px] md:text-[11px] font-black text-indigo-100 uppercase tracking-[0.1em] md:tracking-[0.2em] opacity-90">{t('auto.kierunek_2h', { defaultValue: 'Kierunek (2h)' })}</span>
                          </div>
                          <div className="flex items-baseline gap-1 md:gap-2 relative z-10 mt-auto">
                              <span className="text-5xl md:text-7xl font-black tracking-tighter drop-shadow-sm leading-none">{mlResult.predictedNext2Hours}</span>
                              <span className="text-[10px] md:text-sm font-bold text-indigo-300 tracking-wider md:tracking-widest">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
                          </div>
                          
                          {/* Mini sparkline visualization */}
                          <div className="h-10 md:h-16 w-full mt-3 md:mt-4 pr-2 md:pr-4 opacity-100 mix-blend-screen shrink-0">
                             <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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

                      {/* Confidence & Alerts Box */}
                      <div className="flex flex-col gap-3 md:gap-5">
                          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-5 md:p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-700/60 shadow-lg flex-1 flex flex-col justify-center relative overflow-hidden group">
                              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                              <div className="flex items-center gap-2 mb-2 md:mb-3 relative z-10">
                                  <div className="bg-emerald-100 dark:bg-emerald-900/40 p-1.5 md:p-2 rounded-xl">
                                    <GlikoSenseIcon size={16} isAnalyzing={true} />
                                  </div>
                                  <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] md:tracking-[0.2em] leading-tight">{t('auto.pewność_modelu', { defaultValue: i18n.t('auto.pewnosc_modelu', { defaultValue: "Pewność Modelu" }) })}</span>
                              </div>
                              <div className="flex items-end gap-2 relative z-10 mt-auto">
                                  <span className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{mlResult.accuracy}%</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-700/50 h-2 md:h-2.5 rounded-full mt-3 md:mt-4 overflow-hidden relative z-10">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${mlResult.accuracy}%` }}
                                    transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
                                    className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full" 
                                  />
                              </div>
                              {mlResult.datasetSize && (
                                <div className="mt-3 flex items-center justify-between relative z-10">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('auto.model_wyuczony', { defaultValue: 'Model Wyuczony:' })}</span>
                                  <span className="text-[10px] font-black text-indigo-500">{mlResult.datasetSize}  {t('auto.pkt_danych', { defaultValue: 'pkt danych' })}</span>
                                </div>
                              )}
                          </div>
                          
                          {mlResult.riskOfHypo && (
                             <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-900/20 border-2 border-amber-200 dark:border-amber-800/50 p-3 md:p-4 rounded-[2rem] flex items-center justify-center gap-2 md:gap-3 text-amber-600 dark:text-amber-400 shadow-sm"
                             >
                                <div className="bg-white/50 dark:bg-black/20 p-1.5 md:p-2 rounded-full">
                                  <AlertTriangle size={16} className="animate-pulse" />
                                </div>
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.1em] md:tracking-[0.2em]">{t('auto.ryzyko_hipo', { defaultValue: 'Ryzyko Hipo' })}</span>
                             </motion.div>
                          )}
                      </div>
                  </div>

                  {mlResult.metrics && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group glass-target">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-indigo-500 transition-colors">{t('auto.profil_działania_insuliny', { defaultValue: i18n.t('auto.profil_dzialania_insuliny', { defaultValue: "Profil Działania Insuliny" }) })}</span>
                              <div className="flex flex-col">
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">{mlResult.metrics.iob.toFixed(1)} <span className="text-xs font-bold text-slate-400 tracking-normal">j</span></span>
                                {mlResult.metrics.iob > 0 && (
                                  <span className="text-[7px] font-bold text-pink-500/80 uppercase mt-0.5 tracking-tighter">{t('auto.start_20m_szczyt_75m', { defaultValue: 'Start: ~20m • Szczyt: ~75m' })}</span>
                                )}
                              </div>
                          </div>
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group glass-target">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-amber-500 transition-colors">{t('auto.aktywne_węglow', { defaultValue: i18n.t('auto.aktywne_weglow', { defaultValue: "Aktywne Węglow." }) })}</span>
                              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">{mlResult.metrics.cob.toFixed(0)} <span className="text-xs font-bold text-slate-400 tracking-normal">g</span></span>
                          </div>
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group glass-target">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-amber-500 transition-colors">{t('auto.oporność_bias', { defaultValue: i18n.t('auto.opornosc_bias', { defaultValue: "Oporność (Bias)" }) })}</span>
                              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                {mlResult.metrics.avgBias > 0 ? '+' : ''}{mlResult.metrics.avgBias.toFixed(0)} <span className="text-xs font-bold text-slate-400 tracking-normal">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
                              </span>
                          </div>
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group glass-target">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-emerald-500 transition-colors">{t('auto.gmi_wskaźnik', { defaultValue: i18n.t('auto.gmi_wskaznik', { defaultValue: "GMI (Wskaźnik)" }) })}</span>
                              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">{mlResult.metrics.gmiPercentage > 0 ? mlResult.metrics.gmiPercentage.toFixed(1) : '--'} <span className="text-xs font-bold text-slate-400 tracking-normal">%</span></span>
                          </div>
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group glass-target">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-orange-500 transition-colors">{t('auto.czułość_węg', { defaultValue: i18n.t('auto.czulosc_weg', { defaultValue: "Czułość (Węg.)" }) })}</span>
                              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                {mlResult.metrics.carbSensitivity > 0 ? '+' : ''}{mlResult.metrics.carbSensitivity.toFixed(0)} <span className="text-xs font-bold text-slate-400 tracking-normal whitespace-nowrap">{t('auto.50g', { defaultValue: '/ 50g' })}</span>
                              </span>
                          </div>
                          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group glass-target">
                              <span className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 group-hover:text-cyan-500 transition-colors">{t('auto.wrażliwość_ins', { defaultValue: i18n.t('auto.wrazliwosc_ins', { defaultValue: "Wrażliwość (Ins.)" }) })}</span>
                              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                {mlResult.metrics.insulinSensitivity > 0 ? '+' : ''}{mlResult.metrics.insulinSensitivity.toFixed(0)} <span className="text-xs font-bold text-slate-400 tracking-normal whitespace-nowrap">{t('auto.1j', { defaultValue: '/ 1j' })}</span>
                              </span>
                          </div>
                      </div>
                  )}

                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-900/40 p-6 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-700/50 space-y-4">
                      <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-500" />  {t('auto.wnioski_systemu', { defaultValue: 'Wnioski Systemu' })}
                                                                </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mlResult.insights.map((insight, idx) => {
                            const isWarning = insight.includes('⚠️') || insight.includes('🚨') || insight.includes('🎯');
                            return (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3 + (idx * 0.1) }}
                                  key={`insight-text-${idx}`} 
                                  className={`p-4 rounded-3xl flex gap-3 text-sm font-medium leading-relaxed shadow-sm ${
                                    isWarning 
                                    ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-800 border-amber-200 dark:from-amber-950/40 dark:to-amber-900/20 dark:text-amber-300 dark:border-amber-900/50' 
                                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-700/50'
                                  } border`}
                                >
                                    {insight}
                                </motion.div>
                            );
                        })}
                      </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-900/40 p-6 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-700/50 space-y-4">
                      <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <CalendarDays size={14} className="text-indigo-500" />  {t('auto.ostatnie_3_dni', { defaultValue: 'Ostatnie 3 Dni' })}
                                                                </h4>
                      <div className="grid grid-cols-3 gap-3">
                        {dailyStats.map((stat, idx) => (
                           <div key={`insight-${idx}`} className="bg-white dark:bg-slate-800/80 p-4 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col items-center justify-center gap-1.5 transition-all hover:border-indigo-500/30 glass-target">
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</span>
                             <div className="flex flex-col items-center">
                               <span className={cn(
                                 "text-lg font-black leading-none",
                                 stat.avg ? (stat.avg > 180 || stat.avg < 70 ? 'text-amber-500' : 'text-emerald-500') : 'text-slate-300'
                               )}>
                                 {stat.avg || '--'}
                               </span>
                               <span className="text-[8px] font-bold text-slate-400 uppercase">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
                             </div>
                             <div className="flex flex-col items-center w-full pt-1 border-t border-slate-50 dark:border-slate-700/30">
                               <div className="flex items-center gap-1">
                                 <Target size={10} className="text-emerald-500" />
                                 <span className="text-[11px] font-black text-slate-800 dark:text-slate-200">{stat.tir != null ? `${stat.tir}%` : '--'}</span>
                               </div>
                               <div className="flex items-center gap-1 text-slate-400">
                                 <Syringe size={10} className="text-indigo-400" />
                                 <span className="text-[9px] font-bold">{stat.bolus > 0 ? stat.bolus.toFixed(1) : '0'} j</span>
                               </div>
                             </div>
                           </div>
                        ))}
                      </div>
                  </div>
              </motion.div>
          ) : (
            <motion.div 
               key="loading"
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
          )}
      </AnimatePresence>
    </div>
  );
}
