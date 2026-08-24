import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Utensils, Zap, Clock, ShieldCheck, AlertTriangle, Sparkles, Filter, Check, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';

export interface MenuItemAnalysis {
  name: string;
  category?: string;
  description?: string;
  estimatedWeight?: number;
  carbs: number;
  protein: number;
  fat: number;
  kcal?: number;
  ig?: number;
  wbt?: number;
  absorptionProfile: 'fast' | 'delayed' | 'stable';
  absorptionText?: string;
  bolusAdvice: string;
  safetyRating: 'safe' | 'medium' | 'challenging';
  dietMatch?: boolean;
  dietNote?: string;
  dietOrderTip?: string;
}

export interface RestaurantMenuResult {
  restaurantType?: string;
  menuItems: MenuItemAnalysis[];
}

interface RestaurantMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: RestaurantMenuResult | null;
  onSelectDish: (dish: MenuItemAnalysis) => void;
  activeDiet?: string | null;
}

export default function RestaurantMenuModal({
  isOpen,
  onClose,
  result,
  onSelectDish,
  activeDiet
}: RestaurantMenuModalProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'diet' | 'safe'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const items = result?.menuItems || [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.category) set.add(i.category); });
    return ['all', ...Array.from(set)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filter === 'diet' && item.dietMatch === false) return false;
      if (filter === 'safe' && item.safetyRating !== 'safe') return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      return true;
    });
  }, [items, filter, selectedCategory]);

  if (!isOpen || !result) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {t('menu_advisor.title', { defaultValue: 'Doradca Menu Restauracji' })}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {result.restaurantType ? `Kuchnia: ${result.restaurantType} • ` : ''}
                    {items.length} {t('menu_advisor.dishes_found', { defaultValue: 'rozpoznanych dań' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { Haptics.light(); onClose(); }}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-all active:scale-95 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filtry */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => { Haptics.selection(); setFilter('all'); }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                  filter === 'all'
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                )}
              >
                {t('menu_advisor.filter_all', { defaultValue: 'Wszystkie dania' })} ({items.length})
              </button>

              {activeDiet && (
                <button
                  onClick={() => { Haptics.selection(); setFilter('diet'); }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                    filter === 'diet'
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  )}
                >
                  <span>🥑</span>
                  <span>{t('menu_advisor.filter_diet', { defaultValue: 'Zgodne z dietą' })} ({activeDiet})</span>
                </button>
              )}

              <button
                onClick={() => { Haptics.selection(); setFilter('safe'); }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                  filter === 'safe'
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20"
                )}
              >
                <span>🟢</span>
                <span>{t('menu_advisor.filter_stable', { defaultValue: 'Stabilny cukier' })}</span>
              </button>
            </div>
          </div>

          {/* Lista dań */}
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <p className="text-sm font-bold">Brak dań spełniających wybrane filtry.</p>
                <button
                  onClick={() => { setFilter('all'); setSelectedCategory('all'); }}
                  className="text-xs text-indigo-500 font-bold underline"
                >
                  Pokaż wszystkie dania z menu
                </button>
              </div>
            ) : (
              filteredItems.map((dish, idx) => {
                const isFast = dish.absorptionProfile === 'fast';
                const isDelayed = dish.absorptionProfile === 'delayed';
                const isStable = dish.absorptionProfile === 'stable';

                return (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3.5"
                  >
                    {/* Tytuł i Badże */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                            {dish.name}
                          </h4>
                          {dish.category && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {dish.category}
                            </span>
                          )}
                        </div>
                        {dish.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                            {dish.description}
                          </p>
                        )}
                      </div>

                      {/* Oznaczenie bezpieczeństwa */}
                      <span className={cn(
                        "shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full",
                        dish.safetyRating === 'safe'
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : dish.safetyRating === 'medium'
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      )}>
                        {dish.safetyRating === 'safe' ? '🟢 Stabilne' : dish.safetyRating === 'medium' ? '🟡 Standard' : '🔴 Wyzwanie (Tłuszcz/WW)'}
                      </span>
                    </div>

                    {/* Statystyki makroskładników */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 text-center">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Węglowodany</span>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{dish.carbs}g</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Białko</span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{dish.protein}g</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Tłuszcz</span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{dish.fat}g</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">WBT</span>
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                          {dish.wbt ? Number(dish.wbt).toFixed(1) : ((dish.protein*4 + dish.fat*9)/100).toFixed(1)}
                        </span>
                      </div>
                      <div className="hidden sm:flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Kalorie</span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{dish.kcal || Math.round(dish.carbs*4 + dish.protein*4 + dish.fat*9)}</span>
                      </div>
                      <div className="hidden sm:flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">IG</span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{dish.ig || 50}</span>
                      </div>
                    </div>

                    {/* Profil wchłaniania i szczyt cukru */}
                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                      <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0 mt-0.5">
                        {isFast ? <Zap size={14} className="text-amber-500" /> : isDelayed ? <Clock size={14} className="text-purple-500" /> : <ShieldCheck size={14} className="text-emerald-500" />}
                      </div>
                      <div className="space-y-0.5 text-slate-700 dark:text-slate-300">
                        <span className="font-black block text-indigo-900 dark:text-indigo-200">
                          {isFast ? '⚡ Szybki szczyt glikemii (40-60 min)' : isDelayed ? '⏳ Opóźniony wyrzut cukru (2.5-4h, efekt tłuszczowo-białkowy)' : '🟢 Stabilna, płaska krzywa wchłaniania'}
                        </span>
                        {dish.absorptionText && <p className="text-[11px] text-slate-500 dark:text-slate-400">{dish.absorptionText}</p>}
                      </div>
                    </div>

                    {/* Zgodność z dietą & Wskazówka jak zamówić u kelnera */}
                    {(dish.dietNote || dish.dietOrderTip) && (
                      <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-black text-emerald-800 dark:text-emerald-300">
                          <span>🥑</span>
                          <span>{dish.dietMatch ? 'Zgodne z Twoją dietą' : 'Wymaga drobnej modyfikacji pod dietę'}</span>
                        </div>
                        {dish.dietNote && <p className="text-[11px] text-slate-600 dark:text-slate-300">{dish.dietNote}</p>}
                        {dish.dietOrderTip && (
                          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            💡 Wskazówka u kelnera: {dish.dietOrderTip}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Wskazówka bolusowa i Przycisk wyboru */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-black text-slate-800 dark:text-slate-200">💉 Bolus:</span>
                        <span className="text-[11px]">{dish.bolusAdvice}</span>
                      </div>

                      <button
                        onClick={() => {
                          Haptics.medium();
                          onSelectDish(dish);
                        }}
                        className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
                      >
                        <span>Wybieram to danie</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
