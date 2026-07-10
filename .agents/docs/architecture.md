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
