import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, AlertTriangle, Info, Clock, CheckCircle2, Pill, Trash2, Check } from 'lucide-react';
import { UserSettings } from '../types';
import { cn } from '../lib/utils';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'alert' | 'success' | 'medication';
  timestamp: number;
  read: boolean;
}

export default function NotificationCenter({ userSettings, theme }: { userSettings: UserSettings | null, theme: 'light' | 'dark' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let lastCheckedMinute = -1;

    const checkNotifications = () => {
      // Check hidden/deleted notifications from localStorage
      const deletedIds = JSON.parse(localStorage.getItem('deletedNotifications') || '[]');
      const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      const notifiedIds = JSON.parse(localStorage.getItem('systemNotifiedIds') || '[]');

      // Generate notifications based on userSettings
      const newNotifications: AppNotification[] = [];
      const now = Date.now();
      const warningThresholdMs = 12 * 60 * 60 * 1000; // 12 hours

      const triggerSystemAlert = (id: string, title: string, message: string) => {
        const apkNotificationsEnabled = userSettings?.apkSystemNotificationsEnabled ?? true;
        if (!apkNotificationsEnabled) return;

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
          } else if ('Notification' in window && Notification.permission === 'granted') {
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
            newNotifications.push({ id: 'sensor-expired', title: 'Sensor wygasł', message: 'Czas na wymianę sensora!', type: 'alert', timestamp: sensorExpiryDate, read: false });
            triggerSystemAlert('sensor-expired-alert', 'Wymień Sensor', 'Twój sensor wygasł. Czas na wymianę!');
          } else if (sensorMsLeft <= warningThresholdMs) {
            newNotifications.push({ id: 'sensor-warning', title: 'Zbliża się wymiana sensora', message: 'Pozostało mniej niż 12 godzin do końca cyklu życia sensora.', type: 'warning', timestamp: sensorExpiryDate - warningThresholdMs, read: false });
            triggerSystemAlert('sensor-warning-alert', 'Zbliża się wymiana sensora', 'Pozostało mniej niż 12 godzin do końca cyklu życia sensora.');
          } else {
            newNotifications.push({ id: 'sensor-info', title: 'Aktywny sensor', message: `Kolejna wymiana: ${new Date(sensorExpiryDate).toLocaleDateString()}`, type: 'info', timestamp: userSettings.sensorChangeDate, read: true });
          }
        }
      }

      if (userSettings?.infusionSetChangeDate && userSettings?.infusionSetDurationDays) {
        const infusionExpiryDate = userSettings.infusionSetChangeDate + (userSettings.infusionSetDurationDays * 24 * 60 * 60 * 1000);
        const infusionMsLeft = infusionExpiryDate - now;
        
        const id = infusionMsLeft <= 0 ? 'infusion-expired' : (infusionMsLeft <= warningThresholdMs ? 'infusion-warning' : 'infusion-info');
        
        if (!deletedIds.includes(id)) {
          if (infusionMsLeft <= 0) {
            newNotifications.push({ id: 'infusion-expired', title: 'Wkłucie wygasło', message: 'Czas na wymianę wkłucia!', type: 'alert', timestamp: infusionExpiryDate, read: false });
            triggerSystemAlert('infusion-expired-alert', 'Wymień Wkłucie', 'Cykl życia wkłucia dobiegł końca!');
          } else if (infusionMsLeft <= warningThresholdMs) {
            newNotifications.push({ id: 'infusion-warning', title: 'Zbliża się wymiana wkłucia', message: 'Pozostało mniej niż 12 godzin do końca cyklu życia wkłucia.', type: 'warning', timestamp: infusionExpiryDate - warningThresholdMs, read: false });
            triggerSystemAlert('infusion-warning-alert', 'Zbliża się wymiana wkłucia', 'Pozostało mniej niż 12 godzin do końca cyklu życia wkłucia.');
          } else {
            newNotifications.push({ id: 'infusion-info', title: 'Aktywne wkłucie', message: `Kolejna wymiana: ${new Date(infusionExpiryDate).toLocaleDateString()}`, type: 'info', timestamp: userSettings.infusionSetChangeDate, read: true });
          }
        }
      }

      if (userSettings?.medications) {
        const nowObj = new Date(now);
        const currentHours = nowObj.getHours();
        const currentMinutes = nowObj.getMinutes();
        const currentTotalMinutes = currentHours * 60 + currentMinutes;
        const todayString = nowObj.toLocaleDateString();

        userSettings.medications.forEach(med => {
           if (med.active) {
              med.reminders.forEach(rem => {
                 const [hStr, mStr] = rem.split(':');
                 const h = parseInt(hStr, 10);
                 const m = parseInt(mStr, 10);
                 if (!isNaN(h) && !isNaN(m)) {
                   const remTotalMinutes = h * 60 + m;
                   const id = `med-${med.id}-${rem}-${todayString}`;
                   // Actively alert if it matches current minute (giving 2 minutes window to avoid missing exactly on tick)
                   if (currentTotalMinutes >= remTotalMinutes && currentTotalMinutes <= remTotalMinutes + 2) {
                       triggerSystemAlert(id + '-sysalert', `Czas na lek: ${med.name}`, `Weź dawkę: ${med.dosage} o ${rem}`);
                   }

                   if (currentTotalMinutes >= remTotalMinutes && !deletedIds.includes(id)) {
                      const remDate = new Date();
                      remDate.setHours(h, m, 0, 0);
                      newNotifications.push({
                         id: id,
                         title: `Czas na lek: ${med.name}`,
                         message: `Zamierzona dawka: ${med.dosage} (${rem})`,
                         type: 'medication',
                         timestamp: remDate.getTime(),
                         read: false
                      });
                   }
                 }
              });
           }
        });
      }

      if (newNotifications.length === 0 && !deletedIds.includes('welcome')) {
        newNotifications.push({ id: 'welcome', title: 'Witaj w GlikoControl', message: 'Twoje centrum powiadomień jest gotowe.', type: 'success', timestamp: 0, read: true });
      }

      newNotifications.sort((a, b) => b.timestamp - a.timestamp);
      
      const withReadStatus = newNotifications.map(n => ({
        ...n,
        read: n.read || readIds.includes(n.id)
      }));

      setNotifications(withReadStatus);
      setUnreadCount(withReadStatus.filter(n => !n.read).length);
    };

    // Run once on mount and settings change
    checkNotifications();

    // Run every minute to check alarms
    const interval = setInterval(checkNotifications, 60000);

    return () => clearInterval(interval);
  }, [userSettings]);

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    setUnreadCount(0);
    const readIds = updated.map(n => n.id);
    localStorage.setItem('readNotifications', JSON.stringify(readIds));
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    setUnreadCount(updated.filter(n => !n.read).length);
    const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('readNotifications', JSON.stringify(readIds));
    }
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    setUnreadCount(updated.filter(n => !n.read).length);
    const deletedIds = JSON.parse(localStorage.getItem('deletedNotifications') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('deletedNotifications', JSON.stringify(deletedIds));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'alert': return <AlertTriangle size={16} className="text-rose-500" />;
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'medication': return <Pill size={16} className="text-indigo-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent dark:border-slate-700 transition-all active:scale-90 relative"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[100] flex justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="absolute inset-0 bg-slate-900/20 dark:bg-slate-950/60 backdrop-blur-sm"
              />
              
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className={cn(
                  "w-full max-w-[340px] h-full shadow-2xl relative flex flex-col border-l z-10",
                  theme === 'dark' ? 'bg-slate-950/90 border-white/5' : 'bg-slate-50 border-slate-200'
                )}
                style={{ backdropFilter: 'blur(32px) saturate(150%)' }}
              >
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent-500/10 rounded-xl">
                      <Bell size={20} className="text-accent-500" />
                    </div>
                    <div>
                      <h2 className="font-black text-sm dark:text-white uppercase tracking-widest font-display">Powiadomienia</h2>
                      {unreadCount > 0 && (
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">
                          {unreadCount} nowe wiadomości
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-500 h-10 w-10 flex items-center justify-center border border-transparent dark:hover:border-white/10"
                  >
                    <X size={20} />
                  </button>
                </div>

                {unreadCount > 0 && (
                  <div className="p-2 px-5 flex justify-end shrink-0 border-b border-white/5 bg-slate-100/30 dark:bg-white/5 backdrop-blur-sm">
                    <button 
                      onClick={markAllAsRead}
                      className="text-[9px] font-black uppercase tracking-[0.1em] text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-all hover:scale-105 active:scale-95"
                    >
                      Oznacz jako przeczytane
                    </button>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 mt-4 mx-4 bg-gradient-to-b from-slate-50/50 to-slate-100/50 dark:from-slate-800/20 dark:to-slate-900/20 rounded-[3rem] border-2 border-dashed border-slate-200/60 dark:border-slate-800/60 opacity-90 backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-[2rem] bg-indigo-50/50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 shadow-inner ring-1 ring-indigo-100 dark:ring-indigo-800/50">
                          <Bell size={24} className="text-indigo-400 dark:text-indigo-400/80" />
                        </div>
                        <p className="text-[11px] font-black text-indigo-400 dark:text-indigo-400/80 uppercase tracking-widest text-center">
                          Brak powiadomień
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-2 text-center max-w-[200px]">
                          Twoje centrum komunikatów jest puste. Odpocznij.
                        </p>
                    </div>
                  ) : (
                    notifications.map((notification, idx) => (
                      <motion.div 
                        key={notification.id}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "glass-card !p-4 border transition-all relative overflow-hidden group",
                          notification.read 
                            ? "opacity-60 grayscale-[0.5]" 
                            : "shadow-lg shadow-indigo-500/5"
                        )}
                      >
                        {!notification.read && (
                          <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-accent-500 m-4 shadow-[0_0_8px_rgba(var(--accent-500),0.8)]" />
                        )}
                        <div className="flex gap-4">
                          <div className={cn(
                            "mt-0.5 shrink-0 p-2.5 rounded-2xl group-hover:scale-110 transition-transform",
                            notification.read ? 'bg-slate-100 dark:bg-white/5 text-slate-400' : 'bg-accent-500/10'
                          )}>
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className={cn("text-[13px] font-black leading-tight tracking-tight", theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                                {notification.title}
                              </h4>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.read && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                    className="p-1 rounded-md hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                                    title="Oznacz jako przeczytane"
                                  >
                                    <Check size={14} />
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                  className="p-1 rounded-md hover:bg-rose-500/10 text-rose-500 transition-colors"
                                  title="Usuń"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <p className={cn("text-[11px] mt-1 font-bold leading-relaxed opacity-70", theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-1.5 mt-3 text-[9px] text-slate-400 font-black uppercase tracking-tight">
                              <Clock size={10} />
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
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
