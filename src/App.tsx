import { getEffectiveUid } from './lib/utils';
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
  Beaker
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc, getDoc, setDoc, deleteDoc, writeBatch, limit } from 'firebase/firestore';
import { LogEntry, UserSettings, Product } from './types';
import { geminiService } from './services/gemini';
import { CATEGORIES, LIB_BASE, APP_VERSION } from './constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { notificationService } from './services/notificationService';
import { Toaster, toast } from 'react-hot-toast';

import Dashboard from './components/Dashboard';

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
const FoodDatabase = lazyWithReload(() => import('./components/FoodDatabase'));
const MealPlate = lazyWithReload(() => import('./components/MealPlate'));
const AiReports = lazyWithReload(() => import('./components/AiReports'));
const PumpSimulator = lazyWithReload(() => import('./components/PumpSimulator'));
const Profile = lazyWithReload(() => import('./components/Profile'));
const Achievements = lazyWithReload(() => import('./components/Achievements'));
const HistoryView = lazyWithReload(() => import('./components/HistoryView'));
const GlikoGames = lazyWithReload(() => import('./components/GlikoGames'));
const GlikoChat = lazyWithReload(() => import('./components/GlikoChat'));
const GlikoAssistant = lazyWithReload(() => import('./components/GlikoAssistant'));
import Sidebar from './components/Sidebar';
import { cn } from './lib/utils';
import { nightscoutService } from './services/nightscout';
import { maintenanceService } from './services/maintenanceService';

import Logo from './components/Logo';

import OnboardingTutorial from './components/OnboardingTutorial';
import NotificationCenter from './components/NotificationCenter';
import NotebookManager from './components/NotebookManager';
import ChangelogPopup from './components/ChangelogPopup';
import PrivacyPopup from './components/PrivacyPopup';
import { CURRENT_VERSION } from './constants/versions';

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
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sharedPlate, setSharedPlate] = useState<any[]>([]);

  useEffect(() => {
    // Check privacy acceptance locally first
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
        if (d.exists() && d.data().accepted) {
          localStorage.setItem('hasAcceptedPrivacy', 'true');
          setShowPrivacyPopup(false);
        } else {
          // If Firestore doesn't have it but localStorage does, sync it
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
      } catch (err) {
        console.error("Error saving privacy to Firestore:", err);
      }
    }
    
    // After privacy, if it's first run, tutorial might trigger elsewhere
    // If not first run but version changed, show changelog
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
    const defaultTabs = ['dashboard', 'database', 'meal', 'chat', 'ai', 'profile', 'games'];
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
    
    if (userSettings?.theme) {
      localStorage.setItem('theme', userSettings.theme);
    }
    if (userSettings?.accentColor) {
      localStorage.setItem('accentColor', userSettings.accentColor);
    }
  }, [userSettings?.theme, userSettings?.accentColor, userSettings?.bgOption]);

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

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

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
        // Fetch fewer entries periodically to prevent quota issues
        const entries = await nightscoutService.fetchEntries(nsUrl, nsSecret, 300); 
        const treatments = await nightscoutService.fetchTreatments(nsUrl, nsSecret, 100); 
        
        const devicestatus = await nightscoutService.fetchDeviceStatus(nsUrl, nsSecret);
        if (devicestatus) {
          const pumpRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'status', 'pump');
          console.log("[Nightscout Sync] Saving devicestatus to Firestore:", devicestatus);
          try {
            await setDoc(pumpRef, devicestatus, { merge: true });
          } catch (fsErr) {
            console.error("[Nightscout Sync] Firestore setDoc FAILED for pump status:", fsErr);
          }
        } else {
          console.log("No device status found in Nightscout data.");
        }
        
        const allNewLogs = [...entries, ...treatments];
        
        if (manual && allNewLogs.length === 0) {
            console.warn("Nightscout: Nie udało się pobrać żadnych danych. Sprawdź poprawność URL.");
        }
        
        // Use a set of unique fingerprints from current logs reference
        const existingFingerprints = new Set(logsRef.current.map(l => `${l.type}-${Math.floor(l.timestamp / 60000)}-${l.value}`));
        
        const newLogsToSync = allNewLogs.filter(newLog => {
           const fingerprint = `${newLog.type}-${Math.floor(newLog.timestamp / 60000)}-${newLog.value}`;
           return !existingFingerprints.has(fingerprint);
        });

        if (newLogsToSync.length > 0) {
          console.log(`Syncing ${newLogsToSync.length} new records via batch...`);
          
          const CHUNK_SIZE = 400;
          for (let i = 0; i < newLogsToSync.length; i += CHUNK_SIZE) {
              const chunk = newLogsToSync.slice(i, i + CHUNK_SIZE);
              const batch = writeBatch(db);
              
              for (const newLog of chunk) {
                 const { id: nsId, ...logData } = newLog;
                 const fingerprint = `${newLog.type}-${Math.floor(newLog.timestamp / 60000)}-${newLog.value}`;
                 const firestoreId = fingerprint.replace(/[^a-zA-Z0-9_\-]/g, '_');
                 const docRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs', firestoreId);
                 
                 batch.set(docRef, {
                   ...logData,
                   nsId: nsId || firestoreId,
                   createdAt: serverTimestamp()
                 }, { merge: true });
                 
                 existingFingerprints.add(fingerprint);
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

    const timeout = setTimeout(() => syncNightscout(false), 2000);
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
      const newSettings = { ...userSettings, theme: newTheme as 'light' | 'dark' | 'system' };
      setUserSettings(newSettings as UserSettings);
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
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
          <p className="text-accent-400 text-xs font-bold mb-8 italic">GlikoSense</p>

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
          </div>

          {authError && <p className="text-rose-500 text-[10px] font-bold mb-4 bg-rose-500/10 p-3 rounded-xl">{authError}</p>}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button onClick={handleLogin} className="flex items-center justify-center gap-2 bg-accent-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-accent-600/30 active:scale-95 transition-all">
              <LogIn size={14} />
              Wejdź
            </button>
            <button onClick={handleRegister} className={cn(
              "py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all",
              theme === 'dark' ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
            )}>Rejestracja</button>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={handleGoogle} className={cn(
              "flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border shadow-sm active:scale-95 transition-all",
              theme === 'dark' ? "bg-slate-950 text-white border-slate-800" : "bg-white text-slate-700 border-slate-200"
            )}>
              <Globe className="w-4 h-4 text-accent-500" />
              <span className="text-[10px] font-black uppercase tracking-wider">Kontynuuj przez Google</span>
            </button>
            
            <button onClick={handleAnonymous} className={cn(
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
    ? ['dashboard', 'database', 'meal', 'chat', 'assistant', 'ai', 'profile', 'games']
    : ['dashboard', 'database', 'meal', 'assistant', 'ai', 'profile'];
    
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
          pumpStatus={pumpStatus}
          nsUrl={nsUrl}
          nsSecret={nsSecret}
          petData={petData}
          syncStatus={syncStatus}
        />
      )}
      {activeTab === 'bolus' && (
        <BolusCalculator logs={logs} user={user} setTab={changeTab} />
      )}
      {activeTab === 'database' && (
        <FoodDatabase user={user} onAddToPlate={(product) => {
          setSharedPlate(prev => [...prev, { ...product, id: Math.random().toString(36).substr(2, 9), weight: 100 }]);
          changeTab('meal');
        }} />
      )}
      {activeTab === 'meal' && (
        <MealPlate user={user} setTab={changeTab} sharedPlate={sharedPlate} setSharedPlate={setSharedPlate} />
      )}
      {activeTab === 'chat' && (
        <GlikoChat petData={petData} />
      )}
      {activeTab === 'assistant' && (
        <GlikoAssistant user={user} logs={logs} settings={userSettings || undefined} />
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
        />
      )}
      {activeTab === 'achievements' && (
        <Achievements logs={logs} user={user} setTab={changeTab} petData={petData} />
      )}
      {activeTab === 'games' && (
        <GlikoGames logs={logs} user={user} setTab={changeTab} />
      )}
    </React.Suspense>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] flex flex-col transition-colors duration-300 overflow-hidden">
      {isOffline && (
        <motion.div 
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="bg-amber-500 text-slate-900 text-[10px] font-black uppercase text-center py-2 z-[100] flex items-center justify-center gap-2 sticky top-0"
        >
          <Zap size={12} className="animate-pulse" /> Tryb Offline - Funkcje mogą być ograniczone
        </motion.div>
      )}
      {authError && user && (
        <motion.div 
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="bg-rose-500 text-white text-[10px] font-black uppercase text-center py-2 z-[100] flex items-center justify-center gap-2 sticky top-0"
        >
          {authError}
        </motion.div>
      )}
      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl p-4 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800/20 pt-12 transition-all">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex items-center gap-4">
            <button
               onClick={() => setIsSidebarOpen(true)}
               className="p-2.5 -ml-2 rounded-2xl bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent dark:border-slate-800 shadow-sm active:scale-90"
            >
               <Menu size={20} strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-3" onClick={() => changeTab('dashboard')}>
              <Logo className="w-10 h-10 drop-shadow-sm" />
              <div>
                <h1 className="text-lg font-black tracking-tighter leading-none dark:text-white uppercase font-display">GlikoControl</h1>
                <p className="text-accent-500 text-[7px] font-black uppercase tracking-[0.2em] mt-1 opacity-90 flex items-center gap-1.5 font-mono">
                  <span className="w-1 h-1 rounded-full bg-accent-500 animate-pulse" />
                  SENSE v{APP_VERSION}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotebookManager user={user} />
            <NotificationCenter userSettings={userSettings} theme={theme} />
            <button 
              onClick={toggleTheme}
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
      <main className="flex-1 max-w-md mx-auto w-full relative overflow-y-auto touch-pan-y overflow-x-hidden">
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-50 pb-safe">
        <div className="max-w-md mx-auto flex items-center justify-around h-20 px-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => changeTab('dashboard')} icon={<LayoutDashboard />} label="Pulpit" />
          <NavButton active={activeTab === 'database'} onClick={() => changeTab('database')} icon={<Database />} label="Baza" />
          
          <div className="relative -top-6">
            <motion.button 
              onClick={() => changeTab('meal')}
              whileTap={{ scale: 0.85 }}
              animate={{ y: activeTab === 'meal' ? -5 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-shadow shadow-xl border-4 border-slate-50 dark:border-slate-950",
                activeTab === 'meal' ? "bg-accent-600 text-white shadow-accent-500/40" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              )}
            >
              <motion.div animate={{ rotate: activeTab === 'meal' ? [0, -20, 20, -10, 10, 0] : 0 }} transition={{ duration: 0.5 }}>
                <Utensils />
              </motion.div>
            </motion.button>
            <motion.div 
              animate={{ opacity: activeTab === 'meal' ? 1 : 0.6, y: activeTab === 'meal' ? -2 : 0 }}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase tracking-widest text-slate-400"
            >
               Talerz
            </motion.div>
          </div>

          <NavButton active={activeTab === 'ai'} onClick={() => changeTab('ai')} icon={<Activity />} label="GlikoSense" />
          <NavButton active={activeTab === 'profile'} onClick={() => changeTab('profile')} icon={<Settings />} label="Opcje" />
        </div>
      </nav>

      <Toaster position="top-center" toastOptions={{ className: 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl text-[10px] font-bold uppercase tracking-widest' }} />
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
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 relative w-16 h-full justify-center transition-colors outline-none",
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

