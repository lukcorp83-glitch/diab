import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry, UserSettings } from '../types';
import { MessageSquare, Calculator, History, TrendingUp, Activity, Loader2, Calendar, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import SwipeableItem from './SwipeableItem';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { geminiService } from '../services/gemini';
import { GlikoSenseLearner } from '../services/mlSugarAnalyzer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts';
import GlikoSenseIcon from './GlikoSenseIcon';
import MLAnalysisWidget from './MLAnalysisWidget';
import InsulinDetectiveAlert from './InsulinDetectiveAlert';
import AGPReport from './AGPReport';
import { toast } from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function AiReports({ user, logs, settings, setTab }: { user: any, logs: LogEntry[], settings?: UserSettings, setTab?: (tab: string) => void }) {
    const { t } = useTranslation();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [showAGP, setShowAGP] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'aiReports'),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("AiReports error:", error);
    });
    return unsubscribe;
  }, [user]);

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

      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'aiReports'), {
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

  const chartData = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const glucoseLogs = logs.filter(l => {
      if (l.type !== 'glucose' && !l.bg) return false;
      const ts = l.timestamp || new Date(l.createdAt).getTime();
      return typeof ts === 'number' && ts > thirtyDaysAgo;
    });
    
    if (glucoseLogs.length === 0) return [];

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

    return Object.entries(grouped)
      .map(([date, values]) => ({
        date: new Date(date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        rawDate: date
      }))
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [logs]);

  return (
    <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <InsulinDetectiveAlert logs={logs} />
      <MLAnalysisWidget logs={logs} settings={settings} user={user} />
      
      {/* Glucose Trend Chart */}
      {chartData.length > 0 && (
        <div className="glass p-6 rounded-[2.5rem] dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-accent-50 dark:bg-accent-900/30 rounded-xl">
              <TrendingUp size={18} className="text-accent-600 dark:text-accent-400" />
            </div>
            <div>
              <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('auto.trend_miesięczny', { defaultValue: i18n.t('auto.trend_miesieczny', { defaultValue: "Trend Miesięczny" }) })}</h3>
              <p className="text-[9px] font-bold text-slate-400 opacity-60">{t('auto.średni_dobowy_poziom_cukru_mg_dl', { defaultValue: i18n.t('auto.sredni_dobowy_poziom_cukr', { defaultValue: "Średni dobowy poziom cukru (mg/dL)" }) })}</p>
            </div>
          </div>
          
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={['dataMin - 20', 'dataMax + 20']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                  width={30}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-2xl">
                          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">{payload[0].payload.date}</p>
                          <p className="text-sm font-black text-white">{payload[0].value} <span className="text-[10px] text-slate-400">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={140} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'right', value: '140', fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                <ReferenceLine y={70} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'right', value: '70', fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                <Area 
                  type="monotone" 
                  dataKey="avg" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorAvg)" 
                  animationDuration={2000}
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-accent-900 rounded-[2.5rem] p-8 text-white shadow-2xl text-center space-y-6 relative overflow-hidden">
        <GlikoSenseIcon className="absolute top-4 right-6 opacity-20" size={60} isAnalyzing={true} />
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-1 text-accent-300">{t('auto.raport', { defaultValue: 'Raport' })}</h2>
          <p className="text-white text-sm font-bold tracking-widest">{t('auto.inteligentna_analiza_glikemii', { defaultValue: 'Inteligentna analiza glikemii' })}</p>
        </div>

        <div className="grid gap-4 relative z-10">
            <motion.button 
            disabled={loading}
            onClick={() => generateReport('master')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            animate={loading ? {} : {
              boxShadow: ["0px 0px 0px 0px rgba(99,102,241,0)", "0px 0px 20px 5px rgba(99,102,241,0.5)", "0px 0px 0px 0px rgba(99,102,241,0)"]
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-full bg-white text-accent-900 py-6 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 relative overflow-hidden"
          >
            {loading ? <Loader2 className="animate-spin" /> : <GlikoSenseIcon size={24} isAnalyzing={true} />}
            
                                      {t('auto.wygeneruj_raport_kompletny', { defaultValue: 'Wygeneruj Raport Kompletny' })}
                                      
                                      {!loading && (
              <motion.div 
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', repeatDelay: 3 }}
                className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-accent-500/10 to-transparent skew-x-12"
              />
            )}
          </motion.button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             <motion.button 
               disabled={loading}
               onClick={() => generateReport('day')}
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.95 }}
               className="bg-accent-800 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-accent-700 disabled:opacity-50"
             >
               <Calendar size={16} />
               
                                             {t('auto.raport_dzienny', { defaultValue: 'Raport Dzienny' })}
                                           </motion.button>

             <motion.button 
               onClick={() => setShowAGP(true)}
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.95 }}
               className="bg-indigo-900/30 text-indigo-300 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-indigo-900 overflow-hidden"
             >
               <Activity size={16} />
               
                                             {t('auto.wykres_agp_kliniczny', { defaultValue: 'Wykres AGP (Kliniczny)' })}
                                           </motion.button>

             <motion.button 
               disabled={loading}
               onClick={() => setTab && setTab('insulin_detective')}
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.95 }}
               className="bg-rose-900/30 text-rose-300 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-rose-900 overflow-hidden"
             >
               <span>⚠️</span>
               
                                             {t('auto.insulina_nie_działa', { defaultValue: i18n.t('auto.insulina_nie_dziala', { defaultValue: "Insulina nie działa?" }) })}
                                           </motion.button>
          </div>
          
          <p className="text-[9px] text-accent-300 font-bold uppercase tracking-tighter opacity-60">{t('auto.analiza_obejmuje_trendy_posiłki_wzo', { defaultValue: i18n.t('auto.analiza_obejmuje_trendy_p', { defaultValue: "Analiza obejmuje: trendy, posiłki, wzorce i hba1c" }) })}</p>
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
                  await deleteDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'aiReports', report.id));
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
          logs={logs} 
          settings={settings as UserSettings} 
          onClose={() => setShowAGP(false)} 
          theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'} 
        />
      )}
    </AnimatePresence>
    </>
  );
}