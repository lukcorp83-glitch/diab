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

export const CURRENT_VERSION = '6.0.64';

import versionData from '../../version.json';
export const CURRENT_OTA_REVISION = versionData.otaRevision || 0;

export const PWA_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.64",
    date: "2026-10-15",
    title: "Baza Produktów DiabScale w SQLite i Selektywna Haptyka",
    changes: [
      "Wdrożono modularną bazę produktów żywnościowych DiabScale-grade podzieloną tematycznie (pieczywo, nabiał, mięsa, ryby, owoce, warzywa, polskie obiady, zupy, słodycze, napoje)",
      "Zaimplementowano trwałą tabelę SQLite food_products w pamięci telefonu z automatycznym zasiewem przy starcie i 100% odpornością na czyszczenie pamięci podręcznej",
      "Wdrożono trwały zapis własnych potraw i skomponowanych zestawów w bazie SQLite telefonu (pełna dostępność offline)",
      "Wyeliminowano narzut czasowy tłumaczeń i18n przy starcie bazy produktów oraz zoptymalizowano wyszukiwanie z wirtualizacją listy",
      "Dodano kalibrację wagową widzenia AI (Reality Anchors) z kuchennymi gramaturami odniesienia, eliminującą zawyżanie węglowodanów przy zdjęciach z bliska",
      "Wprowadzono selektywny dotykowy scrubbing na wykresie cukru – wibracje haptyczne pojawiają się tylko przy glikemii poza celem (w normie telefon nie wibruje)"
    ]
  },
  {
    version: "6.0.63",
    date: "2026-10-14",
    title: "Fizykochemia Posiłku i Dania Złożone",
    changes: [
      "Wdrożono Matrycę Fizykochemiczną Posiłku: detekcja bufora kwasowego (kiszonki/octy), błonnika żelującego (chia/owies), wolumetryki i estymacji pasażu żołądkowego",
      "Wprowadzono wskaźnik odstępu trawiennego (okno MMC) monitorujący czas od poprzedniego posiłku",
      "Zaimplementowano inteligentne sekwencjonowanie dań złożonych (hot dog, burger, kanapka, zapiekanka itp.) z oznaczeniem całości",
      "Wzbogacono analizę AI ze zdjęcia o detekcję matrycy fizykochemicznej i zawartości błonnika",
      "Usunięto zablokowany protokół Android Auto oraz zoptymalizowano wagę aplikacji (lazy chunking samouczka)"
    ]
  },
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
  }
];

export const APK_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.64",
    date: "2026-10-15",
    title: "Baza Produktów DiabScale w SQLite i Selektywna Haptyka",
    changes: [
      "Wdrożono modularną bazę produktów żywnościowych DiabScale-grade podzieloną tematycznie (pieczywo, nabiał, mięsa, ryby, owoce, warzywa, polskie obiady, zupy, słodycze, napoje)",
      "Zaimplementowano trwałą tabelę SQLite food_products w pamięci telefonu z automatycznym zasiewem przy starcie i 100% odpornością na czyszczenie pamięci podręcznej",
      "Wdrożono trwały zapis własnych potraw i skomponowanych zestawów w bazie SQLite telefonu (pełna dostępność offline)",
      "Wyeliminowano narzut czasowy tłumaczeń i18n przy starcie bazy produktów oraz zoptymalizowano wyszukiwanie z wirtualizacją listy",
      "Dodano kalibrację wagową widzenia AI (Reality Anchors) z kuchennymi gramaturami odniesienia, eliminującą zawyżanie węglowodanów przy zdjęciach z bliska",
      "Wprowadzono selektywny dotykowy scrubbing na wykresie cukru – wibracje haptyczne pojawiają się tylko przy glikemii poza celem (w normie telefon nie wibruje)"
    ]
  },
  {
    version: "6.0.63",
    date: "2026-10-14",
    title: "Fizykochemia Posiłku i Dania Złożone",
    changes: [
      "Wdrożono Matrycę Fizykochemiczną Posiłku: detekcja bufora kwasowego (kiszonki/octy), błonnika żelującego (chia/owies), wolumetryki i estymacji pasażu żołądkowego",
      "Wprowadzono wskaźnik odstępu trawiennego (okno MMC) monitorujący czas od poprzedniego posiłku",
      "Zaimplementowano inteligentne sekwencjonowanie dań złożonych (hot dog, burger, kanapka, zapiekanka itp.) z oznaczeniem całości",
      "Wzbogacono analizę AI ze zdjęcia o detekcję matrycy fizykochemicznej i zawartości błonnika",
      "Usunięto zablokowany protokół Android Auto oraz zoptymalizowano wagę aplikacji (lazy chunking samouczka)"
    ]
  },
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
  }
];
