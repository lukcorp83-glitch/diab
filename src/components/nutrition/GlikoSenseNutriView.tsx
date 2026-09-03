import React, { useState, useEffect, useMemo } from "react";
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
  List,
  Plus,
  Clock,
  Zap,
  TrendingUp,
  Filter
} from "lucide-react";
import { LogEntry, PlateItem } from "../../types";
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
  avgCarbs?: number;
  avgProtein?: number;
  avgFat?: number;
  sparkline?: number[];
  lastTimestamp?: number;
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
  onAddToPlate?: (item: PlateItem) => void;
}

export default function GlikoSenseNutriView({ logs, onAddToPlate }: GlikoSenseNutriViewProps) {
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
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [filterCategory, setFilterCategory] = useState<'all' | 'golden' | 'tricky'>('all');
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

  const computedProfile = useMemo(() => {
    const mealPatterns: Record<string, { 
      spikes: number; 
      count: number; 
      totalCorrections: number; 
      totalMaxBg: number; 
      totalCarbs: number;
      totalProtein: number;
      totalFat: number;
      macroCount: number;
      glucoseTrajectories: number[][];
      lastTimestamp: number;
    }> = {};

    const meals = logs.filter(l => l.type === 'meal' || (l.type === 'bolus' && (l.linkedMeal?.carbs || l.note || (l as any).description)));
    const glucoseLogs = logs.filter(l => l.type === 'glucose' || l.bg).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const bolusLogs = logs.filter(l => l.type === 'bolus' || l.type === 'insulin');

    const isSpecificMealName = (name: string): boolean => {
      if (!name) return false;
      const clean = name.trim().toLowerCase();
      const genericNames = [
        'kalkulator', 'bolus', 'korekta', 'dane z kalkulatora', 'kalkulator bolusa'
      ];
      if (genericNames.includes(clean)) return false;
      if (/^kalkulator/i.test(clean)) return false;
      return clean.length >= 2;
    };

    meals.forEach(m => {
      let rawName = m.note || m.name || (m as any).description || m.linkedMeal?.name;
      if (!rawName && Array.isArray(m.linkedMeal?.items) && m.linkedMeal.items.length > 0) {
        rawName = m.linkedMeal.items.map((i: any) => i.name).filter(Boolean).join(", ");
      }
      if (!rawName && Array.isArray((m as any).products) && (m as any).products.length > 0) {
        rawName = (m as any).products.map((p: any) => p.name).filter(Boolean).join(", ");
      }

      if (!rawName || !isSpecificMealName(rawName)) return;

      const name = rawName.trim().toLowerCase();
      const mealTime = m.timestamp || (m.createdAt ? new Date(m.createdAt).getTime() : 0);
      if (!mealTime) return;

      const postMealGlucose = glucoseLogs.filter(g => {
        const gt = g.timestamp || (g.createdAt ? new Date(g.createdAt).getTime() : 0);
        return gt >= mealTime - 10 * 60 * 1000 && gt <= mealTime + 3.5 * 60 * 60 * 1000;
      });

      let maxBg = 0;
      let hasSpike = false;
      postMealGlucose.forEach(g => {
        const val = g.value || g.bg || 0;
        if (val > maxBg) maxBg = val;
        if (val > 180) hasSpike = true;
      });

      // Zbuduj trajektorię glikemii (0h, 30m, 60m, 90m, 120m, 180m)
      const sampleOffsets = [0, 30, 60, 90, 120, 180];
      const trajectory: number[] = [];
      sampleOffsets.forEach(offsetMin => {
        const targetT = mealTime + offsetMin * 60 * 1000;
        const closestG = postMealGlucose.reduce<LogEntry | null>((closest, curr) => {
          const currT = curr.timestamp || 0;
          if (!closest) return curr;
          const closestT = closest.timestamp || 0;
          return Math.abs(currT - targetT) < Math.abs(closestT - targetT) ? curr : closest;
        }, null);

        if (closestG && Math.abs((closestG.timestamp || 0) - targetT) <= 25 * 60 * 1000) {
          trajectory.push(closestG.value || closestG.bg || 120);
        } else {
          // Default fallbacks
          if (trajectory.length > 0) trajectory.push(trajectory[trajectory.length - 1]);
          else trajectory.push(110);
        }
      });

      const postMealBoluses = bolusLogs.filter(b => {
        const bt = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return bt > mealTime + 30 * 60 * 1000 && bt <= mealTime + 3 * 60 * 60 * 1000;
      });

      const carbs = Number(m.linkedMeal?.carbs || m.carbs || (m as any).carbs || 0);
      const protein = Number(m.linkedMeal?.protein || m.protein || (m as any).protein || 0);
      const fat = Number(m.linkedMeal?.fat || m.fat || (m as any).fat || 0);

      if (!mealPatterns[name]) {
        mealPatterns[name] = { 
          spikes: 0, 
          count: 0, 
          totalCorrections: 0, 
          totalMaxBg: 0, 
          totalCarbs: 0,
          totalProtein: 0,
          totalFat: 0,
          macroCount: 0,
          glucoseTrajectories: [],
          lastTimestamp: 0 
        };
      }

      const p = mealPatterns[name];
      p.count += 1;
      p.totalMaxBg += (maxBg > 0 ? maxBg : 130);
      p.totalCorrections += postMealBoluses.length;
      if (hasSpike) p.spikes += 1;
      if (carbs > 0 || protein > 0 || fat > 0) {
        p.totalCarbs += carbs;
        p.totalProtein += protein;
        p.totalFat += fat;
        p.macroCount += 1;
      }
      p.glucoseTrajectories.push(trajectory);
      if (mealTime > p.lastTimestamp) {
        p.lastTimestamp = mealTime;
      }
    });

    const nutriMeals: (NutriMealEntry & { lastTimestamp?: number })[] = Object.keys(mealPatterns).map(name => {
      const p = mealPatterns[name];
      const avgMaxBg = p.totalMaxBg / p.count;
      const avgCorrections = p.totalCorrections / p.count;
      const avgCarbs = p.macroCount > 0 ? Math.round(p.totalCarbs / p.macroCount) : undefined;
      const avgProtein = p.macroCount > 0 ? Math.round(p.totalProtein / p.macroCount) : undefined;
      const avgFat = p.macroCount > 0 ? Math.round(p.totalFat / p.macroCount) : undefined;

      // Średnia krzywa glikemii po daniu
      const avgTrajectory: number[] = [0, 1, 2, 3, 4, 5].map(idx => {
        const sum = p.glucoseTrajectories.reduce((acc, curr) => acc + (curr[idx] || 120), 0);
        return Math.round(sum / Math.max(1, p.glucoseTrajectories.length));
      });

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
      if (p.count === 1) {
        if (p.spikes === 0 && avgMaxBg <= 150) consistencyIndex = 92;
        else if (p.spikes === 0) consistencyIndex = 80;
        else consistencyIndex = 65;
      } else {
        const successRatio = (p.count - p.spikes) / p.count;
        if (p.spikes === 0) consistencyIndex = Math.min(98, 90 + Math.min(8, p.count * 2));
        else if (p.spikes === p.count) consistencyIndex = 85;
        else {
          const variance = Math.abs(successRatio - 0.5);
          consistencyIndex = Math.round(50 + (variance * 70));
        }
      }

      return {
        name,
        count: p.count,
        spikes: p.spikes,
        avgMaxBg: Math.round(avgMaxBg),
        toleranceScore,
        consistencyIndex,
        category,
        avgCorrections: Math.round(avgCorrections * 10) / 10,
        avgReturnTime: 120,
        avgCarbs,
        avgProtein,
        avgFat,
        sparkline: avgTrajectory,
        lastTimestamp: p.lastTimestamp
      };
    });

    const goldenMeals = nutriMeals.filter(m => m.category === 'golden').sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
    const trickyMeals = nutriMeals.filter(m => m.category === 'tricky').sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
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

  const avgOverallMaxBg = useMemo(() => {
    if (allMeals.length === 0) return 135;
    return Math.round(allMeals.reduce((acc, m) => acc + (m.avgMaxBg || 135), 0) / allMeals.length);
  }, [allMeals]);

  const filterAndSort = (mealsList: (NutriMealEntry & { lastTimestamp?: number })[]) => {
    let result = [...mealsList];

    if (filterCategory === 'golden') {
      result = result.filter(m => m.category === 'golden');
    } else if (filterCategory === 'tricky') {
      result = result.filter(m => m.category === 'tricky');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(m => m.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return (b.lastTimestamp || 0) - (a.lastTimestamp || 0);
      if (sortBy === 'date_asc') return (a.lastTimestamp || 0) - (b.lastTimestamp || 0);
      if (sortBy === 'tolerance_desc') return b.toleranceScore - a.toleranceScore;
      if (sortBy === 'tolerance_asc') return a.toleranceScore - b.toleranceScore;
      if (sortBy === 'count_desc') return b.count - a.count;
      if (sortBy === 'count_asc') return a.count - b.count;
      if (sortBy === 'maxBg_desc') return (b.avgMaxBg || 0) - (a.avgMaxBg || 0);
      if (sortBy === 'maxBg_asc') return (a.avgMaxBg || 0) - (b.avgMaxBg || 0);
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'pl');
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name, 'pl');
      return (b.lastTimestamp || 0) - (a.lastTimestamp || 0);
    });

    return result;
  };

  const filteredGolden = filterAndSort(goldenMeals);
  const visibleGolden = (showAllGolden || searchQuery.trim() !== '' || filterCategory !== 'all') ? filteredGolden : filteredGolden.slice(0, 6);

  const filteredTricky = filterAndSort(trickyMeals);
  const visibleTricky = (showAllTricky || searchQuery.trim() !== '' || filterCategory !== 'all') ? filteredTricky : filteredTricky.slice(0, 6);

  const isGoodTolerance = overallTolerance >= 75;

  // Funkcja generująca wygładzony wykres SVG Sparkline krzywej poposiłkowej
  const renderSparkline = (points?: number[], isGolden: boolean = true) => {
    if (!points || points.length < 2) return null;
    const minVal = Math.min(...points, 80);
    const maxVal = Math.max(...points, 190);
    const w = 110;
    const h = 32;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * w;
      const y = h - ((val - minVal) / Math.max(1, (maxVal - minVal))) * (h - 8) - 4;
      return { x, y, val };
    });

    const pathD = `M ${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')}`;
    const fillD = `M 0,${h} L ${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')} L ${w},${h} Z`;

    const color = isGolden ? '#10b981' : '#f59e0b';
    const gradId = `spark_${isGolden ? 'g' : 't'}_${Math.abs(points[0] + points[points.length - 1])}`;

    return (
      <div className="flex flex-col items-end shrink-0">
        <svg width={w} height={h} className="overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={fillD} fill={`url(#${gradId})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {/* Ostatni punkt z kropką */}
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r="3.5"
            fill={color}
            className="animate-pulse"
          />
        </svg>
        <span className="text-[8px] font-bold text-slate-400 mt-0.5">0h ➔ 3h</span>
      </div>
    );
  };

  const handleAddMealToPlate = (meal: NutriMealEntry) => {
    if (!onAddToPlate) return;
    Haptics.impact();
    const item: PlateItem = {
      id: 'meal_' + Date.now(),
      name: meal.name.charAt(0).toUpperCase() + meal.name.slice(1),
      weight: 100,
      carbs: meal.avgCarbs || 30,
      protein: meal.avgProtein || 0,
      fat: meal.avgFat || 0,
      gi: meal.category === 'golden' ? 45 : 70,
      category: 'Inne',
      plateItemId: 'item_' + Date.now()
    };
    onAddToPlate(item);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5 sm:space-y-6">
      
      {/* HERO BENTO HEADER - Glassmorphism Aurora Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "glass-card relative p-5 sm:p-7 rounded-[2.5rem] overflow-hidden border transition-all shadow-xl",
          isGoodTolerance
            ? "bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-indigo-500/10 border-emerald-500/30 dark:border-emerald-400/20 bg-white/80 dark:bg-slate-900/80"
            : "bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-purple-500/10 border-amber-500/30 dark:border-amber-400/20 bg-white/80 dark:bg-slate-900/80"
        )}
      >
        {/* Glow Aurora Background Circle */}
        <div 
          className={cn(
            "absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-35 pointer-events-none",
            isGoodTolerance ? "bg-emerald-400" : "bg-amber-400"
          )} 
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className={cn(
              "w-13 h-13 sm:w-15 sm:h-15 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0",
              isGoodTolerance ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30" : "bg-gradient-to-br from-amber-500 to-rose-500 shadow-amber-500/30"
            )}>
              <GlikoSenseIcon size={28} isAnalyzing={true} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/30 dark:bg-white/10 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1 border border-white/20">
                <Flame size={12} className={isGoodTolerance ? "text-emerald-500" : "text-amber-500"} />
                GlikoSense Odżywianie
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                Reakcja na Posiłki
              </h2>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                Inteligentna analiza wpływu dań na stabilność poziomu cukru
              </p>
            </div>
          </div>

          {/* Aurora Ring Score Gauge */}
          <div className="flex items-center gap-4 bg-white/60 dark:bg-slate-900/80 p-3.5 sm:p-4 rounded-3xl backdrop-blur-md border border-white/40 dark:border-slate-800 shrink-0 shadow-sm">
            <div className="relative w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center">
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
                <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {overallTolerance}%
                </span>
                <span className="text-[7.5px] font-black uppercase text-slate-400 mt-0.5 tracking-wider">Indeks</span>
              </div>
            </div>

            <div className="text-left">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                {isGoodTolerance ? "Wysoka Stabilność" : "Wymaga Uwagi"}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5 max-w-[130px] leading-tight">
                {isGoodTolerance ? "Większość dań bez gwałtownych skoków" : "Zwracaj uwagę na opóźnione wchłanianie"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* BENTO GRID 4-KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Bento Tile 1: Złote Posiłki */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => setFilterCategory(filterCategory === 'golden' ? 'all' : 'golden')}
          className={cn(
            "glass-card p-4 sm:p-5 rounded-[2rem] border transition-all shadow-sm flex flex-col justify-between gap-2.5 cursor-pointer select-none",
            filterCategory === 'golden'
              ? "bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/40"
              : "bg-emerald-500/10 dark:bg-slate-900/90 border-emerald-500/30 hover:bg-emerald-500/15"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
              <ShieldCheck size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
              Bezpieczne
            </span>
          </div>

          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block leading-none">
              {goldenMeals.length}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mt-1">
              {t("nutrition.golden_meals", { defaultValue: "Moje Złote Posiłki" })}
            </span>
          </div>
        </motion.div>

        {/* Bento Tile 2: Posiłki Kapryśne */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setFilterCategory(filterCategory === 'tricky' ? 'all' : 'tricky')}
          className={cn(
            "glass-card p-4 sm:p-5 rounded-[2rem] border transition-all shadow-sm flex flex-col justify-between gap-2.5 cursor-pointer select-none",
            filterCategory === 'tricky'
              ? "bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/40"
              : "bg-amber-500/10 dark:bg-slate-900/90 border-amber-500/30 hover:bg-amber-500/15"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
              <AlertTriangle size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
              Wymagające
            </span>
          </div>

          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block leading-none">
              {trickyMeals.length}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mt-1">
              {t("nutrition.tricky_meals", { defaultValue: "Posiłki Kapryśne" })}
            </span>
          </div>
        </motion.div>

        {/* Bento Tile 3: Przeanalizowane Dania */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => setFilterCategory('all')}
          className="glass-card p-4 sm:p-5 rounded-[2rem] bg-white/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
              <Utensils size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
              Baza AI
            </span>
          </div>

          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block leading-none">
              {allMeals.length}
            </span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mt-1">
              Zarejestrowane Dania
            </span>
          </div>
        </motion.div>

        {/* Bento Tile 4: Średni Szczyt Glikemii */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 sm:p-5 rounded-[2rem] bg-white/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold">
              <Activity size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
              Śr. Szczyt
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-none">
                {avgOverallMaxBg}
              </span>
              <span className="text-xs font-bold text-slate-400">mg/dL</span>
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mt-1">
              Średni Szczyt Posiłkowy
            </span>
          </div>
        </motion.div>
      </div>

      {/* FLOATING CONTROL BAR (Search + Filters + Sort + View Switcher) */}
      {allMeals.length > 0 && (
        <div className="glass-card flex items-center justify-between gap-2.5 sm:gap-3 flex-wrap bg-white/85 dark:bg-slate-900/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
          {/* Search Box */}
          <div className="flex-1 min-w-[180px] relative flex items-center">
            <Search size={15} className="absolute left-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Szukaj posiłku (np. owsianka, pizza)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sort Selection */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={e => {
                  Haptics.light();
                  setSortBy(e.target.value as any);
                }}
                className="bg-transparent text-slate-900 dark:text-white text-[11px] font-bold focus:outline-none cursor-pointer"
              >
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" value="date_desc">📅 Wg daty (Najnowsze)</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" value="date_asc">📅 Wg daty (Najstarsze)</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" value="tolerance_desc">💚 Wg tolerancji (Najwyższa)</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" value="tolerance_asc">⚠️ Wg tolerancji (Najniższa)</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" value="count_desc">🔥 Wg częstotliwości (Najczęstsze)</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" value="count_asc">🧊 Wg częstotliwości (Najrzadsze)</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" value="maxBg_desc">📈 Wg szczytu cukru (Najwyższy)</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" value="maxBg_asc">📉 Wg szczytu cukru (Najniższy)</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" value="name_asc">🔤 Wg nazwy (A-Z)</option>
                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold" value="name_desc">🔤 Wg nazwy (Z-A)</option>
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
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
                title="Karty Bento"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => {
                  Haptics.light();
                  setViewMode('list');
                }}
                className={cn(
                  "p-1.5 rounded-lg text-xs font-bold transition-all",
                  viewMode === 'list'
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
                title="Kompaktowa Lista"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOLDEN MEALS SECTION (🟢) */}
      {(filterCategory === 'all' || filterCategory === 'golden') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {t("nutrition.golden_meals", { defaultValue: "Moje Złote Posiłki" })}
              </h3>
            </div>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {filteredGolden.length} dań
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1 -mt-1">
            {t("nutrition.golden_meals_desc", { defaultValue: "Posiłki o najwyższym wskaźniku tolerancji – glikemia łagodnie wraca do normy." })}
          </p>

          {filteredGolden.length === 0 ? (
            <div className="p-7 rounded-3xl bg-slate-100/50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs font-semibold text-slate-400">
              {searchQuery ? "Brak złotych posiłków pasujących do wyszukiwania." : t("nutrition.no_data_yet", { defaultValue: "Zbieram pierwsze logi posiłków..." })}
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-3.5" : "flex flex-col gap-2.5"}>
                {visibleGolden.map((meal, idx) => (
                  <motion.div
                    key={meal.name + idx}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      "glass-card p-4 sm:p-5 rounded-[2rem] border transition-all shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden",
                      "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:bg-slate-900/90 border-emerald-500/25 dark:border-emerald-400/20"
                    )}
                  >
                    {/* Header: Name + Score Ring + Sparkline */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black shrink-0 mt-0.5">
                          <CheckCircle2 size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white capitalize leading-tight truncate">
                            {meal.name}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
                            Zjedzono {meal.count}× • Bez skoków cukru
                          </span>
                        </div>
                      </div>

                      {/* Sparkline Curve */}
                      {renderSparkline(meal.sparkline, true)}
                    </div>

                    {/* Progress Bar & Tolerance */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-black">
                        <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Zap size={13} /> Wskaźnik stabilności glikemii
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-black">
                          {meal.toleranceScore}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-emerald-500/15 dark:bg-emerald-950/40 rounded-full overflow-hidden p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${meal.toleranceScore}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-emerald-500 rounded-full shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Sub-stats Bento Pills */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                      <div className="p-2 rounded-2xl bg-white/70 dark:bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/10">
                        <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Śr. Max</span>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.avgMaxBg || 140} mg</span>
                      </div>
                      <div className="p-2 rounded-2xl bg-white/70 dark:bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/10">
                        <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Powrót</span>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.avgReturnTime || 90}m</span>
                      </div>
                      <div className="p-2 rounded-2xl bg-white/70 dark:bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/10">
                        <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Korekty</span>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.avgCorrections || 0}×</span>
                      </div>
                      <div className="p-2 rounded-2xl bg-white/70 dark:bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/10">
                        <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Spójność</span>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{meal.consistencyIndex}%</span>
                      </div>
                    </div>

                    {/* Footer: Macros + 1-Click Add to Plate */}
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-500/10 gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                        {meal.avgCarbs !== undefined && (
                          <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            W: {meal.avgCarbs}g
                          </span>
                        )}
                        {meal.avgProtein !== undefined && meal.avgProtein > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            B: {meal.avgProtein}g
                          </span>
                        )}
                        {meal.avgFat !== undefined && meal.avgFat > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            T: {meal.avgFat}g
                          </span>
                        )}
                      </div>

                      {onAddToPlate && (
                        <button
                          onClick={() => handleAddMealToPlate(meal)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black tracking-tight flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                        >
                          <Plus size={13} strokeWidth={3} /> Wrzuć na Talerz
                        </button>
                      )}
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
      )}

      {/* TRICKY MEALS SECTION (🔴) */}
      {(filterCategory === 'all' || filterCategory === 'tricky') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-md shadow-amber-500/50" />
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {t("nutrition.tricky_meals", { defaultValue: "Posiłki Kapryśne / Trudne" })}
              </h3>
            </div>
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              {filteredTricky.length} dań
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1 -mt-1">
            {t("nutrition.tricky_meals_desc", { defaultValue: "Posiłki wymagające szczególnej uwagi ze względu na opóźnione wchłanianie (WBT/tłuszcz)." })}
          </p>

          {filteredTricky.length === 0 ? (
            <div className="p-7 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
              <CheckCircle2 size={18} /> Brawo! Nie masz w historii wyznaczonego żadnego trudnego posiłku.
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-3.5" : "flex flex-col gap-2.5"}>
                {visibleTricky.map((meal, idx) => (
                  <motion.div
                    key={meal.name + idx}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      "glass-card p-4 sm:p-5 rounded-[2rem] border transition-all shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden",
                      "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:bg-slate-900/90 border-amber-500/25 dark:border-amber-400/20"
                    )}
                  >
                    {/* Header: Name + Warning + Sparkline */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-black shrink-0 mt-0.5">
                          <AlertTriangle size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white capitalize leading-tight truncate">
                            {meal.name}
                          </h4>
                          <span className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80 block mt-0.5">
                            Zjedzono {meal.count}× • Skoki: {meal.spikes}×
                          </span>
                        </div>
                      </div>

                      {/* Sparkline Curve */}
                      {renderSparkline(meal.sparkline, false)}
                    </div>

                    {/* Progress Bar & Tolerance */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-black">
                        <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <Zap size={13} /> Wskaźnik stabilności glikemii
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 font-black">
                          {meal.toleranceScore}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-amber-500/15 dark:bg-amber-950/40 rounded-full overflow-hidden p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${meal.toleranceScore}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-amber-500 rounded-full shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Sub-stats Bento Pills */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                      <div className="p-2 rounded-2xl bg-white/70 dark:bg-amber-500/10 backdrop-blur-sm border border-amber-500/10">
                        <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Śr. Max</span>
                        <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.avgMaxBg || 185} mg</span>
                      </div>
                      <div className="p-2 rounded-2xl bg-white/70 dark:bg-amber-500/10 backdrop-blur-sm border border-amber-500/10">
                        <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Powrót</span>
                        <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.avgReturnTime || 120}m</span>
                      </div>
                      <div className="p-2 rounded-2xl bg-white/70 dark:bg-amber-500/10 backdrop-blur-sm border border-amber-500/10">
                        <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Korekty</span>
                        <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.avgCorrections || 0}×</span>
                      </div>
                      <div className="p-2 rounded-2xl bg-white/70 dark:bg-amber-500/10 backdrop-blur-sm border border-amber-500/10">
                        <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Spójność</span>
                        <span className="text-xs font-black text-amber-700 dark:text-amber-300">{meal.consistencyIndex}%</span>
                      </div>
                    </div>

                    {/* Footer: Macros + 1-Click Add to Plate */}
                    <div className="flex items-center justify-between pt-1 border-t border-amber-500/10 gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                        {meal.avgCarbs !== undefined && (
                          <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            W: {meal.avgCarbs}g
                          </span>
                        )}
                        {meal.avgProtein !== undefined && meal.avgProtein > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            B: {meal.avgProtein}g
                          </span>
                        )}
                        {meal.avgFat !== undefined && meal.avgFat > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            T: {meal.avgFat}g
                          </span>
                        )}
                      </div>

                      {onAddToPlate && (
                        <button
                          onClick={() => handleAddMealToPlate(meal)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black tracking-tight flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                        >
                          <Plus size={13} strokeWidth={3} /> Wrzuć na Talerz
                        </button>
                      )}
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
      )}
    </div>
  );
}
