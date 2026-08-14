import i18n from '../i18n';
import React from 'react';
import { motion } from 'motion/react';
import { Battery, Database, Activity, Zap, Clock, Cylinder } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";

interface PumpStatusProps {
 data: {
 battery: number;
 reservoir: number;
 activeInsulin: number;
 model?: string | null;
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
 inventory?: any[];
}

export const PumpStatusCard: React.FC<PumpStatusProps> = ({ data, loading, compact = false, inventory = [] }) => {
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
  
  const formatDeviceName = (name?: string | null) => {
    if (!name) return t('auto.telefon_sledzacy', { defaultValue: 'Telefon śledzący' });
    const lower = name.toLowerCase().trim();
    if (lower === 'uploader' || lower === 'cgm / uploader') {
      return t('auto.cgm_uploader', { defaultValue: 'CGM / Telefon śledzący' });
    }
    return name.replace(/uploader/gi, t('auto.telefon_sledzacy', { defaultValue: 'Telefon śledzący' }));
  };

  const serverPumpName = data.model || (data.uploader as any)?.name || data.uploader?.type;
  const fallbackPumpName = serverPumpName || t('auto.pompa_insulinowa', { defaultValue: 'Pompa Insulinowa' });
  
  const rawDeviceName = isPump ? fallbackPumpName : (data.uploader?.type || t('auto.cgm_uploader', { defaultValue: 'CGM / Telefon śledzący' }));
  const deviceName = formatDeviceName(rawDeviceName);
  const deviceSource = isPump ? (serverPumpName ? "Nightscout / AID" : "Nightscout") : "Nightscout";

  // Obliczanie pojemności zbiorniczka
  const reservoirItem = inventory.find(i => i.category === 'reservoirs' && i.capacity);
  const reservoirCap = reservoirItem?.capacity || (data as any)?.reservoirCapacity || 300;

  let rawRes = data.reservoir != null ? Number(data.reservoir) : null;
  let displayReservoir = rawRes;
  if (rawRes !== null && rawRes > 0 && rawRes <= 1.0) {
    displayReservoir = rawRes * reservoirCap;
  }

  const fillPct = displayReservoir !== null ? Math.min(100, Math.max(0, (displayReservoir / reservoirCap) * 100)) : 0;

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
  <div className="min-w-0 flex-1">
  <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-1 truncate">
  {isPump ? 'Status Pompy' : i18n.t('auto.status_urzadzenia', { defaultValue: i18n.t('auto.status_urzadzenia', { defaultValue: "Status Urządzenia" }) })}
  </h3>
  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
  <span className={cn("font-black dark:text-white truncate max-w-full", compact ? "text-base" : "text-xl")}>{deviceName}</span>
  <div className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 text-[8px] font-black rounded-full uppercase shrink-0">{deviceSource}</div>
  </div>
  </div>
  
  {data.lastUpdate && (
  <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg shrink-0 ml-2">
  <Clock size={10} />
  {new Date(data.lastUpdate.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </div>
  )}
  </div>

  <div className="grid grid-cols-3 gap-2 sm:gap-4 overflow-hidden">
  {/* Reservoir */}
  {isPump ? (
  <div className="flex flex-col gap-1 min-w-0">
  <div className="flex items-center text-[8px] font-black text-slate-400 uppercase tracking-widest min-w-0">
  <span className="flex items-center gap-1 truncate"><Cylinder size={10} className="shrink-0" /> {t('auto.zbiornik', { defaultValue: 'Zbiorniczek' })}</span>
  </div>
  <div className={cn("font-black tracking-tight flex items-baseline gap-0.5 truncate", compact ? "text-sm" : "text-base sm:text-lg", getReservoirColor(displayReservoir ?? 0))}>
  <span className="truncate">{displayReservoir != null ? Number(displayReservoir).toFixed(0) : '--'}</span>
  <span className="text-[9px] opacity-75 font-bold shrink-0">U</span>
  <span className="text-[8px] opacity-50 text-slate-400 font-medium shrink-0">/{reservoirCap}U</span>
  </div>
  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative p-0.5 border border-blue-500/10">
  <motion.div 
  initial={{ width: 0 }}
  animate={{ width: `${fillPct}%` }}
  transition={{ duration: 1, ease: 'easeOut' }}
  className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
  />
  </div>
  </div>
  ) : (
  <div className="flex flex-col gap-1 min-w-0">
  <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">
  <Activity size={10} className="shrink-0" /> {t('auto.rodzaj', { defaultValue: 'Rodzaj' })}
  </div>
  <div className="text-sm font-black text-slate-600 dark:text-slate-300 truncate">
  {t('auto.cgm_only', { defaultValue: 'CGM Only' })}
  </div>
  <div className="text-[8px] font-bold text-slate-400 uppercase truncate">{t('auto.brak_pompy', { defaultValue: 'Brak pompy' })}</div>
  </div>
  )}

  {/* Battery */}
  {(isPump || data.battery !== data.uploader?.battery) && (
  <div className="flex flex-col gap-1 min-w-0">
  <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">
  <Battery size={10} className="shrink-0" /> <span className="truncate">{isPump ? 'Bateria Pompy' : 'Bateria'}</span>
  </div>
  <div className={cn("font-black tracking-tight flex items-baseline gap-0.5 truncate", compact ? "text-sm" : "text-base sm:text-lg", getBatteryColor((data.battery || 0) > 10 ? Math.min(data.battery || 0, 100) : ((data.battery || 0)/1.5)*100))}>
  {data.battery != null ? (
  data.battery <= 10 && data.battery > 0 ? (
  <><span className="truncate">{Number(data.battery).toFixed(2)}</span><span className="text-[10px] opacity-70 shrink-0">V</span></>
  ) : (
  <><span className="truncate">{Math.min(Math.round(data.battery), 100)}</span><span className="text-[10px] opacity-70 shrink-0">%</span></>
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
  <div className="flex flex-col gap-1 min-w-0">
  <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">
  <Battery size={10} className="shrink-0" /> <span className="truncate">{t('auto.telefon_sledzacy', { defaultValue: 'Telefon' })}</span>
  </div>
  <div className={cn("font-black tracking-tight flex items-baseline gap-0.5 truncate", compact ? "text-sm" : "text-base sm:text-lg", getBatteryColor(Math.min(data.uploader.battery, 100)))}>
  <span className="truncate">{Math.min(Math.round(data.uploader.battery), 100)}</span><span className="text-[10px] opacity-70 shrink-0">%</span>
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
  <div className="flex flex-col gap-1 min-w-0">
  <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">
  <Zap size={10} className="shrink-0" /> <span className="truncate">{t('auto.baza', { defaultValue: 'Baza' })}</span>
  </div>
  <div className={cn("font-black tracking-tight flex items-baseline gap-0.5 truncate text-purple-500", compact ? "text-sm" : "text-base sm:text-lg")}>
  <span className="truncate">{data.basal?.rate != null ? Number(data.basal.rate).toFixed(2) : '--'}</span> <span className="text-[9px] opacity-70 shrink-0">{t('auto.u_h', { defaultValue: 'U/h' })}</span>
  </div>
  <div className="text-[8px] font-bold text-slate-400 uppercase truncate">
  {data.basal?.isTemp ? 'Tymczasowa' : 'Standardowa'}
  </div>
  </div>
  )}
  </div>

 <div className={cn("pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center", compact ? "mt-4" : "mt-6")}>
 <div>
 <span className="text-[8px] font-black text-slate-400 uppercase block">{t('auto.profil_działania_insuliny_iob', { defaultValue: i18n.t('auto.profil_dzialania_insuliny', { defaultValue: "Profil Działania Insuliny (IOB)" }) })}</span>
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

