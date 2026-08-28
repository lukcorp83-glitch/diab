import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Save, Trash2, Syringe, Activity, Loader2, Droplets, RefreshCw, Calendar, MapPin } from "lucide-react";
import { LogEntry } from "../types";
import { db } from "../lib/firebase";
import { doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { getEffectiveUid } from "../lib/utils";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../stores/useAuthStore";
import { useLogsStore } from "../stores/useLogsStore";
import { dbService } from "../services/databaseService";

interface DoseEditModalProps {
  log: LogEntry;
  user?: any;
  onClose: () => void;
}

const BODY_SITES = [
  "Lewy brzuch",
  "Prawy brzuch",
  "Lewy pośladek",
  "Prawy pośladek",
  "Lewy boczek / plecy",
  "Prawy boczek / plecy",
  "Lewe udo",
  "Prawe udo",
  "Lewe ramię",
  "Prawe ramię",
  "Inne"
];

export default function DoseEditModal({ log, user: propUser, onClose }: DoseEditModalProps) {
  const authUser = useAuthStore(state => state.user);
  const user = propUser || authUser;
  const logs = useLogsStore(state => state.logs);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  // States based on log type
  const [notes, setNotes] = useState(log.notes || log.description || "");
  const [value, setValue] = useState(log.value ? String(log.value) : "");
  const [bolus, setBolus] = useState(log.bolus ? String(log.bolus) : (log.type === "bolus" || (log.type as any) === "insulin" ? String(log.value || "") : ""));
  const [carbs, setCarbs] = useState(log.type === "carbs" ? String(log.value || "") : (log.linkedMeal?.carbs ? String(log.linkedMeal.carbs) : ""));
  const [site, setSite] = useState((log as any).site || (log.notes?.includes(" - ") ? log.notes.split(" - ")[1] : "Lewy brzuch"));
  const [timestamp, setTimestamp] = useState(() => {
    const ts = log.timestamp || (log as any).createdAt;
    return ts ? new Date(ts - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  });

  const uid = getEffectiveUid(user);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (!user || loading) return;
    if (!log.id) {
      toast.error(t('auto.nie_mozna_edytowac_wpisu_brak', { defaultValue: "Nie można edytować wpisu (brak ID elementu)." }));
      return;
    }
    setLoading(true);
    try {
      const chosenTs = timestamp ? new Date(timestamp).getTime() : log.timestamp;
      
      const updates: any = {
        notes: notes,
        description: notes,
        timestamp: chosenTs
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
          updates.linkedMeal = log.linkedMeal ? { ...log.linkedMeal, carbs: parsedCarbs, value: parsedCarbs } : { type: "meal", carbs: parsedCarbs, value: parsedCarbs, timestamp: chosenTs };
          updates.carbs = parsedCarbs;
        }
      }
      if (log.type === "site_change") {
        updates.site = site;
        updates.notes = notes || `Wymiana wkłucia - ${site}`;
      }
      if (log.type === "sensor_change") {
        updates.notes = notes || "Wymiana sensora";
      }

      if (uid && log.id) {
        const logRef = doc(db, "users", uid, "logs", log.id);
        await updateDoc(logRef, updates).catch(e => console.warn("Firestore update error:", e));
      }
      await dbService.saveLog({ ...log, ...updates });
      window.dispatchEvent(new CustomEvent('localLogUpdate', { detail: { id: log.id, updates } }));

      // Jeśli edytowano najnowsze wkłucie / sensor, zaktualizuj też profil
      if (uid) {
        if (log.type === "site_change") {
          await setDoc(
            doc(db, "users", uid, "settings", "profile"),
            { infusionSetChangeDate: chosenTs, infusionSetSite: site, infusionSite: site },
            { merge: true }
          ).catch(() => {});
        } else if (log.type === "sensor_change") {
          await setDoc(
            doc(db, "users", uid, "settings", "profile"),
            { sensorChangeDate: chosenTs },
            { merge: true }
          ).catch(() => {});
        }
      }

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

    setLoading(true);
    try {
      if (uid && log.id) {
        await deleteDoc(doc(db, "users", uid, "logs", log.id)).catch(e => console.warn("Delete doc error:", e));
      }
      await dbService.deleteLog(log.id).catch(() => {});
      window.dispatchEvent(new CustomEvent('localLogDelete', { detail: { id: log.id } }));

      // Jeśli usunięto wkłucie lub sensor, cofnij datę w profilu do poprzedniego wpisu!
      if (uid) {
        if (log.type === "site_change") {
          const remainingSiteLogs = (logs || [])
            .filter(l => l.id !== log.id && l.type === "site_change" && !l.notes?.toLowerCase().includes("zbiorniczk"))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          const prevSiteLog = remainingSiteLogs[0];
          await setDoc(
            doc(db, "users", uid, "settings", "profile"),
            {
              infusionSetChangeDate: prevSiteLog ? prevSiteLog.timestamp : null,
              infusionSetSite: prevSiteLog ? (prevSiteLog as any).site || "Lewy brzuch" : "Lewy brzuch",
              infusionSite: prevSiteLog ? (prevSiteLog as any).site || "Lewy brzuch" : "Lewy brzuch"
            },
            { merge: true }
          ).catch(() => {});
        } else if (log.type === "sensor_change") {
          const remainingSensorLogs = (logs || [])
            .filter(l => l.id !== log.id && l.type === "sensor_change")
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          const prevSensorLog = remainingSensorLogs[0];
          await setDoc(
            doc(db, "users", uid, "settings", "profile"),
            {
              sensorChangeDate: prevSensorLog ? prevSensorLog.timestamp : null
            },
            { merge: true }
          ).catch(() => {});
        }
      }

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
 log.type === "site_change" || log.type === "sensor_change" ? "bg-teal-500/10 text-teal-500" :
 log.type === "bolus" || (log.type as any) === "insulin" ? "bg-accent-500/10 text-accent-500" :
 "bg-amber-500/10 text-amber-500"
 }`}>
 {log.type === "glucose" ? <Activity size={20} /> :
  log.type === "site_change" ? <Droplets size={20} /> :
  log.type === "sensor_change" ? <RefreshCw size={20} /> :
  <Syringe size={20} />}
 </div>
 <div>
 <h3 className="font-black text-lg text-slate-800 dark:text-white leading-none mb-1">
 {log.type === "site_change" ? "Wymiana wkłucia" :
  log.type === "sensor_change" ? "Wymiana sensora" :
  t('auto.edycja_wpisu', { defaultValue: "Edycja wpisu" })}
 </h3>
 <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
 {new Date(log.timestamp || (log as any).createdAt).toLocaleString()}
 </p>
 </div>
 </div>
 <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
 <X size={20} />
 </button>
 </div>

 {/* Content */}
 <div className="p-6 overflow-y-auto space-y-5">
 {/* Data i Godzina wpisu */}
 <div>
 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1 flex items-center gap-1.5">
 <Calendar size={12} className="text-indigo-500" /> Data i godzina
 </label>
 <input
 type="datetime-local"
 value={timestamp}
 onChange={e => setTimestamp(e.target.value)}
 className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold dark:text-white focus:outline-none focus:border-accent-500 transition-colors"
 />
 </div>

 {log.type === "site_change" && (
 <div>
 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1 flex items-center gap-1.5">
 <MapPin size={12} className="text-teal-500" /> Miejsce wkłucia
 </label>
 <select
 value={site}
 onChange={e => setSite(e.target.value)}
 className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold dark:text-white focus:outline-none focus:border-accent-500 transition-colors cursor-pointer"
 >
 {BODY_SITES.map(s => (
   <option key={s} value={s}>{s}</option>
 ))}
 </select>
 </div>
 )}

 {log.type === "glucose" && (
 <div>
 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
 Wartość (mg/dL)
 </label>
 <input
 type="number"
 value={value}
 onChange={e => setValue(e.target.value)}
 className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-lg font-black dark:text-white focus:outline-none focus:border-accent-500 transition-colors"
 />
 </div>
 )}

 {(log.type === "carbs" || log.type === "bolus" || (log.type as any) === "insulin") && (
 <div>
 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
 Węglowodany (g W)
 </label>
 <input
 type="number"
 step="0.1"
 value={carbs}
 onChange={e => setCarbs(e.target.value)}
 placeholder="Np. 15.5"
 className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-lg font-black dark:text-white focus:outline-none focus:border-accent-500 transition-colors"
 />
 </div>
 )}

 {(log.type === "bolus" || (log.type as any) === "insulin") && (
 <div>
 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
 {t('auto.dawka_insuliny_j', { defaultValue: "Dawka Insuliny (j.)" })}
 </label>
 <input
 type="number"
 step="0.05"
 value={bolus}
 onChange={e => setBolus(e.target.value)}
 className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-lg font-black dark:text-white focus:outline-none focus:border-accent-500 transition-colors"
 />
 </div>
 )}

 <div>
 <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
 {t('auto.notatki', { defaultValue: "Notatki" })}
 </label>
 <textarea
 value={notes}
 onChange={e => setNotes(e.target.value)}
 className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-medium dark:text-white focus:outline-none focus:border-accent-500 transition-colors min-h-[90px]"
 placeholder="Własna notatka..."
 />
 </div>
 </div>

  {/* Footer */}
  <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3 shrink-0 items-center">
  {confirmDelete ? (
    <div className="w-full flex items-center gap-2 animate-in fade-in">
      <button
        onClick={() => setConfirmDelete(false)}
        disabled={loading}
        className="flex-1 py-3.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-300 transition-colors"
      >
        Anuluj
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-colors flex items-center justify-center gap-1.5"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        Potwierdź usunięcie
      </button>
    </div>
  ) : (
    <>
      <button
        onClick={() => setConfirmDelete(true)}
        disabled={loading}
        className="p-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl transition-colors disabled:opacity-50"
        title="Usuń wpis"
      >
        <Trash2 size={24} />
      </button>
      
      <button
        onClick={handleSave}
        disabled={loading}
        className="flex-1 bg-accent-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-accent-700 transition-colors shadow-lg shadow-accent-600/30 disabled:opacity-50"
      >
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
        {t('auto.zapisz', { defaultValue: "Zapisz" })}
      </button>
    </>
  )}
  </div>
  </motion.div>
 </div>
 );
}
