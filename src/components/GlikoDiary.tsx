import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Book, Calendar, Sparkles, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { LogEntry } from '../types';

export default function GlikoDiary({ logs, petName }: { logs: LogEntry[], petName: string }) {
  const diaryEntries = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    const todayLogs = logs.filter(l => l.timestamp >= today).sort((a,b) => a.timestamp - b.timestamp);
    
    if (todayLogs.length === 0) return [];

    const entries: any[] = [];
    
    // Group logs into potential "stories"
    todayLogs.forEach((log, index) => {
      const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (log.type === 'meal') {
        const value = log.notes || 'pyszny posiłek';
        const carbs = (log as any).carbs;
        entries.push({
          time,
          text: `Zjedliśmy razem ${value}! ${carbs ? `Miało to ${carbs}g węglowodanów.` : ''} Mam nadzieję, że oszacowaliśmy to dobrze!`,
          icon: '🍕'
        });
      } else if (log.type === 'glucose') {
        if (log.value < 70) {
          entries.push({
            time,
            text: `Uff! Cukier spadł do ${log.value}. Pamiętaj o soku, bo robię się głodny i trochę wystraszony...`,
            icon: '🧃'
          });
        } else if (log.value > 180) {
          entries.push({
            time,
            text: `Oj, cukier mamy na poziomie ${log.value}. Trochę mnie to męczy, może pora na małą korektę?`,
            icon: '💧'
          });
        } else {
          entries.push({
            time,
            text: `Idealnie! Cukier ${log.value} to nasza bezpieczna strefa. Tak trzymać!`,
            icon: '✨'
          });
        }
      } else if (log.type === 'bolus') {
        entries.push({
          time,
          text: `Podaliśmy ${log.value}j insuliny. To nasze tarcza przeciwko wysokim cukrom!`,
          icon: '🛡️'
        });
      }
    });

    return entries.slice(-10); // Show last 10 events of the day
  }, [logs]);

  return (
    <div className="space-y-4">
      {diaryEntries.length === 0 ? (
        <div className="text-center py-12 px-4">
          <Book size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">Brak dzisiejszych wpisów. Zapisz coś, żebyśmy mieli co wspominać!</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
          {diaryEntries.map((entry, index) => (
            <motion.div
              key={`diary-${index}-${entry.time}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <div className="absolute -left-[22px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-accent-500 z-10 flex items-center justify-center text-[8px]">
                {index + 1}
              </div>
              <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.time}</span>
                  <span className="text-lg">{entry.icon}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium italic">
                  "{entry.text}"
                </p>
              </div>
            </motion.div>
          ))}
          
          <div className="pt-4 text-center">
            <p className="text-[10px] font-black text-accent-500 uppercase tracking-widest flex items-center justify-center gap-2">
              <Sparkles size={10} /> Koniec dzisiejszej przygody
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
