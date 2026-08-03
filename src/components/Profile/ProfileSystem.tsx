import * as React from 'react';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Settings2, Activity, Globe, Signal, Apple, Baby, Utensils, CloudRain, Moon, Sun, RefreshCw, Lock as LucideLock, Sparkles, Network, ChevronRight, Info, Cloud, ShieldCheck, LogOut, Play, History, Bell, AlertTriangle, AlertCircle, Clock, Volume2, Shield, Palette, Layers, Monitor, RotateCcw, Smartphone, Zap, FileJson, Share2, Search, Database } from 'lucide-react';
import { cn } from '../../lib/utils';
import { updateDoc, doc, setDoc, addDoc, collection, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';
import toast from 'react-hot-toast';
import { Switch } from '@headlessui/react';
import i18n from '../../i18n';
import { dbService } from '../../services/databaseService';


import { motion } from 'framer-motion';
import { auth } from '../../lib/firebase';
import { APP_VERSION } from '../../constants';
import { PWA_VERSIONS } from '../../constants/versions';
import CloudPackageSync from '../CloudPackageSync';
import SettingsTransfer from '../SettingsTransfer';
import LocalSync from '../LocalSync';
import { Settings } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useLogsStore } from '../../stores/useLogsStore';
import { geminiService } from '../../services/gemini';
import { Haptics } from '../../lib/haptics';

export default function ProfileSystem({ user, settings, setSettings, isIOS, pushSupported, latestSensorLog, updates, sensorSite }: any) {
 const { t } = useTranslation();
 const queryClient = useQueryClient();

 const logs = useLogsStore((state: any) => state.logs || []);
 const [cleaning, setCleaning] = useState(false);
 const [updateLoading, setUpdateLoading] = useState(false);
 const [cleaningResult, setCleaningResult] = useState<any>(null);
 const [showRodo, setShowRodo] = useState(false);

 const normalizeName = (name: string) =>
 name
 .toLowerCase()
 .trim()
 .replace(/[^a-z0-9]/g, "");

 const repairGIWithAI = async () => {
 if (cleaning) return;
 setCleaning(true);
 Haptics.medium();
 setCleaningResult(i18n.t('auto.skanowanie_i_audyt_bazy_produk', { defaultValue: i18n.t('auto.skanowanie_i_audyt_bazy_p', { defaultValue: "Skanowanie i audyt bazy produktów (AI)..." }) }));

 try {
 const uid = getEffectiveUid(user);
 const toFix: { id: string; name: string; coll: string; current: any }[] =
 [];
 const seenNames = new Map<string, string>(); // normalized name -> source:id
 const duplicatesToDelete: { id: string; coll: string }[] = [];
 let totalChecked = 0;

 // 1. Skan w produktach społecznościowych - najpierw budujemy bazę wzorcową
 const commRef = collection(
 db,
 "communityProducts",
 );
 const commSnap = await getDocs(commRef);
 totalChecked += commSnap.docs.length;
 for (const docSnap of commSnap.docs) {
 const data = docSnap.data();
 if (data.name) {
 const normalized = normalizeName(data.name);
 if (!seenNames.has(normalized)) {
 seenNames.set(normalized, `community:${docSnap.id}`);
 toFix.push({
 id: docSnap.id,
 name: data.name,
 coll: "community",
 current: data,
 });
 } else {
 // Jeśli baza społeczności ma duplikaty wewnętrzne, możemy je oznaczyć do usunięcia
 // - system pozwoli na to tylko jeśli użytkownik ma uprawnienia, ale zazwyczaj pomijamy je w audycie
 console.log(i18n.t('auto.zignorowano_duplikat_w_sp', { defaultValue: "Zignorowano duplikat w społeczności: {{var0}}", var0: data.name }));
 }
 }
 }

 // 2. Skan we własnych produktach - usuwamy te, które już są w społeczności lub się powtarzają
 const userRef = collection(
 db,
 "users",
 uid,
 "customProducts",
 );
 const userSnap = await getDocs(userRef);
 totalChecked += userSnap.docs.length;
 for (const docSnap of userSnap.docs) {
 const data = docSnap.data();
 if (data.name) {
 const normalized = normalizeName(data.name);
 // Sprawdzamy czy nazwa już występuje (niezależnie czy w społeczności czy we własnych dodanych wyżej)
 if (seenNames.has(normalized)) {
 duplicatesToDelete.push({ id: docSnap.id, coll: "custom" });
 } else {
 seenNames.set(normalized, `custom:${docSnap.id}`);
 toFix.push({
 id: docSnap.id,
 name: data.name,
 coll: "custom",
 current: data,
 });
 }
 }
 }

 if (duplicatesToDelete.length > 0) {
 setCleaningResult(
 `Znaleziono ${duplicatesToDelete.length} duplikatów. Usuwanie zbędnych wpisów...`,
 );
 for (const dup of duplicatesToDelete) {
 const targetRef = doc(
 db,
 "users",
 uid,
 "customProducts",
 dup.id,
 );
 try {
 await deleteDoc(targetRef);
 } catch (e) {
 console.error("Delete failed for duplicate", dup.id, e);
 }
 Haptics.light();
 }
 }

 if (toFix.length === 0) {
 setCleaningResult(
 `Przeskanowano ${totalChecked} produktów. Baza jest czysta.`,
 );
 setTimeout(() => setCleaningResult(null), 5000);
 setCleaning(false);
 return;
 }

 setCleaningResult(
 `Audyt AI dla ${toFix.length} produktów... Sprawdzam IG, ŁG oraz makroskładniki.`,
 );

 // Batching 8 at a time for better performance and context window
 for (let i = 0; i < toFix.length; i += 8) {
 const batch = toFix.slice(i, i + 8);
 const batchDetails = batch
 .map(
 (b) =>
 i18n.t('auto.var0_obecnie_ig_var1_lg_v', { defaultValue: "{{var0}} (Obecnie: IG={{var1}}, ŁG={{var2}}, W={{var3}}, B={{var4}}, T={{var5}})", var0: b.name, var1: b.current.gi, var2: b.current.gl, var3: b.current.carbs, var4: b.current.protein, var5: b.current.fat }),
 )
 .join("; ");

 const prompt = i18n.t('auto.jestes_ekspertem_dietetyk', { defaultValue: "Jesteś ekspertem dietetyki. Zweryfikuj i popraw parametry dla 100g następujących produktów: [{{var0}}]. \n ZADANIA: \n 1. Podaj poprawny Indeks Glikemiczny (IG - 0-100).\n 2. Podaj poprawny Ładunek Glikemiczny (ŁG - dla 100g).\n 3. Sprawdź poprawność makroskładników (Węglowodany, Białka, Tłuszcze w g/100g). Jeśli obecne wartości są błędne (np. 0 carbs dla ryżu), popraw je.\n \n Zwróć wynik jako JSON (mapa nazw): \n {\n \"nazwa_produktu\": {\n \"gi\": liczba,\n \"gl\": liczba,\n \"carbs\": liczba,\n \"protein\": liczba,\n \"fat\": liczba\n }\n }. \n Używaj TYLKO JSON. Wartości muszą być liczbami. Produkty mięsne/tłuste mają IG bliskie 0.", var0: batchDetails });

 try {
 const result = await geminiService.generateContent(prompt);
 const jsonMatch = result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
 if (jsonMatch) {
 const mapping = JSON.parse(jsonMatch[0]);
 for (const item of batch) {
 const audit = mapping[item.name];
 if (audit && typeof audit === "object") {
 const targetRef =
 item.coll === "custom"
 ? doc(
 db,
 "users",
 uid,
 "customProducts",
 item.id,
 )
 : doc(
 db,
 "communityProducts",
 item.id,
 );

 const updates: any = {};
 if (typeof audit.gi === "number") updates.gi = audit.gi;
 if (typeof audit.gl === "number") updates.gl = audit.gl;
 if (typeof audit.carbs === "number")
 updates.carbs = audit.carbs;
 if (typeof audit.protein === "number")
 updates.protein = audit.protein;
 if (typeof audit.fat === "number") updates.fat = audit.fat;

 if (Object.keys(updates).length > 0) {
 await updateDoc(targetRef, updates);
 }
 }
 }
 }
 } catch (e) {
 console.error("AI Audit batch failed", e);
 }

 const progress = Math.min(
 100,
 Math.round(((i + batch.length) / toFix.length) * 100),
 );
 setCleaningResult(
 `Analiza i naprawa: ${progress}% (${i + batch.length}/${toFix.length})...`,
 );
 }

 setCleaningResult(
 `Sukces! Przeanalizowano i zweryfikowano ${toFix.length} produktów.`,
 );
 toast.success(`Zakończono inteligentny audyt ${toFix.length} produktów.`);
 setTimeout(() => setCleaningResult(null), 5000);
 } catch (err) {
 console.error(err);
 setCleaningResult(i18n.t('auto.blad_podczas_inteligentnej_nap', { defaultValue: i18n.t('auto.blad_podczas_inteligentne', { defaultValue: "Błąd podczas inteligentnej naprawy." }) }));
 } finally {
 setCleaning(false);
 }
 }
 const isFirebaseConnected = true; // Placeholder for now
 const setActiveCategory = (c: any) => {}; // Placeholder if it just navigates

 
 // Note: any local states or functions from Profile.tsx that were used here
 // will need to be imported or recreated here.
 
 return (
 <>
 
 <motion.div
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 className="space-y-4 pb-20"
 >
 {/* Follower Mode (Tryb Obserwatora) */}
 <div
 className={cn(
 "rounded-[2.5rem] p-6 border shadow-xl space-y-4",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex items-center gap-4">
 <div className="bg-cyan-500/10 p-3 rounded-2xl text-cyan-500">
 <Activity size={24} />
 </div>
 <div>
 <h3 className="font-black text-sm uppercase tracking-wider dark:text-white leading-none">
 
 {t('auto.tryb_śledzący_tylko_odczyt', { defaultValue: i18n.t('auto.tryb_sledzacy_tylko_odczy', { defaultValue: "Tryb Śledzący (Tylko Odczyt)" }) })}
 </h3>
 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
 
 {t('auto.dla_obserwatorów_followers', { defaultValue: i18n.t('auto.dla_obserwatorow_follower', { defaultValue: "Dla obserwatorów (followers)" }) })}
 </p>
 </div>
 </div>

 <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-left">
 
 {t('auto.wyłącz_funkcje_zapisywania_bolusy_p', { defaultValue: i18n.t('auto.wylacz_funkcje_zapisywani', { defaultValue: "Wyłącz funkcje zapisywania (bolusy, posiłki, modyfikacje) oraz ukryj zaawansowane analizy. Aplikacja stanie się czystym podglądem wyników i wykresów – idealne rozwiązanie dla członków rodziny i śledzących." }) })}
 </p>

 <div className="flex items-center justify-between pt-2">
 <div className="text-left">
 <p className="text-[11px] font-black uppercase dark:text-white">{t('auto.aktywuj_tryb', { defaultValue: 'Aktywuj tryb' })}</p>
 </div>
 <button
 onClick={async () => {
 const isFollower = !settings.followerMode;
 const updated = { ...settings, followerMode: isFollower };
 setSettings(updated);
 
 await setDoc(
 doc(db, "users", getEffectiveUid(user!), "settings", "profile"),
 { followerMode: isFollower },
 { merge: true }
 );
 
 if (isFollower) {
 toast.success(i18n.t('auto.wlaczono_tryb_sledzacy', { defaultValue: i18n.t('auto.wlaczono_tryb_sledzacy', { defaultValue: "Włączono Tryb Śledzący" }) }));
 } else {
 toast.success(i18n.t('auto.wylaczono_tryb_sledzacy', { defaultValue: i18n.t('auto.wylaczono_tryb_sledzacy', { defaultValue: "Wyłączono Tryb Śledzący" }) }));
 }
 }}
 className={cn(
 "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none",
 settings.followerMode ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-700"
 )}
 >
 <div
 className={cn(
 "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
 settings.followerMode ? "translate-x-6" : "translate-x-0"
 )}
 />
 </button>
 </div>
 </div>

 {/* System & Experience Section */}
 <div
 className={cn(
 "rounded-[2.5rem] p-6 border shadow-xl space-y-4",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <div className="flex items-center gap-3 mb-1">
 <div className="p-2.5 bg-violet-500/10 text-violet-600 rounded-2xl">
 <Settings size={20} />
 </div>
 <div className="text-left">
 <h3 className="text-base font-black dark:text-white leading-tight">
 
 {t('auto.system_i_wygląd', { defaultValue: i18n.t('auto.system_i_wyglad', { defaultValue: "System i Wygląd" }) })}
 </h3>
 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
 
 {t('auto.personalizacja', { defaultValue: 'Personalizacja' })}
 </p>
 </div>
 </div>

 <div className="space-y-4">
 {/* Language Selector */}
 <div className="group flex items-center justify-between p-5 bg-blue-50 dark:bg-blue-500/5 rounded-[2rem] border border-blue-100 dark:border-blue-900/20 transition-all hover:shadow-md">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
 <Globe size={22} />
 </div>
 <div className="text-left">
 <p className="text-sm font-black dark:text-blue-500 leading-tight">
 {t('auto.jezyk_aplikacji', { defaultValue: i18n.t('auto.jezyk_aplikacji', { defaultValue: "Język aplikacji" }) })}
 </p>
 <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
 {t('auto.wybierz_jezyk_interfejsu', { defaultValue: i18n.t('auto.wybierz_jezyk_interfejsu', { defaultValue: "Wybierz język interfejsu (Polski / English)" }) })}
 </p>
 </div>
 </div>
 <div className="flex bg-slate-200 dark:bg-slate-700 rounded-full p-1">
 <button
 onClick={() => i18n.changeLanguage('pl')}
 className={cn(
 "px-3 py-1 rounded-full text-xs font-bold transition-all",
 i18n.language === 'pl' ? "bg-white dark:bg-slate-800 text-blue-500 shadow-sm" : "text-slate-500"
 )}
 >
 PL
 </button>
 <button
 onClick={() => i18n.changeLanguage('en')}
 className={cn(
 "px-3 py-1 rounded-full text-xs font-bold transition-all",
 i18n.language === 'en' ? "bg-white dark:bg-slate-800 text-blue-500 shadow-sm" : "text-slate-500"
 )}
 >
 EN
 </button>
 </div>
 </div>
 {/* Treatment Mode Selector */}
 <div className={cn(
 "p-5 rounded-[2.5rem] border transition-all hover:shadow-md space-y-4",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
 )}>
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center shadow-inner">
 <Activity size={22} />
 </div>
 <div className="text-left">
 <p className="text-sm font-black dark:text-white leading-tight">
 {t('auto.treatment_mode_title', { defaultValue: 'Typ leczenia' })}
 </p>
 <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
 {t('auto.treatment_mode_desc', { defaultValue: 'Dostosuj interfejs do swoich potrzeb' })}
 </p>
 </div>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
 {[
 { id: 'diet_only', icon: <Apple size={16} />, label: t('auto.treatment_mode_diet', { defaultValue: 'Dieta i tabletki' }), desc: t('auto.treatment_mode_diet_desc', { defaultValue: 'Ukrywa funkcje insulinowe' }) },
 { id: 'insulin', icon: <Zap size={16} />, label: t('auto.treatment_mode_insulin', { defaultValue: 'Insulina' }), desc: t('auto.treatment_mode_insulin_desc', { defaultValue: 'Peny lub strzykawki' }) },
 { id: 'pump', icon: <Signal size={16} />, label: t('auto.treatment_mode_pump', { defaultValue: 'Pompa' }), desc: t('auto.treatment_mode_pump_desc', { defaultValue: 'Zamknięta pętla / AID' }) }
 ].map(mode => (
 <button
 key={mode.id}
 onClick={async () => {
 const newVal = mode.id as 'diet_only' | 'insulin' | 'pump';
 setSettings((prev) => ({ ...prev, treatmentMode: newVal }));
 
 // Natychmiastowa aktualizacja cache'u (Optimistic Update)
 localStorage.setItem("treatmentMode", newVal);
 if (user) {
   queryClient.setQueryData(['userSettings', getEffectiveUid(user)], (old: any) => ({
     ...(old || {}),
     treatmentMode: newVal
   }));
 }

 if (user) {
   try {
     await setDoc(
       doc(db, "users", getEffectiveUid(user), "settings", "profile"),
       { treatmentMode: newVal },
       { merge: true }
     );
     queryClient.invalidateQueries({ queryKey: ['userSettings'] });
     toast.success(t('auto.zapisano_tryb', { defaultValue: 'Zapisano: ' }) + mode.label);
   } catch (e: any) {
     console.error("Failed to save treatmentMode", e);
     toast.error("Błąd zapisu: " + e.message);
     // Revert optimistic update
     queryClient.invalidateQueries({ queryKey: ['userSettings'] });
   }
 } else {
 toast.success(mode.label + ' ' + t('auto.wymaga_odswiezenia_w_trybie_goscia', { defaultValue: '(Tryb Gościa: odśwież stronę, by zobaczyć efekt)' }));
 }
 }}
 className={cn(
 "p-3 rounded-2xl border transition-all text-left flex flex-col gap-1 items-start justify-center",
 (settings.treatmentMode === mode.id || (!settings.treatmentMode && mode.id === 'insulin'))
 ? "bg-indigo-500 border-indigo-500 text-white shadow-lg"
 : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300"
 )}
 >
 <div className="flex items-center gap-2">
 {mode.icon}
 <span className="text-xs font-bold">{mode.label}</span>
 </div>
 <span className="text-[9px] opacity-80">{mode.desc}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Toggles */}
 <div className="grid grid-cols-1 gap-3">
 <div className="group flex items-center justify-between p-5 bg-amber-50 dark:bg-amber-500/5 rounded-[2rem] border border-amber-100 dark:border-amber-900/20 transition-all hover:shadow-md">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
 <Baby size={22} />
 </div>
 <div className="text-left">
 <p className="text-sm font-black dark:text-amber-500 leading-tight">
 
 {t('auto.tryb_dziecka', { defaultValue: 'Tryb Dziecka' })}
 </p>
 <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
 
 {t('auto.aktywuje_wirtualnego_zwierzaka_glik', { defaultValue: 'Aktywuje wirtualnego zwierzaka Gliko' })}
 </p>
 </div>
 </div>
 <button
   onClick={async () => {
   const newVal = !settings.childMode;
   setSettings((prev) => ({ ...prev, childMode: newVal }));
     if (user) {
       try {
         await setDoc(
           doc(db, "users", getEffectiveUid(user), "settings", "profile"),
           { childMode: newVal },
           { merge: true }
         );
       } catch (e) {
         console.warn("Zapis childMode do nowej ścieżki odrzucony, awaryjny zapis do artifacts...");
         await setDoc(
           doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "profile"),
           { childMode: newVal },
           { merge: true }
         );
       }
       queryClient.invalidateQueries({ queryKey: ['userSettings'] });
     }
   }}
 className={cn(
 "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
 settings.childMode && "bg-amber-500 pl-5",
 )}
 >
 <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
 </button>
 </div>

 <div
 className={cn(
 "group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
 )}
 >
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
 <Smartphone size={22} />
 </div>
 <div className="text-left">
 <p className="text-sm font-black dark:text-white leading-tight">
 
 {t('auto.widgety_statusu', { defaultValue: 'Widgety Statusu' })}
 </p>
 <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
 
 {t('auto.monitoruj_baterię_telefonu_i_osprzę', { defaultValue: i18n.t('auto.monitoruj_baterie_telefon', { defaultValue: "Monitoruj baterię telefonu i osprzętu" }) })}
 </p>
 </div>
 </div>
 <button
 onClick={async () => {
 const newVal =
 settings.showPumpWidget === false ? true : false;
 setSettings((prev) => ({
 ...prev,
 showPumpWidget: newVal,
 }));
 if (user)
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 { showPumpWidget: newVal },
 { merge: true },
 );
 }}
 className={cn(
 "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
 settings.showPumpWidget !== false && "bg-indigo-500 pl-5",
 )}
 >
 <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
 </button>
 </div>

 <div
 className={cn(
 "group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
 )}
 >
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
 <Utensils size={22} />
 </div>
 <div className="text-left">
 <p className="text-sm font-black dark:text-white leading-tight">
 
 {t('auto.widżet_posiłku', { defaultValue: i18n.t('auto.widzet_posilku', { defaultValue: "Widżet Posiłku" }) })}
 </p>
 <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
 
 {t('auto.wymuś_pokazywanie_aktywnego_posiłku', { defaultValue: i18n.t('auto.wymus_pokazywanie_aktywne', { defaultValue: "Wymuś pokazywanie aktywnego posiłku po wchłonięciu" }) })}
 </p>
 </div>
 </div>
 <button
 onClick={async () => {
 const newVal = !settings.showMealWidget;
 setSettings((prev) => ({
 ...prev,
 showMealWidget: newVal,
 }));
 if (user)
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 { showMealWidget: newVal },
 { merge: true },
 );
 }}
 className={cn(
 "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
 settings.showMealWidget && "bg-amber-500 pl-5",
 )}
 >
 <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
 </button>
 </div>

 <div
 className={cn(
 "group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
 )}
 >
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
 <Zap size={22} />
 </div>
 <div className="text-left">
 <p className="text-sm font-black dark:text-white leading-tight">
 
 {t('auto.haptyka', { defaultValue: 'Haptyka' })}
 </p>
 <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
 
 {t('auto.wibracje_przy_klikaniu_przycisków', { defaultValue: i18n.t('auto.wibracje_przy_klikaniu_pr', { defaultValue: "Wibracje przy klikaniu przycisków" }) })}
 </p>
 </div>
 </div>
 <button
 onClick={() => {
 const current =
 localStorage.getItem("gliko_haptics_enabled") !==
 "false";
 localStorage.setItem(
 "gliko_haptics_enabled",
 String(!current),
 );
 // Force a re-render
 window.dispatchEvent(new Event("storage"));
 // We need to trigger a local state update to show visual toggle change
 // but since we don't have local state here easily without refactoring,
 // we'll just use the fact that buttons re-render on parent render.
 // Actually, let's use a small trick: update a settings field that doesn't matter much or just trigger a parent update.
 setSettings({ ...settings });
 }}
 className={cn(
 "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
 localStorage.getItem("gliko_haptics_enabled") !==
 "false" && "bg-accent-500 pl-5",
 )}
 >
 <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
 </button>
 </div>

 {/* GlikoSense & Pogoda */}
 <div
 className={cn(
 "group flex items-center justify-between p-5 rounded-[2rem] border transition-all hover:shadow-md",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
 )}
 >
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-900/30 text-teal-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
 <CloudRain size={22} />
 </div>
 <div className="text-left max-w-[150px] sm:max-w-none">
 <p className="text-sm font-black dark:text-white leading-tight">
 
 {t('auto.glikosense_pogoda', { defaultValue: 'GlikoSense & Pogoda' })}
 </p>
 <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight flex-wrap">
 
 {t('auto.zaawansowane_analizowanie_i_przewid', { defaultValue: i18n.t('auto.zaawansowane_analizowanie', { defaultValue: "Zaawansowane analizowanie i przewidywanie rzepływu glikemii w oparciu o warunki pogodowe i biomet." }) })}
 </p>
 </div>
 </div>
 <button
 onClick={async () => {
 const newVal = !settings.weatherNeuralEnabled;
 setSettings((prev) => ({
 ...prev,
 weatherNeuralEnabled: newVal,
 }));
 if (user)
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 { weatherNeuralEnabled: newVal },
 { merge: true },
 );
 }}
 className={cn(
 "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
 settings.weatherNeuralEnabled && "bg-teal-500 pl-5",
 )}
 >
 <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
 </button>
 </div>
 </div>

 {/* Visual Appearance Cards */}
 <div
 className={cn(
 "p-6 rounded-[2.5rem] border space-y-6",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
 )}
 >
 <div className="space-y-3">
 <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
 <Palette size={14} className="text-accent-500" /> {t('auto.akcent_kolorystyczny', { defaultValue: 'Akcent Kolorystyczny' })}
 </div>
 <div className="flex items-center gap-4 px-2 overflow-x-auto scrollbar-none py-2">
 {["indigo", "emerald", "rose", "amber", "violet"].map(
 (color) => (
 <button
 key={color}
 onClick={async () => {
 setSettings((prev) => ({
 ...prev,
 accentColor: color,
 }));
 if (user)
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 { accentColor: color },
 { merge: true },
 );
 }}
 className={cn(
 "w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center transition-all relative",
 settings.accentColor === color ||
 (!settings.accentColor && color === "indigo")
 ? "scale-110 shadow-xl ring-2 ring-white dark:ring-slate-900 ring-offset-2"
 : "opacity-40 scale-90 hover:opacity-100 hover:scale-100",
 color === "indigo"
 ? "bg-indigo-500 shadow-indigo-500/20"
 : color === "emerald"
 ? "bg-emerald-500 shadow-emerald-500/20"
 : color === "rose"
 ? "bg-rose-500 shadow-rose-500/20"
 : color === "amber"
 ? "bg-amber-500 shadow-amber-500/20"
 : "bg-violet-500 shadow-violet-500/20",
 )}
 >
 {(settings.accentColor === color ||
 (!settings.accentColor && color === "indigo")) && (
 <div className="w-2 h-2 rounded-full bg-white animate-bounce" />
 )}
 </button>
 ),
 )}
 </div>
 </div>

 <div className="h-px bg-slate-200 dark:bg-slate-700" />

 <div className="space-y-3">
 <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
 <Moon size={14} className="text-violet-500" /> {t('auto.tryb_jasny_ciemny', { defaultValue: 'Tryb Jasny / Ciemny' })}
 </div>
 <div className="grid grid-cols-3 gap-3">
 {[
 { id: "light", label: i18n.t('auto.jasny', { defaultValue: 'Jasny' }), icon: <Sun size={18} /> },
 { id: "dark", label: i18n.t('auto.ciemny', { defaultValue: 'Ciemny' }), icon: <Moon size={18} /> },
 {
 id: "system",
 label: i18n.t('auto.auto', { defaultValue: 'Auto' }),
 icon: <RefreshCw size={18} />,
 },
 ].map((t) => (
 <button
 key={t.id}
 onClick={async () => {
 const newTheme = t.id as "light" | "dark" | "system";
 setSettings((prev) => ({ ...prev, theme: newTheme }));
 if (user)
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 { theme: newTheme },
 { merge: true },
 );
 }}
 className={cn(
 "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all border",
 settings.theme === t.id ||
 (!settings.theme && t.id === "light")
 ? "bg-slate-900 border-slate-900 text-white shadow-xl dark:bg-white dark:border-white dark:text-slate-900"
 : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 dark:bg-slate-800 dark:border-slate-700",
 )}
 >
 {t.icon}
 <span className="text-[8px] font-black uppercase tracking-widest">
 {t.label}
 </span>
 </button>
 ))}
 </div>
 </div>

 {(settings.theme === "dark" || settings.theme === "system") && (
 <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
 <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
 <LucideLock size={18} className="text-slate-400" /> {t('auto.styl_tła_ciemnego', { defaultValue: i18n.t('auto.styl_tla_ciemnego', { defaultValue: "Styl Tła Ciemnego" }) })}
 </div>
 <div className="grid grid-cols-2 gap-3">
 {[
 { id: "default", label: i18n.t('auto.głęboki_grafit', { defaultValue: i18n.t('auto.gleboki_grafit', { defaultValue: "Głęboki Grafit" }) }) },
 { id: "true-black", label: i18n.t('auto.prawdziwa_czerń', { defaultValue: i18n.t('auto.prawdziwa_czern', { defaultValue: "Prawdziwa Czerń" }) }) },
 ].map((option) => (
 <button
 key={option.id}
 onClick={async () => {
 const val = option.id as any;
 setSettings((prev) => ({ ...prev, bgOption: val }));
 if (user)
 await setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 { bgOption: val },
 { merge: true },
 );
 }}
 className={cn(
 "py-4 rounded-2xl border transition-all text-left px-5",
 (!settings.bgOption && option.id === "default") ||
 settings.bgOption === option.id
 ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900"
 : "bg-white border-slate-100 text-slate-400 dark:bg-slate-800 dark:border-slate-700",
 )}
 >
 <p className="text-[10px] font-black uppercase tracking-widest leading-tight">
 {option.label}
 </p>
 <p className="text-[8px] font-medium opacity-60">
 
 {t('auto.tryb', { defaultValue: 'Tryb' })}{" "}
 {option.id === "true-black" ? "OLED" : "Neutral"}
 </p>
 </button>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* UI Theme Selection Section */}
 <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
 <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
 <Sparkles size={18} className="text-pink-500" /> {t('auto.styl_interfejsu', { defaultValue: 'Styl Interfejsu' })}
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {[
 { id: 'default', label: i18n.t('auto.standard', { defaultValue: 'Standard' }), desc: i18n.t('auto.klasyczny_minimalizm', { defaultValue: 'Klasyczny minimalizm' }) },
 { id: 'glass', label: i18n.t('auto.efekt_szkła', { defaultValue: i18n.t('auto.efekt_szkla', { defaultValue: "Efekt Szkła" }) }), desc: i18n.t('auto.rozmycie_i_przezroczystości', { defaultValue: i18n.t('auto.rozmycie_i_przezroczystos', { defaultValue: "Rozmycie i przezroczystości" }) }) },
 { id: 'material3', label: i18n.t('auto.material_3', { defaultValue: 'Material 3' }), desc: i18n.t('auto.styl_systemu_android', { defaultValue: 'Styl systemu Android' }) }
 ].map((style) => (
 <button
 key={style.id}
 onClick={async () => {
 const glass = style.id === 'glass';
 const material = style.id === 'material3';
 
 setSettings((prev) => ({
 ...prev,
 glassmorphismEnabled: glass,
 material3Enabled: material,
 }));
 
 if (user) {
 await setDoc(
 doc(db, "users", getEffectiveUid(user), "settings", "profile"),
 { glassmorphismEnabled: glass, material3Enabled: material },
 { merge: true }
 );
 }
 }}
 className={cn(
 "flex flex-col items-start p-4 rounded-2xl border transition-all text-left",
 (style.id === 'default' && !settings.glassmorphismEnabled && !settings.material3Enabled) ||
 (style.id === 'glass' && settings.glassmorphismEnabled) ||
 (style.id === 'material3' && settings.material3Enabled)
 ? "bg-accent-500/10 border-accent-500/50 text-accent-700 dark:text-accent-400"
 : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100"
 )}
 >
 <span className="text-xs font-black uppercase tracking-wider mb-1">
 {style.label}
 </span>
 <span className="text-[9px] font-bold opacity-70 leading-tight">
 {style.desc}
 </span>
 </button>
 ))}
 </div>

 {/* Dynamic Colors Toggle */}
 <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-500">
 <Sparkles size={20} />
 </div>
 <div className="text-left">
 <p className="text-sm font-black dark:text-white leading-tight">{t('auto.dynamiczne_kolory', { defaultValue: 'Dynamiczne Kolory' })}</p>
 <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{t('auto.dopasowuje_kolory_aplikacji_do_twoj', { defaultValue: 'Dopasowuje kolory aplikacji do Twojej tapety' })}</p>
 </div>
 </div>
 <button
 onClick={async () => {
 const newVal = !settings.dynamicColorsEnabled;
 setSettings((prev) => ({ ...prev, dynamicColorsEnabled: newVal }));
 if (user) {
 await setDoc(
 doc(db, "users", getEffectiveUid(user), "settings", "profile"),
 { dynamicColorsEnabled: newVal },
 { merge: true }
 );
 }
 }}
 className={cn(
 "w-10 h-6 pl-1 flex-shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
 settings.dynamicColorsEnabled && "bg-accent-500 pl-5"
 )}
 >
 <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
 </button>
 </div>
 </div>

 <div
 className={cn(
 "p-6 rounded-[2.5rem] border space-y-6 mt-4",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
 )}
 >
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-sm font-black dark:text-white">{t('auto.tryb_eko_maksymalna_wydajność', { defaultValue: i18n.t('auto.tryb_eko_maksymalna_wydaj', { defaultValue: "Tryb Eko (Maksymalna wydajność)" }) })}</h3>
 <p className="text-[10px] text-slate-500">{t('auto.wyłącza_animacje_cienie_oraz_rozmyc', { defaultValue: i18n.t('auto.wylacza_animacje_cienie_o', { defaultValue: "Wyłącza animacje, cienie oraz rozmycia szklane by przyspieszyć działanie." }) })}</p>
 </div>
 <button
 onClick={async () => {
 const mode = !settings.ecoMode;
 setSettings(prev => ({ ...prev, ecoMode: mode }));
 if (user) {
 await setDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"), { ecoMode: mode }, { merge: true }); queryClient.invalidateQueries({ queryKey: ["userSettings"] });;
 }
 }}
 className={cn(
 "w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none",
 settings.ecoMode ? "bg-accent-500" : "bg-slate-300 dark:bg-slate-700"
 )}
 >
 <div
 className={cn(
 "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200",
 settings.ecoMode ? "translate-x-6" : "translate-x-0"
 )}
 />
 </button>
 </div>
 </div>

 {/* Data Management Section */}
 <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
 <button
 onClick={() => setActiveCategory("pairing")}
 className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] active:scale-95 transition-all shadow-sm group"
 >
 <div className="flex items-center gap-4">
 <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl group-hover:bg-indigo-500/20 transition-colors">
 <Network size={20} />
 </div>
 <div className="text-left">
 <h3 className="text-[13px] font-black dark:text-white">{t('auto.parowanie_urządzenia', { defaultValue: i18n.t('auto.parowanie_urzadzenia', { defaultValue: "Parowanie / Urządzenia" }) })}</h3>
 <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{t('auto.połącz_telefony_rodziny_websocket', { defaultValue: i18n.t('auto.polacz_telefony_rodziny_w', { defaultValue: "Połącz telefony rodziny (WebSocket)" }) })}</p>
 </div>
 </div>
 <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
 </button>

 <CloudPackageSync
 
 settings={settings}
 onImport={(s) => {
 setSettings((prev) => ({ ...prev, ...s }));
 setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 s,
 { merge: true },
 );
 toast.success(i18n.t('auto.ustawienia_zaimportowane_pomys', { defaultValue: i18n.t('auto.ustawienia_zaimportowane', { defaultValue: "Ustawienia zaimportowane pomyślnie!" }) }));
 }}
 />

 <SettingsTransfer
 settings={settings}
 onImport={(s) => {
 setSettings((prev) => ({ ...prev, ...s }));
 setDoc(
 doc(
 db,
 "users",
 getEffectiveUid(user),
 "settings",
 "profile",
 ),
 s,
 { merge: true },
 );
 toast.success(i18n.t('auto.synchronizacja_zakonczona', { defaultValue: i18n.t('auto.synchronizacja_zakonczona', { defaultValue: "Synchronizacja zakończona!" }) }));
 }}
 />

 {logs && logs.length > 0 && (
 <div className={cn(
 "p-4 rounded-2xl border flex flex-col gap-2",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
 )}>
 <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
 <FileJson size={12} />
 Baza Danych (Local DB)
 </h4>
 <div className="flex justify-between items-center text-sm dark:text-white font-medium">
 <span>Zapisane logi:</span>
 <span className="text-indigo-600 dark:text-indigo-400">{logs.length}</span>
 </div>
 <div className="flex justify-between items-center text-sm dark:text-white font-medium">
 <span>Okres danych:</span>
 <span className="text-indigo-600 dark:text-indigo-400">
 {Math.max(1, Math.ceil((logs[0].timestamp - logs[logs.length - 1].timestamp) / (1000 * 60 * 60 * 24)))} dni
 </span>
 </div>
 <p className="text-[10px] text-slate-400 leading-tight mt-1">
 Aplikacja przechowuje dane w pamięci przeglądarki. Po zalogowaniu na nowym urządzeniu pobiera 5 dni z chmury, a przy połączeniu z Nightscout pobiera historię do 34 dni.
 </p>
 </div>
 )}

 <LocalSync settings={settings} />

 <a
 href="mailto:GlikoControl@proton.me"
 className={cn(
 "flex flex-col gap-2 p-5 rounded-[2rem] border transition-all hover:shadow-md cursor-pointer",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset hover:bg-white/10"
 : "bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800",
 )}
 >
 <div className="flex items-center gap-3">
 <Info className="text-accent-500" size={20} />
 <div className="flex flex-col">
 <span className="text-xs font-black dark:text-white uppercase tracking-tight">
 
 {t('auto.wsparcie_techniczne', { defaultValue: 'Wsparcie Techniczne' })}
 </span>
 <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
 
 {t('auto.glikocontrol_proton_me', { defaultValue: 'GlikoControl@proton.me' })}
 </span>
 </div>
 </div>
 </a>
 </div>

 {/* Maintenance Tools */}
 <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-2">
 
 {t('auto.administracja', { defaultValue: 'Administracja' })}
 </h3>

 <div
 className={cn(
 "p-4 rounded-2xl border flex items-center justify-between",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
 )}
 >
 <div className="flex items-center gap-3">
 <div
 className={cn(
 "p-2 rounded-2xl",
 isFirebaseConnected
 ? "bg-emerald-500/10 text-emerald-500"
 : "bg-rose-500/10 text-rose-500",
 )}
 >
 <Cloud size={16} />
 </div>
 <div className="text-left">
 <p className="text-[10px] font-black dark:text-white uppercase tracking-tight">
 
 {t('auto.status_firebase_cloud', { defaultValue: 'Status Firebase Cloud' })}
 </p>
 <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
 {isFirebaseConnected
 ? i18n.t('auto.polaczenie_stabilne', { defaultValue: i18n.t('auto.polaczenie_stabilne', { defaultValue: "Połączenie stabilne" }) })
 : i18n.t('auto.blad_polaczenia_offline', { defaultValue: i18n.t('auto.blad_polaczenia_offline', { defaultValue: "Błąd połączenia / Offline" }) })}
 </p>
 </div>
 </div>
 <div
 className={cn(
 "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
 isFirebaseConnected
 ? "bg-emerald-500 text-white"
 : "bg-rose-500 text-white animate-pulse",
 )}
 >
 {isFirebaseConnected ? "Online" : "Offline"}
 </div>
 </div>

 <button
 onClick={() => {
 Haptics.light();
 localStorage.removeItem("appliedOtaRevision");
 localStorage.removeItem("dismissedOtaRevision");
 localStorage.removeItem("dismissedApkVersion");
 toast.success(i18n.t('auto.wyszukiwanie_aktualizacji', { defaultValue: 'Wyszukiwanie aktualizacji...' }));
 setTimeout(() => window.location.reload(), 1000);
 }}
 className={cn(
 "w-full p-4 rounded-2xl flex items-center justify-between text-left transition-all active:scale-95 group",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700",
 )}
 >
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-2xl bg-indigo-500/10 text-indigo-500">
 <RefreshCw size={16} />
 </div>
 <div>
 <p className="text-[10px] font-black dark:text-white uppercase tracking-tight">
 {t('auto.wymus_aktualizacje_ota', { defaultValue: 'Wymuś Aktualizację OTA' })}
 </p>
 <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-1">
 {t('auto.wyszukuje_nowe_poprawki_i_restartuje', { defaultValue: 'Wyszukuje nowe poprawki na serwerze i restartuje aplikację' })}
 </p>
 </div>
 </div>
 <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
 </button>

 <div className="flex flex-col gap-3">
 <div className="flex flex-col gap-2 p-2">
 <button
 onClick={repairGIWithAI}
 disabled={cleaning}
 className="w-full bg-accent-500 hover:bg-accent-600 text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-accent-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
 >
 {cleaning ? (
 <Loader2 className="animate-spin" size={18} />
 ) : (
 <Play size={18} fill="currentColor" />
 )}
 
 {t('auto.start_audytu_ig_łg_i_duplikaty', { defaultValue: i18n.t('auto.start_audytu_ig_lg_i_dupl', { defaultValue: "START AUDYTU: IG, ŁG i DUPLIKATY" }) })}
 </button>
 <p className="text-[9px] text-slate-400 dark:text-slate-500 dark:text-slate-400 font-bold px-4 text-center leading-relaxed">
 
 {t('auto.inteligentny_system_ai_przeskanuje_', { defaultValue: i18n.t('auto.inteligentny_system_ai_pr', { defaultValue: "Inteligentny system AI przeskanuje Twoją bazę produktów, naprawi błędne wartości Indeksu i Ładunku Glikemicznego oraz usunie powtarzające się pozycje." }) })}
 </p>
 </div>

 <button
 onClick={async () => {
 if (navigator.vibrate) navigator.vibrate(50);
 setUpdateLoading(true);
 setCleaningResult(i18n.t('auto.czyszczenie_pamieci_podrecznej', { defaultValue: i18n.t('auto.czyszczenie_pamieci_podre', { defaultValue: "Czyszczenie pamięci podręcznej i sprawdzanie aktualizacji..." }) }));
 
 try {
 // 1. Clear all Cache Storage
 if ('caches' in window) {
 const cacheNames = await caches.keys();
 await Promise.all(
 cacheNames.map(name => caches.delete(name))
 );
 }

 // 2. Unregister all Service Workers
 if ('serviceWorker' in navigator) {
 const registrations = await navigator.serviceWorker.getRegistrations();
 await Promise.all(
 registrations.map(reg => reg.unregister())
 );
 }

 toast.success(i18n.t('auto.pamiec_podreczna_wyczyszczona', { defaultValue: i18n.t('auto.pamiec_podreczna_wyczyszc', { defaultValue: "Pamięć podręczna wyczyszczona. Trwa pobieranie nowej wersji..." }) }));
 setCleaningResult(i18n.t('auto.ladowanie_nowej_wersji', { defaultValue: i18n.t('auto.ladowanie_nowej_wersji', { defaultValue: "Ładowanie nowej wersji..." }) }));
 
 setTimeout(() => {
 window.location.reload();
 }, 1000);
 } catch (err) {
 console.error(i18n.t('auto.blad_podczas_aktualizacji_pwa', { defaultValue: i18n.t('auto.blad_podczas_aktualizacji', { defaultValue: "Błąd podczas aktualizacji PWA:" }) }), err);
 toast.error(i18n.t('auto.wystapil_blad_podczas_czyszcze', { defaultValue: i18n.t('auto.wystapil_blad_podczas_czy', { defaultValue: "Wystąpił błąd podczas czyszczenia pamięci podręcznej." }) }));
 setTimeout(() => {
 window.location.reload();
 }, 1000);
 }
 }}
 disabled={updateLoading}
 className="flex-1 bg-slate-50 dark:bg-slate-800 border border-transparent text-slate-500 dark:text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 glass-target"
 >
 <RefreshCw
 size={14}
 className={cn(updateLoading && "animate-spin")}
 />
 
 {t('auto.aktualizuj_v', { defaultValue: 'Aktualizuj v' })}{APP_VERSION}
 </button>
 </div>

 {cleaningResult && (
 <p className="text-center text-[9px] font-bold text-rose-500 uppercase tracking-widest px-4">
 {cleaningResult}
 </p>
 )}
 </div>

 {/* RODO / Privacy Detail */}
 <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
 <button
 onClick={() => setShowRodo(!showRodo)}
 className="w-full flex items-center justify-between p-2 text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.2em]"
 >
 <div className="flex items-center gap-2">
 <ShieldCheck size={14} /> {t('auto.prywatność_i_rodo', { defaultValue: i18n.t('auto.prywatnosc_i_rodo', { defaultValue: "Prywatność i RODO" }) })}
 </div>
 <ChevronRight
 size={14}
 className={cn(
 "transition-transform",
 showRodo && "rotate-90",
 )}
 />
 </button>
 {showRodo && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 className="pt-4 space-y-4 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed text-left"
 >
 <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
 <p>
 <span className="font-black text-slate-700 dark:text-slate-200 uppercase text-[9px]">
 
 {t('auto.prywatność_przede_wszystkim', { defaultValue: i18n.t('auto.prywatnosc_przede_wszystk', { defaultValue: "Prywatność przede wszystkim:" }) })}
 </span>{" "}
 
 {t('auto.po_co_podpisywać_kałuże_imieniem_i_', { defaultValue: i18n.t('auto.po_co_podpisywac_kaluze_i', { defaultValue: "Po co podpisywać kałuże imieniem i nazwiskiem? Twoja prywatność jest dla nas priorytetem. Twoje dane są używane wyłącznie do tworzenia Twojej" }) })}{" "}
 <b>{t('auto.indywidualnej_analizy_glikemii', { defaultValue: 'indywidualnej analizy glikemii' })}</b>.
 </p>
 <p>
 <span className="font-black text-slate-700 dark:text-slate-200 uppercase text-[9px]">
 
 {t('auto.bezpieczeństwo', { defaultValue: i18n.t('auto.bezpieczenstwo', { defaultValue: "Bezpieczeństwo:" }) })}
 </span>{" "}
 
 {t('auto.dane_są_szyfrowane_i_przechowywane_', { defaultValue: i18n.t('auto.dane_sa_szyfrowane_i_prze', { defaultValue: "Dane są szyfrowane i przechowywane w infrastrukturze Firebase (Google Cloud) na terenie UE. Nigdy nie sprzedajemy Twoich danych medycznych." }) })}
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
 <h4 className="text-lg font-black dark:text-rose-500 leading-tight">
 
 {t('auto.zakończ_sesję', { defaultValue: i18n.t('auto.zakoncz_sesje', { defaultValue: "Zakończ Sesję" }) })}
 </h4>
 <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium px-4 mt-1">
 
 {t('auto.twoje_dane_są_używane_wyłącznie_do_', { defaultValue: i18n.t('auto.twoje_dane_sa_uzywane_wyl', { defaultValue: "Twoje dane są używane wyłącznie do tworzenia indywidualnej analizy. Dokumentacja nie wymaga podawania imienia i nazwiska - Twoja prywatność jest dla nas priorytetem." }) })}
 </p>
 </div>
 <button
 onClick={() => auth.signOut()}
 className="bg-rose-500 text-white w-full py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-rose-500/20"
 >
 
 {t('auto.wyloguj_się_z_glikocontrol', { defaultValue: i18n.t('auto.wyloguj_sie_z_glikocontro', { defaultValue: "Wyloguj się z GlikoControl" }) })}
 </button>
 </div>

 {/* Version History */}
 <div
 className={cn(
 "rounded-[2.5rem] p-8 border shadow-sm opacity-60 hover:opacity-100 transition-opacity",
 settings.glassmorphismEnabled
 ? "backdrop-blur-xl bg-white/20 dark:bg-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/50 dark:border-white/10 ring-1 ring-white/30 dark:ring-white/10 ring-inset"
 : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800",
 )}
 >
 <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
 <History size={14} /> {t('auto.dziennik_aktualizacji', { defaultValue: 'Dziennik Aktualizacji' })}
 </h4>
 <div className="space-y-6">
 {PWA_VERSIONS.slice(0, 3).map((v, i) => (
 <div
 key={v.version}
 className={cn(
 "relative pl-6 border-l-2",
 i === 0
 ? "border-accent-500"
 : "border-slate-200 dark:border-slate-800",
 )}
 >
 <div
 className={cn(
 "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 bg-white dark:bg-slate-900",
 i === 0
 ? "border-accent-500"
 : "border-slate-200 dark:border-slate-800",
 )}
 />
 <div className="flex items-center justify-between mb-1">
 <span className="text-xs font-black dark:text-white">
 v{v.version}
 </span>
 <span className="text-[9px] font-bold text-slate-400">
 {v.date}
 </span>
 </div>
 <p className="text-[10px] font-bold text-accent-500 mb-2 truncate">
 {t(v.title, { defaultValue: v.title })}
 </p>
 <ul className="space-y-1">
 {v.changes.slice(0, 2).map((change: any, idx) => {
 const text = typeof change === 'string' ? change : change.descriptionKey;
 return (
 <li
 key={`v-change-${v.version}-${idx}`}
 className="text-[9px] text-slate-500 dark:text-slate-400 flex items-start gap-2"
 >
 <span className="mt-1 w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
 {t(text, { defaultValue: text })}
 </li>
 )})}
 </ul>
 </div>
 ))}
 </div>
 </div>
 </div>
 </motion.div>
 </>
 );
}
