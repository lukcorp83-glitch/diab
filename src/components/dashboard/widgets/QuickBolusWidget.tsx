import React, { useMemo } from 'react';
import { cn } from '../../../lib/utils';
import { Zap, ArrowRight, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Haptics } from '../../../lib/haptics';

interface QuickBolusWidgetProps {
  isEditingLayout?: boolean;
  setTab: (tab: string) => void;
  lastGlucose?: number | null;
  userSettings?: any;
  iob?: number;
}

export default function QuickBolusWidget({
  isEditingLayout,
  setTab,
  lastGlucose,
  userSettings,
  iob = 0
}: QuickBolusWidgetProps) {
  const { t } = useTranslation();

  // Obliczenie sugerowanej korekty
  const correctionData = useMemo(() => {
    if (!lastGlucose || !userSettings) return null;

    const targetBg = Math.round(((userSettings.targetMin || 70) + (userSettings.targetMax || 140)) / 2);
    // Sugeruj tylko jeśli cukier jest powyżej celu
    if (lastGlucose <= targetBg + 15) return null;

    let currentIsfValue = userSettings.isf || 50;
    if (userSettings.hourlyProfiles && userSettings.hourlyProfiles.length > 0) {
      const nowTime = new Date();
      const currentHourStr = nowTime.getHours().toString().padStart(2, "0") + ":" + nowTime.getMinutes().toString().padStart(2, "0");
      const sorted = [...userSettings.hourlyProfiles].sort((a, b) => a.time.localeCompare(b.time));
      let activeProfile = sorted.slice().reverse().find((p) => p.time <= currentHourStr);
      if (!activeProfile && sorted.length > 0) activeProfile = sorted[sorted.length - 1];
      if (activeProfile) currentIsfValue = activeProfile.isf || currentIsfValue;
    }

    const rawCorr = (lastGlucose - targetBg) / currentIsfValue;
    const rawSuggestedDose = Math.max(0, rawCorr - (iob || 0));
    const roundedSuggestedDose = Math.round(rawSuggestedDose * 10) / 10;

    if (roundedSuggestedDose < 0.3) return null;

    return {
      dose: roundedSuggestedDose,
      target: targetBg,
      diff: lastGlucose - targetBg
    };
  }, [lastGlucose, userSettings, iob]);

  const handleClick = () => {
    if (isEditingLayout) return;
    Haptics.medium();

    if (correctionData && lastGlucose) {
      sessionStorage.setItem("pending_correction", JSON.stringify({
        bg: Math.round(lastGlucose),
        dose: correctionData.dose
      }));
    }
    setTab('bolus');
  };

  const hasCorrection = correctionData !== null && correctionData.dose > 0;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center justify-between gap-1 shadow-2xl active:scale-95 group transition-all text-white overflow-hidden relative w-full select-none h-full p-4 rounded-[2.5rem] min-h-[140px]",
        hasCorrection
          ? "bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-indigo-600/40 border-2 border-indigo-300/30"
          : "bg-accent-600 shadow-accent-600/40"
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-[40px] -mr-12 -mt-12 group-hover:bg-white/20 transition-all pointer-events-none" />

      {hasCorrection ? (
        <>
          {/* Top badge */}
          <div className="w-full flex items-center justify-between z-10 pointer-events-none">
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full text-white backdrop-blur-md">
              <Zap size={11} className="text-amber-300 animate-pulse fill-amber-300" />
              {t('auto.korekta', { defaultValue: 'Korekta' })}
            </span>
            <span className="text-[10px] font-bold text-white/80">
              {Math.round(lastGlucose!)} mg/dL
            </span>
          </div>

          {/* Center suggested dose */}
          <div className="flex flex-col items-center justify-center my-auto z-10 pointer-events-none">
            <span className="text-3xl font-black tracking-tight text-white drop-shadow-md tabular-nums">
              +{correctionData.dose} <span className="text-sm font-extrabold text-indigo-200">{t('auto.j', { defaultValue: 'j.' })}</span>
            </span>
            <span className="text-[9px] font-bold text-white/70 mt-0.5 tabular-nums">
              {iob > 0 ? `IOB: ${iob.toFixed(1)} j.` : `${t('auto.cel', { defaultValue: 'Cel' })}: ${correctionData.target}`}
            </span>
          </div>

          {/* Bottom call to action */}
          <div className="w-full flex items-center justify-center gap-1 bg-white/15 py-1.5 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider text-white group-hover:bg-white group-hover:text-indigo-600 transition-all pointer-events-none z-10">
            <span>{t('auto.podaj_bolus', { defaultValue: 'Podaj bolus' })}</span>
            <ArrowRight size={12} strokeWidth={3} />
          </div>
        </>
      ) : (
        <>
          <div className="w-full flex justify-end pointer-events-none">
            {iob > 0 && (
              <span className="text-[9px] font-bold text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                IOB: {iob.toFixed(1)} j.
              </span>
            )}
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner shrink-0 pointer-events-none my-auto">
            <Zap size={24} />
          </div>
          <span className="font-black text-[12px] uppercase tracking-widest pointer-events-none text-center">
            {t('auto.bolus', { defaultValue: 'Bolus' })}
          </span>
        </>
      )}
    </button>
  );
}
