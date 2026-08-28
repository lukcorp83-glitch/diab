import React, { useState, useEffect } from 'react';
import QRCode from "react-qr-code";
import { motion } from "motion/react";
import { Clock, ShieldCheck, Zap } from 'lucide-react';
import Logo from './Logo';

interface ModernQRCardProps {
  value: string;
  expirySeconds?: number;
  onExpire?: () => void;
}

export default function ModernQRCard({
  value,
  expirySeconds = 300,
  onExpire
}: ModernQRCardProps) {
  const [timeLeft, setTimeLeft] = useState(expirySeconds);

  useEffect(() => {
    setTimeLeft(expirySeconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [expirySeconds, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Glow & QR Container */}
      <div className="relative p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border-2 border-indigo-500/20 dark:border-indigo-500/30 flex items-center justify-center aspect-square w-full max-w-[280px] my-2 overflow-hidden group">
        
        {/* Animated Background Pulse */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-pink-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 pointer-events-none" />
        
        {/* Android Corner Scan Brackets */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t-3 border-l-3 border-indigo-500 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-3 right-3 w-5 h-5 border-t-3 border-r-3 border-indigo-500 rounded-tr-xl pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-3 border-l-3 border-indigo-500 rounded-bl-xl pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-3 border-r-3 border-indigo-500 rounded-br-xl pointer-events-none" />

        {/* QR Code itself */}
        <div className="relative z-10 w-full h-full p-2 bg-white rounded-2xl flex items-center justify-center shadow-inner">
          <QRCode
            value={value}
            level="H" // High error correction so center logo doesn't disrupt scanning
            style={{ width: "100%", height: "100%" }}
            fgColor="#0f172a"
            bgColor="#ffffff"
          />

          {/* Central Logo Badge (Like Android Quick Share) */}
          <div className="absolute inset-0 m-auto w-12 h-12 bg-white dark:bg-slate-900 rounded-full shadow-lg border-2 border-indigo-500 flex items-center justify-center p-1.5 pointer-events-none">
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-inner">
              <Zap size={18} className="fill-amber-300 text-amber-300 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Countdown Timer Pill in Material You style */}
      <motion.div
        animate={{ scale: timeLeft < 60 ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: timeLeft < 60 ? Infinity : 0, duration: 1 }}
        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mt-3 shadow-md border ${
          timeLeft < 60
            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
            : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
        }`}
      >
        <Clock size={13} className={timeLeft < 60 ? "animate-spin" : ""} />
        <span>{timeLeft > 0 ? `Wygasa za ${formattedTime}` : "Kod wygasł"}</span>
      </motion.div>
    </div>
  );
}
