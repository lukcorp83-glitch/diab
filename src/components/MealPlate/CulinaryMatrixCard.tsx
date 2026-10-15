import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  FlaskConical, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Droplet, 
  CheckCircle2, 
  Plus, 
  Check, 
  Info,
  Scale
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { analyzePlateCulinaryMatrix, CulinaryMatrixSummary } from '../../lib/culinaryMatrix';
import { PlateItem } from '../../types';
import { Haptics } from '../../lib/haptics';
import { cn } from '../../lib/utils';

interface CulinaryMatrixCardProps {
  plate: PlateItem[];
  logs?: any[];
  manualAcidicBuffer: boolean;
  onToggleAcidicBuffer: () => void;
  isAlDente?: boolean;
  onToggleAlDente?: () => void;
}

export const CulinaryMatrixCard: React.FC<CulinaryMatrixCardProps> = ({
  plate,
  logs,
  manualAcidicBuffer,
  onToggleAcidicBuffer,
  isAlDente,
  onToggleAlDente
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!Array.isArray(plate) || plate.length === 0) return null;

  const matrix: CulinaryMatrixSummary = analyzePlateCulinaryMatrix(plate, logs, {
    acidicBuffer: manualAcidicBuffer,
    isAlDente: isAlDente
  });

  const formatHoursMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const hasStarchItem = plate.some(item => {
    const name = (item.name || '').toLowerCase();
    return name.includes('makaron') || name.includes('ryż') || name.includes('kasza') || name.includes('spaghetti');
  });

  return (
    <div className="mb-6 rounded-[1.75rem] bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-900/40 border border-emerald-500/20 p-4 transition-all">
      {/* Nagłówek akordeonu */}
      <button
        type="button"
        onClick={() => {
          Haptics.light();
          setIsExpanded(prev => !prev);
        }}
        className="w-full flex items-center justify-between text-left group focus:outline-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
            <FlaskConical size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="text-[11px] font-black uppercase tracking-wider text-white">
                {t('meal.culinary_matrix_title', { defaultValue: 'Fizykochemia i Matryca Posiłku' })}
              </h5>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                matrix.hasAcidicBuffer || matrix.hasGelFiber
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-teal-500/15 text-teal-300 border-teal-500/30"
              )}>
                {formatHoursMinutes(matrix.estimatedGastricTransitMinutes)}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">
              {t('meal.culinary_matrix_subtitle', { defaultValue: 'Obróbka kulinarna, kwasowość, żelowanie i pasaż żołądkowy' })}
            </p>
          </div>
        </div>

        <div className="p-1.5 rounded-xl bg-white/5 text-slate-400 group-hover:text-white transition-colors">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Szybkie pigułki stanu (zawsze widoczne w pasku) */}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        {/* Pigułka kwasowości */}
        {matrix.hasAcidicBuffer ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
            🍋 {t('meal.acidic_buffer_badge', { defaultValue: 'Bufor kwasowy' })}
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAcidicBuffer();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 border border-white/10 text-[9px] font-black uppercase tracking-wider transition-all"
          >
            <Plus size={11} className="text-emerald-400" />
            {t('meal.add_acidic_dressing', { defaultValue: '+ Winegret / Kiszonka' })}
          </button>
        )}

        {/* Pigułka błonnika żelującego */}
        {matrix.hasGelFiber && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[9px] font-black uppercase tracking-wider">
            🥣 {t('meal.gel_fiber_badge', { defaultValue: 'Matryca żelowa' })}
          </span>
        )}

        {/* Pigułka tekstury */}
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-white/5 text-slate-300 border border-white/10 text-[9px] font-bold uppercase tracking-wider">
          {matrix.textureForm === 'liquid_smoothie' 
            ? `🥤 ${t('meal.texture_liquid', { defaultValue: 'Koktajl / Płynne' })}` 
            : matrix.textureForm === 'mashed_puree'
            ? `🥣 ${t('meal.texture_puree', { defaultValue: 'Puree / Krem' })}`
            : `🥗 ${t('meal.texture_solid', { defaultValue: 'Do gryzienia' })}`}
        </span>

        {/* Pigułka Al Dente (jeśli na talerzu jest makaron/ryż) */}
        {hasStarchItem && onToggleAlDente && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAlDente();
            }}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all active:scale-95",
              isAlDente
                ? "bg-emerald-500/25 text-emerald-200 border-emerald-500/40"
                : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
            )}
          >
            {isAlDente ? <Check size={11} /> : null}
            {isAlDente 
              ? t('meal.al_dente_active', { defaultValue: '🍝 Al dente' }) 
              : t('meal.al_dente_inactive', { defaultValue: '🍝 Rozgotowane / Miękkie' })}
          </button>
        )}
      </div>

      {/* Rozwinięcie szczegółów */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-4 mt-3 border-t border-emerald-500/10 space-y-3"
          >
            {/* Siatka wskaźników fizykochemicznych */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Karta: Bufor Kwasowy */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span>🍋</span>
                    {t('meal.acidic_factor_title', { defaultValue: 'Bufor Kwasowy' })}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    {matrix.hasAcidicBuffer ? '+20m pasażu' : 'Neutralny'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-300 leading-relaxed">
                  {matrix.hasAcidicBuffer
                    ? t('meal.acidic_factor_desc_active', { 
                        defaultValue: 'Kwasy organiczne stymulują receptory dwunastnicy, naturalnie wydłużając czas przebywania posiłku w żołądku.',
                        sources: matrix.acidicSources.join(', ') || 'Dodatek kwasowy'
                      })
                    : t('meal.acidic_factor_desc_empty', { 
                        defaultValue: 'Brak zakwaszenia. Dodatek 1 łyżki octu jabłkowego, soku z cytryny lub kiszonek naturalnie spowalnia opróżnianie żołądka.' 
                      })}
                </p>
              </div>

              {/* Karta: Błonnik Żelujący */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <span>🥣</span>
                    {t('meal.gel_fiber_title', { defaultValue: 'Błonnik Żelujący' })}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    {matrix.hasGelFiber ? 'Wysoka lepkość' : 'Standard'}
                  </span>
                </div>
                <p className="text-[9px] text-slate-300 leading-relaxed">
                  {matrix.hasGelFiber
                    ? t('meal.gel_fiber_desc_active', { 
                        defaultValue: 'Błonnik rozpuszczalny tworzy fizyczny żel otaczający cząsteczki węglowodanów, spowalniając ich kontakt z enzymami.',
                        sources: matrix.gelFiberSources.join(', ')
                      })
                    : t('meal.gel_fiber_desc_empty', { 
                        defaultValue: 'Brak nasion chia, siemienia lnianego ani owsa. Ich dodatek tworzy lepką matrycę żelową stabilizującą trawienie.' 
                      })}
                </p>
              </div>

              {/* Karta: Wolumetryka i Gęstość */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Scale size={12} />
                    {t('meal.volumetrics_title', { defaultValue: 'Wolumetryka Talerza' })}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">
                    {matrix.volumetricsRatio} kcal/100g
                  </span>
                </div>
                <p className="text-[9px] text-slate-300 leading-relaxed">
                  {matrix.volumetricsCategory === 'high_volume'
                    ? t('meal.volumetrics_high_desc', { defaultValue: 'Duża objętość kęsa przy niskiej kaloryczności – mechanicznie rozciąga ścianki żołądka, dając szybki sygnał sytości.' })
                    : matrix.volumetricsCategory === 'dense_energy'
                    ? t('meal.volumetrics_dense_desc', { defaultValue: 'Skoncentrowana energia w małej masie produktu. Posiłek zajmuje niewiele miejsca w żołądku.' })
                    : t('meal.volumetrics_balanced_desc', { defaultValue: 'Zrównoważona gęstość energetyczna i objętościowa posiłku.' })}
                </p>
              </div>

              {/* Karta: Okno Trawienne (MMC) */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Clock size={12} />
                    {t('meal.digestive_window_title', { defaultValue: 'Odstęp Trawienny' })}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">
                    {matrix.timeSinceLastMealMinutes !== null 
                      ? formatHoursMinutes(matrix.timeSinceLastMealMinutes)
                      : t('meal.no_prev_meal', { defaultValue: 'Brak danych' })}
                  </span>
                </div>
                <p className="text-[9px] text-slate-300 leading-relaxed">
                  {matrix.digestiveRestState === 'fasting_cleared'
                    ? t('meal.mmc_cleared_desc', { defaultValue: 'Upłynęło >4h od poprzedniego posiłku. Przewód pokarmowy zakończył pełny cykl oczyszczania mioelektrycznego (MMC).' })
                    : matrix.digestiveRestState === 'digestive_window'
                    ? t('meal.mmc_window_desc', { defaultValue: 'Optymalny odstęp między posiłkami (1.5h - 4h). Żołądek ukończył pasaż poprzedniej porcji.' })
                    : matrix.digestiveRestState === 'recently_eaten'
                    ? t('meal.mmc_recent_desc', { defaultValue: 'Niewielki odstęp (<90m). W żołądku trwa jeszcze trawienie poprzedniego posiłku.' })
                    : t('meal.mmc_unknown_desc', { defaultValue: 'Rejestracja kolejnych posiłków pozwala monitorować odstępy trawienne między daniami.' })}
                </p>
              </div>
            </div>

            {/* Stopka edukacyjna */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 text-[9px] text-slate-400 font-medium leading-tight">
              <Info size={13} className="text-emerald-400 shrink-0" />
              <span>
                {t('meal.culinary_matrix_footer_note', { 
                  defaultValue: 'Czynniki fizykochemiczne (kwasowość, stopień ugotowania al dente, obecność błonnika żelującego) naturalnie modulują motorykę przewodu pokarmowego.' 
                })}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
