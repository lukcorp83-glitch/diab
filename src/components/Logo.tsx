import React from 'react';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-xl bg-slate-950 shadow-lg ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full scale-[0.8]">
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        {/* Main Ring - stylized to match image exactly */}
        <path 
          d="M 60,15 A 35,35 0 1 0 85,50" 
          stroke="url(#logoGradient)" 
          strokeWidth="15" 
          strokeLinecap="round" 
        />
        {/* Upward Chevron - white, bold and rounded */}
        <path 
          d="M 38,55 L 50,43 L 62,55" 
          stroke="white" 
          strokeWidth="12" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>
    </div>
  );
}
