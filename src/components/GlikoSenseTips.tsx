import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Lightbulb, TrendingUp, TrendingDown, Clock, Info, CheckCircle2, AlertCircle, Activity, Sparkles } from 'lucide-react';
import { LogEntry } from '../types';

export default function GlikoSenseTips({ logs }: { logs: LogEntry[] }) {
  const tips = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    const todayLogs = logs.filter(l => l.timestamp >= today);
    const recentGlucose = logs.filter(l => l.type === 'glucose').slice(-10);
    
    const results = [];

    // Trend analysis
    if (recentGlucose.length >= 3) {
      const last3 = recentGlucose.slice(-3).map(l => l.value);
      if (last3[0] > last3[1] && last3[1] > last3[2]) {
        results.push({
          id: 'trend_down',
          type: 'trend',
          title: 'Trend spadkowy',
          content: 'Twoje glikemie wykazują tendencję spadkową. Uważaj na niedocukrzenia.',
          icon: <TrendingDown size={20} className="text-emerald-500" />,
          color: 'emerald'
        });
      } else if (last3[0] < last3[1] && last3[1] < last3[2]) {
        results.push({
          id: 'trend_up',
          type: 'trend',
          title: 'Trend wzrostowy',
          content: 'Ostatnie pomiary rosną. Może warto zweryfikować dawkę bazy?',
          icon: <TrendingUp size={20} className="text-rose-500" />,
          color: 'rose'
        });
      }
    }

    // Sport / Pattern Detection
    const tuesdayLows = logs.filter(l => {
      const d = new Date(l.timestamp);
      return d.getDay() === 2 && d.getHours() >= 17 && d.getHours() <= 20 && l.type === 'glucose' && l.value < 80;
    });
    
    if (tuesdayLows.length >= 2) {
      results.push({
        id: 'sport_detected',
        type: 'activity',
        title: 'Wykryto "Dzień Sportu"',
        content: 'Zauważyłem powtarzające się spadki we wtorki wieczorem. Czy wtedy trenujesz? Rozważ redukcję bazy o 20% przed wysiłkiem.',
        icon: <Activity size={20} className="text-indigo-500" />,
        color: 'indigo'
      });
    }

    // Weather / Temperature sensitivity (Mock logic)
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 5 && currentMonth <= 8) { // Summer months
      results.push({
        id: 'weather_heat',
        type: 'weather',
        title: 'Uwaga na upały!',
        content: 'Wysoka temperatura może zwiększać wrażliwość na insulinę. Pamiętaj o częstszych pomiarach i nawodnieniu.',
        icon: <Sparkles size={20} className="text-amber-500" />,
        color: 'amber'
      });
    }

    // Meal regularity
    const mealCount = todayLogs.filter(l => l.type === 'meal').length;
    if (mealCount > 0 && mealCount < 3) {
      results.push({
        id: 'meal_regularity',
        type: 'habit',
        title: 'Regularność posiłków',
        content: 'Pamiętaj o regularnych posiłkach, aby uniknąć gwałtownych skoków cukru.',
        icon: <Clock size={20} className="text-amber-500" />,
        color: 'amber'
      });
    }

    // General tip based on time
    const hour = new Date().getHours();
    if (hour >= 21 || hour < 5) {
      results.push({
        id: 'night_safety',
        type: 'safety',
        title: 'Bezpieczna noc',
        content: 'Sprawdź cukier przed snem, by uniknąć nocnych epizodów.',
        icon: <AlertCircle size={20} className="text-indigo-500" />,
        color: 'indigo'
      });
    } else {
      results.push({
        id: 'activity_tip',
        type: 'activity',
        title: 'Ruch to zdrowie',
        content: 'Krótki spacer po posiłku może znacząco poprawić glikemię po-posiłkową.',
        icon: <Lightbulb size={20} className="text-accent-500" />,
        color: 'accent'
      });
    }

    return results.slice(0, 2); // Show only top 2 tips
  }, [logs]);

  if (tips.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      {tips.map((tip, index) => (
        <motion.div
          key={tip.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-4"
        >
          <div className={`p-2.5 rounded-2xl bg-${tip.color}-50 dark:bg-${tip.color}-500/10 shrink-0`}>
            {tip.icon}
          </div>
          <div>
            <h4 className="font-black text-sm dark:text-white mb-1">{tip.title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {tip.content}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
