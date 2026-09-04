import React, { useEffect } from 'react';
import './LogoAnimation.css';
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Haptics } from '../lib/haptics';

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
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } 
      }}
      className="logo-container fixed inset-0 z-[9999] bg-[#f4f5f7] dark:bg-[#020617] flex flex-col items-center justify-center select-none overflow-hidden pointer-events-none"
    >
      {/* 1. Logo - przelot i skalowanie dokładnie na pozycję w nagłówku */}
      <motion.div 
        layoutId="app-brand-logo"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ 
          scale: 0.32,
          x: "calc(-50vw + 42px)",
          y: "calc(-50vh + 58px)",
          opacity: 0.95,
          transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } 
        }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="logo-box relative shadow-xl"
      >
        <svg viewBox="0 0 100 100" className="logo-svg w-[80px] h-[80px]">
          <defs>
            <linearGradient id="gliko-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>

          {/* 2. Rysujący się pierścień (Circular Arc) */}
          <path 
            d="M 60,15 A 35,35 0 1 0 85,50" 
            stroke="url(#gliko-grad)" 
            strokeWidth="12" 
            fill="none" 
            strokeLinecap="round" 
            className="animated-arc"
          />

          {/* 3. Wpadający od dołu grot (Arrowhead) */}
          <path 
            d="M35,55 L50,40 L65,55" 
            stroke="white" 
            strokeWidth="9" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="animated-arrow"
          />
        </svg>
      </motion.div>

      {/* 4. Pojawiający się tekst pod spodem */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="logo-text text-slate-500 dark:text-slate-400 mt-6 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        {t('auto.powered_by_glikosense', { defaultValue: 'POWERED BY GLIKOSENSE' })}
      </motion.div>
    </motion.div>
  );
};

export default GlikoControlLogo;
