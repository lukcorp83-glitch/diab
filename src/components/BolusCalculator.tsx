import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { LogEntry, UserSettings } from '../types';
import { Droplets, Calculator, Info, TrendingUp, TrendingDown, Minus, Camera, Loader2 } from 'lucide-react';
import { cn, calculateIOB } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { geminiService } from '../services/gemini';

export default function BolusCalculator({ logs, user, setTab }: { logs: LogEntry[], user: any, setTab?: (t: string) => void }) {
  const [bg, setBg] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [trend, setTrend] = useState<'up' | 'stable' | 'down'>('stable');
  const [dose, setDose] = useState<number>(0);
  const [settings, setSettings] = useState<UserSettings>({ isf: 58, wwRatio: 16, wbtRatio: 18, targetMin: 70, targetMax: 140, dia: 4 });
  const [scanning, setScanning] = useState(false);
  const [aiRec, setAiRec] = useState<{ recommendedDose: number, reasoning: string, confidence: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'settings', 'profile'))
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

  useEffect(() => {
    calculateDose();
  }, [bg, carbs, trend, settings]);

  const calculateDose = () => {
    const bgNum = parseFloat(bg) || 0;
    const carbsNum = parseFloat(carbs) || 0;
    
    const mealDose = carbsNum / settings.wwRatio;
    const target = (settings.targetMin + settings.targetMax) / 2;
    const corrDose = bgNum > target ? (bgNum - target) / settings.isf : 0;
    
    // Advanced IOB calculation
    const iob = calculateIOB(logs, settings.dia || 4);

    const trendFactor = trend === 'up' ? 1.15 : trend === 'down' ? 0.85 : 1.0;
    const total = Math.max(0, (mealDose + Math.max(0, corrDose - iob)) * trendFactor);
    setDose(total);
  };

  const handleMealScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const result = await geminiService.analyzeMeal(base64);
        if (result && result.carbs) {
          setCarbs(result.carbs.toString());
          alert(`Skanowanie zakończone: ${result.mealName} (~${result.carbs}g węgli)`);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("Meal scan error:", e);
      alert("Błąd skanowania posiłku.");
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const timestamp = Date.now();
    if (dose > 0) {
      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'logs'), {
        type: 'bolus',
        value: dose,
        timestamp,
        description: 'Kalkulator bolusa'
      });
      
      const bgNum = parseFloat(bg);
      if (!isNaN(bgNum) && bgNum > 0) {
        await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'logs'), {
          type: 'glucose',
          value: bgNum,
          timestamp: timestamp - 20,
          description: 'Wpisane w kalkulator'
        });
      }

      if (carbs) {
        await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'logs'), {
          type: 'meal',
          value: parseFloat(carbs),
          timestamp: timestamp - 10,
          description: 'Pobrano z kalkulatora'
        });
      }
      alert(`Podano ${dose.toFixed(1)}j insuliny.`);
      setBg(''); setCarbs('');
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
      const result = await geminiService.getBolusRecommendation(bgNum, carbsNum, dose, trend, iob, logs);
      if (result) {
        setAiRec(result);
        if (result.recommendedDose !== undefined) {
           setDose(result.recommendedDose);
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
        <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">Kalkulator Dawki</h3>
        
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
          </div>
        </div>

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
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sugerowana Dawka</span>
             <div className="flex items-baseline justify-center gap-2 mt-1">
                <span className="text-5xl font-black text-indigo-400">{dose.toFixed(1)}</span>
                <span className="text-xl font-bold opacity-30">j.</span>
             </div>
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
         <p className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200 leading-relaxed">
            Kalkulacja uwzględnia <b>Zaawansowany Model IOB</b> (czas działania: {settings.dia || 4}h), współczynniki personalne oraz trend. Możesz użyć kamery do skanowania posiłków.
         </p>
      </div>
    </motion.div>
  );
}
