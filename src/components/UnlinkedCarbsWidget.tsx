import React, { useMemo } from 'react';
import { LogEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Merge, AlertCircle, Plus, X } from 'lucide-react';
import { useTranslation } from "react-i18next";

interface Props {
  logs: LogEntry[];
  onAddCarbs: () => void;
}

export default function UnlinkedCarbsWidget({ logs, onAddCarbs }: Props) {
    const { t } = useTranslation();
  const [dismissedId, setDismissedId] = React.useState<string | null>(() => {
    return sessionStorage.getItem('dismissed_unlinked_id');
  });

  const handleDismiss = (id: string) => {
    setDismissedId(id);
    sessionStorage.setItem('dismissed_unlinked_id', id);
  };

  const latestUnlinked = useMemo(() => {
    const timeLimit = 3 * 60 * 60 * 1000; // 3 hours
    const now = Date.now();
  
    const unlinkedLogs = logs.filter(l => 
        (l.type === "bolus" || l.type === "meal") &&
        now - Number(l.timestamp) < timeLimit &&
        now - Number(l.timestamp) >= 0 &&
        (!l.items || l.items.length === 0) &&
        ((l as any).carbs > 0 || l.linkedMeal?.carbs > 0 || (l.type === "meal" && l.value > 0))
    ).sort((a,b) => b.timestamp - a.timestamp);

    return unlinkedLogs.length > 0 ? unlinkedLogs[0] : null;
  }, [logs]);

  if (!latestUnlinked || latestUnlinked.id === dismissedId) return null;

  const rawCarbs = (latestUnlinked as any).carbs || latestUnlinked.linkedMeal?.carbs || (latestUnlinked.type === "meal" ? latestUnlinked.value : 0);
  const carbs = Math.round(rawCarbs * 10) / 10;
  if (carbs <= 0) return null;
  const timeStr = new Date(latestUnlinked.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="mx-4 mt-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-5 shadow-lg relative overflow-hidden"
      >
        <button 
          onClick={() => handleDismiss(latestUnlinked.id)}
          className="absolute top-3 right-3 z-20 text-white/50 hover:text-white transition-colors p-1"
        >
          <X size={16} />
        </button>
        <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12 pointer-events-none">
          <Merge size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col items-start gap-4">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-white/80" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                
                                              {t('auto.oczekujący_posiłek', { defaultValue: i18n.t('auto.oczekujacy_posilek', { defaultValue: "Oczekujący Posiłek" }) })}
                                              </span>
             </div>
             
             <h3 className="text-lg font-black text-white leading-tight">
                
                                          {t('auto.podano', { defaultValue: 'Podano' })} {carbs}{t('auto.g_węglowodanów_o', { defaultValue: i18n.t('auto.g_weglowodanow_o', { defaultValue: "g węglowodanów o" }) })} {timeStr}
             </h3>
             
             <p className="text-[11px] font-bold text-indigo-100 pr-4 leading-relaxed mt-1">
                
                                          {t('auto.ten_wpis_z_pompy_nie_zawiera_inform', { defaultValue: i18n.t('auto.ten_wpis_z_pompy_nie_zawi', { defaultValue: "Ten wpis z pompy nie zawiera informacji o jedzeniu. Dodaj składniki, aby GlikoSense mogło analizować wchłanianie." }) })}
                                       </p>
          </div>
          
          <button
            onClick={onAddCarbs}
            className="w-full bg-white text-indigo-600 hover:bg-slate-50 font-black text-[11px] uppercase tracking-widest py-3.5 px-5 rounded-2xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-md"
          >
            <Plus size={16} />
            
                                  {t('auto.ułóż_posiłek_na_talerzu', { defaultValue: i18n.t('auto.uloz_posilek_na_talerzu', { defaultValue: "Ułóż Posiłek na Talerzu" }) })}
                                </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
