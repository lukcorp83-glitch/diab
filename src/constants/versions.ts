export interface VersionEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const VERSIONS: VersionEntry[] = [
  {
    version: "3.3.4",
    date: "2026-05-10",
    title: "Notatnik, Ładunek Glikemiczny i Inteligentniejszy GlikoSense",
    changes: [
      "Nowość: Osobisty notatnik i kompendium wiedzy do szybkiego zapisywania przemyśleń.",
      "Poprawienie logiki GlikoSense – trafniejsze i skuteczniejsze wnioski i alerty.",
      "Dodano wyliczanie Ładunku Glikemicznego (ŁG) dla posiłków i produktów – dla jeszcze lepszej kontroli."
    ]
  },
  {
    version: "3.3.3",
    date: "2026-05-09",
    title: "Poprawki wyświetlania (Zaokrąglanie)",
    changes: [
      "Poprawiono zaokrąglanie wartości insuliny (bolusów, bazy) oraz jednostek na wykresie i statusie pompy, ukrywając niepotrzebne liczby po przecinku."
    ]
  },
  {
    version: "3.3.2",
    date: "2026-05-09",
    title: "Poprawka API Gemini",
    changes: [
      "Naprawiono priorytetyzację i zapisywanie własnego klucza API Gemini.",
      "Poprawki drobnych błędów z instalacją i stabilnością."
    ]
  },
  {
    version: "3.3.1",
    date: "2026-05-08",
    title: "Poprawki Instalacji (PWA)",
    changes: [
      "Naprawiono błąd z niepoprawnym adresem URL przy instalacji aplikacji PWA z uciętym `/diab/`.",
      "Aktualizacja silnika i drobne poprawki."
    ]
  },
  {
    version: "3.3.0",
    date: "2026-05-08",
    title: "GlikoSense 2.5 - Deep Analysis & UI",
    changes: [
      "Nowy, ekskluzywny wygląd widgetu GlikoSense (Glassmorphism, dynamiczne tło, animacje predykcji)",
      "Rozszerzenie okresu wyciągania wniosków przez GlikoSense z 7 do 14 dni",
      "Przebudowany układ najważniejszych metryk: 'Kierunek za 1h' i 'Pewność Modelu' mają teraz wyższy priorytet",
      "Bardziej precyzyjne komunikaty algorytmu i poprawki gramatyczne",
      "Nowe, ulepszone metryki rozkładu dni (analiza dni w których cukier bywa trudniejszy)"
    ]
  },
  {
    version: "3.2.0",
    date: "2026-05-05",
    title: "GlikoSense Engine 2.4 – Inteligencja Offline",
    changes: [
      "Nowy detektor zużytego wkłucia: Alert przy braku reakcji na insulinę przez 4h",
      "Analiza cyklu dobowego: Wykrywanie zmiennej wrażliwości w ciągu dnia (Feature F)",
      "Branding GlikoSense: Wszystkie analizy algorytmu są teraz wyraźnie oznaczone",
      "Wersja silnika GlikoSense (v2.4.1) widoczna w ustawieniach profilu",
      "Nowy salon gier: Gliko Arcade (Sky Higher, Zagadka Talerzy, Memory, Ogród TIR)",
      "MealPlate UX: Wykres makroskładników (%) oraz pływający przycisk nawigacji do talerza",
      "Ulepszona predykcja krzyżowa (zjawisko brzasku i modelowanie nocne)"
    ]
  },
  {
    version: "3.1.0",
    date: "2026-05-05",
    title: "Aktualizacja Majowa - Mądry Gliko & UX",
    changes: [
      "Nowy interaktywny Quiz Edukacyjny dla dzieci o cukrzycy (Gliko Quiz)",
      "System historii zmian (Changelog) dostępny w profilu",
      "Wskaźnik energii Gliko bazujący na Aktywnej Insulinie (IOB)",
      "Nowe animacje reakcji Gliko na poziomy cukru",
      "Poprawiona stabilność bazy danych i synchronizacji",
      "Optymalizacja interfejsu użytkownika i poprawki wizualne",
      "Dodano możliwość zamykania powiadomień systemowych GlikoSense"
    ]
  },
  {
    version: "2.8.0",
    date: "2026-05-04",
    title: "System Personalizacji i Sklep",
    changes: [
      "Wprowadzenie sklepu z akcesoriami i nowymi skórkami",
      "System misji dziennych i poziomów doświadczenia XP",
      "Dodano mini-grę 'Celuj w Cukier'",
      "Możliwość zmiany tła pokoju Gliko"
    ]
  },
  {
    version: "1.0.0",
    date: "2026-04-15",
    title: "Start aplikacji GlikoControl",
    changes: [
      "Podstawowy system opieki nad wirtualnym przyjacielem",
      "Integracja z logami glukozy i posiłków",
      "System powiadomień o niskim i wysokim cukrze"
    ]
  }
];

export const CURRENT_VERSION = "3.3.4";
