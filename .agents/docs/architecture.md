# Mapa Architektury GlikoControl

Ten dokument służy optymalizacji pamięci (tokenów) sztucznej inteligencji. Zamiast szukać po plikach, szukaj informacji tutaj.

## Główne pliki i komponenty
- `src/App.tsx` (ogromny plik ~3400 linii) - Główny punkt wejścia, główny layout, zarządzanie routingiem i duża część logiki UI.
- `src/constants.ts` - Główne stałe, w tym `APP_VERSION` ('6.0.19'), adresy URL oraz bazy produktów.
- `src/constants/versions.ts` - Logika wersji (PWA, APK), definicje okien z historią nowości (`whatsNew`). Zaktualizowano do v6.0.19.

## GlikoSense oraz Integracja z Gemini API
- `src/services/gemini.ts` - Główny serwis obsługujący komunikację z Google Gemini API (`GoogleGenAI`).
  - `getApiKey()` - Pobiera klucz z `SecureStoragePlugin` (`gemini_api_key`), zmiennych env lub proxy Worker.
  - `resetClient()` - Czyści skacheksowaną instancję klienta SDK po zmianie klucza.
  - `testConnection(customKey?)` - Wykonuje testowy prompt do API Gemini w celu empirycznej weryfikacji poprawności klucza.
  - `getAiStatus()` - Zwraca obiekt `{ type, label, color }` określający aktywne źródło klucza (Local Custom / Proxy / Vite Env).
- `src/components/MLAnalysisWidget.tsx` - Główny widżet UI analizy GlikoSense wyświetlany na pulpicie.
- `src/services/mlSugarAnalyzer.ts` - Serwis zarządzający modelami ML, logiką TensorFlow.js oraz eksportem/importem plików modelu. Posiada zabezpieczenia timeoutu (15s/45s) oraz bezawaryjny fallback (`.catch`) w przypadku zatrzymania Workera.
- `src/workers/glikosense.worker.ts` - Web Worker używany w tle do trenowania modeli oraz wyliczania predykcji. Używa stabilnego backendu `cpu` w wątku Workera, zapobiegając zacinaniu się przy braku plików WASM/WebGL.

## Zarządzanie Sprzętem, Apteczką i Pojemnością Zbiorniczka
- `src/components/Profile/ProfileInventory.tsx` - Moduł Apteczki i Zapasów z polskimi nazwami kategorii oraz własną pojemnością zbiorniczka.
- `src/components/PumpStatusCard.tsx` - Kafel statusu pompy i zbiorniczka z dynamiczną animacją.
- `src/components/SmartEquipmentModal.tsx` - Modal potwierdzenia Smart Equipment. Przy wykryciu zmiany pompy/zbiorniczka pyta, czy wymieniono sam zbiorniczek, czy również wkłucie.
- `src/App.tsx` - Wyświetla `SmartEquipmentModal` i natychmiast odejmuje odpowiednie elementy (zbiorniczki `reservoirs`, wkłucia `infusion_sets` oraz sensory `sensors`) z apteczki `inventory` użytkownika.

- `src/components/nutrition/GlikoSenseNutriView.tsx` & `src/components/FoodDatabase.tsx` - Poprawiono widoczność opcji sortowania w rozwijanym menu `<select>`. Dodano jawne style tła i koloru tekstu (`bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold`) dla każdego elementu `<option>`, dzięki czemu wszystkie nazwy trybów sortowania są czytelne i widoczne przez cały czas, a nie dopiero po najechaniu kursorem.
- `src/components/nutrition/NutritionHub.tsx` - Kontener Centrum Żywienia z widokami Talerza, Diet, Historii i Odżywiania.
- `src/components/nutrition/GlikoSenseNutriView.tsx` - Widok statystyk tolerancji potraw. Dodano pełny wybór opcji sortowania (tolerancja rosnąco/malejąco, częstotliwość, szczyt cukru oraz alfabet A-Z).
- `src/components/nutrition/DietSpecificWidgets.tsx` - Widżety danych dedykowane dla każdej diety.

## Skanery Kodów Kreskowych i Nawigacja Menu Dolnego
- `src/components/MealPlate/BarcodeScanner.tsx` - Komponent `MealScanner` (ML Kit / Html5Qrcode). Używa `useRef` dla `onResult`/`onCancel`, zapobiegając zapętlaniu skanera przy re-renderach.
- `src/components/MealPlate/MealPlateModals.tsx` - Kontener modali (w tym skanera) montowany bezwarunkowo w `MealPlate.tsx` (działa w zakładkach `meal` i `database`).
- `src/components/app/AppContent.tsx` - Ładowanie zakładek z prefetchowaniem modułów w tle po 1.5s od startu.
- `src/components/app/AppLayout.tsx` - Układ dolnego paska nawigacji z animacją `AnimatePresence mode="popLayout"`. Renderuje `DynamicActionCapsule` pośrodku.
- `src/components/app/DynamicActionCapsule.tsx` - Pigułka akcji głównej. Zastąpiła statyczną ikonę `Utensils` oraz stary widget `LowGlucoseMealAlert`. Obsługuje 3 stany: (1) domyślny przycisk talerza, (2) pomarańczową pigułkę wchłaniania węglowodanów, (3) czerwoną, rozwijaną pigułkę Hipoglikemii wyświetlającą szybkie skróty ratunkowe.
