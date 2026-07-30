import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogEntry } from "../types";
import { Utensils, Syringe, Trash2, Plus, Download, Activity } from "lucide-react";
import MealEditModal from "./MealEditModal";
import { useTranslation } from "react-i18next";
import { cn, getTs } from "../lib/utils";
import SwipeableItem from "./SwipeableItem";
import { db } from "../lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { getEffectiveUid } from "../lib/utils";
import toast from "react-hot-toast";

interface MealHistoryProps {
  logs: LogEntry[];
  user: any;
  onMergeToLog?: (log: LogEntry) => void;
  hasItems?: boolean;
}

export default function MealHistoryView({ logs, user, onMergeToLog, hasItems }: MealHistoryProps) {
  const { t } = useTranslation();
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);

  const mealLogs = useMemo(() => {
    return logs.filter(log => {
      if (log.type === "meal") return true;
      if (log.type === "carbs") return true;
      if (log.type === "bolus" && log.linkedMeal) {
        const c = log.linkedMeal.carbs || 0;
        const p = log.linkedMeal.protein || 0;
        const f = log.linkedMeal.fat || 0;
        return c > 0 || p > 0 || f > 0;
      }
      return false;
    }).sort((a, b) => {
      const timeA = a.timestamp || a.createdAt || 0;
      const timeB = b.timestamp || b.createdAt || 0;
      return timeB - timeA;
    });
  }, [logs]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs", id));
      window.dispatchEvent(new CustomEvent('localLogDelete', { detail: { id } }));
      toast.success(t('auto.usunieto', { defaultValue: "Usunięto!" }), { id: "meal-delete" });
    } catch (e) {
      toast.error("Błąd usuwania", { id: "meal-delete" });
    }
  };

  if (mealLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center opacity-50 mt-10">
        <Utensils size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="font-black text-lg text-slate-800 dark:text-white">Brak zapisanych posiłków</h3>
        <p className="text-xs text-slate-500 mt-2">Skomponuj posiłek na talerzu i dodaj go do historii.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 mt-4">
      <AnimatePresence>
        {editingLog && (
          <MealEditModal
            log={editingLog}
            user={user}
            onClose={() => setEditingLog(null)}
          />
        )}
      </AnimatePresence>

      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-2">Historia Twoich posiłków</h3>

      <div className="space-y-3">
        <AnimatePresence>
          {mealLogs.map((log) => (
            <motion.div
              key={log.id || log.nsId || `meal-${getTs(log.timestamp || log.createdAt)}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <SwipeableItem id={log.id || log.nsId} onDelete={() => { const eid = log.id || log.nsId; if (eid) handleDelete(eid); }}>
                <div
                  onClick={() => {
                    if (hasItems && onMergeToLog) {
                      onMergeToLog(log);
                    } else {
                      setEditingLog(log);
                    }
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[2rem] flex items-center gap-4 group hover:border-amber-200 dark:hover:border-amber-900 transition-all cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner shadow-slate-200 dark:shadow-slate-950 bg-amber-500/10 text-amber-500 shrink-0">
                    <Utensils size={20} strokeWidth={2.5} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-black text-slate-800 dark:text-white truncate">
                        {log.description || log.notes || log.linkedMeal?.name || t('auto.posilek', { defaultValue: "Posiłek" })}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2 mt-0.5">
                        {new Date(getTs(log.timestamp || log.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    {(() => {
                      // Dla bolusów z pompy dane są w linkedMeal
                      const src = (log.type === 'bolus' && log.linkedMeal) ? log.linkedMeal : log;
                      const carbs = src.carbs || (log.type === 'meal' ? log.value : 0) || 0;
                      const protein = src.protein || 0;
                      const fat = src.fat || 0;
                      const calories = src.calories || (carbs > 0 || protein > 0 || fat > 0
                        ? Math.round(carbs * 4 + protein * 4 + fat * 9)
                        : 0);

                      const mealTime = getTs(log.timestamp || log.createdAt);
                      const startBgLog = logs.find(l => l.type === 'glucose' && Math.abs(getTs(l.timestamp || l.createdAt) - mealTime) <= 30 * 60000);
                      const peakBgLog = logs
                        .filter(l => l.type === 'glucose' && getTs(l.timestamp || l.createdAt) > mealTime && getTs(l.timestamp || l.createdAt) <= mealTime + 2.5 * 3600000)
                        .sort((a, b) => (b.value || b.bg || 0) - (a.value || a.bg || 0))[0];

                      const startBg = startBgLog?.value || startBgLog?.bg;
                      const peakBg = peakBgLog?.value || peakBgLog?.bg;
                      const peakTime = peakBgLog ? getTs(peakBgLog.timestamp || peakBgLog.createdAt) : null;
                      const timeToPeakMinutes = peakTime ? Math.round((peakTime - mealTime) / 60000) : null;

                      return (
                        <div className="flex flex-col gap-1.5 mt-2">
                          <div className="flex flex-wrap gap-2">
                            {calories > 0 && (
                              <span className="text-[10px] bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md font-bold">
                                {calories} kcal
                              </span>
                            )}
                            {carbs > 0 && (
                              <span className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold">
                                {Number(carbs).toFixed(1)}g W
                              </span>
                            )}
                            {protein > 0 && (
                              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold">
                                {protein}g B
                              </span>
                            )}
                            {fat > 0 && (
                              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                                {fat}g T
                              </span>
                            )}
                            {log.value > 0 && log.type === 'bolus' && (
                              <span className="text-[10px] bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                <Syringe size={10} /> {log.value}j.
                              </span>
                            )}
                          </div>
                          
                          {(startBg || peakBg) && (
                            <div className="flex items-center gap-1.5 mt-0.5 py-1 px-2 w-fit bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-100 dark:border-slate-700/50">
                               <Activity size={12} className="text-indigo-500" />
                               <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-tight">
                                 {startBg ? `${startBg} mg/dL ` : ''} 
                                 {peakBg ? `→ ${peakBg} mg/dL ${timeToPeakMinutes ? `(szczyt po ${timeToPeakMinutes} min)` : ''}` : ''}
                               </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {hasItems && onMergeToLog && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMergeToLog(log);
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/20 flex items-center justify-center transition-colors shrink-0 shadow-sm border border-slate-200 dark:border-slate-700"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              </SwipeableItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
