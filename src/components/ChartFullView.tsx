import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { LogEntry, UserSettings } from "../types";
import GlucoseChart from "./GlucoseChart";
import { Haptics } from "../lib/haptics";
import GlikoSenseIcon from "./GlikoSenseIcon";
import { Activity, Clock } from "lucide-react";
import { cn } from "../lib/utils";

interface ChartFullViewProps {
  logs: LogEntry[];
  settings: UserSettings;
  theme: 'light' | 'dark';
  setTab: (tab: string) => void;
}

export default function ChartFullView({
  logs,
  settings,
  theme,
  setTab,
}: ChartFullViewProps) {
  const [range, setRange] = useState<number>(6);
  
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

  return (
    <div className="flex flex-col h-full w-full min-h-[600px] gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white px-2 italic tracking-tighter">
          Szczegóły Glikemii
        </h2>
        <p className="text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest">Pełny podgląd danych z ostatnich godzin</p>
      </div>

      <div className="flex flex-col gap-3 px-2">
          <div className="flex justify-between items-center bg-white/50 dark:bg-slate-800/50 p-2 rounded-2xl backdrop-blur-sm shadow-sm border border-slate-200/50 dark:border-slate-700/50">
            {[3, 6, 12, 24].map((h) => (
              <button
                key={h}
                onClick={() => {
                  Haptics.selection();
                  setRange(h);
                }}
                className={cn(
                  "flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-tighter",
                  range === h
                    ? "bg-accent-500 text-white shadow-md shadow-accent-500/20"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white",
                )}
              >
                {h}H
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                Haptics.selection();
                setShowLoopSimulation(!showLoopSimulation);
              }}
              className={cn(
                "flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-tight border",
                showLoopSimulation
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-sm"
                  : "bg-white/50 text-slate-400 border-slate-200/50 dark:bg-slate-800/50 dark:border-slate-700/50",
              )}
            >
              <Activity size={14} />
              Pętla {showLoopSimulation ? "ON" : "OFF"}
            </button>

            <button
              onClick={() => {
                Haptics.selection();
                setShowMLPrediction(!showMLPrediction);
              }}
              className={cn(
                "flex-1 flex justify-center items-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-tight border",
                showMLPrediction
                  ? "bg-accent-500/10 text-accent-600 border-accent-500/20 shadow-sm"
                  : "bg-white/50 text-slate-400 border-slate-200/50 dark:bg-slate-800/50 dark:border-slate-700/50",
              )}
            >
              <GlikoSenseIcon size={14} isAnalyzing={showMLPrediction} />
              GlikoSense {showMLPrediction ? "ON" : "OFF"}
            </button>
          </div>
        </div>

      <div className="flex-1 w-full bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col relative min-h-[400px] glass-target">
        <div className="flex-1 w-full relative min-h-0 h-full">
          <GlucoseChart
            logs={logs}
            hours={range}
            targetMin={settings.targetMin}
            targetMax={settings.targetMax}
            theme={theme}
            settings={settings}
            showLoopSimulation={showLoopSimulation}
            showMLPrediction={showMLPrediction}
          />
        </div>
      </div>
    </div>
  );
}
