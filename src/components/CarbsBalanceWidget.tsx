import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Edit3, Check } from 'lucide-react';
import { LogEntry, UserSettings } from '../types';
import { cn } from '../lib/utils';
import { Haptics } from '../lib/haptics';

interface CarbsBalanceWidgetProps {
  logs: LogEntry[];
  settings: UserSettings;
  size: string;
  onAction?: (action: string) => void;
  setTab: (t: string) => void;
}

export default function CarbsBalanceWidget({ logs, settings, size, onAction, setTab }: CarbsBalanceWidgetProps) {
  const isCompact = size === '1x1' || size === '1x2';

  const [dailyGoal, setDailyGoal] = useState(200); 
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem('glikosense_carbs_goal');
    if (saved) {
      try {
        setDailyGoal(parseInt(saved, 10));
      } catch(e){}
    }
  }, []);

  const dailyCarbs = useMemo(() => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const ms = todayMidnight.getTime();
    
    return logs
      .filter(l => (l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal?.carbs)) && l.timestamp >= ms)
      .reduce((sum, l) => sum + (l.type === 'meal' ? (l.value || 0) : (l.linkedMeal?.carbs || 0)), 0);
  }, [logs]);

  const percent = Math.min((dailyCarbs / dailyGoal) * 100, 100);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditVal(dailyGoal.toString());
    setIsEditing(true);
  };

  const saveGoal = (e: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const val = parseInt(editVal, 10);
    if (!isNaN(val) && val > 0) {
      setDailyGoal(val);
      localStorage.setItem('glikosense_carbs_goal', val.toString());
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={cn("glass-card w-full h-full p-4 flex flex-col justify-center relative overflow-hidden transition-all", isCompact ? "items-center" : "items-start")}>
         <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Ustaw Dzienny Cel (g)</span>
         <form onSubmit={saveGoal} className="flex gap-2 w-full">
           <input 
             type="number" 
             value={editVal} 
             onChange={e => setEditVal(e.target.value)} 
             autoFocus
             className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
             onClick={e => e.stopPropagation()}
           />
           <button 
             type="submit" 
             onClick={saveGoal}
             className="shrink-0 bg-emerald-500 text-white w-9 h-9 rounded-xl flex justify-center items-center active:scale-95 transition-transform"
           >
             <Check size={16} />
           </button>
         </form>
      </div>
    );
  }

  return (
    <div 
      onClick={() => {
        Haptics.light();
        setTab("profile");
        onAction?.("food");
      }}
      className={cn(
        "glass-card w-full h-full p-4 flex flex-col relative overflow-hidden transition-all active:scale-[0.98]",
        isCompact ? "justify-center" : "justify-between"
      )}
    >
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-500 flex items-center justify-center shrink-0">
            <Utensils size={16} />
          </div>
          {!isCompact && (
            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest leading-none">Dzienny bilans<br/>węglowodanów</span>
          )}
        </div>
        <button 
          onClick={startEdit}
          className="text-slate-400 hover:text-orange-500 transition-colors p-1"
        >
          <Edit3 size={14} />
        </button>
      </div>

      <div className={cn("flex flex-col gap-1", isCompact ? "items-center text-center mt-2" : "")}>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter tabular-nums drop-shadow-sm">
            {Math.round(dailyCarbs)}
          </span>
          <span className="text-sm font-bold text-slate-400">g</span>
        </div>
        {!isCompact && <span className="text-[10px] font-bold text-slate-400">z ok. {dailyGoal}g docelowych</span>}
      </div>

      <div className="mt-3 bg-slate-100 dark:bg-slate-800/50 rounded-full h-2 w-full overflow-hidden shrink-0">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={cn(
            "h-full rounded-full bg-gradient-to-r",
            percent > 100 ? "from-red-400 to-red-500" : "from-orange-400 to-orange-500"
          )}
        />
      </div>
      {isCompact && (
        <span className="text-[9px] font-bold text-slate-400 mt-2 text-center uppercase tracking-wider">{Math.round(percent)}% Celu</span>
      )}
    </div>
  );
}
