import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VolumeX, AlertTriangle, TrendingUp, X } from 'lucide-react';
import { stopAllAudio } from '../lib/audioUtils';
import { Haptics } from '../lib/haptics';
import toast from 'react-hot-toast';

interface AlarmEventDetail {
  type: 'low' | 'high';
  value: number;
  timestamp: number;
}

export function GlucoseAlarmModal() {
  const [alarmData, setAlarmData] = useState<AlarmEventDetail | null>(null);

  useEffect(() => {
    const handleAlarm = (e: any) => {
      if (e.detail) {
        setAlarmData(e.detail);
      }
    };
    window.addEventListener('active_glucose_alarm', handleAlarm);
    return () => window.removeEventListener('active_glucose_alarm', handleAlarm);
  }, []);

  const handleStopAudio = async () => {
    Haptics.heavy();
    await stopAllAudio();

    const isLow = alarmData?.type === 'low';
    const snoozeDurationMs = isLow ? 15 * 60 * 1000 : 30 * 60 * 1000;
    const snoozeUntil = Date.now() + snoozeDurationMs;

    localStorage.setItem('glucose_alarm_snooze_until', snoozeUntil.toString());
    localStorage.setItem('glucose_alarm_snooze_type', alarmData?.type || '');

    setAlarmData(null);
    toast.success(
      isLow ? 'Wyciszono alarm na 15 minut (drzemka)' : 'Wyciszono alarm na 30 minut (drzemka)',
      { icon: '🔕' }
    );
  };

  if (!alarmData) return null;

  const isLow = alarmData.type === 'low';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        className="fixed inset-x-0 top-4 z-[99999] px-4 flex justify-center pointer-events-auto"
      >
        <div
          className={
            isLow
              ? "w-full max-w-md p-5 rounded-3xl bg-rose-600 text-white shadow-[0_20px_50px_rgba(244,63,94,0.5)] border-2 border-white/30 flex flex-col gap-4 animate-bounce-short"
              : "w-full max-w-md p-5 rounded-3xl bg-amber-600 text-white shadow-[0_20px_50px_rgba(245,158,11,0.5)] border-2 border-white/30 flex flex-col gap-4"
          }
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 animate-pulse">
                {isLow ? <AlertTriangle size={28} /> : <TrendingUp size={28} />}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                  {isLow ? '🚨 KRYTYCZNY NISKI CUKIER' : '📈 WYSOKI CUKIER'}
                </span>
                <h2 className="text-2xl font-black tracking-tight leading-none mt-1">
                  {alarmData.value} <span className="text-sm font-bold opacity-90">mg/dL</span>
                </h2>
              </div>
            </div>

            <button
              onClick={handleStopAudio}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all shrink-0 cursor-pointer"
              title="Wycisz"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-xs font-semibold text-white/90 leading-snug">
            {isLow
              ? 'Wykryto spadek glikemii! Zjedz natychmiast węglowodany proste (np. sok, glukozę).'
              : 'Glikemia przekroczyła cel! Sprawdź poziom insuliny i miejsce wkłucia.'}
          </p>

          <button
            onClick={handleStopAudio}
            className="w-full py-3.5 px-4 rounded-2xl bg-white text-slate-900 font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
          >
            <VolumeX size={20} className="text-rose-600 shrink-0" />
            <span>🔕 WYCISZ ALARM ({isLow ? '15 MIN' : '30 MIN'})</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
