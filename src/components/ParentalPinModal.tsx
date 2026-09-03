import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, CheckCircle2, ShieldAlert, KeyRound } from 'lucide-react';
import { Haptics } from '../lib/haptics';
import { useBackButton } from '../hooks/useBackButton';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface PinRequestDetail {
  title?: string;
  description?: string;
  actionName?: string;
  savedPin?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ParentalPinModal() {
  const { t } = useTranslation();
  const [request, setRequest] = useState<PinRequestDetail | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Obsługa sprzętowego przycisku wstecz Androida
  useBackButton(!!request, () => handleClose());

  useEffect(() => {
    const handleRequest = (e: any) => {
      if (e.detail) {
        setRequest(e.detail);
        setEnteredPin('');
        setErrorShake(false);
        Haptics.light();
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    };

    window.addEventListener('request_parental_pin', handleRequest);
    return () => window.removeEventListener('request_parental_pin', handleRequest);
  }, []);

  const handleClose = () => {
    if (request?.onCancel) {
      request.onCancel();
    }
    setRequest(null);
    setEnteredPin('');
  };

  const handleKeyPress = (num: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + num;
      setEnteredPin(next);
      Haptics.selection();
      if (next.length === 4) {
        verifyPin(next);
      }
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
      Haptics.light();
    }
  };

  const verifyPin = (pinToTest: string) => {
    const targetPin = request?.savedPin || '1234';
    if (pinToTest === targetPin) {
      Haptics.notification();
      toast.success(t('auto.autoryzacja_pomyslna', { defaultValue: 'Autoryzacja pomyślna!' }));
      if (request?.onSuccess) {
        request.onSuccess();
      }
      setRequest(null);
      setEnteredPin('');
    } else {
      Haptics.error();
      setErrorShake(true);
      toast.error(t('auto.nieprawidlowy_pin_rodzica', { defaultValue: 'Nieprawidłowy kod PIN rodzica' }));
      setTimeout(() => {
        setEnteredPin('');
        setErrorShake(false);
      }, 600);
    }
  };

  if (!request) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center relative overflow-hidden ${
            errorShake ? 'animate-shake' : ''
          }`}
        >
          {/* Przycisk zamknięcia */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Zamknij"
          >
            <X size={20} />
          </button>

          {/* Ikona kłódki */}
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
            <Lock size={28} />
          </div>

          <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
            {request.title || t('auto.wymagana_autoryzacja', { defaultValue: 'Wymagana Autoryzacja Rodzica' })}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6 leading-relaxed">
            {request.description || t('auto.podaj_pin_rodzica_opis', { defaultValue: 'Podaj 4-cyfrowy kod PIN rodzica, aby odblokować tę akcję.' })}
          </p>

          {/* Kropki PIN */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = enteredPin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    isFilled
                      ? 'bg-indigo-500 scale-110 shadow-md shadow-indigo-500/30'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              );
            })}
          </div>

          {/* Klawiatura numeryczna */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-lg font-black text-slate-800 dark:text-white flex items-center justify-center shadow-sm"
              >
                {num}
              </button>
            ))}
            <div />
            <button
              onClick={() => handleKeyPress('0')}
              className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-lg font-black text-slate-800 dark:text-white flex items-center justify-center shadow-sm"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 active:scale-95 transition-all text-sm font-bold text-rose-500 flex items-center justify-center shadow-sm"
              title="Usuń"
            >
              ⌫
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
