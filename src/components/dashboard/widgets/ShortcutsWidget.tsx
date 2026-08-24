import { useAppStore } from '../../../stores/useAppStore';
import React, { useRef, useState } from 'react';
import { cn, getEffectiveUid } from "../../../lib/utils";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { Haptics } from '../../../lib/haptics';
import { addDoc, collection } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";

// @ts-ignore
import { db } from "../../../lib/firebase";

export default function ShortcutsWidget({
  shortcuts,
  isEditingLayout,
  user,
  setTab,
  onAction,
  size
}: any) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const hasMovedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    hasMovedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
      e.preventDefault();
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollSide = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    Haptics.light();
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -220 : 220,
      behavior: 'smooth'
    });
  };

  const quickAdd = async (shortcut: any) => {
    if (hasMovedRef.current) return;
    if (!user) return;
    Haptics.medium();
    try {
      const tempLog = {
        id: Math.random().toString(),
        timestamp: Date.now(),
        type: 'meal',
        value: shortcut.carbs,
        notes: `Szybkie dodanie: ${shortcut.name}`,
        calories: shortcut.calories || 0,
        proteins: shortcut.proteins || 0,
        fats: shortcut.fats || 0
      };
      await addDoc(
        collection(
          db,
          "users",
          getEffectiveUid(user),
          "logs",
        ),
        tempLog
      );
      toast.success(`Dodano posiłek: ${shortcut.name} (${shortcut.carbs}g)`);
    } catch (err) {
      console.error("Error quick adding shortcut:", err);
      toast.error(i18n.t('auto.wystapil_blad', { defaultValue: i18n.t('auto.wystapil_blad', { defaultValue: "Wystąpił błąd" }) }));
    }
  };

  if (shortcuts.length === 0) {
    return (
      <div 
        onClick={() => {
          if (!isEditingLayout) {
            Haptics.light();
            useAppStore.getState().setInitialAction('food');
            setTab("profile");
          }
        }}
        className="glass-card !p-6 flex flex-col justify-center items-center text-center cursor-pointer border border-white/50 dark:border-white/5 shadow-lg w-full min-h-[140px]"
      >
        <span className="text-2xl mb-1">🍔</span>
        <h4 className="text-[10px] font-black uppercase tracking-wider leading-none mb-1">{t('auto.brak_szybkich_skrotow', { defaultValue: 'Brak Szybkich Skrótów' })}</h4>
        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{t('auto.dotknij_tutaj_aby_dodac_skroty', { defaultValue: 'Dotknij tutaj, aby dodać szybkie skróty w Profilu' })}</span>
      </div>
    );
  }

  return (
    <div className="glass-card !p-6 flex flex-col justify-between gap-3 border border-white/50 dark:border-white/5 shadow-lg w-full h-full relative group/widget overflow-hidden">
      <div className="flex justify-between items-center px-1 shrink-0">
        <div className="flex items-center gap-2">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-display">{t('auto.szybkie_skroty_naglowek', { defaultValue: 'SZYBKIE SKRÓTY' })}</h4>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {shortcuts.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {shortcuts.length > 2 && (
            <div className="hidden sm:flex items-center gap-1 mr-1">
              <button 
                onClick={() => scrollSide('left')}
                className="w-6 h-6 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
                title="Przewiń w lewo"
              >
                <ChevronLeft size={13} />
              </button>
              <button 
                onClick={() => scrollSide('right')}
                className="w-6 h-6 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
                title="Przewiń w prawo"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
          <button 
            onClick={() => {
              if (!isEditingLayout) {
                Haptics.light();
                useAppStore.getState().setInitialAction('food');
                setTab("profile");
              }
            }}
            className="text-[9px] font-black text-accent-500 uppercase tracking-tight cursor-pointer hover:underline"
          >
            {t('auto.edytuj', { defaultValue: 'Edytuj' })}
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
        className={cn(
          "flex gap-3 overflow-x-auto pb-1 scrollbar-none mask-fade-right w-full select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        {shortcuts.map((s: any) => (
          <button
            key={s.id}
            onClick={() => { if (!isEditingLayout && !hasMovedRef.current) quickAdd(s); }}
            className="shrink-0 glass-card !p-4 flex items-center gap-3 font-black text-xs uppercase tracking-tighter shadow-sm active:scale-95 transition-all border border-black/5 dark:border-white/5 dark:text-white group min-w-[140px] cursor-pointer"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform block pointer-events-none">{s.icon || "📌"}</span>
            <div className="flex flex-col items-start text-left pointer-events-none">
              <span className="leading-tight text-slate-800 dark:text-slate-200">{s.name}</span>
              <span className="text-[9px] opacity-50 lowercase font-bold">{Number(s.carbs).toFixed(1)}{t('auto.g_węgli', { defaultValue: i18n.t('auto.g_wegli', { defaultValue: "g węgli" }) })}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
