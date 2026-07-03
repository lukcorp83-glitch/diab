import React, { useMemo, useState } from 'react';
import { LogEntry, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Merge, AlertCircle, Plus, X, Search, CheckCircle2 } from 'lucide-react';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { LIB_BASE } from "../constants";
import { db } from "../lib/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

interface Props {
  user?: any;
  logs: LogEntry[];
  onAddCarbs: () => void;
}

export default function UnlinkedCarbsWidget({ user, logs, onAddCarbs }: Props) {
  const { t } = useTranslation();
  const [dismissedId, setDismissedId] = useState<string | null>(() => {
    return sessionStorage.getItem('dismissed_unlinked_id');
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleDismiss = (id: string) => {
    setDismissedId(id);
    sessionStorage.setItem('dismissed_unlinked_id', id);
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

  const searchResults = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase();
    return LIB_BASE.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.namePl && p.namePl.toLowerCase().includes(q)) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(q))
    ).slice(0, 3);
  }, [searchQuery]);

  const handleQuickAdd = async (product: Product, targetCarbs: number) => {
    if (!user || !latestUnlinked) return;
    setIsSaving(true);
    
    try {
      const carbsPer100 = product.carbs;
      const amount = Math.round((targetCarbs / carbsPer100) * 100);
      const computedFat = Math.round(((product.fat || 0) * amount) / 100 * 10) / 10;
      const computedProtein = Math.round(((product.protein || 0) * amount) / 100 * 10) / 10;
      
      const newItems = [{
         product: product,
         amount: amount,
         unit: "g",
         manualFat: null,
         manualProtein: null
      }];

      if (latestUnlinked.type === "meal") {
         await updateDoc(doc(db, "users", user.uid, "logs", latestUnlinked.id), {
            items: newItems,
            fat: computedFat,
            protein: computedProtein
         });
      } else {
         await addDoc(collection(db, "users", user.uid, "logs"), {
            type: "meal",
            value: targetCarbs,
            carbs: targetCarbs,
            fat: computedFat,
            protein: computedProtein,
            items: newItems,
            timestamp: latestUnlinked.timestamp,
            createdAt: Date.now()
         });
         await updateDoc(doc(db, "users", user.uid, "logs", latestUnlinked.id), {
            linkedMeal: {
               carbs: targetCarbs,
               fat: computedFat,
               protein: computedProtein
            }
         });
      }
      
      toast.success(t('auto.zapisano_posilek', { defaultValue: `Obliczono i zapisano ${amount}g - ${product.name || product.namePl}` }));
      handleDismiss(latestUnlinked.id);
    } catch (e) {
      console.error(e);
      toast.error("Wystąpił błąd podczas zapisywania");
    } finally {
      setIsSaving(false);
    }
  };

  if (!latestUnlinked || latestUnlinked.id === dismissedId) return null;

  const rawCarbs = (latestUnlinked as any).carbs || latestUnlinked.linkedMeal?.carbs || (latestUnlinked.type === "meal" ? latestUnlinked.value : 0);
  const carbs = Math.round(rawCarbs * 10) / 10;
  if (carbs <= 0) return null;
  const timeStr = new Date(latestUnlinked.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="mx-4 mt-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-5 shadow-lg relative overflow-hidden"
      >
        <button 
          onClick={() => handleDismiss(latestUnlinked.id)}
          className="absolute top-3 right-3 z-20 text-white/50 hover:text-white transition-colors p-1"
        >
          <X size={16} />
        </button>
        <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12 pointer-events-none">
          <Merge size={120} />
        </div>
        
        <div className="relative z-10 flex flex-col items-start gap-4">
          <div className="flex flex-col gap-1 w-full">
             <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-white/80" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                {t('auto.oczekujący_posiłek', { defaultValue: i18n.t('auto.oczekujacy_posilek', { defaultValue: "Oczekujący Posiłek" }) })}
                </span>
             </div>
             
             <h3 className="text-lg font-black text-white leading-tight mt-1">
                {t('auto.podano', { defaultValue: 'Podano' })} {carbs}{t('auto.g_węglowodanów_o', { defaultValue: i18n.t('auto.g_weglowodanow_o', { defaultValue: "g węglowodanów o" }) })} {timeStr}
             </h3>
             
             <p className="text-[11px] font-bold text-indigo-100 pr-4 leading-relaxed mt-1 mb-3">
                {t('auto.ten_wpis_z_pompy_nie_zawiera_inform', { defaultValue: i18n.t('auto.ten_wpis_z_pompy_nie_zawi', { defaultValue: "Ten wpis z pompy nie zawiera informacji o jedzeniu. Dodaj składniki, aby GlikoSense mogło analizować wchłanianie." }) })}
             </p>
             
             <div className="relative w-full mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" />
                <input
                   type="text"
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder={t('auto.co_zjadles', { defaultValue: "Wpisz co zjadłeś (np. Kebab)..." })}
                   className="w-full bg-indigo-900/40 text-white placeholder-indigo-300/60 rounded-xl py-2.5 pl-9 pr-3 text-[12px] font-bold outline-none focus:ring-2 focus:ring-white/30 transition-all"
                />
             </div>
             
             {searchResults.length > 0 && (
                <div className="flex flex-col gap-1 w-full mb-3">
                   {searchResults.map(p => {
                      const amount = Math.round((carbs / (p.carbs || 1)) * 100);
                      return (
                         <button
                            key={p.id}
                            disabled={isSaving}
                            onClick={() => handleQuickAdd(p, carbs)}
                            className="flex items-center justify-between bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-colors text-left"
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
          </div>
          
          <button
            onClick={onAddCarbs}
            className="w-full bg-white text-indigo-600 hover:bg-slate-50 font-black text-[11px] uppercase tracking-widest py-3 px-5 rounded-2xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-md"
          >
            <Plus size={16} />
            {t('auto.ułóż_posiłek_na_talerzu', { defaultValue: i18n.t('auto.uloz_posilek_na_talerzu', { defaultValue: "Talerz (Ręcznie)" }) })}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
