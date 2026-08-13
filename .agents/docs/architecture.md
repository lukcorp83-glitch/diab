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

## Zarządzanie Sprzętem, Apteczką i Pojemnością Zbiorniczka
- `src/components/Profile/ProfileInventory.tsx` - Moduł Apteczki i Zapasów. Przetłumaczono surowe nazwy kategorii z angielskiego (`sensors`, `insulin`, `pens`, `reservoirs`, `infusion_sets`, `strips`, `other`) na czytelne polskie odpowiedniki (`Sensory CGM`, `Insulina`, `Wstrzykiwacze (Peny)`, `Zbiorniczki`, `Wkłucia`, `Paski i Igły`, `Inne`). Dodano pole do wprowadzania indywidualnej pojemności zbiorniczka (`capacity` w U lub ml, np. 180U / 300U).
- `src/components/PumpStatusCard.tsx` - Kafel statusu pompy i zbiorniczka na pulpicie. Wylicza wskaźnik wypełnienia i rysuje dynamiczną animację opróżniającego się zbiorniczka (od 100% do 0%) na podstawie podanej w apteczce/ustawieniach pojemności (`reservoirCapacityUnits` / `capacity`).

## Widok Talerza, Diety i Dedykowane Widżety (`DietSpecificWidgets.tsx`)
- `src/components/nutrition/NutritionHub.tsx` - Główny kontener **Centrum Żywienia** z pływającym menu zakładek: `Talerz` (`MealPlate`), `Dieta` (`Diets`), `Historia` (`MealHistoryView`) oraz **`Odżywianie`** (`GlikoSenseNutriView`).
- `src/components/nutrition/DietSpecificWidgets.tsx` - Widżety danych dedykowane dla każdej diety: Dziennik i rejestr ciał ketonowych ($mmol/L$) + kalkulator WBT dla Keto, Pasek proporcji 50/25/25 dla Talerza Diabetologicznego, Timer Okna Postu 16/8 dla IF z alertami hypo, Licznik Błonnika dla DASH oraz wskaźnik GI zamienników dla diety Bezglutenowej.
