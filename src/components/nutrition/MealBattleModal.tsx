import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Swords, 
  ArrowRightLeft, 
  Trophy, 
  TrendingUp, 
  Clock, 
  Flame, 
  ShieldCheck, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Utensils
} from 'lucide-react';
import { NutriMealEntry } from './GlikoSenseNutriView';
import { PlateItem } from '../../types';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';

export interface MealBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableMeals: NutriMealEntry[];
  initialMealA?: NutriMealEntry | null;
  onAddToPlate?: (item: PlateItem) => void;
}

// Wzorce kulinarne dla porównań
const FALLBACK_TEMPLATES: NutriMealEntry[] = [
  {
    name: 'Owsianka z bananem i miodem',
    count: 3,
    spikes: 2,
    avgMaxBg: 172,
    toleranceScore: 68,
    consistencyIndex: 78,
    category: 'tricky',
    avgCorrections: 0.7,
    avgReturnTime: 140,
    avgCarbs: 62,
    avgProtein: 9,
    avgFat: 5,
    sparkline: [105, 138, 172, 160, 135, 115]
  },
  {
    name: 'Jajecznica z awokado i chlebem żytnim',
    count: 4,
    spikes: 0,
    avgMaxBg: 134,
    toleranceScore: 94,
    consistencyIndex: 92,
    category: 'golden',
    avgCorrections: 0.1,
    avgReturnTime: 95,
    avgCarbs: 28,
    avgProtein: 22,
    avgFat: 24,
    sparkline: [108, 120, 134, 128, 118, 110]
  },
  {
    name: 'Makaron z sosem pomidorowym',
    count: 2,
    spikes: 1,
    avgMaxBg: 184,
    toleranceScore: 62,
    consistencyIndex: 70,
    category: 'tricky',
    avgCorrections: 0.9,
    avgReturnTime: 160,
    avgCarbs: 75,
    avgProtein: 11,
    avgFat: 6,
    sparkline: [110, 145, 184, 165, 140, 118]
  },
  {
    name: 'Łosoś z warzywami i kaszą gryczaną',
    count: 3,
    spikes: 0,
    avgMaxBg: 130,
    toleranceScore: 96,
    consistencyIndex: 94,
    category: 'golden',
    avgCorrections: 0.0,
    avgReturnTime: 90,
    avgCarbs: 35,
    avgProtein: 32,
    avgFat: 18,
    sparkline: [106, 118, 130, 124, 115, 108]
  }
];

export default function MealBattleModal({
  isOpen,
  onClose,
  availableMeals,
  initialMealA,
  onAddToPlate
}: MealBattleModalProps) {
  const { t } = useTranslation();

  // Pełna baza posiłków użytkownika + szablony
  const allPool = useMemo(() => {
    const list = [...availableMeals];
    FALLBACK_TEMPLATES.forEach(tpl => {
      if (!list.some(m => m.name.toLowerCase() === tpl.name.toLowerCase())) {
        list.push(tpl);
      }
    });
    return list;
  }, [availableMeals]);

  const [selectedMealAName, setSelectedMealAName] = useState<string>(() => {
    if (initialMealA) return initialMealA.name;
    return allPool[0]?.name || FALLBACK_TEMPLATES[0].name;
  });

  const [selectedMealBName, setSelectedMealBName] = useState<string>(() => {
    if (initialMealA && allPool.length > 1) {
      const other = allPool.find(m => m.name !== initialMealA.name);
      if (other) return other.name;
    }
    return allPool[1]?.name || FALLBACK_TEMPLATES[1].name;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'golden' | 'tricky'>('all');
  const [isPickerExpanded, setIsPickerExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const mealA = useMemo(() => {
    return allPool.find(m => m.name === selectedMealAName) || allPool[0] || FALLBACK_TEMPLATES[0];
  }, [allPool, selectedMealAName]);

  const mealB = useMemo(() => {
    return allPool.find(m => m.name === selectedMealBName) || allPool[1] || FALLBACK_TEMPLATES[1];
  }, [allPool, selectedMealBName]);

  const handleSwap = () => {
    Haptics.selection();
    const temp = selectedMealAName;
    setSelectedMealAName(selectedMealBName);
    setSelectedMealBName(temp);
  };

  const handleSelectForA = (meal: NutriMealEntry) => {
    Haptics.selection();
    setSelectedMealAName(meal.name);
    if (meal.name === selectedMealBName) {
      // Jeśli wybrano to samo dla B, przestaw B na inny posiłek
      const other = allPool.find(m => m.name !== meal.name);
      if (other) setSelectedMealBName(other.name);
    }
  };

  const handleSelectForB = (meal: NutriMealEntry) => {
    Haptics.selection();
    setSelectedMealBName(meal.name);
    if (meal.name === selectedMealAName) {
      // Jeśli wybrano to samo dla A, przestaw A na inny posiłek
      const other = allPool.find(m => m.name !== meal.name);
      if (other) setSelectedMealAName(other.name);
    }
  };

  // Filtrowanie bazy dań w selektorze wizualnym
  const filteredMeals = useMemo(() => {
    return allPool.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;
      if (filterType === 'golden') return m.category === 'golden';
      if (filterType === 'tricky') return m.category === 'tricky';
      return true;
    });
  }, [allPool, searchQuery, filterType]);

  // Trajektorie 6-punktowe (0, 30m, 60m, 90m, 120m, 180m)
  const trajectoryA = useMemo(() => {
    if (mealA.sparkline && mealA.sparkline.length >= 6) return mealA.sparkline.slice(0, 6);
    return [110, 135, mealA.avgMaxBg || 160, Math.round((mealA.avgMaxBg || 160) * 0.9), 130, 115];
  }, [mealA]);

  const trajectoryB = useMemo(() => {
    if (mealB.sparkline && mealB.sparkline.length >= 6) return mealB.sparkline.slice(0, 6);
    return [110, 130, mealB.avgMaxBg || 140, Math.round((mealB.avgMaxBg || 140) * 0.9), 125, 112];
  }, [mealB]);

  const peakA = Math.max(...trajectoryA);
  const peakB = Math.max(...trajectoryB);
  const peakIndexA = trajectoryA.indexOf(peakA);
  const peakIndexB = trajectoryB.indexOf(peakB);
  const timeLabels = ['0m', '30m', '60m', '90m', '120m', '180m'];
  const peakTimeA = timeLabels[peakIndexA] || '60m';
  const peakTimeB = timeLabels[peakIndexB] || '60m';

  // Wyłonienie zwycięzcy stabilności
  const winner = useMemo<'A' | 'B' | 'TIE'>(() => {
    if (mealA.toleranceScore > mealB.toleranceScore + 4) return 'A';
    if (mealB.toleranceScore > mealA.toleranceScore + 4) return 'B';
    if (peakA < peakB - 8) return 'A';
    if (peakB < peakA - 8) return 'B';
    return 'TIE';
  }, [mealA, mealB, peakA, peakB]);

  const winnerMeal = winner === 'A' ? mealA : winner === 'B' ? mealB : null;

  // Koordynaty wykresu SVG
  const chartHeight = 160;
  const chartWidth = 320;
  const paddingX = 24;
  const paddingY = 22;

  const minVal = Math.min(65, Math.min(...trajectoryA, ...trajectoryB) - 5);
  const maxVal = Math.max(200, Math.max(...trajectoryA, ...trajectoryB) + 15);

  const getY = (val: number) => {
    const ratio = (val - minVal) / Math.max(1, maxVal - minVal);
    return chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
  };

  const getX = (index: number) => {
    return paddingX + (index / 5) * (chartWidth - paddingX * 2);
  };

  const pointsA = trajectoryA.map((v, i) => ({ x: getX(i), y: getY(v), val: v }));
  const pointsB = trajectoryB.map((v, i) => ({ x: getX(i), y: getY(v), val: v }));

  const pathA = pointsA.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const pathB = pointsB.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const tirTopY = getY(180);
  const tirBottomY = getY(70);

  const handleAddWinnerToPlate = () => {
    if (!onAddToPlate || !winnerMeal) return;
    Haptics.impact();
    const item: PlateItem = {
      id: 'meal_' + Date.now(),
      name: winnerMeal.name.charAt(0).toUpperCase() + winnerMeal.name.slice(1),
      weight: 100,
      carbs: winnerMeal.avgCarbs || 30,
      protein: winnerMeal.avgProtein || 0,
      fat: winnerMeal.avgFat || 0,
      gi: winnerMeal.category === 'golden' ? 45 : 70,
      category: 'Inne',
      plateItemId: 'item_' + Date.now()
    };
    onAddToPlate(item);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-md">
        {/* Tło klikalne do zamknięcia */}
        <div className="absolute inset-0 -z-10" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col h-[90vh] max-h-[92dvh] sm:h-auto sm:max-h-[88vh] overflow-hidden select-none"
        >
          {/* Uchwyt do przeciągania na telefonach */}
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

          {/* Nagłówek Modalu */}
          <div className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
                <Swords size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  Pojedynek Posiłków (A vs B)
                </h3>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Porównaj reakcję i dynamikę wchłaniania dwóch dań
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Główna zawartość przewijana */}
          <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto overscroll-contain space-y-4 pb-8 sm:pb-6">
            
            {/* 1. DWA KAFELKI ZAWODNIKÓW (AKTYWNE DANIE A i DANIE B) */}
            <div className="grid grid-cols-2 gap-2.5 relative">
              
              {/* KAFEL DANIE A */}
              <div className="p-3.5 rounded-3xl bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-white/80 dark:from-violet-950/30 dark:via-slate-900 dark:to-slate-900 border-2 border-violet-500/40 shadow-sm flex flex-col justify-between gap-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-violet-600 text-white text-[9.5px] font-black uppercase tracking-wider shadow-xs">
                    Danie A
                  </span>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full",
                    mealA.category === 'golden' ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  )}>
                    {mealA.toleranceScore}%
                  </span>
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate" title={mealA.name}>
                    {mealA.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {mealA.avgCarbs !== undefined && <span className="text-sky-600 dark:text-sky-400">W: {mealA.avgCarbs}g</span>}
                    {mealA.avgProtein !== undefined && <span>B: {mealA.avgProtein}g</span>}
                    {mealA.avgFat !== undefined && <span>T: {mealA.avgFat}g</span>}
                  </div>
                </div>
              </div>

              {/* PRZYCISK ZAMIANY (SWAP) NA ŚRODKU */}
              <button
                type="button"
                onClick={handleSwap}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:scale-110 active:scale-95 transition-all z-10 cursor-pointer"
                title="Zamień miejscami"
              >
                <ArrowRightLeft size={13} />
              </button>

              {/* KAFEL DANIE B */}
              <div className="p-3.5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white/80 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border-2 border-emerald-500/40 shadow-sm flex flex-col justify-between gap-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9.5px] font-black uppercase tracking-wider shadow-xs">
                    Danie B
                  </span>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full",
                    mealB.category === 'golden' ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  )}>
                    {mealB.toleranceScore}%
                  </span>
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate" title={mealB.name}>
                    {mealB.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {mealB.avgCarbs !== undefined && <span className="text-sky-600 dark:text-sky-400">W: {mealB.avgCarbs}g</span>}
                    {mealB.avgProtein !== undefined && <span>B: {mealB.avgProtein}g</span>}
                    {mealB.avgFat !== undefined && <span>T: {mealB.avgFat}g</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SZYBKI ROZWIJANY SELEKTOR WIZUALNY POSIŁKÓW (BEZ ŻADNYCH BRZYDKICH SELECTÓW!) */}
            <div className="p-3.5 rounded-3xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils size={14} className="text-slate-400" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Zmień dania w pojedynku ({filteredMeals.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPickerExpanded(!isPickerExpanded)}
                  className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {isPickerExpanded ? 'Zwiń listę' : 'Rozwiń listę dań'}
                  {isPickerExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {/* Pasek wyszukiwania i filtrów */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Wpisz nazwę posiłku..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-colors cursor-pointer",
                      filterType === 'all' ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black" : "bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    Wszystkie
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('golden')}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-colors cursor-pointer",
                      filterType === 'golden' ? "bg-emerald-600 text-white font-black" : "bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    Złote
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('tricky')}
                    className={cn(
                      "px-2 py-1 rounded-lg transition-colors cursor-pointer",
                      filterType === 'tricky' ? "bg-amber-600 text-white font-black" : "bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    Kapryśne
                  </button>
                </div>
              </div>

              {/* Przewijana lista pięknych kafelków posiłków z 1-Click przyciskami [Dla A] i [Dla B] */}
              <div className={cn(
                "space-y-1.5 overflow-y-auto pr-1 transition-all",
                isPickerExpanded ? "max-h-[220px]" : "max-h-[120px]"
              )}>
                {filteredMeals.map((m) => {
                  const isA = m.name === selectedMealAName;
                  const isB = m.name === selectedMealBName;

                  return (
                    <div
                      key={'item_' + m.name}
                      className={cn(
                        "p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5",
                        isA 
                          ? "bg-violet-50/90 dark:bg-violet-950/30 border-violet-400 dark:border-violet-600"
                          : isB
                          ? "bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600"
                          : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {m.name}
                          </span>
                          <span className={cn(
                            "text-[8.5px] font-black px-1.5 py-0.2 rounded-md shrink-0",
                            m.category === 'golden' ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          )}>
                            {m.toleranceScore}%
                          </span>
                        </div>
                        <div className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          {m.avgCarbs !== undefined && <span className="text-sky-600">W: {m.avgCarbs}g</span>}
                          {m.avgProtein !== undefined && <span>B: {m.avgProtein}g</span>}
                          {m.avgFat !== undefined && <span>T: {m.avgFat}g</span>}
                          <span className="opacity-60">• szczyt: {m.avgMaxBg || 140} mg/dL</span>
                        </div>
                      </div>

                      {/* 1-Click Przyciski przypisania do Zawodnika A lub B */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectForA(m)}
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 cursor-pointer flex items-center gap-1",
                            isA 
                              ? "bg-violet-600 text-white shadow-xs" 
                              : "bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-500/25"
                          )}
                        >
                          {isA && <Check size={11} strokeWidth={3} />}
                          <span>Jako A</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectForB(m)}
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 cursor-pointer flex items-center gap-1",
                            isB 
                              ? "bg-emerald-600 text-white shadow-xs" 
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                          )}
                        >
                          {isB && <Check size={11} strokeWidth={3} />}
                          <span>Jako B</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. WYKRES SVG ZE WSPÓLNYMI KRZYWYMI POPOSIŁKOWYMI */}
            <div className="p-3.5 sm:p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 relative">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 px-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                    <span className="w-2 h-2 rounded-full bg-violet-600" /> Danie A
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" /> Danie B
                  </span>
                </div>
                <span>Zakres 3.5h</span>
              </div>

              <div className="w-full relative h-[160px]">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="battleGradA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="battleGradB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Strefa docelowa TIR 70-180 mg/dL */}
                  <rect
                    x={paddingX}
                    y={Math.min(tirTopY, tirBottomY)}
                    width={chartWidth - paddingX * 2}
                    height={Math.abs(tirBottomY - tirTopY)}
                    fill="currentColor"
                    className="text-slate-200/50 dark:text-slate-700/20"
                    rx="4"
                  />

                  {/* Pozioma linia 180 mg/dL */}
                  <line
                    x1={paddingX}
                    y1={tirTopY}
                    x2={chartWidth - paddingX}
                    y2={tirTopY}
                    stroke="currentColor"
                    className="text-amber-500/30 dark:text-amber-400/20"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />

                  {/* Ścieżki krzywych */}
                  <path
                    d={pathA}
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={pathB}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Punkty pomiarowe dla Dania A */}
                  {pointsA.map((p, i) => (
                    <circle
                      key={'pA_' + i}
                      cx={p.x}
                      cy={p.y}
                      r={i === peakIndexA ? '4.5' : '3'}
                      fill="#8B5CF6"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      className="transition-all cursor-pointer"
                      onClick={() => setHoveredIndex(i)}
                    />
                  ))}

                  {/* Punkty pomiarowe dla Dania B */}
                  {pointsB.map((p, i) => (
                    <circle
                      key={'pB_' + i}
                      cx={p.x}
                      cy={p.y}
                      r={i === peakIndexB ? '4.5' : '3'}
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      className="transition-all cursor-pointer"
                      onClick={() => setHoveredIndex(i)}
                    />
                  ))}
                </svg>

                {/* Etykiety osi czasu na dole */}
                <div className="flex justify-between px-6 pt-1 text-[9px] font-bold text-slate-400">
                  {timeLabels.map((lbl, idx) => (
                    <span 
                      key={lbl} 
                      onClick={() => setHoveredIndex(idx)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        hoveredIndex === idx ? "text-slate-900 dark:text-white font-black" : ""
                      )}
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dymek szczegółów wybranego punktu czasu */}
              {hoveredIndex !== null && (
                <div className="mt-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between text-xs font-black animate-fade-in">
                  <span className="text-slate-500 font-bold">W {timeLabels[hoveredIndex]}:</span>
                  <span className="text-violet-600">Danie A: {trajectoryA[hoveredIndex]} mg/dL</span>
                  <span className="text-emerald-600">Danie B: {trajectoryB[hoveredIndex]} mg/dL</span>
                  <button onClick={() => setHoveredIndex(null)} className="text-[10px] text-slate-400 hover:text-slate-600">✕</button>
                </div>
              )}
            </div>

            {/* 4. METRYKI BEZPOŚREDNIE (HEAD-TO-HEAD STATS) */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex flex-col items-center text-center">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-tight">Szczyt (Peak)</span>
                <div className="flex items-center gap-1.5 my-0.5">
                  <span className="text-xs font-black text-violet-600">{peakA}</span>
                  <span className="text-[10px] text-slate-300">vs</span>
                  <span className="text-xs font-black text-emerald-600">{peakB}</span>
                </div>
                <span className="text-[8px] font-bold text-slate-400">
                  {peakA < peakB ? `A niższy o ${peakB - peakA}` : peakB < peakA ? `B niższy o ${peakA - peakB}` : 'Identyczny'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex flex-col items-center text-center">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-tight">Czas do szczytu</span>
                <div className="flex items-center gap-1.5 my-0.5">
                  <span className="text-xs font-black text-violet-600">{peakTimeA}</span>
                  <span className="text-[10px] text-slate-300">vs</span>
                  <span className="text-xs font-black text-emerald-600">{peakTimeB}</span>
                </div>
                <span className="text-[8px] font-bold text-slate-400">
                  {peakIndexA > peakIndexB ? 'A wolniejszy' : peakIndexB > peakIndexA ? 'B wolniejszy' : 'Jednoczesny'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex flex-col items-center text-center">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-tight">Stabilność</span>
                <div className="flex items-center gap-1.5 my-0.5">
                  <span className="text-xs font-black text-violet-600">{mealA.toleranceScore}%</span>
                  <span className="text-[10px] text-slate-300">vs</span>
                  <span className="text-xs font-black text-emerald-600">{mealB.toleranceScore}%</span>
                </div>
                <span className="text-[8px] font-bold text-slate-400">
                  {mealA.toleranceScore > mealB.toleranceScore ? 'A łagodniejsze' : mealB.toleranceScore > mealA.toleranceScore ? 'B łagodniejsze' : 'Równe'}
                </span>
              </div>
            </div>

            {/* 5. WERDYKT FIZJOLOGICZNY I KULINARNY (MDR/SaMD COMPLIANT) */}
            <div className={cn(
              "p-4 rounded-2xl border flex items-start gap-3",
              winner === 'B' 
                ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200"
                : winner === 'A'
                ? "bg-violet-50/70 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/40 text-violet-900 dark:text-violet-200"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            )}>
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center shrink-0 mt-0.5">
                <Trophy size={16} className={winner === 'B' ? "text-emerald-600" : winner === 'A' ? "text-violet-600" : "text-amber-500"} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black leading-tight flex items-center gap-1.5">
                  <span>Werdykt Stabilności:</span>
                  <span className="underline decoration-2">
                    {winner === 'A' ? `Danie A (${mealA.name})` : winner === 'B' ? `Danie B (${mealB.name})` : 'Profil Zbliżony'}
                  </span>
                </p>
                <p className="text-[10px] leading-relaxed opacity-90">
                  {winnerMeal && winnerMeal.avgFat && winnerMeal.avgFat > 12 && winnerMeal.avgProtein && winnerMeal.avgProtein > 15
                    ? "Danie wykazuje spłaszczoną krzywą poposiłkową dzięki wyższej zawartości tłuszczu i białka, które fizjologicznie spowalniają opróżnianie żołądka i wydłużają czas wchłaniania węglowodanów."
                    : winnerMeal && winnerMeal.toleranceScore >= 80
                    ? "Posiłek cechuje się przewidywalnym profilem poposiłkowym oraz łagodniejszym szczytem glikemii w oknie 3 godzin."
                    : "Oba dania generują zbliżoną odpowiedź glikemiczną. Warto zwrócić uwagę na kolejność spożywania składników (błonnik na start) dla spłaszczenia szczytu."}
                </p>
              </div>
            </div>

          </div>

          {/* Dolny pasek akcji */}
          <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom,1.25rem))] sm:pb-4 bg-slate-50/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider transition-all active:scale-95"
            >
              Zamknij
            </button>

            {onAddToPlate && winnerMeal && (
              <button
                type="button"
                onClick={handleAddWinnerToPlate}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black tracking-tight flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={15} strokeWidth={3} />
                <span>Wrzuć zwycięzcę na Talerz</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
