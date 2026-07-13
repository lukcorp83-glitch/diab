import i18n from '../i18n';
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid, cn } from '../lib/utils';
import { Activity, Award, TrendingUp } from 'lucide-react';
import { UserSettings } from '../types';
import { useTranslation } from "react-i18next";

export default function DietScoreWidget({ user, activeDiet, settings }: { user: User, activeDiet: string, settings?: UserSettings }) {
  const { t } = useTranslation();
  const [score, setScore] = useState(85);
  const [fiber, setFiber] = useState(24);
  const [sodium, setSodium] = useState(1800);
  const [loading, setLoading] = useState(true);
  const [yesterdayKcal, setYesterdayKcal] = useState(0);
  const [recommendationStr, setRecommendationStr] = useState("");

  useEffect(() => {
    const fetchYesterdayLogs = async () => {
      try {
        const startOfYesterday = new Date();
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        startOfYesterday.setHours(0, 0, 0, 0);

        const endOfYesterday = new Date();
        endOfYesterday.setDate(endOfYesterday.getDate() - 1);
        endOfYesterday.setHours(23, 59, 59, 999);

        const logsRef = collection(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs");
        const q = query(
          logsRef,
          where("timestamp", ">=", startOfYesterday.getTime()),
          where("timestamp", "<=", endOfYesterday.getTime())
        );
        const snapshot = await getDocs(q);

        let totalCals = 0;
        let totalCarbs = 0;
        let totalProtein = 0;
        let totalFat = 0;

        snapshot.forEach(docSnap => {
           const data = docSnap.data();
           if (data.type === "meal" || data.type === "bolus") {
               const mealData = data.type === "bolus" ? data.linkedMeal : data;
               if (mealData) {
                   totalCals += mealData.calories || 0;
                   totalCarbs += (mealData.value || mealData.carbs) || 0;
                   totalProtein += mealData.protein || 0;
                   totalFat += mealData.fat || 0;
               }
           }
        });

        setYesterdayKcal(totalCals);
        
        let targetScore = 85;
        if (totalCals > 0 && settings?.tdee) {
           const diff = Math.abs(totalCals - settings.tdee);
           targetScore = Math.max(10, 100 - Math.round((diff / settings.tdee) * 100));
        } else if (totalCals === 0) {
           targetScore = 0;
        }
        setScore(targetScore);

        // Convert macros to estimated calories if totalCals is too low but macros exist
        if (totalCals < (totalCarbs * 4 + totalProtein * 4 + totalFat * 9) * 0.8) {
             totalCals = (totalCarbs * 4) + (totalProtein * 4) + (totalFat * 9);
        }

        const tdee = settings?.tdee || 2000;
        const carbPct = totalCals > 0 ? (totalCarbs * 4) / totalCals : 0;
        const proteinPct = totalCals > 0 ? (totalProtein * 4) / totalCals : 0;
        const fatPct = totalCals > 0 ? (totalFat * 9) / totalCals : 0;

        let recommendation = "";

        if (totalCals === 0) {
           recommendation = i18n.t('diet.no_data', { defaultValue: "Brak danych z wczoraj. Zapisuj posiłki, by uzyskać analizę!" });
        } else if (totalCals < tdee - 300) {
           recommendation = i18n.t('diet.too_few_calories', { defaultValue: "Zbyt niska podaż kalorii wczoraj. Uważaj na spadki wagi i niedobory energii!" });
           targetScore = Math.max(10, targetScore - 20);
        } else if (totalCals > tdee + 300) {
           recommendation = i18n.t('diet.too_many_calories', { defaultValue: "Wczoraj przekroczyłeś swój limit kalorii. Zwróć uwagę na wielkość porcji." });
           targetScore = Math.max(10, targetScore - 20);
        } else {
           // Dynamic macro check based on activeDiet
           switch (activeDiet) {
              case 'keto': 
                 if (totalCarbs > 40) {
                    recommendation = i18n.t('auto.zbyt_duzo_wegli_w_keto', { defaultValue: "Przekroczono limit węglowodanów dla diety Keto. Zmniejsz ich ilość!" });
                    targetScore = Math.max(10, targetScore - 30);
                 } else {
                    recommendation = i18n.t('auto.utrzymujesz_swietnie_weglowoda', { defaultValue: "Utrzymujesz świetnie węglowodany, zjedz nieco więcej zdrowych tłuszczy np. awokado." });
                 }
                 break;
              case 'dash': 
                 recommendation = i18n.t('auto.uwaga_na_sod_wczorajsze_posilk', { defaultValue: "Pamiętaj o sodzie! Wczorajsze posiłki mogły zawierać sól. Zwiększ potas." });
                 break;
              case 'plate': 
                 if (carbPct > 0.45) {
                    recommendation = i18n.t('auto.za_duzo_wegli_plate', { defaultValue: "Zbyt duży udział węglowodanów we wczorajszych posiłkach. Pamiętaj o warzywach!" });
                    targetScore = Math.max(10, targetScore - 15);
                 } else if (proteinPct < 0.15) {
                    recommendation = i18n.t('auto.za_malo_bialka_plate', { defaultValue: "Wczorajsze posiłki miały za mało białka. Dodaj chude mięso lub strączkowe." });
                    targetScore = Math.max(10, targetScore - 15);
                 } else if (fatPct > 0.40) {
                    recommendation = i18n.t('auto.za_duzo_tluszczu_plate', { defaultValue: "Wczorajsze posiłki były zbyt tłuste względem zaleceń zdrowego talerza." });
                    targetScore = Math.max(10, targetScore - 15);
                 } else {
                    recommendation = i18n.t('diet.macros_perfect', { defaultValue: "Wczorajsze proporcje makroskładników i kalorii są wzorowe!" });
                 }
                 break;
              default: 
                 recommendation = i18n.t('auto.trzymasz_sie_planu_tak_trzymaj', { defaultValue: "Trzymasz się planu. Tak trzymaj!" });
                 break;
           }
        }
        
        setRecommendationStr(recommendation);
        setScore(Math.round(targetScore));
        setLoading(false);
      } catch (err) {
        console.error("DietScoreWidget err:", err);
        setLoading(false);
      }
    };
    fetchYesterdayLogs();
  }, [user, activeDiet, settings]);

  if (loading) {
    return <div className="animate-pulse bg-slate-100 dark:bg-slate-800 h-32 rounded-2xl"></div>;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800/30">
       <div className="flex items-center gap-4 mb-4">
         <div className="relative">
           <svg className="w-16 h-16 transform -rotate-90">
             <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-200 dark:text-slate-700/50" />
             <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="176" strokeDashoffset={176 - (176 * score) / 100} className="text-indigo-500 transition-all duration-1000 ease-out" />
           </svg>
           <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
             <span className="text-sm font-black text-slate-900 dark:text-white leading-none">{score}</span>
             <span className="text-[8px] font-bold text-slate-500">%</span>
           </div>
         </div>
         <div className="flex-1">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
             <Award size={14} className="text-indigo-500" />
             {t('auto.zgodność_compliance', { defaultValue: i18n.t('auto.zgodnosc_compliance', { defaultValue: "Zgodność (Compliance)" }) })}
           </h3>
           <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
             {t('auto.tygodniowy_wskaźnik_adherencji', { defaultValue: i18n.t('auto.tygodniowy_wskaznik_adher', { defaultValue: "Tygodniowy wskaźnik adherencji" }) })}
           </p>
         </div>
       </div>

       <div className="bg-white/50 dark:bg-slate-900/50 rounded-xl p-3 mb-4">
         <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 leading-relaxed">
            <span className="font-black">{t('auto.glikosense', { defaultValue: 'GlikoSense:' })} </span> 
            {recommendationStr}
         </p>
       </div>

       <div className="grid grid-cols-2 gap-3">
         <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700/50">
           <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">{t('auto.błonnik', { defaultValue: i18n.t('auto.blonnik', { defaultValue: "Błonnik" }) })}</span>
           <span className="text-lg font-black text-slate-900 dark:text-white">{fiber}g</span>
           <span className="text-[9px] text-slate-400 block mt-0.5">{t('auto.cel_30g', { defaultValue: 'cel: 30g' })}</span>
         </div>
         <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700/50">
           <span className="block text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1">{t('auto.sód_na', { defaultValue: i18n.t('auto.sod_na', { defaultValue: "Sód (Na)" }) })}</span>
           <span className="text-lg font-black text-slate-900 dark:text-white">{sodium}</span>
           <span className="text-[9px] text-slate-400 block mt-0.5">{t('auto.cel_lt_2300mg', { defaultValue: 'cel: &lt;2300mg' })}</span>
         </div>
       </div>
    </div>
  );
}

