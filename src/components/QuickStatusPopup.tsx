import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Activity, Battery, Zap, Droplets, Info, X } from 'lucide-react';
import { LogEntry } from '../types';
import { cn } from '../lib/utils';
import { CURRENT_VERSION } from '../constants/versions';
import Logo from './Logo';

interface QuickStatusPopupProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  lastGlucose: number | null;
  iob: number;
}

export default function QuickStatusPopup({ isOpen, onClose, logs, lastGlucose, iob }: QuickStatusPopupProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-20 bg-slate-950/20 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm glass rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <Logo className="w-10 h-10" />
                <div>
                   <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">Stan Systemu</h3>
                   <p className="text-[10px] font-bold text-accent-500">GlikoControl AI v{CURRENT_VERSION}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-[1.8rem] bg-accent-500/10 border border-accent-500/20">
                <div className="flex items-center gap-2 mb-1 text-accent-500">
                  <Activity size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Glikemia</span>
                </div>
                <p className="text-2xl font-black tracking-tighter dark:text-white">
                  {lastGlucose || '--'} <span className="text-xs text-slate-500">mg/dL</span>
                </p>
              </div>

              <div className="p-4 rounded-[1.8rem] bg-indigo-500/10 border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-1 text-indigo-500">
                  <Droplets size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Aktywna (IOB)</span>
                </div>
                <p className="text-2xl font-black tracking-tighter dark:text-white">
                  {iob.toFixed(1)} <span className="text-xs text-slate-500">j</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
               <StatusItem 
                  icon={<ShieldCheck size={14} className="text-emerald-500" />} 
                  label="Baza danych" 
                  value="Połączono" 
                  status="ok" 
               />
               <StatusItem 
                  icon={<Zap size={14} className="text-amber-500" />} 
                  label="Silnik AI" 
                  value="GlikoSense v2.4" 
                  status="ok" 
               />
               <StatusItem 
                  icon={<Battery size={14} className="text-blue-500" />} 
                  label="Synchronizacja" 
                  value="Aktywna" 
                  status="ok" 
               />
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-white/5">
              <div className="flex items-center gap-2 text-slate-400">
                <Info size={12} />
                <p className="text-[9px] font-bold leading-tight italic">
                  Aplikacja jest w ciągłym rozwoju. Twoje dane są bezpieczne i szyfrowane (AES-256).
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function StatusItem({ icon, label, value, status }: { icon: any, label: string, value: string, status: 'ok' | 'warn' | 'err' }) {
  return (
    <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-white/5 border border-black/5 dark:border-white/5">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <span className={cn(
        "text-[10px] font-black",
        status === 'ok' ? "text-emerald-500" : status === 'warn' ? "text-amber-500" : "text-rose-500"
      )}>
        {value}
      </span>
    </div>
  );
}
