import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Utensils, BookOpen, Tag, Sparkles, ChevronRight, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';

import { useMealPlateStore } from '../../stores/useMealPlateStore';

interface CameraModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'plate' | 'menu' | 'label') => void;
  onResumeLastScan?: () => void;
  activeDiet?: string | null;
}

export default function CameraModeModal({
  isOpen,
  onClose,
  onSelectMode,
  onResumeLastScan,
  activeDiet
}: CameraModeModalProps) {
  const { t } = useTranslation();
  const lastAiMealScan = useMealPlateStore(state => state.lastAiMealScan);

  if (!isOpen) return null;

  const modes = [
    {
      id: 'plate' as const,
      title: t('camera.mode_plate_title', { defaultValue: 'Danie na talerzu' }),
      subtitle: t('camera.mode_plate_desc', { defaultValue: 'Zrób zdjęcie gotowej potrawy – AI rozpozna składniki, oszacuje wagę i wyliczy makroskładniki.' }),
      icon: <Utensils size={24} className="text-emerald-500" />,
      badge: t('camera.mode_plate_badge', { defaultValue: 'Gotowy posiłek' }),
      color: 'border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
    },
    {
      id: 'menu' as const,
      title: t('camera.mode_menu_title', { defaultValue: 'Karta dań i Menu restauracji' }),
      subtitle: t('camera.mode_menu_desc', { 
        defaultValue: activeDiet 
          ? `Zrób zdjęcie menu w restauracji – AI przeanalizuje pozycje, profil wchłaniania, zgodność z Twoją dietą (${activeDiet}) i podpowie bolus.`
          : 'Zrób zdjęcie menu w restauracji – AI przeanalizuje pozycje, profil wchłaniania, szacowane węglowodany i podpowiedzi bolusowe.'
      }),
      icon: <BookOpen size={24} className="text-indigo-500" />,
      badge: t('camera.mode_menu_badge', { defaultValue: 'Restauracja i Dieta' }),
      color: 'border-indigo-500/30 hover:border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10',
      highlight: true
    },
    {
      id: 'label' as const,
      title: t('camera.mode_label_title', { defaultValue: 'Etykieta wartości odżywczych' }),
      subtitle: t('camera.mode_label_desc', { defaultValue: 'Zrób zdjęcie tabeli makroskładników z opakowania produktu, aby odczytać dane na 100g.' }),
      icon: <Tag size={24} className="text-amber-500" />,
      badge: t('camera.mode_label_badge', { defaultValue: 'Tabela z opakowania' }),
      color: 'border-amber-500/30 hover:border-amber-500 bg-amber-500/5 dark:bg-amber-500/10'
    }
  ];

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
        >
          {/* Nagłówek */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                <Camera size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {t('camera.modal_title', { defaultValue: 'Wybierz tryb aparatu AI' })}
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('camera.modal_subtitle', { defaultValue: 'Wybierz co chcesz zeskanować' })}
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

          {/* Opcja wznowienia ostatniej analizy ze zdjęcia (by jej nie tracić) */}
          {lastAiMealScan && (
            <div className="p-3.5 rounded-3xl bg-indigo-500/10 dark:bg-indigo-500/15 border-2 border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-indigo-500 animate-pulse" />
                  <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">
                    {t('camera.resume_last_title', { defaultValue: 'Ostatnio rozpoznany posiłek' })}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                  {t('camera.resume_in_memory', { defaultValue: 'W pamięci' })}
                </span>
              </div>
              
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {lastAiMealScan.photo ? (
                    <img 
                      src={lastAiMealScan.photo} 
                      alt="Skan" 
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-indigo-500/20 shadow-sm"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-500">
                      <Utensils size={16} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {lastAiMealScan.result?.mealName || t('auto.posilek_ai', { defaultValue: 'Danie z aparatu' })}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {lastAiMealScan.result?.ingredients?.length 
                        ? `${lastAiMealScan.result.ingredients.length} ${t('camera.ingredients_count', { defaultValue: 'składników' })}`
                        : `${lastAiMealScan.result?.carbs || 0}g W`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    Haptics.success();
                    onClose();
                    onResumeLastScan?.();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-wider shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer flex items-center gap-1 font-display"
                >
                  <span>{t('camera.resume_btn', { defaultValue: 'Wznów' })}</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Lista 3 trybów skanera */}
          <div className="space-y-3">
            {modes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  Haptics.selection();
                  onSelectMode(mode.id);
                }}
                className={cn(
                  "w-full text-left p-4 rounded-3xl border-2 transition-all flex items-center justify-between group active:scale-[0.98] cursor-pointer",
                  mode.color,
                  mode.highlight && "ring-2 ring-indigo-500/20"
                )}
              >
                <div className="flex items-start gap-3.5 pr-2">
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm shrink-0 mt-0.5">
                    {mode.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                        {mode.title}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {mode.badge}
                      </span>
                    </div>
                    <p className="text-xs font-normal text-slate-600 dark:text-slate-400 leading-relaxed">
                      {mode.subtitle}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all">
                  <ChevronRight size={20} />
                </div>
              </button>
            ))}
          </div>

          {/* Stopka z poradą oraz informacją o wartościach poglądowych */}
          <div className="text-center pt-1 space-y-1">
            <span className="text-[11px] font-medium text-slate-400 block">
              💡 {t('camera.hint_footer', { defaultValue: 'AI dopasuje szacunki do Twoich indywidualnych ustawień i aktywnej diety.' })}
            </span>
            <span className="text-[10px] text-slate-400/80 block">
              ⚠️ {t('camera.approximate_note', { defaultValue: 'Wszystkie dane generowane ze zdjęć mają charakter wyłącznie poglądowy.' })}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
