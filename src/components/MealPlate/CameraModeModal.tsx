import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Utensils, BookOpen, Tag, Sparkles, ChevronRight, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';

interface CameraModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'plate' | 'menu' | 'label') => void;
  activeDiet?: string | null;
}

export default function CameraModeModal({
  isOpen,
  onClose,
  onSelectMode,
  activeDiet
}: CameraModeModalProps) {
  const { t } = useTranslation();

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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5"
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

          <div className="text-center pt-1">
            <span className="text-[11px] font-medium text-slate-400">
              💡 {t('camera.hint_footer', { defaultValue: 'AI dopasuje szacunki do Twoich indywidualnych ustawień i aktywnej diety.' })}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
