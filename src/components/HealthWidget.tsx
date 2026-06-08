import React, { useState, useEffect } from 'react';
import { Activity, Footprints } from 'lucide-react';
import { healthService } from '../services/healthService';

export default function HealthWidget() {
  const [steps, setSteps] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchSteps = async () => {
      try {
        const hasAccess = await healthService.requestAuthorization();
        if (hasAccess) {
          const count = await healthService.getStepsLast24h();
          if (mounted) setSteps(count);
        } else {
          if (mounted) setSteps(null);
        }
      } catch (err) {
        console.error("HealthWidget steps error", err);
        if (mounted) setSteps(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSteps();

    // Refresh every 5 minutes
    const interval = setInterval(fetchSteps, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="glass-card p-5 h-full relative overflow-hidden group">
      <div className="absolute -top-4 -right-4 p-4 opacity-5 rotate-12 transition-transform duration-500 group-hover:rotate-45">
        <Activity size={100} />
      </div>
      
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
            <Footprints size={16} />
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-300">Aktywność</span>
        </div>

        <div>
          {loading ? (
            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-24 rounded mt-1"></div>
          ) : steps !== null ? (
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                  {steps.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  kroków
                </span>
              </div>
              {steps === 0 && (
                <div className="mt-2 text-[9px] text-slate-400 dark:text-slate-500 italic leading-tight">
                  Wskazówka: Upewnij się, że Twój zegarek lub aplikacja (np. Google Fit, Samsung Health) zapisuje dane do Health Connect.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1 text-xs text-slate-500 italic">
              Brak uprawnień lub danych z Health Connect.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
