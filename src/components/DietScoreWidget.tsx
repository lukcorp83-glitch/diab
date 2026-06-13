import i18n from '../i18n';
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid, cn } from '../lib/utils';
import { Activity, Award, TrendingUp } from 'lucide-react';
import { UserSettings } from '../types';
import { useTranslation } from "react-i18next";

export default function DietScoreWidget({ user, activeDiet }: { user: User, activeDiet: string }) {
    const { t } = useTranslation();
  const [score, setScore] = useState(85);
  const [fiber, setFiber] = useState(24); // mock
  const [sodium, setSodium] = useState(1800); // mock
  const [loading, setLoading] = useState(true);

  // In a real app we would compute this from the "logs" meals. 
  // Let's do a simple UI for now.
  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const getRecommendations = () => {
    switch (activeDiet) {
      case 'keto': return i18n.t('auto.utrzymujesz_swietnie_weglowoda', { defaultValue: "Utrzymujesz świetnie węglowodany, zjedz nieco więcej zdrowych tłuszczy np. awokado." });
      case 'dash': return i18n.t('auto.uwaga_na_sod_wczorajsze_posilk', { defaultValue: "Uwaga na sód! Wczorajsze posiłki zawierały sporo soli. Zwiększ potas." });
      case 'gluten': return i18n.t('auto.doskonale_wyniki_bezglutenowe', { defaultValue: "Doskonałe wyniki bezglutenowe. Uważaj na niedobory błonnika." });
      case 'plate': return i18n.t('auto.2_3_twoich_posilkow_w_tym_tygo', { defaultValue: "2/3 Twoich posiłków w tym tygodniu miało idealne proporcje 50/25/25!" });
      default: return i18n.t('auto.trzymasz_sie_planu_tak_trzymaj', { defaultValue: "Trzymasz się planu. Tak trzymaj!" });
    }
  };

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
             
                                   {t('auto.zgodność_compliance', { defaultValue: 'Zgodność (Compliance)' })}
                                 </h3>
           <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
             
                                   {t('auto.tygodniowy_wskaźnik_adherencji', { defaultValue: 'Tygodniowy wskaźnik adherencji' })}
                                 </p>
         </div>
       </div>

       <div className="bg-white/50 dark:bg-slate-900/50 rounded-xl p-3 mb-4">
         <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 leading-relaxed">
            <span className="font-black">{t('auto.glikosense', { defaultValue: 'GlikoSense:' })} </span> 
            {getRecommendations()}
         </p>
       </div>

       <div className="grid grid-cols-2 gap-3">
         <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700/50">
           <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">{t('auto.błonnik', { defaultValue: 'Błonnik' })}</span>
           <span className="text-lg font-black text-slate-900 dark:text-white">{fiber}g</span>
           <span className="text-[9px] text-slate-400 block mt-0.5">{t('auto.cel_30g', { defaultValue: 'cel: 30g' })}</span>
         </div>
         <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700/50">
           <span className="block text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1">{t('auto.sód_na', { defaultValue: 'Sód (Na)' })}</span>
           <span className="text-lg font-black text-slate-900 dark:text-white">{sodium}</span>
           <span className="text-[9px] text-slate-400 block mt-0.5">{t('auto.cel_lt_2300mg', { defaultValue: 'cel: &lt;2300mg' })}</span>
         </div>
       </div>
    </div>
  );
}
