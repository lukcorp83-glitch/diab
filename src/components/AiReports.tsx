import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry } from '../types';
import { MessageSquare, Calculator, History, TrendingUp, Sparkles, Loader2, Calendar, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import SwipeableItem from './SwipeableItem';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { geminiService } from '../services/gemini';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area } from 'recharts';

export default function AiReports({ user, logs }: { user: any, logs: LogEntry[] }) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<string | null>(null);

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

  const generateReport = async (type: 'master' | 'week' | 'month' = 'master') => {
    setLoading(true);
    try {
      let content = "";
      let reportType = "";
      
      if (type === 'master') {
        content = await geminiService.getMasterAnalysis(logs);
        reportType = "Kompleksowa Analiza GlikoControl";
      } else {
        const days = type === 'week' ? 7 : 30;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const filteredLogs = logs.filter(l => l.timestamp > cutoff);
        content = await geminiService.getPeriodAnalysis(type, filteredLogs);
        reportType = type === 'week' ? "Raport Tygodniowy" : "Raport Miesięczny";
      }

      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'aiReports'), {
        type: reportType,
        content,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error(e);
      const errStr = String(e);
      if (errStr.includes("API key not valid") || errStr.includes("API_KEY_INVALID")) {
         alert("Nieprawidłowy klucz API.");
      } else if (errStr.includes("zajęte")) {
         alert("Wszystkie serwery AI są obecnie zajęte. Spróbuj ponownie później.");
      } else {
         alert("AI nie mogło wygenerować raportu. Spróbuj powtórzyć.");
      }
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const glucoseLogs = logs.filter(l => l.type === 'glucose' && typeof l.timestamp === 'number' && l.timestamp > thirtyDaysAgo);
    
    if (glucoseLogs.length === 0) return [];

    const grouped = glucoseLogs.reduce((acc, log) => {
      const dateObj = new Date(log.timestamp);
      if (isNaN(dateObj.getTime())) return acc;
      const date = dateObj.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(log.value);
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Glucose Trend Chart */}
      {chartData.length > 0 && (
        <div className="glass p-6 rounded-[2.5rem] dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
              <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trend Miesięczny</h3>
              <p className="text-[9px] font-bold text-slate-400 opacity-60">Średni dobowy poziom cukru (mg/dL)</p>
            </div>
          </div>
          
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
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
                          <p className="text-sm font-black text-white">{payload[0].value} <span className="text-[10px] text-slate-400">mg/dL</span></p>
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

      <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl text-center space-y-6 relative overflow-hidden">
        <Sparkles className="absolute top-4 right-6 text-indigo-400 opacity-20" size={60} />
        <div className="relative z-10">
          <h2 className="text-2xl font-black mb-1 text-indigo-300">Raport</h2>
          <p className="text-white text-sm font-bold tracking-widest">Inteligentna analiza glikemii</p>
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
            className="w-full bg-white text-indigo-900 py-6 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 relative overflow-hidden"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={24} className="text-indigo-500" />}
            Wygeneruj Raport Kompletny
            
            {!loading && (
              <motion.div 
                animate={{ x: ['-100%', '200%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', repeatDelay: 3 }}
                className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent skew-x-12"
              />
            )}
          </motion.button>
          
          <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-tighter opacity-60">Analiza obejmuje: trendy, posiłki, wzorce i hba1c</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Historia Raportów</h3>
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
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-all mb-2 cursor-pointer" onClick={() => setActiveReport(activeReport === report.id ? null : report.id)}>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{report.type}</span>
                    <span className="text-[8px] font-bold text-slate-400">{new Date(report.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    {activeReport === report.id ? 'Ukryj' : 'Podgląd'}
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
             <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                Brak raportów do wyświetlenia
             </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
