import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Sparkles, ShieldCheck, AlertTriangle, Utensils, CheckCircle2, RefreshCw, Flame, Award, HeartHandshake, Search, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { LogEntry } from "../../types";
import { cn } from "../../lib/utils";
import { Haptics } from "../../lib/haptics";

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

  // Compute fallback profile directly from logs if worker profile isn't ready yet
  const computedProfile = React.useMemo(() => {
    if (profile && profile.allMeals && profile.allMeals.length > 0) return profile;

    const mealPatterns: Record<string, { spikes: number; count: number; totalCorrections: number; totalMaxBg: number }> = {};
    const meals = logs.filter(l => l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal?.carbs));
    const glucoseLogs = logs.filter(l => l.type === 'glucose' || l.bg).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const bolusLogs = logs.filter(l => l.type === 'bolus' || l.type === 'insulin');

    const isSpecificMealName = (name: string): boolean => {
      if (!name || typeof name !== 'string') return false;
      const clean = name.trim().toLowerCase();
      if (clean.length < 3) return false;
      const genericWords = [
        "posiłek", "posilek", "meal", "obiad", "śniadanie", "sniadanie",
        "kolacja", "przekąska", "przekaska", "breakfast", "lunch", "dinner",
        "snack", "korekta", "bolus", "jedzenie", "food", "kalkulator", "calculator"
      ];
      if (genericWords.includes(clean)) return false;
      if (/^\d+([\.,]\d+)?\s*(ww|wbt|g|j|j\.)?$/i.test(clean)) return false;
      return true;
    };

    meals.forEach(m => {
      const mealTime = m.timestamp || new Date(m.createdAt).getTime();
      let mealName = m.note || m.name || m.description || m.linkedMeal?.name;
      if (!mealName && Array.isArray(m.linkedMeal?.items) && m.linkedMeal.items.length > 0) {
        mealName = m.linkedMeal.items.map((i: any) => i.name).filter(Boolean).join(", ");
      }
      if (!mealName && Array.isArray(m.products) && m.products.length > 0) {
        mealName = m.products.map((p: any) => p.name).filter(Boolean).join(", ");
      }

      if (!mealName || !isSpecificMealName(mealName)) return;

      const postMealBg = glucoseLogs.filter(g => {
        const gt = g.timestamp || new Date(g.createdAt).getTime();
        return gt > mealTime + 30 * 60 * 1000 && gt < mealTime + 180 * 60 * 1000;
      });

      if (postMealBg.length > 0) {
        const maxBg = Math.max(...postMealBg.map(g => g.value || g.bg || 0));
        if (!mealPatterns[mealName]) {
          mealPatterns[mealName] = { spikes: 0, count: 0, totalCorrections: 0, totalMaxBg: 0 };
        }
        mealPatterns[mealName].count++;
        mealPatterns[mealName].totalMaxBg += maxBg;
        if (maxBg > 180) mealPatterns[mealName].spikes++;

        const postBoluses = bolusLogs.filter(b => {
          const bt = b.timestamp || new Date(b.createdAt).getTime();
          return bt > mealTime + 45 * 60 * 1000 && bt < mealTime + 240 * 60 * 1000;
        });
        mealPatterns[mealName].totalCorrections += postBoluses.length;
      }
    });

    const nutriMeals: NutriMealEntry[] = Object.entries(mealPatterns).map(([name, stats]) => {
      const spikes = stats.spikes;
      const count = stats.count;
      const avgMaxBg = stats.totalMaxBg ? stats.totalMaxBg / count : (spikes > 0 ? 185 : 140);
      const avgCorrections = stats.totalCorrections ? (stats.totalCorrections / count) : 0;

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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-3xl relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-emerald-500/10 border border-indigo-500/20 dark:border-indigo-400/20"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 dark:bg-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {t("nutrition.nutri_header", { defaultValue: "GlikoSense Odżywianie" })}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {t("nutrition.nutri_subheader", { defaultValue: "Osobisty Analityk Odpowiedzi Metabolicznej" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                {t("nutrition.overall_tolerance", { defaultValue: "Średnia Tolerancja Posiłków" })}
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {overallTolerance}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-emerald-500/30 shadow-sm flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
              {t("nutrition.golden_meals", { defaultValue: "Moje Złote Posiłki" })}
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {getPluralForm(goldenMeals.length, 'pozycja', 'pozycje', 'pozycji')}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-amber-500/30 shadow-sm flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
              {t("nutrition.tricky_meals", { defaultValue: "Posiłki Kapryśne" })}
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {getPluralForm(trickyMeals.length, 'pozycja', 'pozycje', 'pozycji')}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900/90 border border-sky-500/30 shadow-sm flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Utensils size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
              Przeanalizowane Dania
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {getPluralForm(allMeals.length, 'rodzaj', 'rodzaje', 'rodzajów')}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Search & Filter Bar */}
      {allMeals.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-white dark:bg-slate-900/90 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex-1 min-w-[200px] relative flex items-center">
            <Search size={16} className="absolute left-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Szukaj posiłku (np. owsianka)..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <ArrowUpDown size={14} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl border-none focus:outline-none"
            >
              <option value="tolerance">Wg tolerancji</option>
              <option value="count">Wg częstotliwości</option>
              <option value="maxBg">Wg najniższego szczytu</option>
            </select>
          </div>
        </div>
      )}

      {/* Golden Meals Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {t("nutrition.golden_meals", { defaultValue: "Moje Złote Posiłki" })}
          </h3>
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1 -mt-1">
          {t("nutrition.golden_meals_desc", { defaultValue: "Posiłki o najwyższym wskaźniku tolerancji – glikemia pozostaje w normie." })}
        </p>

        {filteredGolden.length === 0 ? (
          <div className="p-6 rounded-3xl bg-slate-100/50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs font-semibold text-slate-400">
            {searchQuery ? "Brak złotych posiłków pasujących do wyszukiwania." : t("nutrition.no_data_yet", { defaultValue: "Zbieram pierwsze logi posiłków..." })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleGolden.map((meal, idx) => (
                <motion.div
                  key={meal.name + idx}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 dark:bg-slate-900 flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-xs shrink-0">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white capitalize">
                          {meal.name}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          Zjedzono {meal.count}×
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                        {meal.toleranceScore}%
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700/70 dark:text-emerald-300/70 uppercase">
                        Tolerancja
                      </span>
                    </div>
                  </div>

                  {/* Sub-stats Grid */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-emerald-500/10 text-center">
                    <div className="p-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block">Śr. Max</span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.avgMaxBg || 140} mg</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block">Powrót</span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.avgReturnTime || 90}m</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block">Korekty</span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.avgCorrections || 0}j</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block">Spójność</span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.consistencyIndex}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredGolden.length > 6 && (
              <button
                onClick={() => {
                  Haptics.impactLight();
                  setShowAllGolden(!showAllGolden);
                }}
                className="w-full py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black transition-all flex items-center justify-center gap-1.5"
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

      {/* Tricky Meals Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 px-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {t("nutrition.tricky_meals", { defaultValue: "Posiłki Kapryśne / Trudne" })}
          </h3>
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1 -mt-1">
          {t("nutrition.tricky_meals_desc", { defaultValue: "Posiłki wymagające szczególnej uwagi ze względu na dużą zmienność lub tłuszcze." })}
        </p>

        {filteredTricky.length === 0 ? (
          <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
            <Award size={16} /> Brawo! Nie masz w historii wyznaczonego żadnego trudnego posiłku.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleTricky.map((meal, idx) => (
                <motion.div
                  key={meal.name + idx}
                  whileHover={{ scale: 1.01 }}
                  className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 dark:bg-slate-900 flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-black text-xs shrink-0">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white capitalize">
                          {meal.name}
                        </h4>
                        <span className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80">
                          Zjedzono {meal.count}× • Skoki: {meal.spikes}×
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-amber-600 dark:text-amber-400 block">
                        {meal.toleranceScore}%
                      </span>
                      <span className="text-[9px] font-bold text-amber-700/70 dark:text-amber-300/70 uppercase">
                        Tolerancja
                      </span>
                    </div>
                  </div>

                  {/* Sub-stats Grid */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-amber-500/10 text-center">
                    <div className="p-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block">Śr. Max</span>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.avgMaxBg || 185} mg</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block">Powrót</span>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.avgReturnTime || 120}m</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block">Korekty</span>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.avgCorrections || 0}j</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20">
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block">Spójność</span>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.consistencyIndex}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredTricky.length > 6 && (
              <button
                onClick={() => {
                  Haptics.impactLight();
                  setShowAllTricky(!showAllTricky);
                }}
                className="w-full py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-black transition-all flex items-center justify-center gap-1.5"
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
