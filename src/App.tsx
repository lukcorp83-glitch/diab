import { calculateIOB, calculateCOB, getEffectiveUid, getEffectiveIOB } from './lib/utils';
import { getGlikoSenseInsights } from './lib/insightGenerator';
import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, signInWithCustomToken } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc, getDoc, getDocFromServer, setDoc, deleteDoc, writeBatch, limit } from 'firebase/firestore';
import { LogEntry, UserSettings, Product, PlateItem, AssistantMessage } from './types';
import { geminiService } from './services/gemini';
import { CATEGORIES, LIB_BASE, APP_VERSION } from './constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { notificationService } from './services/notificationService';
import { Toaster, toast } from 'react-hot-toast';

import Dashboard from './components/Dashboard';
import ChartFullView from './components/ChartFullView';

const lazyWithReload = (importFunc: () => Promise<any>) => {
  return React.lazy(async () => {
    try {
      return await importFunc();
    } catch (error) {
      if (error instanceof Error && (error.name === 'ChunkLoadError' || error.message.includes('Failed to fetch dynamically imported module'))) {
        const isReloading = sessionStorage.getItem('chunk_reload');
        if (!isReloading) {
          sessionStorage.setItem('chunk_reload', 'true');
          window.location.reload();
          return new Promise(() => {}); // prevent Error Boundary while reloading
        }
      }
      throw error;
    }
  });
};

const BolusCalculator = lazyWithReload(() => import('./components/BolusCalculator'));
const MealPlate = lazyWithReload(() => import('./components/MealPlate'));
const AiReports = lazyWithReload(() => import('./components/AiReports'));
const PumpSimulator = lazyWithReload(() => import('./components/PumpSimulator'));
const Profile = lazyWithReload(() => import('./components/Profile'));
const Achievements = lazyWithReload(() => import('./components/Achievements'));
const HistoryView = lazyWithReload(() => import('./components/HistoryView'));
const GlikoGames = lazyWithReload(() => import('./components/GlikoGames'));
const GlikoChat = lazyWithReload(() => import('./components/GlikoChat'));
const GlikoAssistant = lazyWithReload(() => import('./components/GlikoAssistant'));
const TutorialView = lazyWithReload(() => import('./components/TutorialView'));
import Sidebar from './components/Sidebar';
import { cn } from './lib/utils';
import { nightscoutService } from './services/nightscout';
import { maintenanceService } from './services/maintenanceService';

import Logo from './components/Logo';

import OnboardingTutorial from './components/OnboardingTutorial';
import NotificationCenter from './components/NotificationCenter';
import MediaWidget from './components/MediaWidget';
import NotebookManager from './components/NotebookManager';
import ChangelogPopup from './components/ChangelogPopup';
import PrivacyPopup from './components/PrivacyPopup';
import QuickStatusPopup from './components/QuickStatusPopup';
import { Diets } from './components/Diets';
import { CURRENT_VERSION } from './constants/versions';

import GlikoSenseIcon from './components/GlikoSenseIcon';

const MeshBackground = ({ lastGlucose, isGlassmorphic }: { lastGlucose: number | null, isGlassmorphic: boolean }) => {
  const isAlert = lastGlucose !== null && (lastGlucose < 70 || lastGlucose > 180);
  const isUrgent = lastGlucose !== null && (lastGlucose < 55 || lastGlucose > 250);

  if (!isGlassmorphic) {
    if (isAlert || isUrgent) {
      return (
        <div 
          className={cn(
            "fixed inset-0 -z-10 transition-colors duration-[2000ms] pointer-events-none opacity-10 dark:opacity-20",
            isUrgent ? "bg-rose-500" : "bg-orange-500"
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
            isAlert || isUrgent ? "mesh-gradient-alert" : "mesh-gradient-1"
          )} 
        />
      </div>

      {isGlassmorphic && (
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden opacity-100 mix-blend-multiply dark:mix-blend-screen">
          <div className="absolute top-10 left-10 w-[25rem] h-[25rem] bg-accent-400/20 dark:bg-accent-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-40 right-10 w-[25rem] h-[25rem] bg-indigo-400/20 dark:bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[25rem] h-[25rem] bg-emerald-400/20 dark:bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '12s' }} />
        </div>
      )}
    </>
  );
};

import { Haptics } from './lib/haptics';

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
  mediaWidgetEnabled: false,
  glassmorphismEnabled: true,
  theme: 'system',
  accentColor: 'accent',
  bgOption: 'default'
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [pumpStatus, setPumpStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [nsUrl, setNsUrl] = useState('');
  const [nsSecret, setNsSecret] = useState('');
  const [initialAction, setInitialAction] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [petData, setPetData] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<{ status: 'idle' | 'syncing' | 'success' | 'error', lastSync?: number }>({ status: 'idle' });
  const [showTutorial, setShowTutorial] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [activeTab]);

  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>(() => {
    const saved = localStorage.getItem('gliko_assistant_history');
    if (saved) {
      try {
        return JSON.parse(saved);
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
      collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'aiReports'),
      orderBy('timestamp', 'desc'),
      limit(3)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const texts = snapshot.docs.map(doc => {
        const data = doc.data();
        // Extract plain text from HTML-like content
        return data.content?.replace(/<[^>]*>/g, ' ').substring(0, 500) || '';
      });
      setAiInsights(texts);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    localStorage.setItem('gliko_assistant_history', JSON.stringify(assistantMessages));
  }, [assistantMessages]);

  const sendAssistantMessage = async (text: string) => {
    if (!text.trim() || isAssistantTyping) return;

    const userMessage: AssistantMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: Date.now()
    };

    setAssistantMessages(prev => [...prev, userMessage]);
    setIsAssistantTyping(true);

    try {
      const history = assistantMessages
        .filter(m => m.id !== 'initial' && !m.id.startsWith('initial-'))
        .slice(-10)
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      const iob = getEffectiveIOB(logs, pumpStatus, userSettings?.dia || 4);
      const cob = calculateCOB(logs);
      
      const logGlucose = logs.filter(l => l.type === 'glucose')[0];
      const pumpBg = pumpStatus?.bg;
      let lastGlucose = logGlucose?.value || pumpBg || 0;

      // If pump status is newer than latest log, prefer pump status
      if (pumpStatus?.timestamp && logGlucose?.timestamp && pumpStatus.timestamp > logGlucose.timestamp) {
        lastGlucose = pumpBg || lastGlucose;
      }

      const staticInsights = getGlikoSenseInsights(logs);
      const combinedInsights = [...staticInsights, ...aiInsights];

      const response = await geminiService.getAssistantResponse(
        text, 
        history, 
        logs, 
        userSettings || { targetMin: 70, targetMax: 140 },
        { iob, cob, glucose: lastGlucose },
        combinedInsights
      );

      // Handle Plate/App Actions
      let cleanResponse = response;
      const plateActionMatches = Array.from(response.matchAll(/<plate_action>([\s\S]*?)<\/plate_action>/g));
      
      for (const match of plateActionMatches) {
        try {
          const actionData = JSON.parse(match[1]);
          if (actionData.action === 'add' && actionData.item) {
             window.dispatchEvent(new CustomEvent('ai_plate_action', { detail: actionData }));
          }
        } catch (e) {
          console.error("AI Plate Action Error:", e);
        }
      }
      
      if (plateActionMatches.length > 0) {
        cleanResponse = cleanResponse.replace(/<plate_action>[\s\S]*?<\/plate_action>/g, '').trim();
      }
      
      const appActionMatches = Array.from(response.matchAll(/<app_action>([\s\S]*?)<\/app_action>/g));
      for (const match of appActionMatches) {
        try {
          const actionData = JSON.parse(match[1]);
          window.dispatchEvent(new CustomEvent('ai_app_action', { detail: actionData }));
        } catch (e) {
          console.error("AI App Action Error:", e);
        }
      }
      if (appActionMatches.length > 0) {
         cleanResponse = cleanResponse.replace(/<app_action>[\s\S]*?<\/app_action>/g, '').trim();
      }

      const modelMessage: AssistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: cleanResponse,
        timestamp: Date.now()
      };

      setAssistantMessages(prev => [...prev, modelMessage]);

      // BACKGROUND NOTIFICATION
      const isAssistantTabActive = activeTab === 'assistant';
      if (!isAssistantTabActive) {
        toast((t) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <span className="font-black text-[10px]">ASZYSTENT AI ODPOWIEDZIAŁ!</span>
            </div>
            <p className="text-[9px] lowercase opacity-70 line-clamp-2">{(cleanResponse.replace(/<[^>]*>/g, '').substring(0, 60)) + '...'}</p>
            <button 
              onClick={() => {
                setActiveTab('assistant');
                toast.dismiss(t.id);
              }}
              className="mt-1 px-3 py-1.5 bg-accent-600 text-white text-[8px] font-black uppercase rounded-lg w-fit"
            >
              Pokaż odpowiedź
            </button>
          </div>
        ), { duration: 6000, position: 'top-right' });

        if (Notification.permission === 'granted') {
          new Notification('Nowa odpowiedź od Asystenta AI', {
            body: 'Twój asystent przygotował analizę. Kliknij aby zobaczyć.',
            icon: '/apple-touch-icon.png'
          });
        }
      }

    } catch (error: any) {
      console.error("BG Assistant Error:", error);
      const errMsg = error?.message || String(error);
      const isInvalidKey = errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID");
      
      const errorMessage: AssistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: isInvalidKey 
          ? "⚠️ <b>Błąd klucza API Gemini!</b> Twój klucz wydaje się być nieprawidłowy. Sprawdź go w ustawieniach profilu."
          : `⚠️ <b>Błąd komunikacji z AI:</b> ${errMsg}`,
        timestamp: Date.now()
      };
      setAssistantMessages(prev => [...prev, errorMessage]);
      toast.error("Wystąpił błąd AI.");
    } finally {
      setIsAssistantTyping(false);
    }
  };

  const [sharedPlate, setSharedPlate] = useState<PlateItem[]>(() => {
    const saved = localStorage.getItem('current_plate');
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
    localStorage.setItem('current_plate', JSON.stringify(sharedPlate));
  }, [sharedPlate]);

  useEffect(() => {
    const handlePlateAction = (e: any) => {
      const { action, item } = e.detail;
      if (action === 'add' && item) {
        setSharedPlate(prev => {
           const newItem = {
             id: 'ai-' + Date.now() + Math.random(),
             ...item,
             gi: item.gi || 0,
             category: item.category || 'AI Dodane',
             weight: item.weight || 100
           };
           return [...prev, newItem];
        });
        toast.success(`Dodano: ${item.name} (${item.carbs}g W, ${item.protein}g B, ${item.fat}g T)`);
      }
    };
    
    const handleAppAction = async (e: any) => {
      const { action, key, value, logData } = e.detail;
      
      if (action === 'set_setting' && user && userSettings) {
        if (['isf', 'wwRatio', 'wbtRatio', 'targetMin', 'targetMax', 'tdee'].includes(key)) {
          try {
            const newSettings = { ...userSettings, [key]: Number(value) };
            await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
            setUserSettings(newSettings);
            toast.success(`AI zaktualizowało: ${key} na ${value}`);
          } catch(err) {
            console.error("Failed to update setting from AI", err);
          }
        } else if (key === 'haptics' || key === 'hapticsEnabled') {
            const isEnabled = typeof value === 'boolean' ? value : value === 'true';
            localStorage.setItem('gliko_haptics_enabled', isEnabled ? 'true' : 'false');
            toast.success(isEnabled ? 'Wibracje zostały włączone przez AI' : 'Wibracje zostały wyłączone przez AI');
        }
      } else if (action === 'add_log' && user) {
         try {
             // addDoc we need to make sure we have addDoc from firebase/firestore
             const logsRef = collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs');
             const nowTimestamp = Date.now();
             const newLog = {
                ...logData, // { type: 'bolus'|'glucose'|'site_change'|'sensor_change', value: number, notes? }
                timestamp: nowTimestamp,
                createdAt: serverTimestamp()
             };
             await setDoc(doc(logsRef), newLog);
             
             if (logData.type === 'site_change' || logData.type === 'sensor_change') {
                 const settingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile');
                 const settingsSnap = await getDocFromServer(settingsRef);
                 let currentSettings = settingsSnap.exists() ? settingsSnap.data() : {};
                 
                 if (logData.type === 'site_change') {
                     currentSettings.infusionSetChangeDate = nowTimestamp;
                 } else if (logData.type === 'sensor_change') {
                     currentSettings.sensorChangeDate = nowTimestamp;
                 }
                 await setDoc(settingsRef, currentSettings, { merge: true });
             }
             
             toast.success(`Zapisano dzienniczek z poziomu AI!`);
         } catch (err) {
            console.error("Failed to add log", err);
         }
      } else if (action === 'navigate') {
          const tab = value; // e.g. 'dashboard', 'database', 'meal', 'settings'->'profile'
          let targetTab = tab;
          if (tab === 'settings' || tab === 'ustawienia') targetTab = 'profile';
          if (tab === 'baza') targetTab = 'database';
          if (tab === 'talerz') targetTab = 'meal';
          setActiveTab(targetTab);
          toast(`Przejście do zakładki...`, { icon: '🚀' });
      }
    };

    window.addEventListener('ai_plate_action', handlePlateAction);
    window.addEventListener('ai_app_action', handleAppAction);
    return () => {
      window.removeEventListener('ai_plate_action', handlePlateAction);
      window.removeEventListener('ai_app_action', handleAppAction);
    };
  }, [user, userSettings]);

  // Test Firestore connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'connection_tests', 'touch'));
        console.log('[Firestore] Connection verified');
      } catch (error: any) {
        if (error.message?.includes('offline') || error.code === 'unavailable') {
          console.error('[Firestore] Connection issue:', error);
          toast.error("Brak połączenia z bazą Firestore - sprawdź internet lub konfigurację.");
        }
      }
    };
    testConnection();
  }, []);


  useEffect(() => {
    const hasAcceptedPrivacy = localStorage.getItem('hasAcceptedPrivacy');
    
    if (!hasAcceptedPrivacy) {
      setShowPrivacyPopup(true);
      setPrivacyLoading(false);
    } else {
      setPrivacyLoading(false);
    }

    // Check version for changelog
    const lastSeen = localStorage.getItem('lastSeenVersion');
    if (lastSeen !== CURRENT_VERSION) {
      // Only show if it's not the very first visit (we show tutorial then)
      if (lastSeen || localStorage.getItem('hasSeenTutorial')) {
        setShowChangelog(true);
      } else {
        // First visit - set the version so we don't show changelog right after tutorial
        localStorage.setItem('lastSeenVersion', CURRENT_VERSION);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Check privacy in firestore
    const checkPrivacy = async () => {
      const uid = getEffectiveUid(user);
      const privacyRef = doc(db, 'artifacts', 'diacontrolapp', 'users', uid, 'settings', 'privacy');
      try {
        const d = await getDoc(privacyRef);
        if (d.exists()) {
          const data = d.data();
          if (data.accepted) {
            localStorage.setItem('hasAcceptedPrivacy', 'true');
            setShowPrivacyPopup(false);
          } else {
            setShowPrivacyPopup(true);
          }
        } else {
          // New user or no data
          if (localStorage.getItem('hasAcceptedPrivacy') === 'true') {
            await setDoc(privacyRef, { 
              accepted: true, 
              acceptedAt: serverTimestamp(),
              version: CURRENT_VERSION 
            }, { merge: true });
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
    localStorage.setItem('hasAcceptedPrivacy', 'true');
    localStorage.setItem('lastSeenVersion', CURRENT_VERSION);
    
    if (user) {
      const uid = getEffectiveUid(user);
      const privacyRef = doc(db, 'artifacts', 'diacontrolapp', 'users', uid, 'settings', 'privacy');
      try {
        await setDoc(privacyRef, { 
          accepted: true, 
          acceptedAt: serverTimestamp(),
          version: CURRENT_VERSION 
        }, { merge: true });
        toast.success("Zgoda zatwierdzona pomyślnie");
      } catch (err) {
        console.error("Error saving privacy to Firestore:", err);
      }
    }

    const lastSeen = localStorage.getItem('lastSeenVersion');
    if (lastSeen && lastSeen !== CURRENT_VERSION && localStorage.getItem('hasSeenTutorial')) {
      setShowChangelog(true);
    }
  };

  const handleCloseChangelog = () => {
    setShowChangelog(false);
    localStorage.setItem('lastSeenVersion', CURRENT_VERSION);
  };

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'status', 'pump'), (docSnap) => {
      if (docSnap.exists()) {
        console.log("[Firestore] Received pump status data:", docSnap.data());
        setPumpStatus(docSnap.data());
      } else {
        console.log("[Firestore] Pump status document does not exist for UID:", getEffectiveUid(user));
      }
    }, (error) => {
      console.error("Firestore onSnapshot error (pump status):", error);
    });
  }, [user]);

  const changeTab = React.useCallback((newTab: string) => {
    Haptics.light();
    const defaultTabs = ['chart', 'dashboard', 'database', 'meal', 'chat', 'ai', 'profile', 'games'];
    const getIndex = (tab: string) => defaultTabs.indexOf(tab) >= 0 ? defaultTabs.indexOf(tab) : 0;
    setDirection(getIndex(newTab) >= getIndex(activeTab) ? 1 : -1);
    setActiveTab(newTab);
  }, [activeTab]);

  useEffect(() => {
    if (!user) return;
    const petRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status');
    const unsub = onSnapshot(petRef, (d) => {
      if (d.exists()) setPetData(d.data());
    }, (error) => {
      console.error("Firestore onSnapshot error (pet):", error);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile');
    const unsubscribe = onSnapshot(settingsRef, (d) => {
      if (d.exists()) {
        setUserSettings(d.data() as UserSettings);
      }
    }, (err) => {
      console.error("Error fetching settings for notifications:", err);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!userSettings?.notificationsEnabled) return;

    const checkExpiries = () => {
      if (Notification.permission !== 'granted') return;

      const now = Date.now();
      const warningThresholdMs = 12 * 60 * 60 * 1000; // 12 hours

      // Sensor Notification Check
      if (userSettings.sensorChangeDate && userSettings.sensorDurationDays) {
         const sensorExpiryDate = userSettings.sensorChangeDate + (userSettings.sensorDurationDays * 24 * 60 * 60 * 1000);
         const sensorMsLeft = sensorExpiryDate - now;
         if (sensorMsLeft > 0 && sensorMsLeft <= warningThresholdMs) {
            const notifiedKey = `notified_sensor_${userSettings.sensorChangeDate}`;
            if (!localStorage.getItem(notifiedKey)) {
               navigator.serviceWorker.ready.then(registration => {
                 registration.showNotification('Zbliża się wymiana sensora!', {
                    body: `Pozostało mniej niż 12 godzin do końca cyklu życia sensora. Zmień go wkrótce!`,
                    icon: '/apple-touch-icon.png'
                 });
               });
               localStorage.setItem(notifiedKey, 'true');
            }
         }
      }

      // Infusion Set Notification Check
      if (userSettings.infusionSetChangeDate && userSettings.infusionSetDurationDays) {
         const infusionExpiryDate = userSettings.infusionSetChangeDate + (userSettings.infusionSetDurationDays * 24 * 60 * 60 * 1000);
         const infusionMsLeft = infusionExpiryDate - now;
         if (infusionMsLeft > 0 && infusionMsLeft <= warningThresholdMs) {
            const notifiedKey = `notified_infusion_${userSettings.infusionSetChangeDate}`;
            if (!localStorage.getItem(notifiedKey)) {
               navigator.serviceWorker.ready.then(registration => {
                 registration.showNotification('Zbliża się wymiana wkłucia!', {
                    body: `Pozostało mniej niż 12 godzin do końca cyklu życia wkłucia. Pamiętaj o zmianie!`,
                    icon: '/apple-touch-icon.png'
                 });
               });
               localStorage.setItem(notifiedKey, 'true');
            }
         }
      }

      // Medication Expiry Notification Check
      if (userSettings.medications) {
         userSettings.medications.forEach(med => {
            if (med.expiryDate && med.active) {
               const expiryTime = new Date(med.expiryDate).getTime();
               const daysToExpiry = (expiryTime - now) / (1000 * 60 * 60 * 24);
               
               if (daysToExpiry <= 7 && daysToExpiry > 0) {
                  const notifiedKey = `notified_expiry_${med.id}_${med.expiryDate}`;
                  if (!localStorage.getItem(notifiedKey)) {
                     navigator.serviceWorker.ready.then(registration => {
                       registration.showNotification(`Kończy się ważność: ${med.name}`, {
                          body: `Lek straci ważność za ${Math.ceil(daysToExpiry)} dni (${med.expiryDate}). Pamiętaj o uzupełnieniu zapasów!`,
                          icon: '/apple-touch-icon.png'
                       });
                     });
                     localStorage.setItem(notifiedKey, 'true');
                  }
               }
            }
         });
      }
    };

    checkExpiries(); // Check on mount
    const interval = setInterval(checkExpiries, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, [userSettings]);

  useEffect(() => {
    // Handle PWA shortcuts
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    
    if (action === 'add_glucose') {
      setInitialAction('add_glucose');
      setActiveTab('dashboard');
      window.history.replaceState({}, '', '/');
    } else if (action === 'add_bolus') {
      setActiveTab('bolus');
      window.history.replaceState({}, '', '/');
    } else if (action === 'add_meal') {
      setActiveTab('meal');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    const savedTheme = userSettings?.theme || (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'light';
    const savedAccent = userSettings?.accentColor || localStorage.getItem('accentColor') || 'accent';
    
    // Default to handling 'system' preference
    let activeTheme = savedTheme;
    if (savedTheme === 'system') {
      activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else if (savedTheme !== 'light' && savedTheme !== 'dark') {
      activeTheme = 'light';
    }

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(activeTheme);
    setTheme(activeTheme as 'light' | 'dark');
    root.setAttribute('data-accent', savedAccent);
    root.setAttribute('data-bg', userSettings?.bgOption || 'default');
    if (userSettings?.glassmorphismEnabled) {
      root.setAttribute('data-glassmorphism', 'true');
    } else {
      root.removeAttribute('data-glassmorphism');
    }
    
    if (userSettings?.theme) {
      localStorage.setItem('theme', userSettings.theme);
    }
    if (userSettings?.accentColor) {
      localStorage.setItem('accentColor', userSettings.accentColor);
    }
  }, [userSettings?.theme, userSettings?.accentColor, userSettings?.bgOption, userSettings?.glassmorphismEnabled]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
         maintenanceService.cleanupOldData(getEffectiveUid(u), 30);
         const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
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
    if (!user) return;
    const q = query(
      collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs'),
      orderBy('timestamp', 'desc'),
      limit(10000)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as LogEntry[];
      setLogs(data);
    }, (error) => {
      console.error("Firestore subscription error:", error);
      if (error.message.includes('permission-denied')) {
        setAuthError("Błąd uprawnień - sprawdź czy jesteś zalogowany poprawnie.");
      } else if (error.message.includes('quota') || error.message.includes('Quota')) {
        setAuthError("Przekroczono limit bazy danych (Quota exceeded). Spróbuj ponownie jutro.");
      } else {
        setAuthError("Błąd bazy danych: " + error.message);
      }
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const nsSettingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'nightscout');
    const unsubscribeNs = onSnapshot(nsSettingsRef, (d) => {
      if (d.exists()) {
        setNsUrl(d.data()?.url || '');
        setNsSecret(d.data()?.secret || '');
      }
    }, (error) => {
      if (!error.message?.includes('offline')) console.error("Error fetching NS settings:", error);
    });

    return () => unsubscribeNs();
  }, [user]);

  const syncTaskRef = useRef(false);
  const logsRef = useRef(logs);
  const userSettingsRef = useRef(userSettings);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    userSettingsRef.current = userSettings;
  }, [userSettings]);

  useEffect(() => {
    if (!user || !nsUrl) return;

    const syncNightscout = async (manual = false) => {
      if (syncTaskRef.current) {
        if (manual) console.log("Nightscout: Synchronizacja już trwa...");
        return;
      }
      syncTaskRef.current = true;
      
      try {
        setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
        console.log("Starting Nightscout sync...");
        
        let currentWeather: any = null;
        if (userSettingsRef.current?.weatherNeuralEnabled || userSettingsRef.current?.weatherWidgetEnabled) {
          try {
             const { fetchCurrentWeather } = await import('./services/weatherService');
             currentWeather = await fetchCurrentWeather();
          } catch (e) {
             console.warn("Failed to fetch weather for Nightscout sync", e);
          }
        }

        // 1. FAST PATH: Fetch just the LATEST entry first for immediate feedback
        const latestEntries = await nightscoutService.fetchEntries(nsUrl, nsSecret, 1);
        if (latestEntries.length > 0) {
          const latest = latestEntries[0];
          const fingerprint = `${latest.type}-${Math.floor(latest.timestamp / 60000)}-${latest.value}`;
          const firestoreId = fingerprint.replace(/[^a-zA-Z0-9_\-]/g, '_');
          const docRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs', firestoreId);
          
          const latestDataToSave: any = {
            ...latest,
            nsId: latest.id,
            createdAt: serverTimestamp()
          };
          if (currentWeather && latest.type === 'glucose' && (Date.now() - latest.timestamp < 3600000)) {
            latestDataToSave.weather = currentWeather;
          }
          await setDoc(docRef, latestDataToSave, { merge: true });
        }

        // 2. Fetch device status (important for battery/status)
        const devicestatus = await nightscoutService.fetchDeviceStatus(nsUrl, nsSecret);
        if (devicestatus) {
          const pumpRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'status', 'pump');
          await setDoc(pumpRef, devicestatus, { merge: true });
        }

        // 3. FULL SYNC: Fetch background history
        const entries = await nightscoutService.fetchEntries(nsUrl, nsSecret, 300); 
        const treatments = await nightscoutService.fetchTreatments(nsUrl, nsSecret, 500); 
        
        const allNewLogs = [...entries, ...treatments];
        
        if (manual && allNewLogs.length === 0) {
            console.warn("Nightscout: Nie udało się pobrać żadnych danych. Sprawdź poprawność URL.");
        }
        
        // Use a set of unique fingerprints from current logs reference
        const existingLogs = logsRef.current;
        
        const isDuplicate = (newLog: LogEntry) => {
          return existingLogs.some(l => {
            // Check by NS ID first (most reliable)
            if (l.nsId && newLog.id && l.nsId === newLog.id) return true;
            if (l.id && newLog.id && l.id === newLog.id) return true;

            const timeDiff = Math.abs(l.timestamp - newLog.timestamp);
            const isSimilarTime = timeDiff < 2 * 60 * 1000; // +/- 2 minutes
            const isSameType = l.type === newLog.type;
            
            if (isSameType && isSimilarTime) {
               // For glucose, we are more strict on value
               if (l.type === 'glucose') return Math.abs(l.value - newLog.value) < 1;
               // For bolus/meal, if it's the same time and type, and we haven't modified it manually, it's a dupe
               if (l.userModified) return true; 
               return Math.abs(l.value - newLog.value) < 0.1;
            }
            
            // Check if a bolus in state already has this meal linked (or vice versa)
            if (isSimilarTime && ((l.type === 'bolus' && newLog.type === 'meal') || (l.type === 'meal' && newLog.type === 'bolus'))) {
               const mealVal = l.type === 'meal' ? l.value : l.linkedMeal?.carbs;
               const newMealVal = newLog.type === 'meal' ? newLog.value : newLog.linkedMeal?.carbs;
               if (mealVal !== undefined && newMealVal !== undefined && Math.abs(mealVal - newMealVal) < 1) return true;
            }
            return false;
          });
        };
        
        // Deduplicate allNewLogs itself first (internal NS duplicates)
        const uniqueNSLogs: LogEntry[] = [];
        allNewLogs.forEach(n => {
          if (!uniqueNSLogs.some(u => 
            u.type === n.type && 
            Math.abs(u.timestamp - n.timestamp) < 60000 && 
            Math.abs(u.value - n.value) < 0.01
          )) {
            uniqueNSLogs.push(n);
          }
        });

        const newLogsToSync = uniqueNSLogs.filter(newLog => !isDuplicate(newLog));

        if (newLogsToSync.length > 0) {
          console.log(`Syncing ${newLogsToSync.length} new records via batch...`);

          const CHUNK_SIZE = 400;
          for (let i = 0; i < newLogsToSync.length; i += CHUNK_SIZE) {
              const chunk = newLogsToSync.slice(i, i + CHUNK_SIZE);
              const batch = writeBatch(db);
              
              for (const newLog of chunk) {
                 const { id: nsId, ...logData } = newLog;
                 if (currentWeather && logData.type === 'glucose') {
                   // Only append weather if the log is recent (last 1 hour), to avoid attaching current weather to old imported logs
                   if (Date.now() - logData.timestamp < 3600000) {
                     (logData as any).weather = currentWeather;
                   }
                 }

                 const fingerprint = `${newLog.type}-${Math.floor(newLog.timestamp / 60000)}-${newLog.value}`;
                 const firestoreId = fingerprint.replace(/[^a-zA-Z0-9_\-]/g, '_');
                 const docRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs', firestoreId);
                 
                 batch.set(docRef, {
                   ...logData,
                   nsId: nsId || firestoreId,
                   createdAt: serverTimestamp()
                 }, { merge: true });
              }
              await batch.commit();
          }
          if (manual) {
             console.log(`Nightscout: Synchronizacja zakończona. Dodano ${newLogsToSync.length} nowych wpisów.`);
          }
        } else if (manual && allNewLogs.length > 0) {
           console.log(`Nightscout: Pobrano ${allNewLogs.length} wpisów, ale wszystkie są już zsynchronizowane.`);
        }
        console.log("Nightscout sync complete.");
        setSyncStatus({ status: 'success', lastSync: Date.now() });
      } catch (err) {
        console.error("Nightscout sync error:", err);
        setSyncStatus({ status: 'error', lastSync: Date.now() });
        if (manual) {
           console.error("Nightscout: Wystąpił nieoczekiwany błąd podczas synchronizacji.");
        }
      } finally {
        syncTaskRef.current = false;
      }
    };

    const handleForceSync = () => {
      console.log("Force sync manually triggered");
      syncNightscout(true);
    };

    window.addEventListener('force-nightscout-sync', handleForceSync);

    const timeout = setTimeout(() => syncNightscout(false), 500);
    const interval = setInterval(() => syncNightscout(false), 2 * 60 * 1000); // 2 min instead of 5
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      window.removeEventListener('force-nightscout-sync', handleForceSync);
    };
  }, [user, nsUrl]);

  const toggleTheme = async () => {
    const newTheme: 'light' | 'dark' = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (userSettings && user) {
      setUserSettings(prev => prev ? { ...prev, theme: newTheme } : null);
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { theme: newTheme }, { merge: true });
    } else {
      localStorage.setItem('theme', newTheme);
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
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
      setAuthError("Podaj adres email aby zresetować hasło.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Link do resetowania hasła został wysłany na Twój email.");
      setAuthError("");
    } catch (e: any) {
      let msg = e.message;
      if (e.code === 'auth/user-not-found') msg = "Nie znaleziono użytkownika o tym adresie email.";
      if (e.code === 'auth/invalid-email') msg = "Błędny format adresu email.";
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
      if (e.code === 'auth/operation-not-allowed') {
         toast.error("Logowanie jako gość (Anonymous Auth) jest wyłączone w Twoim projekcie Firebase. Włącz je w konsoli Firebase lub użyj konta Google.", { duration: 6000 });
      }
      setAuthError(e.message);
    }
  };

  const handleGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      setAuthError(e.message);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Logo className="w-20 h-20 animate-pulse drop-shadow-2xl opacity-70 mb-4" />
        <p className="text-slate-400 dark:text-slate-500 font-medium tracking-widest text-sm uppercase">powered by GlikoSense</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-4 transition-colors duration-500",
        theme === 'dark' ? "bg-slate-950" : "bg-slate-50"
      )}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "w-full max-w-sm p-10 rounded-[3.5rem] shadow-2xl text-center border transition-all duration-500",
            theme === 'dark' ? "bg-slate-900/60 backdrop-blur-3xl border-slate-800/50" : "bg-white border-slate-200"
          )}
        >
          <div className="flex items-center justify-center gap-4 mb-2">
             <Logo className="w-14 h-14" />
             <h2 className={cn("text-3xl font-black tracking-tight", theme === 'dark' ? "text-white" : "text-slate-900")}>GlikoControl</h2>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Zintegrowany System Glikemii</p>
          <p className="text-accent-400 text-xs font-bold mb-8 italic">GlikoControl AI</p>

          <div className="space-y-4 mb-6">
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "w-full p-4 rounded-2xl text-sm font-bold border outline-none focus:border-accent-500 transition-all",
                theme === 'dark' ? "bg-slate-800/50 border-slate-700/50 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              )}
            />
            <input 
              type="password" 
              placeholder="Hasło" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "w-full p-4 rounded-2xl text-sm font-bold border outline-none focus:border-accent-500 transition-all",
                theme === 'dark' ? "bg-slate-800/50 border-slate-700/50 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
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
                Zapomniałeś hasła?
              </button>
            </div>
          </div>

          {authError && (
            <div className="mb-4 bg-rose-500/10 p-3 rounded-xl flex flex-col gap-2">
              <p className="text-rose-500 text-[10px] font-bold">{authError}</p>
              {authError.includes('NOWEJ KARCIE') && (
                <button
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="bg-rose-500/20 text-rose-600 text-[8px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg w-fit hover:bg-rose-500/30 transition-colors"
                >
                  Otwórz w nowej karcie
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={() => {
              Haptics.medium();
              handleLogin();
            }} className="flex items-center justify-center gap-2 bg-accent-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-accent-600/30 active:scale-95 transition-all">
              <LogIn size={14} />
              Wejdź
            </button>
            <button onClick={() => {
              Haptics.medium();
              handleRegister();
            }} className={cn(
              "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all",
              theme === 'dark' ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
            )}>Rejestracja</button>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => {
              Haptics.impact();
              handleGoogle();
            }} className={cn(
              "flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border shadow-sm active:scale-95 transition-all",
              theme === 'dark' ? "bg-slate-950 text-white border-slate-800" : "bg-white text-slate-700 border-slate-200"
            )}>
              <img src="/google.svg" alt="Google" className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Kontynuuj przez Google</span>
            </button>
            
            <button onClick={() => {
              Haptics.impact();
              handleAnonymous();
            }} className={cn(
              "flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border shadow-sm active:scale-95 transition-all mt-2",
              theme === 'dark' ? "bg-accent-500/10 text-accent-400 border-accent-500/20" : "bg-accent-50 text-accent-600 border-accent-100"
            )}>
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Logowanie bez konta (Gość)</span>
            </button>

            <p className={cn(
              "text-[9px] text-center mt-2 leading-tight",
              theme === 'dark' ? "text-slate-500" : "text-slate-400"
            )}>
              Uwaga: W trybie Gościa, po odświeżeniu aplikacji (szczególnie w oknie testowym), dane i adres Nightscout mogą zostać zresetowane. Użyj konta Google by zapisać je trwale.
            </p>
          </div>
          
          <button 
            onClick={toggleTheme}
            className="mt-8 p-3 rounded-full hover:bg-slate-500/10 transition-colors"
          >
            {theme === 'light' ? <Moon size={20} className="text-slate-400" /> : <Sun size={20} className="text-amber-400" />}
          </button>
        </motion.div>
      </div>
    );
  }

  const tabs = userSettings?.childMode 
    ? ['chart', 'dashboard', 'database', 'meal', 'chat', 'assistant', 'ai', 'profile', 'games']
    : ['chart', 'dashboard', 'database', 'meal', 'chat', 'assistant', 'ai', 'profile'];
    
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
    })
  };

  const currentTabContent = (
    <React.Suspense fallback={
      <div className="w-full h-full flex items-center justify-center pt-32">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-accent-500 animate-spin" />
      </div>
    }>
      {activeTab === 'dashboard' && (
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
        />
      )}
      {activeTab === 'chart' && (
        <ChartFullView
          logs={logs}
          settings={userSettings || DEFAULT_SETTINGS}
          theme={theme}
          setTab={changeTab}
        />
      )}
      {activeTab === 'bolus' && (
        <BolusCalculator logs={logs} user={user} setTab={changeTab} setSharedPlate={setSharedPlate} pumpStatus={pumpStatus} />
      )}
      {activeTab === 'database' && (
        <MealPlate 
          key="db-plate"
          user={user} 
          setTab={changeTab} 
          sharedPlate={sharedPlate} 
          setSharedPlate={setSharedPlate} 
          mode="search" 
          openHistory={() => changeTab('history')}
          settings={userSettings || undefined}
        />
      )}
      {activeTab === 'meal' && (
        <MealPlate 
          key="meal-plate"
          user={user} 
          setTab={changeTab} 
          sharedPlate={sharedPlate} 
          setSharedPlate={setSharedPlate} 
          mode="plate" 
          openHistory={() => changeTab('history')}
          settings={userSettings || undefined}
        />
      )}
      {activeTab === 'chat' && (
        <GlikoChat petData={petData} />
      )}
      {activeTab === 'assistant' && (
        <GlikoAssistant 
          user={user} 
          logs={logs} 
          settings={userSettings || undefined} 
          onAddToPlate={(item) => setSharedPlate(prev => [...prev, { ...item, plateItemId: Math.random().toString(36).substr(2, 9) }])}
          messages={assistantMessages}
          setMessages={setAssistantMessages}
          isTyping={isAssistantTyping}
          onSend={sendAssistantMessage}
        />
      )}
      {activeTab === 'ai' && (
        <AiReports user={user} logs={logs} settings={userSettings} />
      )}
      {activeTab === 'history' && (
        <HistoryView logs={logs} user={user} onBack={() => changeTab('dashboard')} />
      )}
      {activeTab === 'profile' && (
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
        />
      )}
      {activeTab === 'achievements' && (
        <Achievements logs={logs} user={user} setTab={changeTab} petData={petData} />
      )}
      {activeTab === 'games' && (
        <GlikoGames logs={logs} user={user} setTab={changeTab} />
      )}
      {activeTab === 'diets' && (
        <Diets user={user} setTab={changeTab} settings={userSettings || undefined} />
      )}
    </React.Suspense>
  );

  const lastGlucoseValue = logs.find(l => l.type === 'glucose')?.value || null;

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-500 overflow-x-hidden relative z-10", 
      userSettings?.glassmorphismEnabled 
        ? "bg-transparent dark:bg-transparent"
        : (theme === 'dark' ? "dark bg-[#020617]" : "bg-slate-50")
    )}>
      <MeshBackground lastGlucose={lastGlucoseValue} isGlassmorphic={userSettings?.glassmorphismEnabled || false} />
      {isOffline && (
        <motion.div 
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="bg-slate-900/80 dark:bg-slate-950/80 text-white text-[9px] font-black uppercase text-center py-2.5 z-[100] flex items-center justify-center gap-2 sticky top-0 backdrop-blur-xl border-b border-white/5"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="tracking-widest">Tryb Offline - Funkcje mogą być ograniczone</span>
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
      <header className="bg-white/40 dark:bg-[#020617]/40 backdrop-blur-2xl p-4 sticky top-0 z-40 border-b border-black/5 dark:border-white/5 pt-12 transition-all">
        <div className="flex justify-between items-center max-w-md lg:max-w-5xl mx-auto">
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
            <div className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform" onClick={() => {
              Haptics.selection();
              setShowStatusPopup(true);
            }}>
              <Logo className="w-10 h-10 drop-shadow-sm group-hover:rotate-12 transition-transform" />
              <div>
                <h1 className="text-lg font-black tracking-tighter leading-none dark:text-white uppercase font-display">GlikoControl</h1>
                <p className="text-accent-500 text-[7px] font-black uppercase tracking-[0.2em] mt-1 opacity-90 flex items-center gap-1.5 font-mono">
                  <span className="w-1 h-1 rounded-full bg-accent-500 animate-pulse" />
                  v{APP_VERSION}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotebookManager user={user} />
            <NotificationCenter userSettings={userSettings} theme={theme} />
            <MediaWidget enabled={userSettings?.mediaWidgetEnabled || false} logs={logs} />
            <button 
              onClick={() => {
                Haptics.light();
                toggleTheme();
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-accent-400 border border-transparent dark:border-slate-700 transition-all active:scale-90"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {user && !user.isAnonymous && user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-7 h-7 rounded-full border border-accent-500/50 shadow-sm" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)] ml-2" />
            )}
          </div>
        </div>
        {/* Unified Audio Player for PWA Support */}
        <audio 
          id="pwa-media-player"
          src="data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAHRoZW9yZXRpY2FsLm5ldAD/48BAAAAAAArAAAAAAAAAAABmxhbWUzLjk5AFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX"
          loop 
          playsInline 
        />
      </header>

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeTab={activeTab} 
        changeTab={changeTab} 
        onAction={(action) => {
          if (action === 'tutorial') {
            setShowTutorial(true);
          } else {
            setInitialAction(action);
          }
        }}
        theme={theme} 
        isChildMode={userSettings?.childMode}
      />

      {/* Main Content with Swipe Navigation */}
      <main ref={mainRef} className="flex-1 max-w-md lg:max-w-5xl mx-auto w-full relative overflow-y-auto touch-pan-y overflow-x-hidden">
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
            className="w-full h-full p-4 pb-32 will-change-transform flex flex-col"
          >
            {currentTabContent}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass backdrop-blur-3xl border-t border-white/40 dark:border-white/5 z-50 pb-safe rounded-t-[2.5rem] shadow-2xl">
        <div className="max-w-md lg:max-w-5xl mx-auto flex items-center justify-around h-20 px-2 group">
          <NavButton active={activeTab === 'chart'} onClick={() => changeTab('chart')} icon={<Activity />} label="Wykres" />
          <NavButton active={activeTab === 'dashboard'} onClick={() => changeTab('dashboard')} icon={<LayoutDashboard />} label="Pulpit" />
          <NavButton active={activeTab === 'database'} onClick={() => changeTab('database')} icon={<Database />} label="Baza" />
          
          <div className="relative -top-6">
            <motion.button 
              onClick={() => changeTab('meal')}
              whileTap={{ scale: 0.85 }}
              animate={{ y: activeTab === 'meal' ? -5 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-shadow shadow-xl border-4 border-slate-50 dark:border-slate-950 relative",
                activeTab === 'meal' ? "bg-accent-600 text-white shadow-accent-500/40" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              )}
            >
              <motion.div animate={{ rotate: activeTab === 'meal' ? [0, -20, 20, -10, 10, 0] : 0 }} transition={{ duration: 0.5 }}>
                <Utensils />
              </motion.div>
              {sharedPlate.length > 0 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-50 dark:border-slate-950 shadow-sm"
                >
                  {sharedPlate.length}
                </motion.div>
              )}
            </motion.button>
            <motion.div 
              animate={{ opacity: activeTab === 'meal' ? 1 : 0.6, y: activeTab === 'meal' ? -2 : 0 }}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase tracking-widest text-slate-400"
            >
               Talerz
            </motion.div>
          </div>

          <NavButton active={activeTab === 'assistant'} onClick={() => changeTab('assistant')} icon={<MessageSquare />} label="Czat" />
          <NavButton active={activeTab === 'ai'} onClick={() => changeTab('ai')} icon={<GlikoSenseIcon size={20} isAnalyzing={activeTab === 'ai'} />} label="GlikoSense" />
          <NavButton active={activeTab === 'profile'} onClick={() => changeTab('profile')} icon={<Menu />} label="Więcej" />
        </div>
      </nav>

      <Toaster 
        position="top-center" 
        toastOptions={{ 
          className: 'glass-card !text-slate-900 dark:!text-white !border-black/5 dark:!border-white/10 !shadow-2xl !rounded-[1.5rem] !text-[10px] !font-black !uppercase !tracking-widest !font-display !px-6 !py-3',
          duration: 3000,
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#fff',
            },
          }
        }} 
      />
      <AnimatePresence>
        {showTutorial && (
           <OnboardingTutorial onComplete={() => {
              setShowTutorial(false);
              localStorage.setItem('hasSeenTutorial', 'true');
           }} />
        )}
        {showPrivacyPopup && (
           <PrivacyPopup onAccept={handleAcceptPrivacy} />
        )}
        {showChangelog && (
           <ChangelogPopup onClose={handleCloseChangelog} />
        )}
      </AnimatePresence>

      <QuickStatusPopup 
        isOpen={showStatusPopup} 
        onClose={() => setShowStatusPopup(false)} 
        logs={logs}
        lastGlucose={lastGlucoseValue}
        iob={getEffectiveIOB(logs, pumpStatus, userSettings?.dia || 4)}
      />
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={() => {
        Haptics.light();
        onClick();
      }}
      className={cn(
        "flex flex-col items-center gap-1 relative flex-1 max-w-[60px] h-full justify-center transition-colors outline-none",
        active ? "text-accent-600 dark:text-accent-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      )}
    >
      <motion.div
        animate={{ 
          scale: active ? [0.8, 1.2, 1] : 1,
          y: active ? -2 : 0
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
          layoutId="nav-indicator"
          className="absolute bottom-2 w-1 h-1 rounded-full bg-accent-600 dark:bg-accent-400"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </button>
  );
}

