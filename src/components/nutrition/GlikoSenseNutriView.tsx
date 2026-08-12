import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Utensils, 
  CheckCircle2, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown,
  Activity,
  Flame,
  LayoutGrid,
  List
} from "lucide-react";
import { LogEntry } from "../../types";
import { cn } from "../../lib/utils";
import { Haptics } from "../../lib/haptics";
import GlikoSenseIcon from "../GlikoSenseIcon";

const getPluralForm = (count: number, one: string, few: string, many: string): string => {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (abs === 1) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} ${few}`;
  }
  return `${count} ${many}`;
};

export interface NutriMealEntry {
  name: string;
  count: number;
  spikes: number;
  avgMaxBg?: number;
  toleranceScore: number;
  consistencyIndex: number;
  category: 'golden' | 'tricky' | 'neutral';
  avgCorrections: number;
  avgReturnTime: number;
}

export interface NutriProfile {
  overallTolerance: number;
  goldenMeals: NutriMealEntry[];
  trickyMeals: NutriMealEntry[];
  allMeals: NutriMealEntry[];
  updatedAt?: number;
}

interface GlikoSenseNutriViewProps {
  logs: LogEntry[];
}

export default function GlikoSenseNutriView({ logs }: GlikoSenseNutriViewProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<NutriProfile | null>(() => {
    try {
      const saved = localStorage.getItem('glikosense_nutri_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'tolerance' | 'count' | 'maxBg'>('tolerance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAllGolden, setShowAllGolden] = useState(false);
  const [showAllTricky, setShowAllTricky] = useState(false);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setProfile(e.detail);
      }
    };
    window.addEventListener('glikosense_nutri_update', handleUpdate);
    return () => window.removeEventListener('glikosense_nutri_update', handleUpdate);
  }, []);

  const computedProfile = React.useMemo(() => {
    if (profile && profile.allMeals && profile.allMeals.length > 0) return profile;

    const mealPatterns: Record<string, { spikes: number; count: number; totalCorrections: number; totalMaxBg: number }> = {};
    const meals = logs.filter(l => l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal?.carbs));
    const glucoseLogs = logs.filter(l => l.type === 'glucose' || l.bg).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const bolusLogs = logs.filter(l => l.type === 'bolus' || l.type === 'insulin');

    const isSpecificMealName = (name: string): boolean => {
      if (!name) return false;
      const clean = name.trim().toLowerCase();
      const genericNames = [
        'posiłek', 'posilek', 'jedzenie', 'snack', 'przekąska', 'przekaska',
        'kalkulator', 'bolus', 'korekta', 'dane z kalkulatora', 'kalkulator bolusa',
        'obiad', 'śniadanie', 'sniadanie', 'kolacja', 'wpis posiłku', 'meal'
      ];
      if (genericNames.includes(clean)) return false;
      if (/^posiłek\s*\d+$/i.test(clean)) return false;
      if (/^kalkulator/i.test(clean)) return false;
      return clean.length >= 3;
    };

    meals.forEach(m => {
      let rawName = m.note || m.name || m.linkedMeal?.name || '';
      if (!isSpecificMealName(rawName)) return;

      const name = rawName.trim().toLowerCase();
      const mealTime = m.timestamp || (m.createdAt ? new Date(m.createdAt).getTime() : 0);
      if (!mealTime) return;

      const postMealGlucose = glucoseLogs.filter(g => {
        const gt = g.timestamp || (g.createdAt ? new Date(g.createdAt).getTime() : 0);
        return gt >= mealTime && gt <= mealTime + 3 * 60 * 60 * 1000;
      });

      let maxBg = 0;
      let hasSpike = false;
      postMealGlucose.forEach(g => {
        const val = g.value || g.bg || 0;
        if (val > maxBg) maxBg = val;
        if (val > 180) hasSpike = true;
      });

      const postMealBoluses = bolusLogs.filter(b => {
        const bt = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return bt > mealTime + 30 * 60 * 1000 && bt <= mealTime + 3 * 60 * 60 * 1000;
      });

      if (!mealPatterns[name]) {
        mealPatterns[name] = { spikes: 0, count: 0, totalCorrections: 0, totalMaxBg: 0 };
      }

      mealPatterns[name].count += 1;
      mealPatterns[name].totalMaxBg += (maxBg > 0 ? maxBg : 130);
      mealPatterns[name].totalCorrections += postMealBoluses.length;
      if (hasSpike) mealPatterns[name].spikes += 1;
    });

    const nutriMeals: NutriMealEntry[] = Object.keys(mealPatterns).map(name => {
      const { spikes, count, totalCorrections, totalMaxBg } = mealPatterns[name];
      const avgMaxBg = totalMaxBg / count;
      const avgCorrections = totalCorrections / count;

      let baseScore = 100;
      if (avgMaxBg > 140 && avgMaxBg <= 180) {
        baseScore = 100 - ((avgMaxBg - 140) * 0.5);
      } else if (avgMaxBg > 180 && avgMaxBg <= 250) {
        baseScore = 80 - ((avgMaxBg - 180) * 0.57);
      } else if (avgMaxBg > 250) {
        baseScore = Math.max(10, 40 - ((avgMaxBg - 250) * 0.3));
      }

      const correctionPenalty = avgCorrections * 8;
      const toleranceScore = Math.max(5, Math.min(100, Math.round(baseScore - correctionPenalty)));

      let category: 'golden' | 'tricky' | 'neutral' = 'neutral';
      if (toleranceScore >= 75) category = 'golden';
      else category = 'tricky';

      let consistencyIndex = 85;
      if (count === 1) {
        if (spikes === 0 && avgMaxBg <= 150) {
          consistencyIndex = 92;
        } else if (spikes === 0) {
          consistencyIndex = 80;
        } else {
          consistencyIndex = 65;
        }
      } else {
        const successRatio = (count - spikes) / count;
        if (spikes === 0) {
          consistencyIndex = Math.min(98, 90 + Math.min(8, count * 2));
        } else if (spikes === count) {
          consistencyIndex = 85;
        } else {
          const variance = Math.abs(successRatio - 0.5);
          consistencyIndex = Math.round(50 + (variance * 70));
        }
      }

      return {
        name,
        count,
        spikes,
        avgMaxBg: Math.round(avgMaxBg),
        toleranceScore,
        consistencyIndex,
        category,
        avgCorrections: Math.round(avgCorrections * 10) / 10,
        avgReturnTime: 120
      };
    });

    const goldenMeals = nutriMeals.filter(m => m.category === 'golden').sort((a, b) => b.toleranceScore - a.toleranceScore);
    const trickyMeals = nutriMeals.filter(m => m.category === 'tricky').sort((a, b) => a.toleranceScore - b.toleranceScore);
    const overallTolerance = nutriMeals.length > 0
      ? Math.round(nutriMeals.reduce((sum, m) => sum + m.toleranceScore, 0) / nutriMeals.length)
      : 100;

    return {
      overallTolerance,
      goldenMeals,
      trickyMeals,
      allMeals: nutriMeals
    };
  }, [profile, logs]);

  const { overallTolerance, goldenMeals, trickyMeals, allMeals } = computedProfile;

  const avgOverallMaxBg = React.useMemo(() => {
    if (allMeals.length === 0) return 135;
    return Math.round(allMeals.reduce((acc, m) => acc + (m.avgMaxBg || 135), 0) / allMeals.length);
  }, [allMeals]);

  const filterAndSort = (mealsList: NutriMealEntry[]) => {
    let result = [...mealsList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(m => m.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (sortBy === 'count') return b.count - a.count;
      if (sortBy === 'maxBg') return (a.avgMaxBg || 0) - (b.avgMaxBg || 0);
      return b.toleranceScore - a.toleranceScore;
    });

    return result;
  };

  const filteredGolden = filterAndSort(goldenMeals);
  const visibleGolden = showAllGolden ? filteredGolden : filteredGolden.slice(0, 6);

  const filteredTricky = filterAndSort(trickyMeals);
  const visibleTricky = showAllTricky ? filteredTricky : filteredTricky.slice(0, 6);

  const isGoodTolerance = overallTolerance >= 75;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      
      {/* HERO BENTO HEADER - Glassmorphism Aurora Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative p-6 sm:p-8 rounded-[32px] overflow-hidden border backdrop-blur-xl transition-all shadow-xl",
          isGoodTolerance
            ? "bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-indigo-500/10 border-emerald-500/30 dark:border-emerald-400/20"
            : "bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-purple-500/10 border-amber-500/30 dark:border-amber-400/20"
        )}
      >
        {/* Glow Aurora Background Circle */}
        <div 
          className={cn(
            "absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none",
            isGoodTolerance ? "bg-emerald-400" : "bg-amber-400"
          )} 
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0",
              isGoodTolerance ? "bg-emerald-500 shadow-emerald-500/30" : "bg-amber-500 shadow-amber-500/30"
            )}>
              <GlikoSenseIcon size={28} isAnalyzing={true} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5 border border-white/20">
                <Flame size={12} className={isGoodTolerance ? "text-emerald-500" : "text-amber-500"} />
                GlikoSense Odżywianie
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                Reakcja na Posiłki
              </h2>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                Inteligentna analiza wpływu dań na poziom cukru
              </p>
            </div>
          </div>

          {/* Aurora Ring Score Gauge */}
          <div className="flex items-center gap-4 bg-white/40 dark:bg-slate-900/60 p-4 rounded-3xl backdrop-blur-md border border-white/30 dark:border-slate-800 shrink-0">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={isGoodTolerance ? "text-emerald-500" : "text-amber-500"}
                  strokeDasharray={`${overallTolerance}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {overallTolerance}%
                </span>
                <span className="text-[8px] font-extrabold uppercase text-slate-400 mt-0.5">Tolerancja</span>
              </div>
            </div>

            <div className="text-left">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                {isGoodTolerance ? "Świetna Stabilność" : "Wymaga Uwagi"}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5 max-w-[120px]">
                {isGoodTolerance ? "Większość dań bez skoków glikemii" : "Część posiłków wymaga dawki złożonej"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* BENTO GRID 4-KPI TILES (Apple Bento Grid Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Bento Tile 1: Złote Posiłki */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:bg-slate-900/90 border border-emerald-500/30 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
              <ShieldCheck size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Bezpieczne
            </span>
          </div>

          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block">
              {goldenMeals.length}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
              {t("nutrition.golden_meals", { defaultValue: "Moje Złote Posiłki" })}
            </span>
          </div>
        </motion.div>

        {/* Bento Tile 2: Posiłki Kapryśne */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:bg-slate-900/90 border border-amber-500/30 shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
              <AlertTriangle size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              Uwaga
            </span>
          </div>

          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block">
              {trickyMeals.length}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
              {t("nutrition.tricky_meals", { defaultValue: "Posiłki Kapryśne" })}
            </span>
          </div>
        </motion.div>

        {/* Bento Tile 3: Przeanalizowane Dania */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
              <Utensils size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
              Baza AI
            </span>
          </div>

          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block">
              {allMeals.length}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
              Przeanalizowane Nazwy
            </span>
          </div>
        </motion.div>

        {/* Bento Tile 4: Średni Szczyt Glikemii */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold">
              <Activity size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
              Śr. Szczyt
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {avgOverallMaxBg}
              </span>
              <span className="text-xs font-bold text-slate-400">mg/dL</span>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
              Średni Szczyt Posiłkowy
            </span>
          </div>
        </motion.div>
      </div>

      {/* FLOATING CONTROL BAR (Search + Sort + View Switcher) */}
      {allMeals.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-white/80 dark:bg-slate-900/90 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-md">
          {/* Search Box */}
          <div className="flex-1 min-w-[200px] relative flex items-center">
            <Search size={16} className="absolute left-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Szukaj posiłku (np. owsianka, pizza)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sort Selection */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <ArrowUpDown size={14} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={e => {
                  Haptics.light();
                  setSortBy(e.target.value as any);
                }}
                className="bg-transparent text-slate-900 dark:text-white text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="tolerance">Wg tolerancji</option>
                <option value="count">Wg częstotliwości</option>
                <option value="maxBg">Wg szczytu glikemii</option>
              </select>
            </div>

            {/* View Switcher Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  Haptics.light();
                  setViewMode('grid');
                }}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'grid'
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
                title="Karty Bento"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => {
                  Haptics.light();
                  setViewMode('list');
                }}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'list'
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
                title="Kompaktowa Lista"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOLDEN MEALS SECTION (🟢) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {t("nutrition.golden_meals", { defaultValue: "Moje Złote Posiłki" })}
          </h3>
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1 -mt-1">
          {t("nutrition.golden_meals_desc", { defaultValue: "Posiłki o najwyższym wskaźniku tolerancji – glikemia pozostaje w normie." })}
        </p>

        {filteredGolden.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-100/50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs font-semibold text-slate-400">
            {searchQuery ? "Brak złotych posiłków pasujących do wyszukiwania." : t("nutrition.no_data_yet", { defaultValue: "Zbieram pierwsze logi posiłków..." })}
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-3.5" : "flex flex-col gap-2"}>
              {visibleGolden.map((meal, idx) => (
                <motion.div
                  key={meal.name + idx}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "p-4 rounded-3xl border transition-all shadow-sm flex flex-col justify-between gap-3",
                    "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:bg-slate-900/90 border-emerald-500/25 dark:border-emerald-400/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black shrink-0">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white capitalize leading-tight">
                          {meal.name}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Zjedzono {meal.count}×
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block leading-none">
                        {meal.toleranceScore}%
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700/70 dark:text-emerald-300/70 uppercase">
                        Tolerancja
                      </span>
                    </div>
                  </div>

                  {/* Sub-stats Bento Pills */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-emerald-500/10 text-center">
                    <div className="p-2 rounded-2xl bg-white/60 dark:bg-emerald-500/15 backdrop-blur-sm">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 block">Śr. Max</span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.avgMaxBg || 140} mg</span>
                    </div>
                    <div className="p-2 rounded-2xl bg-white/60 dark:bg-emerald-500/15 backdrop-blur-sm">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 block">Powrót</span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.avgReturnTime || 90}m</span>
                    </div>
                    <div className="p-2 rounded-2xl bg-white/60 dark:bg-emerald-500/15 backdrop-blur-sm">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 block">Korekty</span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.avgCorrections || 0}×</span>
                    </div>
                    <div className="p-2 rounded-2xl bg-white/60 dark:bg-emerald-500/15 backdrop-blur-sm">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 block">Spójność</span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.consistencyIndex}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredGolden.length > 6 && (
              <button
                onClick={() => {
                  Haptics.light();
                  setShowAllGolden(!showAllGolden);
                }}
                className="w-full py-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-emerald-500/20 cursor-pointer"
              >
                {showAllGolden ? (
                  <>Zwiń listę <ChevronUp size={14} /></>
                ) : (
                  <>Pokaż pozostałe {getPluralForm(filteredGolden.length - 6, 'złoty posiłek', 'złote posiłki', 'złotych posiłków')} <ChevronDown size={14} /></>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* TRICKY MEALS SECTION (🔴) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-md shadow-amber-500/50" />
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {t("nutrition.tricky_meals", { defaultValue: "Posiłki Kapryśne / Trudne" })}
          </h3>
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1 -mt-1">
          {t("nutrition.tricky_meals_desc", { defaultValue: "Posiłki wymagające szczególnej uwagi ze względu na dużą zmienność lub tłuszcze." })}
        </p>

        {filteredTricky.length === 0 ? (
          <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
            <CheckCircle2 size={18} /> Brawo! Nie masz w historii wyznaczonego żadnego trudnego posiłku.
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-3.5" : "flex flex-col gap-2"}>
              {visibleTricky.map((meal, idx) => (
                <motion.div
                  key={meal.name + idx}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "p-4 rounded-3xl border transition-all shadow-sm flex flex-col justify-between gap-3",
                    "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:bg-slate-900/90 border-amber-500/25 dark:border-amber-400/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-black shrink-0">
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white capitalize leading-tight">
                          {meal.name}
                        </h4>
                        <span className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80">
                          Zjedzono {meal.count}× • Skoki: {meal.spikes}×
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-amber-600 dark:text-amber-400 block leading-none">
                        {meal.toleranceScore}%
                      </span>
                      <span className="text-[9px] font-bold text-amber-700/70 dark:text-amber-300/70 uppercase">
                        Tolerancja
                      </span>
                    </div>
                  </div>

                  {/* Sub-stats Bento Pills */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-amber-500/10 text-center">
                    <div className="p-2 rounded-2xl bg-white/60 dark:bg-amber-500/15 backdrop-blur-sm">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 block">Śr. Max</span>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.avgMaxBg || 185} mg</span>
                    </div>
                    <div className="p-2 rounded-2xl bg-white/60 dark:bg-amber-500/15 backdrop-blur-sm">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 block">Powrót</span>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.avgReturnTime || 120}m</span>
                    </div>
                    <div className="p-2 rounded-2xl bg-white/60 dark:bg-amber-500/15 backdrop-blur-sm">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 block">Korekty</span>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.avgCorrections || 0}×</span>
                    </div>
                    <div className="p-2 rounded-2xl bg-white/60 dark:bg-amber-500/15 backdrop-blur-sm">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 block">Spójność</span>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.consistencyIndex}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredTricky.length > 6 && (
              <button
                onClick={() => {
                  Haptics.light();
                  setShowAllTricky(!showAllTricky);
                }}
                className="w-full py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-amber-500/20 cursor-pointer"
              >
                {showAllTricky ? (
                  <>Zwiń listę <ChevronUp size={14} /></>
                ) : (
                  <>Pokaż pozostałe {getPluralForm(filteredTricky.length - 6, 'kapryśny posiłek', 'kapryśne posiłki', 'kapryśnych posiłków')} <ChevronDown size={14} /></>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
