import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  RefreshCw, 
  Check, 
  Camera, 
  Edit3, 
  Trash2, 
  Plus, 
  Scale, 
  Zap, 
  AlertCircle,
  HelpCircle,
  Flame,
  PieChart
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';
import { geminiService } from '../../services/gemini';
import { toast } from 'react-hot-toast';

export interface AiMealIngredient {
  name: string;
  weight: number;
  carbsPer100g?: number;
  proteinPer100g?: number;
  fatPer100g?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  ig?: number;
}

export interface AiMealResult {
  mealName: string;
  weight?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  ig?: number;
  analysis?: string;
  glycemicImpact?: string;
  balanceAdvice?: string;
  ingredients?: AiMealIngredient[];
}

interface AiMealVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  imagePreview: string | null;
  initialResult: AiMealResult | null;
  onConfirm: (finalResult: AiMealResult) => void;
  onRetakePhoto: () => void;
  settings?: any;
}

export default function AiMealVerificationModal({
  isOpen,
  onClose,
  imagePreview,
  initialResult,
  onConfirm,
  onRetakePhoto,
  settings
}: AiMealVerificationModalProps) {
  const { t } = useTranslation();

  const [mealName, setMealName] = useState<string>('');
  const [ingredients, setIngredients] = useState<AiMealIngredient[]>([]);
  const [analysisText, setAnalysisText] = useState<string>('');
  const [glycemicImpact, setGlycemicImpact] = useState<string>('');
  const [balanceAdvice, setBalanceAdvice] = useState<string>('');
  const [correctionHint, setCorrectionHint] = useState<string>('');
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [showCorrectionBox, setShowCorrectionBox] = useState<boolean>(false);

  useEffect(() => {
    if (initialResult) {
      setMealName(initialResult.mealName || t('auto.posilek_ai', { defaultValue: 'Danie z aparatu' }));
      setIngredients(initialResult.ingredients || []);
      setAnalysisText(initialResult.analysis || '');
      setGlycemicImpact(initialResult.glycemicImpact || '');
      setBalanceAdvice(initialResult.balanceAdvice || '');
      setCorrectionHint('');
      setShowCorrectionBox(false);
    }
  }, [initialResult, t]);

  if (!isOpen || !initialResult) return null;

  // Obliczenia sumaryczne z listy składników
  const totalWeight = ingredients.reduce((sum, ing) => sum + (Number(ing.weight) || 0), 0);
  
  const totalCarbs = ingredients.reduce((sum, ing) => {
    const w = Number(ing.weight) || 0;
    const c100 = ing.carbsPer100g !== undefined ? Number(ing.carbsPer100g) : (ing.carbs ? (Number(ing.carbs) / (w || 100)) * 100 : 0);
    return sum + (c100 * w) / 100;
  }, 0);

  const totalProtein = ingredients.reduce((sum, ing) => {
    const w = Number(ing.weight) || 0;
    const p100 = ing.proteinPer100g !== undefined ? Number(ing.proteinPer100g) : (ing.protein ? (Number(ing.protein) / (w || 100)) * 100 : 0);
    return sum + (p100 * w) / 100;
  }, 0);

  const totalFat = ingredients.reduce((sum, ing) => {
    const w = Number(ing.weight) || 0;
    const f100 = ing.fatPer100g !== undefined ? Number(ing.fatPer100g) : (ing.fat ? (Number(ing.fat) / (w || 100)) * 100 : 0);
    return sum + (f100 * w) / 100;
  }, 0);

  const totalKcal = Math.round(totalCarbs * 4 + totalProtein * 4 + totalFat * 9);
  const totalWW = Math.round((totalCarbs / 10) * 10) / 10;
  const totalWBT = Math.round(((totalProtein * 4 + totalFat * 9) / 100) * 10) / 10;

  // Średni ważony indeks glikemiczny
  const weightedGI = totalCarbs > 0
    ? Math.round(
        ingredients.reduce((acc, ing) => {
          const w = Number(ing.weight) || 0;
          const c100 = ing.carbsPer100g !== undefined ? Number(ing.carbsPer100g) : (ing.carbs ? (Number(ing.carbs) / (w || 100)) * 100 : 0);
          const carbsInIng = (c100 * w) / 100;
          return acc + (Number(ing.ig || 50) * carbsInIng);
        }, 0) / totalCarbs
      )
    : (initialResult.ig || 50);

  const handleUpdateIngredientWeight = (index: number, newWeight: number) => {
    setIngredients(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], weight: Math.max(1, newWeight) };
      }
      return copy;
    });
  };

  const handleRemoveIngredient = (index: number) => {
    Haptics.warning();
    setIngredients(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleReanalyzeWithCorrection = async () => {
    if (!correctionHint.trim()) {
      toast.error(t('camera.err_empty_hint', { defaultValue: 'Wpisz poprawną nazwę potrawy lub wskazówkę.' }));
      return;
    }
    if (!imagePreview) {
      toast.error(t('camera.err_no_image', { defaultValue: 'Brak zdjęcia do ponownej analizy.' }));
      return;
    }

    Haptics.medium();
    setIsReanalyzing(true);

    try {
      const newResult = await geminiService.analyzeMeal(
        imagePreview,
        settings,
        correctionHint.trim()
      );

      Haptics.success();
      setMealName(newResult.mealName || correctionHint.trim());
      setIngredients(newResult.ingredients || []);
      setAnalysisText(newResult.analysis || '');
      setGlycemicImpact(newResult.glycemicImpact || '');
      setBalanceAdvice(newResult.balanceAdvice || '');
      setShowCorrectionBox(false);

      toast.success(t('camera.reanalysis_success', { defaultValue: 'Zaktualizowano danie na podstawie Twojej poprawki! ✨' }), {
        icon: '✨',
        duration: 4000
      });
    } catch (e: any) {
      console.error('Reanalysis failed:', e);
      Haptics.error();
      toast.error(t('camera.err_reanalysis', { defaultValue: 'Nie udało się przeanalizować ponownie. Spróbuj jeszcze raz.' }));
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleConfirmAndAddToPlate = () => {
    Haptics.success();
    const finalResult: AiMealResult = {
      mealName: mealName.trim() || initialResult.mealName || 'Danie z aparatu',
      weight: Math.round(totalWeight),
      carbs: Math.round(totalCarbs * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      ig: weightedGI,
      analysis: analysisText,
      glycemicImpact,
      balanceAdvice,
      ingredients
    };
    onConfirm(finalResult);
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-2xl"
          id="ai-meal-verification-modal"
        >
          {/* Górna belka modalu */}
          <div className="pt-5 px-6 pb-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20">
                <Sparkles size={12} className="animate-pulse" />
                {t('camera.verification_badge', { defaultValue: 'AI Wizja • Weryfikacja' })}
              </span>
            </div>

            <button
              onClick={() => { Haptics.light(); onClose(); }}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
              aria-label={t('auto.zamknij', { defaultValue: 'Zamknij' })}
            >
              <X size={18} />
            </button>
          </div>

          {/* Główna przewijana zawartość */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 no-scrollbar">
            
            {/* Karta zdjęcia i nazwy posiłku */}
            <div className="flex items-center gap-3.5 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-3xl border border-slate-100 dark:border-white/5">
              {imagePreview && (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-black/10 dark:border-white/10 shadow-sm bg-slate-900">
                  <img
                    src={imagePreview}
                    alt={mealName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>
              )}
              
              <div className="flex-1 min-w-0 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  {t('camera.detected_meal_name', { defaultValue: 'Rozpoznana potrawa:' })}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    className="w-full text-base font-black text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-500 focus:outline-none transition-all pr-6 py-0.5 truncate"
                    placeholder={t('camera.placeholder_meal_name', { defaultValue: 'Nazwa posiłku...' })}
                  />
                  <Edit3 size={13} className="absolute right-1 top-2 text-slate-400 pointer-events-none" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  <Scale size={12} className="text-emerald-500" />
                  <span>{Math.round(totalWeight)}g łącznie</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{ingredients.length} {t('camera.ingredients_count', { defaultValue: 'składników' })}</span>
                </div>
              </div>
            </div>

            {/* Kapsułki podsumowania makroskładników */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 p-2.5 rounded-2xl text-center">
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Węgle</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-300 leading-tight block">{Math.round(totalCarbs * 10) / 10}g</span>
                <span className="text-[9px] font-mono font-bold text-emerald-600/80 dark:text-emerald-400/80">{totalWW} WW</span>
              </div>
              <div className="bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 p-2.5 rounded-2xl text-center">
                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Białko</span>
                <span className="text-base font-black text-blue-700 dark:text-blue-300 leading-tight block">{Math.round(totalProtein * 10) / 10}g</span>
                <span className="text-[9px] font-mono font-bold text-blue-500">{(totalProtein * 4).toFixed(0)} kcal</span>
              </div>
              <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 p-2.5 rounded-2xl text-center">
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Tłuszcz</span>
                <span className="text-base font-black text-amber-700 dark:text-amber-300 leading-tight block">{Math.round(totalFat * 10) / 10}g</span>
                <span className="text-[9px] font-mono font-bold text-amber-600/80 dark:text-amber-400/80">{totalWBT} WBT</span>
              </div>
              <div className="bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 p-2.5 rounded-2xl text-center">
                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Energia</span>
                <span className="text-base font-black text-purple-700 dark:text-purple-300 leading-tight block">{totalKcal}</span>
                <span className="text-[9px] font-mono font-bold text-purple-500">IG: {weightedGI}</span>
              </div>
            </div>

            {/* Sekcja Skoryguj i przeanalizuj ponownie (Kluczowa funkcja) */}
            <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 border border-indigo-500/20 rounded-3xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-500">
                    <HelpCircle size={15} />
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-indigo-100 uppercase tracking-wide">
                    {t('camera.mistake_box_title', { defaultValue: 'AI pomyliło potrawę?' })}
                  </span>
                </div>
                {!showCorrectionBox && (
                  <button
                    type="button"
                    onClick={() => { Haptics.light(); setShowCorrectionBox(true); }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{t('camera.correct_btn', { defaultValue: 'Popraw danie' })}</span>
                  </button>
                )}
              </div>

              {showCorrectionBox ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2.5 pt-1"
                >
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {t('camera.correction_instruction', { defaultValue: 'Wpisz czym naprawdę jest to danie lub wymień poprawne składniki (np. "To pierogi ze szpinakiem, a nie serem", "To kotlet drobiowy z ryżem"): ' })}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={correctionHint}
                      onChange={(e) => setCorrectionHint(e.target.value)}
                      placeholder={t('camera.correction_placeholder', { defaultValue: 'np. To są pierogi ze szpinakiem i fetą...' })}
                      disabled={isReanalyzing}
                      className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/30 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleReanalyzeWithCorrection}
                      disabled={isReanalyzing || !correctionHint.trim()}
                      className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <RefreshCw size={13} className={isReanalyzing ? "animate-spin" : ""} />
                      <span>{isReanalyzing ? t('camera.analyzing', { defaultValue: 'Analizuję...' }) : t('camera.reanalyze_btn', { defaultValue: 'Przelicz' })}</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t('camera.mistake_box_desc', { defaultValue: 'Jeśli sztuczna inteligencja źle rozpoznała potrawę, możesz podać właściwą nazwę – AI natychmiast przeliczy składniki z tego samego zdjęcia.' })}
                </p>
              )}
            </div>

            {/* Lista rozpoznanych składników z możliwością edycji wagi lub usunięcia */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('camera.ingredients_list_title', { defaultValue: 'Składniki dania (do edycji):' })}
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">
                  {ingredients.length} poz.
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
                {ingredients.map((ing, idx) => {
                  const w = Number(ing.weight) || 100;
                  const c100 = ing.carbsPer100g !== undefined ? Number(ing.carbsPer100g) : (ing.carbs ? (Number(ing.carbs) / w) * 100 : 0);
                  const carbsInIng = Math.round(((c100 * w) / 100) * 10) / 10;

                  return (
                    <div
                      key={`ing-${idx}`}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-slate-700 transition-all text-xs"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="font-bold text-slate-900 dark:text-slate-200 block truncate">
                          {ing.name}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 block font-mono">
                          {carbsInIng}g W • IG {ing.ig || 50}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-2 py-1">
                          <input
                            type="number"
                            min="5"
                            max="2000"
                            step="5"
                            value={ing.weight}
                            onChange={(e) => handleUpdateIngredientWeight(idx, Number(e.target.value))}
                            className="w-12 text-center font-black text-slate-900 dark:text-white bg-transparent focus:outline-none text-xs"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">g</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                          title={t('auto.usun', { defaultValue: 'Usuń składnik' })}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Krótka wskazówka diabetologiczna (jeśli dostępna) */}
            {(glycemicImpact || balanceAdvice) && (
              <div className="p-3 rounded-2xl bg-accent-50/50 dark:bg-accent-950/30 border border-accent-200/50 dark:border-accent-800/40 text-[11px] text-accent-950 dark:text-accent-100 space-y-1">
                {glycemicImpact && (
                  <div><b>⚡ {t('auto.wplyw_na_glikemie', { defaultValue: 'Wpływ na glikemię' })}:</b> {glycemicImpact}</div>
                )}
                {balanceAdvice && (
                  <div><b>💡 {t('auto.wskazowka_bilansowania', { defaultValue: 'Wskazówka bilansowania' })}:</b> {balanceAdvice}</div>
                )}
              </div>
            )}
          </div>

          {/* Dolna belka akcji */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => { Haptics.light(); onRetakePhoto(); }}
              className="flex-1 py-3.5 px-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-[11px] uppercase tracking-wider border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Camera size={15} />
              <span>{t('camera.retake_photo', { defaultValue: 'Nowe foto' })}</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmAndAddToPlate}
              className="flex-[2] py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer font-display"
              id="ai-meal-confirm-btn"
            >
              <Check size={16} />
              <span>{t('camera.confirm_add_plate', { defaultValue: 'Zatwierdź i wrzuć na Talerz' })}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
