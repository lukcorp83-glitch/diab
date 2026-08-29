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
 Cylinder,
 FlaskConical,
 Syringe,
 Layers,
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


export default function ProfileInventory({ user, settings, setSettings }: any) {
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
    const resCapacity = newInventoryItem.category === 'reservoirs' && newInventoryItem.reservoirCapacity ? newInventoryItem.reservoirCapacity : settings?.reservoirCapacityUnits;
    const newSettings = { ...settings, inventory: cleanInventory, ...(resCapacity ? { reservoirCapacityUnits: resCapacity } : {}) };
    setSettings(newSettings);
    await setDoc(
      doc(
        db,
        "users",
        getEffectiveUid(user),
        "settings",
        "profile",
      ),
      { 
        inventory: cleanInventory,
        ...(resCapacity ? { reservoirCapacityUnits: resCapacity } : {})
      },
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
      className="space-y-4"
    >

      <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-[2.5rem] p-6 border border-indigo-200/50 dark:border-indigo-500/20 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
              <Sparkles size={20} />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-tight">
                {t('auto.inteligentne_wykrywanie_wymian', { defaultValue: 'Inteligentne wykrywanie wymian' })}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                {t('auto.automatycznie_pytaj_o_wymiane', { defaultValue: 'Automatycznie pytaj o wymianę sprzętu (potrącając zapasy), gdy wykryto duży skok insuliny lub lukę w CGM.' })}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              const val = !settings.smartEquipmentDetection;
              setSettings({ ...settings, smartEquipmentDetection: val });
              Haptics.medium();
              if (val) toast.success(i18n.t('auto.inteligentne_wykrywanie_wlaczone', { defaultValue: 'Inteligentne wykrywanie włączone!' }));
              
              const { doc, setDoc } = await import('firebase/firestore');
              await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"), { smartEquipmentDetection: val }, { merge: true });
            }}
            className={cn(
              "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
              settings.smartEquipmentDetection && "bg-indigo-500 pl-5",
            )}
          >
            <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
          </button>
        </div>
      </div>
 <div
 className={cn(
 "rounded-[2.5rem] p-6 border shadow-xl space-y-6 mt-4",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex items-center justify-between mb-1">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-rose-500/10 text-rose-600 rounded-2xl">
 <Box size={20} />
 </div>
 <div className="text-left">
 <h3 className="text-base font-black dark:text-white leading-tight">
 
 {t('auto.apteczka', { defaultValue: 'Apteczka' })}{" "}
 <span className="text-[10px] bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full ml-1 relative -top-0.5">
 
 {t('auto.zapasy', { defaultValue: 'Zapasy' })}
 </span>
 </h3>
 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
 
 {t('auto.sprzęt_insulina', { defaultValue: i18n.t('auto.sprzet_insulina', { defaultValue: "Sprzęt & Insulina" }) })}
 </p>
 </div>
 </div>
 </div>

 <div className="space-y-4">


 {(settings.inventory || []).map((item) => (
 <motion.div
 layout
 key={item.id}
 className={cn(
 "relative overflow-hidden p-5 rounded-[2rem] border transition-all flex flex-col group",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
 )}
 >
 <div className="flex items-start justify-between relative z-10">
 <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                      item.quantity <= item.lowStockThreshold
                        ? "bg-rose-500/20 text-rose-600"
                        : item.category === 'reservoirs'
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : item.category === 'sensors'
                        ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                        : item.category === 'infusion_sets'
                        ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                        : item.category === 'insulin'
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                        : item.category === 'pens'
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : item.category === 'strips'
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400",
                    )}
                  >
                    {item.category === 'reservoirs' ? (
                      <Cylinder size={20} />
                    ) : item.category === 'sensors' ? (
                      <Signal size={20} />
                    ) : item.category === 'infusion_sets' ? (
                      <Droplets size={20} />
                    ) : item.category === 'insulin' ? (
                      <FlaskConical size={20} />
                    ) : item.category === 'pens' ? (
                      <Syringe size={20} />
                    ) : item.category === 'strips' ? (
                      <Layers size={20} />
                    ) : (
                      <Box size={20} />
                    )}
                  </div>
 <div>
 <h4 className="font-bold text-sm dark:text-white leading-tight">
 {item.name}
 </h4>
  {(() => {
    const getCategoryLabel = (catKey: string) => {
      switch (catKey) {
        case 'sensors': return t('auto.sensory', { defaultValue: 'Sensory CGM' });
        case 'insulin': return t('auto.insulina', { defaultValue: 'Insulina' });
        case 'pens': return t('auto.peny', { defaultValue: 'Wstrzykiwacze (Peny)' });
        case 'reservoirs': return t('auto.zbiorniczki', { defaultValue: 'Zbiorniczki' });
        case 'infusion_sets': return t('auto.wkłucia', { defaultValue: 'Wkłucia' });
        case 'strips': return t('auto.paski', { defaultValue: 'Paski i Igły' });
        case 'other': return t('auto.inne', { defaultValue: 'Inne' });
        default: return catKey;
      }
    };
    return (
      <>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          {t('auto.kategoria', { defaultValue: 'Kategoria:' })} {getCategoryLabel(item.category)}
        </p>
        {item.category === "pens" && item.penCapacity && (
          <p className="text-[10px] font-bold mt-0.5 uppercase tracking-widest text-indigo-500">
            {t('auto.pojemnosc', { defaultValue: 'Pojemność:' })} {item.penCapacity} j.
          </p>
        )}
        {item.category === "reservoirs" && (item.capacity || settings?.reservoirCapacityUnits) && (
          <p className="text-[10px] font-bold mt-0.5 uppercase tracking-widest text-purple-500">
            {t('auto.pojemnosc', { defaultValue: 'Pojemność:' })} {item.capacity || settings?.reservoirCapacityUnits} j.
          </p>
        )}
      </>
    );
  })()}
 {item.expiryDate && (
 <p className="text-[9px] font-bold mt-1 uppercase tracking-widest flex items-center gap-1 text-amber-600 dark:text-amber-500">
 <Calendar size={10} /> {t('auto.data_ważn', { defaultValue: i18n.t('auto.data_wazn', { defaultValue: "Data ważn:" }) })} {item.expiryDate}
 </p>
 )}
 </div>
 </div>

 <div className="text-right flex flex-col items-end">
 <h3
 className={cn(
 "text-xl font-black leading-none",
 item.quantity <= item.lowStockThreshold
 ? "text-rose-500"
 : "dark:text-white",
 )}
 >
 {item.quantity}{" "}
 <span className="text-xs text-slate-400 uppercase font-bold">
 {item.unit}
 </span>
 </h3>
 {item.quantity <= item.lowStockThreshold && (
 <span className="text-[7px] bg-rose-500 text-white font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse mt-1">
 
 {t('auto.mało', { defaultValue: i18n.t('auto.malo', { defaultValue: "Mało!" }) })}
 </span>
 )}
 {item.dailyDose && item.dailyDose > 0 && (
 <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1.5">
 ~{Math.floor(item.quantity / item.dailyDose)} {t('auto.dni', { defaultValue: 'dni' })}
 </span>
 )}
 </div>
 </div>

 <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-2 relative z-10">
 <div className="flex items-center gap-2">
 <button
 onClick={() => {
 const updatedInventory = [...settings.inventory!];
 const index = updatedInventory.findIndex(
 (m) => m.id === item.id,
 );
 if (updatedInventory[index].quantity > 0) {
 updatedInventory[index].quantity -= 1;
 setSettings((prev) => ({
 ...prev,
 inventory: updatedInventory,
 }));
 setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user!),
 "settings",
 "profile",
 ),
 { inventory: JSON.parse(JSON.stringify(updatedInventory)) },
 { merge: true },
 );
 queryClient.invalidateQueries({ queryKey: ['userSettings', getEffectiveUid(user)] });
 }
 }}
 className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all text-slate-600 dark:text-slate-300"
 >
 <Minus size={14} />
 </button>
 <button
 onClick={() => {
 const updatedInventory = [...settings.inventory!];
 const index = updatedInventory.findIndex(
 (m) => m.id === item.id,
 );
 updatedInventory[index].quantity += 1;
 setSettings((prev) => ({
 ...prev,
 inventory: updatedInventory,
 }));
 setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user!),
 "settings",
 "profile",
 ),
 { inventory: JSON.parse(JSON.stringify(updatedInventory)) },
 { merge: true },
 );
 }}
 className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all text-slate-600 dark:text-slate-300"
 >
 <Plus size={14} />
 </button>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => setNewInventoryItem(item)}
 className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"
 >
 <Edit3 size={14} />
 </button>
 <button
 onClick={() => deleteInventoryItem(item.id)}
 className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-500 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"
 >
 <Trash size={14} />
 </button>
 </div>
 </div>
 </motion.div>
 ))}

 {!newInventoryItem && (
 <div className="flex gap-2">
 <button
 onClick={() =>
 setNewInventoryItem({
 id: "",
 name: "",
 quantity: 1,
 unit: "szt.",
 lowStockThreshold: 1,
 category: "other",
 })
 }
 className="flex-1 py-4 bg-rose-50 dark:bg-slate-800/50 text-rose-600 dark:text-rose-400 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] border-2 border-dashed border-rose-200 dark:border-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all flex items-center justify-center gap-2"
 >
 <Plus size={16} /> {t('auto.dodaj_ręcznie', { defaultValue: i18n.t('auto.dodaj_recznie', { defaultValue: "Dodaj ręcznie" }) })}
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

 {/* Edit / Add Inventory Form */}
 {newInventoryItem && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: "auto" }}
 exit={{ opacity: 0, height: 0 }}
 className="bg-slate-50 dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 space-y-4"
 >
 <div className="flex items-center justify-between mb-2">
 <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
 <Box size={14} className="text-rose-500" />
 {newInventoryItem.id ? i18n.t('auto.edytuj_sprzet', { defaultValue: i18n.t('auto.edytuj_sprzet', { defaultValue: "Edytuj Sprzęt" }) }) : i18n.t('auto.nowy_sprzet', { defaultValue: i18n.t('auto.nowy_sprzet', { defaultValue: "Nowy Sprzęt" }) })}
 </h4>
 <button
 onClick={() => setNewInventoryItem(null)}
 className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-white dark:bg-slate-900 rounded-full shadow-sm"
 >
 <X size={14} />
 </button>
 </div>

 <div className="space-y-4">
 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.nazwa', { defaultValue: 'Nazwa' })}
 </label>
 <input
 type="text"
 placeholder={t('auto.np_sensor_dexcom_g6', { defaultValue: 'np. Sensor Dexcom G6' })}
 value={newInventoryItem.name}
 onChange={(e) =>
 setNewInventoryItem({
 ...newInventoryItem,
 name: e.target.value,
 })
 }
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-rose-500/20 transition-all"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.ilość', { defaultValue: i18n.t('auto.ilosc', { defaultValue: "Ilość" }) })}
 </label>
 <input
 type="number"
 value={newInventoryItem.quantity}
 onChange={(e) =>
 setNewInventoryItem({
 ...newInventoryItem,
 quantity: Number(e.target.value),
 })
 }
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-rose-500/20 transition-all"
 />
 </div>
 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.jednostka', { defaultValue: 'Jednostka' })}
 </label>
 <input
 type="text"
 placeholder={t('auto.np_szt_fiolki', { defaultValue: 'np. szt., fiolki' })}
 value={newInventoryItem.unit}
 onChange={(e) =>
 setNewInventoryItem({
 ...newInventoryItem,
 unit: e.target.value,
 })
 }
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-rose-500/20 transition-all"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-1 relative">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.kategoria', { defaultValue: 'Kategoria' })}
 </label>
 <div className="relative">
 <select
 value={newInventoryItem.category}
 onChange={(e) =>
 setNewInventoryItem({
 ...newInventoryItem,
 category: e.target.value as any,
 })
 }
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3 pl-3 pr-10 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-rose-500/20 transition-all appearance-none cursor-pointer"
 >
 <option value="sensors">{t('auto.sensory', { defaultValue: 'Sensory' })}</option>
 <option value="insulin">{t('auto.insulina', { defaultValue: 'Insulina' })}</option>
 <option value="pens">{t('auto.peny', { defaultValue: 'Wstrzykiwacze (Peny)' })}</option>
 {(!settings.treatmentMode || settings.treatmentMode === 'pump') && (
 <>
 <option value="reservoirs">{t('auto.zbiorniczki', { defaultValue: 'Zbiorniczki' })}</option>
 <option value="infusion_sets">{t('auto.wkłucia', { defaultValue: i18n.t('auto.wklucia', { defaultValue: "Wkłucia" }) })}</option>
 </>
 )}
 <option value="strips">{t('auto.paski', { defaultValue: 'Paski' })}</option>
 <option value="other">{t('auto.inne', { defaultValue: 'Inne' })}</option>
 </select>
 <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
 </div>
 </div>
 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.ostrzeżenie_poniżej_ilosc', { defaultValue: i18n.t('auto.ostrzezenie_ponizej_ilosc', { defaultValue: "Ostrzeżenie (poniżej ilosc)" }) })}
 </label>
 <input
 type="number"
 value={newInventoryItem.lowStockThreshold}
 onChange={(e) =>
 setNewInventoryItem({
 ...newInventoryItem,
 lowStockThreshold: Number(e.target.value),
 })
 }
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-rose-500/20 transition-all"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.kod_kreskowy_ean_upc', { defaultValue: 'Kod kreskowy (EAN/UPC)' })}
 </label>
 <div className="flex gap-2">
 <input
 type="text"
 placeholder={t('auto.skorzystaj_ze_skanera', { defaultValue: 'Skorzystaj ze skanera...' })}
 value={newInventoryItem.barcode || ""}
 onChange={(e) =>
 setNewInventoryItem({
 ...newInventoryItem,
 barcode: e.target.value,
 })
 }
 className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-rose-500/20 transition-all"
 />
 <button
 type="button"
 onClick={() => setShowBarcodeScanner(true)}
 className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center justify-center"
 >
 <Camera size={16} />
 </button>
 </div>
 </div>

 {newInventoryItem.category === "insulin" && (
 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.dzienne_zapotrzebowanie_oczekiwane_', { defaultValue: i18n.t('auto.dzienne_zapotrzebowanie_o', { defaultValue: "Dzienne zapotrzebowanie (oczekiwane spożycie, np. j.)" }) })}
 </label>
 <input
 type="number"
 placeholder={t('auto.np_45', { defaultValue: 'np. 45' })}
 value={newInventoryItem.dailyDose || ""}
 onChange={(e) =>
 setNewInventoryItem({
 ...newInventoryItem,
 dailyDose: e.target.value ? Number(e.target.value) : null,
 })
 }
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-rose-500/20 transition-all"
 />
 </div>
 )}

 {newInventoryItem.category === "reservoirs" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {t('auto.pojemnosc_zbiorniczka_jednostki', { defaultValue: 'Pojemność zbiorniczka (Jednostki U)' })}
                    </label>
                    <div className="flex items-center gap-1">
                      {[160, 180, 200, 300].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setNewInventoryItem({
                              ...newInventoryItem,
                              reservoirCapacity: preset,
                            });
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[8px] font-black transition-all active:scale-95",
                            (newInventoryItem.reservoirCapacity || 300) === preset
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          )}
                        >
                          {preset}U
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    placeholder="np. 180 lub 300"
                    value={newInventoryItem.reservoirCapacity || ""}
                    onChange={(e) =>
                      setNewInventoryItem({
                        ...newInventoryItem,
                        reservoirCapacity: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-purple-500/20 transition-all"
                  />
                </div>
              )}

              {newInventoryItem.category === "pens" && (
 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 {t('auto.pojemnosc_pena_w_jednostkach', { defaultValue: 'Pojemność pojedynczego pena (w jednostkach)' })}
 </label>
 <input
 type="number"
 placeholder={t('auto.np_300', { defaultValue: 'np. 300' })}
 value={newInventoryItem.penCapacity || ""}
 onChange={(e) =>
 setNewInventoryItem({
 ...newInventoryItem,
 penCapacity: e.target.value ? Number(e.target.value) : null,
 })
 }
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-rose-500/20 transition-all"
 />
 </div>
 )}

 <div className="space-y-1">
 <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
 
 {t('auto.krótka_data_ważności_opcjonalnie', { defaultValue: i18n.t('auto.krotka_data_waznosci_opcj', { defaultValue: "Krótka data ważności (Opcjonalnie)" }) })}
 </label>
 <div className="relative">
 <Calendar
 size={12}
 className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500"
 />
 <input
 type="date"
 value={newInventoryItem.expiryDate || ""}
 onChange={(e) =>
 setNewInventoryItem({
 ...newInventoryItem,
 expiryDate: e.target.value,
 })
 }
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3 pl-9 pr-3 rounded-2xl font-bold text-[10px] outline-none dark:text-white focus:ring-2 ring-rose-500/20 transition-all"
 />
 </div>
 </div>
 </div>

 <button
 onClick={saveInventoryItem}
 className="w-full bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
 >
 <CheckCircle2 size={14} />
 {newInventoryItem.id
 ? "Aktualizuj zapas"
 : "Zapisz w apteczce"}
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

