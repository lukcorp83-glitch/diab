import React from 'react';
import { motion } from 'framer-motion';

// Wariany animacji dla kontenerów i dzieci (sekwencjonowanie)
const containerVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 20,
      staggerChildren: 0.3, // Opóźnienie między rysowaniem łuku a wpadnięciem strzałki
      delayChildren: 0.5   // Główne opóźnienie startu
    }
  }
};

const arcVariants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { 
    pathLength: 1, 
    opacity: 1,
    transition: {
      duration: 1.2, 
      ease: "easeInOut"
    }
  }
};

const arrowVariants = {
  initial: { y: 20, x: -10, scale: 0.8, opacity: 0 },
  animate: { 
    y: 0, 
    x: 0, 
    scale: 1, 
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 180,
      damping: 15 // Lekkie odbicie
    }
  }
};

const textVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      delay: 1.8 // Pojawia się po całej animacji logo
    }
  }
};

const GlikoControlLogo = () => {
  return (
    <div style={containerStyle}>
      
      {/* 1. Tło i Baza z animacją wejścia */}
      <motion.div 
        className="logo-base"
        style={logoBaseStyle}
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        <svg viewBox="0 0 100 100" style={{ width: '80%', height: '80%' }}>
          <defs>
            {/* Gradient fioletowo-różowy z wideo */}
            <linearGradient id="gliko-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8E24AA" />
              <stop offset="100%" stopColor="#D81B60" />
            </linearGradient>
          </defs>

          {/* 2. Rysujący się skomplikowany Łuk 'G' */}
          {/* Używamy path, a nie circle, żeby odwzorować dokładny kształt */}
          <motion.path
            d="M 15 50 a 35 35 0 1 1 5 18" // Trzeba dopasować dokładne współrzędne 'G'
            stroke="url(#gliko-grad)"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            variants={arcVariants}
          />

          {/* 3. Wpadający Grot z fizyką odbicia */}
          <motion.path 
            d="M 35 55 L 50 40 L 65 55" // Dokładne współrzędne grota
            stroke="white" 
            strokeWidth="10" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            variants={arrowVariants}
          />
        </svg>
      </motion.div>

      {/* 4. Pojawiający się tekst na końcu */}
      <motion.div 
        style={textStyle}
        variants={textVariants}
        initial="initial"
        animate="animate"
      >
        POWERED BY GLIKOSENSE
      </motion.div>
    </div>
  );
};

// --- Style ---
const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  backgroundColor: '#0f172a', /* Zmiana na ciemne tło (slate-900) dopasowane do aplikacji */
  height: '100vh', padding: '20px'
};

const logoBaseStyle: React.CSSProperties = {
  width: '180px', height: '180px',
  backgroundColor: '#1e293b', /* Ciemniejsza baza na tle slate-800 */
  borderRadius: '40px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
};

const textStyle: React.CSSProperties = {
  marginTop: '32px', fontFamily: 'Inter, sans-serif',
  fontWeight: 700, letterSpacing: '2px', color: '#94a3b8', fontSize: '14px'
};

export default GlikoControlLogo;
