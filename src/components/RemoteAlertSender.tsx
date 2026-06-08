import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getEffectiveUid } from '../lib/utils';
import { Send, AlertTriangle, Pill, Apple, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function RemoteAlertSender({ user }: { user: any }) {
  const [loading, setLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const sendAlert = async (message: string, type: 'insulin' | 'food' | 'urgent' | 'custom') => {
    const uid = getEffectiveUid(user);
    if (!uid) {
      toast.error('Brak powiązanego konta UID.');
      return;
    }

    setLoading(true);
    try {
      const newAlertRef = doc(collection(db, 'artifacts', 'diacontrolapp', 'users', uid, 'alerts'));
      
      // Ustalamy przyjazną nazwę urządzenia wysyłającego
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const senderName = isMobile ? 'Telefon (Rodzic)' : 'Komputer (Rodzic)';

      await setDoc(newAlertRef, {
        message,
        type,
        createdAt: Date.now(),
        senderDevice: senderName,
        acknowledged: false
      });

      toast.success('Alert wysłany na sparowane urządzenia!');
      if (type === 'custom') setCustomMessage('');
    } catch (e) {
      console.error(e);
      toast.error('Nie udało się wysłać alertu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 glass-target mt-4">
      <div className="flex items-center gap-2 mb-1">
        <Send className="text-indigo-500" size={20} />
        <span className="text-sm font-black dark:text-white uppercase tracking-widest text-indigo-500">Gliko Family</span>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mb-2">
        Wyślij pełnoekranowy alert dźwiękowy na wszystkie sparowane telefony (np. do dziecka).
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => sendAlert('Podaj 1 jednostkę insuliny!', 'insulin')}
          disabled={loading}
          className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          <Pill size={24} />
          <span className="text-[9px] font-black uppercase text-center">Podaj 1j<br/>Insuliny</span>
        </button>

        <button
          onClick={() => sendAlert('Zjedz szybko 10g węglowodanów!', 'food')}
          disabled={loading}
          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          <Apple size={24} />
          <span className="text-[9px] font-black uppercase text-center">Zjedz coś<br/>Szybko</span>
        </button>
      </div>

      <div className="flex gap-2 mt-2">
        <input 
          type="text" 
          value={customMessage}
          onChange={e => setCustomMessage(e.target.value)}
          placeholder="Własna wiadomość..."
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-all"
        />
        <button
          onClick={() => sendAlert(customMessage, 'custom')}
          disabled={loading || !customMessage.trim()}
          className="bg-indigo-500 hover:bg-indigo-400 text-white p-2 px-4 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <AlertTriangle size={18} />}
        </button>
      </div>
    </div>
  );
}
