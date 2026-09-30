import { useAuthStore } from '../stores/useAuthStore';
import { getEffectiveUid, cn } from '../lib/utils';
import { useLogsStore } from "../stores/useLogsStore";
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry, UserSettings } from '../types';
import { MessageSquare, Calculator, History, TrendingUp, Activity, Loader2, Calendar, Trash2, Plane } from 'lucide-react';
import { db } from '../lib/firebase';
import SwipeableItem from './SwipeableItem';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { geminiService } from '../services/gemini';
import { GlikoSenseLearner } from '../services/mlSugarAnalyzer';
import { useAiReports } from '../hooks/queries/useAiReports';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts';
import GlikoSenseIcon from './GlikoSenseIcon';
import MLAnalysisWidget from './MLAnalysisWidget';
import InfusionPerformanceWidget from './InfusionPerformanceWidget';
import InsulinDetectiveAlert from './InsulinDetectiveAlert';
import AGPReport from './AGPReport';
import { toast } from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function AiReports({ settings, setTab}: { user: any, settings?: UserSettings, setTab?: (tab: string) => void }) {
  const user = useAuthStore(state => state.user);

 const { t } = useTranslation();
 const { logs } = useLogsStore();
 const { data: reportsData } = useAiReports(user);
 const reports: any[] = reportsData || [];
 const [loading, setLoading] = useState(false);
 const [activeReport, setActiveReport] = useState<string | null>(null);
 const [showAGP, setShowAGP] = useState(false);

 const generateReport = async (type: 'master' | 'day' | 'month' = 'master') => {
 setLoading(true);
 // Instead we use a toast to indicate background processing.
 const loadingToastId = toast.loading("Generowanie raportu w tle...");
 
 const progressTexts = [
 "Analiza danych na serwerze...",
 i18n.t('auto.wykrywanie_trendow_i_wzorcow', { defaultValue: i18n.t('auto.wykrywanie_trendow_i_wzor', { defaultValue: "Wykrywanie trendów i wzorców..." }) }),
 i18n.t('auto.przygotowywanie_wnioskow_ai', { defaultValue: i18n.t('auto.przygotowywanie_wnioskow', { defaultValue: "Przygotowywanie wniosków AI..." }) }),
 "Prawie gotowe..."
 ];
 let ptIdx = 0;
 const progressInterval = setInterval(() => {
 ptIdx = (ptIdx + 1) % progressTexts.length;
 toast.loading(progressTexts[ptIdx], { id: loadingToastId });
 }, 4000);

 try {
 let content = "";
 let reportType = "";
 
 if (type === 'master') {
 content = await geminiService.getMasterAnalysis(logs, settings);
 reportType = "Kompleksowa Analiza GlikoControl";
 } else {
 const days = type === 'day' ? 1 : 30;
 const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
 const filteredLogs = logs.filter(l => {
 const ts = l.timestamp || new Date(l.createdAt).getTime();
 return ts > cutoff;
 });
 content = await geminiService.getPeriodAnalysis(type, filteredLogs, settings);
 if (type === 'day') reportType = "Raport Dzienny";
 else reportType = i18n.t('auto.raport_miesieczny', { defaultValue: i18n.t('auto.raport_miesieczny', { defaultValue: "Raport Miesięczny" }) });
 }
 
 // Feed local ML model with learnings from Gemini AI
 if (content) {
 setTimeout(() => GlikoSenseLearner.learnFromGemini(content), 0);
 }

 await addDoc(collection(db, 'users', getEffectiveUid(user), 'aiReports'), {
 type: reportType,
 content,
 timestamp: Date.now()
 });
 clearInterval(progressInterval);
 toast.success(i18n.t('auto.raport_wygenerowany_pomyslnie', { defaultValue: i18n.t('auto.raport_wygenerowany_pomys', { defaultValue: "Raport wygenerowany pomyślnie!" }) }), { id: loadingToastId });
 } catch (e) {
 clearInterval(progressInterval);
 console.error(e);
 const errStr = String(e);
 if (errStr.includes("API key not valid") || errStr.includes("API_KEY_INVALID")) {
 toast.error(i18n.t('auto.nieprawidlowy_klucz_api', { defaultValue: i18n.t('auto.nieprawidlowy_klucz_api', { defaultValue: "Nieprawidłowy klucz API." }) }), { id: loadingToastId });
 } else if (errStr.includes(i18n.t('auto.zajete', { defaultValue: i18n.t('auto.zajete', { defaultValue: "zajęte" }) }))) {
 toast.error(i18n.t('auto.serwery_ai_zapchane_sprobuj_po', { defaultValue: i18n.t('auto.serwery_ai_zapchane_sprob', { defaultValue: "Serwery AI zapchane. Spróbuj później." }) }), { id: loadingToastId });
 } else if (errStr.includes("Timeout_AI") || errStr.includes("Request Timeout")) {
 toast.error("Przekroczono czas (Timeout). Zbyt wiele danych do przetworzenia.", { id: loadingToastId });
 } else {
 toast.error(i18n.t('auto.blad_generowania_raportu_ai', { defaultValue: i18n.t('auto.blad_generowania_raportu', { defaultValue: "Błąd generowania raportu AI." }) }), { id: loadingToastId });
 }
 } finally {
 clearInterval(progressInterval);
 setLoading(false);
 }
 };

 const { chartData, stats30d } = useMemo(() => {
 const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
 const targetMin = settings?.targetMin || 70;
 const targetMax = settings?.targetMax || 180;

 const glucoseLogs = logs.filter(l => {
 if (l.type !== 'glucose' && !l.bg) return false;
 const ts = l.timestamp || new Date(l.createdAt).getTime();
 return typeof ts === 'number' && ts > thirtyDaysAgo;
 });
 
 if (glucoseLogs.length === 0) return { chartData: [], stats30d: null };

 const grouped = glucoseLogs.reduce((acc, log) => {
 const ts = log.timestamp || new Date(log.createdAt).getTime();
 const dateObj = new Date(ts);
 if (isNaN(dateObj.getTime())) return acc;
 const date = dateObj.toISOString().split('T')[0];
 if (!acc[date]) acc[date] = [];
 const val = typeof log.value === 'number' ? log.value : log.bg;
 if (val) acc[date].push(val);
 return acc;
 }, {} as Record<string, number[]>);

 let totalReadings = 0;
 let totalInRange = 0;
 let sumValues = 0;
 const allValues: number[] = [];

 const data = Object.entries(grouped)
 .map(([date, values]) => {
 const inRangeCount = values.filter(v => v >= targetMin && v <= targetMax).length;
 const dayTir = Math.round((inRangeCount / values.length) * 100);
 const dayAvg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
 const minVal = Math.round(Math.min(...values));
 const maxVal = Math.round(Math.max(...values));

 totalReadings += values.length;
 totalInRange += inRangeCount;
 values.forEach(v => {
 sumValues += v;
 allValues.push(v);
 });

 const dotColor = dayTir >= 70 ? '#10b981' : dayTir >= 50 ? '#f59e0b' : '#f43f5e';

 return {
 date: new Date(date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
 fullDate: new Date(date).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' }),
 srednia: dayAvg,
 zakres: [minVal, maxVal],
 min: minVal,
 max: maxVal,
 tir: dayTir,
 dotColor,
 rawDate: date
 };
 })
 .sort((a, b) => a.rawDate.localeCompare(b.rawDate));

 const overallMean = totalReadings > 0 ? Math.round(sumValues / totalReadings) : 0;
 const overallTir = totalReadings > 0 ? Math.round((totalInRange / totalReadings) * 100) : 0;
 
 // Szacowane HbA1c (GMI: Glucose Management Indicator = (mean + 46.7) / 28.7)
 const hba1c = overallMean > 0 ? Math.round(((overallMean + 46.7) / 28.7) * 10) / 10 : 0;

 return {
 chartData: data,
 stats30d: {
 mean: overallMean,
 tir: overallTir,
 hba1c,
 targetMin,
 targetMax
 }
 };
 }, [logs, settings?.targetMin, settings?.targetMax]);

 return (
 <>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
 <InsulinDetectiveAlert />
 <MLAnalysisWidget user={user} settings={settings} setTab={setTab} />
 <InfusionPerformanceWidget settings={settings} />
 
 {/* Glucose Trend Chart - Theme-Compliant & Redesigned */}
 {chartData.length > 0 && stats30d && (
 <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-5 sm:p-6 shadow-sm transition-colors">
 <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
 <div className="flex items-center gap-2.5">
 <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20">
 <TrendingUp size={18} />
 </div>
 <div>
 <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{t('auto.trend_miesięczny', { defaultValue: i18n.t('auto.trend_miesieczny', { defaultValue: "Trend Miesięczny" }) })}</h3>
 <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{t('auto.średni_dobowy_poziom_cukru_mg_dl', { defaultValue: i18n.t('auto.sredni_dobowy_poziom_cukr', { defaultValue: "Średni dobowy poziom cukru i rozkład TIR" }) })}</p>
 </div>
 </div>

 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700/60">
 <span className={cn(
 "w-2 h-2 rounded-full",
 stats30d.tir >= 70 ? "bg-emerald-500" : stats30d.tir >= 50 ? "bg-amber-500" : "bg-rose-500"
 )} />
 <span className="text-slate-700 dark:text-slate-300">
 TIR 30D: <strong className={cn(
 stats30d.tir >= 70 ? "text-emerald-600 dark:text-emerald-400" : stats30d.tir >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
 )}>{stats30d.tir}%</strong>
 </span>
 </div>
 </div>
 
 <div className="h-56 w-full select-none">
 <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 224 }} minWidth={100} minHeight={100}>
 <AreaChart data={chartData} margin={{ top: 10, right: 36, left: -22, bottom: 0 }}>
 <defs>
 <linearGradient id="colorAvgMonthly" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
 <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
 </linearGradient>
 <linearGradient id="colorRangeMonthly" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
 <stop offset="95%" stopColor="#818cf8" stopOpacity={0.08} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
 <XAxis 
 dataKey="date" 
 axisLine={false} 
 tickLine={false} 
 tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
 interval="preserveStartEnd"
 />
 <YAxis 
 domain={['dataMin - 15', 'dataMax + 15']}
 axisLine={false}
 tickLine={false}
 tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
 width={32}
 />
 <ReferenceLine 
 y={stats30d.targetMax} 
 stroke="#10b981" 
 strokeDasharray="4 4" 
 strokeOpacity={0.6}
 label={{ position: 'insideTopRight', value: `${stats30d.targetMax}`, fill: '#10b981', fontSize: 9, fontWeight: 800, offset: 4 }} 
 />
 <ReferenceLine 
 y={stats30d.targetMin} 
 stroke="#10b981" 
 strokeDasharray="4 4" 
 strokeOpacity={0.6}
 label={{ position: 'insideBottomRight', value: `${stats30d.targetMin}`, fill: '#10b981', fontSize: 9, fontWeight: 800, offset: 4 }} 
 />
 <Tooltip 
 content={({ active, payload }) => {
 if (!active || !payload || !payload.length) return null;
 const d = payload[0].payload;
 return (
 <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700/50 text-[11px] space-y-1.5 min-w-[140px]">
 <div className="font-black text-slate-300 text-[10px] uppercase tracking-wider pb-1 border-b border-white/10">
 {d.fullDate}
 </div>
 <div className="flex items-baseline justify-between gap-3">
 <span className="text-slate-400 font-bold">Średnia:</span>
 <span className="text-sm font-black text-indigo-300">{d.srednia} mg/dL</span>
 </div>
 <div className="flex items-center justify-between gap-3">
 <span className="text-slate-400 font-bold">TIR dnia:</span>
 <span className={cn(
 "font-black px-1.5 py-0.5 rounded text-[10px]",
 d.tir >= 70 ? "bg-emerald-500/20 text-emerald-400" : d.tir >= 50 ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"
 )}>
 {d.tir}%
 </span>
 </div>
 <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 pt-1 border-t border-white/5">
 <span>Rozrzut:</span>
 <span className="font-bold text-slate-200">{d.min} – {d.max}</span>
 </div>
 </div>
 );
 }}
 />
 <Area 
 name={t('auto.zakres', { defaultValue: 'Zakres (Min - Max)' })}
 type="monotone" 
 dataKey="zakres" 
 stroke="#818cf8"
 strokeWidth={1}
 strokeDasharray="2 2"
 strokeOpacity={0.4}
 fill="url(#colorRangeMonthly)" 
 fillOpacity={1} 
 animationDuration={1200}
 />
 <Area 
 name={t('auto.srednia_dobowa', { defaultValue: 'Średnia dobowa' })}
 type="monotone" 
 dataKey="srednia" 
 stroke="#6366f1" 
 strokeWidth={2.5}
 fill="url(#colorAvgMonthly)" 
 animationDuration={1500}
 dot={(props: any) => {
 const { cx, cy, payload } = props;
 if (!cx || !cy) return null;
 return (
 <circle
 key={`dot-${payload.date}`}
 cx={cx}
 cy={cy}
 r={3.5}
 fill={payload.dotColor}
 stroke="#ffffff"
 strokeWidth={1.5}
 />
 );
 }}
 activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>

 <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center text-center">
 <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
 Średnia 30D
 </span>
 <span className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-tight">
 {stats30d.mean}
 <span className="text-[9px] font-bold text-slate-400 ml-1">mg/dL</span>
 </span>
 </div>

 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center text-center">
 <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
 TIR (W normie)
 </span>
 <span className={cn(
 "text-base sm:text-lg font-black leading-tight",
 stats30d.tir >= 70 ? "text-emerald-500" : stats30d.tir >= 50 ? "text-amber-500" : "text-rose-500"
 )}>
 {stats30d.tir}%
 </span>
 </div>

 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center text-center">
 <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
 Est. HbA1c (30D)
 </span>
 <span className={cn(
 "text-base sm:text-lg font-black leading-tight",
 stats30d.hba1c <= 6.5 ? "text-emerald-500" : stats30d.hba1c <= 7.5 ? "text-amber-500" : "text-rose-500"
 )}>
 {stats30d.hba1c > 0 ? `${stats30d.hba1c}%` : '--'}
 </span>
 </div>
 </div>

 <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-3 text-[9px] font-bold text-slate-400">
 <span className="flex items-center gap-1">
 <span className="w-2 h-2 rounded-full bg-emerald-500" /> TIR &ge; 70%
 </span>
 <span className="flex items-center gap-1">
 <span className="w-2 h-2 rounded-full bg-amber-500" /> TIR 50-69%
 </span>
 <span className="flex items-center gap-1">
 <span className="w-2 h-2 rounded-full bg-rose-500" /> TIR &lt; 50%
 </span>
 <span className="flex items-center gap-1">
 <span className="w-3 h-2 rounded bg-indigo-400/30 border border-indigo-400/50" /> Rozrzut Min–Max
 </span>
 <span className="flex items-center gap-1 opacity-70">
 <span className="w-3 border-b-2 border-dashed border-emerald-500" /> Korytarz {stats30d.targetMin}-{stats30d.targetMax}
 </span>
 </div>
 </div>
 )}

 <div className="relative p-6 sm:p-7 rounded-[2.5rem] shadow-2xl text-center flex flex-col gap-5 overflow-hidden border border-indigo-500/20 dark:border-indigo-500/30">
 <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 backdrop-blur-3xl z-0" />
 <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/80 -z-10" />
 <div className="absolute -top-10 -right-10 opacity-10 blur-xl pointer-events-none">
 <GlikoSenseIcon size={150} isAnalyzing={true} />
 </div>
 <div className="relative z-10 pt-2">
 <h2 className="text-3xl font-black mb-1 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 text-transparent bg-clip-text tracking-tighter">{t('auto.raport', { defaultValue: 'Raport' })}</h2>
 <p className="text-slate-600 dark:text-slate-300 text-[10px] font-black tracking-widest uppercase opacity-80">{t('auto.inteligentna_analiza_glikemii', { defaultValue: 'Inteligentna analiza glikemii' })}</p>
 </div>

 <div className="grid gap-4 relative z-10">
 <motion.button 
 disabled={loading}
 onClick={() => generateReport('master')}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.95 }}
 animate={loading ? {} : {
 boxShadow: ["0px 0px 0px 0px rgba(99,102,241,0)", "0px 0px 30px 10px rgba(99,102,241,0.3)", "0px 0px 0px 0px rgba(99,102,241,0)"]
 }}
 transition={{ repeat: Infinity, duration: 2.5 }}
 className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-6 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 relative overflow-hidden shadow-lg border border-white/10"
 >
 {loading ? <Loader2 className="animate-spin" /> : <GlikoSenseIcon size={24} isAnalyzing={true} className="text-white drop-shadow-md" />}
 
 <span className="drop-shadow-md">{t('auto.wygeneruj_raport_kompletny', { defaultValue: 'Wygeneruj Raport Kompletny' })}</span>
 
 {!loading && (
 <motion.div 
 animate={{ x: ['-100%', '200%'] }}
 transition={{ repeat: Infinity, duration: 2, ease: 'linear', repeatDelay: 4 }}
 className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
 />
 )}
 </motion.button>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <motion.button 
 disabled={loading}
 onClick={() => generateReport('day')}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.95 }}
 className="bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
 >
 <Calendar size={16} className="text-indigo-500" />
 
 {t('auto.raport_dzienny', { defaultValue: 'Raport Dzienny' })}
 </motion.button>

 <motion.button 
 onClick={() => setShowAGP(true)}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.95 }}
 className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800 shadow-sm overflow-hidden hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
 >
 <Activity size={16} />
 
 {t('auto.wykres_agp_kliniczny', { defaultValue: 'Wykres AGP (Kliniczny)' })}
 </motion.button>

 <motion.button 
 disabled={loading}
 onClick={() => setTab && setTab('insulin_detective')}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.95 }}
 className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-800 shadow-sm overflow-hidden hover:bg-rose-100 dark:hover:bg-rose-900/40"
 >
 <span>⚠️</span>
 
 {t('auto.insulina_nie_działa', { defaultValue: i18n.t('auto.insulina_nie_dziala', { defaultValue: "Insulina nie działa?" }) })}
 </motion.button>

 <motion.button 
 disabled={loading}
 onClick={() => setTab && setTab('travel')}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.95 }}
 className="bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-sky-200 dark:border-sky-800 shadow-sm overflow-hidden hover:bg-sky-100 dark:hover:bg-sky-900/40"
 >
 <Plane size={16} />
 {t('auto.jet_lag_mode', { defaultValue: 'Asystent Podróży' })}
 </motion.button>
 </div>
 
 <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">{t('auto.analiza_obejmuje_trendy_posiłki_wzo', { defaultValue: i18n.t('auto.analiza_obejmuje_trendy_p', { defaultValue: "Analiza obejmuje: trendy, posiłki, wzorce i hba1c" }) })}</p>
 <div className="mt-4 p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 backdrop-blur-sm">
 <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 text-center uppercase tracking-widest leading-relaxed">
 {t('ai_medical_disclaimer', { defaultValue: "Uwaga: O zmianie dawek insuliny decyduje lekarz." })}
 </p>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t('auto.historia_raportów', { defaultValue: i18n.t('auto.historia_raportow', { defaultValue: "Historia Raportów" }) })}</h3>
 <div className="space-y-1">
 {reports.map((report) => (
 <SwipeableItem
 key={report.id}
 id={report.id}
 onDelete={async () => {
 try {
 await deleteDoc(doc(db, 'users', getEffectiveUid(user), 'aiReports', report.id));
 } catch (err) {
 console.error("Delete failed:", err);
 }
 }}
 >
 <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all mb-2 cursor-pointer glass-target" onClick={() => setActiveReport(activeReport === report.id ? null : report.id)}>
 <div className="flex justify-between items-center">
 <div className="flex flex-col">
 <span className="text-[9px] font-black text-accent-600 dark:text-accent-400 uppercase tracking-widest">{report.type}</span>
 <span className="text-[8px] font-bold text-slate-400">{new Date(report.timestamp).toLocaleString()}</span>
 </div>
 <div className="bg-accent-50 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 p-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
 {activeReport === report.id ? 'Ukryj' : i18n.t('auto.podglad', { defaultValue: i18n.t('auto.podglad', { defaultValue: "Podgląd" }) })}
 </div>
 </div>
 <AnimatePresence>
 {activeReport === report.id && (
 <motion.div 
 initial={{ height: 0, opacity: 0, marginTop: 0 }}
 animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
 exit={{ height: 0, opacity: 0, marginTop: 0 }}
 transition={{ duration: 0.3, ease: 'easeInOut' }}
 className="overflow-hidden"
 >
 <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
 <div 
 className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
 dangerouslySetInnerHTML={{ __html: report.content }}
 />
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </SwipeableItem>
 ))}
 {reports.length === 0 && !loading && (
 <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-b from-slate-50/50 to-slate-100/50 dark:from-slate-800/10 dark:to-slate-900/10 rounded-[2.5rem] border-2 border-dashed border-slate-200/60 dark:border-slate-800/60 opacity-90 backdrop-blur-sm">
 <div className="w-16 h-16 rounded-[2rem] bg-indigo-50/50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 shadow-inner ring-1 ring-indigo-100 dark:ring-indigo-800/50">
 <span className="text-2xl opacity-80">🤖</span>
 </div>
 <p className="text-[11px] font-black text-indigo-400 dark:text-indigo-400/80 uppercase tracking-widest text-center">
 
 {t('auto.brak_raportów', { defaultValue: i18n.t('auto.brak_raportow', { defaultValue: "Brak raportów" }) })}
 </p>
 <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-2 text-center max-w-[200px]">
 
 {t('auto.twój_inteligentny_analityk_czeka_na', { defaultValue: i18n.t('auto.twoj_inteligentny_anality', { defaultValue: "Twój inteligentny analityk czeka na więcej danych, by móc wyciągnąć wnioski." }) })}
 </p>
 </div>
 )}
 </div>
 </div>
 </motion.div>
 
 <AnimatePresence>
 {showAGP && (
 <AGPReport 
 settings={settings as UserSettings} 
 onClose={() => setShowAGP(false)} 
 theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'} 
 />
 )}
 </AnimatePresence>
 </>
 );
}


