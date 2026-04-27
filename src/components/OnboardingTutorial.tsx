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
      icon: <Activity className="w-16 h-16 text-indigo-500" />
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
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div 
        key={step}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-full shadow-inner">
            {steps[step].icon}
          </div>
        </div>

        <h2 className="text-2xl font-black mb-4 tracking-tight dark:text-white">
          {steps[step].title}
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-12 min-h-[80px]">
          {steps[step].description}
        </p>

        {/* Dots */}
        <div className="absolute bottom-28 left-0 right-0 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-indigo-600 w-6' : 'bg-slate-200 dark:bg-slate-700'}`} 
            />
          ))}
        </div>

        <button 
          onClick={handleNext}
          className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl active:scale-95 transition-transform"
        >
          {step === steps.length - 1 ? 'Rozpocznij' : 'Dalej'}
        </button>

        {step < steps.length - 1 && (
          <button 
            onClick={onComplete}
            className="w-full text-slate-400 text-xs mt-4 font-bold tracking-widest uppercase"
          >
            Pomiń
          </button>
        )}
      </motion.div>
    </div>
  );
}
