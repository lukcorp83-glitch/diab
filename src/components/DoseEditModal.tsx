import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Save, Trash2, Syringe, Activity, Loader2 } from "lucide-react";
import { LogEntry } from "../types";
import { db } from "../lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getEffectiveUid } from "../lib/utils";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface DoseEditModalProps {
  log: LogEntry;
  user: any;
  onClose: () => void;
}

export default function DoseEditModal({ log, user, onClose }: DoseEditModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  // States based on log type
  const [notes, setNotes] = useState(log.notes || log.description || "");
  const [value, setValue] = useState(log.value ? String(log.value) : ""); // For glucose or bolus value if log.bolus is not set
  const [bolus, setBolus] = useState(log.bolus ? String(log.bolus) : (log.type === "bolus" || (log.type as any) === "insulin" ? String(log.value || "") : ""));
  const [carbs, setCarbs] = useState(log.type === "carbs" ? String(log.value || "") : (log.linkedMeal?.carbs ? String(log.linkedMeal.carbs) : ""));

  const handleSave = async () => {
    if (!user || loading) return;
    if (!log.id) {
      toast.error(t('auto.nie_mozna_edytowac_wpisu_brak', { defaultValue: "Nie można edytować wpisu (brak ID elementu)." }));
      return;
    }
    setLoading(true);
    try {
      const logRef = doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs", log.id);
      
      const updates: any = {
        notes: notes,
        description: notes,
      };

      if (log.type === "glucose") {
        updates.value = parseFloat(value) || 0;
      }
      if (log.type === "carbs") {
        updates.value = parseFloat(carbs) || 0;
        updates.carbs = parseFloat(carbs) || 0;
      }
      if (log.type === "bolus" || (log.type as any) === "insulin") {
        updates.bolus = parseFloat(bolus) || 0;
        if (log.value && !log.bolus) updates.value = parseFloat(bolus) || 0;
        
        if (log.linkedMeal || carbs) {
          const parsedCarbs = parseFloat(carbs) || 0;
          updates.linkedMeal = log.linkedMeal ? { ...log.linkedMeal, carbs: parsedCarbs, value: parsedCarbs } : { type: "meal", carbs: parsedCarbs, value: parsedCarbs, timestamp: log.timestamp };
          updates.carbs = parsedCarbs;
        }
      }

      await updateDoc(logRef, updates);
      toast.success(t('auto.zaktualizowano_wpis', { defaultValue: "Zaktualizowano wpis!" }), { id: "dose-save" });
      onClose();
    } catch (e) {
      toast.error("Błąd aktualizacji", { id: "dose-save" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !log.id || loading) return;
    const ok = window.confirm(t('auto.czy_na_pewno_chcesz_usunac_wpis', { defaultValue: "Czy na pewno chcesz usunąć ten wpis?" }));
    if (!ok) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs", log.id));
      toast.success(t('auto.usunieto', { defaultValue: "Usunięto!" }), { id: "dose-delete" });
      onClose();
    } catch (e) {
      toast.error("Błąd usuwania", { id: "dose-delete" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 isolate">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
              log.type === "glucose" ? "bg-indigo-500/10 text-indigo-500" :
              log.type === "bolus" || (log.type as any) === "insulin" ? "bg-accent-500/10 text-accent-500" :
              "bg-emerald-500/10 text-emerald-500"
            }`}>
              {log.type === "glucose" ? <Activity size={20} /> : <Syringe size={20} />}
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800 dark:text-white leading-none mb-1">
                {t('auto.edycja_wpisu', { defaultValue: "Edycja wpisu" })}
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                {new Date(log.timestamp || log.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {log.type === "glucose" && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Wartość (mg/dL)
              </label>
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-lg font-black focus:outline-none focus:border-accent-500 transition-colors"
              />
            </div>
          )}

          {(log.type === "carbs" || log.type === "bolus" || (log.type as any) === "insulin") && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Węglowodany (g W)
              </label>
              <input
                type="number"
                step="0.1"
                value={carbs}
                onChange={e => setCarbs(e.target.value)}
                placeholder="Np. 15.5"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-lg font-black focus:outline-none focus:border-accent-500 transition-colors"
              />
            </div>
          )}

          {(log.type === "bolus" || (log.type as any) === "insulin") && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                {t('auto.dawka_insuliny_j', { defaultValue: "Dawka Insuliny (j.)" })}
              </label>
              <input
                type="number"
                step="0.05"
                value={bolus}
                onChange={e => setBolus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-lg font-black focus:outline-none focus:border-accent-500 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
              {t('auto.notatki', { defaultValue: "Notatki" })}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-accent-500 transition-colors min-h-[100px]"
              placeholder="Własna notatka..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3 shrink-0">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <Trash2 size={24} />
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-accent-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-accent-700 transition-colors shadow-lg shadow-accent-600/30 disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {t('auto.zapisz', { defaultValue: "Zapisz" })}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
