import { useAppStore } from '../../../stores/useAppStore';
import React from 'react';
import { cn, getEffectiveUid } from "../../../lib/utils";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import { Haptics } from '../../../lib/haptics';
import { addDoc, collection } from "firebase/firestore";
import { toast } from "react-hot-toast";

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

  const quickAdd = async (shortcut: any) => {
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
        <h4 className="text-[10px] font-black uppercase tracking-wider leading-none mb-1">{t('auto.brak_moich_ulubionych', { defaultValue: 'Brak Moich Ulubionych' })}</h4>
        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{t('auto.dotknij_tutaj_aby_dodać_ulubione_po', { defaultValue: i18n.t('auto.dotknij_tutaj_aby_dodac_u', { defaultValue: "Dotknij tutaj, aby dodać ulubione posiłki w Profilu" }) })}</span>
      </div>
    );
  }

  return (
    <div className="glass-card !p-6 flex flex-col gap-4 border border-white/50 dark:border-white/5 shadow-lg w-full h-full">
      <div className="flex justify-between items-center px-1">
        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-display">{t('auto.moje_ulubione_posiłki', { defaultValue: i18n.t('auto.moje_ulubione_posilki', { defaultValue: "MOJE ULUBIONE POSIŁKI" }) })}</h4>
        <button 
          onClick={() => {
            if (!isEditingLayout) {
              Haptics.light();
              useAppStore.getState().setInitialAction('food');
              setTab("profile");
            }
          }}
          className="text-[9px] font-black text-accent-500 uppercase tracking-tight"
        >
          {t('auto.edytuj', { defaultValue: 'Edytuj' })}
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none mask-fade-right w-full">
        {shortcuts.map((s: any) => (
          <button
            key={s.id}
            onClick={() => { if (!isEditingLayout) quickAdd(s); }}
            className="shrink-0 glass-card !p-5 flex items-center gap-4 font-black text-xs uppercase tracking-tighter shadow-md active:scale-95 transition-all border border-black/5 dark:border-white/5 dark:text-white group min-w-[140px]"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform block">{s.icon || "📌"}</span>
            <div className="flex flex-col items-start text-left">
              <span className="leading-tight text-slate-800 dark:text-slate-200">{s.name}</span>
              <span className="text-[9px] opacity-50 lowercase font-bold">{Number(s.carbs).toFixed(1)}{t('auto.g_węgli', { defaultValue: i18n.t('auto.g_wegli', { defaultValue: "g węgli" }) })}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

