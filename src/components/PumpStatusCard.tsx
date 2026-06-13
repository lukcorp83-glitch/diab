import i18n from '../i18n';
import React from 'react';
import { motion } from 'motion/react';
import { Battery, Database, Activity, Zap, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";

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
    uploader?: {
      battery?: number;
      type?: string;
    } | null;
  } | null;
  loading?: boolean;
  compact?: boolean;
}

export const PumpStatusCard: React.FC<PumpStatusProps> = ({ data, loading, compact = false }) => {
    const { t } = useTranslation();
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

  // Determine what device we are actually showing
  // If we have reservoir or active insulin, it's likely a pump. Otherwise, maybe just CGM/Uploader.
  const isPump = data.reservoir > 0 || data.basal?.rate > 0 || data.activeInsulin > 0;
  const deviceName = isPump ? "MiniMed 780G / Pompa" : (data.uploader?.type || "xDrip / Uploader");
  const deviceSource = isPump ? "CareLink Live" : "Nightscout";

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("glass rounded-[2.5rem] border-l-4 border-l-blue-500 relative overflow-hidden", compact ? "p-4" : "p-6")}
    >
      {/* Background Accent */}
      <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
        <Activity size={120} />
      </div>

      <div className={cn("flex justify-between items-start", compact ? "mb-4" : "mb-6")}>
        <div>
          <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-1">
            {isPump ? 'Status Pompy' : i18n.t('auto.status_urzadzenia', { defaultValue: "Status Urządzenia" })}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("font-black dark:text-white", compact ? "text-base" : "text-xl")}>{deviceName}</span>
            <div className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 text-[8px] font-black rounded-full uppercase">{deviceSource}</div>
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
        {isPump ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
              <Database size={10} />  {t('auto.zbiornik', { defaultValue: 'Zbiornik' })}
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
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
              <Activity size={10} />  {t('auto.rodzaj', { defaultValue: 'Rodzaj' })}
                                          </div>
            <div className="text-sm font-black text-slate-600 dark:text-slate-300">
              
                                            {t('auto.cgm_only', { defaultValue: 'CGM Only' })}
                                          </div>
            <div className="text-[8px] font-bold text-slate-400 uppercase">{t('auto.brak_pompy', { defaultValue: 'Brak pompy' })}</div>
          </div>
        )}

        {/* Battery */}
        {(isPump || data.battery !== data.uploader?.battery) && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
              <Battery size={10} /> {isPump ? 'Bateria Pompy' : 'Bateria'}
            </div>
            <div className={cn("text-lg font-black", getBatteryColor((data.battery || 0) > 10 ? Math.min(data.battery || 0, 100) : ((data.battery || 0)/1.5)*100))}>
              {data.battery != null ? (
                 data.battery <= 10 && data.battery > 0 ? (
                   <>{Number(data.battery).toFixed(2)}<span className="text-[10px] opacity-70">V</span></>
                 ) : (
                   <>{Math.min(Math.round(data.battery), 100)}<span className="text-[10px] opacity-70">%</span></>
                 )
              ) : '--'}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(data.battery || 0) <= 10 && (data.battery || 0) > 0 ? ((data.battery || 0)/1.5)*100 : Math.min(data.battery || 0, 100)}%` }}
                className={cn("h-full", ((data.battery || 0) <= 10 ? ((data.battery || 0)/1.5)*100 : (data.battery || 0)) > 20 ? 'bg-emerald-500' : 'bg-rose-500')}
              />
            </div>
          </div>
        )}

        {/* Uploader Battery or Basal */}
        {data.uploader?.battery != null && (!isPump || data.battery !== data.uploader.battery) ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
              <Battery size={10} />  {t('auto.telefon', { defaultValue: 'Telefon' })}
                                      </div>
            <div className={cn("text-lg font-black", getBatteryColor(Math.min(data.uploader.battery, 100)))}>
              {Math.min(Math.round(data.uploader.battery), 100)}<span className="text-[10px] opacity-70">%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(data.uploader.battery, 100)}%` }}
                className={cn("h-full", data.uploader.battery > 20 ? 'bg-emerald-500' : 'bg-rose-500')}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
              <Zap size={10} />  {t('auto.baza', { defaultValue: 'Baza' })}
                                          </div>
            <div className="text-lg font-black text-purple-500">
              {data.basal?.rate != null ? Number(data.basal.rate).toFixed(2) : '--'} <span className="text-[10px] opacity-70">{t('auto.u_h', { defaultValue: 'U/h' })}</span>
            </div>
            <div className="text-[8px] font-bold text-slate-400 uppercase">
              {data.basal?.isTemp ? 'Tymczasowa' : 'Standardowa'}
            </div>
          </div>
        )}
      </div>

      <div className={cn("pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center", compact ? "mt-4" : "mt-6")}>
        <div>
          <span className="text-[8px] font-black text-slate-400 uppercase block">{t('auto.profil_działania_insuliny_iob', { defaultValue: 'Profil Działania Insuliny (IOB)' })}</span>
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">{data.activeInsulin != null ? Number(data.activeInsulin).toFixed(2) : '--'} U</span>
          {data.activeInsulin > 0 && (
            <span className="text-[7px] font-bold text-pink-500/80 block mt-0.5">{t('auto.start_20m_szczyt_75m', { defaultValue: 'Start: ~20m • Szczyt: ~75m' })}</span>
          )}
        </div>
        <div className="text-right">
          <span className="text-[8px] font-black text-slate-400 uppercase block">{t('auto.auto_tryb', { defaultValue: 'Auto-Tryb' })}</span>
          <span className={cn("text-[10px] font-black", isPump ? "text-emerald-500" : "text-slate-400")}>
            {isPump ? 'AKTYWNY' : 'N/A'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
