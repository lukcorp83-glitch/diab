import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLogsStore } from "../stores/useLogsStore";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { LogEntry } from '../types';
import { getTimestampMs } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { Target, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface DailyTirWidgetProps {
  settings: any; // UserSettings
}

export default function DailyTirWidget({ settings }: DailyTirWidgetProps) {
  const logs = useLogsStore((state) => state.logs);
  const { t } = useTranslation();
  const { tir, metrics } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const glucoseLogs = logs.filter(
      (log) => log.type === "glucose" && new Date(getTimestampMs(log.timestamp)) >= today
    );

    if (glucoseLogs.length === 0) {
      return { tir: null, metrics: { inRange: 0, high: 0, low: 0 } };
    }

    const min = settings?.targetMin || 70;
    const max = settings?.targetMax || 180;

    let inRange = 0;
    let high = 0;
    let low = 0;

    glucoseLogs.forEach((log) => {
      const v = Number(log.value);
      if (v < min) low++;
      else if (v > max) high++;
      else inRange++;
    });

    const total = glucoseLogs.length;
    return {
      tir: Math.round((inRange / total) * 100),
      metrics: {
        inRange: Math.round((inRange / total) * 100),
        high: Math.round((high / total) * 100),
        low: Math.round((low / total) * 100),
      }
    };
  }, [logs, settings]);

  if (tir === null) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center opacity-50">
        <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-300 dark:border-slate-700 mb-2"></div>
        <p className="text-[10px] font-black uppercase text-slate-500">{t('auto.brak_pomiarów_dzisiaj', { defaultValue: i18n.t('auto.brak_pomiarow_dzisiaj', { defaultValue: "Brak pomiarów dzisiaj" }) })}</p>
      </div>
    );
  }

  const data = [
    { name: 'Niski', value: metrics.low, color: '#f43f5e', glow: false }, // rose-500
    { name: 'W normie', value: metrics.inRange, color: '#10b981', glow: true }, // emerald-500
    { name: 'Wysoki', value: metrics.high, color: '#f59e0b', glow: false }, // amber-500
  ].filter(d => d.value > 0);

  // Fallback if all 0%
  const chartData = data.length > 0 ? data : [{ name: 'Brak', value: 100, color: '#94a3b8', glow: false }];

  return (
    <div className="w-full h-full flex flex-col p-4 relative group justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[10px] font-black text-slate-500/70 dark:text-slate-400/70 uppercase tracking-widest flex items-center gap-1.5">
          <Target size={12} className="text-emerald-500" />
          <span>{t('auto.dzienny_tir', { defaultValue: 'Dzienny TIR' })}</span>
        </h3>
        {tir >= 70 && (
          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            ≥70%
          </span>
        )}
      </div>

      {/* Circular Donut Gauge with Track & Neon Glow */}
      <div className="relative flex items-center justify-center min-h-[110px] my-1">
        {/* Background Track Ring */}
        <div className="absolute w-[110px] h-[110px] rounded-full border-[10px] border-slate-100 dark:border-slate-800/80 pointer-events-none" />

        <PieChart width={120} height={120}>
          <defs>
            <filter id="emerald-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={43}
            outerRadius={55}
            paddingAngle={chartData.length > 1 ? 3 : 0}
            dataKey="value"
            stroke="none"
            cornerRadius={5}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
                filter={entry.name === 'W normie' ? 'url(#emerald-glow)' : undefined}
              />
            ))}
          </Pie>
        </PieChart>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span 
            key={tir}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter shadow-sm font-display leading-none tabular-nums"
          >
            {tir}%
          </motion.span>
          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mt-0.5">
            {t('auto.w_normie', { defaultValue: 'W normie' })}
          </span>
        </div>
      </div>

      {/* Capsule Pills Legend */}
      <div className="grid grid-cols-3 gap-1.5 mt-2">
        {/* Low */}
        <div className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 text-center transition-all hover:scale-105">
          <span className="text-[7.5px] font-bold text-rose-500 uppercase tracking-tight leading-none">&lt;70</span>
          <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 tracking-tight leading-tight mt-0.5 tabular-nums">{metrics.low}%</span>
        </div>

        {/* In Range (Highlight) */}
        <div className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 shadow-sm shadow-emerald-500/10 text-center transition-all hover:scale-105">
          <span className="text-[7.5px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight leading-none">70-180</span>
          <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-tight mt-0.5 tabular-nums">{metrics.inRange}%</span>
        </div>

        {/* High */}
        <div className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-center transition-all hover:scale-105">
          <span className="text-[7.5px] font-bold text-amber-500 uppercase tracking-tight leading-none">&gt;180</span>
          <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 tracking-tight leading-tight mt-0.5 tabular-nums">{metrics.high}%</span>
        </div>
      </div>
    </div>
  );
}
