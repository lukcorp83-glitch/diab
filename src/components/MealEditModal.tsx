import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { LogEntry, Product } from "../types";
import {
  X,
  Save,
  Utensils,
  Apple,
  Syringe,
  Search,
  Globe,
  Loader2,
  Plus,
  Zap,
  Heart,
} from "lucide-react";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { getEffectiveUid, cn } from "../lib/utils";
import { toast } from "react-hot-toast";
import { LIB_BASE } from "../constants";
import { geminiService } from "../services/gemini";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface MealEditModalProps {
  log: LogEntry;
  user: any;
  onClose: () => void;
}

export default function MealEditModal({
  log,
  user,
  onClose,
}: MealEditModalProps) {
    const { t } = useTranslation();
  const isBolus = log.type === "bolus";
  const formatVal = (v: any) =>
    typeof v === "number"
      ? Number(v.toFixed(2)).toString()
      : v?.toString() || "";
  const initialCarbs =
    log.type === "bolus"
      ? formatVal(log.linkedMeal?.carbs)
      : formatVal(log.value);
  const initialPolyols =
    log.type === "bolus"
      ? formatVal(log.linkedMeal?.polyols)
      : formatVal(log.polyols);
  const initialProtein =
    log.type === "bolus"
      ? formatVal(log.linkedMeal?.protein)
      : formatVal(log.protein);
  const initialFat =
    log.type === "bolus" ? formatVal(log.linkedMeal?.fat) : formatVal(log.fat);
  const initialInsulin = isBolus ? formatVal(log.value) : "";

  const initialName = isBolus
    ? log.linkedMeal?.name || ""
    : log.notes || log.description || "";

  const [carbs, setCarbs] = useState(initialCarbs);
  const [polyols, setPolyols] = useState(initialPolyols);
  const [protein, setProtein] = useState(initialProtein);
  const [fat, setFat] = useState(initialFat);
  const [mealName, setMealName] = useState(initialName);
  const [insulin, setInsulin] = useState(initialInsulin);
  const [notes, setNotes] = useState(log.notes || log.description || "");
  const [items, setItems] = useState<any[]>(log.items || (isBolus ? log.linkedMeal?.items : undefined) || []);
  const [loading, setLoading] = useState(false);
  const [removeMeal, setRemoveMeal] = useState(false);

  // Search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineResults, setOnlineResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [communityProducts, setCommunityProducts] = useState<Product[]>([]);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [expandedMeal, setExpandedMeal] = useState<{ meal: any; items: any[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    const q1 = query(
      collection(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "customProducts",
      ),
    );
    const unsub1 = onSnapshot(q1, (snap) => {
      setCustomProducts(
        snap.docs.map((d) => ({
          id: d.id,
          isCustom: true,
          ...d.data(),
        })) as Product[],
      );
    });
    const q2 = query(
      collection(db, "artifacts", "diacontrolapp", "communityProducts"),
      limit(200)
    );
    const unsub2 = onSnapshot(q2, (snap) => {
      setCommunityProducts(
        snap.docs.map((d) => ({
          id: d.id,
          isCommunity: true,
          ...d.data(),
        })) as Product[],
      );
    });
    const q3 = query(
      collection(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "savedMeals",
      ),
    );
    const unsub3 = onSnapshot(q3, (snap) => {
      setSavedMeals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [user]);

  const allLocal = [...customProducts, ...communityProducts, ...LIB_BASE];
  const searchResults = allLocal
    .filter(
      (p) =>
        p &&
        p.name &&
        searchTerm.length >= 2 &&
        p.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .slice(0, 5);

  const handleOnlineSearch = async () => {
    if (!searchTerm || isSearching) return;
    setIsSearching(true);
    setOnlineResults([]);
    try {
      const prompt = i18n.t('auto.jestes_dietetykiem_podaj', { defaultValue: "Jesteś dietetykiem. Podaj wartości odżywcze dla produktu: \"{{var0}}\" na 100g lub standardową porcję. \n      Zwróć format JSON (tylko JSON): [{\"name\": string, \"carbs\": number, \"protein\": number, \"fat\": number, \"gi\": number}]. \n      Dla pola \"gi\" (Indeks Glikemiczny) podaj konkretną liczbę (np. 50, 70), a nie tekst.", var0: searchTerm });
      const result = await geminiService.generateContent(prompt);
      const jsonMatch = result.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const resultsArray = Array.isArray(parsed) ? parsed : [parsed];
        setOnlineResults(
          resultsArray.map((p, i) => ({
            ...p,
            id: `online_${i}_${Date.now()}`,
            isOnline: true,
          })),
        );
      }
    } catch (err) {
      console.error("AI search failed:", err);
      toast.error(i18n.t('auto.blad_wyszukiwania_ai', { defaultValue: i18n.t('auto.blad_wyszukiwania_ai', { defaultValue: "Błąd wyszukiwania AI" }) }));
    } finally {
      setIsSearching(false);
    }
  };

  const addProduct = (p: Product) => {
    const c = Math.round((parseFloat(carbs || "0") + (p.carbs || 0)) * 10) / 10;
    const pol =
      Math.round((parseFloat(polyols || "0") + (p.polyols || 0)) * 10) / 10;
    const pr =
      Math.round((parseFloat(protein || "0") + (p.protein || 0)) * 10) / 10;
    const f = Math.round((parseFloat(fat || "0") + (p.fat || 0)) * 10) / 10;

    setCarbs(c.toString());
    setPolyols(pol.toString());
    setProtein(pr.toString());
    setFat(f.toString());

    const newNote = notes ? `${notes}, ${p.name}` : p.name;
    setNotes(newNote);
    
    setItems(prev => [...prev, p]);

    setSearchTerm("");
    setOnlineResults([]);
    toast.success(`Dodano ${p.name}`);
  };

  const addSavedMeal = (meal: any) => {
    const mealCarbs = meal.items.reduce(
      (acc: number, item: any) => acc + (item.carbs || 0),
      0,
    );
    const mealPolyols = meal.items.reduce(
      (acc: number, item: any) => acc + (item.polyols || 0),
      0,
    );
    const mealProtein = meal.items.reduce(
      (acc: number, item: any) => acc + (item.protein || 0),
      0,
    );
    const mealFat = meal.items.reduce(
      (acc: number, item: any) => acc + (item.fat || 0),
      0,
    );

    const c = Math.round((parseFloat(carbs || "0") + mealCarbs) * 10) / 10;
    const pol =
      Math.round((parseFloat(polyols || "0") + mealPolyols) * 10) / 10;
    const pr = Math.round((parseFloat(protein || "0") + mealProtein) * 10) / 10;
    const f = Math.round((parseFloat(fat || "0") + mealFat) * 10) / 10;

    setCarbs(c.toString());
    setPolyols(pol.toString());
    setProtein(pr.toString());
    setFat(f.toString());

    const newNote = notes
      ? `${notes}, zestaw: ${meal.name}`
      : `Zestaw: ${meal.name}`;
    setNotes(newNote);

    setItems(prev => [...prev, ...(meal.items || [])]);

    toast.success(`Dodano zestaw: ${meal.name}`);
  };

  const handleSave = async () => {
    if (!user || loading) return;
    if (!log.id) {
      toast.error(i18n.t('auto.nie_mozna_edytowac_wpisu_brak', { defaultValue: i18n.t('auto.nie_mozna_edytowac_wpisu', { defaultValue: "Nie można edytować wpisu (brak ID elementu)." }) }));
      return;
    }
    setLoading(true);
    try {
      const logRef = doc(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "logs",
        log.id,
      );

      const updates: any = {
        notes: notes,
        description: notes,
        userModified: true,
        items: items,
      };

      if (isBolus) {
        updates.value = Math.round((parseFloat(insulin) || 0) * 10) / 10;
        if (removeMeal) {
          updates.linkedMeal = null;
        } else if (parseFloat(carbs) > 0) {
          updates.linkedMeal = {
            carbs: Math.round((parseFloat(carbs) || 0) * 10) / 10,
            polyols: Math.round((parseFloat(polyols) || 0) * 10) / 10 || null,
            protein: Math.round((parseFloat(protein) || 0) * 10) / 10 || null,
            fat: Math.round((parseFloat(fat) || 0) * 10) / 10 || null,
            name: mealName || null,
            items: items,
          };
        } else {
          updates.linkedMeal = null;
        }
      } else {
        if (removeMeal) {
          updates.value = 0;
          updates.carbs = 0;
          updates.polyols = null;
          updates.protein = null;
          updates.fat = null;
          updates.notes = (updates.notes || "") + i18n.t('auto.posilek_usuniety', { defaultValue: i18n.t('auto.posilek_usuniety', { defaultValue: "(Posiłek usunięty)" }) });
        } else {
          const netCarbs = Math.max(
            0,
            (parseFloat(carbs) || 0) - (parseFloat(polyols) || 0),
          );
          updates.value = Math.round(netCarbs * 10) / 10;
          updates.polyols =
            Math.round((parseFloat(polyols) || 0) * 10) / 10 || null;
          updates.protein =
            Math.round((parseFloat(protein) || 0) * 10) / 10 || null;
          updates.fat = Math.round((parseFloat(fat) || 0) * 10) / 10 || null;
          if (mealName) updates.name = mealName;
        }
      }

      // Update locally immediately
      window.dispatchEvent(new CustomEvent('localLogUpdate', { detail: { id: log.id, updates } }));
      
      toast.success(
        isBolus ? "Zaktualizowano bolus (lokalnie)!" : i18n.t('auto.zaktualizowano_posilek_lokalni', { defaultValue: i18n.t('auto.zaktualizowano_posilek_lo', { defaultValue: "Zaktualizowano posiłek (lokalnie)!" }) }),
      );
      onClose();

      // Fire-and-forget remote update (if they hit Quota, it just fails silently or logs warning)
      setDoc(logRef, { ...log, ...updates }, { merge: true }).catch((err) => {
        console.warn("Could not sync to Firebase (offline or quota exceeded):", err);
      });
    } catch (err) {
      console.error("Update failed:", err);
      toast.error(i18n.t('auto.blad_aktualizacji', { defaultValue: i18n.t('auto.blad_aktualizacji', { defaultValue: "Błąd aktualizacji" }) }));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 pt-safe pb-safe z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
      >
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center",
                  isBolus
                    ? "bg-accent-500/10 text-accent-500"
                    : "bg-amber-500/10 text-amber-500",
                )}
              >
                {isBolus ? <Syringe size={20} /> : <Utensils size={20} />}
              </div>
              <div>
                <h3 className="text-lg font-black dark:text-white leading-none">
                  {isBolus ? "Edytuj Bolus" : i18n.t('auto.edytuj_posilek', { defaultValue: i18n.t('auto.edytuj_posilek', { defaultValue: "Edytuj Posiłek" }) })}
                </h3>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                  
                                                    {t('auto.popraw_dane_wpisu', { defaultValue: 'Popraw dane wpisu' })}
                                                  </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Search Section */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                
                                              {t('auto.dodaj_produkty_do_posiłku', { defaultValue: i18n.t('auto.dodaj_produkty_do_posilku', { defaultValue: "Dodaj produkty do posiłku" }) })}
                                            </label>
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder={t('auto.np_banan_pizza_chleb', { defaultValue: 'NP. Banan, Pizza, Chleb...' })}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleOnlineSearch()}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 pl-12 pr-12 rounded-2xl font-bold outline-none border border-slate-200 dark:border-slate-700 focus:border-accent-500 transition-all dark:text-white text-sm"
                />
                <button
                  onClick={handleOnlineSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-accent-500 text-white rounded-2xl shadow-sm hover:bg-accent-600 transition-all disabled:opacity-50"
                  disabled={isSearching || !searchTerm}
                >
                  {isSearching ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Globe size={16} />
                  )}
                </button>
              </div>

              {/* Search Results */}
              <AnimatePresence>
                {(searchResults.length > 0 || onlineResults.length > 0) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-48 overflow-y-auto glass-target"
                  >
                    {[...searchResults, ...onlineResults].map((p, idx) => (
                      <button
                        key={`modal-search-${p.id || "p"}-${idx}`}
                        onClick={() => addProduct(p)}
                        className="w-full p-4 flex items-center justify-between hover:bg-white dark:hover:bg-slate-700/50 transition-all text-left border-b border-slate-100 dark:border-slate-800 last:border-0 group active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Utensils size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-black dark:text-white line-clamp-1">
                              {p.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                {p.carbs}{t('auto.g_w', { defaultValue: 'g W' })}
                                                                          </span>
                              <span className="text-[9px] font-bold text-slate-400">
                                {p.protein}{t('auto.b', { defaultValue: 'B /' })} {p.fat}T
                              </span>
                              <span
                                className={cn(
                                  "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                  typeof p.gi === "number"
                                    ? p.gi <= 55
                                      ? "bg-emerald-500/10 text-emerald-500"
                                      : p.gi < 70
                                        ? "bg-amber-500/10 text-amber-500"
                                        : "bg-rose-500/10 text-rose-500"
                                    : "bg-slate-500/10 text-slate-500 dark:text-slate-400",
                                )}
                              >
                                
                                                                            {t('auto.ig', { defaultValue: 'IG:' })} {typeof p.gi === "number" ? p.gi : "??*"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="p-1.5 bg-accent-500/10 text-accent-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus size={14} />
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Saved Meals Horizontal Scroll */}
            {savedMeals.length > 0 && (
              <div className="space-y-4 pt-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-1.5">
                  <Heart
                    size={14}
                    className="text-accent-500 fill-accent-500"
                  />{" "}
                  
                                                    {t('auto.baza_posiłków_zapisane_zestawy', { defaultValue: i18n.t('auto.baza_posilkow_zapisane_ze', { defaultValue: "Baza Posiłków (Zapisane zestawy)" }) })}
                                                  </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                  {savedMeals.map((m) => (
                    <button
                      key={m.id}
                      onClick={(e) => {
                        e.preventDefault();
                        setExpandedMeal({ meal: m, items: JSON.parse(JSON.stringify(m.items)) });
                      }}
                      className="snap-start shrink-0 w-[180px] text-left bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-accent-500/50 transition-all flex flex-col justify-between h-[80px]"
                    >
                      <div>
                        <div className="text-[11px] font-black dark:text-white line-clamp-1">
                          {m.name}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                          {m.items.length}  {t('auto.skład', { defaultValue: i18n.t('auto.sklad', { defaultValue: "skład." }) })}
                                                          </div>
                      </div>
                      <div className="text-[10px] font-black text-accent-500">
                        {m.items
                          .reduce(
                            (acc: number, i: any) => acc + (i.carbs || 0),
                            0,
                          )
                          .toFixed(1)}
                        
                                                      {t('auto.g_węg', { defaultValue: i18n.t('auto.g_weg', { defaultValue: "g Węg." }) })}
                                                    </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              {isBolus && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    
                                                          {t('auto.dawka_insuliny_j', { defaultValue: 'Dawka Insuliny (j.)' })}
                                                        </label>
                  <input
                    type="number"
                    value={insulin}
                    onChange={(e) => setInsulin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 p-3 rounded-[1.5rem] font-black text-center outline-none border border-slate-200 dark:border-slate-700/50 focus:ring-2 focus:ring-accent-500/20 shadow-inner hover:bg-slate-100 dark:hover:bg-slate-800 transition-all dark:text-white"
                    placeholder="0.0"
                    step="0.1"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  
                                                    {t('auto.nazwa_skład', { defaultValue: i18n.t('auto.nazwa_sklad', { defaultValue: "Nazwa / Skład" }) })}
                                                  </label>
                <input
                  type="text"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 p-3 rounded-[1.5rem] font-bold outline-none border border-slate-200 dark:border-slate-700/50 focus:ring-2 focus:ring-accent-500/20 shadow-inner hover:bg-slate-100 dark:hover:bg-slate-800 transition-all dark:text-white text-sm"
                  placeholder={t('auto.np_zestaw_śniadaniowy', { defaultValue: i18n.t('auto.np_zestaw_sniadaniowy', { defaultValue: "NP. Zestaw śniadaniowy" }) })}
                />
                {items && items.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap pb-2 border-slate-100 dark:border-slate-800 border-b">
                    {items.map((it, idx) => (
                      <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-xs px-3 py-1 rounded-full font-bold dark:text-white flex items-center gap-2">
                        {it.name}
                        <button 
                         onClick={() => {
                           const newItems = [...items];
                           const removed = newItems.splice(idx, 1)[0];
                           setItems(newItems);
                           setCarbs((Math.max(0, parseFloat(carbs || "0") - (removed.carbs || 0))).toFixed(1));
                           setProtein((Math.max(0, parseFloat(protein || "0") - (removed.protein || 0))).toFixed(1));
                           setFat((Math.max(0, parseFloat(fat || "0") - (removed.fat || 0))).toFixed(1));
                           setPolyols((Math.max(0, parseFloat(polyols || "0") - (removed.polyols || 0))).toFixed(1));
                         }}
                         className="text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {isBolus && log.linkedMeal && (
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors glass-target">
                  <input
                    type="checkbox"
                    checked={removeMeal}
                    onChange={(e) => setRemoveMeal(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-2 border-slate-500 text-accent-500 bg-transparent focus:ring-accent-500/20"
                  />
                  <div>
                    <div className="text-[10px] font-black uppercase dark:text-slate-300 tracking-widest">
                      
                                                                {t('auto.usuń_posiłek_pozostaw_bolus', { defaultValue: i18n.t('auto.usun_posilek_pozostaw_bol', { defaultValue: "Usuń Posiłek (Pozostaw Bolus)" }) })}
                                                              </div>
                    <div className="text-[8px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                      
                                                                {t('auto.posiłek_zniknie_rano_ze_statystyk_z', { defaultValue: i18n.t('auto.posilek_zniknie_rano_ze_s', { defaultValue: "Posiłek zniknie rano ze statystyk, zostanie sam wpis z podaną dawką insuliny" }) })}
                                                              </div>
                  </div>
                </label>
              )}

              {!isBolus && log.source?.startsWith("nightscout") && (
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors glass-target">
                  <input
                    type="checkbox"
                    checked={removeMeal}
                    onChange={(e) => setRemoveMeal(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-2 border-slate-500 text-accent-500 bg-transparent focus:ring-accent-500/20"
                  />
                  <div>
                    <div className="text-[10px] font-black uppercase dark:text-slate-300 tracking-widest">
                      
                                                                {t('auto.usuń_posiłek_pozostaw_bolus', { defaultValue: i18n.t('auto.usun_posilek_pozostaw_bol', { defaultValue: "Usuń Posiłek (Pozostaw Bolus)" }) })}
                                                              </div>
                    <div className="text-[8px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                      
                                                                {t('auto.posiłek_zniknie_ze_statystyk_bolus_', { defaultValue: i18n.t('auto.posilek_zniknie_ze_statys', { defaultValue: "Posiłek zniknie ze statystyk. Bolus pobrany z Nightscout pozostanie nienaruszony." }) })}
                                                              </div>
                  </div>
                </label>
              )}

              {!removeMeal && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 flex flex-col justify-center text-center">
                      <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">
                        
                                                                      {t('auto.netto_ww', { defaultValue: 'Netto WW:' })}{" "}
                        {Math.max(
                          0,
                          (parseFloat(carbs) || 0) - (parseFloat(polyols) || 0),
                        ).toFixed(1)}
                        g
                      </span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest ml-2">
                        
                                                                      {t('auto.poliole_g', { defaultValue: 'Poliole (g)' })}
                                                                    </label>
                      <input
                        type="number"
                        value={polyols}
                        onChange={(e) => setPolyols(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl font-black text-center outline-none border border-slate-200 dark:border-slate-700 focus:border-emerald-500 transition-all dark:text-white"
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        
                                                                      {t('auto.węglowodany_g', { defaultValue: i18n.t('auto.weglowodany_g', { defaultValue: "Węglowodany (g)" }) })}
                                                                    </label>
                      <input
                        type="number"
                        value={carbs}
                        onChange={(e) => setCarbs(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 p-3 rounded-[1.5rem] font-black text-center outline-none border border-slate-200 dark:border-slate-700/50 focus:ring-2 focus:ring-amber-500/20 shadow-inner hover:bg-slate-100 dark:hover:bg-slate-800 transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-2">
                        
                                                                      {t('auto.białko_g', { defaultValue: i18n.t('auto.bialko_g', { defaultValue: "Białko (g)" }) })}
                                                                    </label>
                      <input
                        type="number"
                        value={protein}
                        onChange={(e) => setProtein(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl font-black text-center outline-none border border-slate-200 dark:border-slate-700 focus:border-emerald-500 transition-all dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-rose-500/60 uppercase tracking-widest ml-2">
                        
                                                                      {t('auto.tłuszcz_g', { defaultValue: i18n.t('auto.tluszcz_g', { defaultValue: "Tłuszcz (g)" }) })}
                                                                    </label>
                      <input
                        type="number"
                        value={fat}
                        onChange={(e) => setFat(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 p-3 rounded-[1.5rem] font-black text-center outline-none border border-slate-200 dark:border-slate-700/50 focus:ring-2 focus:ring-rose-500/20 shadow-inner hover:bg-slate-100 dark:hover:bg-slate-800 transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        
                                                                      {t('auto.data_godzina', { defaultValue: 'Data / Godzina' })}
                                                                    </label>
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl font-bold text-[10px] text-center text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center glass-target">
                        {new Date(log.timestamp).toLocaleString([], {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  
                                                    {t('auto.notatka_produkty', { defaultValue: 'Notatka (produkty)' })}
                                                  </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-bold text-sm outline-none border border-slate-200 dark:border-slate-700 focus:border-accent-500 transition-all dark:text-white resize-none"
                  placeholder={t('auto.opis_posiłku', { defaultValue: i18n.t('auto.opis_posilku', { defaultValue: "Opis posiłku..." }) })}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-accent-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-accent-700 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            
                                  {t('auto.zaktualizuj_wpis', { defaultValue: 'Zaktualizuj Wpis' })}
                                </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {expandedMeal && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 pt-safe pb-safe z-[120] flex items-end sm:items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-slate-50 dark:bg-slate-900 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[3rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform relative scrollbar-none"
            >
              <button
                onClick={() => setExpandedMeal(null)}
                className="absolute top-6 right-6 p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-black mb-1 dark:text-white pr-10">
                {expandedMeal.meal.name}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                
                                              {t('auto.dostosuj_i_dodaj', { defaultValue: 'Dostosuj i dodaj' })}
                                            </p>

              <div className="space-y-4 mb-6">
                {expandedMeal.items.map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm dark:text-white truncate" title={item.name}>{item.name}</div>
                      <div className="text-[10px] font-bold text-slate-400">{(item.carbs * expandedMeal.items[idx].weight / 100).toFixed(1)}{t('auto.g_w', { defaultValue: 'g W |' })} {(item.protein * expandedMeal.items[idx].weight / 100).toFixed(1)}{t('auto.g_b', { defaultValue: 'g B |' })} {(item.fat * expandedMeal.items[idx].weight / 100).toFixed(1)}{t('auto.g_t', { defaultValue: 'g T' })}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        value={item.weight || ""}
                        onChange={(e) => {
                          const newItems = [...expandedMeal.items];
                          newItems[idx].weight = Number(e.target.value) || 0;
                          setExpandedMeal({ ...expandedMeal, items: newItems });
                        }}
                        className="w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-center font-bold text-sm dark:text-white outline-none focus:border-accent-500"
                      />
                      <span className="text-xs font-bold text-slate-400">g</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  // Haptics.light();
                  addSavedMeal({ ...expandedMeal.meal, items: expandedMeal.items });
                  setExpandedMeal(null);
                  toast.success(`Dodano zmodyfikowany zestaw: ${expandedMeal.meal.name}`);
                }}
                className="w-full bg-accent-600 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase shadow-xl transition-all active:scale-95 tracking-[0.2em]"
              >
                
                                              {t('auto.dodaj_składniki', { defaultValue: i18n.t('auto.dodaj_skladniki', { defaultValue: "Dodaj Składniki" }) })}
                                            </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

