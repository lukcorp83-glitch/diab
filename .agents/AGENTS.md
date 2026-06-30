# Projekt GlikoControl - Reguły i Wnioski z Błędów (Pamięć Agenta)

- **Mechanizm aktualizacji OTA (Capgo / dist.zip)**:
  - Nigdy nie ładuj wielkich plików instalacyjnych (np. .apk) do wnętrza paczki OTA (dist.zip lub update.zip). Powoduje to, że paczka ma ~100MB, co zrywa połączenie na telefonach przy użyciu CapacitorUpdater (błąd: ailed download). Pakowanie w Github Actions (np. zip -r ../dist.zip .) musi wykluczać pliki .apk (-x "*.apk").
  - Skrypty aktualizacji OTA (np. w UpdateModal.tsx) nie mogą korzystać z zadeklarowanych "na sztywno" ścieżek URL dla starych paczek OTA. Link do nowej paczki OTA zawsze powinien być pobierany dynamicznie z weryfikowanego źródła (np.  ersionData.url), aby uniknąć nieskończonych pętli tzw. "OTA downgrade".
  
- **System WebSpeech API na Android WebView**:
  - Funkcje rozpoznawania głosu (np. SpeechRecognition używany w GlikoChat) w przeglądarkach wbudowanych Capacitor/WebView bardzo często nie działają poprawnie lub cicho blokują proces, jeśli nie dodamy specjalnych uprawnień. Zawsze implementuj obsługę błędów 	ry/catch przy operacjach mikrofonu oraz zabezpieczenia (np. pokazywanie błędu typu 	oast po wykryciu braku autoryzacji), by ikony nasłuchu nie zawieszały się na ekranie bez końca.

- **Wielojęzyczność (i18n)**:
  - Aplikacja obsługuje dwa języki (Polski i Angielski). 
  - Wszelkie klucze tłumaczeń należy zawsze dodawać symultanicznie do obu słowników, które znajdują się odpowiednio w folderach: `src/locales/pl/translation.json` oraz `src/locales/en/translation.json`. Nigdy nie dodawaj kluczy typu `auto.xxx` do kodu bez ich jednoczesnego zdefiniowania w plikach JSON.

- **Synchronizacja Wersji Aplikacji (Krytyczne dla OTA)**:
  - Zmiana wersji aplikacji MUSI odbywać się symultanicznie w czterech miejscach, aby uniknąć błędu nieskończonej pętli przeładowywania (CapacitorUpdater.reset() loop), co skutkuje "białym ekranem" na telefonach użytkowników po wgraniu nowego APK.
  - Zawsze upewnij się, że zaktualizowałeś dokładnie te miejsca do tego samego numeru:
    1. `package.json` (klucz "version")
    2. `version.json` (klucz "version", opcjonalnie zaktualizuj nazwę pliku w "apkUrl")
    3. `src/constants.ts` (zmienna `APP_VERSION`)
    4. `src/constants/versions.ts` (zmienna `CURRENT_VERSION`)
    
  > [!CAUTION]
  > **KRYTYCZNY PUNKT (ZAPISANE NA CZERWONO):** W pliku `src/constants/versions.ts` musisz zaktualizować NIE TYLKO zmienną `CURRENT_VERSION`, ale również dodać nowy wpis do OBU tablic: `PWA_VERSIONS` oraz `APK_VERSIONS`. Jeśli zapomnisz o tablicy `APK_VERSIONS`, aplikacja mobilna i jej mechanizm OTA całkowicie się posypią! BRAK ZMIANY TUTAJ ZEPSUJE APLIKACJĘ!

- **Kanał Beta i Bezpieczne Aktualizacje (OTA)**:
  - Wdrożono system dwóch gałęzi: `main` oraz `beta`.
  - Prace nad nowymi, niestabilnymi funkcjami lub prośbami użytkownika o zmiany w kodzie muszą być prowadzone **WYŁĄCZNIE na gałęzi `beta`** (użyj `git checkout beta` jeśli jesteś na main).
  - Po wypchnięciu zmian (push) na gałąź `beta`, GitHub wygeneruje wydanie `aktualizacja-beta` zawierające pliki `beta.json` oraz `update-beta.zip`. Trafią one w formie OTA do użytkowników z włączoną opcją "Program testów Beta" w ustawieniach.
  - Dopiero po uzyskaniu potwierdzenia od użytkownika, że nowa funkcja działa poprawnie, kod z gałęzi `beta` może zostać zmergowany (merge) do głównej gałęzi `main`. Nigdy nie wrzucaj eksperymentów bezpośrednio na `main`!
