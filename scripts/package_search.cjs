const fs = require('fs');

const extracted = fs.readFileSync('extracted_search.tsx', 'utf8');
const parts = extracted.split('\n\n');
const funcs = parts[0];
const ui = parts.slice(1).join('\n\n');

const componentContent = `import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2, Globe, Camera, Scan, X, Mic, Plus, Info, Scale } from "lucide-react";
import { Haptics } from "../../lib/haptics";
import { useMealPlateStore } from "../../stores/useMealPlateStore";
import { Product } from "../../types/product";
import { getProductName, calculateCarbs } from "../../utils/productUtils";
import { geminiService } from "../../services/gemini";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { db, auth } from "../../services/firebase";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { getEffectiveUid } from "../../utils/authUtils";
import { AnimatePresence, motion } from "framer-motion";
import i18n from "../../i18n";

interface ProductSearchProps {
  openWeightModal: (product: Product) => void;
  openShortcutConfirmModal: (product: Product) => void;
  startScanner: () => void;
  startCameraAnalysis: () => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (val: boolean) => void;
  searchError: string | null;
  setSearchError: (val: string | null) => void;
  allLocal: Product[];
  activeDiet: string | null;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  openWeightModal,
  openShortcutConfirmModal,
  startScanner,
  startCameraAnalysis,
  isAnalyzing,
  setIsAnalyzing,
  searchError,
  setSearchError,
  allLocal,
  activeDiet
}) => {
  const { t } = useTranslation();
  const [user] = useAuthState(auth);
  
  const {
    searchTerm, setSearchTerm,
    onlineResults, setOnlineResults,
    isSearching, setIsSearching,
    customProducts, communityProducts
  } = useMealPlateStore();

  const [isListening, setIsListening] = useState(false);
  const [shortcutToConfirm, setShortcutToConfirm] = useState<Product | null>(null);
  const [shortcutWeight, setShortcutWeight] = useState("100");
  const [isShortcutConfirmModalOpen, setIsShortcutConfirmModalOpen] = useState(false);

  const getDietBadge = (product: Product, activeDiet: string | null) => {
    if (!activeDiet) return null;
    let isGood = false;
    let badge = "";
    if (activeDiet === "Keto") {
      isGood = product.carbs < 5;
      badge = isGood ? "Keto-friendly" : "High Carbs";
    } else if (activeDiet === "Low-Carb") {
      isGood = product.carbs < 15;
      badge = isGood ? "Low-Carb" : "High Carbs";
    } else if (activeDiet === "Low-GI") {
      isGood = (product.gi || 50) < 55;
      badge = isGood ? "Low-GI" : "High-GI";
    }
    if (!badge) return null;
    return (
      <span className={\`text-[9px] px-1.5 py-0.5 rounded-md font-bold \${isGood ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"}\`}>
        {badge}
      </span>
    );
  };

  const startVoiceSearch = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error(i18n.t("auto.brak_obslugi_rozpoznawania_g", { defaultValue: "Brak obsługi rozpoznawania głosu." }));
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "pl-PL";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => { setIsListening(true); Haptics.light(); };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      performOnlineSearch(transcript);
    };
    recognition.onerror = () => { setIsListening(false); toast.error("Błąd rozpoznawania głosu."); };
    recognition.onend = () => setIsListening(false);
    try { recognition.start(); } catch (e) { setIsListening(false); }
  };

${funcs}

  const browseResults = useMemo(() => {
    return allLocal.filter((p) => {
      const matchesSearch =
        searchTerm.length < 2 ||
        getProductName(p, i18n.language).toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    }).slice(0, 50);
  }, [allLocal, searchTerm, i18n.language]);

  return (
    <>
${ui}
    </>
  );
};
`;

if (!fs.existsSync('src/components/MealPlate')) fs.mkdirSync('src/components/MealPlate');
fs.writeFileSync('src/components/MealPlate/ProductSearch.tsx', componentContent);

let mealPlate = fs.readFileSync('src/components/MealPlate.tsx', 'utf8');

// The replacement props
const replacementProps = '<ProductSearch \n' +
'  openWeightModal={openWeightModal}\n' +
'  openShortcutConfirmModal={openShortcutConfirmModal}\n' +
'  startScanner={startScanner}\n' +
'  startCameraAnalysis={startCameraAnalysis}\n' +
'  isAnalyzing={isAnalyzing}\n' +
'  setIsAnalyzing={setIsAnalyzing}\n' +
'  searchError={searchError}\n' +
'  setSearchError={setSearchError}\n' +
'  allLocal={allLocal}\n' +
'  activeDiet={activeDiet}\n' +
'/>';

mealPlate = mealPlate.replace(funcs, '');
mealPlate = mealPlate.replace(ui, replacementProps);
// also add import at top of mealplate
mealPlate = mealPlate.replace('import { BarcodeScanner } from "./MealPlate/BarcodeScanner";', 'import { BarcodeScanner } from "./MealPlate/BarcodeScanner";\nimport { ProductSearch } from "./MealPlate/ProductSearch";');

fs.writeFileSync('src/components/MealPlate.tsx', mealPlate);
console.log('Successfully written ProductSearch.tsx and modified MealPlate.tsx');
