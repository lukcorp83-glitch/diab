import i18n from '../i18n';
import { getEffectiveUid } from "../lib/utils";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogEntry } from "../types";
import {
  Activity,
  Utensils,
  Droplets,
  Syringe,
  ArrowLeft,
  Edit2,
  CloudRain,
  RefreshCw,
} from "lucide-react";
import { cn } from "../lib/utils";
import SwipeableItem from "./SwipeableItem";
import { db } from "../lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import DoseEditModal from "./DoseEditModal";
import { nightscoutService } from "../services/nightscout";
import { useTranslation } from "react-i18next";

interface HistoryProps {
  logs: LogEntry[];
  user: any;
  onBack: () => void;
  settings?: any;
}

export default function HistoryView({ logs, user, onBack, settings }: HistoryProps) {
    const { t } = useTranslation();
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [listFilter, setListFilter] = useState<"all" | "glucose" | "treatment">(
    "treatment",
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <AnimatePresence>
        {editingLog && (
          <DoseEditModal
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
          <h2 className="text-xl font-black dark:text-white leading-none">
            
                                  {t('auto.historia', { defaultValue: 'Historia' })}
                                </h2>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
            
                                  {t('auto.wszystkie_wpisy', { defaultValue: 'Wszystkie wpisy' })}
                                </p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
        <button
          onClick={() => setListFilter("all")}
          className={cn(
            "text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl transition-all whitespace-nowrap",
            listFilter === "all"
              ? "bg-slate-800 text-white dark:bg-white dark:text-slate-900"
              : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500",
          )}
        >
          
                            {t('auto.wszystkie', { defaultValue: 'Wszystkie' })}
                          </button>
        <button
          onClick={() => setListFilter("glucose")}
          className={cn(
            "text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl transition-all whitespace-nowrap",
            listFilter === "glucose"
              ? "bg-indigo-500 text-white"
              : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500",
          )}
        >
          
                            {t('auto.tylko_glukoza', { defaultValue: 'Tylko Glukoza' })}
                          </button>
        <button
          onClick={() => setListFilter("treatment")}
          className={cn(
            "text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl transition-all whitespace-nowrap",
            listFilter === "treatment"
              ? "bg-amber-500 text-white"
              : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500",
          )}
        >
          
                            {t('auto.posiłki_i_leki', { defaultValue: i18n.t('auto.posilki_i_leki', { defaultValue: "Posiłki i Leki" }) })}
                          </button>
      </div>

      <div className="space-y-1 will-change-transform">
        {logs
          .filter((log) => {
            if (listFilter === "glucose") return log.type === "glucose";
            if (listFilter === "treatment")
              return (
                log.type === "bolus" ||
                (log.type as any) === "insulin" ||
                log.type === "meal" ||
                log.type === "site_change" ||
                log.type === "sensor_change"
              );
            return true;
          })
          .slice(0, 1000)
          .map((log, idx) => (
            <motion.div
              key={`${log.id}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.05, 0.5), duration: 0.2 }}
            >
              <SwipeableItem
                id={log.id}
                onDelete={async () => {
                  if (settings?.followerMode) return;
                  try {
                    window.dispatchEvent(new CustomEvent('localLogDelete', { detail: { id: log.id } }));
                    
                    // Delete from Nightscout if applicable
                    if (log.nsId && settings?.apiIntegration?.nightscoutUrl && settings?.apiIntegration?.nightscoutSecret) {
                       nightscoutService.deleteTreatment(
                          log.nsId,
                          settings.apiIntegration.nightscoutUrl,
                          settings.apiIntegration.nightscoutSecret
                       ).catch(err => console.warn("Failed to delete from NS", err));
                    }

                    deleteDoc(
                      doc(
                        db,
                        "artifacts",
                        "diacontrolapp",
                        "users",
                        getEffectiveUid(user),
                        "logs",
                        log.id,
                      ),
                    ).catch(err => console.warn("Failed to delete remotely", err));
                  } catch (err) {
                    console.error("Delete failed:", err);
                  }
                }}
              >
                <div
                  onClick={() => {
                      if (settings?.followerMode) return;
                      if (
                        log.type === "carbs" ||
                        log.type === "glucose" ||
                        log.type === "bolus" ||
                        (log.type as any) === "insulin"
                      ) {
                        setEditingLog(log);
                      }
                  }}
                  className={cn(
                    "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-[2rem] flex items-center gap-4 group hover:border-slate-300 dark:hover:border-slate-700 transition-all mb-2 cursor-pointer",
                    (log.type === "meal" ||
                      log.type === "bolus" ||
                      (log.type as any) === "insulin") &&
                      "hover:bg-amber-50/10",
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner transition-colors shadow-slate-200 dark:shadow-slate-950 px-1",
                      log.type === "glucose"
                        ? "bg-indigo-500/10 text-indigo-500"
                        : log.type === "meal"
                          ? "bg-amber-500/10 text-amber-500"
                          : log.type === "site_change" ||
                              log.type === "sensor_change"
                            ? "bg-teal-500/10 text-teal-500"
                            : "bg-accent-500/10 text-accent-500",
                    )}
                  >
                    {log.type === "glucose" && (
                      <Activity size={18} strokeWidth={2.5} />
                    )}
                    {log.type === "meal" && (
                      <Utensils size={18} strokeWidth={2.5} />
                    )}
                    {log.type === "site_change" && (
                      <Droplets size={18} strokeWidth={2.5} />
                    )}
                    {log.type === "sensor_change" && (
                      <RefreshCw size={18} strokeWidth={2.5} />
                    )}
                    {log.type === "activity" && (
                      <Activity
                        size={18}
                        className="text-emerald-500"
                        strokeWidth={2.5}
                      />
                    )}
                    {(log.type === "bolus" ||
                      (log.type as any) === "insulin") && (
                      <div className="flex items-center gap-0.5">
                        <Syringe
                          size={log.linkedMeal ? 14 : 18}
                          strokeWidth={2.5}
                        />
                        {log.linkedMeal && (
                          <Utensils size={12} className="text-amber-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <p className="font-black text-sm dark:text-white truncate">
                        {typeof log.value === "number"
                          ? log.type === "glucose"
                            ? Math.round(log.value)
                            : log.type === "activity"
                              ? log.value
                              : log.type === "site_change" ||
                                  log.type === "sensor_change"
                                ? ""
                                : Number(log.value.toFixed(2))
                          : log.type === "bolus" ||
                              (log.type as any) === "insulin"
                            ? Number(Number(log.value).toFixed(2))
                            : log.value}
                        {log.type === "site_change" ||
                        log.type === "sensor_change"
                          ? log.notes || "Wymiana"
                          : log.type === "glucose"
                            ? " mg/dL"
                            : log.type === "meal"
                              ? "g W"
                              : log.type === "activity"
                                ? " min"
                                : " j."}
                        {log.type === "meal" &&
                          (log.polyols || log.protein || log.fat) && (
                            <span className="text-[10px] font-bold text-slate-400 ml-2">
                              {log.polyols
                                ? `${log.polyols.toFixed(0)}P / `
                                : ""}
                              {log.protein?.toFixed(0)}{t('auto.b', { defaultValue: 'B /' })} {log.fat?.toFixed(0)}
                              T
                            </span>
                          )}
                        {(log.type === "bolus" ||
                          (log.type as any) === "insulin") &&
                          log.linkedMeal && (
                            <span className="text-[10px] font-bold text-amber-500 ml-2">
                              (+{(log.linkedMeal.carbs || 0).toFixed(1)}{t('auto.g_w', { defaultValue: 'g W' })}
                                                                            {log.linkedMeal.polyols
                                ? `, ${(log.linkedMeal.polyols || 0).toFixed(1)}P`
                                : ""}
                              )
                            </span>
                          )}
                      </p>
                      {(log.type === "carbs" ||
                        log.type === "glucose" ||
                        log.type === "bolus" ||
                        (log.type as any) === "insulin") && (
                        <Edit2
                          size={14}
                          className="text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors shrink-0"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {!isNaN(new Date(log.timestamp).getTime()) ? (
                          <>
                            {new Date(log.timestamp).toLocaleDateString()}{" "}
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </>
                        ) : (
                          "Brak daty"
                        )}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <span className="text-[9px] font-bold text-slate-500 truncate italic">
                        {(() => {
                          let n = log.notes || log.description || "";
                          if (n === "<none>") n = "";
                          if (
                            n === "Kalkulator bolusa" ||
                            n === "Pobrano z kalkulatora" ||
                            n === i18n.t('auto.pobrano_z_kalkulatora', { defaultValue: 'Pobrano z kalkulatora' }) ||
                            n === i18n.t('auto.kalkulator_bolusa', { defaultValue: 'Kalkulator bolusa' })
                          ) {
                            if (
                              (log.type === "bolus" ||
                                (log.type as any) === "insulin") &&
                              log.linkedMeal?.name
                            ) {
                              n = log.linkedMeal.name;
                            } else if (
                              log.type === "meal" &&
                              log.linkedMeal?.name
                            ) {
                              n = log.linkedMeal.name;
                            } else {
                               if (n === "Kalkulator bolusa") n = i18n.t('auto.kalkulator_bolusa', { defaultValue: 'Kalkulator bolusa' });
                               if (n === "Pobrano z kalkulatora") n = i18n.t('auto.pobrano_z_kalkulatora', { defaultValue: 'Pobrano z kalkulatora' });
                            }
                          }
                          if (n.toLowerCase() === "glucose") return "Glukoza";
                          if (
                            n.toLowerCase() === "meal" ||
                            n.toLowerCase() === "carbs"
                          )
                            return i18n.t('auto.posilek', { defaultValue: i18n.t('auto.posilek', { defaultValue: "Posiłek" }) });
                          if (
                            n.toLowerCase() === "bolus" ||
                            n.toLowerCase() === "insulin"
                          )
                            return "Insulina";
                          let baseLabel =
                            n ||
                            (log.type === "glucose"
                              ? "Glukoza"
                              : log.type === "meal"
                                ? i18n.t('auto.posilek', { defaultValue: i18n.t('auto.posilek', { defaultValue: "Posiłek" }) })
                                : log.type === "site_change"
                                  ? i18n.t('auto.wymiana_wklucia', { defaultValue: i18n.t('auto.wymiana_wklucia', { defaultValue: "Wymiana Wkłucia" }) })
                                  : log.type === "sensor_change"
                                    ? "Wymiana Sensora"
                                    : "Bolus");
                          if (log.isExtended) {
                            baseLabel = i18n.t('auto.laczony_var0_h', { defaultValue: "Łączony ({{var0}}h)", var0: log.extendedTime });
                          }
                          return baseLabel;
                        })()}
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        {log.source?.startsWith("nightscout") ? (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                            
                                                                          {t('auto.ns', { defaultValue: 'NS' })}
                                                                        </span>
                        ) : log.source === "csv" ||
                          (log.notes && log.notes.includes("Import")) ? (
                          <span className="text-[8px] bg-accent-500/10 text-accent-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                            
                                                                                  {t('auto.csv', { defaultValue: 'CSV' })}
                                                                                </span>
                        ) : (
                          <span className="text-[8px] bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                            
                                                                                  {t('auto.ręcz', { defaultValue: i18n.t('auto.recz', { defaultValue: "Ręcz." }) })}
                                                                                </span>
                        )}

                        {log.weather && (
                          <div className="flex items-center gap-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">
                            <CloudRain size={10} strokeWidth={3} />
                            <span className="text-[8px] font-black uppercase tracking-tighter">
                              {log.weather.temp}{t('auto.c', { defaultValue: '°C' })}
                                                                              </span>
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
          <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-b from-slate-50/50 to-slate-100/50 dark:from-slate-800/20 dark:to-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-200/60 dark:border-slate-700/50 opacity-80 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 shadow-inner ring-1 ring-slate-200 dark:ring-slate-700/50 text-slate-300 dark:text-slate-600">
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
              
                                        {t('auto.dziennik_jest_pusty', { defaultValue: 'Dziennik jest pusty' })}
                                      </p>
            <p className="text-[9px] font-bold text-slate-400/70 dark:text-slate-500/70 mt-2 text-center max-w-[200px]">
              
                                        {t('auto.dodaj_swój_pierwszy_wpis_aby_rozpoc', { defaultValue: i18n.t('auto.dodaj_swoj_pierwszy_wpis', { defaultValue: "Dodaj swój pierwszy wpis, aby rozpocząć monitorowanie terapii." }) })}
                                      </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

