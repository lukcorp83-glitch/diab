import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Cpu, Zap, Shield, TrendingUp, AlertCircle, Heart, Sparkles } from 'lucide-react';
import GlikoSenseIcon from './GlikoSenseIcon';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface NeuralNode {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface GlikoSenseNeuralProps {
  glucose: number | null;
  trend: string | null;
  isChildMode: boolean;
  petName?: string;
  accuracy?: number;
  datasetSize?: number;
  children?: React.ReactNode;
  compact?: boolean;
}

export default function GlikoSenseNeural({ glucose, trend, isChildMode, petName = 'Gliko', accuracy = 88.2, datasetSize, children, compact }: GlikoSenseNeuralProps) {
    const { t } = useTranslation();
  // Generate stable random nodes for the background animation
  const nodes = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2
    }));
  }, []);

  const nextTarget = useMemo(() => {
    if (!datasetSize) return 300;
    const targets = [300, 1000, 3000, 10000, 25000, 50000, 100000];
    return targets.find(t => datasetSize < t) || (Math.floor(datasetSize / 50000) + 1) * 50000;
  }, [datasetSize]);

  const statusColor = useMemo(() => {
    if (!glucose) return 'bg-slate-400';
    if (glucose < 70) return 'bg-rose-500';
    if (glucose > 180) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [glucose]);

  const glowColor = useMemo(() => {
    if (!glucose) return 'rgba(148, 163, 184, 0.5)';
    if (glucose < 70) return 'rgba(244, 63, 94, 0.5)';
    if (glucose > 180) return 'rgba(245, 158, 11, 0.5)';
    return 'rgba(16, 185, 129, 0.5)';
  }, [glucose]);

  const dynamicBg = useMemo(() => {
    const isHigh = glucose && glucose > 180;
    const isLow = glucose && (glucose < 70 || glucose < 55);
    const rising = trend === 'DoubleUp' || trend === 'SingleUp' || trend === 'FortyFiveUp';
    const dropping = trend === 'DoubleDown' || trend === 'SingleDown' || trend === 'FortyFiveDown';

    if (isHigh || rising) {
      // Soft, warm golden-coral tint for high glucose or rapid rise
      return "bg-gradient-to-br from-orange-50/90 via-rose-50/80 to-amber-50/70 dark:from-orange-950/20 dark:via-red-950/15 dark:to-orange-950/20 border border-orange-100/80 dark:border-orange-900/30 shadow-orange-500/5";
    }
    if (isLow || dropping) {
      // Soft, warm sand-rose tint for low glucose or rapid fall
      return "bg-gradient-to-br from-yellow-50/90 via-orange-50/80 to-rose-50/80 dark:from-yellow-950/25 dark:via-red-950/20 dark:to-yellow-950/20 border border-yellow-100/80 dark:border-red-900/30 shadow-yellow-500/5";
    }
    // Deep premium soft teal-blue for stable/in-range
    return "bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-950/25 border border-teal-100 dark:border-teal-900/30";
  }, [glucose, trend]);

  if (compact) {
    return (
      <div className={cn("relative w-full p-4 rounded-[2.5rem] overflow-hidden shadow-lg transition-all duration-700 text-slate-800 dark:text-slate-100 h-full flex flex-col justify-between min-h-[160px]", dynamicBg)}>
        {/* Neural Background Animation */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
          {nodes.map((node, i) => {
            const nextNode = nodes[(i + 1) % nodes.length];
            return (
              <line
                key={`line-compact-${node.id}`}
                x1={`${node.x}%`}
                y1={`${node.y}%`}
                x2={`${nextNode.x}%`}
                y2={`${nextNode.y}%`}
                stroke={statusColor.replace('bg-', '') === 'slate-400' ? '#94a3b8' : statusColor.replace('bg-', '') === 'rose-500' ? '#f43f5e' : statusColor.replace('bg-', '') === 'amber-500' ? '#f59e0b' : '#10b981'}
                strokeWidth="0.5"
                style={{ opacity: 0.2 }}
              />
            );
          })}
        </svg>

        <div className="relative z-10 flex flex-col justify-between h-full flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className={`p-1 rounded-lg ${statusColor} bg-opacity-20`}>
                <GlikoSenseIcon size={14} isAnalyzing={true} />
              </div>
              <span className="text-[10px] font-black dark:text-white leading-none">{t('auto.glikosense', { defaultValue: 'GlikoSense' })}</span>
            </div>
            
            <div className="flex items-center gap-1 scale-75 origin-right">
              {[1, 2, 3].map(i => (
                <motion.div 
                  key={`link-compact-${i}`}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                  className={`w-1 h-2 rounded-full ${statusColor} opacity-40`}
                />
              ))}
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 flex flex-col justify-center my-1">
            {isChildMode ? (
              <div className="scale-90 origin-center my-auto">
                {children}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-2 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-white/60 dark:border-slate-800/40 backdrop-blur-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">{t('auto.predykcja', { defaultValue: 'Predykcja:' })}</span>
                    <span className="text-xs font-black dark:text-white">
                      {glucose ? Math.round(glucose + (trend?.includes('UP') ? 18 : trend?.includes('DOWN') ? -12 : 0)) : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">{t('auto.pewność', { defaultValue: i18n.t('auto.pewnosc', { defaultValue: "Pewność:" }) })}</span>
                    <span className="text-xs font-black dark:text-white">{accuracy}%</span>
                  </div>
                </div>
                <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-wider">
                  {glucose && (glucose > 250 || glucose < 60) ? '⚠️ Ryzyko' : '✅ Stabilny'}
                </div>
              </div>
            )}
          </div>

          {/* Footer status dot */}
          <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-white/5 pt-1.5 text-[8px] font-black uppercase text-slate-400">
            <span>{isChildMode ? petName : 'GlikoSense AI'}</span>
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                boxShadow: [
                  `0 0 0px ${glowColor}`,
                  `0 0 10px ${glowColor}`,
                  `0 0 0px ${glowColor}`
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-2 h-2 rounded-full ${statusColor}`}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full p-6 rounded-[2.5rem] overflow-hidden shadow-lg transition-all duration-700 text-slate-800 dark:text-slate-100", dynamicBg)}>
      {/* Neural Background Animation */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
        {nodes.map((node, i) => {
          const nextNode = nodes[(i + 1) % nodes.length];
          return (
            <motion.line
              key={`line-${node.id}`}
              x1={`${node.x}%`}
              y1={`${node.y}%`}
              x2={`${nextNode.x}%`}
              y2={`${nextNode.y}%`}
              stroke={statusColor.replace('bg-', '') === 'slate-400' ? '#94a3b8' : statusColor.replace('bg-', '') === 'rose-500' ? '#f43f5e' : statusColor.replace('bg-', '') === 'amber-500' ? '#f59e0b' : '#10b981'}
              strokeWidth="0.5"
              animate={{ opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <motion.div
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.6, 0.3],
                x: [`${node.x}%`, `${node.x + 2}%`, `${node.x}%`],
                y: [`${node.y}%`, `${node.y - 2}%`, `${node.y}%`]
              }}
              transition={{ 
                duration: 4 + Math.random() * 4, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
              className={`absolute rounded-full ${statusColor}`}
              style={{ 
                width: node.size, 
                height: node.size,
                left: `${node.x}%`,
                top: `${node.y}%`
              }}
            />
            {/* Flying Data Packet */}
            {i % 3 === 0 && (
              <motion.div
                animate={{ 
                  x: [`${node.x}%`, `${(node.x + 40) % 100}%`],
                  y: [`${node.y}%`, `${(node.y + 30) % 100}%`],
                  opacity: [0, 1, 0]
                }}
                transition={{ duration: 6, repeat: Infinity, delay: Math.random() * 5 }}
                className={`absolute w-1 h-1 rounded-full ${statusColor} blur-[1px]`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${statusColor} bg-opacity-20`}>
              <GlikoSenseIcon size={20} isAnalyzing={true} />
            </div>
            <div>
              <h3 className="text-sm font-black dark:text-white leading-tight">{t('auto.glikosense', { defaultValue: 'GlikoSense' })}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {isChildMode ? i18n.t('auto.opiekun', { defaultValue: 'Opiekun ' }) + petName : i18n.t('auto.analiza_systemowa_ai', { defaultValue: 'Analiza Systemowa AI' })}
              </p>
            </div>
          </div>
          {/* Neural Pulse Insight */}
          {!isChildMode && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden md:flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl"
            >
              <Sparkles size={10} className="text-indigo-500 animate-pulse" />
              <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
                
                                              {t('auto.system_analizuje_trendy', { defaultValue: 'System analizuje trendy...' })}
                                            </span>
            </motion.div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
               {[1, 2, 3].map(i => (
                 <motion.div 
                   key={`link-${i}`}
                   animate={{ opacity: [0.3, 1, 0.3] }}
                   transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                   className={`w-1 h-3 rounded-full ${statusColor} opacity-40`}
                 />
               ))}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{t('auto.live', { defaultValue: 'Live' })}</span>
              {datasetSize !== undefined && datasetSize < 300 && (
                <div className="flex items-center gap-1">
                  <motion.div 
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-1 h-1 rounded-full bg-indigo-500"
                  />
                  <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest">{t('auto.training', { defaultValue: 'Training...' })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {isChildMode ? (
          <div className="space-y-4">
            {children}
            <div className="p-4 rounded-3xl bg-white/40 dark:bg-slate-900/30 border border-white/60 dark:border-slate-800/40 backdrop-blur-sm glass-target">
               <div className="flex items-start gap-3">
                 <div className="mt-1">
                   <Heart className="text-rose-500 fill-rose-500" size={16} />
                 </div>
                 <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                   {glucose && glucose < 70 
                     ? i18n.t('auto.glikosense_czuje_ze_var0', { defaultValue: "GlikoSense czuje, że {{var0}} traci siły! Szybko, zjedzmy coś pysznego, żeby go rozweselić. 🍎", var0: petName })
                     : glucose && glucose > 180
                     ? i18n.t('auto.var0_pije_teraz_duzo_wody', { defaultValue: "{{var0}} pije teraz dużo wody. Może pobawimy się w coś spokojnego? GlikoSense czuwa. 💧", var0: petName })
                     : i18n.t('auto.glikosense_swieci_na_ziel', { defaultValue: "GlikoSense świeci na zielono! {{var0}} czuje się świetnie i jest gotowy na zabawę! 🌟", var0: petName })}
                 </p>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Zap className="text-indigo-500" size={12} />
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{t('auto.więź', { defaultValue: i18n.t('auto.wiez', { defaultValue: "Więź" }) })}</span>
                </div>
                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div animate={{ width: '92%' }} className="h-full bg-indigo-500" />
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Shield className="text-emerald-500" size={12} />
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">{t('auto.tarcza', { defaultValue: 'Tarcza' })}</span>
                </div>
                <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div animate={{ width: '100%' }} className="h-full bg-emerald-500" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Key Functions Indicators */}
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { label: i18n.t('auto.analiza_trendu', { defaultValue: 'Analiza Trendu' }), active: trend !== 'STABLE' && trend !== null },
                { label: i18n.t('auto.detekcja_anomalii', { defaultValue: 'Detekcja Anomalii' }), active: (glucose !== null && (glucose < 70 || glucose > 200)) || (trend?.includes('FAST')) },
                { label: i18n.t('auto.weryfikacja_posilku', { defaultValue: i18n.t('auto.weryfikacja_posilku', { defaultValue: "Weryfikacja Posiłku" }) }), active: false }, // Will be linked to recent logs in next step if needed
                { label: i18n.t('auto.ochrona_hypo', { defaultValue: 'Ochrona Hypo' }), active: glucose !== null && (glucose < 90 || (glucose < 110 && trend?.includes('DOWN'))) }
              ].map(fn => (
                <div 
                  key={fn.label}
                  className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${
                    fn.active 
                      ? `${statusColor} text-white border-transparent shadow-sm` 
                      : 'bg-white/30 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 border-slate-200/70 dark:border-slate-800/40'
                  }`}
                >
                  {fn.label}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('auto.stabilność_systemu', { defaultValue: i18n.t('auto.stabilnosc_systemu', { defaultValue: "Stabilność Systemu" }) })}</div>
                <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: glucose && (glucose > 180 || glucose < 70) ? '60%' : '94%' }}
                    className={`absolute inset-y-0 ${statusColor}`}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('auto.pewność', { defaultValue: i18n.t('auto.pewnosc', { defaultValue: "Pewność" }) })}</div>
                <div className="text-sm font-black dark:text-white">{accuracy !== undefined ? `${accuracy}%` : '---'}</div>
              </div>
            </div>

            {datasetSize !== undefined && (
              <div className="space-y-2 px-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="text-indigo-500"
                    >
                      <Sparkles size={10} />
                    </motion.div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('auto.postęp_nauki', { defaultValue: i18n.t('auto.postep_nauki', { defaultValue: "Postęp Nauki:" }) })}</span>
                  </div>
                  <span className="text-[9px] font-black text-indigo-500">{datasetSize}  {t('auto.pkt', { defaultValue: 'pkt /' })} {nextTarget}  {t('auto.pkt', { defaultValue: 'pkt' })}</span>
                </div>
                <div className="relative h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (datasetSize / nextTarget) * 100)}%` }}
                    className="absolute inset-y-0 bg-gradient-to-r from-indigo-500 to-purple-500"
                  />
                  {/* Learning Waves */}
                  <motion.div 
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                  />
                </div>
                <p className="text-[8px] font-bold text-slate-400 leading-tight">
                  {datasetSize < 300 ? i18n.t('auto.model_w_fazie_bazowej_gromadze', { defaultValue: i18n.t('auto.model_w_fazie_bazowej_gro', { defaultValue: "Model w fazie bazowej. Gromadzę dane..." }) }) : 
                   datasetSize < 1000 ? i18n.t('auto.model_uczy_sie_twoich_nawykow', { defaultValue: i18n.t('auto.model_uczy_sie_twoich_naw', { defaultValue: "Model uczy się Twoich nawyków. Coraz wyższa precyzja." }) }) :
                   datasetSize < 3000 ? i18n.t('auto.model_wysoko_wyuczony_rozpozna', { defaultValue: i18n.t('auto.model_wysoko_wyuczony_roz', { defaultValue: "Model wysoko wyuczony. Rozpoznaję subtelne wzorce biologiczne." }) }) :
                   "Model klasy mistrzowskiej. Ekstremalna precyzja analityczna."}
                </p>
              </div>
            )}

            <div className="p-4 rounded-3xl bg-white/40 dark:bg-slate-900/30 border border-white/60 dark:border-slate-800/40 backdrop-blur-sm grid grid-cols-2 gap-4 glass-target">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <TrendingUp size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('auto.predykcja_30m', { defaultValue: 'Predykcja 30m' })}</span>
                </div>
                <div className="text-lg font-black dark:text-white">
                  {glucose ? Math.round(glucose + (trend?.includes('UP') ? 18 : trend?.includes('DOWN') ? -12 : 0)) : '--'} 
                  <span className="text-[10px] text-slate-400 ml-1">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
                </div>
              </div>
              <div className="space-y-1 border-l border-slate-200 dark:border-slate-700 pl-4">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <AlertCircle size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('auto.status_rdzenia', { defaultValue: 'Status Rdzenia' })}</span>
                </div>
                <div className="text-lg font-black dark:text-white">
                  {glucose && (glucose > 250 || glucose < 60) ? 'RYZYKO' : 'NOMINALNY'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Neural Activity Pulse */}
        <div className="mt-6 flex justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              boxShadow: [
                `0 0 0px ${glowColor}`,
                `0 0 20px ${glowColor}`,
                `0 0 0px ${glowColor}`
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`w-3 h-3 rounded-full ${statusColor}`}
          />
        </div>
      </div>
    </div>
  );
}
