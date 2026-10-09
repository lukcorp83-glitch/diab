import { useAuthStore } from '../stores/useAuthStore';
import i18n from '../i18n';
import { useLogsStore } from "../stores/useLogsStore";
import { getEffectiveUid } from "../lib/utils";
import { requireParentalAuth } from "../lib/childPermissions";
import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { UserSettings } from "../types";
import {
  Syringe,
  Droplets,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Calendar,
  Loader2,
} from "lucide-react";
import { cn, getEffectiveIOB } from "../lib/utils";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { dbService } from "../services/databaseService";
import { toast } from "react-hot-toast";
import { startPreBolusTimer, calculatePreBolusWaitTime, markBolusAsHandled } from "../services/preBolusService";
import { Haptics } from "../lib/haptics";
import { fetchCurrentWeather } from "../services/weatherService";

interface BolusCalculatorProps {
  setTab?: (t: string) => void;
  setSharedPlate?: React.Dispatch<React.SetStateAction<any[]>>;
  pumpStatus?: any;
  isShortcutMode?: boolean;
}

export default function BolusCalculator({
  setTab,
  pumpStatus,
  isShortcutMode,
}: BolusCalculatorProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logs = useLogsStore((state) => state.logs);

  const [doseInput, setDoseInput] = useState<string>("");
  const [bg, setBg] = useState<string>("");
  const [trend, setTrend] = useState<"up" | "stable" | "down">("stable");
  const [bolusType, setBolusType] = useState<string>("posiłkowy");
  const [customNote, setCustomNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [launchTimer, setLaunchTimer] = useState(true);

  const [settings, setSettings] = useState<UserSettings>({
    isf: 50,
    wwRatio: 10,
    wbtRatio: 10,
    targetMin: 70,
    targetMax: 140,
    dia: 4,
  });

  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localISOTime = new Date(Date.now() - tzOffset)
    .toISOString()
    .slice(0, 16);
  const [entryTime, setEntryTime] = useState<string>(localISOTime);

  const isChildMode = Boolean(
    settings?.childMode ??
    (() => {
      try {
        const s = localStorage.getItem('glikocontrol_user_settings');
        return s ? JSON.parse(s)?.childMode : false;
      } catch {
        return false;
      }
    })()
  );

  // Pobranie profilu użytkownika
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", getEffectiveUid(user), "settings", "profile"))
      .then((d) => {
        if (d.exists()) setSettings((prev) => ({ ...prev, ...d.data() }));
      })
      .catch((e) => {
        if (!e.message?.includes("offline"))
          console.error("Error fetching profile settings:", e);
      });

    // Automatyczne podstawienie ostatniego odczytu cukru (jeśli świeży < 30 min)
    const lastG = logs.find((l) => l.type === "glucose");
    if (lastG && Date.now() - lastG.timestamp < 30 * 60 * 1000 && !bg) {
      setBg(Math.round(lastG.value).toString());
      if (lastG.direction) {
        if (['SingleUp', 'DoubleUp', 'FortyFiveUp'].includes(lastG.direction)) setTrend('up');
        else if (['SingleDown', 'DoubleDown', 'FortyFiveDown'].includes(lastG.direction)) setTrend('down');
        else setTrend('stable');
      } else if (lastG.delta !== undefined) {
        if (lastG.delta >= 1) setTrend('up');
        else if (lastG.delta <= -1) setTrend('down');
        else setTrend('stable');
      }
    }

    // Obsługa przekierowania z kafelka szybkiej korekty na pulpicie
    const pendingCorr = sessionStorage.getItem("pending_correction");
    if (pendingCorr) {
      try {
        const parsed = JSON.parse(pendingCorr);
        if (parsed.bg) {
          setBg(parsed.bg.toString());
          setBolusType("korekta");
        }
        sessionStorage.removeItem("pending_correction");
      } catch (e) {
        console.error(e);
      }
    }
  }, [user, logs]);

  // Aktywna insulina IOB
  const currentIOB = getEffectiveIOB(logs, pumpStatus, settings?.dia || 4);

  // Sugerowany orientacyjny czas wchłaniania
  const bgNum = parseFloat(bg) || 0;
  const timingInfo = calculatePreBolusWaitTime(
    bgNum > 0 ? bgNum : null,
    trend,
    settings?.insulinType
  );

  // Szybkie dodawanie jednostek
  const handleAddUnits = (units: number) => {
    Haptics.light();
    const current = parseFloat(doseInput) || 0;
    const next = Math.max(0, Math.min(50, Math.round((current + units) * 10) / 10));
    setDoseInput(next > 0 ? next.toFixed(1) : "");
  };

  const handleClearDose = () => {
    Haptics.light();
    setDoseInput("");
  };

  const handleSave = async () => {
    if (!user || saving) return;

    const doseValue = parseFloat(doseInput) || 0;
    const glucoseValue = parseFloat(bg) || 0;

    if (doseValue <= 0 && glucoseValue <= 0) {
      toast.error(t('bolus.err_empty', { defaultValue: 'Wpisz podaną dawkę insuliny lub poziom cukru.' }));
      return;
    }

    const permRequired = doseValue > 0 ? 'canAddBolus' : 'canAddGlucose';
    const permTitle = doseValue > 0 ? 'Wprowadzanie Bolusa 💉' : 'Pomiar Cukru 🩸';

    requireParentalAuth(settings, permRequired, {
      title: permTitle,
      description: 'Ta czynność wymaga autoryzacji Opiekuna. Podaj PIN rodzica, aby zatwierdzić.',
      onSuccess: async () => {
        setSaving(true);
        Haptics.medium();
        let tId: string | undefined;

        try {
          tId = toast.loading(t('bolus.processing', { defaultValue: 'Zapisywanie wpisu...' }));
          const effectiveUid = getEffectiveUid(user);
          const timestamp = new Date(entryTime).getTime() || Date.now();
          const logsRef = collection(db, "users", effectiveUid, "logs");
          const batch = writeBatch(db);

          let finalDescription = "Bolus";
          if (bolusType === "posiłkowy") finalDescription = "Bolus posiłkowy";
          else if (bolusType === "korekta") finalDescription = "Korekta glikemii";
          else if (bolusType === "baza") finalDescription = "Insulina bazowa";
          else if (customNote.trim()) finalDescription = customNote.trim();

          // 1. Zapis Bolusa (jeśli podano dawkę)
          if (doseValue > 0) {
            const bolusPayload: any = {
              type: "bolus",
              value: Math.round(doseValue * 10) / 10,
              timestamp,
              description: finalDescription,
              source: "manual",
            };

            const bolusDoc = doc(logsRef);
            batch.set(bolusDoc, bolusPayload);
            await dbService.saveLog({ id: bolusDoc.id, ...bolusPayload });
            window.dispatchEvent(
              new CustomEvent('localLogAdd', { detail: { id: bolusDoc.id, ...bolusPayload } })
            );

            // Odliczenie jednostek z aktywnego pena w magazynie
            if (!settings.treatmentMode || settings.treatmentMode === 'insulin') {
              const penItem = settings.inventory?.find((item) => item.category === 'pens');
              if (penItem) {
                const currentUnits =
                  penItem.currentPenUnits !== undefined
                    ? penItem.currentPenUnits
                    : (penItem.penCapacity || 300);
                const updatedInventory = [...(settings.inventory || [])];
                const penIndex = updatedInventory.findIndex((i) => i.id === penItem.id);
                if (penIndex >= 0) {
                  const newUnits = Math.max(0, currentUnits - doseValue);
                  updatedInventory[penIndex] = {
                    ...updatedInventory[penIndex],
                    currentPenUnits: Number(newUnits.toFixed(1)),
                  };
                  const updates = { inventory: updatedInventory };
                  const settingsDocRef = doc(db, "users", effectiveUid, "settings", "profile");
                  batch.set(settingsDocRef, updates, { merge: true });
                  window.dispatchEvent(new CustomEvent('localSettingsUpdate', { detail: updates }));
                }
              }
            }

            // Uruchomienie stopera pre-bolusa jeśli włączony i czas > 0
            if (launchTimer && timingInfo.waitMinutes > 0) {
              markBolusAsHandled(timestamp);
              startPreBolusTimer(timingInfo.waitMinutes, doseValue, timestamp);
            }
          }

          // 2. Zapis Cukru (jeśli podano lub skorygowano)
          if (glucoseValue > 0) {
            const settingsDocRef = doc(db, "users", effectiveUid, "settings", "profile");
            const settingsDoc = await getDoc(settingsDocRef);
            const settingsData = settingsDoc.exists() ? settingsDoc.data() : null;
            const weather = settingsData?.weatherNeuralEnabled === true ? await fetchCurrentWeather() : null;

            const glucosePayload: any = {
              type: "glucose",
              value: Math.round(glucoseValue * 10) / 10,
              timestamp: timestamp - 10,
              description: "Pomiar przy bolusie",
              source: "manual",
            };
            if (weather) glucosePayload.weather = weather;

            const gluDoc = doc(logsRef);
            batch.set(gluDoc, glucosePayload);
            await dbService.saveLog({ id: gluDoc.id, ...glucosePayload });
            window.dispatchEvent(
              new CustomEvent('localLogAdd', { detail: { id: gluDoc.id, ...glucosePayload } })
            );
          }

          await batch.commit();

          if (tId) toast.dismiss(tId);
          Haptics.success();
          toast.success(
            doseValue > 0
              ? `Zapisano dawkę ${doseValue.toFixed(1)} j. 💉`
              : `Zapisano pomiar ${glucoseValue} mg/dL 🩸`
          );

          if (setTab) {
            setTab("dashboard");
          }
        } catch (err: any) {
          console.error("Błąd podczas zapisywania bolusa:", err);
          if (tId) toast.dismiss(tId);
          Haptics.error();
          toast.error(t('bolus.err_save', { defaultValue: 'Błąd podczas zapisywania wpisu.' }));
        } finally {
          setSaving(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto px-4 pt-2">
      {/* Górny pasek nawigacji */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            Haptics.light();
            if (setTab) setTab("dashboard");
          }}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl transition-all text-slate-600 dark:text-slate-300 flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft size={16} />
          <span>{t('auto.wstecz', { defaultValue: 'Wróć' })}</span>
        </button>

        <div className="text-center">
          <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <Syringe size={18} className="text-accent-500" />
            {t('bolus.title', { defaultValue: 'Rejestracja Dawki Insuliny' })}
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            {t('bolus.subtitle', { defaultValue: 'Wpisz podane jednostki' })}
          </p>
        </div>

        <div className="w-10" />
      </div>

      {/* Baner Bezpieczeństwa Trybu Dziecka */}
      {isChildMode && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-700 dark:text-amber-300">
          <span className="text-xl">👨‍👩‍👦</span>
          <div className="text-xs">
            <p className="font-bold">
              {t('bolus.child_warning_title', { defaultValue: 'Tryb Dziecka – Wprowadzanie pod kontrolą opiekuna' })}
            </p>
            <p className="opacity-90 mt-0.5">
              {t('bolus.child_warning_desc', { defaultValue: 'Dawkę insuliny zawsze ustala rodzic, opiekun lub lekarz. Zapisanie dawki wymaga autoryzacji kodem PIN opiekuna.' })}
            </p>
          </div>
        </div>
      )}

      {/* Karta Aktywnej Insuliny (IOB) i Cukru */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card !p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] font-black uppercase tracking-wider">Aktualny cukier</span>
            <Droplets size={14} className="text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <input
              type="number"
              placeholder="---"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="text-2xl font-black bg-transparent text-slate-900 dark:text-white w-20 outline-none tabular-nums"
            />
            <span className="text-[10px] font-bold text-slate-400">mg/dL</span>
          </div>
          <span className="text-[8px] text-slate-400 font-medium mt-1">
            {bgNum > 0 ? (trend === 'up' ? '↗ Rosnący' : trend === 'down' ? '↘ Spadający' : '→ Stabilny') : 'Wpisz lub z CGM'}
          </span>
        </div>

        <div className="glass-card !p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] font-black uppercase tracking-wider">Aktywna insulina</span>
            <Clock size={14} className="text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {currentIOB.toFixed(1)}
            </span>
            <span className="text-[10px] font-bold text-slate-400">j. IOB</span>
          </div>
          <span className="text-[8px] text-slate-400 font-medium mt-1">
            {currentIOB > 0.5 ? '⚠️ Dawki wciąż działają' : 'Bezpieczny poziom'}
          </span>
        </div>
      </div>

      {/* GŁÓWNA KARTA: Wprowadzanie Dawki */}
      <div className="glass-card !p-6 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden shadow-xl border border-accent-500/20">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-accent-500">
            {t('bolus.dose_label', { defaultValue: 'Podana dawka insuliny' })}
          </span>
        </div>

        {/* Duże pole numeryczne */}
        <div className="flex items-center justify-center gap-2 my-2">
          <input
            type="number"
            min="0"
            max="50"
            step="0.1"
            placeholder="0.0"
            value={doseInput}
            onChange={(e) => setDoseInput(e.target.value)}
            className="w-44 bg-accent-500/10 text-center text-5xl font-black text-accent-500 outline-none rounded-3xl py-3 focus:bg-accent-500/20 transition-all border border-accent-500/30 tabular-nums"
          />
          <span className="text-2xl font-black text-slate-400 dark:text-slate-500">j.</span>
        </div>

        {/* Haptyczny suwak precyzyjnego doboru dawki (Material 3 Haptic Tick Slider) */}
        <div className="w-full max-w-xs px-4 pt-1">
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={parseFloat(doseInput) || 0}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              Haptics.tick();
              setDoseInput(val > 0 ? val.toFixed(1) : "");
            }}
            className="pixel-slider text-accent-500"
          />
          <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1 px-1">
            <span>0j</span>
            <span>5j</span>
            <span>10j</span>
            <span>15j</span>
            <span>20j</span>
          </div>
        </div>

        {/* Szybkie przyciski dodawania jednostek */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap w-full pt-1">
          <button
            type="button"
            onClick={() => handleAddUnits(0.5)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 transition-all active:scale-95"
          >
            +0.5
          </button>
          <button
            type="button"
            onClick={() => handleAddUnits(1.0)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 transition-all active:scale-95"
          >
            +1.0
          </button>
          <button
            type="button"
            onClick={() => handleAddUnits(2.0)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 transition-all active:scale-95"
          >
            +2.0
          </button>
          <button
            type="button"
            onClick={() => handleAddUnits(5.0)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 transition-all active:scale-95"
          >
            +5.0
          </button>
          {doseInput && (
            <button
              type="button"
              onClick={handleClearDose}
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-black transition-all active:scale-95"
              title="Wyczyść"
            >
              C
            </button>
          )}
        </div>

        <p className="text-[9px] text-slate-400 italic max-w-xs">
          Wpisz dokładnie taką dawkę, jaką podałeś w penie lub pompie. Aplikacja nie narzuca ani nie wylicza jednostek leku.
        </p>
      </div>

      {/* Typ / Kategoria bolusa */}
      <div className="glass-card !p-4 space-y-3">
        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-left">
          Rodzaj podania
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              Haptics.selection();
              setBolusType("posiłkowy");
            }}
            className={cn(
              "py-2.5 px-2 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 border",
              bolusType === "posiłkowy"
                ? "bg-accent-500 text-white border-accent-600 shadow-md shadow-accent-500/20"
                : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/10"
            )}
          >
            <span>🍽️</span>
            <span className="text-[10px] uppercase tracking-tight">Posiłkowy</span>
          </button>

          <button
            type="button"
            onClick={() => {
              Haptics.selection();
              setBolusType("korekta");
            }}
            className={cn(
              "py-2.5 px-2 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 border",
              bolusType === "korekta"
                ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20"
                : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/10"
            )}
          >
            <span>⚡</span>
            <span className="text-[10px] uppercase tracking-tight">Korekta</span>
          </button>

          <button
            type="button"
            onClick={() => {
              Haptics.selection();
              setBolusType("baza");
            }}
            className={cn(
              "py-2.5 px-2 rounded-2xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 border",
              bolusType === "baza"
                ? "bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20"
                : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/10"
            )}
          >
            <span>🌙</span>
            <span className="text-[10px] uppercase tracking-tight">Baza</span>
          </button>
        </div>

        {bolusType === "inne" && (
          <input
            type="text"
            placeholder="Dodatkowa notatka (opcjonalnie)..."
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="w-full mt-2 px-3 py-2 bg-slate-100 dark:bg-white/5 rounded-xl text-xs font-bold outline-none border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
          />
        )}
      </div>

      {/* Czas podania i Sugerowany Stoper Pre-Bolus */}
      <div className="glass-card !p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar size={13} />
            Data i godzina podania
          </label>
          <input
            type="datetime-local"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
            className="text-xs font-bold bg-slate-100 dark:bg-white/5 rounded-xl px-2.5 py-1 text-slate-700 dark:text-slate-300 outline-none border border-slate-200 dark:border-white/10"
          />
        </div>

        {/* Informacja o sugerowanym czasie wchłaniania */}
        {timingInfo.waitMinutes > 0 && parseFloat(doseInput) > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-left">
                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 block">
                  Sugerowany odstęp: ~{timingInfo.waitMinutes} min
                </span>
                <span className="text-[9px] text-slate-400 leading-tight block">
                  Orientacyjny czas wchłaniania na podstawie aktualnej glikemii.
                </span>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={launchTimer}
                onChange={(e) => setLaunchTimer(e.target.checked)}
                className="w-4 h-4 rounded text-accent-500 accent-accent-500 cursor-pointer"
              />
              <span className="text-[10px] font-bold text-slate-500">Stoper</span>
            </label>
          </div>
        )}
      </div>

      {/* PRZYCISK ZAPISU */}
      <button
        onClick={handleSave}
        disabled={saving || (parseFloat(doseInput) <= 0 && parseFloat(bg) <= 0)}
        className="w-full py-4 bg-accent-500 hover:bg-accent-600 active:scale-95 disabled:opacity-40 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-accent-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {saving ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Zapisywanie...</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={18} />
            <span>{t('bolus.save_btn', { defaultValue: 'Zapisz dawkę w dzienniku' })}</span>
          </>
        )}
      </button>

      {/* Dyskretna informacja o posiłkach na Talerzu */}
      <div className="text-center pt-2">
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Posiłki, węglowodany i wymienniki (WW / WBT) komponuj w sekcji{" "}
          <button
            type="button"
            onClick={() => {
              Haptics.light();
              if (setTab) setTab("meal");
            }}
            className="text-accent-500 font-bold underline cursor-pointer"
          >
            Talerz Posiłków
          </button>
          .
        </p>
      </div>
    </div>
  );
}
