import i18n from '../i18n';
import React from 'react';
import { motion } from 'motion/react';
import { Battery, Activity, Zap, Clock, Cylinder } from 'lucide-react';
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

export const PumpStatusCard: React.FC<PumpStatusProps> = ({ data, inventory = [] }) => {
  const { t } = useTranslation();
  if (!data) return null;

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-emerald-500 dark:text-emerald-400';
    if (level > 20) return 'text-amber-500 dark:text-amber-400';
    return 'text-rose-500 dark:text-rose-400';
  };

  const getReservoirColor = (units: number) => {
    if (units > 50) return 'text-blue-500 dark:text-blue-400';
    if (units > 20) return 'text-amber-500 dark:text-amber-400';
    return 'text-rose-500 dark:text-rose-400';
  };

  const isPump = data.reservoir > 0 || data.basal?.rate > 0 || data.activeInsulin > 0;

  const formatDeviceName = (name?: string | null) => {
    if (!name) return t('auto.telefon_sledzacy', { defaultValue: 'Telefon śledzący' });
    const lower = name.toLowerCase().trim();
    if (lower === 'uploader' || lower === 'cgm / uploader') {
      return t('auto.cgm_uploader', { defaultValue: 'CGM / Telefon' });
    }
    return name.replace(/uploader/gi, t('auto.telefon_sledzacy', { defaultValue: 'Telefon' }));
  };

  const serverPumpName = data.model || (data.uploader as any)?.name || data.uploader?.type;
  const fallbackPumpName = serverPumpName || t('auto.pompa_insulinowa', { defaultValue: 'Pompa Insulinowa' });
  const rawDeviceName = isPump ? fallbackPumpName : (data.uploader?.type || t('auto.cgm_uploader', { defaultValue: 'CGM / Telefon' }));
  const deviceName = formatDeviceName(rawDeviceName);
  const deviceSource = isPump ? (serverPumpName ? "Nightscout / AID" : "Nightscout") : "Nightscout";

  const reservoirItem = inventory.find(i => i.category === 'reservoirs' && i.capacity);
  const reservoirCap = reservoirItem?.capacity || (data as any)?.reservoirCapacity || 300;

  let rawRes = data.reservoir != null ? Number(data.reservoir) : null;
  let displayReservoir = rawRes;
  if (rawRes !== null && rawRes > 0 && rawRes <= 1.0) {
    displayReservoir = rawRes * reservoirCap;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-3xl border-l-4 border-l-blue-500 relative overflow-hidden p-3.5 sm:p-4 w-full shadow-sm"
    >
      {/* Top Header: Device Name & Update Time */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black text-xs sm:text-sm dark:text-white truncate">{deviceName}</span>
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 dark:text-blue-400 text-[9px] font-black rounded-full uppercase shrink-0">{deviceSource}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {data.activeInsulin != null && (
            <div className="hidden xs:flex items-center gap-1 text-[10px] font-black text-slate-700 dark:text-slate-200">
              <span className="text-slate-400 uppercase">IOB:</span>
              <span className="text-blue-500 dark:text-blue-400">{Number(data.activeInsulin).toFixed(2)} U</span>
            </div>
          )}
          {data.lastUpdate && (
            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
              <Clock size={11} />
              <span>{new Date(data.lastUpdate.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Metrics: Single Wide Unified Row */}
      <div className="flex items-center justify-between w-full bg-slate-100/70 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 px-2 sm:px-4 py-3">
        {/* Reservoir */}
        {isPump ? (
          <div className="flex flex-col items-center flex-1 px-1">
            <div className="flex items-center gap-1">
              <Cylinder size={12} className="text-blue-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Zbiornik</span>
            </div>
            <span className={cn("text-sm sm:text-base font-black tabular-nums tracking-tight mt-1", getReservoirColor(displayReservoir ?? 0))}>
              {displayReservoir != null ? Math.round(displayReservoir) : '--'} U
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center flex-1 px-1">
            <Activity size={14} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 mt-1">CGM Only</span>
          </div>
        )}

        {/* Pump Battery */}
        {(isPump || data.battery !== data.uploader?.battery) && (
          <div className="flex flex-col items-center flex-1 px-1 border-l border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-1">
              <Battery size={12} className="text-emerald-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">{isPump ? 'Pompa' : 'Bateria'}</span>
            </div>
            <span className={cn("text-sm sm:text-base font-black tabular-nums tracking-tight mt-1", getBatteryColor((data.battery || 0) > 10 ? Math.min(data.battery || 0, 100) : ((data.battery || 0)/1.5)*100))}>
              {data.battery != null ? (
                data.battery <= 10 && data.battery > 0 ? `${Number(data.battery).toFixed(2)}V` : `${Math.min(Math.round(data.battery), 100)}%`
              ) : '--'}
            </span>
          </div>
        )}

        {/* Uploader Battery */}
        {data.uploader?.battery != null && (!isPump || data.battery !== data.uploader.battery) && (
          <div className="flex flex-col items-center flex-1 px-1 border-l border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-1">
              <Battery size={12} className="text-indigo-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Telefon</span>
            </div>
            <span className={cn("text-sm sm:text-base font-black tabular-nums tracking-tight mt-1", getBatteryColor(Math.min(data.uploader.battery, 100)))}>
              {Math.min(Math.round(data.uploader.battery), 100)}%
            </span>
          </div>
        )}

        {/* Basal Rate */}
        <div className="flex flex-col items-center flex-1 px-1 border-l border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-1">
            <Zap size={12} className="text-purple-500" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Baza</span>
          </div>
          <span className="text-sm sm:text-base font-black text-purple-500 tabular-nums tracking-tight mt-1">
            {data.basal?.rate != null ? Number(data.basal.rate).toFixed(2) : '--'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
