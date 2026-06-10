import React from 'react';
import './LogoAnimation.css';

const GlikoControlLogo = () => {
  return (
    <div className="logo-container">
      {/* 1. Ciemnoszary zaokrąglony kwadrat */}
      <div className="logo-box">
        <svg viewBox="0 0 100 100" className="logo-svg">
          <defs>
            {/* Gradient fiolet-róż z ikony */}
            <linearGradient id="gliko-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8A2BE2" />
              <stop offset="100%" stopColor="#FF69B4" />
            </linearGradient>
          </defs>

          {/* 2. Rysujący się pierścień (Circular Arc) */}
          <circle 
            cx="50" 
            cy="50" 
            r="35" 
            stroke="url(#gliko-grad)" 
            strokeWidth="10" 
            fill="none"
            strokeLinecap="round"
            className="animated-arc"
          />

          {/* 3. Wpadający od dołu grot (Arrowhead) */}
          <path 
            d="M35,55 L50,40 L65,55" 
            stroke="white" 
            strokeWidth="8" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="animated-arrow"
          />
        </svg>
      </div>

      {/* 4. Pojawiający się tekst pod spodem */}
      <div className="logo-text">POWERED BY GLIKOSENSE</div>
    </div>
  );
};

export default GlikoControlLogo;
