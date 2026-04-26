import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Medal, Trophy, Star, Target, Zap, ChevronLeft, Flame, Award, Clock } from 'lucide-react';
import { LogEntry } from '../types';

interface AchievementsProps {
  logs: LogEntry[];
  user: any;
  setTab: (t: string) => void;
}

export default function Achievements({ logs, user, setTab }: AchievementsProps) {
  
  // Calculate stats to determine unlocked achievements
  const stats = useMemo(() => {
    const mealLogs = logs.filter(l => l.type === 'meal');
    const glucoseLogs = logs.filter(l => l.type === 'glucose');
    const bolusLogs = logs.filter(l => l.type === 'bolus');
    
    // Streaks
    const datesWithMeals = new Set(mealLogs.map(l => new Date(l.timestamp).toLocaleDateString()));
    const datesWithGlucose = new Set(glucoseLogs.map(l => new Date(l.timestamp).toLocaleDateString()));
    
    // Time in range
    const inRange = glucoseLogs.filter(l => l.value >= 70 && l.value <= 140).length;
    const tirRatio = glucoseLogs.length > 0 ? (inRange / glucoseLogs.length) * 100 : 0;
    
    return {
      totalMeals: mealLogs.length,
      totalBoluses: bolusLogs.length,
      totalGlucose: glucoseLogs.length,
      daysWithMeals: datesWithMeals.size,
      daysWithGlucose: datesWithGlucose.size,
      tirRatio
    };
  }, [logs]);

  const achievements = useMemo(() => [
    {
      id: "first_meal",
      title: "Pierwsze Danie",
      description: "Zapisz swój pierwszy posiłek w aplikacji.",
      icon: <UtensilsIcon className="w-8 h-8 text-amber-500" />,
      color: "bg-amber-500",
      unlocked: stats.totalMeals >= 1,
      progress: Math.min(stats.totalMeals, 1),
      max: 1
    },
    {
      id: "meal_streak",
      title: "Szef Kuchni",
      description: "Zapisz posiłki przez 7 różnych dni.",
      icon: <Flame className="w-8 h-8 text-rose-500" />,
      color: "bg-rose-500",
      unlocked: stats.daysWithMeals >= 7,
      progress: Math.min(stats.daysWithMeals, 7),
      max: 7
    },
    {
      id: "tir_master",
      title: "Snajper Glikemiczny",
      description: "Osiągnij ponad 75% czasu w normie.",
      icon: <Target className="w-8 h-8 text-emerald-500" />,
      color: "bg-emerald-500",
      unlocked: stats.totalGlucose > 10 && stats.tirRatio >= 75,
      progress: stats.totalGlucose > 0 ? Math.min(stats.tirRatio, 75) : 0,
      max: 75
    },
    {
      id: "glucose_tracker",
      title: "Czuwaj!",
      description: "Znacz 50 pomiarów glikemii.",
      icon: <Zap className="w-8 h-8 text-indigo-500" />,
      color: "bg-indigo-500",
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
      id: "consistent",
      title: "Systematyczny",
      description: "Dziennik kompletny: glukoza, posiłek i bolus.",
      icon: <Star className="w-8 h-8 text-yellow-400" />,
      color: "bg-yellow-400",
      unlocked: stats.totalMeals > 0 && stats.totalGlucose > 0 && stats.totalBoluses > 0,
      progress: (stats.totalMeals > 0 ? 1 : 0) + (stats.totalGlucose > 0 ? 1 : 0) + (stats.totalBoluses > 0 ? 1 : 0),
      max: 3
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
          <h2 className="text-2xl font-black dark:text-white leading-none">Osiągnięcia</h2>
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
            Odblokowano: {unlockedCount} / {achievements.length}
          </p>
        </div>
      </div>

      <div className="px-4">
        <motion.div 
          className="bg-indigo-600 rounded-[2rem] p-6 mb-8 text-white relative overflow-hidden shadow-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Trophy className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10" />
          <h3 className="text-2xl font-black mb-2 relative z-10">Poziom: {Math.floor(unlockedCount / 2) + 1}</h3>
          <p className="text-indigo-100 font-medium relative z-10 text-sm mb-4">
            Każde działanie przybliża Cię do lepszej kontroli glikemii. Trzymaj tak dalej!
          </p>
          <div className="w-full bg-indigo-900/50 rounded-full h-3 overflow-hidden relative z-10">
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
              variants={itemVariants}
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
