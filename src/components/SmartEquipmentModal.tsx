import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplet, Signal, Cylinder, X, Check, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { Haptics } from '../lib/haptics';

interface SmartEquipmentModalProps {
  type: 'reservoir' | 'sensor' | null;
  onClose: () => void;
  onConfirm: (replaceInfusionSet: boolean) => void;
}

export function SmartEquipmentModal({ type, onClose, onConfirm }: SmartEquipmentModalProps) {
  const { t } = useTranslation();
  const [replaceInfusionSet, setReplaceInfusionSet] = useState(false);

  useEffect(() => {
    if (type) {
      Haptics.impact();
    }
  }, [type]);

  if (!type) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] -mr-16 -mt-16 pointer-events-none" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col items-center text-center mt-2">
            <div className={cn(
              "p-4 rounded-3xl mb-4 shadow-lg",
              type === 'reservoir' ? "bg-purple-500 text-white shadow-purple-500/30" : "bg-violet-500 text-white shadow-violet-500/30"
            )}>
              {type === 'reservoir' ? <Cylinder size={32} /> : <Signal size={32} />}
            </div>

            <h2 className="text-lg font-black dark:text-white uppercase tracking-wider mb-2">
              {type === 'reservoir' 
                ? t('auto.wykryto_uzupelnienie_insuliny', { defaultValue: 'Wykryto skok insuliny' }) 
                : t('auto.wykryto_przerwe_cgm', { defaultValue: 'Wykryto przerwę w CGM' })
              }
            </h2>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6">
              {type === 'reservoir'
                ? t('auto.czy_wymieniles_zbiorniczek_pytanie', { defaultValue: 'Zauważyliśmy nagły skok insuliny w pompie. Czy właśnie wymieniłeś zbiorniczek?' })
                : t('auto.czy_wymieniles_sensor_pytanie', { defaultValue: 'Zauważyliśmy ponad godzinną lukę w odczytach cukru. Czy założyłeś nowy sensor?' })
              }
            </p>

            {type === 'reservoir' && (
              <div className="w-full mb-6 text-left">
                <button
                  onClick={() => {
                    setReplaceInfusionSet(!replaceInfusionSet);
                    Haptics.light();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                    replaceInfusionSet 
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-400" 
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Droplet size={18} className={replaceInfusionSet ? "text-cyan-500" : "text-slate-400"} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {t('auto.wymienilem_tez_wklucie', { defaultValue: 'Wymieniłem też wkłucie' })}
                    </span>
                  </div>
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-colors border",
                    replaceInfusionSet ? "bg-cyan-500 border-cyan-500 text-white" : "border-slate-300 dark:border-slate-600 bg-transparent"
                  )}>
                    {replaceInfusionSet && <Check size={14} />}
                  </div>
                </button>
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                {t('auto.nie_to_blad', { defaultValue: 'Nie, to błąd' })}
              </button>
              <button
                onClick={() => onConfirm(replaceInfusionSet)}
                className={cn(
                  "flex-[1.5] py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg",
                  type === 'reservoir' ? "bg-purple-600 hover:bg-purple-500 shadow-purple-600/20" : "bg-violet-600 hover:bg-violet-500 shadow-violet-600/20"
                )}
              >
                {t('auto.tak_wymienilem', { defaultValue: 'Tak, wymieniłem' })}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
