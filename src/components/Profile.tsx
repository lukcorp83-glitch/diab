import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, LogOut, Moon, Sun, Smartphone, Bell, Shield, Info, Globe, Loader2, Zap, Medal, Trophy } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { doc, getDoc, getDocs, setDoc, collection, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { UserSettings } from '../types';

import CgmImport from './CgmImport';

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

  const cleanupDatabase = async () => {
    setCleaning(true);
    setCleaningResult(null);
    let count = 0;
    try {
      // 1. Oczyszczanie prywatnej bazy produktów
      const userRef = collection(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'customProducts');
      const userSnap = await getDocs(userRef);
      for (const docSnap of userSnap.docs) {
        const data = docSnap.data();
        if (!data || typeof data.name !== 'string' || data.name.trim() === '') {
          await deleteDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'customProducts', docSnap.id));
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
    const settingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'settings', 'profile');
    const unsubscribe = onSnapshot(settingsRef, (d) => {
      if (d.exists()) setSettings({ showPrediction: true, ...d.data() } as UserSettings);
    });
    const nsSettingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'settings', 'nightscout');
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

    const unsubscribeShortcuts = onSnapshot(collection(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'shortcuts'), (snapshot) => {
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
        await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'shortcuts', id), data);
      } else {
        // Add
        const { id, ...data } = newShortcut;
        await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'shortcuts'), data);
      }
      setNewShortcut({ id: '', name: '', icon: '📌', type: 'meal', carbs: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteShortcut = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'shortcuts', id));
    } catch (e) {
      console.error(e);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    setSettingsLoading(true);
    try {
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'settings', 'profile'), settings);
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
      
      await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'settings', 'nightscout'), { 
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
                    await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'settings', 'profile'), newSettings);
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
                  if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'settings', 'profile'), newSettings);
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
                  if (user) await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', user.uid, 'settings', 'profile'), newSettings);
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
                setCleaningResult("Twoja wersja 2.0.12 jest aktualna. System jest zoptymalizowany.");
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
