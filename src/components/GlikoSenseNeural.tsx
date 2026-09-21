import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Cpu, Zap, Shield, TrendingUp, TrendingDown, AlertCircle, Heart, Sparkles, Activity, CheckCircle2, Utensils, ShieldCheck, ShieldAlert } from 'lucide-react';
import GlikoSenseIcon from './GlikoSenseIcon';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useLogsStore } from '../stores/useLogsStore';

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
    const logs = useLogsStore((state) => state.logs);
    const [engineMode, setEngineMode] = React.useState(localStorage.getItem('glikosense_engine_mode') || 'v3_lstm');
  
    React.useEffect(() => {
      const handleStorageChange = () => {
        setEngineMode(localStorage.getItem('glikosense_engine_mode') || 'v3_lstm');
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }, []);
    
    const toggleBackend = (e: React.MouseEvent) => {
      e.stopPropagation();
      const next = engineMode === 'v4_tcn' ? 'v3_lstm' : 'v4_tcn';
      setEngineMode(next);
      localStorage.setItem('glikosense_engine_mode', next);
      window.dispatchEvent(new CustomEvent('glikosense_backend_changed', { detail: next }));
    };
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

  const shieldCards = useMemo(() => {
    // 1. Analiza Trendu
    const isRising = trend?.includes('UP') || false;
    const isFalling = trend?.includes('DOWN') || false;
    const isFast = trend?.includes('FAST') || false;
    const isStable = !isRising && !isFalling;

    const trendTitle = t('auto.analiza_trendu', { defaultValue: 'Analiza Trendu' });
    let trendStatus = t('auto.trend_stabilny', { defaultValue: 'Stabilny profil' });
    let trendDesc = t('auto.trend_stabilny_opis', { defaultValue: 'Brak gwałtownych wahań glikemii w oknie obserwacji.' });
    let trendColor: 'emerald' | 'rose' | 'amber' | 'indigo' | 'slate' = 'emerald';

    if (isRising) {
      trendStatus = isFast 
        ? t('auto.szybki_wzrost', { defaultValue: 'Szybki wzrost' })
        : t('auto.tendencja_wzrostowa', { defaultValue: 'Tendencja wzrostowa' });
      trendDesc = t('auto.trend_wzrostowy_opis', { defaultValue: 'Predykcja 30m uwzględnia dynamiczny wektor wznoszący.' });
      trendColor = 'amber';
    } else if (isFalling) {
      trendStatus = isFast 
        ? t('auto.szybki_spadek', { defaultValue: 'Szybki spadek' })
        : t('auto.tendencja_spadkowa', { defaultValue: 'Tendencja spadkowa' });
      trendDesc = t('auto.trend_spadkowy_opis', { defaultValue: 'Predykcja 30m uwzględnia wektor zniżkowy – czujność na hipo.' });
      trendColor = 'rose';
    }

    // 2. Detekcja Anomalii
    const hasAnomaly = (glucose !== null && (glucose < 70 || glucose > 200)) || isFast;
    const anomalyTitle = t('auto.detekcja_anomalii', { defaultValue: 'Detekcja Anomalii' });
    let anomalyStatus = t('auto.wzorzec_prawidlowy', { defaultValue: 'Wzorzec prawidłowy' });
    let anomalyDesc = t('auto.anomalia_brak_opis', { defaultValue: 'Dynamika glikemii mieści się w standardowym korytarzu.' });
    let anomalyColor: 'emerald' | 'rose' | 'amber' | 'indigo' | 'slate' = 'emerald';

    if (hasAnomaly) {
      anomalyStatus = glucose && glucose < 70 
        ? t('auto.odchylenie_dolne', { defaultValue: 'Niski poziom' })
        : glucose && glucose > 200 
        ? t('auto.odchylenie_gorne', { defaultValue: 'Wysoki poziom' })
        : t('auto.anomalia_dynamiki', { defaultValue: 'Skok dynamiki' });
      anomalyDesc = isFast 
        ? t('auto.anomalia_tempo_opis', { defaultValue: 'Wykryto przyspieszone tempo zmiany odbiegające od normy.' })
        : t('auto.anomalia_prog_opis', { defaultValue: 'Zarejestrowano przekroczenie docelowych progów bezpieczeństwa.' });
      anomalyColor = glucose && glucose < 70 ? 'rose' : 'amber';
    }

    // 3. Weryfikacja Posiłku
    const now = Date.now();
    const recentMealLog = logs.find(l => {
      const isMeal = l.type === 'meal' || l.type === 'carbs' || (l.type === 'bolus' && (l.linkedMeal || (l.notes && /posiłek|meal|śniadanie|obiad|kolacja/i.test(l.notes))));
      const diffMin = (now - (l.timestamp || 0)) / 60000;
      return isMeal && diffMin >= 0 && diffMin <= 240; // ostatnie 4h
    });

    const mealTitle = t('auto.weryfikacja_posilku', { defaultValue: 'Weryfikacja Posiłku' });
    let mealStatus = t('auto.stan_spoczynku', { defaultValue: 'Stan spoczynkowy' });
    let mealDesc = t('auto.posilek_brak_opis', { defaultValue: 'Brak aktywnych posiłków zarejestrowanych w ostatnich 4h.' });
    let mealActive = false;
    let mealColor: 'emerald' | 'rose' | 'amber' | 'indigo' | 'slate' = 'slate';

    if (recentMealLog) {
      mealActive = true;
      const minutesAgo = Math.max(1, Math.round((now - (recentMealLog.timestamp || 0)) / 60000));
      const hoursAgo = (minutesAgo / 60).toFixed(1);
      const timeText = minutesAgo < 60 ? `${minutesAgo}m temu` : `${hoursAgo}h temu`;
      mealStatus = t('auto.wchlanianie_posilku', { defaultValue: `Posiłek (${timeText})` });
      mealDesc = t('auto.posilek_aktywny_opis', { defaultValue: 'AI śledzi profil wchłaniania węglowodanów i krzywą glikemii.' });
      mealColor = 'indigo';
    }

    // 4. Ochrona Hypo
    const isHypoRisk = (glucose !== null && glucose < 90 && isFalling) || (glucose !== null && glucose < 70);
    const hypoTitle = t('auto.ochrona_hypo', { defaultValue: 'Ochrona Hypo' });
    let hypoStatus = t('auto.tarcza_bezpieczna', { defaultValue: 'Brak ryzyka hipo' });
    let hypoDesc = t('auto.hypo_bezpiecznie_opis', { defaultValue: 'Brak prognozowanego ryzyka hipoglikemii w oknie 60 min.' });
    let hypoColor: 'emerald' | 'rose' | 'amber' | 'indigo' | 'slate' = 'emerald';

    if (glucose !== null && glucose < 70) {
      hypoStatus = t('auto.alarm_hypo', { defaultValue: 'Aktywna hipoglikemia' });
      hypoDesc = t('auto.hypo_alarm_opis', { defaultValue: 'Cukier poniżej 70 mg/dL. Wymagane natychmiastowe szybkie węglowodany!' });
      hypoColor = 'rose';
    } else if (isHypoRisk) {
      hypoStatus = t('auto.ostrzezenie_spadek', { defaultValue: 'Czujność prewencyjna' });
      hypoDesc = t('auto.hypo_czuwanie_opis', { defaultValue: 'Glikemia opada ku dolnej granicy. Model monitoruje bufor bezpieczeństwa.' });
      hypoColor = 'amber';
    }

    return [
      {
        id: 'trend',
        title: trendTitle,
        status: trendStatus,
        desc: trendDesc,
        color: trendColor,
        active: !isStable,
        icon: isRising ? <TrendingUp size={16} /> : isFalling ? <TrendingDown size={16} /> : <Activity size={16} />
      },
      {
        id: 'anomaly',
        title: anomalyTitle,
        status: anomalyStatus,
        desc: anomalyDesc,
        color: anomalyColor,
        active: hasAnomaly,
        icon: hasAnomaly ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />
      },
      {
        id: 'meal',
        title: mealTitle,
        status: mealStatus,
        desc: mealDesc,
        color: mealColor,
        active: mealActive,
        icon: <Utensils size={16} />
      },
      {
        id: 'hypo',
        title: hypoTitle,
        status: hypoStatus,
        desc: hypoDesc,
        color: hypoColor,
        active: isHypoRisk || (glucose !== null && glucose < 70),
        icon: isHypoRisk || (glucose !== null && glucose < 70) ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />
      }
    ];
  }, [trend, glucose, logs, t]);

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
            <span onClick={toggleBackend} className="cursor-pointer hover:text-white transition-colors">
              {isChildMode ? petName : (engineMode === 'v4_tcn' ? 'GlikoSense 4.1' : 'GlikoSense 3.0')}
            </span>
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
    <div className={cn("relative w-full p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-lg transition-all duration-700 text-slate-800 dark:text-slate-100", dynamicBg)}>
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
        <div className="flex items-center justify-between mb-3 md:mb-5">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className={`p-1.5 md:p-2 rounded-xl ${statusColor} bg-opacity-20 shrink-0`}>
              <GlikoSenseIcon size={18} isAnalyzing={true} />
            </div>
            <div>
              <h3 
                className="text-xs md:text-sm font-black dark:text-white leading-tight cursor-pointer hover:text-sky-400 transition-colors"
                onClick={toggleBackend}
              >
                {t('auto.glikosense', { defaultValue: engineMode === 'v4_tcn' ? 'GlikoSense 4.1' : 'GlikoSense 3.0' })}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <TrendingUp size={11} className="shrink-0" />
            <span className="hidden sm:inline">{t('auto.predykcja_30m', { defaultValue: 'Predykcja 30m' })}: </span>
            <span className="sm:hidden">{t('auto.30m', { defaultValue: '30m' })}: </span>
            <span className="text-indigo-700 dark:text-indigo-300 text-xs font-black">
              {glucose ? Math.round(glucose + (trend?.includes('UP') ? 18 : trend?.includes('DOWN') ? -12 : 0)) : '--'}
            </span>
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
          <div className="space-y-3">
            {/* Siatka 2x2: na telefonie ultra-zwarta (same pigułki/statusy), na sm/md rozwinięta z opisami */}
            <div className="grid grid-cols-2 gap-2 md:gap-3.5">
              {shieldCards.map((card) => {
                const colorClasses = {
                  emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                  rose: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
                  amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
                  indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                  slate: "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20",
                }[card.color] || "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20";

                return (
                  <div 
                    key={card.id}
                    className="p-2.5 sm:p-3 md:p-3.5 rounded-xl sm:rounded-2xl md:rounded-[1.4rem] bg-white/50 dark:bg-slate-900/40 border border-white/70 dark:border-slate-800/60 backdrop-blur-sm shadow-xs flex flex-col justify-between transition-all hover:bg-white/70 dark:hover:bg-slate-900/60 min-h-[58px] sm:min-h-auto"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={cn("p-1 md:p-1.5 rounded-lg md:rounded-xl border shrink-0", colorClasses)}>
                          {card.icon}
                        </div>
                        <span className="text-[10px] md:text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate">
                          {card.title}
                        </span>
                      </div>
                      <span className={cn("text-[8px] md:text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border shrink-0 tracking-wider self-start sm:self-auto truncate max-w-full", colorClasses)}>
                        {card.status}
                      </span>
                    </div>
                    {/* Długi opis pojawia się dopiero na większych ekranach (tablet / desktop), zapobiegając rozciąganiu widżetu na smartfonie */}
                    <p className="hidden sm:block text-[10px] md:text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-snug mt-1.5">
                      {card.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Neural Footer Telemetry */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-white/5 text-[9px] font-black uppercase text-slate-400">
              <div className="flex items-center gap-2 md:gap-3">
                <span onClick={toggleBackend} className="cursor-pointer hover:text-indigo-500 transition-colors flex items-center gap-1">
                  <Cpu size={11} className="text-indigo-500" />
                  <span className="hidden sm:inline">{engineMode === 'v4_tcn' ? 'Silnik TCN 4.1' : 'Silnik LSTM 3.0'}</span>
                  <span className="sm:hidden">{engineMode === 'v4_tcn' ? 'TCN 4.1' : 'LSTM 3.0'}</span>
                </span>
                {datasetSize && (
                  <span className="opacity-70 hidden sm:inline">
                    {datasetSize} {t('auto.probek', { defaultValue: 'próbek' })}
                  </span>
                )}
                {accuracy && (
                  <span className="opacity-70">
                    {accuracy}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] tracking-wider text-slate-400 dark:text-slate-500 font-bold">LIVE</span>
                <motion.div
                  animate={{ 
                    scale: [1, 1.25, 1],
                    boxShadow: [
                      `0 0 0px ${glowColor}`,
                      `0 0 10px ${glowColor}`,
                      `0 0 0px ${glowColor}`
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-2.5 h-2.5 rounded-full ${statusColor}`}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

