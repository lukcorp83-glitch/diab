# Mapa Architektury GlikoControl

Ten dokument służy optymalizacji pamięci (tokenów) sztucznej inteligencji. Zamiast szukać po plikach, szukaj informacji tutaj.

## Główne pliki i komponenty
- `src/App.tsx` - Główny punkt wejścia, główny layout, zarządzanie routingiem i trwałym zapisem logów do SQLite (`dbService.addLog`).
- `src/constants.ts` - Główne stałe, w tym `APP_VERSION` ('6.0.30'), adresy URL oraz bazy produktów.
- `src/constants/versions.ts` - Logika wersji (PWA, APK), definicje okien z historią nowości (`whatsNew`). Zaktualizowano do v6.0.30.
- `src/components/GlucoseChart.tsx` - Wdrożono dynamiczną pigułkę aktualnego cukru na prawej krawędzi (styl Dexcom/TradingView) ze 100% zachowaniem pełnej szerokości wykresu.
- `src/services/preBolusService.ts` & `android/app/src/main/java/com/glikocontrol/app/NightscoutFetcher.java` - Automatyczny stoper przedposiłkowy na pasku stanu Androida odliczający sekunda po sekundzie z generatorem pigułki graficznej (`createPillBadgeBitmap`) i wyeliminowanymi różnicami stref czasowych.
- `src/components/GlikoTraining.tsx` & `src/components/Dashboard.tsx` - Poprawiono zatrzymywanie treningu z poziomu pulpitu, usuwanie treningów z historii w chmurze i pamięci podręcznej (`queryClient.setQueryData`) oraz wyeliminowano błąd przysłaniania funkcji `t()`.
- `src/hooks/useGlucoseAlerts.ts` & `src/services/notificationService.ts` & `NotificationBridgePlugin.java` - Pełna synchronizacja preferencji powiadomień (hypo, hyper) oraz odtwarzania dźwięków MP3 z systemem Android i profilem użytkownika.
- `src/components/app/NavButton.tsx` & `src/components/app/AppLayout.tsx` - Zablokowano niepożądane zaznaczanie tekstu na dolnej belce nawigacyjnej (`select-none`).
- `public/CNAME` & `version.json` - Wdrożono oficjalną domenę `glikocontrol.pl` z pełnym wsparciem Cloudflare SSL/HSTS oraz metatagami SEO w `index.html`.

## Główne Widżety Pulpitu i Nowy Design System
- `src/components/dashboard/widgets/SavedMealsWidget.tsx` - Nowy horyzontalny widżet „Zapisane Posiłki & Przepisy” na Pulpicie: przewijany stos kart ze szklistym tłem (*glassmorphism*), badge'ami diet, szczegółowymi makroskładnikami (W, B, T, kcal), 1-Click wrzucaniem całego dania na Talerz oraz pełnym modalem podglądu przepisu kulinarnego wprost z Pulpitu.
- `src/components/dashboard/widgets/ShortcutsWidget.tsx` - Uporządkowany kafelek „Szybkie skróty” (dawniej „Szybkie akcje i ulubione posiłki”) z natychmiastowym 1-Click zapisem zdefiniowanych ulubionych posiłków.
- `src/components/MealPlate/ProductSearch.tsx` & `src/components/FoodDatabase.tsx` - Nowy inteligentny algorytm wyszukiwania w bazie żywności: normalizacja znaków diakrytycznych (s/ś, c/ć, l/ł itp.), scoring prefiksowy (faworyzowanie słów zaczynających się od frazy) oraz pełna widoczność bazy od A do Ż.
- `src/components/DailyTirWidget.tsx` - Wizualny widżet Dziennego TIR: radialny pierścień z neonowym blaskiem na segmencie normy (`emerald-glow`), torem zegarowym (`background track`), plakietką sukcesu `≥70%` oraz trójkolorowymi kapsułkami zakresów (`<70`, `70-180`, `>180`).
- `src/components/SiteRotationWidget.tsx` - Nowy Smart Rotation Ring (Koncepcja 2): minimalistyczna tarcza zegarowa z łukiem cyklu rotacji, czytelną nazwą aktywnej strefy i nowoczesną pigułką następnego miejsca bez zbędnych grafik.
- `src/hooks/useGlucoseAlerts.ts` & `src/services/notificationService.ts` & `src/lib/audioUtils.ts` - Zoptymalizowany, 4-stopniowy pancerny silnik powiadomień i odtwarzania MP3 (`status_clear.mp3`) dla niskiego i wysokiego cukru w aplikacji. Na natywnym Androidzie wyłączono zdublowany `LocalNotifications.schedule` (i przycisk snooze), pozostawiając pojedyncze, niezawodne powiadomienie z natywnego serwisu w tle (`NightscoutFetcher` / `GlikoForegroundService`), co całkowicie eliminuje podwójny dźwięk i zdublowane powiadomienia na belce systemowej. Web Notifications API pozostało dla wersji przeglądarkowej.

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
- `src/components/SmartEquipmentModal.tsx` - Modal potwierdzenia Smart Equipment. Przy wykryciu zmiany pompy/zbiorniczka pyta, czy wymieniono sam zbiorniczek, czy również wkłucie oraz pozwala wybrać nowe miejsce wkłucia. Zunifikowano zapis `infusionSetSite` oraz `infusionSite` ze spójną synchronizacją z `SiteRotationWidget`.
- `src/App.tsx` - Wyświetla `SmartEquipmentModal` i natychmiast odejmuje odpowiednie elementy (zbiorniczki `reservoirs`, wkłucia `infusion_sets` oraz sensory `sensors`) z apteczki `inventory` użytkownika. Zabezpieczono automatyczną synchronizację dat, zapobiegając cofaniu ręcznych edycji przez starsze wpisy z logów.
- `src/components/Profile.tsx` - Moduł edycji dat założenia wkłucia, sensora i zbiorniczka. Zapisuje wybraną przez użytkownika datę (`datetime-local`) zamiast nadpisywać ją sztywnym `Date.now()`, oraz aktualizuje istniejące najnowsze logi bez tworzenia duplikatów w historii. Dodano przyciski „Cofnij ostatnią wymianę” dla sensora, wkłucia i zbiorniczka, które usuwają omyłkowy wpis i automatycznie przywracają poprzednią datę w profilu.
- `src/components/HistoryView.tsx` & `src/components/DoseEditModal.tsx` - Zintegrowany filtr „Wymiany Osprzętu” oraz 1-Click przyciski edycji i usuwania na każdym kafelku historii. `DoseEditModal` umożliwia pełną korektę daty, miejsca wkłucia i notatek dla osprzętu oraz bezpieczne usuwanie z bazy SQLite i Firestore z automatycznym cofnięciem daty w ustawieniach profilu.

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
## Moduł Leków, Apteczki i Przypomnień Cross-Platform (Mobile & Web)
- `src/components/MedicationsWidget.tsx` - Nowoczesny widżet leków na pulpicie:
  - Kolorowa paleta pigułek (`PILL_THEMES`: Teal, Indigo, Purple, Amber, Sky, Rose) z dopasowanymi ramkami, tłami i badge'ami dawek/godzin.
  - Inteligentny detektor postaci leku (`getMedicationIcon`): automatycznie dobiera ikony dla iniekcji/penów (`Syringe`), kropli/syropów (`Droplets`), aerozoli/wziewów (`Wind`), saszetek (`Package`) oraz tabletek (`Pill`).
  - Modal potwierdzenia zażycia leku (`confirmingMed`): czytelny pop-up z nazwą, dawką, stanem zapasu po zażyciu i przyciskami Potwierdź / Anuluj.
  - Automatyczne odejmowanie przyjętej dawki (`pillsPerDose`) ze stanu magazynowego `stockQuantity` w Firebase po zatwierdzeniu.
- `src/components/Profile/ProfileMedications.tsx` - Panel zarządzania lekami w profilu użytkownika: dotykowy edytor przypomnień z szybkimi presetami pór dnia, pełnoekranowy asystent AI Gemini z opcją usuwania i ponawiania analizy, kalkulator wyczerpania zapasu tabletek na podstawie dziennego dawkowania oraz stałe przyciski Edycji i Usuwania.
- `src/services/notificationService.ts` - Pancerny silnik powiadomień o lekach działający cross-platformowo:
  - **Android Native (Capacitor LocalNotifications)**: planowanie codziennych, powtarzalnych powiadomień systemowych w kanale `glikocontrol_reminders_v1` z poprawnym parsowaniem godzin `HH:mm`.
  - **Web / PWA (Browser Web Notifications & Service Worker)**: aktywny monitoring w czasie rzeczywistym z wyzwalaniem systemowego `Notification API` oraz komunikatów Toast wewnątrz aplikacji.
- `src/lib/modalStack.ts` & `src/hooks/useBackButton.ts` - Uniwersalny system stosu modali (LIFO) dla sprzętowego i gestowego przycisku Wstecz (Android / Capacitor / Web Escape). Zapewnia, że naciśnięcie Wstecz na telefonie zamyka otwarte okno modalne/popup/sheet zamiast wyłączać aplikację.
- `android/.../NotificationBridgePlugin.java` & `src/services/preBolusService.ts` - **Natywny Stoper Przedposiłkowy na belce Androida (Live Chronometer Notification)**. Korzysta z `setUsesChronometer(true)` i `setChronometerCountDown(true)`, dzięki czemu Android sam odlicza sekunda po sekundzie na pasku stanu i ekranie blokady (AOD) przy 0% zużycia baterii, gdy aplikacja jest uśpiona.
## Integracja z Google Health / Health Connect & Natywny Krokomierz
- `android/app/src/main/java/com/glikocontrol/app/StepCounterPlugin.java` - **Natywny sprzętowy sensor krokomierza Androida (`Sensor.TYPE_STEP_COUNTER` / `Sensor.TYPE_STEP_DETECTOR`)**.
  - Działa w 100% natywnie, offline, bez konieczności instalowania zewnętrznych aplikacji Google Health Connect czy logowania do chmur.
  - Automatycznie śledzi kroki od północy danego dnia (`initial_steps_today` vs `total_steps_today`), zabezpieczony przed restartami telefonu.
  - Zwraca liczbę kroków przez `@PluginMethod getTodaySteps()` oraz obsługuje uprawnienie `Manifest.permission.ACTIVITY_RECOGNITION`.
- `src/services/healthService.ts` - Integracja z Google Health Connect i Krokomierzem:
  - `getStepsLast24h()` - W pierwszej kolejności odpytuje natywny sprzętowy czujnik telefonu (`StepCounterPlugin.getTodaySteps()`), a w razie potrzeby używa fallbacku Health Connect.
  - `requestAuthorization()` - Żądanie uprawnień odczytu/zapisu (`ACTIVITY_RECOGNITION`, `android.permission.health.READ_STEPS`, `android.permission.health.READ_BLOOD_GLUCOSE`, `android.permission.health.WRITE_BLOOD_GLUCOSE`, `android.permission.health.READ_TOTAL_CALORIES_BURNED`, `android.permission.health.READ_EXERCISE`) - **Wymaga deklaracji w AndroidManifest.xml**.
  - `writeBloodGlucose(value, timestamp)` - Zapis wartości cukru (z przeliczeniem na mmol/L) z obsługą formatu obiektowego i skalarnego.
- `src/services/preBolusService.ts` & `src/services/notificationService.ts` - Stoper przedposiłkowy i powiadomienia (Pre-Bolus Timer):
  - Wylicza optymalny czas odstępu przed posiłkiem w oparciu o poziom cukru, trend CGM i typ insuliny.
  - **Dynamiczna ikona minut na górnej belce stanu Androida (Status Bar Small Icon)**: zamiast statycznej ikony aplikacji, na samej górze ekranu (obok zegara i baterii) wyświetla się bezpośrednio liczba pozostałych minut (np. `15`, `14`, `10`, `5`, `1`), która odlicza w dół co minutę dokładnie tak jak w aplikacjach dostawy jedzenia (Uber Eats, Wolt, Glovo), a po zakończeniu zmienia się na `OK`! Renderowana jako przezroczysta maska alfa (brak jednolitego koła w tle), dzięki czemu Android wyświetla ostre i wyraziste cyfry zamiast białej kropki.
  - Czyste formatowanie i zaokrąglenie liczb: wyeliminowano ułamki dziesiętne z powiadomień Web/PWA i toastów (np. `15 min (4j)` zamiast `14.833333333333334 min (4.000000001j)`).
  - Planuje natywne powiadomienie alarmowe z dźwiękiem `status_clear.mp3` na dokładną godzinę zakończenia odliczania (`targetTime`) w systemie Android.
  - Zabezpieczenie przed ujemnym czasem: po upływie czasu zatrzymuje się na statusie `Gotowe / Możesz jeść!`, a natywny chronometr Androida jest automatycznie zamieniany na alert gotowości do posiłku.
- `src/components/MealPlate.tsx` & `src/components/MealPlate/ProductSearch.tsx` - Kompozytor Talerza i Wyszukiwarka:
  - Bezpośrednie dodawanie gotowych dań (zestawów / posiłków z bazy i widżetu) z automatyczną normalizacją składników, nadaniem unikalnych identyfikatorów `plateItemId` oraz funkcyjnym `setPlate((prev) => [...prev, ...items])`.
  - Wyeliminowano ostrzeżenia React o zduplikowanych pustych kluczach `""` w listach z `AnimatePresence`.
- `src/components/app/DynamicActionCapsule.tsx` - Główny pływający przycisk akcji (FAB / Dynamic Action Capsule):
  - Klasyczna zewnętrzna odznaka (Badge) liczby składników na Talerzu: umieszczona na zewnętrznej prawej górnej krawędzi okrągłego przycisku (`-top-1.5 -right-1.5`), z białą obwódką i cieniem (dokładnie jak w aplikacjach mobilnych/iOS/Android), bez nachodzenia na samą ikonę sztućców.
  - Płynne morfowanie w stany: Hypo Alert, Pre-Bolus Timer (z bezpośrednim przyciskiem „Zjadłem”), Unlinked Carbs oraz Meal Absorbing (wskaźnik trawienia %).


