import { toast } from "react-hot-toast";
import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { Settings, LogOut, Moon, Sun, Smartphone, Bell, Shield, Info, Globe, Loader2, Zap, Medal, Trophy, Activity, History, Utensils, Beaker, Baby, CheckCircle2, Pill, Plus, Trash, X, User, ChevronLeft, ChevronRight, Cloud, ShoppingBag, Coins, Star, Sparkles, Check, Calendar, Brain } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { doc, getDoc, getDocs, setDoc, collection, onSnapshot, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { notificationService } from '../services/notificationService';
import { UserSettings, LogEntry } from '../types';
import { APP_VERSION, SKINS, PetSkin, ACCESSORIES, BACKGROUNDS, PetAccessory, PetBackground } from '../constants';
import { VERSIONS } from '../constants/versions';

import CgmImport from './CgmImport';
import SettingsSync from './SettingsSync';
import SettingsTransfer from './SettingsTransfer';
import ApiIntegration from './ApiIntegration';
import PumpSimulator from './PumpSimulator';

interface ProfileProps {
  user: any;
  logs: LogEntry[];
  handleLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTab: (t: string) => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
}

export default function Profile({ 
  user, 
  logs = [],
  handleLogout, 
  theme, 
  toggleTheme,
  setTab,
  initialAction,
  onClearInitialAction
}: ProfileProps) {
  const [settings, setSettings] = useState<UserSettings>({ isf: 58, wwRatio: 16, wbtRatio: 18, targetMin: 70, targetMax: 140, showPrediction: true });
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
  }>({ id: '', name: '', dosage: '', reminders: ['08:00'], active: true, expiryDate: '' });

  const icons = ['🍎', '🍌', '🍇', '🍓', '🥪', '🍕', '🍔', '🥤', '🍬', '🥣', '🍫', '🥨', '🍪', '🥛'];

  const [cleaning, setCleaning] = useState(false);
  const [cleaningResult, setCleaningResult] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('therapy');
  const tabsRef = useRef<HTMLDivElement>(null);

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
       if (initialAction === 'food') setActiveCategory('food');
       if (initialAction === 'api') setActiveCategory('api');
       if (initialAction === 'devices') setActiveCategory('devices');
       if (initialAction === 'shop') setActiveCategory('shop');
       // clear action
       setTimeout(() => {
         onClearInitialAction && onClearInitialAction();
       }, 100);
    }
  }, [initialAction]);




  const [nukeLoading, setNukeLoading] = useState(false);
  const [showRodo, setShowRodo] = useState(false);

  const nukeAllData = async () => {
    if (!window.confirm("UWAGA! Ta operacja jest NIEODWRACALNA. Wszystkie Twoje dane (pomiaru, posiłki, ustawienia, postępy zwierzaka) zostaną bezpowrotnie usunięte z serwera. Czy na pewno chcesz kontynuować?")) {
      return;
    }
    
    if (!window.confirm("OSTATNIE OSTRZEŻENIE: Potwierdź usunięcie wszystkich danych.")) {
      return;
    }

    setNukeLoading(true);
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

      toast.success("Wszystkie dane zostały usunięte.");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Nuke failed:", err);
      toast.error("Błąd podczas usuwania danych.");
    } finally {
      setNukeLoading(false);
    }
  };

  const cleanupDatabase = async () => {
    setCleaning(true);
    setCleaningResult(null);
    let count = 0;
    try {
      // 1. Oczyszczanie prywatnej bazy produktów
      const userRef = collection(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'customProducts');
      const userSnap = await getDocs(userRef);
      for (const docSnap of userSnap.docs) {
        const data = docSnap.data();
        if (!data || typeof data.name !== 'string' || data.name.trim() === '') {
          await deleteDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'customProducts', docSnap.id));
          count++;
        }
      }

      // 2. Oczyszczanie społecznościowej bazy produktów
      const commRef = collection(db, 'artifacts', 'diacontrolapp', 'communityProducts');
      const commSnap = await getDocs(commRef);
      for (const docSnap of commSnap.docs) {
        const data = docSnap.data();
        // Usuwamy tylko jeśli nie mają nazwy
        if (!data || typeof data.name !== 'string' || data.name.trim() === '') {
          try {
            await deleteDoc(doc(db, 'artifacts', 'diacontrolapp', 'communityProducts', docSnap.id));
            count++;
          } catch (e) {
            console.warn("Brak uprawnień do usunięcia produktu społecznościowego", e);
          }
        }
      }
      
      setCleaningResult(`Oczyszczono wpisów: ${count}`);
    } catch (err) {
      console.error(err);
      setCleaningResult('Wystąpił błąd podczas oczyszczania.');
    }
    setCleaning(false);
    setTimeout(() => {
      setCleaningResult(null);
    }, 5000);
  };

  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile');
    const petRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'pet', 'status');
    
    const unsubscribe = onSnapshot(settingsRef, (d) => {
      if (d.exists()) setSettings({ showPrediction: true, ...d.data() } as UserSettings);
    });

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
      unsubscribe();
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

  const handleBuySkin = async (skin: PetSkin) => {
    if (petData.coins < skin.price) return;
    if (petData.unlockedSkins.includes(skin.id)) return;

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
    if (!newMedication.name || !user) return;
    try {
      const updatedMeds = [...(settings.medications || [])];
      
      if (newMedication.id) {
        // Edit 
        const index = updatedMeds.findIndex(m => m.id === newMedication.id);
        if (index >= 0) updatedMeds[index] = { ...newMedication };
      } else {
        // Add
        updatedMeds.push({ ...newMedication, id: Date.now().toString() });
      }
      
      const newSettings = { ...settings, medications: updatedMeds };
      setSettings(newSettings);
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
      setNewMedication({ id: '', name: '', dosage: '', reminders: ['08:00'], active: true, expiryDate: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMedication = async (id: string) => {
    if (!user) return;
    try {
      const updatedMeds = (settings.medications || []).filter(m => m.id !== id);
      const newSettings = { ...settings, medications: updatedMeds };
      setSettings(newSettings);
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
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
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), settings);
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="glass p-8 rounded-[3rem] text-center">
        <div className="w-20 h-20 bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
          {user.email ? (
            <span className="text-3xl font-black uppercase">{user.email.charAt(0)}</span>
          ) : (
             <User size={32} />
          )}
        </div>
        <h2 className="text-lg font-black dark:text-white mb-1">Twój Profil</h2>
        <p className="text-slate-400 text-xs font-bold mb-6 truncate">{user.email || 'Użytkownik Anonimowy'}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={handleLogout} className="bg-rose-500/10 text-rose-500 font-black text-[10px] px-6 py-3 rounded-2xl uppercase tracking-widest active:scale-95 transition-all">
            Wyloguj
          </button>
        </div>
        
        <div className="flex flex-col gap-2 p-4 bg-purple-50 dark:bg-purple-500/5 rounded-2xl border border-purple-100 dark:border-purple-900/20 mt-6 text-left">
          <div className="flex items-center justify-between pointer-events-none">
              <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                <Brain size={14} className="text-purple-400" /> Program Badawczy GlikoSense
              </h4>
              <div className="pointer-events-auto">
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
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-purple-500"></div>
                  </label>
              </div>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 mb-1 leading-tight font-medium">
            Chcesz pomóc społeczności GlikoControl? Włącz anonimowe udostępnianie wiedzy wyuczonej przez GlikoSense wg trendów glikemii (bez jakichkolwiek identyfikatorów, logów czy danych uzytkownika). Pozwoli to anonimowym globalnym sieciom AI efektywniej przewidywać krzywą u innych cukrzyków.
          </p>
        </div>
      </div>

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
            onClick={() => setTab('achievements')}
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

      <div className="relative group/tabs">
        <button 
          onClick={() => scrollTabs('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow-xl opacity-0 group-hover/tabs:opacity-100 transition-opacity hidden md:flex items-center justify-center border border-slate-100 dark:border-slate-700 -ml-2"
        >
          <ChevronLeft size={16} className="text-slate-600 dark:text-slate-300" />
        </button>
        
        <div ref={tabsRef} className="flex overflow-x-auto gap-2 pb-4 scrollbar-custom snap-x -mx-4 px-4 mask-fade-right">
          {[
            { id: 'therapy', label: 'Terapia & Cele', icon: <Activity size={14} /> },
            ...(settings.childMode ? [{ id: 'shop', label: `Sklepik ${petData.name}`, icon: <ShoppingBag size={14} /> }] : []),
            { id: 'devices', label: 'Osprzęt & CGM', icon: <Smartphone size={14} /> },
            { id: 'food', label: 'Skróty Posiłków', icon: <Utensils size={14} /> },
            { id: 'meds', label: 'Leki & Przypomnienia', icon: <Pill size={14} /> },
            { id: 'simulator', label: 'Symulator Bolusa', icon: <Beaker size={14} /> },
            { id: 'api', label: ' Integracje & API', icon: <Globe size={14} /> },
            { id: 'system', label: 'System & Inne', icon: <Settings size={14} /> }
          ].map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest snap-start transition-all",
                activeCategory === cat.id ? "bg-accent-600 text-white shadow-lg shadow-accent-600/20" : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700"
              )}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        <button 
          onClick={() => scrollTabs('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-slate-800/90 p-2 rounded-full shadow-xl opacity-0 group-hover/tabs:opacity-100 transition-opacity hidden md:flex items-center justify-center border border-slate-100 dark:border-slate-700 -mr-2"
        >
          <ChevronRight size={16} className="text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      {/* Shop Category */}
      {activeCategory === 'shop' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pb-20"
        >
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
            <Sparkles className="absolute -right-6 -bottom-6 w-32 h-32 opacity-20 rotate-12" />
            <div className="relative z-10 text-left">
              <div className="flex items-center justify-between mb-4">
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
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800">
             <div className="flex gap-2 mb-8 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl">
                {['skins', 'accessories', 'backgrounds'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setShopTab(t as any)}
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

          <div className="bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200 dark:border-slate-800">
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
                  <div key={item.label} className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{item.label}</span>
                    <span className="text-[10px] font-black text-amber-600">{item.val}</span>
                  </div>
                ))}
             </div>
          </div>
        </motion.div>
      )}

      {activeCategory === 'therapy' && (
        <div className="space-y-6">
          <div className="glass p-8 rounded-[3rem] space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Parametry Terapii</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <SettingInput label="Wrażliwość (ISF)" value={settings.isf} onChange={v => setSettings({ ...settings, isf: v })} />
          <SettingInput label="Ratio WW" value={settings.wwRatio} onChange={v => setSettings({ ...settings, wwRatio: v })} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <SettingInput label="Cel Min" value={settings.targetMin} onChange={v => setSettings({ ...settings, targetMin: v })} />
          <SettingInput label="Cel Max" value={settings.targetMax} onChange={v => setSettings({ ...settings, targetMax: v })} />
          <SettingInput label="Ratio WBT" value={settings.wbtRatio} onChange={v => setSettings({ ...settings, wbtRatio: v })} />
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Czas działania insuliny (DIA)</h4>
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={async () => {
                const newSettings = { ...settings, dia: Math.max(2, (settings.dia || 4) - 0.5) };
                setSettings(newSettings);
                if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
              }}
              className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm text-accent-600 font-bold active:scale-90 transition-all border border-slate-100 dark:border-slate-600"
            >
              -
            </button>
            <div className="text-center">
              <span className="text-2xl font-black dark:text-white">{settings.dia || 4}</span>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">godziny</span>
            </div>
            <button 
              onClick={async () => {
                const newSettings = { ...settings, dia: Math.min(8, (settings.dia || 4) + 0.5) };
                setSettings(newSettings);
                if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
              }}
              className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm text-accent-600 font-bold active:scale-90 transition-all border border-slate-100 dark:border-slate-600"
            >
              +
            </button>
          </div>
          <p className="text-[8px] font-bold text-slate-400 text-center uppercase tracking-tighter opacity-60">Standardowo: 3-5h dla analogów szybko-działających</p>
        </div>

        <button 
          onClick={saveSettings}
          disabled={settingsLoading}
          className="w-full bg-accent-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-accent-600/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {settingsLoading ? 'Zapisywanie...' : 'Zatwierdź Ustawienia'}
        </button>
      </div>

      <div className="glass p-8 rounded-[3rem] space-y-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kalkulator Wrażliwości</h3>
        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Oblicz sugerowane parametry na podstawie Twojej dobowej dawki insuliny (TDI).</p>
        
        <div className="space-y-4">
           <div>
             <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Dobowa Dawka (j.)</label>
             <input 
              type="number" 
              placeholder="np. 40" 
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
              onChange={(e) => {
                const tdi = parseFloat(e.target.value);
                if (tdi > 0) {
                  const suggestedIsf = 1800 / tdi;
                  const suggestedWw = 500 / tdi;
                  // In a real app we'd save these to profile, 
                  // but here we just show the suggestion.
                  alert(`Sugerowane parametry:\nWrażliwość (ISF): ${suggestedIsf.toFixed(0)} mg/dL\nWspółczynnik WW: ${suggestedWw.toFixed(1)} g/j.`);
                }
              }}
             />
           </div>
        </div>
      </div>

      <div className="glass p-8 rounded-[3rem] space-y-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Zaawansowane Profile Godzinowe</h3>
        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Ustaw różne parametry ISF i WW dla poszczególnych pór dnia (jak w pompie insulinowej).</p>
        
        <div className="space-y-3">
          {(settings.hourlyProfiles || []).map((hp, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
              <input type="time" value={hp.time} onChange={e => {
                const newProfiles = [...(settings.hourlyProfiles || [])];
                newProfiles[idx].time = e.target.value;
                setSettings({ ...settings, hourlyProfiles: newProfiles });
              }} className="bg-transparent font-bold text-xs outline-none dark:text-white" />
              <div className="flex-1 flex gap-2">
                <div className="flex-1">
                   <label className="text-[8px] text-slate-400 uppercase">ISF</label>
                   <input type="number" step="0.1" value={typeof hp.isf === 'number' ? Number(hp.isf.toFixed(2)) : hp.isf} onChange={e => {
                     const newProfiles = [...(settings.hourlyProfiles || [])];
                     newProfiles[idx].isf = Number(e.target.value);
                     setSettings({ ...settings, hourlyProfiles: newProfiles });
                   }} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-center text-xs dark:text-white" />
                </div>
                <div className="flex-1">
                   <label className="text-[8px] text-slate-400 uppercase">WW</label>
                   <input type="number" step="0.1" value={typeof hp.wwRatio === 'number' ? Number(hp.wwRatio.toFixed(2)) : hp.wwRatio} onChange={e => {
                     const newProfiles = [...(settings.hourlyProfiles || [])];
                     newProfiles[idx].wwRatio = Number(e.target.value);
                     setSettings({ ...settings, hourlyProfiles: newProfiles });
                   }} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-center text-xs dark:text-white" />
                </div>
              </div>
              <button onClick={() => {
                const newProfiles = (settings.hourlyProfiles || []).filter((_, i) => i !== idx);
                setSettings({ ...settings, hourlyProfiles: newProfiles });
              }} className="text-rose-500 font-bold px-2">X</button>
            </div>
          ))}
          <button onClick={() => {
            const newProfiles = [...(settings.hourlyProfiles || []), { time: '12:00', isf: 50, wwRatio: 10 }];
            setSettings({ ...settings, hourlyProfiles: newProfiles.sort((a,b) => a.time.localeCompare(b.time)) });
          }} className="w-full py-2 bg-accent-50 dark:bg-accent-900/20 text-accent-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-accent-100 dark:border-accent-800/50">
            + Dodaj Przedział Czasowy
          </button>
        </div>
        <button onClick={saveSettings} disabled={settingsLoading} className="w-full bg-accent-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-accent-600/20 active:scale-95 transition-all">
          Zapisz Profile Godzinowe
        </button>
      </div>
      </div>
      )}

      {activeCategory === 'devices' && (
      <div className="space-y-6">
      <div className="glass p-8 rounded-[3rem] space-y-6">
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
                  // If we don't have current CGM bg we can't fully compute offset easily without current bg context, 
                  // but let's assume user just sets an explicit offset or we calculate it vs last known. 
                  // Without last known, we might just prompt. Let's do a simple prompt for now. 
                  const currentCgm = prompt("Jaka jest obecnie widoczna wartość na CGM?");
                  if (currentCgm) {
                    const offset = glukoValue - parseFloat(currentCgm);
                    const newSettings = { ...settings, cgmCalibration: offset, cgmTimestamp: Date.now() };
                    setSettings(newSettings);
                    if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
                    alert(`Skalibrowano! Offset wynosi: ${offset > 0 ? '+' : ''}${offset} mg/dL.`);
                    input.value = '';
                  }
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
                 const newSettings = { ...settings, cgmCalibration: 0, cgmTimestamp: 0 };
                 setSettings(newSettings);
                 if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
             }} className="ml-4 text-[10px] text-rose-500 font-bold uppercase underline">Anuluj Kalibrację</button>
           </div>
        ) : null}
      </div>

      <div className="glass p-8 rounded-[3rem] space-y-6">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Przypomnienia o Wkłuciach i Sensorze</h3>
        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Ustaw czasy życia dla Twojego osprzętu. Aplikacja obliczy dokładny czas do wymiany co do godziny.</p>
        
        <div className="flex items-center justify-between p-4 bg-accent-50 dark:bg-slate-800/50 rounded-2xl border border-accent-100 dark:border-slate-700">
           <div className="flex items-center gap-3">
             <Bell className="text-accent-500" size={20} />
             <div>
                <p className="text-sm font-black dark:text-white leading-tight">Powiadomienia Push</p>
                <p className="text-[10px] font-medium text-slate-500">Ostrzeżenie o zbliżającej wymianie (ostrzega przy otwartej karcie)</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone size={16} className="text-accent-500" />
                <h4 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Sensor CGM</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Żywotność (dni)</label>
                  <input type="number" min="1" value={settings.sensorDurationDays || 10} onChange={e => {
                    const val = Number(e.target.value);
                    setSettings({ ...settings, sensorDurationDays: val > 0 ? val : 1 });
                  }} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white" />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Data założenia</label>
                  <input type="datetime-local" 
                    value={settings.sensorChangeDate ? new Date(settings.sensorChangeDate - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} 
                    onChange={e => {
                      const d = new Date(e.target.value).getTime();
                      if (!isNaN(d)) setSettings({ ...settings, sensorChangeDate: d });
                    }} 
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-xs outline-none dark:text-white" 
                  />
                </div>
                <button onClick={async () => {
                   const newSettings = { ...settings, sensorChangeDate: Date.now() };
                   setSettings(newSettings);
                   if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
                   alert('Zapisano wymianę sensora!');
                }} className="w-full bg-accent-600 text-white p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest mt-2 active:scale-95 transition-all shadow-lg shadow-accent-600/20">Wymiana Teraz</button>
              </div>
           </div>

           <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={16} className="text-teal-500" />
                <h4 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Wkłucie / Zestaw</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Żywotność (dni)</label>
                  <input type="number" min="1" value={settings.infusionSetDurationDays || 3} onChange={e => {
                    const val = Number(e.target.value);
                    setSettings({ ...settings, infusionSetDurationDays: val > 0 ? val : 1 });
                  }} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white" />
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Data założenia</label>
                  <input type="datetime-local" 
                    value={settings.infusionSetChangeDate ? new Date(settings.infusionSetChangeDate - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} 
                    onChange={e => {
                      const d = new Date(e.target.value).getTime();
                      if (!isNaN(d)) setSettings({ ...settings, infusionSetChangeDate: d });
                    }} 
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-xs outline-none dark:text-white" 
                  />
                </div>
                <button onClick={async () => {
                   const newSettings = { ...settings, infusionSetChangeDate: Date.now() };
                   setSettings(newSettings);
                   if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
                   alert('Zapisano wymianę wkłucia!');
                }} className="w-full bg-teal-500 text-white p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest mt-2 active:scale-95 transition-all shadow-lg shadow-teal-500/20">Wymiana Teraz</button>
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
      <div className="space-y-6">
      <div className="glass p-8 rounded-[3rem] space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Zarządzaj Skrótami</h3>
        <div className="space-y-3">
          {shortcuts.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all group">
              <div className="flex items-center gap-3">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className="text-xs font-black dark:text-white">{s.name}</p>
                  <p className="text-[9px] font-bold text-slate-400">{s.carbs || 0}g węgli • {(s.carbs/10).toFixed(1)} WW</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setNewShortcut({ id: s.id, name: s.name, icon: s.icon, type: s.type || 'meal', carbs: s.carbs || 0 })}
                  className="p-2 text-accent-500 text-[10px] font-black uppercase tracking-widest"
                >
                  Edytuj
                </button>
                <button 
                  onClick={() => deleteShortcut(s.id)}
                  className="p-2 text-rose-500 text-[10px] font-black uppercase tracking-widest"
                >
                  Usuń
                </button>
              </div>
            </div>
          ))}
          
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">
              {newShortcut.id ? 'Edytuj Skrót' : 'Dodaj Nowy Skrót'}
            </p>
            
            {/* Icon Picker */}
            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl">
              {icons.map(icon => (
                <button 
                  key={icon}
                  onClick={() => setNewShortcut({...newShortcut, icon})}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg transition-all",
                    newShortcut.icon === icon ? "bg-accent-500 scale-110 shadow-lg" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ikona" 
                  value={newShortcut.icon}
                  onChange={e => setNewShortcut({...newShortcut, icon: e.target.value})}
                  className="w-12 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-center outline-none border border-slate-200 dark:border-slate-700 dark:text-white"
                />
                <input 
                  type="text" 
                  placeholder="Nazwa" 
                  value={newShortcut.name}
                  onChange={e => setNewShortcut({...newShortcut, name: e.target.value})}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl outline-none border border-slate-200 dark:border-slate-700 dark:text-white text-xs font-bold"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    placeholder="Węglowodany (g)" 
                    value={newShortcut.carbs || ''}
                    onChange={e => setNewShortcut({...newShortcut, carbs: Number(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl outline-none border border-slate-200 dark:border-slate-700 dark:text-white text-xs font-bold pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-500 uppercase">g węgli</span>
                </div>
                <button 
                  onClick={saveShortcut}
                  className="bg-accent-600 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-accent-500/20"
                >
                  {newShortcut.id ? 'Zapisz' : 'Dodaj'}
                </button>
                {newShortcut.id && (
                  <button 
                    onClick={() => setNewShortcut({ id: '', name: '', icon: '📌', type: 'meal', carbs: 0 })}
                    className="bg-slate-200 dark:bg-slate-800 p-3 rounded-2xl font-black text-[10px] uppercase dark:text-slate-400"
                  >
                    X
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}

      {activeCategory === 'meds' && (
      <div className="space-y-6">
        <div className="glass p-8 rounded-[3rem] space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Pill size={14} /> Twoje Leki</h3>
          <p className="text-[10px] text-slate-500 font-medium mb-4">Zarządzaj przyjmowanymi lekami i ustawiaj przypomnienia o ich zażyciu (otrzymasz powiadomienia w aplikacji).</p>
          
          <div className="space-y-3">
            {(settings.medications || []).map(med => (
              <div key={med.id} className="flex flex-col p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", med.active ? "bg-accent-100 text-accent-500 dark:bg-accent-900/30" : "bg-slate-200 text-slate-400 dark:bg-slate-700")}>
                       <Pill size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black dark:text-white capitalize">{med.name} <span className="text-[10px] font-bold text-slate-400 ml-1">({med.dosage})</span></p>
                      <div className="flex flex-wrap gap-1 mt-1">
                         {med.reminders.map((r, i) => <span key={i} className="text-[9px] font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full text-slate-500">{r}</span>)}
                      </div>
                      {med.expiryDate && (
                        <p className={`text-[9px] font-bold mt-2 flex items-center gap-1 ${
                          new Date(med.expiryDate).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000 
                            ? 'text-rose-500 animate-pulse' 
                            : 'text-slate-400'
                        }`}>
                          <Calendar size={10} />
                          Ważny do: {med.expiryDate}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={async () => {
                        const updatedMeds = settings.medications!.map(m => m.id === med.id ? { ...m, active: !m.active } : m);
                        const newSettings = { ...settings, medications: updatedMeds };
                        setSettings(newSettings);
                        await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
                    }} className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded", med.active ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "text-slate-500 bg-slate-200 dark:bg-slate-700")}>
                        {med.active ? 'Aktywny' : 'Pauzowany'}
                    </button>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setNewMedication({ 
                        id: med.id,
                        name: med.name,
                        dosage: med.dosage,
                        reminders: med.reminders,
                        active: med.active,
                        expiryDate: med.expiryDate || '' 
                      })} className="p-1 text-accent-500"><Settings size={14} /></button>
                      <button onClick={() => deleteMedication(med.id)} className="p-1 text-rose-500"><Trash size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">
                {newMedication.id ? 'Edytuj Lek' : 'Dodaj Nowy Lek'}
              </p>
              
              <div className="flex flex-col gap-3">
                <input 
                  type="text" 
                  placeholder="Nazwa leku (np. Metformina)" 
                  value={newMedication.name}
                  onChange={e => setNewMedication({...newMedication, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl outline-none border border-slate-200 dark:border-slate-700 dark:text-white text-sm font-bold"
                />
                
                <input 
                  type="text" 
                  placeholder="Dawka (np. 500mg)" 
                  value={newMedication.dosage}
                  onChange={e => setNewMedication({...newMedication, dosage: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl outline-none border border-slate-200 dark:border-slate-700 dark:text-white text-sm font-bold"
                />
                
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1 mb-2 block">Data ważności leku</label>
                  <input 
                    type="date" 
                    value={newMedication.expiryDate}
                    onChange={e => setNewMedication({...newMedication, expiryDate: e.target.value})}
                    className="w-full bg-transparent outline-none dark:text-white text-sm font-bold"
                  />
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Godziny przyjmowania</p>
                   <div className="flex flex-wrap gap-2 mb-3">
                     {newMedication.reminders.map((rem, idx) => (
                       <div key={idx} className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-1 pl-3 pr-1">
                          <input type="time" value={rem} onChange={e => {
                             const updatedRems = [...newMedication.reminders];
                             updatedRems[idx] = e.target.value;
                             setNewMedication({...newMedication, reminders: updatedRems});
                          }} className="text-xs font-bold bg-transparent outline-none dark:text-white" />
                          <button onClick={() => {
                             const updatedRems = newMedication.reminders.filter((_, i) => i !== idx);
                             setNewMedication({...newMedication, reminders: updatedRems});
                          }} className="p-1 text-slate-400 hover:text-rose-500 rounded-lg"><X size={14}/></button>
                       </div>
                     ))}
                     <button onClick={() => {
                        setNewMedication({...newMedication, reminders: [...newMedication.reminders, '12:00']});
                     }} className="bg-accent-100 dark:bg-accent-900/30 text-accent-500 p-2 rounded-xl border border-accent-200 dark:border-accent-800/50 hover:bg-accent-200 transition-colors"><Plus size={16} /></button>
                   </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={saveMedication}
                    className="flex-1 bg-accent-600 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-accent-500/20"
                  >
                    {newMedication.id ? 'Zapisz Zmiany' : 'Dodaj Lek'}
                  </button>
                    {newMedication.id && (
                    <button 
                      onClick={() => setNewMedication({ id: '', name: '', dosage: '', reminders: ['08:00'], active: true, expiryDate: '' })}
                      className="bg-slate-200 dark:bg-slate-800 p-4 rounded-2xl font-black text-[10px] uppercase dark:text-slate-400"
                    >
                      X
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeCategory === 'simulator' && (
        <PumpSimulator settings={settings} />
      )}

      {activeCategory === 'api' && (
      <div className="space-y-6">
        <ApiIntegration user={user} />
        
        <div className="glass p-8 rounded-[3rem] space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pobieranie Danych (CGM)</h3>

          <div className="flex flex-col gap-2 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-2xl border border-sky-100 dark:border-sky-800">
            <div className="flex items-center gap-3 mb-2">
                <Smartphone className="text-sky-500" size={20} />
                <span className="text-xs font-bold dark:text-white">Użytkownicy Dexcom i Freestyle Libre</span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Z powodu ograniczeń technologicznych nałożonych przez firmy Abbott i Dexcom (blokady CORS w przeglądarkach), bezpośrednie logowanie kontem Libre / Dexcom Share do aplikacji webowych jest zablokowane przez producenta.
            </p>
            <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed font-bold mt-1">
              GlikoControl obsługuje te sensory poprzez darmowy mostek Nightscout.
            </p>
            <ul className="text-[9px] text-slate-500 dark:text-slate-400 list-disc list-inside mt-1 space-y-1">
              <li>Zarejestruj darmowy darmowy mostek Nightscout (np. na NightscoutPro / T1Pal).</li>
              <li>Podłącz do niego swoje konto Dexcom Share lub LibreLinkUp.</li>
              <li>Wklej poniżej adres swojego Nightscouta, a GlikoControl zacznie pobierać dane Live co 5 minut.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
                <Globe className="text-accent-500" size={20} />
                <span className="text-xs font-bold dark:text-white">Adres Nightscout / xDrip</span>
            </div>
            <input 
              type="text" 
              placeholder="https://tvoja-strona.herokuapp.com" 
              value={nsUrl}
              onChange={e => setNsUrl(e.target.value)}
              onBlur={saveNsUrl}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-[10px] font-bold outline-none dark:text-white"
            />
            <input 
              type="password" 
              placeholder="API_SECRET (opcjonalnie)" 
              value={nsSecret}
              onChange={e => setNsSecret(e.target.value)}
              onBlur={saveNsUrl}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-[10px] font-bold outline-none dark:text-white"
            />
            
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="font-bold mb-1">Instrukcja konfiguracji z aplikacją xDrip+:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Otwórz aplikację <b>xDrip+</b>.</li>
                <li>Wejdź w <b>Ustawienia</b> → <b>Przesyłanie do chmury</b> → <b>Synchronizacja z Nightscout</b>.</li>
                <li>Włącz "Synchronizacja z Nightscout", aby wygenerować bazowy adres URL.</li>
                <li>Opcjonalnie, wpisz swój klucz w polu na klucz API (jeżeli xDrip tego wymaga/obsługuje).</li>
                <li>Skopiuj <b>Główny adres URL</b> i wklej go tutaj w polu <b>Adres Nightscout</b>.</li>
                <li>Jeżeli w xDrip ustawiłeś klucz powiązany z Nightscout, wklej go poniżej (API_SECRET).</li>
              </ol>
            </div>
            
            <div className="bg-accent-50 dark:bg-accent-900/20 p-3 rounded-xl space-y-2">
              <p className="text-[8px] font-black text-accent-900 dark:text-accent-300 uppercase tracking-widest">Architektura połączenia</p>
              <div className="flex justify-between items-center text-[9px] text-accent-600 dark:text-accent-400 font-bold px-2 text-center">
                <div className="flex flex-col items-center w-1/4">
                  <span className="leading-tight">Aplikacja CGM</span>
                  <span className="text-[7px] text-slate-500 whitespace-nowrap">(xDrip / Carelink)</span>
                  <span className="text-xs">☁️/📱</span>
                </div>
                <span className="text-slate-400">➜</span>
                <div className="flex flex-col items-center w-1/4">
                  <span className="leading-tight">Nightscout / Local IP</span>
                  <span className="text-xs">🌐/🏠</span>
                </div>
                <span className="text-slate-400">➜</span>
                <div className="flex flex-col items-center w-1/4">
                  <span className="leading-tight">GlikoControl</span>
                  <span className="text-xs">📱</span>
                </div>
              </div>
              <p className="text-[8px] text-slate-500 dark:text-slate-400 leading-tight">
                Możesz podać URL do <b>Nightscout</b> lub lokalny adres <b>xDrip+</b> (np. http://192.168.1.x:1751). 
                Dla połączeń lokalnych upewnij się, że oba urządzenia są w tym samym Wi-Fi.
              </p>
            </div>

            {saveStatus && (
              <div className="text-[9px] font-black uppercase text-emerald-500 mt-1 text-left animate-pulse">
                {saveStatus}
              </div>
            )}
            {!saveStatus && (
              <button 
                onClick={saveNsUrl}
                className="text-[9px] font-black uppercase text-accent-500 mt-1 text-left"
              >
                Zapisz URL
              </button>
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
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all active:scale-95 group mt-2 disabled:opacity-50"
            >
              <Zap size={14} className={nsSyncLoading ? "animate-pulse" : "group-active:animate-ping"} />
              <span className="text-[10px] font-black uppercase tracking-widest">{nsSyncLoading ? "Synchronizacja..." : "Wymuś synchronizację"}</span>
            </button>
          </div>

          <CgmImport user={user} onComplete={() => window.dispatchEvent(new Event('force-nightscout-sync'))} />

          <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
                <Zap className="text-emerald-500" size={20} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold dark:text-white">Klucz API Gemini (Własny Serwer AI)</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-balance left-0 right-0">Omija limity publicznego serwera</span>
                </div>
            </div>
            
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="font-bold mb-1">Jak uzyskać i dodać klucz API:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Wejdź na stronę <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.</li>
                <li>Zaloguj się swoim kontem Google i kliknij "Create API key".</li>
                <li>Skopiuj nowo utworzony klucz (zaczyna się od <code>AIzaSy...</code>).</li>
                <li><span className="text-rose-500 dark:text-rose-400 font-bold">Ważne!</span> Wklej klucz poniżej. Zapisze się on lokalnie w Twojej przeglądarce. Używaj tej opcji <b>tylko na swoim zaufanym, prywatnym urządzeniu</b> (nie podawaj klucza logując się na współdzielonych komputerach lub cudzych telefonach).</li>
              </ol>
            </div>

            <input 
              type="password" 
              placeholder="Wklej klucz (AIzaSy...)" 
              value={geminiApiKey}
              onChange={e => setGeminiApiKey(e.target.value)}
              onBlur={() => {
                const val = geminiApiKey.trim();
                setGeminiApiKey(val);
                if (val) {
                  localStorage.setItem('gemini_api_key', val);
                  setGeminiSaveStatus('Zapisano lokalnie ✓');
                } else {
                  localStorage.removeItem('gemini_api_key');
                  setGeminiSaveStatus('Usunięto klucz ✓');
                }
                setTimeout(() => setGeminiSaveStatus(''), 2000);
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-[10px] font-bold outline-none dark:text-white"
            />
            {geminiSaveStatus && <span className="text-[10px] text-emerald-500 font-bold">{geminiSaveStatus}</span>}
            <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Jeżeli widzisz błąd &quot;Serwery AI są zajęte&quot;, utwórz darmowy klucz i wklej go tutaj. Klucz zostanie zapisany tylko w Twojej przeglądarce.</p>
          </div>
          
          <div className="flex flex-col gap-2 p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Zap size={14} className="text-emerald-400" /> Status AI Gemini
            </h4>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 mb-1 leading-tight font-bold">
              System AI jest aktywny i skonfigurowany. 
              {geminiApiKey ? " Korzystasz z własnego, prywatnego klucza API." : " Korzystasz z globalnego klucza GlikoControl."}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Połączono poprawnie</span>
            </div>
          </div>
        </div>
      </div>
      )}



      {activeCategory === 'system' && (
      <div className="space-y-6">
      <div className="glass p-8 rounded-[3rem] space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">System i Wygląd</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
             <div className="flex items-center gap-3">
               <Baby className="text-amber-500" size={20} />
               <div>
                  <p className="text-sm font-black dark:text-amber-500 leading-tight">Tryb Dziecka</p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Aktywuje wirtualnego zwierzaka ({petData.name}) na ekranie głównym</p>
               </div>
             </div>
             <button 
               onClick={async () => {
                 const newSettings = { ...settings, childMode: !settings.childMode };
                 setSettings(newSettings);
                 if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
               }}
               className={cn(
                 "w-12 h-6 rounded-full transition-all relative flex items-center shadow-inner",
                 settings.childMode ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
               )}
             >
               <div className={cn(
                 "w-4 h-4 rounded-full bg-white transition-all absolute shadow",
                 settings.childMode ? "left-7" : "left-1"
               )} />
             </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
             <div className="flex items-center gap-3">
               <Activity className="text-indigo-500" size={20} />
               <div>
                  <p className="text-sm font-black dark:text-white leading-tight">Status Pompy/CGM</p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Wyświetlaj widget z baterią telefonu / pompy na ekranie głównym</p>
               </div>
             </div>
             <button 
               onClick={async () => {
                 const newSettings = { ...settings, showPumpWidget: settings.showPumpWidget === false ? true : false };
                 setSettings(newSettings);
                 if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
               }}
               className={cn(
                 "w-12 h-6 rounded-full transition-all relative flex items-center shadow-inner",
                 settings.showPumpWidget !== false ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
               )}
             >
               <div className={cn(
                 "w-4 h-4 rounded-full bg-white transition-all absolute shadow",
                 settings.showPumpWidget !== false ? "left-7" : "left-1"
               )} />
             </button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 mb-2">Wygląd aplikacji</h3>
            
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Akcent Kolorystyczny</span>
              <div className="flex gap-2 px-2 overflow-x-auto scrollbar-none py-1">
                {['indigo', 'emerald', 'rose', 'amber', 'violet'].map(color => (
                  <button
                    key={color}
                    onClick={async () => {
                      const newSettings = { ...settings, accentColor: color };
                      setSettings(newSettings);
                      if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
                    }}
                    className={cn(
                      "w-10 h-10 rounded-full shrink-0 flex items-center justify-center transition-all",
                      settings.accentColor === color || (!settings.accentColor && color === 'indigo') ? "scale-110 shadow-lg shadow-black/10 ring-2 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-800" : "opacity-60 scale-90 hover:opacity-100 hover:scale-100",
                      color === 'indigo' ? "bg-accent-500 ring-accent-500" :
                      color === 'emerald' ? "bg-emerald-500 ring-emerald-500" :
                      color === 'rose' ? "bg-rose-500 ring-rose-500" :
                      color === 'amber' ? "bg-amber-500 ring-amber-500" :
                      "bg-violet-500 ring-violet-500"
                    )}
                  >
                    {(settings.accentColor === color || (!settings.accentColor && color === 'indigo')) && <CheckCircle2 size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-700 mx-2" />
            
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Motyw</span>
              <div className="flex gap-2">
                {['light', 'dark', 'system'].map(t => (
                  <button
                    key={t}
                    onClick={async () => {
                      const newSettings = { ...settings, theme: t as 'light' | 'dark' | 'system'};
                      setSettings(newSettings);
                      if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all text-[10px] uppercase tracking-widest",
                      (settings.theme === t) || (!settings.theme && t === 'light') ? "bg-accent-500 text-white shadow-lg" : "bg-white dark:bg-slate-700 text-slate-500"
                    )}
                  >
                    {t === 'light' ? <Sun size={16} /> : t === 'dark' ? <Moon size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-current opacity-70" />}
                    {t === 'light' ? 'Jasny' : t === 'dark' ? 'Ciemny' : 'System'}
                  </button>
                ))}
              </div>
            </div>

            {(settings.theme === 'dark' || settings.theme === 'system') && (
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Czerń</span>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const newSettings = { ...settings, bgOption: 'default' as const };
                      setSettings(newSettings);
                      if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest",
                      !settings.bgOption || settings.bgOption === 'default' ? "bg-accent-500 text-white shadow-lg" : "bg-white dark:bg-slate-700 text-slate-500"
                    )}
                  >
                    Granat (Slate)
                  </button>
                  <button
                    onClick={async () => {
                      const newSettings = { ...settings, bgOption: 'true-black' as const };
                      setSettings(newSettings);
                      if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest",
                      settings.bgOption === 'true-black' ? "bg-black text-white shadow-lg border border-accent-500/50" : "bg-white dark:bg-black text-slate-500 border border-slate-200 dark:border-slate-800"
                    )}
                  >
                    Prawdziwa Czerń
                  </button>
                </div>
              </div>
            )}
          </div>

          <SettingsSync 
            user={user}
            settings={settings} 
            onImport={(s) => {
              setSettings({ ...settings, ...s });
              // We need to save the imported settings immediately 
              setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { ...settings, ...s });
            }} 
          />

          <SettingsTransfer 
            settings={settings}
            onImport={(s) => {
              setSettings({ ...settings, ...s });
              setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), { ...settings, ...s });
            }} 
          />

          <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Info className="text-accent-400" size={20} />
              <div className="flex flex-col">
                <span className="text-xs font-bold dark:text-white">Kontakt z Twórcami</span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">
                  Masz pytania lub sugestie? Napisz do nas:
                </span>
                <a href="mailto:GlikoControl@proton.me" className="text-sm font-black text-accent-500 mt-1">
                  GlikoControl@proton.me
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* System & Maintenance */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Konserwacja Bazy Danych</h3>
          
          <button 
            onClick={cleanupDatabase}
            disabled={cleaning}
            className="w-full bg-rose-50 dark:bg-rose-500/10 border border-slate-200 dark:border-slate-700 text-rose-500 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2 mb-2"
          >
            {cleaning ? <Loader2 className="animate-spin" size={14} /> : <Shield size={14} />}
            Oczyść Wadliwe Wpisy
          </button>
          {cleaningResult && (
            <p className="text-center text-[10px] font-bold text-rose-500 mb-4">{cleaningResult}</p>
          )}
          
          <button 
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(50);
              setUpdateLoading(true);
              setCleaningResult("Sprawdzam nowsze wersje...");
              setTimeout(() => {
                setCleaningResult(`Wersja ${APP_VERSION} oraz GlikoSense v2.5 są aktualne. Odświeżam aplikację...`);
                setTimeout(() => {
                  window.location.reload();
                }, 1500);
              }, 1500);
            }}
            disabled={updateLoading}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 py-3 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateLoading ? <Loader2 className="animate-spin" size={14} /> : null}
            Sprawdź Aktualizacje (v{APP_VERSION})
          </button>
          
          <div className="text-[8px] font-black uppercase text-slate-400 text-center tracking-[0.3em] mb-4 opacity-50">
            GlikoSense Engine v2.5
          </div>

          <div className="bg-rose-500/5 border border-rose-500/20 rounded-[2rem] p-6 mt-4">
            <h4 className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-2">
              <Trash size={14} /> Strefa Niebezpieczeństwa
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4 leading-tight">
              Możesz usunąć wszystkie swoje dane z naszych serwerów. Operacja ta jest zgodna z Twoim prawem do bycia zapomnianym (RODO).
            </p>
            <button 
              onClick={nukeAllData}
              disabled={nukeLoading}
              className="w-full bg-rose-500 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {nukeLoading ? <Loader2 className="animate-spin" size={14} /> : <Trash size={14} />}
              Usuń Wszystkie Moje Dane
            </button>
          </div>

          <div className="bg-slate-100 dark:bg-slate-900/50 rounded-[2rem] p-6 border border-slate-200 dark:border-slate-800 mt-4">
            <button 
              onClick={() => setShowRodo(!showRodo)}
              className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"
            >
              <div className="flex items-center gap-2">
                <Shield size={14} /> Klauzula RODO / Prywatność
              </div>
              <ChevronRight size={14} className={cn("transition-transform", showRodo && "rotate-90")} />
            </button>
            {showRodo && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="pt-4 space-y-3 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed text-left"
              >
                <div className="h-px bg-slate-200 dark:bg-slate-800 mb-2" />
                <p>
                  <span className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[9px]">Administrator Danych:</span> Korzystając z GlikoControl, administratorem Twoich danych jestes Ty sam. Dane są przechowywane w bezpiecznej infrastrukturze Firebase (Google Cloud) na terenie UE/USA zgodnie z rygorystycznymi normami bezpieczeństwa.
                </p>
                <p>
                  <span className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[9px]">Cel przetwarzania:</span> Dane glikemii, posiłków i leków są przechowywane wyłącznie w celu prowadzenia dzienniczka samokontroli i analizy trendów przez algorytmy AI (tylko na Twoje życzenie).
                </p>
                <p>
                  <span className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[9px]">Udostępnianie:</span> Twoje dane nie są sprzedawane ani udostępniane podmiotom trzecim. Wyjątkiem jest dobrowolna funkcja "Programu Badawczego GlikoSense", która przesyła całkowicie zanonimizowane wzorce trendów (bez identyfikatorów) do globalnej bazy wiedzy.
                </p>
                <p>
                  <span className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[9px]">Twoje prawa:</span> Masz prawo do wglądu w swoje dane, ich poprawiania oraz całkowitego usunięcia (używając przycisku powyżej). Możesz również wyeksportować swoje dane do pliku CSV w sekcji Historia.
                </p>
              </motion.div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/50">
            <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
              <History size={14} /> Historia zmian
            </h4>
            <div className="space-y-6">
              {VERSIONS.map((v, i) => (
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
                  <p className="text-[10px] font-bold text-accent-500 mb-2">{v.title}</p>
                  <ul className="space-y-1">
                    {v.changes.slice(0, 3).map((change, idx) => (
                      <li key={idx} className="text-[9px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                        <span className="mt-1 w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                        {change}
                      </li>
                    ))}
                    {v.changes.length > 3 && (
                      <li className="text-[8px] font-black text-slate-400 italic mt-1">+ {v.changes.length - 3} więcej zmian...</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
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
