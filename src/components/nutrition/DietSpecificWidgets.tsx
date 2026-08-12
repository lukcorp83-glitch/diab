import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Heart, Utensils, Clock, AlertTriangle, ShieldCheck, Flame, 
  TrendingUp, Droplet, Activity, Sparkles, Plus, Check, Info 
} from 'lucide-react';
import { Haptics } from '../../lib/haptics';
import { UserSettings } from '../../types';
import { toast } from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";

interface DietSpecificWidgetsProps {
  activeDietId: string;
  settings?: UserSettings;
  logs?: any[];
}

export function DietSpecificWidgets({ activeDietId, settings, logs = [] }: DietSpecificWidgetsProps) {
  const { t } = useTranslation();

  // Stan dla pomiaru ketonów (Keto)
  const [ketoneVal, setKetoneVal] = useState<string>('');
  const [ketoneLog, setKetoneLog] = useState<{ val: number; date: string }[]>(() => {
    try {
      const saved = localStorage.getItem('diacontrol_ketone_logs');
      return saved ? JSON.parse(saved) : [
        { val: 1.2, date: 'Dzisiaj, 07:30' }
      ];
    } catch {
      return [{ val: 1.2, date: 'Dzisiaj, 07:30' }];
    }
  });

  // Stan dla kalkulatora WBT (Keto/Low-Carb)
  const [wbtFat, setWbtFat] = useState<number>(30);
  const [wbtProtein, setWbtProtein] = useState<number>(35);

  // Stan dla timera IF (Post Przerywany)
  const [isFastingActive, setIsFastingActive] = useState<boolean>(true);

  // Obliczenia Kcal i Makro z dzisiejszych logów
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  let todayCarbs = 0;
  let todayProtein = 0;
  let todayFat = 0;

  (logs || []).forEach(l => {
    const ts = l.timestamp || l.createdAt || 0;
    if (ts >= todayMs) {
      const src = (l.type === 'bolus' && l.linkedMeal) ? l.linkedMeal : l;
      if (l.type === 'meal' || (l.type === 'bolus' && l.linkedMeal)) {
        todayCarbs += src.carbs || (l.type === 'meal' ? (l.value || 0) : 0);
        todayProtein += src.protein || 0;
        todayFat += src.fat || 0;
      }
    }
  });

  todayCarbs = Math.round(todayCarbs);
  todayProtein = Math.round(todayProtein);
  todayFat = Math.round(todayFat);

  // Zapis ketonów
  const handleAddKetone = () => {
    const num = parseFloat(ketoneVal.replace(',', '.'));
    if (isNaN(num) || num <= 0 || num > 10) {
      toast.error(t('auto.wprowadź_poprawny_poziom_ket', { defaultValue: 'Wprowadź poprawny poziom ciał ketonowych (0.1 - 10.0 mmol/L)' }));
      return;
    }
    Haptics.success();
    const newLog = { val: num, date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const updated = [newLog, ...ketoneLog.slice(0, 4)];
    setKetoneLog(updated);
    try {
      localStorage.setItem('diacontrol_ketone_logs', JSON.stringify(updated));
    } catch {}
    setKetoneVal('');
    toast.success(`Zapisano pomiar ketonów: ${num} mmol/L`);
  };

  // Obliczanie WBT (1 WBT = 100 kcal z białka i tłuszczu: 1g tłuszczu = 9 kcal, 1g białka = 4 kcal)
  const calculatedWBT = Math.round(((wbtFat * 9 + wbtProtein * 4) / 100) * 10) / 10;
  const suggestedSquareHours = Math.min(5, Math.max(2, Math.round(calculatedWBT * 0.8 + 1.5)));

  // --- WIDŻET 1: KETO / LOW-CARB ---
  if (activeDietId === 'keto') {
    const latestKetone = ketoneLog[0]?.val || 1.2;
    const isOptimalKeto = latestKetone >= 0.5 && latestKetone <= 3.0;
    const isWarningHigh = latestKetone > 3.0;

    return (
      <div className="space-y-4">
        {/* Karta Ketonów */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20 rounded-2xl p-4 border border-red-200 dark:border-red-800/40 glass-target">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500 text-white rounded-xl shadow-sm">
                <Flame size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Dziennik Ketonów (Beta-Hydroxybutyrate)</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Wskaźnik Ketozy Odżywczej (mmol/L)</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              isOptimalKeto ? 'bg-emerald-500 text-white' : isWarningHigh ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {isOptimalKeto ? '🟢 Ketoza Odżywcza' : isWarningHigh ? '⚠️ Wysokie Ketony' : 'Adaptacja'}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input 
              type="number"
              step="0.1"
              value={ketoneVal}
              onChange={(e) => setKetoneVal(e.target.value)}
              placeholder="np. 1.5 mmol/L"
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button 
              onClick={handleAddKetone}
              className="bg-red-500 hover:bg-red-600 active:scale-95 text-white font-black text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1"
            >
              <Plus size={14} /> Dodaj
            </button>
          </div>

          {/* Ostatni pomiar i norma */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-3 border border-red-100 dark:border-red-900/30 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-400">Ostatni Pomiar:</span>
            <span className="font-black text-red-600 dark:text-red-400 text-sm">{latestKetone} mmol/L</span>
            <span className="text-[10px] font-bold text-slate-400">Cel: 0.5 – 3.0 mmol/L</span>
          </div>
        </div>

        {/* Kalkulator WBT (Wymienniki Białkowo-Tłuszczowe) */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 glass-target space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-red-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Kalkulator WBT & Bolus Przedłużony</h4>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Tłuszcz w posiłku (g):</label>
              <input 
                type="number"
                value={wbtFat}
                onChange={(e) => setWbtFat(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Białko w posiłku (g):</label>
              <input 
                type="number"
                value={wbtProtein}
                onChange={(e) => setWbtProtein(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold"
              />
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-950/40 rounded-xl p-3 border border-red-200 dark:border-red-800/40 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 block">Wyliczone WBT:</span>
              <span className="font-black text-red-600 dark:text-red-400 text-base">{calculatedWBT} WBT</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 block">Sugerowany Bolus Przedłużony:</span>
              <span className="font-black text-slate-900 dark:text-white text-xs">Czas: {suggestedSquareHours}h (Dual-Wave)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- WIDŻET 2: TALERZ DIABETOLOGICZNY ---
  if (activeDietId === 'plate') {
    const totalMacros = (todayCarbs * 4 + todayProtein * 4 + todayFat * 9) || 1;
    const carbPct = Math.round(((todayCarbs * 4) / totalMacros) * 100);
    const proteinPct = Math.round(((todayProtein * 4) / totalMacros) * 100);
    const fatPct = Math.round(((todayFat * 9) / totalMacros) * 100);

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800/40 glass-target">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-500 text-white rounded-xl shadow-sm">
              <Utensils size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Proporcje Talerza Diabetologicznego</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Cel: 50% Warzywa | 25% Białko | 25% Węgle</p>
            </div>
          </div>

          {/* Pasek postępu proporcji makro */}
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex mb-3 shadow-inner">
            <div style={{ width: `${Math.min(100, carbPct)}%` }} className="bg-amber-500 transition-all duration-500" title="Węglowodany" />
            <div style={{ width: `${Math.min(100, proteinPct)}%` }} className="bg-blue-500 transition-all duration-500" title="Białko" />
            <div style={{ width: `${Math.min(100, fatPct)}%` }} className="bg-rose-500 transition-all duration-500" title="Tłuszcze" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-amber-200 dark:border-amber-900/30">
              <span className="text-amber-600 dark:text-amber-400 font-black block">{todayCarbs}g ({carbPct}%)</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest">Węgle</span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-blue-200 dark:border-blue-900/30">
              <span className="text-blue-600 dark:text-blue-400 font-black block">{todayProtein}g ({proteinPct}%)</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest">Białko</span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-xl border border-rose-200 dark:border-rose-900/30">
              <span className="text-rose-600 dark:text-rose-400 font-black block">{todayFat}g ({fatPct}%)</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest">Tłuszcz</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- WIDŻET 3: INTERMITTENT FASTING (POST PRZERYWANY) ---
  if (activeDietId === 'if') {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-800/40 glass-target">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500 text-white rounded-xl shadow-sm">
                <Clock size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Licznik Postu Przerywanego (16/8)</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Status Okna Żywieniowego</p>
              </div>
            </div>
            <button 
              onClick={() => {
                Haptics.medium();
                setIsFastingActive(!isFastingActive);
                toast.success(isFastingActive ? 'Rozpoczęto okno jedzenia (8h)' : 'Rozpoczęto post (16h)');
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                isFastingActive ? 'bg-purple-600 text-white shadow-sm' : 'bg-emerald-500 text-white shadow-sm'
              }`}
            >
              {isFastingActive ? '🌙 Post (16h)' : '🍽️ Okno Jedzenia (8h)'}
            </button>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border border-purple-100 dark:border-purple-900/30 text-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 block">Zalecane okno jedzenia:</span>
              <span className="font-black text-purple-600 dark:text-purple-400">10:00 – 18:00</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 block">Bezpieczeństwo Hipoglikemii:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check size={12} /> Zawsze przerywaj post przy &lt;70 mg/dL
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- WIDŻET 4: DASH / ŚRÓDZIEMNOMORSKA ---
  if (activeDietId === 'dash') {
    const fiberEst = Math.round(todayCarbs * 0.22);
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/40 glass-target">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-sm">
              <Heart size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Licznik Błonnika & Ochrony Serca (DASH)</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Szacowany Błonnik Spowalniający Szczyty Glikemii</p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 block">Dzisiejszy Błonnik (Szacunek):</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{fiberEst}g / 30g celu</span>
            </div>
            <div className="w-1/2">
              <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(100, (fiberEst / 30) * 100)}%` }} className="h-full bg-emerald-500 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- WIDŻET 5: BEZGLUTENOWA / CELIAKIA ---
  if (activeDietId === 'gluten') {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-800/40 glass-target">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Wskaźnik Indeksu Zamienników Gluten-Free</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Ochrona Przed Mąkami o Bardzo Wysokim GI</p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border border-amber-100 dark:border-amber-900/30 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-amber-900 dark:text-amber-200 font-bold">
              <span>⚠️ Mąka Ryżowa / Kukurydziana:</span>
              <span className="text-rose-500 font-black">GI 85 – 95 (Wysoki skok)</span>
            </div>
            <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-300 font-bold">
              <span>🟢 Mąka Gryczana / Migdałowa:</span>
              <span className="text-emerald-600 font-black">GI 35 – 50 (Płaski wykres)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default DietSpecificWidgets;
