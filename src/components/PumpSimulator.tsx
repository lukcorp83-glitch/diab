import i18n from '../i18n';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserSettings } from '../types';
import { cn } from '../lib/utils';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList, Area } from 'recharts';
import { useTranslation } from "react-i18next";

interface PumpSimulatorProps {
  settings: UserSettings;
}

function SettingInput({ label, value, onChange, step = "0.01" }: { label: string, value: number, onChange: (v: number) => void, step?: string }) {
  const [localValue, setLocalValue] = useState(Number.isInteger(value) ? value.toString() : Number(value).toFixed(2).replace(/\.00$/, ''));

  React.useEffect(() => {
    if (parseFloat(localValue) !== value && !isNaN(value)) {
      setLocalValue(Number.isInteger(value) ? value.toString() : Number(value).toFixed(2).replace(/\.00$/, ''));
    }
  }, [value]);

  return (
    <div className="flex flex-col gap-1 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 relative shadow-sm glass-target">
      <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</label>
      <input 
        type="number"
        step={step}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) {
            onChange(parsed);
          }
        }}
        onBlur={() => {
          const parsed = parseFloat(localValue);
          if (isNaN(parsed)) {
            setLocalValue(Number.isInteger(value) ? value.toString() : Number(value).toFixed(2).replace(/\.00$/, ''));
          } else {
             setLocalValue(Number.isInteger(parsed) ? parsed.toString() : Number(parsed).toFixed(2).replace(/\.00$/, ''));
          }
        }}
        className="w-full bg-transparent outline-none font-black text-slate-800 dark:text-slate-100 text-lg translate-y-1"
      />
    </div>
  );
}

export default function PumpSimulator({ settings }: PumpSimulatorProps) {
    const { t } = useTranslation();
  const [simCarbs, setSimCarbs] = useState<number>(50);
  const [simFat, setSimFat] = useState<number>(30);
  const [simType, setSimType] = useState<string>('dual');
  const [simSplitNow, setSimSplitNow] = useState<number>(50);
  const [simDuration, setSimDuration] = useState<number>(3);
  const [simResult, setSimResult] = useState<boolean>(false);
  const [simManualDose, setSimManualDose] = useState<string>('');
  const [simStackingEnabled, setSimStackingEnabled] = useState<boolean>(false);
  const [simStackDose, setSimStackDose] = useState<number>(2);
  const [simStackTime, setSimStackTime] = useState<number>(2);
  const [simAutoBasal, setSimAutoBasal] = useState<boolean>(false);
  const [simWorkout, setSimWorkout] = useState<string>('none');
  const [simGi, setSimGi] = useState<string>('medium');
  const [simBg, setSimBg] = useState<number>(100);
  
  const [simulationFrame, setSimulationFrame] = useState(0);

  React.useEffect(() => {
    let interval: any;
    if (simResult) {
      interval = setInterval(() => {
        setSimulationFrame(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [simResult]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="glass p-8 rounded-[3rem] space-y-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('auto.symulator_bolusa', { defaultValue: 'Symulator Bolusa' })}</h3>
        <p className="text-[10px] text-slate-500 leading-relaxed font-medium bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
          
                            {t('auto.symulator_uczy_jak_działa_insulina_', { defaultValue: 'Symulator uczy, jak działa insulina przy różnych posiłkach. Wpisz co jesz, a kalkulator policzy proponowaną dawkę na podstawie Twoich ustawień (przeliczników WW/WBT). Dowiesz się, czy na tłusty obiad (np. schabowy) podać całą insulinę od razu, czy lepiej rozłożyć ją w czasie na kilka godzin, żeby uniknąć skoków i spadków cukru.' })}
                          </p>
        
        <div className="mb-2">
           <SettingInput label={t('auto.glukoza_początkowa_mg_dl', { defaultValue: 'Glukoza początkowa (mg/dL)' })} value={simBg} onChange={(v) => { setSimBg(Number(v)); setSimResult(false); }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
           <SettingInput label={t('auto.węglowodany_g', { defaultValue: 'Węglowodany (g)' })} value={simCarbs} onChange={(v) => setSimCarbs(Number(v))} />
           <SettingInput label={t('auto.wbt_1wbt_100kcal_tłuszczu', { defaultValue: 'WBT (1WBT=100kcal tłuszczu)' })} value={simFat} onChange={(v) => setSimFat(Number(v))} />
        </div>

        <div className="space-y-4 pt-2">
           <div className="space-y-2">
             <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">{t('auto.indeks_glikemiczny_szybkość_wchłani', { defaultValue: 'Indeks Glikemiczny (Szybkość wchłaniania)' })}</label>
             <select 
               className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
               value={simGi}
               onChange={(e) => {
                 setSimGi(e.target.value);
                 setSimResult(false);
               }}
             >
               <option value="high">{t('auto.wysoki_szybkie_np_soki_słodycze', { defaultValue: 'Wysoki (Szybkie np. soki, słodycze)' })}</option>
               <option value="medium">{t('auto.średni_umiarkowane_np_chleb_makaron', { defaultValue: 'Średni (Umiarkowane np. chleb, makaron)' })}</option>
               <option value="low">{t('auto.niski_wolne_np_warzywa_strączkowe', { defaultValue: 'Niski (Wolne np. warzywa, strączkowe)' })}</option>
             </select>
           </div>

           <div className="space-y-2">
             <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">{t('auto.aktywność_fizyczna_wpływ_treningu', { defaultValue: 'Aktywność Fizyczna (Wpływ Treningu)' })}</label>
             <select 
               className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
               value={simWorkout}
               onChange={(e) => {
                 setSimWorkout(e.target.value);
                 setSimResult(false);
               }}
             >
               <option value="none">{t('auto.brak_standardowa_wrażliwość', { defaultValue: 'Brak (Standardowa wrażliwość)' })}</option>
               <option value="light">{t('auto.lekki_wysiłek_spacer_15_bg_wzrost_i', { defaultValue: 'Lekki wysiłek (Spacer, -15 BG / wzrost ISF)' })}</option>
               <option value="intense">{t('auto.mocny_trening_bieganie_30_bg_max_is', { defaultValue: 'Mocny trening (Bieganie, -30 BG / max ISF)' })}</option>
             </select>
           </div>

           <div className="flex items-center gap-2 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl bg-teal-50 dark:bg-teal-900/10">
              <input 
                type="checkbox" 
                id="autoBasalCheck"
                checked={simAutoBasal} 
                onChange={e => {
                  setSimAutoBasal(e.target.checked);
                  setSimResult(false);
                }} 
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500" 
              />
              <div>
                 <label htmlFor="autoBasalCheck" className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('auto.włącz_algorytm_hybrydowy_auto_baza', { defaultValue: 'Włącz Algorytm Hybrydowy (Auto Baza)' })}</label>
                 <p className="text-[9px] text-slate-400 leading-tight">{t('auto.symuluje_pompę_np_780g_control_iq_k', { defaultValue: 'Symuluje pompę (np. 780G, Control-IQ), która reaguje na spadki i wzrosty automatycznymi korektami (mikrobolusy i zawieszenia).' })}</p>
              </div>
           </div>
        </div>

        <div className="space-y-2">
           <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">{t('auto.typ_bolusa', { defaultValue: 'Typ Bolusa' })}</label>
           <select 
             className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
             value={simType}
             onChange={(e) => {
               setSimType(e.target.value);
               setSimResult(false);
             }}
           >
             <option value="standard">{t('auto.standardowy_całość_od_razu', { defaultValue: 'Standardowy (Całość od razu)' })}</option>
             <option value="extended">{t('auto.przedłużony_całość_rozłożona_w_czas', { defaultValue: 'Przedłużony (Całość rozłożona w czasie)' })}</option>
             <option value="dual">{t('auto.złożony_pizza_część_teraz_część_w_c', { defaultValue: 'Złożony / Pizza (Część teraz, Część w czasie)' })}</option>
           </select>
        </div>
        
        {simType === 'dual' && (
          <div className="grid grid-cols-2 gap-4">
             <SettingInput label={t('auto.teraz', { defaultValue: '% Teraz' })} value={simSplitNow} onChange={(v) => setSimSplitNow(Number(v))} />
             <SettingInput label={t('auto.czas_przedłużenia_h', { defaultValue: 'Czas przedłużenia (h)' })} value={simDuration} onChange={(v) => setSimDuration(Number(v))} />
          </div>
        )}
        
        {simType === 'extended' && (
          <div className="grid grid-cols-1 gap-4">
             <SettingInput label={t('auto.czas_działania_h', { defaultValue: 'Czas działania (h)' })} value={simDuration} onChange={(v) => setSimDuration(Number(v))} />
          </div>
        )}

        <div className="p-4 bg-accent-50 dark:bg-accent-900/10 rounded-2xl space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-accent-500">
             <span>{t('auto.początkowa_sugerowana_dawka', { defaultValue: 'Początkowa sugerowana dawka:' })} {(simCarbs / Number(settings?.wwRatio || 10) + simFat / Number(settings?.wbtRatio || 10)).toFixed(2)} J</span>
          </div>
          <div className="space-y-2">
            <label className="text-[8px] font-black uppercase text-accent-400 tracking-widest ml-2">{t('auto.wprowadź_własną_dawkę_do_testu_błęd', { defaultValue: 'Wprowadź własną dawkę do testu błędów (J) - Zostaw puste aby użyć sugerowanej' })}</label>
            <input 
              type="number"
              placeholder={t('auto.wpisz_np_1_0_aby_zobaczyć_skutek_ni', { defaultValue: 'Wpisz np. 1.0 aby zobaczyć skutek niedoboru' })}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold text-sm outline-none dark:text-white"
              value={simManualDose}
              onChange={e => {
                setSimManualDose(e.target.value);
                setSimResult(false);
              }}
            />
          </div>
        </div>

        <div className="p-4 border border-slate-100 dark:border-slate-700 rounded-2xl space-y-3">
           <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="stackingCheck"
                checked={simStackingEnabled} 
                onChange={e => {
                  setSimStackingEnabled(e.target.checked);
                  setSimResult(false);
                }} 
                className="w-4 h-4 rounded text-accent-600 focus:ring-accent-500" 
              />
              <label htmlFor="stackingCheck" className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('auto.dodaj_nakładającą_się_dawkę_korekta', { defaultValue: 'Dodaj nakładającą się dawkę (korekta IOB)' })}</label>
           </div>
           {simStackingEnabled && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                 <SettingInput label={t('auto.wielkość_korekty_j', { defaultValue: 'Wielkość Korekty (J)' })} value={simStackDose} onChange={(v) => setSimStackDose(Number(v))} />
                 <SettingInput label={t('auto.podana_za_godzin', { defaultValue: 'Podana za (Godzin)' })} value={simStackTime} onChange={(v) => setSimStackTime(Number(v))} />
              </div>
           )}
        </div>

        <button 
          className="w-full bg-accent-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-accent-600/20 active:scale-95 transition-all mt-4"
          onClick={() => {
            setSimResult(false);
            setTimeout(() => {
              setSimulationFrame(0);
              setSimResult(true);
            }, 50);
          }}
        >
          
                            {t('auto.symuluj_pokrycie_bolusem', { defaultValue: 'Symuluj Pokrycie Bolusem' })}
                          </button>

        {simResult && (
           <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 mt-4 space-y-4">
              <h4 className="text-xs font-bold text-accent-500">{t('auto.wynik_symulacji', { defaultValue: 'Wynik Symulacji:' })}</h4>
              <div className="text-[10px] text-slate-500 font-medium space-y-3">
                <p className="text-sm">{t('auto.razem_do_podania', { defaultValue: 'Razem do podania:' })} <strong className="text-accent-500 text-lg">{((simCarbs / Number(settings?.wwRatio || 10)) + (simFat / Number(settings?.wbtRatio || 10))).toFixed(2)}  {t('auto.j', { defaultValue: 'j.' })}</strong></p>
                
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">{t('auto.co_widzisz_na_wykresie', { defaultValue: 'Co widzisz na wykresie?' })}</p>
                  <p className="mb-2"><strong>{t('auto.kolorowe_słupki', { defaultValue: 'Kolorowe słupki' })}</strong>  {t('auto.pokazują_ile_insuliny_działa_w_dany', { defaultValue: 'pokazują, ile insuliny działa w danym momencie.' })} <strong>{t('auto.czerwona_linia', { defaultValue: 'Czerwona linia' })}</strong>  {t('auto.to_prognozowany_poziom_twojego_cukr', { defaultValue: 'to prognozowany poziom Twojego cukru we krwi.' })}</p>
                  
                  <ul className="list-disc pl-4 space-y-1.5 text-[9px]">
                     <li><strong>{t('auto.całkowita_dawka', { defaultValue: 'Całkowita dawka:' })}</strong>  {t('auto.tyle_insuliny_potrzebujesz_na_zjedz', { defaultValue: 'Tyle insuliny potrzebujesz na zjedzony posiłek bazując na Twoich przelicznikach z ustawień.' })}</li>
                     <li><strong>{t('auto.isf', { defaultValue: 'ISF (' })}{settings?.isf || 40}):</strong>  {t('auto.wskaźnik_wrażliwości_pokazuje_o_ile', { defaultValue: 'Wskaźnik wrażliwości. Pokazuje, o ile mg/dL spadnie Twój cukier po podaniu 1 jednostki insuliny.' })}</li>
                     <li><strong>{t('auto.tłuszcze_opóźniają_trawienie', { defaultValue: 'Tłuszcze opóźniają trawienie:' })}</strong>  {t('auto.mięso_sery_czy_pizza_sprawiają_że_c', { defaultValue: 'Mięso, sery czy pizza sprawiają, że cukier może rosnąć nawet przez 5 godzin. Dlatego insulina rozłożona w czasie zadziała tu znacznie lepiej niż jeden strzał z pena!' })}</li>
                     <li><strong>{t('auto.ruch_a_cukier', { defaultValue: 'Ruch a cukier:' })}</strong>  {t('auto.zaznaczenie_treningu_sprawia_że_ins', { defaultValue: 'Zaznaczenie treningu sprawia, że insulina działa mocniej i szybciej spala węglowodany, przez co cukier ma naturalną tendencję do spadania.' })}</li>
                  </ul>
                </div>
              </div>
              
              <div className="h-64 w-full mt-10 bg-white dark:bg-slate-900/80 rounded-xl relative flex items-end justify-between px-4 pt-12 pb-6 border-b border-l border-slate-300 dark:border-slate-700 shadow-inner">
                 {(() => {
                    const wwRatio = Number(settings?.wwRatio || 10);
                    const wbtRatio = Number(settings?.wbtRatio || 10);
                    const totalDoseAuto = (simCarbs / wwRatio) + (simFat / wbtRatio);
                    const appliedDose = simManualDose !== '' ? Number(simManualDose) : totalDoseAuto;
                    
                    const hoursMax = Math.max(simDuration + 1, simStackingEnabled ? simStackTime + 3 : 0, 6);
                    const hoursObj: {hour: number, label: string, dose1: number, dose2: number, autoDose: number, bg: number}[] = [];
                    
                    let cumulativeBg = simBg;
                    const ISF = Number(settings?.isf || 40);
                    
                    for (let i = 0; i <= hoursMax; i++) {
                      let dose1 = 0;
                      if (simType === 'standard' && i === 0) dose1 = appliedDose;
                      else if (simType === 'extended' && i > 0 && i <= simDuration) dose1 = appliedDose / simDuration;
                      else if (simType === 'dual') {
                        if (i === 0) dose1 = appliedDose * (simSplitNow / 100);
                        if (i > 0 && i <= simDuration) dose1 = (appliedDose * (1 - simSplitNow / 100)) / simDuration;
                      }
                      
                      let dose2 = 0;
                      if (simStackingEnabled && i === simStackTime) dose2 = simStackDose;

                      let autoDose = 0;

                      // Calculate effect from given doses looking back
                      let insImpact1 = 0;
                      let insImpact2 = 0;
                      let autoImpact = 0;
                      
                      if (i >= 1) {
                        const d1_minus_1 = hoursObj[i-1]?.dose1 || 0;
                        const d1_minus_2 = hoursObj[i-2]?.dose1 || 0;
                        const d1_minus_3 = hoursObj[i-3]?.dose1 || 0;
                        insImpact1 = (d1_minus_1 * 0.6 + d1_minus_2 * 0.3 + d1_minus_3 * 0.1) * ISF;
                        
                        const d2_minus_1 = hoursObj[i-1]?.dose2 || 0;
                        const d2_minus_2 = hoursObj[i-2]?.dose2 || 0;
                        const d2_minus_3 = hoursObj[i-3]?.dose2 || 0;
                        insImpact2 = (d2_minus_1 * 0.6 + d2_minus_2 * 0.3 + d2_minus_3 * 0.1) * ISF;

                        const a_minus_1 = hoursObj[i-1]?.autoDose || 0;
                        const a_minus_2 = hoursObj[i-2]?.autoDose || 0;
                        const a_minus_3 = hoursObj[i-3]?.autoDose || 0;
                        autoImpact = (a_minus_1 * 0.6 + a_minus_2 * 0.3 + a_minus_3 * 0.1) * ISF;
                      }

                      // Apply workout multiplier & drops
                      let workoutMultiplier = 1;
                      let workoutDrop = 0;
                      if (simWorkout === 'light') { workoutMultiplier = 1.3; if(i===1||i===2) workoutDrop = 15; }
                      if (simWorkout === 'intense') { workoutMultiplier = 1.8; if(i>=1 && i<=3) workoutDrop = 30; }

                      insImpact1 *= workoutMultiplier;
                      insImpact2 *= workoutMultiplier;
                      autoImpact *= workoutMultiplier;

                      let carbImpact = 0;
                      if (simGi === 'high') {
                        if (i === 1) carbImpact = (simCarbs / wwRatio) * ISF * 0.9;
                        if (i === 2) carbImpact = (simCarbs / wwRatio) * ISF * 0.1;
                      } else if (simGi === 'low') {
                        if (i === 1) carbImpact = (simCarbs / wwRatio) * ISF * 0.3;
                        if (i === 2) carbImpact = (simCarbs / wwRatio) * ISF * 0.5;
                        if (i === 3) carbImpact = (simCarbs / wwRatio) * ISF * 0.2;
                      } else {
                        // Medium
                        if (i === 1) carbImpact = (simCarbs / wwRatio) * ISF * 0.7;
                        if (i === 2) carbImpact = (simCarbs / wwRatio) * ISF * 0.3;
                      }
                      
                      let fatImpact = 0;
                      if(i===2) fatImpact = (simFat / wbtRatio) * ISF * 0.2;
                      if(i===3) fatImpact = (simFat / wbtRatio) * ISF * 0.4;
                      if(i===4) fatImpact = (simFat / wbtRatio) * ISF * 0.3;
                      if(i===5) fatImpact = (simFat / wbtRatio) * ISF * 0.1;
                      
                      cumulativeBg += (carbImpact + fatImpact - insImpact1 - insImpact2 - autoImpact - workoutDrop);

                      // Auto Algorithm reacting to current BG 
                      if (simAutoBasal) {
                         if (cumulativeBg > 130) {
                            // Podaj mikrobolus korygujący (max 2J / h żeby nie zwariowało)
                            autoDose = ((cumulativeBg - 120) / ISF) * 0.5; 
                            if (autoDose > 2) autoDose = 2;
                         } else if (cumulativeBg < 80) {
                            // Odcięcie bazy -> odzyskanie cukru
                            cumulativeBg += Math.min(30, (80 - cumulativeBg) * 0.8);
                         }
                      }
                      
                      hoursObj.push({ hour: i, label: i === 0 ? "Teraz" : `+${i}h`, dose1, dose2, autoDose, bg: cumulativeBg });
                    }

                    const maxDose = Math.max(...hoursObj.map(h => h.dose1 + h.dose2 + h.autoDose), 1);
                    const maxBg = Math.max(...hoursObj.map(h => h.bg), 200, cumulativeBg + 20);
                    const minBg = Math.min(...hoursObj.map(h => h.bg), 70, cumulativeBg - 20);
                    const safeMinBg = Math.max(0, minBg - 20);
                    const safeMaxBg = maxBg + 20;
                    
                    const animatedHoursObj = hoursObj.map((h, index) => {
                      if (index <= simulationFrame) return h;
                      return {
                         hour: h.hour,
                         label: h.label,
                         dose1: 0,
                         dose2: 0,
                         autoDose: 0,
                         bg: null as unknown as number // Tak żeby wykres ucinał w tym punkcie
                      };
                    });

                    return (
                      <div className="w-full h-full pb-4">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                          <ComposedChart data={animatedHoursObj} margin={{ top: 35, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorDose1" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={simType === 'standard' ? "#94a3b8" : simType === 'extended' ? "#64748b" : "#475569"} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={simType === 'standard' ? "#cbd5e1" : simType === 'extended' ? "#94a3b8" : "#64748b"} stopOpacity={0.4}/>
                              </linearGradient>
                              <linearGradient id="colorDose2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#fcd34d" stopOpacity={0.4}/>
                              </linearGradient>
                              <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#c7d2fe" stopOpacity={0.4}/>
                              </linearGradient>
                              <linearGradient id="colorBgArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} vertical={false} />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: '500' }} dy={10} padding={{ left: 30, right: 30 }} />
                            <YAxis yAxisId="right" orientation="right" domain={[safeMinBg, safeMaxBg]} hide />
                            <YAxis yAxisId="left" domain={[0, maxDose * 1.15]} hide />
                            <Tooltip 
                               cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                               contentStyle={{ borderRadius: '1rem', border: '1px solid #e2e8f0', background: 'rgba(255, 255, 255, 0.95)', color: '#334155', fontSize: '12px', fontWeight: '500', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', backdropFilter: 'blur(8px)' }}
                               labelStyle={{ color: '#64748b', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}
                               formatter={(value: any, name: string) => [typeof value === 'number' && name !== 'bg' ? value.toFixed(2) : Math.round(Number(value)), name === 'bg' ? 'Cukier (mg/dL)' : name === 'dose1' ? i18n.t('auto.dawka_glowna_j', { defaultValue: "Dawka główna (J)" }) : name === 'dose2' ? i18n.t('auto.dawka_reczna_j', { defaultValue: "Dawka ręczna (J)" }) : 'Auto Baza (J)']}
                            />
                            
                            <Area yAxisId="right" type="monotone" dataKey="bg" stroke="none" fill="url(#colorBgArea)" />
                            
                            <Bar yAxisId="left" dataKey="dose1" stackId="a" fill="url(#colorDose1)" radius={[0, 0, 8, 8]} barSize={24}>
                               <LabelList dataKey="dose1" position="insideTop" fill="#475569" fontSize={10} fontWeight="700" formatter={(val: number) => val > 0.05 ? val.toFixed(1) : ''} />
                            </Bar>
                            <Bar yAxisId="left" dataKey="dose2" stackId="a" fill="url(#colorDose2)">
                               <LabelList dataKey="dose2" position="insideTop" fill="#b45309" fontSize={10} fontWeight="700" formatter={(val: number) => val > 0.05 ? val.toFixed(1) : ''} />
                            </Bar>
                            <Bar yAxisId="left" dataKey="autoDose" stackId="a" fill="url(#colorAuto)" radius={[8, 8, 0, 0]}>
                               <LabelList dataKey="autoDose" position="insideTop" fill="#4338ca" fontSize={10} fontWeight="700" formatter={(val: number) => val > 0.05 ? val.toFixed(1) : ''} />
                            </Bar>

                            <Line yAxisId="right" type="monotone" dataKey="bg" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#f43f5e', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} strokeLinecap="round" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    );
                 })()}
              </div>
              
              <div className="flex flex-wrap items-center gap-6 justify-center mt-8 p-6 border border-slate-200/50 dark:border-slate-700/50 rounded-[2rem] bg-white/50 dark:bg-slate-800/50 shadow-sm backdrop-blur-sm">
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                   <div className="w-3 h-3 rounded-full border-2 border-rose-500 bg-white"></div>  {t('auto.glukoza', { defaultValue: 'Glukoza' })}
                                               </div>
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                   <div className="w-3 h-3 rounded-md shadow-sm opacity-80" style={{ background: `linear-gradient(to bottom, ${simType === 'standard' ? "#94a3b8, #cbd5e1" : simType === 'extended' ? "#64748b, #94a3b8" : "#475569, #64748b"})` }}></div> 
                   {simType === 'standard' ? i18n.t('auto.bolus_zwykly', { defaultValue: "Bolus Zwykły" }) : simType === 'extended' ? i18n.t('auto.bolus_przedluzony', { defaultValue: "Bolus Przedłużony" }) : i18n.t('auto.bolus_zlozony', { defaultValue: "Bolus Złożony" })}
                 </div>
                 {simStackingEnabled && (
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                     <div className="w-3 h-3 rounded-md bg-gradient-to-b from-amber-500 to-amber-300 shadow-sm opacity-80"></div>  {t('auto.korekta', { defaultValue: 'Korekta' })}
                                                     </div>
                 )}
                 {simAutoBasal && (
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                     <div className="w-3 h-3 rounded-md bg-gradient-to-b from-indigo-400 to-indigo-300 shadow-sm opacity-80"></div>  {t('auto.auto_baza', { defaultValue: 'Auto Baza' })}
                                                     </div>
                 )}
              </div>
           </div>
        )}

      </div>
    </motion.div>
  );
}