import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid } from '../lib/utils';
import { UserSettings } from '../types';
import { geminiService } from '../services/gemini';
import { Loader2, Zap, Target, Edit2, ChevronDown, ChevronUp, Sparkles, Heart, RefreshCw, ChefHat, Info } from 'lucide-react';
import { Haptics } from '../lib/haptics';
import { toast } from 'react-hot-toast';

interface DietManagerProps {
  user: User;
  settings: UserSettings;
  activeDietData: any;
}

export default function DietManager({ user, settings, activeDietData }: DietManagerProps) {
  const [tdee, setTdee] = useState<number | ''>(settings?.tdee || '');
  const [isEditingTdee, setIsEditingTdee] = useState(!settings?.tdee);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [savedMealIds, setSavedMealIds] = useState<Set<string>>(new Set());

  const [allergies, setAllergies] = useState<string>(settings?.allergies || '');
  const [replacingMeal, setReplacingMeal] = useState<{dayIdx: number, mealIdx: number} | null>(null);

  const [singleMealResult, setSingleMealResult] = useState<any>(null);
  const [singleMealType, setSingleMealType] = useState<string>('Obiad'); // Default
  const [isLoadingSingleMeal, setIsLoadingSingleMeal] = useState(false);

  useEffect(() => {
    // Load previously generated plan from localstorage if available
    const saved = localStorage.getItem(`glikosfera_mealplan_${activeDietData.id}`);
    if (saved) {
      try {
        setMealPlan(JSON.parse(saved));
      } catch (e) {}
    }
  }, [activeDietData.id]);

  const saveTdeeAndAllergies = async () => {
    if (!tdee || Number(tdee) < 500) {
      toast.error('Błędna wartość TDEE');
      return;
    }
    
    Haptics.medium();
    
    try {
      const updated = { ...settings, tdee: Number(tdee), allergies };
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), updated, { merge: true });
      setIsEditingTdee(false);
      toast.success('Zapisano ustawienia');
    } catch (e) {
      console.error("Error saving settings", e);
      toast.error('Nie udało się zapisać ustawień');
    }
  };

  const generatePlan = async () => {
    if (!settings.tdee) {
      toast.error('Najpierw ustaw swoje TDEE!');
      setIsEditingTdee(true);
      return;
    }
    
    Haptics.impact();
    setIsLoadingPlan(true);
    
    const plan = await geminiService.generateMealPlan(activeDietData.name, settings.tdee, 3, settings.allergies);
    
    if (plan && plan.days) {
      setMealPlan(plan);
      localStorage.setItem(`glikosfera_mealplan_${activeDietData.id}`, JSON.stringify(plan));
      toast.success('Pobrano nowy jadłospis!');
      setExpandedDay(1);
    } else {
       toast.error('GlikoSense nie zdołało ułożyć menu. Spróbuj ułożyć swoje menu lub ponów za chwilę.');
    }
    
    setIsLoadingPlan(false);
  };

  const replaceSingleMeal = async (dayIdx: number, mealIdx: number, type: string, targetKcal: number) => {
    Haptics.medium();
    setReplacingMeal({ dayIdx, mealIdx });
    
    const newMeal = await geminiService.generateReplacementMeal(activeDietData.name, targetKcal, type, settings.allergies);
    
    if (newMeal) {
      const updatedPlan = { ...mealPlan };
      const dayIndex = updatedPlan.days.findIndex((d: any) => d.dayNumber === dayIdx);
      if (dayIndex > -1) {
        updatedPlan.days[dayIndex].meals[mealIdx] = newMeal;
        setMealPlan(updatedPlan);
        localStorage.setItem(`glikosfera_mealplan_${activeDietData.id}`, JSON.stringify(updatedPlan));
        toast.success('Wymieniono posiłek!');
      }
    } else {
      toast.error('Nie udało się wygenerować zastępczego posiłku.');
    }
    setReplacingMeal(null);
  };

  const generateSingleMeal = async () => {
    if (!settings.tdee) {
      toast.error('Najpierw ustaw zapotrzebowanie kaloryczne');
      return;
    }
    
    Haptics.impact();
    setIsLoadingSingleMeal(true);
    setSingleMealResult(null);
    
    // Estimate kcal based on type
    let fraction = 0.3; // Default 30%
    if (singleMealType === 'Śniadanie' || singleMealType === 'Kolacja') fraction = 0.25;
    if (singleMealType === 'Obiad') fraction = 0.35;
    if (singleMealType === 'Przekąska' || singleMealType === 'Deser') fraction = 0.15;

    const targetKcal = Math.round(settings.tdee * fraction);
    
    const meal = await geminiService.generateReplacementMeal(activeDietData.name, targetKcal, singleMealType, settings.allergies);
    
    if (meal) {
      setSingleMealResult(meal);
      toast.success('Wygenerowano przepis!');
    } else {
      toast.error('Błąd generowania. Spróbuj ponownie.');
    }
    
    setIsLoadingSingleMeal(false);
  };

  const saveToCookbook = async (e: React.MouseEvent, meal: any, dayIdx: number, mealIdx: number) => {
    e.stopPropagation();
    
    const mealKey = `${dayIdx}-${mealIdx}`;
    if (savedMealIds.has(mealKey)) {
      toast('Ten posiłek jest już w Twojej bazie', { icon: 'ℹ️' });
      return;
    }

    Haptics.medium();
    
    try {
      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'savedMeals'), {
        name: meal.name,
        items: [{
          name: meal.name,
          carbs: meal.carbs,
          protein: meal.protein,
          fat: meal.fat,
          calories: meal.kcal,
          weight: 100,
          quantity: 1,
          isAI: true
        }],
        cookingMethod: 'raw', // placeholder
        timestamp: Date.now()
      });
      
      setSavedMealIds(prev => new Set(prev).add(mealKey));
      toast.success('Dodano do Bazy Mój Talerz (Zjedz)!');
    } catch (err) {
      console.error(err);
      toast.error('Błąd podczas zapisywania');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm glass-target">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center justify-between">
          <span>Cel Kaloryczny i Wykluczenia</span>
          {!isEditingTdee && (
            <button onClick={() => setIsEditingTdee(true)} className="text-blue-500 flex items-center gap-1">
              <Edit2 size={12} /> <span className="sr-only">Edytuj</span>
            </button>
          )}
        </h3>
        
        {isEditingTdee ? (
          <div className="space-y-3">
             <div className="flex bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden focus-within:ring-2 ring-blue-500/50">
               <input
                 type="number"
                 inputMode="numeric"
                 placeholder="np. 2000"
                 value={tdee}
                 onChange={(e) => setTdee(e.target.value ? Number(e.target.value) : '')}
                 className="flex-1 bg-transparent px-4 py-3 outline-none text-slate-900 dark:text-white font-bold"
               />
               <span className="px-4 py-3 text-slate-400 font-medium">kcal</span>
             </div>

             <div className="bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden focus-within:ring-2 ring-blue-500/50 p-1">
               <textarea
                 placeholder="Alergie i wykluczenia (np. bez glutenu, uczulenie na orzechy, nie lubię pomidorów)"
                 value={allergies}
                 onChange={(e) => setAllergies(e.target.value)}
                 className="w-full bg-transparent px-3 py-2 outline-none text-xs text-slate-900 dark:text-white font-medium resize-none min-h-[60px]"
               />
             </div>
             
             <button
               onClick={saveTdeeAndAllergies}
               className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm"
             >
               Zapisz i kontynuuj
             </button>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-500">
                   <Target size={24} />
                </div>
                <div>
                   <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                     {settings.tdee}
                     <span className="text-sm font-bold text-slate-400 ml-1">kcal</span>
                   </p>
                   <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-1">
                     dzienne zapotrzebowanie
                   </p>
                </div>
             </div>
             {settings.allergies && (
               <div className="p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                 <p className="text-[10px] font-black uppercase text-rose-500 mb-1">Wykluczenia z diety</p>
                 <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">{settings.allergies}</p>
               </div>
             )}
          </div>
        )}
      </div>

      {!isEditingTdee && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 shadow-inner glass-target">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-500" /> 
                GlikoSense: Menu
             </h3>
             <button
               onClick={generatePlan}
               disabled={isLoadingPlan}
               className="text-[10px] px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest rounded-lg flex items-center gap-1 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
             >
               {isLoadingPlan ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
               {mealPlan ? 'Generuj nowe' : 'Wygeneruj 3 dni'}
             </button>
           </div>
           
           {isLoadingPlan ? (
             <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 size={32} className="text-indigo-500 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Dietetyk AI układa Twoje menu...</p>
             </div>
           ) : mealPlan ? (
             <div className="space-y-4">
               {mealPlan.summary && (
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                    {mealPlan.summary}
                  </p>
               )}
               
               <div className="space-y-2">
                 {mealPlan.days?.map((day: any) => (
                   <div key={day.dayNumber} className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-200/50 dark:border-slate-800 cursor-pointer">
                      <div 
                        className="px-4 py-3 flex items-center justify-between"
                        onClick={() => {
                          setExpandedDay(expandedDay === day.dayNumber ? null : day.dayNumber);
                          Haptics.light();
                        }}
                      >
                        <div>
                          <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Dzień {day.dayNumber}</span>
                          <p className="text-[10px] font-bold text-slate-400">~{day.totalKcal} kcal</p>
                        </div>
                        {expandedDay === day.dayNumber ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                      
                      <AnimatePresence>
                        {expandedDay === day.dayNumber && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-slate-50 dark:bg-slate-800/30 px-3 pb-3 pt-1 space-y-2 border-t border-slate-100 dark:border-slate-800"
                          >
                            {day.meals?.map((m: any, idx: number) => (
                              <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-100 dark:border-slate-700/50">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">{m.type}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400">{m.kcal} kcal</span>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        replaceSingleMeal(day.dayNumber, idx, m.type, m.kcal);
                                      }}
                                      disabled={replacingMeal?.dayIdx === day.dayNumber && replacingMeal?.mealIdx === idx}
                                      className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-indigo-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                      aria-label="Wymień ten posiłek na inny"
                                    >
                                      {replacingMeal?.dayIdx === day.dayNumber && replacingMeal?.mealIdx === idx ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <RefreshCw size={14} />
                                      )}
                                    </button>
                                    <button 
                                      onClick={(e) => saveToCookbook(e, m, day.dayNumber, idx)}
                                      className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
                                        savedMealIds.has(`${day.dayNumber}-${idx}`) 
                                        ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500' 
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                                      }`}
                                      aria-label="Zapisz do bazy posiłków"
                                    >
                                      <Heart size={14} className={savedMealIds.has(`${day.dayNumber}-${idx}`) ? "fill-rose-500" : ""} />
                                    </button>
                                  </div>
                                </div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight mb-1">{m.name}</h4>
                                <p className="text-[10px] text-slate-500 leading-relaxed mb-2 line-clamp-2">{m.description}</p>
                                
                                {m.recipe && (
                                  <div className="mb-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-1.5 mb-1.5 opacity-70">
                                      <ChefHat size={12} className="text-slate-500" />
                                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Przepis i przygotowanie</span>
                                    </div>
                                    <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{m.recipe}</p>
                                  </div>
                                )}
                                
                                <div className="flex gap-2">
                                  <div className="flex-1 text-[9px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded text-center">W: {m.carbs}g</div>
                                  <div className="flex-1 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-center">B: {m.protein}g</div>
                                  <div className="flex-1 text-[9px] font-bold bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 px-2 py-1 rounded text-center">T: {m.fat}g</div>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                 ))}
               </div>
             </div>
           ) : (
             <div className="py-6 flex flex-col items-center justify-center text-center px-4">
                <Sparkles size={24} className="text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Wygeneruj jadłospis układający się w {settings.tdee} kcal, dopasowany do makroskładników Twojej diety.</p>
             </div>
           )}
        </div>
      )}

       {!isEditingTdee && (
         <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 shadow-inner mt-4 glass-target">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-2">
                 <ChefHat size={14} className="text-indigo-500" /> 
                 Szybki Przepis
              </h3>
            </div>
            
            <div className="flex flex-col gap-3 mb-4">
               <div className="flex gap-2">
                 {['Śniadanie', 'Obiad', 'Kolacja', 'Przekąska'].map(type => (
                   <button
                     key={type}
                     onClick={() => setSingleMealType(type)}
                     className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors ${
                       singleMealType === type 
                       ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' 
                       : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                     }`}
                   >
                     {type}
                   </button>
                 ))}
               </div>
               
               <button
                 onClick={generateSingleMeal}
                 disabled={isLoadingSingleMeal}
                 className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
               >
                 {isLoadingSingleMeal ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                 Wygeneruj 1 posiłek
               </button>
            </div>

            {isLoadingSingleMeal && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                 <Loader2 size={24} className="text-indigo-500 animate-spin" />
                 <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Wymyślam przepis...</p>
              </div>
            )}

            {singleMealResult && !isLoadingSingleMeal && (
               <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-indigo-100 dark:border-indigo-900/30 p-3 mt-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-full">{singleMealResult.type}</span>
                    <span className="text-[10px] font-black text-slate-400">{singleMealResult.kcal} kcal</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 leading-tight mb-1">{singleMealResult.name}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mb-3">{singleMealResult.description}</p>
                  
                  {singleMealResult.recipe && (
                    <div className="mb-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-1.5 mb-2 opacity-70">
                        <ChefHat size={12} className="text-slate-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Przepis i przygotowanie</span>
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{singleMealResult.recipe}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <div className="flex-1 text-[9px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1.5 rounded-lg text-center">W: {singleMealResult.carbs}g</div>
                    <div className="flex-1 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-1.5 rounded-lg text-center">B: {singleMealResult.protein}g</div>
                    <div className="flex-1 text-[9px] font-bold bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 px-2 py-1.5 rounded-lg text-center">T: {singleMealResult.fat}g</div>
                  </div>
               </div>
            )}
         </div>
       )}
    </div>
  );
}
