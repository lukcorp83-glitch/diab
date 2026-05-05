import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Check, ChevronRight, Zap, Trophy, HelpCircle, Book, Flower2 } from 'lucide-react';
import { VERSIONS, CURRENT_VERSION } from '../constants/versions';
import { cn } from '../lib/utils';

export default function ChangelogPopup({ onClose }: { onClose: () => void }) {
  const current = VERSIONS[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
      >
        <div className="relative p-8 bg-gradient-to-br from-accent-500 to-indigo-600 text-white overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80">Nowa aktualizacja</p>
            <h2 className="text-3xl font-black mb-1">GlikoControl {current.version}</h2>
            <p className="text-accent-100 text-xs font-bold italic">{current.title}</p>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
          <div className="space-y-4">
            {current.changes.map((change, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="flex items-start gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
              >
                <div className="shrink-0 w-8 h-8 rounded-xl bg-accent-100 dark:bg-accent-500/10 flex items-center justify-center text-accent-600">
                   {getChangeIcon(change)}
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  {change}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full bg-accent-500 hover:bg-accent-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-accent-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Super! Zaczynamy <ChevronRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function getChangeIcon(text: string) {
  if (text.toLowerCase().includes('quiz')) return <HelpCircle size={16} />;
  if (text.toLowerCase().includes('ogród')) return <Flower2 size={16} />;
  if (text.toLowerCase().includes('dziennik')) return <Book size={16} />;
  if (text.toLowerCase().includes('energia')) return <Zap size={16} />;
  if (text.toLowerCase().includes('monety') || text.toLowerCase().includes('xp')) return <Trophy size={16} />;
  return <Sparkles size={16} />;
}
