import { useAuthStore } from '../stores/useAuthStore';
import { toast } from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Book, X, Plus, Trash2, Clock, Bell, CheckCircle2, Calendar } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useNotebooks, Note } from '../hooks/queries/useNotebooks';
import { getEffectiveUid, cn } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { Haptics } from '../lib/haptics';
import { Capacitor } from '@capacitor/core';

// Pomocniczy generator numerycznego ID dla powiadomień
const generateNotifId = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 1000000);
};

export default function NotebookManager() {
  const user = useAuthStore(state => state.user);
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { data: notes = [], isLoading } = useNotebooks(user);
  const [newContent, setNewContent] = useState('');
  const [newReminder, setNewReminder] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Sprawdzanie przypomnień w czasie rzeczywistym
  useEffect(() => {
    const checkReminders = async () => {
      if (!notes || notes.length === 0) return;
      const now = Date.now();
      const notifiedNotes = JSON.parse(localStorage.getItem('notebook_notified_notes') || '[]');

      for (const n of notes) {
        if (n.reminderDate) {
          const reminderTime = new Date(n.reminderDate).getTime();
          // Jeśli przypomnienie ma nadejść teraz lub minęło mniej niż 15 minut temu
          if (now >= reminderTime && now - reminderTime < 15 * 60 * 1000 && !notifiedNotes.includes(n.id)) {
            
            Haptics.heavy();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);

            toast(`🔔 Przypomnienie: ${n.content}`, {
              icon: '📝',
              duration: 15000,
              position: 'top-center',
              style: {
                borderRadius: '1.25rem',
                background: '#1e1b4b',
                color: '#fff',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                fontWeight: 'bold',
                fontSize: '13px'
              }
            });

            // Native Android / Web notification
            if (Capacitor.isNativePlatform()) {
              try {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                await LocalNotifications.schedule({
                  notifications: [{
                    title: 'GlikoControl • Przypomnienie',
                    body: n.content,
                    id: generateNotifId(n.id),
                    schedule: { at: new Date() },
                    sound: 'default'
                  }]
                });
              } catch(e) {
                console.warn("[Notebook] Native notification error:", e);
              }
            } else if ('Notification' in window && Notification.permission === 'granted') {
              try {
                navigator.serviceWorker.ready.then(reg => {
                  if (reg) {
                    reg.showNotification('GlikoControl • Przypomnienie', {
                      body: n.content,
                      icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/'),
                      vibrate: [200, 100, 200]
                    } as any);
                  } else {
                    new Notification('GlikoControl • Przypomnienie', { body: n.content });
                  }
                }).catch(() => {
                  new Notification('GlikoControl • Przypomnienie', { body: n.content });
                });
              } catch(e) {}
            }

            notifiedNotes.push(n.id);
            localStorage.setItem('notebook_notified_notes', JSON.stringify(notifiedNotes));

            if (user) {
              const uid = getEffectiveUid(user);
              updateDoc(doc(db, 'users', uid, 'notebook', n.id), { reminderDate: '' }).catch(() => {});
            }
          }
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [notes, user]);

  const addNote = async () => {
    if (!newContent.trim() || !user) return;
    setIsAdding(true);
    Haptics.medium();

    try {
      const uid = getEffectiveUid(user);
      const docRef = await addDoc(collection(db, 'users', uid, 'notebook'), {
        content: newContent.trim(),
        reminderDate: newReminder || '',
        createdAt: Date.now()
      });

      // Zaplanuj powiadomienie z wyprzedzeniem na Androidzie, jeśli wybrano datę
      if (newReminder && Capacitor.isNativePlatform()) {
        try {
          const reminderDateObj = new Date(newReminder);
          if (reminderDateObj.getTime() > Date.now()) {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            await LocalNotifications.schedule({
              notifications: [{
                title: 'GlikoControl • Przypomnienie',
                body: newContent.trim(),
                id: generateNotifId(docRef.id),
                schedule: { at: reminderDateObj },
                sound: 'default'
              }]
            });
          }
        } catch(e) {
          console.warn("[Notebook] Failed to schedule future native reminder", e);
        }
      }

      setNewContent('');
      setNewReminder('');
      setIsAdding(false);
      toast.success(t('auto.notatka_zapisana', { defaultValue: 'Notatka została zapisana!' }));
    } catch (e) {
      console.error("[Notebook] Error adding note:", e);
      setIsAdding(false);
      toast.error('Błąd zapisu notatki.');
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;
    Haptics.light();

    try {
      const uid = getEffectiveUid(user);
      await deleteDoc(doc(db, 'users', uid, 'notebook', id));

      if (Capacitor.isNativePlatform()) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          await LocalNotifications.cancel({
            notifications: [{ id: generateNotifId(id) }]
          });
        } catch(e) {}
      }

      toast.success(t('auto.notatka_usunieta', { defaultValue: 'Notatka została usunięta.' }));
    } catch (e) {
      console.error("[Notebook] Error deleting note:", e);
      toast.error('Błąd usuwania notatki.');
    }
  };

  return (
    <>
      <button 
        onClick={() => { Haptics.light(); setIsOpen(true); }}
        className="relative p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-blue-400 border border-transparent dark:border-slate-700 transition-all hover:scale-105 active:scale-95 shadow-xs"
        aria-label="Notatnik"
        title={t('auto.moj_notatnik', { defaultValue: 'Mój Notatnik' })}
      >
        <Book size={18} />
        {notes.some(n => !!n.reminderDate) && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse" />
        )}
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 pt-safe pb-safe z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-2 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full h-full sm:h-[88vh] sm:max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl relative z-10 border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-950/60 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                  <Book size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white text-base leading-tight">
                    {t('auto.moj_notatnik', { defaultValue: 'Mój Notatnik' })}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    {notes.length} {t('auto.zapisanych_wpisow', { defaultValue: 'zapisanych wpisów' })}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => { Haptics.light(); setIsOpen(false); }} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-xs rounded-full transition-colors active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formularz dodawania nowej notatki */}
            <div className="p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/70 dark:border-slate-800 shrink-0">
              <textarea 
                placeholder={t('auto.nowa_notatka_lub_wpis', { defaultValue: 'Wpisz treść notatki lub przypomnienia...' })}
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium dark:text-white resize-none min-h-[85px] shadow-xs transition-all placeholder:text-slate-400 placeholder:text-xs"
              />
              
              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input 
                    type="datetime-local"
                    value={newReminder}
                    onChange={e => setNewReminder(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-xs transition-all"
                  />
                </div>
                <button 
                  onClick={addNote}
                  disabled={isAdding || !newContent.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all active:scale-95 shadow-md shadow-blue-500/20 shrink-0 text-xs"
                >
                  <Plus size={16} />
                  <span>{t('auto.dodaj', { defaultValue: 'Dodaj' })}</span>
                </button>
              </div>
            </div>

            {/* Lista notatek */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/30 dark:bg-slate-950/30">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 mt-4 bg-gradient-to-b from-slate-50/50 to-slate-100/50 dark:from-slate-800/10 dark:to-slate-900/10 rounded-[2.5rem] border-2 border-dashed border-slate-200/60 dark:border-slate-800/60 opacity-90 backdrop-blur-sm mx-2">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-3 shadow-inner ring-1 ring-blue-100 dark:ring-blue-900/50">
                    <Book size={22} className="text-blue-500" />
                  </div>
                  <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest text-center">
                    {t('auto.brak_notatek', { defaultValue: 'Brak notatek' })}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 text-center max-w-[200px]">
                    {t('auto.zapisz_tutaj_wazne_inform', { defaultValue: 'Zapisz tutaj ważne informacje dla lekarza lub na przyszłość.' })}
                  </p>
                </div>
              ) : (
                notes.map(note => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    key={note.id} 
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs relative group flex flex-col justify-between gap-2.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs md:text-sm font-medium text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed flex-1">
                        {note.content}
                      </p>
                      
                      {/* Przycisk usuwania - ZAWSZE WIDOCZNY I ŁATWY DO KLIKNIĘCIA */}
                      <button 
                        onClick={() => deleteNote(note.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
                        title={t('auto.usun', { defaultValue: 'Usuń' })}
                        aria-label="Usuń notatkę"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 mt-1">
                      {note.reminderDate ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/50">
                          <Bell size={10} className="shrink-0" />
                          <span>
                            {new Date(note.reminderDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}

                      {note.createdAt && (
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          {new Date(note.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}
