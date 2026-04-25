import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";
import { Search, Plus, Trash2, Tag, Info } from "lucide-react";
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

export default function FoodDatabase({ user }: { user: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [communityProducts, setCommunityProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("Wszystko");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    carbs: 0,
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
        user.uid,
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
      const prodData = {
        name: newProduct.name,
        carbs: newProduct.carbs,
        protein: newProduct.protein,
        fat: newProduct.fat,
        gi: newProduct.gi,
        category: newProduct.category,
        author: user.uid,
        isCommunity: shareWithCommunity,
        id: `custom_${Date.now()}`,
      };

      await addDoc(
        collection(
          db,
          "artifacts",
          "diacontrolapp",
          "users",
          user.uid,
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
        .map((item) => [item.name.toLowerCase(), item]),
    ).values(),
  );
  const filtered = uniqueProducts.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      activeCategory === "Wszystko" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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
            placeholder="Szukaj produktu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 p-5 pl-14 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-sm font-bold dark:text-white outline-none focus:ring-2 ring-indigo-500/20 shadow-sm"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white p-5 rounded-[1.5rem] shadow-lg active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-slate-50 dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh]"
            >
              <h2 className="text-xl font-black mb-6 dark:text-white">
                Dodaj własny produkt
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">
                    Nazwa produktu
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
                      Węglowodany (g)
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
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">
                      IG (Indeks)
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
                      Białko (g)
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
                      Tłuszcz (g)
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
                    Kategoria
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
                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="shareCommunity"
                    className="text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    Udostępnij w bazie społeczności
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-200 dark:bg-slate-800 py-4 rounded-2xl font-black text-[10px] uppercase dark:text-white"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddProduct}
                  className="flex-2 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase"
                >
                  Dodaj Produkt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveCategory("Wszystko")}
          className={`shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === "Wszystko" ? "bg-indigo-600 text-white shadow-lg" : "bg-white dark:bg-slate-900 text-slate-400"}`}
        >
          Wszystko
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? "bg-indigo-600 text-white shadow-lg" : "bg-white dark:bg-slate-900 text-slate-400"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <motion.div
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.05 } },
        }}
        initial="hidden"
        animate="show"
        className="grid gap-1"
      >
        <AnimatePresence>
          {filtered.map((p) => {
            const isCustom = p.author === user?.uid && !p.isCommunity;
            const isOwnCommunity = p.author === user?.uid && p.isCommunity;

            const content = (
              <motion.div
                layout
                variants={{
                  hidden: { opacity: 0, y: 15, scale: 0.95 },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: "spring", stiffness: 350, damping: 25 },
                  },
                }}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center group mb-2"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-sm dark:text-white truncate">
                      {p.name}
                    </h4>
                    {p.isCommunity && (
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950 text-indigo-500">
                        Społeczność
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                        p.gi <= 55
                          ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-500"
                          : p.gi < 70
                            ? "bg-amber-50 dark:bg-amber-950 text-amber-500"
                            : "bg-rose-50 dark:bg-rose-950 text-rose-500",
                      )}
                    >
                      IG: {p.gi}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    W: {p.carbs}g | B: {p.protein || 0}g | T: {p.fat || 0}g (w
                    100g)
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
                            user.uid,
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
      </motion.div>
    </motion.div>
  );
}
