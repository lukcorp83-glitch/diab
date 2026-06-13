import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Check, X, Trophy, Coins, Sparkles, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

const QUIZ_POOL = [
  {
    question: i18n.t('auto.co_gliko_powinien_zrobic_przy', { defaultValue: "Co Gliko powinien zrobić przy niskim cukru (hipoglikemii)?" }),
    options: [
      i18n.t('auto.podac_insuline', { defaultValue: "Podać insulinę" }),
      i18n.t('auto.wypic_soczek_lub_zjesc_pastylk', { defaultValue: "Wypić soczek lub zjeść pastylkę z glukozą" }),
      i18n.t('auto.isc_pograc_w_pilke', { defaultValue: "Iść pograć w piłkę" }),
      i18n.t('auto.polozyc_sie_spac_bez_jedzenia', { defaultValue: "Położyć się spać bez jedzenia" })
    ],
    correct: 1,
    explanation: i18n.t('auto.brawo_soczek_szybko_podniesie', { defaultValue: "Brawo! Soczek szybko podniesie cukier i Gliko poczuje się lepiej." })
  },
  {
    question: i18n.t('auto.gdzie_najczesciej_gliko_dostaj', { defaultValue: "Gdzie najczęściej Gliko dostaje swój bolus do posiłku?" }),
    options: [
      "W czubek nosa",
      "W ucho",
      i18n.t('auto.w_brzuszek_udo_lub_ramie', { defaultValue: "W brzuszek, udo lub ramię" }),
      "W buta"
    ],
    correct: 2,
    explanation: i18n.t('auto.dokladnie_to_najlepsze_miejsca', { defaultValue: "Dokładnie! To najlepsze miejsca, żeby insulina zaczęła działać." })
  },
  {
    question: i18n.t('auto.co_to_jest_ww_wymiennik_weglow', { defaultValue: "Co to jest WW (Wymiennik Węglowodanowy)?" }),
    options: [
      i18n.t('auto.wesoly_wieloryb', { defaultValue: "Wesoły Wieloryb" }),
      i18n.t('auto.miara_weglowodanow_w_jedzeniu', { defaultValue: "Miara węglowodanów w jedzeniu" }),
      "Wielkie Wyzwanie",
      i18n.t('auto.woda_wyscigowa', { defaultValue: "Woda Wyścigowa" })
    ],
    correct: 1,
    explanation: i18n.t('auto.tak_ww_pomaga_nam_obliczyc_ile', { defaultValue: "Tak! WW pomaga nam obliczyć, ile insuliny potrzebujemy do jedzenia." })
  },
  {
    question: i18n.t('auto.czy_przed_bieganiem_lub_zabawa', { defaultValue: "Czy przed bieganiem lub zabawą na podwórku warto sprawdzić cukier?" }),
    options: [
      i18n.t('auto.nie_po_co_tracic_czas_na_zabaw', { defaultValue: "Nie, po co tracić czas na zabawę" }),
      i18n.t('auto.tak_zeby_gliko_nie_mial_za_nis', { defaultValue: "Tak, żeby Gliko nie miał za niskiego cukru" }),
      i18n.t('auto.tylko_jesli_pada_deszcz', { defaultValue: "Tylko jeśli pada deszcz" }),
      i18n.t('auto.tylko_jesli_gliko_jest_glodny', { defaultValue: "Tylko jeśli Gliko jest głodny" })
    ],
    correct: 1,
    explanation: i18n.t('auto.super_sport_obniza_cukier_wiec', { defaultValue: "Super! Sport obniża cukier, więc dobrze wiedzieć, od jakiego poziomu zaczynamy." })
  },
  {
    question: i18n.t('auto.jaki_napoj_jest_najlepszy_dla', { defaultValue: "Jaki napój jest najlepszy dla Gliko, gdy ma wysoki cukier?" }),
    options: [
      i18n.t('auto.slodka_oranzada', { defaultValue: "Słodka oranżada" }),
      "Woda",
      "Sok owocowy",
      i18n.t('auto.gesty_koktajl', { defaultValue: "Gęsty koktajl" })
    ],
    correct: 1,
    explanation: i18n.t('auto.woda_to_super_paliwo_pomaga_wy', { defaultValue: "Woda to super-paliwo! Pomaga wypłukać nadmiar cukru z organizmu." })
  },
  {
    question: i18n.t('auto.co_robimy_gdy_zapomnimy_podac', { defaultValue: "Co robimy, gdy zapomnimy podać bolus do obiadu?" }),
    options: [
      i18n.t('auto.placzemy_i_nic_nie_robimy', { defaultValue: "Płaczemy i nic nie robimy" }),
      i18n.t('auto.mowimy_od_razu_rodzicom_lub_op', { defaultValue: "Mówimy od razu rodzicom lub opiekunowi" }),
      i18n.t('auto.zjadamy_jeszcze_wiecej', { defaultValue: "Zjadamy jeszcze więcej" }),
      i18n.t('auto.chowamy_sie_pod_lozko', { defaultValue: "Chowamy się pod łóżko" })
    ],
    correct: 1,
    explanation: i18n.t('auto.zawsze_powiedz_doroslym_oni_po', { defaultValue: "Zawsze powiedz dorosłym! Oni pomogą Gliko naprawić tę sytuację." })
  },
  {
    question: i18n.t('auto.co_gliko_powinien_miec_zawsze', { defaultValue: "Co Gliko powinien mieć zawsze przy sobie na wypadek niskiego cukru?" }),
    options: [
      "Pluszowego misia",
      "Zapasowe skarpetki",
      i18n.t('auto.cos_slodkiego_np_soczek_lub_gl', { defaultValue: "Coś słodkiego (np. soczek lub glukozę)" }),
      "Kredki"
    ],
    called: 1,
    correct: 2,
    explanation: i18n.t('auto.zawsze_warto_miec_ratunkowy_so', { defaultValue: "Zawsze warto mieć 'ratunkowy soczek' pod ręką!" })
  },
  {
    question: i18n.t('auto.jak_gliko_moze_sie_czuc_gdy_ma', { defaultValue: "Jak Gliko może się czuć, gdy ma niski cukier?" }),
    options: [
      i18n.t('auto.moze_mu_sie_krecic_w_glowie_i', { defaultValue: "Może mu się kręcić w głowie i trząść rączki" }),
      i18n.t('auto.moze_miec_ochote_na_sprzatanie', { defaultValue: "Może mieć ochotę na sprzątanie pokoju" }),
      i18n.t('auto.moze_nagle_urosnac', { defaultValue: "Może nagle urosnąć" }),
      i18n.t('auto.moze_zaczac_szczekac', { defaultValue: "Może zacząć szczekać" })
    ],
    correct: 0,
    explanation: i18n.t('auto.tak_drzenie_raczek_lub_slabosc', { defaultValue: "Tak, drżenie rączek lub słabość to sygnały, że cukier jest za niski." })
  },
  {
    question: i18n.t('auto.dlaczego_myjemy_rece_przed_bad', { defaultValue: "Dlaczego myjemy ręce przed badaniem cukru?" }),
    options: [
      i18n.t('auto.zeby_glukometr_byl_lsni_cy', { defaultValue: "Żeby glukometr był lśnišcy" }),
      i18n.t('auto.zeby_resztki_dzemu_na_palcu_ni', { defaultValue: "Żeby resztki dżemu na palcu nie oszukały wyniku" }),
      i18n.t('auto.zeby_bylo_zimniej', { defaultValue: "Żeby było zimniej" }),
      "Bo Gliko nie lubi brudu"
    ],
    correct: 1,
    explanation: i18n.t('auto.prawda_brudne_raczki_moga_poka', { defaultValue: "Prawda! Brudne rączki mogą pokazać wyższy cukier niż jest naprawdę." })
  },
  {
    question: "Co to jest glukometr?",
    options: [
      "Maszyna do robienia waty cukrowej",
      i18n.t('auto.urzadzenie_do_sprawdzania_pozi', { defaultValue: "Urządzenie do sprawdzania poziomu cukru" }),
      i18n.t('auto.maly_telewizor', { defaultValue: "Mały telewizor" }),
      i18n.t('auto.licznik_krokow_gliko', { defaultValue: "Licznik kroków Gliko" })
    ],
    correct: 1,
    explanation: "Glukometr to nasz najlepszy doradca!"
  }
];

export default function GlikoQuiz({ onComplete }: { onComplete: (rewardCoins: number, rewardXp: number) => void }) {
    const { t } = useTranslation();
  // Select 5 random questions for this session
  const sessionQuestions = useMemo(() => {
    return [...QUIZ_POOL].sort(() => 0.5 - Math.random()).slice(0, 5);
  }, []);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  const quiz = sessionQuestions[currentIdx];

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === quiz.correct;
    setIsCorrect(correct);
    if (correct) setScore(prev => prev + 1);
  };

  const next = () => {
    if (currentIdx < sessionQuestions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelected(null);
      setIsCorrect(null);
    } else {
      setFinished(true);
    }
  };

  const handleFinish = () => {
    // Reward based on performance
    const bonusCoins = score * 10;
    onComplete(50 + bonusCoins, 100);
  };

  if (finished) {
    return (
      <div className="text-center py-8 px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          <Trophy className="w-20 h-20 text-amber-500 mx-auto mb-4" />
        </motion.div>
        <h3 className="text-2xl font-black mb-2 dark:text-white">{t('auto.wspaniale', { defaultValue: 'Wspaniale!' })}</h3>
        <p className="text-slate-500 text-sm mb-2">{t('auto.ukończyłeś_quiz_edukacyjny_gliko', { defaultValue: 'Ukończyłeś quiz edukacyjny Gliko.' })}</p>
        <p className="text-accent-500 font-black text-lg mb-6">{t('auto.twój_wynik', { defaultValue: 'Twój wynik:' })} {score}/{sessionQuestions.length}</p>
        
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-slate-800 glass-target">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('auto.twoje_nagrody', { defaultValue: 'Twoje nagrody:' })}</p>
           <div className="flex justify-center gap-8">
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600 mb-1">
                  <Coins size={24} />
                </div>
                <span className="text-lg font-black text-amber-600">+{50 + score * 10}</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">{t('auto.monety', { defaultValue: 'Monety' })}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 bg-accent-100 dark:bg-accent-500/10 rounded-full flex items-center justify-center text-accent-600 mb-1">
                  <Sparkles size={24} />
                </div>
                <span className="text-lg font-black text-accent-600">+100</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">{t('auto.xp_gliko', { defaultValue: 'XP Gliko' })}</span>
              </div>
           </div>
        </div>

        <button
          onClick={handleFinish}
          className="w-full bg-accent-500 hover:bg-accent-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm shadow-lg shadow-accent-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Check size={20} />  {t('auto.zakończ_i_odbierz_nagrody', { defaultValue: 'Zakończ i odbierz nagrody' })}
                        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 dark:bg-amber-500/10 p-2 rounded-xl text-amber-600">
            <HelpCircle size={20} />
          </div>
          <div>
            <h4 className="font-black text-sm dark:text-white">{t('auto.mądry_gliko', { defaultValue: 'Mądry Gliko' })}</h4>
            <div className="flex gap-1 mt-0.5">
              {[...Array(sessionQuestions.length)].map((_, i) => (
                <div 
                  key={`progress-${i}`} 
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i < currentIdx ? "w-4 bg-emerald-500" :
                    i === currentIdx ? "w-6 bg-accent-500" :
                    "w-2 bg-slate-100 dark:bg-slate-800"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
          <Star size={12} className="text-amber-500 fill-current" />
          <span className="text-[10px] font-black text-amber-600">{score}</span>
        </div>
      </div>

      <div className="min-h-[80px] mb-8">
        <h3 className="text-xl font-black dark:text-white leading-tight">
          {quiz.question}
        </h3>
      </div>

      <div className="space-y-3 mb-8">
        {quiz.options.map((option, idx) => (
          <button
            key={`option-${currentIdx}-${idx}`}
            disabled={selected !== null}
            onClick={() => handleSelect(idx)}
            className={cn(
              "w-full text-left p-5 rounded-2xl border-2 transition-all font-bold text-sm flex items-center justify-between group",
              selected === null ? "border-slate-100 dark:border-slate-800 hover:border-accent-500 hover:bg-accent-50 dark:hover:bg-accent-500/5 dark:text-slate-300" :
              idx === quiz.correct ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" :
              selected === idx ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-600" :
              "border-slate-50 dark:border-slate-900 opacity-40 text-slate-400"
            )}
          >
            <span className="pr-4">{option}</span>
            <div className="shrink-0">
              {selected === null && <div className="w-5 h-5 rounded-full border-2 border-slate-200 group-hover:border-accent-500 transition-colors" />}
              {selected !== null && idx === quiz.correct && <Check size={20} className="text-emerald-500" />}
              {selected === idx && idx !== quiz.correct && <X size={20} className="text-rose-500" />}
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {isCorrect !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-3xl bg-accent-50 dark:bg-accent-500/5 border border-accent-100 dark:border-accent-500/20"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="text-2xl mt-1">{isCorrect ? '🌟' : '💡'}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                <span className="font-black text-accent-500 uppercase tracking-widest block mb-1">{t('auto.gliko_mówi', { defaultValue: 'Gliko mówi:' })}</span>
                {quiz.explanation}
              </p>
            </div>
            <button
              onClick={next}
              className="w-full bg-accent-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all shadow-md shadow-accent-500/20"
            >
              {currentIdx === sessionQuestions.length - 1 ? "Zobacz wynik" : i18n.t('auto.nastepne_pytanie', { defaultValue: "Następne pytanie" })}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

