import { useAuthStore } from '../stores/useAuthStore';
import { toast } from "react-hot-toast";
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Network, Copy, RefreshCw, CheckCircle2, BellRing, HelpCircle, ChevronDown, ChevronUp, ShieldAlert, Smartphone, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getEffectiveUid } from '../lib/utils';
import { NotificationBridge } from '../lib/notificationBridge';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

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

export default function ApiIntegration({ user: propUser }: { user?: any } = {}) {
  const storeUser = useAuthStore(state => state.user);
  const user = propUser || storeUser;

 const { t } = useTranslation();
 const [localSecret, setLocalSecret] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [xdripCopied, setXdripCopied] = useState(false);
  const [loading, setLoading] = useState(false);
 const [lastHash, setLastHash] = useState<string>('');
 const [notificationEnabled, setNotificationEnabled] = useState(false);
 const [showGuide, setShowGuide] = useState(false);
 const [showXdripGuide, setShowXdripGuide] = useState(false);
 const [debugLogs, setDebugLogs] = useState<Array<{time: string, pkg: string, title: string, text: string}>>([]);

 useEffect(() => {
 const checkPerm = async () => {
 try {
 const { granted } = await NotificationBridge.checkPermission();
 setNotificationEnabled(granted);
 } catch (e) {} // Not on Android or bridge not loaded
 };
 checkPerm();
 
 // Refresh when app comes back to foreground (e.g. returning from settings)
 const handleVisibilityChange = () => {
 if (document.visibilityState === 'visible') {
 checkPerm();
 }
 };
 document.addEventListener('visibilitychange', handleVisibilityChange);
 window.addEventListener('focus', checkPerm);
 
 let listener: any = null;
 const setupListener = async () => {
 try {
 // @ts-ignore
 listener = await NotificationBridge.addListener('notificationDebug', (data: any) => {
 setDebugLogs(prev => {
 const newLog = {
 time: new Date().toLocaleTimeString(),
 pkg: data.package || 'unknown',
 title: data.title || '',
 text: data.text || ''
 };
 return [newLog, ...prev].slice(0, 5); // Keep last 5
 });
 });
 
 try {
 setTimeout(() => {
 NotificationBridge.requestActiveNotifications().catch(e => console.warn(e));
 }, 1000);
 } catch(e) {}
 } catch (e) {}
 };
 setupListener();
 
 return () => {
 document.removeEventListener('visibilitychange', handleVisibilityChange);
 window.removeEventListener('focus', checkPerm);
 if (listener && typeof listener.remove === 'function') {
 listener.remove();
 }
 };
 }, [user]);

 const requestNotificationPermission = async () => {
 try {
 await NotificationBridge.requestPermission();
 toast.success(i18n.t('auto.otwarto_ustawienia_zezwol_apli', { defaultValue: i18n.t('auto.otwarto_ustawienia_zezwol', { defaultValue: "Otwarto ustawienia. Zezwól aplikacji GlikoControl na odczyt powiadomień." }) }));
 } catch (e) {
 toast.error(i18n.t('auto.nie_udalo_sie_otworzyc_ustawie', { defaultValue: i18n.t('auto.nie_udalo_sie_otworzyc_us', { defaultValue: "Nie udało się otworzyć ustawień. Funkcja działa tylko w aplikacji Android." }) }));
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
 getDoc(doc(db, 'apiSecrets', hash)).then(d => {
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
    if (!user) {
      toast.error("Zaloguj się, aby wygenerować klucz API.");
      return;
    }
    setLoading(true);
    try {
      // 1. Generate new secret & sha1 hash
      const newSecret = generateRandomSecret();
      const newHash = await sha1(newSecret);

      // 2. Direct Firestore save (Client SDK with Firestore Security Rules)
      await setDoc(doc(db, 'apiSecrets', newHash), {
        userId: user.uid,
        createdAt: Date.now()
      });

      try {
        await setDoc(doc(db, 'artifacts', 'diacontrolapp', 'apiSecrets', newHash), {
          userId: user.uid,
          createdAt: Date.now()
        });
      } catch (e) {}

      // 3. Remove old hash if existed
      if (lastHash) {
        try { await deleteDoc(doc(db, 'apiSecrets', lastHash)); } catch (e) {}
        try { await deleteDoc(doc(db, 'artifacts', 'diacontrolapp', 'apiSecrets', lastHash)); } catch (e) {}
      }

      // 4. Optional sync with backend server if available
      try {
        const token = await user.getIdToken();
        await fetch('/api/server/apiSecrets', {
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
      } catch (e) {
        console.warn("Backend server API secret sync skipped:", e);
      }

      // 5. Save to local storage for display
      setLocalSecret(newSecret);
      setLastHash(newHash);
      localStorage.setItem('diacontrol_api_secret', newSecret);
      toast.success("Klucz API wygenerowany pomyślnie!");
    } catch (e: any) {
      console.error("Failed to generate API secret", e);
      toast.error("Błąd generowania klucza: " + (e?.message || 'Spróbuj ponownie.'));
    } finally {
      setLoading(false);
    }
  };

 const copyToClipboard = () => {
 navigator.clipboard.writeText(localSecret);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

  const serverUrl = window.location.origin;
  const isLocalDev = serverUrl.includes('localhost') || serverUrl.includes('capacitor:');
  const targetBaseUrl = isLocalDev ? 'https://glikocontrol.pl' : serverUrl;

  const fullXdripUrl = useMemo(() => {
    if (!localSecret) return '';
    const cleanOrigin = targetBaseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const protocol = targetBaseUrl.startsWith('http://') ? 'http://' : 'https://';
    return `${protocol}${localSecret}@${cleanOrigin}/api/v1/`;
  }, [localSecret, targetBaseUrl]);

 const copyUrlToClipboard = () => {
 navigator.clipboard.writeText(serverUrl);
 setUrlCopied(true);
 setTimeout(() => setUrlCopied(false), 2000);
 };

 const copyXdripUrlToClipboard = () => {
   navigator.clipboard.writeText(fullXdripUrl);
   setXdripCopied(true);
   setTimeout(() => setXdripCopied(false), 2000);
 };

 return (
 <>
 <div className="flex flex-col gap-3 p-5 bg-gradient-to-tr from-accent-50 to-indigo-50 dark:from-accent-900/10 dark:to-indigo-900/10 rounded-3xl border border-accent-100 dark:border-accent-800/30">
 <div className="flex items-center gap-3 mb-2">
 <Network className="text-indigo-500" size={24} />
 <div>
 <h3 className="text-xs font-black dark:text-white uppercase tracking-widest">{t('auto.wbudowany_serwer_glikocontrol', { defaultValue: 'Wbudowany Serwer GlikoControl' })}</h3>
 <p className="text-[10px] text-slate-500 font-medium">{t('auto.połącz_z_xdrip_modowanym_carelink_j', { defaultValue: i18n.t('auto.polacz_z_xdrip_modowanym', { defaultValue: "Połącz z xDrip+ / modowanym Carelink / Juggluco" }) })}</p>
 </div>
 </div>

 <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl">
 
 {t('auto.aplikacja_glikocontrol_służy_teraz_', { defaultValue: i18n.t('auto.aplikacja_glikocontrol_sl', { defaultValue: "Aplikacja GlikoControl służy teraz jako Twój własny Nightscout serwer API! Skopiuj poniższe dane do źródła odczytów (np." }) })} <b>{t('auto.xdrip_rarr_ustawienia_rarr_cloud_up', { defaultValue: 'xDrip+ → Ustawienia → Cloud Upload → Nightscout Sync' })}</b>):
 </div>

 {localSecret ? (
 <div className="space-y-4">
 {/* Gotowy scalony link dla xDrip+ */}
 <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 space-y-1.5">
 <label className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider">
   ⭐ Pełny adres dla xDrip+ (wklej w pole Base URL)
 </label>
 <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800/60 overflow-hidden items-center shadow-xs">
   <div className="flex-1 p-2.5 text-[10px] font-mono select-all dark:text-indigo-300 break-all">
     {fullXdripUrl}
   </div>
   <button 
     onClick={copyXdripUrlToClipboard}
     className="p-2.5 px-3 bg-indigo-500 hover:bg-indigo-600 text-white transition-all font-bold text-[10px] flex items-center gap-1 uppercase tracking-wider shrink-0"
   >
     {xdripCopied ? <CheckCircle2 size={14} className="text-white"/> : <Copy size={14}/>}
     {xdripCopied ? "Skopiowano" : "Kopiuj"}
   </button>
 </div>
 <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">
   💡 <b>W xDrip+ nie ma osobnego pola na hasło API.</b> Klucz wpisuje się przed adresem po znaku <code>@</code> (dokładnie tak, jak w powyższym linku). Wklej ten cały adres w pole <b>Base URL</b> w xDrip+.
 </p>
 </div>

 <div>
 <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">{t('auto.baza_url_base_url', { defaultValue: 'Baza URL (Base URL)' })}</label>
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
 <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">{t('auto.api_secret_hasło_api', { defaultValue: i18n.t('auto.api_secret_haslo_api', { defaultValue: "API Secret / Hasło API" }) })}</label>
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
 <p className="text-[9px] text-amber-500 font-bold mt-2 leading-tight">{t('auto.uwaga_zapisz_go_lub_skopiuj_do_xdri', { defaultValue: i18n.t('auto.uwaga_zapisz_go_lub_skopi', { defaultValue: "Uwaga: Zapisz go lub skopiuj do xDrip+. Hasło jest zaszyfrowane w bazie, po wylogowaniu możliwe że konieczne będzie wygenerowanie nowego." }) })}</p>
 </div>

 <button 
 onClick={handleGenerate}
 disabled={loading}
 className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-accent-200 dark:border-accent-800 text-accent-600 dark:text-accent-400 text-[10px] font-black uppercase hover:bg-accent-50 dark:hover:bg-accent-900/30 transition-all"
 >
 <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
 
 {t('auto.wygeneruj_nowy_klucz', { defaultValue: 'Wygeneruj nowy klucz' })}
 </button>
 </div>
 ) : (
 <button 
 onClick={handleGenerate}
 disabled={loading}
 className="w-full bg-indigo-500 text-white py-4 rounded-xl font-black text-[11px] hover:bg-indigo-600 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 uppercase tracking-widest mt-2"
 >
 {loading ? "Generowanie..." : i18n.t('auto.wygeneruj_dostep_dla_xdrip', { defaultValue: i18n.t('auto.wygeneruj_dostep_dla_xdri', { defaultValue: "Wygeneruj Dostęp Dla xDrip+" }) })}
 </button>
 )}
 </div>

  {/* KARTA METODA 2: TRANSMISJA LOKALNA XDRIP+ (BROADCAST INTENTS) */}
  <div className="mt-4 flex flex-col gap-3 p-5 bg-gradient-to-tr from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-3xl border border-amber-200 dark:border-amber-800/30">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Radio className="text-amber-500 animate-pulse" size={24} />
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black dark:text-white uppercase tracking-widest">
              {t('auto.xdrip_nadawanie_lokalne', { defaultValue: 'xDrip+ Nadawanie Lokalne (Broadcast)' })}
            </h3>
            <span className="text-[8px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black px-1.5 py-0.5 rounded-md uppercase">
              {t('auto.zalecane', { defaultValue: 'Zalecane' })}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            {t('auto.xdrip_broadcast_subtitle', { defaultValue: 'Cukier, bolusy i posiłki • 100% offline • Bez serwera' })}
          </p>
        </div>
      </div>
    </div>

    <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium bg-white/60 dark:bg-slate-900/60 p-4 rounded-2xl space-y-2">
      <p>
        {t('auto.xdrip_broadcast_desc', { defaultValue: 'GlikoControl posiada wbudowany bezpośredni odbiornik rozgłoszeń systemowych Androida z xDrip+ (xDrip Broadcast Intents). Każdy nowy odczyt cukru z sensora oraz wprowadzony bolus insuliny i posiłek trafiają do GlikoControl i na widgety natychmiastowo, bez użycia internetu i bez czytania paska powiadomień.' })}
      </p>
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-[9.5px]">
        <CheckCircle2 size={14} className="shrink-0" />
        <span>{t('auto.xdrip_broadcast_active_status', { defaultValue: 'Odbiornik wbudowany w APK jest zawsze aktywny i gotowy do odbioru.' })}</span>
      </div>
    </div>

    {/* Rozwijana instrukcja włączenia w xDrip+ */}
    <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-amber-200/80 dark:border-amber-800/80 overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setShowXdripGuide(prev => !prev)}
        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-black text-[11px]">
            ⚡
          </div>
          <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate">
            {t('auto.xdrip_broadcast_guide_title', { defaultValue: 'Jak włączyć nadawanie w xDrip+? (3 proste kroki)' })}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          <span className="text-[9px] font-bold uppercase tracking-wider">{showXdripGuide ? 'Zwiń' : 'Rozwiń'}</span>
          {showXdripGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      <AnimatePresence>
        {showXdripGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 pt-1 space-y-2 text-[10px] text-slate-600 dark:text-slate-300 border-t border-amber-100 dark:border-amber-800/40"
          >
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <div className="font-black text-slate-800 dark:text-slate-200 text-[10.5px]">
                {t('auto.xdrip_broadcast_step1_title', { defaultValue: '1. Otwórz Ustawienia w xDrip+' })}
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[9.5px]">
                {t('auto.xdrip_broadcast_step1_desc', { defaultValue: 'W lewym górnym menu xDrip+ kliknij Ustawienia ➔ Udostępnianie między aplikacjami (lub Inter-app settings).' })}
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <div className="font-black text-slate-800 dark:text-slate-200 text-[10.5px]">
                {t('auto.xdrip_broadcast_step2_title', { defaultValue: '2. Włącz suwak „Nadawaj lokalnie”' })}
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[9.5px]">
                {t('auto.xdrip_broadcast_step2_desc', { defaultValue: 'Włącz opcję Nadawaj lokalnie (Broadcast locally).' })}
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <div className="font-black text-slate-800 dark:text-slate-200 text-[10.5px]">
                {t('auto.xdrip_broadcast_step3_title', { defaultValue: '3. Włącz kompatybilne rozgłoszenia' })}
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[9.5px]">
                {t('auto.xdrip_broadcast_step3_desc', { defaultValue: 'Upewnij się, że zaznaczona jest opcja Kompatybilne rozgłoszenia (Compatible broadcast) lub Wyślij do innych aplikacji. Gotowe!' })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>

  <div className="mt-4 flex flex-col gap-3 p-5 bg-gradient-to-tr from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-800/30">
 <div className="flex items-center gap-3 mb-2">
 <BellRing className="text-emerald-500" size={24} />
 <div>
 <h3 className="text-xs font-black dark:text-white uppercase tracking-widest">{t('auto.nasłuchiwanie_powiadomień', { defaultValue: i18n.t('auto.nasluchiwanie_powiadomien', { defaultValue: "Nasłuchiwanie Powiadomień" }) })}</h3>
 <p className="text-[10px] text-slate-500 font-medium">{t('auto.lokalny_odczyt_z_minimed_mobile_xdr', { defaultValue: 'Lokalny odczyt z Minimed Mobile / xDrip' })}</p>
 </div>
 </div>
 <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl">
 
 {t('auto.glikocontrol_może_odczytywać_twój_p', { defaultValue: i18n.t('auto.glikocontrol_moze_odczyty', { defaultValue: "GlikoControl może odczytywać Twój poziom cukru i insulinę aktywną bezpośrednio z powiadomień systemowych innych aplikacji w tle (bez użycia internetu)." }) })}
 </div>
 <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
 <div>
 <h4 className="text-[11px] font-bold dark:text-white mb-1">{t('auto.dostęp_do_powiadomień', { defaultValue: i18n.t('auto.dostep_do_powiadomien', { defaultValue: "Dostęp do powiadomień" }) })}</h4>
 <p className="text-[9px] text-slate-500 font-medium">{t('auto.status', { defaultValue: 'Status:' })} {notificationEnabled ? <span className="text-emerald-500 font-bold">{t('auto.włączony', { defaultValue: i18n.t('auto.wlaczony', { defaultValue: "WŁĄCZONY" }) })}</span> : <span className="text-rose-500 font-bold">{t('auto.wyłączony', { defaultValue: i18n.t('auto.wylaczony', { defaultValue: "WYŁĄCZONY" }) })}</span>}</p>
 </div>
 <button onClick={requestNotificationPermission} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${notificationEnabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:-translate-y-0.5'}`}>
 {notificationEnabled ? 'Konfiguruj' : i18n.t('auto.wlacz', { defaultValue: i18n.t('auto.wlacz', { defaultValue: "Włącz" }) })}
 </button>
 </div>

  {/* Rozwijany boks instrukcji krok po kroku */}
  <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs transition-all">
    <button 
      type="button"
      onClick={() => setShowGuide(prev => !prev)}
      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <HelpCircle size={14} />
        </div>
        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate">
          {t('auto.jak_to_uruchomic_instrukcja', { defaultValue: 'Jak to uruchomić? (Instrukcja krok po kroku)' })}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0 text-slate-400">
        <span className="text-[9px] font-bold uppercase tracking-wider">{showGuide ? 'Zwiń' : 'Rozwiń'}</span>
        {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
    </button>

    <AnimatePresence>
      {showGuide && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-4 pt-1 space-y-2.5 text-[10px] text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/60"
        >
          <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 leading-relaxed font-medium">
            {t('auto.instrukcja_opis_celu', { defaultValue: 'GlikoControl odczytuje cukier i insulinę bezpośrednio z paska powiadomień telefonu (LibreLink, xDrip+, Juggluco, Dexcom, MiniMed) w 100% offline, bez internetu.' })}
          </div>

          {/* Krok 1 - Kluczowy dla Android 13+ */}
          <div className="p-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-1">
            <div className="flex items-center gap-1.5 font-black text-amber-800 dark:text-amber-400 text-[10.5px]">
              <ShieldAlert size={13} className="shrink-0 text-amber-600" />
              <span>{t('auto.krok1_tytul', { defaultValue: '1. Odblokuj „Ograniczone ustawienia” (Android 13, 14, 15)' })}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[9.5px]">
              {t('auto.krok1_tresc', { defaultValue: 'Na pulpicie telefonu przytrzymaj palcem ikonę GlikoControl ➔ kliknij (ℹ️) Informacje o aplikacji ➔ w prawym górnym rogu kliknij trzy pionowe kropki (⋮) ➔ wybierz „Zezwalaj na ograniczone ustawienia” i potwierdź blokadą telefonu.' })}
            </p>
          </div>

          {/* Krok 2 */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <div className="font-black text-slate-800 dark:text-slate-200 text-[10.5px]">
              {t('auto.krok2_tytul', { defaultValue: '2. Włącz Dostęp do Powiadomień' })}
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[9.5px]">
              {t('auto.krok2_tresc', { defaultValue: 'Kliknij powyższy przycisk „Włącz” / „Konfiguruj”, odszukaj GlikoControl na liście systemowej i przesuń suwak na Zezwól.' })}
            </p>
          </div>

          {/* Krok 3 */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <div className="font-black text-slate-800 dark:text-slate-200 text-[10.5px]">
              {t('auto.krok3_tytul', { defaultValue: '3. Włącz stałe powiadomienie w aplikacji sensora' })}
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[9.5px]">
              {t('auto.krok3_tresc', { defaultValue: 'W swojej aplikacji CGM (np. LibreLink, Juggluco, xDrip+, MiniMed) upewnij się, że włączone jest stałe powiadomienie na pasku stanu z wynikiem cukru w mg/dL lub mmol/L.' })}
            </p>
          </div>

          {/* Krok 4 */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
            <div className="font-black text-slate-800 dark:text-slate-200 text-[10.5px]">
              {t('auto.krok4_tytul', { defaultValue: '4. Ustaw baterię na „Bez ograniczeń”' })}
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[9.5px]">
              {t('auto.krok4_tresc', { defaultValue: 'W Ustawieniach telefonu (Aplikacje ➔ GlikoControl ➔ Bateria) wybierz „Bez ograniczeń”, aby system Android nie usypiał nasłuchiwania w tle.' })}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>

 {notificationEnabled && (
 <div className="mt-2 bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
 <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
 <span>{t('auto.dziennik_powiadomień_na_żywo', { defaultValue: i18n.t('auto.dziennik_powiadomien_na_z', { defaultValue: "Dziennik Powiadomień (Na Żywo)" }) })}</span>
 {debugLogs.length > 0 && (
 <span className="text-[8px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full animate-pulse">{t('auto.aktywny', { defaultValue: 'Aktywny' })}</span>
 )}
 </h4>
 <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
 {debugLogs.length === 0 ? (
 <div className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center py-4">
 
 {t('auto.czekam_na_powiadomienia_z_systemu_z', { defaultValue: i18n.t('auto.czekam_na_powiadomienia_z', { defaultValue: "Czekam na powiadomienia z systemu... (Zmieni się to automatycznie gdy nadejdzie nowy cukier)." }) })}
 </div>
 ) : (
 debugLogs.map((log, i) => (
 <div key={i} className="bg-white dark:bg-slate-800 p-2.5 rounded-xl text-[9px] font-mono shadow-sm">
 <div className="text-slate-400 mb-1 flex justify-between">
 <span className="font-bold text-accent-500">{log.time}</span>
 <span className="truncate ml-2 text-[8px]">{log.pkg}</span>
 </div>
 <div className="font-bold text-slate-700 dark:text-slate-200 mb-0.5">{t('auto.tytuł', { defaultValue: i18n.t('auto.tytul', { defaultValue: "Tytuł:" }) })} {log.title}</div>
 <div className="text-slate-500 dark:text-slate-400">{t('auto.tekst', { defaultValue: 'Tekst:' })} {log.text}</div>
 </div>
 ))
 )}
 </div>
 </div>
 )}
 </div>
 </>
 );
}

