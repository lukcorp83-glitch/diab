# Projekt GlikoControl - Reguły i Wnioski z Błędów (Pamięć Agenta)

- **Mechanizm aktualizacji OTA (Capgo / dist.zip)**:
  - Nigdy nie ładuj wielkich plików instalacyjnych (np. .apk) do wnętrza paczki OTA (dist.zip lub update.zip). Powoduje to, że paczka ma ~100MB, co zrywa połączenie na telefonach przy użyciu CapacitorUpdater (błąd: ailed download). Pakowanie w Github Actions (np. zip -r ../dist.zip .) musi wykluczać pliki .apk (-x "*.apk").
  - Skrypty aktualizacji OTA (np. w UpdateModal.tsx) nie mogą korzystać z zadeklarowanych "na sztywno" ścieżek URL dla starych paczek OTA. Link do nowej paczki OTA zawsze powinien być pobierany dynamicznie z weryfikowanego źródła (np. ersionData.url), aby uniknąć nieskończonych pętli tzw. "OTA downgrade".
  
- **System WebSpeech API na Android WebView**:
  - Funkcje rozpoznawania głosu (np. SpeechRecognition używany w GlikoChat) w przeglądarkach wbudowanych Capacitor/WebView bardzo często nie działają poprawnie lub cicho blokują proces, jeśli nie dodamy specjalnych uprawnień. Zawsze implementuj obsługę błędów 	ry/catch przy operacjach mikrofonu oraz zabezpieczenia (np. pokazywanie błędu typu 	oast po wykryciu braku autoryzacji), by ikony nasłuchu nie zawieszały się na ekranie bez końca.
