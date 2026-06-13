import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { LogEntry, UserSettings } from '../types';
import { ChevronLeft, Info, Calendar } from 'lucide-react';
import { useTranslation } from "react-i18next";

interface AGPReportProps {
  logs: LogEntry[];
  settings: UserSettings;
  onClose: () => void;
  theme: 'light' | 'dark';
}

const getPercentile = (sortedData: number[], p: number) => {
  if (sortedData.length === 0) return 0;
  if (sortedData.length === 1) return sortedData[0];
  const index = (p / 100) * (sortedData.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedData[lower] * (1 - weight) + sortedData[upper] * weight;
};

export default function AGPReport({ logs, settings, onClose, theme }: AGPReportProps) {
    const { t } = useTranslation();
  const [daysBack, setDaysBack] = useState(14);

  const agpData = useMemo(() => {
    const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    const glucoseLogs = logs.filter(
      (l) => (l.type === 'glucose' || l.bg) && l.timestamp >= cutoffTime
    );

    if (glucoseLogs.length === 0) return [];

    // Create 48 buckets (one for every 30 minutes)
    const buckets: { [key: number]: number[] } = {};
    for (let i = 0; i < 48; i++) {
      buckets[i] = [];
    }

    glucoseLogs.forEach(log => {
      const val = log.value || log.bg;
      if (!val) return;
      const d = new Date(log.timestamp);
      const bucketIdx = d.getHours() * 2 + Math.floor(d.getMinutes() / 30);
      buckets[bucketIdx].push(val);
    });

    const data = [];
    for (let i = 0; i <= 48; i++) {
      // Dla 48 duplikujemy 0 by domknąć wykres na 24:00
      const idx = i === 48 ? 0 : i; 
      const sorted = buckets[idx].sort((a, b) => a - b);
      
      const hour = Math.floor(i / 2);
      const min = (i % 2) * 30;
      const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

      if (sorted.length > 0) {
        data.push({
          time: timeStr,
          p10_90: [getPercentile(sorted, 10), getPercentile(sorted, 90)],
          p25_75: [getPercentile(sorted, 25), getPercentile(sorted, 75)],
          median: getPercentile(sorted, 50),
          count: sorted.length
        });
      } else {
        data.push({
          time: timeStr,
          p10_90: [null, null],
          p25_75: [null, null],
          median: null,
          count: 0
        });
      }
    }
    return data;
  }, [logs, daysBack]);

  const targetMin = settings.targetMin || 70;
  const targetMax = settings.targetMax || 140;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.count === 0) return null;
      return (
        <div className="bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-white/10 text-xs font-medium space-y-1 z-50">
          <p className="font-bold text-accent-400 mb-2">{label}</p>
          <div className="flex justify-between gap-4">
            <span className="opacity-70">10% - 90%:</span>
            <span>{Math.round(data.p10_90[0])} - {Math.round(data.p10_90[1])}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="opacity-70">25% - 75%:</span>
            <span>{Math.round(data.p25_75[0])} - {Math.round(data.p25_75[1])}</span>
          </div>
          <div className="flex justify-between gap-4 text-accent-400 font-bold mt-1 pt-1 border-t border-white/10">
            <span>{t('auto.mediana', { defaultValue: 'Mediana:' })}</span>
            <span>{Math.round(data.median)}</span>
          </div>
          <div className="text-[9px] opacity-50 mt-2 text-right">
            
                              {t('auto.próbki', { defaultValue: 'Próbki:' })} {data.count}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col animation-fade-in">
      {/* Header */}
      <div className="pt-safe px-4 pb-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft size={24} className="text-slate-700 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="font-display font-black text-lg text-slate-900 dark:text-white uppercase tracking-wider">
              
                                        {t('auto.ambulatory_glucose_profile', { defaultValue: 'Ambulatory Glucose Profile' })}
                                      </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              
                                        {t('auto.standard_kliniczny_agp', { defaultValue: 'Standard Kliniczny AGP' })}
                                      </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Kontrolki */}
        <div className="glass-card rounded-3xl p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm font-bold">
            <Calendar size={18} />
            
                                  {t('auto.zakres_analizy', { defaultValue: 'Zakres analizy:' })}
                                </div>
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDaysBack(d)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                  daysBack === d 
                    ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-3xl p-4 flex gap-3">
          <Info className="text-indigo-500 shrink-0 mt-0.5" size={20} />
          <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-2 font-medium">
            <p><strong>{t('auto.czym_jest_agp', { defaultValue: 'Czym jest AGP?' })}</strong>  {t('auto.to_nałożenie_na_siebie_wszystkich_d', { defaultValue: 'To nałożenie na siebie wszystkich dób z wybranego okresu. Pokazuje jak typowo zachowuje się Twój cukier o danej porze dnia.' })}</p>
            <ul className="list-disc pl-4 space-y-1 opacity-80 text-[11px]">
              <li><strong className="text-accent-500">{t('auto.ciemna_linia_mediana', { defaultValue: 'Ciemna linia (Mediana)' })}</strong>  {t('auto.najczęstszy_poziom_cukru_o_tej_porz', { defaultValue: '- najczęstszy poziom cukru o tej porze.' })}</li>
              <li><strong>{t('auto.ciemny_pas_25_75', { defaultValue: 'Ciemny pas (25-75%)' })}</strong>  {t('auto.połowa_wszystkich_twoich_wyników_mi', { defaultValue: '- połowa wszystkich Twoich wyników mieści się w tym przedziale. Jeśli pas jest wąski, cukry są stabilne.' })}</li>
              <li><strong>{t('auto.jasny_pas_10_90', { defaultValue: 'Jasny pas (10-90%)' })}</strong>  {t('auto.margines_błędów_i_wahań_pokazuje_sk', { defaultValue: '- margines błędów i wahań. Pokazuje skrajne wyrzuty i spadki.' })}</li>
            </ul>
          </div>
        </div>

        {/* Wykres */}
        <div className="glass-card rounded-3xl p-4 md:p-6 h-[400px] md:h-[500px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <ComposedChart data={agpData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} vertical={false} />
              
              <XAxis 
                dataKey="time" 
                tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }}
                tickMargin={10}
                interval={5} // Pokaż co 3 godziny (5 * 30 min)
                axisLine={false}
                tickLine={false}
              />
              
              <YAxis 
                domain={[40, 300]}
                tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: theme === 'dark' ? '#475569' : '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }} />

              <ReferenceLine y={targetMax} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: 'Cel Max', fill: '#f59e0b', fontSize: 9, fontWeight: 800 }} />
              <ReferenceLine y={targetMin} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideBottomLeft', value: 'Cel Min', fill: '#ef4444', fontSize: 9, fontWeight: 800 }} />

              {/* Obszar 10% - 90% */}
              <Area 
                type="monotone" 
                dataKey="p10_90" 
                stroke="none" 
                fill={theme === 'dark' ? '#6366f1' : '#818cf8'} 
                fillOpacity={0.2} 
                isAnimationActive={true}
                connectNulls
              />
              
              {/* Obszar 25% - 75% */}
              <Area 
                type="monotone" 
                dataKey="p25_75" 
                stroke="none" 
                fill={theme === 'dark' ? '#4f46e5' : '#6366f1'} 
                fillOpacity={0.4} 
                isAnimationActive={true}
                connectNulls
              />
              
              {/* Mediana 50% */}
              <Line 
                type="monotone" 
                dataKey="median" 
                stroke={theme === 'dark' ? '#10b981' : '#059669'} 
                strokeWidth={3} 
                dot={false}
                isAnimationActive={true}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}