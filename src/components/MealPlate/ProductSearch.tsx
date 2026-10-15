import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Loader2,
  Globe,
  Mic,
  Plus,
  BookMarked,
  X,
  Camera,
  Barcode,
  Star,
  Clock
} from "lucide-react";
import { Haptics } from "../../lib/haptics";
import { useMealPlateStore } from "../../stores/useMealPlateStore";
import { Product } from "../../types";
import { getProductName, NutrientFilter } from "../FoodDatabase";
import { geminiService } from "../../services/gemini";
import { motion, AnimatePresence } from "motion/react";
import i18n from "../../i18n";
import { cn } from "../../lib/utils";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as CapSpeechRecognition } from "@capacitor-community/speech-recognition";
import { toast } from "react-hot-toast";
import { getDietBadge, isProductDietFriendly, getDietName } from "../../lib/dietHelper";
import {
  getFavoriteProductKeys,
  toggleFavoriteProduct,
  getRecentProducts
} from "../../lib/foodFavorites";

export const ProductSearch = ({
  openWeightModal,
  openShortcutConfirmModal,
  publishToCommunity,
  saveToCustomDb,
  handleScrollHaptics,
  addToPlate,
  addSavedMeal,
  settings,
  allLocal,
  mode,
  startScanner,
  startCameraAnalysis,
  isAnalyzing,
  activeDiet
}: any) => {
  const { t } = useTranslation();

  const {
    searchTerm,
    setSearchTerm,
    onlineResults,
    setOnlineResults,
    isSearching,
    setIsSearching
  } = useMealPlateStore();

  const [isListening, setIsListening] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeNutrientFilter, setActiveNutrientFilter] = useState<NutrientFilter>('all');
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [visibleCount, setVisibleCount] = useState(30);

  // Ulubione i Ostatnie produkty (zarządzane lokalnie w pamięci urządzenia)
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(() => new Set(getFavoriteProductKeys()));
  const [recentProducts, setRecentProducts] = useState<Product[]>(() => getRecentProducts());

  useEffect(() => {
    const handleFavChange = () => setFavoriteKeys(new Set(getFavoriteProductKeys()));
    const handleRecentsChange = () => setRecentProducts(getRecentProducts());
    window.addEventListener('gliko_food_favorites_changed', handleFavChange);
    window.addEventListener('gliko_food_recents_changed', handleRecentsChange);
    return () => {
      window.removeEventListener('gliko_food_favorites_changed', handleFavChange);
      window.removeEventListener('gliko_food_recents_changed', handleRecentsChange);
    };
  }, []);

  const currentActiveDiet = activeDiet || settings?.activeDiet || null;
  const activeDietLabel = getDietName(currentActiveDiet);

  const handleToggleFavorite = (p: Product) => {
    const isFav = toggleFavoriteProduct(p);
    Haptics.light();
    toast.success(
      isFav
        ? `${getProductName(p, i18n.language)}: dodano do ulubionych ⭐`
        : `${getProductName(p, i18n.language)}: usunięto z ulubionych`,
      { duration: 1800 }
    );
  };

  useEffect(() => {
    setVisibleCount(30);
  }, [searchTerm, activeCategory, activeNutrientFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearchTerm, setSearchTerm]);

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
      toast.error("Przeglądarka nie obsługuje wprowadzania głosowego.");
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "pl-PL";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      Haptics.light();
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      setLocalSearchTerm(transcript);
      performOnlineSearch(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const performOnlineSearch = async (term: string) => {
    if (!term.trim()) return;
    setIsSearching(true);
    try {
      const results = await geminiService.searchFood(term);
      setOnlineResults(results);
      if (results.length > 0) toast.success(`Znaleziono ${results.length} wyników w sieci!`);
      else toast.error("Brak wyników.");
    } catch {
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

    if (activeCategory === "favorites") {
      base = base.filter((p: any) => favoriteKeys.has(p.id || p.name) || p.isFavorite);
    } else if (activeCategory === "recents") {
      base = recentProducts;
    } else if (activeCategory === "meals") {
      base = base.filter((p: any) => Boolean(p.isSavedMeal));
    } else if (activeCategory === "custom") {
      base = base.filter((p: any) => Boolean(p.isCustom) && !p.isSavedMeal);
    } else if (activeCategory === "community") {
      base = base.filter((p: Product) => Boolean(p.isCommunity));
    } else if (activeCategory !== "all") {
      base = base.filter((p: Product) => (p.category || "").toLowerCase().includes(activeCategory.toLowerCase()));
    }

    // Filtracja makroskładników oraz zgodności z aktywną dietą
    if (activeNutrientFilter === 'diet_match' && currentActiveDiet) {
      base = base.filter((p: Product) => isProductDietFriendly(p, currentActiveDiet));
    } else if (activeNutrientFilter === 'snack_free') {
      base = base.filter((p: Product) => (p.carbs || 0) <= 5);
    } else if (activeNutrientFilter === 'high_protein') {
      base = base.filter((p: Product) => (p.protein || 0) >= 15);
    } else if (activeNutrientFilter === 'high_fiber') {
      base = base.filter((p: Product) => ((p as any).fiber || 0) >= 5);
    } else if (activeNutrientFilter === 'fast_carbs') {
      base = base.filter((p: Product) => ((p.gi || 0) >= 65) || ((p.carbs || 0) >= 20) || (p.category || '').toLowerCase().includes('owoce') || (p.category || '').toLowerCase().includes('napoje'));
    }

    const rawTerm = searchTerm.trim();
    if (!rawTerm) {
      if (activeCategory === "recents") {
        return base;
      }
      return base.sort((a, b) => {
        if (activeCategory === "meals") {
          return (b.timestamp || 0) - (a.timestamp || 0);
        }
        return getProductName(a, i18n.language).localeCompare(getProductName(b, i18n.language), 'pl');
      });
    }

    const termNorm = normalizeStr(rawTerm);

    const getNormName = (p: any, lang: string) => {
      const cacheKey = `_norm_${lang}`;
      if (p[cacheKey]) return p[cacheKey];
      const name = getProductName(p, lang);
      const val = normalizeStr(name);
      p[cacheKey] = val;
      return val;
    };

    // Scoring dla wyszukiwania opartego o trafność prefiksową
    const scored = base.map((p: any) => {
      const nameNorm = getNormName(p, i18n.language);

      let score = 0;
      if (nameNorm.startsWith(termNorm)) {
        score = 100;
      } else {
        const words = nameNorm.split(/\s+/);
        if (words.some((w: string) => w.startsWith(termNorm))) {
          score = 80;
        } else if (nameNorm.includes(termNorm)) {
          score = 50;
        } else if (p.brand && normalizeStr(p.brand).includes(termNorm)) {
          score = 30;
        } else if (p.recipe && normalizeStr(p.recipe).includes(termNorm)) {
          score = 10;
        }
      }

      return { product: p, score, nameNorm };
    }).filter(item => item.score > 0);

    return scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aLen = a.nameNorm?.length || 0;
      const bLen = b.nameNorm?.length || 0;
      if (aLen !== bLen) return aLen - bLen;
      return (a.nameNorm || '').localeCompare(b.nameNorm || '', 'pl');
    }).map(item => item.product);
  }, [allLocal, activeCategory, searchTerm, activeNutrientFilter, favoriteKeys, recentProducts, currentActiveDiet]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    handleScrollHaptics?.(e);
    const target = e.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 350) {
      if (visibleCount < browseResults.length) {
        setVisibleCount((prev) => Math.min(prev + 30, browseResults.length));
      }
    }
  };

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
            placeholder={t('meal.search_placeholder', { defaultValue: 'Szukaj produktów (np. chleb, jajko, jabłko)...' })}
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
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white">{t('meal.barcode_scanner', { defaultValue: 'Kody EAN' })}</span>
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

      <div className="px-4 sm:px-5 mb-4">
        {searchTerm.trim() ? (
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Wyniki wyszukiwania</h3>
          </div>
        ) : null}

        {/* Kategorie: Ulubione ⭐, Ostatnie 🕒, Wszystkie, itp. */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 -mb-4 snap-x snap-mandatory hide-scrollbar">
          {[
            { id: 'favorites', label: `⭐ ${t('food.tab_favorites', { defaultValue: 'Ulubione' })}`, count: favoriteKeys.size },
            { id: 'recents', label: `🕒 ${t('food.tab_recents', { defaultValue: 'Ostatnie' })}`, count: recentProducts.length },
            { id: 'all', label: t('food.tab_all', { defaultValue: 'Wszystkie' }) },
            { id: 'meals', label: t('food.tab_meals', { defaultValue: 'Zestawy' }) },
            { id: 'custom', label: t('food.tab_custom', { defaultValue: 'Własne' }) },
            { id: 'community', label: t('food.tab_community', { defaultValue: 'Społeczność' }) },
            { id: 'posiłki', label: t('food.tab_dishes', { defaultValue: 'Dania i Zupy' }) },
            { id: 'zbożowe', label: t('food.tab_bakery', { defaultValue: 'Zbożowe' }) },
            { id: 'nabiał', label: t('food.tab_dairy', { defaultValue: 'Nabiał' }) },
            { id: 'mięso', label: t('food.tab_meat', { defaultValue: 'Mięso i Ryby' }) },
            { id: 'owoce', label: t('food.tab_produce', { defaultValue: 'Owoce i Warzywa' }) },
            { id: 'słodycze', label: t('food.tab_sweets', { defaultValue: 'Słodycze' }) },
            { id: 'napoje', label: t('food.tab_drinks', { defaultValue: 'Napoje' }) }
          ].map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); Haptics.light(); }}
              className={cn(
                "snap-start px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all border-2 cursor-pointer flex items-center gap-1.5",
                activeCategory === cat.id
                  ? "bg-slate-800 text-white dark:bg-accent-500 border-slate-800 dark:border-accent-500 shadow-sm"
                  : "bg-white text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200 dark:border-slate-700/50"
              )}
            >
              <span>{cat.label}</span>
              {typeof cat.count === 'number' && cat.count > 0 && (
                <span className={cn(
                  "text-[9px] px-1.5 py-0.2 rounded-full font-black",
                  activeCategory === cat.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}>
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Szybkie filtry kulinarne makroskładników oraz zgodności z aktywną dietą */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2.5 scrollbar-none">
          {[
            { id: 'all', label: t('food.filter_all', { defaultValue: 'Wszystkie' }), icon: null },
            ...(currentActiveDiet ? [{ id: 'diet_match', label: `Zgodne z dietą (${activeDietLabel})`, icon: '✨' }] : []),
            { id: 'snack_free', label: t('food.filter_snack_free', { defaultValue: 'Lekkie (<5g W)' }), icon: '🌱' },
            { id: 'high_protein', label: t('food.filter_high_protein', { defaultValue: 'Wysokobiałkowe (≥15g B)' }), icon: '🍗' },
            { id: 'high_fiber', label: t('food.filter_high_fiber', { defaultValue: 'Bogate w błonnik (≥5g Bł)' }), icon: '🌾' },
            { id: 'fast_carbs', label: t('food.filter_fast_carbs', { defaultValue: 'Szybka energia' }), icon: '⚡' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                Haptics.selectionStart();
                setActiveNutrientFilter(f.id as NutrientFilter);
              }}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border active:scale-95 cursor-pointer",
                activeNutrientFilter === f.id
                  ? "bg-accent-500 text-white border-accent-600 shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700/60"
              )}
            >
              {f.icon && <span className="text-xs">{f.icon}</span>}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-8 space-y-3" onScroll={handleScroll}>
        {isSearching && (
          <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-accent-500" size={32} /></div>
        )}

        {onlineResults.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-xs font-black text-accent-500 uppercase tracking-widest px-2">Baza Online (FatSecret / OpenFoodFacts)</h3>
            {onlineResults.map((p, i) => {
              const isFav = favoriteKeys.has(p.id || p.name) || Boolean(p.isFavorite);
              return (
                <motion.div key={'online-' + i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer" onClick={() => openWeightModal(p)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{getProductName(p, i18n.language)}</h4>
                        {getDietBadge(p, currentActiveDiet)}
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
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(p); }}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          isFav
                            ? "text-amber-500 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100"
                            : "text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-slate-700/60"
                        )}
                        title={isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych ⭐"}
                      >
                        <Star size={14} className={isFav ? "fill-amber-400 text-amber-500" : ""} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); saveToCustomDb && saveToCustomDb(p); }} className="p-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg hover:bg-indigo-100 transition-all" title="Zapisz do własnych">
                        <BookMarked size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openShortcutConfirmModal && openShortcutConfirmModal(p); }} className="p-2 text-amber-500 bg-amber-50 dark:bg-amber-500/10 rounded-lg hover:bg-amber-100 transition-all" title="Skrót posiłku">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {browseResults.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              {searchTerm.trim() ? (
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Lokalna Baza ({browseResults.length})
                </h3>
              ) : (
                <span />
              )}
              {browseResults.length > visibleCount && (
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  Pokazano {Math.min(visibleCount, browseResults.length)} z {browseResults.length}
                </span>
              )}
            </div>

            {browseResults.slice(0, visibleCount).map((p, i) => {
              const isFav = favoriteKeys.has(p.id || p.name) || Boolean(p.isFavorite);
              return (
                <div
                  key={(p.id || p.name || 'item') + "-" + i}
                  className="animate-in fade-in duration-100"
                >
                  <div
                    onClick={() => {
                      if (p.isSavedMeal) {
                        addSavedMeal ? addSavedMeal(p) : addToPlate(p);
                      } else {
                        openWeightModal(p);
                      }
                    }}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-2xl border-2 border-slate-100 dark:border-slate-700/50 hover:border-accent-500/30 transition-all cursor-pointer shadow-sm relative group"
                  >
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                          {getProductName(p, i18n.language)}
                        </h4>
                        {getDietBadge(p, currentActiveDiet)}
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
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(p); }}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          isFav
                            ? "text-amber-500 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100"
                            : "text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-slate-700/60"
                        )}
                        title={isFav ? "Usuń z ulubionych" : "Dodaj do ulubionych ⭐"}
                      >
                        <Star size={14} className={isFav ? "fill-amber-400 text-amber-500" : ""} />
                      </button>
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
                </div>
              );
            })}

            {visibleCount < browseResults.length && (
              <div className="pt-2 pb-4 text-center">
                <button
                  onClick={() => {
                    Haptics.light();
                    setVisibleCount((prev) => Math.min(prev + 30, browseResults.length));
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 cursor-pointer"
                >
                  {t('common.loadMore', { defaultValue: 'Pokaż więcej produktów' })} ({browseResults.length - visibleCount} pozostało)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 p-8 bg-slate-100 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            {activeCategory === 'favorites' ? (
              <div className="flex flex-col items-center">
                <Star size={32} className="text-amber-400 mb-2 fill-amber-400/20" />
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-1">Brak ulubionych produktów</h4>
                <p className="text-xs font-bold text-slate-400 max-w-xs">
                  Kliknij gwiazdkę ⭐ przy dowolnym produkcie, aby dodać go do ulubionych i mieć zawsze pod ręką!
                </p>
              </div>
            ) : activeCategory === 'recents' ? (
              <div className="flex flex-col items-center">
                <Clock size={32} className="text-indigo-400 mb-2" />
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-1">Brak ostatnio dodawanych produktów</h4>
                <p className="text-xs font-bold text-slate-400 max-w-xs">
                  Gdy dodasz produkt lub danie na Talerz, pojawi się ono tutaj automatycznie.
                </p>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400">Brak wyników lokalnych.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
};
