import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getEffectiveUid, cn } from "../lib/utils";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
import ModernQRCard from "./ModernQRCard";
import { Html5Qrcode } from "html5-qrcode";
import {
 Share2,
 Download,
 X,
 Copy,
 Check,
 Users,
 Link as LinkIcon,
 Unlink,
 Camera,
 Server,
 Network,
 ShieldCheck,
 Lock,
 Utensils,
 Syringe,
 Droplets,
 RefreshCw,
 Sliders,
 Trash2,
 KeyRound,
 HelpCircle,
 ChevronDown,
 ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserSettings, ChildPermissions } from "../types";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ConnectedDevice } from "../hooks/useGlikoServer";
import { useBackButton } from "../hooks/useBackButton";
import { requireParentalAuth } from "../lib/childPermissions";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function DevicePairing({
 user,
 settings,
 onImport,
 onUpdateSettings,
 wsDevices = [],
 kickDevice = () => {},
 localDeviceId
}: {
 
 settings: UserSettings;
 onImport: (s: UserSettings) => void;
 onUpdateSettings: (s: Partial<UserSettings>) => void;
 wsDevices?: ConnectedDevice[];
 kickDevice?: (id: string) => void;
 localDeviceId?: string;
}) {
 const { t } = useTranslation();
 const [showExport, setShowExport] = useState(false);
 const [showImport, setShowImport] = useState(false);
 const [showGuide, setShowGuide] = useState(false);
 const [copied, setCopied] = useState(false);
 const [importText, setImportText] = useState("");
 const [localRole, setLocalRole] = useState<'master' | 'admin' | 'follower'>(() => {
 if (localStorage.getItem("diacontrol_is_master") === "true") return 'master';
 if (localStorage.getItem("diacontrol_is_admin") === "true") return 'admin';
 return 'follower';
 });

  const executeRoleChange = (newRole: 'master' | 'admin' | 'follower') => {
    setLocalRole(newRole);
    if (newRole === 'master') {
      localStorage.setItem("diacontrol_is_master", "true");
      localStorage.removeItem("diacontrol_is_admin");
    } else if (newRole === 'admin') {
      localStorage.setItem("diacontrol_is_admin", "true");
      localStorage.removeItem("diacontrol_is_master");
    } else {
      localStorage.removeItem("diacontrol_is_master");
      localStorage.removeItem("diacontrol_is_admin");
    }
    window.location.reload();
  };

  const handleRoleChange = (newRole: 'master' | 'admin' | 'follower') => {
    if (newRole === localRole) return;
    
    // Jeśli to telefon Mastera i ustawiony jest PIN rodzica, zmiana roli na Admin wymaga PINu
    if (localRole === 'master' && (settings?.parentalPin || localStorage.getItem('parental_pin_code'))) {
      requireParentalAuth(settings, 'canEditTherapySettings', {
        title: 'Zmiana Roli Urządzenia 🛡️',
        description: 'Przełączenie roli na tym urządzeniu wymaga autoryzacji Kodem PIN Rodzica.',
        onSuccess: () => {
          executeRoleChange(newRole);
        }
      });
      return;
    }

    executeRoleChange(newRole);
  };

 const [linkedUid, setLinkedUid] = useState<string | null>(
 localStorage.getItem("diacontrol_linked_uid"),
 );

 const [qrPayload, setQrPayload] = useState("");
 const [failedAttempts, setFailedAttempts] = useState(
 Number(localStorage.getItem("pairing_failed_attempts") || 0),
 );
 const [isBlocked, setIsBlocked] = useState(false);
 const [groupCount, setGroupCount] = useState<number>(0);
 const [newPinInput, setNewPinInput] = useState("");
 const [isSettingPin, setIsSettingPin] = useState(false);

 // Obsługa przycisku Wstecz Androida dla okien parowania QR
 useBackButton(showExport, () => setShowExport(false));
 useBackButton(showImport, () => setShowImport(false));

 useEffect(() => {
 const blockUntil = Number(localStorage.getItem("pairing_block_until") || 0);
 if (blockUntil > Date.now()) {
 setIsBlocked(true);
 const remaining = blockUntil - Date.now();
 setTimeout(() => setIsBlocked(false), remaining);
 }
 }, []);

 // Fetch count of paired devices
 useEffect(() => {
 if (user && !linkedUid) {
 const getFollowers = async () => {
 try {
 const reqsRef = collection(
 db,
 "users",
 user.uid,
 "linkRequests",
 );
 const snap = await getDocs(reqsRef);
 setGroupCount(snap.size + 1); // master + followers
 } catch (e) {
 console.error("Error fetching group count", e);
 }
 };
 getFollowers();
 } else if (linkedUid) {
 setGroupCount(2); 
 }
 }, [user, linkedUid]);

 useEffect(() => {
 if (showExport && user) {
 const docRef = doc(
 db,
 "users",
 getEffectiveUid(user),
 );
 getDoc(docRef).then((d) => {
 let secret = "";
 if (d.exists() && d.data().syncSecret) {
 secret = d.data().syncSecret;
 } else {
 secret = Math.random().toString(36).substring(2, 12);
 setDoc(docRef, { syncSecret: secret }, { merge: true });
 }
 setQrPayload(
 JSON.stringify({
 action: "pair",
 uid: getEffectiveUid(user),
 syncSecret: secret,
 ts: Date.now()
 }),
 );
 });
 }
 }, [showExport, user, settings]);

 const handleCopy = () => {
 navigator.clipboard.writeText(qrPayload);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const handleUnlink = () => {
 if (
 confirm(
 i18n.t('auto.czy_na_pewno_chcesz_odlaczyc_s', { defaultValue: i18n.t('auto.czy_na_pewno_chcesz_odlac', { defaultValue: "Czy na pewno chcesz odłączyć swoje urządzenie i powrócić do swojego pustego profilu?" }) }),
 )
 ) {
 localStorage.removeItem("diacontrol_linked_uid");
 onUpdateSettings({ linkedUid: "", isLinkedAdmin: false });
 window.location.reload();
 }
 };

 const handleImportText = async (textValue?: string) => {
 const now = Date.now();
 const blockUntil = Number(localStorage.getItem("pairing_block_until") || 0);

 if (now < blockUntil) {
 toast(i18n.t('auto.przekroczono_limit_prob_sprobu', { defaultValue: i18n.t('auto.przekroczono_limit_prob_s', { defaultValue: "Przekroczono limit prób. Spróbuj ponownie za chwilę." }) }));
 return;
 }

 try {
 const parsed = JSON.parse(textValue || importText);

 if (parsed.action === "pair" && parsed.ts) {
 const age = now - parsed.ts;
 if (age > 5 * 60 * 1000) {
 alert(i18n.t('auto.ten_kod_parowania_wygasl_wygen', { defaultValue: i18n.t('auto.ten_kod_parowania_wygasl', { defaultValue: "Ten kod parowania wygasł. Wygeneruj nowy kod na drugim urządzeniu." }) }));
 return;
 }
 }

 if (parsed.action === "pair" && parsed.uid) {
 if (parsed.uid === getEffectiveUid(user)) {
 alert(i18n.t('auto.nie_mozesz_sparowac_konta_ze_s', { defaultValue: i18n.t('auto.nie_mozesz_sparowac_konta', { defaultValue: "Nie możesz sparować konta ze sobą samym." }) }));
 return;
 }

 if (user && parsed.syncSecret) {
 try {
 await setDoc(
 doc(
 db,
 "users",
 parsed.uid,
 "linkRequests",
 user.uid,
 ),
 {
 syncSecret: parsed.syncSecret,
 createdAt: serverTimestamp(),
 },
 );
 } catch (err) {
 console.error("Link failed", err);
 throw new Error("Link failed due to invalid code or permissions");
 }
 }

 localStorage.removeItem("pairing_failed_attempts");
 localStorage.removeItem("pairing_block_until");
 localStorage.setItem("diacontrol_linked_uid", parsed.uid);
 
 // ZAPIS DO CHMURY (Firebase Fallback)
 const settingsToUpdate: any = { 
 linkedUid: parsed.uid,
 isLinkedAdmin: parsed.role === 'admin'
 };
 
 // Kopiujemy też websocketUrl z mastera jeśli jest
 if (parsed.settings?.websocketUrl) {
 settingsToUpdate.websocketUrl = parsed.settings.websocketUrl;
 }
 
 onUpdateSettings(settingsToUpdate);
 
 alert(i18n.t('auto.polaczono_pomyslnie_aplikacja', { defaultValue: i18n.t('auto.polaczono_pomyslnie_aplik', { defaultValue: "Połączono pomyślnie! Aplikacja zostanie przeładowana." }) }));
 window.location.reload();
 } else if (parsed && typeof parsed === "object") {
 onImport(parsed);
 setShowImport(false);
 setImportText("");
 alert(i18n.t('auto.zaimportowano_ustawienia_pomys', { defaultValue: i18n.t('auto.zaimportowano_ustawienia', { defaultValue: "Zaimportowano ustawienia pomyślnie!" }) }));
 } else {
 throw new Error("Invalid format");
 }
 } catch (e) {
 const newCount = failedAttempts + 1;
 setFailedAttempts(newCount);
 localStorage.setItem("pairing_failed_attempts", newCount.toString());

 if (newCount >= 5) {
 const lockoutTime = 5 * 60 * 1000;
 localStorage.setItem(
 "pairing_block_until",
 (now + lockoutTime).toString(),
 );
 setIsBlocked(true);
 setTimeout(() => setIsBlocked(false), lockoutTime);
 alert(
 i18n.t('auto.zbyt_wiele_nieudanych_prob_moz', { defaultValue: i18n.t('auto.zbyt_wiele_nieudanych_pro', { defaultValue: "Zbyt wiele nieudanych prób. Możliwość parowania zablokowana na 5 minut." }) }),
 );
 } else {
 alert(`Nieprawidłowy kod. Pozostało prób: ${5 - newCount}`);
 }
 }
 };

 return (
 <div className="flex flex-col gap-4 animate-fade-in p-4 pb-24">
 <div className="flex items-center gap-3 px-2 mb-2">
 <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
 <Network className="text-indigo-500" size={20} />
 </div>
 <div>
 <h2 className="text-xl font-black dark:text-white tracking-tight">{t('auto.zarządzanie_urządzeniami', { defaultValue: i18n.t('auto.zarzadzanie_urzadzeniami', { defaultValue: "Zarządzanie Urządzeniami" }) })}</h2>
 <p className="text-xs text-slate-500 font-medium">{t('auto.parowanie_kont_i_super_szybki_serwe', { defaultValue: 'Parowanie kont i super-szybki serwer' })}</p>
 </div>
 </div>

 <div className="flex flex-col gap-2 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-3">
 <Users className="text-accent-500" size={20} />
 <span className="text-sm font-black dark:text-white uppercase tracking-widest">
 
 {t('auto.rodzina_parowanie', { defaultValue: 'Rodzina / Parowanie' })}
 </span>
 </div>
 <div className="flex items-center gap-2">
 {wsDevices.length > 0 && (
 <span className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold px-2 py-1 rounded-full flex items-center gap-1">
 👥 {wsDevices.length} {t('auto.aktywnych', { defaultValue: 'aktywnych' })}
 </span>
 )}
 {linkedUid && (
 <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded-full flex items-center gap-1">
 <LinkIcon size={10} /> {t('auto.sparowano', { defaultValue: 'Sparowano' })}
 </span>
 )}
 </div>
 </div>
 <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-4">
 
 {t('auto.połącz_urządzenia_aby_bliska_osoba_', { defaultValue: i18n.t('auto.polacz_urzadzenia_aby_bli', { defaultValue: "Połącz urządzenia, aby bliska osoba widziała na żywo cukry i dodawane bolusy. Wybierz rolę dla tego telefonu przed parowaniem." }) })}
 </p>

 <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 p-2.5 rounded-2xl mb-4 flex flex-col gap-1.5">
    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 ml-1">
      {t('auto.rola_tego_urządzenia', { defaultValue: "Rola tego urządzenia" })}
    </label>
    <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm gap-1">
      <button
        onClick={() => handleRoleChange('master')}
        className={cn(
          "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
          localRole === 'master' ? "bg-accent-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
      >
        👑 Master
      </button>
      <button
        onClick={() => handleRoleChange('admin')}
        className={cn(
          "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
          localRole === 'admin' ? "bg-rose-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
      >
        🛡️ Admin
      </button>
      <button
        onClick={() => handleRoleChange('follower')}
        className={cn(
          "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
          localRole === 'follower' ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
      >
        👁️ Obserwator
      </button>
    </div>
    <p className="text-[9.5px] text-slate-400 text-center px-2 py-1 leading-tight font-medium">
      {localRole === 'master' && '👑 Telefon Główny (Master): Źródło danych, kroków, CGM i pompy. Generuje kod do parowania.'}
      {localRole === 'admin' && '🛡️ Opiekun / Admin: Skanuje kod Mastera. Może zdalnie edytować ustawienia i pomagać.'}
      {localRole === 'follower' && '👁️ Obserwator: Skanuje kod Mastera. Tryb bezpieczny tylko do podglądu (np. dla szkoły/dziadków).'}
    </p>
  </div>

  {/* Przewodnik / Instrukcja Parowania */}
  <div className="bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/20 rounded-2xl p-3 mb-4 flex flex-col gap-2">
    <button
      onClick={() => setShowGuide(!showGuide)}
      className="flex items-center justify-between text-left w-full cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-xl">
          <HelpCircle size={15} />
        </div>
        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
          {t('auto.jak_skonfigurowac_parowanie', { defaultValue: 'Jak połączyć urządzenia? (Krótki Przewodnik)' })}
        </span>
      </div>
      {showGuide ? <ChevronUp size={16} className="text-sky-500" /> : <ChevronDown size={16} className="text-sky-500" />}
    </button>

    <AnimatePresence>
      {showGuide && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden flex flex-col gap-2.5 pt-2 text-[11px] text-slate-600 dark:text-slate-300"
        >
          {/* Sekcja 1: Rodzic & Dziecko */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 shadow-sm">
            <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5 text-[11px]">
              👨‍👩‍👧 1. Rodzic i Dziecko (Ochrona PIN-em):
            </span>
            <ul className="list-disc pl-4 space-y-1 text-[10.5px] leading-relaxed">
              <li><strong>Telefon Dziecka:</strong> Wybierz rolę <code>👑 Master</code>. W sekcji <em>Kontrola Rodzicielska</em> poniżej ustaw PIN i dostosuj suwaki (np. zablokuj bolusy/osprzęt). Kliknij <strong>Udostępnij QR</strong>.</li>
              <li><strong>Telefon Rodzica (Mama / Tata):</strong> Wybierz rolę <code>🛡️ Admin</code> i kliknij <strong>Zeskanuj QR</strong> (zeskanuj kod z telefonu dziecka).</li>
              <li><em>Efekt:</em> Rodzic może zdalnie pomagać i zmieniać ustawienia, a dziecko nie odepnie konta ani nie zmieni roli bez PIN-u.</li>
            </ul>
          </div>

          {/* Sekcja 2: Dorosły & Partner */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 shadow-sm">
            <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5 text-[11px]">
              👫 2. Osoba Dorosła i Partner / Rodzina:
            </span>
            <ul className="list-disc pl-4 space-y-1 text-[10.5px] leading-relaxed">
              <li><strong>Twój Telefon:</strong> Wybierz rolę <code>👑 Master</code> (brak PIN-u = 100% swobody). Kliknij <strong>Udostępnij QR</strong>.</li>
              <li><strong>Telefon Partnera:</strong> Wybierz rolę <code>👁️ Obserwator</code> i kliknij <strong>Zeskanuj QR</strong>.</li>
              <li><em>Efekt:</em> Partner ma podgląd Twojego cukru i alertów na żywo, bez możliwości zmieniania czegokolwiek w Twojej aplikacji.</li>
            </ul>
          </div>

          {/* Sekcja 3: Szkoła / Dziadkowie */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 shadow-sm">
            <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5 text-[11px]">
              🏫 3. Szkoła, Nauczyciele, Dziadkowie:
            </span>
            <p className="text-[10.5px] leading-relaxed">
              Zawsze wybieraj dla nich rolę <code>👁️ Obserwator</code>. Daje im to wyłącznie bezpieczny podgląd glikemii i powiadomień.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>

  {linkedUid && (
    <button
      onClick={handleUnlink}
      className="w-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-4 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all mb-4 shadow-sm"
    >
      <Unlink size={16} /> {t('auto.odłącz_konto', { defaultValue: "Odłącz Konto" })}
    </button>
  )}

 {!linkedUid && (
 <div className="flex gap-2">
 <button
 onClick={() => setShowExport(true)}
 className="flex-1 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-bold py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
 >
 <Share2 size={16} /> {t('auto.udostępnij_qr', { defaultValue: i18n.t('auto.udostepnij_qr', { defaultValue: "Udostępnij QR" }) })}
 </button>
 <button
 onClick={() => setShowImport(true)}
 className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-2xl transition-all shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
 >
 <Download size={16} /> {t('auto.zeskanuj_qr', { defaultValue: i18n.t('auto.zeskanuj_qr', { defaultValue: "Zeskanuj QR" }) })}
 </button>
 </div>
 )}

 {(wsDevices.length > 0 || linkedUid || groupCount > 0) && (
 <div className="mt-4 border-t border-slate-100 dark:border-slate-800/50 pt-4">
 <h4 className="text-[10px] font-black uppercase text-slate-500 mb-3 pl-1">
 {t('auto.lista_urządzeń', { defaultValue: 'Lista Urządzeń' })}
 </h4>
 <div className="flex flex-col gap-2">
 {wsDevices.map((d) => (
 <div key={d.deviceId} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
 <div className="flex flex-col text-left">
 <span className="text-xs font-bold dark:text-white flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
 {d.deviceName}
 {d.deviceId === localDeviceId && <span className="text-[10px] text-slate-400 font-normal">{t('auto.ty', { defaultValue: '(Ty)' })}</span>}
 {d.isAdmin && <span className="text-[9px] bg-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded-md uppercase">{t('auto.admin', { defaultValue: 'Admin' })}</span>}
 {d.role === 'master' && <span className="text-[9px] bg-sky-500/20 text-sky-500 px-1.5 py-0.5 rounded-md uppercase">{t('auto.master', { defaultValue: 'Master' })}</span>}
 </span>
 <span className="text-[9px] text-slate-400 font-medium">{t('auto.id', { defaultValue: 'ID:' })} {d.deviceId.split('-').pop()}</span>
 </div>
 {((!linkedUid) || localStorage.getItem("diacontrol_is_admin") === "true") && d.role !== 'master' && (
 <button
 onClick={() => kickDevice(d.deviceId)}
 className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
 title={t('auto.odłącz_to_urządzenie', { defaultValue: i18n.t('auto.odlacz_to_urzadzenie', { defaultValue: "Odłącz to urządzenie" }) })}
 >
 <Unlink size={16} />
 </button>
 )}
 </div>
 ))}

 {/* OFFLINE DEVICES */}
 {linkedUid && !wsDevices.find(d => d.role === 'master') && (
 <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 opacity-60">
 <div className="flex flex-col text-left">
 <span className="text-xs font-bold dark:text-white flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-slate-400" />
 {t('auto.telefon_glowny', { defaultValue: 'Telefon Główny' })}
 <span className="text-[9px] bg-slate-500/20 text-slate-500 px-1.5 py-0.5 rounded-md uppercase">Offline</span>
 </span>
 <span className="text-[9px] text-slate-400 font-medium">{t('auto.zapisane_urzadzenie', { defaultValue: 'Zapisane parowanie' })}</span>
 </div>
 </div>
 )}

 {!linkedUid && groupCount > 0 && wsDevices.length <= groupCount && (
 <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 opacity-60">
 <div className="flex flex-col text-left">
 <span className="text-xs font-bold dark:text-white flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-slate-400" />
 {t('auto.czlonkowie_gliko_family', { defaultValue: 'Członkowie Gliko Family' })}
 <span className="text-[9px] bg-slate-500/20 text-slate-500 px-1.5 py-0.5 rounded-md uppercase">Offline</span>
 </span>
 <span className="text-[9px] text-slate-400 font-medium">{t('auto.zapisane_urzadzenie', { defaultValue: 'Zapisane parowanie' })}</span>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {!linkedUid && groupCount > 1 && (
 <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
 <label className="flex items-center justify-between cursor-pointer group">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-2xl group-hover:bg-indigo-500/20 transition-colors">
 <LinkIcon size={16} />
 </div>
 <div className="text-left">
 <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
 
 {t('auto.blokada_terapii_dziecko', { defaultValue: 'Blokada terapii (Dziecko)' })}
 </h4>
 <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold leading-tight">
 
 {t('auto.połączone_urządzenia_nie_edytują_us', { defaultValue: i18n.t('auto.polaczone_urzadzenia_nie', { defaultValue: "Połączone urządzenia nie edytują ustawień." }) })}
 </p>
 </div>
 </div>
 <button
 onClick={() =>
 onUpdateSettings({
 groupTherapyLock: !settings.groupTherapyLock,
 })
 }
 className={cn(
 "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
 settings.groupTherapyLock && "bg-indigo-500 pl-5",
 )}
 >
 <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
 </button>
 </label>
 </div>
 )}
 </div>

 {/* SEKCJA KONTROLI RODZICIELSKIEJ I UPRAWNIEŃ DZIECKA */}
 <div className="flex flex-col gap-3 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden mt-1">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
 <ShieldCheck size={18} />
 </div>
 <div className="text-left">
 <h3 className="text-sm font-black dark:text-white uppercase tracking-wider">
 {t('auto.kontrola_rodzicielska', { defaultValue: 'Kontrola Rodzicielska' })}
 </h3>
 <p className="text-[10px] text-slate-500 font-medium">
 {t('auto.uprawnienia_urzadzenia_dziecka', { defaultValue: 'Granularne uprawnienia dla urządzenia dziecka' })}
 </p>
 </div>
 </div>
 </div>

 {/* Kod PIN Rodzica */}
 <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 p-3 rounded-2xl flex items-center justify-between gap-3">
 <div className="flex items-center gap-2.5">
 <KeyRound size={16} className="text-amber-500" />
 <div className="text-left">
 <span className="text-[11px] font-bold dark:text-white block">
 {t('auto.kod_pin_rodzica', { defaultValue: 'Kod PIN Rodzica' })}
 </span>
 <span className="text-[9px] text-slate-400">
 {settings.parentalPin ? '•••• (PIN aktywny)' : t('auto.brak_domyslny_1234', { defaultValue: 'Brak (domyślny: 1234)' })}
 </span>
 </div>
 </div>
 
 {isSettingPin ? (
 <div className="flex items-center gap-1.5">
 <input
 type="password"
 maxLength={4}
 value={newPinInput}
 onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
 placeholder="4 cyfry"
 className="w-20 px-2 py-1 text-center text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
 />
          <button
            onClick={() => {
              if (newPinInput.length === 4) {
                onUpdateSettings({ parentalPin: newPinInput });
                localStorage.setItem('parental_pin_code', newPinInput);
                setIsSettingPin(false);
                setNewPinInput('');
                toast.success(t('auto.zapisano_nowy_pin', { defaultValue: 'Zapisano nowy PIN rodzica!' }));
              } else {
                toast.error(t('auto.pin_musi_miec_4_cyfry', { defaultValue: 'PIN musi mieć dokładnie 4 cyfry' }));
              }
            }}
            className="px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-xl active:scale-95"
          >
            ✓
          </button>
          <button
            onClick={() => { setIsSettingPin(false); setNewPinInput(''); }}
            className="px-2 py-1 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            if (localRole === 'master' && (settings.parentalPin || localStorage.getItem('parental_pin_code'))) {
              requireParentalAuth(settings, 'canEditTherapySettings', {
                title: 'Zarządzanie Kodem PIN 🔒',
                description: 'Podaj dotychczasowy PIN rodzica, aby ustawić nowy kod.',
                onSuccess: () => setIsSettingPin(true)
              });
            } else {
              setIsSettingPin(true);
            }
          }}
          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-[10px] font-bold active:scale-95"
        >
          {settings.parentalPin ? t('auto.zmien_pin', { defaultValue: 'Zmień PIN' }) : t('auto.ustaw_pin', { defaultValue: 'Ustaw PIN' })}
        </button>
      )}
 </div>

 {/* Lista Przełączników Uprawnień */}
 <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
 {[
 {
 key: 'canAddMeals',
 title: t('auto.dodawanie_posilkow_talerz', { defaultValue: 'Dodawanie posiłków (Talerz / Aparat AI)' }),
 desc: t('auto.pozwol_dziecku_zapisywac_posilki', { defaultValue: 'Dziecko może samodzielnie dodawać posiłki na Talerz' }),
 icon: <Utensils size={15} className="text-emerald-500" />
 },
 {
 key: 'canAddBolus',
 title: t('auto.rejestracja_bolusow', { defaultValue: 'Wprowadzanie bolusów / dawek' }),
 desc: t('auto.blokada_dawek_insuliny_bez_pinu', { defaultValue: 'Zapisywanie podanej insuliny w kalkulatorze i dzienniku' }),
 icon: <Syringe size={15} className="text-rose-500" />
 },
 {
 key: 'canAddGlucose',
 title: t('auto.pomiary_cukru_glukometr', { defaultValue: 'Ręczne pomiary cukru (Glukometr)' }),
 desc: t('auto.pozwol_wpisywac_cukier_z_palca', { defaultValue: 'Wpisywanie pomiarów glikemii z nakłuwacza/glukometru' }),
 icon: <Droplets size={15} className="text-sky-500" />
 },
 {
 key: 'canEditEquipment',
 title: t('auto.reczna_wymiana_osprzetu', { defaultValue: 'Ręczna zmiana dat osprzętu' }),
 desc: t('auto.wymiana_dat_sensora_wklucia_zbiornika', { defaultValue: 'Modyfikacja liczników sensora, wkłucia i zbiorniczka' }),
 icon: <RefreshCw size={15} className="text-purple-500" />
 },
 {
 key: 'canAutoDetectEquipment',
 title: t('auto.inteligentne_wykrywanie_osprzetu', { defaultValue: 'Inteligentne wykrywanie osprzętu (Smart)' }),
 desc: t('auto.automatyczna_detekcja_z_pompy_glukometru', { defaultValue: 'Automatyczne przestawianie liczników po wykryciu z pompy' }),
 icon: <ShieldCheck size={15} className="text-teal-500" />
 },
 {
 key: 'canEditTherapySettings',
 title: t('auto.zmiana_parametrow_terapii', { defaultValue: 'Zmiana parametrów terapii (Współczynniki)' }),
 desc: t('auto.edycja_icr_isf_i_zakresow_glikemii', { defaultValue: 'Modyfikacja przeliczników ICR, korekty ISF i celów cukru' }),
 icon: <Sliders size={15} className="text-amber-500" />
 },
 {
 key: 'canDeleteLogs',
 title: t('auto.usuwanie_wpisow_z_historii', { defaultValue: 'Usuwanie wpisów z historii' }),
 desc: t('auto.kasowanie_zdarzen_z_dziennika', { defaultValue: 'Ochrona przed przypadkowym usunięciem danych' }),
 icon: <Trash2 size={15} className="text-red-500" />
 }
 ].map((perm) => {
 const currentPerms = settings.childPermissions || {};
 const isAllowed = (currentPerms as any)[perm.key] !== false;

 return (
 <label
 key={perm.key}
 className="flex items-center justify-between py-2.5 cursor-pointer group"
 >
 <div className="flex items-center gap-2.5 pr-2">
 <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-slate-100 dark:group-hover:bg-slate-700/60 transition-colors">
 {perm.icon}
 </div>
 <div className="text-left">
 <span className="text-[11px] font-bold dark:text-slate-200 block leading-tight">
 {perm.title}
 </span>
 <span className="text-[9px] text-slate-400 font-medium leading-tight block">
 {perm.desc}
 </span>
 </div>
 </div>

 <button
 type="button"
 onClick={() => {
 const toggleAction = () => {
 const updatedChildPermissions: ChildPermissions = {
 ...currentPerms,
 [perm.key]: !isAllowed
 };
 onUpdateSettings({ childPermissions: updatedChildPermissions });
 };

 if (localRole === 'master' && (settings.parentalPin || localStorage.getItem('parental_pin_code'))) {
 requireParentalAuth(settings, 'canEditTherapySettings', {
 title: 'Modyfikacja Uprawnień 🛡️',
 description: 'Zmiana uprawnień kontroli rodzicielskiej wymaga Kodu PIN Rodzica.',
 onSuccess: toggleAction
 });
 } else {
 toggleAction();
 }
 }}
 className={cn(
 "w-9 h-5 pl-0.5 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
 isAllowed && "bg-indigo-500 pl-4.5"
 )}
 >
 <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
 </button>
 </label>
 );
 })}
 </div>
 </div>

 {createPortal(
 <AnimatePresence>
 {showExport && (
 <motion.div
 initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
 animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
 exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
 transition={{ duration: 0.3 }}
 className="fixed inset-0 pt-safe pb-safe z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60"
 >
 <motion.div
 initial={{ y: "100%", opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: "100%", opacity: 0 }}
 transition={{ type: "spring", damping: 25, stiffness: 300 }}
 className="bg-slate-50 dark:bg-slate-900 rounded-[3rem] p-8 pb-12 w-full max-w-sm flex flex-col items-center relative shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform"
 >
 <button
 onClick={() => setShowExport(false)}
 className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors"
 >
 <X size={20} />
 </button>
 <h3 className="text-xl font-black dark:text-white mb-2 self-start">
 
 {t('auto.sparuj_konto', { defaultValue: 'Sparuj Konto' })}
 </h3>
 <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 self-start">
 
 {t('auto.zeskanuj_ten_kod_na_drugim_telefoni', { defaultValue: i18n.t('auto.zeskanuj_ten_kod_na_drugi', { defaultValue: "Zeskanuj ten kod na drugim telefonie używając opcji \"Zeskanuj QR\". Upewnij się, że na drugim telefonie wybrano odpowiednią rolę przed skanowaniem." }) })}
 </p>
 <ModernQRCard value={qrPayload} />
 <button
 onClick={handleCopy}
 className="w-full flex items-center justify-center gap-2 py-4 bg-accent-600 text-white rounded-[2rem] font-black text-[12px] uppercase active:scale-95 transition-all shadow-xl"
 >
 {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
 {copied ? "Skopiowano!" : "Kopiuj jako tekst"}
 </button>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>,
 document.body,
 )}

 {createPortal(
 <AnimatePresence>
 {showImport && (
 <motion.div
 initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
 animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
 exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
 transition={{ duration: 0.3 }}
 className="fixed inset-0 pt-safe pb-safe z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 overflow-y-auto"
 >
 <motion.div
 initial={{ y: "100%", opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: "100%", opacity: 0 }}
 transition={{ type: "spring", damping: 25, stiffness: 300 }}
 className="bg-slate-50 dark:bg-slate-900 rounded-[3rem] p-8 pb-12 w-full max-w-sm flex flex-col items-center relative shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform my-auto"
 >
 <button
 onClick={() => setShowImport(false)}
 className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-700 transition-colors"
 >
 <X size={20} />
 </button>
 <h3 className="text-xl font-black dark:text-white mb-2 self-start">
 
 {t('auto.skaner_parowania', { defaultValue: 'Skaner Parowania' })}
 </h3>
 <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 self-start">
 
 {t('auto.nakieruj_obiektyw_na_kod_qr_na_pier', { defaultValue: 'Nakieruj obiektyw na kod QR na pierwszym telefonie.' })}
 </p>

 <div className="w-full rounded-[2rem] overflow-hidden border-2 border-accent-500/30 mb-6 bg-black relative aspect-square shadow-inner">
 <QrScanner
 onResult={(res) => {
 setImportText(res);
 handleImportText(res);
 }}
 />
 </div>

 <div className="w-full">
 <p className="text-[10px] font-black uppercase text-slate-400 mb-3 pl-2">
 
 {t('auto.albo_wklej_skopiowany_kod_tekstowy', { defaultValue: 'Albo wklej skopiowany kod tekstowy:' })}
 </p>
 <textarea
 className="w-full h-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex text-xs outline-none rounded-[2rem] dark:text-white focus:border-accent-500 transition-colors"
 placeholder={t('auto.wklej_kod_parowania', { defaultValue: 'Wklej kod parowania...' })}
 value={importText}
 onChange={(e) => setImportText(e.target.value)}
 />
 <button
 onClick={() => handleImportText()}
 disabled={isBlocked}
 className={`w-full mt-4 flex items-center justify-center gap-2 rounded-[2rem] py-4 font-black text-[12px] uppercase tracking-widest transition-all shadow-xl ${isBlocked ? "bg-slate-300 text-slate-500 dark:text-slate-400 cursor-not-allowed" : "bg-accent-600 text-white hover:bg-accent-700 active:scale-95"}`}
 >
 {isBlocked ? "Blokada czasowa..." : i18n.t('auto.polacz_konta', { defaultValue: i18n.t('auto.polacz_konta', { defaultValue: "Połącz Konta" }) })}
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>,
 document.body,
 )}
 </div>
 );
}

function QrScanner({ onResult }: { onResult: (res: string) => void }) {
 const { t } = useTranslation();
 const [hasPermission, setHasPermission] = useState<boolean | null>(null);
 const [cameras, setCameras] = useState<any[]>([]);
 const [selectedCameraId, setSelectedCameraId] = useState<string>("");
 const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

 useEffect(() => {
 const html5QrCode = new Html5Qrcode("reader-qr-pairing");
 setScanner(html5QrCode);

 Html5Qrcode.getCameras()
 .then((devices) => {
 if (devices && devices.length > 0) {
 setCameras(devices);
 const backCamera = devices.find(
 (d) =>
 d.label.toLowerCase().includes("back") ||
 d.label.toLowerCase().includes(i18n.t('auto.tyl', { defaultValue: i18n.t('auto.tyl', { defaultValue: "tył" }) })),
 );
 setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
 setHasPermission(true);
 } else {
 setHasPermission(false);
 }
 })
 .catch((err) => {
 console.error("Camera permission error", err);
 setHasPermission(false);
 });

 return () => {
 if (html5QrCode.isScanning) {
 html5QrCode.stop().catch((e) => console.error(e));
 }
 };
 }, []);

 useEffect(() => {
 if (scanner && selectedCameraId && !scanner.isScanning) {
 scanner
 .start(
 selectedCameraId,
 {
 fps: 10,
 qrbox: (viewfinderWidth, viewfinderHeight) => {
 const minDim = Math.min(viewfinderWidth, viewfinderHeight);
 const size = Math.floor(minDim * 0.7);
 return { width: size, height: size };
 },
 },
 (decodedText) => {
 scanner
 .stop()
 .then(() => onResult(decodedText))
 .catch((e) => console.error(e));
 },
 () => {},
 )
 .catch((err) => {
 console.error("Scanner start error", err);
 });
 }
 }, [scanner, selectedCameraId]);

 const switchCamera = () => {
 if (!scanner) return;
 const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
 const nextIndex = (currentIndex + 1) % cameras.length;

 if (scanner.isScanning) {
 scanner
 .stop()
 .then(() => {
 setSelectedCameraId(cameras[nextIndex].id);
 })
 .catch((e) => console.error(e));
 } else {
 setSelectedCameraId(cameras[nextIndex].id);
 }
 };

 if (hasPermission === false) {
 return (
 <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
 <X className="text-rose-500 mb-2" size={32} />
 <p className="text-[10px] font-bold text-white uppercase tracking-widest">
 
 {t('auto.brak_dostępu_do_aparatu', { defaultValue: i18n.t('auto.brak_dostepu_do_aparatu', { defaultValue: "Brak dostępu do aparatu" }) })}
 </p>
 </div>
 );
 }

 return (
 <div className="relative w-full h-full group">
 <div id="reader-qr-pairing" className="w-full h-full bg-black"></div>

 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
 <div className="w-[70%] aspect-square border-2 border-accent-500 rounded-3xl relative">
 <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent-500 -mt-1 -ml-1 rounded-tl-xl"></div>
 <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent-500 -mt-1 -mr-1 rounded-tr-xl"></div>
 <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent-500 -mb-1 -ml-1 rounded-bl-xl"></div>
 <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent-500 -mb-1 -mr-1 rounded-br-xl"></div>
 <motion.div
 animate={{ top: ["0%", "100%", "0%"] }}
 transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
 className="absolute left-0 right-0 h-0.5 bg-accent-500/50 shadow-[0_0_15px_rgba(var(--accent-500),0.5)] z-10"
 />
 </div>
 </div>

 {cameras.length > 1 && (
 <button
 onClick={switchCamera}
 className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 hover:bg-white/30 transition-all pointer-events-auto shadow-lg"
 >
 <Camera size={20} />
 </button>
 )}

 {hasPermission === null && (
 <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
 <p className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse">
 
 {t('auto.inicjalizacja_aparatu', { defaultValue: 'Inicjalizacja aparatu...' })}
 </p>
 </div>
 )}
 </div>
 );
}

