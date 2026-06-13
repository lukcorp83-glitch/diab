import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, Dumbbell, Bike, Waves, Mountain, Wind, Play, Clock, Info, Footprints, Music, Trophy, Target, History, Calendar } from 'lucide-react';
import { cn, getEffectiveUid } from '../lib/utils';
import { Haptics } from '../lib/haptics';
import { db } from '../lib/firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, deleteDoc, getDocs, where } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface GlikoTrainingProps {
  isOpen?: boolean;
  onClose?: () => void;
  isGlassmorphic?: boolean;
  user?: any;
  settings?: any;
  currentSugar?: number | null;
}

export const SPORTS = [
  {
    id: 'gym',
    name: i18n.t('auto.silownia_trening_silowy', { defaultValue: "Siłownia (Trening Siłowy)" }),
    icon: Dumbbell,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    effect: i18n.t('auto.czesto_podnosi_poziom_cukru', { defaultValue: "Często podnosi poziom cukru" }),
    description: i18n.t('auto.krotki_intensywny_wysilek_uwal', { defaultValue: "Krótki, intensywny wysiłek uwalnia adrenalinę, która stymuluje wątrobę do wyrzutu glukozy. Często powoduje niespodziewane wzrosty glikemii w trakcie i po treningu." }),
    tips: [
      i18n.t('auto.mozesz_potrzebowac_malego_bolu', { defaultValue: "Możesz potrzebować małego bolusa przed siłownią." }),
      i18n.t('auto.uwazaj_na_opoznione_spadki_cuk', { defaultValue: "Uważaj na opóźnione spadki cukru (nawet do 24h po)." }),
      i18n.t('auto.nie_zaczynaj_treningu_z_wysoki', { defaultValue: "Nie zaczynaj treningu z wysokim cukrem (powyżej 250 mg/dL)." })
    ]
  },
  {
    id: 'run',
    name: 'Bieganie / Cardio',
    icon: Wind,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    effect: 'Szybki spadek cukru',
    description: i18n.t('auto.wysilek_tlenowy_aerobowy_gwalt', { defaultValue: "Wysiłek tlenowy (aerobowy) gwałtownie spala glukozę, zwiększając wrażliwość na insulinę. Cukier może spadać w trakcie całego treningu." }),
    tips: [
      i18n.t('auto.zmniejsz_dawke_insuliny_przed', { defaultValue: "Zmniejsz dawkę insuliny przed biegiem." }),
      i18n.t('auto.miej_przy_sobie_szybko_przyswa', { defaultValue: "Miej przy sobie szybko przyswajalne węglowodany (soki, żele)." }),
      'Kontroluj cukier co 20-30 minut w trakcie biegu.'
    ]
  },
  {
    id: 'bike',
    name: 'Jazda na Rowerze',
    icon: Bike,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    effect: 'Umiarkowany spadek',
    description: i18n.t('auto.ciagly_wysilek_aerobowy_obniza', { defaultValue: "Ciągły wysiłek aerobowy obniża poziom glukozy, choć zazwyczaj nieco wolniej niż intensywne bieganie. Oczywiście zależy od intensywności (np. interwały mogą działać jak siłownia)." }),
    tips: [
      i18n.t('auto.jedz_male_porcje_weglowodanow', { defaultValue: "Jedz małe porcje węglowodanów w trakcie jazdy (węglowodany złożone)." }),
      i18n.t('auto.zmniejsz_baze_o_30_50_min_1_5h', { defaultValue: "Zmniejsz bazę o 30-50% min. 1,5h przed wyjazdem." }),
    ]
  },
  {
    id: 'swim',
    name: i18n.t('auto.plywanie', { defaultValue: "Pływanie" }),
    icon: Waves,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    effect: 'Szybki spadek cukru',
    description: i18n.t('auto.jeden_z_trudniejszych_do_kontr', { defaultValue: "Jeden z trudniejszych do kontroli sportów. Zimna woda, opór i angażowanie wszystkich partii ciała powodują szybkie spalanie energii." }),
    tips: [
      i18n.t('auto.sprawdzaj_cukier_przed_wejscie', { defaultValue: "Sprawdzaj cukier przed wejściem i zaraz po wejściu z wody." }),
      i18n.t('auto.bezpieczny_poziom_do_rozpoczec', { defaultValue: "Bezpieczny poziom do rozpoczęcia to często pow. 150 mg/dL." }),
      i18n.t('auto.sensory_i_pompy_moga_tracic_za', { defaultValue: "Sensory i pompy mogą tracić zasięg lub odklejać się pod wodą." })
    ]
  },
  {
    id: 'mountain',
    name: i18n.t('auto.spacer_po_gorach', { defaultValue: "Spacer po górach" }),
    icon: Mountain,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    effect: i18n.t('auto.dlugotrwaly_spadek', { defaultValue: "Długotrwały spadek" }),
    description: i18n.t('auto.wysilek_o_niskiej_do_sredniej', { defaultValue: "Wysiłek o niskiej do średniej intensywności rozłożony na wiele godzin. Prowadzi do wyczerpania zapasów glikogenu wegetatywnego i nocnych spadków cukru." }),
    tips: [
      i18n.t('auto.zmniejsz_baze_na_czas_wedrowki', { defaultValue: "Zmniejsz bazę na czas wędrówki (niektórzy zmniejszają o >50%)." }),
      i18n.t('auto.podjadaj_regularnie_weglowodan', { defaultValue: "Podjadaj regularnie węglowodany złożone (np. batony owsiane)." }),
      i18n.t('auto.zabezpiecz_insuline_przed_skra', { defaultValue: "Zabezpiecz insulinę przed skrajnymi temperaturami." })
    ]
  },
  {
    id: 'football',
    name: i18n.t('auto.pilka_nozna', { defaultValue: "Piłka Nożna" }),
    icon: Trophy,
    color: 'text-green-600',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    effect: 'Mieszany (spadek/wzrost)',
    description: i18n.t('auto.wysilek_interwalowy_sprinty_mo', { defaultValue: "Wysiłek interwałowy. Sprinty mogą powodować wyrzuty adrenaliny (wzrosty), ale ogólny bilans często prowadzi do spadku cukru po meczu." }),
    tips: [
      'Kontroluj cukier w przerwie meczu.',
      i18n.t('auto.miej_zel_pod_reka_przy_linii_b', { defaultValue: "Miej żel pod ręką przy linii bocznej." }),
      i18n.t('auto.uwazaj_na_hipoglikemie_po_zako', { defaultValue: "Uważaj na hipoglikemię po zakończonym wysiłku." })
    ]
  },
  {
    id: 'basketball',
    name: i18n.t('auto.koszykowka', { defaultValue: "Koszykówka" }),
    icon: Target,
    color: 'text-orange-600',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    effect: i18n.t('auto.wysoka_intensywnosc', { defaultValue: "Wysoka intensywność" }),
    description: i18n.t('auto.dynamiczny_sport_z_duza_ilosci', { defaultValue: "Dynamiczny sport z dużą ilością skoków i sprintów. Bardzo szybko zużywa zapasy energii." }),
    tips: [
      i18n.t('auto.zredukuj_bolus_do_posilku_prze', { defaultValue: "Zredukuj bolus do posiłku przed meczem." }),
      i18n.t('auto.uzupelniaj_plyny_i_elektrolity', { defaultValue: "Uzupełniaj płyny i elektrolity." }),
    ]
  },
  {
    id: 'tennis',
    name: 'Tenis',
    icon: Activity,
    color: 'text-lime-500',
    bg: 'bg-lime-500/10',
    border: 'border-lime-500/20',
    effect: i18n.t('auto.dlugotrwaly_wysilek', { defaultValue: "Długotrwały wysiłek" }),
    description: i18n.t('auto.mecz_moze_trwac_od_godziny_do', { defaultValue: "Mecz może trwać od godziny do trzech. Wymaga stałego dopływu energii i skupienia." }),
    tips: [
      i18n.t('auto.podjadaj_male_porcje_w_trakcie', { defaultValue: "Podjadaj małe porcje w trakcie przerw między gemami." }),
      i18n.t('auto.emocje_stres_meczowy_moga_podn', { defaultValue: "Emocje (stres meczowy) mogą podnosić cukier." })
    ]
  },
  {
    id: 'yoga',
    name: 'Joga / Pilates',
    icon: Activity,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    effect: 'Stabilizacja / Lekki spadek',
    description: i18n.t('auto.wysilek_statyczny_skupiony_na', { defaultValue: "Wysiłek statyczny, skupiony na oddechu i rozciąganiu. Zazwyczaj działa stabilizująco na poziom cukru." }),
    tips: [
      'Idealny sport przy lekkich wahaniach glikemii.',
      i18n.t('auto.pamietaj_ze_niektore_pozycje_n', { defaultValue: "Pamiętaj, że niektóre pozycje (np. odwrócone) wymagają stabilnego cukru." })
    ]
  },
  {
    id: 'walk',
    name: 'Spacer / Marsz',
    icon: Footprints,
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    effect: 'Delikatny spadek',
    description: i18n.t('auto.najbezpieczniejsza_forma_ruchu', { defaultValue: "Najbezpieczniejsza forma ruchu. Pomaga obniżyć cukier po posiłku bez ryzyka gwałtownej hipoglikemii." }),
    tips: [
      i18n.t('auto.swietny_sposob_na_zbicie_wysok', { defaultValue: "Świetny sposób na zbicie \"wysokiego\" po kolacji." }),
      i18n.t('auto.wystarczy_15_20_minut_by_zauwa', { defaultValue: "Wystarczy 15-20 minut, by zauważyć różnicę." })
    ]
  },
  {
    id: 'dance',
    name: 'Taniec',
    icon: Music,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    effect: 'Spalanie cardio',
    description: i18n.t('auto.pol_godziny_intensywnego_tanca', { defaultValue: "Pół godziny intensywnego tańca to duży wysiłek energetyczny." }),
    tips: [
      i18n.t('auto.baw_sie_dobrze_ale_zerkaj_na_s', { defaultValue: "Baw się dobrze, ale zerkaj na sensor!" }),
      i18n.t('auto.alkohol_przy_tancu_np_na_impre', { defaultValue: "Alkohol przy tańcu (np. na imprezie) drastycznie zwiększa ryzyko hipo." })
    ]
  }
];

const TrainingChart = ({ user, startTime, endTime, startSugar, endSugar }: { user: any, startTime: number, endTime?: number, startSugar?: number, endSugar?: number }) => {
    const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const logsRef = collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs');
      const q = query(
        logsRef, 
        where('type', '==', 'glucose'),
        where('timestamp', '>=', startTime - (15 * 60 * 1000)), // 15 mins before
        where('timestamp', '<=', (endTime || Date.now()) + (15 * 60 * 1000)), // 15 mins after
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      const points = snapshot.docs.map(doc => ({
        time: new Date(doc.data().timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        value: doc.data().value
      }));
      
      setData(points);
      setIsLoading(false);
    };

    fetchData();
  }, [user, startTime, endTime]);

  if (isLoading) return <div className="h-20 flex items-center justify-center opacity-30"><Activity className="animate-pulse" size={16} /></div>;
  if (data.length < 2) return null;

  const isRising = endSugar && startSugar ? endSugar > startSugar : false;
  const isFalling = endSugar && startSugar ? endSugar < startSugar : false;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('auto.przebieg_glikemii', { defaultValue: 'Przebieg Glikemii' })}</span>
        <div className="flex items-center gap-1">
          {isRising && <TrendingUp size={12} className="text-rose-500" />}
          {isFalling && <TrendingDown size={12} className="text-emerald-500" />}
          {!isRising && !isFalling && <Minus size={12} className="text-slate-400" />}
          <span className={cn("text-[10px] font-bold", isRising ? "text-rose-500" : isFalling ? "text-emerald-500" : "text-slate-400")}>
            {endSugar && startSugar ? `${(endSugar - startSugar) > 0 ? '+' : ''}${Math.round(endSugar - startSugar)} mg/dL` : '---'}
          </span>
        </div>
      </div>
      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={isFalling ? "#10b981" : isRising ? "#f43f5e" : "#6366f1"} 
              strokeWidth={3} 
              dot={false}
              animationDuration={1000}
            />
            <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
            <XAxis dataKey="time" hide />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
              labelStyle={{ display: 'none' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function GlikoTraining({ isOpen, onClose, isGlassmorphic, user, settings, currentSugar }: GlikoTrainingProps) {
    const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'log' | 'info' | 'history'>('log');
  const [selectedSportInfo, setSelectedSportInfo] = useState<string | null>(null);
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);

  const [selectedSportLog, setSelectedSportLog] = useState<string>(SPORTS[0].id);
  const [duration, setDuration] = useState('30');
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium');

  const activeTraining = settings?.activeTraining;

  useEffect(() => {
    if (isOpen && user && activeTab === 'history') {
      const historyRef = collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'trainings');
      const q = query(historyRef, orderBy('timestamp', 'desc'), limit(20));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTrainingHistory(docs);
      });
      return () => unsubscribe();
    }
  }, [isOpen, user, activeTab]);

  const getTrainingAdvice = () => {
    if (!currentSugar) return null;
    const sport = SPORTS.find(s => s.id === selectedSportLog);
    if (!sport) return null;

    const isAerobic = ['run', 'bike', 'swim', 'mountain', 'walk', 'dance', 'football', 'basketball', 'tennis'].includes(selectedSportLog);

    if (currentSugar < 100) {
      return {
        text: i18n.t('auto.cukier_jest_niski_zjedz_15_20g', { defaultValue: "Cukier jest niski. Zjedz 15-20g węglowodanów prostych przed startem!" }),
        type: 'warning'
      };
    }

    if (isAerobic) {
      if (currentSugar > 250) return { text: i18n.t('auto.wysoki_cukier_sprawdz_ketony_p', { defaultValue: "Wysoki cukier. Sprawdź ketony przed intensywnym cardio!" }), type: 'danger' };
      if (currentSugar < 130) return { text: i18n.t('auto.dobry_moment_na_start_ale_miej', { defaultValue: "Dobry moment na start, ale miej pod ręką żel lub sok." }), type: 'info' };
    } else {
      // Strength/Gym
      if (currentSugar > 230) return { text: i18n.t('auto.wysoka_glikemia_trening_silowy', { defaultValue: "Wysoka glikemia. Trening siłowy może ją chwilowo podnieść przez adrenalinę." }), type: 'warning' };
      if (currentSugar >= 100 && currentSugar <= 180) return { text: i18n.t('auto.idealny_poziom_na_trening_silo', { defaultValue: "Idealny poziom na trening siłowy." }), type: 'success' };
    }

    return { text: i18n.t('auto.glikemia_stabilna_pamietaj_o_m', { defaultValue: "Glikemia stabilna. Pamiętaj o monitorowaniu w trakcie wysiłku." }), type: 'info' };
  };

  const handleStartTraining = async () => {
    if (!user) return;
    Haptics.success();
    const settingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile');
    
    const trainingData = {
      sportId: selectedSportLog,
      startTime: Date.now(),
      duration: parseInt(duration),
      intensity,
      startSugar: currentSugar
    };

    // 1. Dodaj do historii treningów jako rekord "w trakcie"
    const historyRef = collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'trainings');
    const docRef = await addDoc(historyRef, {
      ...trainingData,
      timestamp: serverTimestamp(),
      isCompleted: false
    });

    // 2. Zapisz jako aktywny trening (do widoku na pulpicie)
    await setDoc(settingsRef, {
      ...settings,
      activeTraining: {
        ...trainingData,
        trainingId: docRef.id
      }
    });

    // 3. Dodaj wpis do głównej historii (logs) aby był widoczny na osi czasu
    const logsRef = collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs');
    const sportName = SPORTS.find(s => s.id === selectedSportLog)?.name || 'Trening';
    await addDoc(logsRef, {
      type: 'activity',
      value: parseInt(duration),
      timestamp: Date.now(),
      notes: `Start treningu: ${sportName} (Intensywność: ${intensity === 'low' ? 'Lekka' : intensity === 'medium' ? i18n.t('auto.srednia', { defaultValue: "Średnia" }) : 'Wysoka'}). Cukier: ${currentSugar || '---'} mg/dL`,
      sportId: selectedSportLog,
      intensity: intensity
    });

    if (onClose) onClose();
  };

  const handleEndTraining = async () => {
    if (!user || !activeTraining) return;
    Haptics.success();
    
    // Zaktualizuj rekord w historii
    if (activeTraining.trainingId) {
      const trainingRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'trainings', activeTraining.trainingId);
      await setDoc(trainingRef, {
        endTime: Date.now(),
        endSugar: currentSugar,
        isCompleted: true
      }, { merge: true });
    }

    const settingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile');
    await setDoc(settingsRef, {
      ...settings,
      activeTraining: null
    });
  };

  const handleDeleteTraining = async (trainingId: string) => {
    if (!user) return;
    Haptics.warning();
    try {
      const trainingRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'trainings', trainingId);
      await deleteDoc(trainingRef);
    } catch (error) {
      console.error("Error deleting training:", error);
    }
  };

  if (isOpen === false) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="pb-20 space-y-4"
    >
      <div className="flex items-center justify-between mb-2 mt-2 px-2">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
             <Activity className="text-emerald-500" size={24} />  {t('auto.glikotrening', { defaultValue: 'GlikoTrening' })}
                                </h2>
          <p className="text-sm font-medium text-slate-500">{t('auto.zarządzaj_aktywnością', { defaultValue: 'Zarządzaj aktywnością' })}</p>
        </div>
        {onClose && (
          <button
            onClick={() => {
              Haptics.light();
              onClose();
            }}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl mx-2 shadow-inner">
        <button
          onClick={() => { Haptics.selection(); setActiveTab('log'); }}
          className={cn("flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2", activeTab === 'log' ? "bg-white dark:bg-slate-700 shadow-sm text-emerald-500" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
        >
          <Play size={14} />  {t('auto.rejestruj', { defaultValue: 'Rejestruj' })}
                          </button>
        <button
          onClick={() => { Haptics.selection(); setActiveTab('info'); }}
          className={cn("flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2", activeTab === 'info' ? "bg-white dark:bg-slate-700 shadow-sm text-emerald-500" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
        >
          <Info size={14} />  {t('auto.wiedza', { defaultValue: 'Wiedza' })}
                          </button>
        <button
          onClick={() => { Haptics.selection(); setActiveTab('history'); }}
          className={cn("flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2", activeTab === 'history' ? "bg-white dark:bg-slate-700 shadow-sm text-emerald-500" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
        >
          <History size={14} />  {t('auto.historia', { defaultValue: 'Historia' })}
                          </button>
      </div>

      <div className="px-2">
        <AnimatePresence mode="wait">
          {activeTab === 'log' && (
            <motion.div
              key="log"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {activeTraining ? (
                <div className="glass p-6 rounded-[2.5rem] border border-emerald-500/30 bg-emerald-500/5 space-y-6 text-center">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/40 relative">
                    <Activity className="text-white animate-pulse" size={40} />
                    <div className="absolute inset-0 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{t('auto.trwa_trening', { defaultValue: 'Trwa Trening' })}</h3>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {SPORTS.find(s => s.id === activeTraining.sportId)?.name || i18n.t('auto.aktywnosc', { defaultValue: "Aktywność" })}
                    </p>
                  </div>
                  <div className="flex justify-center items-center gap-6 text-slate-500 dark:text-slate-400">
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('auto.czas', { defaultValue: 'Czas' })}</span>
                        <span className="text-lg font-black text-slate-700 dark:text-slate-200">{activeTraining.duration}m</span>
                     </div>
                     <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('auto.intensywność', { defaultValue: 'Intensywność' })}</span>
                        <span className="text-lg font-black text-slate-700 dark:text-slate-200 capitalize">
                          {activeTraining.intensity === 'low' ? 'Lekka' : activeTraining.intensity === 'medium' ? i18n.t('auto.srednia', { defaultValue: "Średnia" }) : 'Wysoka'}
                        </span>
                     </div>
                  </div>
                  <button
                    onClick={handleEndTraining}
                    className="w-full bg-rose-500 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-sm shadow-xl shadow-rose-500/20 active:scale-95 transition-transform"
                  >
                    
                                                          {t('auto.zakończ_trening', { defaultValue: 'Zakończ trening' })}
                                                        </button>
                </div>
              ) : (
                <>
                  <div className="glass p-5 rounded-[2.5rem] border border-white/20 dark:border-white/5 space-y-4">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{t('auto.wybierz_dyscyplinę', { defaultValue: 'Wybierz dyscyplinę' })}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {SPORTS.map(sport => {
                        const Icon = sport.icon;
                        const isSelected = selectedSportLog === sport.id;
                        return (
                          <button
                            key={sport.id}
                            onClick={() => {
                              Haptics.light();
                              setSelectedSportLog(sport.id);
                            }}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all",
                              isSelected 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                                : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                            )}
                          >
                             <Icon size={20} className={isSelected ? "text-emerald-500" : "text-slate-400"} />
                             <span className="text-xs font-bold leading-tight">{sport.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="glass p-5 rounded-[2.5rem] border border-white/20 dark:border-white/5 space-y-4">
                     <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <Clock size={16} className="text-slate-400" />  {t('auto.czas_trwania', { defaultValue: 'Czas trwania' })}
                                                                   </h3>
                     <div className="flex items-center gap-3">
                        {['15', '30', '45', '60'].map(mins => (
                          <button
                            key={mins}
                            onClick={() => { Haptics.light(); setDuration(mins); }}
                            className={cn(
                              "flex-1 py-3 rounded-2xl border text-center transition-all font-bold text-sm",
                              duration === mins 
                                ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" 
                                : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                            )}
                          >
                             {mins}m
                          </button>
                        ))}
                     </div>
                     <div className="pt-2">
                       <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mb-3">{t('auto.intensywność', { defaultValue: 'Intensywność' })}</h3>
                       <div className="flex gap-2">
                         <button
                           onClick={() => { Haptics.light(); setIntensity('low'); }}
                           className={cn("flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border", intensity === 'low' ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400" : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-500")}
                         >{t('auto.lekka', { defaultValue: 'Lekka' })}</button>
                         <button
                           onClick={() => { Haptics.light(); setIntensity('medium'); }}
                           className={cn("flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border", intensity === 'medium' ? "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400" : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-500")}
                         >{t('auto.umiarkowana', { defaultValue: 'Umiarkowana' })}</button>
                         <button
                           onClick={() => { Haptics.light(); setIntensity('high'); }}
                           className={cn("flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border", intensity === 'high' ? "bg-rose-100 border-rose-300 text-rose-700 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-400" : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-500")}
                         >{t('auto.wysoka', { defaultValue: 'Wysoka' })}</button>
                       </div>
                     </div>
                  </div>

                  {getTrainingAdvice() && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "p-4 rounded-2xl border text-xs font-bold leading-relaxed flex items-start gap-3",
                        getTrainingAdvice()?.type === 'warning' ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400" :
                        getTrainingAdvice()?.type === 'danger' ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400" :
                        getTrainingAdvice()?.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" :
                        "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400"
                      )}
                    >
                      <Info size={16} className="shrink-0 mt-0.5" />
                      <span>{getTrainingAdvice()?.text}</span>
                    </motion.div>
                  )}

                  <button
                    onClick={handleStartTraining}
                    className="w-full bg-emerald-500 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    <Play size={18} fill="currentColor" />  {t('auto.rozpocznij_trening', { defaultValue: 'Rozpocznij trening' })}
                                                            </button>
                </>
              )}

            </motion.div>
          )}
          
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 pb-12"
            >
              {trainingHistory.length === 0 ? (
                <div className="text-center py-12 opacity-50 space-y-4">
                   <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                      <History size={32} />
                   </div>
                   <p className="text-sm font-bold uppercase tracking-tight">{t('auto.brak_zapisanych_treningów', { defaultValue: 'Brak zapisanych treningów' })}</p>
                </div>
              ) : (
                trainingHistory.map((t) => {
                  const sport = SPORTS.find(s => s.id === t.sportId);
                  const Icon = sport?.icon || Activity;
                  return (
                    <motion.div 
                      layout
                      key={t.id} 
                      className="glass p-4 rounded-3xl border border-white/20 dark:border-white/5 relative overflow-hidden"
                    >
                       <div className="flex items-center gap-4">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", sport?.bg || "bg-slate-100")}>
                             <Icon className={sport?.color || "text-slate-500"} size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2">
                               <h4 className="font-black text-sm text-slate-800 dark:text-white truncate uppercase tracking-tight">
                                 {sport?.name || 'Trening'}
                               </h4>
                               {!t.isCompleted && (
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                               )}
                             </div>
                             <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                                <span className="flex items-center gap-1"><Clock size={10} /> {t.duration}  {t('auto.min', { defaultValue: 'min' })}</span>
                                <span className="flex items-center gap-1 uppercase tracking-tighter">
                                  {t.intensity === 'low' ? 'Lekka' : t.intensity === 'medium' ? i18n.t('auto.srednia', { defaultValue: "Średnia" }) : 'Wysoka'}
                                </span>
                             </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                             <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => handleDeleteTraining(t.id)}
                                 className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </div>
                             <div className="text-[9px] font-bold text-slate-400 capitalize">
                               {t.timestamp?.toDate ? new Date(t.timestamp.toDate()).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) : '---'}
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-2 mt-4">
                          <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-2xl">
                             <div className="text-[8px] font-black uppercase text-slate-400 mb-0.5">{t('auto.start', { defaultValue: 'Start' })}</div>
                             <div className="text-xs font-black text-slate-700 dark:text-slate-200">{t.startSugar || '---'} <span className="text-[9px] opacity-60">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span></div>
                          </div>
                          <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-2xl">
                             <div className="text-[8px] font-black uppercase text-slate-400 mb-0.5">{t('auto.koniec', { defaultValue: 'Koniec' })}</div>
                             <div className="text-xs font-black text-slate-700 dark:text-slate-200">{t.endSugar || '---'} <span className="text-[9px] opacity-60">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span></div>
                          </div>
                       </div>

                       <TrainingChart 
                         user={user} 
                         startTime={t.startTime} 
                         endTime={t.endTime} 
                         startSugar={t.startSugar} 
                         endSugar={t.endSugar} 
                       />
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {selectedSportInfo ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <button 
                  onClick={() => {
                    Haptics.light();
                    setSelectedSportInfo(null);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                  
                                                        {t('auto.larr_wróć_do_listy', { defaultValue: '&larr; Wróć do listy' })}
                                                      </button>

                {(() => {
                  const sport = SPORTS.find(s => s.id === selectedSportInfo);
                  if (!sport) return null;
                  const Icon = sport.icon;
                  
                  return (
                    <div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className={cn("p-4 rounded-3xl border drop-shadow-md", sport.bg, sport.color, sport.border, isGlassmorphic ? "backdrop-blur-md" : "")}>
                          <Icon size={32} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{sport.name}</h3>
                          <span className={cn("text-sm font-bold mt-1 block", sport.color)}>{sport.effect}</span>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className={cn("p-5 rounded-3xl", isGlassmorphic ? "bg-white/40 dark:bg-white/5" : "bg-slate-50 dark:bg-slate-800/50")}>
                          <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-wider">{t('auto.mechanizm_działania', { defaultValue: 'Mechanizm Działania' })}</h4>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                            {sport.description}
                          </p>
                        </div>

                        <div className={cn("p-5 rounded-3xl border", sport.bg, sport.border)}>
                          <h4 className={cn("text-[10px] font-black uppercase mb-3 tracking-wider", sport.color)}>{t('auto.praktyczne_wskazówki', { defaultValue: 'Praktyczne Wskazówki' })}</h4>
                          <ul className="space-y-3">
                            {sport.tips.map((tip, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm", sport.color, isGlassmorphic ? "bg-white/50 dark:bg-black/20" : "bg-white dark:bg-slate-800")}>
                                  <span className="text-[10px] font-bold">{idx + 1}</span>
                                </div>
                                <span className={cn("text-sm font-semibold", sport.color)}>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <div className="col-span-full mb-2">
                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                     
                                                                   {t('auto.rozmaite_wysiłki_fizyczne_mają_różn', { defaultValue: 'Rozmaite wysiłki fizyczne mają różny wpływ na poziom glukozy. Wybierz dyscyplinę, aby dowiedzieć się na co uważać.' })}
                                                                 </p>
                </div>
                
                {SPORTS.map(sport => {
                  const Icon = sport.icon;
                  return (
                    <div 
                      key={sport.id}
                      onClick={() => {
                        Haptics.light();
                        setSelectedSportInfo(sport.id);
                      }}
                      className={cn(
                        "p-4 rounded-3xl border cursor-pointer group transition-all duration-300 hover:scale-[1.02]",
                        isGlassmorphic ? "bg-white/40 dark:bg-white/5 border-white/20 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2.5 rounded-2xl transition-colors drop-shadow-sm", sport.bg, sport.color, "group-hover:bg-opacity-20", isGlassmorphic ? "backdrop-blur-sm" : "")}>
                          <Icon size={22} />
                        </div>
                        <div className="flex-1 mt-0.5">
                          <h3 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">{sport.name}</h3>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mt-1 line-clamp-1">{sport.effect}</p>
                        </div>
                        <div className="mt-2 text-slate-300 dark:text-slate-600 transition-transform group-hover:translate-x-1">
                          
                                                            {t('auto.rarr', { defaultValue: '&rarr;' })}
                                                          </div>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}
