import { useLogsStore } from "../stores/useLogsStore";
import { useAuthStore } from "../stores/useAuthStore";
import { geminiService } from "../services/gemini";
import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Haptics } from "../lib/haptics";
import { healthService } from "../services/healthService";
import { toast } from "react-hot-toast";
import { getEffectiveUid, cn, isNativeApp } from "../lib/utils";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { usePetStatus, useNightscoutSettings } from '../hooks/queries/useProfileData';
import { useShortcuts } from "../hooks/queries/useShortcuts";
import { useQueryClient } from "@tanstack/react-query";
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
import { db, auth, onConnectionChange } from "../lib/firebase";
import { deleteUser } from "firebase/auth";
import {
 doc,
 getDoc,
 getDocs,
 setDoc,
 collection,
 addDoc,
 deleteDoc,
 updateDoc,
 serverTimestamp,
} from "firebase/firestore";
import { notificationService } from "../services/notificationService";
import { nightscoutService } from "../services/nightscout";
import { UserSettings, LogEntry, InventoryItem } from "../types";
import {
 APP_VERSION,
 DEFAULT_SETTINGS,
 MEDICAL_DICTIONARY,
 extractGTIN,
 lookupMedicalDictionary,
} from "../constants";
import { SKINS, PetSkin, ACCESSORIES, BACKGROUNDS, PetAccessory, PetBackground, ITEMS, PetItem } from '../data/petDatabase';
import { PWA_VERSIONS, APK_VERSIONS, CURRENT_VERSION } from "../constants/versions";
import CgmImport from "./CgmImport";
import DevicePairing from "./DevicePairing";
import RemoteAlertSender from "./RemoteAlertSender";
import BarcodeScannerModal from "./BarcodeScannerModal";
import SettingsTransfer from "./SettingsTransfer";
import LocalSync from "./LocalSync";

import ApiIntegration from "./ApiIntegration";
const PumpSimulator = React.lazy(() => import("./PumpSimulator"));
import { dbService } from "../services/databaseService";
import ProfileMedications from "./Profile/ProfileMedications";
import ProfileInventory from "./Profile/ProfileInventory";
import ProfileNotifications from "./Profile/ProfileNotifications";
import ProfileSystem from "./Profile/ProfileSystem";
import TreatmentModeSelector from "./Profile/TreatmentModeSelector";
import SiteRotationWidget from './SiteRotationWidget';
import StatisticsView from "./StatisticsView";
import TutorialView from "./TutorialView";
import GlikoTraining from "./GlikoTraining";
import { ConnectedDevice } from "../hooks/useGlikoServer";
import { useTranslation } from "react-i18next";
import i18n from '../i18n';
interface ProfileProps {
 
 handleLogout: () => void;
 theme: "light" | "dark";
 toggleTheme: () => void;
 setTab: (t: string) => void;
 initialAction?: string | null;
 onClearInitialAction?: () => void;
 settings: UserSettings;
 wsDevices?: ConnectedDevice[];
 kickDevice?: (id: string) => void;
}
export default function Profile({
  handleLogout,
  theme,
  toggleTheme,
  setTab,
  initialAction,
  onClearInitialAction,
  settings: initialSettings,
  wsDevices = [],
  kickDevice = () => {},
}: ProfileProps) {
 const user = useAuthStore(state => state.user);
 const { t } = useTranslation();
 const { logs } = useLogsStore();
 const { data: shortcuts = [] } = useShortcuts(user);
 const queryClient = useQueryClient();
 const [newShortcut, setNewShortcut] = useState<any>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const updatePetName = async () => { if (!user || !newName.trim()) return; setEditingName(false); try { await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "pet"), { name: newName.trim() }, { merge: true }); toast.success("Zapisano"); } catch (e) { toast.error("Błąd"); } };
 const [settings, setSettings] = useState<UserSettings>(() => ({ ...DEFAULT_SETTINGS, ...initialSettings }));
 useEffect(() => {
   if (initialSettings && Object.keys(initialSettings).length > 0) {
     setSettings(prev => ({ ...prev, ...initialSettings }));
   }
 }, [initialSettings]);
 const [learnedRules, setLearnedRules] = useState<any>(() => {
 try {
 return JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}');
 } catch {
 return {};
 }
 });
 const [confirmReservoirModalOpen, setConfirmReservoirModalOpen] = useState(false);
 const [isProcessingReplacement, setIsProcessingReplacement] = useState(false);
 const handleInfusionReplacement = async (alsoReplaceReservoir: boolean) => {
 setIsProcessingReplacement(true);
 setConfirmReservoirModalOpen(false);
 try {
 const now = Date.now();
 const currentInv = settings.inventory || [];
 const setIndex = currentInv.findIndex(i => i.category === "infusion_sets" && i.quantity > 0);
 let updatedInv = [...currentInv];
 if (setIndex !== -1) {
 updatedInv[setIndex] = { ...updatedInv[setIndex], quantity: Math.max(0, updatedInv[setIndex].quantity - 1) };
 }
 const updates = { infusionSetChangeDate: now, infusionSetSite: insertionSite } as any;
 
 if (alsoReplaceReservoir) {
 // @ts-ignore
 const resIndex = currentInv.findIndex(i => i.category === "reservoirs" && i.quantity > 0);
 if (resIndex !== -1) {
 updatedInv[resIndex] = { ...updatedInv[resIndex], quantity: Math.max(0, updatedInv[resIndex].quantity - 1) };
 }
 updates.reservoirChangeDate = now;
 }
 
 updates.inventory = updatedInv;
 setSettings((prev) => ({ ...prev, ...updates }));
 if (user) {
 await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"), updates, { merge: true });
 const siteLog = { type: "site_change", value: 1, timestamp: now, createdAt: new Date().toISOString(), notes: i18n.t('auto.wymiana_wklucia_var0', { defaultValue: "Wymiana wkłucia - {{var0}}", var0: insertionSite }), source: "system" };
 const docRef = await addDoc(collection(db, "users", getEffectiveUid(user), "logs"), siteLog);
 const addedSiteLog = { ...siteLog, id: docRef.id };
 await dbService.saveLog(addedSiteLog);
 window.dispatchEvent(new CustomEvent("localLogAdd", { detail: addedSiteLog }));
 
 if (alsoReplaceReservoir) {
 const resLog = { type: "site_change", value: 1, timestamp: now, createdAt: new Date().toISOString(), notes: i18n.t('auto.wymiana_zbiorniczka', { defaultValue: "Wymiana zbiorniczka" }), source: "system" };
 const resDocRef = await addDoc(collection(db, "users", getEffectiveUid(user), "logs"), resLog);
 const addedResLog = { ...resLog, id: resDocRef.id };
 await dbService.saveLog(addedResLog);
 window.dispatchEvent(new CustomEvent("localLogAdd", { detail: addedResLog }));
 }
 }
 toast.success(
 `Zapisano wymianę wkłucia (${insertionSite})${alsoReplaceReservoir ? ' i zbiorniczka' : ''}!`
 );
 } finally {
 setIsProcessingReplacement(false);
 }
 };
 const [widgetDebug, setWidgetDebug] = useState<any>(null);
 const fetchWidgetDebug = async () => {
 if (!Capacitor.isNativePlatform()) return;
 try {
 const { registerPlugin } = await import('@capacitor/core');
 const WidgetUpdater = registerPlugin<any>('WidgetUpdater');
 const info = await WidgetUpdater.getDebugInfo();
 setWidgetDebug(info);
 } catch (e) {
 console.warn("Failed to get widget debug info:", e);
 }
 };
 useEffect(() => {
 fetchWidgetDebug();
 }, []);
 const { data: petDataQuery } = usePetStatus(user);
 const petData = petDataQuery || {
 coins: 0,
 skin: "default",
 unlockedSkins: ["default"],
 level: 1,
 xp: 0,
 name: "Gliko",
 lastLoginDate: "",
 unlockedAccessories: ["none"],
 currentAccessory: "none",
 unlockedBackgrounds: ["room"],
 currentBackground: "room",
 };
 const [settingsLoading, setSettingsLoading] = useState(false);
 const [nsSyncLoading, setNsSyncLoading] = useState(false);
 const [updateLoading, setUpdateLoading] = useState(false);
 const [cleaningLoading, setCleaningLoading] = useState(false);
 const [nsUrl, setNsUrl] = useState(() => localStorage.getItem("ns_url_backup") || "");
 const { data: nsSettings } = useNightscoutSettings(user);
 useEffect(() => {
 if (nsSettings && nsSettings.url) {
 setNsUrl(nsSettings.url);
 localStorage.setItem("ns_url_backup", nsSettings.url);
 }
 }, [nsSettings]);
 const [nsSecret, setNsSecret] = useState("");
 const [shopTab, setShopTab] = useState<
 "skins" | "accessories" | "backgrounds"
 >("skins");
 const [saveStatus, setSaveStatus] = useState<string>("");
 const [geminiApiKey, setGeminiApiKey] = useState("");
 const [aiStatus, setAiStatus] = useState({ label: '', color: '', type: '' });
 useEffect(() => {
 const loadAiData = async () => {
 try {
 const result = await SecureStoragePlugin.get({ key: "gemini_api_key" });
 if (result && result.value) {
 setGeminiApiKey(result.value);
 }
 } catch(e) {}
 };
 loadAiData();
 }, []);
 useEffect(() => {
 geminiService.getAiStatus().then(setAiStatus);
 }, [geminiApiKey]);
 const [geminiSaveStatus, setGeminiSaveStatus] = useState("");
 const [isTestingKey, setIsTestingKey] = useState(false);
 const testKey = async () => {
   setIsTestingKey(true);
   try {
     const val = geminiApiKey.trim();
     if (val) {
       try {
         await SecureStoragePlugin.set({ key: "gemini_api_key", value: val });
       } catch(e) {}
     }
     geminiService.resetClient();

     const result = await geminiService.testConnection(val || undefined);
     if (result.success) {
       toast.success(i18n.t('auto.polaczenie_udane', { defaultValue: "Połączenie z API Gemini udane!" }), { icon: "✅" });
     } else {
       toast.error(result.error || i18n.t('auto.blad_klucza', { defaultValue: "Błąd klucza lub połączenia" }), { icon: "❌" });
     }
     const updatedStatus = await geminiService.getAiStatus();
     setAiStatus(updatedStatus);
   } catch (e: any) {
     toast.error(i18n.t('auto.blad_klucza', { defaultValue: "Błąd klucza lub połączenia" }), { icon: "❌" });
   } finally {
     setIsTestingKey(false);
   }
 };
 const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
 const [isInIframe, setIsInIframe] = useState(false);
 useEffect(() => {
 try {
 setIsInIframe(window.self !== window.top);
 } catch (e) {
 setIsInIframe(true);
 }
 return onConnectionChange(setIsFirebaseConnected);
 }, []);
 const [newMedication, setNewMedication] = useState<{
 id: string;
 name: string;
 dosage: string;
 reminders: string[];
 active: boolean;
 expiryDate?: string;
 } | null>(null);
 const [newInventoryItem, setNewInventoryItem] =
 useState<InventoryItem | null>(null);
 const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
 // @ts-ignore
 const sensorSite = settings.sensorSite || "Tył lewego ramienia";
 const insertionSite = settings.infusionSetSite || "Prawy brzuch";
 const icons = [
 "🍎",
 "🍌",
 "🍇",
 "🍓",
 "🥪",
 "🍕",
 "🍔",
 "🥤",
 "🍬",
 "🥣",
 "🍫",
 "🥨",
 "🍪",
 "🥛",
 ];
 const isFollower = !!localStorage.getItem("diacontrol_linked_uid");
 const therapyLocked = isFollower && settings.groupTherapyLock;
 const [medLoading, setMedLoading] = useState(false);
 const [isAnalyzingDrug, setIsAnalyzingDrug] = useState(false);
 const [cleaning, setCleaning] = useState(false);
 const [cleaningResult, setCleaningResult] = useState<string | null>(null);
 const [auditLoading, setAuditLoading] = useState(false);
 const [auditResult, setAuditResult] = useState<string | null>(null);
 const [activeCategory, setActiveCategory] = useState<string | null>(null);
 const topMenuRef = useRef<HTMLDivElement>(null);
 useEffect(() => {
 const slider = topMenuRef.current;
 if (!slider) return;
 let isDown = false;
 let startX: number;
 let scrollLeft: number;
 const mouseDown = (e: MouseEvent) => {
 isDown = true;
 slider.classList.add('cursor-grabbing');
 startX = e.pageX - slider.offsetLeft;
 scrollLeft = slider.scrollLeft;
 };
 const mouseLeave = () => {
 isDown = false;
 slider.classList.remove('cursor-grabbing');
 };
 const mouseUp = () => {
 isDown = false;
 slider.classList.remove('cursor-grabbing');
 };
 const mouseMove = (e: MouseEvent) => {
 if (!isDown) return;
 e.preventDefault();
 const x = e.pageX - slider.offsetLeft;
 const walk = (x - startX) * 2; // scroll-fast
 slider.scrollLeft = scrollLeft - walk;
 };
 slider.addEventListener('mousedown', mouseDown);
 slider.addEventListener('mouseleave', mouseLeave);
 slider.addEventListener('mouseup', mouseUp);
 slider.addEventListener('mousemove', mouseMove);
 return () => {
 slider.removeEventListener('mousedown', mouseDown);
 slider.removeEventListener('mouseleave', mouseLeave);
 slider.removeEventListener('mouseup', mouseUp);
 slider.removeEventListener('mousemove', mouseMove);
 };
 }, [activeCategory]);
 const [isEditingTiles, setIsEditingTiles] = useState(false);
 const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
 const saved = localStorage.getItem("glikosense_category_order");
 return saved
 ? JSON.parse(saved)
 : [
 "account",
 "simulator",
 "therapy",
 "shop",
 "devices",
 "stats",
 "food",
 "meds",
 "api",
 "android",
 "system",
 ];
 });
 useEffect(() => {
 localStorage.setItem(
 "glikosense_category_order",
 JSON.stringify(categoryOrder),
 );
 }, [categoryOrder]);
 const handleBarcodeScan = async (scannedBarcodeRaw: string) => {
 setShowBarcodeScanner(false);
 if (!user) return;
 
 const scannedBarcode = extractGTIN(scannedBarcodeRaw);
 const currentInv = settings.inventory || [];
 const existingItemIndex = currentInv.findIndex((i) => extractGTIN(i.barcode) === scannedBarcode);
 
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
 alert(i18n.t('auto.nieznany_kod_kreskowy_otwarto', { defaultValue: i18n.t('auto.nieznany_kod_kreskowy_otw', { defaultValue: "🆕 Nieznany kod kreskowy!\nOtwarto okno dodawania. Wpisz nazwę sprzętu, a aplikacja zapamięta go na przyszłość." }) }));
 }
 }
 };
 useEffect(() => {
 if (activeCategory !== null) {
 window.scrollTo({ top: 0, behavior: "instant" });
 }
 }, [activeCategory]);
 const tabsRef = useRef<HTMLDivElement>(null);
 const orderedCategories = useMemo(() => {
 const ALL_CATEGORIES = [
 {
 id: "tutorial",
 label: i18n.t('auto.samouczek', { defaultValue: 'Samouczek' }),
 sub: i18n.t('auto.faq_pomoc', { defaultValue: "FAQ & Pomoc" }),
 icon: <HelpCircle size={24} />,
 color: "bg-indigo-500",
 },
 {
 id: "simulator",
 label: i18n.t('auto.symulator', { defaultValue: 'Symulator' }),
 sub: i18n.t('auto.bolusa', { defaultValue: 'Bolusa' }),
 icon: <Calculator size={24} />,
 color: "bg-orange-500",
 },
 {
 id: "account",
 label: i18n.t('auto.profil', { defaultValue: 'Profil' }),
 sub: i18n.t('auto.zarzadzanie_kontem', { defaultValue: i18n.t('auto.zarzadzanie_kontem', { defaultValue: "Zarządzanie kontem" }) }),
 icon: <User size={24} />,
 color: "bg-blue-500",
 },
 {
 id: "therapy",
 label: i18n.t('auto.terapia', { defaultValue: 'Terapia' }),
 sub: i18n.t('auto.cele_i_isf', { defaultValue: 'Cele & ISF' }),
 icon: <Activity size={24} />,
 color: "bg-emerald-500",
 },
 {
 id: "training",
 label: i18n.t('auto.trening', { defaultValue: 'Trening' }),
 sub: i18n.t('auto.wplyw_sportu', { defaultValue: i18n.t('auto.wplyw_sportu', { defaultValue: "Wpływ sportu" }) }),
 icon: <Dumbbell size={24} />,
 color: "bg-emerald-500",
 },
 ...(settings.childMode
 ? [
 {
 id: "shop",
 label: i18n.t('auto.sklepik', { defaultValue: 'Sklepik' }),
 sub: petData.name,
 icon: <ShoppingBag size={24} />,
 color: "bg-amber-500",
 },
 ]
 : []),
 {
 id: "notifications",
 label: i18n.t('auto.centrum_powiadomien', { defaultValue: "Centrum powiadomień" }),
 sub: i18n.t('auto.alerty_push', { defaultValue: "Alerty Push" }),
 icon: <Bell size={24} />,
 color: "bg-amber-500",
 },
 {
 id: "devices",
 label: i18n.t('auto.osprzęt', { defaultValue: i18n.t('auto.osprzet', { defaultValue: "Osprzęt" }) }),
 sub: i18n.t('auto.cgm_wklucia', { defaultValue: i18n.t('auto.cgm_wklucia', { defaultValue: "CGM & Wkłucia" }) }),
 icon: <Signal size={24} />,
 color: "bg-indigo-500",
 },
 {
 id: "stats",
 label: i18n.t('auto.statystyki', { defaultValue: 'Statystyki' }),
 sub: i18n.t('auto.miesieczne', { defaultValue: i18n.t('auto.miesieczne', { defaultValue: "Miesięczne" }) }),
 icon: <BarChart2 size={24} />,
 color: "bg-indigo-600",
 },
 {
 id: "food",
 label: i18n.t('auto.skróty', { defaultValue: i18n.t('auto.skroty', { defaultValue: "Skróty" }) }),
 sub: i18n.t('auto.szybkie_wpisy', { defaultValue: "Szybkie wpisy" }),
 icon: <Utensils size={24} />,
 color: "bg-amber-500",
 },
 {
 id: "meds",
 label: i18n.t('auto.leki', { defaultValue: 'Leki' }),
 sub: i18n.t('auto.przypomnienia', { defaultValue: "Przypomnienia" }),
 icon: <Pill size={24} />,
 color: "bg-teal-500",
 },
 {
 id: "api",
 label: i18n.t('auto.integracje', { defaultValue: 'Integracje' }),
 sub: i18n.t('auto.api_i_chmura', { defaultValue: "API & Chmura" }),
 icon: <Globe size={24} />,
 color: "bg-sky-500",
 },
 {
 id: "pairing",
 label: i18n.t('auto.parowanie', { defaultValue: 'Parowanie' }),
 sub: i18n.t('auto.zarzadzaj_urzadzeniami', { defaultValue: i18n.t('auto.zarzadzaj_urzadzeniami', { defaultValue: "Zarządzaj urządzeniami" }) }),
 icon: <Share2 size={24} />,
 color: "bg-blue-500",
 },
 {
 id: "android",
 label: i18n.t('auto.aplikacja', { defaultValue: 'Aplikacja' }),
 sub: "Android APK",
 icon: <Smartphone size={24} />,
 color: "bg-green-500",
 },
 {
 id: "system",
 label: i18n.t('auto.system', { defaultValue: 'System' }),
 sub: i18n.t('auto.wyglad_inne', { defaultValue: i18n.t('auto.wyglad_inne', { defaultValue: "Wygląd & Inne" }) }),
 icon: <Settings size={24} />,
 color: "bg-slate-600",
 },
 ];
 
 let filteredCategories = ALL_CATEGORIES;
 if (settings.followerMode) {
 filteredCategories = ALL_CATEGORIES.filter(c => 
 ["system", "android", "account", "devices", "notifications"].includes(c.id)
 );
 }
 const availableIds = filteredCategories.map((c) => c.id);
 const ordered = categoryOrder
 .filter((id) => availableIds.includes(id))
 .map((id) => filteredCategories.find((c) => c.id === id)!);
 const missing = filteredCategories.filter((c) => !categoryOrder.includes(c.id));
 return [...ordered, ...missing];
 }, [settings.childMode, petData.name, categoryOrder, settings.followerMode]);
 const performTherapyAudit = async () => {
 if (auditLoading) return;
 setAuditLoading(true);
 setAuditResult(null);
 Haptics.medium();
 try {
 const result = await geminiService.getMasterAnalysis(logs);
 setAuditResult(result);
 toast.success("Audyt terapii wygenerowany!");
 Haptics.success();
 } catch (err) {
 console.error("Therapy Audit Failed:", err);
 toast.error(i18n.t('auto.nie_udalo_sie_wygenerowac_audy', { defaultValue: i18n.t('auto.nie_udalo_sie_wygenerowac', { defaultValue: "Nie udało się wygenerować audytu." }) }));
 } finally {
 setAuditLoading(false);
 }
 };
 const scrollTabs = (dir: "left" | "right") => {
 if (tabsRef.current) {
 const scrollAmount = 200;
 tabsRef.current.scrollBy({
 left: dir === "left" ? -scrollAmount : scrollAmount,
 behavior: "smooth",
 });
 }
 };
 useEffect(() => {
 if (initialAction) {
 if (initialAction === "meds") setActiveCategory("meds");
 if (initialAction === "simulator") setActiveCategory("simulator");
 if (initialAction === "tutorial") setActiveCategory("tutorial");
 if (initialAction === "stats") setActiveCategory("stats");
 if (initialAction === "food") setActiveCategory("food");
 if (initialAction === "api") setActiveCategory("api");
 if (initialAction === "devices") setActiveCategory("devices");
 if (initialAction === "shop") setActiveCategory("shop");
 if (initialAction === "training") setActiveCategory("training");
 if (initialAction === "pairing") setActiveCategory("pairing");
 // clear action
 setTimeout(() => {
 onClearInitialAction && onClearInitialAction();
 }, 100);
 }
 }, [initialAction]);
 const [nukeLoading, setNukeLoading] = useState(false);
 const [showRodo, setShowRodo] = useState(false);
 const [apkVersion, setApkVersion] = useState<string>("1.5.4");
 const [apkUrl, setApkUrl] = useState<string>("https://github.com/lukcorp83-glitch/diab/releases/download/aktualizacja/GlikoControl_1.5.4_OTA_FINISH.apk");
 useEffect(() => {
 const isBeta = localStorage.getItem("betaProgramEnabled") === "true";
 const url = isBeta
 ? 'https://raw.githubusercontent.com/lukcorp83-glitch/diab/beta/version.json?t=' + Date.now()
 : 'https://raw.githubusercontent.com/lukcorp83-glitch/diab/main/version.json?t=' + Date.now();
 fetch(url)
 .then(res => res.json())
 .then(data => {
 if (data.version) setApkVersion(data.version);
 if (data.apkUrl) {
 const finalApkUrl = isBeta 
 ? data.apkUrl.replace('aktualizacja', 'aktualizacja-beta').replace('_OTA.apk', '-beta_OTA.apk')
 : data.apkUrl;
 setApkUrl(finalApkUrl);
 }
 })
 .catch(() => {});
 }, []);
 const nukeAllData = async () => {
 if (
 !window.confirm(
 i18n.t('auto.czy_na_pewno_chcesz_usunac_kon', { defaultValue: i18n.t('auto.czy_na_pewno_chcesz_usuna', { defaultValue: "Czy na pewno chcesz usunąć konto i wszystkie swoje dane? Ta operacja jest nieodwracalna." }) }),
 )
 ) {
 return;
 }
 if (
 !window.confirm(
 i18n.t('auto.czy_jestes_w_100_pewny_to_spow', { defaultValue: i18n.t('auto.czy_jestes_w_100_pewny_to', { defaultValue: "Czy jesteś w 100% pewny? To spowoduje bezpowrotne usunięcie konta i wylogowanie z aplikacji." }) }),
 )
 ) {
 return;
 }
 setNukeLoading(true);
 Haptics.impact();
 try {
 const uid = getEffectiveUid(user);
 const userDocPath = `users/${uid}`;
 // List of collections/docs to delete
 const collectionsToDelete = [
 "logs",
 "shortcuts",
 "customProducts",
 "notifications",
 "achievements",
 ];
 const docsToDelete = [
 "settings/profile",
 "settings/nightscout",
 "pet/status",
 "achievements/stats",
 ];
 for (const collName of collectionsToDelete) {
 const collRef = collection(db, userDocPath, collName);
 const snapshot = await getDocs(collRef);
 for (const d of snapshot.docs) {
 await deleteDoc(doc(db, userDocPath, collName, d.id));
 }
 }
 for (const docPath of docsToDelete) {
 await deleteDoc(doc(db, userDocPath, ...docPath.split("/")));
 }
 await deleteDoc(doc(db, "users", uid));
 if (auth.currentUser) {
 try {
 await deleteUser(auth.currentUser);
 } catch (e) {
 console.warn("Could not delete auth user", e);
 }
 }
 toast.success(i18n.t('auto.wszystkie_dane_i_konto_zostaly', { defaultValue: i18n.t('auto.wszystkie_dane_i_konto_zo', { defaultValue: "Wszystkie dane i konto zostały usunięte." }) }));
 setTimeout(() => {
 handleLogout();
 window.location.reload();
 }, 1500);
 } catch (err) {
 console.error("Nuke failed:", err);
 toast.error(i18n.t('auto.blad_podczas_usuwania_danych', { defaultValue: i18n.t('auto.blad_podczas_usuwania_dan', { defaultValue: "Błąd podczas usuwania danych." }) }));
 } finally {
 setNukeLoading(false);
 }
 };
 const normalizeName = (name: string) =>
 name
 .trim()
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "") // usuwanie diakrytyków
 .replace(/[^a-z0-9%\s]/g, "") // usuwanie znaków specjalnych
 .replace(/\s+/g, " "); // usuwanie wielokrotnych spacji
 ;
 const handleBuySkin = async (skin: any) => {
 if (petData.coins < skin.price) return;
 const unlocked = petData.unlockedSkins || ["default"];
 if (unlocked.includes(skin.id)) return;

 try {
 const petRef = doc(
 db,
 "users",
 getEffectiveUid(user),
 "pet",
 "status"
 );
 await updateDoc(petRef, {
 coins: petData.coins - skin.price,
 unlockedSkins: [...unlocked, skin.id],
 skin: skin.id,
 });
 } catch (err) {
 console.error("Error buying skin:", err);
 }
 };
 const handleEquipSkin = async (skinId: string) => {
 if (!petData.unlockedSkins.includes(skinId)) return;
 Haptics.light();
 try {
 const petRef = doc(
 db,
 "users",
 getEffectiveUid(user),
 "pet",
 "status",
 );
 await updateDoc(petRef, { skin: skinId });
 } catch (err) {
 console.error("Error equipping skin:", err);
 }
 };
 const handleBuyAccessory = async (acc: any) => {
 if (petData.coins < acc.price) return;
 const unlocked = petData.unlockedAccessories || ["none"];
 if (unlocked.includes(acc.id)) return;
 try {
 const petRef = doc(
 db,
 "users",
 getEffectiveUid(user),
 "pet",
 "status",
 );
 await updateDoc(petRef, {
 coins: petData.coins - acc.price,
 unlockedAccessories: [...unlocked, acc.id],
 currentAccessory: acc.id,
 });
 } catch (err) {
 console.error("Error buying accessory:", err);
 }
 };
 const handleEquipAccessory = async (accId: string) => {
 try {
 const petRef = doc(
 db,
 "users",
 getEffectiveUid(user),
 "pet",
 "status",
 );
 await updateDoc(petRef, { currentAccessory: accId });
 } catch (err) {
 console.error("Error equipping accessory:", err);
 }
 };
 const handleBuyBackground = async (bg: any) => {
 if (petData.coins < bg.price) return;
 const unlocked = petData.unlockedBackgrounds || ["room"];
 if (unlocked.includes(bg.id)) return;
 if (bg.rewardTir) return;
 try {
 const petRef = doc(
 db,
 "users",
 getEffectiveUid(user),
 "pet",
 "status",
 );
 await updateDoc(petRef, {
 coins: petData.coins - bg.price,
 unlockedBackgrounds: [...unlocked, bg.id],
 currentBackground: bg.id,
 });
 } catch (err) {
 console.error("Error buying background:", err);
 }
 };
 const handleEquipBackground = async (bgId: string) => {
 try {
 const petRef = doc(
 db,
 "users",
 getEffectiveUid(user),
 "pet",
 "status",
 );
 await updateDoc(petRef, { currentBackground: bgId });
 } catch (err) {
 console.error("Error equipping background:", err);
 }
 };
 const saveShortcut = async () => {
 if (!newShortcut.name) return;
 try {
 if (newShortcut.id) {
 // Edit
 const { id, ...data } = newShortcut;
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "shortcuts",
 id,
 ),
 data,
 );
 } else {
 // Add
 const { id, ...data } = newShortcut;
 await addDoc(
 collection(
 db,
 "users",
 getEffectiveUid(user),
 "shortcuts",
 ),
 data,
 );
 }
 queryClient.invalidateQueries({ queryKey: ['shortcuts', getEffectiveUid(user)] });
 setNewShortcut(null);
 } catch (e) {
 console.error(e);
 }
 };
 const deleteShortcut = async (id: string) => {
 try {
 await deleteDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "shortcuts",
 id,
 ),
 );
 queryClient.invalidateQueries({ queryKey: ['shortcuts', getEffectiveUid(user)] });
 } catch (e) {
 console.error(e);
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
 { customDrugDictionary: updatedDict },
 { merge: true }
 );
 toast.success(i18n.t('auto.ai_analiza_zakonczona', { defaultValue: "AI: Analiza zakończona!" }), { id: toastId });
 } else {
 toast.error(i18n.t('auto.ai_nie_udalo_sie_przean', { defaultValue: "AI: Nie udało się przeanalizować." }), { id: toastId });
 }
 } catch (error) {
 toast.error(i18n.t('auto.ai_blad_komunikacji', { defaultValue: "AI: Błąd komunikacji." }), { id: toastId });
 } finally {
 setIsAnalyzingDrug(false);
 }
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
 const newSettings = { ...settings, medications: updatedMeds };
 setSettings(newSettings);
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 { medications: updatedMeds },
 { merge: true },
 );
 setNewMedication(null);
 } catch (e) {
 console.error(e);
 toast.error(i18n.t('auto.blad_zapisu_leku', { defaultValue: i18n.t('auto.blad_zapisu_leku', { defaultValue: "Błąd zapisu leku" }) }));
 } finally {
 setMedLoading(false);
 }
 };
 ;
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
 const newSettings = { ...settings, inventory: updatedInventory };
 setSettings(newSettings);
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 { inventory: updatedInventory },
 { merge: true },
 );
 setNewInventoryItem(null);
 } catch (e) {
 console.error(e);
 toast.error(i18n.t('auto.blad_zapisu_zapasow', { defaultValue: i18n.t('auto.blad_zapisu_zapasow', { defaultValue: "Błąd zapisu zapasów" }) }));
 }
 };
 ;
 useEffect(() => {
 // Live preview of settings before saving
 const root = window.document.documentElement;
 let activeTheme = settings.theme || theme;
 if (activeTheme === "system") {
 activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
 ? "dark"
 : "light";
 }
 root.classList.remove("light", "dark");
 root.classList.add(activeTheme);
 root.setAttribute("data-accent", settings.accentColor || "accent");
 root.setAttribute("data-bg", settings.bgOption || "default");
 }, [settings.theme, settings.accentColor, settings.bgOption, theme]);
 const saveSettings = async () => {
 if (!user) return;
 setSettingsLoading(true);
 // Upewnij się, że żywotność sensora i wkłucia mają poprawne wartości przed zapisem
 const targetSettings = { ...settings };
 if (!targetSettings.sensorDurationDays || targetSettings.sensorDurationDays < 1) {
 targetSettings.sensorDurationDays = 10;
 } else if (targetSettings.sensorDurationDays > 30) {
 targetSettings.sensorDurationDays = 30;
 }
 if (!targetSettings.infusionSetDurationDays || targetSettings.infusionSetDurationDays < 1) {
 targetSettings.infusionSetDurationDays = 3;
 } else if (targetSettings.infusionSetDurationDays > 7) {
 targetSettings.infusionSetDurationDays = 7;
 }
 setSettings(targetSettings);
 try {
 localStorage.setItem("glikocontrol_user_settings", JSON.stringify(targetSettings));
 if (user) {
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 targetSettings,
 { merge: true },
 );
 }
 const uidKey = user ? getEffectiveUid(user) : 'local';
 queryClient.setQueryData(['userSettings', uidKey], targetSettings);
 queryClient.setQueryData(['userSettings', 'local'], targetSettings);
 queryClient.invalidateQueries({ queryKey: ['userSettings'] });
 toast.success(i18n.t('auto.ustawienia_zapisane_pomyslnie', { defaultValue: i18n.t('auto.ustawienia_zapisane_pomys', { defaultValue: "Ustawienia zapisane pomyślnie!" }) }));
 } catch (e) {
 console.error("Save settings error:", e);
 alert(
 i18n.t('auto.blad_podczas_zapisywania_ustaw', { defaultValue: i18n.t('auto.blad_podczas_zapisywania', { defaultValue: "Błąd podczas zapisywania ustawień:" }) }) +
 (e instanceof Error ? e.message : String(e)),
 );
 } finally {
 setSettingsLoading(false);
 }
 };
 const saveNsUrl = async () => {
 if (!user) return;
 try {
 let cleanUrl = nsUrl.trim().replace(/\/$/, "");
 if (
 cleanUrl &&
 !cleanUrl.startsWith("http://") &&
 !cleanUrl.startsWith("https://")
 ) {
 cleanUrl = `https://${cleanUrl}`;
 }
 setNsUrl(cleanUrl);
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "nightscout",
 ),
 {
 url: cleanUrl,
 secret: nsSecret.trim(),
 },
 );
 if (Capacitor.isNativePlatform()) {
 try {
 const { registerPlugin } = await import('@capacitor/core');
 const WidgetUpdater = registerPlugin<any>('WidgetUpdater');
 const minVal = settings.targetMin ?? 70;
 const maxVal = settings.targetMax ?? 140;
 await WidgetUpdater.update({
 url: cleanUrl,
 secret: nsSecret.trim(),
 targetMin: String(minVal),
 targetMax: String(maxVal)
 });
 console.log(i18n.t('auto.natywna_synchronizacja_ustawie', { defaultValue: i18n.t('auto.natywna_synchronizacja_us', { defaultValue: "Natywna synchronizacja ustawień zakończona sukcesem" }) }));
 } catch (err) {
 console.error(i18n.t('auto.blad_synchronizacji_z_wtyczka', { defaultValue: i18n.t('auto.blad_synchronizacji_z_wty', { defaultValue: "Błąd synchronizacji z wtyczką widgetów:" }) }), err);
 }
 }
 setSaveStatus(i18n.t('auto.zapisano_pomyslnie', { defaultValue: i18n.t('auto.zapisano_pomyslnie', { defaultValue: "Zapisano pomyślnie!" }) }));
 setTimeout(() => setSaveStatus(""), 3000);
 } catch (e) {
 console.error(e);
 setSaveStatus(i18n.t('auto.blad_zapisu', { defaultValue: i18n.t('auto.blad_zapisu', { defaultValue: "Błąd zapisu" }) }));
 setTimeout(() => setSaveStatus(""), 3000);
 }
 };
 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="space-y-4 relative min-h-[calc(100vh-8rem)]"
 >
 {settings.childMode && (
 <>
 {/* Pet Header Section */}
 <div className="flex items-center justify-between mb-6 px-2">
 <div className="flex items-center gap-4">
 <div className="w-16 h-16 rounded-[2rem] bg-accent-500 flex items-center justify-center text-white shadow-lg shadow-accent-500/20">
 <Baby size={32} />
 </div>
 <div>
 {editingName ? (
 <div className="flex items-center gap-2">
 <input
 value={newName}
 onChange={(e) => setNewName(e.target.value)}
 className="bg-slate-100 dark:bg-slate-800 border-2 border-accent-500 rounded-2xl px-3 py-1 font-black text-lg outline-none w-32 dark:text-white"
 autoFocus
 />
 <button
 onClick={updatePetName}
 className="text-emerald-500 p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-2xl transition-all"
 >
 <Check size={20} />
 </button>
 <button
 onClick={() => setEditingName(false)}
 className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all"
 >
 <X size={20} />
 </button>
 </div>
 ) : (
 <div
 className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity"
 onClick={() => {
 setNewName(petData.name || "Gliko");
 setEditingName(true);
 }}
 >
 <h2 className="text-2xl font-black dark:text-white">
 {petData.name || "Gliko"}
 </h2>
 <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-30 group-hover:opacity-100 transition-all">
 <Smartphone size={10} />
 </div>
 </div>
 )}
 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
 
 {t('auto.poziom', { defaultValue: 'Poziom' })} {petData.level}
 </p>
 </div>
 </div>
 <div className="bg-amber-100/50 dark:bg-amber-500/5 px-4 py-2 rounded-2xl flex items-center gap-2 border border-amber-100 dark:border-amber-500/20">
 <Coins size={16} className="text-amber-500" />
 <span className="text-lg font-black text-amber-600">
 {petData.coins}
 </span>
 </div>
 </div>
 <button
 onClick={() => {
 Haptics.selection();
 setTab("achievements");
 }}
 className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white p-6 rounded-[3rem] shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-between"
 >
 <div className="flex items-center gap-4 text-left">
 <div className="bg-white/20 p-3 rounded-[1.5rem] shrink-0">
 <Trophy size={28} />
 </div>
 <div>
 <h3 className="font-black text-lg leading-tight">
 
 {t('auto.system_osiągnięć', { defaultValue: i18n.t('auto.system_osiagniec', { defaultValue: "System Osiągnięć" }) })}
 </h3>
 <p className="text-white/80 text-xs font-medium">
 
 {t('auto.sprawdź_swoje_postępy_i_zdobyte_odz', { defaultValue: i18n.t('auto.sprawdz_swoje_postepy_i_z', { defaultValue: "Sprawdź swoje postępy i zdobyte odznaki" }) })}
 </p>
 </div>
 </div>
 </button>
 </>
 )}
 {activeCategory === null ? (
 <div className="pb-6 pt-2">
 {settings.followerMode && (
 <div className="mb-6 bg-cyan-500/10 border border-cyan-500/20 rounded-[2.5rem] p-5 shadow-lg flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="bg-cyan-500 p-3 text-white rounded-2xl">
 <Activity size={24} />
 </div>
 <div className="text-left">
 <h3 className="font-black text-cyan-600 dark:text-cyan-400 leading-none">{t('auto.tryb_śledzący', { defaultValue: i18n.t('auto.tryb_sledzacy', { defaultValue: "Tryb Śledzący" }) })}</h3>
 <p className="text-[10px] text-cyan-700/70 dark:text-cyan-300/70 font-bold uppercase tracking-widest mt-1">{t('auto.tylko_odczyt', { defaultValue: 'Tylko Odczyt' })}</p>
 </div>
 </div>
 <button 
 onClick={async () => {
 const updated = { ...settings, followerMode: false };
 setSettings(updated);
 await setDoc(
 doc(db, "users", getEffectiveUid(user!), "settings", "profile"),
 { followerMode: false },
 { merge: true }
 );
 toast.success(i18n.t('auto.wylaczono_tryb_sledzacy_wrocon', { defaultValue: i18n.t('auto.wylaczono_tryb_sledzacy_w', { defaultValue: "Wyłączono Tryb Śledzący. Wrócono do pełnej wersji." }) }));
 }} 
 className="bg-cyan-500 hover:bg-cyan-600 text-white text-[10px] font-black uppercase px-4 py-3 rounded-xl transition-all shadow-md active:scale-95"
 >
 
 {t('auto.wyłącz', { defaultValue: i18n.t('auto.wylacz', { defaultValue: "Wyłącz" }) })}
 </button>
 </div>
 )}
 <div className="flex items-center justify-between mb-4 px-2">
 <h2 className="text-xl font-black text-slate-800 dark:text-white">
 
 {t('auto.więcej_opcji', { defaultValue: i18n.t('auto.wiecej_opcji', { defaultValue: "Więcej opcji" }) })}
 </h2>
 <button
 onClick={() => {
 Haptics.selection();
 setIsEditingTiles(!isEditingTiles);
 }}
 className="text-xs font-bold text-accent-500 bg-accent-500/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-transform"
 >
 {isEditingTiles ? (
 <>{t('auto.zakończ', { defaultValue: i18n.t('auto.zakoncz', { defaultValue: "Zakończ" }) })}</>
 ) : (
 <>
 <Edit2 size={12} /> {t('auto.edytuj', { defaultValue: 'Edytuj' })}
 </>
 )}
 </button>
 </div>
 <Reorder.Group
 axis="y"
 values={categoryOrder}
 onReorder={(newOrder) => {
 Haptics.selection();
 setCategoryOrder(newOrder);
 }}
 className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
 >
 {orderedCategories.map((cat) => (
 <Reorder.Item
 key={cat.id}
 value={cat.id}
 dragListener={isEditingTiles}
 className={cn(
 "w-full relative",
 isEditingTiles && "touch-none",
 )}
 >
 <div
 onClick={() => {
 if (isEditingTiles) return;
 Haptics.selection();
 setActiveCategory(cat.id);
 }}
 className={cn(
 "w-full h-32 rounded-[1.75rem] flex flex-col p-4 transition-all duration-300 relative overflow-hidden group",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50",
 !isEditingTiles &&
 (settings.glassmorphismEnabled
 ? "hover:bg-white/10 dark:hover:bg-white/5 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
 : "hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1 cursor-pointer"),
 isEditingTiles &&
 "opacity-90 scale-[0.98] cursor-grab active:cursor-grabbing border-slate-300 dark:border-slate-600",
 )}
 >
 <div
 className={cn(
 "w-10 h-10 rounded-[1rem] flex items-center justify-center text-white mb-2 shadow-md shrink-0",
 !isEditingTiles &&
 "group-hover:scale-110 transition-transform",
 cat.color,
 )}
 >
 {cat.icon}
 </div>
 <div className="text-left mt-auto">
 <div className="flex items-center gap-1.5 line-clamp-1">
 <p className="text-[11px] sm:text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
 {cat.label}
 </p>
 {cat.id === "android" && (
 <span className="bg-indigo-500 text-white px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-widest shrink-0 shadow-sm leading-none">
 
 {t('auto.beta', { defaultValue: 'BETA' })}
 </span>
 )}
 </div>
 <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-600 transition-colors mt-0.5 line-clamp-2 leading-tight">
 {cat.sub}
 </p>
 </div>
 {isEditingTiles && (
 <div className="absolute top-4 right-4 text-slate-400 p-1 bg-white dark:bg-slate-900 rounded-full shadow-sm">
 <GripVertical size={16} />
 </div>
 )}
 </div>
 </Reorder.Item>
 ))}
 </Reorder.Group>
 </div>
 ) : (
 <div 
 ref={topMenuRef}
 onWheel={(e) => {
 if (topMenuRef.current) {
 topMenuRef.current.scrollLeft += e.deltaY;
 }
 }}
 className="mb-6 -mx-2 px-2 overflow-x-auto scrollbar-none select-none"
 >
 <div className="flex gap-2">
 <button
 onClick={() => {
 Haptics.selection();
 setActiveCategory(null);
 }}
 className={cn(
 "flex items-center gap-2 transition-colors duration-200 px-4 py-3 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest shrink-0",
 settings.glassmorphismEnabled
 ? "text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-800/30 backdrop-blur-md bg-white/10 dark:bg-slate-900/10 border border-white/20"
 : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800",
 )}
 >
 <ChevronLeft size={16} />
 <span>{t('auto.wróć_do_menu', { defaultValue: i18n.t('auto.wroc_do_menu', { defaultValue: "Wróć do Menu" }) })}</span>
 </button>
 <div
 className={cn(
 "flex rounded-[1.5rem] p-1 items-center",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50",
 )}
 >
 {[
 {
 id: "tutorial",
 label: i18n.t('auto.samouczek', { defaultValue: 'Samouczek' }),
 icon: <HelpCircle size={14} />,
 color: "text-indigo-500 bg-indigo-500/10",
 },
 {
 id: "simulator",
 label: i18n.t('auto.symulator', { defaultValue: 'Symulator' }),
 icon: <Calculator size={14} />,
 color: "text-orange-500 bg-orange-500/10",
 },
 { id: "account", label: i18n.t('auto.profil', { defaultValue: 'Profil' }), icon: <User size={14} />, color: "text-blue-500 bg-blue-500/10" },
 {
 id: "therapy",
 label: i18n.t('auto.terapia', { defaultValue: 'Terapia' }),
 icon: <Activity size={14} />,
 color: "text-emerald-500 bg-emerald-500/10",
 },
 {
 id: "training",
 label: i18n.t('auto.trening', { defaultValue: 'Trening' }),
 icon: <Dumbbell size={14} />,
 color: "text-emerald-500 bg-emerald-500/10",
 },
 ...(settings.childMode
 ? [
 {
 id: "shop",
 label: i18n.t('auto.sklepik', { defaultValue: 'Sklepik' }),
 icon: <ShoppingBag size={14} />,
 color: "text-amber-500 bg-amber-500/10",
 },
 ]
 : []),
 { id: "devices", label: i18n.t('auto.osprzęt', { defaultValue: i18n.t('auto.osprzet', { defaultValue: "Osprzęt" }) }), icon: <Signal size={14} />, color: "text-indigo-500 bg-indigo-500/10" },
 {
 id: "stats",
 label: i18n.t('auto.statystyki', { defaultValue: 'Statystyki' }),
 icon: <BarChart2 size={14} />,
 color: "text-indigo-600 bg-indigo-600/10",
 },
 { id: "food", label: i18n.t('auto.skróty', { defaultValue: i18n.t('auto.skroty', { defaultValue: "Skróty" }) }), icon: <Utensils size={14} />, color: "text-amber-500 bg-amber-500/10" },
 { id: "meds", label: i18n.t('auto.leki', { defaultValue: 'Leki' }), icon: <Pill size={14} />, color: "text-teal-500 bg-teal-500/10" },
 { id: "api", label: i18n.t('auto.api', { defaultValue: 'API' }), icon: <Globe size={14} />, color: "text-sky-500 bg-sky-500/10" },
 { id: "pairing", label: i18n.t('auto.parowanie', { defaultValue: 'Parowanie' }), icon: <Share2 size={14} />, color: "text-blue-500 bg-blue-500/10" },
 {
 id: "android",
 label: i18n.t('auto.aplikacja', { defaultValue: 'Aplikacja' }),
 icon: <Smartphone size={14} />,
 color: "text-green-500 bg-green-500/10",
 },
 { id: "notifications", label: i18n.t('auto.centrum_powiadomien', { defaultValue: "Centrum powiadomień" }), icon: <Bell size={14} />, color: "text-amber-500 bg-amber-500/10" },
 { id: "system", label: i18n.t('auto.system', { defaultValue: 'System' }), icon: <Settings size={14} />, color: "text-slate-500 bg-slate-500/10" },
 ].map((cat) => (
 <button
 key={cat.id}
 onClick={() => {
 Haptics.selection();
 setActiveCategory(cat.id);
 }}
 className={cn(
 "flex items-center gap-2 px-3 py-2 rounded-2xl text-[10px] font-bold transition-all whitespace-nowrap",
 activeCategory === cat.id
 ? settings.glassmorphismEnabled
 ? "bg-white/20 dark:bg-slate-700/30 shadow-sm text-slate-900 dark:text-white border border-white/20 dark:border-white/5"
 : "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
 : settings.glassmorphismEnabled
 ? "text-slate-600 dark:text-slate-400 hover:bg-white/5 dark:hover:bg-slate-800/30"
 : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
 )}
 >
 <span className={cn("p-1.5 flex items-center justify-center rounded-xl shrink-0 opacity-100", cat.color)}>{cat.icon}</span>
 <span className="uppercase tracking-widest leading-none flex items-center gap-1.5">
 {cat.label}
 {cat.id === "android" && (
 <span className="bg-indigo-500/20 text-indigo-600 dark:bg-indigo-500/30 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[8px] font-black">
 
 {t('auto.beta', { defaultValue: 'BETA' })}
 </span>
 )}
 </span>
 </button>
 ))}
 </div>
 </div>
 </div>
 )}
 {activeCategory === "account" && (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="pb-20 space-y-4"
 >
 <div className="relative p-4 rounded-[2.5rem] text-center overflow-hidden group">
 <div className="absolute inset-0 bg-gradient-to-br from-accent-500/10 via-transparent to-purple-500/5 dark:from-accent-500/20"></div>
 <div className="absolute -top-12 -right-12 w-48 h-48 bg-accent-500/10 dark:bg-accent-500/20 blur-[80px] rounded-full pointer-events-none"></div>
 <div className="relative z-10">
 <div className="w-16 h-16 bg-white dark:bg-slate-900 text-accent-600 dark:text-accent-400 rounded-[1.8rem] flex items-center justify-center mx-auto mb-3 shadow-xl border-4 border-white dark:border-slate-800">
 {user.email ? (
 <span className="text-2xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-br from-accent-500 to-indigo-600">
 {user.email.charAt(0)}
 </span>
 ) : (
 <User size={28} />
 )}
 </div>
 <h2 className="text-base font-black dark:text-white mb-0.5">
 
 {t('auto.twój_profil', { defaultValue: i18n.t('auto.twoj_profil', { defaultValue: "Twój Profil" }) })}
 </h2>
 <p className="text-slate-400 text-[9px] font-bold mb-3 truncate max-w-[180px] mx-auto opacity-70">
 {user.email || i18n.t('auto.uzytkownik_anonimowy', { defaultValue: i18n.t('auto.uzytkownik_anonimowy', { defaultValue: "Użytkownik Anonimowy" }) })}
 </p>
 <div className="flex gap-2 justify-center">
 <button
 onClick={() => {
 Haptics.medium();
 handleLogout();
 }}
 className="group relative bg-white dark:bg-slate-800 text-rose-500 font-black text-[8px] px-5 py-2.5 rounded-lg uppercase tracking-[0.2em] shadow-md hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-500/20 overflow-hidden"
 >
 <span className="relative z-10 flex items-center gap-1">
 <LogOut size={10} /> {t('auto.wyloguj', { defaultValue: 'Wyloguj' })}
 </span>
 </button>
 </div>
 </div>
 </div>
 <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] p-6 space-y-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-rose-500 text-white rounded-2xl shadow-lg">
 <Trash size={18} />
 </div>
 <div>
 <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.1em]">
 
 {t('auto.strefa_niebezpieczeństwa', { defaultValue: i18n.t('auto.strefa_niebezpieczenstwa', { defaultValue: "Strefa Niebezpieczeństwa" }) })}
 </h4>
 <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
 
 {t('auto.nieodwracalne_usunięcie_konta_i_wsz', { defaultValue: i18n.t('auto.nieodwracalne_usuniecie_k', { defaultValue: "Nieodwracalne usunięcie konta i wszystkich pomiarów" }) })}
 </p>
 </div>
 </div>
 <button
 onClick={nukeAllData}
 disabled={nukeLoading}
 className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
 >
 {nukeLoading ? (
 <Loader2 className="animate-spin" size={14} />
 ) : (
 <LogOut size={16} />
 )}
 
 {t('auto.usuń_konto_i_dane', { defaultValue: i18n.t('auto.usun_konto_i_dane', { defaultValue: "Usuń Konto i Dane" }) })}
 </button>
 </div>
 </motion.div>
 )}
 {activeCategory === "pairing" && (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="pb-20 space-y-4"
 >
 <DevicePairing 
 
 settings={settings}
 wsDevices={wsDevices}
 kickDevice={kickDevice}
 onImport={(s) => {
 setSettings((prev) => ({ ...prev, ...s }));
 setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "settings",
 ),
 { ...settings, ...s, updatedAt: serverTimestamp() },
 { merge: true },
 );
 }}
 onUpdateSettings={(partial) => {
 const newSettings = { ...settings, ...partial };
 setSettings(newSettings);
 setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "settings",
 ),
 { ...newSettings, updatedAt: serverTimestamp() },
 { merge: true },
 );
 }}
 />
 <RemoteAlertSender />
 </motion.div>
 )}
 {/* Shop Tab Content Padding */}
 {activeCategory === "shop" && (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-4 pb-20"
 >
 {/* Balance Card */}
 <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
 <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 opacity-20 rotate-12" />
 <div className="relative z-10 text-left">
 <div className="flex items-center justify-between mb-2">
 {editingName ? (
 <div className="flex items-center gap-2 bg-white/20 p-2 rounded-2xl backdrop-blur-md">
 <input
 value={newName}
 onChange={(e) => setNewName(e.target.value)}
 className="bg-transparent border-b border-white outline-none w-32 font-black text-sm"
 autoFocus
 />
 <button
 onClick={updatePetName}
 className="p-1 hover:bg-white/20 rounded-lg"
 >
 <Check size={16} />
 </button>
 <button
 onClick={() => setEditingName(false)}
 className="p-1 hover:bg-white/20 rounded-lg"
 >
 <X size={16} />
 </button>
 </div>
 ) : (
 <div
 className="flex items-center gap-2 group cursor-pointer"
 onClick={() => {
 setNewName(petData.name);
 setEditingName(true);
 }}
 >
 <h2 className="text-2xl font-black">{petData.name}</h2>
 <Zap
 size={16}
 className="opacity-0 group-hover:opacity-100 transition-opacity"
 />
 </div>
 )}
 <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
 
 {t('auto.twój_portfel', { defaultValue: i18n.t('auto.twoj_portfel', { defaultValue: "Twój portfel" }) })}
 </p>
 </div>
 <div className="flex items-end gap-2">
 <h3 className="text-4xl font-black">{petData.coins}</h3>
 <span className="text-xl font-bold mb-1 opacity-90">{t('auto.monet', { defaultValue: 'monet' })}</span>
 </div>
 <div className="mt-4 flex flex-wrap gap-2">
 <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 flex items-center gap-2">
 <Trophy size={16} className="text-amber-200" />
 <span className="text-xs font-bold">
 
 {t('auto.lvl', { defaultValue: 'Lvl:' })} {petData.level}
 </span>
 </div>
 </div>
 </div>
 </div>
 {/* Shop Tabs */}
 <div
 className={cn(
 "rounded-[2.5rem] p-6 border",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl">
 {["skins", "accessories", "backgrounds"].map((t) => (
 <button
 key={t}
 onClick={() => {
 Haptics.selection();
 setShopTab(t as any);
 }}
 className={cn(
 "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
 shopTab === t
 ? "bg-white dark:bg-slate-700 text-accent-600 shadow-sm"
 : "text-slate-500 dark:text-slate-400",
 )}
 >
 {t === "skins"
 ? i18n.t('auto.skorki', { defaultValue: i18n.t('auto.skorki', { defaultValue: "Skórki" }) })
 : t === "accessories"
 ? "Dodatki"
 : i18n.t('auto.tla', { defaultValue: i18n.t('auto.tla', { defaultValue: "Tła" }) })}
 </button>
 ))}
 </div>
 {shopTab === "skins" && (
 <div className="grid grid-cols-2 gap-4">
 {SKINS.map((skin) => {
 const isUnlocked = petData.unlockedSkins.includes(skin.id);
 const isEquipped = petData.skin === skin.id;
 return (
 <div
 key={skin.id}
 className={cn(
 "p-4 rounded-[2rem] border-2 transition-all relative",
 isEquipped
 ? "bg-accent-50/50 dark:bg-accent-500/5 border-accent-500"
 : "bg-slate-50 dark:bg-slate-800/50 border-transparent",
 )}
 >
 <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-3xl mx-auto mb-3 shadow-sm overflow-hidden">
 {skin.imageUrl ? (
 <img
 src={skin.imageUrl}
 className="w-10 h-10 object-contain"
 onError={(e) => {
 (e.target as HTMLImageElement).style.display =
 "none";
 const p = (e.target as HTMLElement).parentElement;
 if (p && !p.querySelector(".fallback-icon")) {
 const s = document.createElement("span");
 s.className = "fallback-icon";
 s.innerText = skin.icon;
 p.appendChild(s);
 }
 }}
 />
 ) : (
 skin.icon
 )}
 </div>
 <h4 className="text-[10px] font-black dark:text-white mb-3 capitalize">
 {skin.name}
 </h4>
 {isUnlocked ? (
 <button
 onClick={() => handleEquipSkin(skin.id)}
 disabled={isEquipped}
 className={cn(
 "w-full py-2 rounded-2xl text-[9px] font-black uppercase",
 isEquipped
 ? "bg-accent-100 dark:bg-accent-950 text-accent-600"
 : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950",
 )}
 >
 {isEquipped ? i18n.t('auto.uzywasz', { defaultValue: i18n.t('auto.uzywasz', { defaultValue: "Używasz" }) }) : "Wybierz"}
 </button>
 ) : (
 <button
 onClick={() => handleBuySkin(skin)}
 disabled={petData.coins < skin.price}
 className={cn(
 "w-full py-2 rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-1",
 petData.coins >= skin.price
 ? "bg-amber-500 text-white"
 : "bg-slate-200 dark:bg-slate-700 text-slate-400",
 )}
 >
 <Coins size={10} /> {skin.price || "FREE"}
 </button>
 )}
 </div>
 );
 })}
 </div>
 )}
 {shopTab === "accessories" && (
 <div className="grid grid-cols-2 gap-4">
 {ACCESSORIES.map((acc) => {
 const isUnlocked = (
 petData.unlockedAccessories || ["none"]
 ).includes(acc.id);
 const isEquipped = petData.currentAccessory === acc.id;
 return (
 <div
 key={acc.id}
 className={cn(
 "p-4 rounded-[2rem] border-2 transition-all relative",
 isEquipped
 ? "bg-accent-50/50 dark:bg-accent-500/5 border-accent-500"
 : "bg-slate-50 dark:bg-slate-800/50 border-transparent",
 )}
 >
 <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-3xl mx-auto mb-3 shadow-sm overflow-hidden">
 {acc.imageUrl ? (
 <img
 src={acc.imageUrl}
 className="w-10 h-10 object-contain"
 onError={(e) => {
 (e.target as HTMLImageElement).style.display =
 "none";
 const p = (e.target as HTMLElement).parentElement;
 if (p && !p.querySelector(".fallback-icon")) {
 const s = document.createElement("span");
 s.className = "fallback-icon";
 s.innerText = acc.icon;
 p.appendChild(s);
 }
 }}
 />
 ) : (
 acc.icon
 )}
 </div>
 <h4 className="text-[10px] font-black dark:text-white mb-3 capitalize">
 {acc.name}
 </h4>
 {isUnlocked ? (
 <button
 onClick={() => handleEquipAccessory(acc.id)}
 disabled={isEquipped}
 className={cn(
 "w-full py-2 rounded-2xl text-[9px] font-black uppercase",
 isEquipped
 ? "bg-accent-100 dark:bg-accent-950 text-accent-600"
 : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950",
 )}
 >
 {isEquipped ? "Nosisz" : i18n.t('auto.zaloz', { defaultValue: i18n.t('auto.zaloz', { defaultValue: "Załóż" }) })}
 </button>
 ) : (
 <button
 onClick={() => handleBuyAccessory(acc)}
 disabled={petData.coins < acc.price}
 className={cn(
 "w-full py-2 rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-1",
 petData.coins >= acc.price
 ? "bg-amber-500 text-white"
 : "bg-slate-200 dark:bg-slate-700 text-slate-400",
 )}
 >
 <Coins size={10} /> {acc.price}
 </button>
 )}
 </div>
 );
 })}
 </div>
 )}
 {shopTab === "backgrounds" && (
 <div className="grid grid-cols-2 gap-4">
 {BACKGROUNDS.map((bg) => {
 const isUnlocked = (
 petData.unlockedBackgrounds || ["room"]
 ).includes(bg.id);
 const isEquipped = petData.currentBackground === bg.id;
 return (
 <div
 key={bg.id}
 className={cn(
 "p-4 rounded-[2rem] border-2 transition-all relative",
 isEquipped
 ? "bg-accent-50/50 dark:bg-accent-500/5 border-accent-500"
 : "bg-slate-50 dark:bg-slate-800/50 border-transparent",
 )}
 >
 <div
 className={cn(
 "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-3xl mx-auto mb-3 shadow-sm border border-white/20",
 bg.gradient,
 )}
 >
 {bg.icon}
 </div>
 <h4 className="text-[10px] font-black dark:text-white mb-3 capitalize">
 {bg.name}
 </h4>
 {isUnlocked ? (
 <button
 onClick={() => handleEquipBackground(bg.id)}
 disabled={isEquipped}
 className={cn(
 "w-full py-2 rounded-2xl text-[9px] font-black uppercase",
 isEquipped
 ? "bg-accent-100 dark:bg-accent-950 text-accent-600"
 : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950",
 )}
 >
 {isEquipped ? "Ustawione" : "Ustaw"}
 </button>
 ) : (
 <button
 onClick={() => handleBuyBackground(bg)}
 disabled={petData.coins < bg.price}
 className={cn(
 "w-full py-2 rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-1",
 petData.coins >= bg.price
 ? "bg-amber-500 text-white"
 : "bg-slate-200 dark:bg-slate-700 text-slate-400",
 )}
 >
 <Coins size={10} /> {bg.price}
 </button>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 <div
 className={cn(
 "rounded-[2.5rem] p-6 border",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex items-center gap-3 mb-4">
 <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600">
 <Star size={20} />
 </div>
 <div className="text-left">
 <h4 className="text-sm font-black dark:text-white">
 
 {t('auto.jak_zdobywać_monety', { defaultValue: i18n.t('auto.jak_zdobywac_monety', { defaultValue: "Jak zdobywać monety?" }) })}
 </h4>
 <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
 
 {t('auto.każdy_wpis_w_dzienniku_zasila_twój_', { defaultValue: i18n.t('auto.kazdy_wpis_w_dzienniku_za', { defaultValue: "Każdy wpis w dzienniku zasila Twój portfel!" }) })}
 </p>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3 text-left">
 {[
 { label: i18n.t('auto.glikemia', { defaultValue: 'Glikemia' }), val: "+5" },
 { label: i18n.t('auto.posiłek', { defaultValue: i18n.t('auto.posilek', { defaultValue: "Posiłek" }) }), val: "+10" },
 { label: i18n.t('auto.bolus', { defaultValue: 'Bolus' }), val: "+8" },
 { label: i18n.t('auto.aktywność', { defaultValue: i18n.t('auto.aktywnosc', { defaultValue: "Aktywność" }) }), val: "+15" },
 ].map((item) => (
 <div
 key={item.label}
 className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm glass-target"
 >
 <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
 {item.label}
 </span>
 <span className="text-[10px] font-black text-amber-600">
 {item.val}
 </span>
 </div>
 ))}
 </div>
 </div>
 </motion.div>
 )}
 {activeCategory === "therapy" && (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-4 pb-20"
 >
        <TreatmentModeSelector user={user} settings={settings} setSettings={setSettings} />
        {/* Main Therapy Parameters */}
 <div
 className={cn(
 "rounded-[2.5rem] p-6 border shadow-xl space-y-6",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex items-center gap-4 mb-1">
 <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
 <Activity size={20} />
 </div>
 <div className="text-left">
 <h3 className="text-base font-black dark:text-white leading-tight">
 
 {t('auto.cele_i_przeliczniki', { defaultValue: 'Cele i Przeliczniki' })}
 </h3>
 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
 
 {t('auto.kluczowe_parametry_terapii', { defaultValue: 'Kluczowe parametry terapii' })}
 </p>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-4">
 <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
 
 {t('auto.czułość_dieta', { defaultValue: i18n.t('auto.czulosc_dieta', { defaultValue: "Czułość & Dieta" }) })}
 </h4>
 <div className="space-y-3">
 <SettingInput
 disabled={therapyLocked}
 label={t('auto.wrażliwość_isf', { defaultValue: i18n.t('auto.wrazliwosc_isf', { defaultValue: "Wrażliwość (ISF)" }) })}
 value={settings.isf}
 onChange={(v) => setSettings({ ...settings, isf: v })}
 min={10}
 max={300}
 />
 <SettingInput
 disabled={therapyLocked}
 label={t('auto.ratio_ww', { defaultValue: 'Ratio WW' })}
 value={settings.wwRatio}
 onChange={(v) => setSettings({ ...settings, wwRatio: v })}
 min={1}
 max={100}
 />
 <SettingInput
 disabled={therapyLocked}
 label={t('auto.ratio_wbt', { defaultValue: 'Ratio WBT' })}
 value={settings.wbtRatio}
 onChange={(v) => setSettings({ ...settings, wbtRatio: v })}
 min={1}
 max={100}
 />
 </div>
 </div>
 <div className="space-y-4">
 <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
 
 {t('auto.zakresy_docelowe', { defaultValue: 'Zakresy Docelowe' })}
 </h4>
 <div className="space-y-3">
 <SettingInput
 disabled={therapyLocked}
 label={t('auto.cel_dolny_min', { defaultValue: 'Cel Dolny (Min)' })}
 value={settings.targetMin}
 onChange={(v) => setSettings({ ...settings, targetMin: v })}
 min={50}
 max={200}
 />
 <SettingInput
 disabled={therapyLocked}
 label={t('auto.cel_górny_max', { defaultValue: i18n.t('auto.cel_gorny_max', { defaultValue: "Cel Górny (Max)" }) })}
 value={settings.targetMax}
 onChange={(v) => setSettings({ ...settings, targetMax: v })}
 min={100}
 max={300}
 />
 <div
 className={cn(
 "p-4 rounded-3xl border flex flex-col items-center justify-center text-center",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50",
 therapyLocked && "opacity-50 pointer-events-none",
 )}
 >
 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
 
 {t('auto.czas_insuliny_dia', { defaultValue: 'Czas Insuliny (DIA)' })}
 </span>
 <div className="flex items-center gap-3">
 <button
 onClick={() =>
 setSettings({
 ...settings,
 dia: Math.max(2, (settings.dia || 4) - 0.5),
 })
 }
 disabled={therapyLocked}
 className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400 hover:text-accent-500 transition-colors disabled:opacity-50"
 >
 -
 </button>
 <span className="text-xl font-black dark:text-white">
 {settings.dia || 4}h
 </span>
 <button
 onClick={() =>
 setSettings({
 ...settings,
 dia: Math.min(8, (settings.dia || 4) + 0.5),
 })
 }
 disabled={therapyLocked}
 className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400 hover:text-accent-500 transition-colors disabled:opacity-50"
 >
 +
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 {therapyLocked && (
 <div className="bg-rose-500/10 text-rose-500 dark:text-rose-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold ring-1 ring-rose-500/20">
 <LucideLock size={20} /> {t('auto.urządzenie_główne_zablokowało_możli', { defaultValue: i18n.t('auto.urzadzenie_glowne_zabloko', { defaultValue: "Urządzenie główne zablokowało możliwość edycji tych ustawień." }) })}
 </div>
 )}
 <button
 onClick={() => {
 Haptics.medium();
 saveSettings();
 }}
 disabled={settingsLoading || therapyLocked}
 className="w-full bg-accent-600 hover:bg-accent-500 text-white py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-accent-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
 >
 {settingsLoading ? (
 <Loader2 className="animate-spin" size={18} />
 ) : (
 <CheckCircle2 size={18} />
 )}
 
 {t('auto.zapisz_parametry_terapii', { defaultValue: 'Zapisz parametry terapii' })}
 </button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* TDI Calculator */}
 <div
 className={cn(
 "rounded-[2.5rem] p-6 border shadow-xl space-y-4",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex items-center gap-2.5 mb-1">
 <div className="p-2 bg-amber-500/10 text-amber-500 rounded-2xl">
 <Zap size={18} />
 </div>
 <h3 className="text-[11px] font-black dark:text-white uppercase tracking-tight">
 
 {t('auto.kalkulator_tdi', { defaultValue: 'Kalkulator TDI' })}
 </h3>
 </div>
 <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
 
 {t('auto.dobowa_dawka_insuliny_tdi', { defaultValue: 'Dobowa dawka insuliny (TDI).' })}
 </p>
 <div className="relative mt-4">
 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">
 
 {t('auto.jednostek', { defaultValue: 'jednostek' })}
 </div>
 <input
 type="number"
 placeholder={t('auto.np_45', { defaultValue: 'np. 45' })}
 className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 p-4 pr-20 rounded-[1.5rem] font-black text-sm outline-none dark:text-white focus:ring-2 focus:ring-amber-500/20 shadow-inner hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-800"
 onChange={(e) => {
 const tdi = parseFloat(e.target.value);
 if (tdi > 0) {
 const suggestedIsf = Math.round(1800 / tdi);
 const suggestedWw = Number((500 / tdi).toFixed(1));
 // Update settings with suggested values and provide feedback
 setSettings((prev) => ({
 ...prev,
 isf: suggestedIsf,
 wwRatio: suggestedWw,
 }));
 Haptics.light();
 }
 }}
 />
 </div>
 <p className="text-[8px] text-slate-400 font-bold text-center">
 
 {t('auto.zmiana_tdi_automatycznie_aktualizuj', { defaultValue: 'Zmiana TDI automatycznie aktualizuje ISF i Ratio WW.' })}
 </p>
 </div>
 </div>
 <div
 id="hourly-profiles"
 className={cn(
 "rounded-[2.5rem] p-8 border shadow-xl space-y-6",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex flex-col gap-4 mb-4">
 <button
 onClick={performTherapyAudit}
 disabled={auditLoading}
 className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-between group"
 >
 <div className="flex items-center gap-4">
 <div className="p-3 bg-white/20 rounded-2xl">
 {auditLoading ? (
 <Loader2 className="animate-spin" size={24} />
 ) : (
 <Brain size={24} />
 )}
 </div>
 <div className="text-left">
 <h3 className="text-base font-black uppercase tracking-tight">
 
 {t('auto.ekspercki_audyt_terapii', { defaultValue: 'Ekspercki Audyt Terapii' })}
 </h3>
 <p className="text-[10px] font-bold text-white/80">
 
 {t('auto.analiza_trendów_i_optymalizacja_par', { defaultValue: i18n.t('auto.analiza_trendow_i_optymal', { defaultValue: "Analiza trendów i optymalizacja parametrów (w tym sugerowane profile godzinowe)" }) })}
 </p>
 </div>
 </div>
 <ChevronRight
 size={20}
 className="group-hover:translate-x-1 transition-transform"
 />
 </button>
 {auditResult && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: "auto" }}
 className={cn(
 "p-6 rounded-[2rem] border shadow-inner relative",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700",
 )}
 >
 <button
 onClick={() => setAuditResult(null)}
 className="absolute top-4 right-4 text-slate-400 hover:text-rose-500"
 >
 <X size={16} />
 </button>
 <div className="flex items-center gap-2 mb-4">
 <Sparkles className="text-amber-500" size={16} />
 <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">
 
 {t('auto.raport_glikosense_ai', { defaultValue: 'Raport GlikoSense AI' })}
 </h4>
 </div>
 <div
 className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 prose-strong:font-black prose-strong:text-slate-900 dark:prose-strong:text-white"
 dangerouslySetInnerHTML={{ __html: auditResult }}
 />
 </motion.div>
 )}
 </div>
                  {/* Removed GlikoSense Engine selector - moved to MLAnalysisWidget */}
 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
 
 {t('auto.zaawansowane_profile_godzinowe', { defaultValue: 'Zaawansowane Profile Godzinowe' })}
 </h3>
 <div className="space-y-3">
 {(settings.hourlyProfiles || []).map((hp, idx) => (
 <motion.div
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 key={`fav-profile-${idx}-${hp.time}`}
 className={cn(
 "flex items-center gap-3 p-4 rounded-[2rem] border group hover:shadow-md transition-all",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700",
 )}
 >
 <div className="relative">
 <input
 type="time"
 value={hp.time}
 onChange={(e) => {
 const newProfiles = [
 ...(settings.hourlyProfiles || []),
 ];
 newProfiles[idx].time = e.target.value;
 setSettings({
 ...settings,
 hourlyProfiles: newProfiles,
 });
 }}
 className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-2xl font-black text-xs outline-none dark:text-white"
 />
 </div>
 <div className="flex-1 grid grid-cols-2 gap-2">
 <div className="relative flex flex-col gap-1.5">
 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
 {t('auto.wrazliwosc_isf', { defaultValue: 'Wrażliwość (ISF)' })}
 </span>
 <input
 type="number"
 step="0.1"
 min="10"
 max="300"
 value={hp.isf}
 onChange={(e) => {
 const newProfiles = [
 ...(settings.hourlyProfiles || []),
 ];
 newProfiles[idx].isf = Number(e.target.value);
 setSettings({
 ...settings,
 hourlyProfiles: newProfiles,
 });
 }}
 onBlur={(e) => {
 const newProfiles = [
 ...(settings.hourlyProfiles || []),
 ];
 let val = Number(e.target.value);
 if (isNaN(val)) val = 50;
 if (val < 10) val = 10;
 if (val > 300) val = 300;
 newProfiles[idx].isf = val;
 setSettings({
 ...settings,
 hourlyProfiles: newProfiles,
 });
 }}
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-2xl font-black text-xs text-center dark:text-white"
 />
 </div>
 <div className="relative flex flex-col gap-1.5">
 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
 {t('auto.przelicznik_ww', { defaultValue: 'Przelicznik (WW)' })}
 </span>
 <input
 type="number"
 step="0.1"
 min="1"
 max="100"
 value={hp.wwRatio}
 onChange={(e) => {
 const newProfiles = [
 ...(settings.hourlyProfiles || []),
 ];
 newProfiles[idx].wwRatio = Number(e.target.value);
 setSettings({
 ...settings,
 hourlyProfiles: newProfiles,
 });
 }}
 onBlur={(e) => {
 const newProfiles = [
 ...(settings.hourlyProfiles || []),
 ];
 let val = Number(e.target.value);
 if (isNaN(val)) val = 10;
 if (val < 1) val = 1;
 if (val > 100) val = 100;
 newProfiles[idx].wwRatio = val;
 setSettings({
 ...settings,
 hourlyProfiles: newProfiles,
 });
 }}
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-2xl font-black text-xs text-center dark:text-white"
 />
 </div>
 </div>
 <button
 onClick={() => {
 const newProfiles = (
 settings.hourlyProfiles || []
 ).filter((_, i) => i !== idx);
 setSettings({ ...settings, hourlyProfiles: newProfiles });
 }}
 className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 text-rose-500 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-90 transition-all"
 >
 <Trash size={14} />
 </button>
 </motion.div>
 ))}
 <button
 onClick={() => {
 const newProfiles = [
 ...(settings.hourlyProfiles || []),
 { time: "12:00", isf: 50, wwRatio: 10 },
 ];
 setSettings({
 ...settings,
 hourlyProfiles: newProfiles.sort((a, b) =>
 a.time.localeCompare(b.time),
 ),
 });
 }}
 className="w-full py-4 bg-accent-50 dark:bg-slate-800/50 text-accent-600 dark:text-accent-400 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] border-2 border-dashed border-accent-200 dark:border-slate-700 hover:bg-accent-100 transition-all flex items-center justify-center gap-2"
 >
 <Plus size={16} /> {t('auto.dodaj_przedział_czasowy', { defaultValue: i18n.t('auto.dodaj_przedzial_czasowy', { defaultValue: "Dodaj przedział czasowy" }) })}
 </button>
 </div>
 <button
 onClick={() => {
 Haptics.impact();
 saveSettings();
 }}
 disabled={settingsLoading}
 className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl"
 >
 
 {t('auto.zatwierdź_profile_czasowe', { defaultValue: i18n.t('auto.zatwierdz_profile_czasowe', { defaultValue: "Zatwierdź profile czasowe" }) })}
 </button>
 </div>
 </motion.div>
 )}
 {activeCategory === "notifications" && <ProfileNotifications settings={settings} setSettings={setSettings} />}
 {activeCategory === "devices" && (
        <div className="space-y-4">
        <ProfileInventory user={user} settings={settings} setSettings={setSettings} />

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
 <div
 className={cn(
 "group relative rounded-[2.5rem] p-6 border shadow-xl overflow-hidden",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors"></div>
 <div className="flex items-center gap-3 mb-6 relative z-10">
 <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner">
 <Signal size={22} />
 </div>
 <div>
 <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">
 
 {t('auto.sensor_cgm', { defaultValue: 'Sensor CGM' })}
 </h4>
 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
 
 {t('auto.monitorowanie_glikemii', { defaultValue: 'Monitorowanie glikemii' })}
 </p>
 </div>
 </div>
 <div className="space-y-4 relative z-10">
 <div
 className={cn(
 "p-4 rounded-2xl border",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50",
 )}
 >
 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">
 
 {t('auto.żywotność_sensora_dni', { defaultValue: i18n.t('auto.zywotnosc_sensora_dni', { defaultValue: "Żywotność Sensora (dni)" }) })}
 </label>
 <div className="flex items-center gap-3">
 <input
 type="number"
 min="1"
 max="30"
 value={settings.sensorDurationDays === 0 ? "" : (settings.sensorDurationDays || "")}
 onChange={(e) => {
 const rawVal = e.target.value;
 if (rawVal === "") {
 setSettings({
 ...settings,
 sensorDurationDays: 0,
 });
 } else {
 const val = Number(rawVal);
 setSettings({
 ...settings,
 sensorDurationDays: isNaN(val) ? 0 : val,
 });
 }
 }}
 onBlur={(e) => {
 let val = Number(e.target.value);
 if (isNaN(val) || val < 1) val = 10;
 if (val > 30) val = 30;
 setSettings({
 ...settings,
 sensorDurationDays: val,
 });
 }}
 className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-black text-sm outline-none dark:text-white focus:ring-2 ring-indigo-500/20 transition-all"
 />
 <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400">
 
 {t('auto.dni', { defaultValue: 'DNI' })}
 </div>
 </div>
 </div>
 <div
 className={cn(
 "p-4 rounded-2xl border",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50",
 )}
 >
 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">
 
 {t('auto.data_i_godzina_założenia', { defaultValue: i18n.t('auto.data_i_godzina_zalozenia', { defaultValue: "Data i godzina założenia" }) })}
 </label>
 <div className="relative">
 <Calendar
 size={14}
 className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none"
 />
 <input
 type="datetime-local"
 value={
 settings.sensorChangeDate
 ? new Date(
 settings.sensorChangeDate -
 new Date().getTimezoneOffset() * 60000,
 )
 .toISOString()
 .slice(0, 16)
 : ""
 }
 onChange={(e) => {
 const d = new Date(e.target.value).getTime();
 if (!isNaN(d))
 setSettings({ ...settings, sensorChangeDate: d });
 }}
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3 pl-10 pr-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-indigo-500/20 transition-all"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3 mt-2">
 <button
 onClick={async () => {
 const now = Date.now();
 const currentInv = settings.inventory || [];
 const setIndex = currentInv.findIndex(i => i.category === "sensors" && i.quantity > 0);
 let updatedInv = currentInv;
 if (setIndex !== -1) {
 updatedInv = [...currentInv];
 updatedInv[setIndex] = { ...updatedInv[setIndex], quantity: Math.max(0, updatedInv[setIndex].quantity - 1) };
 }
 const updates = { sensorChangeDate: now, inventory: updatedInv };
 setSettings((prev) => ({ ...prev, ...updates }));
 if (user) {
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 updates,
 { merge: true },
 );
 const sensorLogPayload = {
 type: "sensor_change",
 value: 1,
 timestamp: now,
 createdAt: serverTimestamp(),
 notes: "Wymiana sensora - " + insertionSite,
 source: "system",
 };
 const docRef = await addDoc(
 collection(
 db,
 "users",
 getEffectiveUid(user),
 "logs",
 ),
 sensorLogPayload
 );
 const newLog = { ...sensorLogPayload, id: docRef.id, createdAt: new Date().toISOString() };
 await dbService.saveLog(newLog);
 window.dispatchEvent(new CustomEvent('localLogAdd', { detail: newLog }));
 }
 toast.success(i18n.t('auto.zapisano_wymiane_sensora_na_te', { defaultValue: i18n.t('auto.zapisano_wymiane_sensora', { defaultValue: "Zapisano wymianę sensora na teraz!" }) }));
 }}
 className="bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-2xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 group/btn"
 >
 <Sparkles size={12} className="group-hover:animate-pulse" />
 
 {t('auto.wymiana_teraz', { defaultValue: 'Wymiana teraz' })}
 </button>
 <button
 onClick={async () => {
 let days = settings.sensorDurationDays;
 if (!days || days < 1) days = 10;
 if (days > 30) days = 30;
 const updates = {
 sensorChangeDate: Date.now(),
 sensorDurationDays: days
 };
 setSettings((prev) => ({ ...prev, ...updates }));
 if (user) {
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 updates,
 { merge: true },
 );
 if (updates.sensorChangeDate) {
 const latestSensorLog = logs
 .filter((l) => l.type === "sensor_change")
 .sort((a, b) => b.timestamp - a.timestamp)[0];
 if (latestSensorLog && latestSensorLog.id) {
 await updateDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "logs",
 latestSensorLog.id
 ),
 { timestamp: updates.sensorChangeDate }
 );
 await dbService.saveLog({ ...latestSensorLog, timestamp: updates.sensorChangeDate });
 window.dispatchEvent(new CustomEvent('localLogUpdate', { detail: { id: latestSensorLog.id, updates: { timestamp: updates.sensorChangeDate } } }));
 }
 }
 }
 toast.success(i18n.t('auto.zaktualizowano_date_dni_sensor', { defaultValue: i18n.t('auto.zaktualizowano_date_dni_s', { defaultValue: "Zaktualizowano datę/dni sensora!" }) }));
 }}
 className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-3.5 rounded-2xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all border border-slate-300/50 dark:border-slate-700/50 flex items-center justify-center gap-1.5"
 >
 <Save size={12} />
 
 {t('auto.aktualizuj_dane', { defaultValue: 'Aktualizuj dane' })}
 </button>
 </div>
 </div>
 </div>
 {(!settings.treatmentMode || settings.treatmentMode === 'pump') && (
 <>
 <div
 className={cn(
 "group relative rounded-[2.5rem] p-6 border shadow-xl overflow-hidden",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-teal-500/10 transition-colors"></div>
 <div className="flex items-center gap-3 mb-6 relative z-10">
 <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shadow-inner">
 <Droplets size={22} />
 </div>
 <div>
 <h4 className="text-base font-black dark:text-white uppercase tracking-tight">
 
 {t('auto.zestaw_infuzyjny', { defaultValue: 'Zestaw Infuzyjny' })}
 </h4>
 <p className="text-[10px] font-bold text-teal-600/60 dark:text-teal-400/60 uppercase tracking-[0.2em] mt-1">
 
 {t('auto.wkłucie_i_dreny', { defaultValue: i18n.t('auto.wklucie_i_dreny', { defaultValue: "Wkłucie i dreny" }) })}
 </p>
 </div>
 </div>
 <div className="space-y-4 relative z-10">
 <div
 className={cn(
 "p-4 rounded-2xl border",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50",
 )}
 >
 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">
 
 {t('auto.żywotność_wkłucia_dni', { defaultValue: i18n.t('auto.zywotnosc_wklucia_dni', { defaultValue: "Żywotność Wkłucia (dni)" }) })}
 </label>
 <div className="flex items-center gap-3">
 <input
 type="number"
 min="1"
 max="7"
 value={settings.infusionSetDurationDays === 0 ? "" : (settings.infusionSetDurationDays || "")}
 onChange={(e) => {
 const rawVal = e.target.value;
 if (rawVal === "") {
 setSettings({
 ...settings,
 infusionSetDurationDays: 0,
 });
 } else {
 const val = Number(rawVal);
 setSettings({
 ...settings,
 infusionSetDurationDays: isNaN(val) ? 0 : val,
 });
 }
 }}
 onBlur={(e) => {
 let val = Number(e.target.value);
 if (isNaN(val) || val < 1) val = 3;
 if (val > 7) val = 7;
 setSettings({
 ...settings,
 infusionSetDurationDays: val,
 });
 }}
 className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-black text-sm outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all"
 />
 <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400">
 
 {t('auto.dni', { defaultValue: 'DNI' })}
 </div>
 </div>
 </div>
 <div
 className={cn(
 "p-4 rounded-2xl border",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50",
 )}
 >
 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">
 
 {t('auto.data_i_godzina_założenia', { defaultValue: i18n.t('auto.data_i_godzina_zalozenia', { defaultValue: "Data i godzina założenia" }) })}
 </label>
 <div className="relative">
 <Calendar
 size={14}
 className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500 pointer-events-none"
 />
 <input
 type="datetime-local"
 value={
 settings.infusionSetChangeDate
 ? new Date(
 settings.infusionSetChangeDate -
 new Date().getTimezoneOffset() * 60000,
 )
 .toISOString()
 .slice(0, 16)
 : ""
 }
 onChange={(e) => {
 const d = new Date(e.target.value).getTime();
 if (!isNaN(d))
 setSettings({
 ...settings,
 infusionSetChangeDate: d,
 });
 }}
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3 pl-10 pr-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all"
 />
 </div>
 </div>
 <div
 className={cn(
 "p-4 rounded-2xl border",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50",
 )}
 >
 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">
 
 {t('auto.miejsce_wkłucia', { defaultValue: i18n.t('auto.miejsce_wklucia', { defaultValue: "Miejsce wkłucia" }) })}
 </label>
 <select
 value={insertionSite}
 onChange={(e) => setSettings({...settings, infusionSetSite: e.target.value})}
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all cursor-pointer"
 >
 <option value="Lewy brzuch">{t('auto.lewy_brzuch', { defaultValue: 'Lewy brzuch' })}</option>
 <option value="Prawy brzuch">{t('auto.prawy_brzuch', { defaultValue: 'Prawy brzuch' })}</option>
 <option value="Lewe udo">{t('auto.lewe_udo', { defaultValue: 'Lewe udo' })}</option>
 <option value="Prawe udo">{t('auto.prawe_udo', { defaultValue: 'Prawe udo' })}</option>
 <option value={i18n.t('auto.lewy_posladek', { defaultValue: i18n.t('auto.lewy_posladek', { defaultValue: "Lewy pośladek" }) })}>{t('auto.lewy_pośladek', { defaultValue: i18n.t('auto.lewy_posladek', { defaultValue: "Lewy pośladek" }) })}</option>
 <option value={i18n.t('auto.prawy_posladek', { defaultValue: i18n.t('auto.prawy_posladek', { defaultValue: "Prawy pośladek" }) })}>{t('auto.prawy_pośladek', { defaultValue: i18n.t('auto.prawy_posladek', { defaultValue: "Prawy pośladek" }) })}</option>
 <option value={i18n.t('auto.lewe_ramie', { defaultValue: i18n.t('auto.lewe_ramie', { defaultValue: "Lewe ramię" }) })}>{t('auto.lewe_ramię', { defaultValue: i18n.t('auto.lewe_ramie', { defaultValue: "Lewe ramię" }) })}</option>
 <option value={i18n.t('auto.prawe_ramie', { defaultValue: i18n.t('auto.prawe_ramie', { defaultValue: "Prawe ramię" }) })}>{t('auto.prawe_ramię', { defaultValue: i18n.t('auto.prawe_ramie', { defaultValue: "Prawe ramię" }) })}</option>
 <option value="Inne">{t('auto.inne', { defaultValue: 'Inne' })}</option>
 </select>
 </div>
 <div className="grid grid-cols-2 gap-3 mt-2">
 <button
 onClick={() => setConfirmReservoirModalOpen(true)}
 disabled={isProcessingReplacement}
 className="bg-teal-600 hover:bg-teal-500 text-white p-3.5 rounded-2xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5 group/btn"
 >
 <Sparkles
 size={12}
 className="group-hover:animate-spin transition-all"
 />
 
 {t('auto.wymiana_teraz', { defaultValue: 'Wymiana teraz' })}
 </button>
 {confirmReservoirModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
 <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700 relative">
 <div className="w-16 h-16 bg-teal-100 dark:bg-teal-500/20 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
 <Droplets size={32} />
 </div>
 <h3 className="text-xl font-black text-center mb-2 dark:text-slate-100">
 {t('auto.wymiana_zbiorniczka_tytul', { defaultValue: 'Wymiana zbiorniczka' })}
 </h3>
 <p className="text-center text-slate-500 dark:text-slate-400 mb-6 text-sm font-medium">
 {t('auto.czy_wymieniasz_rowniez_zbiornicze', { defaultValue: 'Czy wymieniasz również zbiorniczek na insulinę?' })}
 </p>
 <div className="flex gap-3">
 <button onClick={() => handleInfusionReplacement(false)} disabled={isProcessingReplacement} className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-600 transition-colors">
 {t('auto.nie', { defaultValue: 'Nie' })}
 </button>
 <button onClick={() => handleInfusionReplacement(true)} disabled={isProcessingReplacement} className="flex-1 py-3.5 rounded-2xl bg-teal-600 text-white font-bold shadow-lg shadow-teal-600/30 hover:bg-teal-500 transition-colors">
 {t('auto.tak', { defaultValue: 'Tak' })}
 </button>
 </div>
 </div>
 </div>
 )}
 <button
 onClick={async () => {
 let days = settings.infusionSetDurationDays;
 if (!days || days < 1) days = 3;
 if (days > 7) days = 7;
 const updates = {
 infusionSetChangeDate: Date.now(),
 infusionSetDurationDays: days,
 infusionSetSite: insertionSite
 };
 setSettings((prev) => ({ ...prev, ...updates }));
 if (user) {
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 updates,
 { merge: true },
 );
 if (updates.infusionSetChangeDate) {
 const sortedSiteLogs = logs
 .filter((l) => l.type === "site_change")
 .sort((a, b) => b.timestamp - a.timestamp);
 const latestSiteLog = sortedSiteLogs[0];
 if (latestSiteLog && latestSiteLog.id) {
 const logsToUpdate = sortedSiteLogs.filter(l => l.timestamp === latestSiteLog.timestamp);
 for (const logToUpdate of logsToUpdate) {
 await updateDoc(
 doc(db, "users", getEffectiveUid(user), "logs", logToUpdate.id),
 { timestamp: updates.infusionSetChangeDate }
 );
 await dbService.saveLog({ ...logToUpdate, timestamp: updates.infusionSetChangeDate });
 window.dispatchEvent(new CustomEvent('localLogUpdate', { detail: { id: logToUpdate.id, updates: { timestamp: updates.infusionSetChangeDate } } }));
 }
 } else {
 const siteLogPayload = {
 type: "site_change",
 value: 1,
 timestamp: updates.infusionSetChangeDate,
 createdAt: serverTimestamp(),
 notes: i18n.t('auto.wymiana_wklucia_var0', { defaultValue: "Wymiana wkłucia - {{var0}}", var0: insertionSite }),
 source: "system",
 };
 const docRef = await addDoc(
 collection(db, "users", getEffectiveUid(user), "logs"),
 siteLogPayload
 );
 const newLog = { ...siteLogPayload, id: docRef.id, createdAt: new Date().toISOString() };
 await dbService.saveLog(newLog);
 window.dispatchEvent(new CustomEvent('localLogAdd', { detail: newLog }));
 }
 }
 }
 toast.success(i18n.t('auto.zaktualizowano_date_dni_wkluci', { defaultValue: i18n.t('auto.zaktualizowano_date_dni_w', { defaultValue: "Zaktualizowano datę/dni wkłucia!" }) }));
 }}
 className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-3.5 rounded-2xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all border border-slate-300/50 dark:border-slate-700/50 flex items-center justify-center gap-1.5"
 >
 <Save size={12} />
 
 {t('auto.aktualizuj_dane', { defaultValue: 'Aktualizuj dane' })}
 </button>
 </div>
 </div>
 </div>
 <div
 className={cn(
 "group relative rounded-[2.5rem] p-6 border shadow-xl overflow-hidden",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors"></div>
 <div className="flex items-center gap-3 mb-6 relative z-10">
 <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-inner">
 <Droplets size={22} />
 </div>
 <div>
 <h4 className="text-base font-black dark:text-white uppercase tracking-tight">
 {t('auto.zbiorniczek_na_insuline', { defaultValue: 'Zbiorniczek na insulinę' })}
 </h4>
 <p className="text-[10px] font-bold text-indigo-600/60 dark:text-indigo-400/60 uppercase tracking-[0.2em] mt-1">
 {t('auto.pojemnik_z_insulina', { defaultValue: 'Pojemnik z insuliną' })}
 </p>
 </div>
 </div>
 <div className="space-y-4 relative z-10">
 <div
 className={cn(
 "p-4 rounded-2xl border",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50",
 )}
 >
 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">
 {t('auto.zywotnosc_zbiorniczka_dni', { defaultValue: 'Żywotność Zbiorniczka (dni)' })}
 </label>
 <div className="flex items-center gap-3">
 <input
 type="number"
 min="1"
 max="7"
 value={settings.reservoirDurationDays === 0 ? "" : (settings.reservoirDurationDays || "")}
 onChange={(e) => {
 const rawVal = e.target.value;
 if (rawVal === "") {
 setSettings({
 ...settings,
 reservoirDurationDays: 0,
 });
 } else {
 const val = Number(rawVal);
 setSettings({
 ...settings,
 reservoirDurationDays: isNaN(val) ? 0 : val,
 });
 }
 }}
 onBlur={(e) => {
 let val = Number(e.target.value);
 if (isNaN(val) || val < 1) val = 3;
 if (val > 7) val = 7;
 setSettings({
 ...settings,
 reservoirDurationDays: val,
 });
 }}
 className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-black text-sm outline-none dark:text-white focus:ring-2 ring-indigo-500/20 transition-all"
 />
 <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400">
 {t('auto.dni', { defaultValue: 'DNI' })}
 </div>
 </div>
 </div>
 <div
 className={cn(
 "p-4 rounded-2xl border",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50",
 )}
 >
 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">
 {t('auto.data_i_godzina_zalozenia_zbiorniczka', { defaultValue: 'Data i godzina założenia' })}
 </label>
 <div className="relative">
 <Calendar
 size={14}
 className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none"
 />
 <input
 type="datetime-local"
 value={
 settings.reservoirChangeDate
 ? new Date(
 settings.reservoirChangeDate -
 new Date().getTimezoneOffset() * 60000,
 )
 .toISOString()
 .slice(0, 16)
 : ""
 }
 onChange={(e) => {
 const d = new Date(e.target.value).getTime();
 if (!isNaN(d))
 setSettings({
 ...settings,
 reservoirChangeDate: d,
 });
 }}
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3 pl-10 pr-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-indigo-500/20 transition-all"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-3 mt-2">
 <button
 onClick={async () => {
 const now = Date.now();
 const currentInv = settings.inventory || [];
 // @ts-ignore
 const setIndex = currentInv.findIndex(i => i.category === "reservoirs" && i.quantity > 0);
 let updatedInv = currentInv;
 if (setIndex !== -1) {
 updatedInv = [...currentInv];
 updatedInv[setIndex] = { ...updatedInv[setIndex], quantity: Math.max(0, updatedInv[setIndex].quantity - 1) };
 }
 const updates = { reservoirChangeDate: now, inventory: updatedInv };
 setSettings((prev) => ({ ...prev, ...updates }));
 if (user) {
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 updates,
 { merge: true },
 );
 await addDoc(
 collection(
 db,
 "users",
 getEffectiveUid(user),
 "logs",
 ),
 {
 type: "site_change", // We reuse site_change, but perhaps add notes
 value: 1,
 timestamp: now,
 createdAt: serverTimestamp(),
 notes: i18n.t('auto.wymiana_zbiorniczka', { defaultValue: "Wymiana zbiorniczka" }),
 source: "system",
 },
 );
 }
 toast.success(
 i18n.t('auto.zapisano_wymiane_zbiorniczka', { defaultValue: "Zapisano wymianę zbiorniczka!" })
 );
 }}
 className="bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-2xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 group/btn"
 >
 <Sparkles
 size={12}
 className="group-hover:animate-spin transition-all"
 />
 {t('auto.wymiana_teraz', { defaultValue: 'Wymiana teraz' })}
 </button>
 <button
 onClick={async () => {
 let days = settings.reservoirDurationDays;
 if (!days || days < 1) days = 3;
 if (days > 7) days = 7;
 const updates = {
 reservoirChangeDate: settings.reservoirChangeDate || Date.now(),
 reservoirDurationDays: days
 };
 setSettings((prev) => ({ ...prev, ...updates }));
 if (user) {
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 updates,
 { merge: true },
 );
 }
 toast.success(i18n.t('auto.zaktualizowano_date_dni_zbiorniczka', { defaultValue: "Zaktualizowano datę/dni zbiorniczka!" }));
 }}
 className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-3.5 rounded-2xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all border border-slate-300/50 dark:border-slate-700/50 flex items-center justify-center gap-1.5"
 >
 <Save size={12} />
 {t('auto.aktualizuj_dane', { defaultValue: 'Aktualizuj dane' })}
 </button>
 </div>
 </div>
 </div>
 </>
 )}
 </div>
 <button
 onClick={saveSettings}
 disabled={settingsLoading}
 className="w-full bg-accent-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-accent-600/20 active:scale-95 transition-all mt-4"
 >
 
 {t('auto.zapisz_wszystkie_ustawienia_osprzęt', { defaultValue: i18n.t('auto.zapisz_wszystkie_ustawien', { defaultValue: "Zapisz Wszystkie Ustawienia Osprzętu" }) })}
 </button>
 </div>
 )}
 {activeCategory === "food" && (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-4 pb-20"
 >
 {/* Nowość: Auto GI Toggle */}
 <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 rounded-[2.5rem] p-6 border border-amber-200/50 dark:border-amber-500/20 shadow-xl backdrop-blur-sm">
 <div className="flex items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
 <Sparkles size={20} />
 </div>
 <div className="text-left">
 <h3 className="text-sm font-black dark:text-white uppercase tracking-tight">
 
 {t('auto.auto_magia_ig_łg_makro_duplikaty', { defaultValue: i18n.t('auto.auto_magia_ig_lg_makro_du', { defaultValue: "Auto-Magia: IG, ŁG, Makro & Duplikaty" }) })}
 </h3>
 <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
 
 {t('auto.automatycznie_sprawdzaj_poprawiaj_w', { defaultValue: i18n.t('auto.automatycznie_sprawdzaj_p', { defaultValue: "Automatycznie sprawdzaj, poprawiaj wartości oraz usuwaj duplikaty produktów." }) })}
 </p>
 </div>
 </div>
 <button
 onClick={() => {
 const val = !settings.autoGIEnabled;
 setSettings({ ...settings, autoGIEnabled: val });
 Haptics.medium();
 if (val)
 toast.success(i18n.t('auto.automatyczne_pobieranie_ig_lg', { defaultValue: i18n.t('auto.automatyczne_pobieranie_i', { defaultValue: "Automatyczne pobieranie IG/ŁG włączone!" }) }));
 }}
 className={cn(
 "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
 settings.autoGIEnabled && "bg-amber-500 pl-5",
 )}
 >
 <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
 </button>
 </div>
 </div>
 <div
 className={cn(
 "rounded-[2.5rem] p-6 border shadow-xl",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex items-center gap-3 mb-4">
 <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl">
 <Utensils size={20} />
 </div>
 <div className="text-left">
 <h3 className="text-base font-black dark:text-white leading-tight">
 
 {t('auto.szybkie_posiłki', { defaultValue: i18n.t('auto.szybkie_posilki', { defaultValue: "Szybkie Posiłki" }) })}
 </h3>
 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
 
 {t('auto.twoje_ulubione_skróty', { defaultValue: i18n.t('auto.twoje_ulubione_skroty', { defaultValue: "Twoje ulubione skróty" }) })}
 </p>
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
 {shortcuts.map((s) => (
 <motion.div
 layout
 key={s.id}
 className={cn(
 "group flex items-center justify-between p-4 rounded-[1.8rem] border hover:shadow-lg transition-all",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset hover:bg-white/10 dark:hover:bg-white/10"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800",
 )}
 >
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-transform group-hover:scale-110 glass-target">
 {s.icon}
 </div>
 <div className="text-left">
 <p className="text-xs font-black dark:text-white">
 {s.name}
 </p>
 <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">
 {s.carbs || 0}{t('auto.g_węgli', { defaultValue: i18n.t('auto.g_wegli', { defaultValue: "g węgli •" }) })} {(s.carbs / 10).toFixed(1)} {t('auto.ww', { defaultValue: 'WW' })}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() =>
 setNewShortcut({
 id: s.id,
 name: s.name,
 icon: s.icon,
 type: s.type || "meal",
 carbs: s.carbs || 0,
 })
 }
 className="p-2 text-slate-400 hover:text-accent-500 transition-colors"
 >
 <Settings size={14} />
 </button>
 <button
 onClick={() => deleteShortcut(s.id)}
 className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
 >
 <Trash size={14} />
 </button>
 </div>
 </motion.div>
 ))}
 <button
 onClick={() =>
 setNewShortcut({
 id: "",
 name: "",
 icon: "🥗",
 type: "meal",
 carbs: 0,
 })
 }
 className="flex items-center justify-center gap-3 p-4 rounded-[1.8rem] border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-accent-500 hover:bg-accent-500/5 text-slate-400 hover:text-accent-500 transition-all font-black text-[10px] uppercase tracking-widest"
 >
 <Plus size={18} /> {t('auto.dodaj_nowy_skrót', { defaultValue: i18n.t('auto.dodaj_nowy_skrot', { defaultValue: "Dodaj nowy skrót" }) })}
 </button>
 </div>
 {newShortcut && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: "auto" }}
 className={cn(
 "p-6 rounded-[2rem] border space-y-4 shadow-inner",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700",
 )}
 >
 <div className="flex items-center justify-between mb-2">
 <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest px-2">
 {newShortcut.id ? i18n.t('auto.edycja_skrotu', { defaultValue: i18n.t('auto.edycja_skrotu', { defaultValue: "Edycja skrótu" }) }) : i18n.t('auto.nowy_skrot', { defaultValue: i18n.t('auto.nowy_skrot', { defaultValue: "Nowy skrót" }) })}
 </h4>
 {newShortcut.id && (
 <button
 onClick={() =>
 setNewShortcut({
 id: "",
 name: "",
 icon: "📌",
 type: "meal",
 carbs: 0,
 })
 }
 className="text-rose-500"
 >
 <X size={16} />
 </button>
 )}
 </div>
 <div className="flex flex-wrap gap-2 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
 {icons.map((icon) => (
 <button
 key={icon}
 onClick={() => setNewShortcut({ ...newShortcut, icon })}
 className={cn(
 "w-10 h-10 flex items-center justify-center rounded-2xl text-xl transition-all",
 newShortcut.icon === icon
 ? "bg-accent-500 shadow-lg scale-110"
 : "hover:bg-slate-100 dark:hover:bg-slate-800",
 )}
 >
 {icon}
 </button>
 ))}
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">
 
 {t('auto.nazwa_posiłku', { defaultValue: i18n.t('auto.nazwa_posilku', { defaultValue: "Nazwa posiłku" }) })}
 </label>
 <input
 type="text"
 placeholder={t('auto.np_szybkie_śniadanie', { defaultValue: i18n.t('auto.np_szybkie_sniadanie', { defaultValue: "np. Szybkie Śniadanie" }) })}
 value={newShortcut.name}
 onChange={(e) =>
 setNewShortcut({ ...newShortcut, name: e.target.value })
 }
 className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 p-4 rounded-[1.5rem] font-bold text-sm outline-none dark:text-white shadow-inner hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-800"
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">
 
 {t('auto.węglowodany_g', { defaultValue: i18n.t('auto.weglowodany_g', { defaultValue: "Węglowodany (g)" }) })}
 </label>
 <div className="relative">
 <input
 type="number"
 placeholder="0"
 value={newShortcut.carbs || ""}
 onChange={(e) =>
 setNewShortcut({
 ...newShortcut,
 carbs: Number(e.target.value),
 })
 }
 className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 p-4 pr-12 rounded-[1.5rem] font-bold text-sm outline-none dark:text-white shadow-inner hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-800"
 />
 <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">
 G
 </span>
 </div>
 </div>
 </div>
 <button
 onClick={saveShortcut}
 className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
 >
 {newShortcut.id ? "Zapisz zmiany" : i18n.t('auto.zatwierdz_i_dodaj', { defaultValue: i18n.t('auto.zatwierdz_i_dodaj', { defaultValue: "Zatwierdź i dodaj" }) })}
 </button>
 </motion.div>
 )}
 </div>
 </motion.div>
 )}
 {activeCategory === "meds" && <ProfileMedications user={user} settings={settings} setSettings={setSettings} />}
 {activeCategory === "simulator" && <React.Suspense fallback={null}><PumpSimulator settings={settings} /></React.Suspense>}
 {activeCategory === "tutorial" && (
 <TutorialView 
 setTab={() => setActiveCategory(null)} 
 onComplete={async (mode) => {
 const newVal = mode as 'diet_only' | 'insulin' | 'pump';
 setSettings((prev) => ({ ...prev, treatmentMode: newVal }));
 localStorage.setItem("treatmentMode", newVal);
 if (user) {
 queryClient.setQueryData(['userSettings', getEffectiveUid(user)], (old: any) => ({
   ...(old || {}),
   treatmentMode: newVal
 }));
 await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"), { treatmentMode: newVal }, { merge: true });
 queryClient.invalidateQueries({ queryKey: ['userSettings'] });
 }
 }}
 />
 )}
 {activeCategory === "training" && (
 <GlikoTraining
 isOpen={true}
 onClose={() => setActiveCategory(null)}
 isGlassmorphic={settings.glassmorphismEnabled}
 
 settings={settings}
 currentSugar={logs.find(l => l.type === 'glucose')?.value || null}
 />
 )}
 {activeCategory === "api" && (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="pb-20 space-y-4"
 >
 <ApiIntegration />
 <div
 className={cn(
 "rounded-[2.5rem] p-6 border shadow-xl space-y-4",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex items-center justify-between mb-1">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-sky-500/10 text-sky-600 rounded-2xl">
 <Globe size={20} />
 </div>
 <div className="text-left">
 <h3 className="text-base font-black dark:text-white leading-tight">
 
 {t('auto.pobieranie_danych', { defaultValue: 'Pobieranie Danych' })}
 </h3>
 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
 
 {t('auto.źródła_glikemii', { defaultValue: i18n.t('auto.zrodla_glikemii', { defaultValue: "Źródła glikemii" }) })}
 </p>
 </div>
 </div>
 <div
 onClick={() => {
 import('../lib/firebase').then(m => m.testConnection());
 toast(t('auto.testowanie_polaczenia_cloud', { defaultValue: 'Testowanie połączenia Cloud...' }), { icon: '☁️' });
 }}
 className={cn(
 "flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border cursor-pointer active:scale-95 transition-transform",
 isFirebaseConnected
 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
 : "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse",
 )}
 title={t('auto.kliknij_by_przetestowac', { defaultValue: 'Kliknij, aby ponowić test połączenia' })}
 >
 <div
 className={cn(
 "w-1.5 h-1.5 rounded-full",
 isFirebaseConnected ? "bg-emerald-500" : "bg-rose-500",
 )}
 />
 
 {t('auto.cloud', { defaultValue: 'Cloud:' })} {isFirebaseConnected ? i18n.t('auto.polaczony', { defaultValue: i18n.t('auto.polaczony', { defaultValue: "Połączony" }) }) : i18n.t('auto.brak_polaczenia', { defaultValue: i18n.t('auto.brak_polaczenia', { defaultValue: "Brak połączenia" }) })}
 </div>
 </div>
 <div className="bg-sky-50 dark:bg-sky-900/10 p-6 rounded-[2rem] border border-sky-100 dark:border-sky-800/50 space-y-3">
 <div className="flex items-center gap-3">
 <Smartphone className="text-sky-500" size={20} />
 <span className="text-xs font-black dark:text-white uppercase tracking-tight">
 
 {t('auto.dexcom_i_libre_link', { defaultValue: 'Dexcom i Libre Link' })}
 </span>
 </div>
 <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
 
 {t('auto.glikocontrol_obsługuje_te_sensory_p', { defaultValue: i18n.t('auto.glikocontrol_obsluguje_te', { defaultValue: "GlikoControl obsługuje te sensory poprzez darmowy mostek" }) })}{" "}
 <b>{t('auto.nightscout', { defaultValue: 'Nightscout' })}</b> {t('auto.np_nightscoutpro_t1pal_po', { defaultValue: "(np. NightscoutPro / T1Pal). Podłącz swoje konto CGM do Nightscouta, a my pobierzemy dane automatycznie co 5 minut." })}
 </p>
 </div>
 <div className="space-y-4">
 <div className="space-y-2">
 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">
 
 {t('auto.adres_serwera_np_nightscout_xdrip', { defaultValue: 'Adres serwera (np. Nightscout / xDrip)' })}
 </label>
 <div className="relative group">
 <Globe
 size={18}
 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-accent-500 transition-colors"
 />
 <input
 type="text"
 placeholder={t('auto.https_tvoja_strona_herokuapp_com', { defaultValue: 'https://tvoja-strona.herokuapp.com' })}
 value={nsUrl}
 onChange={(e) => setNsUrl(e.target.value)}
 onBlur={saveNsUrl}
 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 pl-12 pr-4 rounded-2xl font-bold text-sm outline-none dark:text-white transition-all focus:ring-4 ring-accent-500/10"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">
 
 {t('auto.api_secret_opcjonalnie', { defaultValue: 'API Secret (opcjonalnie)' })}
 </label>
 <div className="relative group">
 <LucideLock
 size={18}
 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-accent-500 transition-colors"
 />
 <input
 type="password"
 placeholder={t('auto.wpisz_klucz_zabezpieczający', { defaultValue: i18n.t('auto.wpisz_klucz_zabezpieczaja', { defaultValue: "Wpisz klucz zabezpieczający" }) })}
 value={nsSecret}
 onChange={(e) => setNsSecret(e.target.value)}
 onBlur={saveNsUrl}
 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 pl-12 pr-4 rounded-2xl font-bold text-sm outline-none dark:text-white transition-all focus:ring-4 ring-accent-500/10"
 />
 </div>
 </div>
 <div
 className={cn(
 "p-4 rounded-2xl border",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
 )}
 >
 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
 <Activity size={12} /> {t('auto.status_synchronizacji', { defaultValue: 'Status synchronizacji' })}
 </p>
 <div className="flex items-center justify-between">
 {saveStatus ? (
 <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
 {saveStatus}
 </span>
 ) : (
 <span className="text-[10px] font-black text-slate-400 uppercase">
 
 {t('auto.czekam_na_zmiany', { defaultValue: 'Czekam na zmiany...' })}
 </span>
 )}
 <button
 onClick={async () => {
 console.log("==== PROFILE: Przycisk Pobierz dane kliknięty! ====", { nsUrl, nsSecret });
 if (!nsUrl) return;
 setNsSyncLoading(true);
 await saveNsUrl();
 const handleResult = (e: any) => {
 window.removeEventListener("nightscout-sync-result", handleResult);
 setNsSyncLoading(false);
 if (e.detail.success) {
 toast.success(t('auto.polaczono_z_nightscout', { defaultValue: 'Połączono z Nightscout pomyślnie!' }));
 } else {
 toast.error(t('auto.blad_polaczenia_z_nightscout', { defaultValue: 'Błąd: Upewnij się, że adres URL jest poprawny.' }));
 }
 };
 window.addEventListener("nightscout-sync-result", handleResult);
 window.dispatchEvent(new CustomEvent("force-nightscout-sync", { detail: { url: nsUrl, secret: nsSecret } }));
 
 // Fallback: Timeout 45s in case worker hangs
 setTimeout(() => {
 window.removeEventListener("nightscout-sync-result", handleResult);
 setNsSyncLoading((prev) => {
 if (prev) {
   setTimeout(() => {
     toast.error(t('auto.timeout_nightscout', { defaultValue: 'Przekroczono czas oczekiwania na połączenie z Nightscout.' }));
   }, 0);
 }
 return false;
 });
 }, 45000);
 }}
 disabled={nsSyncLoading}
 className="flex items-center gap-2 text-[10px] font-black text-accent-500 uppercase tracking-widest hover:text-accent-600 active:scale-95 transition-all"
 >
 <RefreshCw
 size={12}
 className={cn(nsSyncLoading && "animate-spin")}
 />
 
 {t('auto.wymuś_teraz', { defaultValue: i18n.t('auto.wymus_teraz', { defaultValue: "Wymuś teraz" }) })}
 </button>
 </div>
 </div>
 
 {/* Sekcja Diagnostyki Widgetów (Tylko na Androidzie) */}
 {Capacitor.isNativePlatform() && (
 <div
 className={cn(
 "p-4 rounded-2xl border space-y-3",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
 )}
 >
 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
 <Signal size={12} /> {t('auto.diagnostyka_widżetów', { defaultValue: i18n.t('auto.diagnostyka_widzetow', { defaultValue: "Diagnostyka Widżetów" }) })}
 </p>
 
 {widgetDebug ? (
 <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
 <div className="flex justify-between">
 <span>{t('auto.status_widgetu', { defaultValue: 'Status widgetu:' })}</span>
 <span className={cn(
 "font-black uppercase",
 widgetDebug.lastSyncStatus === "SUCCESS" ? "text-emerald-500" :
 widgetDebug.lastSyncStatus === "NO_URL" ? "text-amber-500" : "text-rose-500"
 )}>
 {widgetDebug.lastSyncStatus === "SUCCESS" ? i18n.t('auto.polaczono', { defaultValue: i18n.t('auto.polaczono', { defaultValue: "Połączono" }) }) :
 widgetDebug.lastSyncStatus === "NO_URL" ? "Brak adresu" : i18n.t('auto.blad_polaczenia', { defaultValue: i18n.t('auto.blad_polaczenia', { defaultValue: "Błąd połączenia" }) })}
 </span>
 </div>
 <div className="flex justify-between">
 <span>{t('auto.ostatnia_próba', { defaultValue: i18n.t('auto.ostatnia_proba', { defaultValue: "Ostatnia próba:" }) })}</span>
 <span className="font-bold">{widgetDebug.lastSyncTime}</span>
 </div>
 {widgetDebug.lastUrlUsed && (
 <div className="text-[10px] text-slate-400 break-all select-all text-left">
 
 {t('auto.url', { defaultValue: 'URL:' })} {widgetDebug.lastUrlUsed}
 </div>
 )}
 {widgetDebug.lastSyncCode !== 0 && (
 <div className="flex justify-between">
 <span>{t('auto.kod_http', { defaultValue: 'Kod HTTP:' })}</span>
 <span className="font-bold">{widgetDebug.lastSyncCode}</span>
 </div>
 )}
 {widgetDebug.lastSyncError && (
 <div className="p-2 mt-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] leading-relaxed break-all text-left">
 
 {t('auto.błąd', { defaultValue: i18n.t('auto.blad', { defaultValue: "Błąd:" }) })} {widgetDebug.lastSyncError}
 </div>
 )}
 </div>
 ) : (
 <p className="text-[10px] text-slate-400 text-left">{t('auto.brak_danych_diagnostycznych_wykonaj', { defaultValue: i18n.t('auto.brak_danych_diagnostyczny', { defaultValue: "Brak danych diagnostycznych. Wykonaj test połączenia." }) })}</p>
 )}
 <div className="flex justify-end pt-1">
 <button
 onClick={async () => {
 setNsSyncLoading(true);
 await saveNsUrl(); // Zapisuje i wywołuje natychmiastową synchronizację widgetu przez wtyczkę
 setTimeout(async () => {
 await fetchWidgetDebug();
 setNsSyncLoading(false);
 toast.success(i18n.t('auto.zakonczono_test_widgetow', { defaultValue: i18n.t('auto.zakonczono_test_widgetow', { defaultValue: "Zakończono test widgetów" }) }), { icon: "⚙️" });
 }, 2500);
 }}
 disabled={nsSyncLoading}
 className="flex items-center gap-2 text-[10px] font-black text-accent-500 uppercase tracking-widest hover:text-accent-600 active:scale-95 transition-all"
 >
 <RefreshCw
 size={12}
 className={cn(nsSyncLoading && "animate-spin")}
 />
 
 {t('auto.testuj_połączenie', { defaultValue: i18n.t('auto.testuj_polaczenie', { defaultValue: "Testuj połączenie" }) })}
 </button>
 </div>
 </div>
 )}
 </div>
 {/* Health Connect Integration Card */}
 {Capacitor.isNativePlatform() && (
 <div
 className={cn(
 "rounded-[2.5rem] p-6 border shadow-xl space-y-4",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex items-center gap-4">
 <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-500">
 <Activity size={24} />
 </div>
 <div>
 <h3 className="font-black text-sm uppercase tracking-wider dark:text-white leading-none">
 
 {t('auto.google_health_connect', { defaultValue: 'Google Health Connect' })}
 </h3>
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
 
 {t('auto.systemowa_baza_zdrowia', { defaultValue: 'Systemowa Baza Zdrowia' })}
 </p>
 </div>
 </div>
 <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed text-left">
 
 {t('auto.synchronizuj_dane_o_aktywności_krok', { defaultValue: i18n.t('auto.synchronizuj_dane_o_aktyw', { defaultValue: "Synchronizuj dane o aktywności (kroki) oraz wpisy glikemii bezpośrednio z systemową bazą danych Health Connect na swoim telefonie." }) })}
 </p>
 <div className="space-y-4 pt-2">
 {/* Toggle Kroki */}
 <div className="flex items-center justify-between">
 <div className="text-left">
 <p className="text-[10px] font-black uppercase dark:text-white">{t('auto.odczyt_kroków_aktywność', { defaultValue: i18n.t('auto.odczyt_krokow_aktywnosc', { defaultValue: "Odczyt kroków (Aktywność)" }) })}</p>
 <p className="text-[9px] text-slate-400">{t('auto.pobiera_liczbę_kroków_z_ostatnich_2', { defaultValue: i18n.t('auto.pobiera_liczbe_krokow_z_o', { defaultValue: "Pobiera liczbę kroków z ostatnich 24h" }) })}</p>
 </div>
 <button
 onClick={async () => {
 const isSyncSteps = !settings.healthConnectSyncSteps;
 const updated = { ...settings, healthConnectSyncSteps: isSyncSteps };
 setSettings(updated);
 await setDoc(
 doc(db, "users", getEffectiveUid(user), "settings", "profile"),
 { healthConnectSyncSteps: isSyncSteps },
 { merge: true }
 );
 }}
 className={cn(
 "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none",
 settings.healthConnectSyncSteps ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-700"
 )}
 >
 <div
 className={cn(
 "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
 settings.healthConnectSyncSteps ? "translate-x-6" : "translate-x-0"
 )}
 />
 </button>
 </div>
 {/* Toggle Glikemia */}
 <div className="flex items-center justify-between">
 <div className="text-left">
 <p className="text-[10px] font-black uppercase dark:text-white">{t('auto.zapis_glikemii', { defaultValue: 'Zapis glikemii' })}</p>
 <p className="text-[9px] text-slate-400">{t('auto.zapisuje_nowe_odczyty_cukru_w_healt', { defaultValue: 'Zapisuje nowe odczyty cukru w Health Connect' })}</p>
 </div>
 <button
 onClick={async () => {
 const isSyncGlucose = !settings.healthConnectSyncGlucose;
 const updated = { ...settings, healthConnectSyncGlucose: isSyncGlucose };
 setSettings(updated);
 await setDoc(
 doc(db, "users", getEffectiveUid(user), "settings", "profile"),
 { healthConnectSyncGlucose: isSyncGlucose },
 { merge: true }
 );
 }}
 className={cn(
 "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none",
 settings.healthConnectSyncGlucose ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-700"
 )}
 >
 <div
 className={cn(
 "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
 settings.healthConnectSyncGlucose ? "translate-x-6" : "translate-x-0"
 )}
 />
 </button>
 </div>
 </div>
 <button
 onClick={async () => {
 if (!healthService.isAvailable()) {
 toast.error(i18n.t('auto.usluga_health_connect_nie_jest', { defaultValue: i18n.t('auto.usluga_health_connect_nie', { defaultValue: "Usługa Health Connect nie jest obsługiwana na tym urządzeniu lub wtyczka nie została załadowana." }) }));
 return;
 }
 try {
 const granted = await healthService.requestAuthorization();
 if (granted) {
 toast.success(i18n.t('auto.polaczono_pomyslnie_z_health_c', { defaultValue: i18n.t('auto.polaczono_pomyslnie_z_hea', { defaultValue: "Połączono pomyślnie z Health Connect!" }) }));
 } else {
 toast.error(i18n.t('auto.brak_uprawnien_upewnij_sie_ze', { defaultValue: i18n.t('auto.brak_uprawnien_upewnij_si', { defaultValue: "Brak uprawnień. Upewnij się, że zezwoliłeś na dostęp do danych." }) }));
 }
 } catch (e: any) {
 toast.error(i18n.t('auto.blad_polaczenia', { defaultValue: i18n.t('auto.blad_polaczenia', { defaultValue: "Błąd połączenia:" }) }) + e.message);
 }
 }}
 className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-colors"
 >
 
 {t('auto.połącz_i_nadaj_uprawnienia', { defaultValue: i18n.t('auto.polacz_i_nadaj_uprawnieni', { defaultValue: "Połącz i nadaj uprawnienia" }) })}
 </button>
 </div>
 )}
 {/* Kanał Beta OTA */}
 <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
 <div className="flex items-center justify-between mb-2">
 <div className="text-left">
 <p className="text-[10px] font-black uppercase dark:text-white flex items-center gap-1.5">
 <span className="text-pink-500">🧪</span> Program testów Beta
 </p>
 <p className="text-[9px] text-slate-400 mt-1 max-w-[200px] leading-tight">
 {t('auto.otrzymuj_eksperymentalne_aktualiza', { defaultValue: 'Otrzymuj eksperymentalne aktualizacje szybciej. Wymaga restartu aplikacji.' })}
 </p>
 </div>
 <button
 onClick={async () => {
 const isBeta = !settings.betaProgram;
 const updated = { ...settings, betaProgram: isBeta };
 setSettings(updated);
 localStorage.setItem("betaProgramEnabled", String(isBeta));
 await setDoc(
 doc(db, "users", getEffectiveUid(user), "settings", "profile"),
 { betaProgram: isBeta },
 { merge: true }
 );
 }}
 className={cn(
 "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none shrink-0",
 settings.betaProgram ? "bg-pink-500" : "bg-slate-300 dark:bg-slate-700"
 )}
 >
 <div
 className={cn(
 "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
 settings.betaProgram ? "translate-x-6" : "translate-x-0"
 )}
 />
 </button>
 </div>
 </div>
 <CgmImport
 
 onComplete={() =>
 window.dispatchEvent(new CustomEvent("force-nightscout-sync", { detail: { url: nsUrl, secret: nsSecret } }))
 }
 />
 <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-2xl">
 <Zap size={20} />
 </div>
 <div className="text-left">
 <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">
 
 {t('auto.własny_klucz_gemini_ai', { defaultValue: i18n.t('auto.wlasny_klucz_gemini_ai', { defaultValue: "Własny Klucz Gemini AI" }) })}
 </h4>
 <div className="flex items-center gap-2 mt-0.5">
 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
 
 {t('auto.prywatny_mózg_analityczny', { defaultValue: i18n.t('auto.prywatny_mozg_analityczny', { defaultValue: "Prywatny mózg analityczny" }) })}
 </p>
 <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
 <p
 className={cn(
 "text-[9px] font-black uppercase tracking-widest leading-none",
 aiStatus.color,
 )}
 >
 
 {t('auto.status', { defaultValue: 'Status:' })} {aiStatus.label}
 </p>
 </div>
 </div>
 </div>
 <div
 className={cn(
 "p-5 rounded-[1.5rem] border",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/50",
 )}
 >
 <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed font-medium">
 
 {i18n.language.startsWith('pl') ? (
 <>
 Aby uniknąć limitów serwerowych, możesz dodać swój darmowy klucz z{" "}
 <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent-500 font-black hover:underline underline-offset-2 transition-all">Google AI Studio</a>.
 Klucz zostanie zapisany <b>wyłącznie lokalnie</b> w Twojej przeglądarce.
 </>
 ) : (
 <>
 To avoid server limits, you can add your free key from{" "}
 <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent-500 font-black hover:underline underline-offset-2 transition-all">Google AI Studio</a>.
 The key will be saved <b>locally only</b> in your browser.
 </>
 )}
 </p>
 <div className="flex items-start gap-2 mb-4 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
 <AlertTriangle size={14} className="mt-0.5 shrink-0" />
 <p className="text-[10px] font-bold leading-relaxed">
 {i18n.language.startsWith('pl') ? (
 <>
 Ze względów bezpieczeństwa dodawaj swój klucz API <b className="font-black">tylko na własnych, zaufanych urządzeniach</b>. Nie wprowadzaj go na urządzeniach publicznych.
 </>
 ) : (
 <>
 For security reasons, add your API key <b className="font-black">only on your own trusted devices</b>. Do not enter it on public devices.
 </>
 )}
 </p>
 </div>
 <div className="relative group">
 <ShieldCheck
 size={18}
 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-emerald-500 transition-colors"
 />
 <input
 type="password"
 placeholder={t('auto.aizasy', { defaultValue: 'AIzaSy...' })}
 value={geminiApiKey}
 onChange={(e) => {
 const val = e.target.value;
 setGeminiApiKey(val);
 if (val) {
 SecureStoragePlugin.set({ key: "gemini_api_key", value: val.trim() }).catch(()=>{});
 } else {
 SecureStoragePlugin.remove({ key: "gemini_api_key" }).catch(()=>{});
 }
 }}
 onBlur={async () => {
 const val = geminiApiKey.trim();
 setGeminiApiKey(val);
 if (val) {
 try {
 await SecureStoragePlugin.set({ key: "gemini_api_key", value: val });
 setGeminiSaveStatus(i18n.t('auto.zapisano_pomyslnie', { defaultValue: i18n.t('auto.zapisano_pomyslnie', { defaultValue: "Zapisano pomyślnie ✓" }) }));
 } catch(e) {
 setGeminiSaveStatus("Błąd zapisu");
 }
 } else {
 try {
 await SecureStoragePlugin.remove({ key: "gemini_api_key" });
 } catch(e) {}
 setGeminiSaveStatus(i18n.t('auto.usunieto_klucz', { defaultValue: i18n.t('auto.usunieto_klucz', { defaultValue: "Usunięto klucz ✓" }) }));
 }
 setTimeout(() => setGeminiSaveStatus(""), 2000);
 }}
 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-4 pl-12 pr-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
 />
 {geminiSaveStatus && (
 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500 uppercase">
 {geminiSaveStatus}
 </div>
 )}
 </div>
 <div className="flex justify-end gap-2">
 <button
 onClick={testKey}
 disabled={isTestingKey}
 className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all active:scale-95 disabled:opacity-50"
 >
 {isTestingKey ? (
 <RefreshCw size={12} className="animate-spin" />
 ) : (
 <Zap size={12} className="text-amber-500" />
 )}
 
 {t('auto.testuj_połączenie', { defaultValue: i18n.t('auto.testuj_polaczenie', { defaultValue: "Testuj Połączenie" }) })}
 </button>
 </div>
 <details className="mt-4 group bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden text-left shadow-sm">
 <summary className="p-4 cursor-pointer text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex justify-between items-center outline-none select-none list-none [&::-webkit-details-marker]:hidden">
 <span>{i18n.language.startsWith('pl') ? 'Jak uzyskać darmowy klucz API?' : 'How to get a free API key?'}</span>
 <ChevronRight size={16} className="transition-transform group-open:rotate-90 text-slate-400" />
 </summary>
 <div className="px-4 pb-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-3 font-medium">
 {i18n.language.startsWith('pl') ? (
 <p>
 1. Wejdź na stronę <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-indigo-500 font-bold hover:underline">Google AI Studio</a> i zaloguj się swoim kontem Google.<br />
 2. Kliknij niebieski przycisk &quot;Create API key&quot; i wybierz projekt.<br />
 3. Skopiuj wygenerowany ciąg znaków i wklej go w polu powyżej.
 </p>
 ) : (
 <p>
 1. Go to <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="text-indigo-500 font-bold hover:underline">Google AI Studio</a> and log in with your Google account.<br />
 2. Click the blue &quot;Create API key&quot; button and select a project.<br />
 3. Copy the generated string and paste it in the field above.
 </p>
 )}
 </div>
 </details>
 </div>
 </div>
 </div>
 </motion.div>
 )}
 {activeCategory === "diets" && (
 <motion.div
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 className="pb-20"
 >
 <Diets setTab={setTab} settings={settings} />
 </motion.div>
 )}
 {activeCategory === "stats" && (
 <motion.div
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 className="pb-20 space-y-4"
 >
 <StatisticsView settings={settings} />
 </motion.div>
 )}
 {activeCategory === "android" && (
 <motion.div
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 className="pb-20 space-y-4"
 >
 <div
 className={cn(
 "rounded-[2.5rem] p-6 border shadow-xl space-y-4",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex items-center gap-3 mb-4">
 <div className="p-2.5 bg-green-500/10 text-green-600 rounded-2xl">
 <Smartphone size={20} />
 </div>
 <div className="text-left flex-1">
 <div className="flex items-center gap-2">
 <h3 className="text-base font-black dark:text-white leading-tight">
 
 {t('auto.instalacja_android', { defaultValue: 'Instalacja Android' })}
 </h3>
 <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
 
 {t('auto.beta', { defaultValue: 'BETA' })}
 </span>
 </div>
 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
 
 {t('auto.aplikacja_native_wersja', { defaultValue: 'Aplikacja Native • Wersja' })} {CURRENT_VERSION}
 </p>
 </div>
 </div>
 <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
 
 {t('auto.pobierz_najnowszą_wersję_oficjalnej', { defaultValue: i18n.t('auto.pobierz_najnowsza_wersje', { defaultValue: "Pobierz najnowszą wersję oficjalnej aplikacji na system Android (plik .apk), aby uzyskać najlepsze wrażenia, natywne powiadomienia i mniejsze zużycie baterii." }) })}
 </p>
 
 {/* Przycisk pobierania APK - zawsze dostepny niezaleznie od platformy */}
 <a
 href={apkUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-500/30 hover:bg-green-700 transition-colors active:scale-95"
 onClick={(e) => {
 e.preventDefault();
 Haptics.success();
 localStorage.setItem("dismissedApkVersion", apkVersion);
 // Otwórz w systemowej przeglądarce by uniknąć problemów z pobieraniem plików w WebView
 import('@capacitor/browser').then(({ Browser }) => {
 Browser.open({ url: apkUrl }).catch(() => {
 window.open(apkUrl, '_system');
 });
 }).catch(() => window.open(apkUrl, '_system'));
 }}
 >
 <Download size={20} />
 {t('auto.pobierz_apk', { defaultValue: 'Pobierz APK' })} ({apkVersion})
 </a>
 <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-900/30">
 <h4 className="text-xs font-bold text-amber-800 dark:text-amber-500 mb-1">
 
 {t('auto.instrukcja_instalacji_android_pwa', { defaultValue: 'Instrukcja instalacji (Android PWA):' })}
 </h4>
 <ol className="list-decimal pl-4 text-[10px] space-y-1 text-amber-700 dark:text-amber-400/80 mb-3">
 <li>{t('auto.otwórz_tę_stronę_w_przeglądarce', { defaultValue: i18n.t('auto.otworz_te_strone_w_przegl', { defaultValue: "Otwórz tę stronę w przeglądarce" }) })} <b>{t('auto.chrome', { defaultValue: 'Chrome' })}</b>.</li>
 <li>{t('auto.rozwiń_menu_przeglądarki_trzy_kropk', { defaultValue: i18n.t('auto.rozwin_menu_przegladarki', { defaultValue: "Rozwiń menu przeglądarki (trzy kropki prawy górny róg)." }) })}</li>
 <li>{t('auto.wybierz_opcję', { defaultValue: i18n.t('auto.wybierz_opcje', { defaultValue: "Wybierz opcję" }) })} <b>{t('auto.dodaj_do_ekranu_głównego', { defaultValue: i18n.t('auto.dodaj_do_ekranu_glownego', { defaultValue: "Dodaj do ekranu głównego" }) })}</b> {t('auto.lub_zainstaluj_aplikację', { defaultValue: i18n.t('auto.lub_zainstaluj_aplikacje', { defaultValue: "(lub Zainstaluj aplikację)." }) })}</li>
 <li>{t('auto.potwierdź_instalację_aplikacja_pwa_', { defaultValue: i18n.t('auto.potwierdz_instalacje_apli', { defaultValue: "Potwierdź instalację. Aplikacja PWA ma pełne wsparcie offline." }) })}</li>
 </ol>
 <h4 className="text-xs font-bold text-amber-800 dark:text-amber-500 mb-1">
 
 {t('auto.instrukcja_instalacji_ios_pwa', { defaultValue: 'Instrukcja instalacji (iOS PWA):' })}
 </h4>
 <ol className="list-decimal pl-4 text-[10px] space-y-1 text-amber-700 dark:text-amber-400/80 mb-3">
 <li>{t('auto.otwórz_tę_stronę_w_przeglądarce', { defaultValue: i18n.t('auto.otworz_te_strone_w_przegl', { defaultValue: "Otwórz tę stronę w przeglądarce" }) })} <b>{t('auto.safari', { defaultValue: 'Safari' })}</b>.</li>
 <li>{t('auto.wybierz_przycisk_udostępniania_kwad', { defaultValue: i18n.t('auto.wybierz_przycisk_udostepn', { defaultValue: "Wybierz przycisk udostępniania (kwadrat ze strzałką) na dolnym pasku." }) })}</li>
 <li>{t('auto.przewiń_w_dół_i_wybierz_opcję', { defaultValue: i18n.t('auto.przewin_w_dol_i_wybierz_o', { defaultValue: "Przewiń w dół i wybierz opcję" }) })} <b>{t('auto.do_ekranu_początkowego', { defaultValue: i18n.t('auto.do_ekranu_poczatkowego', { defaultValue: "Do ekranu początkowego" }) })}</b>.</li>
 <li>{t('auto.potwierdź_dodanie', { defaultValue: i18n.t('auto.potwierdz_dodanie', { defaultValue: "Potwierdź dodanie." }) })}</li>
 </ol>
 <h4 className="text-xs font-bold text-amber-800 dark:text-amber-500 mb-1">
 
 {t('auto.instrukcja_instalacji_plik_apk', { defaultValue: 'Instrukcja instalacji (Plik .apk):' })}
 </h4>
 <ol className="list-decimal pl-4 text-[10px] space-y-1 text-amber-700 dark:text-amber-400/80">
 <li>{t('auto.pobierz_plik_klikając_przycisk_powy', { defaultValue: i18n.t('auto.pobierz_plik_klikajac_prz', { defaultValue: "Pobierz plik klikając przycisk powyżej." }) })}</li>
 <li>
 
 {t('auto.otwórz_pobrany_plik_apk_z_powiadomi', { defaultValue: i18n.t('auto.otworz_pobrany_plik_apk_z', { defaultValue: "Otwórz pobrany plik .apk z powiadomienia lub menedżera plików" }) })}
 </li>
 <li>
 
 {t('auto.jeśli_system_zapyta_zezwól_na_quot_', { defaultValue: i18n.t('auto.jesli_system_zapyta_zezwo', { defaultValue: "Jeśli system zapyta, zezwól na \"Instalację z nieznanych źródeł\"." }) })}
 </li>
 </ol>
 </div>
 
 {/* APK Version History */}
 <div
 className={cn(
 "rounded-[2.5rem] p-8 border shadow-sm opacity-60 hover:opacity-100 transition-opacity",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
 <History size={14} /> {t('auto.aktualizacje_apk', { defaultValue: 'Aktualizacje APK' })}
 </h4>
 <div className="space-y-6">
 {APK_VERSIONS.slice(0, 3).map((v, i) => (
 <div
 key={v.version}
 className={cn(
 "relative pl-6 border-l-2",
 i === 0
 ? "border-accent-500"
 : "border-slate-200 dark:border-slate-800",
 )}
 >
 <div
 className={cn(
 "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 bg-white dark:bg-slate-900",
 i === 0
 ? "border-accent-500"
 : "border-slate-200 dark:border-slate-800",
 )}
 />
 <div className="flex items-center justify-between mb-1">
 <span className="text-xs font-black dark:text-white">
 v{v.version}
 </span>
 <span className="text-[9px] font-bold text-slate-400">
 {v.date}
 </span>
 </div>
 <p className="text-[10px] font-bold text-accent-500 mb-2 truncate">
 {t(v.title, { defaultValue: v.title })}
 </p>
 <ul className="space-y-2">
 {v.changes.map((change: any, idx) => {
 const text = typeof change === 'string' ? change : change.descriptionKey;
 return (
 <li
 key={idx}
 className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed"
 >
 • {t(text, { defaultValue: text })}
 </li>
 )})}
 </ul>
 </div>
 ))}
 </div>
 </div>
 </div>
 </motion.div>
 )}
 {activeCategory === "system" && <ProfileSystem settings={settings} setSettings={setSettings} />}
 {showBarcodeScanner && (
 <BarcodeScannerModal
 onClose={() => setShowBarcodeScanner(false)}
 onScan={handleBarcodeScan}
 />
 )}
 </motion.div>
 );
}
function SettingInput({
 label,
 value,
 onChange,
 step = "0.01",
 min = 0,
 max = 9999,
 disabled = false,
}: {
 label: string;
 value: number;
 onChange: (v: number) => void;
 step?: string;
 min?: number;
 max?: number;
 disabled?: boolean;
}) {
  const formatValue = (v: any) => {
    if (v === undefined || v === null || isNaN(Number(v))) return "";
    return Number.isInteger(Number(v))
      ? Number(v).toString()
      : Number(v).toFixed(2).replace(/\.00$/, "").replace(/(\.[0-9])0$/, "$1");
  };

  const [localValue, setLocalValue] = React.useState(formatValue(value));

  React.useEffect(() => {
    if (value !== undefined && value !== null && !isNaN(value) && parseFloat(localValue) !== value) {
      setLocalValue(formatValue(value));
    }
  }, [value]);

  return (
    <div className="space-y-1.5 flex flex-col items-center">
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      <input
 type="number"
 step={step}
 min={min}
 max={max}
 value={localValue}
 disabled={disabled}
 onChange={(e) => {
 setLocalValue(e.target.value);
 const parsed = parseFloat(e.target.value);
 if (!isNaN(parsed)) {
 onChange(parsed);
 }
 }}
 onBlur={() => {
 let parsed = parseFloat(localValue);
 if (isNaN(parsed)) parsed = 0;
 if (parsed < min) parsed = min;
 if (parsed > max) parsed = max;
 const formatted = Number.isInteger(parsed)
 ? parsed.toString()
 : Number(parsed)
 .toFixed(2)
 .replace(/\.00$/, "")
 .replace(/(\.[0-9])0$/, "$1");
 setLocalValue(formatted);
 onChange(parseFloat(formatted));
 }}
 className={`w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-lg outline-none border border-slate-100 dark:border-slate-700 focus:border-accent-500 transition-all dark:text-white ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
 />
 </div>
 );
}







