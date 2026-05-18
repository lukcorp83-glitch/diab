import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, ChevronRight } from 'lucide-react';
import { Haptics } from '../lib/haptics';

const tips = [
  "Czy wiesz, że możesz poprosić GlikoCzata o samodzielne dodanie posiłku do talerza? Po prostu powiedz np.: 'zjadłem jabłko'!",
  "Jeśli skopiujesz URL GlikoCzata do notesu, będziesz miał szybki dostęp do pytań.",
  "System Osiągnięć odblokowuje monety dla Twojego Zwierzaka, co zachęca Cię do częstszych kontroli.",
  "Talerz współpracuje z AI. Im dokładniej opiszesz co zjadłeś, tym lepsze szacunki otrzymasz.",
  "Kalkulator Bolusa potrafi wyciągnąć opóźnienia i uwzględnić resztkowe IOB, na podstawie zdefiniowanej skali.",
  "Sprawdź integrację z Nightscout w zakładce 'Integracje (API) / Nightscout', aby pobierać wyniki CGM w tle."
];

export default function DidYouKnowWidget({ onClick }: { onClick: () => void }) {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      onClick={() => {
        Haptics.light();
        onClick();
      }}
      className="glass p-5 rounded-3xl cursor-pointer hover:shadow-lg transition-all border border-indigo-100 dark:border-indigo-500/10 group"
    >
      <div className="flex gap-4 items-center">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner group-hover:scale-110 transition-transform">
          <Lightbulb size={20} />
        </div>
        <div className="flex-1 overflow-hidden">
          <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 leading-none">Czy wiesz, że...</h4>
          <div className="h-10 relative">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentTip}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-tight absolute inset-0"
              >
                {tips[currentTip]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <div className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
          <ChevronRight size={16} />
        </div>
      </div>
    </motion.div>
  );
}
