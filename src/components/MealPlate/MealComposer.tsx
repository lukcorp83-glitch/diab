import { useLogsStore } from "../../stores/useLogsStore";
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trash2, Check, Zap, Info, Calculator, Utensils, AlertTriangle, Leaf, Settings, Activity, Loader2, Star } from 'lucide-react';
import { Haptics } from '../../lib/haptics';
import { cn, getMealAbsorptionTime } from '../../lib/utils';
import { getProductName } from '../FoodDatabase';
import SwipeableItem from '../SwipeableItem';
import i18n from '../../i18n';

export const MealComposer = ({
 mode,
 plate,
 setPlate,
 removeFromPlate,
 updateWeight,
 totalWW,
 totalWBT,
 totalKcal,
 totalCarbs,
 totalProtein,
 totalFat,
 cookingMethod,
 setCookingMethod,
 settings,
 activeBolus, 
 entryTime,
 setEntryTime,
 handleMergeMeal,
 handleLogMeal,
 saveMealToLibrary,
 setIsMealSaved,
 totalGL,
 prepareToLogMeal,
 analyzeMeal,
 isAnalyzing,
 analysis,
 setTab
}) => {
 const logs = useLogsStore((state) => state.logs);
 const { t } = useTranslation();

 const totalCalsFromMacros = totalCarbs * 4 + totalProtein * 4 + totalFat * 9;
 const carbsPct = totalCalsFromMacros > 0 ? ((totalCarbs * 4) / totalCalsFromMacros) * 100 : 0;
 const proteinPct = totalCalsFromMacros > 0 ? ((totalProtein * 4) / totalCalsFromMacros) * 100 : 0;
 const fatPct = totalCalsFromMacros > 0 ? ((totalFat * 9) / totalCalsFromMacros) * 100 : 0;

 const plateChartData = useMemo(() => {
 if (plate.length === 0) return [];

 const WW = totalWW;
 const WBT = totalWBT;
 const totalWeightsWithGi = plate.filter((i) => typeof i.gi === 'number').reduce((s, i) => s + i.weight, 0);
 const weightedGiSum = plate.filter((i) => typeof i.gi === 'number').reduce((s, i) => s + (i.gi) * i.weight, 0);
 const averageGi = totalWeightsWithGi > 0 ? weightedGiSum / totalWeightsWithGi : 50;

 const data = [];
 const rules = (() => {
 try { return JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}'); } catch { return {}; }
 })();
 const pkFast = rules.pkParams?.fastCarbDuration || 1.5;
 const pkNormal = rules.pkParams?.normalCarbDuration || 3.0;
 const pkSlow = rules.pkParams?.slowCarbDuration || 5.0;

 const getCarbAbsorption = (t, gi) => {
 let multiplier = 1.0;
 if (gi > 70) multiplier = pkFast / 1.5;
 else if (gi < 50) multiplier = pkSlow / 5.0;
 else multiplier = pkNormal / 3.0;

 let peakT = (gi > 70 ? 0.75 : gi < 50 ? 1.5 : 1.0) * multiplier;
 let duration = 1.5 * multiplier;
 return Math.max(0, 1 - Math.pow((t - peakT) / duration, 2));
 };

 const getWbtAbsorption = (t) => {
 let multiplier = pkSlow / 5.0;
 let adjT = t / multiplier;
 if (adjT < 1) return 0;
 if (adjT < 3) return (adjT - 1) * 0.5;
 return Math.max(0, 1 - (adjT - 3) * 0.5);
 };

 const duration = getMealAbsorptionTime(WW, WBT);

 for (let t = 0; t <= duration; t += 0.5) {
 const carbRate = getCarbAbsorption(t, averageGi) * WW * 10;
 const wbtRate = getWbtAbsorption(t) * WBT * 10;
 data.push({
 time: '+' + t + 'h',
 [i18n.t('auto.posilek', { defaultValue: 'Posiłek' })]: Math.round((carbRate + wbtRate) * 10) / 10,
 });
 }

 return data;
 }, [plate, settings, totalWW, totalWBT]);

 return (
 <>
 {(mode === "plate" || mode === "both") && plate.length > 0 && (
 <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl border-l-[6px] border-accent-500">
 <div className="flex justify-between items-center mb-4 border-b border-accent-500/20 pb-4">
 <div className="flex items-center gap-2">
 <div className="p-2 bg-accent-500/10 rounded-xl">
 <Utensils size={16} className="text-accent-400" />
 </div>
 <span className="text-xs font-black uppercase tracking-widest text-white">
 {t('meal.your_plate', { defaultValue: i18n.t('auto.twoj_talerz', { defaultValue: "Centrum Żywieniowe" }) })}
 </span>
 <span className="bg-accent-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
 {plate.length}
 </span>
 </div>
 <button
 onClick={() => {
 Haptics.impact();
 setPlate([]);
 }}
 className="text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 px-4 py-2 rounded-xl active:bg-rose-500 active:text-white transition-all"
 >
 {t('meal.clear', { defaultValue: i18n.t('auto.wyczysc', { defaultValue: "Wyczyść" }) })}
 </button>
 </div>

 <motion.div
 variants={{
 hidden: { opacity: 0 },
 show: { opacity: 1, transition: { staggerChildren: 0.1 } },
 }}
 initial="hidden"
 animate="show"
 className="space-y-3 mb-8"
 >
 <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1 font-mono">
 {t('meal.ingredients_list', { defaultValue: i18n.t('auto.skladniki', { defaultValue: "Składniki:" }) })}
 </h5>
 <AnimatePresence>
 {plate.map((item, idx) => (
 <motion.div
 layout
 variants={{
 hidden: { opacity: 0, x: -20, scale: 0.95 },
 show: {
 opacity: 1,
 x: 0,
 scale: 1,
 transition: {
 type: "spring",
 stiffness: 350,
 damping: 25,
 },
 },
 }}
 initial="hidden"
 animate="show"
 exit={{
 opacity: 0,
 x: 20,
 scale: 0.95,
 transition: { duration: 0.2 },
 }}
 key={item.plateItemId || `${item.id}-${idx}`}
 >
 <SwipeableItem
 id={item.plateItemId || `${item.id}-${idx}`}
 onDelete={() => removeFromPlate(idx)}
 bgClass="bg-slate-900"
 >
 <div className="bg-white/10 p-4 rounded-[1.5rem] flex justify-between items-center text-[10px] font-bold group border border-transparent hover:border-accent-500/30 transition-all">
 <div className="flex-1 pr-4">
 <div className="text-sm font-black mb-1.5 text-white">
 {getProductName(item, i18n.language)}
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[9px] uppercase tracking-tighter opacity-50 font-black">
 {t('meal.weight_label', { defaultValue: 'Waga:' })}
 </span>
 <div className="flex items-center bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
 <input
 type="number"
 value={item.weight}
 onChange={(e) =>
 updateWeight(
 idx,
 parseFloat(e.target.value) || 0,
 )
 }
 className="bg-transparent w-10 text-center outline-none text-accent-300 font-black"
 />
 <span className="text-[8px] opacity-40 ml-1">
 g
 </span>
 </div>
 </div>
 </div>
 <div className="text-right flex flex-col items-end gap-1">
 <div className="text-accent-400 font-black text-sm">
 {((item.carbs * item.weight) / 100).toFixed(1)}g
 </div>
 <div className="flex gap-1">
 <div
 className={cn(
 "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
 typeof item.gi === "number"
 ? item.gi <= 55
 ? "bg-emerald-500/20 text-emerald-400"
 : item.gi < 70
 ? "bg-amber-500/20 text-amber-400"
 : "bg-rose-500/20 text-rose-400"
 : "bg-slate-500/20 text-slate-400",
 )}
 >
 
 {t('auto.ig', { defaultValue: 'IG:' })} {typeof item.gi === "number" ? item.gi : "??*"}
 </div>
 {typeof item.gi === "number" &&
 (() => {
 const glValue =
 (((item.carbs * item.weight) / 100) * item.gi) /
 100;
 return (
 <div
 className={cn(
 "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
 glValue <= 10
 ? "bg-emerald-500/20 text-emerald-400"
 : glValue < 20
 ? "bg-amber-500/20 text-amber-400"
 : "bg-rose-500/20 text-rose-400",
 )}
 >
 
 {t('auto.łg', { defaultValue: i18n.t('auto.lg', { defaultValue: "ŁG:" }) })} {glValue.toFixed(1)}
 </div>
 );
 })()}
 </div>
 </div>
 </div>
 </SwipeableItem>
 </motion.div>
 ))}
 </AnimatePresence>
 </motion.div>

 <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5 glass-target">
 <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
 {t('meal.thermal_processing', { defaultValue: i18n.t('auto.obrobka_termiczna_posilku', { defaultValue: "Obróbka Termiczna Posiłku" }) })}
 </h5>
 <div className="flex flex-wrap gap-2">
 {[
 { id: "raw", label: t('meal.method_raw', { defaultValue: 'Brak / Surowe' }) },
 { id: "boiled", label: t('meal.method_boiled', { defaultValue: 'Gotowane' }) },
 { id: "baked", label: t('meal.method_baked', { defaultValue: 'Pieczone' }) },
 { id: "fried", label: t('meal.method_fried', { defaultValue: i18n.t('auto.smazone_na_tluszczu', { defaultValue: "Smażone na tłuszczu" }) }) },
 { id: "blended", label: t('meal.method_blended', { defaultValue: 'Zblendowane' }) },
 ].map((method) => (
 <button
 key={method.id}
 onClick={() => {
 Haptics.selection();
 setCookingMethod(method.id as any);
 }}
 className={cn(
 "text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all",
 cookingMethod === method.id
 ? "bg-accent-500 text-white"
 : "bg-white/5 text-slate-400 hover:bg-white/10",
 )}
 >
 {method.label}
 </button>
 ))}
 </div>
 {cookingMethod === "fried" && (
 <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
 {t('meal.alert_fried', { defaultValue: i18n.t('auto.uwaga_smazenie_automatycz', { defaultValue: "Uwaga: Smażenie automatycznie dodaje ~10g tłuszczu na 100g składników. Obniża IG, ale podbija WBT i Kcal." }) })}
 </p>
 )}
 {cookingMethod === "boiled" && (
 <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
 {t('meal.alert_boiled', { defaultValue: i18n.t('auto.gotowanie_moze_mocno_podn', { defaultValue: "Gotowanie może mocno podnieść IG węglowodanów (np. stają się szybciej przyswajalne)." }) })}
 </p>
 )}
 {cookingMethod === "baked" && (
 <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
 {t('meal.alert_baked', { defaultValue: 'Pieczenie podnosi Indeks Glikemiczny potrawy.' })}
 </p>
 )}
 {cookingMethod === "blended" && (
 <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
 {t('meal.alert_blended', { defaultValue: i18n.t('auto.rozdrabnianie_blendowanie', { defaultValue: "Rozdrabnianie (blendowanie) ułatwia trawienie i podnosi IG." }) })}
 </p>
 )}
 </div>

 {(() => {
 const dietAlerts = [];
 if (settings?.activeDiet) {
 if (settings.activeDiet === "keto" && totalCarbs > 20) {
 dietAlerts.push(
 t('meal.diet_alert_keto_carbs', { defaultValue: i18n.t('auto.posilek_dostarczy_ponad_2', { defaultValue: "Posiłek dostarczy ponad 20g węgl., co mocno utrudnia pobyt w ketozie (Keto)!" }) })
 );
 } else if (
 settings.activeDiet === "keto" &&
 fatPct > carbsPct + proteinPct
 ) {
 dietAlerts.push({
 text: t('meal.diet_alert_keto_success', { defaultValue: i18n.t('auto.swietny_stosunek_makro_dl', { defaultValue: "Świetny stosunek makro dla diety Keto!" }) }),
 type: "success",
 });
 }

 if (settings.activeDiet === "plate") {
 if (carbsPct > 40)
 dietAlerts.push(
 t('meal.diet_alert_plate_carbs', { defaultValue: i18n.t('auto.zbyt_duza_przewaga_weglow', { defaultValue: "Zbyt duża przewaga węglowodanów względem talerza (Pamiętaj by 1/4 stanowiły węgle)." }) })
 );
 if (proteinPct < 15)
 dietAlerts.push(
 t('meal.diet_alert_plate_protein', { defaultValue: i18n.t('auto.odrobine_za_malo_bialka_w', { defaultValue: "Odrobinę za mało białka w porcji. (Pamiętaj by 1/4 stanowiło białko)." }) })
 );
 }
 }

 if (dietAlerts.length > 0) {
 return (
 <div className="mb-6 space-y-2">
 {dietAlerts.map((a, i) => {
 const isSuccess =
 typeof a === "object" && a.type === "success";
 const msg = typeof a === "object" ? a.text : a;
 return (
 <div
 key={i}
 className={cn(
 "p-4 rounded-2xl border",
 isSuccess
 ? "bg-emerald-500/10 border-emerald-500/20"
 : "bg-rose-500/10 border-rose-500/20",
 )}
 >
 <h5
 className={cn(
 "text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1",
 isSuccess ? "text-emerald-400" : "text-rose-400",
 )}
 >
 {isSuccess ? (
 <Leaf size={12} />
 ) : (
 <AlertTriangle size={12} />
 )}
 {t('meal.glikosense_diet', { defaultValue: 'GlikoSense: Twoja Dieta' })}
 </h5>
 <p
 className={cn(
 "text-xs font-bold leading-relaxed",
 isSuccess ? "text-emerald-300" : "text-rose-300",
 )}
 >
 {msg}
 </p>
 </div>
 );
 })}
 </div>
 );
 }
 return null;
 })()}

 {/* Makroskładniki Procentowo */}
 <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5 glass-target">
 <div className="flex justify-between items-center mb-2">
 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
 {t('meal.meal_balance', { defaultValue: i18n.t('auto.balans_posilku_energia', { defaultValue: "Balans Posiłku (Energia %)" }) })}
 </span>
 <span className="text-[10px] font-black text-accent-400">
 {Math.round(totalCalsFromMacros)} {t('auto.kcal', { defaultValue: 'kcal' })}
 </span>
 </div>

 <div className="flex h-3 w-full rounded-full overflow-hidden mb-4">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: `${carbsPct}%` }}
 className="bg-accent-500 h-full"
 title={i18n.t('auto.wegle_var0', { defaultValue: "Węgle: {{var0}}%", var0: Math.round(carbsPct) })}
 />
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: `${proteinPct}%` }}
 className="bg-emerald-500 h-full"
 title={i18n.t('auto.bialka_var0', { defaultValue: "Białka: {{var0}}%", var0: Math.round(proteinPct) })}
 />
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: `${fatPct}%` }}
 className="bg-amber-500 h-full"
 title={i18n.t('auto.tluszcze_var0', { defaultValue: "Tłuszcze: {{var0}}%", var0: Math.round(fatPct) })}
 />
 </div>

 <div className="flex flex-wrap gap-4 justify-between">
 <div className="flex items-center gap-1.5">
 <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
 <span className="text-[9px] font-bold text-slate-300">
 
 {t('auto.w', { defaultValue: 'W:' })} {carbsPct.toFixed(0)}%
 </span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 <span className="text-[9px] font-bold text-slate-300">
 
 {t('auto.b', { defaultValue: 'B:' })} {proteinPct.toFixed(0)}%
 </span>
 </div>
 <div className="flex items-center gap-1.5">
 <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
 <span className="text-[9px] font-bold text-slate-300">
 
 {t('auto.t', { defaultValue: 'T:' })} {fatPct.toFixed(0)}%
 </span>
 </div>
 </div>
 </div>

 <div className="flex justify-center flex-col items-center py-6 border-t border-white/10 mb-2 mt-2">
 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">
 {t('meal.calories_from_macros', { defaultValue: i18n.t('auto.kalorie_z_makroskladnikow', { defaultValue: "Kalorie z makroskładników" }) })}
 </span>
 <span className="text-4xl font-black text-white drop-shadow-md flex items-baseline gap-1">
 {Math.round(totalCalsFromMacros)}
 <span className="text-sm font-bold opacity-40">{t('auto.kcal', { defaultValue: 'kcal' })}</span>
 </span>
 </div>

 <div className="grid grid-cols-2 gap-4 mb-6 border-t border-white/10 pt-4">
 <div>
 <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
 {t('meal.exchanges_ww', { defaultValue: 'Wymienniki WW' })}
 </span>
 <span className="text-2xl font-black text-accent-400">
 {totalWW.toFixed(1)}
 <span className="text-xs font-bold opacity-30 ml-1">{t('auto.ww', { defaultValue: 'WW' })}</span>
 </span>
 </div>
 <div className="text-right">
 <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
 {t('meal.exchanges_wbt', { defaultValue: 'Wymienniki WBT' })}
 </span>
 <span className="text-2xl font-black text-amber-300">
 {totalWBT.toFixed(1)}
 <span className="text-xs font-bold opacity-30 ml-1">{t('auto.wbt', { defaultValue: 'WBT' })}</span>
 </span>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-2 mb-6 border-t border-white/10 pt-4">
 <div>
 <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
 {t('meal.carbohydrates', { defaultValue: i18n.t('auto.weglowodany', { defaultValue: "Węglowodany" }) })}
 </span>
 <span className="text-lg font-black text-accent-300">
 {totalCarbs.toFixed(1)}
 <span className="text-[9px] font-bold opacity-30 ml-1">g</span>
 </span>
 </div>
 <div className="text-center border-l border-white/10">
 <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
 {t('meal.protein', { defaultValue: i18n.t('auto.bialko', { defaultValue: "Białko" }) })}
 </span>
 <span className="text-lg font-black text-emerald-400">
 {totalProtein.toFixed(1)}
 <span className="text-[9px] font-bold opacity-30 ml-1">g</span>
 </span>
 </div>
 <div className="text-center border-l border-white/10">
 <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
 {t('meal.fats', { defaultValue: i18n.t('auto.tluszcze', { defaultValue: "Tłuszcze" }) })}
 </span>
 <span className="text-lg font-black text-amber-400">
 {totalFat.toFixed(1)}
 <span className="text-[9px] font-bold opacity-30 ml-1">g</span>
 </span>
 </div>
 <div className="text-right border-l border-white/10">
 <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
 {t('meal.glycemic_load_abbr', { defaultValue: i18n.t('auto.ladunek_gl', { defaultValue: "Ładunek Gl." }) })}
 </span>
 <span
 className={cn(
 "text-lg font-black",
 totalGL <= 10
 ? "text-emerald-400"
 : totalGL < 20
 ? "text-amber-400"
 : "text-rose-400",
 )}
 >
 {totalGL.toFixed(1)}
 <span className="text-[9px] font-bold opacity-30 ml-1">{t('auto.łg', { defaultValue: i18n.t('auto.lg', { defaultValue: "ŁG" }) })}</span>
 </span>
 </div>
 </div>
 <div className="flex justify-between items-center mt-6">
 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
 {t('meal.time_of_eating', { defaultValue: 'Czas podania zjedzenia:' })}
 </span>
 <input
 type="datetime-local"
 value={entryTime}
 onChange={(e) => setEntryTime(e.target.value)}
 className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] font-black p-2 rounded-xl border border-slate-100 dark:border-slate-700 outline-none"
 />
 </div>

 <div className="flex gap-2 mt-4">
 <button
 onClick={prepareToLogMeal}
 className="flex-3 bg-accent-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
 >
 {t('meal.add_to_diary', { defaultValue: 'Dodaj do Dziennika' })}
 </button>
 <button
 onClick={analyzeMeal}
 disabled={isAnalyzing}
 className="bg-slate-800 text-accent-400 p-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center min-w-[56px]"
 title={t('meal.ai_analysis_title', { defaultValue: 'Analiza AI' })}
 >
 {isAnalyzing ? (
 <Loader2 className="w-5 h-5 animate-spin" />
 ) : (
 <Zap size={20} />
 )}
 </button>
 <button
 onClick={() => saveMealToLibrary()}
 className="bg-slate-800 text-slate-400 p-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center min-w-[56px]"
 title={t('meal.save_as_template', { defaultValue: 'Zapisz jako szablon (ulubiony)' })}
 >
 <Star size={20} />
 </button>
 </div>

 {analysis && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: "auto" }}
 className="mt-4 p-4 bg-accent-950 border border-accent-800 rounded-2xl text-[12px] leading-relaxed text-accent-50 font-medium tracking-wide"
 dangerouslySetInnerHTML={{ __html: analysis }}
 />
 )}

 {settings?.treatmentMode === 'diet_only' ? (
 <button
 onClick={() => handleLogMeal()}
 className="w-full bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 py-3 rounded-xl mt-3 font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all"
 >
 {t('auto.zapisz_posilek_w_dzienni', { defaultValue: 'Zapisz posiłek w dzienniku' })}
 </button>
 ) : (
 <button
 onClick={() => {
 sessionStorage.setItem(
 "pending_meal",
 JSON.stringify({
 carbs: Math.round(totalCarbs * 10) / 10,
 protein: Math.round(totalProtein * 10) / 10,
 fat: Math.round(totalFat * 10) / 10,
 name: plate.map((i) => i.name).join(", ") || t('meal.custom_meal', { defaultValue: i18n.t('auto.wlasny_posilek', { defaultValue: "Własny posiłek" }) }),
 items: plate,
 }),
 );
 setTab("bolus");
 }}
 className="w-full bg-slate-800 py-3 rounded-xl mt-3 font-black text-[9px] uppercase tracking-widest text-slate-400 active:scale-95 transition-all"
 >
 {t('meal.go_to_calculator', { defaultValue: i18n.t('auto.przejdz_do_kalkulatora', { defaultValue: "Przejdź do Kalkulatora" }) })}
 </button>
 )}

 {/* Dynamic absorption wizard for composing food - ALWAYS at the bottom as requested */}
 <div className="mt-6 border-t border-white/10 pt-6">
 <div className="flex justify-between items-center mb-4">
 <div>
 <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
 <Zap size={14} className="text-accent-400 animate-pulse" />
 {t('meal.absorption_profile', { defaultValue: i18n.t('auto.profil_wchlaniania_posilk', { defaultValue: "Profil wchłaniania posiłku" }) })}
 </h4>
 <p className="text-[10px] text-slate-400">
 {t('meal.absorption_profile_desc', { defaultValue: i18n.t('auto.planowane_tempo_uwalniani', { defaultValue: "Planowane tempo uwalniania się energii ze składników na talerzu" }) })}
 </p>
 </div>
 <div className="text-right">
 <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">
 {t('meal.absorption_end', { defaultValue: i18n.t('auto.koniec_wchlaniania', { defaultValue: "Koniec wchłaniania" }) })}
 </span>
 <span className="text-xs font-black text-accent-300">
 {new Date(
 new Date(entryTime).getTime() +
 getMealAbsorptionTime(totalWW, totalWBT) * 60 * 60 * 1000
 ).toLocaleTimeString([], {
 hour: "2-digit",
 minute: "2-digit",
 })}
 </span>
 </div>
 </div>

 <div className="h-32 w-full select-none mt-2">
 <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100} initialDimension={{ width: 320, height: 128 }}>
 <AreaChart
 data={plateChartData}
 margin={{ top: 5, right: 10, left: -22, bottom: 0 }}
 >
 <defs>
 <linearGradient
 id="colorPosilekPlate"
 x1="0"
 y1="0"
 x2="0"
 y2="1"
 >
 <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
 <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
 </linearGradient>
 </defs>
 <XAxis
 dataKey="time"
 stroke="#475569"
 fontSize={8}
 tickLine={false}
 axisLine={false}
 />
 <YAxis hide />
 <Tooltip
 contentStyle={{
 backgroundColor: "rgba(15, 23, 42, 0.9)",
 border: "1px solid #1e293b",
 borderRadius: "12px",
 fontSize: "10px",
 color: "#f8fafc",
 }}
 labelStyle={{ color: "#94a3b8" }}
 formatter={(value: any, name: any) => [`${value} ${t('meal.unit', { defaultValue: 'jedn.' })}`, t('meal.absorption_profile_tooltip', { defaultValue: i18n.t('auto.profil_wchlaniania', { defaultValue: "Profil wchłaniania" }) })]}
 />
 <Area
 type="monotone"
 dataKey="Posiłek" name={i18n.t('auto.posilek', { defaultValue: 'Posiłek' })}
 stroke="#f43f5e"
 strokeWidth={2.5}
 fillOpacity={1}
 fill="url(#colorPosilekPlate)"
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 <p className="text-[8px] text-slate-400 mt-2 text-center italic">
 {t('meal.chart_disclaimer', { defaultValue: i18n.t('auto.wykres_przedstawia_dynami', { defaultValue: "*Wykres przedstawia dynamiczną krzywą metaboliczną na podstawie wskaźnika IG oraz WBT dodanych składników." }) })}
 </p>
 </div>
 </div>
 )}
 </>
 );
};

