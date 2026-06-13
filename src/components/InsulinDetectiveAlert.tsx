import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry } from '../types';
import { AlertCircle, FileQuestion, Bug, X } from 'lucide-react';
import InsulinDetective from './InsulinDetective';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";

interface InsulinDetectiveAlertProps {
  logs: LogEntry[];
}

export default function InsulinDetectiveAlert({ logs }: InsulinDetectiveAlertProps) {
    const { t } = useTranslation();
  const [showSurvey, setShowSurvey] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const shouldAlert = useMemo(() => {
    if (logs.length === 0) return false;
    
    const now = Date.now();
    const fourHoursAgo = now - 4 * 60 * 60 * 1000;
    
    // Sort logs descending by timestamp
    const sortedLogs = [...logs].sort((a, b) => {
      const tsA = a.timestamp || new Date(a.createdAt).getTime();
      const tsB = b.timestamp || new Date(b.createdAt).getTime();
      return tsB - tsA;
    });

    // Check if the most recent glucose is high
    const recentGlucoseLog = sortedLogs.find(l => typeof (l.value || l.bg) === 'number');
    if (!recentGlucoseLog) return false;
    
    const glucoseValue = recentGlucoseLog.value || recentGlucoseLog.bg || 0;
    const recentGlucoseTs = recentGlucoseLog.timestamp || new Date(recentGlucoseLog.createdAt).getTime();
    if (recentGlucoseTs < fourHoursAgo) return false;
    if (glucoseValue < 200) return false;

    // Check if there are recent boluses (at least 2 in the last 4 hours)
    const recentBoluses = sortedLogs.filter(l => {
      if (l.type !== 'medication' || !l.medicationData) return false;
      const ts = l.timestamp || new Date(l.createdAt).getTime();
      if (ts < fourHoursAgo) return false;
      // assuming short-acting insulin is logged as medication with a dose
      // or at least some insulin
      const medLower = l.medicationData.name.toLowerCase();
      if (medLower.includes('insulina') || medLower.includes('novorapid') || medLower.includes('humalog') || medLower.includes('fiasp') || medLower.includes('bolus')) {
         return true;
      }
      return false;
    });

    if (recentBoluses.length >= 1) {
      return true;
    }

    return false;
  }, [logs]);

  if (!shouldAlert || dismissed) return null;

  return (
    <div className="mb-6">
      {!showSurvey ? (
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="bg-gradient-to-r from-rose-950/20 to-orange-950/20 border-2 border-rose-500/30 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-rose-900/10"
        >
          {/* Neural Background styling */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
               <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex flex-shrink-0 items-center justify-center text-rose-500 relative">
                  <AlertCircle size={24} className="animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
               </div>
               <div>
                 <h3 className="text-sm font-black dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                   
                                                     {t('auto.glikosense_anomaly_warning', { defaultValue: 'GlikoSense Anomaly Warning' })}
                                                   </h3>
                 <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-lg">
                   
                                                     {t('auto.system_wykrył_wysoki_poziom_cukru_m', { defaultValue: 'System wykrył wysoki poziom cukru mimo podanej insuliny w ostatnich godzinach. Czy chcesz przeprowadzić diagnostykę jakości leku lub poprawności wkłucia?' })}
                                                   </p>
               </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setDismissed(true)}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 dark:text-slate-300 rounded-2xl font-bold text-xs transition-all w-full md:w-auto"
              >
                
                                              {t('auto.ignoruj', { defaultValue: 'Ignoruj' })}
                                            </button>
              <button
                onClick={() => setShowSurvey(true)}
                className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 w-full md:w-auto"
              >
                <Bug size={16} />
                
                                              {t('auto.insulina_nie_działa', { defaultValue: 'Insulina nie działa?' })}
                                            </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
           initial={{ opacity: 0, height: 0 }}
           animate={{ opacity: 1, height: 'auto' }}
           className="relative"
        >
          <div className="h-[75vh] md:h-[650px] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
             <InsulinDetective logs={logs} onClose={() => { setShowSurvey(false); setDismissed(true); }} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
