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
 CalendarDays,
 Clock,
 Package,
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
      await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"), { medications: cleanMeds }, { merge: true });
      notificationService.scheduleMedicationReminders(cleanMeds);
      queryClient.invalidateQueries({ queryKey: ['userSettings', getEffectiveUid(user)] });
      toast.success(t('auto.lek_usuniety', { defaultValue: "Lek usunięty" }));
    } catch (e) {
      console.error(e);
      toast.error(t('auto.blad_usuwania_leku', { defaultValue: "Błąd usuwania leku" }));
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

  const [newMedication, setNewMedication] = useState<Partial<Medication> | null>(null);

  const calculateMedicationRunout = (med: Partial<Medication> | null | undefined) => {
    if (!med || typeof med.stockQuantity !== 'number' || med.stockQuantity <= 0) return null;
    const remindersCount = Array.isArray(med.reminders) && med.reminders.length > 0 ? med.reminders.length : 1;
    const pillsPerDose = med.pillsPerDose && med.pillsPerDose > 0 ? med.pillsPerDose : 1;
    const dailyDose = remindersCount * pillsPerDose;
    const daysRemaining = Math.floor(med.stockQuantity / dailyDose);
    const targetDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
    const formattedDate = targetDate.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'pl-PL', {
      day: 'numeric',
      month: 'short'
    });
    const isLowStock = med.stockQuantity <= (med.stockThreshold || 7) || daysRemaining <= 5;
    return {
      dailyDose,
      daysRemaining,
      formattedDate,
      isLowStock
    };
  };

  const takeMedicationDose = async (med: Medication) => {
    if (!user) return;
    Haptics.success();
    const pillsToDeduct = med.pillsPerDose || 1;
    const currentStock = typeof med.stockQuantity === 'number' ? med.stockQuantity : null;
    const newStock = currentStock !== null ? Math.max(0, currentStock - pillsToDeduct) : undefined;
    
    const updatedMeds = (settings.medications || []).map((m: any) => 
      m.id === med.id ? { ...m, ...(newStock !== undefined ? { stockQuantity: newStock } : {}) } : m
    );
    const cleanMeds = JSON.parse(JSON.stringify(updatedMeds));
    setSettings({ ...settings, medications: cleanMeds });
    await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"), { medications: cleanMeds }, { merge: true });
    queryClient.invalidateQueries({ queryKey: ['userSettings', getEffectiveUid(user)] });
    toast.success(`${t('auto.zazyto_lek', { defaultValue: 'Zażyto' })}: ${med.name} (${med.dosage || '1 dawka'})`);
  };

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
  const clearAiAnalysis = async () => {
    if (!newMedication) return;
    const medName = newMedication.name;
    setNewMedication({ ...newMedication, aiData: undefined });
    if (medName && settings.customDrugDictionary?.[medName]) {
      const updatedDict = { ...(settings.customDrugDictionary || {}) };
      delete updatedDict[medName];
      const newSettings = { ...settings, customDrugDictionary: updatedDict };
      setSettings(newSettings);
      if (user) {
        await setDoc(
          doc(db, "users", getEffectiveUid(user), "settings", "profile"),
          { customDrugDictionary: updatedDict },
          { merge: true }
        );
        queryClient.invalidateQueries({ queryKey: ['userSettings', getEffectiveUid(user)] });
      }
    }
    toast.success(t('auto.analiza_ai_usunieta', { defaultValue: "Analiza AI została usunięta" }));
  };

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
 notificationService.scheduleMedicationReminders(cleanMeds);
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

  {/* Wybór typu insuliny szybkodziałającej (do wyliczania stopera i wchłaniania) */}
  <div className={cn(
    "rounded-[2.5rem] p-5 border shadow-xl space-y-3",
    settings.glassmorphismEnabled
      ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10 ring-1 ring-white/20 shadow-lg"
      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
  )}>
    <div className="flex items-center gap-2.5">
      <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-2xl">
        <Droplets size={20} />
      </div>
      <div>
        <h3 className="text-xs font-black dark:text-white uppercase tracking-wider leading-tight">
          {t('auto.rodzaj_stosowanej_insuliny', { defaultValue: 'Rodzaje i Typ Stosowanej Insuliny' })}
        </h3>
        <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
          {t('auto.rodzaj_stosowanej_insuliny_opis', { defaultValue: 'Konfiguracja tempa wchłaniania dla Kalkulatora Bolusa i Stopera Pre-Bolus' })}
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
      {[
        { 
          id: 'fiasp', 
          category: t('auto.insulina_ultraszybka_urli', { defaultValue: '⚡ Ultraszybka (URLi)' }), 
          meds: 'Fiasp, Lyumjev',
          timeInfo: t('auto.insulina_prebolus_0_5', { defaultValue: 'start: ~5 min (pre-bolus 0-5 min)' })
        },
        { 
          id: 'novorapid', 
          category: t('auto.insulina_standardowy_analog', { defaultValue: '⏱️ Standardowy analog' }), 
          meds: 'NovoRapid, Humalog, Liprolog, Apidra',
          timeInfo: t('auto.insulina_prebolus_10_15', { defaultValue: 'start: ~10-15 min (pre-bolus 10-15 min)' })
        },
        { 
          id: 'regular', 
          category: t('auto.insulina_klasyczna_ludzka', { defaultValue: '🌙 Klasyczna ludzka' }), 
          meds: 'Gensulin R, Actrapid, Humulin R',
          timeInfo: t('auto.insulina_prebolus_20_30', { defaultValue: 'start: ~25-35 min (pre-bolus 20-30 min)' })
        },
      ].map((ins) => {
        const isSelected = (settings.insulinType || 'novorapid') === ins.id;
        return (
          <button
            key={ins.id}
            type="button"
            onClick={async () => {
              Haptics.selection();
              const newSettings = { ...settings, insulinType: ins.id };
              setSettings(newSettings);
              if (user) {
                await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"), { insulinType: ins.id }, { merge: true });
              }
              toast.success(`${ins.category}`);
            }}
            className={cn(
              "p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2",
              isSelected 
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.01]" 
                : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
            )}
          >
            <div>
              <span className="text-[11px] font-black leading-tight block">{ins.category}</span>
              <span className={cn("text-[9.5px] font-bold leading-tight block mt-1", isSelected ? "text-indigo-100" : "text-slate-800 dark:text-slate-200")}>
                {ins.meds}
              </span>
            </div>
            <span className={cn("text-[8.5px] font-semibold mt-0.5 block opacity-90", isSelected ? "text-indigo-200" : "text-slate-400 dark:text-slate-500")}>
              {ins.timeInfo}
            </span>
          </button>
        );
      })}
    </div>
  </div>

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
 notificationService.scheduleMedicationReminders(updatedMeds);
 queryClient.invalidateQueries({ queryKey: ['userSettings', getEffectiveUid(user)] });
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

      {/* Wskaźnik zapasu tabletek i szacunkowy czas wyczerpania */}
      {(() => {
        const runout = calculateMedicationRunout(med);
        if (!runout) return null;
        return (
          <div className={cn(
            "mt-3 p-2.5 rounded-2xl border flex items-center justify-between text-[9.5px]",
            runout.isLowStock 
              ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
              : "bg-teal-500/5 border-teal-500/15 text-slate-700 dark:text-slate-300"
          )}>
            <div className="flex items-center gap-2">
              <Package size={13} className={runout.isLowStock ? "text-rose-500 shrink-0" : "text-teal-500 shrink-0"} />
              <div>
                <span className="font-bold">
                  {t('auto.zapas_etykieta', { defaultValue: 'Zapas:' })} <strong className="font-black text-slate-900 dark:text-white">{med.stockQuantity} szt.</strong>
                </span>
                <span className="opacity-80 ml-1.5 font-medium">
                  • {t('auto.zapas_wystarczy_na', { days: runout.daysRemaining, date: runout.formattedDate, defaultValue: `Zapas na ok. ${runout.daysRemaining} dni (do ${runout.formattedDate})` })}
                </span>
              </div>
            </div>

            {/* Szybki przycisk Zażyj 1 dawkę */}
            <button
              type="button"
              onClick={() => takeMedicationDose(med)}
              title={t('auto.zazyj_dawke', { defaultValue: 'Zażyj dawkę' })}
              className={cn(
                "px-2.5 py-1 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 shadow-sm shrink-0 ml-2",
                runout.isLowStock
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-teal-600 text-white hover:bg-teal-700"
              )}
            >
              <Check size={10} />
              {t('auto.zazyj_dawke', { defaultValue: 'Zażyj' })}
            </button>
          </div>
        );
      })()}

  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
    {med.expiryDate ? (
      <p
        className={cn(
          "text-[9px] font-bold flex items-center gap-1.5",
          new Date(med.expiryDate).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000
            ? "text-rose-500 animate-pulse"
            : "text-slate-400 dark:text-slate-500"
        )}
      >
        <Calendar size={12} />
        {t('auto.data_ważności', { defaultValue: i18n.t('auto.data_waznosci', { defaultValue: "Ważność:" }) })}{" "}
        <span className="uppercase">{med.expiryDate}</span>
      </p>
    ) : (
      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
        {med.active ? "● Aktywny" : "○ Wstrzymany"}
      </span>
    )}

    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          Haptics.light();
          setNewMedication({
            ...med,
            expiryDate: med.expiryDate || "",
          });
        }}
        className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/30 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
      >
        <Edit2 size={11} />
        <span>{t('auto.edytuj', { defaultValue: 'Edytuj' })}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          Haptics.medium();
          if (confirm(`Czy na pewno chcesz usunąć lek "${med.name}"?`)) {
            deleteMedication(med.id);
          }
        }}
        className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all border border-rose-200 dark:border-rose-900/40 active:scale-95"
      >
        <Trash size={11} />
        <span>{t('auto.usun', { defaultValue: 'Usuń' })}</span>
      </button>
    </div>
  </div>
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

  {/* Sekcja AI na całą szerokość widżetu */}
  {newMedication.name && !newMedication.aiData && (
    <div className="w-full pt-1">
      <button 
        type="button"
        onClick={analyzeDrug} 
        disabled={isAnalyzingDrug} 
        className="w-full text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 p-3 rounded-2xl font-black border border-teal-500/20 flex items-center justify-center gap-2 hover:bg-teal-500/20 transition-all active:scale-95"
      >
        {isAnalyzingDrug ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-teal-500" />}
        <span>{t('auto.przeanalizuj_lek_z_ai', { defaultValue: "Przeanalizuj lek z AI" })}</span>
      </button>
    </div>
  )}

  {newMedication.aiData && (
    <div className="w-full p-3.5 bg-white/60 dark:bg-slate-900/60 border border-teal-500/20 rounded-2xl text-[10.5px] text-slate-600 dark:text-slate-300 leading-relaxed shadow-sm space-y-2">
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 font-black text-teal-600 dark:text-teal-400">
          <Sparkles size={13} />
          <span>{t('auto.analiza_farmakologiczna_ai', { defaultValue: "Analiza AI Gemini" })}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={analyzeDrug}
            disabled={isAnalyzingDrug}
            title={t('auto.ponow_analize_ai', { defaultValue: "Ponów analizę AI" })}
            className="p-1 text-slate-400 hover:text-teal-500 transition-colors rounded-lg flex items-center gap-1 text-[9px] font-bold"
          >
            {isAnalyzingDrug ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            <span>{t('auto.ponow_analize_ai', { defaultValue: "Ponów" })}</span>
          </button>
          <button
            type="button"
            onClick={() => setNewMedication({ ...newMedication, aiData: null })}
            title={t('auto.usun_analize_ai', { defaultValue: "Usuń analizę AI" })}
            className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-lg flex items-center gap-1 text-[9px] font-bold ml-1"
          >
            <X size={12} />
            <span>{t('auto.usun_analize_ai', { defaultValue: "Usuń" })}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 text-[10px]">
        <div>
          <strong className="text-slate-800 dark:text-slate-200">{t('auto.substancja', { defaultValue: "Substancja czynna:" })}</strong> {newMedication.aiData.activeIngredient}
        </div>
        <div>
          <strong className="text-slate-800 dark:text-slate-200">{t('auto.glikemia', { defaultValue: "Wpływ na glikemię:" })}</strong>{" "}
          <span className={cn("font-black uppercase px-1.5 py-0.5 rounded-md text-[9px]", newMedication.aiData.sugarImpact === 'lowers' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : newMedication.aiData.sugarImpact === 'raises' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400')}>
            {newMedication.aiData.sugarImpact === 'lowers' ? t('auto.obniza_cukier', { defaultValue: 'OBNIŻA CUKIER' }) : newMedication.aiData.sugarImpact === 'raises' ? t('auto.podnosi_cukier', { defaultValue: 'PODNOSI CUKIER' }) : t('auto.neutralny', { defaultValue: 'NEUTRALNY' })}
          </span>
        </div>
        <div>
          <strong className="text-slate-800 dark:text-slate-200">{t('auto.opis', { defaultValue: "Opis działania:" })}</strong> {newMedication.aiData.description}
        </div>
        {newMedication.aiData.interactions && (
          <div>
            <strong className="text-slate-800 dark:text-slate-200">{t('auto.interakcje', { defaultValue: "Interakcje:" })}</strong> {newMedication.aiData.interactions}
          </div>
        )}
      </div>
    </div>
  )}

 <div className="grid grid-cols-1 gap-4">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
 <Bell size={12} className="text-teal-500" />
 {t('auto.przypomnienia', { defaultValue: 'Przypomnienia' })}
 </label>
 </div>

 {/* Szybkie schematy 1-Click */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider px-1">
 <span>{t('auto.szybkie_szablony', { defaultValue: 'Szybkie pory:' })}</span>
 </div>
 <div className="flex flex-wrap gap-1.5">
 {[
 { label: t('auto.rano', { defaultValue: 'Rano (08:00)' }), time: '08:00' },
 { label: t('auto.poludnie', { defaultValue: 'Obiad (13:00)' }), time: '13:00' },
 { label: t('auto.wieczor', { defaultValue: 'Wieczór (19:00)' }), time: '19:00' },
 { label: t('auto.noc_baza', { defaultValue: 'Noc (22:00)' }), time: '22:00' },
 ].map((preset) => {
 const isAlreadyAdded = (newMedication.reminders || []).includes(preset.time);
 return (
 <button
 key={preset.time}
 type="button"
 onClick={() => {
 Haptics.selection();
 const current = newMedication.reminders || [];
 if (isAlreadyAdded) {
 setNewMedication({ ...newMedication, reminders: current.filter(r => r !== preset.time) });
 } else {
 setNewMedication({ ...newMedication, reminders: [...current, preset.time].sort() });
 }
 }}
 className={cn(
 "px-2.5 py-1 rounded-xl text-[9px] font-bold transition-all border flex items-center gap-1 active:scale-95",
 isAlreadyAdded
 ? "bg-teal-500 text-white border-teal-500 shadow-sm"
 : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400"
 )}
 >
 <span>{isAlreadyAdded ? '✓' : '+'}</span>
 <span>{preset.label}</span>
 </button>
 );
 })}
 </div>

 {/* Schematy wielokrotne */}
 <div className="flex flex-wrap gap-1.5 pt-0.5">
 {[
 { label: t('auto.schemat_1x', { defaultValue: '1x rano' }), times: ['08:00'] },
 { label: t('auto.schemat_2x', { defaultValue: '2x dziennie' }), times: ['08:00', '20:00'] },
 { label: t('auto.schemat_3x', { defaultValue: '3x dziennie' }), times: ['08:00', '14:00', '20:00'] },
 ].map((sch) => (
 <button
 key={sch.label}
 type="button"
 onClick={() => {
 Haptics.selection();
 setNewMedication({ ...newMedication, reminders: sch.times });
 }}
 className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-teal-500/20 hover:text-teal-600 dark:hover:text-teal-400 transition-all active:scale-95"
 >
 ⚡ {sch.label}
 </button>
 ))}
 </div>
 </div>

 {/* Aktywne przypomnienia (Duże, wygodne kafelki) */}
 <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
 {(newMedication.reminders || []).length === 0 ? (
 <p className="text-[9px] text-slate-400 font-medium text-center py-2">
 {t('auto.brak_przypomnien_wybierz', { defaultValue: 'Brak przypomnień. Wybierz porę powyżej lub dodaj godzinę.' })}
 </p>
 ) : (
 <div className="flex flex-wrap gap-2">
 {(newMedication.reminders || []).map((rem, idx) => (
 <div
 key={`new-med-rem-${idx}`}
 className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl py-1.5 px-2.5 border border-slate-200 dark:border-slate-700 shadow-sm"
 >
 <Clock size={12} className="text-teal-500 shrink-0" />
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
 className="text-xs font-black bg-transparent outline-none dark:text-white cursor-pointer"
 />
 <button
 type="button"
 onClick={() => {
 Haptics.selection();
 const updatedRems = newMedication.reminders.filter((_, i) => i !== idx);
 setNewMedication({
 ...newMedication,
 reminders: updatedRems,
 });
 }}
 className="p-1 text-slate-400 hover:text-rose-500 transition-colors rounded-lg"
 >
 <X size={12} />
 </button>
 </div>
 ))}
 </div>
 )}

 <div className="pt-1 flex justify-end">
 <button
 type="button"
 onClick={() => {
 Haptics.selection();
 const current = newMedication.reminders || [];
 const nextHour = current.length > 0 ? "12:00" : "08:00";
 setNewMedication({
 ...newMedication,
 reminders: [...current, nextHour],
 });
 }}
 className="py-1.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-[9px] font-black uppercase tracking-wider border border-teal-200 dark:border-teal-800/50 flex items-center gap-1 hover:bg-teal-100 transition-all active:scale-95"
 >
 <Plus size={12} /> {t('auto.dodaj_godzine', { defaultValue: 'Dodaj' })}
 </button>
 </div>
 </div>
 </div>

  {/* Sekcja Zapasy i Kalkulator Końca Tabletek */}
  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
    <div className="flex items-center justify-between">
      <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <Package size={13} className="text-teal-500" />
        {t('auto.stan_zapasu_tabletek', { defaultValue: 'Stan zapasu i zużycie' })}
      </label>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      <div className="space-y-1">
        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
          {t('auto.stan_zapasu_tabletek', { defaultValue: 'Ilość tabletek' })}
        </label>
        <input
          type="number"
          min="0"
          placeholder="np. 60"
          value={newMedication.stockQuantity !== undefined ? newMedication.stockQuantity : ""}
          onChange={(e) => {
            const val = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
            setNewMedication({ ...newMedication, stockQuantity: isNaN(val as any) ? undefined : val });
          }}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-teal-500/20"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
          {t('auto.tabletek_na_dawke', { defaultValue: 'Na 1 dawkę' })}
        </label>
        <input
          type="number"
          min="1"
          placeholder="1"
          value={newMedication.pillsPerDose || 1}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            setNewMedication({ ...newMedication, pillsPerDose: isNaN(val) || val <= 0 ? 1 : val });
          }}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-teal-500/20"
        />
      </div>

      <div className="space-y-1 col-span-2 sm:col-span-1">
        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
          {t('auto.prog_ostrzezenia', { defaultValue: 'Próg alertu' })}
        </label>
        <input
          type="number"
          min="1"
          placeholder="np. 7"
          value={newMedication.stockThreshold !== undefined ? newMedication.stockThreshold : 7}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            setNewMedication({ ...newMedication, stockThreshold: isNaN(val) ? 7 : val });
          }}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-teal-500/20"
        />
      </div>
    </div>

    {/* Live estymacja kiedy skończą się tabletki */}
    {(() => {
      const runout = calculateMedicationRunout(newMedication);
      if (!runout) return null;
      return (
        <div className={cn(
          "p-2.5 rounded-xl border flex items-center gap-2 text-[10px] font-bold leading-tight mt-2",
          runout.isLowStock
            ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
            : "bg-teal-500/10 border-teal-500/20 text-teal-700 dark:text-teal-300"
        )}>
          {runout.isLowStock ? <AlertTriangle size={14} className="shrink-0" /> : <CalendarDays size={14} className="shrink-0" />}
          <span>
            {t('auto.zapas_wystarczy_na', { days: runout.daysRemaining, date: runout.formattedDate, defaultValue: `Zapas na ok. ${runout.daysRemaining} dni (do ${runout.formattedDate})` })}
            {runout.isLowStock && ` — ${t('auto.niski_zapas_zamow', { defaultValue: 'Niski zapas! Zamów e-receptę' })}`}
          </span>
        </div>
      );
    })()}
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
 value={newMedication.expiryDate || ""}
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

