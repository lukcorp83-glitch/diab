import { useAuthStore } from '../stores/useAuthStore';
import { useMealPlateLogic } from '../hooks/useMealPlateLogic';
import { ProductSearch } from "./MealPlate/ProductSearch";
import { MealComposer } from "./MealPlate/MealComposer";
import { MealPlateModals } from "./MealPlate/MealPlateModals";


import i18n from '../i18n';
import { MealScanner } from './MealPlate/BarcodeScanner';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { getEffectiveUid, getMealAbsorptionTime, pluralize } from "../lib/utils";
import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react";

// Lazy load Diets to avoid conflict with AppContent.tsx lazy import
const Diets = React.lazy(() => import("./Diets").then(module => ({ default: module.Diets })));
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Product, PlateItem } from '../types';
import { getProductName } from './FoodDatabase';
import {
 Search,
 Plus,
 Trash2,
 Tag,
 Utensils,
 Scan,
 Save,
 ChevronRight,
 ChevronUp,
 Globe,
 Loader2,
 Zap,
 Star,
 BookMarked,
 Camera,
 Mic,
 X,
 Database,
 Soup,
 Salad,
 Pizza,
 Sandwich,
 Apple as AppleIcon,
 Leaf,
 AlertTriangle,
 Info,
 Heart,
 Share2,
 Check,
} from "lucide-react";
import SwipeableItem from "./SwipeableItem";
import MealHistoryView from "./MealHistoryView";
import { cn } from "../lib/utils";
import { db } from "../lib/firebase";
import {
 collection,
 query,
 limit,
 addDoc,
 deleteDoc,
 doc,
 orderBy,
 serverTimestamp,
 updateDoc,
 setDoc,
 getDoc,
} from "firebase/firestore";
import { useSavedMeals } from "../hooks/queries/useSavedMeals";
import { useCustomProducts, useCommunityProducts } from "../hooks/queries/useFoodDatabase";
import { dbService } from "../services/databaseService";
import { CATEGORIES } from "../constants";
import { geminiService } from "../services/gemini";
import { Html5Qrcode } from "html5-qrcode";
import {
 AreaChart,
 Area,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
} from "recharts";

import { Haptics } from "../lib/haptics";
import { useLogsStore } from "../stores/useLogsStore";
import { useMealPlateStore } from "../stores/useMealPlateStore";

const getDietBadge = (product: Product, activeDiet: string | null) => {
 const logs = useLogsStore((state) => state.logs);
 if (!activeDiet) return null;
 const pName = getProductName(product, i18n.language).toLowerCase();

 if (activeDiet === "keto") {
 if ((product.carbs || 0) > 10)
 return {
 type: "warning",
 text: i18n.t('auto.wysokie_wegle', { defaultValue: i18n.t('auto.wysokie_wegle', { defaultValue: "Wysokie Węgle" }) }),
 icon: <AlertTriangle size={10} className="text-rose-500" />,
 color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
 };
 if ((product.carbs || 0) <= 5)
 return {
 type: "success",
 text: "Keto Friendly",
 icon: <Leaf size={10} className="text-emerald-500" />,
 color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
 };
 }

 if (activeDiet === "gluten") {
 const glutenWords = [
 "chleb",
 i18n.t('auto.bulka', { defaultValue: i18n.t('auto.bulka', { defaultValue: "bułka" }) }),
 "makaron",
 "pszenic",
 i18n.t('auto.maka', { defaultValue: i18n.t('auto.maka', { defaultValue: "mąka" }) }),
 "ciasto",
 "ciastk",
 "krakers",
 "paluszk",
 i18n.t('auto.platki', { defaultValue: i18n.t('auto.platki', { defaultValue: "płatki" }) }),
 ];
 if (glutenWords.some((w) => pName.includes(w)))
 return {
 type: "warning",
 text: "Uwaga! Gluten?",
 icon: <AlertTriangle size={10} className="text-rose-500" />,
 color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
 };
 }

 if (activeDiet === "plate") {
 if ((product.carbs || 0) > 40 && (product.protein || 0) < 5)
 return {
 type: "warning",
 text: i18n.t('auto.same_wegle', { defaultValue: i18n.t('auto.same_wegle', { defaultValue: "Same węgle" }) }),
 icon: <AlertTriangle size={10} className="text-rose-500" />,
 color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
 };
 }

 if (activeDiet === "if") {
 // Intermittent Fasting doesn't restrict specific items usually, but let's encourage low glycemic index
 if (typeof product.gi === "number" && product.gi > 70)
 return {
 type: "warning",
 text: "Wysoki IG",
 icon: <AlertTriangle size={10} className="text-amber-500" />,
 color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
 };
 }

 return null;
};

export default function MealPlate({
 setTab,
 sharedPlate = [],
 setSharedPlate,
 mode = "both",
 openHistory,
 settings,
 initialAction,
 onClearInitialAction}: {
 
 setTab: (t: string) => void;
 sharedPlate?: PlateItem[];
 setSharedPlate?: React.Dispatch<React.SetStateAction<PlateItem[]>>;
 mode?: "search" | "plate" | "both";
 openHistory?: () => void;
 settings?: any;
 initialAction?: string | null;
 onClearInitialAction?: () => void;
}) {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();

 const logs = useLogsStore(state => state.logs);
 const plate = sharedPlate;
 const setPlate = setSharedPlate || (() => {});
 const { t } = useTranslation();
 const setSearchTerm = useMealPlateStore(state => state.setSearchTerm);
 const setIsSearching = useMealPlateStore(state => state.setIsSearching);

 const [plateView, setPlateView] = useState<"composer" | "diets" | "history">("composer");
 const [isScannerOpen, setIsScannerOpen] = useState(false);
 const [unrecognizedBarcode, setUnrecognizedBarcode] = useState<string | null>(null);
 const [isAnalyzingLabel, setIsAnalyzingLabel] = useState(false);
 const labelFileInputRef = useRef<HTMLInputElement>(null);
 const scannerRef = useRef<any>(null);

 const handleCloseScanner = async () => {
 if (scannerRef.current && scannerRef.current.stopScanner) {
 await scannerRef.current.stopScanner();
 }
 setIsScannerOpen(false);
 setUnrecognizedBarcode(null);
 };
 const scrollRef = useRef<HTMLDivElement>(null);
 const lastScrollY = useRef(0);

 const handleScrollHaptics = (e: React.UIEvent<HTMLDivElement>) => {
 const currentScrollY = e.currentTarget.scrollTop;
 const diff = Math.abs(currentScrollY - lastScrollY.current);
 if (diff > 40) {
 // Trigger tick every 40px scroll
 Haptics.tick();
 lastScrollY.current = currentScrollY;
 }
 };
 const [searchError, setSearchError] = useState<string | null>(null);
 const { data: qCustomProducts = [] } = useCustomProducts(user);
 const { data: qCommunityProducts = [] } = useCommunityProducts(user);

  const [libBase, setLibBase] = useState<any[]>([]);
  useEffect(() => {
    let isMounted = true;
    import("../data/foodDatabase").then(module => {
      if (isMounted) setLibBase(module.LIB_BASE);
    });
    return () => { isMounted = false };
  }, []);

  const allLocal = useMemo(() => {
    const allLocalRaw = [
      ...qCustomProducts.map((p: any) => ({ ...p, isCustom: true })), 
      ...qCommunityProducts.map((p: any) => ({ ...p, isCommunity: true })), 
      ...libBase
    ];
 // Remove duplicates based on lowercased name
 const uniqueMap = new Map();
 for (const prod of allLocalRaw) {
 if (!prod) continue;
 const key = getProductName(prod, i18n.language).toLowerCase().trim();
 if (!uniqueMap.has(key)) {
 uniqueMap.set(key, prod);
 }
 }
 return Array.from(uniqueMap.values());
 }, [qCustomProducts, qCommunityProducts, libBase, i18n.language]);


 const openShortcutConfirmModal = (product: Product) => {
 Haptics.light();
 setShortcutToConfirm(product);
 setShortcutWeight("100");
 setIsShortcutConfirmModalOpen(true);
 };

 const handleShortcutConfirm = () => {
 if (shortcutToConfirm) {
 const weight = parseFloat(shortcutWeight) || 100;
 saveAsShortcut(shortcutToConfirm, weight);
 setIsShortcutConfirmModalOpen(false);
 setShortcutToConfirm(null);
 }
 };

 const saveAsShortcut = async (product: Product, weight: number = 100) => {
 if (!user) return;
 Haptics.impact();
 try {
 const calculatedCarbs = (product.carbs * weight) / 100;
 await addDoc(
 collection(
 db,
 "users",
 getEffectiveUid(user),
 "shortcuts",
 ),
 {
 name: `${getProductName(product, i18n.language)} (${weight}g)`,
 icon: "🥗",
 type: "meal",
 carbs: Number(calculatedCarbs.toFixed(1)),
 originalCarbs: product.carbs,
 weight: weight,
 createdAt: serverTimestamp(),
 },
 );
 toast.success(`Dodano ${getProductName(product, i18n.language)} (${weight}g) do skrótów!`);
 } catch (e) {
 console.error("Error saving shortcut:", e);
 toast.error(i18n.t('auto.nie_udalo_sie_zapisac_skrotu', { defaultValue: i18n.t('auto.nie_udalo_sie_zapisac_skr', { defaultValue: "Nie udało się zapisać skrótu." }) }));
 }
 };

 const saveToCustomDb = async (product: Product) => {
 if (!user) return;
 try {
 await addDoc(
      collection(
        db,
        "users",
        getEffectiveUid(user),
        "customProducts",
      ),
 {
 name: getProductName(product, i18n.language),
 carbs: product.carbs,
 protein: product.protein || 0,
 fat: product.fat || 0,
 gi: typeof product.gi === "number" ? product.gi : 50,
 category: "Z Sieci",
 },
 );
 queryClient.invalidateQueries({ queryKey: ["customProducts"] });
 toast(i18n.t('auto.zapisano_do_wlasnych_posilkow', { defaultValue: i18n.t('auto.zapisano_do_wlasnych_posi', { defaultValue: "Zapisano do własnych posiłków." }) }));
 } catch (e) {
 console.error(e);
 toast.error(i18n.t('auto.blad_zapisu', { defaultValue: i18n.t('auto.blad_zapisu', { defaultValue: "Błąd zapisu." }) }));
 }
 };

 const publishToCommunity = async (product: Product) => {
 if (!user) return;
 try {
 await addDoc(
      collection(db, "communityProducts"),
 {
 name: getProductName(product, i18n.language),
 carbs: product.carbs,
 protein: product.protein || 0,
 fat: product.fat || 0,
 gi: typeof product.gi === "number" ? product.gi : 50,
 category: product.category || "Z Sieci",
 authorId: getEffectiveUid(user),
 createdAt: serverTimestamp(),
 },
 );
 queryClient.invalidateQueries({ queryKey: ["communityProducts"] });
 toast.success(
 `Udostępniono "${getProductName(product, i18n.language)}" społeczności GlikoControl!`,
 );
 Haptics.success();
 } catch (e) {
 console.error("Error publishing to community:", e);
 toast.error(i18n.t('auto.wystapil_blad_podczas_udostepn', { defaultValue: i18n.t('auto.wystapil_blad_podczas_udo', { defaultValue: "Wystąpił błąd podczas udostępniania." }) }));
 }
 };

 const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
 const [isShortcutConfirmModalOpen, setIsShortcutConfirmModalOpen] =
 useState(false);
 const [shortcutWeight, setShortcutWeight] = useState("100");
 const [shortcutToConfirm, setShortcutToConfirm] = useState<Product | null>(
 null,
 );
 const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
 const [weightInput, setWeightInput] = useState("100");
 const [analysis, setAnalysis] = useState<string | null>(null);
 const [isAnalyzing, setIsAnalyzing] = useState(false);
 const [mealName, setMealName] = useState("");
 const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
 const [isMealSaved, setIsMealSaved] = useState(false);
 const saveMealToLibrary = () => { setIsSaveModalOpen(true); };
 const [expandedMeal, setExpandedMeal] = useState<{ meal: any; items: any[] } | null>(null);
 const { data: savedMeals = [], isLoading: isLoadingSavedMeals } = useSavedMeals(user);

 const now = new Date();
 const tzOffset = now.getTimezoneOffset() * 60000;
 const localISOTime = new Date(Date.now() - tzOffset)
 .toISOString()
 .slice(0, 16);
 const [entryTime, setEntryTime] = useState(localISOTime);
 const [cookingMethod, setCookingMethod] = useState<
 "raw" | "boiled" | "baked" | "fried" | "blended"
 >("raw");
 const [mergeCandidates, setMergeCandidates] = useState<any[] | null>(null);

 const openWeightModal = (product: Product) => {
 Haptics.light();
 setSelectedProduct(product);
 setWeightInput("100");
 setIsWeightModalOpen(true);
 };

 const handleWeightSubmit = () => {
 if (selectedProduct && weightInput) {
 Haptics.light();
 addToPlate(selectedProduct, parseFloat(weightInput));
 setIsWeightModalOpen(false);
 setSelectedProduct(null);
 setSearchTerm("");
 setOnlineResults([]);

 // Skrolujemy do góry by użytkownik widział dodany produkt na talerzu
 setTimeout(() => {
 document
 .querySelector("main")
 ?.scrollTo({ top: 0, behavior: "smooth" });
 window.scrollTo({ top: 0, behavior: "smooth" });
 }, 50);
 }
 };

 const analyzeMeal = async () => {
 if (plate.length === 0) return;
 setIsAnalyzing(true);
 setAnalysis(null);
 try {
 const dietContext = settings?.activeDiet
 ? i18n.t('auto.uwaga_uzytkownik_przebywa', { defaultValue: "UWAGA: Użytkownik przebywa na diecie: {{var0}}. Koniecznie uwzględnij to podczas analizy i precyzuj jak bardzo ten zestaw do niej pasuje!", var0: settings.activeDiet })
 : "";
 const prompt = i18n.t('auto.jestes_zaawansowanym_asys', { defaultValue: "Jesteś zaawansowanym asystentem diabetologicznym. Przeanalizuj poniższy skład posiłku pacjenta:\n {{var0}}\n \n Wybrana obróbka termiczna całego posiłku: {{var1}}\n {{var2}}\n \n Zwróć szczegółową analizę w czytelnym formacie HTML (używaj <b>, <ul>, <li>, <br>, ale ZABRANIAM używania markdown, w szczególności gwazdek).\n \n Uwzględnij:\n 1. <b>Szczegółowy Wpływ Składników i Obróbki</b>: Wytłumacz, jak obecność białek/tłuszczy oraz dodanie płynów (np. wody, mleka - co rozcieńcza węglowodany na objętość) wpływa na ładunek glikemiczny (ŁG). Przeanalizuj również wpływ wybranej obróbki termicznej (np. gotowanie, smażenie, pieczenie, blendowanie) na wchłanianie i Indeks Glikemiczny (IG). Dodanie tłuszczu spowalnia trawienie (efekt pizzy), a blendowanie/rozgotowanie je przyspiesza.\n 2. <b>Profil Wchłaniania</b>: Oceń wypadkowy Indeks Glikemiczny (IG) oraz całkowity Ładunek Glikemiczny (ŁG) zestawu. Wskaż produkty obciążające układ i mogące powodować późniejsze skoki glikemii.\n 3. <b>Rekomendacja Bolusa (w tym WBT)</b>: Zaleć typ bolusa (np. prosty, złożony, przedłużony). Jeśli posiłek ma dużo WW i WBT, określ ile % insuliny podać od razu, a ile przedłużyć na ile godzin. Wspomnij o pre-bolusie.\n 4. <b>Ostrzeżenia</b>: Krótko (1 zdanie) na co uważać w ciągu najbliższych kilku godzin w związku z trwającym wchłanianiem tego konkretnego posiłku.\n \n Odpowiedź ma być konkretna, rzetelna i dostosowana do specyfiki użytych składników (np. mąki, jajek, mleka w przypadku ciasta naleśnikowego).", var0: JSON.stringify(plate.map((p) => ({ nazwa: getProductName(p, i18n.language), waga: p.weight, wegle: p.carbs, bialko: p.protein, tluszcz: p.fat, IG: p.gi }))), var1: cookingMethod === "raw" ? "Surowe / Brak" : cookingMethod === "boiled" ? "Gotowane" : cookingMethod === "baked" ? "Pieczone" : cookingMethod === "fried" ? i18n.t('auto.smazone', { defaultValue: "Smażone" }) : "Zblendowane", var2: dietContext });
 const result = await geminiService.generateContent(prompt);
 setAnalysis(result);
 } catch (e) {
 console.error(e);
 setAnalysis(i18n.t('auto.blad_analizy_ai', { defaultValue: i18n.t('auto.blad_analizy_ai', { defaultValue: "Błąd analizy AI." }) }));
 } finally {
 setIsAnalyzing(false);
 }
  };

  const saveMealSet = async () => {
    if (!user || !mealName || plate.length === 0) return;
    Haptics.medium();
    try {
      const totalCarbs = plate.reduce((sum: number, item: any) => sum + (item.carbs || 0), 0);
      const totalProtein = plate.reduce((sum: number, item: any) => sum + (item.protein || 0), 0);
      const totalFat = plate.reduce((sum: number, item: any) => sum + (item.fat || 0), 0);
      const totalCarbsForGI = plate.reduce((sum: number, item: any) => sum + (item.carbs || 0), 0);
      const weightedGI = totalCarbsForGI > 0 
        ? plate.reduce((sum: number, item: any) => sum + ((item.gi || 50) * (item.carbs || 0)), 0) / totalCarbsForGI
        : 50;

      // Zapis jako szablon (na wypadek, gdyby stary kod gdzieś go używał)
      await addDoc(
        collection(
          db,
          "users",
          getEffectiveUid(user),
          "savedMeals",
        ),
        {
          name: mealName,
          items: plate,
          cookingMethod: cookingMethod,
          timestamp: Date.now(),
        },
      );

      // Zapis jako pojedynczy, gotowy produkt do wyszukiwania we Własnych
      await addDoc(
        collection(
          db,
          "users",
          getEffectiveUid(user),
          "customProducts",
        ),
        {
          name: mealName,
          carbs: Number(totalCarbs.toFixed(1)),
          protein: Number(totalProtein.toFixed(1)),
          fat: Number(totalFat.toFixed(1)),
          gi: Number(weightedGI.toFixed(0)),
          category: "Zestawy",
          isCustom: true
        }
      );
      
      queryClient.invalidateQueries({ queryKey: ["customProducts"] });
      
      setIsSaveModalOpen(false);
      setMealName("");
      Haptics.success();
      toast.success(i18n.t('auto.zestaw_zapisany', { defaultValue: "Zestaw zapisany!" }));
    } catch (e) {
      console.error(e);
      toast.error(i18n.t('auto.blad_zapisu', { defaultValue: "Błąd zapisu." }));
    }
  };

 const addSavedMeal = (meal: any) => {
 Haptics.light();
 setPlate([...plate, ...meal.items]);
 if (meal.cookingMethod) {
 setCookingMethod(meal.cookingMethod);
 }
 toast.success(`Dodano zestaw: ${meal.name}`);
 };

 const updateWeight = (idx: number, weight: number) => {
 const newPlate = [...plate];
 const item = newPlate[idx];
 newPlate[idx] = {
 ...item,
 weight,
 };
 setPlate(newPlate);
 };

 const addToPlate = (product: Product, weight: number = 100) => {
 setPlate([
 ...plate,
 {
 ...product,
 weight,
 plateItemId:
 Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
 },
 ]);
 // Don't clear search automatically so user can add more
 };

 const removeFromPlate = (idx: number) => {
 Haptics.light();
 setPlate(plate.filter((_, i) => i !== idx));
 };

 const {
   rawCarbs, rawPolyols, rawProtein, rawFat, totalWeight, rawCals,
   totalCarbs, totalProtein, totalFat, totalCalsFromMacros, totalCals,
   totalWW, totalWBT, rawGL, avgGI, totalGL
 } = useMealPlateLogic(plate, cookingMethod);

 const [currentTime, setCurrentTime] = useState(Date.now());

 useEffect(() => {
 const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
 return () => clearInterval(timer);
 }, []);

 const activeMeal = useMemo(() => {
 if (!logs) return null;
 const meals = logs.filter((l) => l.type === "meal" || l.type === "carbs" || l.linkedMeal);
 if (meals.length === 0) return null;

 // Przetwarzamy wszystkie posiłki, obliczając ich czas zakończenia wchłaniania (end time)
 const mealsWithEndTime = meals.map((m) => {
 const mSrc = m.linkedMeal ? m.linkedMeal : m;
 if (!mSrc) return { m, endTimeMs: 0, isCurrentlyAbsorbing: false };

 const mWW =
 (mSrc as any).value !== undefined
 ? (mSrc as any).value / 10
 : (mSrc as any).carbs !== undefined
 ? (mSrc as any).carbs / 10
 : 0;
 const mWBT = ((mSrc.protein || 0) * 4 + (mSrc.fat || 0) * 9) / 100;

 const absorptionTimeHr = getMealAbsorptionTime(mWW, mWBT);
 const endTimeMs = (m.timestamp || 0) + absorptionTimeHr * 60 * 60 * 1000;
 const isCurrentlyAbsorbing = currentTime < endTimeMs;

 return { m, endTimeMs, isCurrentlyAbsorbing };
 });

 // Wybieramy te posiłki, których wchłanianie wciąż trwa
 const absorbingMeals = mealsWithEndTime.filter((x) => x.isCurrentlyAbsorbing);

 if (absorbingMeals.length > 0) {
 // Wybieramy ten, którego wchłanianie kończy się najpóźniej w przyszłości
 absorbingMeals.sort((a, b) => b.endTimeMs - a.endTimeMs);
 return absorbingMeals[0].m;
 }

 // Jeśli żaden posiłek się obecnie nie wchłania, a ustawienie pokazuje widżet
 if (settings?.showMealWidget) {
 const sortedMeals = [...mealsWithEndTime].sort((a, b) => (b.m.timestamp || 0) - (a.m.timestamp || 0));
 return sortedMeals.length > 0 ? sortedMeals[0].m : null;
 }

 return null;
 }, [logs, settings?.showMealWidget, currentTime]);

 const activeBolus = useMemo(() => {
 if (!logs || !activeMeal) return null;

 // If the active meal is actually a bolus with a linked meal, it IS the bolus
 if (activeMeal.type === "bolus" || activeMeal.type === "insulin") {
 return activeMeal;
 }

 const boluses = logs.filter(
 (l) => l.type === "bolus" || l.type === "insulin",
 );
 for (const b of boluses) {
 if (
 Math.abs((b.timestamp || 0) - (activeMeal.timestamp || 0)) <
 1000 * 60 * 30
 ) {
 return b;
 }
 }
 return null;
 }, [logs, activeMeal]);

 const activeChartData = useMemo(() => {
 if (!activeMeal) return [];

 const carbSrc =
 activeMeal.linkedMeal ? activeMeal.linkedMeal : activeMeal;

 // Default to WW and WBT from activeMeal
 const WW =
 carbSrc?.value !== undefined
 ? carbSrc.value / 10
 : carbSrc?.carbs !== undefined
 ? carbSrc.carbs / 10
 : 0;
 const WBT = ((carbSrc?.protein || 0) * 4 + (carbSrc?.fat || 0) * 9) / 100;
 const gI = 50;

 const data = [];

 const insulinProfile = {
 0: 0,
 0.5: 0.15,
 1.0: 0.35,
 1.5: 0.25,
 2.0: 0.15,
 2.5: 0.08,
 3.0: 0.02,
 3.5: 0.0,
 4.0: 0.0,
 };

 const rules = (() => {
 try { return JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}'); } catch { return {}; }
 })();
 const pkFast = rules.pkParams?.fastCarbDuration || 1.5;
 const pkNormal = rules.pkParams?.normalCarbDuration || 3.0;
 const pkSlow = rules.pkParams?.slowCarbDuration || 5.0;

 const getCarbAbsorption = (t: number, gi: number) => {
 let multiplier = 1.0;
 if (gi > 70) multiplier = pkFast / 1.5;
 else if (gi < 50) multiplier = pkSlow / 5.0;
 else multiplier = pkNormal / 3.0;

 let peakT = (gi > 70 ? 0.75 : gi < 50 ? 1.5 : 1.0) * multiplier;
 let duration = 1.5 * multiplier;
 return Math.max(0, 1 - Math.pow((t - peakT) / duration, 2));
 };

 const getWbtAbsorption = (t: number) => {
 let multiplier = pkSlow / 5.0;
 let adjT = t / multiplier;
 if (adjT < 1) return 0;
 if (adjT < 3) return (adjT - 1) * 0.5;
 return Math.max(0, 1 - (adjT - 3) * 0.5);
 };

 // Find all meals and boluses within 6h window before activeMeal
 const recentMeals = logs.filter(
 (l) =>
 (l.type === "meal" || l.type === "carbs" || l.linkedMeal) &&
 (activeMeal.timestamp || 0) - (l.timestamp || 0) < 1000 * 60 * 60 * 6,
 );
 const recentBoluses = logs.filter(
 (l) =>
 (l.type === "bolus" || l.type === "insulin") &&
 Math.abs((activeMeal.timestamp || 0) - (l.timestamp || 0)) <
 1000 * 60 * 60 * 6,
 );
 const bgLogs = logs
 .filter((l) => l.type === "glucose")
 .sort((a, b) => b.timestamp - a.timestamp);

 let maxChartHoursActive = 2;
 const maxCarbMultiplierActive = gI > 70 ? pkFast / 1.5 : gI < 50 ? pkSlow / 5.0 : pkNormal / 3.0;
 const maxCarbPeakActive = gI > 70 ? 0.75 : gI < 50 ? 1.5 : 1.0;
 const maxCarbTimeActive = WW > 0 ? (maxCarbPeakActive + 1.5) * maxCarbMultiplierActive : 0;
 const maxWbtTimeActive = WBT > 0 ? 5 * (pkSlow / 5.0) : 0;
 maxChartHoursActive = Math.max(maxCarbTimeActive, maxWbtTimeActive, 2);
 if (recentBoluses.length > 0) maxChartHoursActive = Math.max(maxChartHoursActive, 4);
 maxChartHoursActive = Math.ceil(maxChartHoursActive * 2) / 2;
 if (maxChartHoursActive > 8) maxChartHoursActive = 8;

 for (let currentHr = -1; currentHr <= maxChartHoursActive; currentHr += 0.5) {
 let totalMealImpact = 0;
 let totalInsImpact = 0;

 const chartTime = new Date(
 (activeMeal.timestamp || 0) + currentHr * 60 * 60 * 1000,
 );

 // Meal Impacts
 for (const m of recentMeals) {
 const mSrc = m.linkedMeal ? m.linkedMeal : m;
 if (!mSrc) continue;
 const mWW =
 mSrc.value !== undefined
 ? mSrc.value / 10
 : mSrc.carbs !== undefined
 ? mSrc.carbs / 10
 : 0;
 const mWBT = ((mSrc.protein || 0) * 4 + (mSrc.fat || 0) * 9) / 100;

 // Relative age in hours for this meal at this chart point
 const relativeAgeHr =
 (chartTime.getTime() - (m.timestamp || 0)) / (1000 * 60 * 60);

 if (relativeAgeHr >= 0 && relativeAgeHr <= 10) {
 let tCarbProfile = 0;
 for (let step = 0; step <= 8; step += 0.5)
 tCarbProfile += getCarbAbsorption(step, gI);
 let tWbtProfile = 0;
 for (let step = 0; step <= 8; step += 0.5)
 tWbtProfile += getWbtAbsorption(step);

 let c =
 tCarbProfile > 0
 ? (getCarbAbsorption(relativeAgeHr, gI) / tCarbProfile) * mWW
 : 0;
 let w =
 tWbtProfile > 0
 ? (getWbtAbsorption(relativeAgeHr) / tWbtProfile) * mWBT
 : 0;

 totalMealImpact += c + w;
 }
 }

 // Insulin Impacts
 for (const b of recentBoluses) {
 const bVal = parseFloat(b.value || 0);
 const relativeAgeHr =
 (chartTime.getTime() - (b.timestamp || 0)) / (1000 * 60 * 60);
 // Find nearest 0.5 step
 const step = Math.round(relativeAgeHr * 2) / 2;
 if (
 step >= 0 &&
 step <= 4 &&
 (insulinProfile as any)[step] !== undefined
 ) {
 totalInsImpact += (insulinProfile as any)[step] * bVal;
 }
 }

 // Find closest BG within 15 mins for historical points
 let Cukier = null;
 if (chartTime.getTime() <= Date.now() + 15 * 60000) {
 const closestBg = bgLogs.find(
 (l) => Math.abs(l.timestamp - chartTime.getTime()) < 1000 * 60 * 15,
 );
 if (closestBg) {
 Cukier = parseFloat(closestBg.value);
 }
 }

 data.push({
 time: chartTime.toLocaleTimeString([], {
 hour: "2-digit",
 minute: "2-digit",
 }),
 Posiłek: Math.round(totalMealImpact * 10),
 Insulina: -Math.round(totalInsImpact * 10),
 Netto: Math.round((totalMealImpact - totalInsImpact) * 10),
 Cukier: Cukier,
 WW,
 WBT,
 });
 }

 return data;
 }, [activeMeal, activeBolus, plate]);

 const projectedChartData = useMemo(() => {
 const totalWeightsWithGi = plate.filter(i => typeof i.gi === 'number').reduce((s, i) => s + i.weight, 0);
 const weightedGiSum = plate.filter(i => typeof i.gi === 'number').reduce((s, i) => s + (i.gi as number) * i.weight, 0);
 const averageGi = totalWeightsWithGi > 0 ? weightedGiSum / totalWeightsWithGi : 50;

 const data = [];
 const rules = (() => {
 try { return JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}'); } catch { return {}; }
 })();
 const pkFast = rules.pkParams?.fastCarbDuration || 1.5;
 const pkNormal = rules.pkParams?.normalCarbDuration || 3.0;
 const pkSlow = rules.pkParams?.slowCarbDuration || 5.0;

 const getCarbAbsorption = (t: number, gi: number) => {
 let multiplier = 1.0;
 if (gi > 70) multiplier = pkFast / 1.5;
 else if (gi < 50) multiplier = pkSlow / 5.0;
 else multiplier = pkNormal / 3.0;

 let peakT = (gi > 70 ? 0.75 : gi < 50 ? 1.5 : 1.0) * multiplier;
 let duration = 1.5 * multiplier;
 return Math.max(0, 1 - Math.pow((t - peakT) / duration, 2));
 };

 const getWbtAbsorption = (t: number) => {
 let multiplier = pkSlow / 5.0;
 let adjT = t / multiplier;
 if (adjT < 1) return 0;
 if (adjT < 3) return (adjT - 1) * 0.5;
 return Math.max(0, 1 - (adjT - 3) * 0.5);
 };

 const startTime = new Date(entryTime).getTime();

 let maxChartHoursPlate = 2;
 const maxCarbMultiplierPlate = averageGi > 70 ? pkFast / 1.5 : averageGi < 50 ? pkSlow / 5.0 : pkNormal / 3.0;
 const maxCarbPeakPlate = averageGi > 70 ? 0.75 : averageGi < 50 ? 1.5 : 1.0;
 const maxCarbTimePlate = totalWW > 0 ? (maxCarbPeakPlate + 1.5) * maxCarbMultiplierPlate : 0;
 const maxWbtTimePlate = totalWBT > 0 ? 5 * (pkSlow / 5.0) : 0;
 maxChartHoursPlate = Math.max(maxCarbTimePlate, maxWbtTimePlate, 2);
 maxChartHoursPlate = Math.ceil(maxChartHoursPlate * 2) / 2;
 if (maxChartHoursPlate > 8) maxChartHoursPlate = 8;

 for (let currentHr = 0; currentHr <= maxChartHoursPlate; currentHr += 0.5) {
 let tCarbProfile = 0;
 for (let step = 0; step <= 8; step += 0.5) {
 tCarbProfile += getCarbAbsorption(step, averageGi);
 }
 let tWbtProfile = 0;
 for (let step = 0; step <= 8; step += 0.5) {
 tWbtProfile += getWbtAbsorption(step);
 }

 let c = tCarbProfile > 0 ? (getCarbAbsorption(currentHr, averageGi) / tCarbProfile) * totalWW : 0;
 let w = tWbtProfile > 0 ? (getWbtAbsorption(currentHr) / tWbtProfile) * totalWBT : 0;

 const chartTime = new Date(startTime + currentHr * 60 * 60 * 1000);

 data.push({
 time: chartTime.toLocaleTimeString([], {
 hour: "2-digit",
 minute: "2-digit",
 }),
 Posiłek: Math.round((c + w) * 10),
 WW: totalWW,
 WBT: totalWBT,
 });
 }

 return data;
 }, [plate, totalWW, totalWBT, entryTime]);

 const prepareToLogMeal = () => {
 if (!user || plate.length === 0) return;

 // Oparto tylko na wczytanych logach lokalnie (Local State), sprawdza historię 3 godziny wstecz.
 const entryTimestamp = new Date(entryTime).getTime();
 const timeLimit = 3 * 60 * 60 * 1000;
 const candidates = logs.filter(l => 
 (l.type === "bolus" || l.type === "meal" || (l.type as string) === "carbs") &&
 Math.abs(Number(l.timestamp) - entryTimestamp) < timeLimit &&
 (!l.items || l.items.length === 0) &&
 (!l.description || l.description.trim() === "") &&
 (!(l as any).name || (l as any).name.trim() === "") &&
 (!l.linkedMeal?.name || l.linkedMeal.name.trim() === "") &&
 (!l.notes || l.notes.trim() === "") &&
 (!l.userModified) && // nie proponujemy bolusów/posiłków, które już edytowano
 ((l as any).carbs > 0 || l.value > 0 || l.linkedMeal?.carbs > 0)
 );

 if (candidates.length > 0) {
 setMergeCandidates(candidates);
 } else {
 handleLogMeal();
 }
 };

 const handleMergeMeal = async (logIdOrNsId: string) => {
 if (!user || plate.length === 0) return;
 Haptics.medium();
 
 try {
 const logToMerge = logs.find(l => (l.id && l.id === logIdOrNsId) || (l.nsId && l.nsId === logIdOrNsId));
 if (!logToMerge) {
 handleLogMeal();
 return;
 }

 const isBolus = logToMerge.type === "bolus";
 const updates: any = {
 description: plate.map((i) => i.name).join(", "),
 items: plate,
 polyols: rawPolyols,
 protein: totalProtein,
 fat: totalFat,
 calories: Math.round(totalCalsFromMacros),
 timestamp: new Date(entryTime).getTime(),
 };
 
 if (isBolus) {
 updates.linkedMeal = {
 ...(logToMerge.linkedMeal || {}),
 polyols: rawPolyols,
 protein: totalProtein,
 fat: totalFat,
 name: plate.map((i) => i.name).join(", "),
 items: plate,
 calories: Math.round(totalCalsFromMacros),
 };
 // Preserve pump carbs if available, otherwise use plate carbs
 updates.linkedMeal.carbs = logToMerge.linkedMeal?.carbs || totalCarbs;
 } else {
 updates.value = logToMerge.value || totalCarbs;
 updates.polyols = rawPolyols;
 updates.protein = totalProtein;
 updates.fat = totalFat;
 updates.calories = Math.round(totalCalsFromMacros);
 updates.type = "meal"; // Safety
 }

 const effectiveLogId = logToMerge.id || logToMerge.nsId;
 if (!effectiveLogId) throw new Error("Brak prawidłowego ID wpisu.");

 const logRef = doc(db, "users", getEffectiveUid(user), "logs", effectiveLogId);
 await setDoc(logRef, { ...logToMerge, id: effectiveLogId, ...updates, userModified: true }, { merge: true });
 
 window.dispatchEvent(new CustomEvent('localLogUpdate', { detail: { id: effectiveLogId, updates: { ...logToMerge, id: effectiveLogId, ...updates, userModified: true } } }));
 
 setPlate([]);
 setMergeCandidates(null);
 Haptics.success();
 toast.success(i18n.t('auto.polaczono_z_wpisem_z_pompy', { defaultValue: i18n.t('auto.polaczono_z_wpisem_z_pomp', { defaultValue: "Połączono z wpisem z pompy!" }) }));
 } catch (e: any) { console.error(e); toast.error(i18n.t('auto.blad_scalania', { defaultValue: i18n.t('auto.blad_scalania', { defaultValue: "Błąd scalania:" }) }) + " " + e.message); Haptics.error(); }
 };

 const handleLogMeal = async () => {
 if (!user || plate.length === 0) return;
 Haptics.medium();
 try {
 const payload = {
 type: "meal",
 value: totalCarbs,
 carbs: totalCarbs,
 polyols: rawPolyols,
 protein: totalProtein,
 fat: totalFat,
 calories: Math.round(totalCalsFromMacros),
 timestamp: new Date(entryTime).getTime(),
 description: plate.map((i) => i.name).join(", "),
 items: plate,
 createdAt: Date.now()
 };
 const docRef = await addDoc(
 collection(
 db,
 "users",
 getEffectiveUid(user),
 "logs",
 ),
 payload,
 );
 await dbService.saveLog({ ...payload, id: docRef.id });
 window.dispatchEvent(new CustomEvent("localLogAdd", { detail: { ...payload, id: docRef.id } }));
 setPlate([]);
 Haptics.success();
 } catch (e: any) { console.error(e); toast.error(i18n.t('auto.blad_scalania', { defaultValue: i18n.t('auto.blad_scalania', { defaultValue: "Błąd scalania:" }) }) + e.message); Haptics.error(); }
 };


 const startCameraAnalysis = async () => {
 try {
 const image = await CapCamera.getPhoto({
 quality: 80,
 allowEditing: false,
 resultType: CameraResultType.DataUrl,
 source: CameraSource.Camera
 });

 if (image.dataUrl) {
 setIsAnalyzing(true);
 setSearchError("");
 try {
 const result = await geminiService.analyzeMeal(
            image.dataUrl,
            settings,
          );

          // Build HTML analysis for impact and balancing advice
          let htmlAnalysis = "";
          if (result.analysis) {
            htmlAnalysis += `<div>${result.analysis}</div>`;
          }
          if (result.glycemicImpact) {
            htmlAnalysis += `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);"><b>⚡ ${i18n.t('auto.przewidywany_wplyw_na_cukier', { defaultValue: 'Wpływ na glikemię' })}:</b> ${result.glycemicImpact}</div>`;
          }
          if (result.balanceAdvice) {
            htmlAnalysis += `<div style="margin-top: 6px;"><b>💡 ${i18n.t('auto.wskazowka_bilansowania', { defaultValue: 'Wskazówka bilansowania' })}:</b> ${result.balanceAdvice}</div>`;
          }
          setAnalysis(htmlAnalysis);

          if (result.ingredients && Array.isArray(result.ingredients) && result.ingredients.length > 0) {
            const itemsToAdd = result.ingredients.map((ing: any, idx: number) => {
              const ingWeight = ing.weight && ing.weight > 0 ? ing.weight : 100;
              const carbs100 = ing.carbsPer100g !== undefined ? ing.carbsPer100g : (ing.carbs ? ((ing.carbs / ingWeight) * 100) : 0);
              const prot100 = ing.proteinPer100g !== undefined ? ing.proteinPer100g : (ing.protein ? ((ing.protein / ingWeight) * 100) : 0);
              const fat100 = ing.fatPer100g !== undefined ? ing.fatPer100g : (ing.fat ? ((ing.fat / ingWeight) * 100) : 0);
              return {
                id: `ai_ing_${Date.now()}_${idx}`,
                name: ing.name || `Składnik ${idx + 1}`,
                carbs: Number(carbs100.toFixed(1)),
                protein: Number(prot100.toFixed(1)),
                fat: Number(fat100.toFixed(1)),
                gi: ing.ig || result.ig || 50,
                weight: ingWeight,
                category: "AI Wizja",
              };
            });

            setPlate((prev) => [...prev, ...itemsToAdd]);
            toast.success(i18n.t('auto.wykryto_skladniki_ai', { defaultValue: `Wykryto ${itemsToAdd.length} składników posiłku! Składniki dodano na talerz.`, count: itemsToAdd.length }));
          } else {
            const estimatedWeight = result.weight && result.weight > 0 ? result.weight : 100;
            const p = {
              id: `ai_${Date.now()}`,
              name: result.mealName || i18n.t('auto.posilek_ai', { defaultValue: "Posiłek AI" }),
              carbs: Number((((result.carbs || 0) / estimatedWeight) * 100).toFixed(1)),
              protein: Number((((result.protein || 0) / estimatedWeight) * 100).toFixed(1)),
              fat: Number((((result.fat || 0) / estimatedWeight) * 100).toFixed(1)),
              gi: result.ig || result.gi || 50,
              category: "AI Wizja",
            };
            setPlate((prev) => [...prev, { ...p, weight: estimatedWeight }]);
          }

          setTimeout(() => {
 const container = document.getElementById("meal-plate-container")?.parentElement;
 if (container) {
 container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
 }
 }, 50);
 } catch (err) {
 console.error("Camera vision analysis:", err);
 setSearchError(
 i18n.t('auto.blad_analizy_zdjecia_sprobuj_p', { defaultValue: i18n.t('auto.blad_analizy_zdjecia_spro', { defaultValue: "Błąd analizy zdjęcia. Spróbuj ponownie lub zrób inne zdjęcie." }) }),
 );
 } finally {
 setIsAnalyzing(false);
 }
 }
 } catch (e) {
 console.error("Camera cancelled or failed", e);
 }
 };

 const startScanner = () => {
 setIsScannerOpen(true);
 };

 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="space-y-6 pb-64"
 >
 { (mode === "plate" || mode === "both") && (
 <>
 <div className="flex items-center justify-between mb-2 px-2">
 <h1 className="text-3xl font-black tracking-tight dark:text-white">
 {t('auto.talerz', { defaultValue: "Centrum Żywieniowe" })}
 </h1>
 <button
 onClick={() => setIsScannerOpen(true)}
 className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-500 hover:text-accent-500 hover:border-accent-200 transition-all active:scale-95 shrink-0"
 >
 <Camera size={24} />
 </button>
 </div>
 </>
 )}

 {(mode === "plate" || mode === "both") && (
 <>
 <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-2 flex items-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 mx-2"></div>
 {/* Weight Modal etc. */}
 <MealPlateModals
 labelFileInputRef={labelFileInputRef} setIsAnalyzingLabel={setIsAnalyzingLabel}
 unrecognizedBarcode={unrecognizedBarcode} setUnrecognizedBarcode={setUnrecognizedBarcode}
 openWeightModal={openWeightModal} isAnalyzingLabel={isAnalyzingLabel}
 isScannerOpen={isScannerOpen} handleCloseScanner={handleCloseScanner}
 scannerRef={scannerRef} customProducts={qCustomProducts} setIsSearching={setIsSearching}
 isWeightModalOpen={isWeightModalOpen} setIsWeightModalOpen={setIsWeightModalOpen}
 selectedProduct={selectedProduct} weightInput={weightInput} setWeightInput={setWeightInput}
 handleWeightSubmit={handleWeightSubmit} isShortcutConfirmModalOpen={isShortcutConfirmModalOpen}
 shortcutToConfirm={shortcutToConfirm} setIsShortcutConfirmModalOpen={setIsShortcutConfirmModalOpen}
 shortcutWeight={shortcutWeight} setShortcutWeight={setShortcutWeight}
 handleShortcutConfirm={handleShortcutConfirm} isSaveModalOpen={isSaveModalOpen}
 setIsSaveModalOpen={setIsSaveModalOpen} mealName={mealName} setMealName={setMealName}
 saveMealSet={saveMealSet} expandedMeal={expandedMeal} setExpandedMeal={setExpandedMeal}
 plate={plate} setPlate={setPlate} setCookingMethod={setCookingMethod}
 mergeCandidates={mergeCandidates} handleMergeMeal={handleMergeMeal}
 handleLogMeal={handleLogMeal} setMergeCandidates={setMergeCandidates}
 getProductName={getProductName} setIsScannerOpen={setIsScannerOpen}
 />

 { (mode === "search" || mode === "both") && (
 <ProductSearch openWeightModal={openWeightModal} openShortcutConfirmModal={openShortcutConfirmModal} startScanner={startScanner} startCameraAnalysis={startCameraAnalysis} isAnalyzing={isAnalyzing} searchError={searchError} setSearchError={setSearchError} allLocal={allLocal} activeDiet={settings?.activeDiet || null} mode={mode} publishToCommunity={publishToCommunity} saveToCustomDb={saveToCustomDb} handleScrollHaptics={handleScrollHaptics} addToPlate={addToPlate} settings={settings} isLoadingSavedMeals={isLoadingSavedMeals} savedMeals={savedMeals} plate={plate} setPlate={setPlate} cookingMethod={cookingMethod} db={db} getEffectiveUid={getEffectiveUid} />
 )}

 {(mode === "plate" || mode === "both") && plate.length === 0 && (
 <motion.div
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[3.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative"
 >
 {/* Floating Food Icons Animation */}
 <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10 overflow-hidden">
 {[
 AppleIcon,
 Utensils,
 Zap,
 Database,
 Star,
 Soup,
 Salad,
 Pizza,
 Sandwich,
 ].map((Icon, i) => (
 <motion.div
 key={i}
 initial={{
 x: Math.random() * 300 - 150,
 y: Math.random() * 300 - 150,
 rotate: 0,
 opacity: 0,
 }}
 animate={{
 y: [null, Math.random() * 40 - 20],
 rotate: [0, 360],
 opacity: [0, 1, 0],
 }}
 transition={{
 duration: 5 + Math.random() * 5,
 repeat: Infinity,
 delay: i * 0.5,
 ease: "easeInOut",
 }}
 className="absolute left-1/2 top-1/2"
 >
 <Icon size={40 + Math.random() * 40} />
 </motion.div>
 ))}
 </div>

 <motion.div
 animate={{
 y: [0, -15, 0],
 rotate: [0, 5, -5, 0],
 scale: [1, 1.05, 1],
 }}
 transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
 className="w-32 h-32 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-8 shadow-inner relative z-10"
 >
 <div className="absolute inset-0 rounded-full border-4 border-accent-500/20 animate-ping opacity-20" />
 <Utensils
 size={64}
 className="text-accent-500/40 dark:text-accent-400/30"
 />
 </motion.div>

 <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3 relative z-10 font-display">
 {t('meal.plate_empty_title', { defaultValue: 'Talerz jeszcze pusty' })}
 </h3>
 <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px] mb-10 leading-relaxed font-medium relative z-10">
 {t('meal.plate_empty_desc', { defaultValue: i18n.t('auto.twoj_talerz_czeka_na_smak', { defaultValue: "Twój talerz czeka na smakołyki! Odwiedź bazę i wybierz coś pysznego do przeliczenia." }) })}
 </p>

 <button
 onClick={() => {
 Haptics.medium();
 setTab("database");
 }}
 className="group relative px-10 py-5 bg-accent-600 hover:bg-accent-700 active:scale-95 transition-all text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl shadow-accent-600/40 z-10"
 >
 <Database
 size={18}
 className="group-hover:rotate-12 transition-transform"
 />
 <span>{t('meal.browse_ingredients', { defaultValue: i18n.t('auto.przegladaj_skladniki', { defaultValue: "Przeglądaj Składniki" }) })}</span>
 <div className="absolute inset-0 rounded-[2rem] bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
 </button>
 </motion.div>
 )}

 {(mode === "plate" || mode === "both") && activeMeal && (
 <div className="mt-6 mb-6 space-y-4">
 <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
 <div className="flex justify-between items-center mb-6">
 <div className="flex items-center gap-3">
 <div className="relative w-12 h-12 flex items-center justify-center">
 <svg
 className="absolute inset-0 w-full h-full transform -rotate-90"
 viewBox="0 0 48 48"
 >
 <circle
 cx="24"
 cy="24"
 r="22"
 stroke="currentColor"
 strokeWidth="3"
 fill="transparent"
 className="text-slate-200 dark:text-slate-800"
 />
 <circle
 cx="24"
 cy="24"
 r="22"
 stroke="currentColor"
 strokeWidth="3"
 fill="transparent"
 strokeDasharray="138.2"
 strokeDashoffset={
 138.2 *
 (() => {
 if (!activeMeal) return 0;
 const mSrc = activeMeal.linkedMeal ? activeMeal.linkedMeal : activeMeal;
 if (!mSrc) return 0;
 const mWW = (mSrc as any).value !== undefined ? (mSrc as any).value / 10 : (mSrc as any).carbs !== undefined ? (mSrc as any).carbs / 10 : 0;
 const mWBT = ((mSrc.protein || 0) * 4 + (mSrc.fat || 0) * 9) / 100;
 const durationH = getMealAbsorptionTime(mWW, mWBT);
 if (durationH <= 0) return 1;
 const ageH = (currentTime - (activeMeal.timestamp || 0)) / (1000 * 60 * 60);
 return Math.max(0, Math.min(1, ageH / durationH));
 })()
 }
 className={cn(
  "transition-all duration-1000",
  activeMeal.type === "meal" ? "text-amber-500" : "text-emerald-500"
  )}
  />
  </svg>
  <div className={cn(
  "w-full h-full rounded-full absolute",
  activeMeal.type === "meal" ? "bg-amber-500/10" : "bg-emerald-500/10"
  )} />
  {activeMeal.type === "meal" ? (
  <Utensils className="text-amber-500 z-10" size={20} />
  ) : (
  <Zap className="text-emerald-500 z-10" size={20} />
  )}
 </div>
 <div>
 <h3 className="font-bold text-slate-800 dark:text-white text-sm">
 {activeMeal.type === "bolus" && activeMeal.linkedMeal
 ? activeMeal.linkedMeal.name || t('meal.pump_meal_fallback', { defaultValue: i18n.t('auto.posilek_z_pompy', { defaultValue: "Posiłek z pompy" }) })
 : activeMeal.name ||
 activeMeal.notes ||
 t('meal.active_meal_fallback', { defaultValue: i18n.t('auto.aktywny_posilek', { defaultValue: "Aktywny posiłek" }) })}
 </h3>
 <p className="text-xs text-slate-500 dark:text-slate-400">
 {t('meal.given_at', { defaultValue: 'Podano:' })}{" "}
 {new Date(activeMeal.timestamp).toLocaleTimeString([], {
 hour: "2-digit",
 minute: "2-digit",
 })}
 </p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
 <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">
 {t('meal.estimated_macros', { defaultValue: 'Szacowane Makro' })}
 </div>
 <div className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
 <span className="text-accent-500 bg-accent-500/10 px-2 py-0.5 rounded-lg">
 {activeChartData[0]?.WW?.toFixed(1) || "?"} {t('auto.ww', { defaultValue: 'WW' })}
 </span>
 <span className="text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-lg">
 {activeChartData[0]?.WBT?.toFixed(1) || "?"} {t('auto.wbt', { defaultValue: 'WBT' })}
 </span>
 </div>
 </div>
 <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
 <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">
 {t('meal.absorption_end', { defaultValue: i18n.t('auto.koniec_wchlaniania', { defaultValue: "Koniec wchłaniania" }) })}
 </div>
 <div className="text-xl font-black text-slate-800 dark:text-white">
 {new Date(
 (activeMeal.timestamp || 0) +
 getMealAbsorptionTime(
 activeChartData[0]?.WW || 0,
 activeChartData[0]?.WBT || 0,
 ) *
 60 *
 60 *
 1000,
 ).toLocaleTimeString([], {
 hour: "2-digit",
 minute: "2-digit",
 })}
 </div>
 </div>
 </div>
 </div>

 <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
 <div className="mb-4">
 <h3 className="font-bold text-slate-800 dark:text-white text-sm">
 {t('meal.absorption_chart', { defaultValue: i18n.t('auto.wykres_wchlaniania', { defaultValue: "Wykres wchłaniania" }) })}
 </h3>
 <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[250px]">
 {t('meal.absorption_chart_desc', { defaultValue: i18n.t('auto.przebieg_uwalniania_sie_g', { defaultValue: "Przebieg uwalniania się glukozy oraz insuliny w czasie" }) })}
 </p>
 </div>

 <div className="h-44 w-full mb-3 select-none">
 <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100} initialDimension={{ width: 320, height: 128 }}>
 <AreaChart
 data={activeChartData}
 margin={{ top: 10, right: 35, left: 0, bottom: 0 }}
 >
 <defs>
 <linearGradient
 id="colorPosilekAct"
 x1="0"
 y1="0"
 x2="0"
 y2="1"
 >
 <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
 <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
 </linearGradient>
 <linearGradient
 id="colorInsulinaAct"
 x1="0"
 y1="0"
 x2="0"
 y2="1"
 >
 <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
 <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
 </linearGradient>
 </defs>
 <XAxis
 dataKey="time"
 stroke="#94a3b8"
 fontSize={10}
 tickLine={false}
 axisLine={false}
 />
 <YAxis yAxisId="left" hide />
 <YAxis
 yAxisId="right"
 orientation="right"
 stroke="#94a3b8"
 fontSize={10}
 tickLine={false}
 axisLine={false}
 domain={["dataMin - 20", "dataMax + 20"]}
 />
 <Tooltip
 contentStyle={{
 backgroundColor: "rgba(15, 23, 42, 0.9)",
 border: "1px solid #1e293b",
 borderRadius: "16px",
 fontSize: "12px",
 color: "#f8fafc",
 fontWeight: "bold",
 boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
 backdropFilter: "blur(8px)",
 }}
 itemStyle={{ color: "#f8fafc" }}
 formatter={(value: any, name: any) => [`${value}`, name]}
 labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
 />
 <Area
 yAxisId="left"
 type="monotone"
 dataKey="Posiłek" name={i18n.t('auto.posilek', { defaultValue: 'Posiłek' })}
 stroke="#f43f5e"
 strokeWidth={3}
 fillOpacity={1}
 fill="url(#colorPosilekAct)"
 />
 <Area
 yAxisId="left"
 type="monotone"
 dataKey="Insulina"
 stroke="#3b82f6"
 strokeWidth={3}
 fillOpacity={1}
 fill="url(#colorInsulinaAct)"
 />
 <Area
 yAxisId="left"
 type="monotone"
 dataKey="Netto"
 stroke="#10b981"
 strokeWidth={3}
 fillOpacity={0}
 />
 <Area
 yAxisId="right"
 type="monotone"
 dataKey="Cukier"
 stroke="#fbbf24"
 strokeWidth={3}
 fillOpacity={0}
 strokeDasharray="4 4"
 connectNulls={true}
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>

 <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-4">
 <span className="text-rose-500 font-bold">{t('meal.chart_legend_red_zone', { defaultValue: 'Czerwona strefa' })}</span>{" "}
 {t('meal.chart_legend_red_zone_desc', { defaultValue: i18n.t('auto.to_wchlanianie_posilku', { defaultValue: "to wchłanianie posiłku." }) })}{" "}
 <span className="text-blue-500 font-bold">{t('meal.chart_legend_blue_zone', { defaultValue: 'Niebieska' })}</span>{" "}
 {t('meal.chart_legend_blue_zone_desc', { defaultValue: i18n.t('auto.to_dzialanie_insuliny', { defaultValue: "to działanie insuliny." }) })}
 <span className="text-emerald-500 dark:text-emerald-400 font-bold">
 {" "}
 {t('meal.chart_legend_green_line', { defaultValue: 'Zielona linia' })}{" "}
 </span>
 {t('meal.chart_legend_green_line_desc', { defaultValue: 'to profil netto.' })}
 <span className="text-amber-500 dark:text-amber-400 font-bold">
 {" "}
 {t('meal.chart_legend_yellow_line', { defaultValue: i18n.t('auto.zolta_linia_przerywana', { defaultValue: "Żółta linia (przerywana)" }) })}{" "}
 </span>
 {t('meal.chart_legend_yellow_line_desc', { defaultValue: i18n.t('auto.to_rzeczywista_glikemia_p', { defaultValue: "to rzeczywista glikemia (prawa oś)." }) })}{" "}
 {activeBolus
 ? `${t('meal.bolus_included', { defaultValue: 'Obliczono z ujęciem bolusa:' })} ${Number(activeBolus.value).toFixed(1)}U.`
 : t('meal.no_bolus_registered', { defaultValue: 'Brak zarejestrowanego bolusa.' })}
 </p>
 </div>
 </div>
 )}

 {/* Plate Stats */}
<MealComposer
 mode={mode}
 plate={plate}
 setPlate={setPlate}
 removeFromPlate={removeFromPlate}
 updateWeight={updateWeight}
 totalWW={totalWW}
 totalWBT={totalWBT}
 totalCarbs={totalCarbs}
 totalProtein={totalProtein}
 totalFat={totalFat}
 cookingMethod={cookingMethod}
 setCookingMethod={setCookingMethod}
 settings={settings}
 activeBolus={activeBolus}
 entryTime={entryTime}
 setEntryTime={setEntryTime}
 handleMergeMeal={handleMergeMeal}
 handleLogMeal={handleLogMeal}
 totalKcal={totalCarbs * 4 + totalProtein * 4 + totalFat * 9}
 saveMealToLibrary={saveMealToLibrary}
 setIsMealSaved={setIsMealSaved}
 totalGL={totalGL}
 prepareToLogMeal={prepareToLogMeal}
 analyzeMeal={analyzeMeal}
 isAnalyzing={isAnalyzing}
 analysis={analysis}
 setTab={setTab}
 />
 </>
 )}
 </motion.div>
 );
}

