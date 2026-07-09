import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Database, Utensils, HeartPulse, Scan, Bot, Star, ShieldAlert, ShieldCheck, CloudSun, Sparkles, MessageSquareHeart } from 'lucide-react';
import i18n from "../i18n";

const OnboardingTutorial = ({ onComplete }: { onComplete: (mode: 'pump' | 'insulin' | 'diet_only') => void }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<'pump' | 'insulin' | 'diet_only'>('insulin');

  const steps = [
    {
      title: i18n.t('auto.witaj_w_ekipie_glikocontro', { defaultValue: 'Witaj w ekipie GlikoControl!' }),
      description: i18n.t('auto.to_projekt_fanowski_tworzony_z', { defaultValue: "To projekt fanowski, tworzony z myślą o nas – diabetykach. Bez zbędnego patosu, po prostu potężne narzędzie, które ma ułatwić nam życie z cukrzycą." }),
      icon: <HeartPulse className="w-16 h-16 text-rose-500" />
    },
    {
      title: i18n.t('auto.talerz_i_kalkulacje', { defaultValue: 'Talerz i Kalkulacje' }),
      description: i18n.t('auto.zarzadzaj_posilkami_latwiej_ni', { defaultValue: "Zarządzaj posiłkami łatwiej niż kiedykolwiek. Użyj Talerza Posiłków, by automatycznie zsumować węglowodany, a algorytmy wyliczą Twoją Aktywną Insulinę (IOB)." }),
      icon: <Utensils className="w-16 h-16 text-orange-500" />
    },
    {
      title: i18n.t('auto.glikosense_offline', { defaultValue: 'GlikoSense (Offline)' }),
      description: i18n.t('auto.glikosense_offline_desc', { defaultValue: "Sercem aplikacji jest sieć neuronowa LSTM. Algorytmy analizują Twoje trendy cukrów i dawkowanie całkowicie lokalnie, gwarantując najwyższe bezpieczeństwo danych." }),
      icon: <Activity className="w-16 h-16 text-indigo-500" />
    },
    {
      title: i18n.t('auto.sztuczna_inteligencja_ai', { defaultValue: 'Sztuczna Inteligencja (AI)' }),
      description: i18n.t('auto.ai_desc', { defaultValue: "Asystent GlikoChat pomoże Ci w każdej sytuacji. Błyskawicznie szacuj węglowodany robiąc zdjęcie posiłku lub skanując kody kreskowe, a na koniec generuj potężne Raporty AI!" }),
      icon: <Sparkles className="w-16 h-16 text-accent-500" />
    },
    {
      title: i18n.t('auto.pogoda_i_srodowisko', { defaultValue: 'Pogoda i Środowisko' }),
      description: i18n.t('auto.wplyw_pogody_na_glikemie', { defaultValue: "Często zapominamy, że temperatura, wiatr i ciśnienie potężnie wpływają na naszą wrażliwość. GlikoControl posiada wbudowane moduły pogodowe, które pobierają dane z Twojej okolicy i ostrzegają Cię przed nagłymi spadkami lub skokami cukru." }),
      icon: <CloudSun className="w-16 h-16 text-sky-400" />
    },
    {
      title: i18n.t('auto.gliko_przyjaciel_dla_dzieciako', { defaultValue: "Gliko – Wirtualny Pupil" }),
      description: i18n.t('auto.dla_najmlodszych_i_tych_starsz', { defaultValue: "Dbaj o swoje cukry, a Twój wirtualny zwierzak będzie rósł, zdobywał poziomy i odblokowywał nowe, epickie przebrania w zakładce Osiągnięć." }),
      icon: <Star className="w-16 h-16 text-purple-500" />
    },
    {
      id: 'treatment',
      title: i18n.t('auto.wybierz_metode_leczenia', { defaultValue: 'Wybierz metodę leczenia' }),
      description: i18n.t('auto.pozwoli_nam_to_dostosowac', { defaultValue: "Pozwoli nam to dostosować algorytmy AI oraz ukryć zbędne funkcje. Zawsze możesz to zmienić później w swoim Profilu." }),
      icon: <Activity className="w-16 h-16 text-emerald-500" />
    },
    {
      title: i18n.t('auto.bezpieczenstwo_i_prywatnos', { defaultValue: "Bezpieczeństwo i RODO" }),
      description: i18n.t('auto.glikocontrol_nie_jest_wyrobem', { defaultValue: "Twoje dane medyczne są święte i nigdy nie opuszczają Twojego urządzenia bez Twojej zgody. Pamiętaj jednak: GlikoControl NIE JEST certyfikowanym wyrobem medycznym. Aplikacja ma charakter wyłącznie informacyjny. Zawsze konsultuj zmiany terapii z lekarzem." }),
      icon: <ShieldCheck className="w-16 h-16 text-emerald-500" />
    }
  ];

  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      if (agreed) {
        onComplete(selectedTreatment);
      }
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    })
  };

  return (
    <motion.div 
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4"
    >
      <div className="w-full max-w-md relative overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-700/50 flex flex-col h-[600px] max-h-[90vh]">
        
        {/* Progress Bar Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800 z-10">
          <motion.div 
            className="h-full bg-accent-500"
            initial={{ width: '0%' }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col justify-center">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div 
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="mb-8 relative">
                <div className="absolute inset-0 bg-current opacity-10 blur-2xl rounded-full scale-150" />
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700 relative z-10 transform rotate-3">
                   {steps[step].icon}
                </div>
              </div>

              <h2 className={`text-2xl font-black mb-4 tracking-tight leading-tight ${isLastStep ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                {steps[step].title}
              </h2>
              
              <p className="text-slate-500 dark:text-slate-400 text-[15px] font-medium leading-relaxed">
                {steps[step].description}
              </p>

              {steps[step].id === 'treatment' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex flex-col gap-3 w-full max-w-[280px]"
                >
                  {[
                    { id: 'pump', icon: <Database size={20} />, label: i18n.t('auto.pompa_insulinowa', { defaultValue: 'Pompa Insulinowa' }) },
                    { id: 'insulin', icon: <Scan size={20} />, label: i18n.t('auto.peny_wstrzykiwacze', { defaultValue: 'Peny (Wstrzykiwacze)' }) },
                    { id: 'diet_only', icon: <Utensils size={20} />, label: i18n.t('auto.sama_dieta_leki', { defaultValue: 'Sama Dieta / Tabletki' }) }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedTreatment(option.id as any)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all w-full text-left active:scale-[0.98]",
                        selectedTreatment === option.id 
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                          : "border-slate-100 dark:border-slate-800 bg-transparent text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                      )}
                    >
                      <div className={cn("p-2 rounded-xl transition-colors", selectedTreatment === option.id ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-slate-100 dark:bg-slate-800")}>
                        {option.icon}
                      </div>
                      <span className="font-bold text-sm leading-none">{option.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}

              {isLastStep && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-2xl flex items-start gap-3 text-left w-full shadow-inner"
                >
                  <input 
                    type="checkbox" 
                    id="confirm-disclaimer"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-800"
                  />
                  <label htmlFor="confirm-disclaimer" className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer select-none">
                    {i18n.t('auto.akceptuje_polityke_prywatn', { defaultValue: "Akceptuję politykę prywatności RODO oraz oświadczam, że zapoznałem się z klauzulą medyczną wykluczającą odpowiedzialność twórców aplikacji." })}
                  </label>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 pt-0 flex gap-3 relative z-10 bg-gradient-to-t from-white via-white dark:from-slate-900 dark:via-slate-900 to-transparent">
          {step > 0 && (
             <button 
               onClick={handlePrev}
               className="w-16 h-14 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0"
             >
               {i18n.t('auto.wstecz', { defaultValue: "Wstecz" })}
             </button>
          )}
          <button 
            onClick={handleNext}
            disabled={isLastStep && !agreed}
            className={cn(
              "flex-1 h-14 font-black uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2",
              isLastStep 
                ? agreed 
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20" 
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                : "bg-accent-600 hover:bg-accent-500 text-white shadow-accent-600/20"
            )}
          >
            {isLastStep ? i18n.t('auto.zgadzam_sie', { defaultValue: "Zgadzam się" }) : i18n.t('auto.dalej', { defaultValue: "Dalej" })}
          </button>
        </div>

      </div>
    </motion.div>
  );
}

export default OnboardingTutorial;

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
