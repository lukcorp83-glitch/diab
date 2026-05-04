import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, AlertTriangle, Info, Clock, CheckCircle2, Pill } from 'lucide-react';
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
    // Generate notifications based on userSettings
    const newNotifications: AppNotification[] = [];
    const now = Date.now();
    const warningThresholdMs = 12 * 60 * 60 * 1000; // 12 hours

    if (userSettings?.sensorChangeDate && userSettings?.sensorDurationDays) {
      const sensorExpiryDate = userSettings.sensorChangeDate + (userSettings.sensorDurationDays * 24 * 60 * 60 * 1000);
      const sensorMsLeft = sensorExpiryDate - now;
      
      if (sensorMsLeft <= 0) {
        newNotifications.push({
          id: 'sensor-expired',
          title: 'Sensor wygasł',
          message: 'Czas na wymianę sensora!',
          type: 'alert',
          timestamp: sensorExpiryDate,
          read: false
        });
      } else if (sensorMsLeft <= warningThresholdMs) {
        newNotifications.push({
          id: 'sensor-warning',
          title: 'Zbliża się wymiana sensora',
          message: 'Pozostało mniej niż 12 godzin do końca cyklu życia sensora.',
          type: 'warning',
          timestamp: sensorExpiryDate - warningThresholdMs,
          read: false
        });
      } else {
        newNotifications.push({
          id: 'sensor-info',
          title: 'Aktywny sensor',
          message: `Kolejna wymiana: ${new Date(sensorExpiryDate).toLocaleDateString()}`,
          type: 'info',
          timestamp: userSettings.sensorChangeDate,
          read: true
        });
      }
    }

    if (userSettings?.infusionSetChangeDate && userSettings?.infusionSetDurationDays) {
      const infusionExpiryDate = userSettings.infusionSetChangeDate + (userSettings.infusionSetDurationDays * 24 * 60 * 60 * 1000);
      const infusionMsLeft = infusionExpiryDate - now;
      
      if (infusionMsLeft <= 0) {
        newNotifications.push({
          id: 'infusion-expired',
          title: 'Wkłucie wygasło',
          message: 'Czas na wymianę wkłucia!',
          type: 'alert',
          timestamp: infusionExpiryDate,
          read: false
        });
      } else if (infusionMsLeft <= warningThresholdMs) {
        newNotifications.push({
          id: 'infusion-warning',
          title: 'Zbliża się wymiana wkłucia',
          message: 'Pozostało mniej niż 12 godzin do końca cyklu życia wkłucia.',
          type: 'warning',
          timestamp: infusionExpiryDate - warningThresholdMs,
          read: false
        });
      } else {
        newNotifications.push({
          id: 'infusion-info',
          title: 'Aktywne wkłucie',
          message: `Kolejna wymiana: ${new Date(infusionExpiryDate).toLocaleDateString()}`,
          type: 'info',
          timestamp: userSettings.infusionSetChangeDate,
          read: true
        });
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
                 // If the reminder time has passed today (or is right now)
                 if (currentTotalMinutes >= remTotalMinutes) {
                    const remDate = new Date();
                    remDate.setHours(h, m, 0, 0);
                    
                    newNotifications.push({
                       id: `med-${med.id}-${rem}-${todayString}`, // Unique per day
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

    if (newNotifications.length === 0) {
      newNotifications.push({
        id: 'welcome',
        title: 'Witaj w GlikoControl',
        message: 'Twoje centrum powiadomień jest gotowe.',
        type: 'success',
        timestamp: 0,
        read: true
      });
    }

    // Sort by timestamp desc
    newNotifications.sort((a, b) => b.timestamp - a.timestamp);
    
    // Check read status from localStorage
    const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    const withReadStatus = newNotifications.map(n => ({
      ...n,
      read: n.read || readIds.includes(n.id)
    }));

    setNotifications(withReadStatus);
    setUnreadCount(withReadStatus.filter(n => !n.read).length);
  }, [userSettings]);

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    setUnreadCount(0);
    localStorage.setItem('readNotifications', JSON.stringify(updated.map(n => n.id)));
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
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "w-full max-w-sm h-full shadow-2xl relative flex flex-col border-l z-10",
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              )}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <Bell size={20} className="text-accent-500" />
                  <h2 className="font-black text-lg dark:text-white tracking-tight">Powiadomienia</h2>
                  {unreadCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} nowe
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              {unreadCount > 0 && (
                <div className="p-2 px-4 flex justify-end shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50">
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-black uppercase tracking-wider text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors"
                  >
                    Przeczytane
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <Bell size={32} className="mb-2 opacity-50" />
                    <p className="text-sm font-medium">Brak powiadomień</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <motion.div 
                      key={notification.id}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "p-3 rounded-2xl border transition-all relative overflow-hidden",
                        notification.read 
                          ? (theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-white border-slate-200 opacity-70')
                          : (theme === 'dark' ? 'bg-slate-800 border-slate-700 shadow-lg' : 'bg-white border-slate-300 shadow-md')
                      )}
                    >
                      {!notification.read && (
                        <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-accent-500 m-3" />
                      )}
                      <div className="flex gap-3">
                        <div className="mt-0.5 shrink-0">
                          {getIcon(notification.type)}
                        </div>
                        <div>
                          <h4 className={cn("text-sm font-bold", theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                            {notification.title}
                          </h4>
                          <p className={cn("text-xs mt-1 leading-relaxed", theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400 font-medium">
                            <Clock size={10} />
                            {new Date(notification.timestamp).toLocaleString()}
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
      </AnimatePresence>
    </>
  );
}
