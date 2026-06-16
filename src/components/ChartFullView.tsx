import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { LogEntry, UserSettings } from "../types";
import GlucoseChart from "./GlucoseChart";
import { Haptics } from "../lib/haptics";
import GlikoSenseIcon from "./GlikoSenseIcon";
import { Activity, Clock, Droplet, Apple, Droplets, RefreshCw, Zap, Signal } from "lucide-react";
import { cn } from "../lib/utils";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

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
    const { t } = useTranslation();
  const [range, setRange] = useState<number>(6);
  
  const [showLoopSimulation, setShowLoopSimulation] = useState(() => {
    const saved = localStorage.getItem('glikosfera_loop_simulation');
    return saved ? JSON.parse(saved) : true;
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
          
                            {t('auto.szczegóły_glikemii', { defaultValue: i18n.t('auto.szczegoly_glikemii', { defaultValue: "Szczegóły Glikemii" }) })}
                          </h2>
        <p className="text-[10px] font-black text-slate-400 px-2 uppercase tracking-widest">{t('auto.pełny_podgląd_danych_z_ostatnich_go', { defaultValue: i18n.t('auto.pelny_podglad_danych_z_os', { defaultValue: "Pełny podgląd danych z ostatnich godzin" }) })}</p>
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
              
                                    {t('auto.pętla', { defaultValue: i18n.t('auto.petla', { defaultValue: "Pętla" }) })} {showLoopSimulation ? "ON" : "OFF"}
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
              
                                    {t('auto.glikosense', { defaultValue: 'GlikoSense' })} {showMLPrediction ? "ON" : "OFF"}
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

      <div className="w-full flex items-center gap-4 overflow-x-auto scrollbar-hide py-3 px-1 snap-x">
        <div className="flex items-center gap-1.5 snap-start shrink-0">
           <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white dark:border-slate-800 shadow-sm" />
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('auto.glukoza', { defaultValue: 'Glukoza' })}</span>
        </div>
        <div className="flex items-center gap-1.5 snap-start shrink-0 text-pink-500">
           <div className="p-1 max-w-fit rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
             <span className="text-[10px] leading-none mb-0.5">💉</span>
           </div>
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('auto.bolus_iob', { defaultValue: 'Bolus / IOB' })}</span>
        </div>
        <div className="flex items-center gap-1.5 snap-start shrink-0 text-amber-500">
           <div className="p-1 max-w-fit rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
             <span className="text-[10px] leading-none mb-0.5">🍽️</span>
           </div>
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('auto.węgle_ww', { defaultValue: i18n.t('auto.wegle_ww', { defaultValue: "Węgle (WW)" }) })}</span>
        </div>
        <div className="flex items-center gap-1.5 snap-start shrink-0 text-rose-500">
           <div className="p-1 max-w-fit rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
             <span className="text-[10px] leading-none mb-0.5">⚠️</span>
           </div>
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center">{t('auto.nakładanie_dawek', { defaultValue: i18n.t('auto.nakladanie_dawek', { defaultValue: "Nakładanie dawek" }) })}</span>
        </div>
        <div className="flex items-center gap-1.5 snap-start shrink-0 text-teal-500">
           <div className="p-1 max-w-fit rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
             <Droplets size={10} strokeWidth={2.5} />
           </div>
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('auto.wkłucie', { defaultValue: i18n.t('auto.wklucie', { defaultValue: "Wkłucie" }) })}</span>
        </div>
        <div className="flex items-center gap-1.5 snap-start shrink-0 text-indigo-500">
           <div className="p-1 max-w-fit rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
             <Signal size={10} strokeWidth={2.5} />
           </div>
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('auto.sensor', { defaultValue: 'Sensor' })}</span>
        </div>
        <div 
          onClick={() => {
            Haptics.selection();
            setShowLoopSimulation(!showLoopSimulation);
          }}
          className={cn(
            "flex items-center gap-1.5 snap-start shrink-0 cursor-pointer transition-all hover:opacity-80 active:scale-95",
            showLoopSimulation ? "opacity-100" : "opacity-30"
          )}
        >
           <div className="w-3 h-[2px] border-b-2 border-emerald-500 border-dashed" />
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('auto.prognoza_pętli', { defaultValue: i18n.t('auto.prognoza_petli', { defaultValue: "Prognoza Pętli" }) })}</span>
        </div>
        <div 
          onClick={() => {
            Haptics.selection();
            setShowMLPrediction(!showMLPrediction);
          }}
          className={cn(
            "flex items-center gap-1.5 snap-start shrink-0 cursor-pointer transition-all hover:opacity-80 active:scale-95",
            showMLPrediction ? "opacity-100" : "opacity-30"
          )}
        >
           <div className="w-3 h-[2px] border-b-2 border-amber-400 border-dashed" />
           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('auto.glikosense', { defaultValue: 'GlikoSense' })}</span>
        </div>
      </div>
    </div>
  );
}

