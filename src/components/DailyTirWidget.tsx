import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { LogEntry } from '../types';
import { useTranslation } from "react-i18next";

interface DailyTirWidgetProps {
  logs: LogEntry[];
  settings: any; // UserSettings
}

export default function DailyTirWidget({ logs, settings }: DailyTirWidgetProps) {
    const { t } = useTranslation();
  const { tir, metrics } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const glucoseLogs = logs.filter(
      (log) => log.type === "glucose" && new Date(log.timestamp) >= today
    );

    if (glucoseLogs.length === 0) {
      return { tir: null, metrics: { inRange: 0, high: 0, low: 0 } };
    }

    const min = settings?.targetRangeMin || 70;
    const max = settings?.targetRangeMax || 180;

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
        <p className="text-[10px] font-black uppercase text-slate-500">{t('auto.brak_pomiarów_dzisiaj', { defaultValue: 'Brak pomiarów dzisiaj' })}</p>
      </div>
    );
  }

  const data = [
    { name: 'Niski', value: metrics.low, color: '#f43f5e' }, // rose-500
    { name: 'W normie', value: metrics.inRange, color: '#10b981' }, // emerald-500
    { name: 'Wysoki', value: metrics.high, color: '#f59e0b' }, // amber-500
  ];

  return (
    <div className="w-full h-full flex flex-col p-4 relative group">
      <h3 className="text-[10px] font-black text-slate-500/60 uppercase tracking-widest text-center mb-1">
        
                      {t('auto.dzienny_tir', { defaultValue: 'Dzienny TIR' })}
                    </h3>
      <div className="flex-1 relative flex items-center justify-center min-h-[100px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="90%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
           <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter shadow-sm font-display leading-none">
             {tir}%
           </span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-3 mt-2">
        <div className="flex items-center gap-1.5 opacity-90">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{metrics.low}%</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-90">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{metrics.inRange}%</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-90">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{metrics.high}%</span>
        </div>
      </div>
    </div>
  );
}