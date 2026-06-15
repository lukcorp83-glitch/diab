import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";
import { Search, Plus, Trash2, Tag, Info, X } from "lucide-react";
import SwipeableItem from "./SwipeableItem";
import { cn } from "../lib/utils";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { LIB_BASE, CATEGORIES } from "../constants";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { geminiService } from "../services/gemini";

export const getProductName = (p: Product, lang: string) => {
  if (lang.startsWith("en") && p.nameEn) return p.nameEn;
  if (lang.startsWith("pl") && p.namePl) return p.namePl;
  return p.name;
};

export default function FoodDatabase({ user, onAddToPlate }: { user: any; onAddToPlate?: (p: Product) => void }) {
    const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [communityProducts, setCommunityProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("Wszystko");
  const [activeSource, setActiveSource] = useState<'all' | 'system' | 'own' | 'community'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    carbs: 0,
    polyols: 0,
    protein: 0,
    fat: 0,
    gi: 50,
    category: "Inne",
  });
  const [shareWithCommunity, setShareWithCommunity] = useState(false);

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
    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      setCustomProducts(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[],
      );
    });

    // global community products
    const q2 = query(
      collection(db, "artifacts", "diacontrolapp", "communityProducts"),
    );
    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      setCommunityProducts(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[],
      );
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  const handleAddProduct = async () => {
    if (!user || !newProduct.name) return;
    try {
      let finalNamePl = newProduct.name;
      let finalNameEn = newProduct.name;

      if (shareWithCommunity) {
        // Translate the product for community database
        const translation = await geminiService.translateProduct(newProduct.name);
        if (translation.namePl) finalNamePl = translation.namePl;
        if (translation.nameEn) finalNameEn = translation.nameEn;
      }

      const prodData = {
        name: newProduct.name,
        namePl: finalNamePl,
        nameEn: finalNameEn,
        carbs: newProduct.carbs,
        polyols: newProduct.polyols,
        protein: newProduct.protein,
        fat: newProduct.fat,
        gi: newProduct.gi,
        category: newProduct.category,
        author: getEffectiveUid(user),
        isCommunity: shareWithCommunity,
        id: `custom_${Date.now()}`,
      };

      await addDoc(
        collection(
          db,
          "artifacts",
          "diacontrolapp",
          "users",
          getEffectiveUid(user),
          "customProducts",
        ),
        prodData,
      );

      if (shareWithCommunity) {
        await addDoc(
          collection(db, "artifacts", "diacontrolapp", "communityProducts"),
          prodData,
        );
      }

      setIsModalOpen(false);
      setNewProduct({
        name: "",
        carbs: 0,
        polyols: 0,
        protein: 0,
        fat: 0,
        gi: 50,
        category: "Inne",
      });
      setShareWithCommunity(false);
    } catch (e) {
      console.error(e);
    }
  };

  const allProducts = [...customProducts, ...communityProducts, ...LIB_BASE];
  const uniqueProducts = Array.from(
    new Map(
      allProducts
        .filter((item) => item && item.name)
        .map((item) => [getProductName(item, i18n.language).toLowerCase(), item]),
    ).values(),
  );
  const filtered = uniqueProducts.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    const displayName = getProductName(p, i18n.language).toLowerCase();
    
    const matchesSearch = displayName.includes(searchLower) ||
      (p.name && p.name.toLowerCase().includes(searchLower)) ||
      (p.namePl && p.namePl.toLowerCase().includes(searchLower)) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(searchLower));
    const matchesCategory =
      activeCategory === "Wszystko" || p.category === activeCategory;
      
    let matchesSource = true;
    const isOwn = p.author === user?.uid;
    const isCommunity = Boolean(p.isCommunity);
    const isSystem = !p.author && !isCommunity;

    if (activeSource === 'own') matchesSource = isOwn;
    else if (activeSource === 'community') matchesSource = isCommunity && !isOwn;
    else if (activeSource === 'system') matchesSource = isSystem;

    return matchesSearch && matchesCategory && matchesSource;
  }).sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder={t('auto.szukaj_produktu', { defaultValue: 'Szukaj produktu...' })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 p-5 pl-14 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-sm font-bold dark:text-white outline-none focus:ring-2 ring-accent-500/20 shadow-sm"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-accent-600 text-white p-5 rounded-[1.5rem] shadow-lg active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {typeof document !== 'undefined' ? createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <motion.div 
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 p-4"
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-50 dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh] will-change-transform relative"
              >
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="absolute top-6 right-6 p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <h2 className="text-xl font-black mb-6 dark:text-white pr-8 leading-tight">
                  
                                                {t('auto.dodaj_własny_produkt', { defaultValue: i18n.t('auto.dodaj_wlasny_produkt', { defaultValue: "Dodaj własny produkt" }) })}
                                              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">
                    
                                                          {t('auto.nazwa_produktu', { defaultValue: 'Nazwa produktu' })}
                                                        </label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">
                      
                                                                {t('auto.węglowodany_g', { defaultValue: i18n.t('auto.weglowodany_g', { defaultValue: "Węglowodany (g)" }) })}
                                                              </label>
                    <input
                      type="number"
                      value={newProduct.carbs}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          carbs: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black uppercase text-accent-500 tracking-widest ml-2 mb-1 block">
                      
                                                                {t('auto.poliole_g', { defaultValue: 'Poliole (g)' })}
                                                              </label>
                    <input
                      type="number"
                      value={newProduct.polyols}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          polyols: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">
                      
                                                                {t('auto.ig_indeks', { defaultValue: 'IG (Indeks)' })}
                                                              </label>
                    <input
                      type="number"
                      value={newProduct.gi}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          gi: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">
                      
                                                                {t('auto.białko_g', { defaultValue: i18n.t('auto.bialko_g', { defaultValue: "Białko (g)" }) })}
                                                              </label>
                    <input
                      type="number"
                      value={newProduct.protein}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          protein: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">
                      
                                                                {t('auto.tłuszcz_g', { defaultValue: i18n.t('auto.tluszcz_g', { defaultValue: "Tłuszcz (g)" }) })}
                                                              </label>
                    <input
                      type="number"
                      value={newProduct.fat}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          fat: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">
                    
                                                          {t('auto.kategoria', { defaultValue: 'Kategoria' })}
                                                        </label>
                  <select
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, category: e.target.value })
                    }
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white appearance-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 mt-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-[1.5rem]">
                  <input
                    type="checkbox"
                    id="shareCommunity"
                    checked={shareWithCommunity}
                    onChange={(e) => setShareWithCommunity(e.target.checked)}
                    className="w-5 h-5 rounded text-accent-600 focus:ring-accent-500"
                  />
                  <label
                    htmlFor="shareCommunity"
                    className="text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    
                                                          {t('auto.udostępnij_w_bazie_społeczności', { defaultValue: i18n.t('auto.udostepnij_w_bazie_spolec', { defaultValue: "Udostępnij w bazie społeczności" }) })}
                                                        </label>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleAddProduct}
                  className="w-full bg-accent-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
                >
                  
                                                    {t('auto.dodaj_produkt', { defaultValue: 'Dodaj Produkt' })}
                                                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body) : null}

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-full w-full mx-auto max-w-sm">
          {[
            { id: 'all', label: 'Wszystkie' },
            { id: 'system', label: i18n.t('auto.baza_glowna', { defaultValue: i18n.t('auto.baza_glowna', { defaultValue: "Baza Główna" }) }) },
            { id: 'own', label: i18n.t('auto.wlasne', { defaultValue: i18n.t('auto.wlasne', { defaultValue: "Własne" }) }) },
            { id: 'community', label: i18n.t('auto.spolecznosc', { defaultValue: i18n.t('auto.spolecznosc', { defaultValue: "Społeczność" }) }) }
          ].map((src) => (
            <button
              key={src.id}
              onClick={() => setActiveSource(src.id as any)}
              className={`flex-1 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeSource === src.id ? "bg-white dark:bg-slate-950 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              {src.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveCategory("Wszystko")}
            className={`shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === "Wszystko" ? "bg-accent-600 text-white shadow-lg" : "bg-white dark:bg-slate-900 text-slate-400"}`}
          >
            
                                  {t('auto.wszystko', { defaultValue: 'Wszystko' })}
                                </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? "bg-accent-600 text-white shadow-lg" : "bg-white dark:bg-slate-900 text-slate-400"}`}
          >
            {cat}
          </button>
        ))}
        </div>
      </div>

      <div className="grid gap-1 will-change-transform">
        <AnimatePresence>
          {filtered.slice(0, 100).map((p, idx) => {
            const isCustom = p.author === user?.uid && !p.isCommunity;
            const isOwnCommunity = p.author === user?.uid && p.isCommunity;

            const content = (
              <motion.div
                key={p.id || p.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
                transition={{ duration: 0.2 }}
                onClick={() => onAddToPlate?.(p)}
                className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center group mb-2 cursor-pointer hover:border-accent-500 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-sm dark:text-white truncate">
                      {getProductName(p, i18n.language)}
                    </h4>
                    {p.isCommunity && (
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-accent-50 dark:bg-accent-950 text-accent-500">
                        
                                                            {t('auto.społeczność', { defaultValue: i18n.t('auto.spolecznosc', { defaultValue: "Społeczność" }) })}
                                                          </span>
                    )}
                    {(isCustom || isOwnCommunity) && (
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950 text-emerald-500">
                        
                                                            {t('auto.własne', { defaultValue: i18n.t('auto.wlasne', { defaultValue: "Własne" }) })}
                                                          </span>
                    )}
                    <span
                      className={cn(
                        "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                        typeof p.gi === 'number' && p.gi <= 55
                          ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-500"
                          : typeof p.gi === 'number' && p.gi < 70
                            ? "bg-amber-50 dark:bg-amber-950 text-amber-500"
                            : "bg-rose-50 dark:bg-rose-950 text-rose-500",
                      )}
                    >
                      
                                                      {t('auto.ig', { defaultValue: 'IG:' })} {typeof p.gi === 'number' ? p.gi : "??"}
                    </span>
                    {(() => {
                      if (typeof p.gi !== 'number') return null;
                      const glValue = (Number(p.carbs) * Number(p.gi)) / 100;
                      return (
                        <span
                          className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                            glValue <= 10
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-500"
                              : glValue < 20
                                ? "bg-amber-50 dark:bg-amber-950 text-amber-500"
                                : "bg-rose-50 dark:bg-rose-950 text-rose-500",
                          )}
                        >
                          
                                                        {t('auto.łg', { defaultValue: i18n.t('auto.lg', { defaultValue: "ŁG:" }) })} {glValue.toFixed(1)}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    
                                                {t('auto.w', { defaultValue: 'W:' })} {Number(p.carbs || 0).toFixed(1).replace(/\.0$/, "")}g {p.polyols ? `(w tym ${p.polyols}g pol.) ` : ''}{t('auto.b', { defaultValue: '| B:' })} {Number(p.protein || 0).toFixed(1).replace(/\.0$/, "")}{t('auto.g_t', { defaultValue: 'g | T:' })} {Number(p.fat || 0).toFixed(1).replace(/\.0$/, "")}{t('auto.g_w_100g', { defaultValue: 'g (w 100g)' })}
                                              </p>
                </div>
              </motion.div>
            );

            const isDeletable =
              p.author === user?.uid || p.id?.startsWith("custom_");

            if (isDeletable && p.id) {
              return (
                <motion.div
                  layout
                  key={`${p.id}-${p.name}`}
                  exit={{ opacity: 0 }}
                >
                  <SwipeableItem
                    key={p.id}
                    id={p.id}
                    onDelete={async () => {
                      try {
                        await deleteDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "customProducts",
                            p.id!,
                          ),
                        );
                        if (p.isCommunity) {
                          // Note: Deleting from community would require querying community path with product ID.
                          // Depending on how it's structured, might not have the same ID.
                        }
                      } catch (err) {
                        console.error("Delete product failed:", err);
                      }
                    }}
                  >
                    {content}
                  </SwipeableItem>
                </motion.div>
              );
            }

            return (
              <motion.div
                layout
                key={`${p.id}-${p.name}`}
                exit={{ opacity: 0 }}
              >
                {content}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
