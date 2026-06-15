import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry } from '../types';
import { AlertTriangle, Apple, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Haptics } from '../lib/haptics';
import { useTranslation } from "react-i18next";

interface LowGlucoseMealAlertProps {
  logs: LogEntry[];
  lastGlucose: number | null;
  onAddCarbs: () => void;
  shortcuts?: any[];
  onQuickAdd?: (shortcut: any) => void;
}

export default function LowGlucoseMealAlert({ logs, lastGlucose, onAddCarbs, shortcuts, onQuickAdd }: LowGlucoseMealAlertProps) {
    const { t } = useTranslation();
  const [dismissed, setDismissed] = React.useState(() => {
    const val = sessionStorage.getItem('hypo_dismissed_time');
    if (val && Date.now() - Number(val) < 60 * 60 * 1000) return true;
    return false;
  });

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('hypo_dismissed_time', Date.now().toString());
  };

  const shouldAlert = useMemo(() => {
    if (dismissed) return false;
    if (!lastGlucose || lastGlucose > 70) return false;
    
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    
    // Sort logs descending by timestamp
    const sortedLogs = [...logs].sort((a, b) => {
      const tsA = a.timestamp || new Date(a.createdAt).getTime();
      const tsB = b.timestamp || new Date(b.createdAt).getTime();
      return tsB - tsA;
    });

    // Check if user recently logged any meal or carbs
    const recentCarbs = sortedLogs.filter(l => {
      if (l.type !== 'meal') return false;
      const ts = l.timestamp || new Date(l.createdAt).getTime();
      return ts >= twoHoursAgo;
    });

    if (recentCarbs.length === 0) {
      return true;
    }

    return false;
  }, [logs, lastGlucose, dismissed]);

  if (!shouldAlert) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, height: 0 }}
        className="mb-6 relative overflow-hidden bg-gradient-to-r from-red-600 to-rose-600 rounded-[2rem] p-5 shadow-xl shadow-red-500/20 pr-10"
      >
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 z-20 text-white/50 hover:text-white transition-colors p-1"
        >
          <X size={16} />
        </button>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
               <AlertTriangle size={24} className="animate-pulse" />
             </div>
             <div className="text-white">
               <h3 className="text-sm font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                 
                                               {t('auto.hipoglikemia', { defaultValue: 'Hipoglikemia (' })}{lastGlucose} <span className="text-[10px]">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>)
               </h3>
               <p className="text-xs text-white/90 font-medium">
                 
                                               {t('auto.twój_cukier_jest_niski_zjadłeś_aś_c', { defaultValue: i18n.t('auto.twoj_cukier_jest_niski_zj', { defaultValue: "Twój cukier jest niski. Zjadłeś/aś coś i chcesz to szybko zapisać?" }) })}
                                             </p>
             </div>
          </div>
          <button
            onClick={() => {
               Haptics.selection();
               onAddCarbs();
            }}
            className="w-full md:w-auto px-6 py-3.5 bg-white text-red-600 hover:bg-slate-50 transition-all rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-black/10 shrink-0"
          >
            <Apple size={16} />
            
                                  {t('auto.dodaj_posiłek', { defaultValue: i18n.t('auto.dodaj_posilek', { defaultValue: "Dodaj posiłek" }) })}
                                </button>
        </div>

        {shortcuts && shortcuts.length > 0 && onQuickAdd && (
          <div className="relative z-10 mt-5 pt-5 border-t border-white/20">
            <p className="text-[9px] text-white/90 font-black uppercase tracking-widest mb-3">{t('auto.szybkie_skróty', { defaultValue: i18n.t('auto.szybkie_skroty', { defaultValue: "Szybkie skróty:" }) })}</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x scrollbar-hide">
              {shortcuts.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    Haptics.selection();
                    onQuickAdd(s);
                  }}
                  className="flex-shrink-0 snap-start bg-white/10 hover:bg-white/20 transition-all border border-white/20 rounded-2xl p-3 flex flex-col items-center gap-2 min-w-[80px]"
                >
                  <span className="text-2xl">{s.icon || '🍽️'}</span>
                  <span className="text-[10px] font-bold text-white text-center line-clamp-1 w-full">{s.name}</span>
                  <span className="text-[9px] font-black text-white/80 bg-white/10 px-2 py-0.5 rounded-full">{Number(s.carbs).toFixed(1)}{t('auto.g_w', { defaultValue: 'g W' })}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
