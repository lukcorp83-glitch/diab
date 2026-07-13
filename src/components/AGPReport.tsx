import React, { useMemo, useState, useEffect } from 'react';
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
import { ChevronLeft, Info, Calendar, AlertTriangle, ActivitySquare } from 'lucide-react';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

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

  const availableDays = useMemo(() => {
    const glucoseLogs = logs.filter(l => l.type === 'glucose' || l.bg);
    if (glucoseLogs.length === 0) return [7];
    
    const uniqueDays = new Set();
    glucoseLogs.forEach(l => {
      uniqueDays.add(new Date(l.timestamp).toLocaleDateString());
    });
    const activeDays = uniqueDays.size;
    
    // Opcje pokazują się jeśli mamy zebrane dane przynajmniej z połowy danego przedziału
    const options = [7, 14, 30, 90].filter(d => activeDays >= (d * 0.5));
    return options.length > 0 ? options : [7];
  }, [logs]);

  useEffect(() => {
    if (!availableDays.includes(daysBack)) {
      setDaysBack(availableDays[0]);
    }
  }, [availableDays, daysBack]);

  const agpData = useMemo(() => {
    const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    const glucoseLogs = logs.filter(
      (l) => (l.type === 'glucose' || l.bg) && l.timestamp >= cutoffTime
    );

    // Aby wykres AGP miał kliniczny sens, potrzebujemy przynajmniej jakiejś puli danych,
    // inaczej percentyle (10,25,75,90) pokazują bzdury.
    if (glucoseLogs.length < 30) return [];

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

  const incidentStats = useMemo(() => {
    const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    const glucoseLogs = logs
      .filter((l) => (l.type === 'glucose' || l.bg) && l.timestamp >= cutoffTime)
      .sort((a, b) => a.timestamp - b.timestamp);

    let hypos = 0;
    let hypers = 0;
    
    const hypoHours = new Array(24).fill(0);
    const hyperHours = new Array(24).fill(0);
    
    let currentState: 'normal' | 'hypo' | 'hyper' = 'normal';
    let lastTimestamp = 0;

    glucoseLogs.forEach(log => {
      if (lastTimestamp > 0 && (log.timestamp - lastTimestamp) > 2 * 60 * 60 * 1000) {
        currentState = 'normal';
      }
      lastTimestamp = log.timestamp;
      
      const val = log.value || log.bg;
      if (!val) return;
      
      let newState: 'normal' | 'hypo' | 'hyper' = 'normal';
      if (val < targetMin) newState = 'hypo';
      else if (val > targetMax) newState = 'hyper';
      
      const hour = new Date(log.timestamp).getHours();

      if (newState === 'hypo' && currentState !== 'hypo') {
        hypos++;
        hypoHours[hour]++;
      } else if (newState === 'hyper' && currentState !== 'hyper') {
        hypers++;
        hyperHours[hour]++;
      }
      
      currentState = newState;
    });

    const findPeakHour = (hoursArr: number[]) => {
      let maxIdx = -1;
      let maxVal = 0;
      for (let i = 0; i < 24; i++) {
        if (hoursArr[i] > maxVal) {
          maxVal = hoursArr[i];
          maxIdx = i;
        }
      }
      if (maxIdx === -1 || maxVal === 0) return null;
      return { hour: maxIdx, count: maxVal };
    };

    const peakHypo = findPeakHour(hypoHours);
    const peakHyper = findPeakHour(hyperHours);

    const actualDaysSpan = Math.max(1, Math.ceil((Date.now() - (glucoseLogs[0]?.timestamp || Date.now())) / (1000 * 60 * 60 * 24)));
    const effectiveDays = Math.min(daysBack, actualDaysSpan);

    const avgHyposPerWeek = Math.round((hypos / effectiveDays) * 7);
    const avgHypersPerWeek = Math.round((hypers / effectiveDays) * 7);

    return {
      hypos, hypers, avgHyposPerWeek, avgHypersPerWeek, peakHypo, peakHyper, effectiveDays
    };
  }, [logs, daysBack, targetMin, targetMax]);

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
            
                              {t('auto.próbki', { defaultValue: i18n.t('auto.probki', { defaultValue: "Próbki:" }) })} {data.count}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 pt-safe pb-safe z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col animation-fade-in">
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
            {availableDays.map(d => (
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
            <p><strong>{t('auto.czym_jest_agp', { defaultValue: 'Czym jest AGP?' })}</strong>  {t('auto.to_nałożenie_na_siebie_wszystkich_d', { defaultValue: i18n.t('auto.to_nalozenie_na_siebie_ws', { defaultValue: "To nałożenie na siebie wszystkich dób z wybranego okresu. Pokazuje jak typowo zachowuje się Twój cukier o danej porze dnia." }) })}</p>
            <ul className="list-disc pl-4 space-y-1 opacity-80 text-[11px]">
              <li><strong className="text-accent-500">{t('auto.ciemna_linia_mediana', { defaultValue: 'Ciemna linia (Mediana)' })}</strong>  {t('auto.najczęstszy_poziom_cukru_o_tej_porz', { defaultValue: i18n.t('auto.najczestszy_poziom_cukru', { defaultValue: "- najczęstszy poziom cukru o tej porze." }) })}</li>
              <li><strong>{t('auto.ciemny_pas_25_75', { defaultValue: 'Ciemny pas (25-75%)' })}</strong>  {t('auto.połowa_wszystkich_twoich_wyników_mi', { defaultValue: i18n.t('auto.polowa_wszystkich_twoich', { defaultValue: "- połowa wszystkich Twoich wyników mieści się w tym przedziale. Jeśli pas jest wąski, cukry są stabilne." }) })}</li>
              <li><strong>{t('auto.jasny_pas_10_90', { defaultValue: 'Jasny pas (10-90%)' })}</strong>  {t('auto.margines_błędów_i_wahań_pokazuje_sk', { defaultValue: i18n.t('auto.margines_bledow_i_wahan_p', { defaultValue: "- margines błędów i wahań. Pokazuje skrajne wyrzuty i spadki." }) })}</li>
            </ul>
          </div>
        </div>

        {/* Wykres */}
        <div className="glass-card rounded-3xl p-4 md:p-6 h-[400px] md:h-[500px] flex flex-col relative">
          {agpData.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Info size={28} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">{t('auto.brak_wystarczajacej_ilosci_da', { defaultValue: 'Brak wystarczającej ilości danych' })}</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                {t('auto.aby_wykres_agp_byl_statystyczni', { defaultValue: 'Aby wykres AGP był statystycznie poprawny, potrzebuje przynajmniej 30 odczytów glikemii w wybranym okresie. Zwiększ zakres dni lub dodaj więcej pomiarów.' })}
              </p>
            </div>
          ) : (
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
          )}
        </div>

        {/* Statystyki Incydentów */}
        {agpData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-3xl p-5 flex flex-col relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                  <AlertTriangle size={20} />
                  <span>{t('auto.niedocukrzenia_hipo', { defaultValue: 'Niedocukrzenia (Hipo)' })}</span>
                </div>
                <div className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {daysBack} {t('auto.dni', { defaultValue: 'Dni' })}
                </div>
              </div>
              
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-rose-700 dark:text-rose-500 leading-none tracking-tighter">{incidentStats.hypos}</span>
                <span className="text-xs font-bold text-rose-600/70 uppercase tracking-widest">{t('auto.incydentów', { defaultValue: 'Incydentów' })}</span>
              </div>
              
              <p className="text-sm font-medium text-rose-800/80 dark:text-rose-300/80 mb-4">
                {t('auto.srednio', { defaultValue: 'Średnio' })} <strong className="text-rose-600 dark:text-rose-400 font-black">{incidentStats.avgHyposPerWeek}</strong> {t('auto.incydentow_na_tydzien', { defaultValue: 'incydentów na tydzień.' })}
              </p>
              
              {incidentStats.peakHypo && (
                <div className="mt-auto bg-white/60 dark:bg-slate-900/60 rounded-2xl p-4 text-xs font-medium text-rose-900 dark:text-rose-200 border border-rose-100 dark:border-rose-800/30">
                  <span className="block text-[10px] uppercase font-black tracking-wider text-rose-500/80 mb-1">Największe Ryzyko</span>
                  Najczęstsze spadki w godzinach: <strong className="text-rose-600 dark:text-rose-400 font-black">{String(incidentStats.peakHypo.hour).padStart(2, '0')}:00 - {String(incidentStats.peakHypo.hour + 1).padStart(2, '0')}:00</strong> 
                  <span className="block mt-1 opacity-70">({incidentStats.peakHypo.count} incydentów w tym przedziale)</span>
                </div>
              )}
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-3xl p-5 flex flex-col relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold">
                  <ActivitySquare size={20} />
                  <span>{t('auto.przecukrzenia_hiper', { defaultValue: 'Przecukrzenia (Hiper)' })}</span>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {daysBack} {t('auto.dni', { defaultValue: 'Dni' })}
                </div>
              </div>
              
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-orange-700 dark:text-orange-500 leading-none tracking-tighter">{incidentStats.hypers}</span>
                <span className="text-xs font-bold text-orange-600/70 uppercase tracking-widest">{t('auto.incydentów', { defaultValue: 'Incydentów' })}</span>
              </div>
              
              <p className="text-sm font-medium text-orange-800/80 dark:text-orange-300/80 mb-4">
                {t('auto.srednio', { defaultValue: 'Średnio' })} <strong className="text-orange-600 dark:text-orange-400 font-black">{incidentStats.avgHypersPerWeek}</strong> {t('auto.incydentow_na_tydzien', { defaultValue: 'incydentów na tydzień.' })}
              </p>
              
              {incidentStats.peakHyper && (
                <div className="mt-auto bg-white/60 dark:bg-slate-900/60 rounded-2xl p-4 text-xs font-medium text-orange-900 dark:text-orange-200 border border-orange-100 dark:border-orange-800/30">
                  <span className="block text-[10px] uppercase font-black tracking-wider text-orange-500/80 mb-1">Największe Ryzyko</span>
                  Najczęstsze wzrosty w godzinach: <strong className="text-orange-600 dark:text-orange-400 font-black">{String(incidentStats.peakHyper.hour).padStart(2, '0')}:00 - {String(incidentStats.peakHyper.hour + 1).padStart(2, '0')}:00</strong> 
                  <span className="block mt-1 opacity-70">({incidentStats.peakHyper.count} incydentów w tym przedziale)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

