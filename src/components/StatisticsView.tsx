import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry, UserSettings } from '../types';
import { Calendar, Droplets, Utensils, Syringe, ChevronDown, ChevronUp, ActivitySquare, AlertTriangle, Signal } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface StatisticsViewProps {
  logs: LogEntry[];
  settings?: UserSettings;
}

interface DayStats {
  dateStr: string;
  carbs: number;
  insulin: number;
  hypos: number;
  hypers: number;
  siteChange: boolean;
  sensorChange: boolean;
}

interface MonthStats {
  monthKey: string;
  monthName: string;
  totalCarbs: number;
  totalInsulin: number;
  siteChanges: number;
  sensorChanges: number;
  hypos: number;
  hypers: number;
  days: Record<string, DayStats>;
}

export default function StatisticsView({ logs, settings }: StatisticsViewProps) {
    const { t } = useTranslation();
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const monthsData = useMemo(() => {
    const data: Record<string, MonthStats> = {};
    const targetMin = settings?.targetMin || 70;
    const targetMax = settings?.targetMax || 180;

    logs.forEach(log => {
      const date = new Date(log.timestamp);
      if (isNaN(date.getTime())) return;
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!data[monthKey]) {
        data[monthKey] = {
          monthKey,
          monthName: new Intl.DateTimeFormat('pl-PL', { year: 'numeric', month: 'long' }).format(date),
          totalCarbs: 0,
          totalInsulin: 0,
          siteChanges: 0,
          sensorChanges: 0,
          hypos: 0,
          hypers: 0,
          days: {}
        };
      }
      
      if (!data[monthKey].days[dayKey]) {
        data[monthKey].days[dayKey] = { dateStr: dayKey, carbs: 0, insulin: 0, hypos: 0, hypers: 0, siteChange: false, sensorChange: false };
      }

      // Glucose events will be processed separately for accurate episode calculation

      if (log.type === 'meal') {
        data[monthKey].totalCarbs += Number(log.value) || 0;
        data[monthKey].days[dayKey].carbs += Number(log.value) || 0;
      }
      
      if (log.type === 'bolus') {
        data[monthKey].totalInsulin += Number(log.value) || 0;
        data[monthKey].days[dayKey].insulin += Number(log.value) || 0;
        
        if (log.linkedMeal?.carbs) {
          data[monthKey].totalCarbs += Number(log.linkedMeal.carbs);
          data[monthKey].days[dayKey].carbs += Number(log.linkedMeal.carbs);
        }
      }
      
      if (log.type === 'site_change') {
        if (!data[monthKey].days[dayKey].siteChange) {
          data[monthKey].siteChanges += 1;
        }
        data[monthKey].days[dayKey].siteChange = true;
      }
      if (log.type === 'sensor_change') {
        if (!data[monthKey].days[dayKey].sensorChange) {
          data[monthKey].sensorChanges += 1;
        }
        data[monthKey].days[dayKey].sensorChange = true;
      }
    });

    // 2. Process glucose logs in chronological order to detect episodes (incidents)
    const glucoseLogs = logs.filter(l => l.type === 'glucose').sort((a, b) => a.timestamp - b.timestamp);
    
    let currentState: 'normal' | 'hypo' | 'hyper' = 'normal';
    let lastTimestamp = 0;

    glucoseLogs.forEach(log => {
      const date = new Date(log.timestamp);
      if (isNaN(date.getTime())) return;
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!data[monthKey]) return; // Should already be initialized

      // Reset state if there's a gap larger than 2 hours
      if (lastTimestamp > 0 && (log.timestamp - lastTimestamp) > 2 * 60 * 60 * 1000) {
        currentState = 'normal';
      }
      lastTimestamp = log.timestamp;

      const val = Number(log.value) || 0;
      if (val > 0) {
        let newState: 'normal' | 'hypo' | 'hyper' = 'normal';
        if (val < targetMin) newState = 'hypo';
        else if (val > targetMax) newState = 'hyper';

        if (newState === 'hypo' && currentState !== 'hypo') {
          data[monthKey].hypos += 1;
          if (data[monthKey].days[dayKey]) data[monthKey].days[dayKey].hypos += 1;
        } else if (newState === 'hyper' && currentState !== 'hyper') {
          data[monthKey].hypers += 1;
          if (data[monthKey].days[dayKey]) data[monthKey].days[dayKey].hypers += 1;
        }

        currentState = newState;
      }
    });

    return Object.values(data).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [logs]);

  // Expand the most recent month by default
  useEffect(() => {
    if (monthsData.length > 0 && !expandedMonth) {
      setExpandedMonth(monthsData[0].monthKey);
    }
  }, [monthsData, expandedMonth]);

  if (monthsData.length === 0) {
    return (
      <div className="text-center text-slate-500 mt-10">{t('auto.brak_danych_do_wyświetlenia_statyst', { defaultValue: i18n.t('auto.brak_danych_do_wyswietlen', { defaultValue: "Brak danych do wyświetlenia statystyk." }) })}</div>
    );
  }

  return (
    <div className="space-y-4">
      {monthsData.map((month) => {
        const isExpanded = expandedMonth === month.monthKey;
        
        const daysWithCarbs = Object.values(month.days).filter(d => d.carbs > 0).length || 1;
        const avgCarbs = month.totalCarbs / daysWithCarbs;
        
        const daysWithInsulin = Object.values(month.days).filter(d => d.insulin > 0).length || 1;
        const avgInsulin = month.totalInsulin / daysWithInsulin;

        return (
          <div key={month.monthKey} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden transition-all shadow-sm">
            {/* Header / Summary */}
            <div 
              onClick={() => setExpandedMonth(isExpanded ? null : month.monthKey)}
              className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg capitalize flex items-center gap-2 dark:text-white">
                  <Calendar size={18} className="text-indigo-500" />
                  {month.monthName}
                </h3>
                {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="bg-amber-500/10 rounded-2xl p-3 flex flex-col justify-center relative group">
                  <div className="flex items-center gap-1.5 text-amber-600 mb-1">
                    <Utensils size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('auto.węglowodany', { defaultValue: i18n.t('auto.weglowodany', { defaultValue: "Węglowodany" }) })}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-amber-700 dark:text-amber-500 leading-none">{Math.round(month.totalCarbs)}g</span>
                    <span className="text-[10px] font-bold text-amber-600/70">~{Math.round(avgCarbs)}{t('auto.g_dzień', { defaultValue: i18n.t('auto.g_dzien', { defaultValue: "g/dzień" }) })}</span>
                  </div>
                </div>
                
                <div className="bg-indigo-500/10 rounded-2xl p-3 flex flex-col justify-center relative group">
                  <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                    <Syringe size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('auto.insulina', { defaultValue: 'Insulina' })}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-indigo-700 dark:text-indigo-500 leading-none">{month.totalInsulin.toFixed(1)}j</span>
                    <span className="text-[10px] font-bold text-indigo-600/70">~{avgInsulin.toFixed(1)}{t('auto.j_dzień', { defaultValue: i18n.t('auto.j_dzien', { defaultValue: "j/dzień" }) })}</span>
                  </div>
                </div>

                <div className="bg-rose-500/10 rounded-2xl p-3 flex flex-col justify-center relative group">
                  <div className="flex items-center gap-1.5 text-rose-600 mb-1">
                    <AlertTriangle size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('auto.hipoglikemie', { defaultValue: 'Hipoglikemie' })}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-rose-700 dark:text-rose-500 leading-none">{month.hypos}</span>
                  </div>
                </div>
                
                <div className="bg-orange-500/10 rounded-2xl p-3 flex flex-col justify-center relative group">
                  <div className="flex items-center gap-1.5 text-orange-600 mb-1">
                    <ActivitySquare size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('auto.hiperglikemie', { defaultValue: 'Hiperglikemie' })}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-orange-700 dark:text-orange-500 leading-none">{month.hypers}</span>
                  </div>
                </div>

                <div className="bg-teal-500/10 rounded-2xl p-3 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-teal-600 mb-1">
                    <Droplets size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('auto.wymiany_wkłuć', { defaultValue: i18n.t('auto.wymiany_wkluc', { defaultValue: "Wymiany wkłuć" }) })}</span>
                  </div>
                  <span className="text-lg font-black text-teal-700 dark:text-teal-500 leading-none">{month.siteChanges}</span>
                </div>

                <div className="bg-indigo-500/10 rounded-2xl p-3 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                    <Signal size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('auto.wymiany_sensorów', { defaultValue: i18n.t('auto.wymiany_sensorow', { defaultValue: "Wymiany sensorów" }) })}</span>
                  </div>
                  <span className="text-lg font-black text-indigo-700 dark:text-indigo-500 leading-none">{month.sensorChanges}</span>
                </div>
              </div>
            </div>

            {/* Daily details */}
            <AnimatePresence>
              {isExpanded && (() => {
                const [yearStr, monthStr] = month.monthKey.split('-');
                const year = parseInt(yearStr);
                const monthIdx = parseInt(monthStr) - 1;
                const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
                const firstDayOfMonth = new Date(year, monthIdx, 1).getDay();
                const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
                const blankDays = Array(startOffset).fill(null);
                
                const monthDays = Array.from({length: daysInMonth}, (_, i) => {
                  const d = i + 1;
                  const dayKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  return { d, dayKey, stats: month.days[dayKey] };
                });

                return (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800"
                  >
                    <div className="pt-4 space-y-2">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">{t('auto.zestawienie_dzienne', { defaultValue: 'Zestawienie Dzienne' })}</h4>
                      
                      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-1">
                        {['Pn', 'Wt', i18n.t('auto.sr', { defaultValue: i18n.t('auto.sr', { defaultValue: "Śr" }) }), 'Cz', 'Pt', 'Sb', 'Nd'].map(day => (
                          <div key={day} className="text-[9px] font-black uppercase text-slate-400">{day}</div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1">
                        {blankDays.map((_, i) => (
                          <div key={`blank-${i}`} className="min-h-[4.4rem] sm:min-h-[5.2rem] rounded-xl bg-slate-50 dark:bg-transparent"></div>
                        ))}
                        {monthDays.map(({ d, dayKey, stats }) => (
                          <div 
                            key={dayKey} 
                            className={cn(
                              "min-h-[4.4rem] sm:min-h-[5.2rem] rounded-xl flex flex-col justify-between items-center relative border p-1 py-1.5",
                              stats 
                                ? "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all shadow-sm" 
                                : "bg-slate-50/50 dark:bg-transparent border-transparent opacity-50"
                            )}
                          >
                            <span className={cn(
                              "text-[10px] sm:text-xs font-black absolute top-1 left-1.5", 
                              stats ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
                            )}>
                              {d}
                            </span>

                            {/* Górne sygnalizatory pulsujące przy wymianie sensora lub wkłucia */}
                            <div className="absolute top-1 right-1.5 flex gap-0.5 z-10">
                              {stats?.sensorChange && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm animate-pulse" title={t('auto.dzień_wymiany_sensora', { defaultValue: i18n.t('auto.dzien_wymiany_sensora', { defaultValue: "Dzień wymiany sensora" }) })} />}
                              {stats?.siteChange && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-sm animate-pulse" title={t('auto.dzień_wymiany_wkłucia', { defaultValue: i18n.t('auto.dzien_wymiany_wklucia', { defaultValue: "Dzień wymiany wkłucia" }) })} />}
                            </div>
                            
                            {stats && (
                              <div className="flex flex-col items-center justify-between h-full w-full">
                                {/* Węglowodany i Insulina w jednym wierszu flex-wrap */}
                                <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 w-full mt-3 px-0.5 text-center">
                                  {stats.carbs > 0 && (
                                    <div className="text-[8px] sm:text-[9.5px] font-black text-amber-500 leading-none" title={t('auto.węglowodany', { defaultValue: i18n.t('auto.weglowodany', { defaultValue: "Węglowodany" }) })}>
                                      {Math.round(stats.carbs)}g
                                    </div>
                                  )}
                                  {stats.insulin > 0 && (
                                    <div className="text-[8px] sm:text-[9.5px] font-black text-indigo-600 dark:text-indigo-400 leading-none" title={t('auto.insulina', { defaultValue: 'Insulina' })}>
                                      {stats.insulin.toFixed(1)}j
                                    </div>
                                  )}
                                </div>

                                {/* Hipoglikemia / Hiperglikemia / Wymiany na dole */}
                                {(stats.hypos > 0 || stats.hypers > 0 || stats.siteChange || stats.sensorChange) && (
                                  <div className="flex flex-wrap gap-0.5 sm:gap-1 justify-center items-center w-full mt-auto pt-1">
                                    {stats.hypos > 0 && (
                                      <div className="text-white bg-rose-500 text-[7px] sm:text-[8px] px-0.5 sm:px-1 py-0.5 rounded font-black leading-none min-w-[12px] text-center" title={`Niski cukier: ${stats.hypos} razy`}>
                                        {stats.hypos}↓
                                      </div>
                                    )}
                                    {stats.hypers > 0 && (
                                      <div className="text-white bg-orange-500 text-[7px] sm:text-[8px] px-0.5 sm:px-1 py-0.5 rounded font-black leading-none min-w-[12px] text-center" title={`Wysoki cukier: ${stats.hypers} razy`}>
                                        {stats.hypers}↑
                                      </div>
                                    )}
                                    {stats.siteChange && (
                                      <div className="flex items-center justify-center text-white bg-teal-500 p-0.5 rounded shadow-sm hover:scale-110 transition-transform" title={t('auto.wymiana_wkłucia', { defaultValue: i18n.t('auto.wymiana_wklucia', { defaultValue: "Wymiana wkłucia" }) })}>
                                        <Droplets size={8} className="stroke-[3]" />
                                      </div>
                                    )}
                                    {stats.sensorChange && (
                                      <div className="flex items-center justify-center text-white bg-indigo-500 p-0.5 rounded shadow-sm hover:scale-110 transition-transform" title={t('auto.wymiana_sensora', { defaultValue: 'Wymiana sensora' })}>
                                        <Signal size={8} className="stroke-[3]" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

