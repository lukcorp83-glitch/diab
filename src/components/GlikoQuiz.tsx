import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Check, X, Trophy, Coins, Sparkles, Star } from 'lucide-react';
import { cn } from '../lib/utils';

const QUIZ_POOL = [
  {
    question: "Co Gliko powinien zrobić przy niskim cukru (hipoglikemii)?",
    options: [
      "Podać insulinę",
      "Wypić soczek lub zjeść pastylkę z glukozą",
      "Iść pograć w piłkę",
      "Położyć się spać bez jedzenia"
    ],
    correct: 1,
    explanation: "Brawo! Soczek szybko podniesie cukier i Gliko poczuje się lepiej."
  },
  {
    question: "Gdzie najczęściej Gliko dostaje swój bolus do posiłku?",
    options: [
      "W czubek nosa",
      "W ucho",
      "W brzuszek, udo lub ramię",
      "W buta"
    ],
    correct: 2,
    explanation: "Dokładnie! To najlepsze miejsca, żeby insulina zaczęła działać."
  },
  {
    question: "Co to jest WW (Wymiennik Węglowodanowy)?",
    options: [
      "Wesoły Wieloryb",
      "Miara węglowodanów w jedzeniu",
      "Wielkie Wyzwanie",
      "Woda Wyścigowa"
    ],
    correct: 1,
    explanation: "Tak! WW pomaga nam obliczyć, ile insuliny potrzebujemy do jedzenia."
  },
  {
    question: "Czy przed bieganiem lub zabawą na podwórku warto sprawdzić cukier?",
    options: [
      "Nie, po co tracić czas na zabawę",
      "Tak, żeby Gliko nie miał za niskiego cukru",
      "Tylko jeśli pada deszcz",
      "Tylko jeśli Gliko jest głodny"
    ],
    correct: 1,
    explanation: "Super! Sport obniża cukier, więc dobrze wiedzieć, od jakiego poziomu zaczynamy."
  },
  {
    question: "Jaki napój jest najlepszy dla Gliko, gdy ma wysoki cukier?",
    options: [
      "Słodka oranżada",
      "Woda",
      "Sok owocowy",
      "Gęsty koktajl"
    ],
    correct: 1,
    explanation: "Woda to super-paliwo! Pomaga wypłukać nadmiar cukru z organizmu."
  },
  {
    question: "Co robimy, gdy zapomnimy podać bolus do obiadu?",
    options: [
      "Płaczemy i nic nie robimy",
      "Mówimy od razu rodzicom lub opiekunowi",
      "Zjadamy jeszcze więcej",
      "Chowamy się pod łóżko"
    ],
    correct: 1,
    explanation: "Zawsze powiedz dorosłym! Oni pomogą Gliko naprawić tę sytuację."
  },
  {
    question: "Co Gliko powinien mieć zawsze przy sobie na wypadek niskiego cukru?",
    options: [
      "Pluszowego misia",
      "Zapasowe skarpetki",
      "Coś słodkiego (np. soczek lub glukozę)",
      "Kredki"
    ],
    called: 1,
    correct: 2,
    explanation: "Zawsze warto mieć 'ratunkowy soczek' pod ręką!"
  },
  {
    question: "Jak Gliko może się czuć, gdy ma niski cukier?",
    options: [
      "Może mu się kręcić w głowie i trząść rączki",
      "Może mieć ochotę na sprzątanie pokoju",
      "Może nagle urosnąć",
      "Może zacząć szczekać"
    ],
    correct: 0,
    explanation: "Tak, drżenie rączek lub słabość to sygnały, że cukier jest za niski."
  },
  {
    question: "Dlaczego myjemy ręce przed badaniem cukru?",
    options: [
      "Żeby glukometr był lśnišcy",
      "Żeby resztki dżemu na palcu nie oszukały wyniku",
      "Żeby było zimniej",
      "Bo Gliko nie lubi brudu"
    ],
    correct: 1,
    explanation: "Prawda! Brudne rączki mogą pokazać wyższy cukier niż jest naprawdę."
  },
  {
    question: "Co to jest glukometr?",
    options: [
      "Maszyna do robienia waty cukrowej",
      "Urządzenie do sprawdzania poziomu cukru",
      "Mały telewizor",
      "Licznik kroków Gliko"
    ],
    correct: 1,
    explanation: "Glukometr to nasz najlepszy doradca!"
  }
];

export default function GlikoQuiz({ onComplete }: { onComplete: (rewardCoins: number, rewardXp: number) => void }) {
  // Select 5 random questions for this session
  const sessionQuestions = useMemo(() => {
    return [...QUIZ_POOL].sort(() => 0.5 - Math.random()).slice(0, 5);
  }, []);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  const quiz = sessionQuestions[currentIdx];

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === quiz.correct;
    setIsCorrect(correct);
    if (correct) setScore(prev => prev + 1);
  };

  const next = () => {
    if (currentIdx < sessionQuestions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelected(null);
      setIsCorrect(null);
    } else {
      setFinished(true);
    }
  };

  const handleFinish = () => {
    // Reward based on performance
    const bonusCoins = score * 10;
    onComplete(50 + bonusCoins, 100);
  };

  if (finished) {
    return (
      <div className="text-center py-8 px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          <Trophy className="w-20 h-20 text-amber-500 mx-auto mb-4" />
        </motion.div>
        <h3 className="text-2xl font-black mb-2 dark:text-white">Wspaniale!</h3>
        <p className="text-slate-500 text-sm mb-2">Ukończyłeś quiz edukacyjny Gliko.</p>
        <p className="text-accent-500 font-black text-lg mb-6">Twój wynik: {score}/{sessionQuestions.length}</p>
        
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-slate-800 glass-target">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Twoje nagrody:</p>
           <div className="flex justify-center gap-8">
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600 mb-1">
                  <Coins size={24} />
                </div>
                <span className="text-lg font-black text-amber-600">+{50 + score * 10}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Monety</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 bg-accent-100 dark:bg-accent-500/10 rounded-full flex items-center justify-center text-accent-600 mb-1">
                  <Sparkles size={24} />
                </div>
                <span className="text-lg font-black text-accent-600">+100</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">XP Gliko</span>
              </div>
           </div>
        </div>

        <button
          onClick={handleFinish}
          className="w-full bg-accent-500 hover:bg-accent-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm shadow-lg shadow-accent-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Check size={20} /> Zakończ i odbierz nagrody
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 dark:bg-amber-500/10 p-2 rounded-xl text-amber-600">
            <HelpCircle size={20} />
          </div>
          <div>
            <h4 className="font-black text-sm dark:text-white">Mądry Gliko</h4>
            <div className="flex gap-1 mt-0.5">
              {[...Array(sessionQuestions.length)].map((_, i) => (
                <div 
                  key={`progress-${i}`} 
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i < currentIdx ? "w-4 bg-emerald-500" :
                    i === currentIdx ? "w-6 bg-accent-500" :
                    "w-2 bg-slate-100 dark:bg-slate-800"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
          <Star size={12} className="text-amber-500 fill-current" />
          <span className="text-[10px] font-black text-amber-600">{score}</span>
        </div>
      </div>

      <div className="min-h-[80px] mb-8">
        <h3 className="text-xl font-black dark:text-white leading-tight">
          {quiz.question}
        </h3>
      </div>

      <div className="space-y-3 mb-8">
        {quiz.options.map((option, idx) => (
          <button
            key={`option-${currentIdx}-${idx}`}
            disabled={selected !== null}
            onClick={() => handleSelect(idx)}
            className={cn(
              "w-full text-left p-5 rounded-2xl border-2 transition-all font-bold text-sm flex items-center justify-between group",
              selected === null ? "border-slate-100 dark:border-slate-800 hover:border-accent-500 hover:bg-accent-50 dark:hover:bg-accent-500/5 dark:text-slate-300" :
              idx === quiz.correct ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" :
              selected === idx ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-600" :
              "border-slate-50 dark:border-slate-900 opacity-40 text-slate-400"
            )}
          >
            <span className="pr-4">{option}</span>
            <div className="shrink-0">
              {selected === null && <div className="w-5 h-5 rounded-full border-2 border-slate-200 group-hover:border-accent-500 transition-colors" />}
              {selected !== null && idx === quiz.correct && <Check size={20} className="text-emerald-500" />}
              {selected === idx && idx !== quiz.correct && <X size={20} className="text-rose-500" />}
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {isCorrect !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-3xl bg-accent-50 dark:bg-accent-500/5 border border-accent-100 dark:border-accent-500/20"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="text-2xl mt-1">{isCorrect ? '🌟' : '💡'}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                <span className="font-black text-accent-500 uppercase tracking-widest block mb-1">Gliko mówi:</span>
                {quiz.explanation}
              </p>
            </div>
            <button
              onClick={next}
              className="w-full bg-accent-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all shadow-md shadow-accent-500/20"
            >
              {currentIdx === sessionQuestions.length - 1 ? "Zobacz wynik" : "Następne pytanie"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

