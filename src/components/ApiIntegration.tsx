import { toast } from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Network, Copy, RefreshCw, CheckCircle2, BellRing } from 'lucide-react';
import { getEffectiveUid } from '../lib/utils';
import { NotificationBridge } from '../lib/notificationBridge';

async function sha1(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateRandomSecret() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function ApiIntegration({ user }: { user: any }) {
  const [localSecret, setLocalSecret] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastHash, setLastHash] = useState<string>('');
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  useEffect(() => {
    const checkPerm = async () => {
      try {
        const { granted } = await NotificationBridge.checkPermission();
        setNotificationEnabled(granted);
      } catch (e) {} // Not on Android or bridge not loaded
    };
    checkPerm();
  }, [user]);

  const requestNotificationPermission = async () => {
    try {
      await NotificationBridge.requestPermission();
      toast.success("Otwarto ustawienia. Zezwól aplikacji GlikoControl na odczyt powiadomień.");
    } catch (e) {
      toast.error("Nie udało się otworzyć ustawień. Funkcja działa tylko w aplikacji Android.");
    }
  };

  useEffect(() => {
    // Attempt to pull a secret from localStorage (since plaintext is never stored in Firestore)
    const stored = localStorage.getItem('diacontrol_api_secret');
    if (stored) {
      setLocalSecret(stored);
      // Validate if mapping still exists
      sha1(stored).then(hash => {
         setLastHash(hash);
         getDoc(doc(db, 'artifacts', 'diacontrolapp', 'apiSecrets', hash)).then(d => {
             if (!d.exists() || d.data()?.userId !== user.uid) {
                 // The hash in DB doesn't match, meaning this token is invalid
                 setLocalSecret('');
                 localStorage.removeItem('diacontrol_api_secret');
             }
         }).catch(e => {
             console.warn("Could not validate API secret", e);
             setLocalSecret('');
             localStorage.removeItem('diacontrol_api_secret');
         });
      });
    }
  }, [user]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // 1. Generate new secret
      const newSecret = generateRandomSecret();
      const newHash = await sha1(newSecret);

      // 2. Obtain token
      const token = await user.getIdToken();

      // 3. Save to server
      const response = await fetch('/api/server/apiSecrets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newHash,
          oldHash: lastHash || null
        })
      });

      if (!response.ok) {
        throw new Error("Server responded with: " + response.statusText);
      }

      // 4. Save to local storage for display
      setLocalSecret(newSecret);
      setLastHash(newHash);
      localStorage.setItem('diacontrol_api_secret', newSecret);
    } catch (e: any) {
      console.error("Failed to generate API secret", e);
      toast("Failed to generate API secret. " + (e?.message || 'Please try again.'));
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(localSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const serverUrl = window.location.origin;

  const copyUrlToClipboard = () => {
    navigator.clipboard.writeText(serverUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <>
      <div className="flex flex-col gap-3 p-5 bg-gradient-to-tr from-accent-50 to-indigo-50 dark:from-accent-900/10 dark:to-indigo-900/10 rounded-3xl border border-accent-100 dark:border-accent-800/30">
        <div className="flex items-center gap-3 mb-2">
          <Network className="text-indigo-500" size={24} />
          <div>
            <h3 className="text-xs font-black dark:text-white uppercase tracking-widest">Wbudowany Serwer GlikoControl</h3>
            <p className="text-[10px] text-slate-500 font-medium">Połącz z xDrip+ / modowanym Carelink / Juggluco</p>
          </div>
        </div>

        <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl">
          Aplikacja GlikoControl służy teraz jako Twój własny Nightscout serwer API! 
          Skopiuj poniższe dane do źródła odczytów (np. <b>xDrip+ &rarr; Ustawienia &rarr; Cloud Upload &rarr; Nightscout Sync</b>):
        </div>

        {localSecret ? (
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Baza URL (Base URL)</label>
              <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden items-center">
                <div className="flex-1 p-3 text-[11px] font-mono select-all dark:text-accent-300">
                  {serverUrl}
                </div>
                <button 
                  onClick={copyUrlToClipboard}
                  className="p-3 text-accent-500 hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/30 transition-all font-bold text-[10px] flex items-center gap-1 uppercase tracking-wider"
                >
                  {urlCopied ? <CheckCircle2 size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                  {urlCopied ? "Skopiowano" : "Kopiuj"}
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">API Secret / Hasło API</label>
              <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden items-center">
                <input 
                  readOnly 
                  value={localSecret} 
                  className="bg-transparent flex-1 p-3 text-[12px] font-mono outline-none dark:text-white"
                />
                <button 
                  onClick={copyToClipboard}
                  className="p-3 text-accent-500 hover:text-accent-600 hover:bg-accent-50 dark:hover:bg-accent-900/30 transition-all font-bold text-[10px] flex items-center gap-1 uppercase tracking-wider"
                >
                  {copied ? <CheckCircle2 size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                  {copied ? "Skopiowano" : "Kopiuj"}
                </button>
              </div>
              <p className="text-[9px] text-amber-500 font-bold mt-2 leading-tight">Uwaga: Zapisz go lub skopiuj do xDrip+. Hasło jest zaszyfrowane w bazie, po wylogowaniu możliwe że konieczne będzie wygenerowanie nowego.</p>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-accent-200 dark:border-accent-800 text-accent-600 dark:text-accent-400 text-[10px] font-black uppercase hover:bg-accent-50 dark:hover:bg-accent-900/30 transition-all"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Wygeneruj nowy klucz
            </button>
          </div>
        ) : (
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-indigo-500 text-white py-4 rounded-xl font-black text-[11px] hover:bg-indigo-600 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 uppercase tracking-widest mt-2"
          >
            {loading ? "Generowanie..." : "Wygeneruj Dostęp Dla xDrip+"}
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 p-5 bg-gradient-to-tr from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-800/30">
        <div className="flex items-center gap-3 mb-2">
          <BellRing className="text-emerald-500" size={24} />
          <div>
            <h3 className="text-xs font-black dark:text-white uppercase tracking-widest">Nasłuchiwanie Powiadomień</h3>
            <p className="text-[10px] text-slate-500 font-medium">Lokalny odczyt z Minimed Mobile / xDrip</p>
          </div>
        </div>
        <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl">
          GlikoControl może odczytywać Twój poziom cukru i insulinę aktywną bezpośrednio z powiadomień systemowych innych aplikacji w tle (bez użycia internetu).
        </div>
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-[11px] font-bold dark:text-white mb-1">Dostęp do powiadomień</h4>
            <p className="text-[9px] text-slate-500 font-medium">Status: {notificationEnabled ? <span className="text-emerald-500 font-bold">WŁĄCZONY</span> : <span className="text-rose-500 font-bold">WYŁĄCZONY</span>}</p>
          </div>
          <button onClick={requestNotificationPermission} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${notificationEnabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:-translate-y-0.5'}`}>
            {notificationEnabled ? 'Konfiguruj' : 'Włącz'}
          </button>
        </div>
      </div>
    </>
  );
}
