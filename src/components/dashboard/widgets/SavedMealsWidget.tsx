import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { Utensils, BookOpen, ChevronRight, ChevronLeft, X } from "lucide-react";
import { useSavedMeals } from "../../../hooks/queries/useSavedMeals";
import { Haptics } from "../../../lib/haptics";
import { cn } from "../../../lib/utils";
import toast from "react-hot-toast";

interface SavedMealsWidgetProps {
  user: any;
  isEditingLayout?: boolean;
  setTab: (tab: string) => void;
  onAction?: (action: string) => void;
  size?: "2x2" | "2x1" | "1x2" | "1x1";
}

export const SavedMealsWidget: React.FC<SavedMealsWidgetProps> = ({
  user,
  isEditingLayout = false,
  setTab,
  onAction,
  size = "2x1",
}) => {
  const { t } = useTranslation();
  const { data: savedMeals = [], isLoading } = useSavedMeals(user);
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const hasMovedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    hasMovedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
      e.preventDefault();
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollSide = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    Haptics.light();
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -240 : 240,
      behavior: 'smooth'
    });
  };

  const handleAddToPlate = (meal: any) => {
    if (hasMovedRef.current) return;
    if (isEditingLayout) return;
    Haptics.impact();

    try {
      const plateItems = meal.items && meal.items.length > 0
        ? meal.items
        : [{
            product: {
              id: meal.id,
              name: meal.name,
              namePl: meal.name,
              carbs: meal.totalCarbs || meal.carbs || 0,
              protein: meal.totalProtein || meal.protein || 0,
              fat: meal.totalFat || meal.fat || 0,
              calories: meal.totalCalories || meal.calories || meal.kcal || 0,
              gi: 45,
              category: "Gotowe Posiłki",
            },
            weight: 100,
            unit: "g"
          }];

      localStorage.setItem("glikocontrol_pending_plate_load", JSON.stringify(plateItems));
      window.dispatchEvent(new CustomEvent("glikocontrol_load_plate"));
      toast.success(t("auto.posilek_wrzucony_na_talerz", { defaultValue: 'Danie "{{name}}" wrzucone na Talerz!', name: meal.name }));
      setTab("meal");
    } catch (e) {
      console.error(e);
      setTab("meal");
    }
  };

  const handleOpenRecipe = (meal: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasMovedRef.current) return;
    if (isEditingLayout) return;
    Haptics.light();
    setSelectedRecipe(meal);
  };

  if (isLoading) {
    return (
      <div className="glass-card !p-5 flex items-center justify-center min-h-[140px] w-full h-full border border-white/50 dark:border-white/5 shadow-lg">
        <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (savedMeals.length === 0) {
    return (
      <div 
        onClick={() => {
          if (!isEditingLayout) {
            Haptics.light();
            setTab("database");
          }
        }}
        className="glass-card !p-5 flex flex-col justify-center items-center text-center cursor-pointer border border-white/50 dark:border-white/5 shadow-lg w-full h-full min-h-[140px] group"
      >
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 mb-2 group-hover:scale-110 transition-transform">
          <Utensils size={20} />
        </div>
        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-white mb-1">
          {t("auto.brak_zapisanych_posilkow", { defaultValue: "Brak Zapisanych Posiłków" })}
        </h4>
        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold max-w-[200px]">
          {t("auto.zapisz_posilki_w_diecie_lub_talerzu", { defaultValue: "Dotknij, aby wygenerować przepisy w Dietach lub zapisać zestaw z Talerza" })}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card !p-5 flex flex-col justify-between gap-3 border border-white/50 dark:border-white/5 shadow-lg w-full h-full overflow-hidden">
        {/* Nagłówek widżetu */}
        <div className="flex justify-between items-center px-1 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">🥗</span>
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-display">
              {t("auto.zapisane_posilki_naglowek", { defaultValue: "ZAPISANE POSIŁKI" })}
            </h4>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {savedMeals.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {savedMeals.length > 2 && (
              <div className="hidden sm:flex items-center gap-1">
                <button 
                  onClick={() => scrollSide('left')}
                  className="w-6 h-6 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
                  title="Przewiń w lewo"
                >
                  <ChevronLeft size={13} />
                </button>
                <button 
                  onClick={() => scrollSide('right')}
                  className="w-6 h-6 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
                  title="Przewiń w prawo"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}

            <button 
              onClick={() => {
                if (!isEditingLayout) {
                  Haptics.light();
                  setTab("database");
                }
              }}
              className="text-[9px] font-black text-sky-500 hover:text-sky-600 uppercase tracking-tight flex items-center gap-0.5 cursor-pointer"
            >
              {t("auto.zobacz_wszystkie", { defaultValue: "Wszystkie" })}
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Przewijana poziomo lista kart dań (Drag-to-scroll & Swipeable Cards Stack) */}
        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onWheel={handleWheel}
          className={cn(
            "flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory mask-fade-right w-full flex-1 items-center select-none",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          {savedMeals.map((meal: any) => {
            const carbs = meal.totalCarbs || meal.carbs || meal.items?.reduce((s: number, i: any) => s + (i.carbs || 0), 0) || 0;
            const protein = meal.totalProtein || meal.protein || meal.items?.reduce((s: number, i: any) => s + (i.protein || 0), 0) || 0;
            const fat = meal.totalFat || meal.fat || meal.items?.reduce((s: number, i: any) => s + (i.fat || 0), 0) || 0;
            const kcal = meal.totalCalories || meal.calories || meal.kcal || meal.items?.reduce((s: number, i: any) => s + (i.calories || i.kcal || 0), 0) || 0;

            return (
              <motion.div
                key={meal.id}
                whileHover={!isEditingLayout && !isDragging ? { y: -2 } : {}}
                whileTap={!isEditingLayout && !isDragging ? { scale: 0.98 } : {}}
                onClick={() => handleAddToPlate(meal)}
                className="shrink-0 snap-start bg-white/70 dark:bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm flex flex-col justify-between cursor-pointer w-[200px] sm:w-[220px] min-h-[115px] group hover:border-sky-500/40 transition-colors"
              >
                <div>
                  {/* Tag Diety / Posiłku i Przycisk Przepisu */}
                  <div className="flex items-center justify-between gap-1 mb-1.5 pointer-events-none">
                    <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 truncate max-w-[120px] border border-sky-200/40 dark:border-sky-800/40">
                      {meal.dietName ? `${t("auto.dieta_prefix", { defaultValue: "Dieta: " })}${meal.dietName}` : t("auto.gotowe_danie", { defaultValue: "Gotowe Danie" })}
                    </span>
                    {meal.recipe && (
                      <button
                        onClick={(e) => handleOpenRecipe(meal, e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors pointer-events-auto"
                        title={t("auto.zobacz_przepis", { defaultValue: "Zobacz przepis" })}
                      >
                        <BookOpen size={13} />
                      </button>
                    )}
                  </div>

                  {/* Nazwa posiłku */}
                  <h5 className="font-black text-xs text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight mb-2 group-hover:text-sky-500 transition-colors pointer-events-none">
                    {meal.name}
                  </h5>
                </div>

                {/* Pigułki makroskładników */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400">{t("auto.w_skrot", { defaultValue: "W" })}: {Number(carbs).toFixed(0)}g</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{t("auto.b_skrot", { defaultValue: "B" })}: {Number(protein).toFixed(0)}g</span>
                    <span>•</span>
                    <span className="text-rose-600 dark:text-rose-400">{t("auto.t_skrot", { defaultValue: "T" })}: {Number(fat).toFixed(0)}g</span>
                  </div>
                  {kcal > 0 && (
                    <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500">
                      {Number(kcal).toFixed(0)} kcal
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Modal szybkiego podglądu przepisu z poziomu widżetu */}
      <AnimatePresence>
        {selectedRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md max-h-[85vh] rounded-[2.5rem] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4 shrink-0">
                <div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400">
                    {selectedRecipe.dietName ? `${t("auto.dieta_prefix", { defaultValue: "Dieta: " })}${selectedRecipe.dietName}` : t("auto.przepis", { defaultValue: "Przepis" })}
                  </span>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white mt-1">
                    {selectedRecipe.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto pr-1 space-y-4 text-sm flex-1 scrollbar-thin">
                {selectedRecipe.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    {selectedRecipe.description}
                  </p>
                )}

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    {t("auto.makroskladniki", { defaultValue: "Makroskładniki" })}
                  </h4>
                  <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-200">
                    <span>{t("auto.weglowodany", { defaultValue: "Węglowodany" })}: {selectedRecipe.totalCarbs || selectedRecipe.carbs || 0}g</span>
                    <span>{t("auto.bialko", { defaultValue: "Białko" })}: {selectedRecipe.totalProtein || selectedRecipe.protein || 0}g</span>
                    <span>{t("auto.tluszcz", { defaultValue: "Tłuszcz" })}: {selectedRecipe.totalFat || selectedRecipe.fat || 0}g</span>
                    <span>{t("auto.kalorie", { defaultValue: "Kalorie" })}: {selectedRecipe.totalCalories || selectedRecipe.calories || selectedRecipe.kcal || 0} kcal</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    {t("auto.sposob_przygotowania", { defaultValue: "Sposób Przygotowania" })}
                  </h4>
                  <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {selectedRecipe.recipe}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  onClick={() => {
                    const recipe = selectedRecipe;
                    setSelectedRecipe(null);
                    handleAddToPlate(recipe);
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-sky-500/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Utensils size={15} />
                  {t("auto.wrzuc_ten_posilek_na_talerz", { defaultValue: "Wrzuć ten posiłek na Talerz" })}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SavedMealsWidget;
