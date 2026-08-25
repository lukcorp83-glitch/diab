import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { 
  Activity, Apple, Zap, Signal, ShieldAlert, X, BookOpen, 
  CheckCircle2, AlertTriangle, ChevronRight, PhoneCall, 
  HelpCircle, Clock, HeartHandshake, Calculator, Utensils, Flame,
  Scale, Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import { getEffectiveUid } from '../../lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useBackButton } from '../../hooks/useBackButton';

export default function TreatmentModeSelector({ user, settings, setSettings }: any) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showEmergencyGuide, setShowEmergencyGuide] = useState(false);

  // Obsługa systemowego przycisku Wstecz
  useBackButton(showEmergencyGuide, () => setShowEmergencyGuide(false));

  // Tryb wprowadzania węgli: gramy lub WW
  const [carbMode, setCarbMode] = useState<'grams' | 'ww'>('grams');
  const [carbInput, setCarbInput] = useState<string>("");
  const [calcBg, setCalcBg] = useState<string>("");
  const [calcFatProtein, setCalcFatProtein] = useState<boolean>(false);

  // Masa ciała pacjenta jako ratunkowe źródło wyliczeń (fallback)
  const [bodyWeight, setBodyWeight] = useState<string>("");
  const [useWeightFallback, setUseWeightFallback] = useState<boolean>(false);

  // Obliczenie sugerowanej dawki bazy zastępczej (długodziałającej)
  const isPump = settings.treatmentMode === 'pump';

  // Obliczenia z masy ciała (standard bezpieczny: 0.55 j./kg)
  const weightNum = parseFloat(bodyWeight) || 0;
  const estimatedTdiFromWeight = weightNum > 0 ? weightNum * 0.55 : 0;
  const isfFromWeight = estimatedTdiFromWeight > 0 ? Math.round(1800 / estimatedTdiFromWeight) : 0;
  const wwRatioFromWeight = estimatedTdiFromWeight > 0 ? Math.round((estimatedTdiFromWeight / 50) * 10) / 10 : 0;
  const basalFromWeight = estimatedTdiFromWeight > 0 ? Math.round(estimatedTdiFromWeight * 0.48 * 10) / 10 : 0;

  // Aktywne parametry (z profilu lub z masy ciała)
  const activeIsf = useWeightFallback && isfFromWeight > 0 ? isfFromWeight : (settings.isf || 50);
  const activeWwRatio = useWeightFallback && wwRatioFromWeight > 0 ? wwRatioFromWeight : (settings.wwRatio || 1.0);

  // Obliczenie sumy bazy
  const initialCalculatedBasal = React.useMemo(() => {
    if (useWeightFallback && basalFromWeight > 0) return basalFromWeight;
    if (settings.hourlyProfiles && settings.hourlyProfiles.length > 0) {
      const hasBasalRate = settings.hourlyProfiles.some((p: any) => typeof p.basal === 'number');
      if (hasBasalRate) {
        let total = 0;
        settings.hourlyProfiles.forEach((p: any) => {
          total += (p.basal || 0) * (24 / settings.hourlyProfiles.length);
        });
        return Math.round(total * 10) / 10;
      }
    }
    if (settings.isf && settings.isf > 0) {
      const estimatedTdi = Math.round(1800 / settings.isf);
      return Math.round((estimatedTdi * 0.48) * 10) / 10;
    }
    return 14.0;
  }, [settings.hourlyProfiles, settings.isf, useWeightFallback, basalFromWeight]);

  const [customBasalInput, setCustomBasalInput] = useState<string>("");
  const activeBasal = parseFloat(customBasalInput) > 0 ? parseFloat(customBasalInput) : initialCalculatedBasal;

  // Wyliczenia kalkulatora awaryjnego
  const bgNum = parseFloat(calcBg) || 0;
  const rawCarbVal = parseFloat(carbInput) || 0;
  const calculatedWwNum = carbMode === 'grams' ? rawCarbVal / 10 : rawCarbVal;

  const targetMin = settings.targetMin || 100;
  const targetMax = settings.targetMax || 140;

  const mealDose = calculatedWwNum > 0 ? calculatedWwNum * activeWwRatio : 0;
  const correctionDose = bgNum > targetMax ? (bgNum - targetMin) / activeIsf : (bgNum < 70 ? -0.5 : 0);
  const rawTotalBolus = Math.max(0, mealDose + correctionDose);
  const roundedPenDose = Math.round(rawTotalBolus * 2) / 2; // skok 0.5j
  const splitFirstDose = Math.round((roundedPenDose * 0.6) * 2) / 2;
  const splitSecondDose = Math.max(0.5, Math.round((roundedPenDose - splitFirstDose) * 2) / 2);

  return (
    <div className="space-y-3">
      <div className={cn(
        "p-5 rounded-[2.5rem] border transition-all hover:shadow-md space-y-4",
        settings.glassmorphismEnabled
          ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
          : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
      )}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center shadow-inner">
            <Activity size={22} />
          </div>
          <div className="text-left">
            <p className="text-sm font-black dark:text-white leading-tight">
              {t('auto.treatment_mode_title', { defaultValue: 'Typ leczenia' })}
            </p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
              {t('auto.treatment_mode_desc', { defaultValue: 'Dostosuj interfejs do swoich potrzeb' })}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[
            { id: 'diet_only', icon: <Apple size={16} />, label: t('auto.treatment_mode_diet', { defaultValue: 'Dieta i tabletki' }), desc: t('auto.treatment_mode_diet_desc', { defaultValue: 'Ukrywa funkcje insulinowe' }) },
            { id: 'insulin', icon: <Zap size={16} />, label: t('auto.treatment_mode_insulin', { defaultValue: 'Insulina' }), desc: t('auto.treatment_mode_insulin_desc', { defaultValue: 'Peny lub strzykawki' }) },
            { id: 'pump', icon: <Signal size={16} />, label: t('auto.treatment_mode_pump', { defaultValue: 'Pompa' }), desc: t('auto.treatment_mode_pump_desc', { defaultValue: 'Zamknięta pętla / AID' }) }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={async () => {
                const newVal = mode.id as 'diet_only' | 'insulin' | 'pump';
                setSettings((prev: any) => ({ ...prev, treatmentMode: newVal }));
                
                // Natychmiastowa aktualizacja cache'u (Optimistic Update)
                localStorage.setItem("treatmentMode", newVal);
                if (user) {
                  queryClient.setQueryData(['userSettings', getEffectiveUid(user)], (old: any) => ({
                    ...(old || {}),
                    treatmentMode: newVal
                  }));
                }
               
                if (user) {
                  try {
                    await setDoc(
                      doc(db, "users", getEffectiveUid(user), "settings", "profile"),
                      { treatmentMode: newVal },
                      { merge: true }
                    );
                    queryClient.invalidateQueries({ queryKey: ['userSettings'] });
                    toast.success(t('auto.zapisano_tryb', { defaultValue: 'Zapisano: ' }) + mode.label);
                  } catch (e: any) {
                    console.error("Failed to save treatmentMode", e);
                    toast.error("Błąd zapisu: " + e.message);
                    queryClient.invalidateQueries({ queryKey: ['userSettings'] });
                  }
                } else {
                  toast.success(mode.label + ' ' + t('auto.wymaga_odswiezenia_w_trybie_goscia', { defaultValue: '(Tryb Gościa: odśwież stronę, by zobaczyć efekt)' }));
                }
              }}
              className={cn(
                "p-3 rounded-2xl border transition-all text-left flex flex-col gap-1 items-start justify-center",
                (settings.treatmentMode === mode.id || (!settings.treatmentMode && mode.id === 'insulin'))
                  ? "bg-indigo-500 border-indigo-500 text-white shadow-lg"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300"
              )}
            >
              <div className="flex items-center gap-2">
                {mode.icon}
                <span className="text-xs font-bold">{mode.label}</span>
              </div>
              <span className="text-[9px] opacity-80">{mode.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dedykowany Poradnik Awaryjny: Przejście na Peny (Tylko dla Pompy) */}
      {isPump && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowEmergencyGuide(true)}
          className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/15 rounded-3xl p-3.5 sm:p-4 border border-amber-500/30 dark:border-amber-500/20 flex items-center justify-between gap-3 shadow-sm hover:shadow-md active:scale-[0.99] transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <ShieldAlert size={19} />
            </div>
            <div className="text-left min-w-0">
              <h4 className="text-xs font-black dark:text-white uppercase tracking-tight flex items-center gap-1.5 flex-wrap">
                <span>{t('auto.emergency_pen_guide_title', { defaultValue: 'Awaria Pompy: Przejście na Peny' })}</span>
                <span className="text-[8px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded-full">
                  Awaria
                </span>
              </h4>
              <p className="text-[9px] sm:text-[9.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                {t('auto.emergency_pen_guide_sub', { defaultValue: 'Procedura ratunkowa i kalkulator dawki bazy zastępczej' })}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1 bg-amber-500 group-hover:bg-amber-400 text-slate-950 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider shadow-sm transition-colors">
            <span>{t('auto.emergency_pen_guide_btn', { defaultValue: 'Procedura' })}</span>
            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      )}

      {/* Modal Poradnika Awaryjnego - Pełny Pakiet Bezpieczeństwa */}
      {showEmergencyGuide && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl shadow-lg shadow-amber-500/20">
                  <ShieldAlert size={20} />
                </div>
                <div className="text-left">
                  <h3 className="text-sm sm:text-base font-black dark:text-white uppercase tracking-tight">
                    {t('auto.emergency_modal_title', { defaultValue: 'Procedura Awaryjna – Przejście na Peny' })}
                  </h3>
                  <p className="text-[9.5px] font-bold text-slate-400">
                    Spokojnie – oto kompletny plan działania krok po kroku
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEmergencyGuide(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Krok 1: Dawka Bazy i Wyjaśnienie skąd się bierze */}
            <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  {t('auto.emergency_step_1_title', { defaultValue: '1. Obliczenie Dawki Bazy (Długodziałającej)' })}
                </h4>
              </div>

              {/* Wyjaśnienie skąd ta dawka */}
              <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-500/30 space-y-2">
                <div className="flex items-start gap-2">
                  <HelpCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    <strong className="block font-black text-slate-800 dark:text-slate-100 text-[10px] mb-0.5">
                      {t('auto.emergency_why_basal_title', { defaultValue: 'Skąd bierze się ta dawka bazy?' })}
                    </strong>
                    {t('auto.emergency_why_basal_desc', { defaultValue: 'Pompa podaje insulinę bazową co kilka minut przez całą dobę. Suma tych dawek to Twoja dobowa baza (TDD Bazy). W penie podajemy dokładnie taką samą dawkę (1:1) w postaci insuliny długodziałającej o powolnym uwalnianiu (np. Lantus, Tresiba, Levemir, Toujeo).' })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {t('auto.emergency_calculated_basal', { defaultValue: 'Sugerowana dawka bazy:' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder={String(Math.round(initialCalculatedBasal))}
                      value={customBasalInput}
                      onChange={(e) => setCustomBasalInput(e.target.value)}
                      className="w-14 p-1 text-center font-black text-xs bg-amber-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg outline-none text-slate-900 dark:text-white"
                    />
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                      = {Math.round(activeBasal)} j. / 24h
                    </span>
                  </div>
                </div>
              </div>

              {/* Kiedy podać bazę */}
              <div className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-xl space-y-1.5 text-[9.5px] text-slate-700 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white text-[10px]">
                  <Clock size={13} className="text-indigo-500" />
                  {t('auto.emergency_when_inject_title', { defaultValue: 'Kiedy podać pierwszą dawkę bazy w penie?' })}
                </div>
                <p>• <strong>Awaria w ciągu dnia (rano/południe):</strong> {t('auto.emergency_when_inject_day', { defaultValue: 'Podaj pełną dawkę bazy długodziałającej od razu, LUB podawaj małe bolusy korekcyjne szybkodziałającą co 2-3h do godziny 20:00 i o 20:00 podaj pełną bazę.' })}</p>
                <p>• <strong>Awaria wieczorem/w nocy:</strong> {t('auto.emergency_when_inject_night', { defaultValue: 'Podaj pełną dawkę bazy długodziałającej natychmiast.' })}</p>
              </div>
            </div>

            {/* Krok 2: Bolusy Posiłkowe, WBT i Szybki Przelicznik */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3 text-left">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={14} className="text-indigo-500" />
                {t('auto.emergency_step_2_title', { defaultValue: '2. Bolusy Posiłkowe i Korekty (Szybkodziałająca)' })}
              </h4>
              
              {/* Oficjalne Wzory Diabetologiczne */}
              <div className="p-3 bg-slate-900 text-white dark:bg-slate-950 rounded-xl border border-slate-700/60 space-y-2 text-[9.5px]">
                <div className="flex items-center justify-between text-indigo-400 font-black uppercase tracking-wider text-[9px]">
                  <span className="flex items-center gap-1.5">
                    <Calculator size={13} />
                    {t('auto.emergency_formulas_badge', { defaultValue: 'Oficjalne wzory diabetologiczne' })}
                  </span>
                  <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.2 rounded">
                    ISPAD / PTD
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[9px] text-slate-300">
                  <div className="p-1.5 bg-slate-800/80 rounded-lg border border-slate-700">
                    📐 <strong>ISF</strong> = 1800 / TDI <span className="text-slate-400">(lub ~3270 / Waga [kg])</span>
                  </div>
                  <div className="p-1.5 bg-slate-800/80 rounded-lg border border-slate-700">
                    🍞 <strong>Współczynnik WW</strong> = TDI / 50 <span className="text-slate-400">j./WW</span>
                  </div>
                  <div className="p-1.5 bg-slate-800/80 rounded-lg border border-slate-700">
                    🎯 <strong>Korekta</strong> = (Aktualny Cukier - Cel) / ISF
                  </div>
                </div>
              </div>

              {/* Wyjaśnienie pojęć WW i ISF prostym językiem */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-[9.5px]">
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300 font-medium">
                  <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>{t('auto.emergency_ww_expl', { defaultValue: '1 WW = 10g węglowodanów z etykiety (np. 40g węgli = 4 WW, 1 banan = ok. 2 WW)' })}</strong>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300 font-medium pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <Info size={14} className="text-teal-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>{t('auto.emergency_isf_expl', { defaultValue: 'ISF = o ile mg/dL 1 j. insuliny zbija cukier (np. ISF 50 zbija cukier z 200 na 150)' })}</strong>
                  </div>
                </div>
              </div>

              {/* Sekcja: Awaryjne oszacowanie z masy ciała (gdy pacjent/rodzic nie zna parametrów) */}
              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-200/50 dark:border-purple-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Scale size={13} />
                    {t('auto.emergency_weight_fallback_title', { defaultValue: 'Nie znasz współczynników? Oszacuj z masy ciała' })}
                  </span>
                  <span className="text-[8px] bg-purple-200/50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded-full">
                    Ratunek 0.55j/kg
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    {t('auto.emergency_child_weight', { defaultValue: 'Masa ciała (kg):' })}
                  </label>
                  <input
                    type="number"
                    placeholder="np. 60"
                    value={bodyWeight}
                    onChange={(e) => {
                      setBodyWeight(e.target.value);
                      if (parseFloat(e.target.value) > 0) setUseWeightFallback(true);
                    }}
                    className="w-20 p-1.5 text-xs font-black text-center bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg outline-none"
                  />
                  {weightNum > 0 && (
                    <span className="text-[9px] font-black text-purple-600 dark:text-purple-400">
                      👉 ISF: ~{isfFromWeight} | WW: ~{wwRatioFromWeight}j
                    </span>
                  )}
                </div>
              </div>

              {/* Interaktywny Mini-Kalkulator Bolusa Awaryjnego */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/50 dark:border-indigo-800/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight flex items-center gap-1.5">
                    <Utensils size={12} />
                    {t('auto.emergency_quick_calc_title', { defaultValue: 'Szybki przelicznik bolusa awaryjnego' })}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    Ratio: {activeWwRatio}j/WW | ISF: {activeIsf}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      {t('auto.emergency_sugar_label', { defaultValue: 'Cukier (mg/dL):' })}
                    </label>
                    <input
                      type="number"
                      placeholder="np. 180"
                      value={calcBg}
                      onChange={(e) => setCalcBg(e.target.value)}
                      className="w-full p-1.5 text-xs font-black text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                        {t('auto.emergency_carbs_label', { defaultValue: 'Węglowodany:' })}
                      </label>
                      {/* Przełącznik Gramy / WW */}
                      <div className="flex bg-slate-200 dark:bg-slate-800 rounded-md p-0.5 text-[8.5px] font-bold">
                        <button
                          type="button"
                          onClick={() => setCarbMode('grams')}
                          className={cn("px-1.5 py-0.2 rounded", carbMode === 'grams' ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500")}
                        >
                          Gramy (g)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCarbMode('ww')}
                          className={cn("px-1.5 py-0.2 rounded", carbMode === 'ww' ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500")}
                        >
                          WW
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      placeholder={carbMode === 'grams' ? "np. 40 g" : "np. 4.0 WW"}
                      value={carbInput}
                      onChange={(e) => setCarbInput(e.target.value)}
                      className="w-full p-1.5 text-xs font-black text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={calcFatProtein}
                    onChange={(e) => setCalcFatProtein(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-300">
                    Posiłek tłusty/białkowy (pizza, fast food, ser)?
                  </span>
                </label>

                {/* Wynik kalkulatora */}
                {(bgNum > 0 || rawCarbVal > 0) && (
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-300 dark:border-indigo-700/60 text-left space-y-1 animate-in fade-in">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      <span>{t('auto.emergency_total_dose_result', { defaultValue: 'Wyliczona dawka łącznie:' })}</span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {roundedPenDose} j.
                      </span>
                    </div>

                    {calcFatProtein ? (
                      <div className="text-[9px] text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                        👉 Podział na penie: <strong>{splitFirstDose} j.</strong> teraz + <strong>{splitSecondDose} j.</strong> za 90 minut.
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-500 dark:text-slate-400">
                        (Posiłek: {mealDose.toFixed(1)} j. [{calculatedWwNum.toFixed(1)} WW] | Korekta: {correctionDose > 0 ? `+${correctionDose.toFixed(1)}` : `${correctionDose.toFixed(1)}`} j.)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Zasada Split-dose dla WBT */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-800 dark:text-amber-300">
                  <Flame size={13} className="text-amber-500" />
                  <span>{t('auto.emergency_split_dose_title', { defaultValue: 'Posiłki tłuszczowo-białkowe (WBT) bez fali złożonej' })}</span>
                </div>
                <p className="text-[9.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {t('auto.emergency_split_dose_desc', { defaultValue: 'W penie nie ma bolusa przedłużonego. Przy tłustych posiłkach (pizza, frytki, burgery) zastosuj podział dawki: podaj 50-60% insuliny przed posiłkiem, a pozostałe 40-50% drugim zastrzykiem po 90-120 minutach.' })}
                </p>
              </div>

              {/* Zasady zaokrągleń */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9.5px]">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="font-black text-emerald-600 dark:text-emerald-400 block mb-0.5">
                    ⬇️ {t('auto.emergency_round_down', { defaultValue: 'Zaokrąglenie w dół:' })}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {t('auto.emergency_round_down_desc', { defaultValue: 'Bezpieczniejsze – cukier będzie nieco wyższy, ale unikasz niedocukrzenia.' })}
                  </span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="font-black text-amber-600 dark:text-amber-400 block mb-0.5">
                    ⬆️ {t('auto.emergency_round_up', { defaultValue: 'Zaokrąglenie w górę:' })}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {t('auto.emergency_round_up_desc', { defaultValue: 'Podaj wyższą dawkę i dojedz 2–5g węglowodanów (np. 1 chrupka), aby zapobiec hipoglikemii.' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Krok 3: Złote Zasady Podawania Penem */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-left">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={14} className="text-teal-500" />
                {t('auto.emergency_step_3_title', { defaultValue: '3. Złote Zasady Podawania Penem' })}
              </h4>
              <ul className="space-y-1.5 text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-teal-500 font-bold">•</span>
                  <span><strong>Strzał kontrolny (odpowietrzenie):</strong> Wypuść 1–2 j. w powietrze przed każdym wkłuciem, aby upewnić się, że igła jest drożna i nie ma pęcherzyków powietrza.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-500 font-bold">•</span>
                  <span><strong>Reguła 10 sekund:</strong> Po wciśnięciu przycisku pena odlicz powoli do 10 przed wyjęciem igły ze skóry, by insulina nie wyciekła.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-500 font-bold">•</span>
                  <span><strong>Miejsca wkłucia:</strong> Brzuch/ramiona (insulina posiłkowa szybka), uda/pośladki (insulina bazowa długodziałająca).</span>
                </li>
              </ul>
            </div>

            {/* Krok 4: Ostrzeżenie DKA & Ketony */}
            <div className="p-3.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-500/20 text-left flex items-start gap-2.5">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-500" />
              <div className="text-[10px] font-medium leading-relaxed">
                <strong className="block font-black uppercase text-[10px] mb-0.5">
                  {t('auto.emergency_step_4_title', { defaultValue: '4. Bezpieczeństwo i Ketony' })}
                </strong>
                {t('auto.emergency_step_4_desc', { defaultValue: 'Brak insuliny bazowej grozi kwasicą ketonową (DKA) już po 2–4h od odpięcia pompy. Sprawdzaj cukier co 1–2 godziny i zmierz ketony we krwi lub moczu.' })}
              </div>
            </div>

            {/* Sekcja: Telefony Infolinii Serwisowych 24/7 (Polska PL) */}
            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-left space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-black text-xs">
                  <PhoneCall size={14} />
                  {t('auto.emergency_helplines_title', { defaultValue: 'Infolinie techniczne producentów pomp (24/7)' })}
                </div>
                <span className="text-[8.5px] bg-indigo-200/50 dark:bg-indigo-800/40 text-indigo-800 dark:text-indigo-300 font-black px-1.5 py-0.5 rounded">
                  Polska (PL)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                <a href="tel:800080044" className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between hover:border-indigo-400 transition-colors">
                  <span className="font-bold">Medtronic:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">800 080 044</span>
                </a>
                <a href="tel:800131010" className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between hover:border-indigo-400 transition-colors">
                  <span className="font-bold">Ypsomed:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">800 131 010</span>
                </a>
                <a href="tel:801080104" className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between hover:border-indigo-400 transition-colors">
                  <span className="font-bold">Accu-Chek:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">801 080 104</span>
                </a>
                <a href="tel:+48221043888" className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between hover:border-indigo-400 transition-colors">
                  <span className="font-bold">Tandem:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">22 104 38 88</span>
                </a>
              </div>
            </div>

            {/* Przycisk zamknięcia */}
            <button
              type="button"
              onClick={() => setShowEmergencyGuide(false)}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <HeartHandshake size={15} />
              {t('auto.zamknij_poradnik', { defaultValue: 'Rozumiem, zamknij' })}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
