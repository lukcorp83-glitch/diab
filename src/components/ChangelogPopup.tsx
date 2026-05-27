import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Smartphone, 
  Brain, 
  Utensils, 
  Layout, 
  Wrench, 
  ArrowRight,
  X,
  Bell,
  CloudCog
} from 'lucide-react';
import { VERSIONS } from '../constants/versions';
import { cn } from '../lib/utils';

export default function ChangelogPopup({ onClose }: { onClose: () => void }) {
  const current = VERSIONS[0]; // Active top release (ver 4.1)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-[12px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 dark:border-white/5 flex flex-col"
        id="changelog-popup-container"
      >
        {/* Subtle decorative top border accent */}
        <div className="absolute top-0 left-0 right-0 h-[6px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
          aria-label="Zamknij"
          id="changelog-close-btn"
        >
          <X size={18} />
        </button>

        {/* Header section */}
        <div className="pt-10 px-8 pb-6 border-b border-slate-100/50 dark:border-white/5">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
              <Sparkles size={11} className="animate-pulse" />
              Aktualizacja
            </span>
            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
              v{current.version}
            </span>
          </div>

          <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight leading-snug">
            {current.title}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Odkryj najnowsze inteligentne funkcje i ulepszenia w wersji mobilnej.
          </p>
        </div>

        {/* List of changes */}
        <div className="px-5 sm:px-8 py-6 max-h-[50vh] overflow-y-auto space-y-3 no-scrollbar relative">
          {current.changes.map((change, idx) => {
            const iconInfo = getChangeIconAndColor(change);
            return (
              <motion.div
                key={`change-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + idx * 0.06 }}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-100 dark:border-white/5 transition-all shadow-sm group"
              >
                <div className={cn(
                  "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-3 shadow-inner",
                  iconInfo.bgColor
                )}>
                  {iconInfo.icon}
                </div>
                <div className="space-y-0.5 flex-1 pt-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 tracking-tight">
                    {iconInfo.title}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    {iconInfo.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer with action button */}
        <div className="p-6 sm:p-8 pt-4 border-t border-slate-100/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/50">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-lg shadow-black/10 dark:shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer font-display"
            id="changelog-start-btn"
          >
            Przejdź do aplikacji <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface ChangeMeta {
  icon: React.ReactNode;
  bgColor: string;
  title: string;
  desc: string;
}

function getChangeIconAndColor(text: string): ChangeMeta {
  const t = text.toLowerCase();
  
  if (t.includes('pop-up') || t.includes('powiadomie')) {
    return {
      icon: <Bell size={16} className="text-rose-500 dark:text-rose-400" />,
      bgColor: "bg-rose-50 dark:bg-rose-950/40",
      title: "Powiadomienia & Pop-up",
      desc: text
    };
  }

  if (t.includes('chmurze') || t.includes('cloud') || t.includes('sync')) {
    return {
      icon: <CloudCog size={16} className="text-purple-500 dark:text-purple-400" />,
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
      title: "Synchronizacja & Chmura",
      desc: text
    };
  }
  
  if (t.includes('apk') || t.includes('android')) {
    return {
      icon: <Smartphone size={16} className="text-emerald-500 dark:text-emerald-400" />,
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      title: "Wersja APK & mobilna",
      desc: text
    };
  }
  
  if (t.includes('wchłaniania') || t.includes('posiłków') || t.includes('makroskładników')) {
    return {
      icon: <Utensils size={16} className="text-amber-500 dark:text-amber-400" />,
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      title: "Wchłanianie posiłków",
      desc: text
    };
  }
  
  if (t.includes('ai') || t.includes('glikosense') || t.includes('model')) {
    return {
      icon: <Brain size={16} className="text-indigo-500 dark:text-indigo-400" />,
      bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
      title: "GlikoSense AI & Analityka",
      desc: text
    };
  }
  
  if (t.includes('poprawki') || t.includes('interfejs') || t.includes('ui') || t.includes('widget') || t.includes('układ')) {
    return {
      icon: <Layout size={16} className="text-sky-500 dark:text-sky-400" />,
      bgColor: "bg-sky-50 dark:bg-sky-950/40",
      title: "UI & Widgety",
      desc: text
    };
  }
  
  // Bug fixes / standard
  return {
    icon: <Wrench size={16} className="text-slate-500 dark:text-slate-400" />,
    bgColor: "bg-slate-100 dark:bg-slate-900",
    title: "Aktualizacje",
    desc: text
  };
}
