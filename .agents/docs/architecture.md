# Mapa Architektury GlikoControl

Ten dokument służy optymalizacji pamięci (tokenów) sztucznej inteligencji. Zamiast szukać po plikach, szukaj informacji tutaj.

## Główne pliki i komponenty
- `src/App.tsx` (ogromny plik ~3400 linii) - Główny punkt wejścia, główny layout, zarządzanie routingiem i duża część logiki UI.
- `src/constants.ts` - Główne stałe, w tym `APP_VERSION`, adresy URL oraz bazy produktów.
- `src/constants/versions.ts` - Logika wersji (PWA, APK), definicje okien z historią nowości (`whatsNew`). Wymaga aktualizacji przy każdym OTA.

## GlikoSense (Sztuczna Inteligencja / ML)
- `src/components/MLAnalysisWidget.tsx` - Główny widżet UI analizy GlikoSense wyświetlany na pulpicie. Zawiera logikę przywracania i backupu modelu neuronowego z/do Firebase (m.in. obsługa okna zgody).
- `src/services/mlSugarAnalyzer.ts` - Serwis zarządzający modelami ML, logiką TensorFlow.js oraz eksportem/importem plików modelu (backup JSON).
- `src/workers/glikosense.worker.ts` - Web Worker używany w tle do trenowania modeli oraz wyliczania predykcji.

## Pliki konfiguracyjne i systemowe
- `package.json` & `package-lock.json` - Zależności i npm. Wymagają ujednoliconej wersji przy każdym OTA.
- `version.json` - Główny konfig OTA używany przez mechanizm aktualizacji w aplikacji, to tu znajduje się tekst okna z nowościami.
- `dev-dist/sw.js` - Wygenerowany Service Worker używany przez Vite PWA. Nie modyfikować ręcznie.

## Synchronizacja Danych, Persystencja Hybrydowa i Firebase
- `src/components/CloudPackageSync.tsx` - Narzędzie, które archiwizuje wszystkie tabele SQLite (do 45000) i model ML w jeden spakowany dokument na Firebase. Podczas eksportu (`uploadCloudPackage`) oraz importu (`downloadCloudPackage`) w tle dociąga pełną historię z kolekcji `logs` w Firestore (do 45000 rekordów) i zapisuje do lokalnego SQLite (`application_logs`) i IndexedDB, gwarantując komplet danych (50+ dni) bez obciążania subskrypcji na żywo.
- **Odczyty Bazy:** Aplikacja unika zapytań o tysiące rekordów na żywo poprzez `onSnapshot` w Firebase (rygorystyczny limit `1500`, zapobiegający błędowi "Quota Exceeded"). Po synchronizacji paczki chmurowej cała historia (45 000 rekordów) jest odczytywana z natywnego SQLite na wykresach trendu i w raportach AGP.
- **Bezpieczeństwo SQLite i Pętla 4 Dni (`databaseService.ts` & `localLogs.ts`):** Usunięto destrukcyjne wywołania `deleteDatabase()` – przy błędzie blokady transakcji (`database is locked` na Androidzie) aplikacja nie kasuje już lokalnej bazy, co wcześniej wywoływało pętlę i ograniczenie do 4 dni z limitu `onSnapshot`. Wdrożono kolejkę transakcji (`savePromise` mutex) dla operacji zapisu i usuwania (`saveLog`, `saveMultipleLogs`, `deleteLog`).
- **Zapis Przyrostowy (`App.tsx` & `localLogs.ts`):** Usunięto obciążający `useEffect` zapisujący 45 000 wpisów przy każdym renderze. Zamiast tego, przy starcie wywoływana jest funkcja `loadLocalLogs()`, która łączy dane z natywnej bazy SQLite (`databaseService`) z przeglądarkowym IndexedDB (`GlikoControlLocalLogs`). Wszystkie zdarzenia (`handleLogAdd`, `handleLogUpdate`, `handleLogDelete`, `onSnapshot`, `SYNC_SUCCESS` workera) używają przyrostowego zapisu `saveLocalLogs([target])`, co automatycznie utrzymuje obie bazy w pełnej synchronizacji w czasie rzeczywistym.
- `src/components/HistoryView.tsx` - Filtrowanie logów zostało ujednolicone z regułami UX: w sekcji `Leczenie` wykluczono posiłki (widoczne są tylko bolusy/leki/wymiany), natomiast pełna historia posiłków dostępna jest w `Talerzu` (`Posiłki`).

*(Aktualizuj ten plik za każdym razem, gdy badasz nową część starego kodu lub tworzysz coś nowego!)*


## Widok Talerza, Diety i Historia Posiłków
- `src/components/MealPlate.tsx` - Główny widok "Talerza" do wprowadzania posiłków. Zawiera logikę skanowania kodów, AI (GlikoSense) oraz zakładkę z historią dodanych posiłków.
- `src/components/MealHistoryView.tsx` - Dedykowany widok dla rekordów typu meal/carbs. Tylko tu użytkownik przegląda i ewentualnie edytuje posiłki. Edycja historii posiłków w głównej osi czasu (`HistoryView.tsx`) została zubożona do samej zmiany dawki insuliny, by uniknąć nadpisywania logiki wejść posiłkowych z notatkami AI.
- **Wyliczanie i zliczanie kalorii (Kcal dziś):** W modułach dietetycznych (`Diets.tsx`, `DietScoreWidget.tsx`, `Dashboard.tsx`) wpisy kaloryczne i węglowodanowe są obliczane ze wszystkich źródeł: `type === 'meal'`, `type === 'carbs'` oraz `type === 'bolus'` (gdy posiada `linkedMeal`). Podczas każdej edycji w `MealEditModal.tsx` lub `DoseEditModal.tsx` pole `calories` jest od razu na nowo kalkulowane (`carbs*4 + protein*4 + fat*9`) i zapisywane na obiekcie logu i/lub `linkedMeal`.

## Zarządzanie Wpisami i Zdarzenia (Logs & Events)
- System opiera się na trzech warstwach pamięci logów: `cachedLogs` (do 45000 z IndexedDB), `nsLogs` (z NightscoutWorker) oraz `fbLogs` (z Firebase, sztywny limit 3000 zapytań dla uniknięcia Quota Exceeded).
- **Zdarzenia Lokalne:** Aby aplikacja natychmiast reagowała na nowe wpisy (np. po dodaniu wymiany sensora lub wkłucia w `Profile.tsx` czy po dodaniu posiłku), NIEZBĘDNE jest wywołanie `window.dispatchEvent(new CustomEvent('localLogAdd', { detail: newLog }))`. Samo `addDoc` do Firebase odświeży widok z opóźnieniem (lub wcale w przypadku utraty połączenia). Pamiętaj też o `localLogUpdate`.
- **Deduplikacja i aktualizacja dat osprzętu (wkłucia / sensory):** Przy zmianie daty wymiany wkłucia (`site_change`) lub sensora (`sensor_change`) w `Profile.tsx`, aktualizacja musi obejmować `id` oraz `nsId` we wszystkich trzech tablicach (`cachedLogs`, `fbLogs`, `nsLogs`) ze znacznikiem `userModified: true`. Dodatkowo funkcja `isDuplicate` w `App.tsx` odrzuca stare niezaktualizowane wpisy `site_change` i `sensor_change` z Nightscout w oknie 14 dni, jeżeli w aplikacji istnieje już lokalnie zmodyfikowany lub systemowy wpis o wymianie, zapobiegając rozdzieleniu osprzętu na dwie różne daty.
- Widżety żywotności na Dashboardzie (Dashboard.tsx) bazują bezpośrednio na datach `sensorChangeDate` oraz `infusionSetChangeDate` z obiektu `settings`, a nie wyszukują z `logs` (ponieważ stare logi mogą wypaść z 3000 limitu `fbLogs`).

## Powiadomienia i Dźwięki (Kanały Android / Audio)
- **Kanały Powiadomień (Android O+):** Zmiana właściwości lub dźwięku na istniejącym kanale Android jest ignorowana przez system operacyjny. Dlatego przy zmianach konfiguracji dźwięku usuwane są stare kanały (`glucose_alerts_v7`, `glucose_alerts_v8`, `glucose_alerts_v9`, `glucose_alerts_v10`) i tworzone jest nowe ID kanału.
- **Krytyczne Alerty Glikemii (`glucose_alerts_v11`):** Używają pliku `status_clear.mp3` (`android/app/src/main/res/raw/status_clear.mp3` oraz w `public/status_clear.mp3` dla Web/PWA). Kanał ten ma najwyższy priorytet (`importance: 5`, atrybut `USAGE_ALARM` w natywnych klasach Androida i wtyczce Capacitor) i jest przypisany wyłącznie do alarmów o wysokim/niskim cukrze (zarówno w tle z `NightscoutFetcher.java`, `MainActivity.java`, jak i z JS `App.tsx`, `RemoteAlertsListener.tsx`).
- **Powiadomienia Systemowe (`system_alerts_v1` / `glikocontrol_reminders_v1`):** Używają standardowych dźwięków systemowych (`sound: undefined` lub `null`, `importance: 4`) i są przypisane do zwykłych przypomnień (np. o zmianie sensora, wkłucia, przypomnień o lekach i bolusie przedłużonym).
- **Pomocnicze funkcje audio (`audioUtils.ts`):** `playLowGlucoseSound()` oraz `playHighGlucoseSound()` odtwarzają plik `/status_clear.mp3` i pilnują, aby dzwonek przeszedł do końca bez przerywania i nakładania (zmienna `currentAlertAudio`), chyba że użytkownik zamknie powiadomienie krzyżykiem (`stopGlucoseSound()`, co wyłącza dźwięk JS oraz anuluje natywne powiadomienie LocalNotifications). `playNormalGlucoseSound()` odtwarza standardowe tony syntetyczne (`playTone`).

## WebSockets, Parowanie (DevicePairing) i Wydajność
- src/hooks/useGlikoServer.ts obsługuje WebSocket, jednak jest to połączenie NIETRWAŁE, usypiane w tle przez Android/iOS. Lista u urządzeń wsDevices służy TYLKO do wskaźnika online.
- Główne połączenie (parowanie Master-Follower) zachowane jest w localStorage (jako diacontrol_linked_uid). Prawdziwe alarmy wysyłane są do Firebase, co wybudza drugie urządzenia niezależnie od WebSocketa.
- Z tego powodu w DevicePairing.tsx dodaliśmy wpisy 'Offline' opierające się na linkedUid, by użytkownik nie bał się utraty parowania po wygaśnięciu ekranu.
- **Optymalizacja (Hurtowe paczki):** Wrzucanie logów po kolei (pętla powiadomień) wymuszało n-krotne, niezwykle zasobożerne przeliczanie tablicy logs w App.tsx (ponad 45000 wyników z IndexedDB). Należy rygorystycznie stosować Event localLogAddBatch i wsSendLogBatch z tablicą obiektów zamiast pojedynczych wpisów przy wybudzaniu aplikacji, by uniknąć pętli zamrażających renderowanie ekranu (szalejące cukry).

## Plan V2 (GlikoControl 2.0 Architektura)
- **PRIORYTET #1 (KRYTYCZNE): Architektura i "Monolityczne" Komponenty.** Projekt opiera się na kilku gigantycznych plikach (np. Profile.tsx - 373 KB, MealPlate.tsx - 179 KB, App.tsx - ok. 3400 linii). Łamie to podstawowe zasady tworzenia czystego kodu w React. Logika biznesowa jest wymieszana z UI, co powoduje niepotrzebne renderowanie całej reszty przy drobnych zmianach. Od tego *musimy* zacząć w V2 – rozbić te giganty na mniejsze sub-komponenty!
- **PRIORYTET #2:** Głównym problemem wydajnościowym V1 jest potężny tzw. "Prop Drilling" z `App.tsx` na dziesiątki komponentów w dół, szczególnie przesyłanie wielkiej tablicy `logs` (45 000 wpisów).
- Podczas operacji w gałęzi testowej V2 priorytetem jest wdrożenie biblioteki **Zustand** (lekki, globalny, darmowy stan). Mając globalny "Magazyn", mniejsze komponenty (np. guziki na talerzu) będą samodzielnie pobierać wyłącznie niezbędne paczki danych, co uwolni aplikację od zamrożeń wywołanych masowym przeładowywaniem interfejsu (re-renderami).
- Dodatkowo zaleca się wdrożenie **TanStack Query** do zarządzania stanem asynchronicznym (szczególnie Firebase), co pozwoli usunąć mnóstwo ręcznego zarządzania stanami ładowania.
