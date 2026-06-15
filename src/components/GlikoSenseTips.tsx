import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Lightbulb, TrendingUp, TrendingDown, Clock, Info, CheckCircle2, AlertCircle, Activity, Sparkles, X, Zap } from 'lucide-react';
import GlikoSenseIcon from './GlikoSenseIcon';
import { LogEntry } from '../types';
import { cn, calculateIOB, calculateCOB, getEffectiveIOB } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function GlikoSenseTips({ logs, pumpStatus, compact = false }: { logs: LogEntry[], pumpStatus?: any, compact?: boolean }) {
    const { t } = useTranslation();
  const [dismissedTips, setDismissedTips] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('dismissed_tips');
    return saved ? JSON.parse(saved) : [];
  });

  const tips = useMemo(() => {
    const today = new Date().setHours(0,0,0,0);
    const todayLogs = logs.filter(l => (l.timestamp || 0) >= today);
    const recentGlucose = logs.filter(l => l.type === 'glucose').slice(-10);
    
    // Calculate REAL values from central engine
    const iob = getEffectiveIOB(logs, pumpStatus);
    const cob = calculateCOB(logs);
    
    const results = [];

    // Real-time data based tips
    if (iob > 0.5) {
      results.push({
        id: 'real_iob',
        type: 'data',
        title: i18n.t('auto.profil_dzialania_insuliny_iob', { defaultValue: i18n.t('auto.profil_dzialania_insuliny', { defaultValue: "Profil działania insuliny (IOB)" }) }),
        content: i18n.t('auto.w_twoim_organizmie_pracuj', { defaultValue: "W Twoim organizmie pracuje teraz ok. {{var0}} j. insuliny (Początek: ~20m, Szczyt: ~75m). Weź to pod uwagę przy planowaniu kolejnych kroków.", var0: iob.toFixed(1) }),
        icon: <Zap size={20} className="text-pink-500" />,
        color: 'pink'
      });
    }

    if (cob > 5) {
      results.push({
        id: 'real_cob',
        type: 'data',
        title: i18n.t('auto.aktywne_weglowodany_cob', { defaultValue: i18n.t('auto.aktywne_weglowodany_cob', { defaultValue: "Aktywne węglowodany (COB)" }) }),
        content: i18n.t('auto.masz_jeszcze_ok_var0_g_ak', { defaultValue: "Masz jeszcze ok. {{var0}}g aktywnych węglowodanów, które nadal się wchłaniają.", var0: Math.round(cob) }),
        icon: <Activity size={20} className="text-amber-500" />,
        color: 'amber'
      });
    }

    // Trend analysis
    if (recentGlucose.length >= 3) {
      const last3 = recentGlucose.slice(-3).map(l => l.value);
      if (last3[0] > last3[1] && last3[1] > last3[2]) {
        results.push({
          id: 'trend_down',
          type: 'trend',
          title: 'Trend spadkowy',
          content: i18n.t('auto.twoje_glikemie_wykazuja_tenden', { defaultValue: i18n.t('auto.twoje_glikemie_wykazuja_t', { defaultValue: "Twoje glikemie wykazują tendencję spadkową. Uważaj na niedocukrzenia." }) }),
          icon: <TrendingDown size={20} className="text-emerald-500" />,
          color: 'emerald'
        });
      } else if (last3[0] < last3[1] && last3[1] < last3[2]) {
        results.push({
          id: 'trend_up',
          type: 'trend',
          title: 'Trend wzrostowy',
          content: i18n.t('auto.ostatnie_pomiary_rosna_moze_wa', { defaultValue: i18n.t('auto.ostatnie_pomiary_rosna_mo', { defaultValue: "Ostatnie pomiary rosną. Może warto zweryfikować dawkę bazy?" }) }),
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
        title: i18n.t('auto.wykryto_dzien_sportu', { defaultValue: i18n.t('auto.wykryto_dzien_sportu', { defaultValue: "Wykryto \"Dzień Sportu\"" }) }),
        content: i18n.t('auto.zauwazylem_powtarzajace_sie_sp', { defaultValue: i18n.t('auto.zauwazylem_powtarzajace_s', { defaultValue: "Zauważyłem powtarzające się spadki we wtorki wieczorem. Czy wtedy trenujesz? Rozważ redukcję bazy o 20% przed wysiłkiem." }) }),
        icon: <Activity size={20} className="text-indigo-500" />,
        color: 'indigo'
      });
    }

    // Weather / Temperature sensitivity
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 5 && currentMonth <= 8) {
      results.push({
        id: 'weather_heat',
        type: 'weather',
        title: i18n.t('auto.uwaga_na_upaly', { defaultValue: i18n.t('auto.uwaga_na_upaly', { defaultValue: "Uwaga na upały!" }) }),
        content: i18n.t('auto.wysoka_temperatura_moze_zwieks', { defaultValue: i18n.t('auto.wysoka_temperatura_moze_z', { defaultValue: "Wysoka temperatura może zwiększać wrażliwość na insulinę. Pamiętaj o częstszych pomiarach i nawodnieniu." }) }),
        icon: <Sparkles size={20} className="text-amber-500" />,
        color: 'amber'
      });
    }

    // Meal regularity
    const mealCount = todayLogs.filter(l => l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal?.carbs)).length;
    if (mealCount > 0 && mealCount < 3) {
      results.push({
        id: 'meal_regularity',
        type: 'habit',
        title: i18n.t('auto.regularnosc_posilkow', { defaultValue: i18n.t('auto.regularnosc_posilkow', { defaultValue: "Regularność posiłków" }) }),
        content: i18n.t('auto.pamietaj_o_regularnych_posilka', { defaultValue: i18n.t('auto.pamietaj_o_regularnych_po', { defaultValue: "Pamiętaj o regularnych posiłkach, aby uniknąć gwałtownych skoków cukru." }) }),
        icon: <Clock size={20} className="text-amber-500" />,
        color: 'amber'
      });
    }

    // General tips removed to comply with "invisible until appear" request
    
    return results
      .filter(t => !dismissedTips.includes(t.id));
  }, [logs, dismissedTips]);

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedTips, id];
    setDismissedTips(newDismissed);
    localStorage.setItem('dismissed_tips', JSON.stringify(newDismissed));
  };

  if (tips.length === 0) return null;

  if (compact) {
    const tip = tips[0];
    return (
      <div className="flex items-start gap-2 relative group w-full text-left">
        <div className={cn(
          "p-1.5 rounded-xl shrink-0",
          tip.color === 'pink' ? 'bg-pink-500/10 text-pink-500' :
          tip.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
          tip.color === 'rose' ? 'bg-rose-500/10 text-rose-500' :
          tip.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
          tip.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500' :
          'bg-accent-500/10 text-accent-500'
        )}>
          {React.cloneElement(tip.icon as any, { size: 12 })}
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="font-black text-[9px] dark:text-white leading-none tracking-tight mb-1 truncate">{tip.title}</h4>
          <p className="text-[8px] text-slate-500 dark:text-slate-400 font-bold leading-normal opacity-85">
            {tip.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-display flex items-center gap-2">
          <GlikoSenseIcon size={12} isAnalyzing={true} />
          
                            {t('auto.sugestie_glikosense', { defaultValue: 'Sugestie GlikoSense' })}
                          </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tips.map((tip, index) => (
          <motion.div
            key={tip.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card !p-5 flex items-start gap-4 relative group"
          >
            <button 
              onClick={() => handleDismiss(tip.id)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100/50 dark:bg-white/5 rounded-full transition-all opacity-0 group-hover:opacity-100"
              aria-label={t('auto.dismiss_tip', { defaultValue: 'Dismiss tip' })}
            >
              <X size={12} />
            </button>
            <div className={cn(
              "p-3 rounded-2xl shrink-0 group-hover:scale-110 transition-transform",
              tip.color === 'pink' ? 'bg-pink-500/10 text-pink-500' :
              tip.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
              tip.color === 'rose' ? 'bg-rose-500/10 text-rose-500' :
              tip.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
              tip.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-500' :
              'bg-accent-500/10 text-accent-500'
            )}>
              {tip.icon}
            </div>
            <div className="pr-4">
              <h4 className="font-black text-[13px] dark:text-white mb-1.5 leading-tight tracking-tight">{tip.title}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed opacity-80">
                {tip.content}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
