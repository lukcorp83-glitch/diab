# Projekt GlikoControl - Reguły i Wnioski z Błędów (Pamięć Agenta)

- **Mechanizm aktualizacji OTA (Capgo / dist.zip)**:
  - Nigdy nie ładuj wielkich plików instalacyjnych (np. .apk) do wnętrza paczki OTA (dist.zip lub update.zip). Powoduje to, że paczka ma ~100MB, co zrywa połączenie na telefonach przy użyciu CapacitorUpdater (błąd: failed download). Pakowanie w Github Actions (np. zip -r ../dist.zip .) musi wykluczać pliki .apk globalnie: `-x "*.apk" "**/*.apk"`.
  - Podczas wypakowywania plików z gotowego `dist.zip` (np. do odzyskania pliku `beta.json` w kolejnych jobach Actions), **nigdy nie nadpisuj w ciemno całego folderu `dist/`** komendą `unzip -o dist.zip -d dist/`. Może to nadpisać świeżo zbudowane pliki webowe dla instalatora APK. Zamiast tego wypakuj wyłącznie pliki JSON komendą: `unzip -o dist.zip "*.json" -d dist/`.
  - Skrypty aktualizacji OTA (np. w UpdateModal.tsx) nie mogą korzystać z zadeklarowanych "na sztywno" ścieżek URL dla starych paczek OTA. Link do nowej paczki OTA zawsze powinien być pobierany dynamicznie z weryfikowanego źródła (np. versionData.url), aby uniknąć nieskończonych pętli tzw. "OTA downgrade".
  
- **System WebSpeech API na Android WebView**:
  - Funkcje rozpoznawania głosu (np. SpeechRecognition używany w GlikoChat) w przeglądarkach wbudowanych Capacitor/WebView bardzo często nie działają poprawnie lub cicho blokują proces, jeśli nie dodamy specjalnych uprawnień. Zawsze implementuj obsługę błędów 	ry/catch przy operacjach mikrofonu oraz zabezpieczenia (np. pokazywanie błędu typu 	oast po wykryciu braku autoryzacji), by ikony nasłuchu nie zawieszały się na ekranie bez końca.

- **Wielojęzyczność (i18n)**:
  - Aplikacja obsługuje dwa języki (Polski i Angielski). 
  - Wszelkie klucze tłumaczeń należy zawsze dodawać symultanicznie do obu słowników, które znajdują się odpowiednio w folderach: `src/locales/pl/translation.json` oraz `src/locales/en/translation.json`. Nigdy nie dodawaj kluczy typu `auto.xxx` do kodu bez ich jednoczesnego zdefiniowania w plikach JSON.

- **Synchronizacja Wersji Aplikacji (Krytyczne dla OTA)**:
  - Zmiana wersji aplikacji MUSI odbywać się symultanicznie w pięciu miejscach, aby uniknąć błędu nieskończonej pętli przeładowywania (CapacitorUpdater.reset() loop), co skutkuje "białym ekranem" na telefonach użytkowników po wgraniu nowego APK.
  - Zawsze upewnij się, że zaktualizowałeś dokładnie te miejsca do tego samego numeru:
    1. `package.json` (klucz "version")
    2. `package-lock.json` (odpal komendę `npm install --package-lock-only` po zmianie w package.json)
    3. `version.json` (klucz "version", opcjonalnie zaktualizuj nazwę pliku w "apkUrl")
    4. `src/constants.ts` (zmienna `APP_VERSION`)
    5. `src/constants/versions.ts` (zmienna `CURRENT_VERSION` oraz **OBOWIĄZKOWO** dodaj wpis o nowej wersji (Changelog) do obu tablic: `PWA_VERSIONS` i `APK_VERSIONS`) - **BRAK ZMIANY TUTAJ ZEPSUJE APLIKACJĘ!**
- **Kanał Beta i Bezpieczne Aktualizacje (OTA)**:
  - Wdrożono system dwóch gałęzi: `main` oraz `beta`.
  - Prace nad nowymi, niestabilnymi funkcjami lub prośbami użytkownika o zmiany w kodzie muszą być prowadzone **WYŁĄCZNIE na gałęzi `beta`** (użyj `git checkout beta` jeśli jesteś na main).
  - Po wypchnięciu zmian (push) na gałąź `beta`, GitHub wygeneruje wydanie `aktualizacja-beta` zawierające pliki `beta.json` oraz `update-beta.zip`. Trafią one w formie OTA do użytkowników z włączoną opcją "Program testów Beta" w ustawieniach.
  - Dopiero po uzyskaniu potwierdzenia od użytkownika, że nowa funkcja działa poprawnie, kod z gałęzi `beta` może zostać zmergowany (merge) do głównej gałęzi `main`. Nigdy nie wrzucaj eksperymentów bezpośrednio na `main`!

- **Uwaga na konflikty łączenia (Merge Conflicts)**:
  - Przechodząc z gałęzi main na eta przy użyciu opcji "Bring my changes to beta" w Git Desktop (co działa jak git stash & pop), aplikacja nakłada niezapisane modyfikacje na pliki z gałęzi docelowej.
  - Najczęściej powoduje to konflikty (oznaczone jako <<<<<<< Updated upstream) w plikach zarządzających wersjami (np. \ersion.json\, \package.json\, \src/constants/versions.ts\) oraz w głównych komponentach, jeśli obie gałęzie dodawały nowe importy (np. \Dashboard.tsx\).
  - Przed wykonaniem buildu po przełączeniu gałęzi ZAWSZE sprawdź, czy w kodzie nie zostały śmieci z konfliktów (użyj wyszukiwania \<<<<<<<\) i precyzyjnie je rozwiąż, zachowując zaktualizowane importy oraz spójną wersję.
