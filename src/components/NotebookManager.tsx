import { toast } from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Book, X, Plus, Trash, Clock, Save, Bell } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { getEffectiveUid } from '../lib/utils';
import { cn } from '../lib/utils';
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

interface Note {
  id: string;
  content: string;
  reminderDate: string; // ISO string 
  createdAt?: number;
}

export default function NotebookManager({ user }: { user: any }) {
    const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newContent, setNewContent] = useState('');
  const [newReminder, setNewReminder] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = getEffectiveUid(user);
    const q = query(
      collection(db, 'artifacts', 'diacontrolapp', 'users', uid, 'notebook'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const arr: Note[] = [];
      snapshot.forEach(d => {
        arr.push({ id: d.id, ...d.data() } as Note);
      });
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotes(arr);
    });
    return () => unsub();
  }, [user]);

  // Check reminders (very basic checker)
  useEffect(() => {
    const interval = setInterval(() => {
      if (notes.length === 0) return;
      const now = new Date();
      notes.forEach(n => {
        if (n.reminderDate) {
          const d = new Date(n.reminderDate);
          if (now.getTime() >= d.getTime()) { 
             
             if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
             
             toast(`Przypomnienie: ${n.content}`, { 
                icon: '🔔', 
                duration: 25000, 
                position: 'top-center',
                style: { border: '2px solid #3b82f6', padding: '16px', color: '#1e293b', fontWeight: 'bold' } 
             });

             const apkPref = localStorage.getItem('apkSystemNotificationsEnabled');
             if (apkPref !== 'false' && 'Notification' in window && Notification.permission === 'granted') {
               try {
                 navigator.serviceWorker.ready.then(reg => {
                   if (reg) {
                     reg.showNotification('GlikoControl Przypomnienie', {
                       body: n.content,
                       icon: `${import.meta.env.BASE_URL}pwa-icon.svg`.replace(/\/+/g, '/'),
                       vibrate: [200, 100, 200, 100, 200],
                       tag: 'glikocontrol-reminder',
                       requireInteraction: true
                     } as any);
                   } else {
                     new window.Notification('GlikoControl Przypomnienie', { body: n.content });
                   }
                 }).catch(() => {
                   new window.Notification('GlikoControl Przypomnienie', { body: n.content });
                 });
               } catch(e) {
                 try { new window.Notification('GlikoControl Przypomnienie', { body: n.content }); } catch(err) {}
               }
             }
             
             // Optional: remove reminder after showing
             if (user) {
                const uid = getEffectiveUid(user);
                updateDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', uid, 'notebook', n.id), { reminderDate: '' });
             }
          }
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [notes, user]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Notification) {
      if (window.Notification.permission !== 'granted' && window.Notification.permission !== 'denied') {
        window.Notification.requestPermission();
      }
    }
  }, []);

  const addNote = async () => {
    if (!newContent.trim() || !user) return;
    setIsAdding(true);
    try {
      const uid = getEffectiveUid(user);
      await addDoc(collection(db, 'artifacts', 'diacontrolapp', 'users', uid, 'notebook'), {
        content: newContent.trim(),
        reminderDate: newReminder,
        createdAt: Date.now()
      });
      setNewContent('');
      setNewReminder('');
      setIsAdding(false);
    } catch (e) {
      console.error(e);
      setIsAdding(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;
    try {
      const uid = getEffectiveUid(user);
      await deleteDoc(doc(db, 'artifacts', 'diacontrolapp', 'users', uid, 'notebook', id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-blue-400 border border-transparent dark:border-slate-700 transition-all hover:scale-105 active:scale-95"
      >
        <Book size={18} />
        {notes.some(n => !!n.reminderDate) && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-slate-100 dark:border-slate-800"></span>
        )}
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 pt-safe pb-safe z-[100] flex items-center justify-center bg-white dark:bg-slate-950 sm:p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full h-full sm:h-[90vh] sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl relative z-10 sm:border border-slate-200 dark:border-slate-800 flex flex-col pt-safe pb-safe glass-target"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                <Book className="text-blue-500" size={20} />  {t('auto.mój_notatnik', { defaultValue: i18n.t('auto.moj_notatnik', { defaultValue: "Mój Notatnik" }) })}
                                        </h3>
              <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 shadow-sm rounded-full transition-colors active:scale-90">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div>
                    <textarea 
                      placeholder={t('auto.nowa_notatka_lub_wpis', { defaultValue: 'Nowa notatka lub wpis...' })}
                      value={newContent}
                      onChange={e => setNewContent(e.target.value)}
                      className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium dark:text-white resize-none min-h-[100px] shadow-sm transition-all"
                    />
                  </div>
                  <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1 mb-1.5 flex items-center gap-1.5">
                    <Clock size={12} />
                    
                                              {t('auto.ustaw_przypomnienie', { defaultValue: 'Ustaw przypomnienie' })}
                                            </div>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="datetime-local"
                          value={newReminder}
                          onChange={e => setNewReminder(e.target.value)}
                          className="w-full pl-11 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500 text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm transition-all"
                        />
                    </div>
                    <button 
                      onClick={addNote}
                      disabled={isAdding || !newContent.trim()}
                      className="bg-blue-600 text-white px-6 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 transition-all active:scale-95 shadow-md shadow-blue-500/20"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                  {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 mt-4 bg-gradient-to-b from-slate-50/50 to-slate-100/50 dark:from-slate-800/10 dark:to-slate-900/10 rounded-[2.5rem] border-2 border-dashed border-slate-200/60 dark:border-slate-800/60 opacity-90 backdrop-blur-sm mx-2">
                        <div className="w-16 h-16 rounded-[2rem] bg-indigo-50/50 dark:bg-indigo-900/20 flex items-center justify-center mb-4 shadow-inner ring-1 ring-indigo-100 dark:ring-indigo-800/50">
                          <Book size={24} className="text-indigo-400 dark:text-indigo-400/80" />
                        </div>
                        <p className="text-[11px] font-black text-indigo-400 dark:text-indigo-400/80 uppercase tracking-widest text-center">
                          
                                                            {t('auto.brak_notatek', { defaultValue: 'Brak notatek' })}
                                                          </p>
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-2 text-center max-w-[200px]">
                          
                                                            {t('auto.zapisz_tutaj_ważne_informacje_dla_l', { defaultValue: i18n.t('auto.zapisz_tutaj_wazne_inform', { defaultValue: "Zapisz tutaj ważne informacje dla lekarza lub na przyszłość." }) })}
                                                          </p>
                    </div>
                  ) : (
                    notes.map(note => (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={note.id} className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative group glass-target">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap pr-8 leading-relaxed">{note.content}</p>
                        
                        {note.reminderDate && (
                          <div className="flex items-center gap-1.5 mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 w-fit px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                            <Bell size={12} />
                            
                                                                {t('auto.przypomnienie', { defaultValue: 'Przypomnienie:' })} {new Date(note.reminderDate).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                          </div>
                        )}
                        
                        <button 
                          onClick={() => deleteNote(note.id)}
                          className="absolute top-4 right-4 p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all sm:opacity-0 group-hover:opacity-100"
                        >
                          <Trash size={16} />
                        </button>
                        
                        {note.createdAt && (
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-4 tracking-wider">
                            
                                                                {t('auto.utworzono', { defaultValue: 'Utworzono:' })} {new Date(note.createdAt).toLocaleDateString()}
                          </div>
                        )}
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

