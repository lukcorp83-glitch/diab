import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Share2, Download, X, Copy, Check, Users, Link as LinkIcon, Unlink } from 'lucide-react';
import { UserSettings } from '../types';

export default function SettingsSync({ user, settings, onImport }: { user: any, settings: UserSettings, onImport: (s: UserSettings) => void }) {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');

  const [linkedUid, setLinkedUid] = useState<string | null>(localStorage.getItem('diacontrol_linked_uid'));

  // Payload for pairing OR settings
  const qrPayload = JSON.stringify({
    action: 'pair',
    uid: getEffectiveUid(user),
    settings: settings // also pass settings if they want
  });

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
    try {
      const parsed = JSON.parse(textValue || importText);
      if (parsed.action === 'pair' && parsed.uid) {
         if (parsed.uid === getEffectiveUid(user)) {
           alert('Nie możesz sparować konta ze sobą samym.');
           return;
         }
         localStorage.setItem('diacontrol_linked_uid', parsed.uid);
         alert('Połączono pomyślnie z danymi małżonka/dziecka! Aplikacja zostanie przeładowana.');
         window.location.reload();
      } else if (parsed && typeof parsed === 'object') {
        // legacy settings import
        onImport(parsed);
        setShowImport(false);
        setImportText('');
        alert('Zaimportowano ustawienia pomyślnie!');
      } else {
        alert('Nieprawidłowy format danych.');
      }
    } catch (e) {
      alert('Nie udało się odczytać kodu. Upewnij się, że to kod generowany przez aplikację GlikoControl.');
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Users className="text-indigo-500" size={20} />
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
            className="flex-1 bg-indigo-500 text-white rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            <Share2 size={14} /> Pokaż QR
          </button>
          <button 
            onClick={() => setShowImport(true)}
            className="flex-1 bg-white dark:bg-slate-900 text-indigo-500 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            <Download size={14} /> Zeskanuj QR
          </button>
        </div>
      )}

      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 w-full max-w-sm flex flex-col items-center relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowExport(false)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
              <X size={20} />
            </button>
            <h3 className="text-sm font-black dark:text-white mb-2">Sparuj Konto</h3>
            <p className="text-xs text-slate-500 text-center mb-6 px-4">
              Zeskanuj ten kod na drugim telefonie używając opcji "Zeskanuj QR".
            </p>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 w-64 h-64 flex justify-center items-center">
              <QRCode value={qrPayload} size={224} />
            </div>
            <button 
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs active:scale-95 transition-all"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />} 
              {copied ? 'Skopiowano!' : 'Kopiuj jako tekst'}
            </button>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 w-full max-w-sm flex flex-col items-center relative animate-in fade-in zoom-in duration-200 my-auto">
            <button onClick={() => setShowImport(false)} className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
              <X size={20} />
            </button>
            <h3 className="text-sm font-black dark:text-white mb-2">Skaner Parowania</h3>
            <p className="text-xs text-slate-500 text-center mb-4 px-4">Nakieruj obiektyw na kod QR na pierwszym telefonie.</p>
            
            <div className="w-full rounded-2xl overflow-hidden border-2 border-indigo-500/30 mb-4 bg-black relative">
              <QrScanner 
                onResult={(res) => {
                  setImportText(res);
                  handleImportText(res);
                }} 
              />
            </div>
            
            <div className="w-full mt-2">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2 pl-2">Albo wklej skopiowany kod tekstowy:</p>
              <textarea 
                className="w-full h-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 flex text-xs outline-none rounded-xl dark:text-white"
                placeholder='Wklej kod parowania...'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <button 
                onClick={() => handleImportText()}
                className="w-full mt-2 bg-indigo-500 text-white rounded-xl py-3 font-black text-[10px] uppercase tracking-widest"
              >
                Połącz Konta
              </button>
            </div>
          </div>
        </div>
      )}
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
