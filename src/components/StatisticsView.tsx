import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry } from '../types';
import { Calendar, Droplets, Utensils, RefreshCw, Syringe, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

interface StatisticsViewProps {
  logs: LogEntry[];
}

interface DayStats {
  dateStr: string;
  carbs: number;
  insulin: number;
}

interface MonthStats {
  monthKey: string;
  monthName: string;
  totalCarbs: number;
  totalInsulin: number;
  siteChanges: number;
  sensorChanges: number;
  days: Record<string, DayStats>;
}

export default function StatisticsView({ logs }: StatisticsViewProps) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const monthsData = useMemo(() => {
    const data: Record<string, MonthStats> = {};

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
          days: {}
        };
      }
      
      if (!data[monthKey].days[dayKey]) {
        data[monthKey].days[dayKey] = { dateStr: dayKey, carbs: 0, insulin: 0 };
      }

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
        data[monthKey].siteChanges += 1;
      }
      if (log.type === 'sensor_change') {
        data[monthKey].sensorChanges += 1;
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
      <div className="text-center text-slate-500 mt-10">Brak danych do wyświetlenia statystyk.</div>
    );
  }

  return (
    <div className="space-y-4">
      {monthsData.map((month) => {
        const isExpanded = expandedMonth === month.monthKey;
        const sortedDays = Object.values(month.days).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
        
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
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-amber-500/10 rounded-2xl p-3 flex flex-col justify-center relative group">
                  <div className="flex items-center gap-1.5 text-amber-600 mb-1">
                    <Utensils size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Węglowodany</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-amber-700 dark:text-amber-500 leading-none">{Math.round(month.totalCarbs)}g</span>
                    <span className="text-[10px] font-bold text-amber-600/70">~{Math.round(avgCarbs)}g/dzień</span>
                  </div>
                </div>
                
                <div className="bg-indigo-500/10 rounded-2xl p-3 flex flex-col justify-center relative group">
                  <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                    <Syringe size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Insulina</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-indigo-700 dark:text-indigo-500 leading-none">{month.totalInsulin.toFixed(1)}j</span>
                    <span className="text-[10px] font-bold text-indigo-600/70">~{avgInsulin.toFixed(1)}j/dzień</span>
                  </div>
                </div>

                <div className="bg-teal-500/10 rounded-2xl p-3 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-teal-600 mb-1">
                    <Droplets size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Wymiany wkłuć</span>
                  </div>
                  <span className="text-lg font-black text-teal-700 dark:text-teal-500 leading-none">{month.siteChanges}</span>
                </div>

                <div className="bg-emerald-500/10 rounded-2xl p-3 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                    <RefreshCw size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Wymiany sensorów</span>
                  </div>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-500 leading-none">{month.sensorChanges}</span>
                </div>
              </div>
            </div>

            {/* Daily details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800"
                >
                  <div className="pt-4 space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Zestawienie Dzienne</h4>
                    {sortedDays.map(day => (
                      <div key={day.dateStr} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0 pl-1">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                          {new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' }).format(new Date(day.dateStr))}
                        </span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 w-20 justify-end">
                            <span className="text-sm font-black text-amber-500">{Math.round(day.carbs)}g</span>
                          </div>
                          <span className="w-px h-4 bg-slate-200 dark:bg-slate-700"></span>
                          <div className="flex items-center gap-1 w-20 justify-start">
                            <span className="text-sm font-black text-indigo-500">{day.insulin.toFixed(1)}j</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
