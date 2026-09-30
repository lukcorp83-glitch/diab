import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { Haptics } from '../lib/haptics';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function DidYouKnowWidget({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();

  const tips = useMemo(() => [
    t('auto.czy_wiesz_ze_glikosense_predict', { defaultValue: "Czy wiesz, że sieć neuronowa GlikoSense uczy się Twoich wzorców glikemii i potrafi przewidywać trendy cukru z 60-minutowym wyprzedzeniem?" }),
    t('auto.czy_wiesz_ze_smart_rotacja', { defaultValue: "Czy wiesz, że inteligentna mapa wkłuć bada czas odpoczynku Twoich tkanek (0-100%) i sugeruje najświeższe miejsce na nowe wkłucie?" }),
    t('auto.czy_wiesz_ze_kalkulator_wbt', { defaultValue: "Czy wiesz, że posiłki bogate w białka i tłuszcze (WBT) wymagają dłuższego wchłaniania? Nasz kalkulator bolusa pomaga zaplanować dawkę dwufazową!" }),
    t('auto.czy_wiesz_ze_jetlag_podroze', { defaultValue: "Czy wiesz, że w module Raportów AI (GlikoSense) znajdziesz Asystenta Podróży (JetLag), który pomaga w orientacyjnym rozplanowaniu dawek bazy przy zmianie stref czasowych?" }),
    t('auto.czy_wiesz_ze_komendy_glosowe', { defaultValue: "Czy wiesz, że możesz podyktować posiłek lub pomiar głosem, klikając ikonę mikrofonu przy Asystencie Diabetyka AI?" }),
    t('auto.czy_wiesz_ze_health_connect', { defaultValue: "Czy wiesz, że aplikacja łączy się z Health Connect i krokomierzem Androida, aby monitorować Twoją aktywność fizyczną i spalone kalorie?" }),
    t('auto.czy_wiesz_ze_mozesz_poprosic_g', { defaultValue: "Czy wiesz, że możesz poprosić Asystenta AI o samodzielne skomponowanie posiłku, pisząc np.: 'dodaj do talerza jajecznicę z 3 jaj i kromkę chleba'?" }),
    t('auto.system_osiagniec_odblokowuje_m', { defaultValue: "System Osiągnięć odblokowuje monety i unikalne skórki dla Twojego Zwierzaka w trybie dziecka, zachęcając do regularnych pomiarów!" }),
    t('auto.talerz_wspolpracuje_z_ai_im_do', { defaultValue: "Talerz Posiłków współpracuje z AI – aparat rozpoznaje składniki ze zdjęcia, szacuje wagę, węglowodany, białka, tłuszcze oraz indeks glikemiczny." }),
    t('auto.kalkulator_bolusa_potrafi_wyci', { defaultValue: "Kalkulator Bolusa precyzyjnie uwzględnia Twoje zdefiniowane współczynniki (ICR, ISF) oraz aktywną insulinę (IOB), aby ułatwić codzienne obliczenia." }),
    t('auto.sprawdz_integracje_z_nightscou', { defaultValue: "Sprawdź integrację z Nightscout w zakładce 'Integracje (API)', aby bezprzewodowo pobierać odczyty CGM i wpisy w czasie rzeczywistym." }),
    t('auto.czy_wiesz_ze_mozesz_skanowac_k', { defaultValue: "Czy wiesz, że możesz skanować kody kreskowe produktów, aby błyskawicznie sprawdzić makroskładniki i dodać je do Talerza Posiłków?" }),
    t('auto.czy_wiesz_ze_mozesz_uzyc_apara', { defaultValue: "Czy wiesz, że funkcja Aparatu AI potrafi rozpoznać posiłek ze zdjęcia i rozbić go na pojedyncze składniki z orientacyjną gramaturą?" }),
    t('auto.czy_wiesz_ze_mozesz_dodac_wlas', { defaultValue: "Czy wiesz, że możesz dodać własny darmowy klucz Google Gemini API w 'Integracjach', aby uzyskać nielimitowany dostęp do Asystenta AI?" }),
    t('auto.czy_wiesz_ze_mozesz_zainstalow', { defaultValue: "Czy wiesz, że GlikoControl możesz zainstalować jako natywną aplikację Android (APK) z widżetami na pulpicie telefonu lub jako aplikację PWA?" }),
    t('auto.czy_wiesz_ze_mozesz_stworzyc_w', { defaultValue: "Czy wiesz, że na telefonie z Androidem aplikacja potrafi odbierać odczyty z xDrip+ w 100% lokalnie i offline, bez połączenia z internetem?" }),
    t('auto.czy_wiesz_ze_pigulka_na_dole', { defaultValue: "Czy wiesz, że Pigułka na dole ekranu zmieni swój kolor i wyświetli alert, gdy do końca ważności sensora lub wkłucia zostanie mniej niż 12 godzin?" }),
    t('auto.czy_wiesz_ze_szybka_korekta', { defaultValue: "Czy wiesz, że klikając kafel Bolusa na pulpicie, możesz jednym dotknięciem przenieść bieżący cukier z sensora do kalkulatora, by szybko wyliczyć dawkę?" }),
    t('auto.czy_wiesz_ze_stoper_prebolus', { defaultValue: "Czy wiesz, że po podaniu bolusa aplikacja automatycznie uruchamia stoper przedposiłkowy (Pre-bolus) z ochroną przed nagłym spadkiem glikemii?" }),
    t('auto.czy_wiesz_ze_detektyw_insuliny', { defaultValue: "Czy wiesz, że w przypadku utrzymującego się wysokiego cukru moduł 'Detektyw insuliny' pomaga sprawdzić, czy lek nie uległ przegrzaniu lub kaniula zagięciu?" }),
    t('auto.czy_wiesz_ze_personalizacja_paska', { defaultValue: "Czy wiesz, że w Profilu możesz dostosować czwarty przycisk dolnego paska nawigacji i przypiąć tam np. Historię, Leki, Osprzęt czy Trening?" })
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

