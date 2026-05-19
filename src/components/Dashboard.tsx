import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { LogEntry, UserSettings } from "../types";
import GlucoseChart from "./GlucoseChart";
import VirtualPet from "./VirtualPet";
import { PumpStatusCard } from "./PumpStatusCard";
import {
  Activity,
  Clock,
  Droplets,
  Syringe,
  Utensils,
  Plus,
  Shield,
  Trash2,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Signal,
  Radio,
  Droplet,
  CheckCircle2,
  Sparkles,
  Edit3,
  Cpu,
  Zap,
  X,
  Info,
  Calendar,
  Gift
} from "lucide-react";
import { cn, calculateIOB, getEffectiveIOB } from "../lib/utils";
import { APP_VERSION } from "../constants";
import GlucoseModal from "./GlucoseModal";
import SwipeableItem from "./SwipeableItem";
import MealEditModal from "./MealEditModal";
import GlikoWidget from "./GlikoWidget";
import GlikoSenseTips from "./GlikoSenseTips";
import GlikoSenseNeural from "./GlikoSenseNeural";
import WeatherWidget from "./WeatherWidget";
import GlikoSenseIcon from "./GlikoSenseIcon";
import DidYouKnowWidget from "./DidYouKnowWidget";
import { MLAnalyzer } from "../services/mlSugarAnalyzer";
import { db } from "../lib/firebase";
import { SPORTS } from "./GlikoTraining";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  addDoc,
  setDoc,
} from "firebase/firestore";

import { Haptics } from "../lib/haptics";

interface DashboardProps {
  logs: LogEntry[];
  user: any;
  setTab: (t: string) => void;
  theme: "light" | "dark";
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  onAction?: (action: string) => void;
  pumpStatus?: any;
  nsUrl?: string;
  nsSecret?: string;
  petData?: any;
  syncStatus?: { status: 'idle' | 'syncing' | 'success' | 'error', lastSync?: number };
}

export default function Dashboard({
  logs,
  user,
  setTab,
  theme,
  initialAction,
  onClearInitialAction,
  onAction,
  pumpStatus,
  nsUrl,
  nsSecret,
  petData,
  syncStatus
}: DashboardProps) {
  const [mlInfo, setMlInfo] = useState<{ accuracy: number, datasetSize: number } | null>(null);

  const handleEndTraining = async () => {
    if (!user) return;
    Haptics.light();
    const settingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile');
    await setDoc(settingsRef, {
      ...settings,
      activeTraining: null
    });
  };

  const [range, setRange] = useState(3);
  const [showLoopSimulation, setShowLoopSimulation] = useState(() => {
    const saved = localStorage.getItem('glikosfera_loop_simulation');
    return saved ? JSON.parse(saved) : false;
  });
  const [showMLPrediction, setShowMLPrediction] = useState(() => {
    const saved = localStorage.getItem('glikosfera_ml_prediction');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('glikosfera_loop_simulation', JSON.stringify(showLoopSimulation));
  }, [showLoopSimulation]);

  useEffect(() => {
    localStorage.setItem('glikosfera_ml_prediction', JSON.stringify(showMLPrediction));
  }, [showMLPrediction]);

  useEffect(() => {
    const runAnalysis = async () => {
      if (logs.length >= 5) {
        try {
          const res = await MLAnalyzer.analyzeData(logs, false, 'quick');
          setMlInfo({ accuracy: res.accuracy, datasetSize: logs.length });
        } catch (e) {
          console.error("Dashboard ML analysis error:", e);
        }
      }
    };
    runAnalysis();
  }, [logs]);


  const [isGlucoseModalOpen, setIsGlucoseModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [listFilter, setListFilter] = useState<'all' | 'glucose' | 'treatment'>('treatment');
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    isf: 58,
    wwRatio: 16,
    wbtRatio: 18,
    targetMin: 70,
    targetMax: 140,
    showPrediction: true,
  });

  useEffect(() => {
    if (initialAction === "add_glucose") {
      setIsGlucoseModalOpen(true);
      onClearInitialAction?.();
    }
  }, [initialAction]);

  const lastG = logs.find((l) => l.type === "glucose");

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(
      db,
      "artifacts",
      "diacontrolapp",
      "users",
      getEffectiveUid(user),
      "settings",
      "profile",
    );
    const unsubscribeSett = onSnapshot(
      settingsRef,
      (d) => {
        if (d.exists())
          setSettings({ showPrediction: true, ...d.data() } as any);
      },
      (error) => {
        console.error("Dashboard settings error:", error);
      },
    );

    const q = query(
      collection(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "shortcuts",
      ),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setShortcuts(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (error) => {
        console.error("Dashboard shortcuts error:", error);
      },
    );
    return () => {
      unsubscribeSett();
      unsubscribe();
    };
  }, [user]);

  const quickAdd = async (s: any) => {
    if (s.carbs > 0) {
      if (!user) return;
      Haptics.medium();
      try {
        await addDoc(
          collection(
            db,
            "artifacts",
            "diacontrolapp",
            "users",
            getEffectiveUid(user),
            "logs",
          ),
          {
            type: "meal",
            value: s.carbs,
            timestamp: Date.now(),
            notes: `Szybki wybór: ${s.name}`,
            items: [{ name: s.name, carbs: s.carbs }],
          },
        );
        Haptics.success();
      } catch (e) {
        console.error("Quick log error:", e);
        Haptics.error();
      }
    } else {
      Haptics.light();
      setTab("meal");
    }
  };

  const iob = getEffectiveIOB(logs, pumpStatus, settings.dia || 4);

  const calculateTIR = () => {
    const glucoseLogs = logs.filter((l) => l.type === "glucose");
    if (glucoseLogs.length === 0) return { inRange: 0, high: 0, low: 0 };

    const inRange = glucoseLogs.filter(
      (l) => l.value >= settings.targetMin && l.value <= settings.targetMax,
    ).length;
    const low = glucoseLogs.filter((l) => l.value < settings.targetMin).length;
    const high = glucoseLogs.filter((l) => l.value > settings.targetMax).length;

    const total = glucoseLogs.length;
    return {
      inRange: Math.round((inRange / total) * 100),
      low: Math.round((low / total) * 100),
      high: Math.round((high / total) * 100),
    };
  };

  const tir = calculateTIR();

  const calculateHbA1c = () => {
    const glucoseLogs = logs.filter((l) => l.type === "glucose");
    if (glucoseLogs.length === 0) return 0;
    const avg =
      glucoseLogs.reduce((acc, l) => acc + l.value, 0) / glucoseLogs.length;
    return (avg + 46.7) / 28.7;
  };

  const hba1c = calculateHbA1c();

  const patternInsights = useMemo(() => {
    const insights = [];
    const glucoseLogs = logs.filter((l) => l.type === "glucose").slice(0, 100);

    if (glucoseLogs.length > 5) {
      const morningLogs = glucoseLogs.filter((l) => {
        const hour = new Date(l.timestamp).getHours();
        return hour >= 5 && hour <= 9;
      });
      if (morningLogs.some((l) => l.value > 150)) {
        insights.push({
          type: "dawn",
          text: "Możliwy efekt brzasku (skoki rano)",
        });
      }

      const lows = glucoseLogs.filter((l) => l.value < 70);
      if (lows.length > 2) {
        insights.push({ type: "lows", text: "Zbyt wiele niskich cukrów" });
      }

      const postMeal = logs.filter((l) => l.type === "meal").slice(0, 5);
      postMeal.forEach((m) => {
        const afterMeal = glucoseLogs.find(
          (g) =>
            g.timestamp > m.timestamp &&
            g.timestamp < m.timestamp + 2 * 60 * 60 * 1000,
        );
        if (afterMeal && afterMeal.value > 180) {
          insights.push({
            type: "postMeal",
            text: "Wysoki cukier po ostatnim posiłku",
          });
        }
      });
    }

    // Deduplicate by text
    const unique = [];
    const seen = new Set();
    for (const insight of insights) {
      if (!seen.has(insight.text)) {
        seen.add(insight.text);
        unique.push(insight);
      }
    }

    return unique.slice(0, 2).map((i) => {
      let icon = <TrendingUp className="text-orange-500" size={14} />;
      if (i.type === "lows")
        icon = <AlertTriangle className="text-red-500" size={14} />;
      if (i.type === "postMeal")
        icon = <Utensils className="text-amber-500" size={14} />;
      return { ...i, icon };
    });
  }, [logs]);

  const getTrend = () => {
    const glucoseLogs = logs
      .filter((l) => l.type === "glucose")
      .sort((a, b) => b.timestamp - a.timestamp);
    if (glucoseLogs.length < 2) return null;
    const current = glucoseLogs[0];
    const prev = glucoseLogs[1];
    
    const rawDiff = current.value - prev.value;
    const timeDiff = (current.timestamp - prev.timestamp) / (1000 * 60); // minutes

    if (timeDiff <= 0 || timeDiff > 120) return null; // Too much time passed to determine trend

    // Normalize diff to a 5-minute time frame for standard delta presentation
    const diff = (rawDiff / timeDiff) * 5;
    const deltaText = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} mg/dL`;

    if (diff > 15)
      return {
        icon: <ChevronRight className="-rotate-90" />,
        color: "text-rose-500",
        text: "Szybko rośnie",
        direction: "UP_FAST",
        deltaText,
        rawDiff: diff
      };
    if (diff > 5)
      return {
        icon: <ChevronRight className="-rotate-45" />,
        color: "text-rose-400",
        text: "Rośnie",
        direction: "UP",
        deltaText,
        rawDiff: diff
      };
    if (diff < -15)
      return {
        icon: <ChevronRight className="rotate-90" />,
        color: "text-rose-500",
        text: "Szybko spada",
        direction: "DOWN_FAST",
        deltaText,
        rawDiff: diff
      };
    if (diff < -5)
      return {
        icon: <ChevronRight className="rotate-45" />,
        color: "text-rose-400",
        text: "Spada",
        direction: "DOWN",
        deltaText,
        rawDiff: diff
      };
    return {
      icon: <ChevronRight />,
      color: "text-emerald-500",
      text: "Stabilnie",
      direction: "STABLE",
      deltaText,
      rawDiff: diff
    };
  };

  const trend = getTrend();

  const getTodayStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter((l) => l.timestamp >= today.getTime());
    const meals = todayLogs.filter((l) => l.type === "meal");
    const insulin = todayLogs.filter((l) => l.type === "bolus");

    return {
      carbs: meals.reduce((acc, l) => acc + (l.value || 0), 0),
      insulin: insulin.reduce((acc, l) => acc + (l.value || 0), 0),
    };
  };

  const todayStats = getTodayStats();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: "tween", ease: "easeOut", duration: 0.25 }
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="hidden"
      className="space-y-6 pb-20 will-change-transform relative"
    >
      {/* Swipe Hint (Left Edge) */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 w-8 h-32 pointer-events-none z-40 md:hidden flex items-center justify-center opacity-40">
        <motion.div
          animate={{ x: [0, 8, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-1 h-12 bg-accent-500/30 rounded-full blur-[1px]" />
          <span className="text-[8px] font-black uppercase tracking-widest vertical-text text-accent-500/50">Wykres</span>
        </motion.div>
      </div>

      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white font-display">Pulpit</h2>
        <div className="flex gap-2">
          {nsUrl && (
            <a 
              href={nsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 active:scale-95 transition-all glass-target"
            >
              Nightscout
            </a>
          )}
          <button 
            onClick={() => { Haptics.light(); setTab('chart'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent-500/10 text-accent-600 text-[10px] font-black uppercase tracking-widest border border-accent-500/20 active:scale-95 transition-all shadow-xl shadow-accent-500/10"
          >
            <Activity size={12} />
            Wykres
          </button>
        </div>
      </div>

      {settings?.activeTraining && (
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="mx-2 p-5 glass border border-emerald-500/20 rounded-[2.5rem] relative overflow-hidden group"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 blur-[40px] -mr-10 -mt-10 pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-2xl animate-pulse">
                 <Activity size={24} />
               </div>
               <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight font-display mb-0.5">Trwa Trening</h4>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {SPORTS.find(s => s.id === settings.activeTraining?.sportId)?.name || 'Aktywność'} • {settings.activeTraining.duration}m
                  </p>
               </div>
            </div>
            <button
               onClick={() => { Haptics.light(); handleEndTraining(); }}
               className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all hover:bg-rose-600"
            >
               Zakończ
            </button>
          </div>
        </motion.div>
      )}

      {/* 1. Main Stats Widget */}
      <motion.div variants={itemVariants}>
        <GlikoWidget
          logs={logs}
          setTab={setTab}
          iob={iob}
          todayStats={todayStats}
          trend={trend}
          tir={tir}
          hba1c={hba1c}
          glassmorphismEnabled={settings.glassmorphismEnabled}
        />
      </motion.div>

      {/* 2. GlikoSense Neural Heart / Pet */}
      <motion.div variants={itemVariants}>
        <div className="glass-card overflow-hidden">
          <GlikoSenseNeural 
            glucose={lastG ? Math.round(lastG.value) : null}
            trend={trend?.direction || null}
            isChildMode={settings.childMode || false}
            petName={petData?.name}
            accuracy={mlInfo?.accuracy}
            datasetSize={mlInfo?.datasetSize}
          >
            {settings.childMode && (
               <VirtualPet user={user} logs={logs} glucose={lastG ? lastG.value : null} setTab={setTab} embedded={true} pumpStatus={pumpStatus} />
            )}
          </GlikoSenseNeural>
        </div>
      </motion.div>

      {/* 2.5 Weather Widget */}
      {settings.weatherWidgetEnabled && (
        <motion.div variants={itemVariants}>
          <WeatherWidget />
        </motion.div>
      )}

      {/* 4. Equipment & Reminders */}
      {(settings.sensorChangeDate || settings.infusionSetChangeDate) && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          {settings.sensorChangeDate && (
             <div 
               onClick={() => { 
                 Haptics.light();
                 setTab('profile'); 
                 onAction?.('devices'); 
               }}
               className="glass-card !p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer"
             >
               <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
               <div className="flex justify-between items-start">
                 <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-500"><Signal size={16} /></div>
                 <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/5 py-1 px-2.5 rounded-full border border-indigo-500/10">Sensor</span>
               </div>
               <div className="mt-4">
                 {(() => {
                   const msLeft = settings.sensorChangeDate + (settings.sensorDurationDays || 10) * 24 * 60 * 60 * 1000 - Date.now();
                   const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                   const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                   const isExpired = msLeft <= 0;
                   return (
                     <div>
                       <div className="flex items-baseline gap-1">
                         <span className={cn("text-3xl font-black tracking-tight", isExpired ? "text-rose-500" : "text-slate-800 dark:text-white")}>{isExpired ? "0" : daysLeft}</span>
                         <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Dni</span>
                         {!isExpired && hoursLeft > 0 && (
                           <>
                             <span className="text-xl font-black text-slate-800 dark:text-white ml-1">{hoursLeft}</span>
                             <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase text-[0.6rem]">Godz</span>
                           </>
                         )}
                       </div>
                       <div className="mt-2 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                         <div className={cn("h-full", isExpired ? "bg-rose-500" : "bg-indigo-500")} style={{ width: `${Math.max(0, Math.min(100, (msLeft / ((settings.sensorDurationDays || 10) * 24 * 60 * 60 * 1000)) * 100))}%` }} />
                       </div>
                     </div>
                   );
                 })()}
               </div>
             </div>
          )}
          {settings.infusionSetChangeDate && (
             <div 
               onClick={() => { 
                 Haptics.light();
                 setTab('profile'); 
                 onAction?.('devices'); 
               }}
               className="glass-card !p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer"
             >
               <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
               <div className="flex justify-between items-start">
                 <div className="p-2 bg-teal-500/10 rounded-xl border border-teal-500/20 text-teal-500"><Droplets size={16} /></div>
                 <span className="text-[8px] font-black text-teal-500 uppercase tracking-widest bg-teal-500/5 py-1 px-2.5 rounded-full border border-teal-500/10">Wkłucie</span>
               </div>
               <div className="mt-4">
                 {(() => {
                   const msLeft = settings.infusionSetChangeDate + (settings.infusionSetDurationDays || 3) * 24 * 60 * 60 * 1000 - Date.now();
                   const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                   const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                   const isExpired = msLeft <= 0;
                   return (
                     <div>
                       <div className="flex items-baseline gap-1">
                         <span className={cn("text-3xl font-black tracking-tight", isExpired ? "text-rose-500" : "text-slate-800 dark:text-white")}>{isExpired ? "0" : daysLeft}</span>
                         <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Dni</span>
                         {!isExpired && hoursLeft > 0 && (
                           <>
                             <span className="text-xl font-black text-slate-800 dark:text-white ml-1">{hoursLeft}</span>
                             <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase text-[0.6rem]">Godz</span>
                           </>
                         )}
                       </div>
                       <div className="mt-2 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                         <div className={cn("h-full", isExpired ? "bg-rose-500" : "bg-teal-500")} style={{ width: `${Math.max(0, Math.min(100, (msLeft / ((settings.infusionSetDurationDays || 3) * 24 * 60 * 60 * 1000)) * 100))}%` }} />
                       </div>
                     </div>
                   );
                 })()}
               </div>
             </div>
          )}
        </motion.div>
      )}

      {/* 5. Assistant CTA */}
      <motion.div 
        variants={itemVariants}
        onClick={() => {
          Haptics.light();
          setTab('assistant');
        }}
        className="relative group cursor-pointer active:scale-[0.98] transition-all"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 rounded-[2.6rem] opacity-30 group-hover:opacity-60 blur-md transition duration-500"></div>
        <div className="relative glass p-6 flex items-center gap-4 overflow-hidden rounded-[2.5rem] border border-white/50 dark:border-white/5">
          <div className={cn(
            "w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
            settings.childMode ? "bg-indigo-600 shadow-indigo-500/30" : "bg-slate-900 dark:bg-indigo-600"
          )}>
            {settings.childMode ? <Sparkles size={28} className="animate-pulse" /> : <Cpu size={28} />}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight font-display">
              Asystent AI
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-tight">
              {settings.childMode 
                ? "Zadaj pytanie swoim opiekunom AI o wyniki, dietę lub trendy."
                : "Zaawansowana analityka predykcyjna i optymalizacja parametrów."}
            </p>
          </div>
          <div className="p-2 rounded-full bg-slate-100/50 dark:bg-white/5 text-slate-400 group-hover:text-indigo-500 transition-colors">
            <ChevronRight size={20} />
          </div>
        </div>
      </motion.div>

      {/* 6. AI Tips & Insights */}
      <motion.div variants={itemVariants} className="space-y-4">
        <DidYouKnowWidget onClick={() => {
          onAction?.('tutorial');
          setTab('profile');
        }} />
        
        {/* Tips Section */}
        <GlikoSenseTips logs={logs} pumpStatus={pumpStatus} />
        
        {/* Alert/Insight Section */}
        {patternInsights.length > 0 && (
          <div className="bg-accent-50/50 dark:bg-accent-950/20 backdrop-blur-md border border-accent-200/50 dark:border-accent-800/30 p-5 rounded-[2.5rem] flex items-center gap-4 group">
            <div className="p-3 bg-accent-500 text-white rounded-2xl shadow-lg shadow-accent-500/30">
              <GlikoSenseIcon size={18} isAnalyzing={true} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black text-accent-700 dark:text-accent-400 uppercase tracking-widest mb-1 font-display">
                Analiza GlikoSense
              </p>
              <div className="space-y-1">
                {patternInsights.map((insight: any, idx: number) => (
                  <div key={`insight-${idx}`} className="flex items-center gap-2 text-[10px] font-bold text-accent-900 dark:text-accent-100">
                    {insight.icon}
                    <span>{insight.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => { Haptics.light(); setTab("ai"); }} className="p-2 bg-white dark:bg-slate-800 rounded-full text-accent-600 shadow-sm transition-all active:scale-90">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </motion.div>

      {/* 7. Quick Actions Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        {/* Shortcuts row - Now full width and above buttons */}
        {shortcuts.length > 0 && (
          <div className="glass-card !p-6 flex flex-col gap-4 border border-white/50 dark:border-white/5 shadow-lg">
            <div className="flex justify-between items-center px-1">
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-display">MOJE ULUBIONE</h4>
              <button 
                onClick={() => {
                  Haptics.light();
                  onAction?.("food");
                  setTab("profile");
                }}
                className="text-[9px] font-black text-accent-500 uppercase tracking-tight"
              >
                Edytuj
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none mask-fade-right">
              {/* System Shortcut: Training */}
              <button
                onClick={() => {
                  Haptics.light();
                  onAction?.("training");
                  setTab("profile");
                }}
                className="shrink-0 glass-card !p-5 flex items-center gap-4 font-black text-xs uppercase tracking-tighter shadow-md active:scale-95 transition-all border border-emerald-500/10 dark:border-emerald-500/5 dark:text-white group min-w-[140px]"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform block">🏃‍♂️</span>
                <div className="flex flex-col items-start">
                  <span className="leading-tight text-slate-800 dark:text-slate-200">Trening</span>
                  <span className="text-[9px] text-emerald-500 lowercase font-bold">Zarządzaj</span>
                </div>
              </button>

              {shortcuts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => quickAdd(s)}
                  className="shrink-0 glass-card !p-5 flex items-center gap-4 font-black text-xs uppercase tracking-tighter shadow-md active:scale-95 transition-all border border-black/5 dark:border-white/5 dark:text-white group min-w-[140px]"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform block">{s.icon || "📌"}</span>
                  <div className="flex flex-col items-start">
                    <span className="leading-tight text-slate-800 dark:text-slate-200">{s.name}</span>
                    <span className="text-[9px] opacity-50 lowercase font-bold">{s.carbs}g węgli</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Big Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              Haptics.light();
              setIsGlucoseModalOpen(true);
            }}
            className="glass-card h-32 flex flex-col items-center justify-center gap-3 active:scale-95 group relative overflow-hidden border border-white/50 dark:border-white/5 shadow-2xl transition-all"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-[40px] -mr-12 -mt-12 group-hover:bg-rose-500/10 transition-all"></div>
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Shield size={32} />
            </div>
            <span className="font-black text-[11px] uppercase tracking-widest text-slate-600 dark:text-slate-300 font-display">Pomiar</span>
          </button>

          <button
            onClick={() => {
              Haptics.light();
              setTab("bolus");
            }}
            className="bg-accent-600 h-32 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 shadow-2xl shadow-accent-600/40 active:scale-95 group transition-all text-white overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-[40px] -mr-12 -mt-12 group-hover:bg-white/20 transition-all"></div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Zap size={32} />
            </div>
            <span className="font-black text-[11px] uppercase tracking-widest font-display">Bolus</span>
          </button>
        </div>
      </motion.div>

      {/* 8. Recent History View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {logs.filter(log => log.type === 'glucose').length > 0 && (
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-[10px] font-black text-slate-500/60 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-rose-500" />
                Pomiary
              </h3>
              <button onClick={() => { Haptics.light(); setListFilter('glucose'); setTab("history"); }} className="text-[9px] font-black text-accent-500 uppercase">Wszystkie</button>
            </div>
            <div className="space-y-2">
               {logs.filter(log => log.type === 'glucose').slice(0, 3).map((log, idx) => (
                  <motion.div key={`${log.id}-${idx}`} layout>
                    <SwipeableItem id={log.id} onDelete={() => {}}>
                      <div className="glass-card !p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <Droplet size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-base dark:text-white font-display">
                            {Math.round(log.value)} <span className="text-[10px] opacity-40 uppercase">mg/dL</span>
                          </p>
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {log.notes || 'Glukoza'}
                          </p>
                        </div>
                      </div>
                    </SwipeableItem>
                  </motion.div>
               ))}
            </div>
          </motion.div>
        )}

        {logs.filter(log => log.type === 'bolus' || log.type === 'meal').length > 0 && (
          <motion.div variants={itemVariants} className="space-y-3">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-[10px] font-black text-slate-500/60 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                Leczenie
              </h3>
              <button onClick={() => { Haptics.light(); setListFilter('treatment'); setTab("history"); }} className="text-[9px] font-black text-accent-500 uppercase">Wszystkie</button>
            </div>
            <div className="space-y-2">
               {logs.filter(log => log.type === 'bolus' || log.type === 'meal').slice(0, 3).map((log, idx) => (
                  <motion.div key={`${log.id}-${idx}`} layout>
                    <SwipeableItem id={log.id} onDelete={() => {}}>
                      <div onClick={() => setEditingLog(log)} className="glass-card !p-4 flex items-center gap-4 cursor-pointer">
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", log.type === "meal" ? "bg-amber-500/10 text-amber-500" : "bg-accent-500/10 text-accent-500")}>
                          {log.type === "meal" ? <Utensils size={18} /> : <Syringe size={18} />}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-base dark:text-white font-display">
                            {log.value.toFixed(1)} <span className="text-[10px] opacity-40 uppercase">{log.type === "meal" ? "g" : " j."}</span>
                          </p>
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {log.type === 'meal' ? 'Posiłek' : 'Bolus'}
                          </p>
                        </div>
                      </div>
                    </SwipeableItem>
                  </motion.div>
               ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Pump Status - Final Bento Piece */}
      {pumpStatus && settings?.showPumpWidget !== false && (
        <motion.div variants={itemVariants}>
           <PumpStatusCard data={pumpStatus} />
        </motion.div>
      )}

      <GlucoseModal
        isOpen={isGlucoseModalOpen}
        onClose={() => setIsGlucoseModalOpen(false)}
        user={user}
      />
      
      {/* 9. Floating Status Center */}
      <div className="fixed bottom-24 right-4 z-[45]">
         {nsUrl && syncStatus && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             className={cn(
               "glass w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border-white/50 dark:border-white/10",
             )}
           >
              <div className={cn(
                "w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
                syncStatus.status === 'syncing' ? 'bg-indigo-500 animate-pulse' : 
                syncStatus.status === 'success' ? 'bg-emerald-500' : 
                syncStatus.status === 'error' ? 'bg-rose-500' : 'bg-slate-400'
              )} />
              {syncStatus.status === 'syncing' && <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-2xl animate-ping" />}
           </motion.div>
         )}
      </div>

      {editingLog && <MealEditModal log={editingLog} user={user} onClose={() => setEditingLog(null)} />}
      
      {/* Footer Info */}
      <div className="pt-8 pb-4 text-center space-y-2 opacity-30">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">
          Wersja {APP_VERSION}
        </p>
      </div>
    </motion.div>
  );
}
