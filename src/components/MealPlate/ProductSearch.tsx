import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2, Globe, Mic, Plus, Info, Scale, Share2, BookMarked, Tag, X, Scan, Camera } from "lucide-react";
import { Haptics } from "../../lib/haptics";
import { useMealPlateStore } from "../../stores/useMealPlateStore";
import { Product } from "../../types/product";
import { getProductName } from "../FoodDatabase";
import { geminiService } from "../../services/gemini";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import i18n from "../../i18n";
import SwipeableItem from "../SwipeableItem";
import { cn } from "../../lib/utils";

const getDietBadge = (product: Product, activeDiet: string | null) => {
 if (!activeDiet) return null;
 let isGood = false;
 let badge = "";
 if (activeDiet === "keto") {
 if ((product.carbs || 0) > 10) { isGood = false; badge = "High Carbs"; }
 else { isGood = true; badge = "Keto-friendly"; }
 } else if (activeDiet === "low-carb") {
 if ((product.carbs || 0) > 20) { isGood = false; badge = "High Carbs"; }
 else { isGood = true; badge = "Low-Carb"; }
 } else if (activeDiet === "low-gi") {
 if ((product.gi || 50) > 55) { isGood = false; badge = "High-GI"; }
 else { isGood = true; badge = "Low-GI"; }
 }
 if (!badge) return null;
 return (
 <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${isGood ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"}`}>
 {badge}
 </span>
 );
};

export const ProductSearch = ({
 openWeightModal,
 openShortcutConfirmModal,
 publishToCommunity,
 saveToCustomDb,
 handleScrollHaptics,
 addToPlate,
 settings,
 allLocal,
 mode,
 startScanner,
 startCameraAnalysis,
 isAnalyzing
}: any) => {
 const { t } = useTranslation();
 
 const {
 searchTerm, setSearchTerm,
 onlineResults, setOnlineResults,
 isSearching, setIsSearching
 } = useMealPlateStore();

 const [isListening, setIsListening] = useState(false);
 const [activeCategory, setActiveCategory] = useState("all");
 const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

 useEffect(() => {
   const handler = setTimeout(() => {
     setSearchTerm(localSearchTerm);
   }, 300);
   return () => clearTimeout(handler);
 }, [localSearchTerm]);

 const startVoiceSearch = () => {
 if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
 toast.error("Brak obsługi rozpoznawania głosu.");
 return;
 }
 const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
 const recognition = new SpeechRecognition();
 recognition.lang = "pl-PL";
 recognition.continuous = false;
 recognition.interimResults = false;
 recognition.onstart = () => { setIsListening(true); Haptics.light(); };
 recognition.onresult = (event: any) => {
 const transcript = event.results[0][0].transcript;
 setSearchTerm(transcript);
 setLocalSearchTerm(transcript);
 performOnlineSearch(transcript);
 };
 recognition.onerror = () => { setIsListening(false); toast.error("Błąd rozpoznawania głosu."); };
 recognition.onend = () => setIsListening(false);
 recognition.start();
 };

 const performOnlineSearch = async (query: string) => {
 if (!query.trim()) return;
 setIsSearching(true);
 try {
 const results = await geminiService.searchFood(query);
 if (results && results.length > 0) setOnlineResults(results);
 else toast.error("Brak wyników.");
 } catch (err: any) {
 toast.error("Błąd wyszukiwania.");
 } finally {
 setIsSearching(false);
 }
 };

 const handleOnlineSearch = () => performOnlineSearch(localSearchTerm);

 const browseResults = useMemo(() => {
 if (!allLocal) return [];
 let base = allLocal;
 if (activeCategory === "custom") base = base.filter((p: Product) => p.isCustom);
 else if (activeCategory === "community") base = base.filter((p: Product) => p.isCommunity);
 else if (activeCategory !== "all") base = base.filter((p: Product) => p.category === activeCategory);
 
 if (searchTerm.trim()) {
 const term = searchTerm.toLowerCase();
 base = base.filter((p: Product) => {
 const name = getProductName(p, i18n.language).toLowerCase();
 return name.includes(term) || (p.brand && p.brand.toLowerCase().includes(term));
 });
 }
 return base;
 }, [allLocal, activeCategory, searchTerm]);

 return (
 <>
 <div className="p-4 sm:p-5 flex flex-col gap-3">
 <div className="relative group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent-500 transition-colors" size={18} />
 <input
 type="text"
 placeholder="Szukaj produktów..."
 value={localSearchTerm}
 onChange={(e) => setLocalSearchTerm(e.target.value)}
 onKeyDown={(e) => { if (e.key === "Enter") handleOnlineSearch(); }}
 className="w-full bg-white dark:bg-slate-800/80 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-2xl py-3.5 pl-11 pr-24 text-sm font-bold border-2 border-transparent focus:border-accent-500/20 dark:focus:border-accent-500/20 focus:ring-4 focus:ring-accent-500/10 outline-none transition-all shadow-sm"
 />
 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
 {localSearchTerm && (
 <button onClick={() => setLocalSearchTerm("")} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all">
 <X size={16} strokeWidth={3} />
 </button>
 )}
 <button onClick={handleOnlineSearch} disabled={!localSearchTerm.trim() || isSearching} className="p-2 text-white bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:hover:bg-accent-500 rounded-xl transition-all">
 {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
 </button>
 </div>
 </div>

 <div className="flex gap-2 pb-1 overflow-x-auto hide-scrollbar snap-x snap-mandatory">
 <button onClick={startScanner} className="snap-start shrink-0 flex items-center gap-2 bg-white dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 hover:text-accent-500 hover:border-accent-200 transition-all active:scale-95 shadow-sm">
 <Scan size={18} strokeWidth={2.5} className="text-accent-500" />
 <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white">{t('meal.barcode_scanner', { defaultValue: 'Kody Kreskowe' })}</span>
 </button>

 <button onClick={startCameraAnalysis} className="snap-start shrink-0 flex items-center gap-2 bg-white dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 hover:text-accent-500 hover:border-accent-200 transition-all active:scale-95 shadow-sm">
 {isAnalyzing ? <Loader2 size={18} className="animate-spin text-rose-500" /> : <Camera size={18} strokeWidth={2.5} className="text-accent-500" />}
 <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white">{t('meal.ai_camera', { defaultValue: 'Aparat AI' })}</span>
 </button>

 <button onClick={startVoiceSearch} className="snap-start shrink-0 flex items-center gap-2 bg-white dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 hover:text-accent-500 hover:border-accent-200 transition-all active:scale-95 shadow-sm">
 <Mic size={18} strokeWidth={2.5} className={isListening ? "text-rose-500 animate-pulse" : "text-accent-500"} />
 <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white">{t('meal.voice_search', { defaultValue: 'Głosowe' })}</span>
 </button>
 </div>
 </div>
 
 <>
 <div className="px-4 sm:px-5 mb-4">
 {searchTerm.trim() ? (
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Wyniki wyszukiwania</h3>
 </div>
 ) : null}
 <div className="flex items-center gap-2 overflow-x-auto pb-4 -mb-4 snap-x snap-mandatory hide-scrollbar">
 {['all', 'custom', 'community', 'nabiał', 'mięso', 'owoce', 'warzywa', 'zbożowe'].map((cat) => (
 <button
 key={cat}
 onClick={() => { setActiveCategory(cat); Haptics.light(); }}
 className={cn(
 "snap-start px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border-2",
 activeCategory === cat ? "bg-slate-800 text-white" : "bg-white text-slate-500"
 )}
 >
 {cat}
 </button>
 ))}
 </div>
 </div>

 <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-8 space-y-3" onScroll={handleScrollHaptics}>
 
 {isSearching && (
 <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-accent-500" size={32} /></div>
 )}

 {onlineResults.length > 0 && (
 <div className="space-y-3 mb-6">
 <h3 className="text-xs font-black text-accent-500 uppercase tracking-widest px-2">Baza Online (FatSecret / OpenFoodFacts)</h3>
 {onlineResults.map((p, i) => (
 <motion.div key={'online-'+i} initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: i*0.05}}>
 <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-sm" onClick={() => openWeightModal(p)}>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{getProductName(p, i18n.language)}</h4>
 {getDietBadge(p, settings?.activeDiet || null)}
 </div>
 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
 <span>{p.carbs}g Węgle</span>
 <span>{p.protein}g Białko</span>
 <span>{p.fat}g Tłuszcz</span>
 </div>
 </div>
 </div>
 </motion.div>
 ))}
 </div>
 )}

 {browseResults.length > 0 ? (
 <div className="space-y-3">
 {searchTerm.trim() && <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Lokalna Baza ({browseResults.length})</h3>}
 <AnimatePresence>
 {browseResults.map((p, i) => (
 <motion.div
 key={p.id + "-" + i}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95 }}
 transition={{ duration: 0.2, delay: i * 0.05 }}
 layout
 >
 <SwipeableItem onSwipeLeft={() => {}} disabled={true}>
 <div
 onClick={() => openWeightModal(p)}
 className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 hover:border-accent-500/30 transition-all cursor-pointer shadow-sm relative group"
 >
 <div className="flex-1 min-w-0 py-1">
 <div className="flex items-center gap-2 mb-1 flex-wrap">
 <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
 {getProductName(p, i18n.language)}
 </h4>
 {getDietBadge(p, settings?.activeDiet || null)}

 </div>
 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
 <span>
 {t('meal.carbs_long', { defaultValue: i18n.t('auto.wegle', { defaultValue: "Węgle:" }) })}{" "}
 {Number(p.carbs || 0).toFixed(1)}g
 </span>
 <span>
 {t('meal.protein_long', { defaultValue: i18n.t('auto.bialko', { defaultValue: "Białko:" }) })}{" "}
 {Number(p.protein || 0).toFixed(1)}g
 </span>
 <span>
 {t('meal.fat_long', { defaultValue: i18n.t('auto.tluszcz', { defaultValue: "Tłuszcz:" }) })}{" "}
 {Number(p.fat || 0).toFixed(1)}g
 </span>
 </div>
 </div>
 {p.isCustom && (
 <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-widest">
 <BookMarked size={12} />
 </div>
 )}
 {p.isCommunity && (
 <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-500 text-[9px] font-black uppercase tracking-widest">
 <Globe size={12} />
 </div>
 )}
 </div>
 </SwipeableItem>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 ) : (
 <div className="text-center py-12 p-8 bg-slate-100 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
 <p className="text-xs font-bold text-slate-400">Brak wyników lokalnych.</p>
 </div>
 )}
 
 </div>
</>
 </>
 );
};
