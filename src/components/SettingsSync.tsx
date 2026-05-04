import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Share2, Download, X, Copy, Check, Users, Link as LinkIcon, Unlink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSettings } from '../types';

export default function SettingsSync({ user, settings, onImport }: { user: any, settings: UserSettings, onImport: (s: UserSettings) => void }) {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');

  const [linkedUid, setLinkedUid] = useState<string | null>(localStorage.getItem('diacontrol_linked_uid'));

  const [qrPayload, setQrPayload] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(Number(localStorage.getItem('pairing_failed_attempts') || 0));
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const blockUntil = Number(localStorage.getItem('pairing_block_until') || 0);
    if (blockUntil > Date.now()) {
      setIsBlocked(true);
      const remaining = blockUntil - Date.now();
      setTimeout(() => setIsBlocked(false), remaining);
    }
  }, []);

  // Refresh payload when showing export to reset timestamp
  useEffect(() => {
    if (showExport) {
      setQrPayload(JSON.stringify({
        action: 'pair',
        uid: getEffectiveUid(user),
        ts: Date.now(),
        settings: settings 
      }));
    }
  }, [showExport, user, settings]);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlink = () => {
    if (confirm('Czy na pewno chcesz odłączyć swoje urządzenie i powrócić do swojego pustego profilu?')) {
      localStorage.removeItem('diacontrol_linked_uid');
      window.location.reload();
    }
  };

  const handleImportText = (textValue?: string) => {
    const now = Date.now();
    const blockUntil = Number(localStorage.getItem('pairing_block_until') || 0);

    if (now < blockUntil) {
      alert(`Przekroczono limit prób. Spróbuj ponownie za chwilę.`);
      return;
    }

    try {
      const parsed = JSON.parse(textValue || importText);
      
      // Check expiration if timestamp exists
      if (parsed.action === 'pair' && parsed.ts) {
        const age = now - parsed.ts;
        if (age > 5 * 60 * 1000) { // 5 minutes
          alert('Ten kod parowania wygasł. Wygeneruj nowy kod na drugim urządzeniu.');
          return;
        }
      }

      if (parsed.action === 'pair' && parsed.uid) {
         if (parsed.uid === getEffectiveUid(user)) {
           alert('Nie możesz sparować konta ze sobą samym.');
           return;
         }
         
         // SUCCESS
         localStorage.removeItem('pairing_failed_attempts');
         localStorage.removeItem('pairing_block_until');
         localStorage.setItem('diacontrol_linked_uid', parsed.uid);
         alert('Połączono pomyślnie! Aplikacja zostanie przeładowana.');
         window.location.reload();
      } else if (parsed && typeof parsed === 'object') {
        // legacy settings import
        onImport(parsed);
        setShowImport(false);
        setImportText('');
        alert('Zaimportowano ustawienia pomyślnie!');
      } else {
        throw new Error('Invalid format');
      }
    } catch (e) {
      const newCount = failedAttempts + 1;
      setFailedAttempts(newCount);
      localStorage.setItem('pairing_failed_attempts', newCount.toString());

      if (newCount >= 5) {
        const lockoutTime = 5 * 60 * 1000; // 5 mins lockout
        localStorage.setItem('pairing_block_until', (now + lockoutTime).toString());
        setIsBlocked(true);
        setTimeout(() => setIsBlocked(false), lockoutTime);
        alert('Zbyt wiele nieudanych prób. Możliwość parowania zablokowana na 5 minut.');
      } else {
        alert(`Nieprawidłowy kod. Pozostało prób: ${5 - newCount}`);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Users className="text-accent-500" size={20} />
          <span className="text-xs font-bold dark:text-white">Rodzina / Parowanie</span>
        </div>
        {linkedUid && (
          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded-full flex items-center gap-1"><LinkIcon size={10} /> Sparowano</span>
        )}
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mb-2">
        Spraw, aby drugi rodzic lub bliska osoba widziała i dodawała dokładnie te same dane (Posiłki, Insulina, Cukry dziecka).
      </p>

      {linkedUid ? (
        <button 
          onClick={handleUnlink}
          className="w-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-900 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all mt-2"
        >
          <Unlink size={14} /> Odłącz Konto
        </button>
      ) : (
        <div className="flex gap-2">
          <button 
            onClick={() => setShowExport(true)}
            className="flex-1 bg-accent-500 text-white rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            <Share2 size={14} /> Pokaż QR
          </button>
          <button 
            onClick={() => setShowImport(true)}
            className="flex-1 bg-white dark:bg-slate-900 text-accent-500 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            <Download size={14} /> Zeskanuj QR
          </button>
        </div>
      )}

      <AnimatePresence>
      {showExport && (
        <motion.div 
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
        >
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-slate-50 dark:bg-slate-900 rounded-[3rem] p-8 pb-12 w-full max-w-sm flex flex-col items-center relative shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform"
          >
            <button onClick={() => setShowExport(false)} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-black dark:text-white mb-2 self-start">Sparuj Konto</h3>
            <p className="text-xs text-slate-500 mb-6 self-start">
              Zeskanuj ten kod na drugim telefonie używając opcji "Zeskanuj QR".
            </p>
            <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 mb-6 w-full flex justify-center items-center aspect-square">
            <QRCode value={qrPayload} style={{ width: "100%", height: "100%" }} />
            </div>
            <p className="text-[10px] text-rose-500 font-bold mb-4 animate-pulse">Kod wygaśnie za 5 minut</p>
            <button 
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-4 bg-accent-600 text-white rounded-[2rem] font-black text-[12px] uppercase active:scale-95 transition-all shadow-xl"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />} 
              {copied ? 'Skopiowano!' : 'Kopiuj jako tekst'}
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showImport && (
        <motion.div 
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 overflow-y-auto"
        >
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-slate-50 dark:bg-slate-900 rounded-[3rem] p-8 pb-12 w-full max-w-sm flex flex-col items-center relative shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform my-auto"
          >
            <button onClick={() => setShowImport(false)} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-black dark:text-white mb-2 self-start">Skaner Parowania</h3>
            <p className="text-xs text-slate-500 mb-6 self-start">Nakieruj obiektyw na kod QR na pierwszym telefonie.</p>
            
            <div className="w-full rounded-[2rem] overflow-hidden border-2 border-accent-500/30 mb-6 bg-black relative aspect-square">
              <QrScanner 
                onResult={(res) => {
                  setImportText(res);
                  handleImportText(res);
                }} 
              />
            </div>
            
            <div className="w-full">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-3 pl-2">Albo wklej skopiowany kod tekstowy:</p>
              <textarea 
                className="w-full h-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 flex text-xs outline-none rounded-[2rem] dark:text-white focus:border-accent-500 transition-colors"
                placeholder='Wklej kod parowania...'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <button 
                onClick={() => handleImportText()}
                disabled={isBlocked}
                className={`w-full mt-4 flex items-center justify-center gap-2 rounded-[2rem] py-4 font-black text-[12px] uppercase tracking-widest transition-all shadow-xl ${isBlocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-accent-600 text-white hover:bg-accent-700 active:scale-95'}`}
              >
                {isBlocked ? 'Blokada czasowa...' : 'Połącz Konta'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

function QrScanner({ onResult }: { onResult: (res: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner('reader-qr', { fps: 10, qrbox: 250, aspectRatio: 1.0 }, false);
        scanner.render((result) => {
          scanner.clear();
          onResult(result);
        }, (err) => {
          // ignore scan errors
        });
        
        return () => {
          scanner.clear().catch(e => console.error(e));
        };
      } catch (e) {
        console.error("QR scanner error: ", e);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return <div id="reader-qr" className="w-full h-64 bg-black flex items-center justify-center text-white text-xs">Ładowanie aparatu...</div>;
}
