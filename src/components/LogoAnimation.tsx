import React, { useEffect } from 'react';
import './LogoAnimation.css';
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Haptics } from '../lib/haptics';
import { APP_VERSION } from '../constants';

const GlikoControlLogo = () => {
  const { t } = useTranslation();

  useEffect(() => {
    try {
      Haptics.light();
    } catch (e) {}
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        scale: 1.05,
        filter: 'blur(10px)',
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } 
      }}
      className="splash-container"
    >
      {/* 1. Tło z pulsującą aurą świetlną */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.15, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="splash-glow"
      />

      {/* 2. Główny Squircle z Logo */}
      <motion.div 
        initial={{ scale: 0.65, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 22 }}
        className="splash-logo-card z-10"
      >
        <div className="splash-ripple" />

        <svg viewBox="0 0 100 100" className="w-[74px] h-[74px] relative z-10">
          <defs>
            <linearGradient id="gliko-splash-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="45%" stopColor="#8b5cf6" />
              <stop offset="85%" stopColor="#d946ef" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <filter id="splash-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#8b5cf6" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Rysujący się pierścień (Circular Arc) */}
          <path 
            d="M 60,15 A 35,35 0 1 0 85,50" 
            stroke="url(#gliko-splash-grad)" 
            strokeWidth="13" 
            fill="none" 
            strokeLinecap="round" 
            filter="url(#splash-glow-filter)"
            className="splash-arc"
          />

          {/* Wpadający od dołu grot (Arrowhead) */}
          <path 
            d="M 36,54 L 50,40 L 64,54" 
            stroke="white" 
            strokeWidth="10" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="splash-arrow"
          />
        </svg>
      </motion.div>

      {/* 3. Nazwa Aplikacji & Podtytuł */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 flex flex-col items-center z-10"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
            Gliko<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">Control</span>
          </span>
        </div>

        {/* Badge POWERED BY GLIKOSENSE */}
        <div className="mt-2 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/60 dark:bg-white/5 border border-slate-300/40 dark:border-white/10 shadow-sm backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 font-mono">
            {t('auto.powered_by_glikosense', { defaultValue: 'POWERED BY GLIKOSENSE' })}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GlikoControlLogo;
