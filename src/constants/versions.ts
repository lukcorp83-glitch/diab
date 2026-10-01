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

export const CURRENT_VERSION = '6.0.54';

import versionData from '../../version.json';
export const CURRENT_OTA_REVISION = versionData.otaRevision || 0;

export const PWA_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.54",
    date: "2026-10-01",
    title: "Wydanie Oficjalne: Inteligentne Alarmy Leków, Poprawki Układu GlikoSense i Bezpieczeństwo MDR",
    changes: [
      "Wdrożono inteligentne wyciszanie powiadomień o lekach (brak fałszywych alarmów, gdy lek został zażyty wcześniej)",
      "Dodano automatyczne anulowanie i przeplanowywanie kolejnych dawek leków na dzień następny",
      "Naprawiono układ kart i badge'y w widżecie GlikoSense na dużych ekranach (brak kolizji i nachodzenia na siebie)",
      "Zabezpieczono nagłówek predykcji 30m przed ściskaniem i łamaniem w wąskich kolumnach pulpitu",
      "Przeprowadzono pełny audyt zgodności z MDR SaMD (brak narzucania dawek leków przez AI i system)"
    ]
  },
  {
    version: "6.0.51",
    date: "2026-09-30",
    title: "Ręczny Rejestrator Dawek, Łagodny Stoper i Zgodność z MDR",
    changes: [
      "Wprowadzono ręczny rejestrator podanej dawki insuliny (pełna swoboda i manualna kontrola pacjenta bez automatycznego narzucania dawek)",
      "Złagodzono stoper czasu przedposiłkowego (orientacyjne sugestie czasu na posiłek i wyciszenie pośpiechu)",
      "Dostosowano terminologię w całej aplikacji do wymogów MDR (zamiana terminologii medycznej na informacyjną i edukacyjną)",
      "Wprowadzono wyraźne noty informacyjne o braku decyzji terapeutycznych w modułach analitycznych",
      "Uporządkowano i zoptymalizowano strukturę projektu oraz usunięto zbędne pliki robocze"
    ]
  },
  {
    version: "6.0.50",
    date: "2026-09-25",
    title: "Hypo Safety Shield, Płynne Animacje Pixel / Material 3 i Odświeżony Trend 30D",
    changes: [
      "Wdrożono bezpiecznik medyczny Hypo Safety Shield w stoperze przedposiłkowym (natychmiastowe skrócenie czasu do 0 i alert przy gwałtownym spadku cukru)",
      "Dodano responsywne, sprzętowo akcelerowane animacje kafelków na Pulpicie w stylu Google Pixel / Material 3 (Material Spring na Androidzie, hover na Web)",
      "Odświeżono wykres trendu miesięcznego w zakładce GlikoSense: dodano korytarz normy, wskaźniki dziennego TIR i szacowane HbA1c z 30 dni (GMI)",
      "Zabezpieczono animacje pulpitowe przed niepożądanym ruchem w trybie reorganizacji siatki kafelków",
      "Dodano pełne dwujęzyczne wsparcie (PL/EN) dla powiadomień i monitów bezpieczeństwa stopera"
    ]
  },
  {
    version: "6.0.49",
    date: "2026-09-22",
    title: "Ustawienia w Pasku Nawigacji, Akceleracja Sprzętowa GPU i Indeksy SQLite",
    changes: [
      "Dodano zakładkę 'Ustawienia' (dawniej System) do wyboru jako 4. przycisk dolnego paska nawigacyjnego",
      "Wdrożono natywną akcelerację sprzętową GPU WebView w systemie Android dla maksymalnej płynności",
      "Dodano indeksy B-Tree (timestamp, type) w lokalnej bazie SQLite – skanowanie bazy przyspieszone z setek ms do 1-2 ms",
      "Zoptymalizowano renderowanie wykresu glikemii (capping DPR na ekranach 3x/3.5x - o 60% mniej obciążenia GPU)",
      "Dodano sprzętowe warstwy kompozytora (will-change: transform) na kapsule akcji, pasku dolnym, menu bocznym i modalach",
      "Usunięto przestarzały moduł migracji ze starej bazy i oczyszczono zapytania synchronizacyjne"
    ]
  },
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

];

export const APK_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.54",
    date: "2026-10-01",
    title: "Wydanie Oficjalne: Inteligentne Alarmy Leków, Poprawki Układu GlikoSense i Bezpieczeństwo MDR",
    changes: [
      "Wdrożono inteligentne wyciszanie powiadomień o lekach (brak fałszywych alarmów, gdy lek został zażyty wcześniej)",
      "Dodano automatyczne anulowanie i przeplanowywanie kolejnych dawek leków na dzień następny",
      "Naprawiono układ kart i badge'y w widżecie GlikoSense na dużych ekranach (brak kolizji i nachodzenia na siebie)",
      "Zabezpieczono nagłówek predykcji 30m przed ściskaniem i łamaniem w wąskich kolumnach pulpitu",
      "Przeprowadzono pełny audyt zgodności z MDR SaMD (brak narzucania dawek leków przez AI i system)"
    ]
  },
  {
    version: "6.0.51",
    date: "2026-09-30",
    title: "Ręczny Rejestrator Dawek, Łagodny Stoper i Zgodność z MDR",
    changes: [
      "Wprowadzono ręczny rejestrator podanej dawki insuliny (pełna swoboda i manualna kontrola pacjenta bez automatycznego narzucania dawek)",
      "Złagodzono stoper czasu przedposiłkowego (orientacyjne sugestie czasu na posiłek i wyciszenie pośpiechu)",
      "Dostosowano terminologię w całej aplikacji do wymogów MDR (zamiana terminologii medycznej na informacyjną i edukacyjną)",
      "Wprowadzono wyraźne noty informacyjne o braku decyzji terapeutycznych w modułach analitycznych",
      "Uporządkowano i zoptymalizowano strukturę projektu oraz usunięto zbędne pliki robocze"
    ]
  },
  {
    version: "6.0.50",
    date: "2026-09-25",
    title: "Hypo Safety Shield, Płynne Animacje Pixel / Material 3 i Odświeżony Trend 30D",
    changes: [
      "Wdrożono bezpiecznik medyczny Hypo Safety Shield w stoperze przedposiłkowym (natychmiastowe skrócenie czasu do 0 i alert przy gwałtownym spadku cukru)",
      "Dodano responsywne, sprzętowo akcelerowane animacje kafelków na Pulpicie w stylu Google Pixel / Material 3 (Material Spring na Androidzie, hover na Web)",
      "Odświeżono wykres trendu miesięcznego w zakładce GlikoSense: dodano korytarz normy, wskaźniki dziennego TIR i szacowane HbA1c z 30 dni (GMI)",
      "Zabezpieczono animacje pulpitowe przed niepożądanym ruchem w trybie reorganizacji siatki kafelków",
      "Dodano pełne dwujęzyczne wsparcie (PL/EN) dla powiadomień i monitów bezpieczeństwa stopera"
    ]
  },
  {
    version: "6.0.49",
    date: "2026-09-22",
    title: "Ustawienia w Pasku Nawigacji, Akceleracja Sprzętowa GPU i Indeksy SQLite",
    changes: [
      "Dodano zakładkę 'Ustawienia' (dawniej System) do wyboru jako 4. przycisk dolnego paska nawigacyjnego",
      "Wdrożono natywną akcelerację sprzętową GPU WebView w systemie Android dla maksymalnej płynności",
      "Dodano indeksy B-Tree (timestamp, type) w lokalnej bazie SQLite – skanowanie bazy przyspieszone z setek ms do 1-2 ms",
      "Zoptymalizowano renderowanie wykresu glikemii (capping DPR na ekranach 3x/3.5x - o 60% mniej obciążenia GPU)",
      "Dodano sprzętowe warstwy kompozytora (will-change: transform) na kapsule akcji, pasku dolnym, menu bocznym i modalach",
      "Usunięto przestarzały moduł migracji ze starej bazy i oczyszczono zapytania synchronizacyjne"
    ]
  },
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

];
