import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2, Globe, Mic, Plus, Info, Scale, Share2, BookMarked, Tag, X, Scan, Camera, Barcode } from "lucide-react";
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
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as CapSpeechRecognition } from "@capacitor-community/speech-recognition";

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

 useEffect(() => {
   if (!searchTerm.trim()) {
     setOnlineResults([]);
   }
 }, [searchTerm, setOnlineResults]);

  const startVoiceSearch = async () => {
    if (isListening) return;
    
    if (Capacitor.isNativePlatform()) {
      try {
        const permStatus = await CapSpeechRecognition.checkPermissions();
        if (permStatus.speechRecognition !== 'granted') {
          const reqStatus = await CapSpeechRecognition.requestPermissions();
          if (reqStatus.speechRecognition !== 'granted') {
            toast.error("Brak uprawnień do mikrofonu! Zezwól na nagrywanie w ustawieniach Androida.");
            return;
          }
        }
        setIsListening(true);
        Haptics.light();
        const { matches } = await CapSpeechRecognition.start({
          language: 'pl-PL',
          maxResults: 1,
          prompt: i18n.t('auto.mow_teraz', { defaultValue: 'Mów teraz...' }),
          partialResults: false,
          popup: true
        });
        if (matches && matches.length > 0) {
          const transcript = matches[0];
          setSearchTerm(transcript);
          setLocalSearchTerm(transcript);
          performOnlineSearch(transcript);
        }
        setIsListening(false);
        return;
      } catch (e) {
        console.error('Native speech recognition error:', e);
        setIsListening(false);
        toast.error("Nie udało się uruchomić mikrofonu natywnego.");
        return;
      }
    }

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("Brak obsługi rozpoznawania głosu.");
      return;
    }
    const SpeechRecAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecAPI();
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

  const normalizeStr = (str: string) => {
    return (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ł/g, "l")
      .replace(/Ł/g, "L")
      .trim();
  };

  const browseResults = useMemo(() => {
    if (!allLocal) return [];
    let base = allLocal;
    if (activeCategory === "meals") {
      base = base.filter((p: any) => Boolean(p.isSavedMeal));
    } else if (activeCategory === "custom") {
      base = base.filter((p: any) => Boolean(p.isCustom) && !p.isSavedMeal);
    } else if (activeCategory === "community") {
      base = base.filter((p: Product) => Boolean(p.isCommunity));
    } else if (activeCategory !== "all") {
      base = base.filter((p: Product) => (p.category || "").toLowerCase().includes(activeCategory.toLowerCase()));
    }
  
    const rawTerm = searchTerm.trim();
    if (!rawTerm) {
      return base.sort((a, b) => {
        if (activeCategory === "meals") {
          return (b.timestamp || 0) - (a.timestamp || 0);
        }
        return getProductName(a, i18n.language).localeCompare(getProductName(b, i18n.language), 'pl');
      });
    }

    const termNorm = normalizeStr(rawTerm);

    // Scoring dla wyszukiwania opartego o trafność prefiksową
    const scored = base.map((p: any) => {
      const name = getProductName(p, i18n.language);
      const nameNorm = normalizeStr(name);
      const words = nameNorm.split(/\s+/);

      let score = 0;
      if (nameNorm.startsWith(termNorm)) {
        score = 100; // Nazwa zaczyna się dokładnie od szukanej frazy (np. "Ser" dla "s")
      } else if (words.some(w => w.startsWith(termNorm))) {
        score = 80; // Któreś ze słów zaczyna się od frazy (np. "Chleb słonecznikowy")
      } else if (nameNorm.includes(termNorm)) {
        score = 50; // Zawiera frazę w środku słowa
      } else if (p.brand && normalizeStr(p.brand).includes(termNorm)) {
        score = 30; // Marka
      } else if (p.recipe && normalizeStr(p.recipe).includes(termNorm)) {
        score = 10; // W treści przepisu
      }

      return { product: p, score, nameNorm };
    }).filter(item => item.score > 0);

    return scored.sort((a, b) => {
      // 1. Najwyższy wynik trafności
      if (b.score !== a.score) return b.score - a.score;
      // 2. Krótsza nazwa (bardziej precyzyjne dopasowanie)
      if (a.nameNorm.length !== b.nameNorm.length) return a.nameNorm.length - b.nameNorm.length;
      // 3. Alfabetycznie
      return a.nameNorm.localeCompare(b.nameNorm, 'pl');
    }).map(item => item.product);
  }, [allLocal, activeCategory, searchTerm]);

  return (
  <>
  {isAnalyzing && (
  <div className="mx-4 sm:mx-5 mt-3 flex items-center justify-between bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-3.5 rounded-2xl shadow-xl border border-white/20 animate-pulse">
  <div className="flex items-center gap-3">
  <Loader2 size={20} className="animate-spin text-white shrink-0" />
  <div className="flex flex-col">
  <span className="text-xs font-black uppercase tracking-wider">Aparat AI Analizuje Posiłek</span>
  <span className="text-[11px] font-bold text-indigo-100">Rozpoznawanie produktów i przeliczanie węgli...</span>
  </div>
  </div>
  </div>
  )}

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
 <Barcode size={18} strokeWidth={2.5} className="text-accent-500" />
 <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white">{t('meal.barcode_scanner', { defaultValue: 'Kody' })}</span>
 </button>

  <button onClick={startCameraAnalysis} className="snap-start shrink-0 flex items-center gap-2 bg-white dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 hover:text-accent-500 hover:border-accent-200 transition-all active:scale-95 shadow-sm">
  {isAnalyzing ? <Loader2 size={18} className="animate-spin text-rose-500" /> : <Camera size={18} strokeWidth={2.5} className="text-accent-500" />}
  <div className="flex flex-col text-left">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white leading-tight">{t('meal.ai_camera', { defaultValue: 'Aparat AI' })}</span>
    <span className="text-[7.5px] font-bold text-indigo-500 dark:text-indigo-400 leading-none mt-0.5">Talerz • Menu • Etykieta</span>
  </div>
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
  {[
    { id: 'all', label: 'Wszystkie' },
    { id: 'meals', label: 'Posiłki' },
    { id: 'custom', label: 'Własne' },
    { id: 'community', label: 'Społeczność' },
    { id: 'nabiał', label: 'Nabiał' },
    { id: 'mięso', label: 'Mięso i Ryby' },
    { id: 'owoce', label: 'Owoce' },
    { id: 'warzywa', label: 'Warzywa' },
    { id: 'zbożowe', label: 'Zbożowe' }
  ].map((cat) => (
  <button
  key={cat.id}
  onClick={() => { setActiveCategory(cat.id); Haptics.light(); }}
  className={cn(
  "snap-start px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border-2 cursor-pointer",
  activeCategory === cat.id ? "bg-slate-800 text-white dark:bg-accent-500 border-slate-800 dark:border-accent-500 shadow-sm" : "bg-white text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200 dark:border-slate-700/50"
  )}
  >
  {cat.label}
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
 <div className="flex gap-1">
       <span className={cn(
         "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
         p.gi === undefined || p.gi === null ? "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400" :
         p.gi <= 55 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
         p.gi <= 69 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
         "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
       )}>IG: {p.gi ?? '?'}</span>
       <span className={cn(
         "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
         p.gi === undefined || p.gi === null ? "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400" :
         ((p.gi * (p.carbs || 0)) / 100) <= 10 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
         ((p.gi * (p.carbs || 0)) / 100) <= 19 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
         "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
       )}>ŁG: {p.gi !== undefined && p.gi !== null ? ((p.gi * (p.carbs || 0)) / 100).toFixed(1) : '?'}</span>
     </div>
 </div>
 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
 <span>{p.carbs}g Węgle</span>
 <span>{p.protein}g Białko</span>
 <span>{p.fat}g Tłuszcz</span>
 </div>
 </div>
 <div className="flex flex-col gap-1 ml-2 shrink-0">
  <button onClick={(e) => { e.stopPropagation(); saveToCustomDb && saveToCustomDb(p); }} className="p-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg hover:bg-indigo-100 transition-all" title="Zapisz do własnych">
    <BookMarked size={14} />
  </button>
  <button onClick={(e) => { e.stopPropagation(); openShortcutConfirmModal && openShortcutConfirmModal(p); }} className="p-2 text-amber-500 bg-amber-50 dark:bg-amber-500/10 rounded-lg hover:bg-amber-100 transition-all" title="Skrót posiłku">
    <Plus size={14} />
  </button>
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
 <div className="flex gap-1">
       <span className={cn(
         "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
         p.gi === undefined || p.gi === null ? "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400" :
         p.gi <= 55 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
         p.gi <= 69 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
         "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
       )}>IG: {p.gi ?? '?'}</span>
       <span className={cn(
         "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
         p.gi === undefined || p.gi === null ? "bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400" :
         ((p.gi * (p.carbs || 0)) / 100) <= 10 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
         ((p.gi * (p.carbs || 0)) / 100) <= 19 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
         "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
       )}>ŁG: {p.gi !== undefined && p.gi !== null ? ((p.gi * (p.carbs || 0)) / 100).toFixed(1) : '?'}</span>
     </div>
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
 <div className="flex flex-col gap-1 ml-2 shrink-0">
  {p.isCustom && !p.isCommunity && (
    <button onClick={(e) => { e.stopPropagation(); publishToCommunity && publishToCommunity(p); }} className="p-2 text-teal-500 bg-teal-50 dark:bg-teal-500/10 rounded-lg hover:bg-teal-100 transition-all" title="Opublikuj">
      <Globe size={14} />
    </button>
  )}
  <button onClick={(e) => { e.stopPropagation(); openShortcutConfirmModal && openShortcutConfirmModal(p); }} className="p-2 text-amber-500 bg-amber-50 dark:bg-amber-500/10 rounded-lg hover:bg-amber-100 transition-all" title="Skrót posiłku">
    <Plus size={14} />
  </button>
 </div>
 </div>
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


