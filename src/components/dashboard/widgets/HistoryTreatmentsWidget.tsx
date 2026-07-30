import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { useTranslation } from 'react-i18next';
// Import any needed icons from lucide-react here
import { Activity, Target, Zap, Clock, Droplet, ArrowRight, ArrowDown, ArrowUp, ArrowDownRight, ArrowUpRight, CheckCircle2, AlertCircle, Syringe, Cpu } from 'lucide-react';
import { Haptics } from '../../../lib/haptics';
import i18n from '../../../i18n';
import SwipeableItem from '../../SwipeableItem';

export default function HistoryTreatmentsWidget(props: any) {
 const { t } = useTranslation();
 const { size, isEditingLayout, user, settings, logs, lastG, 
 // add other props as needed
 petData,
 shortcuts,
 glikoTraining,
 setTab,
 handleDeleteLog,
 setEditingLog,
 setListFilter,
 pumpStatus
 } = props;
 
 // Widget body:
 const treatmentLogs = logs.filter(log => log.type === 'bolus' || (log.type as any) === 'insulin');
 const hasTreatmentLogsOnly = treatmentLogs.length > 0;
 if (!hasTreatmentLogsOnly) {
 if (isEditingLayout) {
 return (
 <div className="p-6 bg-slate-500/5 dark:bg-slate-950/10 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-[2.5rem] text-center text-xs text-slate-400 dark:text-slate-500 font-bold font-display w-full min-h-[140px] flex flex-col justify-center items-center">
 
 {t('auto.ostatnie_leczenie_brak_danych', { defaultValue: '💉 Ostatnie leczenie [Brak danych]' })}
 </div>
 );
 }
 return null;
 }

 if (size === "1x2") {
 const latestLog = treatmentLogs[0];
 return (
 <div className="glass-card !p-3.5 flex flex-col justify-between h-full w-full relative overflow-hidden text-left min-h-[220px]">
 <div className="absolute top-0 right-0 w-24 h-24 bg-accent-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
 
 <div className="flex justify-between items-center w-full">
 <div className="p-1.5 rounded-lg shrink-0 bg-accent-500/10 text-accent-500">
 <Syringe size={14} />
 </div>
 <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{t('auto.leczenie', { defaultValue: 'Leczenie' })}</span>
 </div>
 
 <div className="mt-2 text-left">
 <span className="text-[7px] uppercase font-black text-slate-400 block mb-0.5 opacity-60">{t('auto.ostatni_wpis', { defaultValue: 'Ostatni wpis' })}</span>
 <p className="font-black text-2xl dark:text-white font-display leading-none tracking-tight">
 {typeof latestLog.value === 'number' ? Number(latestLog.value.toFixed(1)) : Number(Number(latestLog.value).toFixed(1))}
 <span className="text-[10px] opacity-50 font-sans font-medium uppercase ml-1">j.</span>
 </p>
 <p className="text-[8px] text-slate-400 mt-0.5 truncate">
 {t('auto.godz', { defaultValue: 'godz.' })} {new Date(latestLog.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {latestLog.description || 'Bolus'}
 </p>
 </div>

 <div className="my-3 border-t border-slate-100 dark:border-white/5 pt-3 flex-1 flex flex-col gap-2 overflow-hidden">
 <span className="text-[7px] uppercase font-black text-slate-400 block opacity-60">{t('auto.poprzednie', { defaultValue: 'Poprzednie' })}</span>
 <div className="space-y-1.5 flex-1 overflow-hidden">
 {treatmentLogs.slice(1, 3).map((log) => {
 return (
 <div key={log.id} className="flex justify-between items-center text-[10px] bg-slate-500/5 p-1.5 rounded-lg border border-slate-100 dark:border-white/5">
 <span className="font-black dark:text-white flex items-center gap-1">
 <Syringe size={12} className="text-indigo-400" /> {typeof log.value === 'number' ? Number(log.value.toFixed(1)) : Number(Number(log.value).toFixed(1))} j.
 </span>
 <span className="text-[8px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
 </div>
 );
 })}
 </div>
 </div>

 <button
 onClick={() => { if (!isEditingLayout) { Haptics.light(); setListFilter('treatment'); setTab("history"); } }}
 className="w-full py-1.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-500 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-center"
 >
 
 {t('auto.wszystkie', { defaultValue: 'Wszystkie ➡️' })}
 </button>
 </div>
 );
 }

 const isHistTreatCompactHeight = size.endsWith("1");
 return (
 <div className="space-y-3 w-full h-full glass-card !p-5 min-h-[220px]">
 <div className="flex justify-between items-center px-1 pb-1">
 <h3 className="text-[10px] font-black text-slate-500/60 uppercase tracking-widest flex items-center gap-2">
 <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
 {t('auto.leczenie', { defaultValue: 'Leczenie' })}
 </h3>
 <button onClick={() => { if (!isEditingLayout) { Haptics.light(); setListFilter('treatment'); setTab("history"); } }} className="text-[9px] font-black text-accent-500 uppercase font-display">{t('auto.wszystkie', { defaultValue: 'Wszystkie' })}</button>
 </div>
 <div className="space-y-2">
 {treatmentLogs.slice(0, isHistTreatCompactHeight ? 2 : 3).map((log, idx) => (
 <div key={`${log.id}-${idx}`}>
 <SwipeableItem id={log.id} onDelete={() => handleDeleteLog(log)}>
 <div onClick={() => { if (!isEditingLayout && !settings.followerMode) setEditingLog(log); }} className="glass-card !p-4 flex items-center gap-4 cursor-pointer w-full">
 <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-accent-500/10 text-accent-500">
 <Syringe size={18} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-black text-base dark:text-white font-display text-left">
 {typeof log.value === 'number' ? Number(log.value.toFixed(2)) : Number(Number(log.value).toFixed(2))} <span className="text-[10px] opacity-40 uppercase font-bold text-slate-400">j.</span>
 </p>
 <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate font-display text-left">
 {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {log.description || 'Bolus'}
 </p>
 </div>
 </div>
 </SwipeableItem>
 </div>
 ))}
 </div>
 </div>
 );
}
