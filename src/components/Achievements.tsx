import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLogsStore } from "../stores/useLogsStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useUserSettings } from "../hooks/queries/useProfileData";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from 'motion/react';
import { Medal, Trophy, Star, Target, Zap, ChevronLeft, Award, Clock, Coins, CheckCircle2 } from 'lucide-react';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { getEffectiveUid } from "../lib/utils";
import { SKINS } from "../data/petDatabase";
import { Haptics } from "../lib/haptics";
import toast from "react-hot-toast";

interface AchievementsProps {
  user?: any;
  setTab: (t: string) => void;
  petData?: any;
}

export default function Achievements({ user: propUser, setTab, petData }: AchievementsProps) {
  const authUser = useAuthStore((state) => state.user);
  const user = propUser || authUser;
  const { data: userSettings } = useUserSettings(user) as any;
  const queryClient = useQueryClient();
  const logs = useLogsStore((state) => state.logs);
  const { t } = useTranslation();

  // Guard: Osiągnięcia i grywalizacja są dostępne wyłącznie w trybie dziecka
  useEffect(() => {
    if (userSettings && userSettings.childMode === false) {
      setTab('dashboard');
    }
  }, [userSettings, setTab]);

  // Trwałe osiągnięcia (zapisywane na stałe - raz odblokowane już nigdy nie znikają)
  const [persistedUnlocked, setPersistedUnlocked] = useState<string[]>(() => {
    try {
      const fromLocal = JSON.parse(localStorage.getItem('gliko_unlocked_achievements') || '[]');
      const fromPet = petData?.unlockedAchievements || [];
      return Array.from(new Set([...fromLocal, ...fromPet]));
    } catch {
      return petData?.unlockedAchievements || [];
    }
  });

  useEffect(() => {
    if (petData?.unlockedAchievements && Array.isArray(petData.unlockedAchievements)) {
      setPersistedUnlocked((prev) => {
        const merged = Array.from(new Set([...prev, ...petData.unlockedAchievements]));
        if (merged.length !== prev.length) {
          try {
            localStorage.setItem('gliko_unlocked_achievements', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        }
        return prev;
      });
    }
  }, [petData?.unlockedAchievements]);

  // Obliczenie statystyk z logów i zwierzaka
  const stats = useMemo(() => {
    const mealLogs = logs.filter(l => l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal?.carbs));
    const glucoseLogs = logs.filter(l => l.type === 'glucose');
    const bolusLogs = logs.filter(l => l.type === 'bolus');
    
    // Unikalne dni
    const datesWithMeals = new Set(mealLogs.map(l => new Date(l.timestamp).toLocaleDateString()));
    const datesWithGlucose = new Set(glucoseLogs.map(l => new Date(l.timestamp).toLocaleDateString()));
    
    // Time in range (70 - 140 mg/dL)
    const inRange = glucoseLogs.filter(l => l.value >= 70 && l.value <= 140).length;
    const tirRatio = glucoseLogs.length > 0 ? (inRange / glucoseLogs.length) * 100 : 0;

    // Pomiary nocne i poranne
    const nightReadings = glucoseLogs.filter(l => {
      const h = new Date(l.timestamp).getHours();
      return h >= 0 && h <= 4;
    }).length;

    const morningReadings = glucoseLogs.filter(l => {
      const h = new Date(l.timestamp).getHours();
      return h >= 5 && h <= 7;
    }).length;

    // Posiłki zaawansowane (z tłuszczem i białkiem - WBT)
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

  // Lista osiągnięć z trwałym stanem odblokowania (isUnlocked = true na zawsze)
  const achievements = useMemo(() => {
    const rawList = [
      {
        id: "first_meal",
        title: "Pierwsze Danie",
        description: i18n.t('auto.zapisz_swoj_pierwszy_posilek_w', { defaultValue: "Zapisz swój pierwszy posiłek w aplikacji." }),
        icon: <UtensilsIcon className="w-8 h-8 text-amber-500" />,
        color: "bg-amber-500",
        conditionMet: stats.totalMeals >= 1,
        progress: Math.min(stats.totalMeals, 1),
        max: 1
      },
      {
        id: "detailed_meal",
        title: "Dietetyk WBT",
        description: i18n.t('auto.oblicz_10_posilkow_z_uwzgledni', { defaultValue: "Oblicz 10 posiłków z uwzględnieniem tłuszczów i białek (WBT)." }),
        icon: <Trophy className="w-8 h-8 text-orange-500" />,
        color: "bg-orange-500",
        conditionMet: stats.detailedMeals >= 10,
        progress: Math.min(stats.detailedMeals, 10),
        max: 10
      },
      {
        id: "tir_master",
        title: "Snajper Glikemiczny",
        description: i18n.t('auto.osiagnij_ponad_65_czasu_w_norm', { defaultValue: "Osiągnij ponad 65% czasu w normie." }),
        icon: <Target className="w-8 h-8 text-emerald-500" />,
        color: "bg-emerald-500",
        conditionMet: stats.totalGlucose > 8 && stats.tirRatio >= 65,
        progress: stats.totalGlucose > 0 ? Math.min(stats.tirRatio, 65) : 0,
        max: 65
      },
      {
        id: "tir_ninja",
        title: "Cukrowy Ninja",
        description: i18n.t('auto.osiagnij_ponad_80_czasu_w_norm', { defaultValue: "Osiągnij ponad 80% czasu w normie (min. 12 pomiarów)." }),
        icon: <Trophy className="w-8 h-8 text-teal-400" />,
        color: "bg-teal-400",
        conditionMet: stats.totalGlucose >= 12 && stats.tirRatio >= 80,
        progress: stats.totalGlucose >= 12 ? Math.min(stats.tirRatio, 80) : 0,
        max: 80
      },
      {
        id: "night_owl",
        title: "Nocny Marek",
        description: i18n.t('auto.zarejestruj_5_pomiarow_w_nocy', { defaultValue: "Zarejestruj 5 pomiarów w nocy (00:00 - 04:00)." }),
        icon: <Clock className="w-8 h-8 text-accent-300" />,
        color: "bg-accent-300",
        conditionMet: stats.nightReadings >= 5,
        progress: Math.min(stats.nightReadings, 5),
        max: 5
      },
      {
        id: "early_bird",
        title: "Poranny Ptaszek",
        description: i18n.t('auto.zarejestruj_5_pomiarow_wczesny', { defaultValue: "Zarejestruj 5 pomiarów wczesnym rankiem (05:00 - 07:00)." }),
        icon: <Clock className="w-8 h-8 text-sky-400" />,
        color: "bg-sky-400",
        conditionMet: stats.morningReadings >= 5,
        progress: Math.min(stats.morningReadings, 5),
        max: 5
      },
      {
        id: "glucose_tracker",
        title: i18n.t('auto.staly_monitoring', { defaultValue: "Stały monitoring" }),
        description: i18n.t('auto.zaznacz_50_pomiarow_glikemii', { defaultValue: "Zaznacz 50 pomiarów glikemii." }),
        icon: <Zap className="w-8 h-8 text-accent-500" />,
        color: "bg-accent-500",
        conditionMet: stats.totalGlucose >= 50,
        progress: Math.min(stats.totalGlucose, 50),
        max: 50
      },
      {
        id: "bolus_wizard",
        title: "Mistrz Bolusa",
        description: "Kalkuluj bolus po raz 10.",
        icon: <Medal className="w-8 h-8 text-purple-500" />,
        color: "bg-purple-500",
        conditionMet: stats.totalBoluses >= 10,
        progress: Math.min(stats.totalBoluses, 10),
        max: 10
      },
      {
        id: "bolus_cyborg",
        title: "Cyber Trzustka",
        description: i18n.t('auto.kalkuluj_bolus_i_podaj_insulin', { defaultValue: "Kalkuluj bolus i podaj insulinę 50 razy." }),
        icon: <Award className="w-8 h-8 text-fuchsia-500" />,
        color: "bg-fuchsia-500",
        conditionMet: stats.totalBoluses >= 50,
        progress: Math.min(stats.totalBoluses, 50),
        max: 50
      },
      {
        id: "consistent",
        title: "Systematyczny",
        description: i18n.t('auto.dziennik_kompletny_glukoza_pos', { defaultValue: "Dziennik kompletny: glukoza, posiłek i bolus." }),
        icon: <Star className="w-8 h-8 text-yellow-400" />,
        color: "bg-yellow-400",
        conditionMet: stats.totalMeals > 0 && stats.totalGlucose > 0 && stats.totalBoluses > 0,
        progress: (stats.totalMeals > 0 ? 1 : 0) + (stats.totalGlucose > 0 ? 1 : 0) + (stats.totalBoluses > 0 ? 1 : 0),
        max: 3
      },
      {
        id: "rich_pet",
        title: i18n.t('auto.zamozny_gliko', { defaultValue: "Zamożny Gliko" }),
        description: "Zebierz 500 monet w grze i zadaniach.",
        icon: <Coins className="w-8 h-8 text-amber-500" />,
        color: "bg-amber-500",
        conditionMet: stats.petCoins >= 500,
        progress: Math.min(stats.petCoins, 500),
        max: 500
      },
      {
        id: "level_5",
        title: "Mentor",
        description: i18n.t('auto.rozwin_swojego_stworka_do_5_po', { defaultValue: "Rozwiń swojego stworka do 5 poziomu." }),
        icon: <Star className="w-8 h-8 text-indigo-500" />,
        color: "bg-indigo-500",
        conditionMet: stats.petLevel >= 5,
        progress: Math.min(stats.petLevel, 5),
        max: 5
      }
    ];

    return rawList.map((item) => {
      const isAlreadyUnlocked = persistedUnlocked.includes(item.id);
      const isUnlocked = isAlreadyUnlocked || item.conditionMet;
      return {
        ...item,
        unlocked: isUnlocked,
        // Raz odblokowane osiągnięcie ma zawsze 100% (max/max) i nigdy nie spada!
        progress: isUnlocked ? item.max : item.progress,
      };
    });
  }, [stats, persistedUnlocked]);

  // Zapisywanie nowo odblokowanych osiągnięć i powiązanych skórek na stałe (nigdy nie znikają!)
  const isSyncingRef = useRef(false);
  useEffect(() => {
    const newlyUnlocked = achievements.filter(
      (a) => a.unlocked && !persistedUnlocked.includes(a.id)
    );
    if (newlyUnlocked.length === 0 || isSyncingRef.current) return;

    isSyncingRef.current = true;
    const newIds = newlyUnlocked.map((a) => a.id);
    const updatedUnlocked = Array.from(new Set([...persistedUnlocked, ...newIds]));

    setPersistedUnlocked(updatedUnlocked);
    try {
      localStorage.setItem('gliko_unlocked_achievements', JSON.stringify(updatedUnlocked));
    } catch (e) {}

    // Odblokowanie specjalnych skórek zwierzaka powiązanych z osiągnięciami
    const currentUnlockedSkins = petData?.unlockedSkins || ['default'];
    let newSkins = [...currentUnlockedSkins];
    for (const ach of newlyUnlocked) {
      const matchingSkin = SKINS.find((s) => s.unlockedBy === ach.id);
      if (matchingSkin && !newSkins.includes(matchingSkin.id)) {
        newSkins.push(matchingSkin.id);
        toast.success(`🎉 Odblokowano nową skórkę zwierzaka: ${matchingSkin.name}!`, {
          icon: matchingSkin.icon || '🏆',
          duration: 5000,
        });
      }
    }

    if (user) {
      const petRef = doc(db, 'users', getEffectiveUid(user), 'pet', 'status');
      setDoc(
        petRef,
        {
          unlockedAchievements: updatedUnlocked,
          unlockedSkins: newSkins,
        },
        { merge: true }
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: ['petStatus'] });
      }).catch((err) => {
        console.error('Error persisting unlocked achievements:', err);
      }).finally(() => {
        isSyncingRef.current = false;
      });
    } else {
      isSyncingRef.current = false;
    }

    Haptics.impact();
    for (const ach of newlyUnlocked) {
      toast.success(`🏆 Nowe osiągnięcie: ${ach.title}!`, { duration: 4000 });
    }
  }, [achievements, persistedUnlocked, petData, user, queryClient]);

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
          <h2 className="text-2xl font-black dark:text-white leading-none">{t('auto.osiągnięcia', { defaultValue: "Osiągnięcia" })}</h2>
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
            {t('auto.każde_działanie_przybliża_cię_do_le', { defaultValue: "Każde działanie przybliża Cię do lepszej kontroli glikemii. Trzymaj tak dalej!" })}
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
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-sm dark:text-white">{acc.title}</h4>
                    {acc.unlocked && (
                      <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} strokeWidth={3} /> {t('auto.zdobyte', { defaultValue: 'Zdobyte' })}
                      </span>
                    )}
                  </div>
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
                      {acc.unlocked ? `${acc.max}/${acc.max}` : `${Math.floor(acc.progress)}/${acc.max}`}
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
