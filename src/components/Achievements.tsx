import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Medal, Trophy, Star, Target, Zap, ChevronLeft, Flame, Award, Clock, Coins, CheckCircle2 } from 'lucide-react';
import { LogEntry } from '../types';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface AchievementsProps {
  logs: LogEntry[];
  user: any;
  setTab: (t: string) => void;
  petData?: any;
}

export default function Achievements({ logs, user, setTab, petData }: AchievementsProps) {
    const { t } = useTranslation();
  
  // Calculate stats to determine unlocked achievements
  const stats = useMemo(() => {
    const mealLogs = logs.filter(l => l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal?.carbs));
    const glucoseLogs = logs.filter(l => l.type === 'glucose');
    const bolusLogs = logs.filter(l => l.type === 'bolus');
    
    // Dates grouped by day
    const datesWithMeals = new Set(mealLogs.map(l => new Date(l.timestamp).toLocaleDateString()));
    const datesWithGlucose = new Set(glucoseLogs.map(l => new Date(l.timestamp).toLocaleDateString()));
    
    // Time in range
    const inRange = glucoseLogs.filter(l => l.value >= 70 && l.value <= 140).length;
    const tirRatio = glucoseLogs.length > 0 ? (inRange / glucoseLogs.length) * 100 : 0;

    // Time-based readings
    const nightReadings = glucoseLogs.filter(l => {
      const h = new Date(l.timestamp).getHours();
      return h >= 0 && h <= 4;
    }).length;

    const morningReadings = glucoseLogs.filter(l => {
      const h = new Date(l.timestamp).getHours();
      return h >= 5 && h <= 7;
    }).length;

    // Detailed meals (containing fat & protein - advanced)
    const detailedMeals = mealLogs.filter(l => (l.fat ?? 0) > 0 || (l.protein ?? 0) > 0).length;
    
    return {
      totalMeals: mealLogs.length,
      totalBoluses: bolusLogs.length,
      totalGlucose: glucoseLogs.length,
      daysWithMeals: datesWithMeals.size,
      daysWithGlucose: datesWithGlucose.size,
      tirRatio,
      nightReadings,
      morningReadings,
      detailedMeals,
      petLevel: petData?.level || 0,
      petCoins: petData?.coins || 0,
      completedQuests: petData?.completedQuests?.length || 0
    };
  }, [logs, petData]);

  const achievements = useMemo(() => [
    {
      id: "first_meal",
      title: "Pierwsze Danie",
      description: i18n.t('auto.zapisz_swoj_pierwszy_posilek_w', { defaultValue: i18n.t('auto.zapisz_swoj_pierwszy_posi', { defaultValue: "Zapisz swój pierwszy posiłek w aplikacji." }) }),
      icon: <UtensilsIcon className="w-8 h-8 text-amber-500" />,
      color: "bg-amber-500",
      unlocked: stats.totalMeals >= 1,
      progress: Math.min(stats.totalMeals, 1),
      max: 1
    },
    {
      id: "detailed_meal",
      title: "Dietetyk WBT",
      description: i18n.t('auto.oblicz_10_posilkow_z_uwzgledni', { defaultValue: i18n.t('auto.oblicz_10_posilkow_z_uwzg', { defaultValue: "Oblicz 10 posiłków z uwzględnieniem tłuszczów i białek (WBT)." }) }),
      icon: <Trophy className="w-8 h-8 text-orange-500" />,
      color: "bg-orange-500",
      unlocked: stats.detailedMeals >= 10,
      progress: Math.min(stats.detailedMeals, 10),
      max: 10
    },
    {
      id: "tir_master",
      title: "Snajper Glikemiczny",
      description: i18n.t('auto.osiagnij_ponad_65_czasu_w_norm', { defaultValue: i18n.t('auto.osiagnij_ponad_65_czasu_w', { defaultValue: "Osiągnij ponad 65% czasu w normie." }) }),
      icon: <Target className="w-8 h-8 text-emerald-500" />,
      color: "bg-emerald-500",
      unlocked: stats.totalGlucose > 8 && stats.tirRatio >= 65,
      progress: stats.totalGlucose > 0 ? Math.min(stats.tirRatio, 65) : 0,
      max: 65
    },
    {
      id: "tir_ninja",
      title: "Cukrowy Ninja",
      description: i18n.t('auto.osiagnij_ponad_80_czasu_w_norm', { defaultValue: i18n.t('auto.osiagnij_ponad_80_czasu_w', { defaultValue: "Osiągnij ponad 80% czasu w normie (min. 12 pomiarów)." }) }),
      icon: <Trophy className="w-8 h-8 text-teal-400" />,
      color: "bg-teal-400",
      unlocked: stats.totalGlucose >= 12 && stats.tirRatio >= 80,
      progress: stats.totalGlucose >= 12 ? Math.min(stats.tirRatio, 80) : 0,
      max: 80
    },
    {
      id: "night_owl",
      title: "Nocny Marek",
      description: i18n.t('auto.zarejestruj_5_pomiarow_w_nocy', { defaultValue: i18n.t('auto.zarejestruj_5_pomiarow_w', { defaultValue: "Zarejestruj 5 pomiarów w nocy (00:00 - 04:00)." }) }),
      icon: <Clock className="w-8 h-8 text-accent-300" />,
      color: "bg-accent-300",
      unlocked: stats.nightReadings >= 5,
      progress: Math.min(stats.nightReadings, 5),
      max: 5
    },
    {
      id: "early_bird",
      title: "Poranny Ptaszek",
      description: i18n.t('auto.zarejestruj_5_pomiarow_wczesny', { defaultValue: i18n.t('auto.zarejestruj_5_pomiarow_wc', { defaultValue: "Zarejestruj 5 pomiarów wczesnym rankiem (05:00 - 07:00)." }) }),
      icon: <Clock className="w-8 h-8 text-sky-400" />,
      color: "bg-sky-400",
      unlocked: stats.morningReadings >= 5,
      progress: Math.min(stats.morningReadings, 5),
      max: 5
    },
    {
      id: "glucose_tracker",
      title: "Czuwaj!",
      description: i18n.t('auto.zaznacz_50_pomiarow_glikemii', { defaultValue: i18n.t('auto.zaznacz_50_pomiarow_glike', { defaultValue: "Zaznacz 50 pomiarów glikemii." }) }),
      icon: <Zap className="w-8 h-8 text-accent-500" />,
      color: "bg-accent-500",
      unlocked: stats.totalGlucose >= 50,
      progress: Math.min(stats.totalGlucose, 50),
      max: 50
    },
    {
      id: "bolus_wizard",
      title: "Mistrz Bolusa",
      description: "Kalkuluj bolus po raz 10.",
      icon: <Medal className="w-8 h-8 text-purple-500" />,
      color: "bg-purple-500",
      unlocked: stats.totalBoluses >= 10,
      progress: Math.min(stats.totalBoluses, 10),
      max: 10
    },
    {
      id: "bolus_cyborg",
      title: "Cyber Trzustka",
      description: i18n.t('auto.kalkuluj_bolus_i_podaj_insulin', { defaultValue: i18n.t('auto.kalkuluj_bolus_i_podaj_in', { defaultValue: "Kalkuluj bolus i podaj insulinę 50 razy." }) }),
      icon: <Award className="w-8 h-8 text-fuchsia-500" />,
      color: "bg-fuchsia-500",
      unlocked: stats.totalBoluses >= 50,
      progress: Math.min(stats.totalBoluses, 50),
      max: 50
    },
    {
      id: "consistent",
      title: "Systematyczny",
      description: i18n.t('auto.dziennik_kompletny_glukoza_pos', { defaultValue: i18n.t('auto.dziennik_kompletny_glukoz', { defaultValue: "Dziennik kompletny: glukoza, posiłek i bolus." }) }),
      icon: <Star className="w-8 h-8 text-yellow-400" />,
      color: "bg-yellow-400",
      unlocked: stats.totalMeals > 0 && stats.totalGlucose > 0 && stats.totalBoluses > 0,
      progress: (stats.totalMeals > 0 ? 1 : 0) + (stats.totalGlucose > 0 ? 1 : 0) + (stats.totalBoluses > 0 ? 1 : 0),
      max: 3
    },
    {
      id: "rich_pet",
      title: i18n.t('auto.zamozny_gliko', { defaultValue: i18n.t('auto.zamozny_gliko', { defaultValue: "Zamożny Gliko" }) }),
      description: "Zebierz 500 monet w grze i zadaniach.",
      icon: <Coins className="w-8 h-8 text-amber-500" />,
      color: "bg-amber-500",
      unlocked: stats.petCoins >= 500,
      progress: Math.min(stats.petCoins, 500),
      max: 500
    },
    {
      id: "level_5",
      title: "Mentor",
      description: i18n.t('auto.rozwin_swojego_stworka_do_5_po', { defaultValue: i18n.t('auto.rozwin_swojego_stworka_do', { defaultValue: "Rozwiń swojego stworka do 5 poziomu." }) }),
      icon: <Star className="w-8 h-8 text-indigo-500" />,
      color: "bg-indigo-500",
      unlocked: stats.petLevel >= 5,
      progress: Math.min(stats.petLevel, 5),
      max: 5
    }
  ], [stats]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    show: (unlocked: boolean) => ({ 
      y: 0, 
      opacity: 1, 
      scale: 1, 
      transition: { type: 'spring', stiffness: 300, damping: 20, duration: 0.6 } 
    })
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="pb-32">
      <div className="flex items-center gap-4 mb-8 sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl p-4 z-10 border-b border-slate-100 dark:border-slate-800">
        <button 
          onClick={() => setTab('profile')}
          className="p-3 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-full active:scale-95 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-black dark:text-white leading-none">{t('auto.osiągnięcia', { defaultValue: i18n.t('auto.osiagniecia', { defaultValue: "Osiągnięcia" }) })}</h2>
          <p className="text-[10px] font-bold text-accent-500 uppercase tracking-widest mt-1">
            
                                  {t('auto.odblokowano', { defaultValue: 'Odblokowano:' })} {unlockedCount} / {achievements.length}
          </p>
        </div>
      </div>

      <div className="px-4">
        <motion.div 
          className="bg-accent-600 rounded-[2rem] p-6 mb-8 text-white relative overflow-hidden shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Trophy className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10" />
          <h3 className="text-2xl font-black mb-2 relative z-10">{t('auto.poziom', { defaultValue: 'Poziom:' })} {Math.floor(unlockedCount / 2) + 1}</h3>
          <p className="text-accent-100 font-medium relative z-10 text-sm mb-4">
            
                                  {t('auto.każde_działanie_przybliża_cię_do_le', { defaultValue: i18n.t('auto.kazde_dzialanie_przybliza', { defaultValue: "Każde działanie przybliża Cię do lepszej kontroli glikemii. Trzymaj tak dalej!" }) })}
                                </p>
          <div className="w-full bg-accent-900/50 rounded-full h-3 overflow-hidden relative z-10">
            <motion.div 
              className="bg-white h-full"
              initial={{ width: 0 }}
              animate={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          </div>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-3"
        >
          {achievements.map((acc) => (
            <motion.div 
              key={acc.id}
              custom={acc.unlocked}
              variants={itemVariants as any}
              whileHover={acc.unlocked ? { scale: 1.02 } : {}}
              className={`p-4 rounded-[2rem] border relative overflow-hidden transition-all group ${
                acc.unlocked 
                  ? 'bg-white dark:bg-slate-900 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                  : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60 grayscale'
              }`}
            >
              {acc.unlocked && (
                <div className="absolute inset-0 z-0 overflow-hidden rounded-[2rem]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
                </div>
              )}
              <div className="flex gap-4 items-center relative z-10">
                <div className={`p-4 rounded-[1.5rem] flex items-center justify-center shrink-0 ${acc.unlocked ? `${acc.color}/10` : 'bg-slate-200 dark:bg-slate-800'}`}>
                  {acc.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-black text-sm dark:text-white">{acc.title}</h4>
                  <p className="text-[10px] text-slate-500 tracking-wide mt-0.5 max-w-[200px] leading-relaxed">{acc.description}</p>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(acc.progress / acc.max) * 100}%` }}
                        transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                        className={`h-full ${acc.color}`} 
                      />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {Math.floor(acc.progress)}/{acc.max}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// Inline Utensils Icon for the first achievement
function UtensilsIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
      <path d="M7 2v20"/>
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
    </svg>
  );
}

