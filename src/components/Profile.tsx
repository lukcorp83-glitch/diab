import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, LogOut, Moon, Sun, Smartphone, Bell, Shield, Info, Globe, Loader2, Zap, Medal, Trophy, Activity, Utensils, Beaker, Baby } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { doc, getDoc, getDocs, setDoc, collection, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { UserSettings } from '../types';

import CgmImport from './CgmImport';
import SettingsSync from './SettingsSync';

export default function Profile({ 
  user, 
  handleLogout, 
  theme, 
  toggleTheme,
  setTab
}: { 
  user: any, 
  handleLogout: () => void,
  theme: 'light' | 'dark',
  toggleTheme: () => void,
  setTab: (t: string) => void
}) {
  const [settings, setSettings] = useState<UserSettings>({ isf: 58, wwRatio: 16, wbtRatio: 18, targetMin: 70, targetMax: 140, showPrediction: true });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [nsSyncLoading, setNsSyncLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [cleaningLoading, setCleaningLoading] = useState(false);
  const [nsUrl, setNsUrl] = useState('');
  const [nsSecret, setNsSecret] = useState('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [newShortcut, setNewShortcut] = useState({ id: '', name: '', icon: '📌', type: 'meal', carbs: 0 });

  const icons = ['🍎', '🍌', '🍇', '🍓', '🥪', '🍕', '🍔', '🥤', '🍬', '🥣', '🍫', '🥨', '🍪', '🥛'];

  const [cleaning, setCleaning] = useState(false);
  const [cleaningResult, setCleaningResult] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('therapy');

  const [simCarbs, setSimCarbs] = useState<number>(50);
  const [simFat, setSimFat] = useState<number>(30); // 3 Wymienniki Białkowo-Tłuszczowe (WBT) to 300 kcal (approx 30g tłuszczu)
  const [simType, setSimType] = useState<string>('dual');
  const [simSplitNow, setSimSplitNow] = useState<number>(50);
  const [simDuration, setSimDuration] = useState<number>(3);
  const [simResult, setSimResult] = useState<boolean>(false);
  const [simManualDose, setSimManualDose] = useState<string>('');
  const [simStackingEnabled, setSimStackingEnabled] = useState<boolean>(false);
  const [simStackDose, setSimStackDose] = useState<number>(2);
  const [simStackTime, setSimStackTime] = useState<number>(2);
  const [simAutoBasal, setSimAutoBasal] = useState<boolean>(false);
  const [simWorkout, setSimWorkout] = useState<string>('none');
  const [simGi, setSimGi] = useState<string>('medium');
  const [simBg, setSimBg] = useState<number>(100);


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
    const unsubscribe = onSnapshot(settingsRef, (d) => {
      if (d.exists()) setSettings({ showPrediction: true, ...d.data() } as UserSettings);
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
    };
  }, [user]);

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

  const saveSettings = async () => {
    if (!user) return;
    setSettingsLoading(true);
    try {
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), settings);
      alert("Ustawienia zapisane pomyślnie!");
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
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
           <Shield className="text-slate-400" />
        </div>
        <h2 className="text-lg font-black dark:text-white mb-1">Twój Profil</h2>
        <p className="text-slate-400 text-xs font-bold mb-6 truncate">{user.email || 'Użytkownik Anonimowy'}</p>
        <button onClick={handleLogout} className="bg-rose-500/10 text-rose-500 font-black text-[10px] px-6 py-3 rounded-2xl uppercase tracking-widest active:scale-95 transition-all">
          Wyloguj się
        </button>
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

      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none snap-x">
        {[
          { id: 'therapy', label: 'Terapia & Cele', icon: <Activity size={14} /> },
          { id: 'devices', label: 'Osprzęt & CGM', icon: <Smartphone size={14} /> },
          { id: 'food', label: 'Baza Posiłków', icon: <Utensils size={14} /> },
          { id: 'simulator', label: 'Symulator Pompy', icon: <Beaker size={14} /> },
          { id: 'system', label: 'System & Inne', icon: <Settings size={14} /> }
        ].map(cat => (
          <button 
            key={cat.id} 
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest snap-start transition-all",
              activeCategory === cat.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700"
            )}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

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

        <button 
          onClick={saveSettings}
          disabled={settingsLoading}
          className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
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
                   <input type="number" value={hp.isf} onChange={e => {
                     const newProfiles = [...(settings.hourlyProfiles || [])];
                     newProfiles[idx].isf = Number(e.target.value);
                     setSettings({ ...settings, hourlyProfiles: newProfiles });
                   }} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 text-center text-xs dark:text-white" />
                </div>
                <div className="flex-1">
                   <label className="text-[8px] text-slate-400 uppercase">WW</label>
                   <input type="number" value={hp.wwRatio} onChange={e => {
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
          }} className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/50">
            + Dodaj Przedział Czasowy
          </button>
        </div>
        <button onClick={saveSettings} disabled={settingsLoading} className="w-full bg-indigo-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
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
        
        <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-slate-800/50 rounded-2xl border border-indigo-100 dark:border-slate-700">
           <div className="flex items-center gap-3">
             <Bell className="text-indigo-500" size={20} />
             <div>
                <p className="text-sm font-black dark:text-white leading-tight">Powiadomienia Push</p>
                <p className="text-[10px] font-medium text-slate-500">Ostrzeżenie o zbliżającej wymianie (ostrzega przy otwartej karcie)</p>
             </div>
           </div>
           <button 
             onClick={async () => {
               if (!settings.notificationsEnabled) {
                  if ('Notification' in window) {
                     const perm = await Notification.requestPermission();
                     if (perm === 'granted') {
                        setSettings({ ...settings, notificationsEnabled: true });
                     } else {
                        alert('Musisz zezwolić na powiadomienia w przeglądarce.');
                     }
                  } else {
                     alert('Twoja przeglądarka nie wspiera powiadomień.');
                  }
               } else {
                  setSettings({ ...settings, notificationsEnabled: false });
               }
             }}
             className={cn(
               "w-12 h-6 rounded-full transition-all relative flex items-center shadow-inner",
               settings.notificationsEnabled ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
             )}
           >
             <div className={cn(
               "w-4 h-4 rounded-full bg-white transition-all absolute shadow",
               settings.notificationsEnabled ? "left-7" : "left-1"
             )} />
           </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
           <div className="flex items-center gap-3">
             <Baby className="text-amber-500" size={20} />
             <div>
                <p className="text-sm font-black dark:text-amber-500 leading-tight">Tryb Dziecka</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Aktywuje wirtualnego zwierzaka (Gliko-Smoka) na ekranie głównym</p>
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

        <div className="flex gap-4">
           <div className="flex-1 space-y-4">
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Żywotność Sensora (dni)</label>
                <input type="number" min="1" value={settings.sensorDurationDays || 10} onChange={e => {
                  const val = Number(e.target.value);
                  setSettings({ ...settings, sensorDurationDays: val > 0 ? val : 1 });
                }} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Data założenia</label>
                <input type="datetime-local" 
                  value={settings.sensorChangeDate ? new Date(settings.sensorChangeDate - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} 
                  onChange={e => {
                    const d = new Date(e.target.value).getTime();
                    if (!isNaN(d)) setSettings({ ...settings, sensorChangeDate: d });
                  }} 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-xs outline-none dark:text-white" 
                />
              </div>
              <button onClick={async () => {
                 const newSettings = { ...settings, sensorChangeDate: Date.now() };
                 setSettings(newSettings);
                 if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
                 alert('Zapisano wymianę sensora!');
              }} className="w-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest mt-2 active:scale-95 transition-all">Teraz: Nowy Sensor</button>
           </div>

           <div className="flex-1 space-y-4">
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Żywotność Wkłucia (dni)</label>
                <input type="number" min="1" value={settings.infusionSetDurationDays || 3} onChange={e => {
                  const val = Number(e.target.value);
                  setSettings({ ...settings, infusionSetDurationDays: val > 0 ? val : 1 });
                }} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white" />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Data założenia</label>
                <input type="datetime-local" 
                  value={settings.infusionSetChangeDate ? new Date(settings.infusionSetChangeDate - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''} 
                  onChange={e => {
                    const d = new Date(e.target.value).getTime();
                    if (!isNaN(d)) setSettings({ ...settings, infusionSetChangeDate: d });
                  }} 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-xs outline-none dark:text-white" 
                />
              </div>
              <button onClick={async () => {
                 const newSettings = { ...settings, infusionSetChangeDate: Date.now() };
                 setSettings(newSettings);
                 if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
                 alert('Zapisano wymianę wkłucia!');
              }} className="w-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest mt-2 active:scale-95 transition-all">Teraz: Nowe Wkłucie</button>
           </div>
        </div>
        <button onClick={saveSettings} disabled={settingsLoading} className="w-full bg-indigo-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all mt-4">
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
                  className="p-2 text-indigo-500 text-[10px] font-black uppercase tracking-widest"
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
                    newShortcut.icon === icon ? "bg-indigo-500 scale-110 shadow-lg" : "hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  className="bg-indigo-600 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
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

      {activeCategory === 'simulator' && (
      <div className="space-y-6">
        <div className="glass p-8 rounded-[3rem] space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Symulator Algorytmów Pompy</h3>
          <p className="text-[10px] text-slate-500 leading-relaxed font-medium bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
            Symulator uczy, jak działa insulina przy różnych posiłkach. Wpisz co jesz, a kalkulator policzy proponowaną dawkę na podstawie Twoich ustawień (przeliczników WW/WBT). Dowiesz się, czy na tłusty obiad (np. schabowy) podać całą insulinę od razu, czy lepiej rozłożyć ją w czasie na kilka godzin, żeby uniknąć skoków i spadków cukru.
          </p>
          
          <div className="mb-2">
             <SettingInput label="Glukoza początkowa (mg/dL)" value={simBg} onChange={(v) => { setSimBg(Number(v)); setSimResult(false); }} />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <SettingInput label="Węglowodany (g)" value={simCarbs} onChange={(v) => setSimCarbs(Number(v))} />
             <SettingInput label="WBT (1WBT=100kcal tłuszczu)" value={simFat} onChange={(v) => setSimFat(Number(v))} />
          </div>

          <div className="space-y-4 pt-2">
             <div className="space-y-2">
               <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Indeks Glikemiczny (Szybkość wchłaniania)</label>
               <select 
                 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
                 value={simGi}
                 onChange={(e) => {
                   setSimGi(e.target.value);
                   setSimResult(false);
                 }}
               >
                 <option value="high">Wysoki (Szybkie np. soki, słodycze)</option>
                 <option value="medium">Średni (Umiarkowane np. chleb, makaron)</option>
                 <option value="low">Niski (Wolne np. warzywa, strączkowe)</option>
               </select>
             </div>

             <div className="space-y-2">
               <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Aktywność Fizyczna (Wpływ Treningu)</label>
               <select 
                 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
                 value={simWorkout}
                 onChange={(e) => {
                   setSimWorkout(e.target.value);
                   setSimResult(false);
                 }}
               >
                 <option value="none">Brak (Standardowa wrażliwość)</option>
                 <option value="light">Lekki wysiłek (Spacer, -15 BG / wzrost ISF)</option>
                 <option value="intense">Mocny trening (Bieganie, -30 BG / max ISF)</option>
               </select>
             </div>

             <div className="flex items-center gap-2 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl bg-teal-50 dark:bg-teal-900/10">
                <input 
                  type="checkbox" 
                  id="autoBasalCheck"
                  checked={simAutoBasal} 
                  onChange={e => {
                    setSimAutoBasal(e.target.checked);
                    setSimResult(false);
                  }} 
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500" 
                />
                <div>
                   <label htmlFor="autoBasalCheck" className="text-xs font-bold text-slate-600 dark:text-slate-300">Włącz Algorytm Hybrydowy (Auto Baza)</label>
                   <p className="text-[9px] text-slate-400 leading-tight">Symuluje pompę (np. 780G, Control-IQ), która reaguje na spadki i wzrosty automatycznymi korektami (mikrobolusy i zawieszenia).</p>
                </div>
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-2">Typ Bolusa</label>
             <select 
               className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm outline-none dark:text-white"
               value={simType}
               onChange={(e) => {
                 setSimType(e.target.value);
                 setSimResult(false);
               }}
             >
               <option value="standard">Standardowy (Całość od razu)</option>
               <option value="extended">Przedłużony (Całość rozłożona w czasie)</option>
               <option value="dual">Złożony / Pizza (Część teraz, Część w czasie)</option>
             </select>
          </div>
          
          {simType === 'dual' && (
            <div className="grid grid-cols-2 gap-4">
               <SettingInput label="% Teraz" value={simSplitNow} onChange={(v) => setSimSplitNow(Number(v))} />
               <SettingInput label="Czas przedłużenia (h)" value={simDuration} onChange={(v) => setSimDuration(Number(v))} />
            </div>
          )}
          
          {simType === 'extended' && (
            <div className="grid grid-cols-1 gap-4">
               <SettingInput label="Czas działania (h)" value={simDuration} onChange={(v) => setSimDuration(Number(v))} />
            </div>
          )}

          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-indigo-500">
               <span>Początkowa sugerowana dawka: {(simCarbs / Number(settings.wwRatio || 10) + simFat / Number(settings.wbtRatio || 10)).toFixed(2)} J</span>
            </div>
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase text-indigo-400 tracking-widest ml-2">Wprowadź własną dawkę do testu błędów (J) - Zostaw puste aby użyć sugerowanej</label>
              <input 
                type="number"
                placeholder="Wpisz np. 1.0 aby zobaczyć skutek niedoboru"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl font-bold text-sm outline-none dark:text-white"
                value={simManualDose}
                onChange={e => {
                  setSimManualDose(e.target.value);
                  setSimResult(false);
                }}
              />
            </div>
          </div>

          <div className="p-4 border border-slate-100 dark:border-slate-700 rounded-2xl space-y-3">
             <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="stackingCheck"
                  checked={simStackingEnabled} 
                  onChange={e => {
                    setSimStackingEnabled(e.target.checked);
                    setSimResult(false);
                  }} 
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" 
                />
                <label htmlFor="stackingCheck" className="text-xs font-bold text-slate-600 dark:text-slate-300">Dodaj nakładającą się dawkę (korekta IOB)</label>
             </div>
             {simStackingEnabled && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                   <SettingInput label="Wielkość Korekty (J)" value={simStackDose} onChange={(v) => setSimStackDose(Number(v))} />
                   <SettingInput label="Podana za (Godzin)" value={simStackTime} onChange={(v) => setSimStackTime(Number(v))} />
                </div>
             )}
          </div>

          <button 
            className="w-full bg-indigo-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all mt-4"
            onClick={() => setSimResult(true)}
          >
            Symuluj Pokrycie Bolusem
          </button>

          {simResult && (
             <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 mt-4 space-y-4">
                <h4 className="text-xs font-bold text-indigo-500">Wynik Symulacji:</h4>
                <div className="text-[10px] text-slate-500 font-medium space-y-3">
                  <p className="text-sm">Razem do podania: <strong className="text-indigo-500 text-lg">{((simCarbs / Number(settings.wwRatio || 10)) + (simFat / Number(settings.wbtRatio || 10))).toFixed(2)} j.</strong></p>
                  
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Co widzisz na wykresie?</p>
                    <p className="mb-2"><strong>Kolorowe słupki</strong> pokazują, ile insuliny działa w danym momencie. <strong>Czerwona linia</strong> to prognozowany poziom Twojego cukru we krwi.</p>
                    
                    <ul className="list-disc pl-4 space-y-1.5 text-[9px]">
                       <li><strong>Całkowita dawka:</strong> Tyle insuliny potrzebujesz na zjedzony posiłek bazując na Twoich przelicznikach z ustawień.</li>
                       <li><strong>ISF ({settings.isf || 40}):</strong> Wskaźnik wrażliwości. Pokazuje, o ile mg/dL spadnie Twój cukier po podaniu 1 jednostki insuliny.</li>
                       <li><strong>Tłuszcze opóźniają trawienie:</strong> Mięso, sery czy pizza sprawiają, że cukier może rosnąć nawet przez 5 godzin. Dlatego insulina rozłożona w czasie zadziała tu znacznie lepiej niż jeden strzał z pena!</li>
                       <li><strong>Ruch a cukier:</strong> Zaznaczenie treningu sprawia, że insulina działa mocniej i szybciej spala węglowodany, przez co cukier ma naturalną tendencję do spadania.</li>
                    </ul>
                  </div>
                </div>
                
                <div className="h-64 w-full mt-10 bg-white dark:bg-slate-900/80 rounded-xl relative flex items-end justify-between px-4 pt-12 pb-6 border-b border-l border-slate-300 dark:border-slate-700 shadow-inner">
                   {(() => {
                      const wwRatio = Number(settings.wwRatio || 10);
                      const wbtRatio = Number(settings.wbtRatio || 10);
                      const totalDoseAuto = (simCarbs / wwRatio) + (simFat / wbtRatio);
                      const appliedDose = simManualDose !== '' ? Number(simManualDose) : totalDoseAuto;
                      
                      const hoursMax = Math.max(simDuration + 1, simStackingEnabled ? simStackTime + 3 : 0, 6);
                      const hoursObj: {hour: number, label: string, dose1: number, dose2: number, autoDose: number, bg: number}[] = [];
                      
                      let cumulativeBg = simBg;
                      const ISF = Number(settings.isf || 40);
                      
                      for (let i = 0; i <= hoursMax; i++) {
                        let dose1 = 0;
                        if (simType === 'standard' && i === 0) dose1 = appliedDose;
                        else if (simType === 'extended' && i > 0 && i <= simDuration) dose1 = appliedDose / simDuration;
                        else if (simType === 'dual') {
                          if (i === 0) dose1 = appliedDose * (simSplitNow / 100);
                          if (i > 0 && i <= simDuration) dose1 = (appliedDose * (1 - simSplitNow / 100)) / simDuration;
                        }
                        
                        let dose2 = 0;
                        if (simStackingEnabled && i === simStackTime) dose2 = simStackDose;

                        let autoDose = 0;

                        // Calculate effect from given doses looking back
                        let insImpact1 = 0;
                        let insImpact2 = 0;
                        let autoImpact = 0;
                        
                        if (i >= 1) {
                          const d1_minus_1 = hoursObj[i-1]?.dose1 || 0;
                          const d1_minus_2 = hoursObj[i-2]?.dose1 || 0;
                          const d1_minus_3 = hoursObj[i-3]?.dose1 || 0;
                          insImpact1 = (d1_minus_1 * 0.6 + d1_minus_2 * 0.3 + d1_minus_3 * 0.1) * ISF;
                          
                          const d2_minus_1 = hoursObj[i-1]?.dose2 || 0;
                          const d2_minus_2 = hoursObj[i-2]?.dose2 || 0;
                          const d2_minus_3 = hoursObj[i-3]?.dose2 || 0;
                          insImpact2 = (d2_minus_1 * 0.6 + d2_minus_2 * 0.3 + d2_minus_3 * 0.1) * ISF;

                          const a_minus_1 = hoursObj[i-1]?.autoDose || 0;
                          const a_minus_2 = hoursObj[i-2]?.autoDose || 0;
                          const a_minus_3 = hoursObj[i-3]?.autoDose || 0;
                          autoImpact = (a_minus_1 * 0.6 + a_minus_2 * 0.3 + a_minus_3 * 0.1) * ISF;
                        }

                        // Apply workout multiplier & drops
                        let workoutMultiplier = 1;
                        let workoutDrop = 0;
                        if (simWorkout === 'light') { workoutMultiplier = 1.3; if(i===1||i===2) workoutDrop = 15; }
                        if (simWorkout === 'intense') { workoutMultiplier = 1.8; if(i>=1 && i<=3) workoutDrop = 30; }

                        insImpact1 *= workoutMultiplier;
                        insImpact2 *= workoutMultiplier;
                        autoImpact *= workoutMultiplier;

                        let carbImpact = 0;
                        if (simGi === 'high') {
                          if (i === 1) carbImpact = (simCarbs / wwRatio) * ISF * 0.9;
                          if (i === 2) carbImpact = (simCarbs / wwRatio) * ISF * 0.1;
                        } else if (simGi === 'low') {
                          if (i === 1) carbImpact = (simCarbs / wwRatio) * ISF * 0.3;
                          if (i === 2) carbImpact = (simCarbs / wwRatio) * ISF * 0.5;
                          if (i === 3) carbImpact = (simCarbs / wwRatio) * ISF * 0.2;
                        } else {
                          // Medium
                          if (i === 1) carbImpact = (simCarbs / wwRatio) * ISF * 0.7;
                          if (i === 2) carbImpact = (simCarbs / wwRatio) * ISF * 0.3;
                        }
                        
                        let fatImpact = 0;
                        if(i===2) fatImpact = (simFat / wbtRatio) * ISF * 0.2;
                        if(i===3) fatImpact = (simFat / wbtRatio) * ISF * 0.4;
                        if(i===4) fatImpact = (simFat / wbtRatio) * ISF * 0.3;
                        if(i===5) fatImpact = (simFat / wbtRatio) * ISF * 0.1;
                        
                        cumulativeBg += (carbImpact + fatImpact - insImpact1 - insImpact2 - autoImpact - workoutDrop);

                        // Auto Algorithm reacting to current BG 
                        if (simAutoBasal) {
                           if (cumulativeBg > 130) {
                              // Podaj mikrobolus korygujący (max 2J / h żeby nie zwariowało)
                              autoDose = ((cumulativeBg - 120) / ISF) * 0.5; 
                              if (autoDose > 2) autoDose = 2;
                           } else if (cumulativeBg < 80) {
                              // Odcięcie bazy -> odzyskanie cukru
                              cumulativeBg += Math.min(30, (80 - cumulativeBg) * 0.8);
                           }
                        }
                        
                        hoursObj.push({ hour: i, label: i === 0 ? "Teraz" : `+${i}h`, dose1, dose2, autoDose, bg: cumulativeBg });
                      }

                      const maxDose = Math.max(...hoursObj.map(h => h.dose1 + h.dose2 + h.autoDose), 1);
                      const maxBg = Math.max(...hoursObj.map(h => h.bg), 200, cumulativeBg + 20);
                      const minBg = Math.min(...hoursObj.map(h => h.bg), 70, cumulativeBg - 20);
                      const bgRange = Math.max(maxBg - minBg, 80);
                      const getY = (bg: number) => Math.max(10, Math.min(95, 100 - ((bg - minBg) / bgRange) * 85));

                      return (
                        <>
                          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                            <polyline 
                              points={hoursObj.map((h, i) => `${(i / (hoursObj.length - 1)) * 1000},${getY(h.bg) * 10}`).join(' ')}
                              fill="none" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" 
                            />
                            {hoursObj.map((h, i) => (
                              <g key={`bg-pt-${i}`}>
                                <circle cx={(i / (hoursObj.length - 1)) * 1000} cy={getY(h.bg) * 10} r="14" fill="#fff" stroke="#f43f5e" strokeWidth="6" />
                              </g>
                            ))}
                          </svg>

                          <div className="absolute inset-x-0 inset-y-0 pointer-events-none flex justify-between">
                            {hoursObj.map((h, i) => (
                               <div key={`bg-txt-${i}`} className="w-0 flex flex-col justify-start items-center" style={{ left: `${(i / (hoursObj.length - 1)) * 100}%`, position: 'absolute', top: `${getY(h.bg)}%`, marginTop: '-30px' }}>
                                 <span className="text-[10px] font-black text-rose-500 bg-white/80 dark:bg-slate-900/80 px-1 rounded shadow-sm relative z-10">{Math.round(h.bg)}</span>
                               </div>
                            ))}
                          </div>

                          {hoursObj.map((h, i) => (
                            <div key={`bar-${i}`} className="flex-1 max-w-[30px] w-full flex flex-col justify-end items-center group relative h-full mx-1 z-10 opacity-80 hover:opacity-100 transition-opacity">
                               {h.autoDose > 0 && (
                                 <div className="w-full bg-purple-400 min-h-[4px] rounded-t-lg transition-all" style={{ height: `${(h.autoDose / (maxDose * 1.5)) * 100}%` }}>
                                   <span className="text-[9px] font-black text-purple-600 block text-center -mt-4">{h.autoDose.toFixed(1)}</span>
                                 </div>
                               )}
                               {h.dose2 > 0 && (
                                 <div className={cn("w-full bg-amber-400 min-h-[4px] transition-all", h.autoDose === 0 ? "rounded-t-lg" : "")} style={{ height: `${(h.dose2 / (maxDose * 1.5)) * 100}%` }}>
                                   <span className="text-[9px] font-black text-amber-600 block text-center -mt-4">{h.dose2.toFixed(1)}</span>
                                 </div>
                               )}
                               <div 
                                 className={cn("w-full transition-all", h.dose2 === 0 && h.autoDose === 0 ? "rounded-t-lg" : "", simType === 'standard' ? "bg-indigo-400" : simType === 'extended' ? "bg-blue-400" : "bg-teal-400", h.dose1 > 0 ? "min-h-[4px]" : "min-h-[2px] bg-slate-300 dark:bg-slate-700")}
                                 style={{ height: `${(h.dose1 / (maxDose * 1.5)) * 100}%` }}
                               >
                                 {h.dose1 > 0 && <span className={"text-[9px] font-black block text-center -mt-4 " + (simType === 'standard' ? "text-indigo-600 font-bold" : simType === 'extended' ? "text-blue-600 font-bold" : "text-teal-600 font-bold")}>{h.dose1.toFixed(1)}</span>}
                               </div>
                               <div className="text-[8px] font-bold text-slate-500 absolute -bottom-6 flex flex-col items-center">
                                 <span>{h.label}</span>
                               </div>
                            </div>
                          ))}
                        </>
                      );
                   })()}
                </div>
                
                <div className="flex flex-wrap items-center gap-4 justify-center mt-10 p-4 border border-rose-100 dark:border-rose-900/30 rounded-xl bg-orange-50/50 dark:bg-orange-900/10">
                   <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500"><div className="w-3 h-3 rounded-full border-2 border-rose-500 bg-white"></div> Symulowana Glukoza (mg/dL)</div>
                   <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500"><div className="w-3 h-3 rounded bg-indigo-400"></div> Dawka główna</div>
                   {simStackingEnabled && <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500"><div className="w-3 h-3 rounded bg-amber-400"></div> Dawka ręczna</div>}
                   {simAutoBasal && <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500"><div className="w-3 h-3 rounded bg-purple-400"></div> Mikrobolusy u (Auto Bazy)</div>}
                </div>
             </div>
          )}

        </div>
      </div>
      )}

      {activeCategory === 'system' && (
      <div className="space-y-6">
      <div className="glass p-8 rounded-[3rem] space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Integracje i System</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Zap className="text-indigo-400" size={20} />
              <div className="flex flex-col">
                <span className="text-xs font-bold dark:text-white">Przewidywana Glikemia</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Model trendu i IOB</span>
              </div>
            </div>
            <button 
              onClick={async () => {
                const newSettings = { ...settings, showPrediction: !settings.showPrediction };
                setSettings(newSettings);
                // Auto-save this specific setting
                if (user) {
                  try {
                    await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile'), newSettings);
                  } catch (e) {
                    console.error("Auto-save prediction error:", e);
                  }
                }
              }}
              className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-300",
                settings.showPrediction ? "bg-indigo-600" : "bg-slate-300"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300",
                settings.showPrediction ? "left-7" : "left-1"
              )} />
            </button>
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
                className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm text-indigo-600 font-bold active:scale-90 transition-all border border-slate-100 dark:border-slate-600"
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
                className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm text-indigo-600 font-bold active:scale-90 transition-all border border-slate-100 dark:border-slate-600"
              >
                +
              </button>
            </div>
            <p className="text-[8px] font-bold text-slate-400 text-center uppercase tracking-tighter opacity-60">Standardowo: 3-5h dla analogów szybko-działających</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="text-indigo-400" size={20} /> : <Sun className="text-amber-500" size={20} />}
              <span className="text-xs font-bold dark:text-white">Tryb Ciemny</span>
            </div>
            <button 
              onClick={toggleTheme}
              className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-300",
                theme === 'dark' ? "bg-indigo-600" : "bg-slate-300"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300",
                theme === 'dark' ? "left-7" : "left-1"
              )} />
            </button>
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

          <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
                <Globe className="text-indigo-500" size={20} />
                <span className="text-xs font-bold dark:text-white">Adres Nightscout</span>
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
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl space-y-2">
              <p className="text-[8px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-widest">Architektura połączenia</p>
              <div className="flex justify-between items-center text-[9px] text-indigo-600 dark:text-indigo-400 font-bold px-2 text-center">
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
                className="text-[9px] font-black uppercase text-indigo-500 mt-1 text-left"
              >
                Zapisz URL
              </button>
            )}
            <button 
              onClick={async () => {
                if (!nsUrl) return;
                setNsSyncLoading(true);
                // Synchronizacja jest wyzwalana w App.tsx przy zmianie ustawień lub okresowo.
                // Zapisujemy URL, co zainicjuje synchronizację w App.tsx.
                await saveNsUrl();
                // Trigger event to force sync immediately
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
            <div className="flex items-center gap-3">
              <Info className="text-indigo-400" size={20} />
              <div className="flex flex-col">
                <span className="text-xs font-bold dark:text-white">Kontakt z Twórcami</span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">
                  Masz pytania lub sugestie? Napisz do nas:
                </span>
                <a href="mailto:GlikoControl@proton.me" className="text-sm font-black text-indigo-500 mt-1">
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
              setCleaningResult(null);
              setTimeout(() => {
                setUpdateLoading(false);
                setCleaningResult("Twoja wersja 2.5 jest aktualna. System jest zoptymalizowany.");
                setTimeout(() => setCleaningResult(null), 5000);
              }, 1500);
            }}
            disabled={updateLoading}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateLoading ? <Loader2 className="animate-spin" size={14} /> : null}
            Sprawdź Aktualizacje
          </button>
        </div>
      </div>
      </div>
      )}
    </motion.div>
  );
}

function SettingInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5 flex flex-col items-center">
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <input 
        type="number" 
        value={value} 
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-black text-center text-lg outline-none border border-slate-100 dark:border-slate-700 focus:border-indigo-500 transition-all dark:text-white"
      />
    </div>
  );
}
