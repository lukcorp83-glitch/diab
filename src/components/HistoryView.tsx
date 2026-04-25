import React from 'react';
import { motion } from 'motion/react';
import { LogEntry } from '../types';
import { Activity, Utensils, Droplets, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import SwipeableItem from './SwipeableItem';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

interface HistoryProps {
  logs: LogEntry[];
  user: any;
  onBack: () => void;
}

export default function HistoryView({ logs, user, onBack }: HistoryProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95 transition-all text-slate-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black dark:text-white leading-none">Historia</h2>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Wszystkie wpisy</p>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-1"
      >
        {logs.map(log => (
          <motion.div key={log.id} variants={itemVariants}>
            <SwipeableItem 
              id={log.id}
              onDelete={async () => {
                try {
                  await deleteDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'logs', log.id));
                } catch (err) {
                  console.error("Delete failed:", err);
                }
              }}
            >
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-[2rem] flex items-center gap-4 group hover:border-slate-300 dark:hover:border-slate-700 transition-all mb-2">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner transition-colors shadow-slate-200 dark:shadow-slate-950",
                  log.type === 'glucose' ? "bg-rose-500/10 text-rose-500" :
                  log.type === 'meal' ? "bg-amber-500/10 text-amber-500" : "bg-indigo-500/10 text-indigo-500"
                )}>
                  {log.type === 'glucose' && <Activity size={18} strokeWidth={2.5} />}
                  {log.type === 'meal' && <Utensils size={18} strokeWidth={2.5} />}
                  {log.type === 'bolus' && <Droplets size={18} strokeWidth={2.5} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm dark:text-white truncate">
                    {log.value}{log.type === 'glucose' ? ' mg/dL' : log.type === 'meal' ? 'g W' : ' j.'}
                    {log.type === 'meal' && (log.protein || log.fat) && (
                      <span className="text-[10px] font-bold text-slate-400 ml-2">
                         {log.protein?.toFixed(0)}B / {log.fat?.toFixed(0)}T
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="text-[9px] font-bold text-slate-500 truncate italic">
                      {log.notes || log.description || log.type}
                    </span>
                    {log.source === 'nightscout' && (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">NS</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SwipeableItem>
          </motion.div>
        ))}
        {logs.length === 0 && (
          <motion.div variants={itemVariants} className="text-center py-20 bg-slate-100 dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Brak wpisów</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
