import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Check, ChevronRight, Zap, Trophy, HelpCircle, Book, Flower2, Box, Info, Settings, MousePointer2, ArrowRight } from 'lucide-react';
import { VERSIONS, CURRENT_VERSION } from '../constants/versions';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

export default function ChangelogPopup({ onClose }: { onClose: () => void }) {
  const current = VERSIONS[0];

  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6366f1', '#a855f7', '#ec4899']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6366f1', '#a855f7', '#ec4899']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden relative border border-slate-100 dark:border-slate-800"
      >
        <div className="relative pt-12 pb-8 px-8 bg-gradient-to-br from-accent-600 via-indigo-600 to-purple-700 text-white overflow-hidden">
          {/* Decorative background circles */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl mix-blend-overlay"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-accent-400/30 blur-3xl mix-blend-overlay"></div>
          
          <div className="absolute top-4 right-4 p-4 opacity-20">
            <Sparkles size={140} className="text-white animate-pulse" />
          </div>
            <div className="relative z-10">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 mb-4 shadow-lg"
              >
                <Zap size={12} className="fill-white" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Nowa Wersja</span>
              </motion.div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-4xl font-black leading-none tracking-tighter font-display uppercase italic flex items-center drop-shadow-md">
                  <span className="mr-3 text-white/90">Gliko</span>
                  <div className="flex bg-black/30 rounded-2xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 relative py-1 lg:py-2 px-2">
                    {/* Shadow overlay to look like a mechanical counter */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none z-10" />
                    {current.version.split('').map((char, i) => (
                      <div key={i} className="relative flex justify-center items-center min-w-[18px]">
                        <motion.span
                          initial={{ y: "150%", opacity: 0, filter: "blur(2px)", scale: 0.8 }}
                          animate={{ y: "0%", opacity: 1, filter: "blur(0px)", scale: 1 }}
                          transition={{ 
                            type: "spring", 
                            damping: 12, 
                            stiffness: 100, 
                            mass: 0.5,
                            delay: 0.4 + i * 0.15 
                          }}
                          className={cn(
                            "inline-block font-mono tracking-tighter text-2xl lg:text-3xl font-black",
                            char === '.' ? "text-white/50" : "text-white"
                          )}
                          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                        >
                          {char}
                        </motion.span>
                      </div>
                    ))}
                  </div>
                </h2>
              </div>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-white/80 text-[11px] font-bold uppercase tracking-widest pl-1"
              >
                {current.title}
              </motion.p>
            </div>
        </div>

        <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-center -mt-6">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full z-20"></div>
          </div>
        </div>

        <div className="p-8 max-h-[50vh] overflow-y-auto no-scrollbar bg-slate-50 dark:bg-slate-900">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 ml-2">Co nowego?</h3>
          <div className="space-y-4">
            {current.changes.map((change, idx) => (
              <motion.div
                key={`change-${current.version}-${idx}`}
                initial={{ opacity: 0, x: -10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="flex items-start gap-4 p-5 rounded-[2rem] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-accent-200 dark:hover:border-accent-500/30 hover:shadow-lg hover:shadow-accent-500/5 transition-all group"
              >
                <div className="shrink-0 w-12 h-12 rounded-[1.2rem] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-accent-500 group-hover:scale-110 group-hover:bg-accent-500 group-hover:text-white group-hover:border-accent-400 transition-all shadow-sm">
                   {getChangeIcon(change)}
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed pt-1.5">
                  {change}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-8 pt-4 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-accent-600 to-indigo-600 hover:from-accent-500 hover:to-indigo-500 text-white font-black py-5 rounded-[2rem] uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-accent-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 group font-display"
          >
            Zaczynamy zabawę <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
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
