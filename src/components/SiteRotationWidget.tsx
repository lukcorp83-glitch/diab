import React, { useMemo, useState, useEffect } from 'react';
import { RefreshCw, MapPin } from 'lucide-react';
import { LogEntry, UserSettings } from '../types';
import { cn } from '../lib/utils';
import { Haptics } from '../lib/haptics';

interface SiteRotationWidgetProps {
  logs: LogEntry[];
  settings: UserSettings;
  size: string;
  onAction?: (action: string) => void;
  setTab: (t: string) => void;
}

export default function SiteRotationWidget({ logs, settings, size, onAction, setTab }: SiteRotationWidgetProps) {
  const isCompact = size === '1x1' || size === '1x2';
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsZoomed(true), 400); // Wait a bit then zoom
    return () => clearTimeout(timer);
  }, []);

  const lastSiteChange = useMemo(() => {
    const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
    return sorted.find(l => l.type === 'site_change');
  }, [logs]);

  const locationText = lastSiteChange?.notes || 'Brak danych';
  
  const elapsedDays = lastSiteChange ? Math.floor((Date.now() - lastSiteChange.timestamp) / (1000 * 60 * 60 * 24)) : 0;
  const maxDays = settings?.infusionSetDurationDays || 3;
  
  const isOverdue = elapsedDays >= maxDays;

  // Map location text to SVG percentages
  const getDotPosition = (loc: string) => {
    const locLower = loc.toLowerCase();
    
    let top = '45%';
    let left = '50%';
    const isLeft = locLower.includes('lew');
    const isRight = locLower.includes('praw');

    if (locLower.includes('brzuch')) {
      top = '45%';
      if (isLeft) left = '38%';
      else if (isRight) left = '62%';
    } else if (locLower.includes('udo') || locLower.includes('uda')) {
      top = '72%';
      if (isLeft) left = '32%';
      else if (isRight) left = '68%';
      else left = '32%'; // default
    } else if (locLower.includes('ramię') || locLower.includes('ramie')) {
      top = '38%';
      if (isLeft) left = '20%';
      else if (isRight) left = '80%';
      else left = '20%'; // default
    } else if (locLower.includes('pośladek') || locLower.includes('posladek')) {
      top = '52%';
      if (isLeft) left = '35%';
      else if (isRight) left = '65%';
      else left = '35%'; // default
    } else if (locLower.includes('plecy')) {
      top = '30%';
      if (isLeft) left = '38%';
      else if (isRight) left = '62%';
    } else if (isLeft) {
      left = '30%';
    } else if (isRight) {
      left = '70%';
    }
    
    return { top, left };
  };
  
  const dotPos = getDotPosition(locationText);

  // Derive transform origin from dot position to zoom in on it
  const originX = dotPos.left;
  const originY = dotPos.top;

  return (
    <div 
      onClick={() => {
        Haptics.light();
        setTab("profile");
        onAction?.("devices");
      }}
      className={cn(
        "glass-card w-full h-full p-4 flex flex-col relative overflow-hidden transition-all active:scale-[0.98]",
        isCompact ? "justify-center items-center text-center p-2" : "justify-between"
      )}
    >
      <div className="flex items-center gap-2 mb-2 w-full z-10 relative">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
          isOverdue ? "bg-red-100 dark:bg-red-900/40 text-red-500" : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500"
        )}>
          <RefreshCw size={16} />
        </div>
        {!isCompact && (
          <span className="font-bold text-[10px] text-slate-500 uppercase tracking-widest leading-none drop-shadow-sm">
            Rotacja<br/>Wkłuć
          </span>
        )}
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-30 dark:opacity-40">
        <div 
          className="relative h-[90%] max-h-[180px] aspect-[1/2] mt-4 transition-all duration-[1500ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] drop-shadow-xl"
          style={{ transformOrigin: `${originX} ${originY}`, transform: isZoomed ? 'scale(2.2)' : 'scale(1)' }}
        >
          {/* A smoother human body silhouette */}
          <svg fill="currentColor" viewBox="0 0 100 200" className="w-full h-full text-slate-500 dark:text-slate-400">
            <path d="M50 30 C58 30 65 24 65 15 C65 6 58 0 50 0 C42 0 35 6 35 15 C35 24 42 30 50 30 Z" />
            <path d="M68 35 C75 35 80 40 85 55 C90 70 95 95 90 95 C85 95 80 70 75 60 C75 60 70 50 68 50 C68 50 68 100 68 100 C68 120 75 180 75 190 C75 200 60 200 60 190 C60 150 55 110 50 110 C45 110 40 150 40 190 C40 200 25 200 25 190 C25 180 32 120 32 100 C32 100 32 50 32 50 C30 50 25 60 25 60 C20 70 15 95 10 95 C5 95 10 70 15 55 C20 40 25 35 32 35 C40 35 60 35 68 35 Z" opacity="0.9"/>
          </svg>
          
          {/* The injection site dot */}
          <div 
            className="absolute w-3 h-3 bg-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,1)] border-[1.5px] border-white dark:border-black transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={{ top: dotPos.top, left: dotPos.left }}
          >
            <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
          </div>
        </div>
      </div>

      <div className={cn("flex flex-col flex-1 z-10 relative pointer-events-none", isCompact ? "justify-end pb-1" : "justify-end gap-0.5 w-full")}>
        {!isCompact && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 drop-shadow-sm">
            Miejsce wkłucia:
          </span>
        )}
        <div className={cn("flex items-center", isCompact ? "justify-center mt-auto" : "gap-2")}>
          <span className={cn(
            "font-black tracking-tight leading-none drop-shadow-md flex-1",
            isCompact ? "text-center text-sm" : "text-base text-left line-clamp-2 leading-[1.15]",
            isOverdue ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"
          )}>
             {isCompact ? locationText.split(' ')[0] : locationText}
          </span>
        </div>
      </div>
    </div>
  );
}
