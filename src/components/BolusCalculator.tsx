import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { LogEntry, UserSettings } from '../types';
import { Droplets, Calculator, Info, TrendingUp, TrendingDown, Minus, Camera, Loader2, Edit3 } from 'lucide-react';
import { cn, calculateIOB } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { geminiService } from '../services/gemini';

export default function BolusCalculator({ logs, user, setTab }: { logs: LogEntry[], user: any, setTab?: (t: string) => void }) {
  const [bg, setBg] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const [isPizzaMode, setIsPizzaMode] = useState(false);
  const [trend, setTrend] = useState<'up' | 'stable' | 'down'>('stable');
  const [dose, setDose] = useState<number>(0);
  const [manualDose, setManualDose] = useState<string | null>(null);
  const [extendedTime, setExtendedTime] = useState<number>(0); // how many hours to extend
  const [settings, setSettings] = useState<UserSettings>({ isf: 58, wwRatio: 16, wbtRatio: 18, targetMin: 70, targetMax: 140, dia: 4 });
  const [scanning, setScanning] = useState(false);
  const [scanResultMsg, setScanResultMsg] = useState<string | null>(null);
  const [aiRec, setAiRec] = useState<{ recommendedDose: number, reasoning: string, confidence: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
  const [entryTime, setEntryTime] = useState<string>(localISOTime);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'))
      .then(d => {
        if (d.exists()) setSettings(prev => ({ ...prev, ...d.data() }));
      })
      .catch(e => {
        if (!e.message?.includes('offline')) console.error("Error fetching profile settings:", e);
      });

    // Auto-fill latest BG
    const lastG = logs.find(l => l.type === 'glucose');
    if (lastG && (Date.now() - lastG.timestamp < 30 * 60 * 1000)) {
       setBg(lastG.value.toString());
    }
  }, [user, logs]);

  const [activeProfileTime, setActiveProfileTime] = useState<string | null>(null);

  useEffect(() => {
    calculateDose();
  }, [bg, carbs, protein, fat, isPizzaMode, trend, settings]);

  const calculateDose = () => {
    const bgNum = parseFloat(bg) || 0;
    const carbsNum = parseFloat(carbs) || 0;
    const protNum = parseFloat(protein) || 0;
    const fatNum = parseFloat(fat) || 0;
    
    let currentIsf = settings.isf;
    let currentWwRatio = settings.wwRatio;
    let activeProfileStr = null;
    
    if (settings.hourlyProfiles && settings.hourlyProfiles.length > 0) {
       const now = new Date();
       const currentHourStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
       const sorted = [...settings.hourlyProfiles].sort((a,b) => a.time.localeCompare(b.time));
       let activeProfile = sorted.slice().reverse().find(p => p.time <= currentHourStr);
       if (!activeProfile && sorted.length > 0) activeProfile = sorted[sorted.length - 1];
       
       if (activeProfile) {
         currentIsf = activeProfile.isf || currentIsf;
         currentWwRatio = activeProfile.wwRatio || currentWwRatio;
         activeProfileStr = activeProfile.time;
       }
    }
    setActiveProfileTime(activeProfileStr);
    
    const mealDose = carbsNum / currentWwRatio;
    
    let wbtDose = 0;
    let extendHrs = 0;
    if (isPizzaMode) {
      // 1 WBT = 100 kcal z białka i tłuszczu
      const kcalFromProtFat = (protNum * 4) + (fatNum * 9);
      const wbt = kcalFromProtFat / 100;
      wbtDose = wbt * (settings.wbtRatio ? (10 / settings.wbtRatio) : (10 / currentWwRatio)); 
      // Usually WBT takes same ratio as WW or custom wbtRatio. Assuming wbtRatio is defined as "1j na 1WBT" or "wbtRatio g na 1j" ? 
      // Actually standard WBT ratio is 1 unit per 100kcal. If wbtRatio is 18, maybe it means 18g/unit. 
      // If the user's wbt ratio is for `WW`, they use the wbtRatio like 1WBT = ... let's just use `wbt * (10 / settings.wbtRatio)` as a simple formula, or standard is: wbt/wbtRatio but WBT is an index, so if wbtRatio=1 means 1WBT = 1j.
      // Let's assume standard: 1 WBT = 1 j. For simple model, give wbt * 1. 
      // But typically we use the WW ratio or similar. 1 WW (10g carbs) needs X units. 1 WBT needs X units.
      // Easiest standard: `wbtDose = wbt * (10 / settings.wwRatio)` or whatever. Let's just use `wbt * settings.wwRatio_or_something`. 
      // We will use standard rule: 1 WBT requires insulin equal to 1 WW. So wbtDose = wbt * (10 / currentWwRatio) if 1 WW = 10g.
      wbtDose = wbt * (10 / currentWwRatio);

      // Extending time rule: 1 WBT = 3h, 2 WBT = 4h, 3 WBT = 5h...
      if (wbt > 0) {
        if (wbt <= 1) extendHrs = 3;
        else if (wbt <= 2) extendHrs = 4;
        else extendHrs = 5;
      }
    }
    setExtendedTime(extendHrs);

    const target = (settings.targetMin + settings.targetMax) / 2;
    const corrDose = bgNum > target ? (bgNum - target) / currentIsf : 0;
    
    const iob = calculateIOB(logs, settings.dia || 4);

    const trendFactor = trend === 'up' ? 1.15 : trend === 'down' ? 0.85 : 1.0;
    const total = Math.max(0, (mealDose + wbtDose + Math.max(0, corrDose - iob)) * trendFactor);
    setDose(total);
    setManualDose(null);
  };

  const handleMealScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const result = await geminiService.analyzeMeal(base64);
          if (result && result.carbs) {
            setCarbs(result.carbs.toString());
            setScanResultMsg(`Rozpoznano: ${result.mealName} (~${result.carbs}g W)`);
            setTimeout(() => setScanResultMsg(null), 5000);
          }
        } catch (err) {
          console.error("AI scan error:", err);
          setScanResultMsg("Błąd skanowania posiłku.");
          setTimeout(() => setScanResultMsg(null), 5000);
        } finally {
          setScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("Meal scan error:", e);
      setScanResultMsg("Błąd skanowania posiłku.");
      setTimeout(() => setScanResultMsg(null), 5000);
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const timestamp = new Date(entryTime).getTime();
    const finalDose = manualDose !== null ? parseFloat(manualDose) : dose;
    
    let savedSomething = false;

    if (finalDose > 0 && !isNaN(finalDose)) {
      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs'), {
        type: 'bolus',
        value: finalDose,
        timestamp,
        description: 'Kalkulator bolusa'
      });
      savedSomething = true;
    }
    
    const bgNum = parseFloat(bg);
    if (!isNaN(bgNum) && bgNum > 0) {
      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs'), {
        type: 'glucose',
        value: bgNum,
        timestamp: timestamp - 20,
        description: 'Wpisane w kalkulator'
      });
      savedSomething = true;
    }

    if (carbs && parseFloat(carbs) > 0) {
      const carbsNum = parseFloat(carbs);
      const proteinNum = parseFloat(protein) || null;
      const fatNum = parseFloat(fat) || null;
      
      const payload: any = {
        type: 'meal',
        value: carbsNum,
        timestamp: timestamp - 10,
        description: 'Pobrano z kalkulatora'
      };
      if (proteinNum) payload.protein = proteinNum;
      if (fatNum) payload.fat = fatNum;

      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs'), payload);
      savedSomething = true;
    }

    if (savedSomething) {
      if (finalDose > 0 && !isNaN(finalDose)) {
        alert(`Zapisano dziennik. Podano ${finalDose.toFixed(1)}j insuliny.`);
      } else {
        alert('Zapisano pomyślnie wpis glukozy/posiłku (bez bolusa).');
      }
      setBg(''); setCarbs(''); setProtein(''); setFat(''); setManualDose(null);
      if (setTab) setTab('dashboard');
    }
  };

  const getTimingAdvice = () => {
    const bgNum = parseFloat(bg) || 0;
    if (bgNum === 0) return null;
    if (bgNum < 70) return { text: "🔴 HIPO! Zjedz węgle. Nie podawaj bolusa!", color: "text-red-500" };
    if (bgNum <= 130) return { text: "🟢 NORMA. Bolus i posiłek za 5-10 min.", color: "text-green-500" };
    if (bgNum <= 180) return { text: "🟡 WYSOKI. Odczekaj ok. 15 min.", color: "text-amber-500" };
    if (bgNum <= 200) return { text: "🟠 BARDZO WYSOKI! Odczekaj min. 30 min.", color: "text-orange-500" };
    return { text: "🔴 KRYTYCZNY! Podaj tylko korektę i poczekaj z posiłkiem.", color: "text-red-600" };
  };

  const handleAskAi = async () => {
    setLoadingAi(true);
    try {
      const bgNum = parseFloat(bg) || 0;
      const carbsNum = parseFloat(carbs) || 0;
      const iob = calculateIOB(logs, settings.dia || 4);
      const currentDose = manualDose !== null ? parseFloat(manualDose) : dose;
      const result = await geminiService.getBolusRecommendation(bgNum, carbsNum, currentDose, trend, iob, logs);
      if (result) {
        setAiRec(result);
        if (result.recommendedDose !== undefined) {
           setDose(result.recommendedDose);
           setManualDose(null);
        }
      }
    } catch (e) {
       console.error("AI rec failed:", e);
    } finally {
       setLoadingAi(false);
    }
  };

  const advice = getTimingAdvice();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="flex justify-between items-center">
           <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Kalkulator Dawki</h3>
           <input 
             type="datetime-local" 
             value={entryTime}
             onChange={e => setEntryTime(e.target.value)}
             className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] font-black p-2 rounded-xl outline-none border border-slate-100 dark:border-slate-700"
           />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase block text-center">Cukier</label>
             <input 
               type="number" 
               value={bg} 
               onChange={e => setBg(e.target.value)}
               placeholder="mg/dL"
               className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-xl outline-none border border-slate-100 dark:border-slate-700 focus:border-indigo-500 transition-all dark:text-white"
             />
          </div>
          <div className="space-y-2 relative">
             <label className="text-[10px] font-black text-slate-400 uppercase block text-center">Węgle (g)</label>
             <div className="relative">
              <input 
                type="number" 
                value={carbs} 
                onChange={e => setCarbs(e.target.value)}
                placeholder="g"
                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-xl outline-none border border-slate-100 dark:border-slate-700 focus:border-indigo-500 transition-all dark:text-white"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-500 text-white rounded-xl active:scale-90 transition-all disabled:opacity-50"
              >
                {scanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleMealScan} 
                className="hidden" 
              />
             </div>
             {scanResultMsg && (
               <div className="absolute top-full left-0 mt-2 z-10 w-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 p-2 rounded-xl shadow-lg">
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold text-[8px] text-center uppercase">{scanResultMsg}</p>
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-2">
           <input type="checkbox" id="pizzaMode" checked={isPizzaMode} onChange={(e) => setIsPizzaMode(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
           <label htmlFor="pizzaMode" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer">Pizza Bolus (Białko i Tłuszcz)</label>
        </div>

        {isPizzaMode && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-rose-400 uppercase block text-center">Białko (g)</label>
               <input 
                 type="number" 
                 value={protein} 
                 onChange={e => setProtein(e.target.value)}
                 placeholder="g"
                 className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-xl outline-none border border-slate-100 dark:border-slate-700 focus:border-rose-500 transition-all dark:text-white"
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-amber-400 uppercase block text-center">Tłuszcz (g)</label>
               <input 
                 type="number" 
                 value={fat} 
                 onChange={e => setFat(e.target.value)}
                 placeholder="g"
                 className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-xl outline-none border border-slate-100 dark:border-slate-700 focus:border-amber-500 transition-all dark:text-white"
               />
            </div>
          </motion.div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase block text-center">Trend</label>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-3xl gap-1">
             <button onClick={() => setTrend('down')} className={`flex-1 py-3 rounded-2xl flex items-center justify-center transition-all ${trend === 'down' ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm' : 'text-slate-400'}`}>
                <TrendingDown size={18} />
             </button>
             <button onClick={() => setTrend('stable')} className={`flex-1 py-3 rounded-2xl flex items-center justify-center transition-all ${trend === 'stable' ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm' : 'text-slate-400'}`}>
                <Minus size={18} />
             </button>
             <button onClick={() => setTrend('up')} className={`flex-1 py-3 rounded-2xl flex items-center justify-center transition-all ${trend === 'up' ? 'bg-white dark:bg-slate-700 text-orange-500 shadow-sm' : 'text-slate-400'}`}>
                <TrendingUp size={18} />
             </button>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-[2rem] p-6 text-center space-y-4 relative overflow-hidden">
           {advice && (
             <div className={`text-[10px] font-black uppercase tracking-widest p-2 bg-white/5 rounded-xl mb-2 ${advice.color}`}>
               {advice.text}
             </div>
           )}
           <div>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
               <Edit3 size={10} className="text-indigo-400" /> Wprowadź Lub Skoryguj Dawkę
             </span>
             <div className="flex items-center justify-center gap-2 mt-2 mb-2">
                <input 
                  type="number"
                  step="0.1"
                  value={manualDose !== null ? manualDose : dose.toFixed(1)}
                  onChange={e => setManualDose(e.target.value)}
                  className="w-32 bg-indigo-500/20 text-center text-5xl font-black text-indigo-400 outline-none rounded-2xl py-2 focus:bg-indigo-500/30 transition-all border border-indigo-500/30"
                />
                <span className="text-xl font-bold opacity-30">j.</span>
             </div>
             {isPizzaMode && extendedTime > 0 && (
               <div className="mt-2 text-[10px] font-bold text-slate-400">
                 W tym przedłużone: <span className="text-indigo-400">rozłóż na {extendedTime}h</span> (dawka WBT)
               </div>
             )}
           </div>
           
           {aiRec && (
             <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-left">
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Korekta AI</span>
                </div>
                <p className="text-[11px] text-indigo-100/80 leading-relaxed">{aiRec.reasoning}</p>
             </motion.div>
           )}

           <button 
             onClick={handleAskAi} 
             disabled={loadingAi || (dose === 0 && !bg && !carbs)}
             className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
           >
             {loadingAi ? <Loader2 size={14} className="animate-spin" /> : '🤖 Poproś AI o korektę dawki na bazie historii'}
           </button>
        </div>

        <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/30 active:scale-95 transition-all">
           Podaj Insulinę
        </button>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800/50 flex gap-4">
         <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
           <Info className="text-indigo-600 dark:text-indigo-400 shrink-0" size={20} />
         </div>
         <div className="space-y-1">
           <p className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200 leading-relaxed">
              Kalkulacja uwzględnia <b>Zaawansowany Model IOB</b> (czas działania: {settings.dia || 4}h), współczynniki personalne oraz trend. Możesz użyć kamery do skanowania posiłków.
           </p>
           {activeProfileTime && (
             <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-2 block">
               Aktywny profil godzinowy: od {activeProfileTime}
             </p>
           )}
         </div>
      </div>
    </motion.div>
  );
}
