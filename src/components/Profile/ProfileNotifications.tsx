import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Settings2, Bell, AlertTriangle, AlertCircle, Clock, Volume2, Shield, Activity, Pizza, Zap, Sparkles, Moon, Sun, Bot, Utensils, Battery, BatteryCharging, Headphones, Power, Music, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getEffectiveUid } from '../../lib/utils';
import toast from 'react-hot-toast';
import PixelSwitch from '../common/PixelSwitch';
import i18n from '../../i18n';
import { Capacitor } from '@capacitor/core';
import { notificationService } from '../../services/notificationService';
import { NotificationBridge } from '../../lib/notificationBridge';
import { voiceReadoutService } from '../../services/voiceReadoutService';
import { useLogsStore } from '../../stores/useLogsStore';
// import { enableNotifications, registerServiceWorker } from '../../lib/firebase';

const DEFAULT_NOTIFICATION_PREFS = {
  hypo: true,
  hyper: true,
  reminders: true,
  predictions: true,
  pumpBolusPreMeal: true,
  mealDetected: true,
  nightSnackReminder: false,
  hypoProtection: true
};

export default function ProfileNotifications({ user, settings, setSettings, isIOS, pushSupported }: any) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [learnedRules, setLearnedRules] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}');
    } catch {
      return {};
    }
  });

  const [isBatteryIgnored, setIsBatteryIgnored] = useState<boolean>(true);
  const [voiceReadoutEnabled, setVoiceReadoutEnabled] = useState<boolean>(() => voiceReadoutService.isVoiceReadoutEnabled());
  const [powerBtnEnabled, setPowerBtnEnabled] = useState<boolean>(() => voiceReadoutService.isPowerBtnTriggerEnabled());
  const [earphoneBtnEnabled, setEarphoneBtnEnabled] = useState<boolean>(() => voiceReadoutService.isEarphoneBtnTriggerEnabled());
  const [isHeadphones, setIsHeadphones] = useState<boolean>(false);

  React.useEffect(() => {
    voiceReadoutService.isHeadphonesConnected().then(setIsHeadphones).catch(() => {});
    if (Capacitor.isNativePlatform()) {
      NotificationBridge.isBatteryOptimizationIgnored()
        .then((res: any) => {
          if (res && typeof res.isIgnored === 'boolean') {
            setIsBatteryIgnored(res.isIgnored);
          }
        })
        .catch(() => {});
    }
  }, []);

  const isNativeApp = () => Capacitor.isNativePlatform();
 // will need to be imported or recreated here.
 
 return (
 <>
 
 <div className="space-y-4">
 <div className="glass p-6 rounded-[2.5rem] space-y-4">
 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
 
 {t('auto.centrum_powiadomien', { defaultValue: "Centrum powiadomień" })}
 </h3>
 <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium text-center">
 
 {t('auto.zarzadzaj_alertami', { defaultValue: "Zarządzaj alertami i przypomnieniami." })}
 </p>

 <div className="flex items-center justify-between p-3.5 bg-accent-50 dark:bg-slate-800/50 rounded-2xl border border-accent-100 dark:border-slate-700">
 <div className="flex items-center gap-2.5">
 <Bell className="text-accent-500" size={18} />
 <div>
 <p className="text-xs font-black dark:text-white leading-tight">
 
 {t('auto.powiadomienia_push', { defaultValue: 'Powiadomienia Push' })}
 </p>
 <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
 
 {t('auto.ostrzeżenia_o_wymianie', { defaultValue: i18n.t('auto.ostrzezenia_o_wymianie', { defaultValue: "Ostrzeżenia o wymianie" }) })}
 </p>
 </div>
 </div>
      <PixelSwitch
        checked={Boolean(settings.notificationsEnabled)}
        activeColor="bg-accent-500"
        onChange={async () => {
      if (!settings.notificationsEnabled) {
        if (window.self !== window.top && !Capacitor.isNativePlatform()) {
          alert(
            i18n.t('auto.wazne_przegladarki_blokuja_pow', { defaultValue: i18n.t('auto.wazne_przegladarki_blokuj', { defaultValue: "📢 WAŻNE: Przeglądarki blokują powiadomienia PUSH wewnątrz podglądu (iframe).\n\nAby włączyć powiadomienia, kliknij przycisk \"Otwórz w nowej karcie\" (prawy górny róg) i spróbuj tam jesze raz." }) }),
          );
          return;
        }
        const token = await notificationService.requestPermission();
        if (token || (Capacitor.isNativePlatform() && token !== null) || (window.Notification && window.Notification.permission === 'granted')) {
          const prefs = {
            ...DEFAULT_NOTIFICATION_PREFS,
            ...(settings.notificationPrefs || {})
          };
          const updated = {
            ...settings,
            notificationsEnabled: true,
            notificationPrefs: prefs,
          };
          setSettings(updated);
          localStorage.setItem("notificationsEnabled", "true");
          localStorage.setItem("notificationPrefs", JSON.stringify(prefs));
          localStorage.setItem("glikocontrol_user_settings", JSON.stringify(updated));

          if (Capacitor.isNativePlatform()) {
            NotificationBridge.syncAlertPreferences({
              hypoEnabled: (prefs.hypo !== false) && (prefs.hypoProtection !== false),
              hyperEnabled: prefs.hyper !== false,
              targetMin: settings.targetMin || 70,
              targetMax: settings.targetMax || 180
            }).catch(() => {});
          }

          if (user) {
            const uid = getEffectiveUid(user);
            await setDoc(
              doc(db, "users", uid, "settings", "profile"),
              {
                notificationsEnabled: true,
                notificationPrefs: prefs,
              },
              { merge: true },
            );
            queryClient.setQueryData(['userSettings', uid], (old: any) => ({
              ...(old || {}),
              notificationsEnabled: true,
              notificationPrefs: prefs,
            }));
            queryClient.invalidateQueries({ queryKey: ['userSettings'] });
          }
        } else {
          const updated = { ...settings, notificationsEnabled: false };
          setSettings(updated);
          localStorage.setItem("notificationsEnabled", "false");
          localStorage.setItem("glikocontrol_user_settings", JSON.stringify(updated));
          if (Capacitor.isNativePlatform()) {
            NotificationBridge.syncAlertPreferences({
              hypoEnabled: false,
              hyperEnabled: false,
              targetMin: settings.targetMin || 70,
              targetMax: settings.targetMax || 180
            }).catch(() => {});
          }
          if (user) {
            const uid = getEffectiveUid(user);
            await setDoc(
              doc(db, "users", uid, "settings", "profile"),
              { notificationsEnabled: false },
              { merge: true },
            );
            queryClient.setQueryData(['userSettings', uid], (old: any) => ({
              ...(old || {}),
              notificationsEnabled: false,
            }));
            queryClient.invalidateQueries({ queryKey: ['userSettings'] });
          }
        }
      } else {
        const updated = { ...settings, notificationsEnabled: false };
        setSettings(updated);
        localStorage.setItem("notificationsEnabled", "false");
        localStorage.setItem("glikocontrol_user_settings", JSON.stringify(updated));
        if (Capacitor.isNativePlatform()) {
          NotificationBridge.syncAlertPreferences({
            hypoEnabled: false,
            hyperEnabled: false,
            targetMin: settings.targetMin || 70,
            targetMax: settings.targetMax || 180
          }).catch(() => {});
        }
        if (user) {
          const uid = getEffectiveUid(user);
          await setDoc(
            doc(db, "users", uid, "settings", "profile"),
            { notificationsEnabled: false },
            { merge: true },
          );
          queryClient.setQueryData(['userSettings', uid], (old: any) => ({
            ...(old || {}),
            notificationsEnabled: false,
          }));
          queryClient.invalidateQueries({ queryKey: ['userSettings'] });
        }
      }
    }}
  />
 </div>

 <div className="flex items-center justify-between p-3.5 bg-accent-50 dark:bg-slate-800/50 rounded-2xl border border-accent-100 dark:border-slate-700 mt-3 mb-3">
    <div className="flex items-center gap-2.5">
      <Activity className="text-accent-500" size={18} />
      <div>
        <p className="text-xs font-black dark:text-white leading-tight">
          {t('auto.informacje_o_cukrach_na_pasku', { defaultValue: 'Informacje o cukrach na pasku powiadomień' })}
        </p>
        <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
          {t('auto.powiadomienia_na_systemowym_pasku_opis', { defaultValue: 'Bieżący poziom cukru i alerty na pasku stanu w telefonie' })}
        </p>
      </div>
    </div>
    <PixelSwitch
      checked={settings.apkSystemNotificationsEnabled ?? true}
      activeColor="bg-accent-500"
      onChange={async () => {
        if (window.self !== window.top && !Capacitor.isNativePlatform()) {
          alert(i18n.t('auto.wazne_przegladarki_blokuja_pow', { defaultValue: i18n.t('auto.wazne_przegladarki_blokuj', { defaultValue: "📢 WAŻNE: Przeglądarki blokują powiadomienia wewnątrz podglądu (iframe).\n\nAby włączyć ten widżet, otwórz aplikację w nowej karcie (przycisk w prawym górnym rogu tego okna)." }) }));
          return;
        }

        const currentState = settings.apkSystemNotificationsEnabled ?? true;
        const targetState = !currentState;

        if (targetState) {
          if (Capacitor.isNativePlatform()) {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            const result = await PushNotifications.requestPermissions();
            if (result.receive !== 'granted') {
              alert(i18n.t('auto.zezwol_na_powiadomienia_w_syst', { defaultValue: i18n.t('auto.zezwol_na_powiadomienia_w', { defaultValue: "Zezwól na powiadomienia w systemie, aby używać tego widżetu." }) }));
              return;
            }
          } else if (window.Notification) {
            const perm = await window.Notification.requestPermission();
            if (perm !== 'granted') {
              alert(i18n.t('auto.zezwol_na_powiadomienia_w_prze', { defaultValue: i18n.t('auto.zezwol_na_powiadomienia_w', { defaultValue: "Zezwól na powiadomienia w przeglądarce, aby używać tego widżetu." }) }));
              return;
            }
          }
        }

        setSettings({
          ...settings,
          apkSystemNotificationsEnabled: targetState,
        });
        localStorage.setItem(
          "apkSystemNotificationsEnabled",
          targetState ? "true" : "false",
        );
        if (user) {
          await setDoc(
            doc(
              db,
              "users",
              getEffectiveUid(user),
              "settings",
              "profile",
            ),
            {
              apkSystemNotificationsEnabled: targetState,
            },
            { merge: true },
          );
        }
        if (Capacitor.isNativePlatform()) {
          try {
            const { NotificationBridge } = await import('../../lib/notificationBridge');
            await NotificationBridge.setOngoingNotificationEnabled({ enabled: targetState });
          } catch (e) {
            console.warn("Failed setting ongoing notification on Android:", e);
          }
        }

        toast.success(targetState ? 'Włączono informacje o cukrach na pasku powiadomień' : 'Wyłączono informacje o cukrach na pasku powiadomień');
      }}
    />
  </div>

  <div className="p-3.5 bg-indigo-50/50 dark:bg-slate-800/60 rounded-2xl border border-indigo-100 dark:border-slate-700 flex items-center justify-between gap-3 my-3">
    <div className="flex items-center gap-2.5">
      <Volume2 className="text-indigo-500" size={18} />
      <div>
        <p className="text-xs font-black dark:text-white leading-tight">
          Test Dźwięku MP3
        </p>
        <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
          Odtwórz dźwięk status_clear.mp3
        </p>
      </div>
    </div>
    <button
      onClick={() => {
        import('../../lib/audioUtils').then(m => m.playLowGlucoseSound());
        toast.success('Odtwarzam testowy dźwięk MP3!', { icon: '🔊' });
      }}
      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 shrink-0"
    >
      Graj MP3
    </button>
  </div>

  <div className="p-3.5 bg-sky-50/50 dark:bg-slate-800/60 rounded-2xl border border-sky-100 dark:border-slate-700 space-y-3 my-3">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Headphones className="text-sky-500" size={18} />
        <div>
          <p className="text-xs font-black dark:text-white leading-tight">
            {t('auto.glosowy_asystent_sluchawkowy', { defaultValue: 'Głosowy asystent słuchawkowy (TTS)' })}
          </p>
          <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
            {t('auto.glosowy_asystent_sluchawkowy_opis', { defaultValue: 'Odczytuje bieżący poziom cukru do podłączonych słuchawek' })}
          </p>
        </div>
      </div>
      <PixelSwitch
        checked={voiceReadoutEnabled}
        activeColor="bg-sky-500"
        onChange={async () => {
          const next = !voiceReadoutEnabled;
          setVoiceReadoutEnabled(next);
          await voiceReadoutService.setVoiceReadoutEnabled(next);
          toast.success(next ? t('auto.wlaczono_lektora_sluchawkowego', { defaultValue: 'Włączono lektora słuchawkowego' }) : t('auto.wylaczono_lektora_sluchawkowego', { defaultValue: 'Wyłączono lektora słuchawkowego' }));
        }}
      />
    </div>

    {voiceReadoutEnabled && (
      <div className="pt-2 border-t border-sky-100/60 dark:border-slate-700/60 space-y-2">
        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {t('auto.wybierz_wyzwalacze_tytul', { defaultValue: 'Wyzwalacze odczytu (mogą działać oba naraz)' })}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Wyzwalacz 1: Dwuklik włącznika telefonu */}
          <button
            type="button"
            onClick={async () => {
              const next = !powerBtnEnabled;
              setPowerBtnEnabled(next);
              await voiceReadoutService.setPowerBtnTriggerEnabled(next);
              toast.success(next 
                ? t('auto.wlaczono_wyzwalacz_power', { defaultValue: 'Włączono: Dwuklik włącznika telefonu' }) 
                : t('auto.wylaczono_wyzwalacz_power', { defaultValue: 'Wyłączono: Dwuklik włącznika telefonu' })
              );
            }}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border transition-all text-left",
              powerBtnEnabled
                ? "bg-sky-500/10 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500/40 shadow-sm"
                : "bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/80 opacity-60"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", powerBtnEnabled ? "bg-sky-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
                <Power size={14} />
              </div>
              <div>
                <p className="text-[11px] font-bold dark:text-white leading-tight">
                  {t('auto.wyzwalacz_power_tytul', { defaultValue: 'Włącznik telefonu' })}
                </p>
                <p className="text-[8px] text-slate-500 dark:text-slate-400">
                  {t('auto.wyzwalacz_power_opis', { defaultValue: 'Dwuklik włącznika / ekranu' })}
                </p>
              </div>
            </div>
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center border transition-all",
              powerBtnEnabled ? "bg-sky-500 border-sky-500 text-white" : "border-slate-300 dark:border-slate-600"
            )}>
              {powerBtnEnabled && <Check size={10} strokeWidth={3} />}
            </div>
          </button>

          {/* Wyzwalacz 2: Przycisk słuchawek */}
          <button
            type="button"
            onClick={async () => {
              const next = !earphoneBtnEnabled;
              setEarphoneBtnEnabled(next);
              await voiceReadoutService.setEarphoneBtnTriggerEnabled(next);
              toast.success(next 
                ? t('auto.wlaczono_wyzwalacz_sluchawki', { defaultValue: 'Włączono: Przycisk słuchawek' }) 
                : t('auto.wylaczono_wyzwalacz_sluchawki', { defaultValue: 'Wyłączono: Przycisk słuchawek' })
              );
            }}
            className={cn(
              "flex items-center justify-between p-2.5 rounded-xl border transition-all text-left",
              earphoneBtnEnabled
                ? "bg-sky-500/10 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500/40 shadow-sm"
                : "bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/80 opacity-60"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", earphoneBtnEnabled ? "bg-sky-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
                <Music size={14} />
              </div>
              <div>
                <p className="text-[11px] font-bold dark:text-white leading-tight">
                  {t('auto.wyzwalacz_sluchawki_tytul', { defaultValue: 'Przycisk słuchawek' })}
                </p>
                <p className="text-[8px] text-slate-500 dark:text-slate-400">
                  {t('auto.wyzwalacz_sluchawki_opis', { defaultValue: 'Dwuklik: następny utwór / play' })}
                </p>
              </div>
            </div>
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center border transition-all",
              earphoneBtnEnabled ? "bg-sky-500 border-sky-500 text-white" : "border-slate-300 dark:border-slate-600"
            )}>
              {earphoneBtnEnabled && <Check size={10} strokeWidth={3} />}
            </div>
          </button>
        </div>
      </div>
    )}

    <div className="flex items-center justify-between pt-1 border-t border-sky-100/60 dark:border-slate-700/60">
      <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <span className={cn("w-2 h-2 rounded-full", isHeadphones ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600")} />
        <span>{isHeadphones ? t('auto.sluchawki_wykryte', { defaultValue: 'Słuchawki podłączone' }) : t('auto.brak_sluchawek', { defaultValue: 'Brak słuchawek' })}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          const allLogs = useLogsStore.getState().logs || [];
          const latestGLog = allLogs.find((l: any) => l.type === 'glucose' || l.type === 'sgv');
          const hasRealVal = latestGLog && latestGLog.value;
          const testVal = hasRealVal ? latestGLog.value : 124;
          const testTrend = hasRealVal ? (latestGLog.trend || 'Flat') : 'Flat';
          const testDelta = hasRealVal ? (latestGLog.delta !== undefined ? latestGLog.delta : '+1') : '+1';

          const isEn = i18n.language && i18n.language.startsWith('en');
          voiceReadoutService.speakGlucose(testVal, testTrend, testDelta, true, i18n.language);
          toast.success(
            hasRealVal 
              ? (isEn ? `Playing current reading (${testVal} mg/dL)` : `Odtwarzam bieżący odczyt (${testVal} mg/dL)`)
              : (isEn ? 'Playing demo reading (124 mg/dL)' : 'Odtwarzam odczyt demonstracyjny (124 mg/dL)'),
            { icon: '🎧' }
          );
        }}
        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-1"
      >
        <Volume2 size={12} />
        {i18n.language && i18n.language.startsWith('en') ? 'Test voice' : 'Przetestuj głos'}
      </button>
    </div>
  </div>

  {Capacitor.isNativePlatform() && (
    <div className={cn(
      "p-3.5 rounded-2xl border flex items-center justify-between gap-3 my-3 transition-all",
      isBatteryIgnored 
        ? "bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20" 
        : "bg-amber-50/80 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 shadow-sm"
    )}>
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
          isBatteryIgnored ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
        )}>
          {isBatteryIgnored ? <BatteryCharging size={18} /> : <Battery size={18} />}
        </div>
        <div>
          <p className="text-xs font-black dark:text-white leading-tight">
            {isBatteryIgnored ? 'Praca w tle (Bateria: Bez ograniczeń)' : 'Optymalizacja baterii Androida'}
          </p>
          <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
            {isBatteryIgnored 
              ? 'Telefon nie usypia aplikacji w nocy. Alerty działają na bieżąco.' 
              : 'Android może opóźniać alarmy w uśpieniu. Wyłącz optymalizację!'}
          </p>
        </div>
      </div>
      <button
        onClick={async () => {
          try {
            await NotificationBridge.requestIgnoreBatteryOptimization();
            setTimeout(() => {
              NotificationBridge.isBatteryOptimizationIgnored()
                .then((res: any) => {
                  if (res && typeof res.isIgnored === 'boolean') {
                    setIsBatteryIgnored(res.isIgnored);
                  }
                })
                .catch(() => {});
            }, 1500);
          } catch (e: any) {
            toast.error('Błąd otwierania ustawień baterii');
          }
        }}
        className={cn(
          "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 shrink-0",
          isBatteryIgnored 
            ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200" 
            : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20"
        )}
      >
        {isBatteryIgnored ? 'Sprawdź' : 'Wyłącz limit'}
      </button>
    </div>
  )}

 <div
 className={cn(
 "space-y-4 transition-all",
 !settings.notificationsEnabled && "opacity-50 grayscale-[0.5]",
 )}
 >
 {!settings.notificationsEnabled && (
 <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 pl-12">
 
 {t('auto.włącz_powiadomienia_powyżej_aby_sko', { defaultValue: i18n.t('auto.wlacz_powiadomienia_powyz', { defaultValue: "Włącz powiadomienia powyżej, aby skonfigurować rodzaje alertów." }) })}
 </p>
 )}
 <div className="grid grid-cols-2 gap-3 pl-12">
 {[
 {
 id: "hypo",
 label: i18n.t('auto.niedocukrzenia', { defaultValue: 'Niedocukrzenia' }),
 icon: <Activity size={14} className="text-rose-500" />,
 },
 {
 id: "hyper",
 label: i18n.t('auto.przecukrzenia', { defaultValue: 'Przecukrzenia' }),
 icon: <Activity size={14} className="text-amber-500" />,
 },
 {
 id: "reminders",
 label: i18n.t('auto.przypomnienia', { defaultValue: 'Przypomnienia' }),
 icon: <Bell size={14} className="text-blue-500" />,
 },
 {
 id: "predictions",
 label: i18n.t('auto.przewidywania_ai', { defaultValue: 'Przewidywania AI' }),
 icon: <Zap size={14} className="text-emerald-500" />,
 },
 {
 id: "pumpBolusPreMeal",
 label: t('notif.pref_pump_bolus_title', { defaultValue: 'Bolus z pompy i stoper' }),
 icon: <Clock size={14} className="text-purple-500" />,
 },
 {
 id: "mealDetected",
 label: t('notif.pref_meal_detected_title', { defaultValue: 'Posiłki (dla opiekuna)' }),
 icon: <Utensils size={14} className="text-amber-500" />,
 },
 ].map((pref) => {
    const prefs = {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...(settings.notificationPrefs || {})
    };
    const isActive = prefs[pref.id as keyof typeof prefs] ?? true;
    return (
      <button
        key={pref.id}
        onClick={async () => {
          const newPrefs = { ...prefs, [pref.id]: !isActive };
          if (pref.id === 'hypo') {
            newPrefs.hypoProtection = !isActive;
          }
          const updated = {
            ...settings,
            notificationPrefs: newPrefs,
          };
          setSettings(updated);
          localStorage.setItem("notificationPrefs", JSON.stringify(newPrefs));
          localStorage.setItem("glikocontrol_user_settings", JSON.stringify(updated));

          if (Capacitor.isNativePlatform()) {
            try {
              const notifsEnabled = settings.notificationsEnabled !== false;
              const hypoOn = notifsEnabled && (newPrefs.hypo !== false) && (newPrefs.hypoProtection !== false);
              const hyperOn = notifsEnabled && (newPrefs.hyper !== false);
              NotificationBridge.syncAlertPreferences({
                hypoEnabled: hypoOn,
                hyperEnabled: hyperOn,
                targetMin: settings.targetMin || 70,
                targetMax: settings.targetMax || 180
              }).catch(() => {});
            } catch (err) {}
          }

          if (user) {
            const uid = getEffectiveUid(user);
            await setDoc(
              doc(
                db,
                "users",
                uid,
                "settings",
                "profile",
              ),
              {
                notificationPrefs: newPrefs,
              },
              { merge: true },
            );
            queryClient.setQueryData(['userSettings', uid], (old: any) => ({
              ...(old || {}),
              notificationPrefs: newPrefs,
            }));
            queryClient.invalidateQueries({ queryKey: ['userSettings'] });
          }
        }}
        className={cn(
          "flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-left relative",
          isActive
            ? "bg-white dark:bg-slate-800 border-accent-500/40 text-slate-800 dark:text-white shadow-sm ring-1 ring-accent-500/20"
            : "bg-slate-100/60 dark:bg-slate-900/40 border-transparent text-slate-400 opacity-60 hover:opacity-100",
        )}
      >
        <div className={cn(
          "p-1.5 rounded-xl shrink-0 transition-colors",
          isActive ? "bg-accent-500/10" : "bg-slate-200/50 dark:bg-slate-800/50"
        )}>
          {pref.icon}
        </div>
        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-tight",
            isActive
              ? "text-slate-800 dark:text-white"
              : "text-slate-400",
          )}
        >
          {pref.label}
        </span>
      </button>
    );
  })}
 </div>

 {settings.notificationsEnabled && (
 <div className="pl-12 mt-6">
 <p className="text-[10px] font-black text-accent-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
 <Sparkles size={12} className="animate-pulse" /> {t('auto.inteligentne_reguły_glikosense', { defaultValue: i18n.t('auto.inteligentne_reguly_gliko', { defaultValue: "Inteligentne reguły GlikoSense" }) })}
 </p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {[
 {
 id: "nightSnackReminder",
 label: i18n.t('auto.nocne_przekąski_ostrzeżenia', { defaultValue: i18n.t('auto.nocne_przekaski_ostrzezen', { defaultValue: "Nocne Przekąski (Ostrzeżenia)" }) }),
 icon: <Moon size={14} className="text-indigo-400" />,
 },
 {
 id: "hypoProtection",
 label: i18n.t('auto.ochrona_przed_hipo', { defaultValue: "Ochrona przed hipo (AI)" }),
 icon: <Shield size={14} className="text-rose-500" />,
 }
 ].map((pref) => {
  const prefs = {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(settings.notificationPrefs || {})
  };
  const isActive = prefs[pref.id as keyof typeof prefs] ?? false;
  return (
  <button
  key={pref.id}
  onClick={async () => {
  const newPrefs = { ...prefs, [pref.id]: !isActive };
  const updated = {
    ...settings,
    notificationPrefs: newPrefs,
  };
  setSettings(updated);
  localStorage.setItem("notificationPrefs", JSON.stringify(newPrefs));
  localStorage.setItem("glikocontrol_user_settings", JSON.stringify(updated));

  if (Capacitor.isNativePlatform()) {
    try {
      const notifsEnabled = settings.notificationsEnabled !== false;
      const hypoOn = notifsEnabled && (newPrefs.hypo !== false) && (newPrefs.hypoProtection !== false);
      const hyperOn = notifsEnabled && (newPrefs.hyper !== false);
      NotificationBridge.syncAlertPreferences({
        hypoEnabled: hypoOn,
        hyperEnabled: hyperOn,
        targetMin: settings.targetMin || 70,
        targetMax: settings.targetMax || 180
      }).catch(() => {});
    } catch (err) {}
  }

  if (user) {
  const uid = getEffectiveUid(user);
  await setDoc(
  doc(db, "users", uid, "settings", "profile"),
  { notificationPrefs: newPrefs },
  { merge: true }
  );
  queryClient.setQueryData(['userSettings', uid], (old: any) => ({
    ...(old || {}),
    notificationPrefs: newPrefs,
  }));
  queryClient.invalidateQueries({ queryKey: ['userSettings'] });
  }
  }}
  className={cn(
  "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
  isActive
  ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 shadow-sm"
  : "bg-slate-50 dark:bg-slate-900 border-transparent opacity-60"
  )}
  >
  <div className={cn(
  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
  isActive ? "bg-white dark:bg-indigo-500/20 shadow-sm" : "bg-slate-200 dark:bg-slate-800"
  )}>
  {pref.icon}
  </div>
  <div>
  <span className={cn(
  "text-[10px] font-black uppercase tracking-tight block",
  isActive ? "text-indigo-700 dark:text-indigo-300" : "text-slate-400"
  )}>
  {pref.label}
  </span>
  <span className="text-[8px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
  {isActive ? i18n.t('auto.glikosense_aktywny', { defaultValue: 'GlikoSense aktywny' }) : i18n.t('auto.regula_wylaczona', { defaultValue: "Reguła wyłączona" })}
  </span>
  </div>
  </button>
  );
  })}
 </div>
 </div>
 )}

 {settings.notificationsEnabled && Object.keys(learnedRules).length > 0 && (
 <div className="pl-12 mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
 <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
 <Bot size={12} /> {t('auto.odkryte_wzorce_wyuczone_przez', { defaultValue: "Odkryte Wzorce (Wyuczone przez GlikoSense)" })}
 </p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {[
 {
 id: "dawnPhenomenonEnabled",
 label: t('auto.zjawisko_brzasku', { defaultValue: "Wzrost Poranny (Brzask)" }),
 desc: t('auto.wzrosty_poranne_opis', { defaultValue: "Wzrosty odczytów rano przed posiłkiem" }),
 icon: <Sun size={14} className="text-orange-400" />,
 type: "boolean"
 },
 {
 id: "somogyiEnabled",
 label: t('auto.efekt_somogyi', { defaultValue: "Wzrost po Spadku" }),
 desc: t('auto.odbicie_po_hipo_opis', { defaultValue: "Odczyty po wcześniejszym dołku" }),
 icon: <Activity size={14} className="text-rose-400" />,
 type: "boolean"
 },
 {
 id: "insulinResistanceMultiplier",
 label: t('auto.zmienna_insulinoopornosc', { defaultValue: "Wskaźnik Zapotrzebowania" }),
 desc: t('auto.modyfikator_wrazliwosci_opis', { defaultValue: "Obliczony z historii dawek i posiłków" }),
 icon: <Shield size={14} className="text-purple-400" />,
 type: "multiplier"
 },
 {
 id: "pizzaEffectMultiplier",
 label: t('auto.efekt_pizzy', { defaultValue: "Tłuszcze i Białka (FPU)" }),
 desc: t('auto.przedluzone_wchlanianie_opis', { defaultValue: "Opóźnione uwalnianie energii z posiłku" }),
 icon: <Pizza size={14} className="text-yellow-500" />,
 type: "multiplier"
 }
 ].filter(pattern => {
 return Object.keys(learnedRules).includes(pattern.id);
 }).map((pref) => {
 const isActive = pref.type === "boolean" 
 ? learnedRules[pref.id] === true 
 : learnedRules[pref.id] !== 1.0 && learnedRules[pref.id] !== undefined;

 return (
 <div
 key={pref.id}
 className={cn(
 "flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all text-left",
 "bg-amber-50/50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 shadow-sm"
 )}
 >
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white dark:bg-amber-500/20 shadow-sm">
 {pref.icon}
 </div>
 <div>
 <span className="text-[10px] font-black uppercase tracking-tight block text-amber-700 dark:text-amber-300">
 {pref.label}
 </span>
 <span className="text-[8px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
 {pref.desc}
 </span>
 </div>
 </div>
 
              <PixelSwitch
                checked={isActive}
                activeColor="bg-amber-500"
                className="shrink-0"
                onChange={() => {
                  const newRules = { ...learnedRules };
                  
                  if (pref.type === "boolean") {
                    newRules[pref.id] = !isActive;
                  } else {
                    // Modyfikatory (np. insulinooporność 1.2x)
                    if (isActive) {
                      newRules[pref.id] = 1.0;
                    } else {
                      newRules[pref.id] = 1.2; // Domyślna wartość włączenia
                    }
                  }
                  
                  setLearnedRules(newRules);
                  localStorage.setItem('glikosense_medical_rules', JSON.stringify(newRules));
                  toast.success(isActive ? t('auto.regula_wylaczona', { defaultValue: "Reguła wyłączona" }) : t('auto.regula_wlaczona', { defaultValue: "Reguła włączona" }));
                }}
              />
 </div>
 );
 })}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </>
 );
}
