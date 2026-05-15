import { toast } from "react-hot-toast";
import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Product, PlateItem } from "../types";
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
} from "lucide-react";
import SwipeableItem from "./SwipeableItem";
import { cn } from "../lib/utils";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { LIB_BASE, CATEGORIES } from "../constants";
import { geminiService } from "../services/gemini";
import { Html5Qrcode } from "html5-qrcode";

import { Haptics } from "../lib/haptics";

export default function MealPlate({
  user,
  setTab,
  sharedPlate = [],
  setSharedPlate,
  mode = "both",
}: {
  user: any;
  setTab: (t: string) => void;
  sharedPlate?: PlateItem[];
  setSharedPlate?: React.Dispatch<React.SetStateAction<PlateItem[]>>;
  mode?: "search" | "plate" | "both";
}) {
  const plate = sharedPlate;
  const setPlate = setSharedPlate || (() => {});
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineResults, setOnlineResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [communityProducts, setCommunityProducts] = useState<Product[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Wszystko");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  const handleScrollHaptics = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    const diff = Math.abs(currentScrollY - lastScrollY.current);
    if (diff > 40) { // Trigger tick every 40px scroll
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
    );
    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      setCommunityProducts(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          isCommunity: true,
          ...doc.data(),
        })) as Product[],
      );
    }, (error) => {
      console.error("MealPlate communityProducts error:", error);
    });

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
          .filter((item) => item && item.name)
          .map((item) => [`${item.id || item.name.toLowerCase()}`, item]),
      ).values(),
    ).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [customProducts, communityProducts]);

  const browseResults = useMemo(() => {
    return allLocal.filter((p) => {
      const matchesSearch =
        searchTerm.length < 2 ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesCategory = false;
      if (activeCategory === "Wszystko") {
        matchesCategory = true;
      } else if (activeCategory === "Społeczność") {
        matchesCategory = !!p.isCommunity;
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

            const name = (p.product_name_pl || p.product_name || "").toLowerCase();
            
            // Heurystyka lokalna (Algorytm GlikoSense Offline)
            if (isNaN(carbs)) {
              if (name.includes("chleb") || name.includes("bułka")) carbs = 50;
              else if (name.includes("ryż") || name.includes("kasza")) carbs = 25;
              else if (name.includes("ziemniak")) carbs = 17;
              else if (name.includes("jogurt") || name.includes("mleko")) carbs = 5;
              else if (name.includes("mięso") || name.includes("kurczak") || name.includes("ryba")) carbs = 0;
              else if (name.includes("jabłko") || name.includes("owoc")) carbs = 12;
              else carbs = 0;
            }

            if (name.includes("pełnoziarnist") || name.includes("razow")) gi = 40;
            if (name.includes("cukier") || name.includes("biał") || name.includes("miód")) gi = 70;

            return {
              id: p._id || `off_${Date.now()}_${Math.random()}`,
              name: p.product_name_pl || p.product_name || "Produkt z sieci",
              carbs: isNaN(carbs) ? 0 : carbs,
              protein: isNaN(protein) ? 0 : protein,
              fat: isNaN(fat) ? 0 : fat,
              gi,
              category: "Baza Sieciowa (Smart)"
            };
          });

          if (validOffProducts.length > 0) {
            setOnlineResults(
              validOffProducts.map((p: any) => ({
                ...p,
                isOnline: true,
                isDatabase: true
              }))
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
        const prompt = `Jesteś dietetykiem. Przeanalizuj zapytanie użytkownika: "${query}". Może to być nazwa produktu ze sklepu, danie domowe (np. "pierogi ruskie", "leczo"), owoc, warzywo lub konkretna marka. 
        Zwróć listę pasujących produktów w formacie JSON (tylko JSON, bez markdown). 
        Format: [{"name": string, "carbs": number, "polyols": number, "protein": number, "fat": number, "gi": number}]. 
        Podaj wartości na 100g produktu lub na standardową porcję (zaznacz to w nazwie, np. "Jabłko (średnie)"). 
        Jeśli produkt zawiera poliole (np. gumy, słodziki, niektóre fit-batony), uwzględnij je w polu "polyols". 
        W polu "carbs" podaj CAŁKOWITĄ ilość węglowodanów (wraz z poliolami).
        Uwzględnij różne warianty jeśli to możliwe. Nie pisz nic poza JSONem.`;

        const result = await geminiService.generateContent(prompt);
        const jsonMatch = result.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        let cleanJson = jsonMatch ? jsonMatch[0] : result;
        cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
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
      const localMatches = allLocal.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);

      if (localMatches.length > 0) {
        setOnlineResults(localMatches.map(p => ({ ...p, isOnline: true })));
      } else {
        setSearchError("Brak dostępu do AI i nie znaleziono dopasowań w bazach tradycyjnych.");
      }
    } catch (e) {
      console.error("Online search failed:", e);
      setSearchError("Błąd wyszukiwania. Sprawdź połączenie.");
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
          name: `${product.name} (${weight}g)`,
          icon: "🥗",
          type: "meal",
          carbs: Number(calculatedCarbs.toFixed(1)),
          originalCarbs: product.carbs,
          weight: weight,
          createdAt: serverTimestamp(),
        },
      );
      toast.success(`Dodano ${product.name} (${weight}g) do skrótów!`);
    } catch (e) {
      console.error("Error saving shortcut:", e);
      toast.error("Nie udało się zapisać skrótu.");
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
          name: product.name,
          carbs: product.carbs,
          protein: product.protein || 0,
          fat: product.fat || 0,
          gi: typeof product.gi === 'number' ? product.gi : 50,
          category: "Z Sieci",
        },
      );
      toast(`Zapisano ${product.name} do bazy produktów.`);
    } catch (e) {
      console.error(e);
      alert("Błąd zapisu.");
    }
  };

  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isShortcutConfirmModalOpen, setIsShortcutConfirmModalOpen] = useState(false);
  const [shortcutWeight, setShortcutWeight] = useState("100");
  const [shortcutToConfirm, setShortcutToConfirm] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [weightInput, setWeightInput] = useState("100");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mealName, setMealName] = useState("");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);

  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
  const [entryTime, setEntryTime] = useState(localISOTime);
  const [cookingMethod, setCookingMethod] = useState<'raw' | 'boiled' | 'baked' | 'fried' | 'blended'>('raw');


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
      },
      (error) => {
        console.error("MealPlate savedMeals error:", error);
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
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  };

  const analyzeMeal = async () => {
    if (plate.length === 0) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const prompt = `Jesteś zaawansowanym asystentem diabetologicznym. Przeanalizuj poniższy skład posiłku pacjenta:
      ${JSON.stringify(plate.map(p => ({ nazwa: p.name, waga: p.weight, wegle: p.carbs, bialko: p.protein, tluszcz: p.fat, IG: p.gi })))}
      
      Wybrana obróbka termiczna całego posiłku: ${cookingMethod === 'raw' ? 'Surowe / Brak' : cookingMethod === 'boiled' ? 'Gotowane' : cookingMethod === 'baked' ? 'Pieczone' : cookingMethod === 'fried' ? 'Smażone' : 'Zblendowane'}
      
      Zwróć szczegółową analizę w czytelnym formacie HTML (używaj <b>, <ul>, <li>, <br>, ale ZABRANIAM używania markdown, w szczególności gwazdek).
      
      Uwzględnij:
      1. <b>Szczegółowy Wpływ Składników i Obróbki</b>: Wytłumacz, jak obecność białek/tłuszczy oraz dodanie płynów (np. wody, mleka - co rozcieńcza węglowodany na objętość) wpływa na ładunek glikemiczny (ŁG). Przeanalizuj również wpływ wybranej obróbki termicznej (np. gotowanie, smażenie, pieczenie, blendowanie) na wchłanianie i Indeks Glikemiczny (IG). Dodanie tłuszczu spowalnia trawienie (efekt pizzy), a blendowanie/rozgotowanie je przyspiesza.
      2. <b>Profil Wchłaniania</b>: Oceń wypadkowy Indeks Glikemiczny (IG) oraz całkowity Ładunek Glikemiczny (ŁG) zestawu. Wskaż produkty obciążające układ i mogące powodować późniejsze skoki glikemii.
      3. <b>Rekomendacja Bolusa (w tym WBT)</b>: Zaleć typ bolusa (np. prosty, złożony, przedłużony). Jeśli posiłek ma dużo WW i WBT, określ ile % insuliny podać od razu, a ile przedłużyć na ile godzin. Wspomnij o pre-bolusie.
      4. <b>Ostrzeżenia</b>: Krótko (1 zdanie) na co uważać w ciągu najbliższych kilku godzin w związku z trwającym wchłanianiem tego konkretnego posiłku.
      
      Odpowiedź ma być konkretna, rzetelna i dostosowana do specyfiki użytych składników (np. mąki, jajek, mleka w przypadku ciasta naleśnikowego).`;
      const result = await geminiService.generateContent(prompt);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
      setAnalysis("Błąd analizy AI.");
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
      alert("Zestaw zapisany!");
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
    alert(`Dodano zestaw: ${meal.name}`);
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
        plateItemId: Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
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
  const rawPolyols = plate.reduce((s, i) => s + ((i.polyols || 0) * i.weight) / 100, 0);
  const rawProtein = plate.reduce((s, i) => s + ((i.protein || 0) * i.weight) / 100, 0);
  const rawFat = plate.reduce((s, i) => s + ((i.fat || 0) * i.weight) / 100, 0);

  const totalCarbs = Math.max(0, rawCarbs - rawPolyols); // Net carbs
  const totalProtein = rawProtein;
  const totalFat = cookingMethod === 'fried' ? rawFat + (totalWeight / 100) * 10 : rawFat;
  
  const totalCalsFromMacros = (totalCarbs * 4) + (totalProtein * 4) + (totalFat * 9);
  const carbsPct = totalCalsFromMacros > 0 ? (totalCarbs * 4 / totalCalsFromMacros) * 100 : 0;
  const proteinPct = totalCalsFromMacros > 0 ? (totalProtein * 4 / totalCalsFromMacros) * 100 : 0;
  const fatPct = totalCalsFromMacros > 0 ? (totalFat * 9 / totalCalsFromMacros) * 100 : 0;

  const totalWW = totalCarbs / 10;
  const totalWBT = (totalProtein * 4 + totalFat * 9) / 100;
  
  const rawGL = plate.reduce((s, i) => {
    if (typeof i.gi !== 'number') return s;
    const itemNetCarbs = Math.max(0, i.carbs - (i.polyols || 0));
    return s + ((itemNetCarbs * i.weight / 100) * i.gi) / 100;
  }, 0);

  let avgGI = rawCarbs > 0 ? (rawGL * 100) / rawCarbs : 0;
  if (cookingMethod === 'boiled') avgGI = Math.min(100, avgGI * 1.3);
  if (cookingMethod === 'baked') avgGI = Math.min(100, avgGI * 1.15);
  if (cookingMethod === 'blended') avgGI = Math.min(100, avgGI * 1.2);
  if (cookingMethod === 'fried') avgGI = avgGI * 0.9;
  
  const totalGL = (totalCarbs * avgGI) / 100;

  const handleLogMeal = async () => {
    if (!user || plate.length === 0) return;
    Haptics.medium();
    try {
      await addDoc(
        collection(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs"),
        {
          type: "meal",
          value: totalCarbs,
          polyols: rawPolyols,
          protein: totalProtein,
          fat: totalFat,
          timestamp: new Date(entryTime).getTime(),
          description: plate.map((i) => i.name).join(", "),
        },
      );
      setPlate([]);
      Haptics.success();
    } catch (e) {
      console.error(e);
      Haptics.error();
    }
  };

  const startVoiceSearch = () => {
    // @ts-ignore
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Twoja przeglądarka nie obsługuje wyszukiwania głosowego.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "pl-PL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = async (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setSearchTerm(speechResult);
      setIsListening(false);

      const localMatches = allLocal.filter((p) =>
        p.name.toLowerCase().includes(speechResult.toLowerCase()),
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
        setSearchError("Brak dostępu do mikrofonu. Uprawnienia mogą być blokowane przez przeglądarkę.");
      } else {
        setSearchError("Błąd rozpoznawania mowy. Spróbuj powtórzyć.");
      }
      setIsListening(false);
    };
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
      {/* Weight Modal etc. */}
      <AnimatePresence>
        {isScannerOpen && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4 bg-black/60"
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden will-change-transform"
            >
              <button onClick={() => setIsScannerOpen(false)} className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors z-10">
                <X size={20} />
              </button>
              <h2 className="text-xl font-black text-white mb-6 pr-8">
                Skaner Produktów
              </h2>
              <div className="w-full aspect-square rounded-[2rem] overflow-hidden bg-slate-800 mb-2 relative shadow-inner">
                <MealScanner 
                  onResult={async (decodedText) => {
                    setIsScannerOpen(false);
                    setIsSearching(true);
                    try {
                      const response = await fetch(
                        `https://world.openfoodfacts.org/api/v2/product/${decodedText}.json`,
                      );
                      const data = await response.json();

                      if (data.status === 1 && data.product) {
                        const p = data.product;
                        const product: Product = {
                          id: `scan_${Date.now()}`,
                          name: p.product_name_pl || p.product_name || "Produkt nieznany",
                          carbs: p.nutriments?.carbohydrates_100g || 0,
                          protein: p.nutriments?.proteins_100g || 0,
                          fat: p.nutriments?.fat_100g || 0,
                          gi: 50,
                          category: "Skanowane",
                        };
                        openWeightModal(product);
                      } else {
                        setSearchTerm(decodedText);
                        await performOnlineSearch(decodedText);
                      }
                    } catch (err) {
                      setSearchTerm(decodedText);
                      await performOnlineSearch(decodedText);
                    } finally {
                      setIsSearching(false);
                    }
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-4 uppercase tracking-[0.2em] font-black opacity-50">Nakieruj na kod kreskowy</p>
            </motion.div>
          </motion.div>
        )}

        {isWeightModalOpen && selectedProduct && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-4"
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
                Dodaj: {selectedProduct.name}
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
                  Gramy (g)
                </span>
                {parseFloat(weightInput) > 0 && selectedProduct && (
                  <div className="mt-4 p-3 bg-accent-50 dark:bg-accent-900/20 rounded-2xl flex justify-center gap-4 text-xs font-black flex-wrap">
                    <span className="text-accent-600 dark:text-accent-400">
                      Węgle: {((selectedProduct.carbs * parseFloat(weightInput)) / 100).toFixed(1)}g
                      {selectedProduct.polyols ? ` (w tym ${((selectedProduct.polyols * parseFloat(weightInput)) / 100).toFixed(1)}g poliole)` : ''}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      B+T: {(((selectedProduct.protein || 0) + (selectedProduct.fat || 0)) * parseFloat(weightInput) / 100).toFixed(1)}g
                    </span>
                    {typeof selectedProduct.gi === 'number' && (() => {
                      const glV = (((selectedProduct.carbs * parseFloat(weightInput)) / 100) * selectedProduct.gi / 100);
                      return (
                        <span className={cn(
                          glV <= 10 ? "text-emerald-600 dark:text-emerald-400" : glV < 20 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                          ŁG: {glV.toFixed(1)}
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
                Dodaj do Talerza
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
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-4"
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
                Zapisz skrót?
              </h2>
              <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-900/20 mb-8">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Zapisz <span className="text-amber-600 font-extrabold">{shortcutToConfirm.name}</span> jako szybki skrót.
                </p>
                
                <div className="mt-4">
                  <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2 block">
                    Gramatura (g)
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
                    <span className="text-[10px] uppercase font-black text-slate-400">Suma węgli:</span>
                    <span className="text-sm font-black text-amber-600">
                      {((shortcutToConfirm.carbs * (parseFloat(shortcutWeight) || 0)) / 100).toFixed(1)}g
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsShortcutConfirmModalOpen(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleShortcutConfirm}
                  className="flex-2 bg-amber-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                >
                  Tak, Zapisz
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
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-4"
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
                Zapisz jako szablon
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                Szybkie dodawanie zestawu w przyszłości
              </p>
              <input
                type="text"
                placeholder="Nazwa zestawu (np. Śniadanie)"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 font-bold mb-6 outline-none dark:text-white focus:border-accent-500 transition-colors"
                autoFocus
              />
              <button
                onClick={saveMealSet}
                className="w-full bg-accent-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase shadow-xl transition-all active:scale-95 tracking-widest"
              >
                Zapisz Szablon
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Browser */}
      {(mode === 'search' || mode === 'both') && (
        <>
          <div className="px-1">
            <h2 className="text-xl font-black dark:text-white mb-2">
              Buduj swój posiłek
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
              Wyszukaj produkty i dodaj je do talerza
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
              placeholder="Wyszukaj produkt / danie..."
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
                  title="Wyczyść"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={startVoiceSearch}
                className={`p-2 rounded-full transition-all ${isListening ? "bg-rose-500 text-white animate-pulse" : "text-slate-400 hover:text-accent-500 hover:bg-accent-50 dark:hover:bg-accent-900/30"}`}
                title="Wyszukiwanie głosowe"
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
              className="flex-1 bg-accent-600 text-white p-4 rounded-[2rem] shadow-lg active:scale-95 flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-widest"
              title="Szukaj z GlikoSense AI"
              disabled={isSearching}
            >
              {isSearching ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Szukam...</>
              ) : (
                <><Globe size={20} /> GlikoSense AI</>
              )}
            </button>
            <button
              onClick={() => {
                Haptics.light();
                const elem = document.getElementById("meal-photo-input");
                if (elem) elem.click();
              }}
              className="bg-emerald-600 text-white p-4 rounded-[2.5rem] px-6 shadow-lg active:scale-95 flex items-center justify-center transition-all"
              title="Zrób zdjęcie (Analiza AI)"
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera size={20} />
              )}
            </button>
            <button
              onClick={() => {
                Haptics.light();
                startScanner();
              }}
              className="bg-slate-800 text-white p-4 rounded-[2.5rem] px-6 shadow-lg active:scale-95 flex items-center transition-all justify-center"
            >
              <Scan size={20} />
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
              try {
                const reader = new FileReader();
                reader.onload = async (event) => {
                  const dataUrl = event.target?.result as string;
                  try {
                    const result = await geminiService.analyzeMeal(dataUrl);
                    const p: Product = {
                      id: `ai_${Date.now()}`,
                      name: result.mealName || "Posiłek AI",
                      carbs: result.carbs || 0,
                      protein: result.protein || 0,
                      fat: result.fat || 0,
                      gi: 50,
                      category: "AI Wizja",
                    };
                    const weight = 100;
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
                    // Notice we append with weight=100 and absolute nutrition because the AI estimates for the entire plate
                    setTimeout(() => {
                      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 50);
                  } catch (err) {
                    setSearchError("Błąd analizy zdjęcia.");
                  } finally {
                    setIsAnalyzing(false);
                  }
                };
                reader.readAsDataURL(file);
              } catch (err) {
                setIsAnalyzing(false);
              } finally {
                e.target.value = "";
              }
            }}
          />
        </div>

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
              activeCategory === "Wszystko" ? "bg-accent-600 text-white shadow-lg" : "bg-white dark:bg-slate-900 text-slate-400 dark:border dark:border-slate-800"
            )}
          >
            Wszystko
          </button>
          <button
            onClick={() => {
              Haptics.selection();
              setActiveCategory("Społeczność");
            }}
            className={cn(
              "shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
              activeCategory === "Społeczność" ? "bg-sky-600 text-white shadow-lg" : "bg-sky-50 dark:bg-sky-900/10 text-sky-500 border border-sky-100 dark:border-sky-900/20"
            )}
          >
            Społeczność
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
                activeCategory === cat ? "bg-accent-600 text-white shadow-lg" : "bg-white dark:bg-slate-900 text-slate-400 dark:border dark:border-slate-800"
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
               <p className="text-sm text-rose-600 dark:text-rose-400 font-bold text-center">{searchError}</p>
            </div>
          )}
          {onlineResults.length > 0 && (
            <div className="mb-4">
              <h4 className="text-[9px] font-black text-accent-500 uppercase tracking-widest mb-2 px-2">
                Wyniki AI
              </h4>
              <div className="space-y-2">
                {onlineResults.map((p, i) => (
                  <div key={`online-${i}`} className="flex items-center gap-2">
                    <button
                      onClick={() => openWeightModal(p)}
                      className="flex-1 bg-accent-50 dark:bg-accent-900/20 p-4 rounded-3xl border border-accent-100 dark:border-accent-800 flex justify-between items-center text-left hover:border-accent-500 transition-colors"
                    >
                      <div>
                        <div className="font-black text-xs dark:text-white flex items-center gap-2">
                          {p.name}
                          <span className="bg-accent-500 text-white text-[8px] px-1 rounded font-black">
                            AI
                          </span>
                        </div>
                        <div className="text-[9px] font-bold text-accent-500/60 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                          <span>
                            Węgle: {Number(p.carbs || 0).toFixed(1).replace(/\.0$/, "")}g | B: {Number(p.protein || 0).toFixed(1).replace(/\.0$/, "")}g | T: {Number(p.fat || 0).toFixed(1).replace(/\.0$/, "")}g
                          </span>
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded font-black text-[8px]",
                                typeof p.gi === 'number'
                                  ? (p.gi <= 55 ? "bg-emerald-500/10 text-emerald-500" : p.gi < 70 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500")
                                  : "bg-slate-500/10 text-slate-500",
                              )}
                            >
                              IG: {typeof p.gi === 'number' ? p.gi : "??*"}
                            </span>
                            {(() => {
                              const giVal = typeof p.gi === 'number' ? p.gi : 50;
                              const lgVal = (Number(p.carbs || 0) * giVal) / 100;
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
                                  ŁG: {lgVal.toFixed(1)}
                                </span>
                              );
                            })()}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-accent-300" />
                    </button>
                    <button
                      onClick={() => openShortcutConfirmModal(p)}
                      className="bg-amber-500 text-white p-2.5 rounded-xl active:scale-90 transition-all"
                      title="Dodaj jako skrót"
                    >
                      <BookMarked size={16} />
                    </button>
                    <button
                      onClick={() => saveToCustomDb(p)}
                      className="bg-accent-500 text-white p-2.5 rounded-xl active:scale-90 transition-all"
                      title="Zapisz do bazy"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 mb-2">
            <div className="flex justify-between items-end px-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Baza GlikoSense 
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-accent-600 text-[9px]">
                  {browseResults.length} {browseResults.length === 1 ? 'produkt' : 'produkty'}
                </span>
              </h4>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                {activeCategory !== 'Wszystko' ? `Kategoria: ${activeCategory}` : 'Wszystkie kategorie'}
              </div>
            </div>
            {searchTerm.length > 2 && (
              <div className="px-4">
                <button
                  onClick={handleOnlineSearch}
                  className="w-full py-2 bg-accent-50 dark:bg-accent-900/20 rounded-xl text-[9px] font-black text-accent-600 uppercase tracking-widest flex items-center justify-center gap-2 border border-accent-100 dark:border-accent-800/50 hover:bg-accent-100 transition-all"
                >
                  {isSearching ? <Loader2 className="animate-spin" size={12} /> : <Globe size={12} />}
                  Głębsze wyszukiwanie w sieci (AI)
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
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
                    transition={{ duration: 0.2 }}
                    key={`${p.id || 'p'}-${i}`}
                  >
                    <SwipeableItem
                      id={`${p.id || 'p'}-${i}`}
                      onDelete={() => {
                        Haptics.success();
                        addToPlate(p, 100);
                        toast.success(`Dodano 100g: ${p.name}`);
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
                          if (e.key === 'Enter' || e.key === ' ') {
                            openWeightModal(p);
                          }
                        }}
                      >
                        <div>
                          <div className="font-black text-xs dark:text-white flex items-center gap-2">
                            {p.name}
                            {p.id?.startsWith("custom_") && (
                              <span className="bg-amber-500/10 text-amber-500 text-[8px] px-1.5 py-0.5 rounded border border-amber-500/20">
                                Twoje
                              </span>
                            )}
                            {p.isCommunity && (
                              <span className="bg-sky-500/10 text-sky-500 text-[8px] px-1.5 py-0.5 rounded border border-sky-500/20">
                                Społeczność
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                            <span>
                              Węgle: {Number(p.carbs || 0).toFixed(1).replace(/\.0$/, "")}g | B: {Number(p.protein || 0).toFixed(1).replace(/\.0$/, "")}g | T: {Number(p.fat || 0).toFixed(1).replace(/\.0$/, "")}g
                            </span>
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded font-black text-[8px]",
                                typeof p.gi === 'number' 
                                  ? (p.gi <= 55 ? "bg-emerald-500/10 text-emerald-500" : p.gi < 70 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500")
                                  : "bg-slate-500/10 text-slate-500",
                              )}
                            >
                              IG: {typeof p.gi === 'number' ? p.gi : "??*"}
                            </span>
                            {/* Restoring ŁG (Glycemic Load) calculation */}
                            {typeof p.gi === 'number' && (() => {
                              const lgVal = (Number(p.carbs || 0) * p.gi) / 100;
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
                                  ŁG: {lgVal.toFixed(1)}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openShortcutConfirmModal(p);
                            }}
                            className="p-2 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors z-10"
                            title="Dodaj do skrótów"
                          >
                            <BookMarked size={16} />
                          </button>
                          <Plus
                            size={16}
                            className="text-accent-500 bg-accent-50 dark:bg-accent-900/50 p-1 rounded-lg w-6 h-6"
                          />
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
                Nie znaleziono produktów w tej kategorii.
              </p>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {(mode === 'plate' || mode === 'both') && plate.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[3.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden relative"
        >
          {/* Floating Food Icons Animation */}
          <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10 overflow-hidden">
            {[AppleIcon, Utensils, Zap, Database, Star, Soup, Salad, Pizza, Sandwich].map((Icon, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * 300 - 150, 
                  y: Math.random() * 300 - 150,
                  rotate: 0,
                  opacity: 0 
                }}
                animate={{ 
                  y: [null, Math.random() * 40 - 20],
                  rotate: [0, 360],
                  opacity: [0, 1, 0]
                }}
                transition={{ 
                  duration: 5 + Math.random() * 5, 
                  repeat: Infinity, 
                  delay: i * 0.5,
                  ease: "easeInOut"
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
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-32 h-32 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-8 shadow-inner relative z-10"
          >
            <div className="absolute inset-0 rounded-full border-4 border-accent-500/20 animate-ping opacity-20" />
            <Utensils size={64} className="text-accent-500/40 dark:text-accent-400/30" />
          </motion.div>

          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3 relative z-10 font-display">Talerz jeszcze pusty</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px] mb-10 leading-relaxed font-medium relative z-10">
            Twój talerz czeka na smakołyki! Odwiedź bazę i wybierz coś pysznego do przeliczenia.
          </p>

          <button 
            onClick={() => {
              Haptics.medium();
              setTab('database');
            }}
            className="group relative px-10 py-5 bg-accent-600 hover:bg-accent-700 active:scale-95 transition-all text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl shadow-accent-600/40 z-10"
          >
            <Database size={18} className="group-hover:rotate-12 transition-transform" />
            <span>Przeglądaj Składniki</span>
            <div className="absolute inset-0 rounded-[2rem] bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          </button>
        </motion.div>
      )}

      {/* Plate Stats */}
      {(mode === 'plate' || mode === 'both') && plate.length > 0 && (
        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl border-l-[6px] border-accent-500">
          <div className="flex justify-between items-center mb-4 border-b border-accent-500/20 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-accent-500/10 rounded-xl">
                <Utensils size={16} className="text-accent-400" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-white">
                Twój Talerz
              </span>
              <span className="bg-accent-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                {plate.length}
              </span>
            </div>
            <button
              onClick={() => {
                Haptics.impact();
                setPlate([]);
              }}
              className="text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 px-4 py-2 rounded-xl active:bg-rose-500 active:text-white transition-all"
            >
              Wyczyść
            </button>
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
              Składniki:
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
                          {item.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-tighter opacity-50 font-black">
                            Waga:
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
                              typeof item.gi === 'number'
                                ? (item.gi <= 55 ? "bg-emerald-500/20 text-emerald-400" : item.gi < 70 ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400")
                                : "bg-slate-500/20 text-slate-400",
                            )}
                          >
                            IG: {typeof item.gi === 'number' ? item.gi : "??*"}
                          </div>
                          {typeof item.gi === 'number' && (() => {
                            const glValue = (((item.carbs * item.weight) / 100) * item.gi / 100);
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
                                ŁG: {glValue.toFixed(1)}
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

          <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Obróbka Termiczna Posiłku
            </h5>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'raw', label: 'Brak / Surowe' },
                { id: 'boiled', label: 'Gotowane' },
                { id: 'baked', label: 'Pieczone' },
                { id: 'fried', label: 'Smażone na tłuszczu' },
                { id: 'blended', label: 'Zblendowane' },
              ].map(method => (
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
                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
            {cookingMethod === 'fried' && (
              <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
                Uwaga: Smażenie automatycznie dodaje ~10g tłuszczu na 100g składników. Obniża IG, ale podbija WBT i Kcal.
              </p>
            )}
            {cookingMethod === 'boiled' && (
              <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
                Gotowanie może mocno podnieść IG węglowodanów (np. stają się szybciej przyswajalne).
              </p>
            )}
            {cookingMethod === 'baked' && (
               <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
                 Pieczenie podnosi Indeks Glikemiczny potrawy.
               </p>
            )}
            {cookingMethod === 'blended' && (
               <p className="text-[9px] text-amber-400 font-bold mt-2 uppercase tracking-tight">
                 Rozdrabnianie (blendowanie) ułatwia trawienie i podnosi IG.
               </p>
            )}
          </div>

          {/* Makroskładniki Procentowo */}
          <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
             <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Balans Posiłku (Energia %)</span>
                <span className="text-[10px] font-black text-accent-400">{Math.round(totalCalsFromMacros)} kcal</span>
             </div>
             
             <div className="flex h-3 w-full rounded-full overflow-hidden mb-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${carbsPct}%` }}
                  className="bg-accent-500 h-full"
                  title={`Węgle: ${Math.round(carbsPct)}%`}
                />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${proteinPct}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Białka: ${Math.round(proteinPct)}%`}
                />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${fatPct}%` }}
                  className="bg-amber-500 h-full"
                  title={`Tłuszcze: ${Math.round(fatPct)}%`}
                />
             </div>

             <div className="flex flex-wrap gap-4 justify-between">
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                   <span className="text-[9px] font-bold text-slate-300">W: {carbsPct.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                   <span className="text-[9px] font-bold text-slate-300">B: {proteinPct.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                   <span className="text-[9px] font-bold text-slate-300">T: {fatPct.toFixed(0)}%</span>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 border-t border-white/10 pt-4">
            <div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                Węglowodany
              </span>
              <span className="text-2xl font-black text-accent-400">
                {totalCarbs.toFixed(1)}
                <span className="text-xs font-bold opacity-30 ml-1">g</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                Wymienniki WBT
              </span>
              <span className="text-2xl font-black text-amber-300">
                {totalWBT.toFixed(1)}
                <span className="text-xs font-bold opacity-30 ml-1">WBT</span>
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-6 border-t border-white/10 pt-4">
            <div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                Węglowodany
              </span>
              <span className="text-xl font-black text-accent-300">
                {totalCarbs.toFixed(1)}
                <span className="text-xs font-bold opacity-30 ml-1">g</span>
              </span>
            </div>
            <div className="text-center">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                Białko + Tł.
              </span>
              <span className="text-xl font-black text-emerald-400">
                {(totalProtein + totalFat).toFixed(1)}
                <span className="text-xs font-bold opacity-30 ml-1">g</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                Ładunek Gl.
              </span>
              <span className={cn("text-xl font-black", totalGL <= 10 ? "text-emerald-400" : totalGL < 20 ? "text-amber-400" : "text-rose-400")}>
                {totalGL.toFixed(1)}
                <span className="text-xs font-bold opacity-30 ml-1">ŁG</span>
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Czas podania zjedzenia:</span>
            <input 
               type="datetime-local" 
               value={entryTime}
               onChange={e => setEntryTime(e.target.value)}
               className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] font-black p-2 rounded-xl border border-slate-100 dark:border-slate-700 outline-none"
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleLogMeal}
              className="flex-3 bg-accent-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Dodaj do Dziennika
            </button>
            <button
              onClick={analyzeMeal}
              disabled={isAnalyzing}
              className="bg-slate-800 text-accent-400 p-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center min-w-[56px]"
              title="Analiza AI"
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
              title="Zapisz jako szablon (ulubiony)"
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

          <button
            onClick={() => {
              sessionStorage.setItem('pending_meal', JSON.stringify({
                carbs: Math.round(totalCarbs * 10) / 10,
                protein: Math.round(totalProtein * 10) / 10,
                fat: Math.round(totalFat * 10) / 10,
                name: "Mój Talerz"
              }));
              setTab("bolus");
            }}
            className="w-full bg-slate-800 py-3 rounded-xl mt-3 font-black text-[9px] uppercase tracking-widest text-slate-400 active:scale-95 transition-all"
          >
            Przejdź do Kalkulatora
          </button>
        </div>
      )}

      {(mode === 'search' || mode === 'both') && savedMeals.length > 0 && (
        <div className="px-2 mt-8">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
            Ulubione Zestawy
          </h4>
          <div className="space-y-3">
            {savedMeals.map((m) => (
              <SwipeableItem
                key={m.id}
                id={m.id}
                onDelete={async () => {
                  try {
                    await deleteDoc(
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
                  } catch (err) {
                    console.error("Delete meal failed:", err);
                  }
                }}
              >
                <div
                  onClick={() => addSavedMeal(m)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[2.5rem] flex justify-between items-center group hover:border-accent-500/30 transition-all cursor-pointer shadow-sm shadow-slate-200/50 dark:shadow-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent-500/10 dark:bg-accent-500/20 rounded-2xl flex items-center justify-center shadow-inner">
                      <Zap
                        size={20}
                        className="text-accent-600 dark:text-accent-400"
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm dark:text-white mb-0.5">
                        {m.name}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {m.items.length} x Składnik •{" "}
                        {m.items
                          .reduce((acc: number, i: any) => acc + i.carbs, 0)
                          .toFixed(1)}
                        g W
                      </p>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full group-hover:bg-accent-500 group-hover:text-white transition-all">
                    <Plus size={16} />
                  </div>
                </div>
              </SwipeableItem>
            ))}
          </div>
        </div>
      )}

    </motion.div>
  );
}

function MealScanner({ onResult }: { onResult: (res: string) => void }) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader-meal");
    setScanner(html5QrCode);

    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('tył'));
        setSelectedCameraId(backCamera ? backCamera.id : devices[0].id);
        setHasPermission(true);
      } else {
        setHasPermission(false);
      }
    }).catch(err => {
      console.error("Camera permission error", err);
      setHasPermission(false);
    });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error(e));
      }
    };
  }, []);

  useEffect(() => {
    if (scanner && selectedCameraId && !scanner.isScanning) {
      scanner.start(
        selectedCameraId,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
             // For barcodes, a wider box is often better, but dynamic 70% works well for general
             const width = Math.floor(viewfinderWidth * 0.8);
             const height = Math.floor(viewfinderHeight * 0.5);
             return { width, height };
          }
        },
        (decodedText) => {
          scanner.stop().then(() => onResult(decodedText)).catch(e => console.error(e));
        },
        () => {} // scan error
      ).catch(err => {
        console.error("Scanner start error", err);
      });
    }
  }, [scanner, selectedCameraId]);

  const switchCamera = () => {
    if (!scanner) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    
    if (scanner.isScanning) {
      scanner.stop().then(() => {
        setSelectedCameraId(cameras[nextIndex].id);
      }).catch(e => console.error(e));
    } else {
      setSelectedCameraId(cameras[nextIndex].id);
    }
  };

  if (hasPermission === false) {
    return (
      <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <X className="text-rose-500 mb-2" size={32} />
        <p className="text-[10px] font-bold text-white uppercase tracking-widest">Brak dostępu do aparatu</p>
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
      {cameras.length > 1 && (
        <button 
          onClick={switchCamera}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 p-3 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30 hover:bg-white/30 transition-all pointer-events-auto shadow-lg"
        >
          <Camera size={20} />
        </button>
      )}

      {hasPermission === null && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
          <p className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse">Ładowanie...</p>
        </div>
      )}
    </div>
  );
}
