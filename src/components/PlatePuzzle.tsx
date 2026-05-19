import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, CheckCircle2, XCircle, Info, Trophy, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

const MEALS = [
  { name: 'Owsianka z borówkami', carbs: 45, image: '🥣', tips: 'Pełna błonnika, ale płatki owsiane mają sporo węgli.' },
  { name: 'Sałatka Grecka', carbs: 8, image: '🥗', tips: 'Warzywa mają mało węgli, głównie z fety i oliwek.' },
  { name: 'Spaghetti Bolognese', carbs: 65, image: '🍝', tips: 'Makaron to energetyczna bomba węglowodanowa.' },
  { name: 'Jabłko (średnie)', carbs: 20, image: '🍎', tips: 'Jedno jabłko to zazwyczaj 2WW.' },
  { name: 'Pizza (2 kawałki)', carbs: 55, image: '🍕', tips: 'Ciasto pszenne to czyste węglowodany plus tłuszcz spowalniający wzrost.' },
  { name: 'Sushi (6 sztuk)', carbs: 35, image: '🍣', tips: 'Ryż do sushi jest słodzony octem ryżowym z cukrem.' },
];

export default function PlatePuzzle() {
  const [currentMeal, setCurrentMeal] = useState<any>(null);
  const [guess, setGuess] = useState<number | ''>('');
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    nextMeal();
  }, []);

  const nextMeal = () => {
    const meal = MEALS[Math.floor(Math.random() * MEALS.length)];
    setCurrentMeal(meal);
    setGuess('');
    setFeedback(null);
  };

  const handleCheck = () => {
    if (guess === '' || !currentMeal) return;
    
    const diff = Math.abs(Number(guess) - currentMeal.carbs);
    const isClose = diff <= 10;

    if (isClose) {
      setFeedback('success');
      setScore(s => s + 10);
      setStreak(st => st + 1);
    } else {
      setFeedback('error');
      setStreak(0);
    }
  };

  if (!currentMeal) return null;

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 glass-target">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-black text-sm dark:text-white flex items-center gap-2">
            <Utensils size={16} className="text-amber-500" /> Zagadka Talerzy
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Zgadnij ile węglowodanów ma ten posiłek</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="text-[10px] font-black bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm text-amber-600">
             PKT: {score}
           </div>
           {streak > 1 && (
             <div className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full animate-bounce">
               x{streak} 🔥
             </div>
           )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-4 flex flex-col items-center text-center shadow-sm">
        <div className="text-6xl mb-4 bg-slate-50 dark:bg-slate-700/50 w-24 h-24 flex items-center justify-center rounded-full animate-pulse">
          {currentMeal.image}
        </div>
        <h4 className="font-black text-lg dark:text-white mb-2">{currentMeal.name}</h4>
        
        <div className="flex items-center gap-3 mt-4">
          <input 
            type="number"
            value={guess}
            onChange={(e) => setGuess(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Węgle (g)"
            className="w-24 bg-slate-100 dark:bg-slate-700 border-none rounded-xl px-4 py-3 text-center font-black focus:ring-2 focus:ring-amber-500"
            disabled={!!feedback}
          />
          <button 
            onClick={handleCheck}
            disabled={guess === '' || !!feedback}
            className="bg-amber-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
          >
            Sprawdź
          </button>
        </div>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className={cn(
              "p-4 rounded-2xl border flex gap-3",
              feedback === 'success' 
                ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-500/20 dark:text-emerald-400" 
                : "bg-rose-50 border-rose-100 text-rose-800 dark:bg-rose-900/20 dark:border-rose-500/20 dark:text-rose-400"
            )}>
              {feedback === 'success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
              <div>
                <p className="font-black text-xs uppercase tracking-widest mb-1">
                  {feedback === 'success' ? 'Świetnie!' : 'Prawie...'}
                </p>
                <p className="text-xs font-medium">To danie ma ok. <span className="font-bold underline">{currentMeal.carbs}g</span> węglowodanów.</p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex gap-3 items-start border border-blue-100 dark:border-blue-500/20">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-800 dark:text-blue-300 font-medium leading-relaxed italic">
                {currentMeal.tips}
              </p>
            </div>

            <button 
              onClick={nextMeal}
              className="w-full py-4 bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 group transition-all"
            >
              Następny Talerz <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
