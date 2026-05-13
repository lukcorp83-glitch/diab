import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Database, Utensils, Settings, HeartPulse, Scan, Bot, Users, Star, ShieldAlert, ShieldCheck, EyeOff } from 'lucide-react';

const OnboardingTutorial = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);

  const steps = [
    {
      title: 'Witaj w ekipie GlikoControl!',
      description: 'To projekt fanowski, tworzony z myślą o nas – diabetykach. Bez zbędnego patosu, po prostu narzędzie, które ma ułatwić nam życie z cukrzycą.',
      icon: <HeartPulse className="w-16 h-16 text-rose-500" />
    },
    {
      title: 'Twoja Prywatność (RODO)',
      description: 'Twoje dane medyczne są święte. NIE są one przetwarzane w celach reklamowych ani udostępniane nikomu bez Twojej wyraźnej zgody. Wszystko jest szyfrowane i bezpieczne.',
      icon: <ShieldCheck className="w-16 h-16 text-emerald-500" />
    },
    {
      title: 'Dane pozostają u Ciebie',
      description: 'Zastosowaliśmy technologię GlikoSense, która analizuje Twoje cukry bezpośrednio na telefonie (offline). Żadne wrażliwe dane o trendach nie opuszczają Twojego urządzenia.',
      icon: <EyeOff className="w-16 h-16 text-sky-500" />
    },
    {
      title: 'GlikoSense – Twój mózg offline',
      description: 'Sercem aplikacji jest sieć neuronowa LSTM. To zaawansowany algorytm, który uczy się Twoich trendów, dawkowania i reakcji na jedzenie.',
      icon: <Activity className="w-16 h-16 text-accent-500" />
    },
    {
      title: 'Dla nowicjuszy i "chwiejnych"',
      description: 'Dopiero zaczynasz walkę? A może masz duże wahania cukrów? GlikoSense wyłapuje wzorce, których my nie widzimy, pomagając ustabilizować glikemię i uniknąć "zjazdów".',
      icon: <Bot className="w-16 h-16 text-amber-500" />
    },
    {
      title: 'Własny klucz AI',
      description: 'Zdarza się, że ogólnodostępna AI ma gorsze dni lub limity. Dlatego w Opcjach możesz dodać swój własny klucz (np. Gemini) – znajdziesz tam prostą instrukcję jak to zrobić.',
      icon: <Scan className="w-16 h-16 text-emerald-500" />
    },
    {
      title: 'Gliko – przyjaciel dla dzieciaków',
      description: 'Dla najmłodszych (i tych starszych duchem!) mamy Gliko. Dbaj o swoje cukry, a Twój zwierzak będzie rósł, zdobywał poziomy i nowe przebrania.',
      icon: <Star className="w-16 h-16 text-purple-500" />
    },
    {
      title: 'Współdzielenie i Nightscout',
      description: 'Sparuj konta Opiekun-Dziecko, by mieć podgląd na żywo. Aplikacja pięknie współpracuje z Nightscout, dając Ci pełną kontrolę gdziekolwiek jesteś.',
      icon: <Users className="w-16 h-16 text-blue-500" />
    },
    {
      title: 'Ważna Klauzula Medyczna',
      description: 'GlikoControl NIE JEST wyrobem medycznym. Aplikacja ma charakter wyłącznie informacyjny i edukacyjny. Nigdy nie podejmuj decyzji o dawkowaniu insuliny czy zmianie diety wyłącznie na podstawie danych z aplikacji. Każda zmiana w terapii musi być skonsultowana z lekarzem diabetologiem.',
      icon: <ShieldAlert className="w-16 h-16 text-red-600 animate-pulse" />
    }
  ];

  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      if (agreed) {
        onComplete();
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 p-4"
    >
      <motion.div 
        key={step}
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-slate-50 dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-8 pb-12 shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform text-center relative"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-inner border border-slate-100 dark:border-slate-700">
            {steps[step].icon}
          </div>
        </div>

        <h2 className={`text-xl font-black mb-4 tracking-tight ${isLastStep ? 'text-red-600 dark:text-red-500' : 'dark:text-white'}`}>
          {steps[step].title}
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8 min-h-[80px]">
          {steps[step].description}
        </p>

        {isLastStep && (
          <div className="mb-10 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-2xl flex items-start gap-3 text-left">
            <input 
              type="checkbox" 
              id="confirm-disclaimer"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="confirm-disclaimer" className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer select-none">
              Rozumiem, że aplikacja nie zastępuje porady lekarskiej i akceptuję ryzyko związane z jej używaniem.
            </label>
          </div>
        )}

        {/* Dots */}
        {!isLastStep && (
          <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-2">
            {steps.map((_, i) => (
              <div 
                key={`dot-${i}`} 
                className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-accent-600 w-6' : 'bg-slate-200 dark:bg-slate-700'}`} 
              />
            ))}
          </div>
        )}

        <button 
          onClick={handleNext}
          disabled={isLastStep && !agreed}
          className={cn(
            "w-full font-black uppercase tracking-widest py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all",
            isLastStep 
              ? agreed ? "bg-red-600 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-accent-600 text-white"
          )}
        >
          {isLastStep ? 'Zgadzam się i Rozpoczynam' : 'Dalej'}
        </button>

        {step < steps.length - 1 && (
          <button 
            onClick={onComplete}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <span className="sr-only">Pomiń</span>
            <span className="text-[10px] font-black uppercase">Pomiń</span>
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

export default OnboardingTutorial;

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
