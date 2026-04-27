import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { LogEntry, UserSettings } from "../types";
import GlucoseChart from "./GlucoseChart";
import VirtualPet from "./VirtualPet";
import {
  Activity,
  Clock,
  Droplets,
  Utensils,
  Zap,
  Plus,
  Shield,
  Trash2,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { cn, calculateIOB } from "../lib/utils";
import GlucoseModal from "./GlucoseModal";
import SwipeableItem from "./SwipeableItem";
import GlikoWidget from "./GlikoWidget";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";

interface DashboardProps {
  logs: LogEntry[];
  user: any;
  setTab: (t: string) => void;
  theme: "light" | "dark";
  initialAction?: string | null;
  onClearInitialAction?: () => void;
}

export default function Dashboard({
  logs,
  user,
  setTab,
  theme,
  initialAction,
  onClearInitialAction,
}: DashboardProps) {
  const [range, setRange] = useState(3);
  const [isGlucoseModalOpen, setIsGlucoseModalOpen] = useState(false);
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
        if (navigator.vibrate) navigator.vibrate(100);
      } catch (e) {
        console.error("Quick log error:", e);
      }
    } else {
      setTab("meal");
    }
  };

  const iob = calculateIOB(logs, settings.dia || 4);

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
    const diff = current.value - prev.value;
    const timeDiff = (current.timestamp - prev.timestamp) / (1000 * 60); // minutes

    if (timeDiff > 120) return null; // Too much time passed to determine trend

    if (diff > 15)
      return {
        icon: <ChevronRight className="-rotate-90" />,
        color: "text-rose-500",
        text: "Szybko rośnie",
      };
    if (diff > 5)
      return {
        icon: <ChevronRight className="-rotate-45" />,
        color: "text-rose-400",
        text: "Rośnie",
      };
    if (diff < -15)
      return {
        icon: <ChevronRight className="rotate-90" />,
        color: "text-rose-500",
        text: "Szybko spada",
      };
    if (diff < -5)
      return {
        icon: <ChevronRight className="rotate-45" />,
        color: "text-rose-400",
        text: "Spada",
      };
    return {
      icon: <ChevronRight />,
      color: "text-emerald-500",
      text: "Stabilnie",
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
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="hidden"
      className="space-y-6 will-change-transform"
    >
      {/* Widget Section */}
      <motion.div variants={itemVariants}>
        <GlikoWidget
          logs={logs}
          setTab={setTab}
          iob={iob}
          todayStats={todayStats}
          trend={trend}
          tir={tir}
          hba1c={hba1c}
        />
      </motion.div>

      {/* Pattern Analysis Alert */}
      {patternInsights.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 p-4 rounded-[2rem] flex items-center gap-4 group"
        >
          <div className="p-2.5 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/30">
            <Sparkles size={18} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-1">
              Analiza Wzorców
            </p>
            <div className="space-y-1">
              {patternInsights.map((insight: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-[10px] font-bold text-indigo-700 dark:text-indigo-200"
                >
                  {insight.icon}
                  <span>{insight.text}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setTab("ai")}
            className="p-2 bg-white dark:bg-slate-800 rounded-full text-indigo-600 shadow-sm active:scale-90 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </motion.div>
      )}

      {/* Equipment Reminders */}
      {(settings.sensorChangeDate || settings.infusionSetChangeDate) && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          {settings.sensorChangeDate && (
             <div className="bg-gradient-to-br from-slate-800 to-indigo-900 rounded-[2rem] p-4 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-indigo-900/20">
               <div className="flex justify-between items-start z-10">
                 <div className="p-2 bg-white/10 rounded-2xl">
                   <Activity size={16} className="text-indigo-300" />
                 </div>
                 <span className="text-[8px] font-black text-indigo-200 uppercase tracking-widest bg-white/5 py-1 px-2 rounded-full">
                   Sensor
                 </span>
               </div>
               <div className="mt-4 z-10">
                 {(() => {
                   const msLeft = settings.sensorChangeDate + (settings.sensorDurationDays || 10) * 24 * 60 * 60 * 1000 - Date.now();
                   const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                   const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                   const isExpired = msLeft <= 0;
                   return (
                     <>
                       <div className="flex items-baseline gap-1">
                         <span className={cn("text-2xl font-black", (daysLeft <= 0 && hoursLeft <= 12) || isExpired ? "text-rose-400" : "text-white")}>
                           {isExpired ? "0" : daysLeft > 0 ? `${daysLeft}d` : `${hoursLeft}h`}
                         </span>
                         {!isExpired && daysLeft > 0 && hoursLeft > 0 && <span className="text-sm font-bold text-indigo-300">{hoursLeft}h</span>}
                       </div>
                       {isExpired ? (
                         <span className="text-[8px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase mt-1 inline-block">Wymień!</span>
                       ) : (
                         <span className="text-[9px] font-bold text-indigo-200 uppercase">Pozostało</span>
                       )}
                     </>
                   );
                 })()}
               </div>
             </div>
          )}
          {settings.infusionSetChangeDate && (
             <div className="bg-gradient-to-br from-slate-800 to-teal-900 rounded-[2rem] p-4 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-teal-900/20">
               <div className="flex justify-between items-start z-10">
                 <div className="p-2 bg-white/10 rounded-2xl">
                   <Droplets size={16} className="text-teal-300" />
                 </div>
                 <span className="text-[8px] font-black text-teal-200 uppercase tracking-widest bg-white/5 py-1 px-2 rounded-full">
                   Wkłucie
                 </span>
               </div>
               <div className="mt-4 z-10">
                 {(() => {
                   const msLeft = settings.infusionSetChangeDate + (settings.infusionSetDurationDays || 3) * 24 * 60 * 60 * 1000 - Date.now();
                   const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                   const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                   const isExpired = msLeft <= 0;
                   return (
                     <>
                       <div className="flex items-baseline gap-1">
                         <span className={cn("text-2xl font-black", (daysLeft <= 0 && hoursLeft <= 6) || isExpired ? "text-rose-400" : "text-white")}>
                           {isExpired ? "0" : daysLeft > 0 ? `${daysLeft}d` : `${hoursLeft}h`}
                         </span>
                         {!isExpired && daysLeft > 0 && hoursLeft > 0 && <span className="text-sm font-bold text-teal-300">{hoursLeft}h</span>}
                       </div>
                       {isExpired ? (
                         <span className="text-[8px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full uppercase mt-1 inline-block">Wymień!</span>
                       ) : (
                         <span className="text-[9px] font-bold text-teal-200 uppercase">Pozostało</span>
                       )}
                     </>
                   );
                 })()}
               </div>
             </div>
          )}
        </motion.div>
      )}

      {/* Chart Card */}
      <motion.div
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Wykres
          </h3>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
            {[3, 6, 12, 24].map((h) => (
              <button
                key={h}
                onClick={() => setRange(h)}
                className={cn(
                  "px-3 py-1.5 text-[8px] font-black rounded-lg transition-all uppercase",
                  range === h
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
        <div className="h-44">
          <GlucoseChart
            logs={logs}
            hours={range}
            targetMin={settings.targetMin}
            targetMax={settings.targetMax}
            theme={theme}
            settings={settings}
          />
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div variants={itemVariants}>
        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-3">
          Szybkie skróty
        </h4>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none px-1">
          {shortcuts.map((s) => (
            <button
              key={s.id}
              onClick={() => quickAdd(s)}
              className="shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-sm active:scale-95 transition-all dark:text-white"
            >
              <span className="text-lg">{s.icon || "📌"}</span>
              <span>{s.name}</span>
            </button>
          ))}
          {shortcuts.length === 0 && (
            <p className="text-[10px] font-medium text-slate-400 italic px-2">
              Brak skrótów. Dodaj w opcjach.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setIsGlucoseModalOpen(true)}
            className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2 active:scale-95 shadow-sm transition-all"
          >
            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-inner">
              <Shield className="w-5 h-5 text-indigo-500" />
            </div>
            <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">
              Pomiar
            </span>
          </button>
          <button
            onClick={() => setTab("bolus")}
            className="bg-indigo-600 p-4 rounded-[2rem] flex flex-col items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-white"
          >
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <span className="font-black text-[10px] uppercase tracking-widest">
              Bolus
            </span>
          </button>
        </div>
      </motion.div>

      {/* Recent History Mini */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Ostatnia aktywność
          </h3>
          <button
            onClick={() => setTab("history")}
            className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 active:scale-95 transition-all"
          >
            WSZYSTKO <ChevronRight size={12} />
          </button>
        </div>
        <motion.div
          className="space-y-1"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.1 } },
          }}
          initial="hidden"
          animate="show"
        >
          {logs.slice(0, 5).map((log) => (
            <motion.div
              key={log.id}
              layout
              variants={{
                hidden: { opacity: 0, y: 15, scale: 0.95 },
                show: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: "spring", stiffness: 350, damping: 25 },
                },
              }}
            >
              <SwipeableItem
                id={log.id}
                onDelete={async () => {
                  try {
                    await deleteDoc(
                      doc(
                        db,
                        "artifacts",
                        "diacontrolapp",
                        "users",
                        getEffectiveUid(user),
                        "logs",
                        log.id,
                      ),
                    );
                  } catch (err) {
                    console.error("Delete failed:", err);
                  }
                }}
              >
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-[2rem] flex items-center gap-4 group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner transition-colors shadow-slate-200 dark:shadow-slate-950",
                      log.type === "glucose"
                        ? "bg-rose-500/10 text-rose-500"
                        : log.type === "meal"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-indigo-500/10 text-indigo-500",
                    )}
                  >
                    {log.type === "glucose" && (
                      <Activity size={18} strokeWidth={2.5} />
                    )}
                    {log.type === "meal" && (
                      <Utensils size={18} strokeWidth={2.5} />
                    )}
                    {log.type === "bolus" && (
                      <Droplets size={18} strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm dark:text-white truncate">
                      {typeof log.value === 'number' ? (log.type === 'glucose' ? Math.round(log.value) : log.value.toFixed(1)) : log.value}
                      {log.type === "glucose"
                        ? " mg/dL"
                        : log.type === "meal"
                          ? "g W"
                          : " j."}
                      {log.type === "meal" && (log.protein || log.fat) && (
                        <span className="text-[10px] font-bold text-slate-400 ml-2">
                          {log.protein?.toFixed(0)}B / {log.fat?.toFixed(0)}T
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="text-[9px] font-bold text-slate-500 truncate italic">
                        {(() => {
                          const n = log.notes || log.description || '';
                          if (n.toLowerCase() === 'glucose') return 'Glukoza';
                          if (n.toLowerCase() === 'meal' || n.toLowerCase() === 'carbs') return 'Posiłek';
                          if (n.toLowerCase() === 'bolus' || n.toLowerCase() === 'insulin') return 'Insulina';
                          return n || (log.type === 'glucose' ? 'Glukoza' : log.type === 'meal' ? 'Posiłek' : 'Bolus');
                        })()}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        {log.source === 'nightscout' ? (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">NS</span>
                        ) : (log.source === 'csv' || (log.notes && log.notes.includes('Import'))) ? (
                          <span className="text-[8px] bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">CSV</span>
                        ) : (
                          <span className="text-[8px] bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Ręcz.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </SwipeableItem>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <GlucoseModal
        isOpen={isGlucoseModalOpen}
        onClose={() => setIsGlucoseModalOpen(false)}
        user={user}
      />
      {settings.childMode && (
        <VirtualPet user={user} logs={logs} glucose={lastG ? lastG.value : null} />
      )}
    </motion.div>
  );
}
