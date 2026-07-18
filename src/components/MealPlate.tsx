import i18n from '../i18n';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { getEffectiveUid, getMealAbsorptionTime, pluralize } from "../lib/utils";
import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
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
  onSnapshot,
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
import { LIB_BASE, CATEGORIES } from "../constants";
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

const getDietBadge = (product: Product, activeDiet: string | null) => {
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
  user,
  setTab,
  sharedPlate = [],
  setSharedPlate,
  mode = "both",
  openHistory,
  settings,
  logs = [],
  initialAction,
  onClearInitialAction,
  hideInternalTabs = false,
}: {
  user: any;
  setTab: (t: string) => void;
  sharedPlate?: PlateItem[];
  setSharedPlate?: React.Dispatch<React.SetStateAction<PlateItem[]>>;
  mode?: "search" | "plate" | "both";
  openHistory?: () => void;
  settings?: any;
  logs?: any[];
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  hideInternalTabs?: boolean;
}) {
  const plate = sharedPlate || [];
  const setPlate = setSharedPlate || (() => {});
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineResults, setOnlineResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [plateView, setPlateView] = useState<"composer" | "history">("composer");
  const [isListening, setIsListening] = useState(false);
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [communityProducts, setCommunityProducts] = useState<Product[]>([]);
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
  const [activeCategory, setActiveCategory] = useState("Wszystko");
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

  useEffect(() => {
    if (!user) return;
    const q1 = query(
      collection(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "customProducts",
      ),
    );
    const unsubscribe1 = onSnapshot(
      q1,
      (snapshot) => {
        setCustomProducts(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            isCustom: true,
            ...doc.data(),
          })) as Product[],
        );
      },
      (error) => {
        console.error("MealPlate customProducts error:", error);
      },
    );

    const q2 = query(
      collection(db, "artifacts", "diacontrolapp", "communityProducts"),
      limit(200)
    );
    const unsubscribe2 = onSnapshot(
      q2,
      (snapshot) => {
        setCommunityProducts(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            isCommunity: true,
            ...doc.data(),
          })) as Product[],
        );
      },
      (error) => {
        console.error("MealPlate communityProducts error:", error);
      },
    );

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  const allLocal = useMemo(() => {
    const allLocalRaw = [...customProducts, ...communityProducts, ...LIB_BASE];
    return Array.from(
      new Map(
        allLocalRaw
          .filter((item) => item && getProductName(item, i18n.language))
          .map((item) => [`${item.id || getProductName(item, i18n.language).toLowerCase()}`, item]),
      ).values(),
    ).sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }, [customProducts, communityProducts]);

  const browseResults = useMemo(() => {
    return allLocal.filter((p) => {
      const matchesSearch =
        searchTerm.length < 2 ||
        getProductName(p, i18n.language).toLowerCase().includes(searchTerm.toLowerCase());

      let matchesCategory = false;
      if (activeCategory === "Wszystko") {
        matchesCategory = true;
      } else if (activeCategory === i18n.t('auto.spolecznosc', { defaultValue: i18n.t('auto.spolecznosc', { defaultValue: "Społeczność" }) })) {
        matchesCategory = !!p.isCommunity;
      } else if (activeCategory === "Moje Produkty") {
        matchesCategory = !!p.isCustom;
      } else {
        matchesCategory = p.category === activeCategory;
      }

      return matchesSearch && matchesCategory;
    });
  }, [allLocal, searchTerm, activeCategory]);

  const performOnlineSearch = async (query: string) => {
    if (query.length < 3 || isSearching) return;
    setIsSearching(true);
    setSearchError(null);
    setOnlineResults([]);

    const runOFFSearch = async () => {
      try {
        const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
        const offRes = await fetch(offUrl);
        const offData = await offRes.json();

        if (offData.products && offData.products.length > 0) {
          const validOffProducts = offData.products.map((p: any) => {
            // "Algorytm" - jeśli brak danych w bazie, szacujemy na podstawie słów kluczowych
            let carbs = Number(p.nutriments?.carbohydrates_100g);
            let protein = Number(p.nutriments?.proteins_100g);
            let fat = Number(p.nutriments?.fat_100g);
            let gi = 50;

            const name = (
              p.product_name_pl ||
              p.product_name ||
              ""
            ).toLowerCase();

            // Heurystyka lokalna (Algorytm GlikoSense Offline)
            if (isNaN(carbs)) {
              if (name.includes("chleb") || name.includes(i18n.t('auto.bulka', { defaultValue: i18n.t('auto.bulka', { defaultValue: "bułka" }) }))) carbs = 50;
              else if (name.includes(i18n.t('auto.ryz', { defaultValue: i18n.t('auto.ryz', { defaultValue: "ryż" }) })) || name.includes("kasza"))
                carbs = 25;
              else if (name.includes("ziemniak")) carbs = 17;
              else if (name.includes("jogurt") || name.includes("mleko"))
                carbs = 5;
              else if (
                name.includes(i18n.t('auto.mieso', { defaultValue: i18n.t('auto.mieso', { defaultValue: "mięso" }) })) ||
                name.includes("kurczak") ||
                name.includes("ryba")
              )
                carbs = 0;
              else if (name.includes(i18n.t('auto.jablko', { defaultValue: i18n.t('auto.jablko', { defaultValue: "jabłko" }) })) || name.includes("owoc"))
                carbs = 12;
              else carbs = 0;
            }

            if (name.includes(i18n.t('auto.pelnoziarnist', { defaultValue: i18n.t('auto.pelnoziarnist', { defaultValue: "pełnoziarnist" }) })) || name.includes("razow"))
              gi = 40;
            if (
              name.includes("cukier") ||
              name.includes(i18n.t('auto.bial', { defaultValue: i18n.t('auto.bial', { defaultValue: "biał" }) })) ||
              name.includes(i18n.t('auto.miod', { defaultValue: i18n.t('auto.miod', { defaultValue: "miód" }) }))
            )
              gi = 70;

            return {
              id: p._id || `off_${Date.now()}_${Math.random()}`,
              name: p.product_name_pl || p.product_name || "Produkt z sieci",
              carbs: isNaN(carbs) ? 0 : carbs,
              protein: isNaN(protein) ? 0 : protein,
              fat: isNaN(fat) ? 0 : fat,
              gi,
              category: "Baza Sieciowa (Smart)",
            };
          });

          if (validOffProducts.length > 0) {
            setOnlineResults(
              validOffProducts.map((p: any) => ({
                ...p,
                isOnline: true,
                isDatabase: true,
              })),
            );
            return true;
          }
        }
      } catch (offError) {
        console.warn("OpenFoodFacts search failed:", offError);
      }
      return false;
    };

    try {
      // 1. Zobaczmy najpierw z GlikoSense AI
      try {
        const prompt = i18n.t('auto.jestes_dietetykiem_przean', { defaultValue: "Jesteś dietetykiem. Przeanalizuj zapytanie użytkownika: \"{{var0}}\". Może to być nazwa produktu ze sklepu, danie domowe (np. \"pierogi ruskie\", \"leczo\"), owoc, warzywo lub konkretna marka. \n        Zwróć listę pasujących produktów w formacie JSON (tylko JSON, bez markdown). \n        Format: [{\"name\": string, \"carbs\": number, \"polyols\": number, \"protein\": number, \"fat\": number, \"gi\": number}]. \n        Podaj wartości na 100g produktu lub na standardową porcję (zaznacz to w nazwie, np. \"Jabłko (średnie)\"). \n        Jeśli produkt zawiera poliole (np. gumy, słodziki, niektóre fit-batony), uwzględnij je w polu \"polyols\". \n        W polu \"carbs\" podaj CAŁKOWITĄ ilość węglowodanów (wraz z poliolami).\n        Uwzględnij różne warianty jeśli to możliwe. Nie pisz nic poza JSONem.", var0: query });

        const result = await geminiService.generateContent(prompt);
        const jsonMatch = result.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        let cleanJson = jsonMatch ? jsonMatch[0] : result;
        cleanJson = cleanJson
          .replace(/^```json/, "")
          .replace(/```$/, "")
          .trim();
        const parsed = JSON.parse(cleanJson);
        const resultsArray = Array.isArray(parsed) ? parsed : [parsed];
        setOnlineResults(
          resultsArray.map((p: any, i: number) => ({
            ...p,
            id: `online_${i}_${Date.now()}`,
            isOnline: true,
          })),
        );
        if (resultsArray.length > 0) return;
      } catch (aiError) {
        console.warn("AI search failed, falling back to OFF:", aiError);
      }

      // 2. Fallback do "Tradycyjnej Sieci" + Algorytm GlikoSense
      const offSuccess = await runOFFSearch();
      if (offSuccess) return;

      // 3. Ostateczny Fallback Lokalny (Baza wewnętrzna)
      const localMatches = allLocal
        .filter((p) => getProductName(p, i18n.language).toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      if (localMatches.length > 0) {
        setOnlineResults(localMatches.map((p) => ({ ...p, isOnline: true })));
      } else {
        setSearchError(
          i18n.t('auto.brak_dostepu_do_ai_i_nie_znale', { defaultValue: i18n.t('auto.brak_dostepu_do_ai_i_nie', { defaultValue: "Brak dostępu do AI i nie znaleziono dopasowań w bazach tradycyjnych." }) }),
        );
      }
    } catch (e) {
      console.error("Online search failed:", e);
      setSearchError(i18n.t('auto.blad_wyszukiwania_sprawdz_pola', { defaultValue: i18n.t('auto.blad_wyszukiwania_sprawdz', { defaultValue: "Błąd wyszukiwania. Sprawdź połączenie." }) }));
    } finally {
      setIsSearching(false);
    }
  };

  const handleOnlineSearch = () => performOnlineSearch(searchTerm);

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
          "artifacts",
          "diacontrolapp",
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
          "artifacts",
          "diacontrolapp",
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
      toast(`Zapisano ${getProductName(product, i18n.language)} do bazy produktów.`);
    } catch (e) {
      console.error(e);
      toast.error(i18n.t('auto.blad_zapisu', { defaultValue: i18n.t('auto.blad_zapisu', { defaultValue: "Błąd zapisu." }) }));
    }
  };

  const publishToCommunity = async (product: Product) => {
    if (!user) return;
    try {
      await addDoc(
        collection(db, "artifacts", "diacontrolapp", "communityProducts"),
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
  const [expandedMeal, setExpandedMeal] = useState<{ meal: any; items: any[] } | null>(null);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [isLoadingSavedMeals, setIsLoadingSavedMeals] = useState(true);

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

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(
        db,
        "artifacts",
        "diacontrolapp",
        "users",
        getEffectiveUid(user),
        "savedMeals",
      ),
      orderBy("timestamp", "desc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSavedMeals(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
        setIsLoadingSavedMeals(false);
      },
      (error) => {
        console.error("MealPlate savedMeals error:", error);
        setIsLoadingSavedMeals(false);
      },
    );
    return unsubscribe;
  }, [user]);

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
      const prompt = i18n.t('auto.jestes_zaawansowanym_asys', { defaultValue: "Jesteś zaawansowanym asystentem diabetologicznym. Przeanalizuj poniższy skład posiłku pacjenta:\n      {{var0}}\n      \n      Wybrana obróbka termiczna całego posiłku: {{var1}}\n      {{var2}}\n      \n      Zwróć szczegółową analizę w czytelnym formacie HTML (używaj <b>, <ul>, <li>, <br>, ale ZABRANIAM używania markdown, w szczególności gwazdek).\n      \n      Uwzględnij:\n      1. <b>Szczegółowy Wpływ Składników i Obróbki</b>: Wytłumacz, jak obecność białek/tłuszczy oraz dodanie płynów (np. wody, mleka - co rozcieńcza węglowodany na objętość) wpływa na ładunek glikemiczny (ŁG). Przeanalizuj również wpływ wybranej obróbki termicznej (np. gotowanie, smażenie, pieczenie, blendowanie) na wchłanianie i Indeks Glikemiczny (IG). Dodanie tłuszczu spowalnia trawienie (efekt pizzy), a blendowanie/rozgotowanie je przyspiesza.\n      2. <b>Profil Wchłaniania</b>: Oceń wypadkowy Indeks Glikemiczny (IG) oraz całkowity Ładunek Glikemiczny (ŁG) zestawu. Wskaż produkty obciążające układ i mogące powodować późniejsze skoki glikemii.\n      3. <b>Rekomendacja Bolusa (w tym WBT)</b>: Zaleć typ bolusa (np. prosty, złożony, przedłużony). Jeśli posiłek ma dużo WW i WBT, określ ile % insuliny podać od razu, a ile przedłużyć na ile godzin. Wspomnij o pre-bolusie.\n      4. <b>Ostrzeżenia</b>: Krótko (1 zdanie) na co uważać w ciągu najbliższych kilku godzin w związku z trwającym wchłanianiem tego konkretnego posiłku.\n      \n      Odpowiedź ma być konkretna, rzetelna i dostosowana do specyfiki użytych składników (np. mąki, jajek, mleka w przypadku ciasta naleśnikowego).", var0: JSON.stringify(plate.map((p) => ({ nazwa: getProductName(p, i18n.language), waga: p.weight, wegle: p.carbs, bialko: p.protein, tluszcz: p.fat, IG: p.gi }))), var1: cookingMethod === "raw" ? "Surowe / Brak" : cookingMethod === "boiled" ? "Gotowane" : cookingMethod === "baked" ? "Pieczone" : cookingMethod === "fried" ? i18n.t('auto.smazone', { defaultValue: "Smażone" }) : "Zblendowane", var2: dietContext });
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
      await addDoc(
        collection(
          db,
          "artifacts",
          "diacontrolapp",
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
      setIsSaveModalOpen(false);
      setMealName("");
      Haptics.success();
      toast.success("Zestaw zapisany!");
    } catch (e) {
      console.error(e);
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

  const totalWeight = plate.reduce((s, i) => s + i.weight, 0);

  const rawCarbs = plate.reduce((s, i) => s + (i.carbs * i.weight) / 100, 0);
  const rawPolyols = plate.reduce(
    (s, i) => s + ((i.polyols || 0) * i.weight) / 100,
    0,
  );
  const rawProtein = plate.reduce(
    (s, i) => s + ((i.protein || 0) * i.weight) / 100,
    0,
  );
  const rawFat = plate.reduce((s, i) => s + ((i.fat || 0) * i.weight) / 100, 0);

  const totalCarbs = Math.max(0, rawCarbs - rawPolyols); // Net carbs
  const totalProtein = rawProtein;
  const totalFat =
    cookingMethod === "fried" ? rawFat + (totalWeight / 100) * 10 : rawFat;

  const totalCalsFromMacros = totalCarbs * 4 + totalProtein * 4 + totalFat * 9;
  const carbsPct =
    totalCalsFromMacros > 0
      ? ((totalCarbs * 4) / totalCalsFromMacros) * 100
      : 0;
  const proteinPct =
    totalCalsFromMacros > 0
      ? ((totalProtein * 4) / totalCalsFromMacros) * 100
      : 0;
  const fatPct =
    totalCalsFromMacros > 0 ? ((totalFat * 9) / totalCalsFromMacros) * 100 : 0;

  const totalWW = totalCarbs / 10;
  const totalWBT = (totalProtein * 4 + totalFat * 9) / 100;

  const rawGL = plate.reduce((s, i) => {
    if (typeof i.gi !== "number") return s;
    const itemNetCarbs = Math.max(0, i.carbs - (i.polyols || 0));
    return s + (((itemNetCarbs * i.weight) / 100) * i.gi) / 100;
  }, 0);

  let avgGI = rawCarbs > 0 ? (rawGL * 100) / rawCarbs : 0;
  if (cookingMethod === "boiled") avgGI = Math.min(100, avgGI * 1.3);
  if (cookingMethod === "baked") avgGI = Math.min(100, avgGI * 1.15);
  if (cookingMethod === "blended") avgGI = Math.min(100, avgGI * 1.2);
  if (cookingMethod === "fried") avgGI = avgGI * 0.9;

  const totalGL = (totalCarbs * avgGI) / 100;

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
  }, [activeMeal, activeBolus, logs]);

  const plateChartData = useMemo(() => {
    if (plate.length === 0) return [];

    const WW = totalWW;
    const WBT = totalWBT;
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
    const maxCarbTimePlate = WW > 0 ? (maxCarbPeakPlate + 1.5) * maxCarbMultiplierPlate : 0;
    const maxWbtTimePlate = WBT > 0 ? 5 * (pkSlow / 5.0) : 0;
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

      let c = tCarbProfile > 0 ? (getCarbAbsorption(currentHr, averageGi) / tCarbProfile) * WW : 0;
      let w = tWbtProfile > 0 ? (getWbtAbsorption(currentHr) / tWbtProfile) * WBT : 0;

      const chartTime = new Date(startTime + currentHr * 60 * 60 * 1000);

      data.push({
        time: chartTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        Posiłek: Math.round((c + w) * 10),
        WW: WW,
        WBT: WBT,
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
      (l.type === "bolus" || l.type === "meal" || l.type === "carbs") &&
      Math.abs(Number(l.timestamp) - entryTimestamp) < timeLimit &&
      (!l.items || l.items.length === 0) &&
      (!l.description || l.description.trim() === "") &&
      (!l.name || l.name.trim() === "") &&
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

      const logRef = doc(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs", effectiveLogId);
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
          "artifacts",
          "diacontrolapp",
          "users",
          getEffectiveUid(user),
          "logs",
        ),
        payload,
      );
      window.dispatchEvent(new CustomEvent("localLogAdd", { detail: { ...payload, id: docRef.id } }));
      setPlate([]);
      Haptics.success();
    } catch (e: any) { console.error(e); toast.error(i18n.t('auto.blad_scalania', { defaultValue: i18n.t('auto.blad_scalania', { defaultValue: "Błąd scalania:" }) }) + e.message); Haptics.error(); }
  };

  const startVoiceSearch = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const permStatus = await SpeechRecognition.checkPermissions();
        if (permStatus.speechRecognition !== 'granted') {
          const reqStatus = await SpeechRecognition.requestPermissions();
          if (reqStatus.speechRecognition !== 'granted') {
            toast.error('Brak uprawnień do mikrofonu! Zezwól w ustawieniach Androida.');
            return;
          }
        }
        setIsListening(true);
        const { matches } = await SpeechRecognition.start({
          language: 'pl-PL',
          maxResults: 1,
          prompt: i18n.t('auto.mow_teraz', { defaultValue: 'Mów teraz...' }),
          partialResults: false,
          popup: true
        });
        if (matches && matches.length > 0) {
          const speechResult = matches[0];
          setSearchTerm(speechResult);
          
          const localMatches = allLocal.filter((p) =>
            getProductName(p, i18n.language).toLowerCase().includes(speechResult.toLowerCase()),
          );
          if (localMatches.length === 0) {
            await performOnlineSearch(speechResult);
          }
        }
        setIsListening(false);
        return;
      } catch (e) {
        console.error('Native speech recognition error:', e);
        setIsListening(false);
        toast.error('Nie udało się uruchomić mikrofonu natywnego.');
        return;
      }
    }

    // Fallback for Web
    // @ts-ignore
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error(i18n.t('auto.twoja_przegladarka_nie_obslugu', { defaultValue: i18n.t('auto.twoja_przegladarka_nie_ob', { defaultValue: "Twoja przeglądarka nie obsługuje wyszukiwania głosowego." }) }));
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = "pl-PL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      toast.error('Nie udało się uruchomić mikrofonu.');
    }

    recognition.onresult = async (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setSearchTerm(speechResult);
      setIsListening(false);

      const localMatches = allLocal.filter((p) =>
        getProductName(p, i18n.language).toLowerCase().includes(speechResult.toLowerCase()),
      );

      if (localMatches.length === 0) {
        await performOnlineSearch(speechResult);
      }
    };

    recognition.onspeechend = () => {
      recognition.stop();
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setSearchError(
          i18n.t('auto.brak_dostepu_do_mikrofonu_upra', { defaultValue: i18n.t('auto.brak_dostepu_do_mikrofonu', { defaultValue: "Brak dostępu do mikrofonu. Uprawnienia mogą być blokowane przez przeglądarkę." }) }),
        );
      } else {
        setSearchError(i18n.t('auto.blad_rozpoznawania_mowy_sprobu', { defaultValue: i18n.t('auto.blad_rozpoznawania_mowy_s', { defaultValue: "Błąd rozpoznawania mowy. Spróbuj powtórzyć." }) }));
      }
      setIsListening(false);
    };
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
          const estimatedWeight =
            result.weight && result.weight > 0 ? result.weight : 100;

          const p = {
            id: `ai_${Date.now()}`,
            name: result.mealName || i18n.t('auto.posilek_ai', { defaultValue: i18n.t('auto.posilek_ai', { defaultValue: "Posiłek AI" }) }),
            carbs: Number(
              (((result.carbs || 0) / estimatedWeight) * 100).toFixed(1),
            ),
            protein: Number(
              (((result.protein || 0) / estimatedWeight) * 100).toFixed(1),
            ),
            fat: Number(
              (((result.fat || 0) / estimatedWeight) * 100).toFixed(1),
            ),
            gi: result.ig || result.gi || 50,
            category: "AI Wizja",
          };
          const weight = estimatedWeight;
          setPlate((prev) => [
            ...prev,
            {
              ...p,
              weight,
              carbs: p.carbs,
              protein: p.protein,
              fat: p.fat,
            },
          ]);
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

  useEffect(() => {
    if (mode === "search" || mode === "both") {
      const aiAction = sessionStorage.getItem("ai_plate_action");
      if (aiAction === "camera") {
        sessionStorage.removeItem("ai_plate_action");
        setTimeout(() => {
          if (Capacitor.isNativePlatform()) {
            startCameraAnalysis();
          } else {
            const elem = document.getElementById("meal-photo-input");
            if (elem) elem.click();
          }
        }, 350);
      } else if (aiAction === "voice") {
        sessionStorage.removeItem("ai_plate_action");
        setTimeout(() => {
          startVoiceSearch();
        }, 350);
      }
    }
  }, [mode]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-64"
    >
      {mode !== "search" && (
        <div className="flex items-center justify-between mb-2 px-2">
          <h1 className="text-3xl font-black tracking-tight dark:text-white">
            {t('auto.talerz', { defaultValue: "Talerz" })}
          </h1>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center text-slate-500 hover:text-accent-500 hover:border-accent-200 transition-all active:scale-95 shrink-0"
          >
            <Camera size={24} />
          </button>
        </div>
      )}

      {/* Tab Toggle */}
      {!hideInternalTabs && (
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl mx-2 mb-6">
          <button
            onClick={() => setPlateView("composer")}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              plateView === "composer" 
                ? "bg-white dark:bg-slate-700 text-accent-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {t('auto.kompozytor', { defaultValue: "Kompozytor" })}
          </button>
          <button
            onClick={() => setPlateView("history")}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              plateView === "history" 
                ? "bg-white dark:bg-slate-700 text-accent-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {t('auto.historia', { defaultValue: "Historia" })}
          </button>
        </div>
      )}

        {!hideInternalTabs && plateView === "history" ? (
          <MealHistoryView 
            logs={logs} 
            user={user} 
            hasItems={plate.length > 0}
            onMergeToLog={(log) => {
              if (plate.length > 0) {
                handleMergeMeal(log.id!);
                setPlateView("composer");
              } else {
                toast.error(i18n.t('auto.najpierw_skomponuj_talerz', { defaultValue: `Najpierw skomponuj talerz!` }));
              }
            }}
          />
        ) : (
        <>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-2 flex items-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 mx-2"></div>
      {/* Weight Modal etc. */}
      {createPortal(
        <AnimatePresence>
          {/* AI Label Scanner Input */}
          <input
            type="file"
            accept="image/*"
            ref={labelFileInputRef}
            style={{ display: "none" }}
            onChange={async (e) => {
              if (!e.target.files || e.target.files.length === 0) return;
              const file = e.target.files[0];
              
              const reader = new FileReader();
              reader.onload = async (ev) => {
                const dataUrl = ev.target?.result as string;
                setIsAnalyzingLabel(true);
                try {
                  const result = await geminiService.analyzeNutritionLabel(dataUrl);
                  const product: Product = {
                    id: `scan_${Date.now()}`,
                    name: result.name || "Rozpoznany Produkt (AI)",
                    carbs: result.carbs || 0,
                    protein: result.protein || 0,
                    fat: result.fat || 0,
                    gi: result.gi || 50,
                    category: "Skanowane",
                    barcode: unrecognizedBarcode || ""
                  };
                  setUnrecognizedBarcode(null);
                  openWeightModal(product);
                } catch (err) {
                  toast.error(t('auto.blad_ai_podczas_odczytu_etyk', { defaultValue: 'Błąd AI podczas odczytu etykiety' }));
                } finally {
                  setIsAnalyzingLabel(false);
                }
              };
              reader.readAsDataURL(file);
              e.target.value = '';
            }}
          />

          {unrecognizedBarcode && !isAnalyzingLabel && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              className="fixed inset-0 pt-safe pb-safe z-[150] flex items-end sm:items-center justify-center p-4 bg-black/60"
            >
              <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
                <h2 className="text-xl font-black mb-4 dark:text-white">Produkt nieznany</h2>
                <p className="text-sm text-slate-500 mb-6">{t('barcode_not_found_use_ai')}</p>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => labelFileInputRef.current?.click()}
                    className="bg-accent-500 text-white rounded-2xl p-4 font-black uppercase text-xs active:scale-95 transition-all flex justify-center items-center gap-2 shadow-lg shadow-accent-500/20"
                  >
                    <Camera size={18} />
                    {t('auto.wczytaj_etykiete_ai', { defaultValue: 'Wczytaj etykietę AI' })}
                  </button>
                  <button
                    onClick={() => {
                      const product: Product = {
                        id: `scan_${Date.now()}`,
                        name: "Własny produkt",
                        carbs: 0, protein: 0, fat: 0, gi: 50,
                        category: "Skanowane",
                        barcode: unrecognizedBarcode
                      };
                      setUnrecognizedBarcode(null);
                      openWeightModal(product);
                    }}
                    className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl p-4 font-black uppercase text-xs active:scale-95 transition-all"
                  >
                    {t('auto.wpisz_recznie_0g', { defaultValue: 'Wpisz ręcznie (0g)' })}
                  </button>
                  <button
                    onClick={() => setUnrecognizedBarcode(null)}
                    className="text-slate-400 font-bold uppercase text-[10px] mt-2 tracking-widest p-2"
                  >
                    {t('auto.anuluj', { defaultValue: 'Anuluj' })}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {isAnalyzingLabel && (
            <div className="fixed inset-0 pt-safe pb-safe z-[150] flex items-center justify-center p-4 bg-black/80">
              <div className="flex flex-col items-center">
                <Loader2 size={48} className="text-accent-500 animate-spin mb-4" />
                <p className="text-white font-black">{t('analyzing_label')}</p>
              </div>
            </div>
          )}

          {isScannerOpen && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 pt-safe pb-safe z-[150] flex items-end sm:items-center justify-center p-4 bg-black/60"
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden will-change-transform"
              >
                <button
                  onClick={handleCloseScanner}
                  className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors z-10"
                >
                  <X size={20} />
                </button>
                <h2 className="text-xl font-black text-white mb-6 pr-8">
                  
                                                {t('auto.skaner_produktów', { defaultValue: i18n.t('auto.skaner_produktow', { defaultValue: "Skaner Produktów" }) })}
                                              </h2>
                <div className="w-full aspect-square rounded-[2rem] overflow-hidden bg-slate-800 mb-2 relative shadow-inner">
                  <MealScanner
                    ref={scannerRef}
                    onResult={async (decodedText) => {
                      // 1. Sprawdź lokalną bazę customProducts
                      const localMatch = customProducts.find(p => p.barcode === decodedText);
                      if (localMatch) {
                        handleCloseScanner();
                        openWeightModal(localMatch);
                        return;
                      }

                      setIsSearching(true);
                      try {
                        const response = await fetch(
                          `https://world.openfoodfacts.org/api/v2/product/${decodedText}.json`,
                        );
                        const data = await response.json();

                        if (data.status === 1 && data.product && (data.product.product_name_pl || data.product.product_name)) {
                          handleCloseScanner();
                          const p = data.product;
                          const product: Product = {
                            id: `scan_${Date.now()}`,
                            name:
                              p.product_name_pl ||
                              p.product_name ||
                              "Produkt",
                            carbs: p.nutriments?.carbohydrates_100g || 0,
                            protein: p.nutriments?.proteins_100g || 0,
                            fat: p.nutriments?.fat_100g || 0,
                            gi: 50,
                            category: "Skanowane",
                            barcode: decodedText
                          };
                          openWeightModal(product);
                        } else {
                          // Zamiast szukać online, dajemy fallback AI
                          if (scannerRef.current && scannerRef.current.stopScanner) {
                            await scannerRef.current.stopScanner();
                          }
                          setIsScannerOpen(false);
                          setUnrecognizedBarcode(decodedText);
                        }
                      } catch (err) {
                        if (scannerRef.current && scannerRef.current.stopScanner) {
                           await scannerRef.current.stopScanner();
                        }
                        setIsScannerOpen(false);
                        setUnrecognizedBarcode(decodedText);
                      } finally {
                        setIsSearching(false);
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-4 uppercase tracking-[0.2em] font-black opacity-50">
                  
                                                {t('auto.nakieruj_na_kod_kreskowy', { defaultValue: 'Nakieruj na kod kreskowy' })}
                                              </p>
              </motion.div>
            </motion.div>
          )}

          {isWeightModalOpen && selectedProduct && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 pt-safe pb-safe z-[110] flex items-end sm:items-center justify-center bg-black/60 p-4"
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-50 dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform relative"
              >
                <button
                  onClick={() => setIsWeightModalOpen(false)}
                  className="absolute top-6 right-6 p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <h2 className="text-xl font-black mb-6 dark:text-white pr-8 leading-tight">
                  
                                                {t('auto.dodaj', { defaultValue: 'Dodaj:' })} {selectedProduct.name}
                </h2>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 mb-6 text-center shadow-inner">
                  <input
                    type="number"
                    pattern="[0-9]*"
                    inputMode="decimal"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="text-6xl font-black w-full bg-transparent outline-none text-center dark:text-white"
                    autoFocus
                  />
                  <span className="text-sm font-black text-slate-400 mt-2 block uppercase tracking-widest">
                    
                                                      {t('auto.gramy_g', { defaultValue: 'Gramy (g)' })}
                                                    </span>
                  {parseFloat(weightInput) > 0 && selectedProduct && (
                    <div className="mt-4 p-3 bg-accent-50 dark:bg-accent-900/20 rounded-2xl flex justify-center gap-4 text-xs font-black flex-wrap">
                      <span className="text-accent-600 dark:text-accent-400">
                        
                                                                  {t('auto.węgle', { defaultValue: i18n.t('auto.wegle', { defaultValue: "Węgle:" }) })}{" "}
                        {(
                          (selectedProduct.carbs * parseFloat(weightInput)) /
                          100
                        ).toFixed(1)}
                        g
                        {selectedProduct.polyols
                          ? ` (w tym ${((selectedProduct.polyols * parseFloat(weightInput)) / 100).toFixed(1)}g poliole)`
                          : ""}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        
                                                                  {t('auto.b_t', { defaultValue: 'B+T:' })}{" "}
                        {(
                          (((selectedProduct.protein || 0) +
                            (selectedProduct.fat || 0)) *
                            parseFloat(weightInput)) /
                          100
                        ).toFixed(1)}
                        g
                      </span>
                      {typeof selectedProduct.gi === "number" &&
                        (() => {
                          const glV =
                            (((selectedProduct.carbs *
                              parseFloat(weightInput)) /
                              100) *
                              selectedProduct.gi) /
                            100;
                          return (
                            <span
                              className={cn(
                                glV <= 10
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : glV < 20
                                    ? "text-amber-600 dark:bg-amber-400"
                                    : "text-rose-600 dark:text-rose-400",
                              )}
                            >
                              
                                                                {t('auto.łg', { defaultValue: i18n.t('auto.lg', { defaultValue: "ŁG:" }) })} {glV.toFixed(1)}
                            </span>
                          );
                        })()}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleWeightSubmit}
                  className="w-full bg-accent-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
                >
                  {t('meal.add_to_plate', { defaultValue: 'Dodaj do Talerza' })}
                </button>
              </motion.div>
            </motion.div>
          )}

          {isShortcutConfirmModalOpen && shortcutToConfirm && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 pt-safe pb-safe z-[110] flex items-end sm:items-center justify-center bg-black/60 p-4"
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-50 dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform relative"
              >
                <button
                  onClick={() => setIsShortcutConfirmModalOpen(false)}
                  className="absolute top-6 right-6 p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <h2 className="text-xl font-black mb-4 dark:text-white pr-8 leading-tight">
                  {t('meal.save_shortcut', { defaultValue: i18n.t('auto.zapisz_skrot', { defaultValue: "Zapisz skrót?" }) })}
                </h2>
                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-900/20 mb-8">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t('meal.save_shortcut_desc1', { defaultValue: 'Zapisz' })}{" "}
                    <span className="text-amber-600 font-extrabold">
                      {shortcutToConfirm.name}
                    </span>{" "}
                    {t('meal.save_shortcut_desc2', { defaultValue: i18n.t('auto.jako_szybki_skrot', { defaultValue: "jako szybki skrót." }) })}
                  </p>

                  <div className="mt-4">
                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2 block">
                      {t('meal.weight_g', { defaultValue: 'Gramatura (g)' })}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={shortcutWeight}
                        onChange={(e) => setShortcutWeight(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-black text-xl text-amber-600 focus:border-amber-500 outline-none transition-all"
                      />
                      <div className="text-slate-400 font-bold">g</div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      {["50", "100", "150", "200"].map((w) => (
                        <button
                          key={w}
                          onClick={() => setShortcutWeight(w)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${
                            shortcutWeight === w
                              ? "bg-amber-500 text-white"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                          }`}
                        >
                          {w}g
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-800/50">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-black text-slate-400">
                        {t('meal.carbs_sum', { defaultValue: i18n.t('auto.suma_wegli', { defaultValue: "Suma węgli:" }) })}
                      </span>
                      <span className="text-sm font-black text-amber-600">
                        {(
                          (shortcutToConfirm.carbs *
                            (parseFloat(shortcutWeight) || 0)) /
                          100
                        ).toFixed(1)}
                        g
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsShortcutConfirmModalOpen(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                  >
                    {t('meal.cancel', { defaultValue: 'Anuluj' })}
                  </button>
                  <button
                    onClick={handleShortcutConfirm}
                    className="flex-2 bg-amber-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                  >
                    {t('meal.yes_save', { defaultValue: 'Tak, Zapisz' })}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {isSaveModalOpen && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 pt-safe pb-safe z-[110] flex items-end sm:items-center justify-center bg-black/60 p-4"
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-50 dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform relative"
              >
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="absolute top-6 right-6 p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <h2 className="text-xl font-black mb-1 dark:text-white">
                  {t('meal.save_as_template', { defaultValue: 'Zapisz jako szablon' })}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                  {t('meal.template_hint', { defaultValue: i18n.t('auto.szybkie_dodawanie_zestawu', { defaultValue: "Szybkie dodawanie zestawu w przyszłości" }) })}
                </p>
                <input
                  type="text"
                  placeholder={t('meal.template_name_placeholder', { defaultValue: i18n.t('auto.nazwa_zestawu_np_sniadani', { defaultValue: "Nazwa zestawu (np. Śniadanie)" }) })}
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 font-bold mb-6 outline-none dark:text-white focus:border-accent-500 transition-colors"
                  autoFocus
                />
                <button
                  onClick={saveMealSet}
                  className="w-full bg-accent-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase shadow-xl transition-all active:scale-95 tracking-widest"
                >
                  {t('meal.save_template_btn', { defaultValue: 'Zapisz Szablon' })}
                </button>
              </motion.div>
            </motion.div>
          )}

          {expandedMeal && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 pt-safe pb-safe z-[120] flex items-end sm:items-center justify-center bg-black/60 p-4"
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-50 dark:bg-slate-900 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[3rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform relative scrollbar-none"
              >
                <button
                  onClick={() => setExpandedMeal(null)}
                  className="absolute top-6 right-6 p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors z-10"
                >
                  <X size={20} />
                </button>
                <h2 className="text-xl font-black mb-1 dark:text-white pr-10">
                  {expandedMeal.meal.name}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                  {t('meal.adjust_and_add', { defaultValue: 'Dostosuj i dodaj do talerza' })}
                </p>

                <div className="space-y-4 mb-6">
                  {expandedMeal.items.map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm dark:text-white truncate" title={getProductName(item, i18n.language)}>{getProductName(item, i18n.language)}</div>
                        <div className="text-[10px] font-bold text-slate-400">{(item.carbs * expandedMeal.items[idx].weight / 100).toFixed(1)}{t('auto.g_w', { defaultValue: 'g W |' })} {(item.protein * expandedMeal.items[idx].weight / 100).toFixed(1)}{t('auto.g_b', { defaultValue: 'g B |' })} {(item.fat * expandedMeal.items[idx].weight / 100).toFixed(1)}{t('auto.g_t', { defaultValue: 'g T' })}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          value={item.weight || ""}
                          onChange={(e) => {
                            const newItems = [...expandedMeal.items];
                            newItems[idx].weight = Number(e.target.value) || 0;
                            setExpandedMeal({ ...expandedMeal, items: newItems });
                          }}
                          className="w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-center font-bold text-sm dark:text-white outline-none focus:border-accent-500"
                        />
                        <span className="text-xs font-bold text-slate-400">g</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    Haptics.light();
                    setPlate([...plate, ...expandedMeal.items]);
                    if (expandedMeal.meal.cookingMethod) {
                      setCookingMethod(expandedMeal.meal.cookingMethod);
                    }
                    setExpandedMeal(null);
                    toast.success(`Dodano zmodyfikowany zestaw: ${expandedMeal.meal.name}`);
                  }}
                  className="w-full bg-accent-600 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase shadow-xl transition-all active:scale-95 tracking-[0.2em]"
                >
                  {t('meal.to_plate', { defaultValue: 'Do Talerza' })}
                </button>
              </motion.div>
            </motion.div>
          )}
          {mergeCandidates && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 pt-safe pb-safe z-[120] flex items-end sm:items-center justify-center bg-black/60 p-4"
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-50 dark:bg-slate-900 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[3rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 will-change-transform relative scrollbar-none"
              >
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 leading-tight">
                  {t('meal.entry_found', { defaultValue: 'Znaleziono wpis' })}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                  {t('meal.merge_hint', { defaultValue: i18n.t('auto.wybierz_niedawny_bolus_wp', { defaultValue: "Wybierz niedawny bolus / wpis z pompy, aby uaktualnić go składnikami z talerza." }) })}
                </p>

                <div className="space-y-4 mb-6">
                  {mergeCandidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleMergeMeal(c.id)}
                      className="w-full bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center gap-4 text-left hover:scale-[0.98] transition-transform"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm dark:text-white truncate">
                          {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {c.description || (c.type === 'bolus' ? 'Bolus' : i18n.t('auto.posilek', { defaultValue: i18n.t('auto.posilek', { defaultValue: "Posiłek" }) }))}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1">
                          {Number(c.value || c.linkedMeal?.carbs || 0).toFixed(1)}{t('auto.g_w', { defaultValue: 'g W |' })} {c.value ? `${c.value}J` : ''}
                        </div>
                      </div>
                      <Check size={20} className="text-emerald-500" />
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3">
                   <button
                     onClick={() => handleLogMeal()}
                     className="w-full bg-accent-600 text-white py-4 rounded-[2rem] font-black text-[11px] uppercase shadow-xl transition-all active:scale-95 tracking-[0.2em]"
                   >
                     {t('meal.add_as_new', { defaultValue: 'Dodaj jako nowy (Osobny wpis)' })}
                   </button>
                   <button
                     onClick={() => setMergeCandidates(null)}
                     className="w-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white py-4 rounded-[2rem] font-black text-[11px] uppercase transition-all active:scale-95 tracking-[0.2em]"
                   >
                     {t('meal.cancel', { defaultValue: 'Anuluj' })}
                   </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Search & Browser */}
      {(mode === "search" || mode === "both") && (
        <>
          {mode === "search" && plate.length > 0 && (
            <div
              onClick={() => {
                Haptics.medium();
                setTab("meal");
              }}
              className="cursor-pointer mb-6 p-4 rounded-3xl bg-gradient-to-r from-accent-600 via-indigo-600 to-sky-600 text-white shadow-xl flex items-center justify-between gap-3 transform hover:scale-[1.01] transition-all border border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-2xl animate-pulse">
                  <Utensils size={20} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    {t('meal.your_plate', { defaultValue: 'Twój talerz' })}
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {plate.length} {t('auto.skladniki', { defaultValue: 'składniki' })}
                    </span>
                  </h4>
                  <p className="text-[11px] text-white/90 font-medium mt-0.5">
                    {t('auto.kliknij_by_przejsc_do_talerza', { defaultValue: 'Kliknij, aby otworzyć talerz, przeliczyć WW/WBT i podać bolus' })}
                  </p>
                </div>
              </div>
              <div className="px-3.5 py-2 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 shadow-md">
                {t('auto.otworz_talerz', { defaultValue: 'Otwórz talerz' })} →
              </div>
            </div>
          )}
          <div className="px-1">
            <h2 className="text-xl font-black dark:text-white mb-2">
              {t('meal.build_meal', { defaultValue: i18n.t('auto.buduj_swoj_posilek', { defaultValue: "Buduj swój posiłek" }) })}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
              {t('meal.search_hint', { defaultValue: 'Wyszukaj produkty i dodaj je do talerza' })}
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="relative w-full">
                <Search
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder={t('meal.search_placeholder', { defaultValue: 'Wyszukaj produkt / danie...' })}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleOnlineSearch();
                  }}
                  className="w-full bg-white dark:bg-slate-900 p-5 pl-14 pr-24 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 text-sm font-bold dark:text-white outline-none focus:border-accent-500 transition-all shadow-sm"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                      title={t('auto.wyczyść', { defaultValue: i18n.t('auto.wyczysc', { defaultValue: "Wyczyść" }) })}
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    onClick={startVoiceSearch}
                    className={`p-2 rounded-full transition-all ${isListening ? "bg-rose-500 text-white animate-pulse" : "text-slate-400 hover:text-accent-500 hover:bg-accent-50 dark:hover:bg-accent-900/30"}`}
                    title={t('auto.wyszukiwanie_głosowe', { defaultValue: i18n.t('auto.wyszukiwanie_glosowe', { defaultValue: "Wyszukiwanie głosowe" }) })}
                  >
                    <Mic size={18} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => {
                    Haptics.light();
                    handleOnlineSearch();
                  }}
                  className="flex-1 bg-accent-600 text-white p-3.5 sm:p-4 rounded-[2rem] shadow-lg active:scale-95 flex items-center justify-center gap-2 transition-all font-bold text-[10px] sm:text-xs uppercase tracking-widest"
                  title={t('auto.szukaj_z_glikosense_ai', { defaultValue: 'Szukaj z GlikoSense AI' })}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> {t('meal.searching', { defaultValue: 'Szukam...' })}
                    </>
                  ) : (
                    <>
                      <Globe size={18} className="sm:w-5 sm:h-5" /> {t('meal.search_btn', { defaultValue: 'Szukaj' })}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    Haptics.light();
                    if (Capacitor.isNativePlatform()) {
                      startCameraAnalysis();
                    } else {
                      const elem = document.getElementById("meal-photo-input");
                      if (elem) elem.click();
                    }
                  }}
                  className="bg-emerald-600 text-white p-3.5 sm:p-4 rounded-[2rem] px-4 sm:px-6 shadow-lg active:scale-95 flex items-center justify-center gap-1.5 transition-all text-[9px] sm:text-xs font-bold uppercase tracking-widest"
                  title={t('auto.zrób_zdjęcie_analiza_ai', { defaultValue: i18n.t('auto.zrob_zdjecie_analiza_ai', { defaultValue: "Zrób zdjęcie (Analiza AI)" }) })}
                >
                  {isAnalyzing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <Camera size={18} className="sm:w-5 sm:h-5" /> <span>{t('meal.analyze_btn', { defaultValue: 'Analiza' })}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    Haptics.light();
                    startScanner();
                  }}
                  className="bg-slate-800 text-white p-3.5 sm:p-4 rounded-[2rem] px-4 sm:px-6 shadow-lg active:scale-95 flex items-center justify-center gap-1.5 transition-all text-[9px] sm:text-xs font-bold uppercase tracking-widest"
                >
                  <Scan size={18} className="sm:w-5 sm:h-5" /> <span>{t('meal.scan_btn', { defaultValue: i18n.t('auto.kodow', { defaultValue: "Kodów" }) })}</span>
                </button>
              </div>
              <input
                type="file"
                id="meal-photo-input"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsAnalyzing(true);
                  setSearchError(""); // reset errors
                  try {
                    // compress image
                    const max_size = 1000;
                    const compressedDataUrl = await new Promise<string>(
                      (resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = (event) => {
                          const img = new Image();
                          img.src = event.target?.result as string;
                          img.onload = () => {
                            const canvas = document.createElement("canvas");
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                              if (width > max_size) {
                                height *= max_size / width;
                                width = max_size;
                              }
                            } else {
                              if (height > max_size) {
                                width *= max_size / height;
                                height = max_size;
                              }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext("2d");
                            ctx?.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL("image/jpeg", 0.8));
                          };
                          img.onerror = () =>
                            reject(new Error("Image load failed"));
                        };
                        reader.onerror = () =>
                          reject(new Error("File read failed"));
                      },
                    );

                    const result = await geminiService.analyzeMeal(
                      compressedDataUrl,
                      settings,
                    );
                    const estimatedWeight =
                      result.weight && result.weight > 0 ? result.weight : 100;

                    const p: Product = {
                      id: `ai_${Date.now()}`,
                      name: result.mealName || i18n.t('auto.posilek_ai', { defaultValue: i18n.t('auto.posilek_ai', { defaultValue: "Posiłek AI" }) }),
                      carbs: Number(
                        (((result.carbs || 0) / estimatedWeight) * 100).toFixed(
                          1,
                        ),
                      ),
                      protein: Number(
                        (
                          ((result.protein || 0) / estimatedWeight) *
                          100
                        ).toFixed(1),
                      ),
                      fat: Number(
                        (((result.fat || 0) / estimatedWeight) * 100).toFixed(
                          1,
                        ),
                      ),
                      gi: result.ig || result.gi || 50,
                      category: "AI Wizja",
                    };
                    const weight = estimatedWeight;
                    setPlate((prev) => [
                      ...prev,
                      {
                        ...p,
                        weight,
                        carbs: p.carbs,
                        protein: p.protein,
                        fat: p.fat,
                      },
                    ]);
                    setTimeout(() => {
                      document
                        .querySelector("main")
                        ?.scrollTo({ top: 0, behavior: "smooth" });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }, 50);
                  } catch (err) {
                    console.error("Camera vision analysis:", err);
                    setSearchError(
                      i18n.t('auto.blad_analizy_zdjecia_sprobuj_p', { defaultValue: i18n.t('auto.blad_analizy_zdjecia_spro', { defaultValue: "Błąd analizy zdjęcia. Spróbuj ponownie lub zrób inne zdjęcie." }) }),
                    );
                  } finally {
                    setIsAnalyzing(false);
                    e.target.value = "";
                  }
                }}
              />
            </div>

            {/* Cookbook / Saved Meals Horizontal Scroll */}
            {(isLoadingSavedMeals || savedMeals.length > 0) && (
              <div className="pt-2 pb-4">
                <div className="flex items-center justify-between px-2 mb-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-accent-500 to-rose-500 flex items-center gap-1.5">
                    <Heart
                      size={14}
                      className="text-accent-500 fill-accent-500"
                    />
                    {t('meal.meal_base', { defaultValue: i18n.t('auto.baza_posilkow', { defaultValue: "Baza Posiłków" }) })}
                  </h4>
                  {!isLoadingSavedMeals && (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {savedMeals.length} {pluralize(savedMeals.length, 'Zapisany', 'Zapisane', 'Zapisanych')}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none snap-x snap-mandatory">
                  {isLoadingSavedMeals ? (
                    <div className="flex gap-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={`skel-${i}`}
                          className="snap-start shrink-0 w-[220px] h-[98px] bg-slate-100 dark:bg-slate-800/80 animate-pulse rounded-3xl border border-slate-200 dark:border-slate-800"
                        ></div>
                      ))}
                    </div>
                  ) : (
                    savedMeals.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          Haptics.light();
                          setExpandedMeal({ meal: m, items: JSON.parse(JSON.stringify(m.items)) });
                        }}
                        className="snap-start shrink-0 w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:border-accent-500/50 hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between glass-target"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            Haptics.light();
                            try {
                              import("firebase/firestore").then(
                                ({ deleteDoc, doc }) => {
                                  deleteDoc(
                                    doc(
                                      db,
                                      "artifacts",
                                      "diacontrolapp",
                                      "users",
                                      getEffectiveUid(user),
                                      "savedMeals",
                                      m.id,
                                    ),
                                  );
                                },
                              );
                            } catch (err) {
                              console.error("Delete meal failed:", err);
                            }
                          }}
                          className="absolute top-3 right-3 p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-colors"
                          title={t('auto.usuń_z_bazy', { defaultValue: i18n.t('auto.usun_z_bazy', { defaultValue: "Usuń z bazy" }) })}
                        >
                          <X size={14} />
                        </button>
                        {plate.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!window.confirm(i18n.t('auto.czy_chcesz_zaktualizowac', { defaultValue: "Czy chcesz zaktualizować szablon \"{{var0}}\" aktualnym talerzem?", var0: m.name }))) return;
                              Haptics.light();
                              try {
                                import("firebase/firestore").then(
                                  ({ updateDoc, doc }) => {
                                    updateDoc(
                                      doc(
                                        db,
                                        "artifacts",
                                        "diacontrolapp",
                                        "users",
                                        getEffectiveUid(user),
                                        "savedMeals",
                                        m.id,
                                      ),
                                      {
                                        items: plate,
                                        cookingMethod: cookingMethod || null,
                                        timestamp: Date.now()
                                      }
                                    );
                                    toast.success("Szablon zaktualizowany!");
                                  },
                                );
                              } catch (err) {
                                console.error("Update meal failed:", err);
                              }
                            }}
                            className="absolute top-3 right-10 p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-accent-500 hover:bg-accent-50 dark:hover:bg-accent-900/30 rounded-full transition-colors"
                            title={t('auto.zaktualizuj_obecnym_talerzem', { defaultValue: 'Zaktualizuj obecnym talerzem' })}
                          >
                            <Save size={14} />
                          </button>
                        )}
                        <div className="mb-3 pr-6 mt-1">
                          <h5 className="font-black text-sm text-slate-800 dark:text-slate-100 leading-tight mb-1 line-clamp-2">
                            {m.name}
                          </h5>
                          <p className="text-[10px] font-bold text-slate-400">
                            {m.items.length} {pluralize(m.items.length, i18n.t('auto.skladnik', { defaultValue: i18n.t('auto.skladnik', { defaultValue: "składnik" }) }), i18n.t('auto.skladniki', { defaultValue: i18n.t('auto.skladniki', { defaultValue: "składniki" }) }), i18n.t('auto.skladnikow', { defaultValue: i18n.t('auto.skladnikow', { defaultValue: "składników" }) }))}
                          </p>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="text-[11px] font-black text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20 px-2.5 py-1 rounded-xl">
                            {m.items
                              .reduce((acc: number, i: any) => acc + i.carbs, 0)
                              .toFixed(1)}
                             g {t('meal.carbs_abbr', { defaultValue: i18n.t('auto.weg', { defaultValue: "Węg." }) })}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-accent-500 text-white flex items-center justify-center shadow-lg shadow-accent-500/30">
                            <Plus size={16} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Category Filter */}
            <div
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
              onScroll={handleScrollHaptics}
            >
              <button
                onClick={() => {
                  Haptics.selection();
                  setActiveCategory("Wszystko");
                }}
                className={cn(
                  "shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  activeCategory === "Wszystko"
                    ? "bg-accent-600 text-white shadow-lg"
                    : "bg-white dark:bg-slate-900 text-slate-400 dark:border dark:border-slate-800",
                )}
              >
                {t('meal.cat_all', { defaultValue: 'Wszystko' })}
              </button>
              <button
                onClick={() => {
                  Haptics.selection();
                  setActiveCategory(i18n.t('auto.spolecznosc', { defaultValue: i18n.t('auto.spolecznosc', { defaultValue: "Społeczność" }) }));
                }}
                className={cn(
                  "shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  activeCategory === i18n.t('auto.spolecznosc', { defaultValue: i18n.t('auto.spolecznosc', { defaultValue: "Społeczność" }) })
                    ? "bg-sky-600 text-white shadow-lg"
                    : "bg-sky-50 dark:bg-sky-900/10 text-sky-500 border border-sky-100 dark:border-sky-900/20",
                )}
              >
                {t('meal.cat_community', { defaultValue: i18n.t('auto.spolecznosc', { defaultValue: "Społeczność" }) })}
              </button>
              <button
                onClick={() => {
                  Haptics.selection();
                  setActiveCategory("Moje Produkty");
                }}
                className={cn(
                  "shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  activeCategory === "Moje Produkty"
                    ? "bg-amber-600 text-white shadow-lg"
                    : "bg-amber-50 dark:bg-amber-900/10 text-amber-500 border border-amber-100 dark:border-amber-900/20",
                )}
              >
                {t('meal.cat_my_products', { defaultValue: 'Moje Produkty' })}
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    Haptics.selection();
                    setActiveCategory(cat);
                  }}
                  className={cn(
                    "shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                    activeCategory === cat
                      ? "bg-accent-600 text-white shadow-lg"
                      : "bg-white dark:bg-slate-900 text-slate-400 dark:border dark:border-slate-800",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div
              className="max-h-[70vh] overflow-y-auto pr-1 space-y-2 custom-scrollbar"
              onScroll={handleScrollHaptics}
            >
              {searchError && (
                <div className="mb-4 bg-rose-50 dark:bg-rose-900/20 p-5 rounded-[2rem] border border-rose-100 dark:border-rose-800">
                  <p className="text-sm text-rose-600 dark:text-rose-400 font-bold text-center">
                    {searchError}
                  </p>
                </div>
              )}
              {onlineResults.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[9px] font-black text-accent-500 uppercase tracking-widest mb-2 px-2">
                    {t('meal.ai_results', { defaultValue: 'Wyniki AI' })}
                  </h4>
                  <div className="space-y-2">
                    {onlineResults.map((p, i) => (
                      <div
                        key={`online-${i}`}
                        className="flex items-center gap-2"
                      >
                        <button
                          onClick={() => openWeightModal(p)}
                          className="flex-1 bg-accent-50 dark:bg-accent-900/20 p-4 rounded-3xl border border-accent-100 dark:border-accent-800 flex justify-between items-center text-left hover:border-accent-500 transition-colors"
                        >
                          <div>
                            <div className="font-black text-xs dark:text-white flex items-center gap-2">
                              {getProductName(p, i18n.language)}
                              <span className="bg-accent-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black">
                                
                                                                            {t('auto.ai', { defaultValue: 'AI' })}
                                                                          </span>
                              {(() => {
                                const badge = getDietBadge(
                                  p,
                                  settings?.activeDiet || null,
                                );
                                if (!badge) return null;
                                return (
                                  <span
                                    className={cn(
                                      "text-[8px] px-1.5 py-0.5 rounded border font-black flex items-center gap-1",
                                      badge.color,
                                    )}
                                  >
                                    {badge.icon} {badge.text}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="text-[9px] font-bold text-accent-500/60 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                              <span>
                                
                                                                            {t('auto.węgle', { defaultValue: i18n.t('auto.wegle', { defaultValue: "Węgle:" }) })}{" "}
                                {Number(p.carbs || 0)
                                  .toFixed(1)
                                  .replace(/\.0$/, "")}
                                
                                                                            {t('auto.g_b', { defaultValue: 'g | B:' })}{" "}
                                {Number(p.protein || 0)
                                  .toFixed(1)
                                  .replace(/\.0$/, "")}
                                
                                                                            {t('auto.g_t', { defaultValue: 'g | T:' })}{" "}
                                {Number(p.fat || 0)
                                  .toFixed(1)
                                  .replace(/\.0$/, "")}
                                g
                              </span>
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 rounded font-black text-[8px]",
                                  typeof p.gi === "number"
                                    ? p.gi <= 55
                                      ? "bg-emerald-500/10 text-emerald-500"
                                      : p.gi < 70
                                        ? "bg-amber-500/10 text-amber-500"
                                        : "bg-rose-500/10 text-rose-500"
                                    : "bg-slate-500/10 text-slate-500",
                                )}
                              >
                                
                                                                            {t('auto.ig', { defaultValue: 'IG:' })} {typeof p.gi === "number" ? p.gi : "??*"}
                              </span>
                              {(() => {
                                const giVal =
                                  typeof p.gi === "number" ? p.gi : 50;
                                const lgVal =
                                  (Number(p.carbs || 0) * giVal) / 100;
                                return (
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-black text-[8px]",
                                      lgVal <= 10
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : lgVal < 20
                                          ? "bg-amber-500/10 text-amber-500"
                                          : "bg-rose-500/10 text-rose-500",
                                    )}
                                  >
                                    
                                                                            {t('auto.łg', { defaultValue: i18n.t('auto.lg', { defaultValue: "ŁG:" }) })} {lgVal.toFixed(1)}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-accent-300" />
                        </button>
                        <button
                          onClick={() => openShortcutConfirmModal(p)}
                          className="bg-amber-500 text-white p-2.5 rounded-xl active:scale-90 transition-all flex flex-col items-center justify-center gap-1 min-w-[50px]"
                          title={t('auto.dodaj_jako_skrót', { defaultValue: i18n.t('auto.dodaj_jako_skrot', { defaultValue: "Dodaj jako skrót" }) })}
                        >
                          <BookMarked size={16} />
                          <span className="text-[8px] font-bold leading-none">
                            
                                                                {t('auto.skrót', { defaultValue: i18n.t('auto.skrot', { defaultValue: "Skrót" }) })}
                                                              </span>
                        </button>
                        <button
                          onClick={() => publishToCommunity(p)}
                          className="bg-sky-500 text-white p-2.5 rounded-xl active:scale-90 transition-all flex flex-col items-center justify-center gap-1 min-w-[50px]"
                          title={t('auto.udostępnij_społeczności', { defaultValue: i18n.t('auto.udostepnij_spolecznosci', { defaultValue: "Udostępnij społeczności" }) })}
                        >
                          <Share2 size={16} />
                          <span className="text-[8px] font-bold leading-none">
                            
                                                                {t('auto.społeczność', { defaultValue: i18n.t('auto.spolecznosc', { defaultValue: "Społeczność" }) })}
                                                              </span>
                        </button>
                        <button
                          onClick={() => saveToCustomDb(p)}
                          className="bg-accent-500 text-white p-2.5 rounded-xl active:scale-90 transition-all flex flex-col items-center justify-center gap-1 min-w-[50px]"
                          title={t('auto.zapisz_do_bazy', { defaultValue: 'Zapisz do bazy' })}
                        >
                          <Save size={16} />
                          <span className="text-[8px] font-bold leading-none">
                            
                                                                {t('auto.zapisz', { defaultValue: 'Zapisz' })}
                                                              </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 mb-2">
                <div className="flex justify-between items-end px-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    {t('meal.glikosense_base', { defaultValue: 'Baza GlikoSense' })}
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-accent-600 text-[9px]">
                      {browseResults.length}{" "}
                      {browseResults.length === 1 ? t('meal.product_1', { defaultValue: 'produkt' }) : t('meal.product_many', { defaultValue: 'produkty' })}
                    </span>
                  </h4>
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                    {activeCategory !== "Wszystko"
                      ? `${t('meal.category_prefix', { defaultValue: 'Kategoria:' })} ${activeCategory}`
                      : t('meal.all_categories', { defaultValue: 'Wszystkie kategorie' })}
                  </div>
                </div>
                {searchTerm.length > 2 && (
                  <div className="px-4">
                    <button
                      onClick={handleOnlineSearch}
                      className="w-full py-2 bg-accent-50 dark:bg-accent-900/20 rounded-xl text-[9px] font-black text-accent-600 uppercase tracking-widest flex items-center justify-center gap-2 border border-accent-100 dark:border-accent-800/50 hover:bg-accent-100 transition-all"
                    >
                      {isSearching ? (
                        <Loader2 className="animate-spin" size={12} />
                      ) : (
                        <Globe size={12} />
                      )}
                      {t('meal.deep_search_ai', { defaultValue: i18n.t('auto.glebsze_wyszukiwanie_w_si', { defaultValue: "Głębsze wyszukiwanie w sieci (AI)" }) })}
                    </button>
                  </div>
                )}
              </div>

              {browseResults.length > 0 ? (
                <div
                  className="grid gap-1 will-change-transform pb-20 max-h-[60vh] overflow-y-auto scrollbar-none"
                  onScroll={handleScrollHaptics}
                >
                  <AnimatePresence>
                    {browseResults.slice(0, 500).map((p, i) => (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{
                          opacity: 0,
                          scale: 0.95,
                          transition: { duration: 0.1 },
                        }}
                        transition={{ duration: 0.2 }}
                        key={p.id || getProductName(p, i18n.language) || `p-${i}`}
                      >
                        <SwipeableItem
                          id={p.id || getProductName(p, i18n.language) || `p-${i}`}
                          onDelete={() => {
                            Haptics.success();
                            addToPlate(p, 100);
                            toast.success(`${t('meal.added_100g', { defaultValue: 'Dodano 100g:' })} ${getProductName(p, i18n.language)}`);
                          }}
                          actionIcon={<Plus size={24} />}
                          actionColor="from-accent-600 to-accent-500"
                          noConfirm={true}
                          bgClass="bg-white dark:bg-slate-900"
                        >
                          <div
                            onClick={() => openWeightModal(p)}
                            className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                openWeightModal(p);
                              }
                            }}
                          >
                            <div>
                              <div className="font-black text-xs dark:text-white flex items-center gap-2">
                                {getProductName(p, i18n.language)}
                                {p.isCustom && !p.isCommunity && (
                                  <span className="bg-amber-500/10 text-amber-500 text-[8px] px-1.5 py-0.5 rounded border border-amber-500/20">
                                    {t('meal.yours', { defaultValue: 'Twoje' })}
                                  </span>
                                )}
                                {p.isCommunity && (
                                  <span className="bg-sky-500/10 text-sky-500 text-[8px] px-1.5 py-0.5 rounded border border-sky-500/20">
                                    {t('meal.community', { defaultValue: i18n.t('auto.spolecznosc', { defaultValue: "Społeczność" }) })}
                                  </span>
                                )}
                                {(() => {
                                  const badge = getDietBadge(
                                    p,
                                    settings?.activeDiet || null,
                                  );
                                  if (!badge) return null;
                                  return (
                                    <span
                                      className={cn(
                                        "text-[8px] px-1.5 py-0.5 rounded border font-black flex items-center gap-1",
                                        badge.color,
                                      )}
                                    >
                                      {badge.icon} {badge.text}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                <span>
                                  {t('meal.carbs_long', { defaultValue: i18n.t('auto.wegle', { defaultValue: "Węgle:" }) })}{" "}
                                  {Number(p.carbs || 0)
                                    .toFixed(1)
                                    .replace(/\.0$/, "")}
                                  
                                                                                  {t('auto.g', { defaultValue: 'g |' })} {t('meal.protein_short', { defaultValue: 'B:' })}{" "}
                                  {Number(p.protein || 0)
                                    .toFixed(1)
                                    .replace(/\.0$/, "")}
                                  
                                                                                  {t('auto.g', { defaultValue: 'g |' })} {t('meal.fat_short', { defaultValue: 'T:' })}{" "}
                                  {Number(p.fat || 0)
                                    .toFixed(1)
                                    .replace(/\.0$/, "")}
                                  g
                                </span>
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded font-black text-[8px]",
                                    typeof p.gi === "number"
                                      ? p.gi <= 55
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : p.gi < 70
                                          ? "bg-amber-500/10 text-amber-500"
                                          : "bg-rose-500/10 text-rose-500"
                                      : "bg-slate-500/10 text-slate-500",
                                  )}
                                >
                                  
                                                                                  {t('auto.ig', { defaultValue: 'IG:' })} {typeof p.gi === "number" ? p.gi : "??*"}
                                </span>
                                {/* Restoring ŁG (Glycemic Load) calculation */}
                                {typeof p.gi === "number" &&
                                  (() => {
                                    const lgVal =
                                      (Number(p.carbs || 0) * p.gi) / 100;
                                    return (
                                      <span
                                        className={cn(
                                          "px-1.5 py-0.5 rounded font-black text-[8px]",
                                          lgVal <= 10
                                            ? "bg-emerald-500/10 text-emerald-500"
                                            : lgVal < 20
                                              ? "bg-amber-500/10 text-amber-500"
                                              : "bg-rose-500/10 text-rose-500",
                                        )}
                                      >
                                        
                                                                                    {t('auto.łg', { defaultValue: i18n.t('auto.lg', { defaultValue: "ŁG:" }) })} {lgVal.toFixed(1)}
                                      </span>
                                    );
                                  })()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openShortcutConfirmModal(p);
                                }}
                                className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors z-10 min-w-[48px] gap-1"
                                title={t('auto.dodaj_do_skrótów', { defaultValue: i18n.t('auto.dodaj_do_skrotow', { defaultValue: "Dodaj do skrótów" }) })}
                              >
                                <BookMarked size={16} />
                                <span className="text-[8px] font-bold leading-none">
                                  {t('meal.shortcut_btn', { defaultValue: i18n.t('auto.skrot', { defaultValue: "Skrót" }) })}
                                </span>
                              </button>
                              {p.isCustom && !p.isCommunity && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    publishToCommunity(p);
                                  }}
                                  className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors z-10 min-w-[48px] gap-1"
                                  title={t('auto.udostępnij_społeczności', { defaultValue: i18n.t('auto.udostepnij_spolecznosci', { defaultValue: "Udostępnij społeczności" }) })}
                                >
                                  <Share2 size={16} />
                                  <span className="text-[8px] font-bold leading-none">
                                    {t('meal.community_btn', { defaultValue: i18n.t('auto.spolecznosc', { defaultValue: "Społeczność" }) })}
                                  </span>
                                </button>
                              )}
                              <div className="flex flex-col items-center justify-center p-2 text-accent-500 z-10 min-w-[48px] gap-1">
                                <Plus
                                  size={16}
                                  className="bg-accent-50 dark:bg-accent-900/50 p-1 rounded-lg w-6 h-6"
                                />
                                <span className="text-[8px] font-bold leading-none">
                                  {t('meal.plate_btn', { defaultValue: 'Talerz' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </SwipeableItem>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12 p-8 bg-slate-100 dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <Tag size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-xs font-bold text-slate-400">
                    {t('meal.no_products', { defaultValue: i18n.t('auto.nie_znaleziono_produktow', { defaultValue: "Nie znaleziono produktów w tej kategorii." }) })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
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
                      className="text-emerald-500 transition-all duration-1000"
                    />
                  </svg>
                  <div className="bg-emerald-500/10 w-full h-full rounded-full absolute" />
                  <Zap className="text-emerald-500 z-10" size={20} />
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
                    {activeChartData[0]?.WW?.toFixed(1) || "?"}  {t('auto.ww', { defaultValue: 'WW' })}
                                                        </span>
                  <span className="text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-lg">
                    {activeChartData[0]?.WBT?.toFixed(1) || "?"}  {t('auto.wbt', { defaultValue: 'WBT' })}
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
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
      {(mode === "plate" || mode === "both") && plate.length > 0 && (
        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl border-l-[6px] border-accent-500">
          <div className="flex justify-between items-center mb-4 border-b border-accent-500/20 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-accent-500/10 rounded-xl">
                <Utensils size={16} className="text-accent-400" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-white">
                {t('meal.your_plate', { defaultValue: i18n.t('auto.twoj_talerz', { defaultValue: "Twój Talerz" }) })}
              </span>
              <span className="bg-accent-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                {plate.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  Haptics.medium();
                  setTab("database");
                }}
                className="text-[9px] font-black uppercase tracking-widest bg-accent-500/20 text-accent-400 px-3 py-2 rounded-xl active:bg-accent-500 active:text-white transition-all flex items-center gap-1.5"
              >
                <Plus size={12} />
                <span>{t('meal.add_from_db', { defaultValue: 'Dodaj z Bazy' })}</span>
              </button>
              <button
                onClick={() => {
                  Haptics.impact();
                  setPlate([]);
                }}
                className="text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 px-3 py-2 rounded-xl active:bg-rose-500 active:text-white transition-all"
              >
                {t('meal.clear', { defaultValue: i18n.t('auto.wyczysc', { defaultValue: "Wyczyść" }) })}
              </button>
            </div>
          </div>

          <motion.div
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } },
            }}
            initial="hidden"
            animate="show"
            className="space-y-3 mb-8"
          >
            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1 font-mono">
              {t('meal.ingredients_list', { defaultValue: i18n.t('auto.skladniki', { defaultValue: "Składniki:" }) })}
            </h5>
            <AnimatePresence>
              {plate.map((item, idx) => (
                <motion.div
                  layout
                  variants={{
                    hidden: { opacity: 0, x: -20, scale: 0.95 },
                    show: {
                      opacity: 1,
                      x: 0,
                      scale: 1,
                      transition: {
                        type: "spring",
                        stiffness: 350,
                        damping: 25,
                      },
                    },
                  }}
                  initial="hidden"
                  animate="show"
                  exit={{
                    opacity: 0,
                    x: 20,
                    scale: 0.95,
                    transition: { duration: 0.2 },
                  }}
                  key={item.plateItemId || `${item.id}-${idx}`}
                >
                  <SwipeableItem
                    id={item.plateItemId || `${item.id}-${idx}`}
                    onDelete={() => removeFromPlate(idx)}
                    bgClass="bg-slate-900"
                  >
                    <div className="bg-white/10 p-4 rounded-[1.5rem] flex justify-between items-center text-[10px] font-bold group border border-transparent hover:border-accent-500/30 transition-all">
                      <div className="flex-1 pr-4">
                        <div className="text-sm font-black mb-1.5 text-white">
                          {getProductName(item, i18n.language)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-tighter opacity-50 font-black">
                            {t('meal.weight_label', { defaultValue: 'Waga:' })}
                          </span>
                          <div className="flex items-center bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                            <input
                              type="number"
                              value={item.weight}
                              onChange={(e) =>
                                updateWeight(
                                  idx,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="bg-transparent w-10 text-center outline-none text-accent-300 font-black"
                            />
                            <span className="text-[8px] opacity-40 ml-1">
                              g
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="text-accent-400 font-black text-sm">
                          {((item.carbs * item.weight) / 100).toFixed(1)}g
                        </div>
                        <div className="flex gap-1">
                          <div
                            className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                              typeof item.gi === "number"
                                ? item.gi <= 55
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : item.gi < 70
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-rose-500/20 text-rose-400"
                                : "bg-slate-500/20 text-slate-400",
                            )}
                          >
                            
                                                                      {t('auto.ig', { defaultValue: 'IG:' })} {typeof item.gi === "number" ? item.gi : "??*"}
                          </div>
                          {typeof item.gi === "number" &&
                            (() => {
                              const glValue =
                                (((item.carbs * item.weight) / 100) * item.gi) /
                                100;
                              return (
                                <div
                                  className={cn(
                                    "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                    glValue <= 10
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : glValue < 20
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-rose-500/20 text-rose-400",
                                  )}
                                >
                                  
                                                                        {t('auto.łg', { defaultValue: i18n.t('auto.lg', { defaultValue: "ŁG:" }) })} {glValue.toFixed(1)}
                                </div>
                              );
                            })()}
                        </div>
                      </div>
                    </div>
                  </SwipeableItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5 glass-target">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              {t('meal.thermal_processing', { defaultValue: i18n.t('auto.obrobka_termiczna_posilku', { defaultValue: "Obróbka Termiczna Posiłku" }) })}
            </h5>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "raw", label: t('meal.method_raw', { defaultValue: 'Brak / Surowe' }) },
                { id: "boiled", label: t('meal.method_boiled', { defaultValue: 'Gotowane' }) },
                { id: "baked", label: t('meal.method_baked', { defaultValue: 'Pieczone' }) },
                { id: "fried", label: t('meal.method_fried', { defaultValue: i18n.t('auto.smazone_na_tluszczu', { defaultValue: "Smażone na tłuszczu" }) }) },
                { id: "blended", label: t('meal.method_blended', { defaultValue: 'Zblendowane' }) },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => {
                    Haptics.selection();
                    setCookingMethod(method.id as any);
                  }}
                  className={cn(
                    "text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all",
                    cookingMethod === method.id
                      ? "bg-accent-500 text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10",
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
            {cookingMethod === "fried" && (
              <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
                {t('meal.alert_fried', { defaultValue: i18n.t('auto.uwaga_smazenie_automatycz', { defaultValue: "Uwaga: Smażenie automatycznie dodaje ~10g tłuszczu na 100g składników. Obniża IG, ale podbija WBT i Kcal." }) })}
              </p>
            )}
            {cookingMethod === "boiled" && (
              <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
                {t('meal.alert_boiled', { defaultValue: i18n.t('auto.gotowanie_moze_mocno_podn', { defaultValue: "Gotowanie może mocno podnieść IG węglowodanów (np. stają się szybciej przyswajalne)." }) })}
              </p>
            )}
            {cookingMethod === "baked" && (
              <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
                {t('meal.alert_baked', { defaultValue: 'Pieczenie podnosi Indeks Glikemiczny potrawy.' })}
              </p>
            )}
            {cookingMethod === "blended" && (
              <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
                {t('meal.alert_blended', { defaultValue: i18n.t('auto.rozdrabnianie_blendowanie', { defaultValue: "Rozdrabnianie (blendowanie) ułatwia trawienie i podnosi IG." }) })}
              </p>
            )}
          </div>

          {(() => {
            const dietAlerts = [];
            if (settings?.activeDiet) {
              if (settings.activeDiet === "keto" && totalCarbs > 20) {
                dietAlerts.push(
                  t('meal.diet_alert_keto_carbs', { defaultValue: i18n.t('auto.posilek_dostarczy_ponad_2', { defaultValue: "Posiłek dostarczy ponad 20g węgl., co mocno utrudnia pobyt w ketozie (Keto)!" }) })
                );
              } else if (
                settings.activeDiet === "keto" &&
                fatPct > carbsPct + proteinPct
              ) {
                dietAlerts.push({
                  text: t('meal.diet_alert_keto_success', { defaultValue: i18n.t('auto.swietny_stosunek_makro_dl', { defaultValue: "Świetny stosunek makro dla diety Keto!" }) }),
                  type: "success",
                });
              }

              if (settings.activeDiet === "plate") {
                if (carbsPct > 40)
                  dietAlerts.push(
                    t('meal.diet_alert_plate_carbs', { defaultValue: i18n.t('auto.zbyt_duza_przewaga_weglow', { defaultValue: "Zbyt duża przewaga węglowodanów względem talerza (Pamiętaj by 1/4 stanowiły węgle)." }) })
                  );
                if (proteinPct < 15)
                  dietAlerts.push(
                    t('meal.diet_alert_plate_protein', { defaultValue: i18n.t('auto.odrobine_za_malo_bialka_w', { defaultValue: "Odrobinę za mało białka w porcji. (Pamiętaj by 1/4 stanowiło białko)." }) })
                  );
              }
            }

            if (dietAlerts.length > 0) {
              return (
                <div className="mb-6 space-y-2">
                  {dietAlerts.map((a, i) => {
                    const isSuccess =
                      typeof a === "object" && a.type === "success";
                    const msg = typeof a === "object" ? a.text : a;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "p-4 rounded-2xl border",
                          isSuccess
                            ? "bg-emerald-500/10 border-emerald-500/20"
                            : "bg-rose-500/10 border-rose-500/20",
                        )}
                      >
                        <h5
                          className={cn(
                            "text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1",
                            isSuccess ? "text-emerald-400" : "text-rose-400",
                          )}
                        >
                          {isSuccess ? (
                            <Leaf size={12} />
                          ) : (
                            <AlertTriangle size={12} />
                          )}
                          {t('meal.glikosense_diet', { defaultValue: 'GlikoSense: Twoja Dieta' })}
                        </h5>
                        <p
                          className={cn(
                            "text-xs font-bold leading-relaxed",
                            isSuccess ? "text-emerald-300" : "text-rose-300",
                          )}
                        >
                          {msg}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            }
            return null;
          })()}

          {/* Makroskładniki Procentowo */}
          <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5 glass-target">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                {t('meal.meal_balance', { defaultValue: i18n.t('auto.balans_posilku_energia', { defaultValue: "Balans Posiłku (Energia %)" }) })}
              </span>
              <span className="text-[10px] font-black text-accent-400">
                {Math.round(totalCalsFromMacros)}  {t('auto.kcal', { defaultValue: 'kcal' })}
                                            </span>
            </div>

            <div className="flex h-3 w-full rounded-full overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${carbsPct}%` }}
                className="bg-accent-500 h-full"
                title={i18n.t('auto.wegle_var0', { defaultValue: "Węgle: {{var0}}%", var0: Math.round(carbsPct) })}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${proteinPct}%` }}
                className="bg-emerald-500 h-full"
                title={i18n.t('auto.bialka_var0', { defaultValue: "Białka: {{var0}}%", var0: Math.round(proteinPct) })}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fatPct}%` }}
                className="bg-amber-500 h-full"
                title={i18n.t('auto.tluszcze_var0', { defaultValue: "Tłuszcze: {{var0}}%", var0: Math.round(fatPct) })}
              />
            </div>

            <div className="flex flex-wrap gap-4 justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                <span className="text-[9px] font-bold text-slate-300">
                  
                                                    {t('auto.w', { defaultValue: 'W:' })} {carbsPct.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-slate-300">
                  
                                                    {t('auto.b', { defaultValue: 'B:' })} {proteinPct.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[9px] font-bold text-slate-300">
                  
                                                    {t('auto.t', { defaultValue: 'T:' })} {fatPct.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center flex-col items-center py-6 border-t border-white/10 mb-2 mt-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 block">
              {t('meal.calories_from_macros', { defaultValue: i18n.t('auto.kalorie_z_makroskladnikow', { defaultValue: "Kalorie z makroskładników" }) })}
            </span>
            <span className="text-4xl font-black text-white drop-shadow-md flex items-baseline gap-1">
              {Math.round(totalCalsFromMacros)}
              <span className="text-sm font-bold opacity-40">{t('auto.kcal', { defaultValue: 'kcal' })}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 border-t border-white/10 pt-4">
            <div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                {t('meal.exchanges_ww', { defaultValue: 'Wymienniki WW' })}
              </span>
              <span className="text-2xl font-black text-accent-400">
                {totalWW.toFixed(1)}
                <span className="text-xs font-bold opacity-30 ml-1">{t('auto.ww', { defaultValue: 'WW' })}</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                {t('meal.exchanges_wbt', { defaultValue: 'Wymienniki WBT' })}
              </span>
              <span className="text-2xl font-black text-amber-300">
                {totalWBT.toFixed(1)}
                <span className="text-xs font-bold opacity-30 ml-1">{t('auto.wbt', { defaultValue: 'WBT' })}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-6 border-t border-white/10 pt-4">
            <div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                {t('meal.carbohydrates', { defaultValue: i18n.t('auto.weglowodany', { defaultValue: "Węglowodany" }) })}
              </span>
              <span className="text-lg font-black text-accent-300">
                {totalCarbs.toFixed(1)}
                <span className="text-[9px] font-bold opacity-30 ml-1">g</span>
              </span>
            </div>
            <div className="text-center border-l border-white/10">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                {t('meal.protein', { defaultValue: i18n.t('auto.bialko', { defaultValue: "Białko" }) })}
              </span>
              <span className="text-lg font-black text-emerald-400">
                {totalProtein.toFixed(1)}
                <span className="text-[9px] font-bold opacity-30 ml-1">g</span>
              </span>
            </div>
            <div className="text-center border-l border-white/10">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                {t('meal.fats', { defaultValue: i18n.t('auto.tluszcze', { defaultValue: "Tłuszcze" }) })}
              </span>
              <span className="text-lg font-black text-amber-400">
                {totalFat.toFixed(1)}
                <span className="text-[9px] font-bold opacity-30 ml-1">g</span>
              </span>
            </div>
            <div className="text-right border-l border-white/10">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                {t('meal.glycemic_load_abbr', { defaultValue: i18n.t('auto.ladunek_gl', { defaultValue: "Ładunek Gl." }) })}
              </span>
              <span
                className={cn(
                  "text-lg font-black",
                  totalGL <= 10
                    ? "text-emerald-400"
                    : totalGL < 20
                      ? "text-amber-400"
                      : "text-rose-400",
                )}
              >
                {totalGL.toFixed(1)}
                <span className="text-[9px] font-bold opacity-30 ml-1">{t('auto.łg', { defaultValue: i18n.t('auto.lg', { defaultValue: "ŁG" }) })}</span>
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
              {t('meal.time_of_eating', { defaultValue: 'Czas podania zjedzenia:' })}
            </span>
            <input
              type="datetime-local"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] font-black p-2 rounded-xl border border-slate-100 dark:border-slate-700 outline-none"
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={prepareToLogMeal}
              className="flex-3 bg-accent-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              {t('meal.add_to_diary', { defaultValue: 'Dodaj do Dziennika' })}
            </button>
            <button
              onClick={analyzeMeal}
              disabled={isAnalyzing}
              className="bg-slate-800 text-accent-400 p-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center min-w-[56px]"
              title={t('meal.ai_analysis_title', { defaultValue: 'Analiza AI' })}
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Zap size={20} />
              )}
            </button>
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="bg-slate-800 text-slate-400 p-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center min-w-[56px]"
              title={t('meal.save_as_template', { defaultValue: 'Zapisz jako szablon (ulubiony)' })}
            >
              <Star size={20} />
            </button>
          </div>

          {analysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-4 bg-accent-950 border border-accent-800 rounded-2xl text-[12px] leading-relaxed text-accent-50 font-medium tracking-wide"
              dangerouslySetInnerHTML={{ __html: analysis }}
            />
          )}

          {settings?.treatmentMode === 'diet_only' ? (
            <button
              onClick={async () => {
                import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Medium }));
                toast.loading(i18n.t('auto.zapisywanie_posilku', { defaultValue: 'Zapisywanie posiłku...' }), { id: "meal-save" });
                try {
                  const payload = {
                    type: "meal",
                    value: Math.round(totalCarbs * 10) / 10,
                    carbs: Math.round(totalCarbs * 10) / 10,
                    protein: Math.round(totalProtein * 10) / 10,
                    fat: Math.round(totalFat * 10) / 10,
                    calories: Math.round(totalCalsFromMacros),
                    notes: plate.map((i) => i.name).join(", ") || t('meal.custom_meal', { defaultValue: 'Własny posiłek' }),
                    timestamp: Date.now(),
                    createdAt: Date.now()
                  };
                  const docRef = await addDoc(collection(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs"), payload);
                  window.dispatchEvent(new CustomEvent("localLogAdd", { detail: { ...payload, id: docRef.id } }));
                  setPlate([]);
                  toast.success(i18n.t('auto.posilek_zostal_zapisany', { defaultValue: 'Posiłek został zapisany w dzienniku!' }), { id: "meal-save" });
                  setTab("dashboard");
                } catch (e) {
                  toast.error("Błąd zapisu", { id: "meal-save" });
                }
              }}
              className="w-full bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 py-3 rounded-xl mt-3 font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all"
            >
              {t('auto.zapisz_posilek_w_dzienni', { defaultValue: 'Zapisz posiłek w dzienniku' })}
            </button>
          ) : (
            <button
              onClick={() => {
                sessionStorage.setItem(
                  "pending_meal",
                  JSON.stringify({
                    carbs: Math.round(totalCarbs * 10) / 10,
                    protein: Math.round(totalProtein * 10) / 10,
                    fat: Math.round(totalFat * 10) / 10,
                    name: plate.map((i) => i.name).join(", ") || t('meal.custom_meal', { defaultValue: i18n.t('auto.wlasny_posilek', { defaultValue: "Własny posiłek" }) }),
                    items: plate,
                  }),
                );
                setTab("bolus");
              }}
              className="w-full bg-slate-800 py-3 rounded-xl mt-3 font-black text-[9px] uppercase tracking-widest text-slate-400 active:scale-95 transition-all"
            >
              {t('meal.go_to_calculator', { defaultValue: i18n.t('auto.przejdz_do_kalkulatora', { defaultValue: "Przejdź do Kalkulatora" }) })}
            </button>
          )}

          {/* Dynamic absorption wizard for composing food - ALWAYS at the bottom as requested */}
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={14} className="text-accent-400 animate-pulse" />
                  {t('meal.absorption_profile', { defaultValue: i18n.t('auto.profil_wchlaniania_posilk', { defaultValue: "Profil wchłaniania posiłku" }) })}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {t('meal.absorption_profile_desc', { defaultValue: i18n.t('auto.planowane_tempo_uwalniani', { defaultValue: "Planowane tempo uwalniania się energii ze składników na talerzu" }) })}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block">
                  {t('meal.absorption_end', { defaultValue: i18n.t('auto.koniec_wchlaniania', { defaultValue: "Koniec wchłaniania" }) })}
                </span>
                <span className="text-xs font-black text-accent-300">
                  {new Date(
                    new Date(entryTime).getTime() +
                      getMealAbsorptionTime(totalWW, totalWBT) * 60 * 60 * 1000
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="h-32 w-full select-none mt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <AreaChart
                  data={plateChartData}
                  margin={{ top: 5, right: 10, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorPosilekPlate"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    stroke="#475569"
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid #1e293b",
                      borderRadius: "12px",
                      fontSize: "10px",
                      color: "#f8fafc",
                    }}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={(value: any, name: any) => [`${value} ${t('meal.unit', { defaultValue: 'jedn.' })}`, t('meal.absorption_profile_tooltip', { defaultValue: i18n.t('auto.profil_wchlaniania', { defaultValue: "Profil wchłaniania" }) })]}
                  />
                  <Area
                    type="monotone"
                    dataKey="Posiłek" name={i18n.t('auto.posilek', { defaultValue: 'Posiłek' })}
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorPosilekPlate)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[8px] text-slate-400 mt-2 text-center italic">
              {t('meal.chart_disclaimer', { defaultValue: i18n.t('auto.wykres_przedstawia_dynami', { defaultValue: "*Wykres przedstawia dynamiczną krzywą metaboliczną na podstawie wskaźnika IG oraz WBT dodanych składników." }) })}
            </p>
          </div>
        </div>
      )}
        </>
      )}
    </motion.div>
  );
}

const MealScanner = forwardRef(({ onResult }: { onResult: (res: string) => void }, ref) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [scanner, setScanner] = useState<any>(null);

  useImperativeHandle(ref, () => ({
    stopScanner: async () => {
      if (scanner && scanner.isScanning) {
        try {
          await scanner.stop();
        } catch (e) {
          console.error(e);
        }
      }
    }
  }));

  useEffect(() => {
    // Html5Qrcode is imported at the top
    const html5QrCode = new Html5Qrcode("reader-meal");
    setScanner(html5QrCode);
    setHasPermission(true);

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch((e) => console.error(e));
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (scanner && !scanner.isScanning) {
      // Html5QrcodeObj is not needed because we use Html5Qrcode directly
      // but let's alias it for the rest of the code
      const Html5QrcodeObj = Html5Qrcode;
      
      const startWithConfig = (config) => {
          scanner.start(
            config,
            { 
               fps: 20,
               videoConstraints: typeof config === 'string' ? undefined : { facingMode: config.facingMode },
            },
            (decodedText) => {
              scanner.stop().then(() => {
                if (isMounted) onResult(decodedText);
              }).catch((e) => console.error(e));
            },
            () => {}
          ).then(() => {
             if (!isMounted) {
                scanner.stop().catch(console.error);
             }
          }).catch((err) => {
            console.error("Scanner start error", err);
            if (config.facingMode && isMounted) {
               scanner.start({ facingMode: 'environment' }, { fps: 20 }, (txt) => { 
                 scanner.stop(); 
                 if (isMounted) onResult(txt); 
               }, () => {}).then(() => {
                 if (!isMounted) scanner.stop().catch(console.error);
               }).catch(console.error);
            }
          });
      };

      Html5QrcodeObj.getCameras().then((devices) => {
         if (!isMounted) return;
         if (devices && devices.length > 0) {
            let selectedCamId = devices[0].id;
            if (facingMode === 'environment') {
               const backCams = devices.filter((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes(i18n.t('auto.tyl', { defaultValue: i18n.t('auto.tyl', { defaultValue: "tył" }) })) || d.label.toLowerCase().includes('environment'));
               if (backCams.length > 0) {
                   selectedCamId = backCams[backCams.length - 1].id;
               }
            } else {
               const frontCams = devices.filter((d) => d.label.toLowerCase().includes('front') || d.label.toLowerCase().includes(i18n.t('auto.przod', { defaultValue: i18n.t('auto.przod', { defaultValue: "przód" }) })));
               if (frontCams.length > 0) {
                   selectedCamId = frontCams[0].id;
               }
            }
            startWithConfig(selectedCamId);
         } else {
            startWithConfig({ facingMode });
         }
      }).catch(() => {
         if (isMounted) startWithConfig({ facingMode });
      });
    }

    return () => {
      isMounted = false;
    };
  }, [scanner, facingMode]);

  const switchCamera = () => {
    if (!scanner) return;

    if (scanner.isScanning) {
      scanner
        .stop()
        .then(() => {
          setFacingMode(prev => prev === "environment" ? "user" : "environment");
        })
        .catch((e) => console.error(e));
    } else {
      setFacingMode(prev => prev === "environment" ? "user" : "environment");
    }
  };

  if (hasPermission === false) {
    return (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <X className="text-rose-500 mb-2" size={32} />
        <p className="text-[10px] font-bold text-white uppercase tracking-widest">
          {i18n.t('meal.camera_no_access', { defaultValue: i18n.t('auto.brak_dostepu_do_aparatu', { defaultValue: "Brak dostępu do aparatu" }) })}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div id="reader-meal" className="w-full h-full bg-black"></div>

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[80%] h-[50%] border-2 border-accent-500 rounded-3xl relative">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-accent-500 -mt-1 -ml-1 rounded-tl-xl"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-accent-500 -mt-1 -mr-1 rounded-tr-xl"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-accent-500 -mb-1 -ml-1 rounded-bl-xl"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-accent-500 -mb-1 -mr-1 rounded-br-xl"></div>

          {/* Scanning Line Animation */}
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-accent-500/50 shadow-[0_0_15px_rgba(var(--accent-500),0.5)] z-10"
          />
        </div>
      </div>

      {/* Camera Switch Button */}
      <button
        onClick={switchCamera}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 hover:bg-white/30 transition-all pointer-events-auto shadow-lg"
      >
        <Camera size={20} />
      </button>

      {hasPermission === null && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
          <p className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse">
            {i18n.t('meal.camera_loading', { defaultValue: i18n.t('auto.ladowanie', { defaultValue: "Ładowanie..." }) })}
          </p>
        </div>
      )}
    </div>
  );
});





