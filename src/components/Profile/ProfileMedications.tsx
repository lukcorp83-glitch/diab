import { useLogsStore } from "../../stores/useLogsStore";
import { geminiService } from "../../services/gemini";
import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Haptics } from "../../lib/haptics";
import { healthService } from "../../services/healthService";
import { toast } from "react-hot-toast";
import { getEffectiveUid, cn, isNativeApp } from "../../lib/utils";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, Reorder } from "motion/react";
import {
 Settings,
 LogOut,
 Moon,
 Sun,
 Smartphone,
 Bell,
 Shield,
 Info,
 Globe,
 Loader2,
 Zap,
 Medal,
 Trophy,
 Activity,
 History,
 Utensils,
 Beaker,
 Baby,
 CheckCircle2,
 Pill,
 Plus,
 Trash,
 X,
 User,
 ChevronLeft,
 ChevronRight,
 ChevronDown,
 Cloud,
 ShoppingBag,
 Coins,
 Star,
 Sparkles,
 Check,
 Calendar,
 Brain,
 Signal,
 Droplets,
 Palette,
 RefreshCw,
 ShieldCheck,
 Play,
 Lock as LucideLock,
 BookOpen,
 Edit2,
 GripVertical,
 HelpCircle,
 CloudRain,
 Calculator,
 BarChart2,
 AlertTriangle,
 Apple,
 Dumbbell,
 Box,
 Minus,
 Edit3,
 Download,
 Save,
 ArrowLeft,
 Share2,
 Network,
 Bot,
 MessageCircle,
 Camera,
 Pizza,
 FileJson,
} from "lucide-react";
import { db, auth, onConnectionChange } from "../../lib/firebase";
import { deleteUser } from "firebase/auth";

import {
 doc,
 getDoc,
 getDocs,
 setDoc,
 collection,
 onSnapshot,
 addDoc,
 deleteDoc,
 updateDoc,
 serverTimestamp,
} from "firebase/firestore";
import { notificationService } from "../../services/notificationService";
import { UserSettings, LogEntry, InventoryItem } from "../../types";
import { useQueryClient } from "@tanstack/react-query";
import {
 APP_VERSION,
 MEDICAL_DICTIONARY,
 extractGTIN,
 lookupMedicalDictionary,
} from "../../constants";
import { SKINS, PetSkin, ACCESSORIES, BACKGROUNDS, PetAccessory, PetBackground } from '../../data/petDatabase';
import { PWA_VERSIONS, APK_VERSIONS, CURRENT_VERSION } from "../../constants/versions";

import CgmImport from "../CgmImport";
import DevicePairing from "../DevicePairing";
import RemoteAlertSender from "../RemoteAlertSender";
import BarcodeScannerModal from "../BarcodeScannerModal";
import SettingsTransfer from "../SettingsTransfer";
import LocalSync from "../LocalSync";
import CloudPackageSync from "../CloudPackageSync";
import ApiIntegration from "../ApiIntegration";
import PumpSimulator from "../PumpSimulator";
import { Diets } from "../Diets";

import SiteRotationWidget from '../SiteRotationWidget';
import StatisticsView from "../StatisticsView";
import TutorialView from "../TutorialView";
import GlikoTraining from "../GlikoTraining";

import { ConnectedDevice } from "../../hooks/useGlikoServer";
import { useTranslation } from "react-i18next";
import i18n from '../../i18n';


export default function ProfileMedications({ user, settings, setSettings }: any) {
 const { t } = useTranslation();
  const queryClient = useQueryClient();

 const deleteMedication = async (id: string) => {
 if (!user) return;
 try {
 const updatedMeds = (settings.medications || []).filter((m: any) => m.id !== id);
 const cleanMeds = JSON.parse(JSON.stringify(updatedMeds));
   const newSettings = { ...settings, medications: cleanMeds };
 setSettings(newSettings);
 await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"), { medications: JSON.parse(JSON.stringify(updatedMeds)) }, { merge: true });
 toast.success("Lek usunięty");
 } catch (e) {
 toast.error("Błąd usuwania leku");
 }
 };

 const deleteInventoryItem = async (id: string) => {
 if (!user) return;
 try {
 const updatedInv = (settings.inventory || []).filter((m: any) => m.id !== id);
 const newSettings = { ...settings, inventory: updatedInv };
 setSettings(newSettings);
 await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"), { inventory: updatedInv }, { merge: true });
 queryClient.invalidateQueries({ queryKey: ['userSettings', getEffectiveUid(user)] });
 toast.success("Zapas usunięty");
 } catch (e) {
 toast.error("Błąd usuwania zapasu");
 }
 };

 const [newMedication, setNewMedication] = useState<{
 id: string;
 name: string;
 dosage: string;
 reminders: string[];
 expiryDate: string;
 active: boolean;
 aiData?: any;
 } | null>(null);
const [isAnalyzingDrug, setIsAnalyzingDrug] = useState(false);
const [medLoading, setMedLoading] = useState(false);
  const [newInventoryItem, setNewInventoryItem] =
    useState<InventoryItem | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const handleBarcodeScan = async (scannedBarcodeRaw: string) => {
    setShowBarcodeScanner(false);
    if (!user) return;
    
    const scannedBarcode = extractGTIN(scannedBarcodeRaw);

    // If the form is already open, just paste the barcode and try to fill known info, but preserve existing typed values!
    if (newInventoryItem) {
        const knownProduct = lookupMedicalDictionary(scannedBarcode);
        setNewInventoryItem(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                barcode: scannedBarcode,
                name: prev.name || knownProduct?.name || "",
                category: prev.category === 'other' && knownProduct ? (knownProduct.category as any) : prev.category
            }
        });
        toast.success(i18n.t('auto.kod_zeskanowany', { defaultValue: "Kod zeskanowany i wprowadzony do formularza!" }));
        return;
    }

    const currentInv = settings.inventory || [];
    const existingItemIndex = currentInv.findIndex((i: any) => extractGTIN(i.barcode) === scannedBarcode);
    
    if (existingItemIndex !== -1) {
      const existingItem = currentInv[existingItemIndex];
      setNewInventoryItem({
        ...existingItem,
        quantity: existingItem.quantity + 1
      });
      toast.success(i18n.t('auto.znaleziono_sprzet_w_apteczce', { defaultValue: "✅ Znaleziono sprzęt w apteczce! Popraw ilość i zapisz." }));
    } else {
      const knownProduct = lookupMedicalDictionary(scannedBarcode);
      if (knownProduct) {
        setNewInventoryItem({
          id: "",
          name: knownProduct.name,
          quantity: 1,
          unit: "szt.",
          lowStockThreshold: 1,
          category: knownProduct.category as any,
          barcode: scannedBarcode
        });
        toast.success("✅ Znaleziono znany produkt medyczny!");
      } else {
        setNewInventoryItem({
          id: "",
          name: "",
          quantity: 1,
          unit: "szt.",
          lowStockThreshold: 1,
          category: "other",
          barcode: scannedBarcode
        });
        alert(i18n.t('auto.nieznany_kod_kreskowy_otwarto', { defaultValue: "🆕 Nieznany kod kreskowy!\nOtwarto okno dodawania. Wpisz nazwę sprzętu, a aplikacja zapamięta go na przyszłość." }));
      }
    }
  };

const analyzeDrug = async () => {
 if (!newMedication?.name || !user) return;
 setIsAnalyzingDrug(true);
 const toastId = toast.loading(i18n.t('auto.ai_analizuje_lek', { defaultValue: "AI analizuje lek..." }));
 try {
 const data = await geminiService.analyzeMedication(newMedication.name);
 if (data) {
 setNewMedication(prev => prev ? { ...prev, aiData: data } : null);
 const updatedDict = { ...(settings.customDrugDictionary || {}) };
 updatedDict[newMedication.name] = data;
 const newSettings = { ...settings, customDrugDictionary: updatedDict };
 setSettings(newSettings);
 await setDoc(
 doc(db, "users", getEffectiveUid(user), "settings", "profile"),
 { customDrugDictionary: JSON.parse(JSON.stringify(updatedDict)) },
 { merge: true }
 );
 queryClient.invalidateQueries({ queryKey: ['userSettings', getEffectiveUid(user)] });
 toast.success(i18n.t('auto.ai_analiza_zakonczona', { defaultValue: "AI: Analiza zakończona!" }), { id: toastId });
 } else {
 toast.error(i18n.t('auto.ai_nie_udalo_sie_przean', { defaultValue: "AI: Nie udało się przeanalizować." }), { id: toastId });
 }
 } catch (error) {
 toast.error(i18n.t('auto.ai_blad_komunikacji', { defaultValue: "AI: Błąd komunikacji." }), { id: toastId });
 } finally {
 setIsAnalyzingDrug(false);
 }
 }
const saveMedication = async () => {
 if (!newMedication?.name || !user) return;
 setMedLoading(true);
 try {
 const updatedMeds = [...(settings.medications || [])];

 if (newMedication.id) {
 // Edit
 const index = updatedMeds.findIndex((m) => m.id === newMedication.id);
 if (index >= 0) updatedMeds[index] = { ...newMedication };
 toast.success(i18n.t('auto.lek_zostal_zaktualizowany', { defaultValue: i18n.t('auto.lek_zostal_zaktualizowany', { defaultValue: "Lek został zaktualizowany!" }) }));
 } else {
 // Add
 updatedMeds.push({ ...newMedication, id: Date.now().toString() });
 toast.success("Lek dodany do apteczki!");
 }

 const cleanMeds = JSON.parse(JSON.stringify(updatedMeds));
   const newSettings = { ...settings, medications: cleanMeds };
 setSettings(newSettings);
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 { medications: JSON.parse(JSON.stringify(updatedMeds)) },
 { merge: true },
 );
 queryClient.invalidateQueries({ queryKey: ['userSettings', getEffectiveUid(user)] });
 setNewMedication(null);
 } catch (e) {
 console.error(e);
 toast.error(i18n.t('auto.blad_zapisu_leku', { defaultValue: i18n.t('auto.blad_zapisu_leku', { defaultValue: "Błąd zapisu leku" }) }));
 } finally {
 setMedLoading(false);
 }
 }
const saveInventoryItem = async () => {
 if (!newInventoryItem?.name) {
 toast.error(t('auto.podaj_nazwe_sprzetu', { defaultValue: 'Podaj nazwę zapasu!' }));
 return;
 }
 if (!user) return;
 try {
 const updatedInventory = [...(settings.inventory || [])];

 if (newInventoryItem.id) {
 const index = updatedInventory.findIndex(
 (m) => m.id === newInventoryItem.id,
 );
 if (index >= 0) updatedInventory[index] = { ...newInventoryItem };
 toast.success(i18n.t('auto.sprzet_zaktualizowany', { defaultValue: i18n.t('auto.sprzet_zaktualizowany', { defaultValue: "Sprzęt zaktualizowany!" }) }));
 } else {
 updatedInventory.push({
 ...newInventoryItem,
 id: Date.now().toString(),
 });
 toast.success(i18n.t('auto.sprzet_dodany_do_zapasow', { defaultValue: i18n.t('auto.sprzet_dodany_do_zapasow', { defaultValue: "Sprzęt dodany do zapasów!" }) }));
 }

 const cleanInventory = JSON.parse(JSON.stringify(updatedInventory));
   const newSettings = { ...settings, inventory: cleanInventory };
 setSettings(newSettings);
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 { inventory: JSON.parse(JSON.stringify(updatedInventory)) },
 { merge: true },
 );
 queryClient.invalidateQueries({ queryKey: ['userSettings', getEffectiveUid(user)] });
 setNewInventoryItem(null);
 } catch (e) {
 console.error(e);
 toast.error(i18n.t('auto.blad_zapisu_zapasow', { defaultValue: i18n.t('auto.blad_zapisu_zapasow', { defaultValue: "Błąd zapisu zapasów" }) }));
 }
 }

 return (

 <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4 pb-20"
    >


 <div
 className={cn(
 "rounded-[2.5rem] p-6 border shadow-xl space-y-6",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex items-center gap-3 mb-1">
 <div className="p-2.5 bg-teal-500/10 text-teal-600 rounded-2xl">
 <Pill size={20} />
 </div>
 <div className="text-left">
 <h3 className="text-base font-black dark:text-white leading-tight">
 
 {t('auto.twoje_leki', { defaultValue: 'Twoje Leki' })}
 </h3>
 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
 
 {t('auto.harmonogram', { defaultValue: 'Harmonogram' })}
 </p>
 </div>
 </div>

 <div className="space-y-4">
 {(settings.medications || []).map((med) => (
 <motion.div
 layout
 key={med.id}
 className={cn(
 "relative overflow-hidden p-5 rounded-[2rem] border transition-all flex flex-col group",
 med.active
 ? settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
 : "bg-slate-100/50 dark:bg-slate-900 border-transparent opacity-60",
 )}
 >
 <div className="flex items-start justify-between relative z-10">
 <div className="flex items-center gap-4">
 <div
 className={cn(
 "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
 med.active
 ? "bg-teal-500/10 text-teal-600"
 : "bg-slate-200 text-slate-400",
 )}
 >
 <Pill size={24} />
 </div>
 <div className="text-left">
 <p className="text-sm font-black dark:text-white flex items-center gap-2">
 {med.name}
 <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-700">
 {med.dosage}
 </span>
 </p>
 <div className="flex flex-wrap gap-1.5 mt-2">
 {med.reminders.map((r, i) => (
 <span
 key={`med-rem-${med.id}-${i}`}
 className="flex items-center gap-1.5 text-[9px] font-black bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-2xl shadow-sm"
 >
 <Bell size={10} className="text-teal-500" />
 {r}
 </span>
 ))}
 </div>
 {med.aiData && (
 <div className="mt-3 bg-white/50 dark:bg-slate-900/50 p-2.5 rounded-2xl border border-teal-500/10">
 <div className="flex items-center gap-1.5 mb-1.5">
 <Sparkles size={12} className="text-teal-500" />
 <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
 {med.aiData.activeIngredient}
 </span>
 </div>
 <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
 <strong className={med.aiData.sugarImpact === 'lowers' ? 'text-blue-500 uppercase' : med.aiData.sugarImpact === 'raises' ? 'text-rose-500 uppercase' : 'text-slate-500 uppercase'}>
 {med.aiData.sugarImpact === 'lowers' ? t('auto.obniza_cukier', { defaultValue: 'OBNIŻA CUKIER' }) : med.aiData.sugarImpact === 'raises' ? t('auto.podnosi_cukier', { defaultValue: 'PODNOSI CUKIER' }) : t('auto.neutralny', { defaultValue: 'NEUTRALNY' })}
 </strong>
 {' • '}{med.aiData.interactions}
 </p>
 </div>
 )}
 </div>
 </div>

 <div className="flex flex-col items-end gap-2">
 <button
 onClick={async () => {
 const updates = { active: !med.active };
 const updatedMeds = settings.medications!.map((m) =>
 m.id === med.id ? { ...m, ...updates } : m,
 );
 setSettings((prev) => ({
 ...prev,
 medications: updatedMeds,
 }));
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 { medications: JSON.parse(JSON.stringify(updatedMeds)) },
 { merge: true },
 );
 }}
 className={cn(
 "text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-all",
 med.active
 ? "bg-teal-500 text-white"
 : "bg-slate-200 text-slate-400 dark:bg-slate-700",
 )}
 >
 {med.active ? "Aktywny" : "Pauza"}
 </button>
 </div>
 </div>

 {med.expiryDate && (
 <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
 <p
 className={cn(
 "text-[9px] font-bold flex items-center gap-1.5",
 new Date(med.expiryDate).getTime() <
 Date.now() + 7 * 24 * 60 * 60 * 1000
 ? "text-rose-500 animate-pulse"
 : "text-slate-400",
 )}
 >
 <Calendar size={12} />
 
 {t('auto.data_ważności', { defaultValue: i18n.t('auto.data_waznosci', { defaultValue: "Data ważności:" }) })}{" "}
 <span className="uppercase">{med.expiryDate}</span>
 </p>

 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() =>
 setNewMedication({
 ...med,
 expiryDate: med.expiryDate || "",
 })
 }
 className="p-2 text-slate-400 hover:text-accent-500 transition-colors"
 >
 <Settings size={14} />
 </button>
 <button
 onClick={() => deleteMedication(med.id)}
 className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
 >
 <Trash size={14} />
 </button>
 </div>
 </div>
 )}
 </motion.div>
 ))}

   {!newMedication && (
   <div className="flex gap-2">
     <button
     onClick={() =>
     setNewMedication({
     id: "",
     name: "",
     dosage: "",
     reminders: ["08:00"],
     active: true,
     expiryDate: "",
     })
     }
     className="flex-1 py-4 bg-teal-50 dark:bg-slate-800/50 text-teal-600 dark:text-teal-400 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] border-2 border-dashed border-teal-200 dark:border-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/20 transition-all flex items-center justify-center gap-2"
     >
     <Plus size={16} /> {t('auto.dodaj_nowy_lek', { defaultValue: 'Dodaj nowy lek' })}
     </button>
     <button
     onClick={() => setShowBarcodeScanner(true)}
     className="flex-1 py-4 bg-indigo-50 dark:bg-slate-800/50 text-indigo-600 dark:text-indigo-400 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] border-2 border-dashed border-indigo-200 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2"
     >
     <Camera size={16} /> {t('auto.skanuj_kod', { defaultValue: 'Skanuj Kod' })}
     </button>
   </div>
   )}
 </div>

 {newMedication && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className={cn(
 "p-6 rounded-[2rem] border space-y-5",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
 )}
 >
 <div className="flex items-center justify-between">
 <h4 className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest px-1">
 
 {t('auto.konfiguracja', { defaultValue: 'Konfiguracja' })}
 </h4>
 <button
 onClick={() => setNewMedication(null)}
 className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all"
 >
 <X size={16} />
 </button>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.nazwa', { defaultValue: 'Nazwa' })}
 </label>
 <input
 type="text"
 list="medication-dict"
 placeholder={t('auto.np_metformina', { defaultValue: 'np. Metformina' })}
 value={newMedication.name}
 onChange={(e) => {
 const val = e.target.value;
 const existingAi = settings.customDrugDictionary?.[val];
 setNewMedication({
 ...newMedication,
 name: val,
 aiData: existingAi || newMedication.aiData
 });
 }}
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all"
 />
 <datalist id="medication-dict">
 {Object.keys(settings.customDrugDictionary || {}).map(k => <option key={k} value={k} />)}
 </datalist>
 {newMedication.name && !settings.customDrugDictionary?.[newMedication.name] && (
 <button onClick={analyzeDrug} disabled={isAnalyzingDrug} className="mt-2 text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 p-2 rounded-xl font-bold flex items-center gap-1">
 {isAnalyzingDrug ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {t('auto.przeanalizuj_lek_z_ai', { defaultValue: "Przeanalizuj lek z AI" })}
 </button>
 )}
 {newMedication.aiData && (
 <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
 <strong>{t('auto.substancja', { defaultValue: "Substancja:" })}</strong> {newMedication.aiData.activeIngredient}<br/>
 <strong>{t('auto.glikemia', { defaultValue: "Glikemia:" })}</strong> <span className={newMedication.aiData.sugarImpact === 'lowers' ? 'text-blue-500 font-bold uppercase' : newMedication.aiData.sugarImpact === 'raises' ? 'text-rose-500 font-bold uppercase' : 'text-slate-500 font-bold uppercase'}>{newMedication.aiData.sugarImpact === 'lowers' ? t('auto.obniza_cukier', { defaultValue: 'OBNIŻA CUKIER' }) : newMedication.aiData.sugarImpact === 'raises' ? t('auto.podnosi_cukier', { defaultValue: 'PODNOSI CUKIER' }) : t('auto.neutralny', { defaultValue: 'NEUTRALNY' })}</span><br/>
 <strong>{t('auto.opis', { defaultValue: "Wpływ:" })}</strong> {newMedication.aiData.description}
 </div>
 )}
 </div>
 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.dawka', { defaultValue: 'Dawka' })}
 </label>
 <input
 type="text"
 placeholder={t('auto.np_500mg', { defaultValue: 'np. 500mg' })}
 value={newMedication.dosage}
 onChange={(e) =>
 setNewMedication({
 ...newMedication,
 dosage: e.target.value,
 })
 }
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4">
 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.przypomnienia', { defaultValue: 'Przypomnienia' })}
 </label>
 <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
 {newMedication.reminders.map((rem, idx) => (
 <div
 key={`new-med-rem-${idx}`}
 className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded-lg py-1 px-1.5 border border-slate-100 dark:border-slate-700"
 >
 <input
 type="time"
 value={rem}
 onChange={(e) => {
 const updatedRems = [...newMedication.reminders];
 updatedRems[idx] = e.target.value;
 setNewMedication({
 ...newMedication,
 reminders: updatedRems,
 });
 }}
 className="text-[9px] font-black bg-transparent outline-none dark:text-white w-12"
 />
 <button
 onClick={() => {
 const updatedRems =
 newMedication.reminders.filter(
 (_, i) => i !== idx,
 );
 setNewMedication({
 ...newMedication,
 reminders: updatedRems,
 });
 }}
 className="p-0.5 text-rose-500"
 >
 <X size={10} />
 </button>
 </div>
 ))}
 <button
 onClick={() =>
 setNewMedication({
 ...newMedication,
 reminders: [...newMedication.reminders, "12:00"],
 })
 }
 className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center active:scale-90 transition-all"
 >
 <Plus size={12} />
 </button>
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.wygasa', { defaultValue: 'Wygasa' })}
 </label>
 <div className="relative">
 <Calendar
 size={12}
 className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500"
 />
 <input
 type="date"
 value={newMedication.expiryDate}
 onChange={(e) =>
 setNewMedication({
 ...newMedication,
 expiryDate: e.target.value,
 })
 }
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3 pl-9 pr-3 rounded-2xl font-bold text-[10px] outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all"
 />
 </div>
 </div>
 </div>

 <button
 onClick={saveMedication}
 disabled={medLoading}
 className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-teal-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
 >
 {medLoading ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <CheckCircle2 size={14} />
 )}
 {newMedication.id ? "Aktualizuj" : "Zapisz lek"}
 </button>
 </motion.div>
 )}
 </div>

 
 
 {showBarcodeScanner && (
 <BarcodeScannerModal
 onClose={() => setShowBarcodeScanner(false)}
 onScan={handleBarcodeScan}
 />
 )}
 </motion.div>
 );
}

