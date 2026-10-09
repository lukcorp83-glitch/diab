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

export const CURRENT_VERSION = '6.0.62';

import versionData from '../../version.json';
export const CURRENT_OTA_REVISION = versionData.otaRevision || 0;

export const PWA_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.62",
    date: "2026-10-09",
    title: "Harmonijkowa Edycja Apteczki i Zlecenie na Zaopatrzenie NFZ",
    changes: [
      "Wdrożono płynne, harmonijkowe rozwijanie edycji sprzętu (inline accordion) bezpośrednio w klikniętym kafelku Apteczki",
      "Wprowadzono moduł zlecenia na zaopatrzenie i refundacji NFZ z szybkim wyborem cyklu (+1m, +3m, +6m)",
      "Dodano interaktywne pigułki zliczania odebranych transz w aptece oraz eksport do Kalendarza systemowego",
      "Zaimplementowano inteligentny bilans zapasów vs zlecenia ostrzegający przed przepadnięciem transzy",
      "Dodano priorytetowe powiadomienia i alerty w pasku «W skrócie» o zbliżającym się końcu ważności zlecenia"
    ]
  },
  {
    version: "6.0.61",
    date: "2026-10-09",
    title: "Poprawka Wykresu Glikemii i Responsywności Talerza",
    changes: [
      "Naprawiono błąd wyświetlania dymka szczegółów punktu pomiaru na wykresie cukru (brakujący import cn)",
      "Zoptymalizowano responsywność karty wskaźnika sytości i błonnika na Talerzu, eliminując nakładanie się etykiet na małych ekranach",
      "Wdrożono asystenta kolejności spożywania produktów (sekwencjonowanie kęsów) tworzącego naturalny bufor żołądkowy",
      "Wprowadzono zasadę «Ubierania Węglowodanów» oraz modyfikator schłodzonej skrobi (retrogradacja)",
      "Dodano wykrywacz ukrytych cukrów w gotowych sosach i dressingach"
    ]
  },
  {
    version: "6.0.60",
    date: "2026-10-09",
    title: "Kolejność Kęsów, Wskaźnik Sytości i Skrobia Oporna",
    changes: [
      "Wdrożono asystenta kolejności spożywania produktów (sekwencjonowanie kęsów) tworzącego naturalny bufor żołądkowy",
      "Dodano zasadę «Ubierania Węglowodanów» ostrzegającą przed posiłkami z samych węglowodanów bez tłuszczu i białka",
      "Wprowadzono wskaźnik sytości posiłku (Satiety Score) szacujący czas trwania nasycenia energią",
      "Dodano modyfikator schłodzonej skrobi (efekt retrogradacji ziemniaków, ryżu i makaronu) obniżający indeks glikemiczny",
      "Wdrożono wykrywacz ukrytych cukrów w gotowych sosach i dressingach"
    ]
  },
  {
    version: "6.0.59",
    date: "2026-10-06",
    title: "Styl Pixel & Material You oraz Usprawnienia Interfejsu",
    changes: [
      "Wdrożono inteligentny pasek «W skrócie» na pulpicie z dynamicznym statusem stopera, osprzętu i glikemii (z możliwością wyłączenia w Ustawieniach)",
      "Dodano haptyczne suwaki precyzyjnego doboru dawek insuliny i wagi produktów na Talerzu z mechanicznym tyknięciem",
      "Wprowadzono pigułki filtrów Material 3 Filter Chips w historii posiłków oraz elastyczne rozciąganie listy",
      "Wdrożono ekspresowe pigułki szybkiego wyszukiwania w Bazie Produktów oraz inteligentny dymek punktu na wykresie glikemii",
      "Dodano Material 3 Segmented Button na wykresie pełnoekranowym oraz zwijany przycisk Expressive FAB",
      "Zaimplementowano okna dialogowe potwierdzeń Pixel Monet oraz klauzulę bezpieczeństwa medycznego przy analizie leków AI",
      "Wdrożono klauzulę o wartościach poglądowych analizy AI ze zdjęcia oraz pamięć podręczną ostatniego posiłku z aparatu (zapobiegającą utracie)",
      "Wdrożono Haptic Target Pulse na wykresie cukru, wskaźnik błonnika Fiber Shield na Talerzu oraz szybkie chipy przesunięcia czasu posiłku"
    ]
  },
  {
    version: "6.0.58",
    date: "2026-10-05",
    title: "Powiadomienia Aktualizacji, Monitor Tła i Ulepszone Animacje",
    changes: [
      "Wyeliminowano błąd blokujący powiadomienia o aktualizacjach (w tym wersji Beta) w Androidzie i naprawiono zasób ikony powiadomień",
      "Dodano cykliczny monitor dostępności wydań w usłudze tła Androida (GlikoForegroundService) powiadamiający o nowościach",
      "Ulepszono animacje i płynność interfejsu (dolna belka, menu boczne, okna dialogowe)",
      "Wdrożono ścisłe wykluczenia indeksowania plików tymczasowych Androida, redukując zużycie pamięci RAM"
    ]
  }
];

export const APK_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.62",
    date: "2026-10-09",
    title: "Harmonijkowa Edycja Apteczki i Zlecenie na Zaopatrzenie NFZ",
    changes: [
      "Wdrożono płynne, harmonijkowe rozwijanie edycji sprzętu (inline accordion) bezpośrednio w klikniętym kafelku Apteczki",
      "Wprowadzono moduł zlecenia na zaopatrzenie i refundacji NFZ z szybkim wyborem cyklu (+1m, +3m, +6m)",
      "Dodano interaktywne pigułki zliczania odebranych transz w aptece oraz eksport do Kalendarza systemowego",
      "Zaimplementowano inteligentny bilans zapasów vs zlecenia ostrzegający przed przepadnięciem transzy",
      "Dodano priorytetowe powiadomienia i alerty w pasku «W skrócie» o zbliżającym się końcu ważności zlecenia"
    ]
  },
  {
    version: "6.0.61",
    date: "2026-10-09",
    title: "Poprawka Wykresu Glikemii i Responsywności Talerza",
    changes: [
      "Naprawiono błąd wyświetlania dymka szczegółów punktu pomiaru na wykresie cukru (brakujący import cn)",
      "Zoptymalizowano responsywność karty wskaźnika sytości i błonnika na Talerzu, eliminując nakładanie się etykiet na małych ekranach",
      "Wdrożono asystenta kolejności spożywania produktów (sekwencjonowanie kęsów) tworzącego naturalny bufor żołądkowy",
      "Wprowadzono zasadę «Ubierania Węglowodanów» oraz modyfikator schłodzonej skrobi (retrogradacja)",
      "Dodano wykrywacz ukrytych cukrów w gotowych sosach i dressingach"
    ]
  },
  {
    version: "6.0.60",
    date: "2026-10-09",
    title: "Kolejność Kęsów, Wskaźnik Sytości i Skrobia Oporna",
    changes: [
      "Wdrożono asystenta kolejności spożywania produktów (sekwencjonowanie kęsów) tworzącego naturalny bufor żołądkowy",
      "Dodano zasadę «Ubierania Węglowodanów» ostrzegającą przed posiłkami z samych węglowodanów bez tłuszczu i białka",
      "Wprowadzono wskaźnik sytości posiłku (Satiety Score) szacujący czas trwania nasycenia energią",
      "Dodano modyfikator schłodzonej skrobi (efekt retrogradacji ziemniaków, ryżu i makaronu) obniżający indeks glikemiczny",
      "Wdrożono wykrywacz ukrytych cukrów w gotowych sosach i dressingach"
    ]
  },
  {
    version: "6.0.59",
    date: "2026-10-06",
    title: "Styl Pixel & Material You oraz Usprawnienia Interfejsu",
    changes: [
      "Wdrożono inteligentny pasek «W skrócie» na pulpicie z dynamicznym statusem stopera, osprzętu i glikemii (z możliwością wyłączenia w Ustawieniach)",
      "Dodano haptyczne suwaki precyzyjnego doboru dawek insuliny i wagi produktów na Talerzu z mechanicznym tyknięciem",
      "Wprowadzono pigułki filtrów Material 3 Filter Chips w historii posiłków oraz elastyczne rozciąganie listy",
      "Wdrożono ekspresowe pigułki szybkiego wyszukiwania w Bazie Produktów oraz inteligentny dymek punktu na wykresie glikemii",
      "Dodano Material 3 Segmented Button na wykresie pełnoekranowym oraz zwijany przycisk Expressive FAB",
      "Zaimplementowano okna dialogowe potwierdzeń Pixel Monet oraz klauzulę bezpieczeństwa medycznego przy analizie leków AI",
      "Wdrożono klauzulę o wartościach poglądowych analizy AI ze zdjęcia oraz pamięć podręczną ostatniego posiłku z aparatu (zapobiegającą utracie)",
      "Wdrożono Haptic Target Pulse na wykresie cukru, wskaźnik błonnika Fiber Shield na Talerzu oraz szybkie chipy przesunięcia czasu posiłku"
    ]
  },
  {
    version: "6.0.58",
    date: "2026-10-05",
    title: "Powiadomienia Aktualizacji, Monitor Tła i Ulepszone Animacje",
    changes: [
      "Wyeliminowano błąd blokujący powiadomienia o aktualizacjach (w tym wersji Beta) w Androidzie i naprawiono zasób ikony powiadomień",
      "Dodano cykliczny monitor dostępności wydań w usłudze tła Androida (GlikoForegroundService) powiadamiający o nowościach",
      "Ulepszono animacje i płynność interfejsu (dolna belka, menu boczne, okna dialogowe)",
      "Wdrożono ścisłe wykluczenia indeksowania plików tymczasowych Androida, redukując zużycie pamięci RAM"
    ]
  }
];
