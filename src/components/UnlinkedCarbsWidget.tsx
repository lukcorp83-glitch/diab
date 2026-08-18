import { useEffect } from 'react';
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LIB_BASE } from '../data/foodDatabase';
import { useLogsStore } from "../stores/useLogsStore";
import { useAuthStore } from '../stores/useAuthStore';
import { LogEntry, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Merge, AlertCircle, Plus, X, Search, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

import { dbService } from "../services/databaseService";
import { toast } from "react-hot-toast";
import { getEffectiveUid, cn } from "../lib/utils";
import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

interface Props {
 user?: any;
 onAddCarbs?: () => void;
 onClose?: () => void;
 isModal?: boolean;
}

export default function UnlinkedCarbsWidget({ user: propUser, onAddCarbs, onClose, isModal }: Props) {
 const authUser = useAuthStore((state) => state.user);
 const user = propUser || authUser;
 const logs = useLogsStore((state) => state.logs);
 const { t } = useTranslation();
 const [dismissedId, setDismissedId] = useState<string | null>(() => {
 return sessionStorage.getItem('dismissed_unlinked_id');
 });
 
 const [searchQuery, setSearchQuery] = useState("");
 const [isSaving, setIsSaving] = useState(false);
 const [isAiEstimating, setIsAiEstimating] = useState(false);

  const handleDismiss = (id: string) => {
    setDismissedId(id);
    const now = Date.now();
    sessionStorage.setItem('capsule_unlinked_dismissed_time', now.toString());
    sessionStorage.setItem('dismissed_unlinked_id', id);
    onClose?.();
  };

 const latestUnlinked = useMemo(() => {
 const timeLimit = 3 * 60 * 60 * 1000; // 3 hours
 const now = Date.now();
 
 const unlinkedLogs = logs.filter(l => 
 (l.type === "bolus" || l.type === "meal") &&
 now - Number(l.timestamp) < timeLimit &&
 now - Number(l.timestamp) >= 0 &&
 (!l.items || l.items.length === 0) &&
 ((l as any).carbs > 0 || l.linkedMeal?.carbs > 0 || (l.type === "meal" && l.value > 0))
 ).sort((a,b) => b.timestamp - a.timestamp);

 return unlinkedLogs.length > 0 ? unlinkedLogs[0] : null;
 }, [logs]);

  const libBase = LIB_BASE;

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || libBase.length === 0) return [];
    const q = searchQuery.toLowerCase();
    return libBase.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.namePl && p.namePl.toLowerCase().includes(q)) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(q))
    ).slice(0, 3);
  }, [searchQuery, libBase]);

 const handleQuickAdd = async (product: Product, targetCarbs: number) => {
 if (!user || !latestUnlinked) return;
 setIsSaving(true);
 
 try {
 const carbsPer100 = product.carbs || 1;
 const amount = Math.round((targetCarbs / carbsPer100) * 100) || 0;
 const computedFat = Math.round(((product.fat || 0) * amount) / 100 * 10) / 10 || 0;
 const computedProtein = Math.round(((product.protein || 0) * amount) / 100 * 10) / 10 || 0;
 const computedCalories = Math.round((targetCarbs * 4) + (computedProtein * 4) + (computedFat * 9));
 
 const newItems = JSON.parse(JSON.stringify([{
 product: product,
 amount: amount,
 unit: "g",
 manualFat: null,
 manualProtein: null
 }]));

 const mealName = product.name || product.namePl || "Własny posiłek";

 if (latestUnlinked.type === "meal") {
 const updatedLog = {
 ...latestUnlinked,
 items: newItems,
 carbs: targetCarbs,
 fat: computedFat,
 protein: computedProtein,
 calories: computedCalories,
 name: mealName,
 description: mealName,
 notes: mealName
 };
 await setDoc(doc(db, "users", getEffectiveUid(user), "logs", updatedLog.id), { ...updatedLog, userModified: true }, { merge: true });
 window.dispatchEvent(new CustomEvent('localLogUpdate', { detail: { id: updatedLog.id, updates: updatedLog } }));
 } else {
 const updatedBolus = {
 ...latestUnlinked,
 description: mealName,
 notes: mealName,
 linkedMeal: {
 carbs: targetCarbs,
 fat: computedFat,
 protein: computedProtein,
 calories: computedCalories,
 items: newItems,
 name: mealName
 }
 };
 await setDoc(doc(db, "users", getEffectiveUid(user), "logs", updatedBolus.id), { ...updatedBolus, userModified: true }, { merge: true });
 window.dispatchEvent(new CustomEvent('localLogUpdate', { detail: { id: updatedBolus.id, updates: updatedBolus } }));
 }
 
 toast.success(t('auto.zapisano_posilek', { defaultValue: `Obliczono i zapisano ${amount}g - ${product.name || product.namePl}` }));
 handleDismiss(latestUnlinked.id);
 } catch (e: any) {
 console.error(e);
 toast.error(`Błąd: ${e?.message || e || 'Nieznany błąd zapisu'}`);
 } finally {
 setIsSaving(false);
 }
 };

  const handleAiEstimate = async (nameToEstimate: string) => {
    if (!nameToEstimate.trim() || isAiEstimating || isSaving || !latestUnlinked) return;
    const carbs = Math.round(((latestUnlinked as any).carbs || latestUnlinked.linkedMeal?.carbs || (latestUnlinked.type === "meal" ? latestUnlinked.value : 0)) * 10) / 10;
    const mealName = nameToEstimate.trim();
    setIsAiEstimating(true);
    const toastId = toast.loading(t('auto.ai_szuka_informacji_o_posilku', { defaultValue: 'AI analizuje posiłek i wylicza makroskładniki...' }));

    try {
      const { geminiService } = await import('../services/gemini');
      const prompt = `Pacjent zjadł "${mealName}". Wiemy, że porcja ta zawiera DOKŁADNIE ${carbs}g węglowodanów.
Na podstawie typowych proporcji makroskładników dla "${mealName}", oszacuj ile gramów białka i tłuszczu zjadł w tej porcji, oraz podaj Indeks Glikemiczny (IG).
Odpowiedz WYŁĄCZNIE czystym formatem JSON (bez \`\`\`json):
{"protein": <liczba>, "fat": <liczba>, "ig": <liczba>}`;

      const response = await geminiService.generateContent(prompt);
      const match = response.match(/\{[\s\S]*\}/);
      let estimatedProtein = 0;
      let estimatedFat = 0;
      let estimatedIg = 50;

      if (match) {
        const json = JSON.parse(match[0]);
        estimatedProtein = Number(json.protein) || 0;
        estimatedFat = Number(json.fat) || 0;
        estimatedIg = Number(json.ig) || 50;
      }

      const customProduct = {
        id: "custom_" + Date.now(),
        namePl: mealName + " (AI)",
        name: mealName + " (AI)",
        carbs: carbs,
        fat: estimatedFat,
        protein: estimatedProtein,
        ig: estimatedIg
      };

      toast.dismiss(toastId);
      toast.success(`✨ Zapisano z AI! Białko: ${estimatedProtein}g, Tłuszcz: ${estimatedFat}g, IG: ${estimatedIg}`);
      await handleQuickAdd(customProduct, carbs);
    } catch(err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Błąd AI. Zapisano tylko węglowodany.");
      const fallbackProduct = {
        id: "custom_" + Date.now(),
        namePl: mealName,
        name: mealName,
        carbs: carbs,
        fat: 0,
        protein: 0,
        gi: 50
      };
      await handleQuickAdd(fallbackProduct, carbs);
    } finally {
      setIsAiEstimating(false);
    }
  };

  if (!latestUnlinked || latestUnlinked.id === dismissedId) return null;

  const rawCarbs = (latestUnlinked as any).carbs || latestUnlinked.linkedMeal?.carbs || (latestUnlinked.type === "meal" ? latestUnlinked.value : 0);
  const carbs = Math.round(rawCarbs * 10) / 10;
  if (carbs <= 0) return null;
  const timeStr = new Date(latestUnlinked.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const cardContent = (
    <motion.div
      initial={isModal ? { opacity: 0, y: 50, scale: 0.95 } : { opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={isModal ? { opacity: 0, y: 50, scale: 0.95 } : { opacity: 0, y: -10, scale: 0.95 }}
      className={cn(
        "bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden text-white",
        isModal ? "w-full max-w-md mx-auto border-2 border-indigo-400/30" : "mx-4 mt-2"
      )}
    >
      <button 
        onClick={() => handleDismiss(latestUnlinked.id)}
        className="absolute top-4 right-4 z-20 text-white/70 hover:text-white transition-colors p-1.5 bg-black/20 hover:bg-black/40 rounded-full cursor-pointer"
        title="Pomiń ten posiłek"
      >
        <X size={16} strokeWidth={2.5} />
      </button>
      <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12 pointer-events-none">
        <Merge size={120} />
      </div>
      
      <div className="relative z-10 flex flex-col items-start gap-4">
        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-300" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
              {t('auto.oczekujący_posiłek', { defaultValue: i18n.t('auto.oczekujacy_posilek', { defaultValue: "Oczekujący Posiłek" }) })}
            </span>
          </div>
          
          <h3 className="text-lg font-black text-white leading-tight mt-1">
            {t('auto.podano', { defaultValue: 'Podano' })} {carbs} {t('auto.g_węglowodanów_o', { defaultValue: i18n.t('auto.g_weglowodanow_o', { defaultValue: "g węglowodanów o" }) })} {timeStr}
          </h3>
          
          <p className="text-[11px] font-bold text-indigo-100 pr-4 leading-relaxed mt-1 mb-2">
            {t('auto.ten_wpis_z_pompy_nie_zawiera_inform', { defaultValue: i18n.t('auto.ten_wpis_z_pompy_nie_zawi', { defaultValue: "Wpis z pompy nie zawiera składników. Wpisz nazwę posiłku lub kliknij propozycję AI:" }) })}
          </p>
          
          {/* Search / AI Input */}
          <div className="relative w-full mb-2">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchQuery.trim().length > 0) {
                  handleAiEstimate(searchQuery.trim());
                }
              }}
              placeholder={t('auto.co_zjadles', { defaultValue: "Wpisz co zjadłeś (np. pizza, jabłko)..." })}
              className="w-full bg-indigo-950/60 text-white placeholder-indigo-300/60 rounded-xl py-3 pl-10 pr-12 text-[12px] font-bold outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all border border-indigo-400/30"
            />
            {searchQuery.trim().length > 0 && (
              <button
                onClick={() => handleAiEstimate(searchQuery.trim())}
                disabled={isAiEstimating || isSaving}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-400 text-white p-1.5 rounded-lg shadow-md transition-transform active:scale-90 flex items-center justify-center cursor-pointer"
                title="Oszacuj z AI"
              >
                {isAiEstimating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              </button>
            )}
          </div>

          {/* Quick AI Suggestions when input is empty */}
          {searchQuery.trim().length === 0 && (
            <div className="flex flex-col gap-1.5 w-full mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200 flex items-center gap-1">
                <Sparkles size={11} className="text-emerald-300" />
                Szybkie propozycje AI:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['Kanapka', 'Banan', 'Pizza', 'Jabłko', 'Makaron', 'Owsianka', 'Zupa'].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setSearchQuery(item);
                      handleAiEstimate(item);
                    }}
                    className="text-[10px] font-bold bg-white/15 hover:bg-white/25 active:scale-95 px-2.5 py-1 rounded-lg text-white border border-white/10 transition-all cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results from Local Food Database */}
          {searchResults.length > 0 && (
            <div className="flex flex-col gap-1 w-full mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">
                Z bazy produktów:
              </span>
              {searchResults.map(p => {
                const amount = Math.round((carbs / (p.carbs || 1)) * 100);
                return (
                  <button
                    key={p.id}
                    disabled={isSaving || isAiEstimating}
                    onClick={() => handleQuickAdd(p, carbs)}
                    className="flex items-center justify-between bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <span className="text-[11px] font-bold text-white truncate max-w-[140px]">{p.name || p.namePl}</span>
                    <span className="text-[10px] font-black text-indigo-200 bg-black/20 px-2 py-1 rounded-lg shrink-0">
                      {amount}g <CheckCircle2 size={10} className="inline ml-1" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* AI Loader */}
          {(isAiEstimating || isSaving) && (
            <div className="flex items-center gap-3 bg-emerald-950/90 border border-emerald-400/50 p-3 rounded-xl w-full mb-2 shadow-lg animate-pulse">
              <Loader2 size={18} className="animate-spin text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[12px] font-black text-white">AI szuka i wylicza makroskładniki...</span>
                <span className="text-[10px] font-bold text-emerald-200">GlikoSense dopasowuje wartości odżywcze</span>
              </div>
            </div>
          )}

          {/* Prominent AI Generator Button when query is present */}
          {searchQuery.trim().length > 0 && !isAiEstimating && (
            <button
              disabled={isSaving || isAiEstimating}
              onClick={() => handleAiEstimate(searchQuery.trim())}
              className="flex items-center justify-between bg-emerald-500/25 hover:bg-emerald-500/35 active:scale-95 px-3.5 py-2.5 rounded-xl transition-all text-left mt-1 border border-emerald-400/40 w-full cursor-pointer shadow-sm"
            >
              <span className="text-[11px] font-black text-emerald-100 truncate flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-300 animate-pulse" />
                {t('auto.wygeneruj_z_ai', { defaultValue: 'Wygeneruj makro (AI):' })} "{searchQuery.trim()}"
              </span>
              <span className="text-[10px] font-black text-emerald-200 bg-emerald-900/50 px-2 py-1 rounded-lg shrink-0 border border-emerald-400/30">
                {carbs}g W
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full pt-1">
          <button
            onClick={onAddCarbs}
            className="flex-1 bg-white text-indigo-600 hover:bg-slate-50 font-black text-[11px] uppercase tracking-widest py-3 px-4 rounded-2xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
          >
            <Plus size={16} />
            {t('auto.ułóż_posiłek_na_talerzu', { defaultValue: i18n.t('auto.uloz_posilek_na_talerzu', { defaultValue: "Talerz (Ręcznie)" }) })}
          </button>
          <button
            onClick={() => handleDismiss(latestUnlinked.id)}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white/80 font-bold text-[11px] uppercase tracking-wider rounded-2xl transition-all active:scale-95 cursor-pointer"
          >
            Pomiń
          </button>
        </div>
      </div>
    </motion.div>
  );

  if (isModal) {
    return createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-4 pb-20 sm:pb-4"
          onClick={() => onClose?.()}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
            {cardContent}
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  }

  return (
    <AnimatePresence>
      {cardContent}
    </AnimatePresence>
  );
}
