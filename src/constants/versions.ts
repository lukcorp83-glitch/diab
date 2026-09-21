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

export const CURRENT_VERSION = '6.0.47';

import versionData from '../../version.json';
export const CURRENT_OTA_REVISION = versionData.otaRevision || 0;

export const PWA_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.47",
    date: "2026-09-21",
    title: "Logowanie przez Facebook, Data Wymiany na Widżetach i Poprawki Powiadomień",
    changes: [
      "Wdrożono obsługę logowania i rejestracji konta przez Facebook na wszystkich platformach (Web, PWA oraz natywna aplikacja APK)",
      "Dodano czytelny wskaźnik daty i godziny wymiany (dzień tygodnia, dzień, miesiąc i godzina) na widżetach pulpitu dla Sensora i Wkłucia",
      "Zachowano 100% kompaktowych gabarytów kafelków bez powiększania widżetów w siatce pulpitu",
      "Dodano szybkie przyciski wyboru żywotności sensora w Profilu: 7 dni (Guardian), 10 dni (Dexcom), 14 dni (Libre)",
      "Wyeliminowano problem podwójnych powiadomień po zakończeniu odliczania timera pre-bolusa",
      "Wprowadzono trwałą blokadę restartu i ponownego przeliczania zakończonego timera przy późniejszym wzroście glikemii",
      "Naprawiono wysyłanie powiadomienia na 12 godzin przed planowaną wymianą wkłucia (infusion set)"
    ]
  },
  {
    version: "6.0.46",
    date: "2026-09-17",
    title: "Naprawa zawieszania widżetów, stabilizacja serwisu w tle i optymalizacja bazy",
    changes: [
      "Naprawiono pętlę serwisu w tle (GlikoForegroundService), gwarantując ciągłe odświeżanie danych 24/7",
      "Zabezpieczono harmonogram alarmów widżetów Androida przed przerwaniem przy błędach sieciowych",
      "Wyeliminowano zamrażanie interfejsu (ANR) przy wznawianiu aplikacji poprzez optymalizację łączenia wpisów Nightscout O(1)",
      "Natychmiastowe wyświetlanie świeżych danych z lokalnej bazy SQLite po wznowieniu aplikacji",
      "Zoptymalizowano proces synchronizacji w tle Nightscout Worker (skrócenie timeoutów i ograniczenie partii)"
    ]
  },
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
  }
];

export const APK_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.47",
    date: "2026-09-21",
    title: "Logowanie przez Facebook, Data Wymiany na Widżetach i Poprawki Powiadomień",
    changes: [
      "Wdrożono obsługę logowania i rejestracji konta przez Facebook na wszystkich platformach (Web, PWA oraz natywna aplikacja APK)",
      "Dodano czytelny wskaźnik daty i godziny wymiany (dzień tygodnia, dzień, miesiąc i godzina) na widżetach pulpitu dla Sensora i Wkłucia",
      "Zachowano 100% kompaktowych gabarytów kafelków bez powiększania widżetów w siatce pulpitu",
      "Dodano szybkie przyciski wyboru żywotności sensora w Profilu: 7 dni (Guardian), 10 dni (Dexcom), 14 dni (Libre)",
      "Wyeliminowano problem podwójnych powiadomień po zakończeniu odliczania timera pre-bolusa",
      "Wprowadzono trwałą blokadę restartu i ponownego przeliczania zakończonego timera przy późniejszym wzroście glikemii",
      "Naprawiono wysyłanie powiadomienia na 12 godzin przed planowaną wymianą wkłucia (infusion set)"
    ]
  },
  {
    version: "6.0.46",
    date: "2026-09-17",
    title: "Naprawa zawieszania widżetów, stabilizacja serwisu w tle i optymalizacja bazy",
    changes: [
      "Naprawiono pętlę serwisu w tle (GlikoForegroundService), gwarantując ciągłe odświeżanie danych 24/7",
      "Zabezpieczono harmonogram alarmów widżetów Androida przed przerwaniem przy błędach sieciowych",
      "Wyeliminowano zamrażanie interfejsu (ANR) przy wznawianiu aplikacji poprzez optymalizację łączenia wpisów Nightscout O(1)",
      "Natychmiastowe wyświetlanie świeżych danych z lokalnej bazy SQLite po wznowieniu aplikacji",
      "Zoptymalizowano proces synchronizacji w tle Nightscout Worker (skrócenie timeoutów i ograniczenie partii)"
    ]
  },
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
  }
];
