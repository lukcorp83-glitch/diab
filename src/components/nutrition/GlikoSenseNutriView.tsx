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
  Table as TableIcon,
  Plus,
  Clock,
  Zap,
  TrendingUp,
  Filter,
  Check,
  ChevronRight,
  Info,
  Calendar
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

const formatMealDate = (timestamp?: number): string => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const days = ['ndz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
  const dayName = days[d.getDay()];
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${dayName}, ${day}.${month} ${hours}:${mins}`;
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
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
      originalName: string;
    }> = {};

    const meals = logs.filter(l => l.type === 'meal' || l.type === 'bolus');
    const glucoseLogs = logs.filter(l => l.type === 'glucose' || (l as any).bg).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const bolusLogs = logs.filter(l => l.type === 'bolus' || (l.type as string) === 'insulin');

    const cleanMealString = (raw: string): string => {
      if (!raw) return '';
      let s = raw.trim();
      s = s.replace(/^(dane z kalkulatora|kalkulator bolusa|kalkulator|bolus z posiłkiem|bolus|korekta)[:\s\-]*/i, '').trim();
      return s;
    };

    meals.forEach(m => {
      let rawName = m.notes || (m as any).note || (m as any).name || (m as any).description || m.linkedMeal?.name;
      if (!rawName && Array.isArray(m.linkedMeal?.items) && m.linkedMeal.items.length > 0) {
        rawName = m.linkedMeal.items.map((i: any) => i.name).filter(Boolean).join(", ");
      }
      if (!rawName && Array.isArray((m as any).products) && (m as any).products.length > 0) {
        rawName = (m as any).products.map((p: any) => p.name).filter(Boolean).join(", ");
      }

      const cleaned = cleanMealString(rawName || '');
      // POKAZUJEMY WYŁĄCZNIE POSIŁKI Z RZECZYWISTYMI NAZWAMI LUB SKŁADNIKAMI
      if (!cleaned || cleaned.length < 2) {
        return;
      }

      // Odrzuć całkowicie generyczne słowa typu "bolus", "kalkulator"
      if (/^(kalkulator|bolus|korekta|posiłek|meal)$/i.test(cleaned)) {
        return;
      }

      const finalName = cleaned;
      const lookupKey = finalName.trim().toLowerCase();
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
          if (trajectory.length > 0) trajectory.push(trajectory[trajectory.length - 1]);
          else trajectory.push(110);
        }
      });

      const postMealBoluses = bolusLogs.filter(b => {
        const bt = b.timestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return bt > mealTime + 30 * 60 * 1000 && bt <= mealTime + 3 * 60 * 60 * 1000;
      });

      const carbs = Number(m.linkedMeal?.carbs || (m as any).carbs || 0);
      const protein = Number(m.linkedMeal?.protein || m.protein || (m as any).protein || 0);
      const fat = Number(m.linkedMeal?.fat || m.fat || (m as any).fat || 0);

      if (!mealPatterns[lookupKey]) {
        mealPatterns[lookupKey] = { 
          spikes: 0, 
          count: 0, 
          totalCorrections: 0, 
          totalMaxBg: 0, 
          totalCarbs: 0, 
          totalProtein: 0, 
          totalFat: 0, 
          macroCount: 0, 
          glucoseTrajectories: [], 
          lastTimestamp: 0,
          originalName: finalName
        };
      }

      const p = mealPatterns[lookupKey];
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

    const nutriMeals: (NutriMealEntry & { lastTimestamp?: number })[] = Object.keys(mealPatterns).map(key => {
      const p = mealPatterns[key];
      const avgMaxBg = p.totalMaxBg / p.count;
      const avgCorrections = p.totalCorrections / p.count;
      const avgCarbs = p.macroCount > 0 ? Math.round(p.totalCarbs / p.macroCount) : undefined;
      const avgProtein = p.macroCount > 0 ? Math.round(p.totalProtein / p.macroCount) : undefined;
      const avgFat = p.macroCount > 0 ? Math.round(p.totalFat / p.macroCount) : undefined;

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
        name: p.originalName,
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

  // Wygładzony wykres z pełną szerokością i etykietą czasu, renderowany w osobnym wierszu (ZERO kolizji z nazwą)
  const renderSparklineRow = (points?: number[], isGolden: boolean = true) => {
    if (!points || points.length < 2) return null;
    const minVal = Math.min(...points, 80);
    const maxVal = Math.max(...points, 190);
    const w = 240;
    const h = 34;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * w;
      const y = h - ((val - minVal) / Math.max(1, (maxVal - minVal))) * (h - 10) - 5;
      return { x, y, val };
    });

    const pathD = `M ${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')}`;
    const fillD = `M 0,${h} L ${coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')} L ${w},${h} Z`;

    const color = isGolden ? '#10b981' : '#f59e0b';
    const gradId = `spark_${isGolden ? 'g' : 't'}_${Math.abs(points[0] + points[points.length - 1])}`;

    return (
      <div className="w-full flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
        <div className="flex flex-col text-[9.5px] font-bold text-slate-400">
          <span>Krzywa poposiłkowa</span>
          <span className="text-[8px] text-slate-500 dark:text-slate-400">0h ➔ 3h</span>
        </div>
        <div className="flex-1 max-w-[240px] px-2 flex justify-end">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8 overflow-visible max-w-[200px]">
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path d={fillD} fill={`url(#${gradId})`} />
            <path d={pathD} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle
              cx={coords[coords.length - 1].x}
              cy={coords[coords.length - 1].y}
              r="3.5"
              fill={color}
            />
          </svg>
        </div>
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

  const renderMealCard = (meal: NutriMealEntry, isGolden: boolean, idx: number) => {
    return (
      <motion.div
        key={meal.name + idx}
        whileHover={{ scale: 1.008 }}
        whileTap={{ scale: 0.992 }}
        className={cn(
          "glass-card p-4 sm:p-5 rounded-[2rem] border transition-all shadow-sm flex flex-col justify-between gap-3.5 relative overflow-hidden",
          isGolden
            ? "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white/70 dark:from-emerald-950/20 dark:via-slate-900/90 dark:to-slate-900/90 border-emerald-500/25 dark:border-emerald-400/20"
            : "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white/70 dark:from-amber-950/20 dark:via-slate-900/90 dark:to-slate-900/90 border-amber-500/25 dark:border-amber-400/20"
        )}
      >
        {/* Header: Pełna szerokość na nazwę, liczbę spożyć oraz dokładną datę */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-sm mt-0.5",
            isGolden ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
          )}>
            {isGolden ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
          </div>
          
          <div className="min-w-0 flex-1">
            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white capitalize leading-snug break-words">
              {meal.name}
            </h4>
            
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
              <span>Zjedzono {meal.count}×</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-bold">
                <Calendar size={12} className="text-slate-400" />
                {formatMealDate(meal.lastTimestamp)}
              </span>
            </div>
          </div>
        </div>

        {/* Krzywa Poposiłkowa - w dedykowanym poziomym wierszu (ZERO kolizji z nazwą) */}
        {renderSparklineRow(meal.sparkline, isGolden)}

        {/* Pasek Stabilności Glikemii */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className={cn(
              "flex items-center gap-1",
              isGolden ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
            )}>
              <Zap size={13} className="shrink-0" /> Stabilność profilu glikemii
            </span>
            <span className={cn(
              "font-black text-xs",
              isGolden ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            )}>
              {meal.toleranceScore}%
            </span>
          </div>
          <div className={cn(
            "w-full h-2 rounded-full overflow-hidden p-0.5",
            isGolden ? "bg-emerald-500/15 dark:bg-emerald-950/40" : "bg-amber-500/15 dark:bg-amber-950/40"
          )}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${meal.toleranceScore}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={cn("h-full rounded-full shadow-sm", isGolden ? "bg-emerald-500" : "bg-amber-500")}
            />
          </div>
        </div>

        {/* Przestronne Kapsułki Metryk (Elastyczne 4 kolumny z truncate) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
          <div className="px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-center min-w-0">
            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight truncate">Śr. Szczyt</span>
            <span className={cn("text-xs font-black truncate", isGolden ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>
              {meal.avgMaxBg || 140} <span className="text-[9px] font-normal text-slate-400">mg/dL</span>
            </span>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-center min-w-0">
            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight truncate">Powrót</span>
            <span className={cn("text-xs font-black truncate", isGolden ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>
              ~{meal.avgReturnTime || 90} <span className="text-[9px] font-normal text-slate-400">min</span>
            </span>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-center min-w-0">
            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight truncate">Korekty</span>
            <span className={cn("text-xs font-black truncate", isGolden ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>
              {meal.avgCorrections || 0}× <span className="text-[9px] font-normal text-slate-400">/ posiłek</span>
            </span>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 flex flex-col justify-center min-w-0">
            <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-tight truncate">Powtarzalność</span>
            <span className={cn("text-xs font-black truncate", isGolden ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>
              {meal.consistencyIndex}%
            </span>
          </div>
        </div>

        {/* Stopka: Makroskładniki + Wrzuć na Talerz */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800 gap-2 flex-wrap">
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
              className={cn(
                "px-3 py-1.5 rounded-xl text-white text-[11px] font-black tracking-tight flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ml-auto",
                isGolden ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"
              )}
            >
              <Plus size={13} strokeWidth={3} /> Wrzuć na Talerz
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  const renderTableView = (meals: NutriMealEntry[], isGolden: boolean) => {
    return (
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 shadow-sm backdrop-blur-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="py-3 px-3">Posiłek</th>
              <th className="py-3 px-3 text-center">Ostatnio</th>
              <th className="py-3 px-3 text-center">Wpisy</th>
              <th className="py-3 px-3 text-center">Śr. Szczyt</th>
              <th className="py-3 px-3 text-center">Stabilność</th>
              <th className="py-3 px-3 text-center">Powtarzalność</th>
              <th className="py-3 px-3 text-center">Makroskładniki</th>
              {onAddToPlate && <th className="py-3 px-3 text-right">Akcja</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {meals.map((meal, idx) => (
              <tr key={meal.name + idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-3 font-black text-slate-900 dark:text-white capitalize">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", isGolden ? "bg-emerald-500" : "bg-amber-500")} />
                    <span className="truncate max-w-[220px]">{meal.name}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                  {formatMealDate(meal.lastTimestamp)}
                </td>
                <td className="py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-300">
                  {meal.count}×
                </td>
                <td className="py-3 px-3 text-center font-black">
                  <span className={cn(isGolden ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                    {meal.avgMaxBg || 140} mg
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black",
                    isGolden ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  )}>
                    {meal.toleranceScore}%
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-300">
                  {meal.consistencyIndex}%
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                    {meal.avgCarbs !== undefined && <span className="text-sky-600">W:{meal.avgCarbs}</span>}
                    {meal.avgProtein !== undefined && meal.avgProtein > 0 && <span className="text-indigo-600">B:{meal.avgProtein}</span>}
                    {meal.avgFat !== undefined && meal.avgFat > 0 && <span className="text-amber-600">T:{meal.avgFat}</span>}
                  </div>
                </td>
                {onAddToPlate && (
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleAddMealToPlate(meal)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-500 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all cursor-pointer inline-flex items-center justify-center shadow-xs"
                      title="Wrzuć na Talerz"
                    >
                      <Plus size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="w-full mx-auto space-y-5">
      
      {/* GÓRNY BANNER: Kompaktowy Hero Header (Świetny na Mobile i Desktop) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "glass-card relative p-4 sm:p-5 rounded-[2.2rem] overflow-hidden border transition-all shadow-md",
          isGoodTolerance
            ? "bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-indigo-500/10 border-emerald-500/30 dark:border-emerald-400/20 bg-white/80 dark:bg-slate-900/80"
            : "bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-purple-500/10 border-amber-500/30 dark:border-amber-400/20 bg-white/80 dark:bg-slate-900/80"
        )}
      >
        <div 
          className={cn(
            "absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-35 pointer-events-none",
            isGoodTolerance ? "bg-emerald-400" : "bg-amber-400"
          )} 
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left w-full md:w-auto">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0",
              isGoodTolerance ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30" : "bg-gradient-to-br from-amber-500 to-rose-500 shadow-amber-500/30"
            )}>
              <GlikoSenseIcon size={26} isAnalyzing={true} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/40 dark:bg-white/10 backdrop-blur-md text-[9px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-0.5 border border-white/20">
                <Flame size={11} className={isGoodTolerance ? "text-emerald-500" : "text-amber-500"} />
                GlikoSense Odżywianie
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                Reakcja na Posiłki
              </h2>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                Analiza stabilności glikemii po zdefiniowanych posiłkach
              </p>
            </div>
          </div>

          {/* Radial Score + Global Stats */}
          <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/80 p-2.5 sm:p-3 rounded-2xl backdrop-blur-md border border-white/40 dark:border-slate-800 shadow-xs w-full md:w-auto justify-between md:justify-start">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
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
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {overallTolerance}%
                </span>
                <span className="text-[7px] font-black uppercase text-slate-400 mt-0.5 tracking-wider">Indeks</span>
              </div>
            </div>

            <div className="text-left pr-2">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                {isGoodTolerance ? "Wysoka Stabilność" : "Wymaga Uwagi"}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5 max-w-[140px] leading-tight">
                {isGoodTolerance ? "Większość dań bez skoków cukru" : "Wykryto opóźnione wchłanianie"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* PASEK FILTRÓW, WYSZUKIWARKI I WIDOKÓW */}
      <div className="glass-card flex items-center justify-between gap-2.5 flex-wrap bg-white/85 dark:bg-slate-900/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        {/* Wyszukiwarka */}
        <div className="flex-1 min-w-[200px] relative flex items-center">
          <Search size={14} className="absolute left-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Szukaj dania (np. owsianka, obiad)..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>

        {/* Pigułki Kategorii */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setFilterCategory('all')}
            className={cn(
              "py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer",
              filterCategory === 'all'
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Wszystkie ({allMeals.length})
          </button>
          <button
            onClick={() => setFilterCategory('golden')}
            className={cn(
              "py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer flex items-center gap-1",
              filterCategory === 'golden'
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            )}
          >
            Złote ({goldenMeals.length})
          </button>
          <button
            onClick={() => setFilterCategory('tricky')}
            className={cn(
              "py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer flex items-center gap-1",
              filterCategory === 'tricky'
                ? "bg-amber-500 text-white shadow-xs"
                : "text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            )}
          >
            Kapryśne ({trickyMeals.length})
          </button>
        </div>

        {/* Sortowanie i Przełącznik Widoków */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <ArrowUpDown size={12} className="text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={e => {
                Haptics.light();
                setSortBy(e.target.value as any);
              }}
              className="bg-transparent text-slate-900 dark:text-white text-[10px] font-bold focus:outline-none cursor-pointer"
            >
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="date_desc">📅 Najnowsze</option>
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="date_asc">📅 Najstarsze</option>
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="tolerance_desc">💚 Stabilność</option>
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="count_desc">🔥 Najczęstsze</option>
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="maxBg_desc">📈 Najwyższy szczyt</option>
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value="name_asc">🔤 Nazwa A-Z</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                Haptics.light();
                setViewMode('grid');
              }}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === 'grid'
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
              title="Karty"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => {
                Haptics.light();
                setViewMode('table');
              }}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                viewMode === 'table'
                  ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
              title="Tabela"
            >
              <TableIcon size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* SEKCJA ZŁOTYCH POSIŁKÓW (🟢) */}
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
            {t("nutrition.golden_meals_desc", { defaultValue: "Posiłki o najwyższym wskaźniku tolerancji – glikemia łagodnie wraca do normy bez skoków." })}
          </p>

          {filteredGolden.length === 0 ? (
            <div className="p-7 rounded-3xl bg-slate-100/50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 text-center text-xs font-semibold text-slate-400">
              {searchQuery ? "Brak złotych posiłków pasujących do wyszukiwania." : "Zbieram pierwsze logi posiłków z nazwami..."}
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                renderTableView(visibleGolden, true)
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {visibleGolden.map((meal, idx) => renderMealCard(meal, true, idx))}
                </div>
              )}

              {filteredGolden.length > 6 && (
                <button
                  onClick={() => {
                    Haptics.light();
                    setShowAllGolden(!showAllGolden);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-emerald-500/20 cursor-pointer"
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

      {/* SEKCJA POSIŁKÓW KAPRYŚNYCH (🔴) */}
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
            {t("nutrition.tricky_meals_desc", { defaultValue: "Posiłki wykazujące większą zmienność glikemiczną lub opóźnione wchłanianie (np. tłuszcz/białko)." })}
          </p>

          {filteredTricky.length === 0 ? (
            <div className="p-7 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
              <CheckCircle2 size={18} /> Brak trudnych posiłków w wybranym filtrze.
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                renderTableView(visibleTricky, false)
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {visibleTricky.map((meal, idx) => renderMealCard(meal, false, idx))}
                </div>
              )}

              {filteredTricky.length > 6 && (
                <button
                  onClick={() => {
                    Haptics.light();
                    setShowAllTricky(!showAllTricky);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-amber-500/20 cursor-pointer"
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

      {allMeals.length === 0 && (
        <div className="p-8 rounded-[2.5rem] bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <Utensils size={32} className="mx-auto text-slate-400" />
          <h4 className="text-base font-black text-slate-900 dark:text-white">Brak zapisanych posiłków z nazwami</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Wpisuj nazwy dań lub dodawaj składniki za pomocą Talerza. Silnik automatycznie zbada reakcję glikemiczną dla każdego z nich.
          </p>
        </div>
      )}
    </div>
  );
}
