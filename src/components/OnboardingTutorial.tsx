import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Database, Utensils, FileText, Settings, HeartPulse, Sparkles, Scan, Bot, Users } from 'lucide-react';

export default function OnboardingTutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Witaj w GlikoControl',
      description: 'Zarządzaj swoją glikemią mądrzej dzięki integracji z Nightscout i wsparciu Sztucznej Inteligencji.',
      icon: <HeartPulse className="w-16 h-16 text-rose-500" />
    },
    {
      title: 'Parowanie Kont (Opiekun-Dziecko)',
      description: 'Z poziomu "Opcje > Współdzielenie konta" możesz wygenerować kod, aby rodzic/opiekun miał podgląd na żywo do danych dziecka i współdzielił z nim Talerz.',
      icon: <Users className="w-16 h-16 text-purple-500" />
    },
    {
      title: 'Zawsze na bieżąco',
      description: 'Aplikacja automatycznie synchronizuje wpisy z Nightscout. Możesz również dodawać ręcznie węglowodany i insulinę z zakładki Pulpit.',
      icon: <Activity className="w-16 h-16 text-accent-500" />
    },
    {
      title: 'Baza i Skaner AI',
      description: 'W zakładce Baza możesz szukać produktów ręcznie, korzystać z gotowych składników, a na Talerzu skaner AI (kamera) przeanalizuje Twój posiłek!',
      icon: <Scan className="w-16 h-16 text-emerald-500" />
    },
    {
      title: 'Inteligentny Talerz',
      description: 'Komponuj posiłki w zakładce Talerz. Sztuczna Inteligencja podpowie Ci jaki będzie spodziewany profil wchłaniania i zarekomenduje dawkę insuliny.',
      icon: <Bot className="w-16 h-16 text-amber-500" />
    },
    {
      title: 'Raporty i Statystyki',
      description: 'Śledź swoje wyniki, zdobywaj osiągnięcia i przeglądaj raporty generowane przez AI w zakładce Raport.',
      icon: <FileText className="w-16 h-16 text-blue-500" />
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
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

        <h2 className="text-xl font-black mb-4 tracking-tight dark:text-white">
          {steps[step].title}
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-12 min-h-[80px]">
          {steps[step].description}
        </p>

        {/* Dots */}
        <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-accent-600 w-6' : 'bg-slate-200 dark:bg-slate-700'}`} 
            />
          ))}
        </div>

        <button 
          onClick={handleNext}
          className="w-full bg-accent-600 text-white font-black uppercase tracking-widest py-5 rounded-[2rem] shadow-xl active:scale-95 transition-transform"
        >
          {step === steps.length - 1 ? 'Rozpocznij' : 'Dalej'}
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
