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

export const CURRENT_VERSION = '6.0.10';

import versionData from '../../version.json';
export const CURRENT_OTA_REVISION = versionData.otaRevision || 0;

export const PWA_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.10",
    date: new Date().toISOString().split('T')[0],
    title: "Callouts Wykresu & UI Fixes",
    changes: [
      "Usprawniono działanie pigułek osprzętu na pulpicie",
      "Dodano automatyczne flagowanie (Callouts) dla szczytów i dołków na wykresie glikemii",
      "Poprawiono wyświetlanie ikon przy jednoczesnej wymianie wkłucia i sensora"
    ]
  },
  {
    version: "6.0.9",
    date: new Date().toISOString().split('T')[0],
    title: "Nowe Dyscypliny & Dzieci",
    changes: [
      "Dodano 'Bawialnię / Plac zabaw' oraz 'Rolki / Łyżwy' i 'Lekcję W-F' do listy treningów",
      "Dodano dedykowane ostrzeżenia i porady dla dzieci bawiących się na placu zabaw",
      "Pełne tłumaczenia PL/EN dla nowych typów aktywności sportowych"
    ]
  },
  {
    version: "6.0.8",
    date: "2026-08-07",
    title: "Potężny Fix & Dolne Menu",
    changes: [
      "Potężny fix dla problemu ERR_CONNECTION_CLOSED (Firestore na Androidzie)",
      "Automatyczne odblokowywanie pełnej synchronizacji po usunięciu bazy",
      "Przywrócenie paska dolnego z brakującymi ikonami (Czat, Więcej, Pulpit)"
    ]
  },
  {
    version: "6.0.7",
    date: "2026-08-06",
    title: "Migracja Skrótów & Dynamiczne Kolory",
    changes: [
      "Wdrożono automatyczną migrację kolekcji szybkich skrótów ze starej aplikacji (V1 -> V2)",
      "Zaprogramowano algorytm pseudo-dynamicznych kolorów (Fallback dla Material You)",
      "Naprawiono Tryb Eko, który teraz skutecznie wyłącza animacje (Framer Motion) i cienie",
      "Zabezpieczono Migrator przed zapętleniem wymuszonej weryfikacji braku skrótów"
    ]
  },
  {
    version: "6.0.6",
    date: "2026-08-05",
    title: "Optimistic UI & Fixes",
    changes: [
      "Zwiększono bufor Firebase uwalniając historię zblokowaną na 4-dniach (do 40tys. odczytów)",
      "Dodano natychmiastowe odświeżanie interfejsu (Optimistic UI) dla wkłuć i sensorów",
      "Wdrożono przycisk Pomiń na ekranie migracji bazy dla zatrzymanych telefonów",
      "Dodano dekompresor LZString z URI jako fallback dla starych paczek"
    ]
  }
];

export const APK_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.10",
    date: new Date().toISOString().split('T')[0],
    title: "Callouts Wykresu & UI Fixes",
    changes: [
      "Usprawniono działanie pigułek osprzętu na pulpicie",
      "Dodano automatyczne flagowanie (Callouts) dla szczytów i dołków na wykresie glikemii",
      "Poprawiono wyświetlanie ikon przy jednoczesnej wymianie wkłucia i sensora"
    ]
  },
  {
    version: "6.0.9",
    date: new Date().toISOString().split('T')[0],
    title: "Nowe Dyscypliny & Dzieci",
    changes: [
      "Dodano 'Bawialnię / Plac zabaw' oraz 'Rolki / Łyżwy' i 'Lekcję W-F' do listy treningów",
      "Dodano dedykowane ostrzeżenia i porady dla dzieci bawiących się na placu zabaw",
      "Pełne tłumaczenia PL/EN dla nowych typów aktywności sportowych"
    ]
  },
  {
    version: "6.0.8",
    date: "2026-08-07",
    title: "Potężny Fix & Dolne Menu",
    changes: [
      "Potężny fix dla problemu ERR_CONNECTION_CLOSED (Firestore na Androidzie)",
      "Automatyczne odblokowywanie pełnej synchronizacji po usunięciu bazy",
      "Przywrócenie paska dolnego z brakującymi ikonami (Czat, Więcej, Pulpit)"
    ]
  },
  {
    version: "6.0.7",
    date: "2026-08-06",
    title: "Migracja Skrótów & Dynamiczne Kolory",
    changes: [
      "Wdrożono automatyczną migrację kolekcji szybkich skrótów ze starej aplikacji (V1 -> V2)",
      "Zaprogramowano algorytm pseudo-dynamicznych kolorów (Fallback dla Material You)",
      "Naprawiono Tryb Eko, który teraz skutecznie wyłącza animacje (Framer Motion) i cienie",
      "Zabezpieczono Migrator przed zapętleniem wymuszonej weryfikacji braku skrótów"
    ]
  },
  {
    version: "6.0.6",
    date: "2026-08-05",
    title: "Optimistic UI & Fixes",
    changes: [
      "Zwiększono bufor Firebase uwalniając historię zblokowaną na 4-dniach (do 40tys. odczytów)",
      "Dodano natychmiastowe odświeżanie interfejsu (Optimistic UI) dla wkłuć i sensorów",
      "Wdrożono przycisk Pomiń na ekranie migracji bazy dla zatrzymanych telefonów",
      "Dodano dekompresor LZString z URI jako fallback dla starych paczek"
    ]
  }
];
