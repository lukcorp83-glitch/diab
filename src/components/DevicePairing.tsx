import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getEffectiveUid, cn } from "../lib/utils";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
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
  Network
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserSettings } from "../types";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ConnectedDevice } from "../hooks/useGlikoServer";
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
  user: any;
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
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [localRole, setLocalRole] = useState<'master' | 'admin' | 'follower'>(() => {
    if (localStorage.getItem("diacontrol_is_master") === "true") return 'master';
    if (localStorage.getItem("diacontrol_is_admin") === "true") return 'admin';
    return 'follower';
  });

  const handleRoleChange = (newRole: 'master' | 'admin' | 'follower') => {
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

  const [linkedUid, setLinkedUid] = useState<string | null>(
    localStorage.getItem("diacontrol_linked_uid"),
  );

  const [qrPayload, setQrPayload] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(
    Number(localStorage.getItem("pairing_failed_attempts") || 0),
  );
  const [isBlocked, setIsBlocked] = useState(false);
  const [groupCount, setGroupCount] = useState<number>(0);

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
            "artifacts",
            "diacontrolapp",
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
        "artifacts",
        "diacontrolapp",
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
                "artifacts",
                "diacontrolapp",
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
                👥 {wsDevices.length}  {t('auto.aktywnych', { defaultValue: 'aktywnych' })}
                                            </span>
            )}
            {linkedUid && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <LinkIcon size={10} />  {t('auto.sparowano', { defaultValue: 'Sparowano' })}
                                            </span>
            )}
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-4">
          
                            {t('auto.połącz_urządzenia_aby_bliska_osoba_', { defaultValue: i18n.t('auto.polacz_urzadzenia_aby_bli', { defaultValue: "Połącz urządzenia, aby bliska osoba widziała na żywo cukry i dodawane bolusy. Wybierz rolę dla tego telefonu przed parowaniem." }) })}
                          </p>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-2 rounded-2xl mb-4 flex flex-col gap-1">
          <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1 ml-1">{t('auto.rola_tego_urządzenia', { defaultValue: i18n.t('auto.rola_tego_urzadzenia', { defaultValue: "Rola tego urządzenia" }) })}</label>
          <div className="flex gap-1">
            <button
              onClick={() => handleRoleChange('master')}
              className={cn(
                "flex-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                localRole === 'master' ? "bg-accent-500 text-white shadow-sm" : "bg-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              
                                        {t('auto.master', { defaultValue: 'Master' })}
                                      </button>
            <button
              onClick={() => handleRoleChange('admin')}
              className={cn(
                "flex-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                localRole === 'admin' ? "bg-rose-500 text-white shadow-sm" : "bg-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              
                                        {t('auto.admin', { defaultValue: 'Admin' })}
                                      </button>
            <button
              onClick={() => handleRoleChange('follower')}
              className={cn(
                "flex-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                localRole === 'follower' ? "bg-slate-700 dark:bg-slate-600 text-white shadow-sm" : "bg-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              
                                        {t('auto.odbiorca', { defaultValue: 'Odbiorca' })}
                                      </button>
          </div>
        </div>

        {linkedUid ? (
          <button
            onClick={handleUnlink}
            className="w-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-4 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all mt-2 shadow-sm"
          >
            <Unlink size={16} />  {t('auto.odłącz_konto', { defaultValue: i18n.t('auto.odlacz_konto', { defaultValue: "Odłącz Konto" }) })}
          </button>
        ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-2 rounded-2xl mb-4 flex flex-col gap-1">
            <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => handleRoleChange('follower')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${localRole === 'follower' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {t('auto.obserwator', { defaultValue: 'Obserwator' })}
              </button>
              <button
                onClick={() => handleRoleChange('admin')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${localRole === 'admin' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {t('auto.admin', { defaultValue: 'Admin' })}
              </button>
              <button
                onClick={() => handleRoleChange('master')}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${localRole === 'master' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {t('auto.telefon_dziecka', { defaultValue: 'Telefon Dziecka' })}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center px-2 py-1 leading-tight">
              {localRole === 'follower' && t('auto.obserwator_tylko_odbiera_dane', { defaultValue: 'Obserwator: Może podglądać cukry i wysyłać alarmy.' })}
              {localRole === 'admin' && t('auto.admin_odbiera_i_moze_zmieniac', { defaultValue: 'Admin: Może edytować ustawienia i wylogowywać urządzenia.' })}
              {localRole === 'master' && t('auto.telefon_dziecka_udostepnia_dane', { defaultValue: 'Dziecko (Master): Główne źródło cukrów.' })}
            </p>
          </div>
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
                      {t('auto.telefon_dziecka', { defaultValue: 'Telefon Dziecka' })}
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

                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 mb-6 w-full flex justify-center items-center aspect-square">
                  <QRCode value={qrPayload} style={{ width: "100%", height: "100%" }} />
                </div>
                <p className="text-[10px] text-rose-500 font-bold mb-4 animate-pulse">
                  
                                                {t('auto.kod_wygaśnie_za_5_minut', { defaultValue: i18n.t('auto.kod_wygasnie_za_5_minut', { defaultValue: "Kod wygaśnie za 5 minut" }) })}
                                              </p>
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

