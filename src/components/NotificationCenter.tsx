import { useAuthStore } from '../stores/useAuthStore';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  Info, 
  Clock, 
  CheckCircle2, 
  Pill, 
  Trash2, 
  Check, 
  Sliders, 
  Utensils, 
  Activity, 
  Zap, 
  Shield,
  Volume2,
  Square,
  Play
} from 'lucide-react';
import { playMp3Alert, stopAllAudio } from '../lib/audioUtils';
import { UserSettings } from '../types';
import { cn, getEffectiveUid } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { Haptics } from '../lib/haptics';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'alert' | 'success' | 'medication';
  timestamp: number;
  read: boolean;
}

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

interface NotificationCenterProps {
  userSettings: UserSettings | null;
  theme: 'light' | 'dark';
  setUserSettings?: (settings: any) => void;
}

export default function NotificationCenter({ userSettings, theme, setUserSettings }: NotificationCenterProps) {
  const user = useAuthStore(state => state.user);
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [localPrefs, setLocalPrefs] = useState<any>(() => {
    let savedLocal: any = {};
    try {
      const saved = localStorage.getItem('notificationPrefs');
      if (saved) savedLocal = JSON.parse(saved);
    } catch(e) {}
    return {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...savedLocal,
      ...(userSettings?.notificationPrefs || {})
    };
  });

  const [apkNotificationsEnabled, setApkNotificationsEnabled] = useState(() => {
    return userSettings?.apkSystemNotificationsEnabled ?? true;
  });

  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);

  const handleToggleTestSound = async () => {
    if (isPlayingTestSound) {
      Haptics.light();
      await stopAllAudio();
      setIsPlayingTestSound(false);
      toast.success('Zatrzymano dźwięk testowy');
    } else {
      Haptics.medium();
      setIsPlayingTestSound(true);
      toast.success('Odtwarzanie dźwięku alarmu MP3 (status_clear.mp3)...', { icon: '🔔' });
      await playMp3Alert();
      setTimeout(() => {
        setIsPlayingTestSound(false);
      }, 5000);
    }
  };

  useEffect(() => {
    if (userSettings?.notificationPrefs) {
      setLocalPrefs((prev: any) => ({
        ...DEFAULT_NOTIFICATION_PREFS,
        ...prev,
        ...userSettings.notificationPrefs
      }));
    }
    if (userSettings?.apkSystemNotificationsEnabled !== undefined) {
      setApkNotificationsEnabled(userSettings.apkSystemNotificationsEnabled);
    }
  }, [userSettings]);

  useEffect(() => {
    const checkNotifications = () => {
      const deletedIds = JSON.parse(localStorage.getItem('deletedNotifications') || '[]');
      const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      const notifiedIds = JSON.parse(localStorage.getItem('systemNotifiedIds') || '[]');

      const newNotifications: AppNotification[] = [];
      const now = Date.now();
      const warningThresholdMs = 12 * 60 * 60 * 1000;

      const triggerSystemAlert = (id: string, title: string, message: string) => {
        const isEnabled = userSettings?.apkSystemNotificationsEnabled ?? true;
        if (!isEnabled) return;

        if (!notifiedIds.includes(id)) {
          if (Capacitor.isNativePlatform()) {
            try {
              import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
                LocalNotifications.schedule({
                  notifications: [
                    {
                      title: title,
                      body: message,
                      id: Math.floor(Math.random() * 100000),
                      schedule: { at: new Date() },
                      sound: null,
                      attachments: null,
                      actionTypeId: "",
                      extra: null
                    }
                  ]
                });
              });
            } catch(e) {
              console.error("Capacitor local notification error:", e);
            }
          } else if ('Notification' in window && window.Notification.permission === 'granted') {
            try {
              navigator.serviceWorker.ready.then(reg => {
                if (reg) reg.showNotification(title, { body: message, icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/'), vibrate: [200, 100, 200] } as any);
                else new Notification(title, { body: message });
              }).catch(() => { new Notification(title, { body: message }); });
            } catch(e) {}
          }
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          
          notifiedIds.push(id);
          localStorage.setItem('systemNotifiedIds', JSON.stringify(notifiedIds));
        }
      };

      if (userSettings?.sensorChangeDate && userSettings?.sensorDurationDays) {
        const sensorExpiryDate = userSettings.sensorChangeDate + (userSettings.sensorDurationDays * 24 * 60 * 60 * 1000);
        const sensorMsLeft = sensorExpiryDate - now;
        const id = sensorMsLeft <= 0 ? 'sensor-expired' : (sensorMsLeft <= warningThresholdMs ? 'sensor-warning' : 'sensor-info');
        
        if (!deletedIds.includes(id)) {
          if (sensorMsLeft <= 0) {
            newNotifications.push({ id: 'sensor-expired', title: i18n.t('auto.sensor_wygasl', { defaultValue: "Sensor wygasł" }), message: i18n.t('auto.czas_na_wymiane_sensora', { defaultValue: "Czas na wymianę sensora!" }), type: 'alert', timestamp: sensorExpiryDate, read: false });
            triggerSystemAlert('sensor-expired-alert', i18n.t('auto.wymien_sensor', { defaultValue: "Wymień Sensor" }), i18n.t('auto.twoj_sensor_wygasl_czas_n', { defaultValue: "Twój sensor wygasł. Czas na wymianę!" }));
          } else if (sensorMsLeft <= warningThresholdMs) {
            newNotifications.push({ id: 'sensor-warning', title: i18n.t('auto.zbliza_sie_wymiana_sensor', { defaultValue: "Zbliża się wymiana sensora" }), message: i18n.t('auto.pozostalo_mniej_niz_12_go', { defaultValue: "Pozostało mniej niż 12 godzin do końca cyklu życia sensora." }), type: 'warning', timestamp: sensorExpiryDate - warningThresholdMs, read: false });
            triggerSystemAlert('sensor-warning-alert', i18n.t('auto.zbliza_sie_wymiana_sensor', { defaultValue: "Zbliża się wymiana sensora" }), i18n.t('auto.pozostalo_mniej_niz_12_go', { defaultValue: "Pozostało mniej niż 12 godzin do końca cyklu życia sensora." }));
          } else {
            newNotifications.push({ id: 'sensor-info', title: i18n.t('auto.aktywny_sensor', { defaultValue: 'Aktywny sensor' }), message: `${i18n.t('auto.kolejna_wymiana', { defaultValue: 'Kolejna wymiana:' })} ${new Date(sensorExpiryDate).toLocaleDateString()}`, type: 'info', timestamp: userSettings.sensorChangeDate, read: true });
          }
        }
      }

      if (userSettings?.infusionSetChangeDate && userSettings?.infusionSetDurationDays) {
        const infusionExpiryDate = userSettings.infusionSetChangeDate + (userSettings.infusionSetDurationDays * 24 * 60 * 60 * 1000);
        const infusionMsLeft = infusionExpiryDate - now;
        const id = infusionMsLeft <= 0 ? 'infusion-expired' : (infusionMsLeft <= warningThresholdMs ? 'infusion-warning' : 'infusion-info');
        
        if (!deletedIds.includes(id)) {
          if (infusionMsLeft <= 0) {
            newNotifications.push({ id: 'infusion-expired', title: i18n.t('auto.wklucie_wygaslo', { defaultValue: "Wkłucie wygasło" }), message: i18n.t('auto.czas_na_wymiane_wklucia', { defaultValue: "Czas na wymianę wkłucia!" }), type: 'alert', timestamp: infusionExpiryDate, read: false });
            triggerSystemAlert('infusion-expired-alert', i18n.t('auto.wymien_wklucie', { defaultValue: "Wymień Wkłucie" }), i18n.t('auto.twoje_wklucie_wygaslo_cz', { defaultValue: "Twoje wkłucie wygasło. Czas na zmianę miejsca!" }));
          } else if (infusionMsLeft <= warningThresholdMs) {
            newNotifications.push({ id: 'infusion-warning', title: i18n.t('auto.zbliza_sie_wymiana_wkluci', { defaultValue: "Zbliża się wymiana wkłucia" }), message: i18n.t('auto.pozostalo_mniej_niz_12_go', { defaultValue: "Pozostało mniej niż 12 godzin do końca cyklu życia wkłucia." }), type: 'warning', timestamp: infusionExpiryDate - warningThresholdMs, read: false });
            triggerSystemAlert('infusion-warning-alert', i18n.t('auto.zbliza_sie_wymiana_wkluci', { defaultValue: "Zbliża się wymiana wkłucia" }), i18n.t('auto.pozostalo_mniej_niz_12_go', { defaultValue: "Pozostało mniej niż 12 godzin do końca cyklu życia wkłucia." }));
          } else {
            newNotifications.push({ id: 'infusion-info', title: i18n.t('auto.aktywne_wklucie', { defaultValue: 'Aktywne wkłucie' }), message: `${i18n.t('auto.kolejna_wymiana', { defaultValue: 'Kolejna wymiana:' })} ${new Date(infusionExpiryDate).toLocaleDateString()}`, type: 'info', timestamp: userSettings.infusionSetChangeDate, read: true });
          }
        }
      }

      const finalNotifications = newNotifications.map(n => ({
        ...n,
        read: n.read || readIds.includes(n.id)
      }));

      setNotifications(finalNotifications);
      setUnreadCount(finalNotifications.filter(n => !n.read).length);
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, [userSettings]);

  const markAllAsRead = () => {
    Haptics.selection();
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('readNotifications', JSON.stringify(allIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markAsRead = (id: string) => {
    Haptics.selection();
    const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('readNotifications', JSON.stringify(readIds));
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const deleteNotification = (id: string) => {
    Haptics.light();
    const deletedIds = JSON.parse(localStorage.getItem('deletedNotifications') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('deletedNotifications', JSON.stringify(deletedIds));
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => notifications.find(n => n.id === id && !n.read) ? Math.max(0, prev - 1) : prev);
  };

  const togglePref = async (prefKey: string) => {
    Haptics.selection();
    const currentVal = localPrefs[prefKey] ?? (DEFAULT_NOTIFICATION_PREFS as any)[prefKey] ?? true;
    const newVal = !currentVal;
    const updatedPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...localPrefs, [prefKey]: newVal };

    setLocalPrefs(updatedPrefs);
    if (setUserSettings && userSettings) {
      setUserSettings({ ...userSettings, notificationPrefs: updatedPrefs });
    }

    localStorage.setItem('notificationPrefs', JSON.stringify(updatedPrefs));

    if (user) {
      try {
        await setDoc(
          doc(db, "users", getEffectiveUid(user), "settings", "profile"),
          { notificationPrefs: updatedPrefs },
          { merge: true }
        );
      } catch(e) {
        console.warn("Failed to sync notification preferences", e);
      }
    }

    toast.success(newVal ? t('notif.enabled_toast') : t('notif.disabled_toast'));
  };

  const toggleSystemNotifs = async () => {
    Haptics.medium();
    const targetState = !apkNotificationsEnabled;
    setApkNotificationsEnabled(targetState);

    if (setUserSettings && userSettings) {
      setUserSettings({ ...userSettings, apkSystemNotificationsEnabled: targetState });
    }

    localStorage.setItem('apkSystemNotificationsEnabled', targetState ? 'true' : 'false');

    if (user) {
      try {
        await setDoc(
          doc(db, "users", getEffectiveUid(user), "settings", "profile"),
          { apkSystemNotificationsEnabled: targetState },
          { merge: true }
        );
      } catch(e) {
        console.warn("Failed to sync apkSystemNotificationsEnabled", e);
      }
    }

    toast.success(targetState ? t('notif.system_enabled_toast') : t('notif.system_disabled_toast'));
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="text-rose-500" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-amber-500" size={16} />;
      case 'medication':
        return <Pill className="text-purple-500" size={16} />;
      case 'success':
        return <CheckCircle2 className="text-emerald-500" size={16} />;
      default:
        return <Info className="text-blue-500" size={16} />;
    }
  };

  const preferenceItems = [
    {
      id: 'pumpBolusPreMeal',
      title: t('notif.pref_pump_bolus_title'),
      desc: t('notif.pref_pump_bolus_desc'),
      icon: <Clock size={16} className="text-purple-400" />
    },
    {
      id: 'mealDetected',
      title: t('notif.pref_meal_detected_title'),
      desc: t('notif.pref_meal_detected_desc'),
      icon: <Utensils size={16} className="text-amber-400" />
    },
    {
      id: 'hypo',
      title: t('notif.pref_hypo_title'),
      desc: t('notif.pref_hypo_desc'),
      icon: <Activity size={16} className="text-rose-400" />
    },
    {
      id: 'hyper',
      title: t('notif.pref_hyper_title'),
      desc: t('notif.pref_hyper_desc'),
      icon: <Activity size={16} className="text-amber-400" />
    },
    {
      id: 'reminders',
      title: t('notif.pref_reminders_title'),
      desc: t('notif.pref_reminders_desc'),
      icon: <Bell size={16} className="text-blue-400" />
    },
    {
      id: 'predictions',
      title: t('notif.pref_predictions_title'),
      desc: t('notif.pref_predictions_desc'),
      icon: <Zap size={16} className="text-emerald-400" />
    }
  ];

  return (
    <>
      <button 
        onClick={() => { Haptics.light(); setIsOpen(true); }}
        className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-accent-400 border border-transparent dark:border-slate-700 transition-all active:scale-90 relative"
        aria-label="Powiadomienia"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 pt-safe pb-safe z-[100] flex justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm"
              />
              
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className={cn(
                  "w-full max-w-[360px] h-full shadow-2xl relative flex flex-col border-l z-10",
                  theme === 'dark' ? 'bg-slate-950/95 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                )}
                style={{ backdropFilter: 'blur(32px) saturate(150%)' }}
              >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-accent-500/10 rounded-xl">
                      <Bell size={18} className="text-accent-500" />
                    </div>
                    <div>
                      <h2 className="font-black text-sm uppercase tracking-widest font-display">
                        {t('auto.centrum_powiadomien', { defaultValue: 'Centrum Powiadomień' })}
                      </h2>
                      {unreadCount > 0 && activeTab === 'list' && (
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">
                          {unreadCount} {t('auto.nowe_wiadomości', { defaultValue: 'nowe wiadomości' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-500 h-9 w-9 flex items-center justify-center border border-transparent dark:hover:border-white/10"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 bg-slate-100/50 dark:bg-white/5 p-1.5 gap-1.5">
                  <button
                    onClick={() => { Haptics.selection(); setActiveTab('list'); }}
                    className={cn(
                      "flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                      activeTab === 'list'
                        ? "bg-white dark:bg-slate-800 text-accent-500 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                    )}
                  >
                    <Bell size={12} />
                    <span>{t('notif.tab_messages')} ({notifications.length})</span>
                  </button>
                  <button
                    onClick={() => { Haptics.selection(); setActiveTab('settings'); }}
                    className={cn(
                      "flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                      activeTab === 'settings'
                        ? "bg-white dark:bg-slate-800 text-accent-500 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                    )}
                  >
                    <Sliders size={12} />
                    <span>{t('notif.tab_settings')}</span>
                  </button>
                </div>

                {/* Content */}
                {activeTab === 'list' ? (
                  <>
                    {unreadCount > 0 && (
                      <div className="p-2 px-5 flex justify-end shrink-0 border-b border-white/5 bg-slate-100/30 dark:bg-white/5 backdrop-blur-sm">
                        <button 
                          onClick={markAllAsRead}
                          className="text-[9px] font-black uppercase tracking-[0.1em] text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-all hover:scale-105 active:scale-95"
                        >
                          {t('auto.oznacz_jako_przeczytane', { defaultValue: 'Oznacz jako przeczytane' })}
                        </button>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 mt-4 mx-2 bg-gradient-to-b from-slate-50/50 to-slate-100/50 dark:from-slate-800/20 dark:to-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-200/60 dark:border-slate-800/60 opacity-90 backdrop-blur-sm">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/20 flex items-center justify-center mb-3 shadow-inner ring-1 ring-indigo-100 dark:ring-indigo-800/50">
                            <Bell size={22} className="text-indigo-400" />
                          </div>
                          <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest text-center">
                            {t('auto.brak_powiadomień', { defaultValue: 'Brak powiadomień' })}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 text-center max-w-[200px]">
                            {t('auto.twoje_centrum_komunikatow', { defaultValue: 'Twoje centrum komunikatów jest puste.' })}
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification, idx) => (
                          <motion.div 
                            key={notification.id}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: idx * 0.04 }}
                            className={cn(
                              "glass-card !p-3.5 border transition-all relative overflow-hidden group rounded-2xl",
                              notification.read 
                                ? "opacity-60 grayscale-[0.5]" 
                                : "shadow-lg shadow-indigo-500/5"
                            )}
                          >
                            {!notification.read && (
                              <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-accent-500 m-3 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                            )}
                            <div className="flex gap-3">
                              <div className={cn(
                                "mt-0.5 shrink-0 p-2 rounded-xl group-hover:scale-105 transition-transform",
                                notification.read ? 'bg-slate-100 dark:bg-white/5 text-slate-400' : 'bg-accent-500/10'
                              )}>
                                {getIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <h4 className={cn("text-xs font-black leading-tight tracking-tight", theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                                    {notification.title}
                                  </h4>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!notification.read && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                        className="p-1 rounded-md hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                                        title={t('auto.oznacz_jako_przeczytane', { defaultValue: 'Oznacz jako przeczytane' })}
                                      >
                                        <Check size={13} />
                                      </button>
                                    )}
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                      className="p-1 rounded-md hover:bg-rose-500/10 text-rose-500 transition-colors"
                                      title={t('auto.usun', { defaultValue: 'Usuń' })}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                                <p className={cn("text-[11px] mt-1 font-medium leading-relaxed", theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-1.5 mt-2.5 text-[8px] text-slate-400 font-bold uppercase tracking-tight">
                                  <Clock size={9} />
                                  {new Date(notification.timestamp).toLocaleString([], {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  /* Tab: Settings / Toggles */
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Główny przełącznik powiadomień systemowych */}
                    <div className="p-3.5 bg-accent-50 dark:bg-slate-900/60 rounded-2xl border border-accent-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 pr-2">
                        <Shield className="text-accent-500 shrink-0" size={18} />
                        <div>
                          <p className="text-xs font-black leading-tight">
                            {t('notif.phone_alerts_title')}
                          </p>
                          <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                            {t('notif.phone_alerts_desc')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={toggleSystemNotifs}
                        className={cn(
                          "w-10 h-6 pl-1 shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                          apkNotificationsEnabled && "bg-accent-500 pl-5"
                        )}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </button>
                    </div>

                    {/* Narzędzie testowe dźwięku alarmu MP3 */}
                    <div className="p-3.5 bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 pr-2">
                        <div className={cn(
                          "p-2 rounded-xl shrink-0 transition-colors",
                          isPlayingTestSound ? "bg-rose-500 text-white animate-pulse" : "bg-accent-500/10 text-accent-500"
                        )}>
                          <Volume2 size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black leading-tight">
                            Dźwięk alarmu glikemii (MP3)
                          </p>
                          <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                            Plik status_clear.mp3 (niski / wysoki cukier)
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleToggleTestSound}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer",
                          isPlayingTestSound 
                            ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse" 
                            : "bg-accent-500 hover:bg-accent-600 text-white"
                        )}
                      >
                        {isPlayingTestSound ? (
                          <>
                            <Square size={13} fill="currentColor" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play size={13} fill="currentColor" />
                            <span>Testuj</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                        {t('notif.categories_title')}
                      </p>

                      <div className="space-y-2">
                        {preferenceItems.map(item => {
                          const isActive = localPrefs[item.id] ?? true;
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3",
                                isActive 
                                  ? "bg-white/80 dark:bg-slate-900/50 border-accent-500/30 shadow-sm" 
                                  : "bg-slate-100/50 dark:bg-slate-900/20 border-transparent opacity-60"
                              )}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 shrink-0 mt-0.5">
                                  {item.icon}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black leading-tight truncate">
                                    {item.title}
                                  </p>
                                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                    {item.desc}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => togglePref(item.id)}
                                className={cn(
                                  "w-9 h-5 pl-0.5 shrink-0 rounded-full flex items-center transition-all bg-slate-300 dark:bg-slate-700",
                                  isActive && "bg-accent-500 pl-4.5"
                                )}
                              >
                                <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
