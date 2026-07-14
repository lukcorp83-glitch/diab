import {
  calculateIOB,
  calculateCOB,
  getEffectiveUid,
  getEffectiveIOB,
  getMealAbsorptionTime,
} from "./lib/utils";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { NotificationListenerSync } from "./components/NotificationListenerSync";
import RemoteAlertsListener from "./components/RemoteAlertsListener";
import UpdateModal from "./components/UpdateModal";

import GlikoControlLogo from "./components/LogoAnimation";
import { getGlikoSenseInsights } from "./lib/insightGenerator";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Activity,
  Database,
  Utensils,
  FileText,
  Settings,
  Plus,
  Scan,
  TrendingUp,
  Zap,
  LogOut,
  Bell,
  CheckCircle2,
  History,
  Apple,
  ChevronRight,
  Search,
  Camera,
  Trash2,
  Save,
  MessageSquare,
  Globe,
  Sun,
  Moon,
  LogIn,
  Menu,
  LayoutDashboard,
  Beaker,
  Sparkles,
  X,
} from "lucide-react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { auth, db } from "./lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithCredential,
} from "firebase/auth";
import { downloadCloudPackage } from "./components/CloudPackageSync";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  writeBatch,
  limit,
} from "firebase/firestore";
import {
  LogEntry,
  UserSettings,
  Product,
  PlateItem,
  AssistantMessage,
} from "./types";
import { geminiService } from "./services/gemini";
import { CATEGORIES, LIB_BASE, APP_VERSION } from "./constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { notificationService } from "./services/notificationService";
import { Toaster, toast, ToastBar } from "react-hot-toast";

import Dashboard from "./components/Dashboard";
import ChartFullView from "./components/ChartFullView";
import { LocalErrorBoundary } from "./components/LocalErrorBoundary";

import { saveLocalLogs, loadLocalLogs, deleteLocalLog } from "./lib/localLogs";
import { dbService } from "./services/databaseService";

const lazyWithReload = (importFunc: () => Promise<any>) => {
  return React.lazy(async () => {
    try {
      return await importFunc();
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "ChunkLoadError" ||
          error.message.includes("Failed to fetch dynamically imported module"))
      ) {
        const isReloading = sessionStorage.getItem("chunk_reload");
        if (!isReloading) {
          sessionStorage.setItem("chunk_reload", "true");
          window.location.reload();
          return new Promise(() => {}); // prevent Error Boundary while reloading
        }
      }
      throw error;
    }
  });
};

const BolusCalculator = lazyWithReload(
  () => import("./components/BolusCalculator"),
);
const MealPlate = lazyWithReload(() => import("./components/MealPlate"));
const AiReports = lazyWithReload(() => import("./components/AiReports"));
const PumpSimulator = lazyWithReload(
  () => import("./components/PumpSimulator"),
);
const Profile = lazyWithReload(() => import("./components/Profile"));
const Achievements = lazyWithReload(() => import("./components/Achievements"));
const HistoryView = lazyWithReload(() => import("./components/HistoryView"));
const GlikoGames = lazyWithReload(() => import("./components/GlikoGames"));
const GlikoChat = lazyWithReload(() => import("./components/GlikoChat"));
const GlikoAssistant = lazyWithReload(
  () => import("./components/GlikoAssistant"),
);
const TutorialView = lazyWithReload(() => import("./components/TutorialView"));
import Sidebar from "./components/Sidebar";
import { cn } from "./lib/utils";
import { nightscoutService } from "./services/nightscout";
import { maintenanceService } from "./services/maintenanceService";
import { healthService } from "./services/healthService";
import { useGlikoServer } from "./hooks/useGlikoServer";

import Logo from "./components/Logo";

import OnboardingTutorial from "./components/OnboardingTutorial";
import NotificationCenter from "./components/NotificationCenter";
import NotebookManager from "./components/NotebookManager";
import ChangelogPopup from "./components/ChangelogPopup";
import PrivacyPopup from "./components/PrivacyPopup";
import QuickStatusPopup from "./components/QuickStatusPopup";
import { Diets } from "./components/Diets";
import JetLagMode from "./components/JetLagMode";
import InsulinDetective from "./components/InsulinDetective";
import { CURRENT_VERSION } from "./constants/versions";

import GlikoSenseIcon from "./components/GlikoSenseIcon";

const MeshBackground = ({
  lastGlucose,
  isGlassmorphic,
}: {
  lastGlucose: number | null;
  isGlassmorphic: boolean;
}) => {
  const isAlert =
    lastGlucose !== null && (lastGlucose < 70 || lastGlucose > 180);
  const isUrgent =
    lastGlucose !== null && (lastGlucose < 55 || lastGlucose > 250);

  if (!isGlassmorphic) {
    if (isAlert || isUrgent) {
      return (
        <div
          className={cn(
            "fixed inset-0 -z-10 transition-colors duration-[2000ms] pointer-events-none opacity-10 dark:opacity-20",
            isUrgent ? "bg-rose-500" : "bg-orange-500",
          )}
        />
      );
    }
    return null;
  }

  return (
    <>
      <div className="mesh-bg">
        <motion.div
          animate={{
            opacity: isUrgent ? 0.8 : isAlert ? 0.6 : 0.4,
          }}
          className={cn(
            "w-full h-full transition-all duration-[2000ms] ease-in-out",
            isAlert || isUrgent ? "mesh-gradient-alert" : "mesh-gradient-1",
          )}
        />
      </div>

      {isGlassmorphic && (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden opacity-100 mix-blend-multiply dark:mix-blend-screen">
          <div
            className="absolute top-10 left-10 w-[25rem] h-[25rem] bg-accent-400/20 dark:bg-accent-500/10 blur-[120px] rounded-full animate-pulse"
            style={{ animationDuration: "8s" }}
          />
          <div
            className="absolute top-40 right-10 w-[25rem] h-[25rem] bg-indigo-400/20 dark:bg-indigo-500/10 blur-[120px] rounded-full animate-pulse"
            style={{ animationDuration: "10s" }}
          />
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[25rem] h-[25rem] bg-emerald-400/20 dark:bg-emerald-500/10 blur-[120px] rounded-full animate-pulse"
            style={{ animationDuration: "12s" }}
          />
        </div>
      )}
    </>
  );
};

import { Haptics } from "./lib/haptics";

const DEFAULT_SETTINGS: UserSettings = {
  isf: 58,
  wwRatio: 16,
  wbtRatio: 18,
  targetMin: 70,
  targetMax: 140,
  dia: 4,
  showPrediction: true,
  notificationsEnabled: true,
  weatherWidgetEnabled: true,
  weatherNeuralEnabled: true,
  glassmorphismEnabled: false,
  material3Enabled: false,
};

import { useTranslation } from "react-i18next";
import i18n from "./i18n";

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [pumpStatus, setPumpStatus] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app").then(({ App: CapacitorApp }) => {
        CapacitorApp.getInfo().then((info) => {
          if (info.version && info.version !== CURRENT_VERSION) {
            console.log(`Version mismatch: Native(${info.version}) vs JS(${CURRENT_VERSION}). Resetting OTA...`);
            CapacitorUpdater.reset();
          } else {
            CapacitorUpdater.notifyAppReady();
          }
        }).catch(() => CapacitorUpdater.notifyAppReady());
      }).catch(() => CapacitorUpdater.notifyAppReady());
      
      // Setup Android notification channels for custom sounds
      if (Capacitor.getPlatform() === 'android') {
        import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
          LocalNotifications.createChannel({
              id: 'glucose_alerts_v8',
              name: 'Alarmy Glikemii',
              description: 'Krytyczne alarmy o wysokim i niskim poziomie cukru',
              importance: 5, // MAX importance
              visibility: 1, // Public
              sound: 'status_clear.mp3',
              vibration: true
            }).catch(e => console.warn('Failed to create notification channel', e));

          LocalNotifications.createChannel({
              id: 'system_alerts_v1',
              name: 'Powiadomienia Systemowe',
              description: 'Standardowe komunikaty (bez specjalnych dźwięków)',
              importance: 4, 
              visibility: 1,
              vibration: true
            }).catch(e => console.warn('Failed to create system notification channel', e));
        });
      }
    }
    
    // Inicjalizacja hybrydowej bazy SQLite (APK & PWA)
    dbService.init().then(async () => {
      console.log(i18n.t('auto.baza_danych_zainicjowana_prawi', { defaultValue: i18n.t('auto.baza_danych_zainicjowana', { defaultValue: "Baza danych zainicjowana prawidłowo!" }) }));
      try {
        const localData = await dbService.getLogs(45000);
        setCachedLogs(localData);
      } catch (err) {
        console.error(i18n.t('auto.blad_pobierania_danych_startow', { defaultValue: i18n.t('auto.blad_pobierania_danych_st', { defaultValue: "Błąd pobierania danych startowych" }) }), err);
      }
      setCachedLogsLoaded(true);
    }).catch(err => {
      console.error(i18n.t('auto.blad_inicjalizacji_bazy_danych', { defaultValue: i18n.t('auto.blad_inicjalizacji_bazy_d', { defaultValue: "Błąd inicjalizacji bazy danych" }) }), err);
      setCachedLogsLoaded(true);
    });
  }, []);
  const [isShortcutMode, setIsShortcutMode] = useState(() => {
    return window.location.search.includes("action=");
  });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [cachedLogs, setCachedLogs] = useState<LogEntry[]>([]);
  const [cachedLogsLoaded, setCachedLogsLoaded] = useState(false);
  const [deletedNsIds, setDeletedNsIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("diacontrol_deleted_ns_ids");
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return new Set();
  });
  const [fbLogs, setFbLogs] = useState<LogEntry[]>([]);
  const [nsLogs, setNsLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const handleLogUpdate = (e: any) => {
      const { id, updates } = e.detail;
      setCachedLogs((prev) => 
        prev.map(l => l.id === id ? { ...l, ...updates } : l)
      );
      setFbLogs((prev) => 
        prev.map(l => l.id === id ? { ...l, ...updates } : l)
      );
    };
    const handleLogDelete = (e: any) => {
      const { id } = e.detail;
      setCachedLogs((prev) => prev.filter(l => l.id !== id && l.nsId !== id));
      setFbLogs((prev) => prev.filter(l => l.id !== id && l.nsId !== id));
      setNsLogs((prev) => prev.filter(l => l.id !== id && l.nsId !== id));
      setDeletedNsIds((prev) => new Set(prev).add(id));
      dbService.deleteLog(id).catch(console.error);
    };
    const handleLogAdd = (e: any) => {
      const newLog = e.detail;
      setCachedLogs((prev) => [newLog, ...prev]);
      setFbLogs((prev) => [newLog, ...prev]);

      if (newLog.type === 'insulin' && newLog.dose) {
         setUserSettings((prev) => {
            if (!prev || prev.treatmentMode !== 'insulin') return prev;
            let newCurrent = prev.currentPenUnits ?? prev.penCapacity ?? 300;
            let newCount = prev.penCount ?? 0;
            
            newCurrent -= newLog.dose;
            
            // Alert o niskim stanie pena, np. 20 jednostek
            if (newCurrent <= 20 && prev.currentPenUnits && prev.currentPenUnits > 20) {
              import("./services/notificationService").then(mod => {
                 mod.notificationService.scheduleLocalNotification(
                    "Kończy się insulina! 💉",
                    `W Twoim penie zostało tylko ${newCurrent} jednostek.`,
                    0
                 );
              });
            }

            if (newCurrent <= 0) {
               newCount = Math.max(0, newCount - 1);
               newCurrent = prev.penCapacity ?? 300;
            }
            
            const updatedSettings = { ...prev, currentPenUnits: newCurrent, penCount: newCount };
            
            if (auth.currentUser) {
              import("firebase/firestore").then(({ setDoc, doc }) => {
                setDoc(doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(auth.currentUser), "settings", "profile"), updatedSettings, { merge: true }).catch(console.error);
              });
            }
            
            return updatedSettings;
         });
      }
    };

    const handleLogAddBatch = (e: any) => {
      const newLogs = e.detail;
      if (!Array.isArray(newLogs) || newLogs.length === 0) return;
      setCachedLogs((prev) => [...newLogs, ...prev]);
      setFbLogs((prev) => [...newLogs, ...prev]);
      
      const insulinLogs = newLogs.filter((l: any) => l.type === 'insulin' && l.dose);
      if (insulinLogs.length > 0) {
         setUserSettings((prev) => {
            if (!prev || prev.treatmentMode !== 'insulin') return prev;
            let newCurrent = prev.currentPenUnits ?? prev.penCapacity ?? 300;
            let newCount = prev.penCount ?? 0;
            let totalDose = 0;
            insulinLogs.forEach((l: any) => totalDose += l.dose);
            
            newCurrent -= totalDose;
            
            if (newCurrent <= 20 && prev.currentPenUnits && prev.currentPenUnits > 20) {
              import("./services/notificationService").then(mod => {
                 mod.notificationService.scheduleLocalNotification(
                    "Kończy się insulina! 💉",
                    `W Twoim penie zostało tylko ${newCurrent} jednostek.`,
                    0
                 );
              });
            }

            if (newCurrent <= 0) {
               newCount += 1;
               newCurrent = prev.penCapacity ?? 300;
            }
            
            return { ...prev, currentPenUnits: newCurrent, penCount: newCount };
         });
      }
    };

    window.addEventListener("localLogUpdate", handleLogUpdate);
    window.addEventListener("localLogDelete", handleLogDelete);
    window.addEventListener("localLogAdd", handleLogAdd);
    window.addEventListener("localLogAddBatch", handleLogAddBatch);
    return () => {
      window.removeEventListener("localLogUpdate", handleLogUpdate);
      window.removeEventListener("localLogDelete", handleLogDelete);
      window.removeEventListener("localLogAdd", handleLogAdd);
      window.removeEventListener("localLogAddBatch", handleLogAddBatch);
    };
  }, []);

  // (Wczytywanie przeniesiono do bloku init bazy danych poniżej)

  const logs = useMemo(() => {
    const uniqueMap = new Map<string, LogEntry>();

    const getKey = (a: LogEntry) => {
      let key = "";
      if (a.nsId) key = a.nsId; // nsId ma wyższy priorytet (zapobiega duplikatom z fbLogs)
      else if (a.id) key = a.id;
      else key = `${a.type}_${Math.floor(a.timestamp / 60000)}_${a.value?.toFixed(1)}`;
      return key;
    };

    // 1. Podstawowe logi z NS
    nsLogs.forEach((a) => {
      uniqueMap.set(getKey(a), a);
    });

    // 2. Cache IDB (nadpisuje NS jeśli ma modyfikacje)
    cachedLogs.forEach((a) => {
      const key = getKey(a);
      const existing = uniqueMap.get(key);
      if (!existing || a.userModified || a.items?.length || (!existing.userModified && !existing.items?.length)) {
        uniqueMap.set(key, a);
      }
    });

    // 3. Live z FB (najwyższy priorytet, zawsze nadpisuje)
    fbLogs.forEach((a) => {
      uniqueMap.set(getKey(a), a);
    });

    const uniqueLogs = Array.from(uniqueMap.values());
    uniqueLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    return uniqueLogs;
  }, [cachedLogs, fbLogs, nsLogs]);

  // Zapisy do DB za każdym razem gdy zmieni się docelowy useMemo logs
  useEffect(() => {
    if (logs.length > 0 && cachedLogsLoaded) {
      dbService.saveMultipleLogs(logs.slice(0, 45000)).catch(console.error);
    }
  }, [logs, cachedLogsLoaded]);

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [nsUrl, setNsUrl] = useState("");
  const [nsSecret, setNsSecret] = useState("");
  const [initialAction, setInitialAction] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  const linkedUid = localStorage.getItem("diacontrol_linked_uid") || userSettings?.linkedUid || null;
  const isMasterToken = localStorage.getItem("diacontrol_is_master") === "true";
  const isAdminToken = localStorage.getItem("diacontrol_is_admin") === "true" || userSettings?.isLinkedAdmin === true;
  
  const role = isMasterToken ? 'master' : (isAdminToken ? 'admin' : 'follower');
  const isAdmin = role === 'master' || role === 'admin';
  
  // Automatycznie odtwórz pamięć lokalną jeśli odzyskaliśmy klucz z Firebase!
  useEffect(() => {
     if (userSettings?.linkedUid && !localStorage.getItem("diacontrol_linked_uid")) {
         localStorage.setItem("diacontrol_linked_uid", userSettings.linkedUid);
     }
     if (userSettings?.isLinkedAdmin && !localStorage.getItem("diacontrol_is_admin")) {
         localStorage.setItem("diacontrol_is_admin", "true");
     }
  }, [userSettings?.linkedUid, userSettings?.isLinkedAdmin]);

  // Wymuś kompaktowy rozmiar 1x1 dla widgetów aktywności i TIR u starych użytkowników
  useEffect(() => {
    if (userSettings?.dashboardWidgets && user) {
      let changed = false;
      const newWidgets = userSettings.dashboardWidgets.map((w: any) => {
        if ((w.id === "daily_tir" || w.id === "health_connect") && w.size !== "1x1") {
          changed = true;
          return { ...w, size: "1x1" };
        }
        return w;
      });
      if (changed) {
        setUserSettings((prev: any) => prev ? { ...prev, dashboardWidgets: newWidgets } : null);
        import("firebase/firestore").then(({ setDoc, doc }) => {
          setDoc(doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile"), { dashboardWidgets: newWidgets }, { merge: true }).catch(console.error);
        });
      }
    }
  }, [userSettings?.dashboardWidgets, user]);
  let localDeviceId = localStorage.getItem("glikocontrol_device_id");
  if (!localDeviceId) {
     localDeviceId = `device-${Date.now()}-${Math.floor(Math.random()*1000)}`;
     localStorage.setItem("glikocontrol_device_id", localDeviceId);
  }

  const { isConnected: wsConnected, sendData: wsSendData, devices: wsDevices, kickDevice } = useGlikoServer({
    url: userSettings?.websocketUrl,
    roomId: userSettings?.websocketRoomId || (user ? getEffectiveUid(user) : undefined),
    deviceId: localDeviceId,
    deviceName: userSettings?.deviceName || (Capacitor.isNativePlatform() ? "Aplikacja Mobilna" : i18n.t('auto.przegladarka_www', { defaultValue: i18n.t('auto.przegladarka_www', { defaultValue: "Przeglądaraka WWW" }) })),
    role,
    isAdmin,
    onDataReceived: (payload) => {
      // Przychodzi dane z innego telefonu po WebSocket - emulujemy że to nowy log z powiadomień
      if (Array.isArray(payload)) {
         window.dispatchEvent(new CustomEvent("localLogAddBatch", { detail: payload }));
      } else if (payload && payload.id) {
         window.dispatchEvent(new CustomEvent("localLogAdd", { detail: payload }));
      }
    },
    onKicked: () => {
       localStorage.removeItem("diacontrol_linked_uid");
       localStorage.removeItem("diacontrol_is_admin");
       window.location.reload();
    }
  });

  // Umożliwiamy wysyłanie eventów przez websocket z innych plików (Dashboard.tsx)
  useEffect(() => {
     const handleWsSend = (e: any) => {
        wsSendData(e.detail);
     };
     const handleWsSendBatch = (e: any) => {
        wsSendData(e.detail);
     };
     window.addEventListener("wsSendLog", handleWsSend);
     window.addEventListener("wsSendLogBatch", handleWsSendBatch);
     return () => {
        window.removeEventListener("wsSendLog", handleWsSend);
        window.removeEventListener("wsSendLogBatch", handleWsSendBatch);
     };
  }, [wsSendData]);

  useEffect(() => {
    if (userSettings) {
      notificationService.updateDeviceReminders(userSettings);
    }
  }, [userSettings?.sensorChangeDate, userSettings?.infusionSetChangeDate, userSettings?.sensorDurationDays, userSettings?.infusionSetDurationDays]);

  useEffect(() => {
    if (userSettings?.medications) {
      notificationService.scheduleMedicationReminders(userSettings.medications);
    }
  }, [userSettings?.medications]);

  useEffect(() => {
    if (logs.length > 0 && Capacitor.isNativePlatform()) {
      const latest = logs[0];
      const WidgetUpdater = registerPlugin<any>('WidgetUpdater');
      const timeStr = new Date(latest.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const deltaStr = latest.delta ? (latest.delta > 0 ? "+" + latest.delta : String(latest.delta)) : "0";
      WidgetUpdater.pushData({
        glucose: String((latest as any).glucose),
        arrow: (latest as any).trend || "",
        delta: deltaStr,
        time: timeStr
      }).catch(console.error);
    }
  }, [logs]);

  useEffect(() => {
    let active = true;
    const applyColors = async () => {
      const root = document.documentElement;
      let appliedSystem = false;
      
      if (userSettings?.material3Enabled && Capacitor.isNativePlatform()) {
        try {
          const WidgetUpdater = registerPlugin<any>('WidgetUpdater');
          const res = await WidgetUpdater.getMaterialYouColors();
          if (res && res.supported && active) {
            root.style.setProperty('--app-accent-100', res.primary100);
            root.style.setProperty('--app-accent-400', res.primary400);
            root.style.setProperty('--app-accent-500', res.primary500);
            root.style.setProperty('--app-accent-600', res.primary500);
            root.style.setProperty('--app-accent-900', res.primary900);
            root.style.setProperty('--app-accent-950', res.primary900);
            appliedSystem = true;
          }
        } catch (e) {
          console.error("Failed to get Material You colors", e);
        }
      }

      if (active && !appliedSystem) {
        if (userSettings?.dynamicColorsEnabled && logs.length > 0) {
          const glucose = (logs[0] as any).glucose;
          const min = userSettings.targetMin || 70;
          const max = userSettings.targetMax || 140;
          
          if (glucose < min) {
            root.style.setProperty('--app-accent-100', '#fee2e2');
            root.style.setProperty('--app-accent-400', '#f87171');
            root.style.setProperty('--app-accent-500', '#ef4444');
            root.style.setProperty('--app-accent-600', '#dc2626');
            root.style.setProperty('--app-accent-900', '#7f1d1d');
            root.style.setProperty('--app-accent-950', '#450a0a');
          } else if (glucose > max + 40) {
            root.style.setProperty('--app-accent-100', '#ffedd5');
            root.style.setProperty('--app-accent-400', '#fb923c');
            root.style.setProperty('--app-accent-500', '#f97316');
            root.style.setProperty('--app-accent-600', '#ea580c');
            root.style.setProperty('--app-accent-900', '#7c2d12');
            root.style.setProperty('--app-accent-950', '#431407');
          } else if (glucose > max) {
            root.style.setProperty('--app-accent-100', '#fef9c3');
            root.style.setProperty('--app-accent-400', '#facc15');
            root.style.setProperty('--app-accent-500', '#eab308');
            root.style.setProperty('--app-accent-600', '#ca8a04');
            root.style.setProperty('--app-accent-900', '#713f12');
            root.style.setProperty('--app-accent-950', '#422006');
          } else {
            root.style.setProperty('--app-accent-100', '#d1fae5');
            root.style.setProperty('--app-accent-400', '#34d399');
            root.style.setProperty('--app-accent-500', '#10b981');
            root.style.setProperty('--app-accent-600', '#059669');
            root.style.setProperty('--app-accent-900', '#064e3b');
            root.style.setProperty('--app-accent-950', '#022c22');
          }
        } else {
          root.style.removeProperty('--app-accent-100');
          root.style.removeProperty('--app-accent-400');
          root.style.removeProperty('--app-accent-500');
          root.style.removeProperty('--app-accent-600');
          root.style.removeProperty('--app-accent-900');
          root.style.removeProperty('--app-accent-950');
        }
      }
    };
    
    applyColors();
    return () => { active = false; };
  }, [logs, userSettings?.dynamicColorsEnabled, userSettings?.material3Enabled, userSettings?.targetMin, userSettings?.targetMax]);

  const [petData, setPetData] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<{
    status: "idle" | "syncing" | "success" | "error";
    lastSync?: number;
  }>({ status: "idle" });
  const [showTutorial, setShowTutorial] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Jeśli szerokość okna jest mniejsza niż 768px i wysokość jest mniejsza niż 560px,
      // ekran jest drastycznie ściśnięty w pionie (klawiatura w pionie lub obrócony mały telefon) - chowamy bottom bar
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width < 768 && height < 560) {
        setIsKeyboardOpen(true);
      } else {
        setIsKeyboardOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    // Dodatkowy nasłuch na visualViewport jeśli istnieje (dokładniejszy przy soft-klawiaturze mobilnej)
    if (window.visualViewport) {
      const handleVisualResize = () => {
        const vv = window.visualViewport;
        if (vv) {
          const isCompressed = window.innerHeight - vv.height > 120;
          if (isCompressed && window.innerWidth < 768) {
            setIsKeyboardOpen(true);
            return;
          }
        }
        handleResize();
      };
      window.visualViewport.addEventListener("resize", handleVisualResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.visualViewport?.removeEventListener("resize", handleVisualResize);
      };
    }

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const activeMenuMeal = useMemo(() => {
    const meals = logs
      .filter((l) => l.type === "meal" || l.linkedMeal)
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const latest of meals) {
      const mSrc = latest.type === "meal" ? latest : latest.linkedMeal;
      if (!mSrc) continue;

      const mWW =
        (mSrc as any).value !== undefined
          ? (mSrc as any).value / 10
          : (mSrc as any).carbs !== undefined
            ? (mSrc as any).carbs / 10
            : 0;
      const mWBT = ((mSrc.protein || 0) * 4 + (mSrc.fat || 0) * 9) / 100;

      const durationH = getMealAbsorptionTime(mWW, mWBT);
      const ageH = (Date.now() - (latest.timestamp || 0)) / (1000 * 60 * 60);

      // If it's still absorbing, this is our active meal
      if (ageH < durationH || userSettings?.showMealWidget) {
        return latest;
      }
    }
    return undefined;
  }, [logs, userSettings?.showMealWidget]);

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const mealProgress = useMemo(() => {
    if (!activeMenuMeal) return null;
    const mSrc =
      activeMenuMeal.type === "meal"
        ? activeMenuMeal
        : activeMenuMeal.linkedMeal;
    if (!mSrc) return null;

    const mWW =
      (mSrc as any).value !== undefined
        ? (mSrc as any).value / 10
        : (mSrc as any).carbs !== undefined
          ? (mSrc as any).carbs / 10
          : 0;
    const mWBT = ((mSrc.protein || 0) * 4 + (mSrc.fat || 0) * 9) / 100;

    const durationH = getMealAbsorptionTime(mWW, mWBT);
    const ageH =
      (currentTime - (activeMenuMeal.timestamp || 0)) / (1000 * 60 * 60);

    if (ageH >= durationH && !userSettings?.showMealWidget) return null;

    return Math.max(0, Math.min(1, ageH / durationH));
  }, [activeMenuMeal, userSettings?.showMealWidget, currentTime]);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [activeTab]);

  const [assistantMessages, setAssistantMessages] = useState<
    AssistantMessage[]
  >(() => {
    const saved = localStorage.getItem("gliko_assistant_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Replace old long initial message
        if (parsed && parsed.length > 0) {
          const firstMsg = parsed[0];
          if (firstMsg.id.startsWith('initial') && (firstMsg.text.includes(i18n.t('auto.przeanalizowalem', { defaultValue: i18n.t('auto.przeanalizowalem', { defaultValue: "Przeanalizowałem" }) })) || firstMsg.text.includes('System Aktywny'))) {
             return []; // Clear to generate new initial message
          }
        }
        return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "aiReports",
      ),
      orderBy("timestamp", "desc"),
      limit(3),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const texts = snapshot.docs.map((doc) => {
        const data = doc.data();
        // Extract plain text from HTML-like content
        return data.content?.replace(/<[^>]*>/g, " ").substring(0, 500) || "";
      });
      setAiInsights(texts);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    localStorage.setItem(
      "gliko_assistant_history",
      JSON.stringify(assistantMessages),
    );
  }, [assistantMessages]);

  const sendAssistantMessage = async (text: string) => {
    if (!text.trim() || isAssistantTyping) return;

    const userMessage: AssistantMessage = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
      timestamp: Date.now(),
    };

    setAssistantMessages((prev) => [...prev, userMessage]);
    setIsAssistantTyping(true);

    try {
      const history = assistantMessages
        .filter((m) => m.id !== "initial" && !m.id.startsWith("initial-"))
        .slice(-10)
        .map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

      const iob = getEffectiveIOB(logs, pumpStatus, userSettings?.dia || 4);
      const cob = calculateCOB(logs);

      const logGlucose = logs.filter((l) => l.type === "glucose")[0];
      const pumpBg = pumpStatus?.bg;
      let lastGlucose = logGlucose?.value || pumpBg || 0;

      // If pump status is newer than latest log, prefer pump status
      if (
        pumpStatus?.timestamp &&
        logGlucose?.timestamp &&
        pumpStatus.timestamp > logGlucose.timestamp
      ) {
        lastGlucose = pumpBg || lastGlucose;
      }

      const staticInsights = getGlikoSenseInsights(logs, userSettings?.treatmentMode);
      const combinedInsights = [...staticInsights, ...aiInsights];

      const response = await geminiService.getAssistantResponse(
        text,
        history,
        logs,
        userSettings || { targetMin: 70, targetMax: 140 },
        { iob, cob, glucose: lastGlucose, pumpModel: pumpStatus?.model },
        combinedInsights,
      );

      // Handle Plate/App Actions
      let cleanResponse = response;
      const plateActionMatches = Array.from(
        response.matchAll(/<plate_action>([\s\S]*?)<\/plate_action>/g),
      );

      for (const match of plateActionMatches) {
        try {
          const actionData = JSON.parse(match[1]);
          if (actionData.action === "add" && actionData.item) {
            window.dispatchEvent(
              new CustomEvent("ai_plate_action", { detail: actionData }),
            );
          }
        } catch (e) {
          console.error("AI Plate Action Error:", e);
        }
      }

      if (plateActionMatches.length > 0) {
        cleanResponse = cleanResponse
          .replace(/<plate_action>[\s\S]*?<\/plate_action>/g, "")
          .trim();
      }

      const appActionMatches = Array.from(
        response.matchAll(/<app_action>([\s\S]*?)<\/app_action>/g),
      );
      let parsedAppAction = null;
      for (const match of appActionMatches) {
        try {
          parsedAppAction = JSON.parse(match[1]);
        } catch (e) {
          console.error("AI App Action Error:", e);
        }
      }
      if (appActionMatches.length > 0) {
        cleanResponse = cleanResponse
          .replace(/<app_action>[\s\S]*?<\/app_action>/g, "")
          .trim();
      }

      const modelMessage: AssistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: cleanResponse,
        timestamp: Date.now(),
        appAction: parsedAppAction
      };

      setAssistantMessages((prev) => [...prev, modelMessage]);

      // BACKGROUND NOTIFICATION
      const isAssistantTabActive = activeTab === "assistant";
      if (!isAssistantTabActive) {
        toast(
          (toastItem) => (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <span className="font-black text-[10px]">
                  
                                              {t('auto.aszystent_ai_odpowiedział', { defaultValue: i18n.t('auto.aszystent_ai_odpowiedzial', { defaultValue: "ASZYSTENT AI ODPOWIEDZIAŁ!" }) })}
                                            </span>
              </div>
              <p className="text-[9px] lowercase opacity-70 line-clamp-2">
                {cleanResponse.replace(/<[^>]*>/g, "").substring(0, 60) + "..."}
              </p>
              <button
                onClick={() => {
                  setActiveTab("assistant");
                  toast.dismiss(toastItem.id);
                }}
                className="mt-1 px-3 py-1.5 bg-accent-600 text-white text-[8px] font-black uppercase rounded-lg w-fit"
              >
                
                                        {t('auto.pokaż_odpowiedź', { defaultValue: i18n.t('auto.pokaz_odpowiedz', { defaultValue: "Pokaż odpowiedź" }) })}
                                      </button>
            </div>
          ),
          { duration: 6000, position: "top-right" },
        );

        if (window.Notification && window.Notification.permission === "granted") {
          new window.Notification(i18n.t('auto.nowa_odpowiedz_od_asystenta_ai', { defaultValue: i18n.t('auto.nowa_odpowiedz_od_asysten', { defaultValue: "Nowa odpowiedź od Asystenta AI" }) }), {
            body: i18n.t('auto.twoj_asystent_przygotowal_anal', { defaultValue: i18n.t('auto.twoj_asystent_przygotowal', { defaultValue: "Twój asystent przygotował analizę. Kliknij aby zobaczyć." }) }),
            icon: "/apple-touch-icon.png",
          });
        }
      }
    } catch (error: any) {
      console.error("BG Assistant Error:", error);
      const errMsg = error?.message || String(error);
      const isInvalidKey =
        errMsg.includes("API key not valid") ||
        errMsg.includes("API_KEY_INVALID");

      const errorMessage: AssistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: isInvalidKey
          ? i18n.t('auto.b_blad_klucza_api_gemini_b_two', { defaultValue: i18n.t('auto.b_blad_klucza_api_gemini', { defaultValue: "⚠️ <b>Błąd klucza API Gemini!</b> Twój klucz wydaje się być nieprawidłowy. Sprawdź go w ustawieniach profilu." }) })
          : i18n.t('auto.b_blad_komunikacji_z_ai_b', { defaultValue: "⚠️ <b>Błąd komunikacji z AI:</b> {{var0}}", var0: errMsg }),
        timestamp: Date.now(),
      };
      setAssistantMessages((prev) => [...prev, errorMessage]);
      toast.error(i18n.t('auto.wystapil_blad_ai', { defaultValue: i18n.t('auto.wystapil_blad_ai', { defaultValue: "Wystąpił błąd AI." }) }));
    } finally {
      setIsAssistantTyping(false);
    }
  };

  const [sharedPlate, setSharedPlate] = useState<PlateItem[]>(() => {
    const saved = localStorage.getItem("current_plate");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("current_plate", JSON.stringify(sharedPlate));
  }, [sharedPlate]);

  useEffect(() => {
    const handlePlateAction = (e: any) => {
      const { action, item } = e.detail;
      if (action === "add" && item) {
        setSharedPlate((prev) => {
          const newItem = {
            id: "ai-" + Date.now() + Math.random(),
            ...item,
            gi: item.gi || 0,
            category: item.category || "AI Dodane",
            weight: item.weight || 100,
          };
          return [...prev, newItem];
        });
        toast.success(
          `Dodano: ${item.name} (${item.carbs}g W, ${item.protein}g B, ${item.fat}g T)`,
        );
      }
    };

    const handleAppAction = async (e: any) => {
      const { action, key, value, logData } = e.detail;

      if (action === "set_setting" && user && userSettings) {
        if (
          [
            "isf",
            "wwRatio",
            "wbtRatio",
            "targetMin",
            "targetMax",
            "tdee",
          ].includes(key)
        ) {
          try {
            const updateField = { [key]: Number(value) };
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
              updateField,
              { merge: true },
            );
            setUserSettings({ ...userSettings, ...updateField });
            toast.success(`AI zaktualizowało: ${key} na ${value}`);
          } catch (err) {
            console.error("Failed to update setting from AI", err);
          }
        } else if (key === "haptics" || key === "hapticsEnabled") {
          const isEnabled =
            typeof value === "boolean" ? value : value === "true";
          localStorage.setItem(
            "gliko_haptics_enabled",
            isEnabled ? "true" : "false",
          );
          toast.success(
            isEnabled
              ? i18n.t('auto.wibracje_zostaly_wlaczone_prze', { defaultValue: i18n.t('auto.wibracje_zostaly_wlaczone', { defaultValue: "Wibracje zostały włączone przez AI" }) })
              : i18n.t('auto.wibracje_zostaly_wylaczone_prz', { defaultValue: i18n.t('auto.wibracje_zostaly_wylaczon', { defaultValue: "Wibracje zostały wyłączone przez AI" }) }),
          );
        }
      } else if (action === "add_log" && user) {
        try {
          // addDoc we need to make sure we have addDoc from firebase/firestore
          const logsRef = collection(
            db,
            "artifacts",
            "diacontrolapp",
            "users",
            getEffectiveUid(user),
            "logs",
          );
          const nowTimestamp = Date.now();
          const newLog = {
            ...logData, // { type: 'bolus'|'glucose'|'site_change'|'sensor_change', value: number, notes? }
            timestamp: nowTimestamp,
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(logsRef), newLog);

          if (
            logData.type === "site_change" ||
            logData.type === "sensor_change"
          ) {
            const settingsRef = doc(
              db,
              "artifacts",
              "diacontrolapp",
              "users",
              getEffectiveUid(user),
              "settings",
              "profile",
            );

            const updates: any = {};
            if (logData.type === "site_change") {
              updates.infusionSetChangeDate = nowTimestamp;
              if (window.confirm(i18n.t('auto.czy_wymieniasz_rowniez_zbiornicze', { defaultValue: 'Czy wymieniasz również zbiorniczek na insulinę?' }))) {
                  updates.reservoirChangeDate = nowTimestamp;
                  const resLog = { 
                     type: "site_change", 
                     value: 1, 
                     timestamp: nowTimestamp + 1, 
                     createdAt: serverTimestamp(), 
                     notes: i18n.t('auto.wymiana_zbiorniczka', { defaultValue: "Wymiana zbiorniczka" }), 
                     source: "system" 
                  };
                  await setDoc(doc(logsRef), resLog);
              }
            } else if (logData.type === "sensor_change") {
              updates.sensorChangeDate = nowTimestamp;
            }
            await setDoc(settingsRef, updates, { merge: true });
          }

          toast.success(`Zapisano dzienniczek z poziomu AI!`);
        } catch (err) {
          console.error("Failed to add log", err);
        }
      } else if (action === "navigate") {
        const tab = value; // e.g. 'dashboard', 'database', 'meal', 'settings'->'profile'
        let targetTab = tab;
        if (tab === "settings" || tab === "ustawienia") targetTab = "profile";
        if (tab === "baza") targetTab = "database";
        if (tab === "talerz") targetTab = "meal";
        setActiveTab(targetTab);
        toast(i18n.t('auto.przejscie_do_zakladki', { defaultValue: i18n.t('auto.przejscie_do_zakladki', { defaultValue: "Przejście do zakładki..." }) }), { icon: "🚀" });
      }
    };

    window.addEventListener("ai_plate_action", handlePlateAction);
    window.addEventListener("ai_app_action", handleAppAction);
    return () => {
      window.removeEventListener("ai_plate_action", handlePlateAction);
      window.removeEventListener("ai_app_action", handleAppAction);
    };
  }, [user, userSettings]);

  // Test Firestore connection
  useEffect(() => {
    if (!user) return;
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "connection_tests", "touch"));
        console.log("[Firestore] Connection verified");
      } catch (error: any) {
        if (
          error.message?.includes("offline") ||
          error.code === "unavailable"
        ) {
          console.error("[Firestore] Connection issue:", error);
          toast.error(
            i18n.t('auto.brak_polaczenia_z_baza_firesto', { defaultValue: i18n.t('auto.brak_polaczenia_z_baza_fi', { defaultValue: "Brak połączenia z bazą Firestore - sprawdź internet lub konfigurację." }) }),
          );
        }
      }
    };
    testConnection();
  }, [user]);

  useEffect(() => {
    const hasAcceptedPrivacy = localStorage.getItem("hasAcceptedPrivacy");

    if (!hasAcceptedPrivacy) {
      setShowPrivacyPopup(true);
      setPrivacyLoading(false);
    } else {
      setPrivacyLoading(false);
    }

    // Check version for changelog
    const lastSeen = localStorage.getItem("lastSeenVersion");
    const hasSeenChangelog353 = localStorage.getItem("hasSeen353Changelog_v1");
    if (!hasSeenChangelog353) {
      setShowChangelog(true);
      localStorage.setItem("hasSeen353Changelog_v1", "true");
      localStorage.setItem("lastSeenVersion", CURRENT_VERSION);
    } else if (lastSeen !== CURRENT_VERSION) {
      // Only show if it's not the very first visit (we show tutorial then)
      if (lastSeen || localStorage.getItem("hasSeenTutorial")) {
        setShowChangelog(true);
      } else {
        // First visit - set the version so we don't show changelog right after tutorial
        localStorage.setItem("lastSeenVersion", CURRENT_VERSION);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Check privacy in firestore
    const checkPrivacy = async () => {
      const uid = getEffectiveUid(user);
      const privacyRef = doc(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        uid,
        "settings",
        "privacy",
      );
      try {
        const d = await getDoc(privacyRef);
        if (d.exists()) {
          const data = d.data();
          if (data.accepted) {
            localStorage.setItem("hasAcceptedPrivacy", "true");
            setShowPrivacyPopup(false);
          } else {
            setShowPrivacyPopup(true);
          }
        } else {
          // New user or no data
          if (localStorage.getItem("hasAcceptedPrivacy") === "true") {
            await setDoc(
              privacyRef,
              {
                accepted: true,
                acceptedAt: serverTimestamp(),
                version: CURRENT_VERSION,
              },
              { merge: true },
            );
          } else {
            setShowPrivacyPopup(true);
          }
        }
      } catch (err) {
        console.error("Error checking privacy in Firestore:", err);
      }
    };

    checkPrivacy();
  }, [user]);

  const handleAcceptPrivacy = async () => {
    setShowPrivacyPopup(false);
    localStorage.setItem("hasAcceptedPrivacy", "true");
    localStorage.setItem("lastSeenVersion", CURRENT_VERSION);

    if (user) {
      const uid = getEffectiveUid(user);
      const privacyRef = doc(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        uid,
        "settings",
        "privacy",
      );
      try {
        await setDoc(
          privacyRef,
          {
            accepted: true,
            acceptedAt: serverTimestamp(),
            version: CURRENT_VERSION,
          },
          { merge: true },
        );
        toast.success(i18n.t('auto.zgoda_zatwierdzona_pomyslnie', { defaultValue: i18n.t('auto.zgoda_zatwierdzona_pomysl', { defaultValue: "Zgoda zatwierdzona pomyślnie" }) }));
      } catch (err) {
        console.error("Error saving privacy to Firestore:", err);
      }
    }

    const lastSeen = localStorage.getItem("lastSeenVersion");
    if (
      lastSeen &&
      lastSeen !== CURRENT_VERSION &&
      localStorage.getItem("hasSeenTutorial")
    ) {
      setShowChangelog(true);
    }
  };

  const handleCloseChangelog = () => {
    setShowChangelog(false);
    localStorage.setItem("lastSeenVersion", CURRENT_VERSION);
  };

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "status",
        "pump",
      ),
      (docSnap) => {
        if (docSnap.exists()) {
          console.log("[Firestore] Received pump status data:", docSnap.data());
          setPumpStatus(docSnap.data());
        } else {
          console.log(
            "[Firestore] Pump status document does not exist for UID:",
            getEffectiveUid(user),
          );
        }
      },
      (error) => {
        console.error("Firestore onSnapshot error (pump status):", error);
      },
    );
  }, [user]);

  const changeTab = React.useCallback(
    (newTab: string) => {
      Haptics.light();
      const getIndex = (tab: string) => {
        const currentTabs = userSettings?.childMode
          ? ["chart", "dashboard", "database", "meal", "chat", "assistant", "ai", "profile", "games"]
          : ["chart", "dashboard", "database", "meal", "assistant", "ai", "profile"];
        return currentTabs.indexOf(tab) >= 0 ? currentTabs.indexOf(tab) : 0;
      };
      setDirection(getIndex(newTab) >= getIndex(activeTab) ? 1 : -1);
      setActiveTab(newTab);
    },
    [activeTab],
  );

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
    const unsub = onSnapshot(
      petRef,
      (d) => {
        if (d.exists()) setPetData(d.data());
      },
      (error) => {
        console.error("Firestore onSnapshot error (pet):", error);
      },
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(
      db,
      "artifacts",
      "diacontrolapp",
      "users",
      getEffectiveUid(user),
      "settings",
      "profile",
    );
    const unsubscribe = onSnapshot(
      settingsRef,
      (d) => {
        const localNotificationsEnabled = localStorage.getItem(
          "notificationsEnabled",
        );

        if (d.exists()) {
          const data = d.data() as UserSettings;
          const localTreatmentMode = localStorage.getItem("treatmentMode") as any;
          
          if (localNotificationsEnabled !== null) {
            data.notificationsEnabled = localNotificationsEnabled === "true";
          }
          
          if (localTreatmentMode !== null) {
            data.treatmentMode = localTreatmentMode;
            // Wymuszamy nadpisanie starego stanu w bazie chmurowej
            setDoc(settingsRef, { treatmentMode: localTreatmentMode }, { merge: true }).catch(console.error);
            localStorage.removeItem("treatmentMode"); // Pożeramy flagę
          }

          if (data.appVersion !== CURRENT_VERSION) {
            data.appVersion = CURRENT_VERSION;
            setDoc(settingsRef, { appVersion: CURRENT_VERSION }, { merge: true }).catch(console.error);
          }
          
          setUserSettings(data);
        } else {
          const defaultSettings = { ...DEFAULT_SETTINGS, appVersion: CURRENT_VERSION };
          const localTreatmentMode = localStorage.getItem("treatmentMode") as any;
          
          if (localNotificationsEnabled !== null) {
            defaultSettings.notificationsEnabled =
              localNotificationsEnabled === "true";
          }
          
          if (localTreatmentMode !== null) {
            defaultSettings.treatmentMode = localTreatmentMode;
            setDoc(settingsRef, { treatmentMode: localTreatmentMode }, { merge: true }).catch(console.error);
            localStorage.removeItem("treatmentMode");
          }
          
          setUserSettings(defaultSettings);
        }
      },
      (err) => {
        if (!err.message?.includes("offline"))
          console.error("Error fetching settings for notifications:", err);
      },
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!userSettings?.notificationsEnabled) return;

    const sendAppNotification = (title: string, body: string) => {
      toast(body, {
        icon: '⏰',
        duration: 15000,
        position: 'top-center',
        style: {
          border: '2px solid #6366f1',
          padding: '16px',
          color: '#1e293b',
          fontWeight: 'bold',
          background: '#fff'
        }
      });

      const apkPref = localStorage.getItem("apkSystemNotificationsEnabled");
      const apkNotificationsEnabled = apkPref !== "false";
      if (!apkNotificationsEnabled) return;

      if (Capacitor.isNativePlatform()) {
        import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
          LocalNotifications.schedule({
            notifications: [
              {
                title: title,
                body: body,
                id: Math.floor(Math.random() * 100000),
                schedule: { at: new Date() },
                sound: undefined,
                attachments: null,
                actionTypeId: "",
                extra: null
              }
            ]
          }).catch(e => console.error("Native notification error:", e));
        });
      } else if (window.Notification && window.Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then((registration) => {
          if (registration) {
            registration.showNotification(title, {
              body,
              icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/'),
              vibrate: [200, 100, 200]
            } as any);
          } else {
            new window.Notification(title, { body });
          }
        }).catch(() => {
          try {
            new window.Notification(title, { body });
          } catch (e) {}
        });
      }
    };

      // `checkExpiries` has been migrated to `NotificationCenter.tsx` to avoid duplicating native OS alerts and to unify the notification stream.
  }, [userSettings]);

  useEffect(() => {
    if (!userSettings?.notificationsEnabled) return;
    if (!logs || logs.length === 0) return;

    // Filter to glucose logs and sort descending by timestamp (latest first)
    const glucoseLogs = logs
      .filter((l) => l.type === "glucose")
      .sort((a, b) => b.timestamp - a.timestamp);

    if (glucoseLogs.length === 0) return;
    const latest = glucoseLogs[0];
    const previous = glucoseLogs.length > 1 ? glucoseLogs[1] : null;

    // Aktualizacja przyklejonego powiadomienia na ekranie blokady
    let delta = 0;
    let trendArrow = "";
    if (previous) {
      const timeDiffMs = latest.timestamp - previous.timestamp;
      const timeDiffMinutes = timeDiffMs / (60 * 1000);
      if (timeDiffMinutes > 0 && timeDiffMinutes <= 15) {
        delta = Math.round(((latest.value - previous.value) / timeDiffMinutes) * 5);
        if (delta > 15) trendArrow = "↑↑";
        else if (delta > 5) trendArrow = "↑";
        else if (delta < -15) trendArrow = "↓↓";
        else if (delta < -5) trendArrow = "↓";
        else trendArrow = "→";
      }
    }
    
    // Używamy getEffectiveIOB dla uwzględnienia pompy, jeśli jest dostępna
    const iob = getEffectiveIOB(logs, pumpStatus, userSettings?.dia || 4);
    const cob = calculateCOB(logs);
    
    notificationService.updateStickyNotification(
      Math.round(latest.value).toString(), 
      trendArrow, 
      iob, 
      Math.round(cob), 
      delta
    );

    // Check if the reading is recent (e.g., within the last 30 minutes) to avoid back-notifying historical syncs
    const isRecent = Date.now() - latest.timestamp < 30 * 60 * 1000;
    if (!isRecent) return;

    const bgVal = latest.value;
    const minSafe = userSettings.targetMin || 70;
    const maxSafe = userSettings.targetMax || 140;

    const hypoPref = userSettings.notificationPrefs?.hypo !== false;
    const hyperPref = userSettings.notificationPrefs?.hyper !== false;

    let currentViolation: "hypo" | "hyper" | null = null;
    if (bgVal < minSafe && hypoPref) {
      currentViolation = "hypo";
    } else if (bgVal > maxSafe && hyperPref) {
      currentViolation = "hyper";
    }

    const lastAlertType = localStorage.getItem("last_glucose_alert_type") as "hypo" | "hyper" | null;
    const lastAlertTimeStr = localStorage.getItem("last_glucose_alert_time");
    const lastAlertTime = lastAlertTimeStr ? parseInt(lastAlertTimeStr, 10) : 0;

    if (currentViolation === null) {
      // Glucose went back into target range - clear any active alert tracking
      if (lastAlertType !== null) {
        localStorage.removeItem("last_glucose_alert_type");
        localStorage.removeItem("last_glucose_alert_time");
      }
      return;
    }

    // Determine if we should send an alert
    let shouldAlert = false;
    let isReminder = false;
    const nowMs = Date.now();

    // Check if this specific reading wasn't already alerted on (to be safe)
    const notifiedKey = `notified_glucose_${latest.id || latest.timestamp}`;
    const wasAlreadyNotifiedOnThisReading = localStorage.getItem(notifiedKey) === "true";

    if (!wasAlreadyNotifiedOnThisReading) {
      if (lastAlertType === currentViolation) {
        // Same type of violation is ongoing (e.g., still high or still low).
        // Trigger a reminder only if at least 30 minutes have elapsed since the last alert.
        const minutesSinceLastAlert = (nowMs - lastAlertTime) / (60 * 1000);
        if (minutesSinceLastAlert >= 30) {
          shouldAlert = true;
          isReminder = true;
        }
      } else {
        // Brand new violation, or changed from hypo to hyper (or vice-versa), alert immediately!
        shouldAlert = true;
        isReminder = false;
      }
    }

    if (shouldAlert) {
      // Mark as notified immediately
      localStorage.setItem(notifiedKey, "true");
      localStorage.setItem("last_glucose_alert_type", currentViolation);
      localStorage.setItem("last_glucose_alert_time", nowMs.toString());

      let alertTitle = "";
      let alertBody = "";

      if (currentViolation === "hypo") {
        if (isReminder) {
          alertTitle = "⏳ PRZYPOMNIENIE: Cukier nadal niski (Hipoglikemia)!";
          alertBody = i18n.t('auto.twoja_glikemia_od_ponad_3', { defaultValue: "Twoja glikemia od ponad 30 minut utrzymuje się poniżej normy. Aktualny odczyt: {{var0}} mg/dL. Zjedz szybko węglowodany proste!", var0: Math.round(bgVal) });
        } else {
          alertTitle = "🚨 NISKI POZIOM CUKRU (Hipoglikemia)!";
          alertBody = i18n.t('auto.twoja_glikemia_wynosi_var', { defaultValue: "Twoja glikemia wynosi {{var0}} mg/dL, co jest poniżej bezpiecznej granicy {{var1}} mg/dL. Zjedz szybko węglowodany proste!", var0: Math.round(bgVal), var1: minSafe });
        }
      } else {
        if (isReminder) {
          alertTitle = "⏳ PRZYPOMNIENIE: Cukier nadal wysoki (Hiperglikemia)!";
          alertBody = i18n.t('auto.twoja_glikemia_od_ponad_3', { defaultValue: "Twoja glikemia od ponad 30 minut utrzymuje się powyżej normy. Aktualny odczyt: {{var0}} mg/dL. Rozważ podanie korekty insuliną.", var0: Math.round(bgVal) });
        } else {
          alertTitle = "⚠️ WYSOKI POZIOM CUKRU (Hiperglikemia)!";
          alertBody = i18n.t('auto.twoja_glikemia_wynosi_var', { defaultValue: "Twoja glikemia wynosi {{var0}} mg/dL, co przewyższa bezpieczną granicę {{var1}} mg/dL. Rozważ korektę insuliną.", var0: Math.round(bgVal), var1: maxSafe });
        }
      }

      // UI feedback (toast alert)
      toast.error(`${alertTitle}\n${alertBody}`, {
        duration: 20000,
        position: "top-center",
        style: {
          border: "2px solid #ef4444",
          padding: "16px",
          color: "#1e293b",
          fontWeight: "bold",
          background: "#fff"
        },
      });

      if (navigator.vibrate) {
        navigator.vibrate([400, 200, 400, 200, 400]);
      }

      const apkPref = localStorage.getItem("apkSystemNotificationsEnabled");
      const apkNotificationsEnabled = apkPref !== "false";
      if (apkNotificationsEnabled) {
        if (Capacitor.isNativePlatform()) {
          import("@capacitor/local-notifications").then(({ LocalNotifications }) => {
            LocalNotifications.schedule({
              notifications: [
                {
                  title: alertTitle,
                  body: alertBody,
                  id: Math.floor(Math.random() * 100000),
                  schedule: { at: new Date() },
                  channelId: "glucose_alerts_v8",
                  sound: "status_clear.mp3",
                  attachments: null,
                  actionTypeId: "",
                  extra: null
                }
              ]
            }).catch(e => console.error("Error scheduling native glucose alert:", e));
          });
        } else if (window.Notification && window.Notification.permission === "granted") {
          navigator.serviceWorker.ready.then((registration) => {
            if (registration) {
              registration.showNotification(alertTitle, {
                body: alertBody,
                icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, "/"),
                vibrate: [400, 200, 400, 200, 400],
                tag: "glikocontrol-alarm-glucose",
                requireInteraction: true
              } as any);
            } else {
              new window.Notification(alertTitle, { body: alertBody });
            }
          }).catch(() => {
            try {
              new window.Notification(alertTitle, { body: alertBody });
            } catch (e) {}
          });
        }
      }

      // --- GlikoSense Insight Prompter (Odpytywanie użytkownika) ---
      const lastInsightCheck = parseInt(localStorage.getItem('glikosense_last_insight_check') || '0', 10);
      if (Date.now() - lastInsightCheck > 24 * 60 * 60 * 1000) {
         localStorage.setItem('glikosense_last_insight_check', Date.now().toString());
         import('./lib/insightGenerator').then(({ getGlikoSenseInsights }) => {
             const insights = getGlikoSenseInsights(logs, userSettings?.treatmentMode);
             const nightLowsMsg = insights.find((i: string) => i.includes('nocne hipoglikemie'));
             if (nightLowsMsg && !localStorage.getItem('glikosense_asked_night_lows')) {
                 localStorage.setItem('glikosense_asked_night_lows', 'true');
                 setTimeout(() => {
                   toast((toastItem) => (
                     <div>
                       <b className="text-accent-600">{t('auto.glikosense_ai', { defaultValue: 'GlikoSense AI:' })}</b> <br/>  {t('auto.zauważyłem_u_ciebie_powtarzające_si', { defaultValue: i18n.t('auto.zauwazylem_u_ciebie_powta', { defaultValue: "Zauważyłem u Ciebie powtarzające się spadki cukru w nocy. Czy chcesz, abym zaczął ostrzegać Cię wieczorem, jeśli ryzyko nocnego niedocukrzenia będzie wysokie?" }) })}
                                                  <div className="flex gap-2 mt-3">
                         <button onClick={() => { 
                           const prefs = userSettings.notificationPrefs || { hypo: true, hyper: true, reminders: true, predictions: true };
                           setDoc(doc(db, "artifacts", "diacontrolapp", "users", (userSettings as any).userId || "temp", "settings", "profile"), {
                              notificationPrefs: { ...prefs, nightSnackReminder: true }
                           }, { merge: true });
                           toast.success(i18n.t('auto.inteligentna_regula_wlaczona', { defaultValue: i18n.t('auto.inteligentna_regula_wlacz', { defaultValue: "Inteligentna reguła włączona!" }) }));
                           toast.dismiss(toastItem.id);
                         }} className="bg-accent-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold">{t('auto.tak_włącz_regułę', { defaultValue: i18n.t('auto.tak_wlacz_regule', { defaultValue: "Tak, włącz regułę" }) })}</button>
                         <button onClick={() => toast.dismiss(toastItem.id)} className="bg-slate-200 dark:bg-slate-700 dark:text-white text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold">{t('auto.nie_teraz', { defaultValue: 'Nie teraz' })}</button>
                       </div>
                     </div>
                   ), { duration: 30000, position: 'top-center', style: { padding: '16px', border: '2px solid #6366f1' } });
                 }, 5000);
             }
         });
      }

    }
  }, [logs, userSettings]);

  useEffect(() => {
    // Handle PWA shortcuts
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");

    if (action === "add_glucose") {
      setInitialAction("add_glucose");
      setActiveTab("dashboard");
      window.history.replaceState({}, "", "/");
    } else if (action === "add_bolus") {
      setActiveTab("bolus");
      window.history.replaceState({}, "", "/");
    } else if (action === "add_meal") {
      setActiveTab("meal");
      window.history.replaceState({}, "", "/");
    }

    const handleNativeShortcut = (e: any) => {
      const action = e.detail;
      if (action === 'add_glucose' || action === 'add_bolus') {
        setIsShortcutMode(true);
      }
      if (action === 'add_glucose') {
        setInitialAction("add_glucose");
        setActiveTab("dashboard");
      } else if (action === 'add_bolus') {
        setActiveTab("bolus");
      } else if (action === 'open_scanner') {
        setInitialAction("open_scanner");
        setActiveTab("meal");
      } else if (action === 'open_camera_vision') {
        setInitialAction("open_camera_vision");
        setActiveTab("meal");
      }
    };
    window.addEventListener("native_shortcut_action", handleNativeShortcut);

    // Handle Capacitor Deep Links (Android Widgets)
    const listener = CapacitorApp.addListener('appUrlOpen', (data) => {
      try {
        const url = new URL(data.url);
        if (url.protocol === 'glikocontrol:') {
          const actionParam = url.searchParams.get('action');
          if (actionParam === 'add_glucose' || actionParam === 'add_bolus') {
            setIsShortcutMode(true);
          }
          if (actionParam === 'add_glucose') {
            setInitialAction("add_glucose");
            setActiveTab("dashboard");
          } else if (actionParam === 'add_bolus') {
            setActiveTab("bolus");
          } else if (actionParam === 'open_scanner') {
            setInitialAction("open_scanner");
            setActiveTab("meal");
          } else if (actionParam === 'open_camera_vision') {
            setInitialAction("open_camera_vision");
            setActiveTab("meal");
          }
        }
      } catch (err) {
        console.error("Error parsing deep link", err);
      }
    });

    return () => {
      listener.then(l => l.remove());
      window.removeEventListener("native_shortcut_action", handleNativeShortcut);
    };
  }, []);

  useEffect(() => {
    const savedTheme =
      userSettings?.theme ||
      (localStorage.getItem("theme") as "light" | "dark" | "system") ||
      "light";
    const savedAccent =
      userSettings?.accentColor ||
      localStorage.getItem("accentColor") ||
      "accent";

    // Default to handling 'system' preference
    let activeTheme = savedTheme;
    if (savedTheme === "system") {
      activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else if (savedTheme !== "light" && savedTheme !== "dark") {
      activeTheme = "light";
    }

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(activeTheme);
    setTheme(activeTheme as "light" | "dark");
    root.setAttribute("data-accent", savedAccent);
    root.setAttribute("data-bg", userSettings?.bgOption || "default");
    if (userSettings?.glassmorphismEnabled) {
      root.setAttribute("data-glassmorphism", "true");
    } else {
      root.removeAttribute("data-glassmorphism");
    }
    if (userSettings?.material3Enabled) {
      root.setAttribute("data-material3", "true");
    } else {
      root.removeAttribute("data-material3");
    }
    if (userSettings?.ecoMode) {
      root.setAttribute("data-eco", "true");
    } else {
      root.removeAttribute("data-eco");
    }

    if (userSettings?.theme) {
      localStorage.setItem("theme", userSettings.theme);
    }
    if (userSettings?.accentColor) {
      localStorage.setItem("accentColor", userSettings.accentColor);
    }
  }, [
    userSettings?.theme,
    userSettings?.accentColor,
    userSettings?.bgOption,
    userSettings?.glassmorphismEnabled,
    userSettings?.material3Enabled,
    userSettings?.ecoMode,
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);

      if (u) {
        maintenanceService.cleanupOldData(getEffectiveUid(u), 30);
        const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
        if (!hasSeenTutorial) {
          setShowTutorial(true);
        }

        // Initialize FCM if enabled in userSettings (or just try to get token)
        // Note: userSettings might not be loaded yet, so we also check in userSettings useEffect
        notificationService.setupForegroundListener();
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && userSettings?.notificationsEnabled) {
      notificationService.registerToken();
    }
  }, [user, userSettings?.notificationsEnabled]);

  useEffect(() => {
    if (!user || !cachedLogsLoaded) return;

    let q;
    // Auto-Restore logic: always attempt on fresh install/wipe to fetch the full 15k history without hitting quota
    if (cachedLogs.length === 0 && localStorage.getItem('has_attempted_cloud_restore') !== 'true') {
      console.log("No local data, attempting auto-restore from cloud package...");
      localStorage.setItem('has_attempted_cloud_restore', 'true'); // prevent loop
      downloadCloudPackage(user).then(ok => {
        if (ok) {
          console.log("Auto-restore successful, reloading...");
          setTimeout(() => window.location.reload(), 500);
        }
      });
    } else if (cachedLogs.length > 0) {
      localStorage.setItem('glikocontrol_has_local_data', 'true');
      
      // Smart Auto-Backup raz na 24h - żeby uchronić przed niespodziewanym OTA Capgo
      const lastBackup = parseInt(localStorage.getItem('last_auto_cloud_backup') || '0');
      const now = Date.now();
      if (now - lastBackup > 24 * 60 * 60 * 1000) {
        console.log("24h passed, silently uploading cloud package backup...");
        import('./components/CloudPackageSync').then(module => {
          const userSettingsRaw = localStorage.getItem(`firebase_settings_diacontrolapp_users_${user.uid}`);
          let userSettingsParsed = null;
          try { if (userSettingsRaw) userSettingsParsed = JSON.parse(userSettingsRaw); } catch(e){}
          
          module.uploadCloudPackage(user, userSettingsParsed || {} as any).then(ok => {
            if (ok) localStorage.setItem('last_auto_cloud_backup', now.toString());
          });
        });
      }
    }

    // Znajdź najnowszą datę w buforze
    const newestLocalTs =
      cachedLogs.length > 0 ? cachedLogs[0].timestamp : 0;

    const logsCollection = collection(
      db,
      "artifacts",
      "diacontrolapp",
      "users",
      getEffectiveUid(user),
      "logs",
    );

    if (newestLocalTs > 0) {
      // Fetch only what's new since our last sync/cache (+ mały zapas - 2 dni)
      const safeTs = newestLocalTs - 5 * 24 * 3600 * 1000; // Zapas 5 dni na synchronizację offline
      q = query(
        logsCollection,
        where("timestamp", ">", safeTs),
        orderBy("timestamp", "desc"),
        limit(1500),
      );
    } else {
      q = query(logsCollection, orderBy("timestamp", "desc"), limit(1500));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as LogEntry[];
        setFbLogs(data);
      },
      (error) => {
        console.error("Firestore subscription error:", error);
        if (error.message.includes("permission-denied")) {
          setAuthError(
            i18n.t('auto.blad_uprawnien_sprawdz_czy_jes', { defaultValue: i18n.t('auto.blad_uprawnien_sprawdz_cz', { defaultValue: "Błąd uprawnień - sprawdź czy jesteś zalogowany poprawnie." }) }),
          );
        } else if (
          error.message.includes("quota") ||
          error.message.includes("Quota")
        ) {
          setAuthError(
            i18n.t('auto.przekroczono_limit_bazy_danych', { defaultValue: i18n.t('auto.przekroczono_limit_bazy_d', { defaultValue: "Przekroczono limit bazy danych (Quota exceeded). Spróbuj ponownie jutro." }) }),
          );
        } else {
          setAuthError(i18n.t('auto.blad_bazy_danych', { defaultValue: i18n.t('auto.blad_bazy_danych', { defaultValue: "Błąd bazy danych:" }) }) + error.message);
        }
      },
    );
    return unsubscribe;
  }, [user]);

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
          setNsUrl(d.data()?.url || "");
          setNsSecret(d.data()?.secret || "");
        }
      },
      (error) => {
        if (!error.message?.includes("offline"))
          console.error("Error fetching NS settings:", error);
      },
    );

    return () => unsubscribeNs();
  }, [user]);

  const syncTaskRef = useRef(false);
  const logsRef = useRef(logs);
  const userSettingsRef = useRef(userSettings);
  const deletedNsIdsRef = useRef(deletedNsIds);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);
  
  useEffect(() => {
    deletedNsIdsRef.current = deletedNsIds;
    localStorage.setItem("diacontrol_deleted_ns_ids", JSON.stringify(Array.from(deletedNsIds)));
  }, [deletedNsIds]);

  useEffect(() => {
    userSettingsRef.current = userSettings;
  }, [userSettings]);

  useEffect(() => {
    if (!user) return;
    
    const syncWidgetPreferences = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const WidgetUpdater = registerPlugin<any>('WidgetUpdater');
        const minVal = userSettings?.targetMin ?? 70;
        const maxVal = userSettings?.targetMax ?? 140;
        
        await WidgetUpdater.update({
          url: nsUrl || "",
          secret: nsSecret || "",
          targetMin: String(minVal),
          targetMax: String(maxVal)
        });
        console.log("Widget preferences synced to Android successfully: URL =", nsUrl, "min =", minVal, "max =", maxVal);
      } catch (err) {
        console.error("Failed to sync widget preferences to Android:", err);
      }
    };

    const timeout = setTimeout(syncWidgetPreferences, 1000);
    return () => clearTimeout(timeout);
  }, [user, nsUrl, nsSecret, userSettings?.targetMin, userSettings?.targetMax]);

  // Synchronizacja kroków z Health Connect (zapisywanie w localStorage i event)
  useEffect(() => {
    if (!userSettings?.healthConnectSyncSteps) return;
    if (!healthService.isAvailable()) return;

    const syncSteps = async () => {
      try {
        const steps = await healthService.getStepsLast24h();
        console.log("[HealthConnect] Synced steps:", steps);
        localStorage.setItem("health_connect_steps_24h", steps.toString());
        window.dispatchEvent(new CustomEvent("health_connect_steps_updated", { detail: steps }));
      } catch (e) {
        console.warn("[HealthConnect] Error syncing steps:", e);
      }
    };

    syncSteps();
    const interval = setInterval(syncSteps, 15 * 60 * 1000); // co 15 minut
    return () => clearInterval(interval);
  }, [userSettings?.healthConnectSyncSteps]);

  // Synchronizacja glikemii (zapisywanie) do Health Connect
  useEffect(() => {
    if (!userSettings?.healthConnectSyncGlucose) return;
    if (!healthService.isAvailable()) return;

    const latest = logs[0];
    if (!latest || latest.type !== "glucose") return;

    const lastSyncedId = localStorage.getItem("last_health_connect_synced_glucose_id");
    if (latest.id === lastSyncedId) return;

    // Zapisz do bazy systemowej
    healthService.writeBloodGlucose(latest.value, latest.timestamp).then(success => {
      if (success) {
        localStorage.setItem("last_health_connect_synced_glucose_id", latest.id || "");
      }
    }).catch(e => console.warn("[HealthConnect] Error writing glucose:", e));
  }, [logs, userSettings?.healthConnectSyncGlucose]);

  useEffect(() => {
    if (!user || !nsUrl) return;

    let worker: Worker;
    try {
      worker = new Worker(new URL('./workers/nightscout.worker.ts', import.meta.url), { type: 'module' });
    } catch (e) {
      console.warn("Failed to initialize worker", e);
      return;
    }

    const sanitizeNested = (obj: any): any => {
      Object.keys(obj).forEach((key) => {
        if (obj[key] && typeof obj[key] === "object")
          sanitizeNested(obj[key]);
        else if (obj[key] === undefined) delete obj[key];
      });
      return obj;
    };

    worker.onmessage = (e) => {
      const { type, payload } = e.data;

      if (type === 'SYNC_SUCCESS') {
        const { entries, treatments, deviceStatus: devicestatus } = payload;
        
        // 1. FRESH UI FEEDBACK - Get the latest and check if we need weather
        if (entries.length > 0) {
          const latest = entries[0];
          if (latest.type === "glucose" && userSettingsRef.current?.notificationPrefs?.sensorCheck !== false) {
             // Removed dead man's switch as background execution is suspended by OS
          }
          setNsLogs((prev) => {
            const hasLatest = prev.some((p) => p.id === latest.id || p.nsId === latest.id);
            if (hasLatest) return prev;
            return [{ ...latest, nsId: latest.id }, ...prev];
          });

          // 1.5. Background weather fetch
          if (
            latest.type === "glucose" &&
            Date.now() - latest.timestamp < 3600000
          ) {
            if (
              userSettingsRef.current?.weatherNeuralEnabled ||
              userSettingsRef.current?.weatherWidgetEnabled
            ) {
              import("./services/weatherService")
                .then(async ({ fetchCurrentWeather }) => {
                  try {
                    const w = await fetchCurrentWeather();
                    if (w) {
                       setNsLogs((prev) => {
                         const updated = [...prev];
                         const idx = updated.findIndex((p) => p.nsId === latest.id || p.id === latest.id);
                         if (idx >= 0) {
                           updated[idx] = { ...updated[idx], weather: sanitizeNested(w) };
                         }
                         return updated;
                       });
                    }
                  } catch (e) {
                    // ignore weather errors in bg
                  }
                })
                .catch(() => {});
            }
          }
        }

        // 2. Extract and save device status
        if (devicestatus) {
          const pumpRef = doc(
            db,
            "artifacts",
            "diacontrolapp",
            "users",
            getEffectiveUid(user),
            "status",
            "pump",
          );

          setDoc(pumpRef, sanitizeNested({ ...devicestatus }), {
            merge: true,
          }).catch(() => {});
        }

        // 3. FULL SYNC logic for all remaining entries and treatments
        const allNewLogs = [...entries, ...treatments];
        const existingLogs = logsRef.current;

        const isDuplicate = (newLog: LogEntry) => {
          return existingLogs.some((l) => {
            if (l.nsId && newLog.id && l.nsId === newLog.id) return true;
            if (l.id && newLog.id && l.id === newLog.id) return true;

            const timeDiff = Math.abs(l.timestamp - newLog.timestamp);
            const isSimilarTime = timeDiff < 2 * 60 * 1000;
            const isSameType = l.type === newLog.type;

            if (isSameType && isSimilarTime) {
              if (l.type === "glucose")
                return Math.abs(l.value - newLog.value) < 1;
              if (l.userModified) return true;
              return Math.abs(l.value - newLog.value) < 0.1;
            }

            if (
              isSimilarTime &&
              ((l.type === "bolus" && newLog.type === "meal") ||
                (l.type === "meal" && newLog.type === "bolus"))
            ) {
              const mealVal = l.type === "meal" ? l.value : l.linkedMeal?.carbs;
              const newMealVal =
                newLog.type === "meal"
                  ? newLog.value
                  : newLog.linkedMeal?.carbs;
              if (
                mealVal !== undefined &&
                newMealVal !== undefined &&
                Math.abs(mealVal - newMealVal) < 1
              )
                return true;
            }
            return false;
          });
        };

        const uniqueNSLogs: LogEntry[] = [];
        allNewLogs.forEach((n) => {
          if (
            !uniqueNSLogs.some(
              (u) =>
                u.type === n.type &&
                Math.abs(u.timestamp - n.timestamp) < 60000 &&
                Math.abs(u.value - n.value) < 0.01,
            )
          ) {
            uniqueNSLogs.push(n);
          }
        });

        const newLogsToSync = uniqueNSLogs.filter(
          (newLog) => !isDuplicate(newLog) && (!newLog.id || !deletedNsIdsRef.current.has(newLog.id))
        );

        if (newLogsToSync.length > 0) {
          console.log(`Worker synced ${newLogsToSync.length} new records to memory`);
          
          setNsLogs((prev) => {
             const all = [...prev, ...newLogsToSync];
             return all.sort((a,b) => b.timestamp - a.timestamp).slice(0, 45000);
          });
        }
        
        setSyncStatus({ status: "success", lastSync: Date.now() });
        window.dispatchEvent(new CustomEvent("nightscout-sync-result", { detail: { success: true } }));
      }

      if (type === 'SYNC_ERROR') {
        console.error("Worker sync error:", payload);
        setSyncStatus({ status: "error", lastSync: Date.now() });
        window.dispatchEvent(new CustomEvent("nightscout-sync-result", { detail: { success: false, payload } }));
      }
    };

    worker.postMessage({ type: 'START_SYNC', payload: { url: nsUrl, secret: nsSecret, intervalMs: 5 * 60 * 1000, count: 3000 } });
    setSyncStatus((prev) => ({ ...prev, status: "syncing" }));

    const handleForceSync = () => {
      console.log("Force sync manually triggered (Worker)");
      setSyncStatus((prev) => ({ ...prev, status: "syncing" }));
      // Stopping and starting again forces an immediate wipe/sync in worker
      worker.postMessage({ type: 'STOP_SYNC' });
      worker.postMessage({ type: 'START_SYNC', payload: { url: nsUrl, secret: nsSecret, intervalMs: 5 * 60 * 1000, count: 3000 } });
    };

    window.addEventListener("force-nightscout-sync", handleForceSync);
    
    const handleHypoAlert = (e: any) => {
      if (userSettingsRef.current?.notificationsEnabled === false) return;
      const prefs = userSettingsRef.current?.notificationPrefs;
      if (prefs?.hypoProtection !== false) {
        // debounce check (e.g. 1 hour)
        const lastSent = parseInt(localStorage.getItem('last_hypo_protect_alert') || '0', 10);
        if (Date.now() - lastSent > 60 * 60 * 1000) {
          localStorage.setItem('last_hypo_protect_alert', Date.now().toString());
          import("./services/notificationService").then(mod => {
            mod.notificationService.sendHypoProtectionAlert();
          });
        }
      }
    };
    window.addEventListener("glikosense_hypo_alert", handleHypoAlert);

    // Wymuś odświeżenie Nightscouta gdy wracamy z tła (rozwiązuje problem zacinania na Androidzie)
    const appStateListener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        console.log("App resumed to foreground, forcing Nightscout worker sync");
        handleForceSync();
      }
    });

    return () => {
      worker.postMessage({ type: 'STOP_SYNC' });
      worker.terminate();
      window.removeEventListener("force-nightscout-sync", handleForceSync);
      window.removeEventListener("glikosense_hypo_alert", handleHypoAlert);
      appStateListener.then(listener => listener.remove());
    };
  }, [user, nsUrl]);

  // Globalna obsługa sprzętowego przycisku Back (Android) i gestu "Wstecz"
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const backListener = CapacitorApp.addListener('backButton', () => {
      // 1. Sprawdź, czy na ekranie wisi jakiekolwiek okno modalne, popup lub otwarte menu z tłem
      // .fixed.inset-0 to wspólny mianownik dla wszystkich okien modalnych i popupów
      const allModals = document.querySelectorAll('.fixed.inset-0, [role="dialog"]');
      const modals = Array.from(allModals).filter(m => !m.classList.contains('-z-10') && !m.classList.contains('pointer-events-none'));
      
      if (modals.length > 0) {
        // Pobieramy najwyższe okno (ostatnie w DOM)
        const topModal = modals[modals.length - 1];
        
        // Szukamy w tym oknie przycisku do zamykania/anulowania
        const closeBtn = topModal.querySelector('button[aria-label="Zamknij"], button[aria-label="Close"], button[title="Zamknij"], button[aria-label="Cofnij"]') 
                         || Array.from(topModal.querySelectorAll('button')).find(b => 
                              b.textContent?.toLowerCase().includes('zamknij') || 
                              b.textContent?.toLowerCase().includes('anuluj') ||
                              b.textContent?.toLowerCase().includes('close') ||
                              b.querySelector('.lucide-x, .lucide-chevron-left')
                            );

        if (closeBtn && typeof (closeBtn as HTMLElement).click === 'function') {
          (closeBtn as HTMLElement).click();
        } else {
          // Fallback: kliknij w samo ciemne tło (często ma przypisane zamknięcie)
          (topModal as HTMLElement).click();
        }
      } else {
        // Brak okien modalnych - obsługujemy nawigację w zakładkach
        if (activeTab !== 'dashboard') {
          changeTab('dashboard');
        } else {
          // Jeśli już jesteśmy na pulpicie domyślnym, wyjście z aplikacji schowa ją do tła (minimalizacja)
          CapacitorApp.minimizeApp();
        }
      }
    });

    return () => {
      backListener.then(listener => listener.remove());
    };
  }, [activeTab, changeTab]);

  const toggleTheme = async () => {
    const newTheme: "light" | "dark" = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (userSettings && user) {
      setUserSettings((prev) => (prev ? { ...prev, theme: newTheme } : null));
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
    } else {
      localStorage.setItem("theme", newTheme);
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(newTheme);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setAuthError(e.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setAuthError(i18n.t('auto.podaj_adres_email_aby_zresetow', { defaultValue: i18n.t('auto.podaj_adres_email_aby_zre', { defaultValue: "Podaj adres email aby zresetować hasło." }) }));
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(i18n.t('auto.link_do_resetowania_hasla_zost', { defaultValue: i18n.t('auto.link_do_resetowania_hasla', { defaultValue: "Link do resetowania hasła został wysłany na Twój email." }) }));
      setAuthError("");
    } catch (e: any) {
      let msg = e.message;
      if (e.code === "auth/user-not-found")
        msg = i18n.t('auto.nie_znaleziono_uzytkownika_o_t', { defaultValue: i18n.t('auto.nie_znaleziono_uzytkownik', { defaultValue: "Nie znaleziono użytkownika o tym adresie email." }) });
      if (e.code === "auth/invalid-email") msg = i18n.t('auto.bledny_format_adresu_email', { defaultValue: i18n.t('auto.bledny_format_adresu_emai', { defaultValue: "Błędny format adresu email." }) });
      setAuthError(msg);
    }
  };

  const handleRegister = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setAuthError(e.message);
    }
  };

  const handleAnonymous = async () => {
    try {
      await signInAnonymously(auth);
    } catch (e: any) {
      if (e.code === "auth/operation-not-allowed") {
        toast.error(
          i18n.t('auto.logowanie_jako_gosc_anonymous', { defaultValue: i18n.t('auto.logowanie_jako_gosc_anony', { defaultValue: "Logowanie jako gość (Anonymous Auth) jest wyłączone w Twoim projekcie Firebase. Włącz je w konsoli Firebase lub użyj konta Google." }) }),
          { duration: 6000 },
        );
      }
      setAuthError(e.message);
    }
  };

  const handleGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (result.credential?.idToken) {
           const credential = GoogleAuthProvider.credential(result.credential.idToken);
           await signInWithCredential(auth, credential);
        }
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } catch (e: any) {
      console.error("Google Auth Error:", e);
      setAuthError(e.message || i18n.t('auto.blad_logowania_google', { defaultValue: i18n.t('auto.blad_logowania_google', { defaultValue: "Błąd logowania Google" }) }));
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading || showSplash) {
    return <GlikoControlLogo />;
  }

  if (!user) {
    return (
      <div
        className={cn(
          "min-h-[100dvh] flex items-center justify-center p-4 transition-colors duration-500",
          theme === "dark" ? "bg-slate-950" : "bg-slate-50",
        )}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "w-full max-w-sm p-10 rounded-[3.5rem] shadow-2xl text-center border transition-all duration-500",
            theme === "dark"
              ? "bg-slate-900/60 backdrop-blur-3xl border-slate-800/50"
              : "bg-white border-slate-200",
          )}
        >
          <div className="flex items-center justify-center gap-4 mb-2">
            <Logo className="w-14 h-14" />
            <h2
              className={cn(
                "text-3xl font-black tracking-tight",
                theme === "dark" ? "text-white" : "text-slate-900",
              )}
            >
              
                                      {t('auto.glikocontrol_v', { defaultValue: 'GlikoControl v' })}{CURRENT_VERSION}
            </h2>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">
            
                                {t('auto.zintegrowany_system_glikemii', { defaultValue: 'Zintegrowany System Glikemii' })}
                              </p>
          <p className="text-accent-400 text-xs font-bold mb-8 italic">
            
                                {t('auto.glikocontrol_ai', { defaultValue: 'GlikoControl AI' })}
                              </p>

          <div className="space-y-4 mb-6">
            <input
              type="email"
              placeholder={t('auto.email', { defaultValue: 'Email' })}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "w-full p-4 rounded-2xl text-sm font-bold border outline-none focus:border-accent-500 transition-all",
                theme === "dark"
                  ? "bg-slate-800/50 border-slate-700/50 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-900",
              )}
            />
            <input
              type="password"
              placeholder={t('auto.hasło', { defaultValue: i18n.t('auto.haslo', { defaultValue: "Hasło" }) })}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "w-full p-4 rounded-2xl text-sm font-bold border outline-none focus:border-accent-500 transition-all",
                theme === "dark"
                  ? "bg-slate-800/50 border-slate-700/50 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-900",
              )}
            />
            <div className="flex justify-end px-2">
              <button
                onClick={() => {
                  Haptics.selection();
                  handleForgotPassword();
                }}
                className="text-[10px] font-bold text-accent-500 hover:text-accent-400 transition-colors uppercase tracking-widest"
              >
                
                                            {t('auto.zapomniałeś_hasła', { defaultValue: i18n.t('auto.zapomniales_hasla', { defaultValue: "Zapomniałeś hasła?" }) })}
                                          </button>
            </div>
          </div>

          {authError && (
            <div className="mb-4 bg-rose-500/10 p-3 rounded-xl flex flex-col gap-2">
              <p className="text-rose-500 text-[10px] font-bold">{authError}</p>
              {authError.includes("NOWEJ KARCIE") && (
                <button
                  onClick={() => window.open(window.location.href, "_blank")}
                  className="bg-rose-500/20 text-rose-600 text-[8px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg w-fit hover:bg-rose-500/30 transition-colors"
                >
                  
                                                  {t('auto.otwórz_w_nowej_karcie', { defaultValue: i18n.t('auto.otworz_w_nowej_karcie', { defaultValue: "Otwórz w nowej karcie" }) })}
                                                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => {
                Haptics.medium();
                handleLogin();
              }}
              className="flex items-center justify-center gap-2 bg-accent-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-accent-600/30 active:scale-95 transition-all"
            >
              <LogIn size={14} />
              
                                      {t('auto.wejdź', { defaultValue: i18n.t('auto.wejdz', { defaultValue: "Wejdź" }) })}
                                    </button>
            <button
              onClick={() => {
                Haptics.medium();
                handleRegister();
              }}
              className={cn(
                "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all",
                theme === "dark"
                  ? "bg-slate-800 text-slate-300"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              
                                      {t('auto.rejestracja', { defaultValue: 'Rejestracja' })}
                                    </button>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                Haptics.impact();
                handleGoogle();
              }}
              className={cn(
                "flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border shadow-sm active:scale-95 transition-all",
                theme === "dark"
                  ? "bg-slate-950 text-white border-slate-800"
                  : "bg-white text-slate-700 border-slate-200",
              )}
            >
              <img src="/google.svg" alt="Google" className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                
                                            {t('auto.kontynuuj_przez_google', { defaultValue: 'Kontynuuj przez Google' })}
                                          </span>
            </button>

            <button
              onClick={() => {
                Haptics.impact();
                handleAnonymous();
              }}
              className={cn(
                "flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border shadow-sm active:scale-95 transition-all mt-2",
                theme === "dark"
                  ? "bg-accent-500/10 text-accent-400 border-accent-500/20"
                  : "bg-accent-50 text-accent-600 border-accent-100",
              )}
            >
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                
                                            {t('auto.logowanie_bez_konta_gość', { defaultValue: i18n.t('auto.logowanie_bez_konta_gosc', { defaultValue: "Logowanie bez konta (Gość)" }) })}
                                          </span>
            </button>

            <p
              className={cn(
                "text-[9px] text-center mt-2 leading-tight",
                theme === "dark" ? "text-slate-500" : "text-slate-400",
              )}
            >
              
                                      {t('auto.uwaga_w_trybie_gościa_po_odświeżeni', { defaultValue: i18n.t('auto.uwaga_w_trybie_goscia_po', { defaultValue: "Uwaga: W trybie Gościa, po odświeżeniu aplikacji (szczególnie w               oknie testowym), dane i adres Nightscout mogą zostać zresetowane.               Użyj konta Google by zapisać je trwale." }) })}
                                    </p>
          </div>

          <button
            onClick={toggleTheme}
            className="mt-8 p-3 rounded-full hover:bg-slate-500/10 transition-colors"
          >
            {theme === "light" ? (
              <Moon size={20} className="text-slate-400" />
            ) : (
              <Sun size={20} className="text-amber-400" />
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  const tabs = userSettings?.childMode
    ? [
        "chart",
        "dashboard",
        "database",
        "meal",
        "chat",
        "assistant",
        "ai",
        "profile",
        "games",
      ]
    : [
        "chart",
        "dashboard",
        "database",
        "meal",
        "assistant",
        "ai",
        "profile",
      ];

  const activeIndex = tabs.indexOf(activeTab);

  const handleSwipe = (_: any, info: any) => {
    const threshold = 50;
    if (info.offset.x > threshold && activeIndex > 0) {
      setDirection(-1);
      setActiveTab(tabs[activeIndex - 1]);
    } else if (info.offset.x < -threshold && activeIndex < tabs.length - 1) {
      setDirection(1);
      setActiveTab(tabs[activeIndex + 1]);
    }
  };

  const tabVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 20 : -20,
      opacity: 0,
    }),
  };
  const currentTabContent = (
    <LocalErrorBoundary>
      <React.Suspense
        fallback={
          <div className="w-full h-full flex flex-col p-4 space-y-4 pt-10 animate-pulse">
            <div className="w-1/3 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="w-full h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="w-full h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          </div>
        }
      >
      {/* 1. Grupa 1: Wykres i Pulpit */}
      {["dashboard", "chart"].includes(activeTab) && (
        <>
          <div className="block lg:hidden w-full">
            {activeTab === "dashboard" && (
              <Dashboard
                logs={logs}
                user={user}
                setTab={changeTab}
                theme={theme}
                initialAction={initialAction}
                onClearInitialAction={() => setInitialAction(null)}
                onAction={(action) => setInitialAction(action)}
                pumpStatus={pumpStatus}
                nsUrl={nsUrl}
                nsSecret={nsSecret}
                petData={petData}
                syncStatus={syncStatus}
                settings={userSettings || DEFAULT_SETTINGS}
                isShortcutMode={isShortcutMode}
              />
            )}
            {activeTab === "chart" && (
              <ChartFullView
                logs={logs}
                settings={userSettings || DEFAULT_SETTINGS}
                theme={theme}
                setTab={changeTab}
              />
            )}
          </div>
          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 w-full items-start">
            <div className="lg:col-span-12 xl:col-span-8">
              <ChartFullView
                logs={logs}
                settings={userSettings || DEFAULT_SETTINGS}
                theme={theme}
                setTab={changeTab}
              />
            </div>
            <div className="lg:col-span-12 xl:col-span-4">
              <Dashboard
                logs={logs}
                user={user}
                setTab={changeTab}
                theme={theme}
                initialAction={initialAction}
                onClearInitialAction={() => setInitialAction(null)}
                onAction={(action) => setInitialAction(action)}
                pumpStatus={pumpStatus}
                nsUrl={nsUrl}
                nsSecret={nsSecret}
                petData={petData}
                syncStatus={syncStatus}
                settings={userSettings || DEFAULT_SETTINGS}
                isShortcutMode={isShortcutMode}
              />
            </div>
          </div>
        </>
      )}

      {/* 2. Grupa 2: Baza i Talerz */}
      {["database", "meal"].includes(activeTab) && (
        <>
          <div className="block lg:hidden w-full">
            {activeTab === "database" && !userSettings?.followerMode && (
              <MealPlate
                key="db-plate"
                user={user}
                setTab={changeTab}
                sharedPlate={sharedPlate}
                setSharedPlate={setSharedPlate}
                mode="search"
                openHistory={() => changeTab("history")}
                settings={userSettings || undefined}
                logs={logs}
              />
            )}
            {activeTab === "meal" && !userSettings?.followerMode && (
              <MealPlate
                key="meal-plate"
                user={user}
                setTab={changeTab}
                sharedPlate={sharedPlate}
                setSharedPlate={setSharedPlate}
                mode="plate"
                openHistory={() => changeTab("history")}
                settings={userSettings || undefined}
                logs={logs}
              />
            )}
          </div>
          <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6 w-full items-start">
            {!userSettings?.followerMode && (
              <>
                <div>
                  <MealPlate
                    key="db-plate-desktop"
                    user={user}
                    setTab={changeTab}
                    sharedPlate={sharedPlate}
                    setSharedPlate={setSharedPlate}
                    mode="search"
                    openHistory={() => changeTab("history")}
                    settings={userSettings || undefined}
                    logs={logs}
                  />
                </div>
                <div>
                  <MealPlate
                    key="meal-plate-desktop"
                    user={user}
                    setTab={changeTab}
                    sharedPlate={sharedPlate}
                    setSharedPlate={setSharedPlate}
                    mode="plate"
                    openHistory={() => changeTab("history")}
                    settings={userSettings || undefined}
                    logs={logs}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* 3. Grupa 3: Czat i GlikoSense */}
      {["chat", "assistant", "ai"].includes(activeTab) && !userSettings?.followerMode && (
        <>
          <div
            className={cn(
              "block lg:hidden w-full",
              (activeTab === "chat" || activeTab === "assistant") && "flex-1 flex flex-col h-full",
            )}
          >
            {activeTab === "chat" && <GlikoChat petData={petData} />}
            {activeTab === "assistant" && (
              <GlikoAssistant
                user={user}
                logs={logs}
                settings={userSettings || undefined}
                petData={petData}
                onAddToPlate={(item) =>
                  setSharedPlate((prev) => [
                    ...prev,
                    {
                      ...item,
                      plateItemId: Math.random().toString(36).substr(2, 9),
                    },
                  ])
                }
                messages={assistantMessages}
                setMessages={setAssistantMessages}
                isTyping={isAssistantTyping}
                onSend={sendAssistantMessage}
              />
            )}
            {activeTab === "ai" && (
              <AiReports user={user} logs={logs} settings={userSettings} setTab={changeTab} />
            )}
          </div>
          <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6 w-full items-start">
            <div>
              <GlikoAssistant
                user={user}
                logs={logs}
                settings={userSettings || undefined}
                petData={petData}
                onAddToPlate={(item) =>
                  setSharedPlate((prev) => [
                    ...prev,
                    {
                      ...item,
                      plateItemId: Math.random().toString(36).substr(2, 9),
                    },
                  ])
                }
                messages={assistantMessages}
                setMessages={setAssistantMessages}
                isTyping={isAssistantTyping}
                onSend={sendAssistantMessage}
              />
            </div>
            <div>
              <AiReports user={user} logs={logs} settings={userSettings} setTab={changeTab} />
            </div>
          </div>
        </>
      )}

      {/* Inne zakładki */}
      {![
        "dashboard",
        "chart",
        "database",
        "meal",
        "chat",
        "assistant",
        "ai",
      ].includes(activeTab) && (
        <div className="w-full max-w-4xl mx-auto">
          {activeTab === "bolus" && !userSettings?.followerMode && (
            <BolusCalculator
              logs={logs}
              user={user}
              setTab={changeTab}
              setSharedPlate={setSharedPlate}
              pumpStatus={pumpStatus}
              isShortcutMode={isShortcutMode}
            />
          )}
          {activeTab === "history" && (
            <HistoryView
              logs={logs}
              user={user}
              onBack={() => changeTab("dashboard")}
              settings={userSettings!}
            />
          )}
          {activeTab === "profile" && (
            <Profile
              user={user}
              logs={logs}
              handleLogout={handleLogout}
              theme={theme}
              toggleTheme={toggleTheme}
              setTab={changeTab}
              initialAction={initialAction}
              onClearInitialAction={() => setInitialAction(null)}
              settings={userSettings || DEFAULT_SETTINGS}
              wsDevices={wsDevices}
              kickDevice={kickDevice}
            />
          )}
          {activeTab === "achievements" && (
            <Achievements
              logs={logs}
              user={user}
              setTab={changeTab}
              petData={petData}
            />
          )}
          {activeTab === "games" && (
            <GlikoGames logs={logs} user={user} setTab={changeTab} />
          )}
          {activeTab === "diets" && (
            <Diets
              user={user}
              setTab={changeTab}
              settings={userSettings || undefined}
              logs={logs}
            />
          )}
          {activeTab === "travel" && (
            <JetLagMode />
          )}
          {activeTab === "insulin_detective" && (
            <InsulinDetective logs={logs} onClose={() => changeTab('dashboard')} />
          )}
        </div>
      )}
    </React.Suspense>
    </LocalErrorBoundary>
  );

  const lastGlucoseValue =
    logs.find((l) => l.type === "glucose")?.value || null;

  return (
    <MotionConfig reducedMotion={userSettings?.ecoMode ? "always" : "user"}>
    <div
      className={cn(
        "min-h-[100dvh] flex flex-col transition-colors duration-500 overflow-x-hidden relative z-10",
        isShortcutMode 
          ? "bg-transparent dark:bg-transparent"
          : (userSettings?.glassmorphismEnabled
              ? "bg-transparent dark:bg-transparent"
              : theme === "dark"
                ? "dark bg-[#020617]"
                : "bg-slate-50"),
      )}
    >
      <NotificationListenerSync user={user} />
      <RemoteAlertsListener user={user} />
      {!isShortcutMode && (
        <MeshBackground
          lastGlucose={lastGlucoseValue}
          isGlassmorphic={userSettings?.glassmorphismEnabled || false}
        />
      )}
      {!isShortcutMode && isOffline && (
        <motion.div
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="bg-slate-900/80 dark:bg-slate-950/80 text-white text-[9px] font-black uppercase text-center py-2.5 z-[100] flex items-center justify-center gap-2 sticky top-0 backdrop-blur-xl border-b border-white/5"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="tracking-widest">
            
                                      {t('auto.tryb_offline_funkcje_mogą_być_ogran', { defaultValue: i18n.t('auto.tryb_offline_funkcje_moga', { defaultValue: "Tryb Offline - Funkcje mogą być ograniczone" }) })}
                                    </span>
        </motion.div>
      )}
      {authError && user && (
        <motion.div
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="bg-rose-500/90 text-white text-[9px] font-black uppercase text-center py-2.5 z-[100] flex items-center justify-center gap-2 sticky top-0 backdrop-blur-xl border-b border-white/10"
        >
          <Activity size={12} />
          <span className="tracking-widest">{authError}</span>
        </motion.div>
      )}
      {/* Header */}
      {!isShortcutMode && (
        <header className="bg-white/40 dark:bg-[#020617]/40 backdrop-blur-2xl p-4 sticky top-0 z-40 border-b border-black/5 dark:border-white/5 pt-12 transition-all">
          <div className="flex justify-between items-center max-w-md md:max-w-5xl lg:max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  Haptics.medium();
                  setIsSidebarOpen(true);
                }}
                className="p-2.5 -ml-2 rounded-2xl bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent dark:border-slate-800 shadow-sm active:scale-90"
              >
                <Menu size={20} strokeWidth={2.5} />
              </button>
              <div
                className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform"
                onClick={() => {
                  Haptics.selection();
                  setShowStatusPopup(true);
                }}
              >
                <Logo className="w-10 h-10 drop-shadow-sm group-hover:rotate-12 transition-transform" />
                <div>
                  <p
                    onClick={(e) => {
                      e.stopPropagation();
                      Haptics.medium();
                      setShowChangelog(true);
                    }}
                    title={t('auto.kliknij_aby_zobaczyć_co_nowego', { defaultValue: i18n.t('auto.kliknij_aby_zobaczyc_co_n', { defaultValue: "Kliknij, aby zobaczyć co nowego" }) })}
                    className="text-accent-500 hover:text-accent-400 text-[7px] font-black uppercase tracking-[0.2em] mt-1 opacity-90 flex items-center gap-1.5 font-mono cursor-pointer transition-colors hover:scale-105 active:scale-95"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
                    v{APP_VERSION}
                  </p>
                </div>
              </div>
            </div>
          <div className="flex items-center gap-2">
            <NotebookManager user={user} />
            <NotificationCenter userSettings={userSettings} theme={theme} />
            <button
              onClick={() => {
                Haptics.light();
                toggleTheme();
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-accent-400 border border-transparent dark:border-slate-700 transition-all active:scale-90"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {user && !user.isAnonymous && user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-7 h-7 rounded-full border border-accent-500/50 shadow-sm"
              />
            ) : (
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)] ml-2" />
            )}
          </div>
        </div>
      </header>
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        changeTab={changeTab}
        onAction={(action) => {
          if (action === "tutorial") {
            setShowTutorial(true);
          } else {
            setInitialAction(action);
          }
        }}
        theme={theme}
        isChildMode={userSettings?.childMode}
        settings={userSettings}
      />

      {/* Main Content with Swipe Navigation */}
      <main
        ref={mainRef}
        className="flex-1 max-w-md md:max-w-5xl lg:max-w-7xl mx-auto w-full relative overflow-y-auto touch-pan-y overflow-x-hidden"
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: "easeOut" }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleSwipe}
            className={cn(
              "w-full min-h-full p-4 pb-32 flex flex-col",
            )}
          >
            {currentTabContent}
          </motion.div>
        </AnimatePresence>
      </main>
      {/* Navigation */}
      {!isShortcutMode && (
        <nav className={cn(
          "fixed bottom-0 left-0 right-0 glass backdrop-blur-3xl border-t border-white/40 dark:border-white/5 z-50 pb-safe rounded-t-[2.5rem] shadow-2xl transition-all duration-300",
          isKeyboardOpen ? "opacity-0 pointer-events-none translate-y-24" : "opacity-100 translate-y-0"
        )}>
        <div className="max-w-md md:max-w-5xl lg:max-w-7xl mx-auto flex items-center justify-around h-20 px-2 group">
          <NavButton
            active={activeTab === "chart"}
            onClick={() => changeTab("chart")}
            icon={<Activity />}
            label={t("nav.chart")}
            ecoMode={userSettings?.ecoMode}
          />
          <NavButton
            active={activeTab === "dashboard"}
            onClick={() => changeTab("dashboard")}
            icon={<LayoutDashboard />}
            label={t("nav.dashboard")}
            ecoMode={userSettings?.ecoMode}
          />
          {!userSettings?.followerMode && (
            <NavButton
              active={activeTab === "database"}
              onClick={() => changeTab("database")}
              icon={<Database />}
              label={t("nav.database")}
              ecoMode={userSettings?.ecoMode}
            />
          )}

          {!userSettings?.followerMode && (
            <div className="relative -top-6">
              <motion.button
                onClick={() => changeTab("meal")}
                whileTap={{ scale: 0.85 }}
                animate={{ y: activeTab === "meal" ? -5 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-shadow shadow-xl border-4 border-slate-50 dark:border-slate-950 relative",
                  activeTab === "meal"
                    ? "bg-accent-600 text-white shadow-accent-500/40"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700",
                )}
              >
                {mealProgress !== null && (
                  <svg
                    className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none"
                    viewBox="0 0 56 56"
                  >
                    <circle
                      cx="28"
                      cy="28"
                      r="26"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray="163.36"
                      strokeDashoffset={163.36 * mealProgress}
                      className="text-emerald-500 transition-all duration-1000 dark:text-emerald-400 opacity-80"
                    />
                  </svg>
                )}
                <motion.div
                  animate={{
                    rotate: activeTab === "meal" ? [0, -20, 20, -10, 10, 0] : 0,
                  }}
                  transition={{ duration: 0.5 }}
                  className="z-10"
                >
                  <Utensils />
                </motion.div>
                {sharedPlate.length > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-50 dark:border-slate-950 shadow-sm z-20"
                  >
                    {sharedPlate.length}
                  </motion.div>
                )}
              </motion.button>
              <motion.div
                animate={{
                  opacity: activeTab === "meal" ? 1 : 0.6,
                  y: activeTab === "meal" ? -2 : 0,
                }}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase tracking-widest text-slate-400"
              >
                {t("nav.plate")}
              </motion.div>
            </div>
          )}

          {!userSettings?.followerMode && (
            <NavButton
              active={activeTab === "assistant"}
              onClick={() => changeTab("assistant")}
              icon={<MessageSquare />}
              label={t("nav.chat")}
              ecoMode={userSettings?.ecoMode}
            />
          )}
          {!userSettings?.followerMode && (
            <NavButton
              active={activeTab === "ai"}
              onClick={() => changeTab("ai")}
              icon={<GlikoSenseIcon size={20} isAnalyzing={activeTab === "ai"} />}
              label={t("nav.glikosense")}
              ecoMode={userSettings?.ecoMode}
            />
          )}
          <NavButton
            active={activeTab === "profile"}
            onClick={() => changeTab("profile")}
            icon={<Menu />}
            label={t("nav.more")}
            ecoMode={userSettings?.ecoMode}
          />
        </div>
      </nav>
      )}

      {/* Modals & Popups */}
      <UpdateModal />
      <Toaster
        position="top-center"
        containerStyle={{ top: 'max(env(safe-area-inset-top), 50px)' }}
        toastOptions={{
          className:
            "glass-card !text-slate-900 dark:!text-white !border-black/5 dark:!border-white/10 !shadow-2xl !rounded-[1.5rem] !text-[10px] !font-black !uppercase !tracking-widest !font-display !pl-6 !pr-2 !py-2 flex items-center justify-between min-w-[300px]",
          duration: 4000,
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#f43f5e",
              secondary: "#fff",
            },
          },
        }}
      >
        {(toastItem) => (
          <ToastBar toast={toastItem} style={{ padding: 0, background: 'transparent', boxShadow: 'none' }}>
            {({ icon, message }) => (
              <div className="flex items-center gap-3 w-full">
                {icon}
                <div className="flex-1 min-w-0 pr-2">
                  {message}
                </div>
                {toastItem.type !== 'loading' && (
                  <button
                    onClick={() => toast.dismiss(toastItem.id)}
                    className="p-2 ml-auto rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors shrink-0 group flex items-center justify-center hover:scale-110 active:scale-95"
                    aria-label={t('auto.zamknij_powiadomienie', { defaultValue: 'Zamknij powiadomienie' })}
                  >
                    <X size={18} className="drop-shadow-sm group-hover:drop-shadow-md" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            )}
          </ToastBar>
        )}
      </Toaster>
      <AnimatePresence>
        {showTutorial && (
          <OnboardingTutorial
            onComplete={async (mode) => {
              setShowTutorial(false);
              localStorage.setItem("hasSeenTutorial", "true");
              localStorage.setItem("treatmentMode", mode); // Fallback offline
              
              setUserSettings((prev: any) => ({ 
                ...(prev || {}), 
                treatmentMode: mode 
              }));

              if (user) {
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
                    { treatmentMode: mode },
                    { merge: true },
                  );
                } catch (e) {
                  console.error("Failed to save treatmentMode", e);
                }
              }
            }}
          />
        )}
        {showPrivacyPopup && <PrivacyPopup onAccept={handleAcceptPrivacy} />}
        {showChangelog && <ChangelogPopup onClose={handleCloseChangelog} />}
      </AnimatePresence>

      <QuickStatusPopup
        isOpen={showStatusPopup}
        onClose={() => setShowStatusPopup(false)}
        logs={logs}
        lastGlucose={lastGlucoseValue}
        iob={getEffectiveIOB(logs, pumpStatus, userSettings?.dia || 4)}
      />

    </div>
    </MotionConfig>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  ecoMode,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  ecoMode?: boolean;
}) {
  return (
    <button
      onClick={() => {
        Haptics.light();
        onClick();
      }}
      className={cn(
        "flex flex-col items-center gap-1 relative flex-1 max-w-[60px] h-full justify-center transition-colors outline-none",
        active
          ? "text-accent-600 dark:text-accent-400"
          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
      )}
    >
      <motion.div
        animate={{
          scale: active ? [0.8, 1.2, 1] : 1,
          y: active ? -2 : 0,
        }}
        transition={{ duration: 0.3 }}
        whileTap={{ scale: 0.8 }}
      >
        {React.cloneElement(icon, { size: 20 })}
      </motion.div>
      <motion.span
        animate={{ opacity: active ? 1 : 0.7 }}
        className="text-[7px] font-black uppercase tracking-widest mt-0.5"
      >
        {label}
      </motion.span>
      {active && (
        <motion.div
          layoutId={ecoMode ? undefined : "nav-indicator"}
          className="absolute bottom-2 w-1 h-1 rounded-full bg-accent-600 dark:bg-accent-400"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </button>
  );
}



