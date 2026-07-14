# Projekt GlikoControl - Reguły i Wnioski z Błędów

Te reguły definiują specyficzne procedury i standardy pracy w tym projekcie. Zawsze ich przestrzegaj!

- **Synchronizacja Wersji Aplikacji (Krytyczne dla OTA)**:
  - Zmiana wersji aplikacji MUSI odbywać się symultanicznie w pięciu miejscach, aby uniknąć błędu nieskończonej pętli przeładowywania (CapacitorUpdater.reset() loop), co skutkuje "białym ekranem".
  - Zawsze upewnij się, że zaktualizowałeś dokładnie te miejsca do tego samego numeru:
    1. `package.json` (klucz "version")
    2. `package-lock.json` (uruchom komendę `npm install --package-lock-only`)
    3. `version.json` (klucz "version", aktualizacja okien nowości `whatsNew`, opcjonalnie `apkUrl`)
    4. `src/constants.ts` (zmienna `APP_VERSION`)
    5. `src/constants/versions.ts` (zmienna `CURRENT_VERSION` oraz dodanie wpisu do tablic `PWA_VERSIONS` i `APK_VERSIONS`)

- **Aktualizacja tekstów w oknie nowości (Pop-up)**:
  - Przy każdej zmianie wersji aplikacji, ZAWSZE zaktualizuj pola `whatsNew` i `whatsNewEn` w głównym pliku `version.json` w głównym katalogu projektu. To właśnie ten plik odpowiada za to, co zobaczy użytkownik po pobraniu aktualizacji OTA. LISTA ZMIAN ZAWSZE MUSI BYĆ W DWÓCH JĘZYKACH (PL i EN)!

- **Mechanizm aktualizacji OTA (Capgo / dist.zip)**:
  - Nigdy nie ładuj plików instalacyjnych (np. .apk) do wnętrza paczki OTA (dist.zip lub update.zip). Powoduje to, że paczka zajmuje zbyt dużo miejsca i Capgo zwraca błąd.
  - Podczas wypakowywania plików JSON z gotowego `dist.zip`, nigdy nie nadpisuj w ciemno całego folderu `dist/` (komendą `unzip -o dist.zip -d dist/`). Używaj `unzip -o dist.zip "*.json" -d dist/`.
  - Skrypty aktualizacji OTA nie mogą używać na sztywno zakodowanych ścieżek URL dla paczek, zawsze polegaj na dynamicznym `versionData.url`.

- **Wielojęzyczność (i18n)**:
  - Zawsze dodawaj nowe klucze do obu słowników jednocześnie: `src/locales/pl/translation.json` oraz `src/locales/en/translation.json`.

- **Kanał Beta i Bezpieczne Aktualizacje (OTA)**:
  - Prace nad nowymi funkcjami muszą być prowadzone na gałęzi `beta`. Dopiero po pozytywnych testach kod z `beta` może zostać zmergowany do głównej gałęzi `main`.
  - Przed wykonaniem buildu po przełączeniu gałęzi ZAWSZE sprawdź, czy w kodzie nie zostały śmieci z konfliktów (użyj wyszukiwania `<<<<<<<`).

- **System WebSpeech API**:
  - Implementując rozpoznawanie głosu, zawsze upewnij się że masz try/catch przy operacjach związanych z mikrofonem. Android WebView lubi zablokować API po cichu, gdy brakuje uprawnień.

- **Zasada ogólna**: Zawsze komunikuj się z użytkownikiem w języku polskim.

- **Optymalizacja Kontekstu (Oszczędzanie Tokenów)**:
  - Zawsze opieraj się na pliku `.agents/docs/architecture.md`, w którym znajduje się mapa starego i nowego kodu. Zamiast w ciemno skanować cały projekt czy wielkie pliki (jak `App.tsx`), najpierw zajrzyj do mapy architektury. Gdy tylko odkryjesz lub zmodyfikujesz coś ważnego (niezależnie czy to nowy, czy stary kod), **od razu aktualizuj plik `architecture.md`**, aby nie zapomnieć jak działa aplikacja między rozmowami.

