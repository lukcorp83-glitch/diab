import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { Utensils, PieChart, History, Sparkles, BookOpen, Activity, ArrowLeft, Camera, Mic } from "lucide-react";
import { PlateItem, UserSettings, LogEntry } from "../../types";
import MealPlate from "../MealPlate";
import { Diets } from "../Diets";
import MealHistoryView from "../MealHistoryView";
import { cn } from "../../lib/utils";
import { Haptics } from "../../lib/haptics";

export interface NutritionHubProps {
  user: any;
  setTab: (tab: string, action?: string) => void;
  sharedPlate: PlateItem[];
  setSharedPlate: React.Dispatch<React.SetStateAction<PlateItem[]>>;
  settings?: UserSettings;
  logs?: LogEntry[];
  initialSubTab?: "creator" | "diet" | "history";
}

export default function NutritionHub({
  user,
  setTab,
  sharedPlate,
  setSharedPlate,
  settings,
  logs = [],
  initialSubTab = "creator",
}: NutritionHubProps) {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<"creator" | "diet" | "history">(initialSubTab);

  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleTabChange = (tab: "creator" | "diet" | "history") => {
    if (tab !== activeSubTab) {
      Haptics.selection();
      setActiveSubTab(tab);
    }
  };

  const tabs = [
    {
      id: "creator" as const,
      label: t("nutrition.tab_creator", { defaultValue: "Talerz i AI" }),
      icon: <Utensils size={16} />,
      badge: sharedPlate.length > 0 ? sharedPlate.length : undefined,
    },
    {
      id: "diet" as const,
      label: t("nutrition.tab_diet", { defaultValue: "Bilans i Dieta" }),
      icon: <PieChart size={16} />,
      badge: settings?.activeDiet ? "1" : undefined,
    },
    {
      id: "history" as const,
      label: t("nutrition.tab_history", { defaultValue: "Dziennik i Glikemia" }),
      icon: <History size={16} />,
    },
  ];

  return (
    <div className="w-full min-h-screen pb-36 flex flex-col">
      {/* Pływający górny przełącznik zakładek (Segmented Control) */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-3 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 transition-colors">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 dark:bg-slate-900/90 rounded-2xl border border-slate-300/40 dark:border-slate-800/80 shadow-inner w-full">
            {tabs.map((tab) => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "relative flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer select-none",
                    isActive
                      ? "text-slate-900 dark:text-white shadow-md shadow-slate-900/5 dark:shadow-black/40"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nutrition-tab-indicator"
                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className={cn("transition-transform duration-300", isActive ? "scale-110 text-sky-500 dark:text-sky-400" : "")}>
                    {tab.icon}
                  </span>
                  <span className="truncate">{tab.label}</span>
                  {tab.badge && (
                    <span className={cn(
                      "ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none",
                      isActive ? "bg-sky-500 text-white" : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    )}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Zawartość zakładek */}
      <div className="flex-1 max-w-4xl mx-auto w-full pt-4 px-2 sm:px-4">
        <AnimatePresence mode="wait">
          {activeSubTab === "creator" && (
            <motion.div
              key="tab-creator"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="w-full space-y-4"
            >
              {/* Interaktywny Baner AI */}
              <div
                onClick={() => {
                  Haptics.medium();
                  setTab("assistant");
                }}
                className="group cursor-pointer bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 dark:from-sky-500/20 dark:via-indigo-500/20 dark:to-purple-500/20 rounded-2xl p-4 border border-sky-200/60 dark:border-sky-800/60 hover:border-sky-500 dark:hover:border-sky-400 transition-all active:scale-[0.99] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/30 shrink-0 group-hover:scale-105 transition-transform animate-pulse">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors flex items-center gap-2">
                      {t("nutrition.ai_title", { defaultValue: "Szybkie Narzędzia GlikoSense AI" })}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold uppercase">
                        {t("auto.akcje_talerza", { defaultValue: "Akcje Talerza" })}
                      </span>
                    </h4>
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                      {t("nutrition.ai_desc", { defaultValue: "Skanuj zdjęcia potraw, podyktuj posiłek głosem lub zapytaj Czatu AI. Produkty zostaną od razu przeliczone i dodane na Twój Talerz." })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-slate-800/50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      Haptics.medium();
                      sessionStorage.setItem("ai_plate_action", "camera");
                      setTab("database");
                    }}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    title={t("auto.zrob_zdjecie_analiza_ai", { defaultValue: "Zrób zdjęcie (Analiza AI)" })}
                  >
                    <Camera size={14} />
                    <span>{t("meal.analyze_btn", { defaultValue: "Analiza AI" })}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      Haptics.medium();
                      sessionStorage.setItem("ai_plate_action", "voice");
                      setTab("database");
                    }}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    title={t("auto.podyktuj_posilek", { defaultValue: "Podyktuj posiłek" })}
                  >
                    <Mic size={14} />
                    <span>{t("auto.glosowo", { defaultValue: "Głosowo" })}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      Haptics.medium();
                      setTab(settings?.childMode ? "chat" : "assistant");
                    }}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition-all"
                    title={t("auto.czat_ai", { defaultValue: "Czat AI" })}
                  >
                    <Sparkles size={14} />
                    <span>{t("auto.czat_ai", { defaultValue: "Czat AI" })}</span>
                  </button>
                </div>
              </div>

              {/* Układ wewnątrz karty kreatora - czysty widok Talerza i AI */}
              <div className="w-full">
                <MealPlate
                  user={user}
                  setTab={setTab}
                  sharedPlate={sharedPlate}
                  setSharedPlate={setSharedPlate}
                  mode="plate"
                  openHistory={() => handleTabChange("history")}
                  settings={settings}
                  logs={logs}
                  hideInternalTabs={true}
                />
              </div>
            </motion.div>
          )}

          {activeSubTab === "diet" && (
            <motion.div
              key="tab-diet"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <Diets user={user} setTab={setTab} settings={settings} logs={logs} />
            </motion.div>
          )}

          {activeSubTab === "history" && (
            <motion.div
              key="tab-history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="w-full space-y-6"
            >
              {/* Sekcja edukacyjna glikemii po posiłku */}
              <div className="bg-gradient-to-br from-indigo-50 to-emerald-50 dark:from-indigo-950/40 dark:to-emerald-950/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800/40 flex items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 shrink-0">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      {t("nutrition.history_title", { defaultValue: "Korelacja Posiłku i Glikemii" })}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {t("nutrition.history_desc", { defaultValue: "Obserwuj szczytowe glikemie po zjedzeniu dania. Zawsze sprawdzaj, czy bolus pokrył wyrzut z makroskładników." })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 sm:p-6 shadow-xl border border-slate-100 dark:border-slate-800">
                <MealHistoryView logs={logs} user={user} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
