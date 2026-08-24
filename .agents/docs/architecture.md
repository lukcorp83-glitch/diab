# Mapa Architektury GlikoControl

Ten dokument służy optymalizacji pamięci (tokenów) sztucznej inteligencji. Zamiast szukać po plikach, szukaj informacji tutaj.

## Główne pliki i komponenty
- `src/App.tsx` (ogromny plik ~3400 linii) - Główny punkt wejścia, główny layout, zarządzanie routingiem i duża część logiki UI.
- `src/constants.ts` - Główne stałe, w tym `APP_VERSION` ('6.0.25'), adresy URL oraz bazy produktów.
- `src/constants/versions.ts` - Logika wersji (PWA, APK), definicje okien z historią nowości (`whatsNew`). Zaktualizowano do v6.0.25.

## Główne Widżety Pulpitu i Nowy Design System
- `src/components/dashboard/widgets/SavedMealsWidget.tsx` - Nowy horyzontalny widżet „Zapisane Posiłki & Przepisy” na Pulpicie: przewijany stos kart ze szklistym tłem (*glassmorphism*), badge'ami diet, szczegółowymi makroskładnikami (W, B, T, kcal), 1-Click wrzucaniem całego dania na Talerz oraz pełnym modalem podglądu przepisu kulinarnego wprost z Pulpitu.
- `src/components/dashboard/widgets/ShortcutsWidget.tsx` - Uporządkowany kafelek „Szybkie skróty” (dawniej „Szybkie akcje i ulubione posiłki”) z natychmiastowym 1-Click zapisem zdefiniowanych ulubionych posiłków.
- `src/components/MealPlate/ProductSearch.tsx` & `src/components/FoodDatabase.tsx` - Nowy inteligentny algorytm wyszukiwania w bazie żywności: normalizacja znaków diakrytycznych (s/ś, c/ć, l/ł itp.), scoring prefiksowy (faworyzowanie słów zaczynających się od frazy) oraz pełna widoczność bazy od A do Ż.
- `src/components/DailyTirWidget.tsx` - Wizualny widżet Dziennego TIR: radialny pierścień z neonowym blaskiem na segmencie normy (`emerald-glow`), torem zegarowym (`background track`), plakietką sukcesu `≥70%` oraz trójkolorowymi kapsułkami zakresów (`<70`, `70-180`, `>180`).
- `src/components/SiteRotationWidget.tsx` - Nowy Smart Rotation Ring (Koncepcja 2): minimalistyczna tarcza zegarowa z łukiem cyklu rotacji, czytelną nazwą aktywnej strefy i nowoczesną pigułką następnego miejsca bez zbędnych grafik.
- `src/hooks/useGlucoseAlerts.ts` & `src/services/notificationService.ts` - Zoptymalizowany system powiadomień i alertów glikemii z trwałą pamięcią `localStorage`, natywnym głośnym dźwiękiem systemowym Androida (`sound: 'default'`) i spójną drzemką/wyciszaniem.

## GlikoSense oraz Integracja z Gemini API
- `src/services/gemini.ts` - Główny serwis obsługujący komunikację z Google Gemini API (`GoogleGenAI`).
  - `getApiKey()` - Pobiera klucz z `SecureStoragePlugin` (`gemini_api_key`), zmiennych env lub proxy Worker.
  - `resetClient()` - Czyści skacheksowaną instancję klienta SDK po zmianie klucza.
  - `testConnection(customKey?)` - Wykonuje testowy prompt do API Gemini w celu empirycznej weryfikacji poprawności klucza.
  - `getAiStatus()` - Zwraca obiekt `{ type, label, color }` określający aktywne źródło klucza (Local Custom / Proxy / Vite Env).
- `src/components/MLAnalysisWidget.tsx` - Główny widżet UI analizy GlikoSense wyświetlany na pulpicie.
- `src/services/mlSugarAnalyzer.ts` - Serwis zarządzający modelami ML, logiką TensorFlow.js oraz eksportem/importem plików modelu. Posiada zabezpieczenia timeoutu (15s/45s) oraz bezawaryjny fallback (`.catch`) w przypadku zatrzymania Workera.
- `src/workers/glikosense.worker.ts` - Web Worker używany w tle do trenowania modeli oraz wyliczania predykcji. Używa stabilnego backendu `cpu` w wątku Workera, zapobiegając zacinaniu się przy braku plików WASM/WebGL.

## Zarządzanie Sprzętem, Apteczką i Wydajnością Wkłuć
- `src/services/infusionAnalysisService.ts` - Serwis analityczny badający degradację wchłaniania insuliny w zależności od wieku kaniuli (Doba 1 vs Doba 2 vs Doba 3+). Wylicza procentową sprawność kaniuli, średni czas powrotu do normy, optymalną długość noszenia wkłucia oraz detektor ryzyka niedrożności / zagięcia kaniuli (occlusion alert przy nieskutecznych bolusach korekcyjnych).
- `src/components/InfusionPerformanceWidget.tsx` - Karta analityczna wydajności wkłucia wyświetlana w module Raportów AI (`AiReports.tsx`), prezentująca wiek bieżącego wkłucia, szacowaną sprawność wchłaniania, porównanie kolejnych dób i wnioski GlikoSense AI.
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
- `src/components/app/DynamicActionCapsule.tsx` - Pigułka akcji głównej na dolnym pasku nawigacji. Obsługuje płynną animację morphingu poziomego (`springTransition`): (1) domyślny okrągły przycisk talerza / ostrzeżenie o sprzęcie (<2h), (2) pomarańczową pigułkę wchłaniania węglowodanów z postępem, (3) czerwoną rozwijaną pigułkę Hipoglikemii przy cukrze <70 mg/dL, (4) rozwijany poziomo baner oczekującego posiłku `+Xg Węglowodanów` z przyciskiem `AI / Baza` oraz krzyżykiem `✕` do pominięcia.
- `src/components/UnlinkedCarbsWidget.tsx` - Asystent przypisywania potraw do bolusa (baza produktów, szybkie propozycje AI, generator makroskładników Gemini z przyciskiem Sparkles oraz ręczny Talerz). Obsługuje tryb modalny (`isModal`) renderowany przez portal z zamykaniem tłem i krzyżykiem.
- `src/components/dashboard/widgets/QuickBolusWidget.tsx` - Inteligentny kafel Bolusa na pulpicie. Gdy cukier przekracza cel i IOB nie pokrywa hiperglikemii, kafel automatycznie podświetla sugerowaną dawkę korekty (np. `+1.5 j.` z uwzględnieniem IOB i ISF). Jedno kliknięcie natychmiast przenosi do kalkulatora z wpisanym cukrem i dawką.
- `src/components/ModernQRCard.tsx` - Stylowy moduł renderowania kodów QR w estetyce Android 14 Material You / Quick Share (zaokrąglone narożniki, celowniki skanera, centralne logo z korekcją błędów Level H, dynamiczny licznik odliczania czasu). Używany w `DevicePairing.tsx` i `SettingsSync.tsx`.

## Architektura Bazy Danych i Synchronizacja (Jedno Źródło Prawdy)
- Nowa kanoniczna ścieżka Firestore: `users/{uid}/...` (settings/profile, logs, pet/status, syncPackage).
- Usunięto przestarzałe fallbacki i pętle re-migracji ze starej bazy `artifacts/diacontrolapp/users/{uid}/...`, które powodowały przywracanie starych stanów magazynu apteczki (liczby wkłuć/zbiorniczków) oraz starych logów bez nazw posiłków.
- Zunifikowano parsowanie zabiegów Nightscout (`nightscout.ts` i `nightscout.worker.ts`) – wyciągane są nazwy potraw z `t.food`, `t.description` i `t.notes`, a deduplikacja w `App.tsx` zabezpiecza przed nadpisywaniem nazwanych posiłków przez puste wpisy z pompy.
- **Trwała pamięć Local-First (SQLite + Nightscout + Firestore)**: W `App.tsx` usunięto błędne kasowanie wpisów z lokalnej bazy SQLite przy pustym `fbLogs`. Dodano automatyczny zapis partii danych z Nightscout i chmury do lokalnego SQLite, a w `StatisticsView.tsx` zintegrowano uniwersalny parser formatów (`glucose`/`sgv`/`cgm`, `bolus`/`insulin`, `meal`/`carbs`), gwarantując pełne statystyki dla wszystkich historycznych dni.
- **Automatyczna dzienna paczka synchronizacyjna (`syncPackage/latest`)**: W `App.tsx` dodano automatyczny cykl zapasowy (24h w tle) wywołujący `uploadCloudPackage(user, userSettings)`, który kompresuje do 60 000 logów, profil oraz wagi sieci neuronowej GlikoSense do skompresowanego pakietu w Firestore, gwarantując codzienne zabezpieczenie danych bez konieczności ręcznego klikania.
- **Program Testów Beta OTA (`ProfileSystem.tsx`)**: Przeniesiono przełącznik kanału Beta z sekcji Integracji bezpośrednio do `Ustawienia -> System & Aplikacja`. Karta posiada wyróżnione oznaczenie, animowany badge statusu, natychmiastową synchronizację profilu w chmurze i `localStorage`, oraz wyraźne ostrzeżenie o możliwej niestabilności wersji testowych.

## Moduł Monitorowania i Wydajności Wkłucia (Infusion Performance & Live Cannula)
- `src/services/infusionAnalysisService.ts` - Serwis analizujący na żywo **aktualnie założone wkłucie** (od momentu ostatniej wymiany `site_change` lub `settings.infusionSetChangeDate`). Wylicza dokładny wiek w godzinach i dobach, czas do zalecanej wymiany (72h), liczbę podanych bolusów, średni cukier od wymiany oraz procentową sprawność wchłaniania insuliny. Posiada wbudowany detektor okluzji/zagięcia (ostrzega przy >=2 bolusach korekcyjnych w ostatnich 2h bez spadku glikemii).
- `src/components/InfusionPerformanceWidget.tsx` - Kompaktowy widżet w Raportach AI / GlikoSense. Prezentuje:
  1. Główne podsumowanie: wiek kaniuli, kolorowy pasek i procent sprawności wchłaniania (`currentEfficiency%`), liczbę bolusów, średni cukier i czas do wymiany.
  2. Rozwijaną sekcję etapów (`AnimatePresence` / akordeon ze stanem `isExpanded`): kafelki 4 dób cyklu (Doba 1 aktywna, Doby 2-4 zablokowane/oczekujące) oraz rekomendację AI.
- `src/services/siteRotationService.ts` - Serwis inteligentnej rotacji 10 stref anatomicznych ciała. Analizuje czas odpoczynku każdej strefy (`daysSinceLastUse`), klasyfikuje stan regeneracji tkanek (Wypoczęta >14 dni, W regeneracji 4-14 dni, Zmęczona <4 dni), generuje rekomendację kolejnego optymalnego miejsca (`getNextRecommendedSite`) z rotacją stron i uwzględnieniem preferencji pacjenta (`allowedInfusionSites`) oraz ochroną przed kolizją z sensorem CGM. Posiada detektor ryzyka zrostów tłuszczowych (lipohipertrofii).
- `src/components/SiteRotationModal.tsx` & `src/components/SiteRotationWidget.tsx` - Interaktywny pulpit i modal rotacji wkłuć. Prezentuje sylwetkę 2D z przełącznikiem Przód/Tył, kolorową mapą regeneracji, wskaźnikiem obecnego wkłucia oraz pulsującym znacznikiem kolejnego polecanego miejsca, 1-click wymianą wkłucia (z automatycznym odliczeniem z apteczki) oraz konfiguratorem dozwolonych stref pacjenta.

