import {
 calculateIOB,
 calculateCOB,
 getEffectiveUid,
 getEffectiveIOB as getEffectiveIOBUtils,
 getMealAbsorptionTime,
} from "./lib/utils";
import { Capacitor, registerPlugin } from "@capacitor/core";
const MaterialYou = registerPlugin("MaterialYou");
import { App as CapacitorApp } from "@capacitor/app";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuthStore } from './stores/useAuthStore';
import { useAppStore } from './stores/useAppStore';
import {
 Activity, Database, Utensils, FileText, Settings, Plus, Scan, TrendingUp, Zap, LogOut, Bell, CheckCircle2, History, Apple, ChevronRight, Search, Camera, Trash2, Save, MessageSquare, Globe, Sun, Moon, LogIn, Menu, LayoutDashboard, Beaker, Sparkles, X,
} from "lucide-react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { auth, db } from "./lib/firebase";
import { dbService } from "./services/databaseService";
import {
 onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, signInWithCustomToken, signInWithCredential,
} from "firebase/auth";
import {
 collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc, getDoc, getDocFromServer, setDoc, deleteDoc, writeBatch, limit,
} from "firebase/firestore";
import {
 LogEntry, UserSettings, Product, PlateItem, AssistantMessage,
} from "./types";
import { geminiService } from "./services/gemini";
import { CATEGORIES, APP_VERSION } from "./constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { notificationService } from "./services/notificationService";
import { Toaster, toast, ToastBar } from "react-hot-toast";

import { useNightscoutWorker } from "./hooks/useNightscoutWorker";
import { NotificationBridge } from './lib/notificationBridge';
import { useLogsStore } from "./stores/useLogsStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePetStatus, useNightscoutSettings, useUserSettings, usePumpStatus } from "./hooks/queries/useProfileData";
import { useGlikoServer } from "./hooks/useGlikoServer";
import { useAppSubscriptions } from "./hooks/useAppSubscriptions";

import Logo from "./components/Logo";
import GlikoControlLogo from "./components/LogoAnimation";
import { CURRENT_VERSION } from "./constants/versions";

import { MigrationManager } from "./components/MigrationManager";
import { AppLayout } from "./components/app/AppLayout";
import { AppContent } from "./components/app/AppContent";

import { Haptics } from "./lib/haptics";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import { cn } from "./lib/utils";



const EMPTY_ARRAY: any[] = [];

export default function App() {
  const {
    showSplash, isShortcutMode, activeTab, authError, theme, initialAction,
    isOffline, syncStatus, showTutorial, showChangelog, showPrivacyPopup,
    showStatusPopup, privacyLoading, direction, isSidebarOpen, isKeyboardOpen,
    setShowSplash, setIsShortcutMode, setActiveTab, setAuthError, setTheme,
    setInitialAction, setIsOffline, setSyncStatus, setShowTutorial,
    setShowChangelog, setShowPrivacyPopup, setShowStatusPopup, setPrivacyLoading,
    setDirection, setIsSidebarOpen, setIsKeyboardOpen,
    email, setEmail, password, setPassword, assistantMessages, setAssistantMessages,
    isAssistantTyping, setIsAssistantTyping, wsDevices, setWsDevices, mealProgress, setMealProgress
  } = useAppStore();
  const { t } = useTranslation();
  const { user, loading, initAuthListener } = useAuthStore();
  useAppSubscriptions(user);
  const { data: fbPumpStatus = null } = usePumpStatus(user);
  const { data: userSettings = null } = useUserSettings(user) as any;
  const { data: nsSettings } = useNightscoutSettings(user);
  
  const userSettingsRef = useRef(userSettings);
  useEffect(() => { userSettingsRef.current = userSettings; }, [userSettings]);
  const deletedNsIdsRef = useRef(new Set<string>());

  const { nsLogs, nsDeviceStatus } = useNightscoutWorker(
    user, 
    nsSettings?.url || "", 
    nsSettings?.secret || "", 
    userSettingsRef, 
    deletedNsIdsRef
  );
  
    const pumpStatus = {
      ...(fbPumpStatus || {}),
      ...(nsDeviceStatus || {}),
      // Zabezpieczenie przed uciętymi payloadami z Nightscout (np. gdy telefon dosłał samą baterię bez stanu zbiorniczka pompy)
      reservoir: nsDeviceStatus?.reservoir !== undefined ? nsDeviceStatus.reservoir : (fbPumpStatus?.reservoir || 0),
      battery: nsDeviceStatus?.battery !== undefined ? nsDeviceStatus.battery : (fbPumpStatus?.battery || 0),
      activeInsulin: nsDeviceStatus?.activeInsulin !== undefined ? nsDeviceStatus.activeInsulin : (fbPumpStatus?.activeInsulin || 0)
    };
  
  const mainRef = useRef<HTMLDivElement>(null);
    const { logs, setLogs } = useLogsStore();
    const [sqliteLogs, setSqliteLogs] = useState<any[]>([]);
    
    // Inicjalizacja bazy SQLite i pobranie głębokiej historii
    useEffect(() => {
      const initDB = async () => {
        await dbService.init();
        const loadedLogs = await dbService.getLogs(60000);
        if (loadedLogs.length === 0) {
          const hadSafeTs = !!localStorage.getItem("lastSafeTimestamp");
          localStorage.removeItem("lastSafeTimestamp");
          if (hadSafeTs) {
            window.location.reload();
            return;
          }
        }
        setSqliteLogs(loadedLogs);
      };
      initDB();
    }, []);

    // Cichy nasłuch na natychmiastowe aktualizacje lokalne (Optimistic UI) - naprawia niewidzialne wkłucia/sensory
    useEffect(() => {
      const handleLocalAdd = (e: any) => setSqliteLogs(prev => [e.detail, ...prev]);
      const handleLocalAddBatch = (e: any) => setSqliteLogs(prev => [...e.detail, ...prev]);
      const handleLocalUpdate = (e: any) => {
        const { id, updates } = e.detail;
        setSqliteLogs(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
      };
      const handleLocalDelete = (e: any) => {
        const id = e.detail.id;
        setSqliteLogs(prev => prev.filter(l => l.id !== id));
      };

      window.addEventListener('localLogAdd', handleLocalAdd);
      window.addEventListener('localLogAddBatch', handleLocalAddBatch);
      window.addEventListener('localLogUpdate', handleLocalUpdate);
      window.addEventListener('localLogDelete', handleLocalDelete);

      return () => {
        window.removeEventListener('localLogAdd', handleLocalAdd);
        window.removeEventListener('localLogAddBatch', handleLocalAddBatch);
        window.removeEventListener('localLogUpdate', handleLocalUpdate);
        window.removeEventListener('localLogDelete', handleLocalDelete);
      };
    }, []);

    const { data: fbLogs = EMPTY_ARRAY } = useQuery({ 
      queryKey: ['fbLogs', user ? getEffectiveUid(user) : ''], 
      enabled: !!user, 
      queryFn: () => EMPTY_ARRAY 
    });

    // Cichy zapis nowych danych z chmury do "twardego dysku" (Local-First)
    useEffect(() => {
      if (fbLogs.length === 0) return;
      const timeoutId = setTimeout(() => {
        dbService.saveMultipleLogs(fbLogs).catch(e => console.warn("Background DB save failed", e));
      }, 5000);
      return () => clearTimeout(timeoutId);
    }, [fbLogs]);
  
    useEffect(() => {
      const allMap = new Map();
      // Najpierw ładujemy "chłodną" historię ze SQLite
      sqliteLogs.forEach((l: any) => allMap.set(l.id, l));
      // Nadpisujemy nowszymi "gorącymi" logami z chmury Firebase
      fbLogs.forEach((l: any) => allMap.set(l.id, l));
      // Doklejamy ewentualne bezpośrednie uderzenia z Nightscout API
      nsLogs.forEach((l: any) => {
        if (!allMap.has(l.id)) allMap.set(l.id, l);
      });
      const combined = Array.from(allMap.values()).sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
      setLogs(combined);
    }, [sqliteLogs, fbLogs, nsLogs, setLogs]);

  const lastGlucoseValue = useMemo(() => {
    const gl = logs.filter((l: any) => l.type === 'glucose' || l.type === 'sgv');
    if (gl.length === 0) return null;
    gl.sort((a: any, b: any) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));
    return gl[0].value || null;
  }, [logs]);
  
  // Provide missing methods
  const changeTab = setActiveTab;
  const kickDevice = () => {};
  const getEffectiveIOB = () => getEffectiveIOBUtils(logs, pumpStatus, userSettings?.dia || 4);
  const handleAcceptPrivacy = () => setShowPrivacyPopup(false);
  const handleCloseChangelog = () => setShowChangelog(false);
  const setUserSettings = () => {};
  
  const sendAssistantMessage = async (msg: string) => {
      setAssistantMessages((prev: any[]) => [...prev, { id: Date.now().toString(), role: 'user', content: msg, timestamp: Date.now() }]);
      setIsAssistantTyping(true);
      setTimeout(() => {
          setAssistantMessages((prev: any[]) => [...prev, { id: Date.now().toString(), role: 'assistant', content: "To jest przykładowa odpowiedź.", timestamp: Date.now() }]);
          setIsAssistantTyping(false);
      }, 1000);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateProgress = () => {
      const absorbingMeals = logs
        .filter((l) => l.type === "meal")
        .map((m) => {
          const mWW = m.value !== undefined ? m.value / 10 : (m as any).carbs !== undefined ? (m as any).carbs / 10 : 0;
          const mWBT = ((m.protein || 0) * 4 + (m.fat || 0) * 9) / 100;
          const durationH = getMealAbsorptionTime(mWW, mWBT);
          const durationMs = durationH * 60 * 60 * 1000;
          const endTimeMs = (m.timestamp || 0) + durationMs;
          const isCurrentlyAbsorbing = Date.now() < endTimeMs && durationH > 0;
          return { m, durationH, endTimeMs, isCurrentlyAbsorbing };
        })
        .filter((x) => x.isCurrentlyAbsorbing);

      if (absorbingMeals.length > 0) {
        absorbingMeals.sort((a, b) => b.endTimeMs - a.endTimeMs);
        const active = absorbingMeals[0];
        const ageH = (Date.now() - (active.m.timestamp || 0)) / (1000 * 60 * 60);
        setMealProgress(Math.max(0, Math.min(1, ageH / active.durationH)));
      } else {
        setMealProgress(null);
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 60000); // Aktualizacja co minutę
    return () => clearInterval(interval);
  }, [logs, setMealProgress]);

  // Automatyczny popup nowości (Changelog)
  useEffect(() => {
    const lastSeen = localStorage.getItem("lastSeenVersion");
    if (lastSeen !== CURRENT_VERSION) {
      setTimeout(() => {
        setShowChangelog(true);
        localStorage.setItem("lastSeenVersion", CURRENT_VERSION);
      }, 3000); // Opóźniamy, by nie zablokowało logowania / ładowania UI
    }
  }, [setShowChangelog]);

  useEffect(() => {
    const unsubscribe = initAuthListener(setShowTutorial);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Synchronizacja ustawień wizualnych z elementem root HTML
  useEffect(() => {
    const root = document.documentElement;
    
    // 1. Tryb ciemny / jasny (priorytet: AppStore, potem UserSettings, potem system)
    const activeTheme = theme || userSettings?.theme || (localStorage.getItem("theme") as "light" | "dark" | "system") || "system";
    
    const isDark = activeTheme === 'dark' || (activeTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

      // 2. Akcenty i tła
      let activeAccent = userSettings?.accentColor || localStorage.getItem("accentColor") || "blue";
      
      const applyColors = async () => {
        // Zawsze czyścimy customowe style na starcie
        root.style.removeProperty('--app-accent-50');
        root.style.removeProperty('--app-accent-100');
        root.style.removeProperty('--app-accent-200');
        root.style.removeProperty('--app-accent-300');
        root.style.removeProperty('--app-accent-400');
        root.style.removeProperty('--app-accent-500');
        root.style.removeProperty('--app-accent-600');
        root.style.removeProperty('--app-accent-700');
        root.style.removeProperty('--app-accent-800');
        root.style.removeProperty('--app-accent-900');
        root.style.removeProperty('--app-accent-950');

        if (userSettings?.dynamicColorsEnabled) {
          try {
            if (Capacitor.isNativePlatform()) {
              const result = await MaterialYou.getColors();
              if (result && result.supported) {
                root.style.setProperty('--app-accent-50', result.color50);
                root.style.setProperty('--app-accent-100', result.color100);
                root.style.setProperty('--app-accent-200', result.color200);
                root.style.setProperty('--app-accent-300', result.color300);
                root.style.setProperty('--app-accent-400', result.color400);
                root.style.setProperty('--app-accent-500', result.color500);
                root.style.setProperty('--app-accent-600', result.color600);
                root.style.setProperty('--app-accent-700', result.color700);
                root.style.setProperty('--app-accent-800', result.color800);
                root.style.setProperty('--app-accent-900', result.color900);
                root.style.setProperty('--app-accent-950', result.color950);
                root.setAttribute("data-accent", "native");
                return;
              }
            }
          } catch (e) {
            console.warn("MaterialYou plugin error", e);
          }

          // Fallback dla PWA / iOS / stary Android
          const accents = ['blue', 'rose', 'amber', 'violet', 'emerald'];
          const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
          activeAccent = accents[dayOfYear % accents.length];
        }
        
        root.setAttribute("data-accent", activeAccent);
      };
      
      applyColors();
      
      root.setAttribute("data-bg", userSettings?.bgOption || "default");
    
    // 3. Efekty wizualne (szkło, material 3, eco)
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
    
  }, [
    theme,
    userSettings?.theme,
    userSettings?.accentColor,
    userSettings?.bgOption,
    userSettings?.glassmorphismEnabled,
    userSettings?.material3Enabled,
    userSettings?.ecoMode,
    userSettings?.dynamicColorsEnabled,
  ]);

  // Synchronizacja początkowa motywu ze Store
  useEffect(() => {
    if (userSettings?.theme && userSettings.theme !== theme) {
      setTheme(userSettings.theme);
    } else if (!theme) {
      const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system";
      if (savedTheme) setTheme(savedTheme);
    }
  }, [userSettings?.theme]);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    if (user && userSettings) {
      try {
        await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"), {
          theme: newTheme
        }, { merge: true });
      } catch (e) {
        console.error("Error saving theme to Firebase:", e);
      }
    }
  };

  const handleLogin = async () => {
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (e: any) { setAuthError(e.message); }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setAuthError("Podaj adres email aby zresetować hasło.");
      return;
    }
    try { await sendPasswordResetEmail(auth, email); setAuthError(""); } 
    catch (e: any) { setAuthError(e.message); }
  };

  const handleRegister = async () => {
    try { await createUserWithEmailAndPassword(auth, email, password); } 
    catch (e: any) { setAuthError(e.message); }
  };

  const handleAnonymous = async () => {
    try { await signInAnonymously(auth); } 
    catch (e: any) { setAuthError(e.message); }
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
      setAuthError(e.message || "Błąd logowania Google");
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading || showSplash) {
    return <GlikoControlLogo />;
  }

  if (!user) {
    return (
      <div className={cn("min-h-[100dvh] flex items-center justify-center p-4 transition-colors duration-500", theme === "dark" ? "bg-slate-950" : "bg-slate-50")}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn("w-full max-w-sm p-10 rounded-[3.5rem] shadow-2xl text-center border transition-all duration-500", theme === "dark" ? "bg-slate-900/60 backdrop-blur-3xl border-slate-800/50" : "bg-white border-slate-200")}>
          <div className="flex items-center justify-center gap-4 mb-2">
            <Logo className="w-14 h-14" />
            <h2 className={cn("text-3xl font-black tracking-tight", theme === "dark" ? "text-white" : "text-slate-900")}>
              GlikoControl v{CURRENT_VERSION}
            </h2>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Zintegrowany System Glikemii</p>
          <p className="text-accent-400 text-xs font-bold mb-8 italic">GlikoControl AI</p>

          <div className="space-y-4 mb-6">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={cn("w-full p-4 rounded-2xl text-sm font-bold border outline-none focus:border-accent-500 transition-all", theme === "dark" ? "bg-slate-800/50 border-slate-700/50 text-white" : "bg-slate-50 border-slate-200 text-slate-900")} />
            <input type="password" placeholder="Hasło" value={password} onChange={(e) => setPassword(e.target.value)} className={cn("w-full p-4 rounded-2xl text-sm font-bold border outline-none focus:border-accent-500 transition-all", theme === "dark" ? "bg-slate-800/50 border-slate-700/50 text-white" : "bg-slate-50 border-slate-200 text-slate-900")} />
            <div className="flex justify-end px-2">
              <button onClick={() => { Haptics.selection(); handleForgotPassword(); }} className="text-[10px] font-bold text-accent-500 hover:text-accent-400 transition-colors uppercase tracking-widest">Zapomniałeś hasła?</button>
            </div>
          </div>

          {authError && (
            <div className="mb-4 bg-rose-500/10 p-3 rounded-xl flex flex-col gap-2">
              <p className="text-rose-500 text-[10px] font-bold">{authError}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => { Haptics.medium(); handleLogin(); }} className="flex items-center justify-center gap-2 bg-accent-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-accent-600/30 active:scale-95 transition-all">
              <LogIn size={14} /> Wejdź
            </button>
            <button onClick={() => { Haptics.medium(); handleRegister(); }} className={cn("py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all", theme === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}>
              Rejestracja
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => { Haptics.impact(); handleGoogle(); }} className={cn("flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border shadow-sm active:scale-95 transition-all", theme === "dark" ? "bg-slate-950 text-white border-slate-800" : "bg-white text-slate-700 border-slate-200")}>
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Kontynuuj przez Google</span>
            </button>
            <button onClick={() => { Haptics.impact(); handleAnonymous(); }} className={cn("flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border shadow-sm active:scale-95 transition-all mt-2", theme === "dark" ? "bg-accent-500/10 text-accent-400 border-accent-500/20" : "bg-accent-50 text-accent-600 border-accent-100")}>
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Logowanie bez konta (Gość)</span>
            </button>
          </div>
          <button onClick={toggleTheme} className="mt-8 p-3 rounded-full hover:bg-slate-500/10 transition-colors">
            {theme === "light" ? <Moon size={20} className="text-slate-400" /> : <Sun size={20} className="text-amber-400" />}
          </button>
        </motion.div>
      </div>
    );
  }

  const handleSwipe = (_: any, info: any) => {};
  const tabVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 20 : -20, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 20 : -20, opacity: 0 }),
  };

  const currentTabContent = <AppContent {...{assistantMessages, setAssistantMessages, isAssistantTyping, sendAssistantMessage, handleLogout, wsDevices, kickDevice, mealProgress, getEffectiveIOB, toggleTheme, pumpStatus}} />;

  return (
    <>
      <MigrationManager user={user} />
      <AppLayout
      mainRef={mainRef}
      mealProgress={mealProgress}
      userSettings={userSettings}
      user={user}
      lastGlucoseValue={lastGlucoseValue}
      changeTab={changeTab}
      handleLogout={handleLogout}
      toggleTheme={toggleTheme}
      tabVariants={tabVariants}
      handleSwipe={handleSwipe}
      logs={logs}
      pumpStatus={pumpStatus}
      getEffectiveIOB={getEffectiveIOB}
      handleAcceptPrivacy={handleAcceptPrivacy}
      handleCloseChangelog={handleCloseChangelog}
      setUserSettings={setUserSettings}
    >
      {currentTabContent}
    </AppLayout>
    </>
  );
}


