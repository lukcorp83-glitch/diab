import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplet, Plus, Minus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Haptics } from '../lib/haptics';
import { useTranslation } from "react-i18next";

interface HydrationWidgetProps {
  size?: string;
  user?: any;
  tdee?: number;
}

export default function HydrationWidget({ size }: HydrationWidgetProps) {
    const { t } = useTranslation();
  const isCompact = size === '1x1' || size === '1x2';
  
  // Store today's glasses count in localStorage
  const [glasses, setGlasses] = useState(0);
  const dailyGoal = 8; // 8 glasses ~ 2L
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const syncHydration = () => {
      const saved = localStorage.getItem(`glikosense_hydration_${todayStr}`);
      if (saved) {
        try {
          setGlasses(parseInt(saved, 10));
        } catch(e){}
      }
    };
    syncHydration();

    // Listen for cross-tab or explicit events
    window.addEventListener('storage', syncHydration);
    window.addEventListener('hydration_updated', syncHydration);
    return () => {
      window.removeEventListener('storage', syncHydration);
      window.removeEventListener('hydration_updated', syncHydration);
    };
  }, [todayStr]);

  const updateGlasses = (newAmount: number) => {
    setGlasses(newAmount);
    localStorage.setItem(`glikosense_hydration_${todayStr}`, newAmount.toString());
    window.dispatchEvent(new Event('hydration_updated'));
  };

  const addGlass = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.success();
    updateGlasses(glasses + 1);
  };

  const removeGlass = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (glasses > 0) {
      Haptics.light();
      updateGlasses(glasses - 1);
    }
  };

  const percent = Math.min((glasses / dailyGoal) * 100, 100);


  return (
    <div className={cn(
      "glass-card w-full h-full p-4 flex flex-col relative overflow-hidden transition-all",
      isCompact ? "justify-center items-center" : "justify-between"
    )}>
      {/* Background fill based on hydration - water effect */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-blue-500/20 dark:bg-blue-500/30 transition-all duration-1000 ease-in-out pointer-events-none"
        style={{ height: `${percent}%` }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400/50 dark:bg-blue-400/40 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      </div>
      
      <div className="flex items-center justify-between z-10 w-full mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-500 flex items-center justify-center shrink-0 shadow-inner">
            <Droplet size={16} className={glasses > 0 ? "fill-blue-500/80 drop-shadow-md" : ""} />
          </div>
          {!isCompact && (
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest leading-none drop-shadow-sm">{t('auto.nawodnienie', { defaultValue: 'Nawodnienie' })}<br/>{t('auto.woda', { defaultValue: '(Woda)' })}</span>
          )}
        </div>
      </div>

      <div className={cn("flex flex-col z-10", isCompact ? "items-center text-center mt-2" : "gap-1")}>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter tabular-nums drop-shadow-sm">
            {glasses}
          </span>
          <span className="text-sm font-bold text-slate-500 mix-blend-multiply dark:mix-blend-lighten">/ {dailyGoal}</span>
        </div>
        {!isCompact && <span className="text-[10px] font-bold text-slate-500 mix-blend-multiply dark:mix-blend-lighten">{t('auto.szklanek_po_250ml', { defaultValue: 'szklanek po ~250ml' })}</span>}
      </div>

      <div className="flex items-center gap-2 mt-4 z-10 justify-center">
        <button 
          onClick={removeGlass}
          disabled={glasses === 0}
          className="w-10 h-10 rounded-full bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 disabled:active:scale-100 text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700/50"
        >
          <Minus size={18} />
        </button>
        <button 
          onClick={addGlass}
          className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center active:scale-90 transition-transform shadow-md shadow-blue-500/40 hover:bg-blue-400"
        >
          <Plus size={24} />
        </button>
      </div>

      {isCompact && (
        <span className="text-[9px] font-bold text-slate-500 mix-blend-multiply dark:mix-blend-screen mt-3 text-center uppercase tracking-wider relative z-10 w-full">{Math.round(percent)}{t('auto.celu', { defaultValue: '% Celu' })}</span>
      )}
    </div>
  );
}
