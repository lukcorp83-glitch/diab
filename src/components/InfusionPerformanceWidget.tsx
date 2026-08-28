import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, AlertTriangle, ShieldCheck, Clock, Zap, Activity, CheckCircle2, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { useLogsStore } from '../stores/useLogsStore';
import { UserSettings } from '../types';
import { InfusionAnalysisService, InfusionAnalysisResult } from '../services/infusionAnalysisService';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface InfusionPerformanceWidgetProps {
  settings?: UserSettings;
  onReplaceClick?: () => void;
}

export default function InfusionPerformanceWidget({ settings }: InfusionPerformanceWidgetProps) {
  const { t } = useTranslation();
  const logs = useLogsStore((state) => state.logs);
  const [isExpanded, setIsExpanded] = useState(false);

  const analysis: InfusionAnalysisResult = useMemo(() => {
    return InfusionAnalysisService.analyze(logs, settings);
  }, [logs, settings]);

  const { currentSite, daysBreakdown, recommendation, occlusionRisk } = analysis;

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'optimal':
        return { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', bar: 'bg-emerald-500' };
      case 'good':
        return { bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30', bar: 'bg-teal-500' };
      case 'degraded':
        return { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', bar: 'bg-amber-500' };
      case 'expired':
      default:
        return { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', bar: 'bg-rose-500' };
    }
  };

  const statusStyle = getStatusColor(currentSite.statusLevel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 md:p-6 rounded-[2.5rem] shadow-xl border border-slate-200/60 dark:border-slate-800/80 relative overflow-hidden flex flex-col gap-4"
    >
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-teal-500/10 dark:bg-teal-500/15 blur-[60px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg shadow-teal-500/20 text-white flex items-center justify-center">
            <Droplets size={20} className="fill-white/20" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              {t('auto.wydajnosc_wklucia', { defaultValue: 'Wydajność Bieżącego Wkłucia' })}
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 rounded-full">
                Aktywne
              </span>
            </h3>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {t('auto.analiza_biezacej_kaniuli', { defaultValue: 'Monitorowanie wchłaniania i żywotności założonej kaniuli' })}
            </span>
          </div>
        </div>

        {/* Toggle details button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-full transition-all cursor-pointer"
        >
          <span>{isExpanded ? t('auto.zwin_etapy', { defaultValue: 'Zwiń' }) : t('auto.pokaz_etapy', { defaultValue: 'Szczegóły' })}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Occlusion Warning */}
      {occlusionRisk.isRiskDetected && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-3 text-rose-700 dark:text-rose-300 shadow-lg shadow-rose-500/10 z-10"
        >
          <div className="p-2 bg-rose-500 text-white rounded-xl shrink-0 mt-0.5">
            <AlertTriangle size={18} className="animate-pulse" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-black uppercase tracking-wider">
              {t('auto.uwaga_mozliwa_niedroznosc', { defaultValue: 'Uwaga: Ryzyko niedrożności lub zagięcia kaniuli!' })}
            </span>
            <p className="text-xs leading-relaxed font-medium opacity-90">
              {occlusionRisk.message}
            </p>
          </div>
        </motion.div>
      )}

      {/* Current Site Main Compact Card */}
      <div className={cn("p-4 rounded-2xl border flex flex-col gap-3 transition-all z-10", statusStyle.bg, statusStyle.border)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className={statusStyle.text} />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {t('auto.czas_od_zalozenia', { defaultValue: 'Czas od założenia:' })}{' '}
              <strong className="font-black text-slate-900 dark:text-white">{currentSite.ageHours}h ({currentSite.ageDays} d)</strong>
            </span>
          </div>
          <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border", statusStyle.bg, statusStyle.text, statusStyle.border)}>
            {currentSite.statusLevel === 'optimal' && t('auto.stan_optymalny', { defaultValue: 'Świeże Wkłucie' })}
            {currentSite.statusLevel === 'good' && t('auto.stan_dobry', { defaultValue: 'Dobre Wchłanianie' })}
            {currentSite.statusLevel === 'degraded' && t('auto.spadek_wchlaniania', { defaultValue: 'Spadek Wchłaniania' })}
            {currentSite.statusLevel === 'expired' && t('auto.wymagane_nowe', { defaultValue: 'Wymień Wkłucie' })}
          </span>
        </div>

        {/* Absorption Efficiency Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Zap size={13} className="text-amber-500" /> {t('auto.szacowana_sprawnosc', { defaultValue: 'Sprawność wchłaniania kaniuli' })}
            </span>
            <span className={cn("font-black text-sm", statusStyle.text)}>
              {currentSite.currentEfficiency}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300/30 dark:border-slate-700/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: String(Math.min(100, Math.max(5, currentSite.currentEfficiency))) + '%' }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn("h-full rounded-full shadow-sm", statusStyle.bar)}
            />
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/40 text-center">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase text-slate-400">{t('auto.podane_bolusy', { defaultValue: 'Bolusy' })}</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">{currentSite.bolusCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase text-slate-400">{t('auto.sr_cukier', { defaultValue: 'Śr. Cukier' })}</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">
              {currentSite.avgGlucose !== null ? String(currentSite.avgGlucose) + ' mg/dL' : '—'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase text-slate-400">{t('auto.pozostaly_czas', { defaultValue: 'Do wymiany' })}</span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">
              ~{currentSite.hoursRemaining}h
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Lifecycle Timeline */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4 overflow-hidden z-10"
          >
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                {t('auto.etapy_zywotnosci_wklucia', { defaultValue: 'Etapy cyklu założonego wkłucia' })}
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {daysBreakdown.map((day) => (
                  <div
                    key={day.dayNumber}
                    className={cn(
                      "p-3 rounded-2xl border flex flex-col gap-2 relative overflow-hidden transition-all",
                      day.isActive 
                        ? "bg-cyan-50/80 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-700/50 ring-2 ring-cyan-500/20" 
                        : day.isPast
                        ? "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-800"
                        : "bg-slate-50/40 dark:bg-slate-800/20 border-dashed border-slate-200/40 dark:border-slate-800/40 opacity-70"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-[11px] font-black",
                        day.isActive ? "text-cyan-700 dark:text-cyan-300" : "text-slate-700 dark:text-slate-300"
                      )}>
                        {day.label}
                      </span>
                      {day.isActive ? (
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" title="Aktywny etap" />
                      ) : day.isPast ? (
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      ) : (
                        <Lock size={11} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      {day.efficiencyPercent !== null ? (
                        <>
                          <span className={cn(
                            "text-lg font-black tracking-tight",
                            day.efficiencyPercent >= 90 ? "text-emerald-600 dark:text-emerald-400" :
                            day.efficiencyPercent >= 75 ? "text-indigo-600 dark:text-indigo-400" :
                            "text-amber-600 dark:text-amber-400"
                          )}>
                            {day.efficiencyPercent}%
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{t('auto.wydajnosc', { defaultValue: 'wydajności' })}</span>
                        </>
                      ) : (
                        <span className={cn(
                          "text-xs font-black tracking-tight py-0.5",
                          day.isActive ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"
                        )}>
                          {day.statusText}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col text-[10px] text-slate-500 dark:text-slate-400 gap-0.5 border-t border-slate-200/40 dark:border-slate-700/40 pt-1.5">
                      <div className="flex justify-between">
                        <span>{t('auto.sr_cukier', { defaultValue: 'Śr. cukier' })}:</span>
                        <strong className="text-slate-700 dark:text-slate-300">
                          {day.avgGlucose !== null ? String(day.avgGlucose) + ' mg/dL' : '—'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('auto.probki', { defaultValue: 'Korekty' })}:</span>
                        <strong className="text-slate-700 dark:text-slate-300">
                          {day.sampleCount > 0 ? String(day.sampleCount) : '0'}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-100/80 to-cyan-50/80 dark:from-slate-800/40 dark:to-cyan-950/20 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3">
              <div className="p-2 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl shrink-0 mt-0.5">
                <ShieldCheck size={18} />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {t('auto.status_biezacego_wklucia_ai', { defaultValue: 'Status Bieżącego Wkłucia (AI)' })}
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {recommendation}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
