import { geminiService } from '../services/gemini';
import { Haptics } from '../lib/haptics';
import { toast } from "react-hot-toast";
import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, Reorder } from 'motion/react';
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
  MonitorPlay,
  AlertTriangle,
  Dumbbell
} from 'lucide-react';
import { db, auth, onConnectionChange } from '../lib/firebase';
import { deleteUser } from 'firebase/auth';
import { cn } from '../lib/utils';
import { doc, getDoc, getDocs, setDoc, collection, onSnapshot, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { notificationService } from '../services/notificationService';
import { UserSettings, LogEntry } from '../types';
import { APP_VERSION, SKINS, PetSkin, ACCESSORIES, BACKGROUNDS, PetAccessory, PetBackground } from '../constants';
import { VERSIONS } from '../constants/versions';

import CgmImport from './CgmImport';
import SettingsSync from './SettingsSync';
import SettingsTransfer from './SettingsTransfer';
import ApiIntegration from './ApiIntegration';
import PumpSimulator from './PumpSimulator';
import { Diets } from './Diets';
import StatisticsView from './StatisticsView';
import TutorialView from './TutorialView';
import GlikoTraining from './GlikoTraining';

interface ProfileProps {
  user: any;
  logs: LogEntry[];
  handleLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTab: (t: string) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  settings: UserSettings;
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
  settings: initialSettings
}: ProfileProps) {
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  
  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);
  const [petData, setPetData] = useState<{ 
    coins: number, 
    skin: string, 
    unlockedSkins: string[],
    level?: number,
    xp?: number,
    name?: string,
    lastLoginDate?: string,
    currentAccessory?: string,
    unlockedAccessories?: string[],
    currentBackground?: string,
    unlockedBackgrounds?: string[]
  }>({ 
    coins: 0, 
    skin: 'default', 
    unlockedSkins: ['default'], 
    name: 'Gliko',
    unlockedAccessories: ['none'],
    currentAccessory: 'none',
    unlockedBackgrounds: ['room'],
    currentBackground: 'room'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [nsSyncLoading, setNsSyncLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [cleaningLoading, setCleaningLoading] = useState(false);
  const [nsUrl, setNsUrl] = useState('');
  const [nsSecret, setNsSecret] = useState('');
  const [shopTab, setShopTab] = useState<'skins' | 'accessories' | 'backgrounds'>('skins');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [geminiSaveStatus, setGeminiSaveStatus] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  useEffect(() => {
    return onConnectionChange(setIsFirebaseConnected);
  }, []);

  const testKey = async () => {
    setIsTestingKey(true);
    try {
      await geminiService.generateContent("Test. Odpowiedz tylko słowem OK.");
      toast.success("Klucz API działa poprawnie!");
    } catch (e: any) {
      console.error("API Key Test Failed:", e);
      const msg = e?.message || String(e);
      if (msg.includes("API key not valid")) {
        toast.error("Klucz API jest nieprawidłowy.");
      } else {
        toast.error("Błąd połączenia z AI: " + msg);
      }
    } finally {
      setIsTestingKey(false);
    }
  };

  const [telemetryEnabled, setTelemetryEnabled] = useState(() => localStorage.getItem('glikosense_telemetry') === 'true');
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [newShortcut, setNewShortcut] = useState({ id: '', name: '', icon: '📌', type: 'meal', carbs: 0 });
  const [newMedication, setNewMedication] = useState<{
    id: string;
    name: string;
    dosage: string;
    reminders: string[];
    active: boolean;
    expiryDate?: string;
  } | null>(null);

  const icons = ['🍎', '🍌', '🍇', '🍓', '🥪', '🍕', '🍔', '🥤', '🍬', '🥣', '🍫', '🥨', '🍪', '🥛'];

  const [medLoading, setMedLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleaningResult, setCleaningResult] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isEditingTiles, setIsEditingTiles] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('glikosense_category_order');
    return saved ? JSON.parse(saved) : ['account', 'simulator', 'therapy', 'shop', 'devices', 'diets', 'stats', 'food', 'meds', 'api', 'system'];
  });
  
  useEffect(() => {
    localStorage.setItem('glikosense_category_order', JSON.stringify(categoryOrder));
  }, [categoryOrder]);

  useEffect(() => {
    if (activeCategory !== null) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeCategory]);

  const tabsRef = useRef<HTMLDivElement>(null);

  const orderedCategories = useMemo(() => {
    const ALL_CATEGORIES = [
      { id: 'tutorial', label: 'Samouczek', sub: 'FAQ & Pomoc', icon: <HelpCircle size={24} />, color: 'bg-indigo-500' },
      { id: 'simulator', label: 'Symulator', sub: 'Bolusa', icon: <Calculator size={24} />, color: 'bg-orange-500' },
      { id: 'account', label: 'Profil', sub: 'Zarządzanie kontem', icon: <User size={24} />, color: 'bg-blue-500' },
      { id: 'therapy', label: 'Terapia', sub: 'Cele & ISF', icon: <Activity size={24} />, color: 'bg-emerald-500' },
      { id: 'training', label: 'Trening', sub: 'Wpływ sportu', icon: <Dumbbell size={24} />, color: 'bg-emerald-500' },
      ...(settings.childMode ? [{ id: 'shop', label: 'Sklepik', sub: petData.name, icon: <ShoppingBag size={24} />, color: 'bg-amber-500' }] : []),
      { id: 'devices', label: 'Osprzęt', sub: 'CGM & Wkłucia', icon: <Signal size={24} />, color: 'bg-indigo-500' },
      { id: 'diets', label: 'Diety', sub: 'Nawyki', icon: <BookOpen size={24} />, color: 'bg-rose-500' },
      { id: 'stats', label: 'Statystyki', sub: 'Miesięczne', icon: <BarChart2 size={24} />, color: 'bg-indigo-600' },
      { id: 'food', label: 'Skróty', sub: 'Szybkie wpisy', icon: <Utensils size={24} />, color: 'bg-amber-500' },
      { id: 'meds', label: 'Leki', sub: 'Przypomnienia', icon: <Pill size={24} />, color: 'bg-teal-500' },
      { id: 'api', label: 'Integracje', sub: 'API & Chmura', icon: <Globe size={24} />, color: 'bg-sky-500' },
      { id: 'system', label: 'System', sub: 'Wygląd & Inne', icon: <Settings size={24} />, color: 'bg-slate-600' }
    ];
    const availableIds = ALL_CATEGORIES.map(c => c.id);
    const ordered = categoryOrder.filter(id => availableIds.includes(id)).map(id => ALL_CATEGORIES.find(c => c.id === id)!);
    const missing = ALL_CATEGORIES.filter(c => !categoryOrder.includes(c.id));
    return [...ordered, ...missing];
  }, [settings.childMode, petData.name, categoryOrder]);

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
      toast.error("Nie udało się wygenerować audytu.");
    } finally {
      setAuditLoading(false);
    }
  };

  const scrollTabs = (dir: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (initialAction) {
       if (initialAction === 'meds') setActiveCategory('meds');
       if (initialAction === 'simulator') setActiveCategory('simulator');
       if (initialAction === 'tutorial') setActiveCategory('tutorial');
       if (initialAction === 'stats') setActiveCategory('stats');
       if (initialAction === 'food') setActiveCategory('food');
       if (initialAction === 'api') setActiveCategory('api');
       if (initialAction === 'devices') setActiveCategory('devices');
       if (initialAction === 'shop') setActiveCategory('shop');
       if (initialAction === 'training') setActiveCategory('training');
       // clear action
       setTimeout(() => {
         onClearInitialAction && onClearInitialAction();
       }, 100);
    }
  }, [initialAction]);




  const [nukeLoading, setNukeLoading] = useState(false);
  const [showRodo, setShowRodo] = useState(false);

  const nukeAllData = async () => {
    if (!window.confirm("Czy na pewno chcesz usunąć konto i wszystkie swoje dane? Ta operacja jest nieodwracalna.")) {
      return;
    }
    
    if (!window.confirm("Czy jesteś w 100% pewny? To spowoduje bezpowrotne usunięcie konta i wylogowanie z aplikacji.")) {
      return;
    }

    setNukeLoading(true);
    Haptics.impact();
    try {
      const uid = getEffectiveUid(user);
      const userDocPath = `artifacts/diacontrolapp/users/${uid}`;
      
      // List of collections/docs to delete
      const collectionsToDelete = ['logs', 'shortcuts', 'customProducts', 'notifications', 'achievements'];
      const docsToDelete = ['settings/profile', 'settings/nightscout', 'pet/status', 'achievements/stats'];

      for (const collName of collectionsToDelete) {
        const collRef = collection(db, userDocPath, collName);
        const snapshot = await getDocs(collRef);
        for (const d of snapshot.docs) {
          await deleteDoc(doc(db, userDocPath, collName, d.id));
        }
      }

      for (const docPath of docsToDelete) {
        await deleteDoc(doc(db, userDocPath, ...docPath.split('/')));
      }

      await deleteDoc(doc(db, 'artifacts/diacontrolapp/users', uid));

      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (e) {
          console.warn("Could not delete auth user", e);
        }
      }

      toast.success("Wszystkie dane i konto zostały usunięte.");
      setTimeout(() => {
        handleLogout();
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Nuke failed:", err);
      toast.error("Błąd podczas usuwania danych.");
    } finally {
      setNukeLoading(false);
    }
  };

    const normalizeName = (name: string) => 
      name.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // usuwanie diakrytyków
        .replace(/[^a-z0-9%\s]/g, '') // usuwanie znaków specjalnych
        .replace(/\s+/g, ' '); // usuwanie wielokrotnych spacji

    const repairGIWithAI = async () => {
    if (cleaning) return;
    setCleaning(true);
    Haptics.medium();
    setCleaningResult("Skanowanie i audyt bazy produktów (AI)...");
    
    try {
      const uid = getEffectiveUid(user);
      const toFix: { id: string, name: string, coll: string, current: any }[] = [];
      const seenNames = new Map<string, string>(); // normalized name -> source:id
      const duplicatesToDelete: { id: string, coll: string }[] = [];
      let totalChecked = 0;
      
      // 1. Skan w produktach społecznościowych - najpierw budujemy bazę wzorcową
      const commRef = collection(db, 'artifacts', 'diacontrolapp', 'communityProducts');
      const commSnap = await getDocs(commRef);
      totalChecked += commSnap.docs.length;
      for (const docSnap of commSnap.docs) {
        const data = docSnap.data();
        if (data.name) {
          const normalized = normalizeName(data.name);
          if (!seenNames.has(normalized)) {
            seenNames.set(normalized, `community:${docSnap.id}`);
            toFix.push({ id: docSnap.id, name: data.name, coll: 'community', current: data });
          } else {
            // Jeśli baza społeczności ma duplikaty wewnętrzne, możemy je oznaczyć do usunięcia 
            // - system pozwoli na to tylko jeśli użytkownik ma uprawnienia, ale zazwyczaj pomijamy je w audycie
            console.log(`Zignorowano duplikat w społeczności: ${data.name}`);
          }
        }
      }

      // 2. Skan we własnych produktach - usuwamy te, które już są w społeczności lub się powtarzają
      const userRef = collection(db, 'artifacts', 'diacontrolapp', 'users', uid, 'customProducts');
      const userSnap = await getDocs(userRef);
      totalChecked += userSnap.docs.length;
      for (const docSnap of userSnap.docs) {
        const data = docSnap.data();
        if (data.name) {
          const normalized = normalizeName(data.name);
          // Sprawdzamy czy nazwa już występuje (niezależnie czy w społeczności czy we własnych dodanych wyżej)
          if (seenNames.has(normalized)) {
            duplicatesToDelete.push({ id: docSnap.id, coll: 'custom' });
          } else {
            seenNames.set(normalized, `custom:${docSnap.id}`);
            toFix.push({ id: docSnap.id, name: data.name, coll: 'custom', current: data });
          }
        }
      }

      if (duplicatesToDelete.length > 0) {
        setCleaningResult(`Znaleziono ${duplicatesToDelete.length} duplikatów. Usuwanie zbędnych wpisów...`);
        for (const dup of duplicatesToDelete) {
          const targetRef = doc(db, 'artifacts', 'diacontrolapp', 'users', uid, 'customProducts', dup.id);
          try {
            await deleteDoc(targetRef);
          } catch (e) {
            console.error("Delete failed for duplicate", dup.id, e);
          }
          Haptics.light();
        }
      }

      if (toFix.length === 0) {
        setCleaningResult(`Przeskanowano ${totalChecked} produktów. Baza jest czysta.`);
        setTimeout(() => setCleaningResult(null), 5000);
        setCleaning(false);
        return;
      }

      setCleaningResult(`Audyt AI dla ${toFix.length} produktów... Sprawdzam IG, ŁG oraz makroskładniki.`);
      
      // Batching 8 at a time for better performance and context window
      for (let i = 0; i < toFix.length; i += 8) {
        const batch = toFix.slice(i, i + 8);
        const batchDetails = batch.map(b => `${b.name} (Obecnie: IG=${b.current.gi}, ŁG=${b.current.gl}, W=${b.current.carbs}, B=${b.current.protein}, T=${b.current.fat})`).join("; ");
        
        const prompt = `Jesteś ekspertem dietetyki. Zweryfikuj i popraw parametry dla 100g następujących produktów: [${batchDetails}]. 
        ZADANIA: 
        1. Podaj poprawny Indeks Glikemiczny (IG - 0-100).
        2. Podaj poprawny Ładunek Glikemiczny (ŁG - dla 100g).
        3. Sprawdź poprawność makroskładników (Węglowodany, Białka, Tłuszcze w g/100g). Jeśli obecne wartości są błędne (np. 0 carbs dla ryżu), popraw je.
        
        Zwróć wynik jako JSON (mapa nazw): 
        {
          "nazwa_produktu": {
            "gi": liczba,
            "gl": liczba,
            "carbs": liczba,
            "protein": liczba,
            "fat": liczba
          }
        }. 
        Używaj TYLKO JSON. Wartości muszą być liczbami. Produkty mięsne/tłuste mają IG bliskie 0.`;
        
        try {
          const result = await geminiService.generateContent(prompt);
          const jsonMatch = result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
          if (jsonMatch) {
            const mapping = JSON.parse(jsonMatch[0]);
            for (const item of batch) {
              const audit = mapping[item.name];
              if (audit && typeof audit === 'object') {
                const targetRef = item.coll === 'custom' 
                  ? doc(db, 'artifacts', 'diacontrolapp', 'users', uid, 'customProducts', item.id)
                  : doc(db, 'artifacts', 'diacontrolapp', 'communityProducts', item.id);
                
                const updates: any = {};
                if (typeof audit.gi === 'number') updates.gi = audit.gi;
                if (typeof audit.gl === 'number') updates.gl = audit.gl;
                if (typeof audit.carbs === 'number') updates.carbs = audit.carbs;
                if (typeof audit.protein === 'number') updates.protein = audit.protein;
                if (typeof audit.fat === 'number') updates.fat = audit.fat;
                
                if (Object.keys(updates).length > 0) {
                  await updateDoc(targetRef, updates);
                }
              }
            }
          }
        } catch (e) {
          console.error("AI Audit batch failed", e);
        }
        
        const progress = Math.min(100, Math.round(((i + batch.length) / toFix.length) * 100));
        setCleaningResult(`Analiza i naprawa: ${progress}% (${i + batch.length}/${toFix.length})...`);
      }

      setCleaningResult(`Sukces! Przeanalizowano i zweryfikowano ${toFix.length} produktów.`);
      toast.success(`Zakończono inteligentny audyt ${toFix.length} produktów.`);
      setTimeout(() => setCleaningResult(null), 5000);
    } catch (err) {
      console.error(err);
      setCleaningResult("Błąd podczas inteligentnej naprawy.");
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const petRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status');
    
    const unsubscribePet = onSnapshot(petRef, (d) => {
      if (d.exists()) {
        const data = d.data();
        setPetData({
          coins: data.coins || 0,
          skin: data.skin || 'default',
          unlockedSkins: data.unlockedSkins || ['default'],
          level: data.level || 1,
          xp: data.xp || 0,
          name: data.name || 'Gliko',
          lastLoginDate: data.lastLoginDate || '',
          unlockedAccessories: data.unlockedAccessories || ['none'],
          currentAccessory: data.currentAccessory || 'none',
          unlockedBackgrounds: data.unlockedBackgrounds || ['room'],
          currentBackground: data.currentBackground || 'room'
        });
      }
    });

    const nsSettingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'nightscout');
    const unsubscribeNs = onSnapshot(nsSettingsRef, (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data) {
          setNsUrl(data.url || '');
          setNsSecret(data.secret || '');
        }
      }
    }, (error) => {
      if (!error.message?.includes('offline')) console.error("Error fetching NS settings:", error);
    });

    const unsubscribeShortcuts = onSnapshot(collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'shortcuts'), (snapshot) => {
      setShortcuts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubscribeNs();
      unsubscribeShortcuts();
      unsubscribePet();
    };
  }, [user]);

  const weeklyStats = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekLogs = logs.filter(l => new Date(l.timestamp).getTime() > oneWeekAgo);
    
    const glucoseLogs = weekLogs.filter(l => l.type === 'glucose');
    const mealLogs = weekLogs.filter(l => l.type === 'meal');
    
    const avgGlucose = glucoseLogs.length > 0 
      ? Math.round(glucoseLogs.reduce((acc, l) => acc + (l.value || 0), 0) / glucoseLogs.length) 
      : 0;
      
    const inRange = glucoseLogs.filter(l => l.value >= 70 && l.value <= 140).length;
    const tir = glucoseLogs.length > 0 ? Math.round((inRange / glucoseLogs.length) * 100) : 0;
    
    const activeDays = new Set(weekLogs.map(l => new Date(l.timestamp).toLocaleDateString())).size;

    return { avgGlucose, tir, activeDays, totalLogs: weekLogs.length, mealCount: mealLogs.length };
  }, [logs]);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(petData.name || 'Gliko');

  useEffect(() => {
    if (petData.name) {
      setNewName(petData.name);
    }
  }, [petData.name]);

  const updatePetName = async () => {
    if (!newName.trim()) return;
    try {
      await updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status'), {
        name: newName.trim()
      });
      setEditingName(false);
    } catch(e) {
      console.error(e);
    }
  };
  const stats = useMemo(() => {
    const mealLogs = logs.filter(l => l.type === 'meal');
    const glucoseLogs = logs.filter(l => l.type === 'glucose');
    const bolusLogs = logs.filter(l => l.type === 'bolus');
    
    const datesWithMeals = new Set(mealLogs.map(l => new Date(l.timestamp).toLocaleDateString()));
    const inRange = glucoseLogs.filter(l => l.value >= 70 && l.value <= 140).length;
    const tirRatio = glucoseLogs.length > 0 ? (inRange / glucoseLogs.length) * 100 : 0;

    const nightReadings = glucoseLogs.filter(l => {
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
      isConsistent: mealLogs.length > 0 && glucoseLogs.length > 0 && bolusLogs.length > 0
    };
  }, [logs]);

  const unlockedAchievementIds = useMemo(() => {
    const ids = [];
    if (stats.totalMeals >= 1) ids.push('first_meal');
    if (stats.totalGlucose > 8 && stats.tirRatio >= 65) ids.push('tir_master');
    if (stats.totalGlucose >= 12 && stats.tirRatio >= 80) ids.push('tir_ninja');
    if (stats.nightReadings >= 5) ids.push('night_owl');
    if (stats.isConsistent) ids.push('consistent');
    return ids;
  }, [stats]);

  const lastGlucose = useMemo(() => {
    const glucoseLogs = logs.filter(l => l.type === 'glucose');
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
      const petRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status');
      await updateDoc(petRef, {
        coins: petData.coins - skin.price,
        unlockedSkins: [...petData.unlockedSkins, skin.id],
        skin: skin.id
      });
    } catch (err) {
      console.error("Error buying skin:", err);
    }
  };

  const handleEquipSkin = async (skinId: string) => {
    if (!petData.unlockedSkins.includes(skinId)) return;
    Haptics.light();
    try {
      const petRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status');
      await updateDoc(petRef, { skin: skinId });
    } catch (err) {
      console.error("Error equipping skin:", err);
    }
  };

  const handleBuyAccessory = async (acc: PetAccessory) => {
    if (petData.coins < acc.price) return;
    const unlocked = petData.unlockedAccessories || ['none'];
    if (unlocked.includes(acc.id)) return;

    try {
      const petRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status');
      await updateDoc(petRef, {
        coins: petData.coins - acc.price,
        unlockedAccessories: [...unlocked, acc.id],
        currentAccessory: acc.id
      });
    } catch (err) {
      console.error("Error buying accessory:", err);
    }
  };

  const handleEquipAccessory = async (accId: string) => {
    try {
      const petRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status');
      await updateDoc(petRef, { currentAccessory: accId });
    } catch (err) {
      console.error("Error equipping accessory:", err);
    }
  };

  const handleBuyBackground = async (bg: PetBackground) => {
    if (petData.coins < bg.price) return;
    const unlocked = petData.unlockedBackgrounds || ['room'];
    if (unlocked.includes(bg.id)) return;
    if (bg.rewardTir) return;

    try {
      const petRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status');
      await updateDoc(petRef, {
        coins: petData.coins - bg.price,
        unlockedBackgrounds: [...unlocked, bg.id],
        currentBackground: bg.id
      });
    } catch (err) {
      console.error("Error buying background:", err);
    }
  };

  const handleEquipBackground = async (bgId: string) => {
    try {
      const petRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status');
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
        await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'shortcuts', id), data);
      } else {
        // Add
        const { id, ...data } = newShortcut;
        await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'shortcuts'), data);
      }
      setNewShortcut({ id: '', name: '', icon: '📌', type: 'meal', carbs: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteShortcut = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'shortcuts', id));
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
        const index = updatedMeds.findIndex(m => m.id === newMedication.id);
        if (index >= 0) updatedMeds[index] = { ...newMedication };
        toast.success("Lek został zaktualizowany!");
      } else {
        // Add
        updatedMeds.push({ ...newMedication, id: Date.now().toString() });
        toast.success("Lek dodany do apteczki!");
      }
      
      const newSettings = { ...settings, medications: updatedMeds };
      setSettings(newSettings);
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { medications: updatedMeds }, { merge: true });
      setNewMedication(null);
    } catch (e) {
      console.error(e);
      toast.error("Błąd zapisu leku");
    } finally {
      setMedLoading(false);
    }
  };

  const deleteMedication = async (id: string) => {
    if (!user) return;
    try {
      const updatedMeds = (settings.medications || []).filter(m => m.id !== id);
      const newSettings = { ...settings, medications: updatedMeds };
      setSettings(newSettings);
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { medications: updatedMeds }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // Live preview of settings before saving
    const root = window.document.documentElement;
    let activeTheme = settings.theme || theme;
    if (activeTheme === 'system') {
      activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.classList.remove('light', 'dark');
    root.classList.add(activeTheme);
    root.setAttribute('data-accent', settings.accentColor || 'accent');
    root.setAttribute('data-bg', settings.bgOption || 'default');
  }, [settings.theme, settings.accentColor, settings.bgOption, theme]);

  const saveSettings = async () => {
    if (!user) return;
    setSettingsLoading(true);
    try {
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), settings, { merge: true });
      toast("Ustawienia zapisane pomyślnie!");
    } catch (e) {
      console.error("Save settings error:", e);
      alert("Błąd podczas zapisywania ustawień: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveNsUrl = async () => {
    if (!user) return;
    try {
      let cleanUrl = nsUrl.trim().replace(/\/$/, "");
      if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
      }
      setNsUrl(cleanUrl);
      
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'nightscout'), { 
        url: cleanUrl,
        secret: nsSecret.trim() 
      });
      setSaveStatus("Zapisano pomyślnie!");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus("Błąd zapisu");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 relative min-h-[calc(100vh-8rem)]">
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
                      className="bg-slate-100 dark:bg-slate-800 border-2 border-accent-500 rounded-xl px-3 py-1 font-black text-lg outline-none w-32 dark:text-white"
                      autoFocus
                    />
                    <button onClick={updatePetName} className="text-emerald-500 p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all"><Check size={20} /></button>
                    <button onClick={() => setEditingName(false)} className="text-rose-500 p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"><X size={20} /></button>
                  </div>
                ) : (
                  <div 
                    className="flex items-center gap-2 group cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => { setNewName(petData.name || 'Gliko'); setEditingName(true); }}
                  >
                    <h2 className="text-2xl font-black dark:text-white">{petData.name || 'Gliko'}</h2>
                    <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-30 group-hover:opacity-100 transition-all">
                      <Smartphone size={10} />
                    </div>
                  </div>
                )}
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Poziom {petData.level}</p>
              </div>
            </div>
            <div className="bg-amber-100/50 dark:bg-amber-500/5 px-4 py-2 rounded-2xl flex items-center gap-2 border border-amber-100 dark:border-amber-500/20">
              <Coins size={16} className="text-amber-500" />
              <span className="text-lg font-black text-amber-600">{petData.coins}</span>
            </div>
          </div>


            <button 
              onClick={() => {
                Haptics.selection();
                setTab('achievements');
              }}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white p-6 rounded-[3rem] shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-between"
            >
            <div className="flex items-center gap-4 text-left">
              <div className="bg-white/20 p-3 rounded-[1.5rem] shrink-0">
                <Trophy size={28} />
              </div>
              <div>
                <h3 className="font-black text-lg leading-tight">System Osiągnięć</h3>
                <p className="text-white/80 text-xs font-medium">Sprawdź swoje postępy i zdobyte odznaki</p>
              </div>
            </div>
          </button>
        </>
      )}

      {activeCategory === null ? (
        <div className="pb-6 pt-2">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Więcej opcji</h2>
            <button
              onClick={() => {
                Haptics.selection();
                setIsEditingTiles(!isEditingTiles);
              }}
              className="text-xs font-bold text-accent-500 bg-accent-500/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              {isEditingTiles ? (
                <>Zakończ</>
              ) : (
                <><Edit2 size={12} /> Edytuj</>
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
            {orderedCategories.map(cat => (
              <Reorder.Item 
                key={cat.id} 
                value={cat.id}
                dragListener={isEditingTiles}
                className={cn("w-full relative", isEditingTiles && "touch-none")}
              >
                <div
                  onClick={() => {
                    if (isEditingTiles) return;
                    Haptics.selection();
                    setActiveCategory(cat.id);
                  }}
                  className={cn(
                    "w-full h-32 rounded-[1.75rem] flex flex-col p-4 transition-all duration-300 relative overflow-hidden group",
                    settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50",
                    !isEditingTiles && (settings.glassmorphismEnabled ? "hover:bg-white/10 dark:hover:bg-white/5 hover:shadow-xl hover:-translate-y-1 cursor-pointer" : "hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1 cursor-pointer"),
                    isEditingTiles && "opacity-90 scale-[0.98] cursor-grab active:cursor-grabbing border-slate-300 dark:border-slate-600"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-[1rem] flex items-center justify-center text-white mb-2 shadow-md shrink-0",
                    !isEditingTiles && "group-hover:scale-110 transition-transform",
                    cat.color
                  )}>
                    {cat.icon}
                  </div>
                  <div className="text-left mt-auto">
                    <p className="text-[11px] sm:text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white line-clamp-1">{cat.label}</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 group-hover:text-slate-600 transition-colors mt-0.5 line-clamp-2 leading-tight">{cat.sub}</p>
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
        <div className="mb-6 -mx-2 px-2 overflow-x-auto scrollbar-none">
          <div className="flex gap-2">
            <button 
              onClick={() => {
                Haptics.selection();
                setActiveCategory(null);
              }}
              className={cn("flex items-center gap-2 transition-colors duration-200 px-4 py-3 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest shrink-0", settings.glassmorphismEnabled ? "text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-slate-800/30 backdrop-blur-md bg-white/10 dark:bg-slate-900/10 border border-white/20" : "text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800")}
            >
              <ChevronLeft size={16} /> 
              <span>Wróć do Menu</span>
            </button>
            <div className={cn("flex rounded-[1.5rem] p-1 items-center", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50")}>
              {[
                { id: 'tutorial', label: 'Samouczek', icon: <HelpCircle size={14} /> },
                { id: 'simulator', label: 'Symulator', icon: <Calculator size={14} /> },
                { id: 'account', label: 'Profil', icon: <User size={14} /> },
                { id: 'therapy', label: 'Terapia', icon: <Activity size={14} /> },
                { id: 'training', label: 'Trening', icon: <Dumbbell size={14} /> },
                ...(settings.childMode ? [{ id: 'shop', label: 'Sklepik', icon: <ShoppingBag size={14} /> }] : []),
                { id: 'devices', label: 'Osprzęt', icon: <Signal size={14} /> },
                { id: 'diets', label: 'Diety', icon: <BookOpen size={14} /> },
                { id: 'stats', label: 'Statystyki', icon: <BarChart2 size={14} /> },
                { id: 'food', label: 'Skróty', icon: <Utensils size={14} /> },
                { id: 'meds', label: 'Leki', icon: <Pill size={14} /> },
                { id: 'api', label: 'API', icon: <Globe size={14} /> },
                { id: 'system', label: 'System', icon: <Settings size={14} /> }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    Haptics.selection();
                    setActiveCategory(cat.id);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap",
                    activeCategory === cat.id 
                      ? (settings.glassmorphismEnabled ? "bg-white/20 dark:bg-slate-700/30 shadow-sm text-slate-900 dark:text-white border border-white/20 dark:border-white/5" : "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white") 
                      : (settings.glassmorphismEnabled ? "text-slate-600 dark:text-slate-400 hover:bg-white/5 dark:hover:bg-slate-800/30" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")
                  )}
                >
                  <span className="opacity-70">{cat.icon}</span>
                  <span className="uppercase tracking-widest leading-none">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'account' && (
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
              <h2 className="text-base font-black dark:text-white mb-0.5">Twój Profil</h2>
              <p className="text-slate-400 text-[9px] font-bold mb-3 truncate max-w-[180px] mx-auto opacity-70">
                {user.email || 'Użytkownik Anonimowy'}
              </p>
              
              <div className="flex gap-2 justify-center">
                <button onClick={() => {
                  Haptics.medium();
                  handleLogout();
                }} className="group relative bg-white dark:bg-slate-800 text-rose-500 font-black text-[8px] px-5 py-2.5 rounded-lg uppercase tracking-[0.2em] shadow-md hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-500/20 overflow-hidden">
                   <span className="relative z-10 flex items-center gap-1">
                     <LogOut size={10} /> Wyloguj
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
                      Program Badawczy GlikoSense
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={telemetryEnabled}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setTelemetryEnabled(val);
                          localStorage.setItem('glikosense_telemetry', val ? 'true' : 'false');
                        }}
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-purple-500 shadow-inner"></div>
                    </label>
                </div>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-snug font-bold">
                  Pomóż społeczności. Włącz anonimowe udostępnianie wiedzy wyuczonej przez Twój model AI (GlikoSense).
                </p>
              </motion.div>
            </div>
          </div>

          <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg">
                <Trash size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.1em]">Strefa Niebezpieczeństwa</h4>
                <p className="text-[9px] text-slate-500 font-medium">Nieodwracalne usunięcie konta i wszystkich pomiarów</p>
              </div>
            </div>
            <button 
              onClick={nukeAllData}
              disabled={nukeLoading}
              className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
            >
              {nukeLoading ? <Loader2 className="animate-spin" size={14} /> : <LogOut size={16} />}
              Usuń Konto i Dane
            </button>
          </div>
        </motion.div>
      )}

      {/* Shop Tab Content Padding */}
      {activeCategory === 'shop' && (
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
                       onChange={e => setNewName(e.target.value)}
                       className="bg-transparent border-b border-white outline-none w-32 font-black text-sm"
                       autoFocus
                     />
                     <button onClick={updatePetName} className="p-1 hover:bg-white/20 rounded-lg"><Check size={16} /></button>
                     <button onClick={() => setEditingName(false)} className="p-1 hover:bg-white/20 rounded-lg"><X size={16} /></button>
                   </div>
                ) : (
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setNewName(petData.name); setEditingName(true); }}>
                    <h2 className="text-2xl font-black">{petData.name}</h2>
                    <Zap size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Twój portfel</p>
              </div>
              <div className="flex items-end gap-2">
                <h3 className="text-4xl font-black">{petData.coins}</h3>
                <span className="text-xl font-bold mb-1 opacity-90">monet</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-200" />
                  <span className="text-xs font-bold">Lvl: {petData.level}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shop Tabs */}
          <div className={cn("rounded-[2.5rem] p-6 border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
             <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl">
                {['skins', 'accessories', 'backgrounds'].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      Haptics.selection();
                      setShopTab(t as any);
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      shopTab === t 
                        ? "bg-white dark:bg-slate-700 text-accent-600 shadow-sm" 
                        : "text-slate-500"
                    )}
                  >
                    {t === 'skins' ? 'Skórki' : t === 'accessories' ? 'Dodatki' : 'Tła'}
                  </button>
                ))}
             </div>

             {shopTab === 'skins' && (
               <div className="grid grid-cols-2 gap-4">
                 {SKINS.map(skin => {
                   const isUnlocked = petData.unlockedSkins.includes(skin.id);
                   const isEquipped = petData.skin === skin.id;
                   const canUnlockViaAchievement = skin.unlockedBy && unlockedAchievementIds.includes(skin.unlockedBy);
                   const isAchievementSkin = !!skin.unlockedBy;

                   return (
                     <div key={skin.id} className={cn("p-4 rounded-[2rem] border-2 transition-all relative", isEquipped ? 'bg-accent-50/50 dark:bg-accent-500/5 border-accent-500' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent')}>
                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-3xl mx-auto mb-3 shadow-sm overflow-hidden">
                           {skin.imageUrl ? (
                             <img 
                               src={skin.imageUrl} 
                               className="w-10 h-10 object-contain" 
                               onError={(e) => {
                                 (e.target as HTMLImageElement).style.display = 'none';
                                 const p = (e.target as HTMLElement).parentElement;
                                 if (p && !p.querySelector('.fallback-icon')) {
                                   const s = document.createElement('span');
                                   s.className = 'fallback-icon';
                                   s.innerText = skin.icon;
                                   p.appendChild(s);
                                 }
                               }}
                             />
                           ) : skin.icon}
                        </div>
                        <h4 className="text-[10px] font-black dark:text-white mb-3 capitalize">{skin.name}</h4>
                        {isUnlocked ? (
                          <button onClick={() => handleEquipSkin(skin.id)} disabled={isEquipped} className={cn("w-full py-2 rounded-xl text-[9px] font-black uppercase", isEquipped ? "bg-accent-100 dark:bg-accent-950 text-accent-600" : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950")}>
                            {isEquipped ? 'Używasz' : 'Wybierz'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleBuySkin(skin)} 
                            disabled={isAchievementSkin ? !canUnlockViaAchievement : petData.coins < skin.price}
                            className={cn("w-full py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1", (isAchievementSkin ? canUnlockViaAchievement : petData.coins >= skin.price) ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400")}
                          >
                            <Coins size={10} /> {skin.price || 'FREE'}
                          </button>
                        )}
                     </div>
                   );
                 })}
               </div>
             )}

             {shopTab === 'accessories' && (
               <div className="grid grid-cols-2 gap-4">
                 {ACCESSORIES.map(acc => {
                   const isUnlocked = (petData.unlockedAccessories || ['none']).includes(acc.id);
                   const isEquipped = petData.currentAccessory === acc.id;

                   return (
                     <div key={acc.id} className={cn("p-4 rounded-[2rem] border-2 transition-all relative", isEquipped ? 'bg-accent-50/50 dark:bg-accent-500/5 border-accent-500' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent')}>
                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-3xl mx-auto mb-3 shadow-sm overflow-hidden">
                           {acc.imageUrl ? (
                             <img 
                               src={acc.imageUrl} 
                               className="w-10 h-10 object-contain" 
                               onError={(e) => {
                                 (e.target as HTMLImageElement).style.display = 'none';
                                 const p = (e.target as HTMLElement).parentElement;
                                 if (p && !p.querySelector('.fallback-icon')) {
                                    const s = document.createElement('span');
                                    s.className = 'fallback-icon';
                                    s.innerText = acc.icon;
                                    p.appendChild(s);
                                 }
                               }}
                             />
                           ) : acc.icon}
                        </div>
                        <h4 className="text-[10px] font-black dark:text-white mb-3 capitalize">{acc.name}</h4>
                        {isUnlocked ? (
                          <button onClick={() => handleEquipAccessory(acc.id)} disabled={isEquipped} className={cn("w-full py-2 rounded-xl text-[9px] font-black uppercase", isEquipped ? "bg-accent-100 dark:bg-accent-950 text-accent-600" : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950")}>
                            {isEquipped ? 'Nosisz' : 'Załóż'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleBuyAccessory(acc)} 
                            disabled={petData.coins < acc.price}
                            className={cn("w-full py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1", petData.coins >= acc.price ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400")}
                          >
                            <Coins size={10} /> {acc.price}
                          </button>
                        )}
                     </div>
                   );
                 })}
               </div>
             )}

             {shopTab === 'backgrounds' && (
               <div className="grid grid-cols-2 gap-4">
                 {BACKGROUNDS.map(bg => {
                   const isUnlocked = (petData.unlockedBackgrounds || ['room']).includes(bg.id);
                   const isEquipped = petData.currentBackground === bg.id;
                   const isReward = !!bg.rewardTir;

                   return (
                     <div key={bg.id} className={cn("p-4 rounded-[2rem] border-2 transition-all relative", isEquipped ? 'bg-accent-50/50 dark:bg-accent-500/5 border-accent-500' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent')}>
                        <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-3xl mx-auto mb-3 shadow-sm border border-white/20", bg.gradient)}>
                           {bg.icon}
                        </div>
                        <h4 className="text-[10px] font-black dark:text-white mb-3 capitalize">{bg.name}</h4>
                        {isUnlocked ? (
                          <button onClick={() => handleEquipBackground(bg.id)} disabled={isEquipped} className={cn("w-full py-2 rounded-xl text-[9px] font-black uppercase", isEquipped ? "bg-accent-100 dark:bg-accent-950 text-accent-600" : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950")}>
                            {isEquipped ? 'Ustawione' : 'Ustaw'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleBuyBackground(bg)} 
                            disabled={isReward || petData.coins < bg.price}
                            className={cn("w-full py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1", (!isReward && petData.coins >= bg.price) ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400")}
                          >
                            {isReward ? 'Cel TIR' : <><Coins size={10} /> {bg.price}</>}
                          </button>
                        )}
                     </div>
                   );
                 })}
               </div>
             )}
          </div>

          <div className={cn("rounded-[2.5rem] p-6 border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
             <div className="flex items-center gap-3 mb-4">
               <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600">
                 <Star size={20} />
               </div>
               <div className="text-left">
                  <h4 className="text-sm font-black dark:text-white">Jak zdobywać monety?</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Każdy wpis w dzienniku zasila Twój portfel!</p>
               </div>
             </div>
             <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { label: 'Glikemia', val: '+5' },
                  { label: 'Posiłek', val: '+10' },
                  { label: 'Bolus', val: '+8' },
                  { label: 'Aktywność', val: '+15' }
                ].map(item => (
                  <div key={item.label} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm glass-target">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{item.label}</span>
                    <span className="text-[10px] font-black text-amber-600">{item.val}</span>
                  </div>
                ))}
             </div>
          </div>
        </motion.div>
      )}

      {activeCategory === 'therapy' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 pb-20"
        >
          {/* Main Therapy Parameters */}
          <div className={cn("rounded-[2.5rem] p-6 border shadow-xl space-y-6", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
            <div className="flex items-center gap-4 mb-1">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                <Activity size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black dark:text-white leading-tight">Cele i Przeliczniki</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kluczowe parametry terapii</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Czułość & Dieta</h4>
                <div className="space-y-3">
                  <SettingInput label="Wrażliwość (ISF)" value={settings.isf} onChange={v => setSettings({ ...settings, isf: v })} />
                  <SettingInput label="Ratio WW" value={settings.wwRatio} onChange={v => setSettings({ ...settings, wwRatio: v })} />
                  <SettingInput label="Ratio WBT" value={settings.wbtRatio} onChange={v => setSettings({ ...settings, wbtRatio: v })} />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Zakresy Docelowe</h4>
                <div className="space-y-3">
                  <SettingInput label="Cel Dolny (Min)" value={settings.targetMin} onChange={v => setSettings({ ...settings, targetMin: v })} />
                  <SettingInput label="Cel Górny (Max)" value={settings.targetMax} onChange={v => setSettings({ ...settings, targetMax: v })} />
                  
                  <div className={cn("p-4 rounded-3xl border flex flex-col items-center justify-center text-center", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50")}>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Czas Insuliny (DIA)</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSettings({ ...settings, dia: Math.max(2, (settings.dia || 4) - 0.5) })}
                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400 hover:text-accent-500 transition-colors"
                      >
                        -
                      </button>
                      <span className="text-xl font-black dark:text-white">{settings.dia || 4}h</span>
                      <button 
                        onClick={() => setSettings({ ...settings, dia: Math.min(8, (settings.dia || 4) + 0.5) })}
                        className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400 hover:text-accent-500 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                Haptics.medium();
                saveSettings();
              }}
              disabled={settingsLoading}
              className="w-full bg-accent-600 hover:bg-accent-500 text-white py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-accent-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {settingsLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Zapisz parametry terapii
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TDI Calculator */}
            <div className={cn("rounded-[2.5rem] p-6 border shadow-xl space-y-4", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Zap size={18} />
                </div>
                <h3 className="text-[11px] font-black dark:text-white uppercase tracking-tight">Kalkulator TDI</h3>
              </div>
              <p className="text-[9px] text-slate-500 leading-relaxed font-bold">Dobowa dawka insuliny (TDI).</p>
              
              <div className="relative mt-4">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">jednostek</div>
                <input 
                  type="number" 
                  placeholder="np. 45" 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 pr-20 rounded-2xl font-black text-sm outline-none dark:text-white focus:ring-2 ring-amber-500/20 transition-all"
                  onChange={(e) => {
                    const tdi = parseFloat(e.target.value);
                    if (tdi > 0) {
                      const suggestedIsf = Math.round(1800 / tdi);
                      const suggestedWw = Number((500 / tdi).toFixed(1));
                      // Update settings with suggested values and provide feedback
                      setSettings(prev => ({
                        ...prev,
                        isf: suggestedIsf,
                        wwRatio: suggestedWw
                      }));
                      Haptics.light();
                    }
                  }}
                />
              </div>
              <p className="text-[8px] text-slate-400 font-bold text-center">Zmiana TDI automatycznie aktualizuje ISF i Ratio WW.</p>
            </div>

            {/* Advanced Profiles Preview Card */}
            <div 
              onClick={() => { /* scroll to next card maybe? */ }}
              className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <History size={18} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-tight">Profile dobowe</h3>
                </div>
                <p className="text-[9px] text-white/80 leading-snug font-bold">Ustaw parametry dla pór dnia.</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-indigo-500 bg-white/20"></div>)}
                </div>
                <span className="text-[8px] font-black bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest">Konfiguruj poniżej</span>
              </div>
            </div>
          </div>

          <div id="hourly-profiles" className={cn("rounded-[2.5rem] p-8 border shadow-xl space-y-6", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
            <div className="flex flex-col gap-4 mb-4">
               <button 
                onClick={performTherapyAudit}
                disabled={auditLoading}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-between group"
               >
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-white/20 rounded-2xl">
                     {auditLoading ? <Loader2 className="animate-spin" size={24} /> : <Brain size={24} />}
                   </div>
                   <div className="text-left">
                     <h3 className="text-base font-black uppercase tracking-tight">Ekspercki Audyt Terapii</h3>
                     <p className="text-[10px] font-bold text-white/80">Analiza trendów i optymalizacja parametrów (w tym sugerowane profile godzinowe)</p>
                   </div>
                 </div>
                 <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
               </button>

               {auditResult && (
                 <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={cn("p-6 rounded-[2rem] border shadow-inner relative", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700")}
                 >
                    <button 
                      onClick={() => setAuditResult(null)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-rose-500"
                    >
                      <X size={16} />
                    </button>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="text-amber-500" size={16} />
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Raport GlikoSense AI</h4>
                    </div>
                    <div 
                      className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 prose-strong:font-black prose-strong:text-slate-900 dark:prose-strong:text-white"
                      dangerouslySetInnerHTML={{ __html: auditResult }}
                    />
                 </motion.div>
               )}
            </div>

            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Zaawansowane Profile Godzinowe</h3>
            
            <div className="space-y-3">
              {(settings.hourlyProfiles || []).map((hp, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`fav-profile-${idx}-${hp.time}`} 
                  className={cn("flex items-center gap-3 p-4 rounded-[2rem] border group hover:shadow-md transition-all", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700")}
                >
                  <div className="relative">
                    <input type="time" value={hp.time} onChange={e => {
                      const newProfiles = [...(settings.hourlyProfiles || [])];
                      newProfiles[idx].time = e.target.value;
                      setSettings({ ...settings, hourlyProfiles: newProfiles });
                    }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl font-black text-xs outline-none dark:text-white" />
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="relative">
                       <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-400 uppercase">ISF</span>
                       <input type="number" step="0.1" value={hp.isf} onChange={e => {
                         const newProfiles = [...(settings.hourlyProfiles || [])];
                         newProfiles[idx].isf = Number(e.target.value);
                         setSettings({ ...settings, hourlyProfiles: newProfiles });
                       }} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pl-8 pr-2 py-2 rounded-xl font-black text-xs text-center dark:text-white" />
                    </div>
                    <div className="relative">
                       <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-400 uppercase">WW</span>
                       <input type="number" step="0.1" value={hp.wwRatio} onChange={e => {
                         const newProfiles = [...(settings.hourlyProfiles || [])];
                         newProfiles[idx].wwRatio = Number(e.target.value);
                         setSettings({ ...settings, hourlyProfiles: newProfiles });
                       }} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pl-8 pr-2 py-2 rounded-xl font-black text-xs text-center dark:text-white" />
                    </div>
                  </div>
                  <button onClick={() => {
                    const newProfiles = (settings.hourlyProfiles || []).filter((_, i) => i !== idx);
                    setSettings({ ...settings, hourlyProfiles: newProfiles });
                  }} className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 text-rose-500 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-90 transition-all">
                    <Trash size={14} />
                  </button>
                </motion.div>
              ))}
              
              <button onClick={() => {
                const newProfiles = [...(settings.hourlyProfiles || []), { time: '12:00', isf: 50, wwRatio: 10 }];
                setSettings({ ...settings, hourlyProfiles: newProfiles.sort((a,b) => a.time.localeCompare(b.time)) });
              }} className="w-full py-4 bg-accent-50 dark:bg-slate-800/50 text-accent-600 dark:text-accent-400 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] border-2 border-dashed border-accent-200 dark:border-slate-700 hover:bg-accent-100 transition-all flex items-center justify-center gap-2">
                <Plus size={16} /> Dodaj przedział czasowy
              </button>
            </div>
            
            <button onClick={() => {
              Haptics.impact();
              saveSettings();
            }} disabled={settingsLoading} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl">
              Zatwierdź profile czasowe
            </button>
          </div>
        </motion.div>
      )}

      {activeCategory === 'devices' && (
      <div className="space-y-4">
      <div className="glass p-6 rounded-[2.5rem] space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Kalibracja CGM</h3>
        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Jeżeli odczyty z CGM różnią się od glukometru, podaj wartość z krwi, a system skoryguje kolejne odczyty (offset kalibracji).</p>
        <div className="flex items-center gap-4">
           <div className="flex-1">
              <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Wartość z Glukometru (mg/dL)</label>
              <input 
                type="number" 
                id="cgmCalibrationInput"
                placeholder="np. 110" 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white text-center"
              />
           </div>
           <button 
              onClick={async () => {
                const input = document.getElementById('cgmCalibrationInput') as HTMLInputElement;
                const glukoValue = parseFloat(input?.value);
                if (glukoValue > 0) {
                  Haptics.medium();
                  // If we don't have current CGM bg we can't fully compute offset easily without current bg context, 
                  // but let's assume user just sets an explicit offset or we calculate it vs last known. 
                  // Without last known, we might just prompt. Let's do a simple prompt for now. 
                  const currentCgm = prompt("Jaka jest obecnie widoczna wartość na CGM?");
                  if (currentCgm) {
                    const offset = glukoValue - parseFloat(currentCgm);
                    const updates = { cgmCalibration: offset, cgmTimestamp: Date.now() };
                    setSettings(prev => ({ ...prev, ...updates }));
                    if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), updates, { merge: true });
                    alert(`Skalibrowano! Offset wynosi: ${offset > 0 ? '+' : ''}${offset} mg/dL.`);
                    input.value = '';
                    Haptics.success();
                  }
                } else {
                  Haptics.error();
                }
              }}
              className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest mt-4"
           >
              Kalibruj
           </button>
        </div>
        {settings.cgmCalibration ? (
           <div className="text-center">
             <span className="text-[10px] font-bold text-emerald-500">
               Aktywny offset: {settings.cgmCalibration > 0 ? '+' : ''}{settings.cgmCalibration} mg/dL
             </span>
             <button onClick={async () => {
                 const updateObj = { cgmCalibration: 0, cgmTimestamp: 0 };
                 setSettings({ ...settings, ...updateObj });
                 if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), updateObj, { merge: true });
             }} className="ml-4 text-[10px] text-rose-500 font-bold uppercase underline">Anuluj Kalibrację</button>
           </div>
        ) : null}
      </div>

      <div className="glass p-6 rounded-[2.5rem] space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Powiadomienia i Osprzęt</h3>
        <p className="text-[9px] text-slate-500 leading-relaxed font-medium text-center">Ustaw czasy życia dla Twojego osprzętu.</p>
        
        <div className="flex items-center justify-between p-3.5 bg-accent-50 dark:bg-slate-800/50 rounded-2xl border border-accent-100 dark:border-slate-700">
           <div className="flex items-center gap-2.5">
             <Bell className="text-accent-500" size={18} />
             <div>
                <p className="text-xs font-black dark:text-white leading-tight">Powiadomienia Push</p>
                <p className="text-[9px] font-medium text-slate-500">Ostrzeżenia o wymianie</p>
             </div>
           </div>
           <button 
             onClick={async () => {
               if (!settings.notificationsEnabled) {
                  if (window.self !== window.top) {
                    alert('📢 WAŻNE: Przeglądarki blokują powiadomienia PUSH wewnątrz podglądu (iframe).\n\nAby włączyć powiadomienia, kliknij przycisk "Otwórz w nowej karcie" (prawy górny róg) i spróbuj tam jesze raz.');
                    return;
                  }
                  const token = await notificationService.requestPermission();
                  if (token) {
                     setSettings({ 
                       ...settings, 
                       notificationsEnabled: true,
                       notificationPrefs: settings.notificationPrefs || { hypo: true, hyper: true, reminders: true, predictions: true }
                     });
                  } else {
                     setSettings({ ...settings, notificationsEnabled: false });
                  }
               } else {
                  setSettings({ ...settings, notificationsEnabled: false });
               }
             }}
             className={cn(
               "w-12 h-6 rounded-full transition-all relative flex items-center shadow-inner",
               settings.notificationsEnabled ? "bg-accent-500" : "bg-slate-300 dark:bg-slate-600"
             )}
           >
             <div className={cn(
               "w-4 h-4 rounded-full bg-white transition-all absolute shadow",
               settings.notificationsEnabled ? "left-7" : "left-1"
             )} />
           </button>
        </div>

        <div className={cn("space-y-4 transition-all", !settings.notificationsEnabled && "opacity-50 grayscale-[0.5]")}>
           {!settings.notificationsEnabled && (
             <p className="text-[10px] font-bold text-slate-500 pl-12">Włącz powiadomienia powyżej, aby skonfigurować rodzaje alertów.</p>
           )}
           <div className="grid grid-cols-2 gap-3 pl-12">
            {[
              { id: 'hypo', label: 'Niedocukrzenia', icon: <Activity size={14} className="text-rose-500" /> },
              { id: 'hyper', label: 'Przecukrzenia', icon: <Activity size={14} className="text-amber-500" /> },
              { id: 'reminders', label: 'Przypomnienia', icon: <Bell size={14} className="text-blue-500" /> },
              { id: 'predictions', label: 'Przewidywania AI', icon: <Zap size={14} className="text-emerald-500" /> }
            ].map((pref) => {
              const prefs = settings.notificationPrefs || { hypo: true, hyper: true, reminders: true, predictions: true };
              const isActive = prefs[pref.id as keyof typeof prefs];
              return (
                <button
                  key={pref.id}
                  disabled={!settings.notificationsEnabled}
                  onClick={() => {
                    setSettings({
                      ...settings,
                      notificationPrefs: { ...prefs, [pref.id]: !isActive }
                    });
                  }}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
                    isActive && settings.notificationsEnabled
                      ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm" 
                      : "bg-slate-50 dark:bg-slate-900 border-transparent opacity-60"
                  )}
                >
                  {pref.icon}
                  <span className={cn("text-[10px] font-black uppercase tracking-tight", (isActive && settings.notificationsEnabled) ? "text-slate-700 dark:text-white" : "text-slate-400")}>
                    {pref.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
           <div className={cn("group relative rounded-[2.5rem] p-6 border shadow-xl overflow-hidden", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors"></div>
              
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner">
                  <Signal size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">Sensor CGM</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Monitorowanie glikemii</p>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className={cn("p-4 rounded-2xl border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50")}>
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">Żywotność Sensora (dni)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      min="1" 
                      max="30"
                      value={settings.sensorDurationDays || 10} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        setSettings({ ...settings, sensorDurationDays: val > 0 ? val : 1 });
                      }} 
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl font-black text-sm outline-none dark:text-white focus:ring-2 ring-indigo-500/20 transition-all" 
                    />
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400">DNI</div>
                  </div>
                </div>

                <div className={cn("p-4 rounded-2xl border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50")}>
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">Data i godzina założenia</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                    <input 
                      type="datetime-local" 
                      value={settings.sensorChangeDate ? new Date(settings.sensorChangeDate - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} 
                      onChange={e => {
                        const d = new Date(e.target.value).getTime();
                        if (!isNaN(d)) setSettings({ ...settings, sensorChangeDate: d });
                      }} 
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3 pl-10 pr-3 rounded-xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-indigo-500/20 transition-all" 
                    />
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    const now = Date.now();
                    const updates = { sensorChangeDate: now };
                    setSettings(prev => ({ ...prev, ...updates }));
                    if (user) {
                      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), updates, { merge: true });
                      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs'), {
                        type: 'sensor_change',
                        value: 1,
                        timestamp: now,
                        createdAt: serverTimestamp(),
                        notes: 'Wymiana sensora',
                        source: 'system'
                      });
                    }
                    toast.success('Zapisano wymianę sensora!');
                  }} 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] mt-2 active:scale-95 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 group/btn"
                >
                  <Sparkles size={14} className="group-hover:animate-pulse" />
                  Wymieniłem sensor teraz
                </button>
              </div>
           </div>

           <div className={cn("group relative rounded-[2.5rem] p-6 border shadow-xl overflow-hidden", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-teal-500/10 transition-colors"></div>
              
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shadow-inner">
                  <Droplets size={22} />
                </div>
                <div>
                  <h4 className="text-base font-black dark:text-white uppercase tracking-tight">Zestaw Infuzyjny</h4>
                  <p className="text-[10px] font-bold text-teal-600/60 dark:text-teal-400/60 uppercase tracking-[0.2em] mt-1">Wkłucie i dreny</p>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className={cn("p-4 rounded-2xl border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50")}>
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">Żywotność Wkłucia (dni)</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" 
                      min="1" 
                      max="7"
                      value={settings.infusionSetDurationDays || 3} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        setSettings({ ...settings, infusionSetDurationDays: val > 0 ? val : 1 });
                      }} 
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl font-black text-sm outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all" 
                    />
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400">DNI</div>
                  </div>
                </div>

                <div className={cn("p-4 rounded-2xl border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50")}>
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-1.5 block">Data i godzina założenia</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500 pointer-events-none" />
                    <input 
                      type="datetime-local" 
                      value={settings.infusionSetChangeDate ? new Date(settings.infusionSetChangeDate - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} 
                      onChange={e => {
                        const d = new Date(e.target.value).getTime();
                        if (!isNaN(d)) setSettings({ ...settings, infusionSetChangeDate: d });
                      }} 
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3 pl-10 pr-3 rounded-xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all" 
                    />
                  </div>
                </div>

                <button 
                  onClick={async () => {
                    const now = Date.now();
                    const updates = { infusionSetChangeDate: now };
                    setSettings(prev => ({ ...prev, ...updates }));
                    if (user) {
                      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), updates, { merge: true });
                      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'logs'), {
                        type: 'site_change',
                        value: 1,
                        timestamp: now,
                        createdAt: serverTimestamp(),
                        notes: 'Wymiana wkłucia',
                        source: 'system'
                      });
                    }
                    toast.success('Zapisano wymianę wkłucia!');
                  }} 
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white p-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] mt-2 active:scale-95 transition-all shadow-xl shadow-teal-600/20 flex items-center justify-center gap-2 group/btn"
                >
                  <Sparkles size={16} className="group-hover:animate-spin transition-all" />
                  Wymieniłem Dzisiaj
                </button>
              </div>
           </div>
        </div>
        <button onClick={saveSettings} disabled={settingsLoading} className="w-full bg-accent-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-accent-600/20 active:scale-95 transition-all mt-4">
          Zapisz Żywotność
        </button>
      </div>
      </div>
      )}

      {activeCategory === 'food' && (
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
                  <h3 className="text-sm font-black dark:text-white uppercase tracking-tight">Auto-Magia: IG, ŁG, Makro & Duplikaty</h3>
                  <p className="text-[10px] text-slate-500 font-bold">Automatycznie sprawdzaj, poprawiaj wartości oraz usuwaj duplikaty produktów.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.autoGIEnabled || false}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setSettings({ ...settings, autoGIEnabled: val });
                    Haptics.medium();
                    if (val) toast.success("Automatyczne pobieranie IG/ŁG włączone!");
                  }}
                />
                <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500 shadow-inner"></div>
              </label>
            </div>
            
            <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-500/10 flex flex-col gap-3">
               <button 
                  onClick={repairGIWithAI}
                  disabled={cleaning}
                  className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-amber-200/50 font-black text-[9px] uppercase tracking-widest shadow-sm active:scale-95"
               >
                 {cleaning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                 START AUDYTU: IG, ŁG i DUPLIKATY
               </button>
               <p className="text-[8px] text-amber-700/60 dark:text-amber-400/40 font-bold px-2 text-center leading-tight">
                 AI przeanalizuje Twoje produkty, aby zweryfikować Indeks Glikemiczny, Ładunek, makroskładniki oraz usunąć powtarzające się nazwy.
               </p>
            </div>
            {cleaningResult && (
              <p className="mt-2 text-[8px] font-black text-amber-600 dark:text-amber-400 animate-pulse text-center">{cleaningResult}</p>
            )}
          </div>

          <div className={cn("rounded-[2.5rem] p-6 border shadow-xl", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl">
                <Utensils size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black dark:text-white leading-tight">Szybkie Posiłki</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Twoje ulubione skróty</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {shortcuts.map(s => (
                <motion.div 
                  layout
                  key={s.id} 
                  className={cn("group flex items-center justify-between p-4 rounded-[1.8rem] border hover:shadow-lg transition-all", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset hover:bg-white/10 dark:hover:bg-white/10" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800")}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-transform group-hover:scale-110 glass-target">
                      {s.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black dark:text-white">{s.name}</p>
                      <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">{s.carbs || 0}g węgli • {(s.carbs/10).toFixed(1)} WW</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setNewShortcut({ id: s.id, name: s.name, icon: s.icon, type: s.type || 'meal', carbs: s.carbs || 0 })}
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
                onClick={() => setNewShortcut({ id: '', name: '', icon: '🥗', type: 'meal', carbs: 0 })}
                className="flex items-center justify-center gap-3 p-4 rounded-[1.8rem] border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-accent-500 hover:bg-accent-500/5 text-slate-400 hover:text-accent-500 transition-all font-black text-[10px] uppercase tracking-widest"
              >
                <Plus size={18} /> Dodaj nowy skrót
              </button>
            </div>

            {newShortcut && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={cn("p-6 rounded-[2rem] border space-y-4 shadow-inner", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700")}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-2">
                    {newShortcut.id ? 'Edycja skrótu' : 'Nowy skrót'}
                  </h4>
                  {newShortcut.id && (
                    <button onClick={() => setNewShortcut({ id: '', name: '', icon: '📌', type: 'meal', carbs: 0 })} className="text-rose-500">
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {icons.map(icon => (
                    <button 
                      key={icon}
                      onClick={() => setNewShortcut({...newShortcut, icon})}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-xl text-xl transition-all",
                        newShortcut.icon === icon ? "bg-accent-500 shadow-lg scale-110" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Nazwa posiłku</label>
                    <input 
                      type="text" 
                      placeholder="np. Szybkie Śniadanie" 
                      value={newShortcut.name}
                      onChange={e => setNewShortcut({...newShortcut, name: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl font-bold text-sm outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Węglowodany (g)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="0" 
                        value={newShortcut.carbs || ''}
                        onChange={e => setNewShortcut({...newShortcut, carbs: Number(e.target.value)})}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 pr-12 rounded-xl font-bold text-sm outline-none dark:text-white"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">G</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={saveShortcut}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                >
                  {newShortcut.id ? 'Zapisz zmiany' : 'Zatwierdź i dodaj'}
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {activeCategory === 'meds' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4 pb-20"
        >
          <div className={cn("rounded-[2.5rem] p-6 border shadow-xl space-y-6", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-teal-500/10 text-teal-600 rounded-2xl">
                <Pill size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black dark:text-white leading-tight">Twoje Leki</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Harmonogram</p>
              </div>
            </div>

            <div className="space-y-4">
              {(settings.medications || []).map(med => (
                <motion.div 
                  layout
                  key={med.id} 
                  className={cn(
                    "relative overflow-hidden p-5 rounded-[2rem] border transition-all flex flex-col group",
                    med.active 
                      ? (settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700") 
                      : "bg-slate-100/50 dark:bg-slate-900 border-transparent opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                        med.active ? "bg-teal-500/10 text-teal-600" : "bg-slate-200 text-slate-400"
                      )}>
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
                            <span key={`med-rem-${med.id}-${i}`} className="flex items-center gap-1.5 text-[9px] font-black bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-xl shadow-sm">
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
                          const updatedMeds = settings.medications!.map(m => m.id === med.id ? { ...m, ...updates } : m);
                          setSettings(prev => ({ ...prev, medications: updatedMeds }));
                          await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { medications: updatedMeds }, { merge: true });
                        }}
                        className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm active:scale-95 transition-all",
                          med.active ? "bg-teal-500 text-white" : "bg-slate-200 text-slate-400 dark:bg-slate-700"
                        )}
                      >
                        {med.active ? 'Aktywny' : 'Pauza'}
                      </button>
                    </div>
                  </div>

                  {med.expiryDate && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                      <p className={cn(
                        "text-[9px] font-bold flex items-center gap-1.5",
                        new Date(med.expiryDate).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000 
                          ? 'text-rose-500 animate-pulse' 
                          : 'text-slate-400'
                      )}>
                        <Calendar size={12} />
                        Data ważności: <span className="uppercase">{med.expiryDate}</span>
                      </p>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setNewMedication({ ...med, expiryDate: med.expiryDate || '' })} className="p-2 text-slate-400 hover:text-accent-500 transition-colors">
                          <Settings size={14} />
                        </button>
                        <button onClick={() => deleteMedication(med.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              <button 
                onClick={() => setNewMedication({ id: '', name: '', dosage: '', reminders: ['08:00'], active: true, expiryDate: '' })}
                className="w-full py-5 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-teal-500 hover:bg-teal-500/5 hover:text-teal-600 transition-all flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-[0.2em]"
              >
                <Plus size={20} /> Dodaj nowy lek
              </button>
            </div>

            {newMedication && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn("p-6 rounded-[2rem] border space-y-5", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700")}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-1">Konfiguracja</h4>
                  <button onClick={() => setNewMedication(null)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all">
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Nazwa</label>
                    <input 
                      type="text" 
                      placeholder="np. Metformina" 
                      value={newMedication.name}
                      onChange={e => setNewMedication({...newMedication, name: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Dawka</label>
                    <input 
                      type="text" 
                      placeholder="np. 500mg" 
                      value={newMedication.dosage}
                      onChange={e => setNewMedication({...newMedication, dosage: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold text-xs outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Przypomnienia</label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                      {newMedication.reminders.map((rem, idx) => (
                        <div key={`new-med-rem-${idx}`} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded-lg py-1 px-1.5 border border-slate-100 dark:border-slate-700">
                          <input type="time" value={rem} onChange={e => {
                             const updatedRems = [...newMedication.reminders];
                             updatedRems[idx] = e.target.value;
                             setNewMedication({...newMedication, reminders: updatedRems});
                          }} className="text-[9px] font-black bg-transparent outline-none dark:text-white w-12" />
                          <button onClick={() => {
                             const updatedRems = newMedication.reminders.filter((_, i) => i !== idx);
                             setNewMedication({...newMedication, reminders: updatedRems});
                          }} className="p-0.5 text-rose-500"><X size={10}/></button>
                        </div>
                      ))}
                      <button onClick={() => setNewMedication({...newMedication, reminders: [...newMedication.reminders, '12:00']})} className="w-6 h-6 rounded-full bg-teal-500 text-white flex items-center justify-center active:scale-90 transition-all">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Wygasa</label>
                    <div className="relative">
                      <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" />
                      <input 
                        type="date" 
                        value={newMedication.expiryDate}
                        onChange={e => setNewMedication({...newMedication, expiryDate: e.target.value})}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-3 pl-9 pr-3 rounded-xl font-bold text-[10px] outline-none dark:text-white focus:ring-2 ring-teal-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={saveMedication}
                  disabled={medLoading}
                  className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-teal-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {medLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {newMedication.id ? 'Aktualizuj' : 'Zapisz lek'}
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {activeCategory === 'simulator' && (
        <PumpSimulator settings={settings} />
      )}

      {activeCategory === 'tutorial' && (
        <TutorialView setTab={() => setActiveCategory(null)} />
      )}

      {activeCategory === 'training' && (
        <GlikoTraining 
          isOpen={true} 
          onClose={() => setActiveCategory(null)} 
          isGlassmorphic={settings.glassmorphismEnabled} 
          user={user}
          settings={settings}
          currentSugar={lastGlucose}
        />
      )}

      {activeCategory === 'api' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 pb-20"
        >
          <ApiIntegration user={user} />
          
          <div className={cn("rounded-[2.5rem] p-6 border shadow-xl space-y-4", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/10 text-sky-600 rounded-2xl">
                  <Globe size={20} />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-black dark:text-white leading-tight">Pobieranie Danych</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Źródła glikemii</p>
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                isFirebaseConnected 
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                  : "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", isFirebaseConnected ? "bg-emerald-500" : "bg-rose-500")} />
                Cloud: {isFirebaseConnected ? "Połączony" : "Brak połączenia"}
              </div>
            </div>

            <div className="bg-sky-50 dark:bg-sky-900/10 p-6 rounded-[2rem] border border-sky-100 dark:border-sky-800/50 space-y-3">
              <div className="flex items-center gap-3">
                <Smartphone className="text-sky-500" size={20} />
                <span className="text-xs font-black dark:text-white uppercase tracking-tight">Dexcom i Libre Link</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                GlikoControl obsługuje te sensory poprzez darmowy mostek <b>Nightscout</b> (np. NightscoutPro / T1Pal). Podłącz swoje konto CGM do Nightscouta, a my pobierzemy dane automatycznie co 5 minut.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Adres serwera (np. Nightscout / xDrip)</label>
                <div className="relative group">
                  <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-accent-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="https://tvoja-strona.herokuapp.com" 
                    value={nsUrl}
                    onChange={e => setNsUrl(e.target.value)}
                    onBlur={saveNsUrl}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 pl-12 pr-4 rounded-2xl font-bold text-sm outline-none dark:text-white transition-all focus:ring-4 ring-accent-500/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">API Secret (opcjonalnie)</label>
                <div className="relative group">
                  <LucideLock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-accent-500 transition-colors" />
                  <input 
                    type="password" 
                    placeholder="Wpisz klucz zabezpieczający" 
                    value={nsSecret}
                    onChange={e => setNsSecret(e.target.value)}
                    onBlur={saveNsUrl}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 pl-12 pr-4 rounded-2xl font-bold text-sm outline-none dark:text-white transition-all focus:ring-4 ring-accent-500/10"
                  />
                </div>
              </div>

              <div className={cn("p-4 rounded-2xl border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Activity size={12} /> Status synchronizacji
                </p>
                <div className="flex items-center justify-between">
                  {saveStatus ? (
                    <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {saveStatus}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-slate-400 uppercase">Czekam na zmiany...</span>
                  )}
                  <button 
                    onClick={async () => {
                      if (!nsUrl) return;
                      setNsSyncLoading(true);
                      await saveNsUrl();
                      window.dispatchEvent(new Event('force-nightscout-sync'));
                      setTimeout(() => setNsSyncLoading(false), 2000);
                    }}
                    disabled={nsSyncLoading}
                    className="flex items-center gap-2 text-[10px] font-black text-accent-500 uppercase tracking-widest hover:text-accent-600 active:scale-95 transition-all"
                  >
                    <RefreshCw size={12} className={cn(nsSyncLoading && "animate-spin")} />
                    Wymuś teraz
                  </button>
                </div>
              </div>
            </div>

            <CgmImport user={user} onComplete={() => window.dispatchEvent(new Event('force-nightscout-sync'))} />

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Zap size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">Własny Klucz Gemini AI</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Prywatny mózg analityczny</p>
                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <p className={cn("text-[9px] font-black uppercase tracking-widest leading-none", geminiService.getAiStatus().color)}>
                      Status: {geminiService.getAiStatus().label}
                    </p>
                  </div>
                </div>
              </div>

              <div className={cn("p-5 rounded-[1.5rem] border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/50")}>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed font-medium">
                  Aby uniknąć limitów serwerowych, możesz dodać swój darmowy klucz z <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent-500 font-black hover:underline underline-offset-2 transition-all">Google AI Studio</a>. Klucz zostanie zapisany <b>wyłącznie lokalnie</b> w Twojej przeglądarce.
                </p>
                <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <p className="text-[10px] font-bold leading-relaxed">
                    Ze względów bezpieczeństwa dodawaj swój klucz API <b className="font-black">tylko na własnych, zaufanych urządzeniach</b>. Nie wprowadzaj go na urządzeniach publicznych.
                  </p>
                </div>
                
                <div className="relative group">
                  <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <input 
                    type="password" 
                    placeholder="AIzaSy..." 
                    value={geminiApiKey}
                    onChange={e => setGeminiApiKey(e.target.value)}
                    onBlur={() => {
                      const val = geminiApiKey.trim();
                      setGeminiApiKey(val);
                      if (val) {
                        localStorage.setItem('gemini_api_key', val);
                        setGeminiSaveStatus('Zapisano pomyślnie ✓');
                      } else {
                        localStorage.removeItem('gemini_api_key');
                        setGeminiSaveStatus('Usunięto klucz ✓');
                      }
                      setTimeout(() => setGeminiSaveStatus(''), 2000);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-4 pl-12 pr-4 rounded-xl font-bold text-sm outline-none dark:text-white"
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
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isTestingKey ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} className="text-amber-500" />}
                    Testuj Połączenie
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeCategory === 'diets' && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="pb-20"
        >
          <Diets user={user} setTab={setTab} settings={settings} />
        </motion.div>
      )}

      {activeCategory === 'stats' && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="pb-20 space-y-4"
        >
          <StatisticsView logs={logs} />
        </motion.div>
      )}

      {activeCategory === 'system' && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4 pb-20"
        >
          {/* System & Experience Section */}
          <div className={cn("rounded-[2.5rem] p-6 border shadow-xl space-y-4", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-violet-500/10 text-violet-600 rounded-2xl">
                <Settings size={20} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black dark:text-white leading-tight">System i Wygląd</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Personalizacja</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Toggles */}
              <div className="grid grid-cols-1 gap-3">
                <div className="group flex items-center justify-between p-5 bg-amber-50 dark:bg-amber-500/5 rounded-[2rem] border border-amber-100 dark:border-amber-900/20 transition-all hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Baby size={22} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black dark:text-amber-500 leading-tight">Tryb Dziecka</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">Aktywuje wirtualnego zwierzaka Gliko</p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const newVal = !settings.childMode;
                      setSettings(prev => ({ ...prev, childMode: newVal }));
                      if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { childMode: newVal }, { merge: true });
                    }}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative flex items-center shadow-inner",
                      settings.childMode ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full bg-white transition-all absolute shadow-lg",
                      settings.childMode ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className={cn("group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Smartphone size={22} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black dark:text-white leading-tight">Widgety Statusu</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">Monitoruj baterię telefonu i osprzętu</p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const newVal = settings.showPumpWidget === false ? true : false;
                      setSettings(prev => ({ ...prev, showPumpWidget: newVal }));
                      if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { showPumpWidget: newVal }, { merge: true });
                    }}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative flex items-center shadow-inner",
                      settings.showPumpWidget !== false ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full bg-white transition-all absolute shadow-lg",
                      settings.showPumpWidget !== false ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className={cn("group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900/30 text-slate-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Zap size={22} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black dark:text-white leading-tight">Haptyka</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">Wibracje przy klikaniu przycisków</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const current = localStorage.getItem('gliko_haptics_enabled') !== 'false';
                      localStorage.setItem('gliko_haptics_enabled', String(!current));
                      // Force a re-render
                      window.dispatchEvent(new Event('storage'));
                      // We need to trigger a local state update to show visual toggle change
                      // but since we don't have local state here easily without refactoring, 
                      // we'll just use the fact that buttons re-render on parent render.
                      // Actually, let's use a small trick: update a settings field that doesn't matter much or just trigger a parent update.
                      setSettings({...settings}); 
                    }}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative flex items-center shadow-inner",
                      (localStorage.getItem('gliko_haptics_enabled') !== 'false') ? "bg-accent-500" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full bg-white transition-all absolute shadow-lg",
                      (localStorage.getItem('gliko_haptics_enabled') !== 'false') ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
                
                <div className={cn("group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/30 text-sky-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Cloud size={22} />
                    </div>
                    <div className="text-left max-w-[150px] sm:max-w-none">
                      <p className="text-sm font-black dark:text-white leading-tight">Widżet i Alerty Pogodowe</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight flex-wrap">
                        Zezwól na pobieranie pogody, aby widzieć informacje i ostrzeżenia.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const newVal = !settings.weatherWidgetEnabled;
                      setSettings(prev => ({ ...prev, weatherWidgetEnabled: newVal }));
                      if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { weatherWidgetEnabled: newVal }, { merge: true });
                    }}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative flex items-center shadow-inner shrink-0",
                      settings.weatherWidgetEnabled ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full bg-white transition-all absolute shadow-lg",
                      settings.weatherWidgetEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className={cn("group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 text-teal-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <CloudRain size={22} />
                    </div>
                    <div className="text-left max-w-[150px] sm:max-w-none">
                      <p className="text-sm font-black dark:text-white leading-tight">GlikoSense & Pogoda</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight flex-wrap">
                        Zaawansowane analizowanie i przewidywanie rzepływu glikemii w oparciu o warunki pogodowe i biomet.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const newVal = !settings.weatherNeuralEnabled;
                      setSettings(prev => ({ ...prev, weatherNeuralEnabled: newVal }));
                      if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { weatherNeuralEnabled: newVal }, { merge: true });
                    }}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative flex items-center shadow-inner shrink-0",
                      settings.weatherNeuralEnabled ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full bg-white transition-all absolute shadow-lg",
                      settings.weatherNeuralEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              {/* Media Player Widget Toggle */}
              <div className={cn("p-6 rounded-[2.5rem] border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                      <MonitorPlay size={20} className="text-white" />
                    </div>
                    <div className="text-left max-w-[150px] sm:max-w-none">
                      <p className="text-sm font-black dark:text-white leading-tight">Odtwarzacz (PWA)</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                        Pokazuje cukier w komponencie powiadomień. Może zwiększać zużycie baterii. Działa w tle (wyłączenie widżetu górnego paska).
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const newVal = !settings.mediaWidgetEnabled;
                      setSettings(prev => ({ ...prev, mediaWidgetEnabled: newVal }));
                      
                      if (newVal) {
                        const audio = document.getElementById('pwa-media-player') as HTMLAudioElement;
                        if (audio) {
                          audio.play().catch(e => console.error("Audio unlock exception:", e));
                        }
                        
                        toast("Audio PWA aktywne. Zablokuj ekran, aby sprawdzić powiadomienia mediów.", { 
                          icon: '🎵',
                          duration: 4000
                        });
                        Haptics.success();
                      } else {
                        Haptics.selection();
                      }

                      if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { mediaWidgetEnabled: newVal }, { merge: true });
                    }}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all relative flex items-center shadow-inner shrink-0",
                      settings.mediaWidgetEnabled ? "bg-purple-500" : "bg-slate-300 dark:bg-slate-700"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full bg-white transition-all absolute shadow-lg",
                      settings.mediaWidgetEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
                {settings.mediaWidgetEnabled && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <button
                      onClick={() => {
                        const audio = document.getElementById('pwa-media-player') as HTMLAudioElement;
                        if (audio) {
                          if (audio.paused) {
                            toast.loading("Uruchamianie...", { id: 'media-load' });
                            
                            // Re-load if needed
                            if (audio.readyState === 0 || audio.error) {
                              audio.load();
                            }
                            
                            audio.play().then(() => {
                               if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                               toast.success("Odtwarzacz aktywny", { id: 'media-load' });
                            }).catch(e => {
                               console.warn("Manual audio play error:", e);
                               toast.error(`Błąd: ${e.name}. Dotknij ponownie ekranu.`, { id: 'media-load' });
                            });
                          } else {
                            audio.pause();
                            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
                            toast("Odtwarzacz zatrzymany", { icon: '⏸️', id: 'media-load' });
                          }
                          Haptics.light();
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400 rounded-xl font-bold transition-all border border-purple-100 dark:border-purple-900/30 shadow-sm active:scale-95"
                    >
                      <MonitorPlay size={16} />
                      Odblokuj / Wymuś Media (PWA)
                    </button>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-center">
                        <span id="media-status-indicator" className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                           Status: {(document.getElementById('pwa-media-player') as HTMLAudioElement)?.paused ? 'Zatrzymany' : 'Aktywny'}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('force-nightscout-sync'));
                          toast.success("Wymuszono synchronizację i odświeżenie widgetu");
                          Haptics.medium();
                        }}
                        className="text-[9px] font-black uppercase tracking-widest text-accent-500 hover:underline"
                      >
                        Odśwież widget (Sync)
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
                      Naciśnij, jeśli powiadomienia na zablokowanym ekranie przestały się odświeżać (np. system uspał proces).
                    </p>
                  </div>
                )}
              </div>

              {/* Visual Appearance Cards */}
              <div className={cn("p-6 rounded-[2.5rem] border space-y-6", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                    <Palette size={14} className="text-accent-500" /> Akcent Kolorystyczny
                  </div>
                  <div className="flex items-center gap-4 px-2 overflow-x-auto scrollbar-none py-2">
                    {['indigo', 'emerald', 'rose', 'amber', 'violet'].map(color => (
                      <button
                        key={color}
                        onClick={async () => {
                          setSettings(prev => ({ ...prev, accentColor: color }));
                          if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { accentColor: color }, { merge: true });
                        }}
                        className={cn(
                          "w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center transition-all relative",
                          settings.accentColor === color || (!settings.accentColor && color === 'indigo') 
                            ? "scale-110 shadow-xl ring-2 ring-white dark:ring-slate-900 ring-offset-2" 
                            : "opacity-40 scale-90 hover:opacity-100 hover:scale-100",
                          color === 'indigo' ? "bg-indigo-500 shadow-indigo-500/20" :
                          color === 'emerald' ? "bg-emerald-500 shadow-emerald-500/20" :
                          color === 'rose' ? "bg-rose-500 shadow-rose-500/20" :
                          color === 'amber' ? "bg-amber-500 shadow-amber-500/20" :
                          "bg-violet-500 shadow-violet-500/20"
                        )}
                      >
                        {(settings.accentColor === color || (!settings.accentColor && color === 'indigo')) && (
                          <div className="w-2 h-2 rounded-full bg-white animate-bounce" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                    <Moon size={14} className="text-violet-500" /> Tryb Jasny / Ciemny
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: 'Jasny', icon: <Sun size={18} /> },
                      { id: 'dark', label: 'Ciemny', icon: <Moon size={18} /> },
                      { id: 'system', label: 'Auto', icon: <RefreshCw size={18} /> }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={async () => {
                          const newTheme = t.id as 'light' | 'dark' | 'system';
                          setSettings(prev => ({ ...prev, theme: newTheme }));
                          if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { theme: newTheme }, { merge: true });
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all border",
                          (settings.theme === t.id) || (!settings.theme && t.id === 'light') 
                            ? "bg-slate-900 border-slate-900 text-white shadow-xl dark:bg-white dark:border-white dark:text-slate-900" 
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                        )}
                      >
                        {t.icon}
                        <span className="text-[8px] font-black uppercase tracking-widest">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(settings.theme === 'dark' || settings.theme === 'system') && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                      <LucideLock size={18} className="text-slate-400" /> Styl Tła Ciemnego
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'default', label: 'Głęboki Grafit' },
                        { id: 'true-black', label: 'Prawdziwa Czerń' }
                      ].map(option => (
                        <button
                          key={option.id}
                          onClick={async () => {
                            const val = option.id as any;
                            setSettings(prev => ({ ...prev, bgOption: val }));
                            if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { bgOption: val }, { merge: true });
                          }}
                          className={cn(
                            "py-4 rounded-2xl border transition-all text-left px-5",
                            (!settings.bgOption && option.id === 'default') || settings.bgOption === option.id
                              ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900" 
                              : "bg-white border-slate-100 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                          )}
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest leading-tight">{option.label}</p>
                          <p className="text-[8px] font-medium opacity-60">Tryb {option.id === 'true-black' ? 'OLED' : 'Neutral'}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Glassmorphism Effect Section */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                 <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                    <Sparkles size={18} className="text-pink-500" /> Styl Kart (Szkło)
                 </div>
                 <button
                    onClick={async () => {
                      const newVal = !settings.glassmorphismEnabled;
                      setSettings(prev => ({ ...prev, glassmorphismEnabled: newVal }));
                      if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { glassmorphismEnabled: newVal }, { merge: true });
                    }}
                    className={cn(
                      "flex items-center justify-between w-full p-4 rounded-2xl border transition-all",
                      settings.glassmorphismEnabled
                        ? "bg-pink-500/10 border-pink-500/50 text-pink-600 dark:text-pink-400"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                    )}
                 >
                    <span className="text-xs font-black uppercase tracking-wider">Efekt Szkła (Glassmorphism)</span>
                    <div className={cn(
                      "w-10 h-6 pl-1 rounded-full flex items-center transition-all bg-slate-200 dark:bg-slate-700",
                      settings.glassmorphismEnabled && "bg-pink-500 pl-5"
                    )}>
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                 </button>
              </div>

              {/* Data Management Section */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
                <SettingsSync 
                  user={user}
                  settings={settings} 
                  onImport={(s) => {
                    setSettings(prev => ({ ...prev, ...s }));
                    setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), s, { merge: true });
                    toast.success("Ustawienia zaimportowane pomyślnie!");
                  }} 
                />

                <SettingsTransfer 
                  settings={settings}
                  onImport={(s) => {
                    setSettings(prev => ({ ...prev, ...s }));
                    setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), s, { merge: true });
                    toast.success("Synchronizacja zakończona!");
                  }} 
                />

                <div className={cn("flex flex-col gap-2 p-5 rounded-[2rem] border", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/50")}>
                  <div className="flex items-center gap-3">
                    <Info className="text-accent-500" size={20} />
                    <div className="flex flex-col">
                      <span className="text-xs font-black dark:text-white uppercase tracking-tight">Kontakt z Twórcą</span>
                      <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                        GlikoControl@proton.me
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Tools */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">Administracja</h3>
                
                <div className={cn("p-4 rounded-2xl border flex items-center justify-between", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", isFirebaseConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                      <Cloud size={16} />
                    </div>
                    <div className="text-left">
                       <p className="text-[10px] font-black dark:text-white uppercase tracking-tight">Status Firebase Cloud</p>
                       <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                         {isFirebaseConnected ? "Połączenie stabilne" : "Błąd połączenia / Offline"}
                       </p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                    isFirebaseConnected ? "bg-emerald-500 text-white" : "bg-rose-500 text-white animate-pulse"
                  )}>
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
                      {cleaning ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
                      START AUDYTU: IG, ŁG i DUPLIKATY
                    </button>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold px-4 text-center leading-relaxed">
                      Inteligentny system AI przeskanuje Twoją bazę produktów, naprawi błędne wartości Indeksu i Ładunku Glikemicznego oraz usunie powtarzające się pozycje.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(50);
                      setUpdateLoading(true);
                      setCleaningResult("Szukanie aktualizacji...");
                      setTimeout(() => {
                        toast.success(`Wersja ${APP_VERSION} jest aktualna.`);
                        setTimeout(() => window.location.reload(), 1000);
                      }, 1500);
                    }}
                    disabled={updateLoading}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-transparent text-slate-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 glass-target"
                  >
                    <RefreshCw size={14} className={cn(updateLoading && "animate-spin")} />
                    Aktualizuj v{APP_VERSION}
                  </button>
                </div>
                
                {cleaningResult && (
                  <p className="text-center text-[9px] font-bold text-rose-500 uppercase tracking-widest px-4">{cleaningResult}</p>
                )}
              </div>

              {/* RODO / Privacy Detail */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setShowRodo(!showRodo)}
                  className="w-full flex items-center justify-between p-2 text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.2em]"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} /> Prywatność i RODO
                  </div>
                  <ChevronRight size={14} className={cn("transition-transform", showRodo && "rotate-90")} />
                </button>
                {showRodo && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="pt-4 space-y-4 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed text-left"
                  >
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <p>
                        <span className="font-black text-slate-700 dark:text-slate-200 uppercase text-[9px]">Prywatność przede wszystkim:</span> Po co podpisywać kałuże imieniem i nazwiskiem? Twoja prywatność jest dla nas priorytetem. Twoje dane są używane wyłącznie do tworzenia Twojej <b>indywidualnej analizy glikemii</b>.
                      </p>
                      <p>
                        <span className="font-black text-slate-700 dark:text-slate-200 uppercase text-[9px]">Bezpieczeństwo:</span> Dane są szyfrowane i przechowywane w infrastrukturze Firebase (Google Cloud) na terenie UE. Nigdy nie sprzedajemy Twoich danych medycznych.
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
                 <h4 className="text-lg font-black dark:text-rose-500 leading-tight">Zakończ Sesję</h4>
                 <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium px-4 mt-1">
                   Twoje dane są używane wyłącznie do tworzenia indywidualnej analizy. Dokumentacja nie wymaga podawania imienia i nazwiska - Twoja prywatność jest dla nas priorytetem.
                 </p>
               </div>
               <button 
                 onClick={() => auth.signOut()}
                 className="bg-rose-500 text-white w-full py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-rose-500/20"
               >
                 Wyloguj się z GlikoControl
               </button>
            </div>

            {/* Version History */}
            <div className={cn("rounded-[2.5rem] p-8 border shadow-sm opacity-60 hover:opacity-100 transition-opacity", settings.glassmorphismEnabled ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset" : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800")}>
              <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                <History size={14} /> Dziennik Aktualizacji
              </h4>
              <div className="space-y-6">
                {VERSIONS.slice(0, 3).map((v, i) => (
                  <div key={v.version} className={cn(
                    "relative pl-6 border-l-2",
                    i === 0 ? "border-accent-500" : "border-slate-200 dark:border-slate-800"
                  )}>
                    <div className={cn(
                      "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 bg-white dark:bg-slate-900",
                      i === 0 ? "border-accent-500" : "border-slate-200 dark:border-slate-800"
                    )} />
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black dark:text-white">v{v.version}</span>
                      <span className="text-[9px] font-bold text-slate-400">{v.date}</span>
                    </div>
                    <p className="text-[10px] font-bold text-accent-500 mb-2 truncate">{v.title}</p>
                    <ul className="space-y-1">
                      {v.changes.slice(0, 2).map((change, idx) => (
                        <li key={`v-change-${v.version}-${idx}`} className="text-[9px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
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
    </motion.div>
  );
}

function SettingInput({ label, value, onChange, step = "0.01" }: { label: string, value: number, onChange: (v: number) => void, step?: string }) {
  const [localValue, setLocalValue] = React.useState(Number.isInteger(value) ? value.toString() : Number(value).toFixed(2).replace(/\.00$/, ''));

  React.useEffect(() => {
    // Try avoiding resetting localValue while typing, only when parent value changes significantly from local
    if (parseFloat(localValue) !== value && !isNaN(value)) {
      setLocalValue(Number.isInteger(value) ? value.toString() : Number(value).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1'));
    }
  }, [value]);

  return (
    <div className="space-y-1.5 flex flex-col items-center">
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <input 
        type="number" 
        step={step}
        value={localValue} 
        onChange={e => {
          setLocalValue(e.target.value);
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) {
            onChange(parsed);
          }
        }}
        onBlur={() => {
          const parsed = parseFloat(localValue);
          if (isNaN(parsed)) {
            setLocalValue("0");
            onChange(0);
          } else {
            const formatted = Number.isInteger(parsed) ? parsed.toString() : Number(parsed).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
            setLocalValue(formatted);
            onChange(parseFloat(formatted));
          }
        }}
        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-lg outline-none border border-slate-100 dark:border-slate-700 focus:border-accent-500 transition-all dark:text-white"
      />
    </div>
  );
}
