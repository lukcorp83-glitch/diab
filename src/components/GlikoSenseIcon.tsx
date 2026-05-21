import React, { useId } from 'react';
import { motion } from 'motion/react';

interface GlikoSenseIconProps {
  className?: string;
  size?: number;
  isAnalyzing?: boolean;
}

export default function GlikoSenseIcon({ className = "", size = 24, isAnalyzing = false }: GlikoSenseIconProps) {
  const gradientId = useId();
  
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Outer Glow / Pulse */}
        {isAnalyzing && (
          <motion.path
            d="M12 21.5C16.5 21.5 20 18 20 13.5C20 9 12 2.5 12 2.5C12 2.5 4 9 4 13.5C4 18 7.5 21.5 12 21.5Z"
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0.1, scale: 0.8 }}
            animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Main Drop Shape */}
        <path
          d="M12 21.5C16.5 21.5 20 18 20 13.5C20 9 12 2.5 12 2.5C12 2.5 4 9 4 13.5C4 18 7.5 21.5 12 21.5Z"
          fill={`url(#${gradientId})`}
          stroke="white"
          strokeWidth="0.5"
          className="drop-shadow-sm"
        />

        {/* Neural Connections inside the drop */}
        <g opacity="0.8">
          <motion.circle 
            cx="12" cy="14" r="1.5" fill="white" 
            animate={isAnalyzing ? { opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.circle 
            cx="9" cy="11" r="1" fill="white" 
            animate={isAnalyzing ? { opacity: [0.3, 0.8, 0.3] } : {}}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.circle 
            cx="15" cy="11" r="1" fill="white" 
            animate={isAnalyzing ? { opacity: [0.3, 0.8, 0.3] } : {}}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />
          <motion.circle 
            cx="12" cy="18" r="1" fill="white" 
            animate={isAnalyzing ? { opacity: [0.3, 0.8, 0.3] } : {}}
            transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
          />
          
          <line x1="12" y1="14" x2="9" y2="11" stroke="white" strokeWidth="0.5" strokeOpacity="0.5" />
          <line x1="12" y1="14" x2="15" y2="11" stroke="white" strokeWidth="0.5" strokeOpacity="0.5" />
          <line x1="12" y1="14" x2="12" y2="18" stroke="white" strokeWidth="0.5" strokeOpacity="0.5" />
        </g>

        <defs>
          <linearGradient id={gradientId} x1="4" y1="2.5" x2="20" y2="21.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
