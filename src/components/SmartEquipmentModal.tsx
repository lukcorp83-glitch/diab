import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplet, Signal, Cylinder, X, Check, ArrowRight, Sparkles, MapPin, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { Haptics } from '../lib/haptics';
import { ANATOMICAL_ZONES, calculateTissueRecovery, getNextRecommendedSite, getZoneById, AnatomicalZone } from '../services/siteRotationService';
import { LogEntry, UserSettings } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { requireParentalAuth } from '../lib/childPermissions';

interface SmartEquipmentModalProps {
  type: 'reservoir' | 'sensor' | null;
  logs?: LogEntry[];
  userSettings?: UserSettings;
  onClose: () => void;
  onConfirm: (replaceInfusionSet: boolean, selectedSite?: string) => void;
}

export function SmartEquipmentModal({ type, logs = [], userSettings, onClose, onConfirm }: SmartEquipmentModalProps) {
  const { t } = useTranslation();
  useBackButton(!!type, onClose);
  const [replaceInfusionSet, setReplaceInfusionSet] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [showAllSites, setShowAllSites] = useState(false);

  // Obliczamy regenerację tkanek i rekomendowane miejsce
  const currentSiteName = userSettings?.infusionSetSite || userSettings?.infusionSite || localStorage.getItem('infusionSetSite') || localStorage.getItem('infusionSite') || 'Prawy brzuch';
  const sensorSite = userSettings?.sensorSite || localStorage.getItem('sensorSite') || '';
  const allowedSites = userSettings?.allowedInfusionSites;

  const recoveryMap = useMemo(() => {
    return calculateTissueRecovery(logs, currentSiteName, userSettings?.infusionSetChangeDate);
  }, [logs, currentSiteName, userSettings?.infusionSetChangeDate]);

  const recommended = useMemo(() => {
    return getNextRecommendedSite(currentSiteName, allowedSites, sensorSite, recoveryMap, logs);
  }, [logs, currentSiteName, recoveryMap, allowedSites, sensorSite]);

  useEffect(() => {
    if (type) {
      Haptics.impact();
      if (recommended?.zone) {
        setSelectedSiteId(recommended.zone.id);
      }
    }
  }, [type, recommended]);

  const selectedZone = useMemo(() => {
    return ANATOMICAL_ZONES.find(z => z.id === selectedSiteId) || recommended?.zone || ANATOMICAL_ZONES[0];
  }, [selectedSiteId, recommended]);

  if (!type) return null;

  const handleConfirmAction = () => {
    requireParentalAuth(userSettings, 'canEditEquipment', {
      title: type === 'sensor' ? 'Wymiana Sensora 📡' : 'Wymiana Zbiorniczka 💉',
      description: 'Modyfikacja daty osprzętu wymaga autoryzacji Opiekuna. Podaj PIN rodzica, aby zatwierdzić.',
      onSuccess: () => {
        Haptics.medium();
        onConfirm(replaceInfusionSet, replaceInfusionSet ? (selectedZone?.name || selectedSiteId) : undefined);
      }
    });
  };

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
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[40px] -mr-16 -mt-16 pointer-events-none" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors z-10"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col items-center text-center mt-2 overflow-y-auto no-scrollbar pr-0.5">
            <div className={cn(
              "p-4 rounded-3xl mb-4 shadow-lg shrink-0",
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
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-5">
              {type === 'reservoir'
                ? t('auto.czy_wymieniles_zbiorniczek_pytanie', { defaultValue: 'Zauważyliśmy nagły skok insuliny w pompie. Czy właśnie wymieniłeś zbiorniczek?' })
                : t('auto.czy_wymieniles_sensor_pytanie', { defaultValue: 'Zauważyliśmy ponad godzinną lukę w odczytach cukru. Czy założyłeś nowy sensor?' })
              }
            </p>

            {type === 'reservoir' && (
              <div className="w-full mb-5 text-left space-y-3">
                {/* Przełącznik: Wymieniłem też wkłucie */}
                <button
                  onClick={() => {
                    setReplaceInfusionSet(!replaceInfusionSet);
                    Haptics.light();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                    replaceInfusionSet 
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-400 shadow-sm" 
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

                {/* Wybór strefy wkłucia przy zaznaczonej wymianie wkłucia */}
                <AnimatePresence>
                  {replaceInfusionSet && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-2 pt-1"
                    >
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <MapPin size={12} className="text-indigo-500" />
                          <span>{t('auto.miejsce_nowego_wklucia', { defaultValue: 'Miejsce nowego wkłucia' })}</span>
                        </label>
                        {recommended?.zone?.id === selectedSiteId && (
                          <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles size={10} />
                            <span>{t('auto.rekomendacja_ai', { defaultValue: 'Sugerowane' })}</span>
                          </span>
                        )}
                      </div>

                      {/* Rozwijana lista stref */}
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                        {ANATOMICAL_ZONES.map(zone => {
                          const isSelected = selectedSiteId === zone.id;
                          const rec = recoveryMap.get(zone.id);
                          const isFresh = rec?.status === 'fresh';
                          const isTired = rec?.status === 'tired';
                          const isSensorCollision = sensorSite && (zone.id === sensorSite || zone.name.toLowerCase().includes(sensorSite.toLowerCase()));

                          return (
                            <button
                              key={zone.id}
                              type="button"
                              onClick={() => {
                                Haptics.selection();
                                setSelectedSiteId(zone.id);
                              }}
                              className={cn(
                                "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all relative overflow-hidden",
                                isSelected
                                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20"
                                  : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-indigo-300"
                              )}
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <span className="text-[11px] font-bold truncate pr-1">
                                  {zone.name}
                                </span>
                                {isSelected && <Check size={12} className="shrink-0 text-white" />}
                              </div>

                              <div className="flex items-center gap-1.5 w-full">
                                <span className={cn(
                                  "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md",
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : isFresh
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : isTired
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                )}>
                                  {rec?.status === 'fresh' ? 'Wypoczęta' : rec?.status === 'recovering' ? 'Regeneracja' : 'Zmęczona'}
                                </span>
                                <span className={cn(
                                  "text-[8px] font-bold opacity-75",
                                  isSelected ? "text-white/80" : "text-slate-400"
                                )}>
                                  {rec?.daysSinceLastUse !== null ? (rec.daysSinceLastUse >= 30 ? '>30d' : rec.daysSinceLastUse + 'd') : 'nowa'}
                                </span>
                              </div>

                              {isSensorCollision && (
                                <span className="absolute bottom-1 right-1 text-[7px] font-black bg-amber-500 text-slate-950 px-1 rounded">
                                  SENSOR
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Krótki opis wybranej strefy */}
                      {selectedZone && (
                        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 text-[10px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                          <span className="font-semibold">{selectedZone.absorptionDesc}</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ml-2",
                            selectedZone.absorptionSpeed === 'fast' ? "bg-emerald-500/15 text-emerald-600" :
                            selectedZone.absorptionSpeed === 'medium' ? "bg-amber-500/15 text-amber-600" : "bg-blue-500/15 text-blue-600"
                          )}>
                            {selectedZone.absorptionSpeed === 'fast' ? '⚡ Szybkie' : selectedZone.absorptionSpeed === 'medium' ? '⏱️ Średnie' : '🌙 Wolne'}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
              >
                {t('auto.nie_to_blad', { defaultValue: 'Nie, to błąd' })}
              </button>
              <button
                onClick={handleConfirmAction}
                className={cn(
                  "flex-[1.5] py-3.5 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer",
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
