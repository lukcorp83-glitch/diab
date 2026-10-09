import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, Utensils, Zap, Sparkles, ChevronDown, ChevronUp, Layers, CheckCircle2, ArrowRight, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPlateGroupedSequence, GroupedPlateStep, FoodSequenceStep } from '../../lib/foodSequencing';
import { getProductName } from '../FoodDatabase';
import { Haptics } from '../../lib/haptics';
import { cn } from '../../lib/utils';
import i18n from '../../i18n';

interface PlateSequenceCardProps {
  plate: any[];
}

export const PlateSequenceCard: React.FC<PlateSequenceCardProps> = ({ plate }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  if (!Array.isArray(plate) || plate.length === 0) return null;

  const sequence = getPlateGroupedSequence(plate);
  if (sequence.length === 0) return null;

  const hasFiberStep = sequence.some(s => s.stepInfo.step === 1);
  const hasCarbStep = sequence.some(s => s.stepInfo.step === 3 || s.stepInfo.step === 4);
  const hasProteinStep = sequence.some(s => s.stepInfo.step === 2);
  const isWellBalanced = hasFiberStep && (hasProteinStep || hasCarbStep);

  const getStepIcon = (iconName: string) => {
    switch (iconName) {
      case 'Leaf': return <Leaf size={14} />;
      case 'Utensils': return <Utensils size={14} />;
      case 'Zap': return <Zap size={14} />;
      case 'Sparkles': return <Sparkles size={14} />;
      default: return <Leaf size={14} />;
    }
  };

  return (
    <div className="mb-6 rounded-[1.75rem] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-900/40 border border-indigo-500/20 p-4 transition-all">
      {/* Header */}
      <button
        type="button"
        onClick={() => {
          Haptics.light();
          setIsExpanded(prev => !prev);
        }}
        className="w-full flex items-center justify-between text-left group focus:outline-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
            <Layers size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="text-[11px] font-black uppercase tracking-wider text-white">
                {t('meal.plate_sequence_title', { defaultValue: 'Sugerowana kolejność kęsów' })}
              </h5>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                isWellBalanced
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30"
              )}>
                {isWellBalanced
                  ? t('meal.plate_sequence_badge_balanced', { defaultValue: 'Stabilny profil' })
                  : t('meal.plate_sequence_badge_tip', { defaultValue: 'Wskazówka' })}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">
              {t('meal.plate_sequence_subtitle', { defaultValue: 'Organizacja posiłku łagodząca tempo wchłaniania glukozy' })}
            </p>
          </div>
        </div>

        <div className="p-1 rounded-xl bg-white/5 text-slate-400 group-hover:text-white transition-colors">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3.5 mt-3 border-t border-white/5 space-y-2.5">
              {/* Oś kroków */}
              <div className="space-y-2">
                {sequence.map((group, idx) => {
                  const { stepInfo, items } = group;
                  return (
                    <div
                      key={stepInfo.step}
                      className={cn(
                        "p-3 rounded-2xl border flex items-start gap-3 transition-all",
                        stepInfo.bgColor,
                        stepInfo.borderColor
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-black text-xs",
                        stepInfo.textColor,
                        "bg-white/10 shadow-xs"
                      )}>
                        {getStepIcon(stepInfo.iconName)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={cn("text-[10px] font-black uppercase tracking-tight", stepInfo.textColor)}>
                            {t(stepInfo.nameKey, { defaultValue: stepInfo.defaultName })}
                          </span>
                          <span className={cn(
                            "text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10",
                            stepInfo.textColor
                          )}>
                            {stepInfo.badge}
                          </span>
                        </div>

                        {/* Lista produktów z talerza w tym kroku */}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {items.map(({ item }, itemIdx) => (
                            <span
                              key={itemIdx}
                              className="text-[9px] font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/5 inline-flex items-center gap-1"
                            >
                              <span className="opacity-60 font-mono text-[8px]">{item.weight}g</span>
                              {getProductName(item, i18n.language)}
                            </span>
                          ))}
                        </div>

                        <p className="text-[8px] text-slate-400 font-medium mt-1.5 leading-tight opacity-90">
                          {t(stepInfo.descKey, { defaultValue: stepInfo.defaultDesc })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Komentarz podsumowujący */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2 text-[9px] text-slate-300">
                <Info size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {hasFiberStep ? (
                    t('meal.sequence_tip', { 
                      defaultValue: 'Błonnik i białko zjedzone na początku posiłku tworzą w żołądku naturalny bufor, który wygładza krzywą uwalniania energii z węglowodanów.' 
                    })
                  ) : (
                    t('meal.sequence_missing_fiber', { 
                      defaultValue: 'Wskazówka: dodanie porcji surowych warzyw na start posiłku pozwoli wytworzyć bufor spowalniający tempo wchłaniania węglowodanów.' 
                    })
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
