export interface VersionEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const VERSIONS: VersionEntry[] = [
  {
    version: "3.1.0",
    date: "2026-05-05",
    title: "Aktualizacja Edukacyjna - Mądry Gliko",
    changes: [
      "Nowy interaktywny Quiz Edukacyjny z nagrodami (monety i XP)",
      "Rozszerzona baza pytań o cukrzycy przyjaznych dzieciom",
      "Magiczny Ogród TIR - hoduj rośliny dzięki dobrym cukrom",
      "Dziennik Przygód Gliko - historia Twoich pomiarów z animacjami",
      "Wskaźnik Energii Gliko (IOB) - zobacz ile insuliny ma Twój przyjaciel",
      "Poprawiona stabilność i nowe animacje reakcji",
      "Dodano system historii zmian v3.1"
    ]
  },
  {
    version: "2.8.0",
    date: "2024-11-20",
    title: "System Skinów i Akcesoriów",
    changes: [
      "Wprowadzenie sklepu z akcesoriami",
      "Nowe skórki: Robot, Alien, Duch, Ninja",
      "System misji dziennych i poziomów XP",
      "Mini-gra 'Celuj w Cukier'"
    ]
  },
  {
    version: "1.0.0",
    date: "2024-01-15",
    title: "Pierwsze spotkanie z Gliko",
    changes: [
      "Podstawowy system opieki nad Gliko",
      "Integracja z pomiarami glukozy",
      "Podstawowe karmienie i interakcje"
    ]
  }
];

export const CURRENT_VERSION = "3.1.0";
