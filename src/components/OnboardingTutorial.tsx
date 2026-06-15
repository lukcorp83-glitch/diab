import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Database, Utensils, Settings, HeartPulse, Scan, Bot, Users, Star, ShieldAlert, ShieldCheck, EyeOff, CloudSun } from 'lucide-react';
import i18n from "../i18n";

const OnboardingTutorial = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);

  const steps = [
    {
      title: 'Witaj w ekipie GlikoControl!',
      description: i18n.t('auto.to_projekt_fanowski_tworzony_z', { defaultValue: i18n.t('auto.to_projekt_fanowski_tworz', { defaultValue: "To projekt fanowski, tworzony z myślą o nas – diabetykach. Bez zbędnego patosu, po prostu narzędzie, które ma ułatwić nam życie z cukrzycą." }) }),
      icon: <HeartPulse className="w-16 h-16 text-rose-500" />
    },
    {
      title: i18n.t('auto.dodawanie_posilku', { defaultValue: i18n.t('auto.dodawanie_posilku', { defaultValue: "Dodawanie posiłku" }) }),
      description: i18n.t('auto.zarzadzaj_posilkami_latwiej_ni', { defaultValue: i18n.t('auto.zarzadzaj_posilkami_latwi', { defaultValue: "Zarządzaj posiłkami łatwiej niż kiedykolwiek. Użyj Talerza Posiłków, by szybko zsumować węglowodany i białka z produktów, a aplikacja wyliczy wymienniki za Ciebie." }) }),
      icon: <Utensils className="w-16 h-16 text-orange-500" />
    },
    {
      title: 'Logowanie bolusa',
      description: i18n.t('auto.po_podaniu_insuliny_wpisz_ja_w', { defaultValue: i18n.t('auto.po_podaniu_insuliny_wpisz', { defaultValue: "Po podaniu insuliny wpisz ją w Dzienniku lub za pomocą Kalkulatora. Dzięki temu algorytmy wyliczą Twoją Aktywną Insulinę (IOB) i zapobiegną nakładaniu się dawek." }) }),
      icon: <Database className="w-16 h-16 text-indigo-500" />
    },
    {
      title: 'Kalibracja CGM',
      description: i18n.t('auto.jezeli_roznica_miedzy_sensorem', { defaultValue: i18n.t('auto.jezeli_roznica_miedzy_sen', { defaultValue: "Jeżeli różnica między sensorem (CGM) a glukometrem jest duża, w profilu (sekcja Osprzęt) możesz wpisać wynik z palca, a GlikoControl skoryguje kolejne odczyty." }) }),
      icon: <Scan className="w-16 h-16 text-teal-500" />
    },
    {
      title: i18n.t('auto.pogoda_a_wrazliwosc', { defaultValue: i18n.t('auto.pogoda_a_wrazliwosc', { defaultValue: "Pogoda a wrażliwość" }) }),
      description: i18n.t('auto.czesto_zapominamy_ze_temperatu', { defaultValue: i18n.t('auto.czesto_zapominamy_ze_temp', { defaultValue: "Często zapominamy, że temperatura i ciśnienie potężnie wpływają na nasze cukry. GlikoControl posiada wbudowane wskaźniki pogody, które ostrzegą Cię przed większym ryzykiem hipo lub hiper." }) }),
      icon: <CloudSun className="w-16 h-16 text-sky-400" />
    },
    {
      title: i18n.t('auto.twoja_prywatnosc_rodo', { defaultValue: i18n.t('auto.twoja_prywatnosc_rodo', { defaultValue: "Twoja Prywatność (RODO)" }) }),
      description: i18n.t('auto.twoje_dane_medyczne_sa_swiete', { defaultValue: i18n.t('auto.twoje_dane_medyczne_sa_sw', { defaultValue: "Twoje dane medyczne są święte. NIE są one przetwarzane w celach reklamowych ani udostępniane nikomu bez Twojej wyraźnej zgody. Wszystko jest szyfrowane i bezpieczne." }) }),
      icon: <ShieldCheck className="w-16 h-16 text-emerald-500" />
    },
    {
      title: i18n.t('auto.dane_pozostaja_u_ciebie', { defaultValue: i18n.t('auto.dane_pozostaja_u_ciebie', { defaultValue: "Dane pozostają u Ciebie" }) }),
      description: i18n.t('auto.zastosowalismy_technologie_gli', { defaultValue: i18n.t('auto.zastosowalismy_technologi', { defaultValue: "Zastosowaliśmy technologię GlikoSense, która analizuje Twoje cukry bezpośrednio na telefonie (offline). Żadne wrażliwe dane o trendach nie opuszczają Twojego urządzenia." }) }),
      icon: <EyeOff className="w-16 h-16 text-sky-500" />
    },
    {
      title: i18n.t('auto.glikosense_twoj_mozg_offline', { defaultValue: i18n.t('auto.glikosense_twoj_mozg_offl', { defaultValue: "GlikoSense – Twój mózg offline" }) }),
      description: i18n.t('auto.sercem_aplikacji_jest_siec_neu', { defaultValue: i18n.t('auto.sercem_aplikacji_jest_sie', { defaultValue: "Sercem aplikacji jest sieć neuronowa LSTM. To zaawansowany algorytm, który uczy się Twoich trendów, dawkowania i reakcji na jedzenie." }) }),
      icon: <Activity className="w-16 h-16 text-accent-500" />
    },
    {
      title: i18n.t('auto.gliko_przyjaciel_dla_dzieciako', { defaultValue: i18n.t('auto.gliko_przyjaciel_dla_dzie', { defaultValue: "Gliko – przyjaciel dla dzieciaków" }) }),
      description: i18n.t('auto.dla_najmlodszych_i_tych_starsz', { defaultValue: i18n.t('auto.dla_najmlodszych_i_tych_s', { defaultValue: "Dla najmłodszych (i tych starszych duchem!) mamy Gliko. Dbaj o swoje cukry, a Twój zwierzak będzie rósł, zdobywał poziomy i nowe przebrania." }) }),
      icon: <Star className="w-16 h-16 text-purple-500" />
    },
    {
      title: i18n.t('auto.wazna_klauzula_medyczna', { defaultValue: i18n.t('auto.wazna_klauzula_medyczna', { defaultValue: "Ważna Klauzula Medyczna" }) }),
      description: i18n.t('auto.glikocontrol_nie_jest_wyrobem', { defaultValue: i18n.t('auto.glikocontrol_nie_jest_wyr', { defaultValue: "GlikoControl NIE JEST wyrobem medycznym. Aplikacja ma charakter wyłącznie informacyjny i edukacyjny. Nigdy nie podejmuj decyzji o dawkowaniu insuliny czy zmianie diety wyłącznie na podstawie danych z aplikacji. Każda zmiana w terapii musi być skonsultowana z lekarzem diabetologiem." }) }),
      icon: <ShieldAlert className="w-16 h-16 text-red-600 animate-pulse" />
    }
  ];

  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      if (agreed) {
        onComplete();
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 p-4"
    >
      <motion.div 
        key={step}
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-slate-50 dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-8 pb-12 shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform text-center relative"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-inner border border-slate-100 dark:border-slate-700">
            {steps[step].icon}
          </div>
        </div>

        <h2 className={`text-xl font-black mb-4 tracking-tight ${isLastStep ? 'text-red-600 dark:text-red-500' : 'dark:text-white'}`}>
          {steps[step].title}
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8 min-h-[80px]">
          {steps[step].description}
        </p>

        {isLastStep && (
          <div className="mb-10 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-2xl flex items-start gap-3 text-left">
            <input 
              type="checkbox" 
              id="confirm-disclaimer"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="confirm-disclaimer" className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer select-none">
              {i18n.t('auto.rozumiem_ze_aplikacja_nie_zast', { defaultValue: i18n.t('auto.rozumiem_ze_aplikacja_nie', { defaultValue: "Rozumiem, że aplikacja nie zastępuje porady lekarskiej i akceptuję ryzyko związane z jej używaniem." }) })}</label>
          </div>
        )}

        {/* Dots */}
        {!isLastStep && (
          <div className="absolute bottom-32 left-0 right-0 flex justify-center gap-2">
            {steps.map((_, i) => (
              <div 
                key={`dot-${i}`} 
                className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-accent-600 w-6' : 'bg-slate-200 dark:bg-slate-700'}`} 
              />
            ))}
          </div>
        )}

        <button 
          onClick={handleNext}
          disabled={isLastStep && !agreed}
          className={cn(
            "w-full font-black uppercase tracking-widest py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all",
            isLastStep 
              ? agreed ? "bg-red-600 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-accent-600 text-white"
          )}
        >
          {isLastStep ? i18n.t('auto.zgadzam_sie_i_rozpoczynam', { defaultValue: i18n.t('auto.zgadzam_sie_i_rozpoczynam', { defaultValue: "Zgadzam się i Rozpoczynam" }) }) : 'Dalej'}
        </button>

        {step < steps.length - 1 && (
          <button 
            onClick={onComplete}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <span className="sr-only">{i18n.t('auto.pomin', { defaultValue: i18n.t('auto.pomin', { defaultValue: "Pomiń" }) })}</span>
            <span className="text-[10px] font-black uppercase">{i18n.t('auto.pomin', { defaultValue: i18n.t('auto.pomin', { defaultValue: "Pomiń" }) })}</span>
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

export default OnboardingTutorial;

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
