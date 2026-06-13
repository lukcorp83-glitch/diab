import i18n from '../i18n';
import { getEffectiveUid } from "../lib/utils";
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { motion } from "motion/react";
import { LogEntry, UserSettings } from "../types";
import {
  Droplets,
  Calculator,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Camera,
  Loader2,
  Edit3,
  X,
  Bell,
  AlertTriangle,
  BarChart2,
} from "lucide-react";
import { cn, calculateIOB, calculateCOB, getEffectiveIOB } from "../lib/utils";
import { db, auth } from "../lib/firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { App as CapacitorApp } from '@capacitor/app';
import { geminiService } from "../services/gemini";
import { toast } from "react-hot-toast";
import { notificationService } from "../services/notificationService";

import { Haptics } from "../lib/haptics";
import { fetchCurrentWeather } from "../services/weatherService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

export default function BolusCalculator({
  logs,
  user,
  setTab,
  setSharedPlate,
  pumpStatus,
  isShortcutMode,
}: {
  logs: LogEntry[];
  user: any;
  setTab?: (t: string) => void;
  setSharedPlate?: React.Dispatch<React.SetStateAction<any[]>>;
  pumpStatus?: any;
  isShortcutMode?: boolean;
}) {
  const { t } = useTranslation();
  const [bg, setBg] = useState<string>("");
  const [carbs, setCarbs] = useState<string>("");
  const [polyols, setPolyols] = useState<string>("");
  const [protein, setProtein] = useState<string>("");
  const [fat, setFat] = useState<string>("");
  const [mealName, setMealName] = useState<string>("");
  const [isPizzaMode, setIsPizzaMode] = useState(false);
  const [trend, setTrend] = useState<"up" | "stable" | "down">("stable");
  const [dose, setDose] = useState<number>(0);
  const [manualDose, setManualDose] = useState<string | null>(null);
  const [extendedTime, setExtendedTime] = useState<number>(0); // how many hours to extend
  const [settings, setSettings] = useState<UserSettings>({
    isf: 58,
    wwRatio: 16,
    wbtRatio: 18,
    targetMin: 70,
    targetMax: 140,
    dia: 4,
  });
  const [scanning, setScanning] = useState(false);
  const [scanResultMsg, setScanResultMsg] = useState<string | null>(null);
  const [aiRec, setAiRec] = useState<{
    recommendedDose: number;
    reasoning: string;
    confidence: string;
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAlcoholMode, setIsAlcoholMode] = useState(false);
  const [alcoholType, setAlcoholType] = useState<string | null>(null);
  const [alcoholWarning, setAlcoholWarning] = useState<string | null>(null);
  const [alcoholReduction, setAlcoholReduction] = useState<number>(1.0);
  const [reminderActive, setReminderActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localISOTime = new Date(Date.now() - tzOffset)
    .toISOString()
    .slice(0, 16);
  const [entryTime, setEntryTime] = useState<string>(localISOTime);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    getDoc(
      doc(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "settings",
        "profile",
      ),
    )
      .then((d) => {
        if (d.exists()) setSettings((prev) => ({ ...prev, ...d.data() }));
      })
      .catch((e) => {
        if (!e.message?.includes("offline"))
          console.error("Error fetching profile settings:", e);
      });

    // Auto-fill latest BG
    const lastG = logs.find((l) => l.type === "glucose");
    if (lastG && Date.now() - lastG.timestamp < 30 * 60 * 1000 && !bg) {
      setBg(lastG.value.toString());
    }

    const pending = sessionStorage.getItem("pending_meal");
    if (pending) {
      try {
        const parsed = JSON.parse(pending);
        const pCarbs =
          parsed.carbs !== undefined
            ? (Math.round(parseFloat(parsed.carbs) * 10) / 10).toString()
            : "";
        setCarbs(pCarbs);
        setProtein(parsed.protein?.toString() || "");
        setFat(parsed.fat?.toString() || "");
        if (parsed.name) setMealName(parsed.name);
        if (parseFloat(parsed.protein) > 0 || parseFloat(parsed.fat) > 0) {
          setIsPizzaMode(true);
        }
        if (parsed.items) {
          setItems(parsed.items);
        }
        sessionStorage.removeItem("pending_meal");
      } catch (e) {
        console.error(e);
      }
    }

    const pendingCorr = sessionStorage.getItem("pending_correction");
    if (pendingCorr) {
      try {
        const parsed = JSON.parse(pendingCorr);
        if (parsed.bg) setBg(parsed.bg.toString());
        if (parsed.dose !== undefined) {
          setManualDose(parsed.dose.toString());
          setCarbs("");
          setProtein("");
          setFat("");
          setPolyols("");
          setMealName("Szybka korekta");
        }
        sessionStorage.removeItem("pending_correction");
      } catch (e) {
        console.error(e);
      }
    }
  }, [user, logs]);

  const [activeProfileTime, setActiveProfileTime] = useState<string | null>(
    null,
  );
  const [doseBreakdown, setDoseBreakdown] = useState<
    { name: string; value: number; color: string }[]
  >([]);

  useEffect(() => {
    calculateDose();
  }, [
    bg,
    carbs,
    polyols,
    protein,
    fat,
    isPizzaMode,
    trend,
    settings,
    alcoholReduction,
  ]);

  const calculateDose = () => {
    const bgNum = parseFloat(bg) || 0;
    const carbsNum = parseFloat(carbs) || 0;
    const polyolsNum = parseFloat(polyols) || 0;
    const protNum = parseFloat(protein) || 0;
    const fatNum = parseFloat(fat) || 0;

    // Net carbs calculation
    const netCarbs = Math.max(0, carbsNum - polyolsNum);

    let currentIsf = settings.isf;
    let currentWwRatio = settings.wwRatio;
    let activeProfileStr = null;

    if (settings.hourlyProfiles && settings.hourlyProfiles.length > 0) {
      const now = new Date();
      const currentHourStr =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0");
      const sorted = [...settings.hourlyProfiles].sort((a, b) =>
        a.time.localeCompare(b.time),
      );
      let activeProfile = sorted
        .slice()
        .reverse()
        .find((p) => p.time <= currentHourStr);
      if (!activeProfile && sorted.length > 0)
        activeProfile = sorted[sorted.length - 1];

      if (activeProfile) {
        currentIsf = activeProfile.isf || currentIsf;
        currentWwRatio = activeProfile.wwRatio || currentWwRatio;
        activeProfileStr = activeProfile.time;
      }
    }
    setActiveProfileTime(activeProfileStr);

    const mealDose = netCarbs / currentWwRatio;

    let wbtDose = 0;
    let extendHrs = 0;
    if (isPizzaMode) {
      const kcalFromProtFat = protNum * 4 + fatNum * 9;
      const wbt = kcalFromProtFat / 100;
      wbtDose = wbt * (10 / currentWwRatio);
      if (wbt > 0) {
        if (wbt <= 1) extendHrs = 3;
        else if (wbt <= 2) extendHrs = 4;
        else extendHrs = 5;
      }
    }
    setExtendedTime(extendHrs);

    const target = (settings.targetMin + settings.targetMax) / 2;
    let corrDose = bgNum > target ? (bgNum - target) / currentIsf : 0;
    if (bgNum > 0 && bgNum < target) {
      corrDose = (bgNum - target) / currentIsf; // negative correction
    }

    const iob = getEffectiveIOB(logs, pumpStatus, settings.dia || 4);
    const cob = calculateCOB(logs);
    const cobDose = cob / currentWwRatio;

    const baseVal = mealDose + wbtDose + corrDose - iob;

    let chartData = [];
    if (mealDose > 0)
      chartData.push({
        name: t('bolus.chart_carbs'),
        value: parseFloat(mealDose.toFixed(2)),
        color: "#3b82f6",
      });
    if (wbtDose > 0)
      chartData.push({
        name: "WBT",
        value: parseFloat(wbtDose.toFixed(2)),
        color: "#f59e0b",
      });
    if (corrDose > 0)
      chartData.push({
        name: t('bolus.chart_corr_pos'),
        value: parseFloat(corrDose.toFixed(2)),
        color: "#ef4444",
      });
    if (corrDose < 0)
      chartData.push({
        name: t('bolus.chart_corr_neg'),
        value: parseFloat(Math.abs(corrDose).toFixed(2)),
        color: "#10b981",
      }); // we show absolute in chart but it reduces total
    if (iob > 0)
      chartData.push({
        name: "IOB (-)",
        value: parseFloat(iob.toFixed(2)),
        color: "#ef4444",
      });

    const trendFactor = trend === "up" ? 1.15 : trend === "down" ? 0.85 : 1.0;
    let total = Math.max(0, baseVal * trendFactor * alcoholReduction);

    if (trendFactor !== 1.0 && total > 0) {
      const trendImpact = baseVal * trendFactor - baseVal;
      chartData.push({
        name: "Trend",
        value: parseFloat(Math.abs(trendImpact).toFixed(2)),
        color: trend === "up" ? "#f97316" : "#06b6d4",
      });
    }

    if (alcoholReduction !== 1.0 && total > 0) {
      const alcImpact =
        baseVal * trendFactor * alcoholReduction - baseVal * trendFactor;
      chartData.push({
        name: "Alkohol (-)",
        value: parseFloat(Math.abs(alcImpact).toFixed(2)),
        color: "#6366f1",
      });
    }

    setDoseBreakdown(chartData);

    const roundedTotal = Math.round(total * 10) / 10;
    setDose(roundedTotal);
    setManualDose(null);
  };

  const handleMealScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const result = await geminiService.analyzeMeal(base64);
          if (result && result.carbs) {
            setCarbs(result.carbs.toString());
            if (result.protein || result.fat) {
              setIsPizzaMode(true);
              setProtein((result.protein || 0).toString());
              setFat((result.fat || 0).toString());
            }
            setScanResultMsg(t('bolus.scan_recognized', { name: result.mealName }));
            setTimeout(() => setScanResultMsg(null), 5000);
          }
        } catch (err) {
          console.error("AI scan error:", err);
          const errStr = String(err);
          if (
            errStr.includes("API key not valid") ||
            errStr.includes("API_KEY_INVALID")
          ) {
            setScanResultMsg(t('bolus.scan_invalid_api'));
          } else if (
            errStr.includes(i18n.t('auto.wszystkie_modele_ai_sa_obecnie', { defaultValue: "Wszystkie modele AI są obecnie zajęte" })) ||
            errStr.includes(i18n.t('auto.zajete', { defaultValue: "zajęte" }))
          ) {
            setScanResultMsg(t('bolus.scan_overloaded'));
          } else {
            setScanResultMsg(t('bolus.scan_error'));
          }
          setTimeout(() => setScanResultMsg(null), 5000);
        } finally {
          setScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("Meal scan error:", e);
      setScanResultMsg(t('bolus.scan_error'));
      setTimeout(() => setScanResultMsg(null), 5000);
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!user || saving) return;

    const finalDose = manualDose !== null ? parseFloat(manualDose) : dose;
    const bgNum = parseFloat(bg) || 0;
    const carbsNum = parseFloat(carbs) || 0;
    const protNum = parseFloat(protein) || 0;
    const fNum = parseFloat(fat) || 0;

    if (finalDose <= 0 && bgNum <= 0 && carbsNum <= 0) {
      toast.error(t('bolus.err_empty'));
      return;
    }

    setSaving(true);
    Haptics.medium();
    let tId: string | undefined;

    try {
      tId = toast.loading(t('bolus.processing'));
      const effectiveUid = getEffectiveUid(user);

      const timestamp = new Date(entryTime).getTime();
      const logsRef = collection(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        effectiveUid,
        "logs",
      );
      const batch = writeBatch(db);
      let ops = 0;

      // 1. Bolus + Metadata
      if (finalDose > 0) {
        const payload: any = {
          type: "bolus",
          value: Math.round(finalDose * 10) / 10,
          timestamp,
          description: mealName === "Szybka korekta" ? "Szybka korekta" : (isPizzaMode ? i18n.t('auto.laczony', { defaultValue: "Łączony" }) : "Kalkulator bolusa"),
        };
        if (carbsNum > 0) {
          payload.linkedMeal = {
            carbs: carbsNum,
            polyols: parseFloat(polyols) || 0,
            protein: protNum,
            fat: fNum,
            name: mealName || null,
            items: items.length > 0 ? items : undefined,
          };
        }
        if (isPizzaMode && extendedTime > 0) {
          payload.isExtended = true;
          payload.extendedTime = extendedTime;
        }
        const bolusDoc = doc(logsRef);
        batch.set(bolusDoc, payload);
        window.dispatchEvent(new CustomEvent('localLogAdd', { detail: { id: bolusDoc.id, ...payload } }));
        ops++;
      }

      // 2. Glucose
      if (bgNum > 0) {
        // Check if weather is enabled
        const settingsDocRef = doc(
          db,
          "artifacts",
          "diacontrolapp",
          "users",
          effectiveUid,
          "settings",
          "profile",
        );
        const settingsDoc = await getDoc(settingsDocRef);
        const settingsData = settingsDoc.exists() ? settingsDoc.data() : null;
        const weatherEnabled = settingsData?.weatherNeuralEnabled === true;

        const weather = weatherEnabled ? await fetchCurrentWeather() : null;
        const glucosePayload: any = {
          type: "glucose",
          value: Math.round(bgNum * 10) / 10,
          timestamp: timestamp - 10,
          description: "Wpisane w kalkulator",
        };
        if (weather) glucosePayload.weather = weather;

        const gluDoc = doc(logsRef);
        batch.set(gluDoc, glucosePayload);
        window.dispatchEvent(new CustomEvent('localLogAdd', { detail: { id: gluDoc.id, ...glucosePayload } }));
        ops++;
      }

      // 3. Separate Meal Entry (ONLY if no bolus)
      if (carbsNum > 0 && finalDose <= 0) {
        const payload: any = {
          type: "meal",
          value: Math.max(0, carbsNum - (parseFloat(polyols) || 0)),
          timestamp: timestamp - 5,
          description: mealName || "Pobrano z kalkulatora",
        };
        if (parseFloat(polyols) > 0) payload.polyols = parseFloat(polyols);
        if (protNum > 0) payload.protein = Math.round(protNum * 10) / 10;
        if (fNum > 0) payload.fat = Math.round(fNum * 10) / 10;
        
        const mealDoc = doc(logsRef);
        batch.set(mealDoc, payload);
        window.dispatchEvent(new CustomEvent('localLogAdd', { detail: { id: mealDoc.id, ...payload } }));
        ops++;
      }

      if (ops === 0) throw new Error(t('bolus.err_no_ops'));

      // OPTIMISTIC UPDATE: Close first, save in background
      Haptics.success();
      if (tId) toast.success(t('bolus.saved_syncing'), { id: tId });
      if (isShortcutMode) {
        CapacitorApp.exitApp();
      } else if (setTab) {
        setTab("dashboard");
      }

      // Background save - if it fails (e.g. Guest), we don't block the UI
      batch.commit().catch((err) => {
        Haptics.warning();
        console.warn(
          "[BolusCalculator] Background sync failed (likely Guest/No Auth):",
          err,
        );
      });

      // Clear local state
      setBg("");
      setCarbs("");
      setProtein("");
      setFat("");
      setPolyols("");
      setManualDose(null);
      setIsAlcoholMode(false);
      localStorage.removeItem("temp_meal_macro");
      if (setSharedPlate) {
        setSharedPlate([]);
      }
    } catch (err: any) {
      Haptics.error();
      console.error("[BolusCalculator] Error:", err);
      if (tId) toast.error(err.message || t('bolus.err_save'), { id: tId });
    } finally {
      setSaving(false);
    }
  };

  const getTimingAdvice = () => {
    const bgNum = parseFloat(bg) || 0;
    if (bgNum === 0) return null;
    if (bgNum < 70)
      return {
        text: t('bolus.timing_hypo'),
        color: "text-red-500",
      };
    if (bgNum <= 130)
      return {
        text: t('bolus.timing_normal'),
        color: "text-green-500",
      };
    if (bgNum <= 180)
      return {
        text: t('bolus.timing_high'),
        color: "text-amber-500",
      };
    if (bgNum <= 200)
      return {
        text: t('bolus.timing_very_high'),
        color: "text-orange-500",
      };
    return {
      text: t('bolus.timing_critical'),
      color: "text-red-600",
    };
  };

  const handleAskAi = async () => {
    Haptics.light();
    setLoadingAi(true);
    try {
      const bgNum = parseFloat(bg) || 0;
      const iob = getEffectiveIOB(logs, pumpStatus, settings.dia || 4);
      const cob = calculateCOB(logs);
      const currentDose = manualDose !== null ? parseFloat(manualDose) : dose;
      const netCarbsNum = Math.max(
        0,
        (parseFloat(carbs) || 0) - (parseFloat(polyols) || 0),
      );
      const result = await geminiService.getBolusRecommendation(
        bgNum,
        netCarbsNum,
        currentDose,
        trend,
        iob,
        cob,
        logs,
        settings
      );
      if (result) {
        setAiRec(result);
        if (result.recommendedDose !== undefined) {
          setDose(Math.round(result.recommendedDose * 10) / 10);
          setManualDose(null);
        }
      }
    } catch (e) {
      console.error("AI rec failed:", e);
    } finally {
      setLoadingAi(false);
    }
  };

  const advice = getTimingAdvice();

  const getAlgorithmicMealAnalysis = () => {
    const cNum = parseFloat(carbs) || 0;
    const pNum = parseFloat(protein) || 0;
    const fNum = parseFloat(fat) || 0;

    const tkcal = cNum * 4 + pNum * 4 + fNum * 9;
    if (tkcal === 0) return null;

    const cPct = ((cNum * 4) / tkcal) * 100;
    const pPct = ((pNum * 4) / tkcal) * 100;
    const fPct = ((fNum * 9) / tkcal) * 100;

    const isHighFat = fPct > 35 || fNum >= 15;
    const isHighProtein = pPct > 30;
    const isFastCarb = cPct > 65 && fPct < 15 && pPct < 15;

    let igEstimate = t('bolus.ig_medium');
    let igNumerical = 55;
    let behavior = t('bolus.behavior_balanced');

    if (isFastCarb) {
      igEstimate = t('bolus.ig_high');
      igNumerical = 80;
      behavior = t('bolus.behavior_fast_carb');
    } else if (isHighFat && isHighProtein) {
      igEstimate = t('bolus.ig_low');
      igNumerical = 30;
      behavior = t('bolus.behavior_pizza');
    } else if (isHighFat) {
      igEstimate = t('bolus.ig_low_medium');
      igNumerical = 40;
      behavior = t('bolus.behavior_high_fat');
    } else if (isHighProtein) {
      igEstimate = t('bolus.ig_low_medium');
      igNumerical = 45;
      behavior = t('bolus.behavior_high_protein');
    }

    const glEstimate = (cNum * igNumerical) / 100;

    return {
      kcal: tkcal.toFixed(0),
      carbsPct: cPct.toFixed(0),
      proteinPct: pPct.toFixed(0),
      fatPct: fPct.toFixed(0),
      ig: igEstimate,
      gl: glEstimate.toFixed(1),
      analysis: behavior,
    };
  };

  const algoMeal = getAlgorithmicMealAnalysis();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">
            {t('bolus.title')}
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] font-black p-2 rounded-xl outline-none border border-slate-100 dark:border-slate-700"
            />
            <button
              onClick={() => {
                if (isShortcutMode) CapacitorApp.exitApp();
                else setTab?.("dashboard");
              }}
              className="text-slate-300 hover:text-slate-500 p-2 text-xl font-bold transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase block text-center">
              {t('bolus.sugar')}
            </label>
            <input
              type="number"
              min="0"
              max="600"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              onBlur={() => {
                let v = parseFloat(bg);
                if (isNaN(v)) return;
                if (v < 0) v = 0;
                if (v > 600) v = 600;
                setBg(v.toString());
              }}
              placeholder={t('auto.mg_dl', { defaultValue: 'mg/dL' })}
              className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-xl outline-none border border-slate-100 dark:border-slate-700 focus:border-accent-500 transition-all dark:text-white"
            />
          </div>
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase block text-center">
              {t('bolus.carbs_g')}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="500"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                onBlur={() => {
                  let v = parseFloat(carbs);
                  if (isNaN(v)) return;
                  if (v < 0) v = 0;
                  if (v > 500) v = 500;
                  setCarbs(v.toString());
                }}
                placeholder="g"
                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-xl outline-none border border-slate-100 dark:border-slate-700 focus:border-accent-500 transition-all dark:text-white"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent-500 text-white rounded-xl active:scale-90 transition-all disabled:opacity-50"
              >
                {scanning ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleMealScan}
                className="hidden"
              />
            </div>
            {scanResultMsg && (
              <div className="absolute top-full left-0 mt-2 z-10 w-full bg-accent-50 dark:bg-accent-900/30 border border-accent-100 dark:border-accent-800 p-2 rounded-xl shadow-lg">
                <p className="text-accent-600 dark:text-accent-400 font-bold text-[8px] text-center uppercase">
                  {scanResultMsg}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase block text-center">
              {t('bolus.polyols')}
            </label>
            <input
              type="number"
              min="0"
              max="200"
              value={polyols}
              onChange={(e) => setPolyols(e.target.value)}
              onBlur={() => {
                let v = parseFloat(polyols);
                if (isNaN(v)) return;
                if (v < 0) v = 0;
                if (v > 200) v = 200;
                setPolyols(v.toString());
              }}
              placeholder="0"
              className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-xl outline-none border border-slate-100 dark:border-slate-700 focus:border-accent-500 transition-all dark:text-white"
            />
          </div>
          {parseFloat(polyols) > 0 && (
            <div className="flex-1 flex items-center justify-center pt-8">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center">
                {t('bolus.net_carbs')}:{" "}
                {Math.max(0, parseFloat(carbs) - parseFloat(polyols)).toFixed(
                  1,
                )}
                g
              </span>
            </div>
          )}
        </div>

        {algoMeal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl"
          >
            <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              {t('bolus.meal_analysis_title')}
            </h4>

            <div className="flex flex-wrap gap-2 mb-3">
              <div className="flex-1 bg-white dark:bg-slate-900 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">
                  {t('bolus.meal_kcal')}
                </p>
                <p className="text-xs font-black dark:text-white">
                  {algoMeal.kcal}
                </p>
              </div>
              <div className="flex-1 bg-white dark:bg-slate-900 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">
                  {t('bolus.meal_carbs_pct')}
                </p>
                <p className="text-xs font-black text-blue-500">
                  {algoMeal.carbsPct}%
                </p>
              </div>
              <div className="flex-1 bg-white dark:bg-slate-900 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">
                  {t('bolus.meal_protein_pct')}
                </p>
                <p className="text-xs font-black text-rose-500">
                  {algoMeal.proteinPct}%
                </p>
              </div>
              <div className="flex-1 bg-white dark:bg-slate-900 p-2 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">
                  {t('bolus.meal_fat_pct')}
                </p>
                <p className="text-xs font-black text-amber-500">
                  {algoMeal.fatPct}%
                </p>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 border-t border-emerald-100 dark:border-emerald-800/30 pt-3">
              <span className="opacity-70">
                {t('bolus.meal_ig_label')}
              </span>{" "}
              <span className="bg-emerald-200 dark:bg-emerald-800 px-2 py-0.5 rounded text-[10px]">
                {algoMeal.ig}
              </span>
            </p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              <span className="opacity-70">
                {t('bolus.meal_gl_label')}
              </span>{" "}
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] text-white",
                  Number(algoMeal.gl) <= 10
                    ? "bg-emerald-500"
                    : Number(algoMeal.gl) < 20
                      ? "bg-amber-500"
                      : "bg-rose-500",
                )}
              >
                {algoMeal.gl}
              </span>
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {algoMeal.analysis}
            </p>
          </motion.div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pizzaMode"
            checked={isPizzaMode}
            onChange={(e) => setIsPizzaMode(e.target.checked)}
            className="w-4 h-4 text-accent-600 rounded"
          />
          <label
            htmlFor="pizzaMode"
            className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer"
          >
            {t('bolus.pizza_bolus')}
          </label>
        </div>

        {isPizzaMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-black text-rose-400 uppercase block text-center">
                {t('bolus.protein_g')}
              </label>
              <input
                type="number"
                min="0"
                max="200"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                onBlur={() => {
                  let v = parseFloat(protein);
                  if (isNaN(v)) return;
                  if (v < 0) v = 0;
                  if (v > 200) v = 200;
                  setProtein(v.toString());
                }}
                placeholder="g"
                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-xl outline-none border border-slate-100 dark:border-slate-700 focus:border-rose-500 transition-all dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-amber-400 uppercase block text-center">
                {t('bolus.fat_g')}
              </label>
              <input
                type="number"
                min="0"
                max="200"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                onBlur={() => {
                  let v = parseFloat(fat);
                  if (isNaN(v)) return;
                  if (v < 0) v = 0;
                  if (v > 200) v = 200;
                  setFat(v.toString());
                }}
                placeholder="g"
                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-xl outline-none border border-slate-100 dark:border-slate-700 focus:border-amber-500 transition-all dark:text-white"
              />
            </div>
          </motion.div>
        )}

        {!settings.childMode && (
          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="alcoholMode"
              checked={isAlcoholMode}
              onChange={(e) => {
                setIsAlcoholMode(e.target.checked);
                if (!e.target.checked) {
                  setAlcoholType(null);
                  setAlcoholWarning(null);
                  setAlcoholReduction(1.0);
                }
              }}
              className="w-4 h-4 text-accent-600 rounded"
            />
            <label
              htmlFor="alcoholMode"
              className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer flex items-center gap-1"
            >
              {t('bolus.alcohol_mode')}
            </label>
          </div>
        )}

        {isAlcoholMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setAlcoholType("piwo");
                  setCarbs("15");
                  setAlcoholReduction(0.7); // 30% reduction
                  setAlcoholWarning(
                    t('bolus.alc_warn_beer'),
                  );
                }}
                className={cn(
                  "p-2 text-[9px] font-black uppercase tracking-wider rounded-xl border transition-all",
                  alcoholType === "piwo"
                    ? "bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-900/30 dark:border-amber-500"
                    : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700",
                )}
              >
                🍺 {t('bolus.alc_beer')}
              </button>

              <button
                onClick={() => {
                  setAlcoholType("wino");
                  setCarbs("2");
                  setAlcoholReduction(0.5); // 50% reduction
                  setAlcoholWarning(
                    t('bolus.alc_warn_wine'),
                  );
                }}
                className={cn(
                  "p-2 text-[9px] font-black uppercase tracking-wider rounded-xl border transition-all",
                  alcoholType === "wino"
                    ? "bg-rose-100 text-rose-700 border-rose-400 dark:bg-rose-900/30 dark:border-rose-500"
                    : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700",
                )}
              >
                🍷 {t('bolus.alc_wine')}
              </button>

              <button
                onClick={() => {
                  setAlcoholType("wodka");
                  setCarbs("0");
                  setAlcoholReduction(0.0); // 100% reduction for purely vodka
                  setAlcoholWarning(
                    t('bolus.alc_warn_vodka'),
                  );
                }}
                className={cn(
                  "p-2 text-[9px] font-black uppercase tracking-wider rounded-xl border transition-all",
                  alcoholType === "wodka"
                    ? "bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-900/30 dark:border-blue-500"
                    : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700",
                )}
              >
                🥃 {t('bolus.alc_vodka')}
              </button>

              <button
                onClick={() => {
                  setAlcoholType("drink");
                  setCarbs("25");
                  setAlcoholReduction(0.7);
                  setAlcoholWarning(
                    t('bolus.alc_warn_drink'),
                  );
                }}
                className={cn(
                  "p-2 text-[9px] font-black uppercase tracking-wider rounded-xl border transition-all",
                  alcoholType === "drink"
                    ? "bg-purple-100 text-purple-700 border-purple-400 dark:bg-purple-900/30 dark:border-purple-500"
                    : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700",
                )}
              >
                🍹 {t('bolus.alc_drink')}
              </button>
            </div>

            {alcoholWarning && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-xl flex items-start gap-2">
                <span className="text-xl">⚠️</span>
                <p className="text-[10px] font-bold text-yellow-800 dark:text-yellow-400">
                  {alcoholWarning}
                </p>
              </div>
            )}
          </motion.div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase block text-center">
            {t('bolus.trend')}
          </label>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-3xl gap-1">
            <button
              onClick={() => setTrend("down")}
              className={`flex-1 py-3 rounded-2xl flex items-center justify-center transition-all ${trend === "down" ? "bg-white dark:bg-slate-700 text-blue-500 shadow-sm" : "text-slate-400"}`}
            >
              <TrendingDown size={18} />
            </button>
            <button
              onClick={() => setTrend("stable")}
              className={`flex-1 py-3 rounded-2xl flex items-center justify-center transition-all ${trend === "stable" ? "bg-white dark:bg-slate-700 text-accent-500 shadow-sm" : "text-slate-400"}`}
            >
              <Minus size={18} />
            </button>
            <button
              onClick={() => setTrend("up")}
              className={`flex-1 py-3 rounded-2xl flex items-center justify-center transition-all ${trend === "up" ? "bg-white dark:bg-slate-700 text-orange-500 shadow-sm" : "text-slate-400"}`}
            >
              <TrendingUp size={18} />
            </button>
          </div>
        </div>

        {doseBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-700"
          >
            <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 text-center tracking-widest flex items-center justify-center gap-2">
              <BarChart2 size={14} className="text-accent-500" /> {t('bolus.dose_analysis')}
            </h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart
                  data={doseBreakdown}
                  margin={{ top: 0, right: 30, left: -20, bottom: 0 }}
                  layout="vertical"
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }}
                  />
                  <Tooltip
                    cursor={{
                      fill: "var(--tw-colors-slate-200)",
                      opacity: 0.1,
                    }}
                    contentStyle={{
                      borderRadius: "1.25rem",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "var(--tw-colors-slate-900)",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: "bold",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value: number) => [
                      `${value.toFixed(1)} j.`,
                      t('bolus.chart_dose'),
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                    {doseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                  <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 text-center space-y-4 relative overflow-hidden shadow-2xl">
          {advice && (
            <div className="space-y-2 mb-2">
              <div
                className={`text-[10px] font-black uppercase tracking-widest p-2 bg-white/5 rounded-xl ${advice.color}`}
              >
                {advice.text}
              </div>
              {(parseFloat(bg) >= 150 ||
                (advice.text &&
                  (advice.text.includes("15 min") ||
                    advice.text.includes("30 min")))) && (
                <button
                  onClick={() => {
                    const minutes = advice.text.includes("30 min") ? 30 : 15;
                    notificationService.scheduleLocalNotification(
                      t('bolus.reminder_title'),
                      t('bolus.reminder_body', { minutes }),
                      minutes,
                    );
                    setReminderActive(true);
                    setTimeout(() => setReminderActive(false), 5000);
                  }}
                  disabled={reminderActive}
                  className={cn(
                    "flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5",
                    reminderActive
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-white/5 hover:bg-white/10 text-accent-300",
                  )}
                >
                  <Bell
                    size={12}
                    className={reminderActive ? "" : "animate-bounce"}
                  />
                  {reminderActive
                    ? t('bolus.reminder_set')
                    : t('bolus.remind_me', { minutes: advice.text.includes("30 min") ? "30" : "15" })}
                </button>
              )}
            </div>
          )}
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
              <Edit3 size={10} className="text-accent-400" /> {t('bolus.dose_label')}
            </span>
            <div className="flex items-center justify-center gap-2 mt-2 mb-2">
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={manualDose !== null ? manualDose : dose.toFixed(1)}
                onChange={(e) => setManualDose(e.target.value)}
                onBlur={() => {
                  if (manualDose === null) return;
                  let v = parseFloat(manualDose);
                  if (isNaN(v)) return;
                  if (v < 0) v = 0;
                  if (v > 50) v = 50;
                  setManualDose(v.toFixed(1));
                }}
                className="w-32 bg-accent-500/20 text-center text-5xl font-black text-accent-400 outline-none rounded-2xl py-2 focus:bg-accent-500/30 transition-all border border-accent-500/30"
              />
              <span className="text-xl font-bold opacity-30">{t('auto.j', { defaultValue: 'j.' })}</span>
            </div>

            {/* Stacking Warning (IOB & COB) */}
            {(getEffectiveIOB(logs, pumpStatus, settings.dia || 4) > 0.5 ||
              calculateCOB(logs) > 5) && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 mb-2 flex flex-col items-center justify-center gap-1 bg-slate-800/50 border border-white/5 py-2 px-3 rounded-xl mx-4"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    size={12}
                    className={cn(
                      getEffectiveIOB(logs, pumpStatus, settings.dia || 4) > 0.5
                        ? "text-rose-500 animate-pulse"
                        : "text-amber-500",
                    )}
                  />
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center">
                    {t('bolus.active_ingredients')}
                  </span>
                </div>
                <div className="flex gap-4">
                  {getEffectiveIOB(logs, pumpStatus, settings.dia || 4) >
                    0.1 && (
                    <span className="text-[9px] font-bold text-rose-400">
                      {t('bolus.insulin_iob')}:{" "}
                      {getEffectiveIOB(
                        logs,
                        pumpStatus,
                        settings.dia || 4,
                      ).toFixed(2)}
                      {t('bolus.unit')}
                    </span>
                  )}
                  {calculateCOB(logs) > 0 && (
                    <span className="text-[9px] font-bold text-blue-400">
                      {t('bolus.carbs_cob')}: {calculateCOB(logs).toFixed(0)}g
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {isPizzaMode && extendedTime > 0 && (
              <div className="mt-2 text-[10px] font-bold text-slate-400">
                {t('bolus.extended_note')}{" "}
                <span className="text-accent-400">
                  {t('bolus.extended_spread', { hours: extendedTime })}
                </span>{" "}
                {t('bolus.wbt_dose')}
              </div>
            )}
          </div>

          {aiRec && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-3 bg-accent-500/10 border border-accent-500/20 rounded-2xl text-left"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-accent-400">
                  {t('bolus.ai_correction')}
                </span>
              </div>
              <p className="text-[11px] text-accent-100/80 leading-relaxed">
                {aiRec.reasoning}
              </p>
            </motion.div>
          )}

          <button
            onClick={handleAskAi}
            disabled={loadingAi || (dose === 0 && !bg && !carbs)}
            className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loadingAi ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              t('bolus.ask_ai')
            )}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || (dose === 0 && !bg && !carbs)}
          className="w-full bg-accent-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-accent-600/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {saving ? t('bolus.saving') : t('bolus.save_btn')}
        </button>
      </div>

      <div className="bg-accent-50 dark:bg-accent-900/20 p-6 rounded-[2.5rem] border border-accent-100 dark:border-accent-800/50 flex gap-4">
        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
          <Info
            className="text-accent-600 dark:text-accent-400 shrink-0"
            size={20}
          />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-accent-900 dark:text-accent-200 leading-relaxed">
            {t('bolus.info_prefix')} <b>{t('bolus.info_iob')}</b>,{" "}
            <b>{t('bolus.info_cob')}</b>{t('bolus.info_suffix')}
          </p>
          {activeProfileTime && (
            <p className="text-[9px] font-black text-accent-500 uppercase tracking-widest mt-2 block">
              {t('bolus.active_hourly_profile', { time: activeProfileTime })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}