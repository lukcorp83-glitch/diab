import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry, Product } from '../types';
import { X, Save, Utensils, Apple, Syringe, Search, Globe, Loader2, Plus, Zap } from 'lucide-react';
import { doc, updateDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid, cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { LIB_BASE } from '../constants';
import { geminiService } from '../services/gemini';

interface MealEditModalProps {
  log: LogEntry;
  user: any;
  onClose: () => void;
}

export default function MealEditModal({ log, user, onClose }: MealEditModalProps) {
  const isBolus = log.type === 'bolus';
  const initialCarbs = isBolus ? (log.linkedMeal?.carbs?.toString() || '') : (log.value?.toString() || '');
  const initialPolyols = isBolus ? (log.linkedMeal?.polyols?.toString() || '') : (log.polyols?.toString() || '');
  const initialProtein = isBolus ? (log.linkedMeal?.protein?.toString() || '') : (log.protein?.toString() || '');
  const initialFat = isBolus ? (log.linkedMeal?.fat?.toString() || '') : (log.fat?.toString() || '');
  const initialInsulin = isBolus ? (log.value?.toString() || '') : '';

  const [carbs, setCarbs] = useState(initialCarbs);
  const [polyols, setPolyols] = useState(initialPolyols);
  const [protein, setProtein] = useState(initialProtein);
  const [fat, setFat] = useState(initialFat);
  const [insulin, setInsulin] = useState(initialInsulin);
  const [notes, setNotes] = useState(log.notes || log.description || '');
  const [loading, setLoading] = useState(false);

  // Search functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineResults, setOnlineResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [communityProducts, setCommunityProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!user) return;
    const q1 = query(collection(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "customProducts"));
    const unsub1 = onSnapshot(q1, (snap) => {
      setCustomProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
    });
    const q2 = query(collection(db, "artifacts", "diacontrolapp", "communityProducts"));
    const unsub2 = onSnapshot(q2, (snap) => {
      setCommunityProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]);
    });
    return () => { unsub1(); unsub2(); };
  }, [user]);

  const allLocal = [...customProducts, ...communityProducts, ...LIB_BASE];
  const searchResults = allLocal.filter(p => 
    p && p.name && searchTerm.length >= 2 && p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const handleOnlineSearch = async () => {
    if (!searchTerm || isSearching) return;
    setIsSearching(true);
    setOnlineResults([]);
    try {
      const prompt = `Jesteś dietetykiem. Podaj wartości odżywcze dla produktu: "${searchTerm}" na 100g lub standardową porcję. 
      Zwróć format JSON (tylko JSON): [{"name": string, "carbs": number, "protein": number, "fat": number, "gi": number}].`;
      const result = await geminiService.generateContent(prompt);
      const jsonMatch = result.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
         const parsed = JSON.parse(jsonMatch[0]);
         const resultsArray = Array.isArray(parsed) ? parsed : [parsed];
         setOnlineResults(resultsArray.map((p, i) => ({ ...p, id: `online_${i}_${Date.now()}`, isOnline: true })));
      }
    } catch (err) {
      console.error("AI search failed:", err);
      toast.error("Błąd wyszukiwania AI");
    } finally {
      setIsSearching(false);
    }
  };

  const addProduct = (p: Product) => {
    const c = Math.round((parseFloat(carbs || '0') + (p.carbs || 0)) * 10) / 10;
    const pol = Math.round((parseFloat(polyols || '0') + (p.polyols || 0)) * 10) / 10;
    const pr = Math.round((parseFloat(protein || '0') + (p.protein || 0)) * 10) / 10;
    const f = Math.round((parseFloat(fat || '0') + (p.fat || 0)) * 10) / 10;
    
    setCarbs(c.toString());
    setPolyols(pol.toString());
    setProtein(pr.toString());
    setFat(f.toString());
    
    const newNote = notes ? `${notes}, ${p.name}` : p.name;
    setNotes(newNote);
    
    setSearchTerm("");
    setOnlineResults([]);
    toast.success(`Dodano ${p.name}`);
  };

  const handleSave = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const logRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs', log.id);
      const updates: any = {
        notes: notes,
        description: notes
      };

      if (isBolus) {
        updates.value = Math.round((parseFloat(insulin) || 0) * 10) / 10;
        if (parseFloat(carbs) > 0) {
          updates.linkedMeal = {
            carbs: Math.round((parseFloat(carbs) || 0) * 10) / 10,
            polyols: Math.round((parseFloat(polyols) || 0) * 10) / 10 || null,
            protein: Math.round((parseFloat(protein) || 0) * 10) / 10,
            fat: Math.round((parseFloat(fat) || 0) * 10) / 10
          };
        } else {
          updates.linkedMeal = null;
        }
      } else {
        const netCarbs = Math.max(0, (parseFloat(carbs) || 0) - (parseFloat(polyols) || 0));
        updates.value = Math.round(netCarbs * 10) / 10;
        updates.polyols = Math.round((parseFloat(polyols) || 0) * 10) / 10 || null;
        updates.protein = Math.round((parseFloat(protein) || 0) * 10) / 10 || null;
        updates.fat = Math.round((parseFloat(fat) || 0) * 10) / 10 || null;
      }

      await updateDoc(logRef, updates);
      toast.success(isBolus ? 'Zaktualizowano bolus!' : 'Zaktualizowano posiłek!');
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
      toast.error('Błąd aktualizacji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
      >
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center",
                isBolus ? "bg-accent-500/10 text-accent-500" : "bg-amber-500/10 text-amber-500"
              )}>
                {isBolus ? <Syringe size={20} /> : <Utensils size={20} />}
              </div>
              <div>
                <h3 className="text-lg font-black dark:text-white leading-none">
                  {isBolus ? 'Edytuj Bolus' : 'Edytuj Posiłek'}
                </h3>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Popraw dane wpisu</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Search Section */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Dodaj produkty do posiłku</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="NP. Banan, Pizza, Chleb..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleOnlineSearch()}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 pl-12 pr-12 rounded-2xl font-bold outline-none border border-slate-200 dark:border-slate-700 focus:border-accent-500 transition-all dark:text-white text-sm"
                />
                <button 
                  onClick={handleOnlineSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-accent-500 text-white rounded-xl shadow-sm hover:bg-accent-600 transition-all disabled:opacity-50"
                  disabled={isSearching || !searchTerm}
                >
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                </button>
              </div>

              {/* Search Results */}
              <AnimatePresence>
                {(searchResults.length > 0 || onlineResults.length > 0) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-48 overflow-y-auto"
                  >
                    {[...searchResults, ...onlineResults].map((p, idx) => (
                      <button 
                        key={p.id || idx}
                        onClick={() => addProduct(p)}
                        className="w-full p-3 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                            <Zap size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-black dark:text-white line-clamp-1">{p.name}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                              {p.carbs}g W / {p.protein}g B / {p.fat}g T
                            </div>
                          </div>
                        </div>
                        <Plus size={16} className="text-accent-500 flex-shrink-0" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              {isBolus && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Dawka Insuliny (j.)</label>
                  <input 
                    type="number"
                    value={insulin}
                    onChange={e => setInsulin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl font-black text-center outline-none border border-slate-200 dark:border-slate-700 focus:border-accent-500 transition-all dark:text-white"
                    placeholder="0.0"
                    step="0.1"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 flex flex-col justify-center text-center">
                    <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400">Netto WW: {(Math.max(0, (parseFloat(carbs) || 0) - (parseFloat(polyols) || 0))).toFixed(1)}g</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest ml-2">Poliole (g)</label>
                    <input 
                      type="number"
                      value={polyols}
                      onChange={e => setPolyols(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl font-black text-center outline-none border border-slate-200 dark:border-slate-700 focus:border-emerald-500 transition-all dark:text-white"
                      placeholder="0.0"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Węglowodany (g)</label>
                   <input 
                    type="number"
                    value={carbs}
                    onChange={e => setCarbs(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl font-black text-center outline-none border border-slate-200 dark:border-slate-700 focus:border-amber-500 transition-all dark:text-white"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-2">Białko (g)</label>
                   <input 
                    type="number"
                    value={protein}
                    onChange={e => setProtein(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl font-black text-center outline-none border border-slate-200 dark:border-slate-700 focus:border-emerald-500 transition-all dark:text-white"
                   />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-rose-500/60 uppercase tracking-widest ml-2">Tłuszcz (g)</label>
                   <input 
                    type="number"
                    value={fat}
                    onChange={e => setFat(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl font-black text-center outline-none border border-slate-200 dark:border-slate-700 focus:border-rose-500 transition-all dark:text-white"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Data / Godzina</label>
                   <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl font-bold text-[10px] text-center text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      {new Date(log.timestamp).toLocaleString([], {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}
                   </div>
                 </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Notatka (produkty)</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-bold text-sm outline-none border border-slate-200 dark:border-slate-700 focus:border-accent-500 transition-all dark:text-white resize-none"
                  placeholder="Opis posiłku..."
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-accent-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-accent-700 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            Zaktualizuj Wpis
          </button>
        </div>
      </motion.div>
    </div>
  );
}
