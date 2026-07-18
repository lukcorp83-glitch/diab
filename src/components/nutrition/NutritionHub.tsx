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
      label: t("nutrition.tab_creator", { defaultValue: "Talerz" }),
      icon: <Utensils size={16} />,
      badge: sharedPlate.length > 0 ? sharedPlate.length : undefined,
    },
    {
      id: "diet" as const,
      label: t("nutrition.tab_diet", { defaultValue: "Dieta" }),
      icon: <PieChart size={16} />,
      badge: settings?.activeDiet ? "1" : undefined,
    },
    {
      id: "history" as const,
      label: t("nutrition.tab_history", { defaultValue: "Historia" }),
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
              {/* Układ wewnątrz karty kreatora - czysty widok Talerza */}
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
