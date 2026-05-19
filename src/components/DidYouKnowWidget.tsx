import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, ChevronRight } from 'lucide-react';
import { Haptics } from '../lib/haptics';

const tips = [
  "Czy wiesz, że możesz poprosić GlikoCzata o samodzielne dodanie posiłku, używając komendy np.: 'dodaj do talerza jabłko'!",
  "System Osiągnięć odblokowuje monety dla Twojego Zwierzaka, co zachęca Cię do częstszych kontroli.",
  "Talerz współpracuje z AI. Im dokładniej opiszesz co zjadłeś, tym lepsze szacunki otrzymasz.",
  "Kalkulator Bolusa potrafi wyciągnąć opóźnienia i uwzględnić resztkowe IOB, na podstawie zdefiniowanej skali.",
  "Sprawdź integrację z Nightscout w zakładce 'Integracje (API) / Nightscout', aby pobierać wyniki CGM w tle.",
  "Czy wiesz, że możesz skanować kody kreskowe produktów, aby szybko i precyzyjnie dodawać je do swojego posiłku?",
  "Czy wiesz, że możesz użyć aparatu AI, aby zrobić zdjęcie swojego talerza, a sztuczna inteligencja automatycznie rozpozna i oszacuje dla Ciebie posiłek?",
  "Czy wiesz, że możesz dodać własny klucz API w ustawieniach 'Integracje', aby korzystać z szybszego asystenta AI oraz podnieść limit zapytań?"
];

export default function DidYouKnowWidget({ onClick }: { onClick: () => void }) {
  const [currentTip, setCurrentTip] = useState(tips[0]);
  const [tipKey, setTipKey] = useState(0);

  useEffect(() => {
    const shuffleTips = () => {
      const indices = Array.from({ length: tips.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      return indices;
    };

    let queue = shuffleTips();
    setCurrentTip(tips[queue[0]]);
    queue = queue.slice(1);

    const interval = setInterval(() => {
      if (queue.length === 0) {
        queue = shuffleTips();
      }
      const nextIndex = queue[0];
      setCurrentTip(tips[nextIndex]);
      queue = queue.slice(1);
      setTipKey(prev => prev + 1);
    }, 12000);

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
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner group-hover:scale-110 transition-transform shrink-0">
          <Lightbulb size={20} />
        </div>
        <div className="flex-1 overflow-hidden">
          <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5 leading-none">Czy wiesz, że...</h4>
          <div className="h-16 relative">
            <AnimatePresence mode="wait">
              <motion.p
                key={tipKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-snug absolute inset-0 line-clamp-3"
              >
                {currentTip}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <div className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0">
          <ChevronRight size={16} />
        </div>
      </div>
    </motion.div>
  );
}
