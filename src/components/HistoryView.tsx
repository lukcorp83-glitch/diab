import { getEffectiveUid } from '../lib/utils';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry } from '../types';
import { Activity, Utensils, Droplets, Syringe, ArrowLeft, Edit2, CloudRain, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import SwipeableItem from './SwipeableItem';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import MealEditModal from './MealEditModal';

interface HistoryProps {
  logs: LogEntry[];
  user: any;
  onBack: () => void;
}

export default function HistoryView({ logs, user, onBack }: HistoryProps) {
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [listFilter, setListFilter] = useState<'all' | 'glucose' | 'treatment'>('treatment');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <AnimatePresence>
        {editingLog && (
          <MealEditModal 
            log={editingLog} 
            user={user} 
            onClose={() => setEditingLog(null)} 
          />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={onBack}
          className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95 transition-all text-slate-500 glass-target"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black dark:text-white leading-none">Historia</h2>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Wszystkie wpisy</p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
        <button
          onClick={() => setListFilter('all')}
          className={cn("text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl transition-all whitespace-nowrap", listFilter === 'all' ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500")}
        >
          Wszystkie
        </button>
        <button
          onClick={() => setListFilter('glucose')}
          className={cn("text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl transition-all whitespace-nowrap", listFilter === 'glucose' ? "bg-indigo-500 text-white" : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500")}
        >
          Tylko Glukoza
        </button>
        <button
          onClick={() => setListFilter('treatment')}
          className={cn("text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl transition-all whitespace-nowrap", listFilter === 'treatment' ? "bg-amber-500 text-white" : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500")}
        >
          Posiłki i Leki
        </button>
      </div>

      <div className="space-y-1 will-change-transform">
        {logs.filter(log => {
          if (listFilter === 'glucose') return log.type === 'glucose';
          if (listFilter === 'treatment') return log.type === 'bolus' || log.type === 'meal' || log.type === 'site_change' || log.type === 'sensor_change';
          return true;
        }).slice(0, 100).map((log, idx) => (
          <motion.div 
            key={`${log.id}-${idx}`} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.05, 0.5), duration: 0.2 }}
          >
            <SwipeableItem 
              id={log.id}
              onDelete={async () => {
                try {
                  await deleteDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs', log.id));
                } catch (err) {
                  console.error("Delete failed:", err);
                }
              }}
            >
              <div 
                onClick={() => {
                  if (log.type === 'meal' || log.type === 'bolus') {
                    setEditingLog(log);
                  }
                }}
                className={cn(
                  "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-[2rem] flex items-center gap-4 group hover:border-slate-300 dark:hover:border-slate-700 transition-all mb-2 cursor-pointer",
                  (log.type === 'meal' || log.type === 'bolus') && "hover:bg-amber-50/10"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner transition-colors shadow-slate-200 dark:shadow-slate-950 px-1",
                  log.type === 'glucose' ? "bg-indigo-500/10 text-indigo-500" :
                  log.type === 'meal' ? "bg-amber-500/10 text-amber-500" : 
                  (log.type === 'site_change' || log.type === 'sensor_change') ? "bg-teal-500/10 text-teal-500" : 
                  "bg-accent-500/10 text-accent-500"
                )}>
                  {log.type === 'glucose' && <Activity size={18} strokeWidth={2.5} />}
                  {log.type === 'meal' && <Utensils size={18} strokeWidth={2.5} />}
                  {log.type === 'site_change' && <Droplets size={18} strokeWidth={2.5} />}
                  {log.type === 'sensor_change' && <RefreshCw size={18} strokeWidth={2.5} />}
                  {log.type === 'activity' && <Activity size={18} className="text-emerald-500" strokeWidth={2.5} />}
                  {log.type === 'bolus' && (
                    <div className="flex items-center gap-0.5">
                      <Syringe size={log.linkedMeal ? 14 : 18} strokeWidth={2.5} />
                      {log.linkedMeal && <Utensils size={12} className="text-amber-500" />}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 justify-between">
                    <p className="font-black text-sm dark:text-white truncate">
                      {typeof log.value === 'number' ? 
                        (log.type === 'glucose' ? Math.round(log.value) : 
                         log.type === 'activity' ? log.value :
                         log.type === 'site_change' || log.type === 'sensor_change' ? '' : 
                         log.value.toFixed(1)) : log.value}
                      {(log.type === 'site_change' || log.type === 'sensor_change') ? (log.notes || 'Wymiana') : 
                       (log.type === 'glucose' ? ' mg/dL' : 
                        log.type === 'meal' ? 'g W' : 
                        log.type === 'activity' ? ' min' :
                        ' j.')}
                      {log.type === 'meal' && (log.polyols || log.protein || log.fat) && (
                        <span className="text-[10px] font-bold text-slate-400 ml-2">
                           {log.polyols ? `${log.polyols.toFixed(0)}P / ` : ''}{log.protein?.toFixed(0)}B / {log.fat?.toFixed(0)}T
                        </span>
                      )}
                      {log.type === 'bolus' && log.linkedMeal && (
                        <span className="text-[10px] font-bold text-amber-500 ml-2">
                           (+{(log.linkedMeal.carbs || 0).toFixed(1)}g W{log.linkedMeal.polyols ? `, ${(log.linkedMeal.polyols || 0).toFixed(1)}P` : ''})
                        </span>
                      )}
                    </p>
                    {(log.type === 'meal' || log.type === 'bolus') && (
                      <Edit2 size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="text-[9px] font-bold text-slate-500 truncate italic">
                      {(() => {
                        const n = log.notes || log.description || '';
                        if (n.toLowerCase() === 'glucose') return 'Glukoza';
                        if (n.toLowerCase() === 'meal' || n.toLowerCase() === 'carbs') return 'Posiłek';
                        if (n.toLowerCase() === 'bolus' || n.toLowerCase() === 'insulin') return 'Insulina';
                        let baseLabel = n || (log.type === 'glucose' ? 'Glukoza' : log.type === 'meal' ? 'Posiłek' : log.type === 'site_change' ? 'Wymiana Wkłucia' : log.type === 'sensor_change' ? 'Wymiana Sensora' : 'Bolus');
                        if (log.isExtended) {
                          baseLabel = `Łączony (${log.extendedTime}h)`;
                        }
                        return baseLabel;
                      })()}
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                      {log.source === 'nightscout' ? (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">NS</span>
                      ) : (log.source === 'csv' || (log.notes && log.notes.includes('Import'))) ? (
                        <span className="text-[8px] bg-accent-500/10 text-accent-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">CSV</span>
                      ) : (
                        <span className="text-[8px] bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Ręcz.</span>
                      )}
                      
                      {log.weather && (
                        <div className="flex items-center gap-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">
                          <CloudRain size={10} strokeWidth={3} />
                          <span className="text-[8px] font-black uppercase tracking-tighter">{log.weather.temp}°C</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </SwipeableItem>
          </motion.div>
        ))}
        {logs.length === 0 && (
          <div className="text-center py-20 bg-slate-100 dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Brak wpisów</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
