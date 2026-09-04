import React, { useState, useEffect } from 'react';
import { Activity, Footprints, Edit2, Check, X } from 'lucide-react';
import { healthService } from '../services/healthService';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { toast } from 'react-hot-toast';

export default function HealthWidget() {
  const { t } = useTranslation();
  const [steps, setSteps] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [manualInput, setManualInput] = useState("");

  const todayKey = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let mounted = true;
    const fetchSteps = async () => {
      try {
        const saved = localStorage.getItem(`glikocontrol_steps_${todayKey}`);
        let localVal = saved !== null ? parseInt(saved, 10) : null;

        if (healthService.isAvailable()) {
          const hasAccess = await healthService.requestAuthorization();
          if (hasAccess) {
            const count = await healthService.getStepsLast24h();
            if (mounted && count !== null && count >= 0) {
              setSteps(count);
              localStorage.setItem(`glikocontrol_steps_${todayKey}`, count.toString());
              return;
            }
          }
        }
        
        if (mounted) {
          setSteps(localVal !== null && !isNaN(localVal) ? localVal : 0);
        }
      } catch (err) {
        console.error("HealthWidget steps error", err);
        const saved = localStorage.getItem(`glikocontrol_steps_${todayKey}`);
        if (mounted) {
          setSteps(saved !== null ? parseInt(saved, 10) : 0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSteps();
    const interval = setInterval(fetchSteps, 15 * 1000);
    const handleFocus = () => fetchSteps();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [todayKey]);

  const handleSaveManual = () => {
    const parsed = parseInt(manualInput, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setSteps(parsed);
      localStorage.setItem(`glikocontrol_steps_${todayKey}`, parsed.toString());
      toast.success(t('auto.zapisano_kroki', { defaultValue: `Zapisano kroki: ${parsed.toLocaleString()}` }));
    }
    setIsEditing(false);
  };

  return (
    <div className="glass-card p-5 h-full relative overflow-hidden group">
      <div className="absolute -top-4 -right-4 p-4 opacity-5 rotate-12 transition-transform duration-500 group-hover:rotate-45">
        <Activity size={100} />
      </div>
      
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Footprints size={16} />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {t('auto.aktywność', { defaultValue: i18n.t('auto.aktywnosc', { defaultValue: "Aktywność" }) })}
            </span>
          </div>

          <button
            onClick={() => {
              setManualInput(steps ? steps.toString() : "0");
              setIsEditing(!isEditing);
            }}
            className="p-2 -mr-2 text-slate-400 hover:text-emerald-500 rounded-xl transition-colors active:scale-95"
            title="Wpisz kroki ręcznie"
          >
            <Edit2 size={16} />
          </button>
        </div>

        <div>
          {loading ? (
            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-24 rounded mt-1"></div>
          ) : isEditing ? (
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSaveManual(); }} 
              className="flex items-center gap-2 mt-1"
            >
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="np. 6500"
                className="w-24 px-3 py-2 bg-white dark:bg-slate-800 border border-emerald-500/50 rounded-xl text-base font-black text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                autoFocus
              />
              <button
                type="submit"
                className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm active:scale-95"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-2.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-300 transition-colors shadow-sm active:scale-95"
              >
                <X size={16} />
              </button>
            </form>
          ) : steps !== null ? (
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                  {steps.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {t('auto.kroków', { defaultValue: i18n.t('auto.krokow', { defaultValue: "kroków" }) })}
                </span>
              </div>
              {steps === 0 && (
                <div className="mt-2 text-[9px] text-slate-400 dark:text-slate-500 italic leading-tight">
                  Aktywny czujnik kroków telefonu. Możesz też kliknąć ✏️ w rogu, aby wpisać kroki ręcznie.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 italic leading-tight">
              Kliknij ✏️ u góry aby wpisać kroki ręcznie lub nadaj uprawnienia Aktywności Fizycznej w ustawieniach telefonu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

