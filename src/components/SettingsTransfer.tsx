import React, { useState } from 'react';
import { Download, Upload, Copy, Check, Info, Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserSettings } from '../types';

export default function SettingsTransfer({ 
  settings, 
  onImport 
}: { 
  settings: UserSettings, 
  onImport: (s: UserSettings) => void 
}) {
  const [loading, setLoading] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const code = generateCode();
      const codeRef = doc(db, 'artifacts', 'diacontrolapp', 'syncCodes', code);
      await setDoc(codeRef, {
        settings,
        createdAt: Date.now()
      });
      setSyncCode(code);
    } catch (e) {
      console.error(e);
      alert('Błąd podczas generowania kodu.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!inputCode || inputCode.length < 6) return;
    setLoading(true);
    try {
      const codeRef = doc(db, 'artifacts', 'diacontrolapp', 'syncCodes', inputCode.toUpperCase());
      const snapshot = await getDoc(codeRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.settings) {
          onImport(data.settings);
          alert('Ustawienia pomyślnie zaimportowane!');
          setInputCode('');
        }
      } else {
        alert('Nieprawidłowy lub wygasły kod.');
      }
    } catch (e) {
      console.error(e);
      alert('Błąd podczas pobierania ustawień.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-2">
        <Upload className="text-accent-500" size={20} />
        <span className="text-xs font-bold dark:text-white">Transfer Ustawień Profli (Chmura)</span>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mb-2">
        Wygeneruj tymczasowy krótki kod, aby przesłać swoje wrażliwe ustawienia (ISF, Cele) na inne urządzenie bez parowania konta.
      </p>

      {syncCode ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Twój kod jednorazowy</span>
          <span className="text-3xl font-black tracking-widest text-accent-500">{syncCode}</span>
          <button 
            onClick={handleCopy}
            className="mt-2 text-xs font-bold text-slate-500 flex items-center gap-1 active:scale-95 transition-all"
          >
            {copied ? <Check size={14} className="text-emerald-500"/> : <Copy size={14} />}
            {copied ? 'Skopiowano' : 'Skopiuj'}
          </button>
        </div>
      ) : (
        <button 
          onClick={handleExport}
          disabled={loading}
          className="w-full bg-accent-500 text-white rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 
          Wygeneruj Kod Transferu
        </button>
      )}

      <div className="mt-2 flex gap-2">
        <input 
          type="text" 
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.toUpperCase())}
          placeholder="np. X9A3K1"
          maxLength={6}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black tracking-widest text-center outline-none focus:border-accent-500 text-slate-700 dark:text-white uppercase transition-all"
        />
        <button 
          onClick={handleImport}
          disabled={loading || inputCode.length < 6}
          className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl px-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
        >
          {loading && inputCode.length >= 6 ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
          Pobierz
        </button>
      </div>
    </div>
  );
}
