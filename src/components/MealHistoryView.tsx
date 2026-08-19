import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLogsStore } from "../stores/useLogsStore";
import { motion, AnimatePresence } from "motion/react";
import { LogEntry } from "../types";
import { Utensils, Syringe, Trash2, Plus, Download, X, Clock, CheckCircle2 } from "lucide-react";
import MealEditModal from "./MealEditModal";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/utils";
import SwipeableItem from "./SwipeableItem";
import { db } from "../lib/firebase";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Haptics } from "../lib/haptics";
import { getEffectiveUid } from "../lib/utils";
import toast from "react-hot-toast";
import { useNightscoutSettings } from "../hooks/queries/useProfileData";
import { nightscoutService } from "../services/nightscout";

interface MealHistoryProps {
  user?: any;
  onMergeToLog?: (log: LogEntry) => void;
  hasItems?: boolean;
}

export default function MealHistoryView({ user, onMergeToLog, hasItems }: MealHistoryProps) {
  const logs = useLogsStore((state) => state.logs);
  const { t } = useTranslation();
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [confirmEatenLog, setConfirmEatenLog] = useState<LogEntry | null>(null);
  const { data: nsSettings } = useNightscoutSettings(user);

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

  const confirmMarkAsEaten = async (logItem: LogEntry) => {
    Haptics.success();
    const eatenTime = Date.now();
    const eatenTimeStr = new Date(eatenTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eid = logItem.id || logItem.nsId;
    try {
      if (user && eid) {
        await updateDoc(doc(db, "users", getEffectiveUid(user), "logs", eid), {
          eatenAt: eatenTime
        });
      }
      window.dispatchEvent(new CustomEvent('localLogUpdate', { detail: { id: eid, eatenAt: eatenTime } }));
      toast.success(t('history.marked_as_eaten', { 
        time: eatenTimeStr,
        defaultValue: `🍽️ Zapisano czas posiłku: ${eatenTimeStr} (trawienie ruszyło od teraz)`
      }));
    } catch (err) {
      console.error("Failed to mark meal as eaten:", err);
      toast.error(t('history.err_mark_eaten', { defaultValue: 'Błąd zapisu czasu posiłku' }));
    }
  };

  const handleDelete = async (log: LogEntry) => {
    if (!user) return;
    try {
      const eid = log.id || log.nsId;
      if (!eid) return;

      if (log.nsId && nsSettings?.url && nsSettings?.secret) {
        nightscoutService.deleteTreatment(log.nsId, nsSettings.url, nsSettings.secret).catch(err => console.warn("Failed NS delete", err));
      }

      await deleteDoc(doc(db, "users", getEffectiveUid(user), "logs", eid));
      window.dispatchEvent(new CustomEvent('localLogDelete', { detail: { id: eid } }));
      toast.success(t('auto.usunieto', { defaultValue: "Usunięto!" }), { id: "meal-delete" });
    } catch (e) {
      toast.error("Błąd usuwania", { id: "meal-delete" });
    }
  };

  if (mealLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center opacity-50 mt-10">
        <Utensils size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="font-black text-lg text-slate-800 dark:text-white">{t('meal_history.no_meals_title', { defaultValue: 'Brak zapisanych posiłków' })}</h3>
        <p className="text-xs text-slate-500 mt-2">{t('meal_history.no_meals_desc', { defaultValue: 'Skomponuj posiłek na talerzu i dodaj go do historii.' })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 mt-4">
      {/* Modal edycji posiłku */}
      <AnimatePresence>
        {editingLog && (
          <MealEditModal
            log={editingLog}
            user={user}
            onClose={() => setEditingLog(null)}
          />
        )}
      </AnimatePresence>

      {/* Modal potwierdzenia zjedzenia posiłku */}
      <AnimatePresence>
        {confirmEatenLog && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmEatenLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                <Utensils size={32} strokeWidth={2.5} className="animate-bounce" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black dark:text-white">
                  {t('meal_history.confirm_eaten_title', { defaultValue: 'Potwierdź zjedzenie posiłku' })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('meal_history.confirm_eaten_desc', { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), defaultValue: `Czy chcesz oznaczyć, że ten posiłek został zjedzony teraz (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})?` })}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-left space-y-1">
                <p className="text-xs font-black dark:text-white truncate">
                  {confirmEatenLog.name || confirmEatenLog.description || confirmEatenLog.linkedMeal?.name || (confirmEatenLog.items && confirmEatenLog.items.length > 0 ? confirmEatenLog.items.map((i: any) => i.name).filter(Boolean).join(', ') : 'Posiłek')}
                </p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Wpis: {new Date(confirmEatenLog.timestamp || confirmEatenLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span className="text-amber-500 font-black">
                    {Math.round((confirmEatenLog.linkedMeal?.carbs || (confirmEatenLog as any).carbs || (confirmEatenLog.type === 'meal' ? confirmEatenLog.value : 0) || 0) * 10) / 10}g W
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                {t('meal_history.confirm_eaten_hint', { defaultValue: '💡 Od tego momentu aplikacja rozpocznie odliczanie czasu wchłaniania węglowodanów i wskaźnik trawienia (%) na Talerzu.' })}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmEatenLog(null)}
                  className="py-3 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
                >
                  {t('meal_history.btn_cancel', { defaultValue: 'Anuluj' })}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const l = confirmEatenLog;
                    setConfirmEatenLog(null);
                    if (l) await confirmMarkAsEaten(l);
                  }}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-lg shadow-orange-500/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>{t('meal_history.btn_confirm', { defaultValue: 'Tak, zjadłem' })}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-2">{t('meal_history.section_title', { defaultValue: 'Historia Twoich posiłków' })}</h3>

      <div className="space-y-3">
        <AnimatePresence>
          {mealLogs.map((log, idx) => (
            <motion.div
              key={log.id || log.nsId || `meal-${log.timestamp || log.createdAt}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <SwipeableItem id={log.id || log.nsId || `unknown-${log.timestamp}`} onDelete={() => handleDelete(log)}>
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
                        {log.name || log.description || (log.notes !== '<none>' ? log.notes : '') || log.linkedMeal?.name || (log.items && log.items.length > 0 ? log.items.map((i: any) => i.name).filter(Boolean).join(', ') : '') || t('auto.posilek', { defaultValue: "Posiłek" })}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2 mt-0.5">
                        {new Date(log.timestamp || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    {(() => {
                      const src = (log.type === 'bolus' && log.linkedMeal) ? log.linkedMeal : log;
                      const carbs = Math.round((src.carbs || (log.type === 'meal' ? log.value : 0) || 0) * 10) / 10;
                      const protein = Math.round((src.protein || 0) * 10) / 10;
                      const fat = Math.round((src.fat || 0) * 10) / 10;
                      const calories = Math.round(src.calories || (carbs > 0 || protein > 0 || fat > 0
                        ? carbs * 4 + protein * 4 + fat * 9
                        : 0));
                      return (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {calories > 0 && (
                            <span className="text-[10px] bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md font-bold">
                              {calories} kcal
                            </span>
                          )}
                          {carbs > 0 && (
                            <span className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold">
                              {carbs}g W
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
                      );
                    })()}
                  </div>

                  {/* Przycisk Zjadłem teraz TYLKO na najnowszym posiłku (idx === 0) */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {idx === 0 ? (
                      log.eatenAt ? (
                        <span className="text-[9.5px] font-black px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-sm whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ✓ Zjedzono {new Date(log.eatenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            Haptics.light();
                            setConfirmEatenLog(log);
                          }}
                          className="text-[10px] font-black px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white shadow-md shadow-orange-500/20 border border-orange-400/40 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap z-10"
                          title="Kliknij, aby oznaczyć moment rozpoczęcia jedzenia"
                        >
                          <Utensils size={12} strokeWidth={2.5} />
                          <span>{t('meal_history.btn_eaten_now', { defaultValue: 'Zjadłem teraz' })}</span>
                        </button>
                      )
                    ) : log.eatenAt ? (
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        ✓ {new Date(log.eatenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : null}

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
                </div>
              </SwipeableItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
