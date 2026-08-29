import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { Haptics } from '../lib/haptics';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function DidYouKnowWidget({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();

  const tips = useMemo(() => [
    t('auto.czy_wiesz_ze_glikosense_predict', { defaultValue: "Czy wiesz, że sieć neuronowa GlikoSense uczy się Twojej wrażliwości na insulinę i przewiduje trendy cukru z 60-minutowym wyprzedzeniem?" }),
    t('auto.czy_wiesz_ze_smart_rotacja', { defaultValue: "Czy wiesz, że inteligentna mapa wkłuć bada czas odpoczynku Twoich tkanek (0-100%) i sugeruje najświeższe miejsce na nowe wkłucie?" }),
    t('auto.czy_wiesz_ze_kalkulator_wbt', { defaultValue: "Czy wiesz, że posiłki bogate w tłuszcze i białka (WBT) wymagają dawki przedłużonej? Nasz kalkulator automatycznie rozbija bolus na dwie fazy!" }),
    t('auto.czy_wiesz_ze_jetlag_podroze', { defaultValue: "Czy wiesz, że w module GlikoSense znajdziesz Asystenta Podróży (JetLag), który pomaga bezpiecznie przesunąć godziny dawek bazy podczas lotów?" }),
    t('auto.czy_wiesz_ze_komendy_glosowe', { defaultValue: "Czy wiesz, że możesz podyktować posiłek lub pomiar głosem, klikając mikrofon przy inteligentnym asystencie Gliko?" }),
    t('auto.czy_wiesz_ze_health_connect', { defaultValue: "Czy wiesz, że aplikacja łączy się z Health Connect, aby monitorować Twoje kroki i ostrzegać przed spadkiem cukru po intensywnym wysiłku?" }),
    t('auto.czy_wiesz_ze_mozesz_poprosic_g', { defaultValue: i18n.t('auto.czy_wiesz_ze_mozesz_popro', { defaultValue: "Czy wiesz, że możesz poprosić GlikoCzata o samodzielne dodanie posiłku, używając komendy np.: 'dodaj do talerza jabłko'!" }) }),
    t('auto.system_osiagniec_odblokowuje_m', { defaultValue: i18n.t('auto.system_osiagniec_odblokow', { defaultValue: "System Osiągnięć odblokowuje monety dla Twojego Zwierzaka, co zachęca Cię do częstszych kontroli." }) }),
    t('auto.talerz_wspolpracuje_z_ai_im_do', { defaultValue: i18n.t('auto.talerz_wspolpracuje_z_ai', { defaultValue: "Talerz współpracuje z AI. Im dokładniej opiszesz co zjadłeś, tym lepsze szacunki otrzymasz." }) }),
    t('auto.kalkulator_bolusa_potrafi_wyci', { defaultValue: i18n.t('auto.kalkulator_bolusa_potrafi', { defaultValue: "Kalkulator Bolusa potrafi wyciągnąć opóźnienia i uwzględnić resztkowe IOB, na podstawie zdefiniowanej skali." }) }),
    t('auto.sprawdz_integracje_z_nightscou', { defaultValue: i18n.t('auto.sprawdz_integracje_z_nigh', { defaultValue: "Sprawdź integrację z Nightscout w zakładce 'Integracje (API) / Nightscout', aby pobierać wyniki CGM w tle." }) }),
    t('auto.czy_wiesz_ze_mozesz_skanowac_k', { defaultValue: i18n.t('auto.czy_wiesz_ze_mozesz_skano', { defaultValue: "Czy wiesz, że możesz skanować kody kreskowe produktów, aby szybko i precyzyjnie dodawać je do swojego posiłku?" }) }),
    t('auto.czy_wiesz_ze_mozesz_uzyc_apara', { defaultValue: i18n.t('auto.czy_wiesz_ze_mozesz_uzyc', { defaultValue: "Czy wiesz, że możesz użyć aparatu AI, aby zrobić zdjęcie swojego talerza, a sztuczna inteligencja automatycznie rozpozna i oszacuje dla Ciebie posiłek?" }) }),
    t('auto.czy_wiesz_ze_mozesz_dodac_wlas', { defaultValue: i18n.t('auto.czy_wiesz_ze_mozesz_dodac', { defaultValue: "Czy wiesz, że możesz dodać własny klucz API w ustawieniach 'Integracje', aby korzystać z szybszego asystenta AI oraz podnieść limit zapytań?" }) }),
    t('auto.czy_wiesz_ze_mozesz_zainstalow', { defaultValue: i18n.t('auto.czy_wiesz_ze_mozesz_zains', { defaultValue: "Czy wiesz, że możesz zainstalować tę aplikację na telefonie? Użyj opcji 'Dodaj do ekranu głównego' w przeglądarce, by mieć do niej szybki dostęp!" }) }),
    t('auto.czy_wiesz_ze_mozesz_stworzyc_w', { defaultValue: i18n.t('auto.czy_wiesz_ze_mozesz_stwor', { defaultValue: "Czy wiesz, że możesz stworzyć własny serwer do łączenia z xDrip przez wygenerowanie kodu w zakładce 'Integracje (API)'?" }) }),
    t('auto.czy_wiesz_ze_pigulka_na_dole', { defaultValue: "Czy wiesz, że Pigułka na dole ekranu zamieni się w przypomnienie, gdy do końca ważności sensora lub wkłucia zostaną mniej niż 2 godziny?" }),
    t('auto.czy_wiesz_ze_szybka_korekta', { defaultValue: "Czy wiesz, że gdy Twój cukier wzrośnie powyżej normy, kafel Bolusa na pulpicie automatycznie zaproponuje Ci szybkie podanie dawki korekcyjnej?" })
  ], [t]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [timerResetKey, setTimerResetKey] = useState(0);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    Haptics.light();
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % tips.length);
    setTimerResetKey((prev) => prev + 1);
  }, [tips.length]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    Haptics.light();
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + tips.length) % tips.length);
    setTimerResetKey((prev) => prev + 1);
  }, [tips.length]);

  // Automatyczna rotacja co 12 sekund, resetowana po ręcznym przesunięciu
  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % tips.length);
    }, 12000);

    return () => clearInterval(interval);
  }, [timerResetKey, tips.length]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 30 : -30,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -30 : 30,
      opacity: 0
    })
  };

  return (
    <motion.div 
      onClick={() => {
        Haptics.light();
        onClick();
      }}
      className="glass p-4 sm:p-5 rounded-3xl cursor-pointer hover:shadow-lg transition-all border border-indigo-100 dark:border-indigo-500/10 group relative select-none"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner group-hover:scale-110 transition-transform shrink-0 mt-0.5">
          <Lightbulb size={20} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Górna belka: Tytuł + Licznik + Strzałki nawigacyjne */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none">
              {t('auto.czy_wiesz_że', { defaultValue: i18n.t('auto.czy_wiesz_ze', { defaultValue: "Czy wiesz, że..." }) })}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tabular-nums mr-0.5">
                {currentIndex + 1}/{tips.length}
              </span>
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Poprzednia porada"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 active:scale-90 transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Następna porada"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 active:scale-90 transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Płynny obszar treści bez ucinania */}
          <motion.div 
            className="min-h-[3.8rem] sm:min-h-[3.4rem] relative overflow-hidden touch-pan-y flex items-center"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -30) {
                handleNext();
              } else if (info.offset.x > 30) {
                handlePrev();
              }
            }}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.p
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed"
              >
                {tips[currentIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

