
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Loader2, Check } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { MealScanner } from './BarcodeScanner';
import { Product } from '../../types';
import { cn } from "../../lib/utils";
import { Haptics } from "../../lib/haptics";
import { geminiService } from "../../services/gemini";
import toast from "react-hot-toast";

export const MealPlateModals = (props: any) => {
 const { t } = useTranslation();
 const {
 labelFileInputRef, setIsAnalyzingLabel, unrecognizedBarcode, 
 setUnrecognizedBarcode, openWeightModal, isAnalyzingLabel,
 isScannerOpen, handleCloseScanner, scannerRef, customProducts,
 setIsSearching, isWeightModalOpen, setIsWeightModalOpen,
 selectedProduct, weightInput, setWeightInput, handleWeightSubmit,
 isShortcutConfirmModalOpen, shortcutToConfirm, setIsShortcutConfirmModalOpen,
 shortcutWeight, setShortcutWeight, handleShortcutConfirm,
 isSaveModalOpen, setIsSaveModalOpen, mealName, setMealName, saveMealSet,
 expandedMeal, setExpandedMeal, plate, setPlate, setCookingMethod,
 mergeCandidates, handleMergeMeal, handleLogMeal, setMergeCandidates,
 getProductName, setIsScannerOpen
 } = props;

 return createPortal(
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
 key={c.id || Math.random().toString()}
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
 );
};
