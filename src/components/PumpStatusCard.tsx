import React from 'react';
import { motion } from 'motion/react';
import { Battery, Database, Activity, Zap, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface PumpStatusProps {
  data: {
    battery: number;
    reservoir: number;
    activeInsulin: number;
    basal: {
      rate: number;
      isTemp: boolean;
    };
    lastUpdate?: any;
  } | null;
  loading?: boolean;
}

export const PumpStatusCard: React.FC<PumpStatusProps> = ({ data, loading }) => {
  if (!data) return null;

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-emerald-500';
    if (level > 20) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getReservoirColor = (units: number) => {
    if (units > 50) return 'text-blue-500';
    if (units > 20) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass p-6 rounded-[2.5rem] border-l-4 border-l-blue-500 relative overflow-hidden"
    >
      {/* Background Accent */}
      <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
        <Activity size={120} />
      </div>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-1">Status Pompy</h3>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black dark:text-white">MiniMed 780G</span>
            <div className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[8px] font-black rounded-full uppercase">CareLink Live</div>
          </div>
        </div>
        
        {data.lastUpdate && (
          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
            <Clock size={10} />
            {new Date(data.lastUpdate.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Reservoir */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
            <Database size={10} /> Zbiornik
          </div>
          <div className={cn("text-lg font-black", getReservoirColor(data.reservoir))}>
            {data.reservoir != null ? Number(data.reservoir).toFixed(0) : '--'} <span className="text-[10px] opacity-70">U</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(((data.reservoir || 0) / 300) * 100, 100)}%` }}
              className="bg-blue-500 h-full"
            />
          </div>
        </div>

        {/* Battery */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
            <Battery size={10} /> Bateria
          </div>
          <div className={cn("text-lg font-black", getBatteryColor(data.battery))}>
            {data.battery != null ? Math.round(data.battery) : '--'}<span className="text-[10px] opacity-70">%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${data.battery || 0}%` }}
              className={cn("h-full", (data.battery || 0) > 20 ? 'bg-emerald-500' : 'bg-rose-500')}
            />
          </div>
        </div>

        {/* Basal */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
            <Zap size={10} /> Baza
          </div>
          <div className="text-lg font-black text-purple-500">
            {data.basal?.rate != null ? Number(data.basal.rate).toFixed(2) : '--'} <span className="text-[10px] opacity-70">U/h</span>
          </div>
          <div className="text-[8px] font-bold text-slate-400 uppercase">
            {data.basal?.isTemp ? 'Tymczasowa' : 'Standardowa'}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div>
          <span className="text-[8px] font-black text-slate-400 uppercase block">Aktywna Insulina (IOB)</span>
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">{data.activeInsulin != null ? Number(data.activeInsulin).toFixed(2) : '--'} U</span>
        </div>
        <div className="text-right">
          <span className="text-[8px] font-black text-slate-400 uppercase block">Auto-Tryb</span>
          <span className="text-[10px] font-black text-emerald-500">AKTYWNY</span>
        </div>
      </div>
    </motion.div>
  );
};
