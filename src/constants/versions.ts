import i18n from "../i18n";

export interface ChangeEntry {
  categoryKey: string;
  icon: string;
  colorClass: string;
  descriptionKey: string;
}

export interface VersionEntry {
  version: string;
  date: string;
  title: string;
  changes: (string | ChangeEntry)[];
}

export const CURRENT_VERSION = '6.0.45';

import versionData from '../../version.json';
export const CURRENT_OTA_REVISION = versionData.otaRevision || 0;

export const PWA_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.45",
    date: "2026-09-11",
    title: "Optymalizacja aplikacji",
    changes: [
      "Optymalizacja aplikacji"
    ]
  },
  {
    version: "6.0.44",
    date: "2026-09-09",
    title: "Połączenie Przełącznika Powiadomień Cukru z Natywnym Paskiem Androida",
    changes: [
      "Połączono opcję 'Informacje o cukrach na pasku powiadomień' bezpośrednio z natywnym kodem Androida",
      "Wyłączenie opcji w profilu natychmiast usuwa ciągłe powiadomienie glikemii (ID: 999) z paska powiadomień i ekranu blokady",
      "Zachowano 100% ciągłość pracy serwisu w tle (GlikoForegroundService) bez zaśmiecania paska stanu",
      "Włączenie opcji natychmiast odświeża i przywraca powiadomienie z bieżącym cukrem i wykresem",
      "Dodano przełącznik powiadomień systemowych również do sekcji Profil ➔ System & Aplikacja",
      "Automatyczna synchronizacja stanu powiadomień przy każdym uruchomieniu aplikacji"
    ]
  },
  {
    version: "6.0.43",
    date: "2026-09-09",
    title: "Naprawa Błędu Notification, Płynne Przewijanie do Góry i Niezawodne Pobieranie APK",
    changes: [
      "Wyeliminowano błąd 'Notification is not defined' na telefonach komórkowych (Safari iOS, wewnętrzna przeglądarka Facebooka i Messengera, tryby incognito)",
      "Płynne przewijanie do góry (Scroll Lock Fix): usunięto przechwytywanie skośnych gestów kciuka, odblokowując natywne przewijanie ekranu",
      "Dodano funkcję powrotu na samą górę: ponowne kliknięcie w aktywną zakładkę na dolnym pasku natychmiast płynnie przewija widok na szczyt",
      "Niezawodne pobieranie plików APK: bezpośrednie pobieranie pliku w przeglądarkach Web/PWA bez blokowania przez popup-blockery",
      "Dodano uprawnienie REQUEST_INSTALL_PACKAGES w manifeście Androida, zapobiegając blokowaniu instalatora po zakończeniu pobierania",
      "Wskazówka instalatora APK: czytelna instrukcja w oknie aktualizacji wyjaśniająca zachowanie Androida przy 99% pobierania"
    ]
  },
  {
    version: "6.0.42",
    date: "2026-09-08",
    title: "Bezpośrednie Rozgłoszenia xDrip+ (100% Offline), Synchronizacja Bolusów i Posiłków oraz Poprawki AI",
    changes: [
      "Bezpośrednia integracja z xDrip+ (Direct Broadcast Intents): natychmiastowy odbiór glikemii, trendów i delty w 100% offline bez internetu i bez uprawnień do powiadomień",
      "Automatyczny odbiór zabiegów (Treatments): bolusy insuliny i spożyte węglowodany z kalkulatora xDrip+ automatycznie zasilają historię i bazę SQLite",
      "Karta konfiguracji xDrip+ z 3-krokową instrukcją uruchomienia w zakładce Ustawienia Integracji",
      "GlikoSense 4.1: wprowadzono bezpiecznik kliniczny eliminujący sprzeczne komunikaty o ukrytym wysiłku przy hiperglikemii",
      "Naprawiono błąd 'Sparkles is not defined' w module wizualnej weryfikacji potraw aparatu AI",
      "Naprawiono błąd 'useMemo is not defined' oraz 500 Internal Server Error przy generowaniu kluczy API dla xDrip+"
    ]
  },
  {
    version: "6.0.41",
    date: "2026-09-08",
    title: "Trwałe Usuwanie z Historii, Inteligentne Wykrywanie Wkłuć i Pamięć Zbiorniczka Pompy",
    changes: [
      "Trwałe usuwanie historii: usunięte posiłki, bolusy, pomiary i osprzęt są trwale usuwane ze wszystkich warstw (SQLite, IndexedDB, Nightscout i Firestore) bez ryzyka powrotu",
      "Inteligentne wykrywanie wkłuć (Smart Equipment): eliminacja fałszywych alarmów po przerwie w dostawie danych z Nightscout – aplikacja pamięta ostatni poziom i nie traktuje zera jako odniesienia",
      "Stabilny wskaźnik zbiorniczka na Pulpicie: zapobieganie chwilowemu zerowaniu poziomu na 0 U podczas przerw w komunikacji pompy z telefonem",
      "Dodano metodę trwałego usuwania pomiarów cukru z serwera Nightscout (deleteEntry API)",
      "Synchroniczna ochrona czarnej listy usuniętych identyfikatorów przed ponownym wczytaniem przy restarcie aplikacji"
    ]
  }
];

export const APK_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.45",
    date: "2026-09-11",
    title: "Optymalizacja aplikacji",
    changes: [
      "Optymalizacja aplikacji"
    ]
  },
  {
    version: "6.0.44",
    date: "2026-09-09",
    title: "Połączenie Przełącznika Powiadomień Cukru z Natywnym Paskiem Androida",
    changes: [
      "Połączono opcję 'Informacje o cukrach na pasku powiadomień' bezpośrednio z natywnym kodem Androida",
      "Wyłączenie opcji w profilu natychmiast usuwa ciągłe powiadomienie glikemii (ID: 999) z paska powiadomień i ekranu blokady",
      "Zachowano 100% ciągłość pracy serwisu w tle (GlikoForegroundService) bez zaśmiecania paska stanu",
      "Włączenie opcji natychmiast odświeża i przywraca powiadomienie z bieżącym cukrem i wykresem",
      "Dodano przełącznik powiadomień systemowych również do sekcji Profil ➔ System & Aplikacja",
      "Automatyczna synchronizacja stanu powiadomień przy każdym uruchomieniu aplikacji"
    ]
  },
  {
    version: "6.0.43",
    date: "2026-09-09",
    title: "Naprawa Błędu Notification, Płynne Przewijanie do Góry i Niezawodne Pobieranie APK",
    changes: [
      "Wyeliminowano błąd 'Notification is not defined' na telefonach komórkowych (Safari iOS, wewnętrzna przeglądarka Facebooka i Messengera, tryby incognito)",
      "Płynne przewijanie do góry (Scroll Lock Fix): usunięto przechwytywanie skośnych gestów kciuka, odblokowując natywne przewijanie ekranu",
      "Dodano funkcję powrotu na samą górę: ponowne kliknięcie w aktywną zakładkę na dolnym pasku natychmiast płynnie przewija widok na szczyt",
      "Niezawodne pobieranie plików APK: bezpośrednie pobieranie pliku w przeglądarkach Web/PWA bez blokowania przez popup-blockery",
      "Dodano uprawnienie REQUEST_INSTALL_PACKAGES w manifeście Androida, zapobiegając blokowaniu instalatora po zakończeniu pobierania",
      "Wskazówka instalatora APK: czytelna instrukcja w oknie aktualizacji wyjaśniająca zachowanie Androida przy 99% pobierania"
    ]
  },
  {
    version: "6.0.42",
    date: "2026-09-08",
    title: "Bezpośrednie Rozgłoszenia xDrip+ (100% Offline), Synchronizacja Bolusów i Posiłków oraz Poprawki AI",
    changes: [
      "Bezpośrednia integracja z xDrip+ (Direct Broadcast Intents): natychmiastowy odbiór glikemii, trendów i delty w 100% offline bez internetu i bez uprawnień do powiadomień",
      "Automatyczny odbiór zabiegów (Treatments): bolusy insuliny i spożyte węglowodany z kalkulatora xDrip+ automatycznie zasilają historię i bazę SQLite",
      "Karta konfiguracji xDrip+ z 3-krokową instrukcją uruchomienia w zakładce Ustawienia Integracji",
      "GlikoSense 4.1: wprowadzono bezpiecznik kliniczny eliminujący sprzeczne komunikaty o ukrytym wysiłku przy hiperglikemii",
      "Naprawiono błąd 'Sparkles is not defined' w module wizualnej weryfikacji potraw aparatu AI",
      "Naprawiono błąd 'useMemo is not defined' oraz 500 Internal Server Error przy generowaniu kluczy API dla xDrip+"
    ]
  },
  {
    version: "6.0.41",
    date: "2026-09-08",
    title: "Trwałe Usuwanie z Historii, Inteligentne Wykrywanie Wkłuć i Pamięć Zbiorniczka Pompy",
    changes: [
      "Trwałe usuwanie historii: usunięte posiłki, bolusy, pomiary i osprzęt są trwale usuwane ze wszystkich warstw (SQLite, IndexedDB, Nightscout i Firestore) bez ryzyka powrotu",
      "Inteligentne wykrywanie wkłuć (Smart Equipment): eliminacja fałszywych alarmów po przerwie w dostawie danych z Nightscout – aplikacja pamięta ostatni poziom i nie traktuje zera jako odniesienia",
      "Stabilny wskaźnik zbiorniczka na Pulpicie: zapobieganie chwilowemu zerowaniu poziomu na 0 U podczas przerw w komunikacji pompy z telefonem",
      "Dodano metodę trwałego usuwania pomiarów cukru z serwera Nightscout (deleteEntry API)",
      "Synchroniczna ochrona czarnej listy usuniętych identyfikatorów przed ponownym wczytaniem przy restarcie aplikacji"
    ]
  }
];
