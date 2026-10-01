import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { 
  Activity, Apple, Zap, Signal, ShieldAlert, X, BookOpen, 
  CheckCircle2, AlertTriangle, ChevronRight, PhoneCall, 
  HelpCircle, Clock, HeartHandshake, Calculator, Flame,
  Info
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

  const isPump = settings.treatmentMode === 'pump';

  // Obliczenie sumy bazy w pompie dla celów orientacyjnych
  const initialCalculatedBasal = React.useMemo(() => {
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
    return 0;
  }, [settings.hourlyProfiles]);

  return (
    <div className="space-y-3">
      <div className={cn(
        "p-5 rounded-[2.5rem] border transition-all hover:shadow-md space-y-4",
        settings.glassmorphismEnabled
          ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
          : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
            <Activity size={20} />
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
                {t('auto.emergency_pen_guide_sub', { defaultValue: 'Procedura ratunkowa i wytyczne przejścia na peny' })}
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
                  {t('auto.emergency_step_1_title', { defaultValue: '1. Wytyczne Bazy Długodziałającej' })}
                </h4>
              </div>

              {/* Wyjaśnienie skąd ta dawka */}
              <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-500/30 space-y-2">
                <div className="flex items-start gap-2">
                  <HelpCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    <strong className="block font-black text-slate-800 dark:text-slate-100 text-[10px] mb-0.5">
                      {t('auto.emergency_why_basal_title', { defaultValue: 'Jak lekarz wyznacza dawkę bazy w penie?' })}
                    </strong>
                    {t('auto.emergency_why_basal_desc', { defaultValue: 'W pompie insulina bazowa podawana jest w mikrodawkach co kilka minut. W penie stosuje się insulinę o powolnym uwalnianiu (np. Lantus, Tresiba, Levemir, Toujeo). Dawkę zawsze ustala lekarz prowadzący – zwykle na podstawie sumy bazy w pompie z uwzględnieniem typu insuliny.' })}
                  </div>
                </div>

                {initialCalculatedBasal > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {t('auto.emergency_profile_basal_sum', { defaultValue: 'Suma bazy w Twoim profilu pompy:' })}
                    </span>
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                      ~{initialCalculatedBasal.toFixed(1)} j. / 24h
                    </span>
                  </div>
                )}
              </div>

              {/* Kiedy podać bazę */}
              <div className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-xl space-y-1.5 text-[9.5px] text-slate-700 dark:text-slate-300 font-medium">
                <div className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white text-[10px]">
                  <Clock size={13} className="text-indigo-500" />
                  {t('auto.emergency_when_inject_title', { defaultValue: 'Pora podania bazy w penie' })}
                </div>
                <p>• <strong>Karta awaryjna:</strong> {t('auto.emergency_check_card', { defaultValue: 'Sprawdź w swojej pisemnej karcie awaryjnej zalecaną przez lekarza godzinę i dawkę wstrzyknięcia insuliny bazowej.' })}</p>
                <p>• <strong>W razie wątpliwości:</strong> {t('auto.emergency_call_clinic', { defaultValue: 'Skontaktuj się z poradnią diabetologiczną lub szpitalnym oddziałem dyżurnym.' })}</p>
              </div>
            </div>

            {/* Krok 2: Bolusy Posiłkowe, WBT i Wzory Diabetologiczne */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3 text-left">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={14} className="text-indigo-500" />
                {t('auto.emergency_step_2_title', { defaultValue: '2. Bolusy Posiłkowe i Korekty w Penie' })}
              </h4>
              
              {/* Oficjalne Wzory Diabetologiczne */}
              <div className="p-3 bg-slate-900 text-white dark:bg-slate-950 rounded-xl border border-slate-700/60 space-y-2 text-[9.5px]">
                <div className="flex items-center justify-between text-indigo-400 font-black uppercase tracking-wider text-[9px]">
                  <span className="flex items-center gap-1.5">
                    <Calculator size={13} />
                    {t('auto.emergency_formulas_badge', { defaultValue: 'Oficjalne wzory diabetologiczne (ISPAD / PTD)' })}
                  </span>
                  <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.2 rounded">
                    Edukacja
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[9px] text-slate-300">
                  <div className="p-1.5 bg-slate-800/80 rounded-lg border border-slate-700">
                    📐 <strong>ISF (Wrażliwość)</strong> = 1800 / TDD <span className="text-slate-400">(obniżenie glikemii przez 1j)</span>
                  </div>
                  <div className="p-1.5 bg-slate-800/80 rounded-lg border border-slate-700">
                    🍞 <strong>Współczynnik WW</strong> = TDD / 50 <span className="text-slate-400">(zapotrzebowanie j./WW)</span>
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
                    <strong>{t('auto.emergency_ww_expl', { defaultValue: '1 WW = 10g węglowodanów przyswajalnych (np. 40g węgli = 4 WW, 1 banan = ok. 2 WW)' })}</strong>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300 font-medium pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <Info size={14} className="text-teal-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>{t('auto.emergency_isf_expl', { defaultValue: 'ISF = o ile mg/dL 1 j. insuliny zbija cukier (np. ISF 50 zbija cukier z 200 na 150)' })}</strong>
                  </div>
                </div>
              </div>

              {/* Zasada Split-dose dla WBT */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-800 dark:text-amber-300">
                  <Flame size={13} className="text-amber-500" />
                  <span>{t('auto.emergency_split_dose_title', { defaultValue: 'Posiłki tłuszczowo-białkowe (WBT) w penie' })}</span>
                </div>
                <p className="text-[9.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {t('auto.emergency_split_dose_desc', { defaultValue: 'W penie nie ma bolusa przedłużonego. Przy tłustych posiłkach (pizza, frytki, sery) lekarze zalecają podział dawki: część insuliny przed posiłkiem, a resztę po 90-120 minutach według indywidualnego planu leczenia.' })}
                </p>
              </div>

              {/* Klauzula Medyczna */}
              <div className="p-2.5 bg-amber-500/10 text-amber-800 dark:text-amber-200 rounded-xl border border-amber-500/20 text-[9px] leading-relaxed">
                ℹ️ <strong>Ważne:</strong> Aplikacja GlikoControl nie wylicza ani nie ustala dawek leków w nagłych wypadkach. Wszelkie dawki korekcyjne i posiłkowe w penie należy podawać zgodnie z pisemną kartą leczenia wydaną przez diabetologa.
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
