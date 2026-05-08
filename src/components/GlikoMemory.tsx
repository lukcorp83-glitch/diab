import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RefreshCw, 
  Brain, 
  Apple, 
  Beef, 
  Soup, 
  Cookie, 
  Zap, 
  Activity, 
  Droplets,
  Syringe,
  Timer
} from 'lucide-react';
import { cn } from '../lib/utils';

const CARDS = [
  { id: 1, icon: <Apple className="text-emerald-500" />, type: 'apple', color: 'emerald' },
  { id: 2, icon: <Activity className="text-rose-500" />, type: 'activity', color: 'rose' },
  { id: 3, icon: <Droplets className="text-blue-500" />, type: 'droplets', color: 'blue' },
  { id: 4, icon: <Zap className="text-amber-500" />, type: 'zap', color: 'amber' },
  { id: 5, icon: <Syringe className="text-violet-500" />, type: 'syringe', color: 'violet' },
  { id: 6, icon: <Timer className="text-slate-500" />, type: 'timer', color: 'slate' },
];

export default function GlikoMemory() {
  const [cards, setCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);

  useEffect(() => {
    shuffle();
  }, []);

  const shuffle = () => {
    const doubled = [...CARDS, ...CARDS]
      .sort(() => Math.random() - 0.5)
      .map((card, index) => ({ ...card, uniqueId: index }));
    setCards(doubled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setIsWon(false);
  };

  const handleFlip = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (cards[first].type === cards[second].type) {
        setMatched(prev => [...prev, first, second]);
        setFlipped([]);
        if (matched.length + 2 === cards.length) {
          setIsWon(true);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-black text-sm dark:text-white flex items-center gap-2">
            <Brain size={16} className="text-violet-500" /> Gliko Memory
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ćwicz pamięć i rozpoznawaj symbole</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-[10px] font-black bg-white dark:bg-slate-800 px-3 py-1 rounded-full shadow-sm">
             RUCHY: {moves}
           </div>
           <button 
             onClick={shuffle}
             className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
           >
             <RefreshCw size={14} className="text-slate-500" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, index) => {
          const isFlipped = flipped.includes(index) || matched.includes(index);
          const isMatched = matched.includes(index);

          return (
            <motion.div
              key={card.uniqueId}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleFlip(index)}
              className={cn(
                "aspect-square rounded-2xl cursor-pointer flex items-center justify-center transition-all duration-300 relative preserve-3d",
                isFlipped ? 'bg-white dark:bg-slate-800' : 'bg-violet-100 dark:bg-violet-900/30'
              )}
            >
              <AnimatePresence mode="wait">
                {isFlipped ? (
                  <motion.div
                    key="front"
                    initial={{ rotateY: -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    className={cn(
                      "w-full h-full flex items-center justify-center",
                      isMatched && "animate-pulse"
                    )}
                  >
                    {card.icon}
                  </motion.div>
                ) : (
                  <motion.div
                    key="back"
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    className="text-violet-400 dark:text-violet-600 font-black text-xl"
                  >
                    G
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {isWon && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl text-center"
          >
            <Trophy className="text-emerald-500 mx-auto mb-2" size={24} />
            <h4 className="font-black text-emerald-600 dark:text-emerald-400 text-sm italic">Pięknie!</h4>
            <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase">Ukończono w {moves} ruchach</p>
            <button 
              onClick={shuffle}
              className="mt-3 px-6 py-2 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors"
            >
              Zagraj Ponownie
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
