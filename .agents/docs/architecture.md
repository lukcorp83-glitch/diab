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

## Synchronizacja Danych i Firebase (Limity bazy)
- `src/components/CloudPackageSync.tsx` - Narzędzie, które archiwizuje wszystkie tabele SQLite (do 45000) i model ML w jeden spakowany dokument na Firebase.
- **Odczyty Bazy:** `App.tsx` samodzielnie puszcza w tle paczki co 24h. Aplikacja unika zapytań o tysiące rekordów poprzez `onSnapshot` w Firebase (rygorystyczny limit `1500`, zapobiegający błędowi "Quota Exceeded"). W przypadku zresetowanej / świeżej pamięci z automatu uruchamia import pojedynczej wielkiej paczki (Cloud Package), dzięki czemu historia z powrotem ma 45 000 wyników (i statystyki działają dla minionych miesięcy) przy obciążeniu zaledwie jednego odczytu Firebase.

*(Aktualizuj ten plik za każdym razem, gdy badasz nową część starego kodu lub tworzysz coś nowego!)*

## Widok Talerza i Historia Posiłków (Kompozytor)
- src/components/MealPlate.tsx - Główny widok "Talerza" do wprowadzania posiłków. Zawiera logikę skanowania kodów, AI (GlikoSense) oraz zakładkę z historią dodanych posiłków.
- src/components/MealHistoryView.tsx - Dedykowany widok dla rekordów typu meal. Tylko tu użytkownik przegląda i ewentualnie edytuje posiłki. Edycja historii posiłków w głównej osi czasu (HistoryView.tsx) została zubożona do samej zmiany dawki insuliny, by uniknąć nadpisywania logiki wejść posiłkowych z notatkami AI.

## Zarządzanie Wpisami i Zdarzenia (Logs & Events)
- System opiera się na trzech warstwach pamięci logów: \cachedLogs\ (do 45000 z IndexedDB), \
sLogs\ (z NightscoutWorker) oraz \bLogs\ (z Firebase, sztywny limit 3000 zapytań dla uniknięcia Quota Exceeded).
- **Zdarzenia Lokalne:** Aby aplikacja natychmiast reagowała na nowe wpisy (np. po dodaniu wymiany sensora lub wkłucia w \Profile.tsx\ czy po dodaniu posiłku), NIEZBĘDNE jest wywołanie \window.dispatchEvent(new CustomEvent('localLogAdd', { detail: newLog }))\. Samo \ddDoc\ do Firebase odświeży widok z opóźnieniem (lub wcale w przypadku utraty połączenia). Pamiętaj też o \localLogUpdate\.
- Widżety żywotności na Dashboardzie (Dashboard.tsx) bazują bezpośrednio na datach \sensorChangeDate\ oraz \infusionSetChangeDate\ z obiektu \settings\, a nie wyszukują z \logs\ (ponieważ stare logi mogą wypaść z 3000 limitu \bLogs\).

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
