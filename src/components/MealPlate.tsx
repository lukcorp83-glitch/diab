import { getEffectiveUid } from '../lib/utils';
import React, { useState, useEffect } from "react";
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
  Globe,
  Loader2,
  Zap,
  Star,
  BookMarked,
  Camera,
  Mic,
  X,
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
} from "firebase/firestore";
import { LIB_BASE, CATEGORIES } from "../constants";
import { geminiService } from "../services/gemini";
import { Html5Qrcode } from "html5-qrcode";

export default function MealPlate({
  user,
  setTab,
}: {
  user: any;
  setTab: (t: string) => void;
}) {
  const [plate, setPlate] = useState<PlateItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [onlineResults, setOnlineResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [communityProducts, setCommunityProducts] = useState<Product[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Wszystko");
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
          ...doc.data(),
        })) as Product[],
      );
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  const allLocalRaw = [...customProducts, ...communityProducts, ...LIB_BASE];
  const allLocal = Array.from(
    new Map(
      allLocalRaw
        .filter((item) => item && item.name)
        .map((item) => [item.name.toLowerCase(), item]),
    ).values(),
  );
  const browseResults = allLocal.filter((p) => {
    const matchesSearch =
      searchTerm.length < 2 ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      activeCategory === "Wszystko" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const performOnlineSearch = async (query: string) => {
    if (query.length < 3 || isSearching) return;
    setIsSearching(true);
    setSearchError(null);
    setOnlineResults([]);
    try {
      // 1. Zobaczmy najpierw czy jest w darmowej bazie OpenFoodFacts (nie AI)
      try {
        const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`;
        const offRes = await fetch(offUrl);
        const offData = await offRes.json();
        
        if (offData.products && offData.products.length > 0) {
          const validOffProducts = offData.products.filter((p: any) => p.nutriments && (p.nutriments.carbohydrates_100g || p.nutriments.proteins_100g || p.nutriments.fat_100g)).map((p: any) => ({
            id: p._id || `off_${Date.now()}_${Math.random()}`,
            name: p.product_name_pl || p.product_name || "Nieznany Produkt",
            carbs: Number(p.nutriments.carbohydrates_100g || 0),
            protein: Number(p.nutriments.proteins_100g || 0),
            fat: Number(p.nutriments.fat_100g || 0),
            gi: 50, // Domyślne IG jeśli brak
            category: "Baza Sieciowa"
          }));

          if (validOffProducts.length > 0) {
            setOnlineResults(
              validOffProducts.map((p: any, i: number) => ({
                ...p,
                isOnline: true,
                isDatabase: true // to show it's from OFF, not AI
              }))
            );
            setIsSearching(false);
            return; // Sukces z darmowej bazy, koniec
          }
        }
      } catch (offError) {
        console.warn("OpenFoodFacts search failed, continuing to AI:", offError);
      }

      // 2. Jeśli brakuje kodu kreskowego / bazy OFF nic nie ma to odpalamy AI na zapas
      const prompt = `Jesteś dietetykiem. Przeanalizuj zapytanie użytkownika: "${query}". Może to być nazwa produktu ze sklepu, danie domowe (np. "pierogi ruskie", "leczo"), owoc, warzywo lub konkretna marka. 
      Zwróć listę pasujących produktów w formacie JSON (tylko JSON, bez markdown). 
      Format: [{"name": string, "carbs": number, "protein": number, "fat": number, "gi": number}]. 
      Podaj wartości na 100g produktu lub na standardową porcję (zaznacz to w nazwie, np. "Jabłko (średnie)"). 
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
      if (resultsArray.length === 0) {
        setSearchError("Nie znaleziono produktów spełniających kryteria.");
      }
    } catch (e) {
      console.error("AI Search failed:", e);
      const errStr = String(e);
      if (errStr.includes("API key not valid") || errStr.includes("API_KEY_INVALID")) {
         setSearchError("Nieprawidłowy klucz API.");
      } else if (errStr.includes("zajęte")) {
         setSearchError("Serwery AI są obecnie przeciążone. Spróbuj później.");
      } else {
         setSearchError("AI nie mogło znaleźć wyników dla tego zapytania. Spróbuj sformułować je inaczej.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleOnlineSearch = () => performOnlineSearch(searchTerm);

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
          gi: product.gi || 50,
          category: "Z Sieci",
        },
      );
      alert(`Zapisano ${product.name} do bazy produktów.`);
    } catch (e) {
      console.error(e);
      alert("Błąd zapisu.");
    }
  };

  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
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
    setSelectedProduct(product);
    setWeightInput("100");
    setIsWeightModalOpen(true);
  };

  const handleWeightSubmit = () => {
    if (selectedProduct && weightInput) {
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
      ${JSON.stringify(plate)}
      
      Zwróć szczegółową analizę w czytelnym formacie HTML (używaj <b>, <ul>, <li>, <br>, ale ZABRANIAM używania markdown, w szczególności gwazdek).
      
      Uwzględnij:
      1. <b>Profil Wchłaniania</b>: Oceń przybliżony Indeks Glikemiczny (IG) zestawu i jak obecność białek/tłuszczy opóźni wchłanianie cukrów. Wskaż produkty, które mogą powodować późniejsze skoki glikemii (efekt pizzy/tłuszczu).
      2. <b>Rekomendacja Bolusa (w tym WBT)</b>: Zaleć typ bolusa (np. prosty, złożony, przedłużony). Jeśli posiłek ma dużo WW i WBT, określ ile % insuliny podać od razu, a ile przedłużyć na ile godzin. Wspomnij o pre-bolusie jeśli jest wymagany (szybkie węglowodany).
      3. <b>Ostrzeżenia</b>: Krótko (1 zdanie) na co uważać w ciągu najbliższych kilku godzin w związku z trwającym wchłanianiem tego konkretnego posiłku.
      
      Odpowiedź ma być konkretna, rzetelna i pomocna w codziennym prowadzeniu glikemii.`;
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
          timestamp: Date.now(),
        },
      );
      setIsSaveModalOpen(false);
      setMealName("");
      alert("Zestaw zapisany!");
    } catch (e) {
      console.error(e);
    }
  };

  const addSavedMeal = (meal: any) => {
    setPlate([...plate, ...meal.items]);
    alert(`Dodano zestaw: ${meal.name}`);
  };

  const updateWeight = (idx: number, weight: number) => {
    const newPlate = [...plate];
    const item = newPlate[idx];
    newPlate[idx] = {
      ...item,
      weight,
      carbs: (item.carbs / item.weight) * weight,
      protein: ((item.protein || 0) / item.weight) * weight,
      fat: ((item.fat || 0) / item.weight) * weight,
    };
    setPlate(newPlate);
  };

  const addToPlate = (product: Product, weight: number = 100) => {
    setPlate([
      ...plate,
      {
        ...product,
        weight,
        carbs: (product.carbs * weight) / 100,
        protein: ((product.protein || 0) * weight) / 100,
        fat: ((product.fat || 0) * weight) / 100,
      },
    ]);
    // Don't clear search automatically so user can add more
  };

  const removeFromPlate = (idx: number) => {
    setPlate(plate.filter((_, i) => i !== idx));
  };

  const totalCarbs = plate.reduce((s, i) => s + i.carbs, 0);
  const totalProtein = plate.reduce((s, i) => s + (i.protein || 0), 0);
  const totalFat = plate.reduce((s, i) => s + (i.fat || 0), 0);
  const totalWW = totalCarbs / 10;
  const totalWBT = (totalProtein * 4 + totalFat * 9) / 100;

  const handleLogMeal = async () => {
    if (!user || plate.length === 0) return;
    try {
      await addDoc(
        collection(db, "artifacts", "diacontrolapp", "users", getEffectiveUid(user), "logs"),
        {
          type: "meal",
          value: totalCarbs,
          protein: totalProtein,
          fat: totalFat,
          timestamp: new Date(entryTime).getTime(),
          description: plate.map((i) => i.name).join(", "),
        },
      );
      setPlate([]);
      alert("Posiłek zapisany w dzienniku.");
    } catch (e) {
      console.error(e);
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
      console.error("Speech recognition error", event.error);
      if (event.error === "not-allowed") {
        alert(
          "Brak dostępu do mikrofonu. Upewnij się, że udzieliłeś uprawnień.",
        );
      }
      setIsListening(false);
    };
  };

  const startScanner = () => {
    setIsScannerOpen(true);
    setTimeout(() => {
      const element = document.getElementById("reader");
      if (!element) return;

      const html5QrCode = new Html5Qrcode("reader");
      html5QrCode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            console.log(`Scan result: ${decodedText}`);
            await html5QrCode.stop();
            setIsScannerOpen(false);

            setIsSearching(true);
            try {
              // Try Open Food Facts first for real data
              const response = await fetch(
                `https://world.openfoodfacts.org/api/v2/product/${decodedText}.json`,
              );
              const data = await response.json();

              if (data.status === 1 && data.product) {
                const p = data.product;
                const product: Product = {
                  id: `scan_${Date.now()}`,
                  name: p.product_name || "Produkt nieznany",
                  carbs: p.nutriments?.carbohydrates_100g || 0,
                  protein: p.nutriments?.proteins_100g || 0,
                  fat: p.nutriments?.fat_100g || 0,
                  gi: 50, // Default GI
                  category: "Skanowane",
                };
                openWeightModal(product);
                setIsSearching(false);
              } else {
                // Fallback to AI search with the EAN
                setSearchTerm(decodedText);
                setIsSearching(false);
                await performOnlineSearch(decodedText);
              }
            } catch (err) {
              console.error("Barcode data fetch error:", err);
              setSearchTerm(decodedText);
              setIsSearching(false);
              await performOnlineSearch(decodedText);
            }
          },
          (errorMessage) => {},
        )
        .catch((err) => console.error("Scanner failed:", err));
    }, 100);
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
              <div
                id="reader"
                className="w-full aspect-square rounded-[2rem] overflow-hidden bg-slate-800 mb-2"
              ></div>
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

      <div className="px-1">
        <h2 className="text-xl font-black dark:text-white mb-2">
          Buduj swój posiłek
        </h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
          Wyszukaj produkty i dodaj je do talerza
        </p>
      </div>

      {/* Search & Browser */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Wyszukaj produkt / danie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 p-5 pl-14 pr-14 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-sm font-bold dark:text-white outline-none focus:border-accent-500 transition-all shadow-sm"
            />
            <button
              onClick={startVoiceSearch}
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${isListening ? "bg-rose-500 text-white animate-pulse" : "text-slate-400 hover:text-accent-500 hover:bg-accent-50 dark:hover:bg-accent-900/30"}`}
              title="Wyszukiwanie głosowe"
            >
              <Mic size={18} />
            </button>
          </div>
          <button
            onClick={handleOnlineSearch}
            className="bg-accent-600 text-white p-5 rounded-[1.5rem] shadow-lg active:scale-95 flex items-center justify-center min-w-[64px] transition-all"
            title="Szukaj w Sieci"
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Globe size={24} />
            )}
          </button>
          <button
            onClick={() => {
              const elem = document.getElementById("meal-photo-input");
              if (elem) elem.click();
            }}
            className="bg-emerald-600 text-white p-5 rounded-[1.5rem] shadow-lg active:scale-95 flex items-center justify-center min-w-[64px] transition-all"
            title="Zrób zdjęcie (Analiza AI)"
          >
            {isAnalyzing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Camera size={24} />
            )}
          </button>
          <button
            onClick={startScanner}
            className="bg-slate-800 text-white p-5 rounded-[1.5rem] shadow-lg active:scale-95 transition-all"
          >
            <Scan size={24} />
          </button>
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
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveCategory("Wszystko")}
            className={`shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === "Wszystko" ? "bg-accent-600 text-white shadow-lg" : "bg-white dark:bg-slate-900 text-slate-400 dark:border dark:border-slate-800"}`}
          >
            Wszystko
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? "bg-accent-600 text-white shadow-lg" : "bg-white dark:bg-slate-900 text-slate-400 dark:border dark:border-slate-800"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="max-h-[400px] overflow-y-auto pr-1 space-y-2 scrollbar-none">
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
                            W: {Number(p.carbs || 0).toFixed(1).replace(/\.0$/, "")}g | B: {Number(p.protein || 0).toFixed(1).replace(/\.0$/, "")}g | T: {Number(p.fat || 0).toFixed(1).replace(/\.0$/, "")}g
                          </span>
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded font-black text-[8px]",
                              p.gi && p.gi <= 55
                                ? "bg-emerald-500/10 text-emerald-500"
                                : p.gi && p.gi < 70
                                  ? "bg-amber-500/10 text-amber-500"
                                  : "bg-rose-500/10 text-rose-500",
                            )}
                          >
                            IG: {p.gi || "??"}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-accent-300" />
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

          <div className="flex justify-between items-center px-4 gap-2 mb-2">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Wybierz z bazy
            </h4>
            {searchTerm.length > 2 && (
              <button
                onClick={handleOnlineSearch}
                className="text-[9px] font-black text-accent-500 uppercase tracking-widest flex items-center gap-1 group"
              >
                {isSearching ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <Globe size={12} />
                )}
                Szukaj w Sieci
              </button>
            )}
          </div>

          {browseResults.length > 0 ? (
            <div className="grid gap-2 will-change-transform">
              <AnimatePresence>
                {browseResults.slice(0, 50).map((p, i) => (
                  <motion.button
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                    key={i}
                    onClick={() => openWeightModal(p)}
                    className="w-full bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-left hover:border-accent-500 transition-colors shadow-sm"
                  >
                    <div>
                      <div className="font-black text-xs dark:text-white flex items-center gap-2">
                        {p.name}
                        {p.id?.startsWith("custom_") && (
                          <span className="bg-amber-500/10 text-amber-500 text-[8px] px-1.5 py-0.5 rounded border border-amber-500/20">
                            Twoje
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                        <span>
                          W: {Number(p.carbs || 0).toFixed(1).replace(/\.0$/, "")}g | B: {Number(p.protein || 0).toFixed(1).replace(/\.0$/, "")}g | T: {Number(p.fat || 0).toFixed(1).replace(/\.0$/, "")}g
                        </span>
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded font-black text-[8px]",
                            p.gi && p.gi <= 55
                              ? "bg-emerald-500/10 text-emerald-500"
                              : p.gi && p.gi < 70
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-rose-500/10 text-rose-500",
                          )}
                        >
                          IG: {p.gi || "??"}
                        </span>
                      </div>
                    </div>
                    <Plus
                      size={16}
                      className="text-accent-500 bg-accent-50 dark:bg-accent-900/50 p-1 rounded-lg w-6 h-6"
                    />
                  </motion.button>
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

      {/* Plate Stats */}
      {plate.length > 0 && (
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
                if (confirm("Czy na pewno chcesz wyczyścić talerz?"))
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
                  key={`${item.id}-${idx}`}
                >
                  <SwipeableItem
                    id={`${item.id}-${idx}`}
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
                          {item.carbs.toFixed(1)}g
                        </div>
                        <div
                          className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                            item.gi && item.gi <= 55
                              ? "bg-emerald-500/20 text-emerald-400"
                              : item.gi && item.gi < 70
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-rose-500/20 text-rose-400",
                          )}
                        >
                          IG: {item.gi || "??"}
                        </div>
                      </div>
                    </div>
                  </SwipeableItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          <div className="grid grid-cols-2 gap-4 mb-6 border-t border-white/10 pt-4">
            <div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                Wymienniki WW
              </span>
              <span className="text-2xl font-black text-accent-400">
                {totalWW.toFixed(1)}
                <span className="text-xs font-bold opacity-30 ml-1">WW</span>
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
            <div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                Węglowodany
              </span>
              <span className="text-xl font-black text-accent-300">
                {totalCarbs.toFixed(1)}
                <span className="text-xs font-bold opacity-30 ml-1">g</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1 block">
                Białko + Tłuszcz
              </span>
              <span className="text-xl font-black text-emerald-400">
                {(totalProtein + totalFat).toFixed(1)}
                <span className="text-xs font-bold opacity-30 ml-1">g</span>
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
                carbs: totals.carbs,
                protein: totals.protein,
                fat: totals.fat,
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

      {savedMeals.length > 0 && (
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
