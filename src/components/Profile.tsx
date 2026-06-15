import { dbService } from '../services/databaseService';
import { geminiService } from "../services/gemini";
import { Capacitor } from '@capacitor/core';
import { Haptics } from "../lib/haptics";
import { healthService } from "../services/healthService";
import { toast } from "react-hot-toast";
import { getEffectiveUid, cn, isNativeApp } from "../lib/utils";
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
} from "lucide-react";
import { db, auth, onConnectionChange } from "../lib/firebase";
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
import { notificationService } from "../services/notificationService";
import { UserSettings, LogEntry, InventoryItem } from "../types";
import {
  APP_VERSION,
  SKINS,
  PetSkin,
  ACCESSORIES,
  BACKGROUNDS,
  PetAccessory,
  PetBackground,
  MEDICAL_DICTIONARY,
  extractGTIN,
  lookupMedicalDictionary,
} from "../constants";
import { PWA_VERSIONS, APK_VERSIONS, CURRENT_VERSION } from "../constants/versions";

import CgmImport from "./CgmImport";
import DevicePairing from "./DevicePairing";
import RemoteAlertSender from "./RemoteAlertSender";
import BarcodeScannerModal from "./BarcodeScannerModal";
import SettingsTransfer from "./SettingsTransfer";
import LocalSync from "./LocalSync";
import CloudPackageSync from "./CloudPackageSync";
import ApiIntegration from "./ApiIntegration";
import PumpSimulator from "./PumpSimulator";
import { Diets } from "./Diets";
import StatisticsView from "./StatisticsView";
import TutorialView from "./TutorialView";
import GlikoTraining from "./GlikoTraining";

import { ConnectedDevice } from "../hooks/useGlikoServer";
import { useTranslation } from "react-i18next";
import i18n from '../i18n';

interface ProfileProps {
  user: any;
  logs: LogEntry[];
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
  user,
  logs = [],
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
    const { t } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
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

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);
  const [petData, setPetData] = useState<{
    coins: number;
    skin: string;
    unlockedSkins: string[];
    level?: number;
    xp?: number;
    name?: string;
    lastLoginDate?: string;
    currentAccessory?: string;
    unlockedAccessories?: string[];
    currentBackground?: string;
    unlockedBackgrounds?: string[];
  }>({
    coins: 0,
    skin: "default",
    unlockedSkins: ["default"],
    name: i18n.t('auto.gliko', { defaultValue: 'Gliko' }),
    unlockedAccessories: ["none"],
    currentAccessory: "none",
    unlockedBackgrounds: ["room"],
    currentBackground: "room",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [nsSyncLoading, setNsSyncLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [cleaningLoading, setCleaningLoading] = useState(false);
  const [nsUrl, setNsUrl] = useState(() => localStorage.getItem("ns_url_backup") || "");
  const [nsSecret, setNsSecret] = useState("");
  const [shopTab, setShopTab] = useState<
    "skins" | "accessories" | "backgrounds"
  >("skins");
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [geminiApiKey, setGeminiApiKey] = useState(
    () => localStorage.getItem("gemini_api_key") || "",
  );
  const [geminiSaveStatus, setGeminiSaveStatus] = useState("");
  const [isTestingKey, setIsTestingKey] = useState(false);
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

  useEffect(() => {
    if (!user) return;

    const nsSettingsRef = doc(
      db,
      "artifacts",
      "diacontrolapp",
      "users",
      getEffectiveUid(user),
      "settings",
      "nightscout",
    );

    const unsubscribeNs = onSnapshot(
      nsSettingsRef,
      (d) => {
        if (d.exists()) {
          const data = d.data();
          if (data) {
            const firebaseUrl = data.url || "";
            const localUrl = localStorage.getItem("ns_url_backup") || "";
            
            // Only overwrite if Firebase has a value, or if local is empty
            if (firebaseUrl || !localUrl) {
              setNsUrl(firebaseUrl);
              localStorage.setItem("ns_url_backup", firebaseUrl);
            } else if (localUrl && !firebaseUrl) {
              // Firebase is empty but we have a local backup, let's restore it to Firebase
              setDoc(nsSettingsRef, { url: localUrl, secret: data.secret || "" }, { merge: true }).catch(console.error);
            }
            setNsSecret(data.secret || "");
          }
        }
      }
    );
    return () => unsubscribeNs();
  }, [user]);

  const testKey = async () => {
    setIsTestingKey(true);
    try {
      await geminiService.generateContent(i18n.t('auto.test_odpowiedz_tylko_slowem_ok', { defaultValue: i18n.t('auto.test_odpowiedz_tylko_slow', { defaultValue: "Test. Odpowiedz tylko słowem OK." }) }));
      toast.success(i18n.t('auto.klucz_api_dziala_poprawnie', { defaultValue: i18n.t('auto.klucz_api_dziala_poprawni', { defaultValue: "Klucz API działa poprawnie!" }) }));
    } catch (e: any) {
      console.error("API Key Test Failed:", e);
      const msg = e?.message || String(e);
      if (msg.includes("API key not valid")) {
        toast.error(i18n.t('auto.klucz_api_jest_nieprawidlowy', { defaultValue: i18n.t('auto.klucz_api_jest_nieprawidl', { defaultValue: "Klucz API jest nieprawidłowy." }) }));
      } else {
        toast.error(i18n.t('auto.blad_polaczenia_z_ai', { defaultValue: i18n.t('auto.blad_polaczenia_z_ai', { defaultValue: "Błąd połączenia z AI:" }) }) + msg);
      }
    } finally {
      setIsTestingKey(false);
    }
  };

  const [telemetryEnabled, setTelemetryEnabled] = useState(
    () => localStorage.getItem("glikosense_telemetry") === "true",
  );
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [newShortcut, setNewShortcut] = useState({
    id: "",
    name: "",
    icon: "📌",
    type: "meal",
    carbs: 0,
  });
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
          "diets",
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
       const updated = [...currentInv];
       updated[existingItemIndex].quantity += 1;
       setSettings((prev) => ({ ...prev, inventory: updated }));
       
       try {
         await setDoc(
           doc(
             db,
             "artifacts",
             "diacontrolapp",
             "users",
             getEffectiveUid(user),
             "settings",
             "profile"
           ),
           { inventory: updated },
           { merge: true }
         );
         alert(`✅ Rozpoznano: ${updated[existingItemIndex].name}\nAutomatycznie dodano +1 do zapasów!`);
       } catch (e) {
         console.error(e);
       }
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
        sub: "FAQ & Pomoc",
        icon: <HelpCircle size={24} />,
        color: "bg-indigo-500",
      },
      {
        id: "simulator",
        label: i18n.t('auto.symulator', { defaultValue: 'Symulator' }),
        sub: "Bolusa",
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
        sub: "Cele & ISF",
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
        id: "devices",
        label: i18n.t('auto.osprzęt', { defaultValue: i18n.t('auto.osprzet', { defaultValue: "Osprzęt" }) }),
        sub: i18n.t('auto.cgm_wklucia', { defaultValue: i18n.t('auto.cgm_wklucia', { defaultValue: "CGM & Wkłucia" }) }),
        icon: <Signal size={24} />,
        color: "bg-indigo-500",
      },
      {
        id: "diets",
        label: i18n.t('auto.diety', { defaultValue: 'Diety' }),
        sub: "Nawyki",
        icon: <BookOpen size={24} />,
        color: "bg-rose-500",
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
        sub: "Szybkie wpisy",
        icon: <Utensils size={24} />,
        color: "bg-amber-500",
      },
      {
        id: "meds",
        label: i18n.t('auto.leki', { defaultValue: 'Leki' }),
        sub: "Przypomnienia",
        icon: <Pill size={24} />,
        color: "bg-teal-500",
      },
      {
        id: "api",
        label: i18n.t('auto.integracje', { defaultValue: 'Integracje' }),
        sub: "API & Chmura",
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
        ["system", "android", "account", "devices"].includes(c.id)
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
    fetch('https://raw.githubusercontent.com/lukcorp83-glitch/diab/main/version.json?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        if (data.version) setApkVersion(data.version);
        if (data.apkUrl) setApkUrl(data.apkUrl);
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
      const userDocPath = `artifacts/diacontrolapp/users/${uid}`;

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

      await deleteDoc(doc(db, "artifacts/diacontrolapp/users", uid));

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

  const repairGIWithAI = async () => {
    if (cleaning) return;
    setCleaning(true);
    Haptics.medium();
    setCleaningResult(i18n.t('auto.skanowanie_i_audyt_bazy_produk', { defaultValue: i18n.t('auto.skanowanie_i_audyt_bazy_p', { defaultValue: "Skanowanie i audyt bazy produktów (AI)..." }) }));

    try {
      const uid = getEffectiveUid(user);
      const toFix: { id: string; name: string; coll: string; current: any }[] =
        [];
      const seenNames = new Map<string, string>(); // normalized name -> source:id
      const duplicatesToDelete: { id: string; coll: string }[] = [];
      let totalChecked = 0;

      // 1. Skan w produktach społecznościowych - najpierw budujemy bazę wzorcową
      const commRef = collection(
        db,
        "artifacts",
        "diacontrolapp",
        "communityProducts",
      );
      const commSnap = await getDocs(commRef);
      totalChecked += commSnap.docs.length;
      for (const docSnap of commSnap.docs) {
        const data = docSnap.data();
        if (data.name) {
          const normalized = normalizeName(data.name);
          if (!seenNames.has(normalized)) {
            seenNames.set(normalized, `community:${docSnap.id}`);
            toFix.push({
              id: docSnap.id,
              name: data.name,
              coll: "community",
              current: data,
            });
          } else {
            // Jeśli baza społeczności ma duplikaty wewnętrzne, możemy je oznaczyć do usunięcia
            // - system pozwoli na to tylko jeśli użytkownik ma uprawnienia, ale zazwyczaj pomijamy je w audycie
            console.log(i18n.t('auto.zignorowano_duplikat_w_sp', { defaultValue: "Zignorowano duplikat w społeczności: {{var0}}", var0: data.name }));
          }
        }
      }

      // 2. Skan we własnych produktach - usuwamy te, które już są w społeczności lub się powtarzają
      const userRef = collection(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        uid,
        "customProducts",
      );
      const userSnap = await getDocs(userRef);
      totalChecked += userSnap.docs.length;
      for (const docSnap of userSnap.docs) {
        const data = docSnap.data();
        if (data.name) {
          const normalized = normalizeName(data.name);
          // Sprawdzamy czy nazwa już występuje (niezależnie czy w społeczności czy we własnych dodanych wyżej)
          if (seenNames.has(normalized)) {
            duplicatesToDelete.push({ id: docSnap.id, coll: "custom" });
          } else {
            seenNames.set(normalized, `custom:${docSnap.id}`);
            toFix.push({
              id: docSnap.id,
              name: data.name,
              coll: "custom",
              current: data,
            });
          }
        }
      }

      if (duplicatesToDelete.length > 0) {
        setCleaningResult(
          `Znaleziono ${duplicatesToDelete.length} duplikatów. Usuwanie zbędnych wpisów...`,
        );
        for (const dup of duplicatesToDelete) {
          const targetRef = doc(
            db,
            "artifacts",
            "diacontrolapp",
            "users",
            uid,
            "customProducts",
            dup.id,
          );
          try {
            await deleteDoc(targetRef);
          } catch (e) {
            console.error("Delete failed for duplicate", dup.id, e);
          }
          Haptics.light();
        }
      }

      if (toFix.length === 0) {
        setCleaningResult(
          `Przeskanowano ${totalChecked} produktów. Baza jest czysta.`,
        );
        setTimeout(() => setCleaningResult(null), 5000);
        setCleaning(false);
        return;
      }

      setCleaningResult(
        `Audyt AI dla ${toFix.length} produktów... Sprawdzam IG, ŁG oraz makroskładniki.`,
      );

      // Batching 8 at a time for better performance and context window
      for (let i = 0; i < toFix.length; i += 8) {
        const batch = toFix.slice(i, i + 8);
        const batchDetails = batch
          .map(
            (b) =>
              i18n.t('auto.var0_obecnie_ig_var1_lg_v', { defaultValue: "{{var0}} (Obecnie: IG={{var1}}, ŁG={{var2}}, W={{var3}}, B={{var4}}, T={{var5}})", var0: b.name, var1: b.current.gi, var2: b.current.gl, var3: b.current.carbs, var4: b.current.protein, var5: b.current.fat }),
          )
          .join("; ");

        const prompt = i18n.t('auto.jestes_ekspertem_dietetyk', { defaultValue: "Jesteś ekspertem dietetyki. Zweryfikuj i popraw parametry dla 100g następujących produktów: [{{var0}}]. \n        ZADANIA: \n        1. Podaj poprawny Indeks Glikemiczny (IG - 0-100).\n        2. Podaj poprawny Ładunek Glikemiczny (ŁG - dla 100g).\n        3. Sprawdź poprawność makroskładników (Węglowodany, Białka, Tłuszcze w g/100g). Jeśli obecne wartości są błędne (np. 0 carbs dla ryżu), popraw je.\n        \n        Zwróć wynik jako JSON (mapa nazw): \n        {\n          \"nazwa_produktu\": {\n            \"gi\": liczba,\n            \"gl\": liczba,\n            \"carbs\": liczba,\n            \"protein\": liczba,\n            \"fat\": liczba\n          }\n        }. \n        Używaj TYLKO JSON. Wartości muszą być liczbami. Produkty mięsne/tłuste mają IG bliskie 0.", var0: batchDetails });

        try {
          const result = await geminiService.generateContent(prompt);
          const jsonMatch = result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            const mapping = JSON.parse(jsonMatch[0]);
            for (const item of batch) {
              const audit = mapping[item.name];
              if (audit && typeof audit === "object") {
                const targetRef =
                  item.coll === "custom"
                    ? doc(
                        db,
                        "artifacts",
                        "diacontrolapp",
                        "users",
                        uid,
                        "customProducts",
                        item.id,
                      )
                    : doc(
                        db,
                        "artifacts",
                        "diacontrolapp",
                        "communityProducts",
                        item.id,
                      );

                const updates: any = {};
                if (typeof audit.gi === "number") updates.gi = audit.gi;
                if (typeof audit.gl === "number") updates.gl = audit.gl;
                if (typeof audit.carbs === "number")
                  updates.carbs = audit.carbs;
                if (typeof audit.protein === "number")
                  updates.protein = audit.protein;
                if (typeof audit.fat === "number") updates.fat = audit.fat;

                if (Object.keys(updates).length > 0) {
                  await updateDoc(targetRef, updates);
                }
              }
            }
          }
        } catch (e) {
          console.error("AI Audit batch failed", e);
        }

        const progress = Math.min(
          100,
          Math.round(((i + batch.length) / toFix.length) * 100),
        );
        setCleaningResult(
          `Analiza i naprawa: ${progress}% (${i + batch.length}/${toFix.length})...`,
        );
      }

      setCleaningResult(
        `Sukces! Przeanalizowano i zweryfikowano ${toFix.length} produktów.`,
      );
      toast.success(`Zakończono inteligentny audyt ${toFix.length} produktów.`);
      setTimeout(() => setCleaningResult(null), 5000);
    } catch (err) {
      console.error(err);
      setCleaningResult(i18n.t('auto.blad_podczas_inteligentnej_nap', { defaultValue: i18n.t('auto.blad_podczas_inteligentne', { defaultValue: "Błąd podczas inteligentnej naprawy." }) }));
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const petRef = doc(
      db,
      "artifacts",
      "diacontrolapp",
      "users",
      getEffectiveUid(user),
      "pet",
      "status",
    );

    const unsubscribePet = onSnapshot(petRef, (d) => {
      if (d.exists()) {
        const data = d.data();
        setPetData({
          coins: data.coins || 0,
          skin: data.skin || "default",
          unlockedSkins: data.unlockedSkins || ["default"],
          level: data.level || 1,
          xp: data.xp || 0,
          name: data.name || "Gliko",
          lastLoginDate: data.lastLoginDate || "",
          unlockedAccessories: data.unlockedAccessories || ["none"],
          currentAccessory: data.currentAccessory || "none",
          unlockedBackgrounds: data.unlockedBackgrounds || ["room"],
          currentBackground: data.currentBackground || "room",
        });
      }
    });



    const unsubscribeShortcuts = onSnapshot(
      collection(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "shortcuts",
      ),
      (snapshot) => {
        setShortcuts(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
    );
    return () => {
      unsubscribeShortcuts();
      unsubscribePet();
    };
  }, [user]);

  const weeklyStats = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekLogs = logs.filter(
      (l) => new Date(l.timestamp).getTime() > oneWeekAgo,
    );

    const glucoseLogs = weekLogs.filter((l) => l.type === "glucose");
    const mealLogs = weekLogs.filter((l) => l.type === "meal");

    const avgGlucose =
      glucoseLogs.length > 0
        ? Math.round(
            glucoseLogs.reduce((acc, l) => acc + (l.value || 0), 0) /
              glucoseLogs.length,
          )
        : 0;

    const inRange = glucoseLogs.filter(
      (l) => l.value >= 70 && l.value <= 140,
    ).length;
    const tir =
      glucoseLogs.length > 0
        ? Math.round((inRange / glucoseLogs.length) * 100)
        : 0;

    const activeDays = new Set(
      weekLogs.map((l) => new Date(l.timestamp).toLocaleDateString()),
    ).size;

    return {
      avgGlucose,
      tir,
      activeDays,
      totalLogs: weekLogs.length,
      mealCount: mealLogs.length,
    };
  }, [logs]);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(petData.name || "Gliko");

  useEffect(() => {
    if (petData.name) {
      setNewName(petData.name);
    }
  }, [petData.name]);

  const updatePetName = async () => {
    if (!newName.trim()) return;
    try {
      await updateDoc(
        doc(
          db,
          "artifacts",
          "diacontrolapp",
          "users",
          getEffectiveUid(user),
          "pet",
          "status",
        ),
        {
          name: newName.trim(),
        },
      );
      setEditingName(false);
    } catch (e) {
      console.error(e);
    }
  };
  const stats = useMemo(() => {
    const mealLogs = logs.filter((l) => l.type === "meal");
    const glucoseLogs = logs.filter((l) => l.type === "glucose");
    const bolusLogs = logs.filter((l) => l.type === "bolus");

    const datesWithMeals = new Set(
      mealLogs.map((l) => new Date(l.timestamp).toLocaleDateString()),
    );
    const inRange = glucoseLogs.filter(
      (l) => l.value >= 70 && l.value <= 140,
    ).length;
    const tirRatio =
      glucoseLogs.length > 0 ? (inRange / glucoseLogs.length) * 100 : 0;

    const nightReadings = glucoseLogs.filter((l) => {
      const h = new Date(l.timestamp).getHours();
      return h >= 0 && h <= 4;
    }).length;

    return {
      totalMeals: mealLogs.length,
      totalBoluses: bolusLogs.length,
      totalGlucose: glucoseLogs.length,
      daysWithMeals: datesWithMeals.size,
      tirRatio,
      nightReadings,
      isConsistent:
        mealLogs.length > 0 && glucoseLogs.length > 0 && bolusLogs.length > 0,
    };
  }, [logs]);

  const unlockedAchievementIds = useMemo(() => {
    const ids = [];
    if (stats.totalMeals >= 1) ids.push("first_meal");
    if (stats.totalGlucose > 8 && stats.tirRatio >= 65) ids.push("tir_master");
    if (stats.totalGlucose >= 12 && stats.tirRatio >= 80) ids.push("tir_ninja");
    if (stats.nightReadings >= 5) ids.push("night_owl");
    if (stats.isConsistent) ids.push("consistent");
    return ids;
  }, [stats]);

  const lastGlucose = useMemo(() => {
    const glucoseLogs = logs.filter((l) => l.type === "glucose");
    return glucoseLogs.length > 0 ? glucoseLogs[0].value : null;
  }, [logs]);

  const handleBuySkin = async (skin: PetSkin) => {
    if (petData.coins < skin.price) {
      Haptics.error();
      return;
    }
    if (petData.unlockedSkins.includes(skin.id)) return;

    Haptics.impact();
    try {
      const petRef = doc(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "pet",
        "status",
      );
      await updateDoc(petRef, {
        coins: petData.coins - skin.price,
        unlockedSkins: [...petData.unlockedSkins, skin.id],
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
        "artifacts",
        "diacontrolapp",
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

  const handleBuyAccessory = async (acc: PetAccessory) => {
    if (petData.coins < acc.price) return;
    const unlocked = petData.unlockedAccessories || ["none"];
    if (unlocked.includes(acc.id)) return;

    try {
      const petRef = doc(
        db,
        "artifacts",
        "diacontrolapp",
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
        "artifacts",
        "diacontrolapp",
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

  const handleBuyBackground = async (bg: PetBackground) => {
    if (petData.coins < bg.price) return;
    const unlocked = petData.unlockedBackgrounds || ["room"];
    if (unlocked.includes(bg.id)) return;
    if (bg.rewardTir) return;

    try {
      const petRef = doc(
        db,
        "artifacts",
        "diacontrolapp",
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
        "artifacts",
        "diacontrolapp",
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
            "artifacts",
            "diacontrolapp",
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
            "artifacts",
            "diacontrolapp",
            "users",
            getEffectiveUid(user),
            "shortcuts",
          ),
          data,
        );
      }
      setNewShortcut({ id: "", name: "", icon: "📌", type: "meal", carbs: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteShortcut = async (id: string) => {
    try {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          "diacontrolapp",
          "users",
          getEffectiveUid(user),
          "shortcuts",
          id,
        ),
      );
    } catch (e) {
      console.error(e);
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
          "artifacts",
          "diacontrolapp",
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

  const deleteMedication = async (id: string) => {
    if (!user) return;
    try {
      const updatedMeds = (settings.medications || []).filter(
        (m) => m.id !== id,
      );
      const newSettings = { ...settings, medications: updatedMeds };
      setSettings(newSettings);
      await setDoc(
        doc(
          db,
          "artifacts",
          "diacontrolapp",
          "users",
          getEffectiveUid(user),
          "settings",
          "profile",
        ),
        { medications: updatedMeds },
        { merge: true },
      );
    } catch (e) {
      console.error(e);
    }
  };

  const saveInventoryItem = async () => {
    if (!newInventoryItem?.name || !user) return;
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
          "artifacts",
          "diacontrolapp",
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

  const deleteInventoryItem = async (id: string) => {
    if (!user) return;
    try {
      const updatedInventory = (settings.inventory || []).filter(
        (m) => m.id !== id,
      );
      const newSettings = { ...settings, inventory: updatedInventory };
      setSettings(newSettings);
      await setDoc(
        doc(
          db,
          "artifacts",
          "diacontrolapp",
          "users",
          getEffectiveUid(user),
          "settings",
          "profile",
        ),
        { inventory: updatedInventory },
        { merge: true },
      );
    } catch (e) {
      console.error(e);
    }
  };

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
      await setDoc(
        doc(
          db,
          "artifacts",
          "diacontrolapp",
          "users",
          getEffectiveUid(user),
          "settings",
          "profile",
        ),
        targetSettings,
        { merge: true },
      );
      toast(i18n.t('auto.ustawienia_zapisane_pomyslnie', { defaultValue: i18n.t('auto.ustawienia_zapisane_pomys', { defaultValue: "Ustawienia zapisane pomyślnie!" }) }));
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
          "artifacts",
          "diacontrolapp",
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
                    doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user!), "settings", "profile"),
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
                  <Edit2 size={12} />  {t('auto.edytuj', { defaultValue: 'Edytuj' })}
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
                { id: "diets", label: i18n.t('auto.diety', { defaultValue: 'Diety' }), icon: <BookOpen size={14} />, color: "text-rose-500 bg-rose-500/10" },
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
                    <LogOut size={10} />  {t('auto.wyloguj', { defaultValue: 'Wyloguj' })}
                                                        </span>
                </button>
              </div>

              <motion.div
                whileHover={{ y: -1 }}
                className="flex flex-col gap-2 p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[2rem] border border-white/20 dark:border-slate-800/50 mt-6 text-left shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 rounded-lg">
                      <Brain size={12} />
                    </div>
                    
                                                          {t('auto.program_badawczy_glikosense', { defaultValue: 'Program Badawczy GlikoSense' })}
                                                        </h4>
                  <button
                    onClick={() => {
                      const val = !telemetryEnabled;
                      setTelemetryEnabled(val);
                      localStorage.setItem(
                        "glikosense_telemetry",
                        val ? "true" : "false",
                      );
                    }}
                    className={cn(
                      "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                      telemetryEnabled && "bg-purple-500 pl-5",
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-snug font-bold">
                  
                                                    {t('auto.pomóż_społeczności_włącz_anonimowe_', { defaultValue: i18n.t('auto.pomoz_spolecznosci_wlacz', { defaultValue: "Pomóż społeczności. Włącz anonimowe udostępnianie wiedzy wyuczonej przez Twój model AI (GlikoSense)." }) })}
                                                  </p>
              </motion.div>
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
            user={user} 
            settings={settings}
            wsDevices={wsDevices}
            kickDevice={kickDevice}
            onImport={(s) => {
              setSettings((prev) => ({ ...prev, ...s }));
              setDoc(
                doc(
                  db,
                  "artifacts",
                  "diacontrolapp",
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
                  "artifacts",
                  "diacontrolapp",
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
          <RemoteAlertSender user={user} />
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
                  const canUnlockViaAchievement =
                    skin.unlockedBy &&
                    unlockedAchievementIds.includes(skin.unlockedBy);
                  const isAchievementSkin = !!skin.unlockedBy;

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
                          disabled={
                            isAchievementSkin
                              ? !canUnlockViaAchievement
                              : petData.coins < skin.price
                          }
                          className={cn(
                            "w-full py-2 rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-1",
                            (
                              isAchievementSkin
                                ? canUnlockViaAchievement
                                : petData.coins >= skin.price
                            )
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
                  const isReward = !!bg.rewardTir;

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
                          disabled={isReward || petData.coins < bg.price}
                          className={cn(
                            "w-full py-2 rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-1",
                            !isReward && petData.coins >= bg.price
                              ? "bg-amber-500 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-400",
                          )}
                        >
                          {isReward ? (
                            "Cel TIR"
                          ) : (
                            <>
                              <Coins size={10} /> {bg.price}
                            </>
                          )}
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
                <LucideLock size={20} />  {t('auto.urządzenie_główne_zablokowało_możli', { defaultValue: i18n.t('auto.urzadzenie_glowne_zabloko', { defaultValue: "Urządzenie główne zablokowało możliwość edycji tych ustawień." }) })}
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

            {/* Advanced Profiles Preview Card */}
            <div
              onClick={() => {
                /* scroll to next card maybe? */
              }}
              className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-2 bg-white/20 rounded-2xl">
                    <History size={18} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-tight">
                    
                                                          {t('auto.profile_dobowe', { defaultValue: 'Profile dobowe' })}
                                                        </h3>
                </div>
                <p className="text-[9px] text-white/80 leading-snug font-bold">
                  
                                                    {t('auto.ustaw_parametry_dla_pór_dnia', { defaultValue: i18n.t('auto.ustaw_parametry_dla_por_d', { defaultValue: "Ustaw parametry dla pór dnia." }) })}
                                                  </p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border-2 border-indigo-500 bg-white/20"
                    ></div>
                  ))}
                </div>
                <span className="text-[8px] font-black bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest">
                  
                                                    {t('auto.konfiguruj_poniżej', { defaultValue: i18n.t('auto.konfiguruj_ponizej', { defaultValue: "Konfiguruj poniżej" }) })}
                                                  </span>
              </div>
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
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-400 uppercase">
                        
                                                          {t('auto.isf', { defaultValue: 'ISF' })}
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
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pl-8 pr-2 py-2 rounded-2xl font-black text-xs text-center dark:text-white"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-400 uppercase">
                        
                                                          {t('auto.ww', { defaultValue: 'WW' })}
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
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pl-8 pr-2 py-2 rounded-2xl font-black text-xs text-center dark:text-white"
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
                <Plus size={16} />  {t('auto.dodaj_przedział_czasowy', { defaultValue: i18n.t('auto.dodaj_przedzial_czasowy', { defaultValue: "Dodaj przedział czasowy" }) })}
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

      {activeCategory === "devices" && (
        <div className="space-y-4">
          <div className="glass p-6 rounded-[2.5rem] space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
              
                                        {t('auto.kalibracja_cgm', { defaultValue: 'Kalibracja CGM' })}
                                      </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              
                                        {t('auto.jeżeli_odczyty_z_cgm_różnią_się_od_', { defaultValue: i18n.t('auto.jezeli_odczyty_z_cgm_rozn', { defaultValue: "Jeżeli odczyty z CGM różnią się od glukometru, podaj wartość z krwi, a system skoryguje kolejne odczyty (offset kalibracji)." }) })}
                                      </p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">
                  
                                                    {t('auto.wartość_z_glukometru_mg_dl', { defaultValue: i18n.t('auto.wartosc_z_glukometru_mg_d', { defaultValue: "Wartość z Glukometru (mg/dL)" }) })}
                                                  </label>
                <input
                  type="number"
                  min="0"
                  max="600"
                  id="cgmCalibrationInput"
                  placeholder={t('auto.np_110', { defaultValue: 'np. 110' })}
                  onBlur={(e) => {
                    let val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      if (val < 0) val = 0;
                      if (val > 600) val = 600;
                      e.target.value = val.toString();
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 p-4 rounded-[1.5rem] font-bold text-sm outline-none dark:text-white text-center shadow-inner hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-800"
                />
              </div>
              <button
                onClick={async () => {
                  const input = document.getElementById(
                    "cgmCalibrationInput",
                  ) as HTMLInputElement;
                  const glukoValue = parseFloat(input?.value);
                  if (glukoValue > 0) {
                    Haptics.medium();
                    // If we don't have current CGM bg we can't fully compute offset easily without current bg context,
                    // but let's assume user just sets an explicit offset or we calculate it vs last known.
                    // Without last known, we might just prompt. Let's do a simple prompt for now.
                    const currentCgm = prompt(
                      i18n.t('auto.jaka_jest_obecnie_widoczna_war', { defaultValue: i18n.t('auto.jaka_jest_obecnie_widoczn', { defaultValue: "Jaka jest obecnie widoczna wartość na CGM?" }) }),
                    );
                    if (currentCgm) {
                      const offset = glukoValue - parseFloat(currentCgm);
                      const updates = {
                        cgmCalibration: offset,
                        cgmTimestamp: Date.now(),
                      };
                      setSettings((prev) => ({ ...prev, ...updates }));
                      if (user)
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "settings",
                            "profile",
                          ),
                          updates,
                          { merge: true },
                        );
                      alert(
                        `Skalibrowano! Offset wynosi: ${offset > 0 ? "+" : ""}${offset} mg/dL.`,
                      );
                      input.value = "";
                      Haptics.success();
                    }
                  } else {
                    Haptics.error();
                  }
                }}
                className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest mt-4"
              >
                
                                              {t('auto.kalibruj', { defaultValue: 'Kalibruj' })}
                                            </button>
            </div>
            {settings.cgmCalibration ? (
              <div className="text-center">
                <span className="text-[10px] font-bold text-emerald-500">
                  
                                                    {t('auto.aktywny_offset', { defaultValue: 'Aktywny offset:' })} {settings.cgmCalibration > 0 ? "+" : ""}
                  {settings.cgmCalibration}  {t('auto.mg_dl', { defaultValue: 'mg/dL' })}
                                                  </span>
                <button
                  onClick={async () => {
                    const updateObj = { cgmCalibration: 0, cgmTimestamp: 0 };
                    setSettings({ ...settings, ...updateObj });
                    if (user)
                      await setDoc(
                        doc(
                          db,
                          "artifacts",
                          "diacontrolapp",
                          "users",
                          getEffectiveUid(user),
                          "settings",
                          "profile",
                        ),
                        updateObj,
                        { merge: true },
                      );
                  }}
                  className="ml-4 text-[10px] text-rose-500 font-bold uppercase underline"
                >
                  
                                                    {t('auto.anuluj_kalibrację', { defaultValue: i18n.t('auto.anuluj_kalibracje', { defaultValue: "Anuluj Kalibrację" }) })}
                                                  </button>
              </div>
            ) : null}
          </div>

          <div className="glass p-6 rounded-[2.5rem] space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
              
                                        {t('auto.powiadomienia_i_osprzęt', { defaultValue: i18n.t('auto.powiadomienia_i_osprzet', { defaultValue: "Powiadomienia i Osprzęt" }) })}
                                      </h3>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium text-center">
              
                                        {t('auto.ustaw_czasy_życia_dla_twojego_osprz', { defaultValue: i18n.t('auto.ustaw_czasy_zycia_dla_two', { defaultValue: "Ustaw czasy życia dla Twojego osprzętu." }) })}
                                      </p>

            <div className="flex items-center justify-between p-3.5 bg-accent-50 dark:bg-slate-800/50 rounded-2xl border border-accent-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <Bell className="text-accent-500" size={18} />
                <div>
                  <p className="text-xs font-black dark:text-white leading-tight">
                    
                                                          {t('auto.powiadomienia_push', { defaultValue: 'Powiadomienia Push' })}
                                                        </p>
                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                    
                                                          {t('auto.ostrzeżenia_o_wymianie', { defaultValue: i18n.t('auto.ostrzezenia_o_wymianie', { defaultValue: "Ostrzeżenia o wymianie" }) })}
                                                        </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!settings.notificationsEnabled) {
                    if (window.self !== window.top && !Capacitor.isNativePlatform()) {
                      alert(
                        i18n.t('auto.wazne_przegladarki_blokuja_pow', { defaultValue: i18n.t('auto.wazne_przegladarki_blokuj', { defaultValue: "📢 WAŻNE: Przeglądarki blokują powiadomienia PUSH wewnątrz podglądu (iframe).\n\nAby włączyć powiadomienia, kliknij przycisk \"Otwórz w nowej karcie\" (prawy górny róg) i spróbuj tam jesze raz." }) }),
                      );
                      return;
                    }
                    const token = await notificationService.requestPermission();
                    if (token || (Capacitor.isNativePlatform() && token !== null) || (window.Notification && window.Notification.permission === 'granted')) {
                      const prefs = settings.notificationPrefs || {
                        hypo: true,
                        hyper: true,
                        reminders: true,
                        predictions: true,
                      };
                      setSettings({
                        ...settings,
                        notificationsEnabled: true,
                        notificationPrefs: prefs,
                      });
                      localStorage.setItem("notificationsEnabled", "true");
                      if (user) {
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "settings",
                            "profile",
                          ),
                          {
                            notificationsEnabled: true,
                            notificationPrefs: prefs,
                          },
                          { merge: true },
                        );
                      }
                    } else {
                      setSettings({ ...settings, notificationsEnabled: false });
                      localStorage.setItem("notificationsEnabled", "false");
                      if (user) {
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "settings",
                            "profile",
                          ),
                          {
                            notificationsEnabled: false,
                          },
                          { merge: true },
                        );
                      }
                    }
                  } else {
                    setSettings({ ...settings, notificationsEnabled: false });
                    localStorage.setItem("notificationsEnabled", "false");
                    if (user) {
                      await setDoc(
                        doc(
                          db,
                          "artifacts",
                          "diacontrolapp",
                          "users",
                          getEffectiveUid(user),
                          "settings",
                          "profile",
                        ),
                        {
                          notificationsEnabled: false,
                        },
                        { merge: true },
                      );
                    }
                  }
                }}
                className={cn(
                  "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                  settings.notificationsEnabled && "bg-accent-500 pl-5",
                )}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {isNativeApp() && (
              <div className="flex items-center justify-between p-3.5 bg-accent-50 dark:bg-slate-800/50 rounded-2xl border border-accent-100 dark:border-slate-700 mt-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <Bell className="text-accent-500" size={18} />
                  <div>
                    <p className="text-xs font-black dark:text-white leading-tight">
                      
                                                                {t('auto.informacje_na_pasku_powiadomień', { defaultValue: i18n.t('auto.informacje_na_pasku_powia', { defaultValue: "Informacje na pasku powiadomień" }) })}
                                                              </p>
                    <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                      
                                                                {t('auto.powiadomienia_na_systemowym_pasku_a', { defaultValue: 'Powiadomienia na systemowym pasku (APK)' })}
                                                              </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (window.self !== window.top && !Capacitor.isNativePlatform()) {
                      alert(i18n.t('auto.wazne_przegladarki_blokuja_pow', { defaultValue: i18n.t('auto.wazne_przegladarki_blokuj', { defaultValue: "📢 WAŻNE: Przeglądarki blokują powiadomienia wewnątrz podglądu (iframe).\n\nAby włączyć ten widżet, otwórz aplikację w nowej karcie (przycisk w prawym górnym rogu tego okna)." }) }));
                      return;
                    }

                    const currentState = settings.apkSystemNotificationsEnabled ?? true;
                    const targetState = !currentState;

                    if (targetState) {
                      if (Capacitor.isNativePlatform()) {
                        const { PushNotifications } = await import('@capacitor/push-notifications');
                        const result = await PushNotifications.requestPermissions();
                        if (result.receive !== 'granted') {
                          alert(i18n.t('auto.zezwol_na_powiadomienia_w_syst', { defaultValue: i18n.t('auto.zezwol_na_powiadomienia_w', { defaultValue: "Zezwól na powiadomienia w systemie, aby używać tego widżetu." }) }));
                          return;
                        }
                      } else if (window.Notification) {
                        const perm = await window.Notification.requestPermission();
                        if (perm !== 'granted') {
                          alert(i18n.t('auto.zezwol_na_powiadomienia_w_prze', { defaultValue: i18n.t('auto.zezwol_na_powiadomienia_w', { defaultValue: "Zezwól na powiadomienia w przeglądarce, aby używać tego widżetu." }) }));
                          return;
                        }
                      } else {
                        alert(i18n.t('auto.twoja_przegladarka_nie_obslugu', { defaultValue: i18n.t('auto.twoja_przegladarka_nie_ob', { defaultValue: "Twoja przeglądarka nie obsługuje powiadomień." }) }));
                        return;
                      }
                    }

                    setSettings({
                      ...settings,
                      apkSystemNotificationsEnabled: targetState,
                    });
                    localStorage.setItem(
                      "apkSystemNotificationsEnabled",
                      targetState ? "true" : "false",
                    );
                    if (user) {
                      await setDoc(
                        doc(
                          db,
                          "artifacts",
                          "diacontrolapp",
                          "users",
                          getEffectiveUid(user),
                          "settings",
                          "profile",
                        ),
                        {
                          apkSystemNotificationsEnabled: targetState,
                        },
                        { merge: true },
                      );
                    }
                  }}
                  className={cn(
                    "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                    (settings.apkSystemNotificationsEnabled ?? true) &&
                      "bg-accent-500 pl-5",
                  )}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            )}


            <div
              className={cn(
                "space-y-4 transition-all",
                !settings.notificationsEnabled && "opacity-50 grayscale-[0.5]",
              )}
            >
              {!settings.notificationsEnabled && (
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 pl-12">
                  
                                                    {t('auto.włącz_powiadomienia_powyżej_aby_sko', { defaultValue: i18n.t('auto.wlacz_powiadomienia_powyz', { defaultValue: "Włącz powiadomienia powyżej, aby skonfigurować rodzaje alertów." }) })}
                                                  </p>
              )}
              <div className="grid grid-cols-2 gap-3 pl-12">
                {[
                  {
                    id: "hypo",
                    label: i18n.t('auto.niedocukrzenia', { defaultValue: 'Niedocukrzenia' }),
                    icon: <Activity size={14} className="text-rose-500" />,
                  },
                  {
                    id: "hyper",
                    label: i18n.t('auto.przecukrzenia', { defaultValue: 'Przecukrzenia' }),
                    icon: <Activity size={14} className="text-amber-500" />,
                  },
                  {
                    id: "reminders",
                    label: i18n.t('auto.przypomnienia', { defaultValue: 'Przypomnienia' }),
                    icon: <Bell size={14} className="text-blue-500" />,
                  },
                  {
                    id: "predictions",
                    label: i18n.t('auto.przewidywania_ai', { defaultValue: 'Przewidywania AI' }),
                    icon: <Zap size={14} className="text-emerald-500" />,
                  },
                ].map((pref) => {
                  const prefs = settings.notificationPrefs || {
                    hypo: true,
                    hyper: true,
                    reminders: true,
                    predictions: true,
                  };
                  const isActive = prefs[pref.id as keyof typeof prefs];
                  return (
                    <button
                      key={pref.id}
                      disabled={!settings.notificationsEnabled}
                      onClick={async () => {
                        const newPrefs = { ...prefs, [pref.id]: !isActive };
                        setSettings({
                          ...settings,
                          notificationPrefs: newPrefs,
                        });
                        if (user) {
                          await setDoc(
                            doc(
                              db,
                              "artifacts",
                              "diacontrolapp",
                              "users",
                              getEffectiveUid(user),
                              "settings",
                              "profile",
                            ),
                            {
                              notificationPrefs: newPrefs,
                            },
                            { merge: true },
                          );
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-2xl border transition-all text-left",
                        isActive && settings.notificationsEnabled
                          ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-900 border-transparent opacity-60",
                      )}
                    >
                      {pref.icon}
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase tracking-tight",
                          isActive && settings.notificationsEnabled
                            ? "text-slate-700 dark:text-white"
                            : "text-slate-400",
                        )}
                      >
                        {pref.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {settings.notificationsEnabled && (
                <div className="pl-12 mt-6">
                  <p className="text-[10px] font-black text-accent-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Sparkles size={12} className="animate-pulse" />  {t('auto.inteligentne_reguły_glikosense', { defaultValue: i18n.t('auto.inteligentne_reguly_gliko', { defaultValue: "Inteligentne reguły GlikoSense" }) })}
                                                        </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      {
                        id: "nightSnackReminder",
                        label: i18n.t('auto.nocne_przekąski_ostrzeżenia', { defaultValue: i18n.t('auto.nocne_przekaski_ostrzezen', { defaultValue: "Nocne Przekąski (Ostrzeżenia)" }) }),
                        icon: <Moon size={14} className="text-indigo-400" />,
                      }
                    ].map((pref) => {
                      const prefs = settings.notificationPrefs || {
                        hypo: true, hyper: true, reminders: true, predictions: true
                      };
                      const isActive = prefs[pref.id as keyof typeof prefs];
                      return (
                        <button
                          key={pref.id}
                          onClick={async () => {
                            const newPrefs = { ...prefs, [pref.id]: !isActive };
                            setSettings({
                              ...settings,
                              notificationPrefs: newPrefs,
                            });
                            if (user) {
                              await setDoc(
                                doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile"),
                                { notificationPrefs: newPrefs },
                                { merge: true }
                              );
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                            isActive
                              ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 shadow-sm"
                              : "bg-slate-50 dark:bg-slate-900 border-transparent opacity-60"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                            isActive ? "bg-white dark:bg-indigo-500/20 shadow-sm" : "bg-slate-200 dark:bg-slate-800"
                          )}>
                            {pref.icon}
                          </div>
                          <div>
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-tight block",
                                isActive ? "text-indigo-700 dark:text-indigo-300" : "text-slate-400"
                              )}>
                              {pref.label}
                            </span>
                            <span className="text-[8px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                              {isActive ? "GlikoSense czuwa" : i18n.t('auto.regula_wylaczona', { defaultValue: i18n.t('auto.regula_wylaczona', { defaultValue: "Reguła wyłączona" }) })}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

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
                        updatedInv[setIndex].quantity -= 1;
                      }
                      const updates = { sensorChangeDate: now, inventory: updatedInv };
                      setSettings((prev) => ({ ...prev, ...updates }));
                      if (user) {
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
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
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "logs",
                          ),
                          {
                            type: "sensor_change",
                            value: 1,
                            timestamp: now,
                            createdAt: serverTimestamp(),
                            notes: "Wymiana sensora",
                            source: "system",
                          },
                        );
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
                        sensorChangeDate: settings.sensorChangeDate || Date.now(),
                        sensorDurationDays: days
                      };
                      setSettings((prev) => ({ ...prev, ...updates }));
                      if (user) {
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
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
                                "artifacts",
                                "diacontrolapp",
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
                    onClick={async () => {
                      const now = Date.now();
                      const currentInv = settings.inventory || [];
                      const setIndex = currentInv.findIndex(i => i.category === "infusion_sets" && i.quantity > 0);
                      let updatedInv = currentInv;
                      if (setIndex !== -1) {
                        updatedInv = [...currentInv];
                        updatedInv[setIndex].quantity -= 1;
                      }
                      const updates = { infusionSetChangeDate: now, infusionSetSite: insertionSite, inventory: updatedInv };
                      setSettings((prev) => ({ ...prev, ...updates }));
                      if (user) {
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
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
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "logs",
                          ),
                          {
                            type: "site_change",
                            value: 1,
                            timestamp: now,
                            createdAt: serverTimestamp(),
                            notes: i18n.t('auto.wymiana_wklucia_var0', { defaultValue: "Wymiana wkłucia - {{var0}}", var0: insertionSite }),
                            source: "system",
                          },
                        );
                      }
                      toast.success(
                        `Zapisano wymianę wkłucia (${insertionSite})!`,
                      );
                    }}
                    className="bg-teal-600 hover:bg-teal-500 text-white p-3.5 rounded-2xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5 group/btn"
                  >
                    <Sparkles
                      size={12}
                      className="group-hover:animate-spin transition-all"
                    />
                    
                                                          {t('auto.wymiana_teraz', { defaultValue: 'Wymiana teraz' })}
                                                        </button>

                  <button
                    onClick={async () => {
                      let days = settings.infusionSetDurationDays;
                      if (!days || days < 1) days = 3;
                      if (days > 7) days = 7;

                      const updates = {
                        infusionSetChangeDate: settings.infusionSetChangeDate || Date.now(),
                        infusionSetDurationDays: days,
                        infusionSetSite: insertionSite
                      };
                      setSettings((prev) => ({ ...prev, ...updates }));
                      if (user) {
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "settings",
                            "profile",
                          ),
                          updates,
                          { merge: true },
                        );

                        if (updates.infusionSetChangeDate) {
                          const latestSiteLog = logs
                            .filter((l) => l.type === "site_change")
                            .sort((a, b) => b.timestamp - a.timestamp)[0];
                          if (latestSiteLog && latestSiteLog.id) {
                            await updateDoc(
                              doc(
                                db,
                                "artifacts",
                                "diacontrolapp",
                                "users",
                                getEffectiveUid(user),
                                "logs",
                                latestSiteLog.id
                              ),
                              { timestamp: updates.infusionSetChangeDate }
                            );
                              await dbService.saveLog({ ...latestSiteLog, timestamp: updates.infusionSetChangeDate });
                              window.dispatchEvent(new CustomEvent('localLogUpdate', { detail: { id: latestSiteLog.id, updates: { timestamp: updates.infusionSetChangeDate } } }));
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

            <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-500/10 flex flex-col gap-3">
              <button
                onClick={repairGIWithAI}
                disabled={cleaning}
                className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 border border-amber-200/50 font-black text-[9px] uppercase tracking-widest shadow-sm active:scale-95"
              >
                {cleaning ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={12} fill="currentColor" />
                )}
                
                                              {t('auto.start_audytu_ig_łg_i_duplikaty', { defaultValue: i18n.t('auto.start_audytu_ig_lg_i_dupl', { defaultValue: "START AUDYTU: IG, ŁG i DUPLIKATY" }) })}
                                            </button>
              <p className="text-[8px] text-amber-700/60 dark:text-amber-400/40 font-bold px-2 text-center leading-tight">
                
                                              {t('auto.ai_przeanalizuje_twoje_produkty_aby', { defaultValue: i18n.t('auto.ai_przeanalizuje_twoje_pr', { defaultValue: "AI przeanalizuje Twoje produkty, aby zweryfikować Indeks Glikemiczny, Ładunek, makroskładniki oraz usunąć powtarzające się nazwy." }) })}
                                            </p>
            </div>
            {cleaningResult && (
              <p className="mt-2 text-[8px] font-black text-amber-600 dark:text-amber-400 animate-pulse text-center">
                {cleaningResult}
              </p>
            )}
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
                        {s.carbs || 0}{t('auto.g_węgli', { defaultValue: i18n.t('auto.g_wegli', { defaultValue: "g węgli •" }) })} {(s.carbs / 10).toFixed(1)}  {t('auto.ww', { defaultValue: 'WW' })}
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
                <Plus size={18} />  {t('auto.dodaj_nowy_skrót', { defaultValue: i18n.t('auto.dodaj_nowy_skrot', { defaultValue: "Dodaj nowy skrót" }) })}
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

      {activeCategory === "meds" && (
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
                              "artifacts",
                              "diacontrolapp",
                              "users",
                              getEffectiveUid(user),
                              "settings",
                              "profile",
                            ),
                            { medications: updatedMeds },
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
                className="w-full py-5 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-teal-500 hover:bg-teal-500/5 hover:text-teal-600 transition-all flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-[0.2em]"
              >
                <Plus size={20} />  {t('auto.dodaj_nowy_lek', { defaultValue: 'Dodaj nowy lek' })}
                                            </button>
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
                      placeholder={t('auto.np_metformina', { defaultValue: 'np. Metformina' })}
                      value={newMedication.name}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          name: e.target.value,
                        })
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all"
                    />
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
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400",
                        )}
                      >
                        <Box size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm dark:text-white leading-tight">
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          
                                                                {t('auto.kategoria', { defaultValue: 'Kategoria:' })} {item.category}
                        </p>
                        {item.expiryDate && (
                          <p className="text-[9px] font-bold mt-1 uppercase tracking-widest flex items-center gap-1 text-amber-600 dark:text-amber-500">
                            <Calendar size={10} />  {t('auto.data_ważn', { defaultValue: i18n.t('auto.data_wazn', { defaultValue: "Data ważn:" }) })} {item.expiryDate}
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
                          ~{Math.floor(item.quantity / item.dailyDose)}  {t('auto.dni', { defaultValue: 'dni' })}
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
                                "artifacts",
                                "diacontrolapp",
                                "users",
                                getEffectiveUid(user!),
                                "settings",
                                "profile",
                              ),
                              { inventory: updatedInventory },
                              { merge: true },
                            );
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
                              "artifacts",
                              "diacontrolapp",
                              "users",
                              getEffectiveUid(user!),
                              "settings",
                              "profile",
                            ),
                            { inventory: updatedInventory },
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
                    <Plus size={16} />  {t('auto.dodaj_ręcznie', { defaultValue: i18n.t('auto.dodaj_recznie', { defaultValue: "Dodaj ręcznie" }) })}
                                                        </button>
                  <button
                    onClick={() => setShowBarcodeScanner(true)}
                    className="flex-1 py-4 bg-indigo-50 dark:bg-slate-800/50 text-indigo-600 dark:indigo-400 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] border-2 border-dashed border-indigo-200 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={16} />  {t('auto.skanuj_kod', { defaultValue: 'Skanuj Kod' })}
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
                    <div className="space-y-1">
                      <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        
                                                                      {t('auto.kategoria', { defaultValue: 'Kategoria' })}
                                                                    </label>
                      <select
                        value={newInventoryItem.category}
                        onChange={(e) =>
                          setNewInventoryItem({
                            ...newInventoryItem,
                            category: e.target.value as any,
                          })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-rose-500/20 transition-all appearance-none"
                      >
                        <option value="sensors">{t('auto.sensory', { defaultValue: 'Sensory' })}</option>
                        <option value="insulin">{t('auto.insulina', { defaultValue: 'Insulina' })}</option>
                        <option value="infusion_sets">{t('auto.wkłucia', { defaultValue: i18n.t('auto.wklucia', { defaultValue: "Wkłucia" }) })}</option>
                        <option value="strips">{t('auto.paski', { defaultValue: 'Paski' })}</option>
                        <option value="other">{t('auto.inne', { defaultValue: 'Inne' })}</option>
                      </select>
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
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-rose-500/20 transition-all"
                    />
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
                             dailyDose: e.target.value ? Number(e.target.value) : undefined,
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
        </motion.div>
      )}

      {activeCategory === "simulator" && <PumpSimulator settings={settings} />}

      {activeCategory === "tutorial" && (
        <TutorialView setTab={() => setActiveCategory(null)} />
      )}

      {activeCategory === "training" && (
        <GlikoTraining
          isOpen={true}
          onClose={() => setActiveCategory(null)}
          isGlassmorphic={settings.glassmorphismEnabled}
          user={user}
          settings={settings}
          currentSugar={lastGlucose}
        />
      )}

      {activeCategory === "api" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-20 space-y-4"
        >
          <ApiIntegration user={user} />

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
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                  isFirebaseConnected
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse",
                )}
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
                <b>{t('auto.nightscout', { defaultValue: 'Nightscout' })}</b>  {t('auto.np_nightscoutpro_t1pal_podłącz_swoj', { defaultValue: i18n.t('auto.np_nightscoutpro_t1pal_po', { defaultValue: "(np. NightscoutPro / T1Pal). Podłącz swoje konto CGM do Nightscouta, a my pobierzemy dane automatycznie co 5 minut." }) })}
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
                  <Activity size={12} />  {t('auto.status_synchronizacji', { defaultValue: 'Status synchronizacji' })}
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
                      if (!nsUrl) return;
                      setNsSyncLoading(true);
                      await saveNsUrl();
                      window.dispatchEvent(new Event("force-nightscout-sync"));
                      setTimeout(() => setNsSyncLoading(false), 2000);
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
                    <Signal size={12} />  {t('auto.diagnostyka_widżetów', { defaultValue: i18n.t('auto.diagnostyka_widzetow', { defaultValue: "Diagnostyka Widżetów" }) })}
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
                        doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile"),
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
                        doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile"),
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

            <CgmImport
              user={user}
              onComplete={() =>
                window.dispatchEvent(new Event("force-nightscout-sync"))
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
                        geminiService.getAiStatus().color,
                      )}
                    >
                      
                                                                {t('auto.status', { defaultValue: 'Status:' })} {geminiService.getAiStatus().label}
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
                  
                                                    {t('auto.aby_uniknąć_limitów_serwerowych_moż', { defaultValue: i18n.t('auto.aby_uniknac_limitow_serwe', { defaultValue: "Aby uniknąć limitów serwerowych, możesz dodać swój darmowy klucz z" }) })}{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-500 font-black hover:underline underline-offset-2 transition-all"
                  >
                    
                                                          {t('auto.google_ai_studio', { defaultValue: 'Google AI Studio' })}
                                                        </a>
                  
                                                    {t('auto.klucz_zostanie_zapisany', { defaultValue: '. Klucz zostanie zapisany' })} <b>{t('auto.wyłącznie_lokalnie', { defaultValue: i18n.t('auto.wylacznie_lokalnie', { defaultValue: "wyłącznie lokalnie" }) })}</b>  {t('auto.w_twojej_przeglądarce', { defaultValue: i18n.t('auto.w_twojej_przegladarce', { defaultValue: "w Twojej przeglądarce." }) })}
                                                  </p>
                <div className="flex items-start gap-2 mb-4 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <p className="text-[10px] font-bold leading-relaxed">
                    
                                                          {t('auto.ze_względów_bezpieczeństwa_dodawaj_', { defaultValue: i18n.t('auto.ze_wzgledow_bezpieczenstw', { defaultValue: "Ze względów bezpieczeństwa dodawaj swój klucz API" }) })}{" "}
                    <b className="font-black">
                      
                                                                {t('auto.tylko_na_własnych_zaufanych_urządze', { defaultValue: i18n.t('auto.tylko_na_wlasnych_zaufany', { defaultValue: "tylko na własnych, zaufanych urządzeniach" }) })}
                                                              </b>
                    
                                                          {t('auto.nie_wprowadzaj_go_na_urządzeniach_p', { defaultValue: i18n.t('auto.nie_wprowadzaj_go_na_urza', { defaultValue: ". Nie wprowadzaj go na urządzeniach publicznych." }) })}
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
                        localStorage.setItem("gemini_api_key", val.trim());
                      } else {
                        localStorage.removeItem("gemini_api_key");
                      }
                    }}
                    onBlur={() => {
                      const val = geminiApiKey.trim();
                      setGeminiApiKey(val);
                      if (val) {
                        localStorage.setItem("gemini_api_key", val);
                        setGeminiSaveStatus(i18n.t('auto.zapisano_pomyslnie', { defaultValue: i18n.t('auto.zapisano_pomyslnie', { defaultValue: "Zapisano pomyślnie ✓" }) }));
                      } else {
                        localStorage.removeItem("gemini_api_key");
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
          <Diets user={user} setTab={setTab} settings={settings} />
        </motion.div>
      )}

      {activeCategory === "stats" && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="pb-20 space-y-4"
        >
          <StatisticsView logs={logs} settings={settings} />
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
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl mb-4 border border-blue-100 dark:border-blue-800/30 border-l-4 border-l-blue-500">
              <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 mb-1">{t('auto.co_nowego_w_wersji_5_3_0', { defaultValue: 'Co nowego w wersji 5.3.0?' })}</h4>
              <ul className="text-[10px] text-blue-700 dark:text-blue-300 list-disc pl-4 space-y-0.5">
                 <li>{t('auto.całkiem_nowa_integracja_z_natywnym_', { defaultValue: i18n.t('auto.calkiem_nowa_integracja_z', { defaultValue: "Całkiem nowa integracja z natywnym wyświetlaczem samochodowym Android Auto" }) })}</li>
                 <li>{t('auto.nowe_szczegółowe_raporty_agp_z_wyko', { defaultValue: i18n.t('auto.nowe_szczegolowe_raporty', { defaultValue: "Nowe, szczegółowe raporty AGP z wykorzystaniem glassmorphismu" }) })}</li>
                 <li>{t('auto.optymalizacja_animacji_we_wszystkic', { defaultValue: 'Optymalizacja animacji we wszystkich widokach' })}</li>
              </ul>
            </div>

              {!Capacitor.isNativePlatform() ? (
                <a
                  href={apkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-500/30 hover:bg-green-700 transition-colors"
                  onClick={() => {
                    Haptics.success();
                    localStorage.setItem("dismissedApkVersion", apkVersion);
                  }}
                >
                  <Download size={20} />
                  
                                                {t('auto.pobierz_apk', { defaultValue: 'Pobierz APK' })}
                                              </a>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  <div className="w-full text-center p-4 rounded-2xl bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 font-bold border border-green-200 dark:border-green-900/30 flex items-center justify-center gap-2">
                    <Smartphone size={20} />
                    
                                                          {t('auto.używasz_natywnej_aplikacji', { defaultValue: i18n.t('auto.uzywasz_natywnej_aplikacj', { defaultValue: "Używasz Natywnej Aplikacji" }) })}
                                                        </div>
                  <button
                    onClick={async () => {
                      Haptics.impact();
                      try {
                        const res = await fetch('https://raw.githubusercontent.com/lukcorp83-glitch/diab/main/version.json?t=' + Date.now());
                        const data = await res.json();
                        if (data && data.version !== CURRENT_VERSION) {
                          localStorage.removeItem("dismissedApkVersion");
                          window.location.reload();
                        } else {
                          alert(i18n.t('auto.twoja_aplikacja_jest_w_pelni_a', { defaultValue: i18n.t('auto.twoja_aplikacja_jest_w_pe', { defaultValue: "Twoja aplikacja jest w pełni aktualna! (Wersja" }) }) + CURRENT_VERSION + ")");
                        }
                      } catch(e) {
                        alert(i18n.t('auto.blad_polaczenia_podczas_sprawd', { defaultValue: i18n.t('auto.blad_polaczenia_podczas_s', { defaultValue: "Błąd połączenia podczas sprawdzania aktualizacji." }) }));
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    
                                                          {t('auto.sprawdź_dostępność_aktualizacji', { defaultValue: i18n.t('auto.sprawdz_dostepnosc_aktual', { defaultValue: "Sprawdź dostępność aktualizacji" }) })}
                                                        </button>
                </div>
              )}

            <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-900/30">
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-500 mb-1">
                
                                              {t('auto.instrukcja_instalacji_android_pwa', { defaultValue: 'Instrukcja instalacji (Android PWA):' })}
                                            </h4>
              <ol className="list-decimal pl-4 text-[10px] space-y-1 text-amber-700 dark:text-amber-400/80 mb-3">
                <li>{t('auto.otwórz_tę_stronę_w_przeglądarce', { defaultValue: i18n.t('auto.otworz_te_strone_w_przegl', { defaultValue: "Otwórz tę stronę w przeglądarce" }) })} <b>{t('auto.chrome', { defaultValue: 'Chrome' })}</b>.</li>
                <li>{t('auto.rozwiń_menu_przeglądarki_trzy_kropk', { defaultValue: i18n.t('auto.rozwin_menu_przegladarki', { defaultValue: "Rozwiń menu przeglądarki (trzy kropki prawy górny róg)." }) })}</li>
                <li>{t('auto.wybierz_opcję', { defaultValue: i18n.t('auto.wybierz_opcje', { defaultValue: "Wybierz opcję" }) })} <b>{t('auto.dodaj_do_ekranu_głównego', { defaultValue: i18n.t('auto.dodaj_do_ekranu_glownego', { defaultValue: "Dodaj do ekranu głównego" }) })}</b>  {t('auto.lub_zainstaluj_aplikację', { defaultValue: i18n.t('auto.lub_zainstaluj_aplikacje', { defaultValue: "(lub Zainstaluj aplikację)." }) })}</li>
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
                  
                                                    {t('auto.jeśli_system_zapyta_zezwól_na_quot_', { defaultValue: i18n.t('auto.jesli_system_zapyta_zezwo', { defaultValue: "Jeśli system zapyta, zezwól na &quot;Instalację z nieznanych źródeł&quot;." }) })}
                                                  </li>
              </ol>

              <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-400 mb-1 mt-4">
                
                                              {t('auto.instrukcja_podgląd_glikemii_w_andro', { defaultValue: i18n.t('auto.instrukcja_podglad_glikem', { defaultValue: "🚗 Instrukcja: Podgląd Glikemii w Android Auto" }) })}
                                            </h4>
              <ol className="list-decimal pl-4 text-[10px] space-y-1 text-indigo-700 dark:text-indigo-300/80 mb-3">
                <li>{t('auto.otwórz', { defaultValue: i18n.t('auto.otworz', { defaultValue: "Otwórz" }) })} <span className="font-bold">{t('auto.ustawienia_android_auto', { defaultValue: 'Ustawienia Android Auto' })}</span>  {t('auto.na_telefonie', { defaultValue: 'na telefonie.' })}</li>
                <li>{t('auto.zjedź_na_sam_dół_do_sekcji', { defaultValue: i18n.t('auto.zjedz_na_sam_dol_do_sekcj', { defaultValue: "Zjedź na sam dół do sekcji" }) })} <span className="font-bold">{t('auto.wersja', { defaultValue: 'Wersja' })}</span>.</li>
                <li>{t('auto.kliknij_w_pole_quot_wersja_quot', { defaultValue: 'Kliknij w pole &quot;Wersja&quot;' })} <b>{t('auto.szybko_10_razy_z_rzędu', { defaultValue: i18n.t('auto.szybko_10_razy_z_rzedu', { defaultValue: "szybko 10 razy z rzędu" }) })}</b>{t('auto.by_odblokować_tryb_dewelopera', { defaultValue: i18n.t('auto.by_odblokowac_tryb_dewelo', { defaultValue: ", by odblokować Tryb Dewelopera." }) })}</li>
                <li>{t('auto.kliknij_w_trzy_kropki_prawy_górny_r', { defaultValue: i18n.t('auto.kliknij_w_trzy_kropki_pra', { defaultValue: "Kliknij w trzy kropki (prawy górny róg) i otwórz" }) })} <b>{t('auto.ustawienia_programisty', { defaultValue: 'Ustawienia programisty' })}</b>.</li>
                <li>{t('auto.zaznacz_ptaszek_przy', { defaultValue: 'Zaznacz ptaszek przy' })} <b>{t('auto.nieznane_źródła', { defaultValue: i18n.t('auto.nieznane_zrodla', { defaultValue: "Nieznane źródła" }) })}</b>  {t('auto.zezwalaj_na_używanie_aplikacji', { defaultValue: i18n.t('auto.zezwalaj_na_uzywanie_apli', { defaultValue: "(Zezwalaj na używanie aplikacji)." }) })}</li>
                <li>{t('auto.po_podłączeniu_do_samochodu', { defaultValue: i18n.t('auto.po_podlaczeniu_do_samocho', { defaultValue: "Po podłączeniu do samochodu," }) })} <b>{t('auto.glikocontrol', { defaultValue: 'GlikoControl' })}</b>  {t('auto.pojawi_się_w_menu_android_auto_a_na', { defaultValue: i18n.t('auto.pojawi_sie_w_menu_android', { defaultValue: "pojawi się w menu Android Auto, a na wyświetlaczu zobaczysz aktualny poziom cukru odświeżany co 30 sekund!" }) })}</li>
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
                <History size={14} />  {t('auto.aktualizacje_apk', { defaultValue: 'Aktualizacje APK' })}
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
                      {v.title}
                    </p>
                    <ul className="space-y-2">
                      {v.changes.map((change, idx) => (
                        <li
                          key={idx}
                          className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed"
                        >
                          • {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {activeCategory === "system" && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4 pb-20"
        >
          {/* Follower Mode (Tryb Obserwatora) */}
          <div
            className={cn(
              "rounded-[2.5rem] p-6 border shadow-xl space-y-4",
              settings.glassmorphismEnabled
                ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
            )}
          >
            <div className="flex items-center gap-4">
              <div className="bg-cyan-500/10 p-3 rounded-2xl text-cyan-500">
                <Activity size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider dark:text-white leading-none">
                  
                                                    {t('auto.tryb_śledzący_tylko_odczyt', { defaultValue: i18n.t('auto.tryb_sledzacy_tylko_odczy', { defaultValue: "Tryb Śledzący (Tylko Odczyt)" }) })}
                                                  </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  
                                                    {t('auto.dla_obserwatorów_followers', { defaultValue: i18n.t('auto.dla_obserwatorow_follower', { defaultValue: "Dla obserwatorów (followers)" }) })}
                                                  </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-left">
              
                                        {t('auto.wyłącz_funkcje_zapisywania_bolusy_p', { defaultValue: i18n.t('auto.wylacz_funkcje_zapisywani', { defaultValue: "Wyłącz funkcje zapisywania (bolusy, posiłki, modyfikacje) oraz ukryj zaawansowane analizy. Aplikacja stanie się czystym podglądem wyników i wykresów – idealne rozwiązanie dla członków rodziny i śledzących." }) })}
                                      </p>

            <div className="flex items-center justify-between pt-2">
              <div className="text-left">
                <p className="text-[11px] font-black uppercase dark:text-white">{t('auto.aktywuj_tryb', { defaultValue: 'Aktywuj tryb' })}</p>
              </div>
              <button
                onClick={async () => {
                  const isFollower = !settings.followerMode;
                  const updated = { ...settings, followerMode: isFollower };
                  setSettings(updated);
                  
                  await setDoc(
                    doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user!), "settings", "profile"),
                    { followerMode: isFollower },
                    { merge: true }
                  );
                  
                  if (isFollower) {
                    toast.success(i18n.t('auto.wlaczono_tryb_sledzacy', { defaultValue: i18n.t('auto.wlaczono_tryb_sledzacy', { defaultValue: "Włączono Tryb Śledzący" }) }));
                  } else {
                    toast.success(i18n.t('auto.wylaczono_tryb_sledzacy', { defaultValue: i18n.t('auto.wylaczono_tryb_sledzacy', { defaultValue: "Wyłączono Tryb Śledzący" }) }));
                  }
                }}
                className={cn(
                  "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none",
                  settings.followerMode ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-700"
                )}
              >
                <div
                  className={cn(
                    "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
                    settings.followerMode ? "translate-x-6" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* System & Experience Section */}
          <div
            className={cn(
              "rounded-[2.5rem] p-6 border shadow-xl space-y-4",
              settings.glassmorphismEnabled
                ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
            )}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-violet-500/10 text-violet-600 rounded-2xl">
                <Settings size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black dark:text-white leading-tight">
                  
                                                    {t('auto.system_i_wygląd', { defaultValue: i18n.t('auto.system_i_wyglad', { defaultValue: "System i Wygląd" }) })}
                                                  </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  
                                                    {t('auto.personalizacja', { defaultValue: 'Personalizacja' })}
                                                  </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Language Selector */}
              <div className="group flex items-center justify-between p-5 bg-blue-50 dark:bg-blue-500/5 rounded-[2rem] border border-blue-100 dark:border-blue-900/20 transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <Globe size={22} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black dark:text-blue-500 leading-tight">
                      {t('auto.jezyk_aplikacji', { defaultValue: i18n.t('auto.jezyk_aplikacji', { defaultValue: "Język aplikacji" }) })}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                      {t('auto.wybierz_jezyk_interfejsu', { defaultValue: i18n.t('auto.wybierz_jezyk_interfejsu', { defaultValue: "Wybierz język interfejsu (Polski / English)" }) })}
                    </p>
                  </div>
                </div>
                <div className="flex bg-slate-200 dark:bg-slate-700 rounded-full p-1">
                  <button
                    onClick={() => i18n.changeLanguage('pl')}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold transition-all",
                      i18n.language === 'pl' ? "bg-white dark:bg-slate-800 text-blue-500 shadow-sm" : "text-slate-500"
                    )}
                  >
                    PL
                  </button>
                  <button
                    onClick={() => i18n.changeLanguage('en')}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold transition-all",
                      i18n.language === 'en' ? "bg-white dark:bg-slate-800 text-blue-500 shadow-sm" : "text-slate-500"
                    )}
                  >
                    EN
                  </button>
                </div>
              </div>
              {/* Toggles */}
              <div className="grid grid-cols-1 gap-3">
                <div className="group flex items-center justify-between p-5 bg-amber-50 dark:bg-amber-500/5 rounded-[2rem] border border-amber-100 dark:border-amber-900/20 transition-all hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Baby size={22} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black dark:text-amber-500 leading-tight">
                        
                                                                      {t('auto.tryb_dziecka', { defaultValue: 'Tryb Dziecka' })}
                                                                    </p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                        
                                                                      {t('auto.aktywuje_wirtualnego_zwierzaka_glik', { defaultValue: 'Aktywuje wirtualnego zwierzaka Gliko' })}
                                                                    </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal = !settings.childMode;
                      setSettings((prev) => ({ ...prev, childMode: newVal }));
                      if (user)
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "settings",
                            "profile",
                          ),
                          { childMode: newVal },
                          { merge: true },
                        );
                    }}
                    className={cn(
                      "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                      settings.childMode && "bg-amber-500 pl-5",
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>

                <div
                  className={cn(
                    "group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md",
                    settings.glassmorphismEnabled
                      ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Smartphone size={22} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black dark:text-white leading-tight">
                        
                                                                      {t('auto.widgety_statusu', { defaultValue: 'Widgety Statusu' })}
                                                                    </p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                        
                                                                      {t('auto.monitoruj_baterię_telefonu_i_osprzę', { defaultValue: i18n.t('auto.monitoruj_baterie_telefon', { defaultValue: "Monitoruj baterię telefonu i osprzętu" }) })}
                                                                    </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal =
                        settings.showPumpWidget === false ? true : false;
                      setSettings((prev) => ({
                        ...prev,
                        showPumpWidget: newVal,
                      }));
                      if (user)
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "settings",
                            "profile",
                          ),
                          { showPumpWidget: newVal },
                          { merge: true },
                        );
                    }}
                    className={cn(
                      "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                      settings.showPumpWidget !== false && "bg-indigo-500 pl-5",
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>

                <div
                  className={cn(
                    "group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md",
                    settings.glassmorphismEnabled
                      ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Utensils size={22} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black dark:text-white leading-tight">
                        
                                                                      {t('auto.widżet_posiłku', { defaultValue: i18n.t('auto.widzet_posilku', { defaultValue: "Widżet Posiłku" }) })}
                                                                    </p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                        
                                                                      {t('auto.wymuś_pokazywanie_aktywnego_posiłku', { defaultValue: i18n.t('auto.wymus_pokazywanie_aktywne', { defaultValue: "Wymuś pokazywanie aktywnego posiłku po wchłonięciu" }) })}
                                                                    </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal = !settings.showMealWidget;
                      setSettings((prev) => ({
                        ...prev,
                        showMealWidget: newVal,
                      }));
                      if (user)
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "settings",
                            "profile",
                          ),
                          { showMealWidget: newVal },
                          { merge: true },
                        );
                    }}
                    className={cn(
                      "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                      settings.showMealWidget && "bg-amber-500 pl-5",
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>

                <div
                  className={cn(
                    "group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md",
                    settings.glassmorphismEnabled
                      ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Zap size={22} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black dark:text-white leading-tight">
                        
                                                                      {t('auto.haptyka', { defaultValue: 'Haptyka' })}
                                                                    </p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                        
                                                                      {t('auto.wibracje_przy_klikaniu_przycisków', { defaultValue: i18n.t('auto.wibracje_przy_klikaniu_pr', { defaultValue: "Wibracje przy klikaniu przycisków" }) })}
                                                                    </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const current =
                        localStorage.getItem("gliko_haptics_enabled") !==
                        "false";
                      localStorage.setItem(
                        "gliko_haptics_enabled",
                        String(!current),
                      );
                      // Force a re-render
                      window.dispatchEvent(new Event("storage"));
                      // We need to trigger a local state update to show visual toggle change
                      // but since we don't have local state here easily without refactoring,
                      // we'll just use the fact that buttons re-render on parent render.
                      // Actually, let's use a small trick: update a settings field that doesn't matter much or just trigger a parent update.
                      setSettings({ ...settings });
                    }}
                    className={cn(
                      "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                      localStorage.getItem("gliko_haptics_enabled") !==
                        "false" && "bg-accent-500 pl-5",
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>

                {/* GlikoSense & Pogoda */}
                <div
                  className={cn(
                    "group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md",
                    settings.glassmorphismEnabled
                      ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 text-teal-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <CloudRain size={22} />
                    </div>
                    <div className="text-left max-w-[150px] sm:max-w-none">
                      <p className="text-sm font-black dark:text-white leading-tight">
                        
                                                                      {t('auto.glikosense_pogoda', { defaultValue: 'GlikoSense & Pogoda' })}
                                                                    </p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight flex-wrap">
                        
                                                                      {t('auto.zaawansowane_analizowanie_i_przewid', { defaultValue: i18n.t('auto.zaawansowane_analizowanie', { defaultValue: "Zaawansowane analizowanie i przewidywanie rzepływu glikemii w oparciu o warunki pogodowe i biomet." }) })}
                                                                    </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal = !settings.weatherNeuralEnabled;
                      setSettings((prev) => ({
                        ...prev,
                        weatherNeuralEnabled: newVal,
                      }));
                      if (user)
                        await setDoc(
                          doc(
                            db,
                            "artifacts",
                            "diacontrolapp",
                            "users",
                            getEffectiveUid(user),
                            "settings",
                            "profile",
                          ),
                          { weatherNeuralEnabled: newVal },
                          { merge: true },
                        );
                    }}
                    className={cn(
                      "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                      settings.weatherNeuralEnabled && "bg-teal-500 pl-5",
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>

              {/* Visual Appearance Cards */}
              <div
                className={cn(
                  "p-6 rounded-[2.5rem] border space-y-6",
                  settings.glassmorphismEnabled
                    ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                    <Palette size={14} className="text-accent-500" />  {t('auto.akcent_kolorystyczny', { defaultValue: 'Akcent Kolorystyczny' })}
                                                        </div>
                  <div className="flex items-center gap-4 px-2 overflow-x-auto scrollbar-none py-2">
                    {["indigo", "emerald", "rose", "amber", "violet"].map(
                      (color) => (
                        <button
                          key={color}
                          onClick={async () => {
                            setSettings((prev) => ({
                              ...prev,
                              accentColor: color,
                            }));
                            if (user)
                              await setDoc(
                                doc(
                                  db,
                                  "artifacts",
                                  "diacontrolapp",
                                  "users",
                                  getEffectiveUid(user),
                                  "settings",
                                  "profile",
                                ),
                                { accentColor: color },
                                { merge: true },
                              );
                          }}
                          className={cn(
                            "w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center transition-all relative",
                            settings.accentColor === color ||
                              (!settings.accentColor && color === "indigo")
                              ? "scale-110 shadow-xl ring-2 ring-white dark:ring-slate-900 ring-offset-2"
                              : "opacity-40 scale-90 hover:opacity-100 hover:scale-100",
                            color === "indigo"
                              ? "bg-indigo-500 shadow-indigo-500/20"
                              : color === "emerald"
                                ? "bg-emerald-500 shadow-emerald-500/20"
                                : color === "rose"
                                  ? "bg-rose-500 shadow-rose-500/20"
                                  : color === "amber"
                                    ? "bg-amber-500 shadow-amber-500/20"
                                    : "bg-violet-500 shadow-violet-500/20",
                          )}
                        >
                          {(settings.accentColor === color ||
                            (!settings.accentColor && color === "indigo")) && (
                            <div className="w-2 h-2 rounded-full bg-white animate-bounce" />
                          )}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-700" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                    <Moon size={14} className="text-violet-500" />  {t('auto.tryb_jasny_ciemny', { defaultValue: 'Tryb Jasny / Ciemny' })}
                                                        </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "light", label: i18n.t('auto.jasny', { defaultValue: 'Jasny' }), icon: <Sun size={18} /> },
                      { id: "dark", label: i18n.t('auto.ciemny', { defaultValue: 'Ciemny' }), icon: <Moon size={18} /> },
                      {
                        id: "system",
                        label: i18n.t('auto.auto', { defaultValue: 'Auto' }),
                        icon: <RefreshCw size={18} />,
                      },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={async () => {
                          const newTheme = t.id as "light" | "dark" | "system";
                          setSettings((prev) => ({ ...prev, theme: newTheme }));
                          if (user)
                            await setDoc(
                              doc(
                                db,
                                "artifacts",
                                "diacontrolapp",
                                "users",
                                getEffectiveUid(user),
                                "settings",
                                "profile",
                              ),
                              { theme: newTheme },
                              { merge: true },
                            );
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all border",
                          settings.theme === t.id ||
                            (!settings.theme && t.id === "light")
                            ? "bg-slate-900 border-slate-900 text-white shadow-xl dark:bg-white dark:border-white dark:text-slate-900"
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 dark:bg-slate-800 dark:border-slate-700",
                        )}
                      >
                        {t.icon}
                        <span className="text-[8px] font-black uppercase tracking-widest">
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {(settings.theme === "dark" || settings.theme === "system") && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                      <LucideLock size={18} className="text-slate-400" />  {t('auto.styl_tła_ciemnego', { defaultValue: i18n.t('auto.styl_tla_ciemnego', { defaultValue: "Styl Tła Ciemnego" }) })}
                                                              </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "default", label: i18n.t('auto.głęboki_grafit', { defaultValue: i18n.t('auto.gleboki_grafit', { defaultValue: "Głęboki Grafit" }) }) },
                        { id: "true-black", label: i18n.t('auto.prawdziwa_czerń', { defaultValue: i18n.t('auto.prawdziwa_czern', { defaultValue: "Prawdziwa Czerń" }) }) },
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={async () => {
                            const val = option.id as any;
                            setSettings((prev) => ({ ...prev, bgOption: val }));
                            if (user)
                              await setDoc(
                                doc(
                                  db,
                                  "artifacts",
                                  "diacontrolapp",
                                  "users",
                                  getEffectiveUid(user),
                                  "settings",
                                  "profile",
                                ),
                                { bgOption: val },
                                { merge: true },
                              );
                          }}
                          className={cn(
                            "py-4 rounded-2xl border transition-all text-left px-5",
                            (!settings.bgOption && option.id === "default") ||
                              settings.bgOption === option.id
                              ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900"
                              : "bg-white border-slate-100 text-slate-400 dark:bg-slate-800 dark:border-slate-700",
                          )}
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest leading-tight">
                            {option.label}
                          </p>
                          <p className="text-[8px] font-medium opacity-60">
                            
                                                              {t('auto.tryb', { defaultValue: 'Tryb' })}{" "}
                            {option.id === "true-black" ? "OLED" : "Neutral"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* UI Theme Selection Section */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                  <Sparkles size={18} className="text-pink-500" />  {t('auto.styl_interfejsu', { defaultValue: 'Styl Interfejsu' })}
                                                  </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { id: 'default', label: i18n.t('auto.standard', { defaultValue: 'Standard' }), desc: i18n.t('auto.klasyczny_minimalizm', { defaultValue: 'Klasyczny minimalizm' }) },
                    { id: 'glass', label: i18n.t('auto.efekt_szkła', { defaultValue: i18n.t('auto.efekt_szkla', { defaultValue: "Efekt Szkła" }) }), desc: i18n.t('auto.rozmycie_i_przezroczystości', { defaultValue: i18n.t('auto.rozmycie_i_przezroczystos', { defaultValue: "Rozmycie i przezroczystości" }) }) },
                    { id: 'material3', label: i18n.t('auto.material_3', { defaultValue: 'Material 3' }), desc: i18n.t('auto.styl_systemu_android', { defaultValue: 'Styl systemu Android' }) }
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={async () => {
                        const glass = style.id === 'glass';
                        const material = style.id === 'material3';
                        
                        setSettings((prev) => ({
                          ...prev,
                          glassmorphismEnabled: glass,
                          material3Enabled: material,
                        }));
                        
                        if (user) {
                          await setDoc(
                            doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile"),
                            { glassmorphismEnabled: glass, material3Enabled: material },
                            { merge: true }
                          );
                        }
                      }}
                      className={cn(
                        "flex flex-col items-start p-4 rounded-2xl border transition-all text-left",
                        (style.id === 'default' && !settings.glassmorphismEnabled && !settings.material3Enabled) ||
                        (style.id === 'glass' && settings.glassmorphismEnabled) ||
                        (style.id === 'material3' && settings.material3Enabled)
                          ? "bg-accent-500/10 border-accent-500/50 text-accent-700 dark:text-accent-400"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100"
                      )}
                    >
                      <span className="text-xs font-black uppercase tracking-wider mb-1">
                        {style.label}
                      </span>
                      <span className="text-[9px] font-bold opacity-70 leading-tight">
                        {style.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Dynamic Colors Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-500">
                      <Sparkles size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black dark:text-white leading-tight">{t('auto.dynamiczne_kolory', { defaultValue: 'Dynamiczne Kolory' })}</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t('auto.dopasowuje_kolory_aplikacji_do_twoj', { defaultValue: 'Dopasowuje kolory aplikacji do Twojej tapety' })}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal = !settings.dynamicColorsEnabled;
                      setSettings((prev) => ({ ...prev, dynamicColorsEnabled: newVal }));
                      if (user) {
                        await setDoc(
                          doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile"),
                          { dynamicColorsEnabled: newVal },
                          { merge: true }
                        );
                      }
                    }}
                    className={cn(
                      "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                      settings.dynamicColorsEnabled && "bg-accent-500 pl-5"
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  "p-6 rounded-[2.5rem] border space-y-6 mt-4",
                  settings.glassmorphismEnabled
                    ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black dark:text-white">{t('auto.tryb_eko_maksymalna_wydajność', { defaultValue: i18n.t('auto.tryb_eko_maksymalna_wydaj', { defaultValue: "Tryb Eko (Maksymalna wydajność)" }) })}</h3>
                    <p className="text-[10px] text-slate-500">{t('auto.wyłącza_animacje_cienie_oraz_rozmyc', { defaultValue: i18n.t('auto.wylacza_animacje_cienie_o', { defaultValue: "Wyłącza animacje, cienie oraz rozmycia szklane by przyspieszyć działanie." }) })}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const mode = !settings.ecoMode;
                      setSettings(prev => ({ ...prev, ecoMode: mode }));
                      if (user) {
                        await setDoc(doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile"), { ecoMode: mode }, { merge: true });
                      }
                    }}
                    className={cn(
                      "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none",
                      settings.ecoMode ? "bg-accent-500" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div
                      className={cn(
                        "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
                        settings.ecoMode ? "translate-x-6" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Data Management Section */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
                <button
                  onClick={() => setActiveCategory("pairing")}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] active:scale-95 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl group-hover:bg-indigo-500/20 transition-colors">
                      <Network size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-[13px] font-black dark:text-white">{t('auto.parowanie_urządzenia', { defaultValue: i18n.t('auto.parowanie_urzadzenia', { defaultValue: "Parowanie / Urządzenia" }) })}</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{t('auto.połącz_telefony_rodziny_websocket', { defaultValue: i18n.t('auto.polacz_telefony_rodziny_w', { defaultValue: "Połącz telefony rodziny (WebSocket)" }) })}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
                </button>

                <CloudPackageSync
                  user={user}
                  settings={settings}
                  onImport={(s) => {
                    setSettings((prev) => ({ ...prev, ...s }));
                    setDoc(
                      doc(
                        db,
                        "artifacts",
                        "diacontrolapp",
                        "users",
                        getEffectiveUid(user),
                        "settings",
                        "profile",
                      ),
                      s,
                      { merge: true },
                    );
                    toast.success(i18n.t('auto.ustawienia_zaimportowane_pomys', { defaultValue: i18n.t('auto.ustawienia_zaimportowane', { defaultValue: "Ustawienia zaimportowane pomyślnie!" }) }));
                  }}
                />

                <SettingsTransfer
                  settings={settings}
                  onImport={(s) => {
                    setSettings((prev) => ({ ...prev, ...s }));
                    setDoc(
                      doc(
                        db,
                        "artifacts",
                        "diacontrolapp",
                        "users",
                        getEffectiveUid(user),
                        "settings",
                        "profile",
                      ),
                      s,
                      { merge: true },
                    );
                    toast.success(i18n.t('auto.synchronizacja_zakonczona', { defaultValue: i18n.t('auto.synchronizacja_zakonczona', { defaultValue: "Synchronizacja zakończona!" }) }));
                  }}
                />

                <LocalSync settings={settings} user={user} />
                <CloudPackageSync settings={settings} user={user} />

                <a
                  href="mailto:GlikoControl@proton.me"
                  className={cn(
                    "flex flex-col gap-2 p-5 rounded-[2rem] border transition-all hover:shadow-md cursor-pointer",
                    settings.glassmorphismEnabled
                      ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset hover:bg-white/10"
                      : "bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Info className="text-accent-500" size={20} />
                    <div className="flex flex-col">
                      <span className="text-xs font-black dark:text-white uppercase tracking-tight">
                        
                                                                      {t('auto.wsparcie_techniczne', { defaultValue: 'Wsparcie Techniczne' })}
                                                                    </span>
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                        
                                                                      {t('auto.glikocontrol_proton_me', { defaultValue: 'GlikoControl@proton.me' })}
                                                                    </span>
                    </div>
                  </div>
                </a>
              </div>

              {/* Maintenance Tools */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">
                  
                                                    {t('auto.administracja', { defaultValue: 'Administracja' })}
                                                  </h3>

                <div
                  className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between",
                    settings.glassmorphismEnabled
                      ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-2xl",
                        isFirebaseConnected
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-rose-500/10 text-rose-500",
                      )}
                    >
                      <Cloud size={16} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black dark:text-white uppercase tracking-tight">
                        
                                                                      {t('auto.status_firebase_cloud', { defaultValue: 'Status Firebase Cloud' })}
                                                                    </p>
                      <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {isFirebaseConnected
                          ? i18n.t('auto.polaczenie_stabilne', { defaultValue: i18n.t('auto.polaczenie_stabilne', { defaultValue: "Połączenie stabilne" }) })
                          : i18n.t('auto.blad_polaczenia_offline', { defaultValue: i18n.t('auto.blad_polaczenia_offline', { defaultValue: "Błąd połączenia / Offline" }) })}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                      isFirebaseConnected
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white animate-pulse",
                    )}
                  >
                    {isFirebaseConnected ? "Online" : "Offline"}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 p-2">
                    <button
                      onClick={repairGIWithAI}
                      disabled={cleaning}
                      className="w-full bg-accent-500 hover:bg-accent-600 text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-accent-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {cleaning ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Play size={18} fill="currentColor" />
                      )}
                      
                                                                {t('auto.start_audytu_ig_łg_i_duplikaty', { defaultValue: i18n.t('auto.start_audytu_ig_lg_i_dupl', { defaultValue: "START AUDYTU: IG, ŁG i DUPLIKATY" }) })}
                                                              </button>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 dark:text-slate-400 font-bold px-4 text-center leading-relaxed">
                      
                                                                {t('auto.inteligentny_system_ai_przeskanuje_', { defaultValue: i18n.t('auto.inteligentny_system_ai_pr', { defaultValue: "Inteligentny system AI przeskanuje Twoją bazę produktów, naprawi błędne wartości Indeksu i Ładunku Glikemicznego oraz usunie powtarzające się pozycje." }) })}
                                                              </p>
                  </div>

                  <button
                    onClick={async () => {
                      if (navigator.vibrate) navigator.vibrate(50);
                      setUpdateLoading(true);
                      setCleaningResult(i18n.t('auto.czyszczenie_pamieci_podrecznej', { defaultValue: i18n.t('auto.czyszczenie_pamieci_podre', { defaultValue: "Czyszczenie pamięci podręcznej i sprawdzanie aktualizacji..." }) }));
                      
                      try {
                        // 1. Clear all Cache Storage
                        if ('caches' in window) {
                          const cacheNames = await caches.keys();
                          await Promise.all(
                            cacheNames.map(name => caches.delete(name))
                          );
                        }

                        // 2. Unregister all Service Workers
                        if ('serviceWorker' in navigator) {
                          const registrations = await navigator.serviceWorker.getRegistrations();
                          await Promise.all(
                            registrations.map(reg => reg.unregister())
                          );
                        }

                        toast.success(i18n.t('auto.pamiec_podreczna_wyczyszczona', { defaultValue: i18n.t('auto.pamiec_podreczna_wyczyszc', { defaultValue: "Pamięć podręczna wyczyszczona. Trwa pobieranie nowej wersji..." }) }));
                        setCleaningResult(i18n.t('auto.ladowanie_nowej_wersji', { defaultValue: i18n.t('auto.ladowanie_nowej_wersji', { defaultValue: "Ładowanie nowej wersji..." }) }));
                        
                        setTimeout(() => {
                          window.location.reload();
                        }, 1000);
                      } catch (err) {
                        console.error(i18n.t('auto.blad_podczas_aktualizacji_pwa', { defaultValue: i18n.t('auto.blad_podczas_aktualizacji', { defaultValue: "Błąd podczas aktualizacji PWA:" }) }), err);
                        toast.error(i18n.t('auto.wystapil_blad_podczas_czyszcze', { defaultValue: i18n.t('auto.wystapil_blad_podczas_czy', { defaultValue: "Wystąpił błąd podczas czyszczenia pamięci podręcznej." }) }));
                        setTimeout(() => {
                          window.location.reload();
                        }, 1000);
                      }
                    }}
                    disabled={updateLoading}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-transparent text-slate-500 dark:text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 glass-target"
                  >
                    <RefreshCw
                      size={14}
                      className={cn(updateLoading && "animate-spin")}
                    />
                    
                                                          {t('auto.aktualizuj_v', { defaultValue: 'Aktualizuj v' })}{APP_VERSION}
                  </button>
                </div>

                {cleaningResult && (
                  <p className="text-center text-[9px] font-bold text-rose-500 uppercase tracking-widest px-4">
                    {cleaningResult}
                  </p>
                )}
              </div>

              {/* RODO / Privacy Detail */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowRodo(!showRodo)}
                  className="w-full flex items-center justify-between p-2 text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.2em]"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} />  {t('auto.prywatność_i_rodo', { defaultValue: i18n.t('auto.prywatnosc_i_rodo', { defaultValue: "Prywatność i RODO" }) })}
                                                        </div>
                  <ChevronRight
                    size={14}
                    className={cn(
                      "transition-transform",
                      showRodo && "rotate-90",
                    )}
                  />
                </button>
                {showRodo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="pt-4 space-y-4 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed text-left"
                  >
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <p>
                        <span className="font-black text-slate-700 dark:text-slate-200 uppercase text-[9px]">
                          
                                                                            {t('auto.prywatność_przede_wszystkim', { defaultValue: i18n.t('auto.prywatnosc_przede_wszystk', { defaultValue: "Prywatność przede wszystkim:" }) })}
                                                                          </span>{" "}
                        
                                                                      {t('auto.po_co_podpisywać_kałuże_imieniem_i_', { defaultValue: i18n.t('auto.po_co_podpisywac_kaluze_i', { defaultValue: "Po co podpisywać kałuże imieniem i nazwiskiem? Twoja prywatność jest dla nas priorytetem. Twoje dane są używane wyłącznie do tworzenia Twojej" }) })}{" "}
                        <b>{t('auto.indywidualnej_analizy_glikemii', { defaultValue: 'indywidualnej analizy glikemii' })}</b>.
                      </p>
                      <p>
                        <span className="font-black text-slate-700 dark:text-slate-200 uppercase text-[9px]">
                          
                                                                            {t('auto.bezpieczeństwo', { defaultValue: i18n.t('auto.bezpieczenstwo', { defaultValue: "Bezpieczeństwo:" }) })}
                                                                          </span>{" "}
                        
                                                                      {t('auto.dane_są_szyfrowane_i_przechowywane_', { defaultValue: i18n.t('auto.dane_sa_szyfrowane_i_prze', { defaultValue: "Dane są szyfrowane i przechowywane w infrastrukturze Firebase (Google Cloud) na terenie UE. Nigdy nie sprzedajemy Twoich danych medycznych." }) })}
                                                                    </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Logout Card */}
            <div className="bg-rose-500/10 p-8 rounded-[2.5rem] border border-rose-500/20 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 bg-rose-500 text-white rounded-[1.5rem] flex items-center justify-center mx-auto shadow-[0_10px_40px_-10px_rgba(244,63,94,0.5)]">
                <LogOut size={32} />
              </div>
              <div>
                <h4 className="text-lg font-black dark:text-rose-500 leading-tight">
                  
                                                    {t('auto.zakończ_sesję', { defaultValue: i18n.t('auto.zakoncz_sesje', { defaultValue: "Zakończ Sesję" }) })}
                                                  </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium px-4 mt-1">
                  
                                                    {t('auto.twoje_dane_są_używane_wyłącznie_do_', { defaultValue: i18n.t('auto.twoje_dane_sa_uzywane_wyl', { defaultValue: "Twoje dane są używane wyłącznie do tworzenia indywidualnej analizy. Dokumentacja nie wymaga podawania imienia i nazwiska - Twoja prywatność jest dla nas priorytetem." }) })}
                                                  </p>
              </div>
              <button
                onClick={() => auth.signOut()}
                className="bg-rose-500 text-white w-full py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-rose-500/20"
              >
                
                                              {t('auto.wyloguj_się_z_glikocontrol', { defaultValue: i18n.t('auto.wyloguj_sie_z_glikocontro', { defaultValue: "Wyloguj się z GlikoControl" }) })}
                                            </button>
            </div>

            {/* Version History */}
            <div
              className={cn(
                "rounded-[2.5rem] p-8 border shadow-sm opacity-60 hover:opacity-100 transition-opacity",
                settings.glassmorphismEnabled
                  ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800",
              )}
            >
              <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                <History size={14} />  {t('auto.dziennik_aktualizacji', { defaultValue: 'Dziennik Aktualizacji' })}
                                            </h4>
              <div className="space-y-6">
                {PWA_VERSIONS.slice(0, 3).map((v, i) => (
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
                      {v.title}
                    </p>
                    <ul className="space-y-1">
                      {v.changes.slice(0, 2).map((change, idx) => (
                        <li
                          key={`v-change-${v.version}-${idx}`}
                          className="text-[9px] text-slate-500 dark:text-slate-400 flex items-start gap-2"
                        >
                          <span className="mt-1 w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

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
  const [localValue, setLocalValue] = React.useState(
    Number.isInteger(value)
      ? value.toString()
      : Number(value).toFixed(2).replace(/\.00$/, ""),
  );

  React.useEffect(() => {
    // Try avoiding resetting localValue while typing, only when parent value changes significantly from local
    if (parseFloat(localValue) !== value && !isNaN(value)) {
      setLocalValue(
        Number.isInteger(value)
          ? value.toString()
          : Number(value)
              .toFixed(2)
              .replace(/\.00$/, "")
              .replace(/(\.[0-9])0$/, "$1"),
      );
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



