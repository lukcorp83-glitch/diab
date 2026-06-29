const fs = require('fs');

const plPath = 'src/locales/pl/translation.json';
const enPath = 'src/locales/en/translation.json';

const pl = JSON.parse(fs.readFileSync(plPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

pl.auto = pl.auto || {};
en.auto = en.auto || {};

pl.auto['wersja_5_4_0'] = 'Wersja 5.4.0';
en.auto['wersja_5_4_0'] = 'Version 5.4.0';

pl.auto['wersja_5_4_2'] = 'Wersja 5.4.2 (Najnowsza)';
en.auto['wersja_5_4_2'] = 'Version 5.4.2 (Latest)';

pl.auto['poprawki_asystenta_glosowego'] = 'Poprawki i stabilizacja asystenta głosowego GlikoChat.';
en.auto['poprawki_asystenta_glosowego'] = 'GlikoChat voice assistant fixes and stabilization.';

pl.auto['przebudowa_systemu_ota'] = 'Przebudowa systemu OTA i naprawa blokujących się linków pobierania.';
en.auto['przebudowa_systemu_ota'] = 'OTA system rebuilt and freezing download links fixed.';

pl.auto['nowy_silnik_ota'] = 'Nowy silnik pobierania aktualizacji, rozwiązujący błędy timeoutów przy dużych plikach.';
en.auto['nowy_silnik_ota'] = 'New update download engine, resolving timeout errors on large files.';

pl.auto['natywny_silnik_rozpoznawania_mowy'] = 'Natywny, stabilny silnik rozpoznawania mowy dla urządzeń Android.';
en.auto['natywny_silnik_rozpoznawania_mowy'] = 'Native, stable speech recognition engine for Android devices.';

pl.auto['poprawki_plynnosci_przesuwania_widzetow'] = 'Poprawki płynności przesuwania widżetów na ekranie głównym.';
en.auto['poprawki_plynnosci_przesuwania_widzetow'] = 'Fixed widget dragging smoothness on the dashboard.';

fs.writeFileSync(plPath, JSON.stringify(pl, null, 2) + '\n');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
console.log('Translations updated!');
