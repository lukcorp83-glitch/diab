import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Check, ChevronRight, Zap, Trophy, HelpCircle, Book, Flower2, Box, Info, Settings, MousePointer2 } from 'lucide-react';
import { VERSIONS, CURRENT_VERSION } from '../constants/versions';
import { cn } from '../lib/utils';

export default function ChangelogPopup({ onClose }: { onClose: () => void }) {
  const current = VERSIONS[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm glass rounded-[3rem] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden"
      >
        <div className="relative p-8 bg-gradient-to-br from-accent-600/80 to-indigo-700/80 text-white overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 mb-3">
              <Zap size={10} className="fill-white" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">Nowa aktualizacja</span>
            </div>
            <h2 className="text-3xl font-black mb-1 leading-tight tracking-tighter font-display uppercase italic">Gliko {current.version}</h2>
            <p className="text-accent-100 text-[10px] font-black uppercase tracking-widest">{current.title}</p>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar">
          <div className="space-y-3">
            {current.changes.map((change, idx) => (
              <motion.div
                key={`change-${current.version}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-[1.8rem] bg-white/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-accent-500/30 transition-all group"
              >
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-accent-500/10 dark:bg-accent-500/20 flex items-center justify-center text-accent-500 group-hover:scale-110 transition-transform">
                   {getChangeIcon(change)}
                </div>
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  {change}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full bg-accent-600 hover:bg-accent-500 text-white font-black py-5 rounded-[1.8rem] uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-accent-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 group font-display"
          >
            Super! Zaczynamy <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function getChangeIcon(text: string) {
  const t = text.toLowerCase();
  if (t.includes('quiz')) return <HelpCircle size={16} />;
  if (t.includes('ogród')) return <Flower2 size={16} />;
  if (t.includes('dziennik') || t.includes('historia')) return <Book size={16} />;
  if (t.includes('energia') || t.includes('wydajność')) return <Zap size={16} />;
  if (t.includes('monety') || t.includes('xp')) return <Trophy size={16} />;
  if (t.includes('haptyka') || t.includes('wibracje')) return <MousePointer2 size={16} />;
  if (t.includes('ustawienia') || t.includes('opcje')) return <Settings size={16} />;
  if (t.includes('poprawka') || t.includes('stabilność')) return <Box size={16} />;
  return <Sparkles size={16} />;
}
