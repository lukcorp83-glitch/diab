import { getEffectiveUid } from '../lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableWidget } from './SortableWidget';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { App as CapacitorApp } from '@capacitor/app';
import { notificationService } from "../services/notificationService";
import { nightscoutService } from "../services/nightscout";
import { LogEntry, UserSettings, Product } from "../types";
import GlucoseChart from "./GlucoseChart";
import VirtualPet from "./VirtualPet";
import MedicationsWidget from "./MedicationsWidget";
import CarbsBalanceWidget from "./CarbsBalanceWidget";
import HydrationWidget from "./HydrationWidget";
import SiteRotationWidget from "./SiteRotationWidget";
import { PumpStatusCard } from "./PumpStatusCard";
import {
  Activity,
  Clock,
  Droplets,
  Syringe,
  Utensils,
  Plus,
  Shield,
  Trash2,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Signal,
  Radio,
  Droplet,
  CheckCircle2,
  Sparkles,
  Edit3,
  Cpu,
  Zap,
  X,
  Info,
  Calendar,
  Gift,
  Sliders,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  LayoutGrid,
  GripVertical,
  Move
} from "lucide-react";
import { cn, calculateIOB, getEffectiveIOB } from "../lib/utils";
import { toast } from "react-hot-toast";
import { APP_VERSION } from "../constants";
import GlucoseModal from "./GlucoseModal";
import SwipeableItem from "./SwipeableItem";
import MealEditModal from "./MealEditModal";
import HealthWidget from './HealthWidget';
import GlikoWidget from "./GlikoWidget";
import GlikoSenseTips from "./GlikoSenseTips";
import GlikoSenseNeural from "./GlikoSenseNeural";
import WeatherWidget from "./WeatherWidget";
import DailyTirWidget from "./DailyTirWidget";
import GlikoSenseIcon from "./GlikoSenseIcon";
import DidYouKnowWidget from "./DidYouKnowWidget";
import LowGlucoseMealAlert from "./LowGlucoseMealAlert";
import UnlinkedCarbsWidget from "./UnlinkedCarbsWidget";
import { MLAnalyzer } from "../services/mlSugarAnalyzer";
import { db } from "../lib/firebase";
import { SPORTS } from "./GlikoTraining";
import {
  collection,
  query,
  onSnapshot,
  doc,
  deleteDoc,
  addDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { Haptics } from "../lib/haptics";
import { useTranslation } from "react-i18next";
import i18n from '../i18n';

export interface DashboardWidget {
  id: string;
  name: string;
  visible: boolean;
  size: "2x2" | "2x1" | "1x2" | "1x1";
  canResize: boolean;
  canChangeShape?: boolean;
  shape?: "default" | "circle" | "leaf" | "diamond" | "leaf-mirror";
}

export const getAllowedSizesForWidget = (id: string): ("1x1" | "2x1" | "1x2" | "2x2")[] => {
  switch (id) {
    case "main_stats":
      return ["2x2"];
    case "daily_tir":
      return ["1x1", "2x1", "2x2"];
    case "neural_pet":
      return ["2x2"];
    case "quick_correction":
      return ["2x2", "2x1"];
    case "weather":
      return ["1x1", "2x1"];
    case "sensor_reminder":
    case "infusion_reminder":
      return ["1x1", "2x1"];
    case "assistant":
      return ["2x1", "1x1"];
    case "tips":
      return ["2x1", "2x2"];
    case "glikosense_suggestions":
      return ["2x1", "1x1", "1x2", "2x2"];
    case "shortcuts":
      return ["2x1", "1x1", "1x2", "2x2"];
    case "training_widget":
      return ["2x1", "1x1", "2x2"];
    case "medications":
      return ["1x1", "1x2", "2x1"];
    case "quick_measurement":
    case "quick_bolus":
      return ["1x1", "2x1", "1x2", "2x2"];
    case "history_measurements":
    case "history_treatments":
      return ["2x1", "1x2", "2x2"];
    case "pump":
      return ["1x1", "2x1"];
    default:
      return ["1x1", "2x1", "1x2", "2x2"];
  }
};

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: "main_stats", name: i18n.t('auto.podsumowanie_glikemii_gliko', { defaultValue: 'Podsumowanie glikemii (Gliko)' }), visible: true, size: "2x2", canResize: false, canChangeShape: false },
  { id: "neural_pet", name: i18n.t('auto.glikosense_ai_zwierzak', { defaultValue: 'GlikoSense AI & Zwierzak' }), visible: true, size: "2x2", canResize: false, canChangeShape: false },
  { id: "weather", name: i18n.t('auto.wpływ_pogody_na_insulinę', { defaultValue: i18n.t('auto.wplyw_pogody_na_insuline', { defaultValue: "Wpływ pogody na insulinę" }) }), visible: true, size: "2x1", canResize: true, canChangeShape: true },
  { id: "sensor_reminder", name: i18n.t('auto.wymiana_sensora_urządzenie', { defaultValue: i18n.t('auto.wymiana_sensora_urzadzeni', { defaultValue: "Wymiana sensora (Urządzenie)" }) }), visible: true, size: "1x1", canResize: true, canChangeShape: true, shape: "leaf-mirror" },
  { id: "infusion_reminder", name: i18n.t('auto.wymiana_wkłucia_urządzenie', { defaultValue: i18n.t('auto.wymiana_wklucia_urzadzeni', { defaultValue: "Wymiana wkłucia (Urządzenie)" }) }), visible: true, size: "1x1", canResize: true, canChangeShape: true, shape: "leaf" },
  { id: "health_connect", name: i18n.t('auto.aktywność_health_connect', { defaultValue: i18n.t('auto.aktywnosc_health_connect', { defaultValue: "Aktywność (Health Connect)" }) }), visible: false, size: "1x1", canResize: true, canChangeShape: true, shape: "default" },
  { id: "assistant", name: i18n.t('auto.skrót_do_asystenta_ai', { defaultValue: i18n.t('auto.skrot_do_asystenta_ai', { defaultValue: "Skrót do Asystenta AI" }) }), visible: true, size: "2x1", canResize: true, canChangeShape: false },
  { id: "tips", name: i18n.t('auto.porady_i_ciekawostki_didyouknow', { defaultValue: 'Porady i ciekawostki (DidYouKnow)' }), visible: true, size: "2x1", canResize: true, canChangeShape: false },
  { id: "glikosense_suggestions", name: i18n.t('auto.sugestie_i_analizy_glikosense', { defaultValue: 'Sugestie i analizy GlikoSense' }), visible: true, size: "2x1", canResize: true, canChangeShape: false },
  { id: "shortcuts", name: i18n.t('auto.szybkie_akcje_i_ulubione_posiłki', { defaultValue: i18n.t('auto.szybkie_akcje_i_ulubione', { defaultValue: "Szybkie akcje i ulubione posiłki" }) }), visible: true, size: "2x1", canResize: true, canChangeShape: false },
  { id: "quick_measurement", name: i18n.t('auto.szybki_pomiar_glikemii_przycisk', { defaultValue: 'Szybki pomiar glikemii (Przycisk)' }), visible: true, size: "1x1", canResize: true, canChangeShape: true },
  { id: "quick_bolus", name: i18n.t('auto.zapis_bolusa_kalkulator_przycisk', { defaultValue: 'Zapis bolusa / kalkulator (Przycisk)' }), visible: true, size: "1x1", canResize: true, canChangeShape: true },
  { id: "history_measurements", name: i18n.t('auto.historia_ostatnich_pomiarów', { defaultValue: i18n.t('auto.historia_ostatnich_pomiar', { defaultValue: "Historia ostatnich pomiarów" }) }), visible: true, size: "2x1", canResize: true, canChangeShape: false },
  { id: "history_treatments", name: i18n.t('auto.historia_leczenia_i_posiłków', { defaultValue: i18n.t('auto.historia_leczenia_i_posil', { defaultValue: "Historia leczenia i posiłków" }) }), visible: true, size: "2x1", canResize: true, canChangeShape: false },
  { id: "pump", name: i18n.t('auto.status_pompy_insulinowej_xdrip', { defaultValue: 'Status pompy insulinowej / xDrip' }), visible: true, size: "2x1", canResize: true, canChangeShape: false },
  { id: "daily_tir", name: i18n.t('auto.dzienny_tir_wykres', { defaultValue: 'Dzienny TIR (Wykres)' }), visible: false, size: "1x1", canResize: true, canChangeShape: false },
  { id: "quick_correction", name: i18n.t('auto.sugerowana_szybka_korekta_alerty', { defaultValue: 'Sugerowana szybka korekta (Alerty)' }), visible: false, size: "2x2", canResize: true, canChangeShape: false },
  { id: "training_widget", name: i18n.t('auto.trening_i_aktywność_fizyczna', { defaultValue: i18n.t('auto.trening_i_aktywnosc_fizyc', { defaultValue: "Trening i Aktywność fizyczna" }) }), visible: false, size: "2x1", canResize: true, canChangeShape: false },
  { id: "medications", name: i18n.t('auto.leki_przypomnienia', { defaultValue: 'Leki (Przypomnienia)' }), visible: false, size: "2x1", canResize: true, canChangeShape: false },
  { id: "carbs_balance", name: i18n.t('auto.dzienny_bilans_węglowodanów', { defaultValue: i18n.t('auto.dzienny_bilans_weglowodan', { defaultValue: "Dzienny bilans węglowodanów" }) }), visible: false, size: "1x1", canResize: true, canChangeShape: false },
  { id: "hydration", name: i18n.t('auto.nawodnienie_woda', { defaultValue: 'Nawodnienie (Woda)' }), visible: false, size: "1x1", canResize: true, canChangeShape: false },
  { id: "site_rotation", name: i18n.t('auto.rotacja_wkłuć', { defaultValue: i18n.t('auto.rotacja_wkluc', { defaultValue: "Rotacja wkłuć" }) }), visible: false, size: "2x1", canResize: true, canChangeShape: false },
];

interface DashboardProps {
  logs: LogEntry[];
  user: any;
  setTab: (t: string) => void;
  theme: "light" | "dark";
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  onAction?: (action: string) => void;
  pumpStatus?: any;
  nsUrl?: string;
  nsSecret?: string;
  petData?: any;
  syncStatus?: { status: 'idle' | 'syncing' | 'success' | 'error', lastSync?: number };
  settings: UserSettings;
  isShortcutMode?: boolean;
}

export default function Dashboard({
  logs,
  user,
  setTab,
  theme,
  initialAction,
  onClearInitialAction,
  onAction,
  pumpStatus,
  nsUrl,
  nsSecret,
  petData,
  syncStatus,
  settings,
  isShortcutMode
}: DashboardProps) {
  const { t } = useTranslation();
  const [mlInfo, setMlInfo] = useState<{ accuracy: number, datasetSize: number } | null>(null);
  const [isGlucoseModalOpen, setIsGlucoseModalOpen] = useState(!!initialAction);

  const handleEndTraining = async () => {
    if (!user) return;
    Haptics.light();
    const settingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile');
    await setDoc(settingsRef, {
      activeTraining: null
    }, { merge: true });
  };

  if (isShortcutMode) {
    return (
      <AnimatePresence>
        {isGlucoseModalOpen && (
          <GlucoseModal
            isOpen={isGlucoseModalOpen}
            onClose={() => {
              setIsGlucoseModalOpen(false);
              onClearInitialAction?.();
              CapacitorApp.exitApp();
            }}
            user={user}
          />
        )}
      </AnimatePresence>
    );
  }

  const [range, setRange] = useState(3);
  const [showLoopSimulation, setShowLoopSimulation] = useState(() => {
    const saved = localStorage.getItem('glikosfera_loop_simulation');
    return saved ? JSON.parse(saved) : true;
  });
  const [showMLPrediction, setShowMLPrediction] = useState(() => {
    const saved = localStorage.getItem('glikosfera_ml_prediction');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('glikosfera_loop_simulation', JSON.stringify(showLoopSimulation));
  }, [showLoopSimulation]);

  useEffect(() => {
    localStorage.setItem('glikosfera_ml_prediction', JSON.stringify(showMLPrediction));
  }, [showMLPrediction]);

  useEffect(() => {
    const runAnalysis = async () => {
      if (logs.length >= 5) {
        try {
          const res = await MLAnalyzer.analyzeData(logs, false, 'quick');
          setMlInfo({ accuracy: res.accuracy, datasetSize: res.datasetSize || logs.length });
        } catch (e) {
          console.error("Dashboard ML analysis error:", e);
        }
      }
    };
    runAnalysis();
  }, [logs]);


  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    let saved = null;
    let fromFirebase = false;

    if (settings && (settings as any).dashboardLayout && Array.isArray((settings as any).dashboardLayout)) {
      saved = JSON.stringify((settings as any).dashboardLayout);
      fromFirebase = true;
    } else {
      saved = localStorage.getItem('glikocontrol_dashboard_widgets_v6');
    }

    let loadedWidgets = DEFAULT_WIDGETS;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Merge with DEFAULT_WIDGETS in case we added new widgets in future versions
          const merged = DEFAULT_WIDGETS.map(dw => {
            const match = parsed.find(w => w && w.id === dw.id);
            let mappedSize = dw.size;
            if (match && match.size) {
              const sz = match.size;
              if (sz === 'full' || sz === '2x1' || sz === '2x2') {
                const ids_2x2 = ['main_stats', 'neural_pet', 'history', 'quick_correction', 'tips', 'shortcuts'];
                mappedSize = ids_2x2.includes(dw.id) ? '2x2' : '2x1';
              } else if (sz === 'half' || sz === '1x1') {
                mappedSize = '1x1';
              } else if (sz === '1x2') {
                mappedSize = '1x2';
              } else {
                mappedSize = sz;
              }
            }
            // Zapewniamy sensowny rozmiar omijając złe / zepsute rozmiary
            const allowed = getAllowedSizesForWidget(dw.id);
            if (!allowed.includes(mappedSize as any)) {
              mappedSize = allowed[0];
            }
            const restoredShape = match?.shape ? match.shape : dw.shape;
            return match ? { ...dw, visible: match.visible !== false, size: dw.canResize ? (mappedSize as any) : dw.size, shape: restoredShape } : dw;
          });
          
          // Sorter according to parsed order
          const order = parsed.filter(w => w && w.id).map(w => w.id);
          const sorted = [...merged].sort((a, b) => {
            const idxA = order.indexOf(a.id);
            const idxB = order.indexOf(b.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
          loadedWidgets = sorted;
        }
      } catch (e) {
        console.error("Error loading dashboard layout:", e);
      }
    }

    return loadedWidgets;
  });

  const [layoutMode, setLayoutMode] = useState<"classic" | "grid">(() => {
    const saved = localStorage.getItem('glikosfera_layout_mode_v6');
    return (saved === "grid" || saved === "classic") ? saved : "grid";
  });

  useEffect(() => {
    localStorage.setItem('glikosfera_layout_mode_v6', layoutMode);
  }, [layoutMode]);

  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [movingWidgetId, setMovingWidgetId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  

  
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    Haptics.light();
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newWidgets = arrayMove(items, oldIndex, newIndex);
        if (user) {
           setDoc(
             doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "settings", "dashboard_layout"),
             { widgets: newWidgets, updatedAt: serverTimestamp() },
             { merge: true }
           ).catch(console.error);
        }
        return newWidgets;
      });
      Haptics.light();
    }
  };

  const handlePlaceWidget = (targetIndex: number) => {
    if (movingWidgetId === null) return;
    const sourceIndex = widgets.findIndex(w => w.id === movingWidgetId);
    if (sourceIndex === -1) return;
    if (sourceIndex === targetIndex) {
      setMovingWidgetId(null);
      return;
    }
    Haptics.medium();
    const newWidgets = [...widgets];
    const [draggedItem] = newWidgets.splice(sourceIndex, 1);
    const clampIndex = Math.min(targetIndex, newWidgets.length);
    newWidgets.splice(clampIndex, 0, draggedItem);
    setWidgets(newWidgets);
    setMovingWidgetId(null);
    toast.success(t('dashboard.messages.tile_moved'));
  };

  const saveLayoutToFirebase = async () => {
    if (!user) return;
    try {
      if (settings && (settings as any).dashboardLayout) {
         const currentStr = JSON.stringify((settings as any).dashboardLayout);
         const newStr = JSON.stringify(widgets);
         if (currentStr === newStr) return;
      }
      const settingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile');
      await setDoc(settingsRef, {
        dashboardLayout: widgets
      }, { merge: true });
    } catch (e) {
      console.error("Failed to sync dashboard to Firebase:", e);
    }
  };

  const handleFinishEditing = () => {
    Haptics.medium();
    setIsEditingLayout(false);
    saveLayoutToFirebase();
    toast.success(t('dashboard.messages.layout_saved'));
  };

  useEffect(() => {
    localStorage.setItem('glikocontrol_dashboard_widgets_v6', JSON.stringify(widgets));
  }, [widgets]);


  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [listFilter, setListFilter] = useState<'all' | 'glucose' | 'treatment'>('treatment');
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [wbtCalculated, setWbtCalculated] = useState<number>(0);
  const [showWbtDetails, setShowWbtDetails] = useState<boolean>(false);

  const handleDeleteLog = async (log: LogEntry) => {
    if (settings?.followerMode) return;
    try {
      window.dispatchEvent(new CustomEvent('localLogDelete', { detail: { id: log.id } }));
      
      if (log.nsId && nsUrl && nsSecret) {
        nightscoutService.deleteTreatment(log.nsId, nsUrl, nsSecret).catch(err => console.warn("Failed NS delete", err));
      }

      await deleteDoc(
        doc(
          db,
          "artifacts",
          "diacontrolapp",
          "users",
          getEffectiveUid(user),
          "logs",
          log.id!
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const currentTheme = settings?.theme || theme || "light";

  // Inline forms state
  const [inlineBgValue, setInlineBgValue] = useState("");
  const [inlineBolusDose, setInlineBolusDose] = useState("");
  const [inlineBolusCarbs, setInlineBolusCarbs] = useState("");
  const [inlineBolusNotes, setInlineBolusNotes] = useState("");

  const handleInlineBolusCarbsChange = (val: string) => {
    setInlineBolusCarbs(val);
    if (settings.wwRatio && val) {
      const carbs = parseFloat(val.replace(',', '.'));
      if (!isNaN(carbs) && carbs > 0) {
         const dose = ((carbs / 10) * settings.wwRatio).toFixed(1);
         setInlineBolusDose(dose.endsWith('.0') ? dose.replace('.0', '') : dose);
      } else {
         setInlineBolusDose("");
      }
    } else if (!val) {
      setInlineBolusDose("");
    }
  };

  const handleInlineBgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const val = parseFloat(inlineBgValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Wpisz poprawny wynik pomiaru!");
      return;
    }
    Haptics.medium();
    try {
      await addDoc(
        collection(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs"),
        {
          id: Math.random().toString(),
          timestamp: Date.now(),
          type: 'glucose', createdAt: serverTimestamp(), source: 'manual', value: val,
          notes: 'Szybki pomiar z kafelka'
        }
      );
      toast.success(`Zapisano pomiar: ${val} mg/dL`);
      setInlineBgValue("");
    } catch (err) {
      console.error(err);
      toast.error(i18n.t('auto.blad_zapisu', { defaultValue: i18n.t('auto.blad_zapisu', { defaultValue: "Błąd zapisu" }) }));
    }
  };

  const handleInlineBolusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const dose = parseFloat(inlineBolusDose);
    const carbs = parseFloat(inlineBolusCarbs) || 0;
    if (isNaN(dose) && isNaN(carbs)) {
      toast.error(i18n.t('auto.wpisz_dawke_insuliny_lub_weglo', { defaultValue: i18n.t('auto.wpisz_dawke_insuliny_lub', { defaultValue: "Wpisz dawkę insuliny lub węglowodany!" }) }));
      return;
    }
    Haptics.medium();
    try {
      if (!isNaN(dose) && dose > 0) {
        await addDoc(
          collection(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs"),
          {
            id: Math.random().toString(),
            timestamp: Date.now(),
            type: 'bolus', createdAt: serverTimestamp(), source: 'manual', value: dose,
             notes: inlineBolusNotes ? `Bolus: ${inlineBolusNotes}` : 'Szybki bolus z kafelka'
          }
        );
      }
      if (carbs > 0) {
        await addDoc(
          collection(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs"),
          {
            id: Math.random().toString(),
            timestamp: Date.now(),
            type: 'meal', createdAt: serverTimestamp(), source: 'manual', value: carbs,
            notes: inlineBolusNotes ? i18n.t('auto.posilek_var0', { defaultValue: "Posiłek: {{var0}}", var0: inlineBolusNotes }) : i18n.t('auto.szybki_posilek_z_kafelka', { defaultValue: i18n.t('auto.szybki_posilek_z_kafelka', { defaultValue: "Szybki posiłek z kafelka" }) })
          }
        );
      }
      toast.success("Zapisano wpis leczenia!");
      setInlineBolusDose("");
      setInlineBolusCarbs("");
      setInlineBolusNotes("");
    } catch (err) {
      console.error(err);
      toast.error(i18n.t('auto.blad_zapisu', { defaultValue: i18n.t('auto.blad_zapisu', { defaultValue: "Błąd zapisu" }) }));
    }
  };

  useEffect(() => {
    if (initialAction === "add_glucose" && !settings.followerMode) {
      setIsGlucoseModalOpen(true);
      onClearInitialAction?.();
    }
  }, [initialAction, settings.followerMode]);

  const lastG = logs.find((l) => l.type === "glucose");

  const moveWidget = (originalIndex: number, direction: 'up' | 'down') => {
    Haptics.light();
    const newWidgets = [...widgets];
    let step = direction === 'up' ? -1 : 1;
    let targetIdx = originalIndex + step;
    while (targetIdx >= 0 && targetIdx < newWidgets.length) {
      if (newWidgets[targetIdx].visible) {
        break;
      }
      targetIdx += step;
    }
    if (targetIdx >= 0 && targetIdx < newWidgets.length) {
      const temp = newWidgets[originalIndex];
      newWidgets[originalIndex] = newWidgets[targetIdx];
      newWidgets[targetIdx] = temp;
      setWidgets(newWidgets);
    }
  };

  const toggleWidgetVisibility = (id: string) => {
    Haptics.light();
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const cycleWidgetSize = (id: string) => {
    Haptics.light();
    setWidgets(prev => prev.map(w => {
      if (w.id === id && w.canResize) {
        const allowed = getAllowedSizesForWidget(w.id);
        const currentIndex = allowed.indexOf(w.size);
        const nextSize = allowed[(currentIndex + 1) % allowed.length];
        return { ...w, size: nextSize };
      }
      return w;
    }));
  };

  const cycleWidgetShape = (id: string) => {
    Haptics.light();
    setWidgets(prev => prev.map(w => {
      if (w.id === id && w.canChangeShape) {
        const allowed: ("default" | "circle" | "leaf" | "diamond" | "leaf-mirror")[] = ["default", "circle", "leaf", "leaf-mirror", "diamond"];
        const currentIndex = allowed.indexOf(w.shape || "default");
        const nextShape = allowed[(currentIndex + 1) % allowed.length];
        return { ...w, shape: nextShape };
      }
      return w;
    }));
  };

  const resetWidgets = async () => {
    Haptics.medium();
    
    const clonedDefault = DEFAULT_WIDGETS.map(w => ({ ...w }));
    // Wyczyść stare wersje zapisów z localStorage, aby uniknąć konfliktów i przywrócić czysty stan
    localStorage.removeItem('glikocontrol_dashboard_widgets');
    localStorage.removeItem('glikocontrol_dashboard_widgets_v4');
    localStorage.removeItem('glikocontrol_dashboard_widgets_v3');
    localStorage.removeItem('glikocontrol_dashboard_widgets_v5');
    localStorage.removeItem('glikosfera_layout_mode_v5');
    localStorage.setItem('glikocontrol_dashboard_widgets_v6', JSON.stringify(clonedDefault));
    localStorage.setItem('glikosfera_layout_mode_v6', 'grid');
    setWidgets(clonedDefault);
    setLayoutMode('grid');
    setMovingWidgetId(null);
    
    
    if (user) {
      try {
        const settingsRef = doc(db, 'artifacts', 'diacontrolapp', 'users', getEffectiveUid(user), 'settings', 'profile');
        await setDoc(settingsRef, {
          dashboardLayout: clonedDefault
        }, { merge: true });
      } catch (e) {
        console.error(e);
      }
    }

    toast.success(i18n.t('auto.przywrocono_domyslny_uklad_zgo', { defaultValue: i18n.t('auto.przywrocono_domyslny_ukla', { defaultValue: "Przywrócono domyślny układ zgodny z najnowszym wyglądem Diacontrol!" }) }));
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "shortcuts",
      ),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setShortcuts(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (error) => {
        console.error("Dashboard shortcuts error:", error);
      },
    );
    return () => {
      unsubscribe();
    };
  }, [user]);

  const quickAdd = async (s: any) => {
    if (s.carbs > 0) {
      if (!user) return;
      Haptics.medium();
      try {
        await addDoc(
          collection(
            db,
            "artifacts",
            "diacontrolapp",
            "users",
            getEffectiveUid(user),
            "logs",
          ),
          {
            type: "meal", createdAt: serverTimestamp(), source: "manual", value: s.carbs,
            timestamp: Date.now(),
            notes: i18n.t('auto.szybki_wybor_var0', { defaultValue: "Szybki wybór: {{var0}}", var0: s.name }),
            items: [{ name: s.name, carbs: s.carbs }],
          },
        );
        Haptics.success();
      } catch (e) {
        console.error("Quick log error:", e);
        Haptics.error();
      }
    } else {
      Haptics.light();
      setTab("meal");
    }
  };

  const iob = getEffectiveIOB(logs, pumpStatus, settings.dia || 4);

  const calculateTIR = () => {
    const glucoseLogs = logs.filter((l) => l.type === "glucose");
    if (glucoseLogs.length === 0) return { inRange: 0, high: 0, low: 0 };

    const inRange = glucoseLogs.filter(
      (l) => l.value >= settings.targetMin && l.value <= settings.targetMax,
    ).length;
    const low = glucoseLogs.filter((l) => l.value < settings.targetMin).length;
    const high = glucoseLogs.filter((l) => l.value > settings.targetMax).length;

    const total = glucoseLogs.length;
    return {
      inRange: Math.round((inRange / total) * 100),
      low: Math.round((low / total) * 100),
      high: Math.round((high / total) * 100),
    };
  };

  const tir = calculateTIR();

  const calculateHbA1c = () => {
    const glucoseLogs = logs.filter((l) => l.type === "glucose");
    if (glucoseLogs.length === 0) return 0;
    const avg =
      glucoseLogs.reduce((acc, l) => acc + l.value, 0) / glucoseLogs.length;
    return (avg + 46.7) / 28.7;
  };

  const hba1c = calculateHbA1c();

  const patternInsights = useMemo(() => {
    const insights = [];
    const glucoseLogs = logs.filter((l) => l.type === "glucose").slice(0, 100);

    if (glucoseLogs.length > 5) {
      const morningLogs = glucoseLogs.filter((l) => {
        const hour = new Date(l.timestamp).getHours();
        return hour >= 5 && hour <= 9;
      });
      if (morningLogs.some((l) => l.value > 150)) {
        insights.push({
          type: "dawn",
          text: i18n.t('auto.możliwy_efekt_brzasku_skoki_rano', { defaultValue: i18n.t('auto.mozliwy_efekt_brzasku_sko', { defaultValue: "Możliwy efekt brzasku (skoki rano)" }) }),
        });
      }

      const lows = glucoseLogs.filter((l) => l.value < 70);
      if (lows.length > 2) {
        insights.push({ type: "lows", text: i18n.t('auto.zbyt_wiele_niskich_cukrów', { defaultValue: i18n.t('auto.zbyt_wiele_niskich_cukrow', { defaultValue: "Zbyt wiele niskich cukrów" }) }) });
      }

      const postMeal = logs.filter((l) => l.type === "meal").slice(0, 5);
      postMeal.forEach((m) => {
        const afterMeal = glucoseLogs.find(
          (g) =>
            g.timestamp > m.timestamp &&
            g.timestamp < m.timestamp + 2 * 60 * 60 * 1000,
        );
        if (afterMeal && afterMeal.value > 180) {
          insights.push({
            type: "postMeal",
            text: i18n.t('auto.wysoki_cukier_po_ostatnim_posiłku', { defaultValue: i18n.t('auto.wysoki_cukier_po_ostatnim', { defaultValue: "Wysoki cukier po ostatnim posiłku" }) }),
          });
        }
      });
    }

    // Deduplicate by text
    const unique = [];
    const seen = new Set();
    for (const insight of insights) {
      if (!seen.has(insight.text)) {
        seen.add(insight.text);
        unique.push(insight);
      }
    }

    return unique.slice(0, 2).map((i) => {
      let icon = <TrendingUp className="text-orange-500" size={14} />;
      if (i.type === "lows")
        icon = <AlertTriangle className="text-red-500" size={14} />;
      if (i.type === "postMeal")
        icon = <Utensils className="text-amber-500" size={14} />;
      return { ...i, icon };
    });
  }, [logs]);

  const getTrend = () => {
    const glucoseLogs = logs
      .filter((l) => l.type === "glucose")
      .sort((a, b) => b.timestamp - a.timestamp);
    if (glucoseLogs.length < 2) return null;
    const current = glucoseLogs[0];
    const prev = glucoseLogs[1];
    
    const rawDiff = current.value - prev.value;
    const timeDiff = (current.timestamp - prev.timestamp) / (1000 * 60); // minutes

    if (timeDiff <= 0 || timeDiff > 120) return null; // Too much time passed to determine trend

    // Normalize diff to a 5-minute time frame for standard delta presentation
    const diff = (rawDiff / timeDiff) * 5;
    const deltaText = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} mg/dL`;

    if (diff > 15)
      return {
        icon: <ChevronRight className="-rotate-90" />,
        color: "text-rose-500",
        text: i18n.t('auto.szybko_rośnie', { defaultValue: i18n.t('auto.szybko_rosnie', { defaultValue: "Szybko rośnie" }) }),
        direction: "UP_FAST",
        deltaText,
        rawDiff: diff
      };
    if (diff > 5)
      return {
        icon: <ChevronRight className="-rotate-45" />,
        color: "text-rose-400",
        text: i18n.t('auto.rośnie', { defaultValue: i18n.t('auto.rosnie', { defaultValue: "Rośnie" }) }),
        direction: "UP",
        deltaText,
        rawDiff: diff
      };
    if (diff < -15)
      return {
        icon: <ChevronRight className="rotate-90" />,
        color: "text-rose-500",
        text: i18n.t('auto.szybko_spada', { defaultValue: 'Szybko spada' }),
        direction: "DOWN_FAST",
        deltaText,
        rawDiff: diff
      };
    if (diff < -5)
      return {
        icon: <ChevronRight className="rotate-45" />,
        color: "text-rose-400",
        text: i18n.t('auto.spada', { defaultValue: 'Spada' }),
        direction: "DOWN",
        deltaText,
        rawDiff: diff
      };
    return {
      icon: <ChevronRight />,
      color: "text-emerald-500",
      text: i18n.t('auto.stabilnie', { defaultValue: 'Stabilnie' }),
      direction: "STABLE",
      deltaText,
      rawDiff: diff
    };
  };

  const trend = getTrend();

  const getTodayStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter((l) => l.timestamp >= today.getTime());
    const meals = todayLogs.filter((l) => l.type === "meal");
    const insulin = todayLogs.filter((l) => l.type === "bolus");

    return {
      carbs: meals.reduce((acc, l) => acc + (l.value || 0), 0),
      insulin: insulin.reduce((acc, l) => acc + (l.value || 0), 0),
    };
  };

  const todayStats = getTodayStats();

  const quickCorrectionWidget = useMemo(() => {
    if (!lastG) return null;
    const bgNum = lastG.value;
    const targetMax = settings.targetMax || 140;
    
    // Check if glucose is above target range
    const isHigh = bgNum >= targetMax;
    if (!isHigh) return null;

    // Resolve current ISF based on hourly profiles
    let currentIsfValue = settings.isf || 50;
    if (settings.hourlyProfiles && settings.hourlyProfiles.length > 0) {
      const nowTime = new Date();
      const currentHourStr =
        nowTime.getHours().toString().padStart(2, "0") +
        ":" +
        nowTime.getMinutes().toString().padStart(2, "0");
      const sorted = [...settings.hourlyProfiles].sort((a, b) =>
        a.time.localeCompare(b.time)
      );
      let activeProfile = sorted
        .slice()
        .reverse()
        .find((p) => p.time <= currentHourStr);
      if (!activeProfile && sorted.length > 0)
        activeProfile = sorted[sorted.length - 1];

      if (activeProfile) {
        currentIsfValue = activeProfile.isf || currentIsfValue;
      }
    }

    const targetBg = Math.round(((settings.targetMin || 70) + (settings.targetMax || 140)) / 2);
    const rawCorr = bgNum > targetBg ? (bgNum - targetBg) / currentIsfValue : 0;
    
    // IOB is already defined as `iob`
    const rawSuggestedDose = Math.max(0, rawCorr - iob);
    const roundedSuggestedDose = Math.round(rawSuggestedDose * 10) / 10;

    if (roundedSuggestedDose <= 0) {
      return null;
    }

    const timeString = new Date(lastG.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
      <div className="mx-2 p-6 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-[2.5rem] border border-indigo-100/70 dark:border-indigo-900/30 space-y-4 shadow-xl shadow-indigo-500/5 font-display">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <span className="text-xl">⚡</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">{t('auto.sugerowana_szybka_korekta', { defaultValue: 'Sugerowana Szybka Korekta' })}</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{t('auto.na_podstawie_pomiaru_z_godziny', { defaultValue: 'Na podstawie pomiaru z godziny' })} {timeString}</p>
            </div>
          </div>
          <button
            onClick={() => {
              Haptics.medium();
              sessionStorage.setItem("pending_correction", JSON.stringify({
                bg: bgNum,
                dose: roundedSuggestedDose
              }));
              toast.success(`Przeniesiono korektę ${roundedSuggestedDose}j do kalkulatora`);
              setTab("bolus");
            }}
            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer pointer-events-auto shrink-0"
          >
            
                                {t('auto.podaj', { defaultValue: 'Podaj' })} {roundedSuggestedDose.toFixed(1)}  {t('auto.j', { defaultValue: 'j.' })}
                              </button>
        </div>

        <div className="p-4 bg-white/70 dark:bg-slate-900/60 rounded-3xl text-[11px] text-indigo-950 dark:text-indigo-200 font-bold border border-indigo-100 dark:border-indigo-900/20 leading-normal space-y-2">
          <div>
            
                                {t('auto.glikemia_w_wysokim_zakresie', { defaultValue: '⚠️ Glikemia w wysokim zakresie (' })}{Math.round(bgNum)}  {t('auto.mg_dl_sugerujemy_podanie', { defaultValue: 'mg/dL)! Sugerujemy podanie' })} <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{roundedSuggestedDose.toFixed(1)}  {t('auto.j', { defaultValue: 'j.' })}</span>  {t('auto.insuliny', { defaultValue: 'insuliny.' })}
                              </div>
          <div className="text-[9px] text-slate-500 dark:text-indigo-400/65 font-mono leading-relaxed border-t border-indigo-100 dark:border-indigo-950/50 pt-2 flex flex-wrap gap-x-3 gap-y-1">
            <span>{t('auto.sugerowany_bolus', { defaultValue: 'Sugerowany bolus:' })} {roundedSuggestedDose.toFixed(1)}j</span>
            <span>{t('auto.cel', { defaultValue: 'Cel:' })} {targetBg}  {t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
            <span>{t('auto.isf', { defaultValue: 'ISF:' })} {currentIsfValue}  {t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
            <span>{t('auto.iob', { defaultValue: 'IOB:' })} {iob.toFixed(1)}j</span>
          </div>
        </div>
      </div>
    );
  }, [lastG, settings, iob, setTab]);

  const renderWidget = (id: string, size: "2x2" | "2x1" | "1x2" | "1x1") => {
    const hasReminders = settings.sensorChangeDate || settings.infusionSetChangeDate;
    const isHighGlucose = lastG && lastG.value >= (settings.targetMax || 140);
    const showCorrection = isHighGlucose && quickCorrectionWidget;

    switch (id) {
      case "main_stats":
        return (
          <GlikoWidget
            logs={logs}
            setTab={setTab}
            iob={iob}
            todayStats={todayStats}
            trend={trend}
            tir={tir}
            hba1c={hba1c}
            glassmorphismEnabled={settings.glassmorphismEnabled}
            compact={size.startsWith("1")}
          />
        );

      case "quick_correction":
        if (!showCorrection) {
          if (isEditingLayout) {
            return (
              <div className="mx-2 p-6 bg-slate-500/5 dark:bg-slate-950/10 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-[2.5rem] text-center text-xs text-slate-400 dark:text-slate-500 font-bold font-display flex flex-col justify-center items-center min-h-[140px] w-full">
                
                                    {t('auto.sugerowana_szybka_korekta_nieaktywn', { defaultValue: '⚡ Sugerowana Szybka Korekta [Nieaktywna]' })}
                                    <p className="text-[10px] text-slate-400 dark:text-slate-600 font-normal mt-1">
                  
                                          {t('auto.pojawia_się_automatycznie_grawitacy', { defaultValue: i18n.t('auto.pojawia_sie_automatycznie', { defaultValue: "Pojawia się automatycznie grawitacyjnie powyżej celu glikemii." }) })}
                                        </p>
              </div>
            );
          }
          return null;
        }
        if (size.startsWith("1") || size.endsWith("1")) {
          const bgNum = lastG ? lastG.value : 100;
          const targetBg = Math.round(((settings.targetMin || 70) + (settings.targetMax || 140)) / 2);
          
          let currentIsfValue = settings.isf || 50;
          if (settings.hourlyProfiles && settings.hourlyProfiles.length > 0) {
            const nowTime = new Date();
            const currentHourStr =
              nowTime.getHours().toString().padStart(2, "0") +
              ":" +
              nowTime.getMinutes().toString().padStart(2, "0");
            const sorted = [...settings.hourlyProfiles].sort((a, b) =>
              a.time.localeCompare(b.time)
            );
            let activeProfile = sorted
              .slice()
              .reverse()
              .find((p) => p.time <= currentHourStr);
            if (!activeProfile && sorted.length > 0)
              activeProfile = sorted[sorted.length - 1];

            if (activeProfile) {
              currentIsfValue = activeProfile.isf || currentIsfValue;
            }
          }

          const rawCorr = bgNum > targetBg ? (bgNum - targetBg) / currentIsfValue : 0;
          const rawSuggestedDose = Math.max(0, rawCorr - iob);
          const roundedSuggestedDose = Math.round(rawSuggestedDose * 10) / 10;

          return (
            <div className="mx-2 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-[2.5rem] border border-indigo-100/70 dark:border-indigo-900/30 flex flex-col justify-between h-full min-h-[140px] shadow-xl font-display w-full">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                <span className="text-lg">⚡</span>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider leading-none">{t('auto.korekta', { defaultValue: 'Korekta' })}</h4>
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold">{t('auto.cel', { defaultValue: 'Cel:' })} {targetBg}  {t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
                </div>
              </div>

              <div className="my-2 text-center">
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{roundedSuggestedDose.toFixed(1)} <span className="text-xs font-bold text-slate-400">{t('auto.j', { defaultValue: 'j.' })}</span></p>
                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black">{t('auto.glikemia', { defaultValue: 'Glikemia:' })} {Math.round(bgNum)}  {t('auto.mg_dl', { defaultValue: 'mg/dL' })}</p>
              </div>

              <button
                onClick={() => {
                  Haptics.medium();
                  sessionStorage.setItem("pending_correction", JSON.stringify({
                    bg: bgNum,
                    dose: roundedSuggestedDose
                  }));
                  toast.success(`Przeniesiono korektę ${roundedSuggestedDose}j do kalkulatora`);
                  setTab("bolus");
                }}
                className="w-full py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                
                                      {t('auto.dodaj', { defaultValue: 'Dodaj' })} {roundedSuggestedDose.toFixed(1)}j
              </button>
            </div>
          );
        }
        return quickCorrectionWidget;

      case "neural_pet":
        return (
          <div className="glass-card overflow-hidden !p-0 w-full h-full">
            <GlikoSenseNeural 
              glucose={lastG ? Math.round(lastG.value) : null}
              trend={trend?.direction || null}
              isChildMode={settings.childMode || false}
              petName={petData?.name}
              accuracy={mlInfo?.accuracy}
              datasetSize={mlInfo?.datasetSize || logs.length}
              compact={size.startsWith("1")}
            >
              {settings.childMode && (
                 <VirtualPet user={user} logs={logs} glucose={lastG ? lastG.value : null} setTab={setTab} embedded={true} pumpStatus={pumpStatus} />
              )}
            </GlikoSenseNeural>
          </div>
        );

      case "daily_tir":
        return (
          <div className="glass-card !p-0 w-full h-full overflow-hidden">
            <DailyTirWidget logs={logs} settings={settings} />
          </div>
        );

      case "weather":
        return <WeatherWidget compact={size.startsWith("1")} />;

      case "sensor_reminder":
        if (!settings.sensorChangeDate) {
          if (isEditingLayout) {
            return (
              <div className="mx-2 p-4 bg-slate-500/10 dark:bg-slate-950/20 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-[2.5rem] text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold font-display flex flex-col justify-center items-center min-h-[140px] w-full">
                
                                    {t('auto.sensor_glikemii_brak_daty', { defaultValue: '📡 Sensor glikemii [Brak daty]' })}
                                    <p className="text-[9px] text-slate-400 dark:text-slate-600 font-normal mt-1">
                  
                                          {t('auto.ustaw_datę_sensora_w_profilu', { defaultValue: i18n.t('auto.ustaw_date_sensora_w_prof', { defaultValue: "Ustaw datę sensora w Profilu." }) })}
                                        </p>
              </div>
            );
          }
          return null;
        }
        const isSensCompact = size.startsWith("1");
        return (
          <div 
            onClick={() => { 
              if (!isEditingLayout) {
                Haptics.light();
                setTab('profile'); 
                onAction?.('devices'); 
              }
            }}
            className={cn("glass-card flex flex-col justify-between relative overflow-hidden cursor-pointer transition-all w-full h-full", isSensCompact ? "!p-3.5 min-h-[120px]" : "!p-5 min-h-[140px]")}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
            <div className="flex justify-between items-start w-full">
              <div className="p-1.5 bg-violet-500/10 rounded-xl border border-violet-500/20 text-violet-500"><Signal size={14} /></div>
              <span className="text-[8px] font-black text-violet-500 uppercase tracking-widest bg-violet-500/5 py-1 px-2 rounded-full border border-violet-500/10">{t('auto.sensor', { defaultValue: 'Sensor' })}</span>
            </div>
            <div className={isSensCompact ? "mt-2 w-full" : "mt-4 w-full"}>
              {(() => {
                const msLeft = settings.sensorChangeDate + (settings.sensorDurationDays || 10) * 24 * 60 * 60 * 1000 - Date.now();
                const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const isExpired = msLeft <= 0;
                return (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className={cn("font-black tracking-tight", isSensCompact ? "text-xl" : "text-3xl", isExpired ? "text-rose-500" : "text-slate-800 dark:text-white")}>{isExpired ? "0" : daysLeft}</span>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{t('auto.dni', { defaultValue: 'Dni' })}</span>
                      {!isExpired && hoursLeft > 0 && (
                        <>
                          <span className={cn("font-black text-slate-800 dark:text-white ml-1", isSensCompact ? "text-base" : "text-xl")}>{hoursLeft}</span>
                          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase text-[0.6rem]">g</span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden w-full">
                      <div className={cn("h-full", isExpired ? "bg-rose-500" : "bg-violet-600")} style={{ width: `${Math.max(0, Math.min(100, (msLeft / ((settings.sensorDurationDays || 10) * 24 * 60 * 60 * 1000)) * 100))}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );

      case "infusion_reminder":
        if (!settings.infusionSetChangeDate) {
          if (isEditingLayout) {
            return (
              <div className="mx-2 p-4 bg-slate-500/10 dark:bg-slate-950/20 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-[2.5rem] text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold font-display flex flex-col justify-center items-center min-h-[140px] w-full">
                
                                    {t('auto.wkłucie_brak_daty', { defaultValue: i18n.t('auto.wklucie_brak_daty', { defaultValue: "💧 Wkłucie [Brak daty]" }) })}
                                    <p className="text-[9px] text-slate-400 dark:text-slate-600 font-normal mt-1">
                  
                                          {t('auto.ustaw_datę_wkłucia_w_profilu', { defaultValue: i18n.t('auto.ustaw_date_wklucia_w_prof', { defaultValue: "Ustaw datę wkłucia w Profilu." }) })}
                                        </p>
              </div>
            );
          }
          return null;
        }
        const isInfCompact = size.startsWith("1");
        return (
          <div 
            onClick={() => { 
              if (!isEditingLayout) {
                Haptics.light();
                setTab('profile'); 
                onAction?.('devices'); 
              }
            }}
            className={cn("glass-card flex flex-col justify-between relative overflow-hidden cursor-pointer transition-all w-full h-full", isInfCompact ? "!p-3.5 min-h-[120px]" : "!p-5 min-h-[140px]")}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
            <div className="flex justify-between items-start w-full">
              <div className="p-1.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-500"><Droplets size={14} /></div>
              <span className="text-[8px] font-black text-cyan-600 uppercase tracking-widest bg-cyan-500/5 py-1 px-2 rounded-full border border-cyan-500/10">{t('auto.wkłucie', { defaultValue: i18n.t('auto.wklucie', { defaultValue: "Wkłucie" }) })}</span>
            </div>
            <div className={isInfCompact ? "mt-2 w-full" : "mt-4 w-full"}>
              {(() => {
                const msLeft = settings.infusionSetChangeDate + (settings.infusionSetDurationDays || 3) * 24 * 60 * 60 * 1000 - Date.now();
                const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const isExpired = msLeft <= 0;
                return (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className={cn("font-black tracking-tight", isInfCompact ? "text-xl" : "text-3xl", isExpired ? "text-rose-500" : "text-slate-800 dark:text-white")}>{isExpired ? "0" : daysLeft}</span>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{t('auto.dni', { defaultValue: 'Dni' })}</span>
                      {!isExpired && hoursLeft > 0 && (
                        <>
                          <span className={cn("font-black text-slate-800 dark:text-white ml-1", isInfCompact ? "text-base" : "text-xl")}>{hoursLeft}</span>
                          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase text-[0.6rem]">g</span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden w-full">
                      <div className={cn("h-full", isExpired ? "bg-rose-500" : "bg-cyan-500")} style={{ width: `${Math.max(0, Math.min(100, (msLeft / ((settings.infusionSetDurationDays || 3) * 24 * 60 * 60 * 1000)) * 100))}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );

      case "assistant":
        const isAss1x1 = size === "1x1";
        const isAssCompact = size.startsWith("1");
        
        if (isAss1x1) {
          return (
            <div 
               onClick={() => {
                 if (!isEditingLayout) {
                   Haptics.light();
                   setTab('assistant');
                 }
               }}
               className="relative group cursor-pointer active:scale-[0.98] transition-all w-full h-full"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 rounded-[2.6rem] opacity-30 group-hover:opacity-60 blur-md transition duration-500"></div>
              <div className="relative glass p-4 flex flex-col justify-center items-center gap-1.5 overflow-hidden rounded-[2.5rem] border border-white/50 dark:border-white/5 h-full w-full">
                <div className="rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg shrink-0 w-11 h-11 animate-pulse shadow-indigo-500/30">
                  <Sparkles size={20} />
                </div>
                <span className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-wider font-display shrink-0">{t('auto.asystent_ai', { defaultValue: 'Asystent AI' })}</span>
              </div>
            </div>
          );
        }

        return (
          <div 
             onClick={() => {
               if (!isEditingLayout) {
                 Haptics.light();
                 setTab('assistant');
               }
             }}
             className="relative group cursor-pointer active:scale-[0.98] transition-all w-full h-full"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 rounded-[2.6rem] opacity-30 group-hover:opacity-60 blur-md transition duration-500"></div>
            <div className="relative glass p-5 flex items-center gap-4 overflow-hidden rounded-[2.5rem] border border-white/50 dark:border-white/5 h-full">
              <div className={cn("rounded-2xl bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center shadow-lg shrink-0", isAssCompact ? "w-10 h-10 animate-pulse" : "w-12 h-12")}>
                <Sparkles size={isAssCompact ? 20 : 24} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight font-display">
                  
                                              {t('auto.asystent_ai', { defaultValue: 'Asystent AI' })}
                                            </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-tight truncate font-display">
                  {isAssCompact
                    ? "Inteligentna analityka predykcyjna."
                    : i18n.t('auto.zadaj_pytanie_swoim_opiekunom', { defaultValue: i18n.t('auto.zadaj_pytanie_swoim_opiek', { defaultValue: "Zadaj pytanie swoim opiekunom AI o wyniki, dietę lub trendy glikemii." }) })}
                </p>
              </div>
              {!isAssCompact && (
                <div className="p-2 rounded-full bg-slate-100/50 dark:bg-white/5 text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <ChevronRight size={20} />
                </div>
              )}
            </div>
          </div>
        );

      case "tips":
        return (
          <div className="w-full h-full">
            <DidYouKnowWidget onClick={() => {
              if (!isEditingLayout) {
                onAction?.('tutorial');
                setTab('profile');
              }
            }} />
          </div>
        );

      case "glikosense_suggestions": {
        const hasPatterns = patternInsights.length > 0;
        const isSg1x1 = size === "1x1";
        const isSg1x2 = size === "1x2";

        if (isSg1x1) {
          return (
            <div 
              onClick={() => { if (!isEditingLayout) { Haptics.light(); setTab("ai"); } }}
              className="glass-card !p-3.5 flex flex-col justify-between h-full w-full border border-emerald-500/10 dark:border-emerald-500/5 relative overflow-hidden text-left cursor-pointer min-h-[120px]"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-[25px] -mr-8 -mt-8 pointer-events-none"></div>
              <div className="flex justify-between items-center w-full">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <GlikoSenseIcon size={14} isAnalyzing={true} />
                </div>
                <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{t('auto.sugestie', { defaultValue: 'Sugestie' })}</span>
              </div>
              <div className="my-1">
                <p className="font-black text-xl dark:text-white font-display text-left tracking-tight leading-none text-emerald-600 dark:text-emerald-400">
                  {patternInsights.length + 1}
                </p>
                <span className="text-[7px] opacity-60 uppercase font-black text-slate-400 block text-left mt-0.5 leading-none">{t('auto.wskazówki_ai', { defaultValue: i18n.t('auto.wskazowki_ai', { defaultValue: "Wskazówki AI" }) })}</span>
              </div>
              <p className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter truncate font-display text-left">
                
                                      {t('auto.analiza_ai', { defaultValue: 'Analiza AI ➡️' })}
                                    </p>
            </div>
          );
        }

        if (isSg1x2) {
          return (
            <div className="glass-card !p-3.5 flex flex-col justify-between h-full w-full border border-emerald-500/10 dark:border-emerald-500/5 relative overflow-hidden text-left min-h-[220px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
              
              <div className="flex justify-between items-center w-full">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <GlikoSenseIcon size={14} isAnalyzing={true} />
                </div>
                <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{t('auto.analizy_ai', { defaultValue: 'Analizy AI' })}</span>
              </div>
              
              <div className="mt-2 border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-[7px] uppercase font-black text-slate-400 block mb-1 opacity-60">{t('auto.wzorce_glikosense', { defaultValue: 'Wzorce GlikoSense' })}</span>
                {hasPatterns ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                    <span className="shrink-0">{patternInsights[0].icon}</span>
                    <span className="truncate">{patternInsights[0].text}</span>
                  </div>
                ) : (
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-600 italic">{t('auto.cukry_są_stabilne', { defaultValue: i18n.t('auto.cukry_sa_stabilne', { defaultValue: "Cukry są stabilne!" }) })}</div>
                )}
              </div>

              <div className="my-2 flex-1 overflow-hidden flex flex-col justify-center">
                <GlikoSenseTips logs={logs} pumpStatus={pumpStatus} compact={true} />
              </div>

              <button
                onClick={() => { if (!isEditingLayout) { Haptics.light(); setTab("ai"); } }}
                className="w-full py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-center"
              >
                
                                      {t('auto.wszystkie_analizy', { defaultValue: 'Wszystkie analizy ➡️' })}
                                    </button>
            </div>
          );
        }

        return (
          <div className="glass-card !p-5 flex flex-col justify-between h-full w-full border border-emerald-500/10 dark:border-emerald-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
            
            <div className="flex-1 flex flex-col justify-between gap-3 overflow-y-auto scrollbar-none text-left">
              {hasPatterns ? (
                <div className="flex items-start gap-3 w-full">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">
                    <GlikoSenseIcon size={14} isAnalyzing={true} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none mb-1 font-display">
                      
                                                          {t('auto.zalecenia_glikosense', { defaultValue: 'Zalecenia GlikoSense' })}
                                                        </p>
                    <div className="space-y-1">
                      {patternInsights.slice(0, 2).map((insight: any, idx: number) => (
                        <div key={`insight-${idx}`} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                          <span className="shrink-0">{insight.icon}</span>
                          <span className="truncate">{insight.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => { if (!isEditingLayout) { Haptics.light(); setTab("ai"); } }} className="p-1 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-[9px] font-black uppercase text-emerald-600 transition-all active:scale-90 shrink-0">
                    
                                                    {t('auto.analiza_ai', { defaultValue: 'Analiza AI' })}
                                                  </button>
                </div>
              ) : null}

              <div className={cn("w-full text-left", hasPatterns ? "border-t border-slate-100 dark:border-white/5 pt-2" : "")}>
                <GlikoSenseTips logs={logs} pumpStatus={pumpStatus} />
              </div>
            </div>
          </div>
        );
      }

      case "shortcuts":
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
                "artifacts",
                "diacontrolapp",
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
                  onAction?.("food");
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
                    onAction?.("food");
                    setTab("profile");
                  }
                }}
                className="text-[9px] font-black text-accent-500 uppercase tracking-tight"
              >
                
                                        {t('auto.edytuj', { defaultValue: 'Edytuj' })}
                                      </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none mask-fade-right w-full">
              {shortcuts.map((s) => (
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

      case "medications":
        return (
          <div className="w-full h-full p-0">
            <MedicationsWidget medications={settings?.medications || []} size={size} />
          </div>
        );

      case "carbs_balance":
        return <CarbsBalanceWidget logs={logs} settings={settings} size={size} setTab={setTab} onAction={onAction} />;

      case "hydration":
        return <HydrationWidget size={size} />;
      
      case "health_connect":
        return <HealthWidget />;

      case "site_rotation":
        return <SiteRotationWidget logs={logs} settings={settings} size={size} setTab={setTab} onAction={onAction} />;

      case "training_widget":
        const isTrCompact = size === "1x1";
        const hasActiveTraining = !!settings?.activeTraining;
        const isTrBig = size === "2x2";
        return (
          <div 
            onClick={() => {
              if (!isEditingLayout) {
                Haptics.light();
                onAction?.("training");
                setTab("profile");
              }
            }}
            className={cn(
              "glass-card cursor-pointer active:scale-95 transition-all w-full h-full relative overflow-hidden border border-emerald-500/10 dark:border-emerald-500/5 flex flex-col justify-between group",
              isTrCompact ? "!p-3.5 min-h-[120px]" : "!p-5 min-h-[140px]"
            )}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none group-hover:bg-emerald-500/10 transition-all"></div>
            
            <div className="flex justify-between items-start w-full">
              <div className="p-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
                <Activity size={14} className={cn(hasActiveTraining && "animate-pulse")} />
              </div>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest py-1 px-2 rounded-full border",
                hasActiveTraining 
                  ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" 
                  : "text-slate-500 bg-slate-500/5 border-slate-500/10"
              )}>
                
                                        {t('auto.trening', { defaultValue: 'Trening' })}
                                      </span>
            </div>

            <div className="mt-2 w-full text-left">
              {hasActiveTraining ? (
                <div>
                  <h4 className="font-black text-rose-500 text-[10px] uppercase tracking-wide leading-none animate-pulse mb-0.5">{t('auto.trwa_trening', { defaultValue: 'Trwa Trening!' })}</h4>
                  <p className="font-bold text-slate-800 dark:text-white leading-tight font-display truncate text-sm">
                    {SPORTS.find(s => s.id === settings.activeTraining?.sportId)?.name || i18n.t('auto.aktywnosc', { defaultValue: i18n.t('auto.aktywnosc', { defaultValue: "Aktywność" }) })}
                  </p>
                  {!isTrCompact && (
                    <p className="text-[8px] text-slate-400 font-bold">{t('auto.czas_trwania', { defaultValue: 'Czas trwania:' })} {settings.activeTraining.duration}  {t('auto.min_kliknij_aby_zarządzać', { defaultValue: i18n.t('auto.min_kliknij_aby_zarzadzac', { defaultValue: "min • Kliknij aby zarządzać" }) })}</p>
                  )}
                </div>
              ) : (
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white text-[11px] uppercase tracking-tighter leading-tight font-display">
                    {isTrCompact ? "Ruch to zdrowie" : "Rozpocznij Trening"}
                  </h4>
                  <p className="text-[8px] text-slate-500 dark:text-slate-400 font-bold leading-tight mt-0.5">
                    {isTrCompact ? i18n.t('auto.rejestruj_aktywnosc', { defaultValue: i18n.t('auto.rejestruj_aktywnosc', { defaultValue: "Rejestruj aktywność" }) }) : i18n.t('auto.dodaj_wysilek_i_kontroluj_spad', { defaultValue: i18n.t('auto.dodaj_wysilek_i_kontroluj', { defaultValue: "Dodaj wysiłek i kontroluj spadek zapotrzebowania na insulinę." }) })}
                  </p>
                </div>
              )}
            </div>

            {!isTrCompact && !hasActiveTraining && (
              <span className="text-[9px] text-emerald-500 font-black uppercase tracking-wider self-start mt-2">{t('auto.zacznij', { defaultValue: 'Zacznij 🏃‍♂️' })}</span>
            )}
            {isTrBig && !hasActiveTraining && (
              <div className="mt-3 border-t border-slate-100 dark:border-white/5 pt-3">
                <p className="text-[8px] uppercase tracking-wider text-slate-400 font-black mb-1.5">{t('auto.dostępne_dyscypliny', { defaultValue: i18n.t('auto.dostepne_dyscypliny', { defaultValue: "DOSTĘPNE DYSCYPLINY:" }) })}</p>
                <div className="flex flex-wrap gap-1">
                  {SPORTS.slice(0, 4).map(s => (
                    <span key={s.id} className="text-[9px] font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1"><s.icon size={11} /> {s.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "quick_measurement": {
        const isMs1x1 = size === "1x1";
        const isMs1x2 = size === "1x2";

        if (isMs1x1) {
          return (
            <button
              onClick={() => {
                if (!isEditingLayout) {
                  Haptics.light();
                  setIsGlucoseModalOpen(true);
                }
              }}
              className={cn(
                "bg-rose-500 flex flex-col items-center justify-center gap-2 shadow-2xl shadow-rose-500/40 active:scale-95 group transition-all text-white overflow-hidden relative w-full select-none h-full py-5 rounded-[2.5rem] min-h-[140px]"
              )}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-[40px] -mr-12 -mt-12 group-hover:bg-white/20 transition-all pointer-events-none"></div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner shrink-0 pointer-events-none">
                <Droplet size={22} strokeWidth={2.5} />
              </div>
              <div className="text-center pointer-events-none">
                <span className="font-black text-[10px] uppercase tracking-widest font-display block">{t('auto.pomiar', { defaultValue: 'Pomiar' })}</span>
                <span className="text-[8px] text-white/70 font-bold leading-none">{t('auto.ręczny_wynik', { defaultValue: i18n.t('auto.reczny_wynik', { defaultValue: "Ręczny wynik" }) })}</span>
              </div>
            </button>
          );
        }

        if (isMs1x2) {
          return (
            <div className="glass-card !p-3.5 flex flex-col justify-between h-full w-full relative overflow-hidden text-left min-h-[220px] border border-white/50 dark:border-white/5 shadow-2xl animate-fade-in">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
              
              <div className="flex justify-between items-center w-full">
                <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-500"><Droplet size={14} strokeWidth={2.5} /></div>
                <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{t('auto.pomiar', { defaultValue: 'Pomiar' })}</span>
              </div>
              
              <div className="mt-2 text-left flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[7px] uppercase font-black text-slate-400 block mb-1 opacity-60">{t('auto.szybki_zapis', { defaultValue: 'Szybki zapis' })}</span>
                  <form onSubmit={handleInlineBgSubmit} className="space-y-2">
                    <div className="relative">
                      <input
                        type="number"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        placeholder={t('auto.np_120', { defaultValue: 'np. 120' })}
                        value={inlineBgValue}
                        onChange={(e) => setInlineBgValue(e.target.value)}
                        disabled={isEditingLayout}
                        className="w-full px-2.5 py-2 rounded-xl bg-white/40 dark:bg-slate-900/40 text-xs font-black text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-500 pr-10"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                        
                                                              {t('auto.mg', { defaultValue: 'mg' })}
                                                            </span>
                    </div>
                    <button
                      type="submit"
                      disabled={isEditingLayout || !inlineBgValue}
                      className={cn(
                        "w-full py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-[9px] uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer text-center",
                        (!inlineBgValue || isEditingLayout) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      
                                                        {t('auto.zapisz', { defaultValue: 'Zapisz' })}
                                                      </button>
                  </form>
                </div>
                
                <div className="mt-2 border-t border-slate-100 dark:border-white/5 pt-2">
                  <button
                    onClick={() => { if (!isEditingLayout) { Haptics.light(); setIsGlucoseModalOpen(true); } }}
                    className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-center"
                  >
                    
                                                  {t('auto.klawiatura', { defaultValue: 'Klawiatura ⌨️' })}
                                                </button>
                </div>
              </div>
            </div>
          );
        }

        const isFullHeight = size === "2x2";
        return (
          <div className="glass-card !p-5 flex flex-col justify-between relative overflow-hidden h-full w-full min-h-[140px] border border-white/50 dark:border-white/5 shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <Droplet size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="font-black text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-display block leading-none">{t('auto.dodaj_pomiar', { defaultValue: 'Dodaj Pomiar' })}</span>
                  <span className="text-[8px] text-slate-400 font-bold leading-none">{t('auto.zapisz_glukozę_natychmiast', { defaultValue: i18n.t('auto.zapisz_glukoze_natychmias', { defaultValue: "Zapisz glukozę natychmiast" }) })}</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center gap-3">
              <form onSubmit={handleInlineBgSubmit} className="flex gap-2 items-center w-full">
                <div className="relative flex-1">
                  <input
                    type="number"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder={t('auto.np_120', { defaultValue: 'np. 120' })}
                    value={inlineBgValue}
                    onChange={(e) => setInlineBgValue(e.target.value)}
                    disabled={isEditingLayout}
                    className="w-full px-4 py-2.5 rounded-2xl bg-white/40 dark:bg-slate-900/40 text-sm font-black text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-rose-500 pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                    
                                                    {t('auto.mg_dl', { defaultValue: 'mg/dL' })}
                                                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isEditingLayout || !inlineBgValue}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1 shrink-0",
                    (!inlineBgValue || isEditingLayout) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  
                                              {t('auto.zapisz', { defaultValue: 'Zapisz' })}
                                            </button>
              </form>

              {isFullHeight && (
                <div className="space-y-1.5 mt-1">
                  <p className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{t('auto.szybki_wybór', { defaultValue: i18n.t('auto.szybki_wybor', { defaultValue: "Szybki wybór:" }) })}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[80, 100, 120, 150, 180, 220].map((v) => (
                      <button
                        key={v}
                        type="button"
                        disabled={isEditingLayout}
                        onClick={() => {
                          Haptics.light();
                          setInlineBgValue(v.toString());
                        }}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-black rounded-lg border transition-all active:scale-95 cursor-pointer",
                          inlineBgValue === v.toString()
                            ? "bg-rose-500 text-white border-rose-500"
                            : "bg-slate-500/5 hover:bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5"
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      case "quick_bolus": {
        const isB1x1 = size === "1x1";
        const isB1x2 = size === "1x2";

        if (isB1x1) {
          return (
            <button
              onClick={() => {
                if (!isEditingLayout) {
                  Haptics.light();
                  setTab("bolus");
                }
              }}
              className={cn(
                "bg-accent-600 flex flex-col items-center justify-center gap-2 shadow-2xl shadow-accent-600/40 active:scale-95 group transition-all text-white overflow-hidden relative w-full select-none h-full py-5 rounded-[2.5rem] min-h-[140px]"
              )}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-[40px] -mr-12 -mt-12 group-hover:bg-white/20 transition-all pointer-events-none"></div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner shrink-0 pointer-events-none">
                <Zap size={22} />
              </div>
              <div className="text-center pointer-events-none">
                <span className="font-black text-[10px] uppercase tracking-widest font-display block">{t('auto.bolus', { defaultValue: 'Bolus' })}</span>
                <span className="text-[8px] text-white/70 font-bold leading-none">{t('auto.kalkulator', { defaultValue: 'Kalkulator' })}</span>
              </div>
            </button>
          );
        }

        if (isB1x2) {
          return (
            <div className="bg-accent-600 text-white rounded-[2.5rem] !p-3.5 flex flex-col justify-between h-full w-full relative overflow-hidden text-left min-h-[220px] shadow-2xl shadow-accent-600/30 animate-fade-in">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
              
              <div className="flex justify-between items-center w-full">
                <div className="p-1.5 bg-white/20 rounded-lg text-white"><Zap size={14} /></div>
                <span className="text-[8px] font-black uppercase text-white/80 tracking-wider">{t('auto.bolus', { defaultValue: 'Bolus' })}</span>
              </div>
              
              <div className="mt-2 text-left flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[7px] uppercase font-black text-white/60 block mb-1">{t('auto.szybki_zapis', { defaultValue: 'Szybki zapis' })}</span>
                  <form onSubmit={handleInlineBolusSubmit} className="space-y-1.5 align-middle">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder={t('auto.insulina', { defaultValue: 'Insulina' })}
                        value={inlineBolusDose}
                        onChange={(e) => setInlineBolusDose(e.target.value)}
                        disabled={isEditingLayout}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white/20 text-white placeholder-white/80 text-xs font-black border border-white/10 focus:outline-none focus:ring-1 focus:ring-white pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/80 uppercase">{t('auto.j', { defaultValue: 'j.' })}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder={t('auto.węgle', { defaultValue: i18n.t('auto.wegle', { defaultValue: "Węgle" }) })}
                        value={inlineBolusCarbs}
                        onChange={(e) => handleInlineBolusCarbsChange(e.target.value)}
                        disabled={isEditingLayout}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white/20 text-white placeholder-white/80 text-xs font-black border border-white/10 focus:outline-none focus:ring-1 focus:ring-white pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/80 uppercase">g</span>
                    </div>
                    <button
                      type="submit"
                      disabled={isEditingLayout || (!inlineBolusDose && !inlineBolusCarbs)}
                      className={cn(
                        "w-full py-1.5 bg-white text-accent-700 hover:bg-white/90 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer text-center",
                        (!inlineBolusDose && !inlineBolusCarbs || isEditingLayout) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      
                                                        {t('auto.podaj', { defaultValue: 'Podaj' })}
                                                      </button>
                  </form>
                </div>
                
                <div className="mt-2 border-t border-white/10 pt-2 flex gap-1 justify-between">
                  <button
                    onClick={() => { if (!isEditingLayout) { Haptics.light(); setTab("bolus"); } }}
                    className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[8px] font-black uppercase tracking-wide transition-all text-center"
                  >
                    
                                                  {t('auto.kalkulator', { defaultValue: 'Kalkulator ➡️' })}
                                                </button>
                </div>
              </div>
            </div>
          );
        }

        const isFullHeight = size === "2x2";
        return (
          <div className="bg-accent-600 text-white rounded-[2.5rem] !p-5 flex flex-col justify-between relative overflow-hidden h-full w-full min-h-[140px] shadow-2xl shadow-accent-600/30">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
            <div className="flex justify-between items-center mb-1 pb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center animate-pulse">
                  <Zap size={16} />
                </div>
                <div>
                  <span className="font-black text-[10px] uppercase tracking-wider text-white font-display block leading-none">{t('auto.zapisz_bolus_i_posiłek', { defaultValue: i18n.t('auto.zapisz_bolus_i_posilek', { defaultValue: "Zapisz Bolus i Posiłek" }) })}</span>
                  <span className="text-[8px] text-white/70 font-bold leading-none">{t('auto.wpisz_dawkę_i_węglowodany', { defaultValue: i18n.t('auto.wpisz_dawke_i_weglowodany', { defaultValue: "Wpisz dawkę i węglowodany" }) })}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleInlineBolusSubmit} className="flex-1 flex flex-col justify-center gap-2 mt-1">
              <div className={cn("grid gap-2 w-full", isFullHeight ? "grid-cols-1" : "grid-cols-2")}>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder={t('auto.dose_j', { defaultValue: 'Dose j.' })}
                    value={inlineBolusDose}
                    onChange={(e) => setInlineBolusDose(e.target.value)}
                    disabled={isEditingLayout}
                    className="w-full px-3 py-1.5 rounded-xl bg-white/20 text-white placeholder-white/80 text-xs font-black border border-white/10 focus:outline-none focus:ring-1 focus:ring-white pr-6"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/80 uppercase">
                    
                                                    {t('auto.j', { defaultValue: 'j.' })}
                                                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    placeholder={t('auto.węgle_g', { defaultValue: i18n.t('auto.wegle_g', { defaultValue: "Węgle g" }) })}
                    value={inlineBolusCarbs}
                    onChange={(e) => handleInlineBolusCarbsChange(e.target.value)}
                    disabled={isEditingLayout}
                    className="w-full px-3 py-1.5 rounded-xl bg-white/20 text-white placeholder-white/80 text-xs font-black border border-white/10 focus:outline-none focus:ring-1 focus:ring-white pr-6"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/80 uppercase">
                    g
                  </span>
                </div>
              </div>

              {isFullHeight && (
                <input
                  type="text"
                  placeholder={t('auto.notatki_np_obiad', { defaultValue: 'Notatki (np. obiad)' })}
                  value={inlineBolusNotes}
                  onChange={(e) => setInlineBolusNotes(e.target.value)}
                  disabled={isEditingLayout}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/20 text-white placeholder-white/80 text-xs font-black border border-white/10 focus:outline-none focus:ring-1 focus:ring-white"
                />
              )}

              <div className="flex gap-2 items-center mt-1">
                <button
                  type="submit"
                  disabled={isEditingLayout || (!inlineBolusDose && !inlineBolusCarbs)}
                  className={cn(
                    "flex-1 py-1.5 bg-white text-accent-700 hover:bg-white/90 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer text-center justify-center",
                    (!inlineBolusDose && !inlineBolusCarbs || isEditingLayout) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  
                                              {t('auto.podaj', { defaultValue: 'Podaj' })}
                                            </button>
                <button
                  type="button"
                  disabled={isEditingLayout}
                  onClick={() => {
                    Haptics.light();
                    setTab("bolus");
                  }}
                  className="p-1 px-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[8px] font-black uppercase tracking-tighter"
                >
                  
                                              {t('auto.kalkulator', { defaultValue: 'Kalkulator' })}
                                            </button>
              </div>
            </form>
          </div>
        );
      }

      case "history_measurements":
        const glucoseLogs = logs.filter(log => log.type === 'glucose');
        const hasGlucoseLogsOnly = glucoseLogs.length > 0;
        if (!hasGlucoseLogsOnly) {
          if (isEditingLayout) {
            return (
              <div className="p-6 bg-slate-500/5 dark:bg-slate-950/10 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-[2.5rem] text-center text-xs text-slate-400 dark:text-slate-500 font-bold font-display w-full min-h-[140px] flex flex-col justify-center items-center">
                
                                    {t('auto.ostatnie_pomiary_brak_danych', { defaultValue: '📊 Ostatnie pomiary [Brak danych]' })}
                                  </div>
            );
          }
          return null;
        }
        
        if (size === "1x2") {
          const latestLog = glucoseLogs[0];
          return (
            <div className="glass-card !p-3.5 flex flex-col justify-between h-full w-full relative overflow-hidden text-left min-h-[220px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
              
              <div className="flex justify-between items-center w-full">
                <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-500"><Droplet size={14} strokeWidth={2.5} /></div>
                <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{t('auto.pomiary', { defaultValue: 'Pomiary' })}</span>
              </div>
              
              <div className="mt-2 text-left">
                <span className="text-[7px] uppercase font-black text-slate-400 block mb-0.5 opacity-60">{t('auto.ostatni_wynik', { defaultValue: 'Ostatni wynik' })}</span>
                <p className="font-black text-2xl dark:text-white font-display leading-none tracking-tight">
                  {Math.round(latestLog.value)} <span className="text-xs opacity-50 font-sans font-medium">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
                </p>
                <p className="text-[8px] text-slate-400 mt-0.5">
                  
                                            {t('auto.godz', { defaultValue: 'godz.' })} {new Date(latestLog.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <div className="my-3 border-t border-slate-100 dark:border-white/5 pt-3 flex-1 flex flex-col gap-2 overflow-hidden">
                <span className="text-[7px] uppercase font-black text-slate-400 block opacity-60">{t('auto.poprzednie', { defaultValue: 'Poprzednie' })}</span>
                <div className="space-y-1.5 flex-1 overflow-hidden">
                  {glucoseLogs.slice(1, 3).map((log) => (
                    <div key={log.id} className="flex justify-between items-center text-[10px] bg-slate-500/5 p-1.5 rounded-lg border border-slate-100 dark:border-white/5">
                      <span className="font-black dark:text-white">{Math.round(log.value)}  {t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
                      <span className="text-[8px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { if (!isEditingLayout) { Haptics.light(); setListFilter('glucose'); setTab("history"); } }}
                className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-center"
              >
                
                                      {t('auto.wszystkie', { defaultValue: 'Wszystkie ➡️' })}
                                    </button>
            </div>
          );
        }

        const isHistMeasCompactHeight = size.endsWith("1");
        return (
          <div className="space-y-3 w-full h-full glass-card !p-5 min-h-[220px]">
            <div className="flex justify-between items-center px-1 pb-1">
              <h3 className="text-[10px] font-black text-slate-500/60 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                
                                        {t('auto.ostatnie_pomiary', { defaultValue: 'Ostatnie Pomiary' })}
                                      </h3>
              <button onClick={() => { if (!isEditingLayout) { Haptics.light(); setListFilter('glucose'); setTab("history"); } }} className="text-[9px] font-black text-rose-500 uppercase">{t('auto.wszystkie', { defaultValue: 'Wszystkie' })}</button>
            </div>
            <div className="space-y-2">
              {glucoseLogs.slice(0, isHistMeasCompactHeight ? 2 : 3).map((log, idx) => (
                <div key={`${log.id}-${idx}`}>
                  <SwipeableItem id={log.id} onDelete={() => handleDeleteLog(log)}>
                    <div className="glass-card !p-4 flex items-center gap-4 w-full">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                        <Droplet size={18} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-base dark:text-white font-display text-left">
                          {Math.round(log.value)} <span className="text-[10px] opacity-40 uppercase font-bold text-slate-400">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
                        </p>
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate font-display text-left">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {log.notes || 'Glukoza'}
                        </p>
                      </div>
                    </div>
                  </SwipeableItem>
                </div>
              ))}
            </div>
          </div>
        );

      case "history_treatments":
        const treatmentLogs = logs.filter(log => log.type === 'bolus' || (log.type as any) === 'insulin' || log.type === 'meal');
        const hasTreatmentLogsOnly = treatmentLogs.length > 0;
        if (!hasTreatmentLogsOnly) {
          if (isEditingLayout) {
            return (
              <div className="p-6 bg-slate-500/5 dark:bg-slate-950/10 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-[2.5rem] text-center text-xs text-slate-400 dark:text-slate-500 font-bold font-display w-full min-h-[140px] flex flex-col justify-center items-center">
                
                                    {t('auto.ostatnie_leczenie_brak_danych', { defaultValue: '💉 Ostatnie leczenie [Brak danych]' })}
                                  </div>
            );
          }
          return null;
        }

        if (size === "1x2") {
          const latestLog = treatmentLogs[0];
          const isMeal = latestLog.type === "meal";
          return (
            <div className="glass-card !p-3.5 flex flex-col justify-between h-full w-full relative overflow-hidden text-left min-h-[220px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
              
              <div className="flex justify-between items-center w-full">
                <div className={cn("p-1.5 rounded-lg shrink-0", isMeal ? "bg-amber-500/10 text-amber-500" : "bg-accent-500/10 text-accent-500")}>
                  {isMeal ? <Utensils size={14} /> : <Syringe size={14} />}
                </div>
                <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{t('auto.leczenie', { defaultValue: 'Leczenie' })}</span>
              </div>
              
              <div className="mt-2 text-left">
                <span className="text-[7px] uppercase font-black text-slate-400 block mb-0.5 opacity-60">{t('auto.ostatni_wpis', { defaultValue: 'Ostatni wpis' })}</span>
                <p className="font-black text-2xl dark:text-white font-display leading-none tracking-tight">
                  {typeof latestLog.value === 'number' ? Number(latestLog.value.toFixed(1)) : Number(Number(latestLog.value).toFixed(1))}
                  <span className="text-[10px] opacity-50 font-sans font-medium uppercase ml-1">
                    {isMeal ? "g" : "j."}
                  </span>
                </p>
                <p className="text-[8px] text-slate-400 mt-0.5 truncate">
                  
                                            {t('auto.godz', { defaultValue: 'godz.' })} {new Date(latestLog.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {latestLog.notes || (isMeal ? i18n.t('auto.posilek', { defaultValue: i18n.t('auto.posilek', { defaultValue: "Posiłek" }) }) : 'Bolus')}
                </p>
              </div>

              <div className="my-3 border-t border-slate-100 dark:border-white/5 pt-3 flex-1 flex flex-col gap-2 overflow-hidden">
                <span className="text-[7px] uppercase font-black text-slate-400 block opacity-60">{t('auto.poprzednie', { defaultValue: 'Poprzednie' })}</span>
                <div className="space-y-1.5 flex-1 overflow-hidden">
                  {treatmentLogs.slice(1, 3).map((log) => {
                    const lIsMeal = log.type === "meal";
                    return (
                      <div key={log.id} className="flex justify-between items-center text-[10px] bg-slate-500/5 p-1.5 rounded-lg border border-slate-100 dark:border-white/5">
                        <span className="font-black dark:text-white flex items-center gap-1">
                          {lIsMeal ? "🍎" : "💉"} {typeof log.value === 'number' ? Number(log.value.toFixed(1)) : Number(Number(log.value).toFixed(1))} {lIsMeal ? "g" : "j."}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => { if (!isEditingLayout) { Haptics.light(); setListFilter('treatment'); setTab("history"); } }}
                className="w-full py-1.5 bg-accent-500/10 hover:bg-accent-500/20 text-accent-500 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all text-center"
              >
                
                                      {t('auto.wszystkie', { defaultValue: 'Wszystkie ➡️' })}
                                    </button>
            </div>
          );
        }

        const isHistTreatCompactHeight = size.endsWith("1");
        return (
          <div className="space-y-3 w-full h-full glass-card !p-5 min-h-[220px]">
            <div className="flex justify-between items-center px-1 pb-1">
              <h3 className="text-[10px] font-black text-slate-500/60 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                
                                        {t('auto.leczenie_i_posiłki', { defaultValue: i18n.t('auto.leczenie_i_posilki', { defaultValue: "Leczenie i posiłki" }) })}
                                      </h3>
              <button onClick={() => { if (!isEditingLayout) { Haptics.light(); setListFilter('treatment'); setTab("history"); } }} className="text-[9px] font-black text-accent-500 uppercase font-display">{t('auto.wszystkie', { defaultValue: 'Wszystkie' })}</button>
            </div>
            <div className="space-y-2">
              {treatmentLogs.slice(0, isHistTreatCompactHeight ? 2 : 3).map((log, idx) => (
                <div key={`${log.id}-${idx}`}>
                  <SwipeableItem id={log.id} onDelete={() => handleDeleteLog(log)}>
                    <div onClick={() => { if (!isEditingLayout && !settings.followerMode) setEditingLog(log); }} className="glass-card !p-4 flex items-center gap-4 cursor-pointer w-full">
                      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", log.type === "meal" ? "bg-amber-500/10 text-amber-500" : "bg-accent-500/10 text-accent-500")}>
                        {log.type === "meal" ? <Utensils size={18} /> : <Syringe size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-base dark:text-white font-display text-left">
                          {typeof log.value === 'number' ? Number(log.value.toFixed(2)) : Number(Number(log.value).toFixed(2))} <span className="text-[10px] opacity-40 uppercase font-bold text-slate-400">{log.type === "meal" ? "g" : " j."}</span>
                        </p>
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate font-display text-left">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {log.type === 'meal' ? i18n.t('auto.posilek', { defaultValue: i18n.t('auto.posilek', { defaultValue: "Posiłek" }) }) : 'Bolus'}
                        </p>
                      </div>
                    </div>
                  </SwipeableItem>
                </div>
              ))}
            </div>
          </div>
        );

      case "pump":
        if (!pumpStatus) {
          if (isEditingLayout) {
            return (
              <div className="mx-2 p-6 bg-slate-500/5 dark:bg-slate-950/10 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-[2.5rem] text-center text-xs text-slate-400 dark:text-slate-500 font-bold font-display w-full">
                
                                    {t('auto.status_pompy_insulinowej_nieaktywny', { defaultValue: '📟 Status Pompy Insulinowej [Nieaktywny]' })}
                                    <p className="text-[10px] text-slate-400 dark:text-slate-600 font-normal mt-1">
                  
                                          {t('auto.połącz_pompę_np_carelink_w_profilu_', { defaultValue: i18n.t('auto.polacz_pompe_np_carelink', { defaultValue: "Połącz pompę (np. CareLink) w Profilu, by aktywować te dane." }) })}
                                        </p>
              </div>
            );
          }
          return null;
        }
        return (
          <PumpStatusCard data={pumpStatus} compact={size.endsWith("1")} />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="space-y-6 pb-20 will-change-transform relative"
    >
      <LowGlucoseMealAlert logs={logs} lastGlucose={lastG ? Math.round(lastG.value) : null} onAddCarbs={() => setTab("meal")} shortcuts={shortcuts} onQuickAdd={quickAdd} />
      <UnlinkedCarbsWidget user={user} logs={logs} onAddCarbs={() => setTab("meal")} />

      <div className="flex items-center justify-between px-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white font-display">{t('auto.pulpit', { defaultValue: 'Pulpit' })}</h2>
          {isEditingLayout && (
            <span className="animate-pulse px-2 py-0.5 bg-indigo-500/20 text-indigo-500 rounded-full text-[8px] font-black uppercase tracking-wider border border-indigo-500/25">{t('auto.tryb_edycji', { defaultValue: 'Tryb Edycji' })}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { 
                Haptics.light(); 
                if (isEditingLayout) {
                    handleFinishEditing();
                } else {
                    setIsEditingLayout(true);
                }
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 glass-target select-none",
              isEditingLayout
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10"
                : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10"
            )}
            title={t('auto.kustonizuj_kafelki_pulpitu', { defaultValue: 'Kustonizuj kafelki pulpitu' })}
          >
            <Sliders size={11} />
            
                                  {t('auto.dostosuj', { defaultValue: 'Dostosuj' })}
                                </button>
          {nsUrl && (
            <a 
              href={nsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 active:scale-95 transition-all glass-target"
            >
              
                                        {t('auto.nightscout', { defaultValue: 'Nightscout' })}
                                      </a>
          )}
          <button 
            onClick={() => { Haptics.light(); setTab('chart'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent-500/10 text-accent-600 text-[10px] font-black uppercase tracking-widest border border-accent-500/20 active:scale-95 transition-all shadow-xl shadow-accent-500/10"
          >
            <Activity size={12} />
            
                                  {t('auto.wykres', { defaultValue: 'Wykres' })}
                                </button>
        </div>
      </div>

      {isEditingLayout && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-2 p-5 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-slate-200/50 dark:border-white/5 rounded-[2.5rem] space-y-4"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <LayoutGrid size={15} className="text-indigo-500" />
              <h3 className="text-xs font-black uppercase tracking-wider dark:text-white">{t('auto.dostosowywanie_pulpitu', { defaultValue: 'Dostosowywanie pulpitu' })}</h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetWidgets}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 text-[9px] font-black uppercase tracking-tight transition-colors"
                title={t('auto.przywróć_domyślny_układ', { defaultValue: i18n.t('auto.przywroc_domyslny_uklad', { defaultValue: "Przywróć domyślny układ" }) })}
              >
                <RotateCcw size={10} />
                
                                              {t('auto.domyślne', { defaultValue: i18n.t('auto.domyslne', { defaultValue: "Domyślne" }) })}
                                            </button>
              <button
                onClick={handleFinishEditing}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-[9px] font-black uppercase tracking-tight transition-all active:scale-95 shadow-md shadow-indigo-600/10"
              >
                
                                              {t('auto.gotowe', { defaultValue: 'Gotowe' })}
                                            </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 bg-white/70 dark:bg-slate-900/60 rounded-[1.8rem] border border-slate-200/55 dark:border-white/5 font-display select-none">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-wider dark:text-white leading-none mb-1">{t('auto.układ_pulpitu', { defaultValue: i18n.t('auto.uklad_pulpitu', { defaultValue: "Układ Pulpitu" }) })}</h4>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{t('auto.wybierz_główny_szkielet_i_reguły_ro', { defaultValue: i18n.t('auto.wybierz_glowny_szkielet_i', { defaultValue: "Wybierz główny szkielet i reguły rozkładu ekranu" }) })}</span>
            </div>
            <div className="bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl flex gap-1 self-stretch sm:self-auto shrink-0 font-display">
              <button
                onClick={() => { Haptics.light(); setLayoutMode('classic'); }}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all select-none cursor-pointer",
                  layoutMode === 'classic'
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                
                                              {t('auto.klasyczny_diacontrol_4_0', { defaultValue: '🏛️ Klasyczny (Diacontrol 4.0)' })}
                                            </button>
              <button
                onClick={() => { Haptics.light(); setLayoutMode('grid'); }}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all select-none cursor-pointer",
                  layoutMode === 'grid'
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                )}
              >
                
                                              {t('auto.kafelki_dynamiczne', { defaultValue: '📐 Kafelki Dynamiczne' })}
                                            </button>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-normal">
            {layoutMode === "classic" 
              ? i18n.t('auto.uzywasz_klasycznego_i_czytelne', { defaultValue: i18n.t('auto.uzywasz_klasycznego_i_czy', { defaultValue: "🏛️ Używasz klasycznego i czytelnego układu bez ucięć z optymalnymi rozmiarami. Aby móc dowolnie powiększać lub pomniejszać kafelki własnoręcznie, przełącz na tryb „📐 Kafelki Dynamiczne” poniżej, a przy każdym kafelku pojawi się przycisk zmiany rozmiaru 📐!" }) })
              : i18n.t('auto.korzystasz_z_ukladu_kafelkoweg', { defaultValue: i18n.t('auto.korzystasz_z_ukladu_kafel', { defaultValue: "📐 Korzystasz z układu kafelkowego. Możesz układać kafelki przeciągając je za ikonę uchwytu lub używając strzałek! Kliknij przycisk „📐 [rozmiar]” przy kafelku, aby cyklicznie powiększyć lub pomniejszyć go (1x1 ➡️ 2x1 ➡️ 1x2 ➡️ 2x2)." }) })}
          </p>



          {widgets.some(w => !w.visible) && (
            <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{t('auto.ukryte_kafelki_kliknij_aby_przywróc', { defaultValue: i18n.t('auto.ukryte_kafelki_kliknij_ab', { defaultValue: "Ukryte kafelki (kliknij, aby przywrócić):" }) })}</span>
              <div className="flex flex-wrap gap-1.5">
                {widgets.filter(w => !w.visible).map(w => (
                  <button
                    key={`hidden-${w.id}`}
                    onClick={() => toggleWidgetVisibility(w.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-white/10 hover:border-emerald-500/25 transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    <Plus size={10} />
                    {t(`dashboard.widgets.${w.id}`, { defaultValue: w.name })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {settings?.activeTraining && (
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="mx-2 p-5 glass border border-emerald-500/20 rounded-[2.5rem] relative overflow-hidden group"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 blur-[40px] -mr-10 -mt-10 pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-2xl animate-pulse">
                 <Activity size={24} />
               </div>
               <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight font-display mb-0.5">{t('auto.trwa_trening', { defaultValue: 'Trwa Trening' })}</h4>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {SPORTS.find(s => s.id === settings.activeTraining?.sportId)?.name || i18n.t('auto.aktywnosc', { defaultValue: i18n.t('auto.aktywnosc', { defaultValue: "Aktywność" }) })} • {settings.activeTraining.duration}m
                  </p>
               </div>
            </div>
            <button
               onClick={() => { Haptics.light(); handleEndTraining(); }}
               className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all hover:bg-rose-600"
            >
               
                                         {t('auto.zakończ', { defaultValue: i18n.t('auto.zakoncz', { defaultValue: "Zakończ" }) })}
                                      </button>
          </div>
        </motion.div>
      )}

      {/* 1. Main Stats Widget */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.filter(w => w.visible).map(w => w.id)} strategy={rectSortingStrategy}>
        <div 
          onPointerDownCapture={(e) => {
            if (isEditingLayout) {
              e.stopPropagation();
            }
          }}
          className={cn(
          "grid grid-cols-2 grid-flow-row-dense gap-4 md:gap-6 min-h-[100px] px-1 pb-6 transition-transform duration-300 transform-gpu origin-top",
          ""
        )}
        >

        {widgets.filter(w => w.visible).length === 0 ? (
          <div className="col-span-2 py-12 px-6 text-center bg-slate-500/5 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center justify-center min-h-[220px]">
            <span className="text-3xl block mb-2">📭</span>
            <h4 className="text-xs font-black uppercase tracking-wider dark:text-white">{t('auto.pulpit_jest_pusty', { defaultValue: 'Pulpit jest pusty' })}</h4>
            <p className="text-[10px] text-slate-500 max-w-[280px] mx-auto mt-1 leading-normal font-bold">
              
                                        {t('auto.ukryłeś_wszystkie_kafelki_ze_sceny_', { defaultValue: i18n.t('auto.ukryles_wszystkie_kafelki', { defaultValue: "Ukryłeś wszystkie kafelki ze sceny. Kliknij poniżej, aby natychmiast przywrócić domyślny układ całej aplikacji!" }) })}
                                      </p>
            <button
              onClick={resetWidgets}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all shadow-md flex items-center gap-1.5"
            >
              <RotateCcw size={10} />
              
                                        {t('auto.przywróć_domyślny_układ', { defaultValue: i18n.t('auto.przywroc_domyslny_uklad', { defaultValue: "Przywróć domyślny układ" }) })}
                                      </button>
          </div>
        ) : (
          widgets.map((w, index) => {
             if (!w.visible) return null;
             if (settings.followerMode && !["main_stats", "history_measurements", "history_treatments"].includes(w.id)) return null;

             const widgetSize = layoutMode === "classic"
               ? (
                   w.id === "weather" || 
                   w.id === "sensor_reminder" || 
                   w.id === "infusion_reminder" || 
                   w.id === "pump" || 
                   w.id === "quick_measurement" || 
                   w.id === "quick_bolus" 
                     ? "1x1" 
                     : (
                         w.id === "assistant" || 
                         w.id === "glikosense_suggestions" || 
                         w.id === "tips" || 
                         w.id === "shortcuts" || 
                         w.id === "history_measurements" || 
                         w.id === "history_treatments" ||
                         w.id === "training_widget"
                           ? "2x1" 
                           : "2x2"
                       )
                 )
               : w.size;

             const visibleIndices = widgets.map((item, idx) => item.visible ? idx : -1).filter(idx => idx !== -1);
             const isFirstActive = index === visibleIndices[0];
             const isLastActive = index === visibleIndices[visibleIndices.length - 1];
             const isCurrentlyMovingTarget = movingWidgetId !== null && movingWidgetId !== w.id;
             
             return (
                 <SortableWidget
                   key={w.id}
                   id={w.id}
                   isEditing={isEditingLayout && layoutMode === "grid"}
                   className={cn(
                   "relative transition-all overflow-hidden flex flex-col", widgetSize.endsWith('2') ? "row-span-2 md:min-h-[350px]" : "row-span-1 md:min-h-[140px]",
                   widgetSize.startsWith('2') ? "col-span-2" : "col-span-1",
                   "rounded-[2.6rem]",
                   (isEditingLayout && layoutMode === "grid") ? "border-2 border-dashed border-indigo-500/40 p-2.5 dark:bg-indigo-950/20 bg-indigo-50/20 min-h-[140px] flex flex-col cursor-grab active:cursor-grabbing hover:border-indigo-500/60" : "",
                   (isEditingLayout && layoutMode === "classic") ? "border-2 border-dashed border-slate-500/20 p-2.5 dark:bg-slate-950/20 bg-slate-50/10 min-h-[110px] flex flex-col" : "",
                   isCurrentlyMovingTarget ? "cursor-pointer scale-[0.98] border-2 border-dashed border-amber-500/50 bg-amber-500/5 animate-pulse" : "",
                   "" /* no draggedIndex */,
                   movingWidgetId === w.id ? "ring-4 ring-amber-500/60 border-amber-500 shadow-2xl scale-[1.01]" : ""
                 )}
               >
                 {isEditingLayout && (
                   <div className="flex flex-col gap-1.5 p-2 bg-slate-900 dark:bg-slate-950 text-white rounded-[1.8rem] mb-3 shadow-lg z-10 shrink-0 select-none">
                     <div className="flex items-center justify-between gap-1.5 border-b border-white/5 pb-1 w-full">
                       <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                         {layoutMode === "grid" && <GripVertical size={11} className="text-white/40 cursor-grab active:cursor-grabbing hover:text-white transition-colors" />}
                         <span className="text-[9px] font-black uppercase tracking-wider truncate max-w-[120px]" title={t(`dashboard.widgets.${w.id}`, { defaultValue: w.name })}>
                           {t(`dashboard.widgets.${w.id}`, { defaultValue: w.name })}
                         </span>
                       </div>
                       <button
                         onClick={() => toggleWidgetVisibility(w.id)}
                         className="p-1 bg-rose-500/25 hover:bg-rose-500/40 rounded-lg text-rose-400 active:scale-90 shrink-0"
                         title={t('auto.ukryj_kafel', { defaultValue: 'Ukryj kafel' })}
                       >
                         <Plus size={10} className="rotate-45" />
                       </button>
                     </div>
                     <div className={cn("flex flex-wrap items-center justify-between gap-1.5 w-full mt-1.5", layoutMode !== "grid" && "hidden")}>
                       <div className="flex items-center gap-1 w-full justify-between">
                         {w.canResize && (
                           <button
                             onClick={() => cycleWidgetSize(w.id)}
                             className="px-2 py-1 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-wider active:scale-90 flex items-center gap-1 text-white shadow-sm shrink-0"
                             title={t('auto.zmień_rozmiar', { defaultValue: i18n.t('auto.zmien_rozmiar', { defaultValue: "Zmień rozmiar" }) })}
                           >
                             📐 {w.size}
                           </button>
                         )}
                         {w.canChangeShape && (
                           <button
                             onClick={() => cycleWidgetShape(w.id)}
                             className="px-2 py-1 bg-pink-500 hover:bg-pink-600 rounded-lg text-[8px] font-black uppercase tracking-wider active:scale-90 flex items-center gap-1 text-white shadow-sm shrink-0"
                             title={t('auto.zmień_kształt', { defaultValue: i18n.t('auto.zmien_ksztalt', { defaultValue: "Zmień kształt" }) })}
                           >
                             ✨ {(!w.shape || w.shape === "default") ? "standardowy" : w.shape === "circle" ? i18n.t('auto.pigulka', { defaultValue: i18n.t('auto.pigulka', { defaultValue: "pigułka" }) }) : w.shape === "leaf" ? i18n.t('auto.lisc', { defaultValue: i18n.t('auto.lisc', { defaultValue: "liść" }) }) : w.shape === "leaf-mirror" ? i18n.t('auto.lisc_odbity', { defaultValue: i18n.t('auto.lisc_odbity', { defaultValue: "liść (odbity)" }) }) : "dysk"}
                           </button>
                         )}
                       </div>
                     </div>
                   </div>
                 )}
                 
                 <div className={cn("flex-1 w-full flex flex-col justify-center transition-all duration-500 h-full",
                      w.shape === "circle" && "[&>div:first-child]:!rounded-[200px] [&>button:first-child]:!rounded-[200px] [&>button:first-child]:aspect-square [&>div:first-child]:aspect-square px-1",
                      w.shape === "leaf" && "[&>div:first-child]:!rounded-tl-[3.5rem] [&>div:first-child]:!rounded-br-[3.5rem] [&>div:first-child]:!rounded-tr-[1.2rem] [&>div:first-child]:!rounded-bl-[1.2rem] [&>button:first-child]:!rounded-tl-[3.5rem] [&>button:first-child]:!rounded-br-[3.5rem] [&>button:first-child]:!rounded-tr-[1.2rem] [&>button:first-child]:!rounded-bl-[1.2rem] [&>button:first-child]:aspect-square [&>div:first-child]:aspect-square px-1",
                      w.shape === "leaf-mirror" && "[&>div:first-child]:!rounded-tr-[3.5rem] [&>div:first-child]:!rounded-bl-[3.5rem] [&>div:first-child]:!rounded-tl-[1.2rem] [&>div:first-child]:!rounded-br-[1.2rem] [&>button:first-child]:!rounded-tr-[3.5rem] [&>button:first-child]:!rounded-bl-[3.5rem] [&>button:first-child]:!rounded-tl-[1.2rem] [&>button:first-child]:!rounded-br-[1.2rem] [&>button:first-child]:aspect-square [&>div:first-child]:aspect-square px-1",
                      w.shape === "diamond" && "[&>div:first-child]:!rounded-[2.4rem] [&>button:first-child]:!rounded-[2.4rem] scale-[0.98] rotate-[0.5deg]"
                  )}>
                   {renderWidget(w.id, widgetSize)}
                 </div>
               </SortableWidget>
             );
          })
        )}
      </div>
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <div className="rounded-[2.6rem] border-2 border-dashed border-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/90 shadow-2xl scale-[1.05] p-2.5 min-h-[140px] flex flex-col items-center justify-center opacity-90 z-50">
             <span className="text-[12px] font-black uppercase text-indigo-500">
               {widgets.find(w => w.id === activeId)?.name || 'Przenoszenie...'}
             </span>
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>

      {/* Dynamic Grid replaced all static elements below. We keep the overlay modals. */}
      {false && (
        <>

      {/* 4. Equipment & Reminders */}
      {(settings.sensorChangeDate || settings.infusionSetChangeDate) && (
        <motion.div className="grid grid-cols-2 gap-4">
          {settings.sensorChangeDate && (
             <div 
               onClick={() => { 
                 Haptics.light();
                 setTab('profile'); 
                 onAction?.('devices'); 
               }}
               className="glass-card !p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer"
             >
               <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
               <div className="flex justify-between items-start">
                 <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20 text-violet-500"><Signal size={16} /></div>
                 <span className="text-[8px] font-black text-violet-500 uppercase tracking-widest bg-violet-500/5 py-1 px-2.5 rounded-full border border-violet-500/10">{t('auto.sensor', { defaultValue: 'Sensor' })}</span>
               </div>
               <div className="mt-4">
                 {(() => {
                   const msLeft = settings.sensorChangeDate + (settings.sensorDurationDays || 10) * 24 * 60 * 60 * 1000 - Date.now();
                   const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                   const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                   const isExpired = msLeft <= 0;
                   return (
                     <div>
                       <div className="flex items-baseline gap-1">
                         <span className={cn("text-3xl font-black tracking-tight", isExpired ? "text-rose-500" : "text-slate-800 dark:text-white")}>{isExpired ? "0" : daysLeft}</span>
                         <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{t('auto.dni', { defaultValue: 'Dni' })}</span>
                         {!isExpired && hoursLeft > 0 && (
                           <>
                             <span className="text-xl font-black text-slate-800 dark:text-white ml-1">{hoursLeft}</span>
                             <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase text-[0.6rem]">{t('auto.godz', { defaultValue: 'Godz' })}</span>
                           </>
                         )}
                       </div>
                       <div className="mt-2 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                         <div className={cn("h-full", isExpired ? "bg-rose-500" : "bg-violet-600")} style={{ width: `${Math.max(0, Math.min(100, (msLeft / ((settings.sensorDurationDays || 10) * 24 * 60 * 60 * 1000)) * 100))}%` }} />
                       </div>
                     </div>
                   );
                 })()}
               </div>
             </div>
          )}
          {settings.infusionSetChangeDate && (
             <div 
               onClick={() => { 
                 Haptics.light();
                 setTab('profile'); 
                 onAction?.('devices'); 
               }}
               className="glass-card !p-5 flex flex-col justify-between relative overflow-hidden cursor-pointer"
             >
               <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-[40px] -mr-12 -mt-12 pointer-events-none"></div>
               <div className="flex justify-between items-start">
                 <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-500"><Droplets size={16} /></div>
                 <span className="text-[8px] font-black text-cyan-600 uppercase tracking-widest bg-cyan-500/5 py-1 px-2.5 rounded-full border border-cyan-500/10">{t('auto.wkłucie', { defaultValue: i18n.t('auto.wklucie', { defaultValue: "Wkłucie" }) })}</span>
               </div>
               <div className="mt-4">
                 {(() => {
                   const msLeft = settings.infusionSetChangeDate + (settings.infusionSetDurationDays || 3) * 24 * 60 * 60 * 1000 - Date.now();
                   const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                   const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                   const isExpired = msLeft <= 0;
                   return (
                     <div>
                       <div className="flex items-baseline gap-1">
                         <span className={cn("text-3xl font-black tracking-tight", isExpired ? "text-rose-500" : "text-slate-800 dark:text-white")}>{isExpired ? "0" : daysLeft}</span>
                         <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{t('auto.dni', { defaultValue: 'Dni' })}</span>
                         {!isExpired && hoursLeft > 0 && (
                           <>
                             <span className="text-xl font-black text-slate-800 dark:text-white ml-1">{hoursLeft}</span>
                             <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase text-[0.6rem]">{t('auto.godz', { defaultValue: 'Godz' })}</span>
                           </>
                         )}
                       </div>
                       <div className="mt-2 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                         <div className={cn("h-full", isExpired ? "bg-rose-500" : "bg-cyan-500")} style={{ width: `${Math.max(0, Math.min(100, (msLeft / ((settings.infusionSetDurationDays || 3) * 24 * 60 * 60 * 1000)) * 100))}%` }} />
                       </div>
                     </div>
                   );
                 })()}
               </div>
             </div>
          )}
        </motion.div>
      )}

      {/* 5. Assistant CTA */}
      <motion.div 
        onClick={() => {
          Haptics.light();
          setTab('assistant');
        }}
        className="relative group cursor-pointer active:scale-[0.98] transition-all"
      >
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 rounded-[2.6rem] opacity-30 group-hover:opacity-60 blur-md transition duration-500"></div>
        <div className="relative glass p-6 flex items-center gap-4 overflow-hidden rounded-[2.5rem] border border-white/50 dark:border-white/5">
          <div className={cn(
            "w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
            settings.childMode ? "bg-indigo-600 shadow-indigo-500/30" : "bg-slate-900 dark:bg-indigo-600"
          )}>
            {settings.childMode ? <Sparkles size={28} className="animate-pulse" /> : <Cpu size={28} />}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight font-display">
              
                                                {t('auto.asystent_ai', { defaultValue: 'Asystent AI' })}
                                              </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-tight">
              {settings.childMode 
                ? i18n.t('auto.zadaj_pytanie_swoim_opiekunom', { defaultValue: i18n.t('auto.zadaj_pytanie_swoim_opiek', { defaultValue: "Zadaj pytanie swoim opiekunom AI o wyniki, dietę lub trendy." }) })
                : i18n.t('auto.zaawansowana_analityka_predykc', { defaultValue: i18n.t('auto.zaawansowana_analityka_pr', { defaultValue: "Zaawansowana analityka predykcyjna i optymalizacja parametrów." }) })}
            </p>
          </div>
          <div className="p-2 rounded-full bg-slate-100/50 dark:bg-white/5 text-slate-400 group-hover:text-indigo-500 transition-colors">
            <ChevronRight size={20} />
          </div>
        </div>
      </motion.div>

      {/* 6. AI Tips & Insights */}
      <motion.div className="space-y-4">
        <DidYouKnowWidget onClick={() => {
          onAction?.('tutorial');
          setTab('profile');
        }} />
        
        {/* Tips Section */}
        <GlikoSenseTips logs={logs} pumpStatus={pumpStatus} />
        
        {/* Alert/Insight Section */}
        {patternInsights.length > 0 && (
          <div className="bg-accent-50/50 dark:bg-accent-950/20 backdrop-blur-md border border-accent-200/50 dark:border-accent-800/30 p-5 rounded-[2.5rem] flex items-center gap-4 group">
            <div className="p-3 bg-accent-500 text-white rounded-2xl shadow-lg shadow-accent-500/30">
              <GlikoSenseIcon size={18} isAnalyzing={true} />
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-black text-accent-700 dark:text-accent-400 uppercase tracking-widest mb-1 font-display">
                
                                                      {t('auto.analiza_glikosense', { defaultValue: 'Analiza GlikoSense' })}
                                                    </p>
              <div className="space-y-1">
                {patternInsights.map((insight: any, idx: number) => (
                  <div key={`insight-${idx}`} className="flex items-center gap-2 text-[10px] font-bold text-accent-900 dark:text-accent-100">
                    {insight.icon}
                    <span>{insight.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => { Haptics.light(); setTab("ai"); }} className="p-2 bg-white dark:bg-slate-800 rounded-full text-accent-600 shadow-sm transition-all active:scale-90">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </motion.div>

      {/* 7. Quick Actions Section */}
      <motion.div className="space-y-4">
        {/* Shortcuts row - Now full width and above buttons */}
        {shortcuts.length > 0 && (
          <div className="glass-card !p-6 flex flex-col gap-4 border border-white/50 dark:border-white/5 shadow-lg">
            <div className="flex justify-between items-center px-1">
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-display">{t('auto.moje_ulubione', { defaultValue: 'MOJE ULUBIONE' })}</h4>
              <button 
                onClick={() => {
                  Haptics.light();
                  onAction?.("food");
                  setTab("profile");
                }}
                className="text-[9px] font-black text-accent-500 uppercase tracking-tight"
              >
                
                                                      {t('auto.edytuj', { defaultValue: 'Edytuj' })}
                                                    </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none mask-fade-right">
              {/* System Shortcut: Training */}
              <button
                onClick={() => {
                  Haptics.light();
                  onAction?.("training");
                  setTab("profile");
                }}
                className="shrink-0 glass-card !p-5 flex items-center gap-4 font-black text-xs uppercase tracking-tighter shadow-md active:scale-95 transition-all border border-emerald-500/10 dark:border-emerald-500/5 dark:text-white group min-w-[140px]"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform block">🏃‍♂️</span>
                <div className="flex flex-col items-start">
                  <span className="leading-tight text-slate-800 dark:text-slate-200">{t('auto.trening', { defaultValue: 'Trening' })}</span>
                  <span className="text-[9px] text-emerald-500 lowercase font-bold">{t('auto.zarządzaj', { defaultValue: i18n.t('auto.zarzadzaj', { defaultValue: "Zarządzaj" }) })}</span>
                </div>
              </button>

              {shortcuts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => quickAdd(s)}
                  className="shrink-0 glass-card !p-5 flex items-center gap-4 font-black text-xs uppercase tracking-tighter shadow-md active:scale-95 transition-all border border-black/5 dark:border-white/5 dark:text-white group min-w-[140px]"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform block">{s.icon || "📌"}</span>
                  <div className="flex flex-col items-start">
                    <span className="leading-tight text-slate-800 dark:text-slate-200">{s.name}</span>
                    <span className="text-[9px] opacity-50 lowercase font-bold">{Number(s.carbs).toFixed(1)}{t('auto.g_węgli', { defaultValue: i18n.t('auto.g_wegli', { defaultValue: "g węgli" }) })}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Big Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              Haptics.light();
              setIsGlucoseModalOpen(true);
            }}
            className="bg-rose-500 h-32 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 shadow-2xl shadow-rose-500/40 active:scale-95 group transition-all text-white overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-[40px] -mr-12 -mt-12 group-hover:bg-white/20 transition-all"></div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Droplet size={32} strokeWidth={2.5} />
            </div>
            <span className="font-black text-[11px] uppercase tracking-widest font-display">{t('auto.pomiar', { defaultValue: 'Pomiar' })}</span>
          </button>

          <button
            onClick={() => {
              Haptics.light();
              setTab("bolus");
            }}
            className="bg-accent-600 h-32 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 shadow-2xl shadow-accent-600/40 active:scale-95 group transition-all text-white overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-[40px] -mr-12 -mt-12 group-hover:bg-white/20 transition-all"></div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <Zap size={32} />
            </div>
            <span className="font-black text-[11px] uppercase tracking-widest font-display">{t('auto.bolus', { defaultValue: 'Bolus' })}</span>
          </button>
        </div>
      </motion.div>

      {/* 8. Recent History View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {logs.filter(log => log.type === 'glucose').length > 0 && (
          <motion.div className="space-y-3">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-[10px] font-black text-slate-500/60 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-rose-500" />
                
                                                      {t('auto.pomiary', { defaultValue: 'Pomiary' })}
                                                    </h3>
              <button onClick={() => { Haptics.light(); setListFilter('glucose'); setTab("history"); }} className="text-[9px] font-black text-accent-500 uppercase">{t('auto.wszystkie', { defaultValue: 'Wszystkie' })}</button>
            </div>
            <div className="space-y-2">
               {logs.filter(log => log.type === 'glucose').slice(0, 3).map((log, idx) => (
                  <motion.div key={`${log.id}-${idx}`} layout>
                    <SwipeableItem id={log.id} onDelete={() => handleDeleteLog(log)}>
                      <div className="glass-card !p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                          <Droplet size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-base dark:text-white font-display">
                            {Math.round(log.value)} <span className="text-[10px] opacity-40 uppercase">{t('auto.mg_dl', { defaultValue: 'mg/dL' })}</span>
                          </p>
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {log.notes || 'Glukoza'}
                          </p>
                        </div>
                      </div>
                    </SwipeableItem>
                  </motion.div>
               ))}
            </div>
          </motion.div>
        )}

        {logs.filter(log => log.type === 'bolus' || (log.type as any) === 'insulin' || log.type === 'meal').length > 0 && (
          <motion.div className="space-y-3">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-[10px] font-black text-slate-500/60 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                
                                                      {t('auto.leczenie', { defaultValue: 'Leczenie' })}
                                                    </h3>
              <button onClick={() => { Haptics.light(); setListFilter('treatment'); setTab("history"); }} className="text-[9px] font-black text-accent-500 uppercase">{t('auto.wszystkie', { defaultValue: 'Wszystkie' })}</button>
            </div>
            <div className="space-y-2">
               {logs.filter(log => log.type === 'bolus' || (log.type as any) === 'insulin' || log.type === 'meal').slice(0, 3).map((log, idx) => (
                  <motion.div key={`${log.id}-${idx}`} layout>
                    <SwipeableItem id={log.id} onDelete={() => handleDeleteLog(log)}>
                      <div onClick={() => setEditingLog(log)} className="glass-card !p-4 flex items-center gap-4 cursor-pointer">
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", log.type === "meal" ? "bg-amber-500/10 text-amber-500" : "bg-accent-500/10 text-accent-500")}>
                          {log.type === "meal" ? <Utensils size={18} /> : <Syringe size={18} />}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-base dark:text-white font-display">
                            {typeof log.value === 'number' ? Number(log.value.toFixed(2)) : Number(Number(log.value).toFixed(2))} <span className="text-[10px] opacity-40 uppercase">{log.type === "meal" ? "g" : " j."}</span>
                          </p>
                          <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {log.type === 'meal' ? i18n.t('auto.posilek', { defaultValue: i18n.t('auto.posilek', { defaultValue: "Posiłek" }) }) : 'Bolus'}
                          </p>
                        </div>
                      </div>
                    </SwipeableItem>
                  </motion.div>
               ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Pump Status - Final Bento Piece */}
      {pumpStatus && settings?.showPumpWidget !== false && (
        <motion.div>
           <PumpStatusCard data={pumpStatus} />
        </motion.div>
      )}
      </>
      )}

      <GlucoseModal
        isOpen={isGlucoseModalOpen}
        onClose={() => setIsGlucoseModalOpen(false)}
        user={user}
      />
      
      {/* 9. Floating Status Center */}
      <div className="fixed bottom-24 right-4 z-[45]">
         {nsUrl && syncStatus && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             className={cn(
               "glass w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border-white/50 dark:border-white/10",
             )}
           >
              <div className={cn(
                "w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
                syncStatus.status === 'syncing' ? 'bg-indigo-500 animate-pulse' : 
                syncStatus.status === 'success' ? 'bg-emerald-500' : 
                syncStatus.status === 'error' ? 'bg-rose-500' : 'bg-slate-400'
              )} />
              {syncStatus.status === 'syncing' && <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-2xl animate-ping" />}
           </motion.div>
         )}
      </div>

      {editingLog && <MealEditModal log={editingLog} user={user} onClose={() => setEditingLog(null)} />}
      
      {/* Footer Info */}
      <div className="pt-8 pb-4 text-center space-y-2 opacity-30">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">
          
                            {t('auto.wersja', { defaultValue: 'Wersja' })} {APP_VERSION}
        </p>
      </div>
    </div>
  );
}


