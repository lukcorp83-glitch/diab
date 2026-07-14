import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, MessageCircle, AlertTriangle, Pill } from 'lucide-react';
import { playNormalGlucoseSound } from '../lib/audioUtils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export interface RemoteAlert {
  id: string;
  message: string;
  type: 'insulin' | 'food' | 'urgent' | 'custom';
  createdAt: number;
  senderDevice: string;
  acknowledged: boolean;
  acknowledgedAt?: number;
}

export default function RemoteAlertsListener({ user }: { user: any }) {
    const { t } = useTranslation();
  const [activeAlert, setActiveAlert] = useState<RemoteAlert | null>(null);

  useEffect(() => {
    const uid = getEffectiveUid(user);
    if (!uid) return;

    // Pobieramy tylko te alarmy, które NIE SĄ zatwierdzone, i które zostały utworzone w ciągu ostatnich 12 godzin (by uniknąć starych spamów)
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    
    const alertsRef = collection(db, 'artifacts', 'diacontrolapp', 'users', uid, 'alerts');
    const q = query(
      alertsRef, 
      where('acknowledged', '==', false),
      where('createdAt', '>', twelveHoursAgo)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setActiveAlert(null);
        return;
      }
      
      // Bierzemy najstarszy niezatwierdzony alert, by wymusić kliknięcie po kolei, jeśli jest ich kilka
      const alerts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RemoteAlert));
      alerts.sort((a, b) => a.createdAt - b.createdAt);
      
      const newAlert = alerts[0];
      
      // Jeśli pojawił się nowy alert, odtwórz dźwięk/wibrację i wyskocz z powiadomieniem Android
      if (!activeAlert || activeAlert.id !== newAlert.id) {
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 500]);
        }
        playNormalGlucoseSound();
        
        // Android Push Notification
        import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
          LocalNotifications.schedule({
            notifications: [
              {
                title: i18n.t('auto.wiadomosc_od', { defaultValue: 'Wiadomość od: ' }) + newAlert.senderDevice,
                body: newAlert.message,
                id: new Date().getTime(),
                schedule: { at: new Date(Date.now() + 1000) },
              }
            ]
          }).catch(e => console.warn('Push not supported', e));
        });
      }

      setActiveAlert(newAlert);
    });

    return () => unsub();
  }, [user]);

  const handleAcknowledge = async () => {
    if (!activeAlert) return;
    
    const uid = getEffectiveUid(user);
    const alertRef = doc(db, 'artifacts', 'diacontrolapp', 'users', uid, 'alerts', activeAlert.id);
    
    // Optymistycznie zamykamy okno u siebie
    setActiveAlert(null);
    
    await updateDoc(alertRef, {
      acknowledged: true,
      acknowledgedAt: Date.now()
    });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'insulin': return <Pill className="text-indigo-500 w-16 h-16" />;
      case 'food': return <AlertCircle className="text-amber-500 w-16 h-16" />;
      case 'urgent': return <AlertTriangle className="text-rose-500 w-16 h-16 animate-pulse" />;
      default: return <MessageCircle className="text-sky-500 w-16 h-16" />;
    }
  };

  return (
    <AnimatePresence>
      {activeAlert && (
        <div className="fixed inset-0 pt-safe pb-safe z-[9999] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col items-center p-8 border border-white/20 dark:border-white/5 overflow-hidden relative"
          >
            {/* Animowane tło falujące */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-100 dark:to-slate-800/50 opacity-50" />
            
            <div className="relative z-10 flex flex-col items-center text-center w-full">
              <div className="mb-6 p-4 rounded-full bg-slate-50 dark:bg-slate-800 shadow-inner">
                {getAlertIcon(activeAlert.type)}
              </div>
              
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
                
                                              {t('auto.wiadomość_z', { defaultValue: i18n.t('auto.wiadomosc_z', { defaultValue: "Wiadomość z:" }) })} {activeAlert.senderDevice}
              </span>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-snug mb-8">
                {activeAlert.message}
              </h2>

              <button
                onClick={handleAcknowledge}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black text-lg py-5 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={24} />
                
                                              {t('auto.zrozumiałem', { defaultValue: i18n.t('auto.zrozumialem', { defaultValue: "ZROZUMIAŁEM" }) })}
                                            </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

