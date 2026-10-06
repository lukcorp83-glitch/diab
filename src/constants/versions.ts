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

export const CURRENT_VERSION = '6.0.59';

import versionData from '../../version.json';
export const CURRENT_OTA_REVISION = versionData.otaRevision || 0;

export const PWA_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.59",
    date: "2026-10-06",
    title: "Stabilizacja Uruchamiania z Widżetu i Naprawa Zimnego Startu",
    changes: [
      "Wyeliminowano błąd krytyczny na zimnym starcie aplikacji (Cannot read properties of undefined reading length)",
      "Naprawiono wielokrotne i samoczynne otwieranie aparatu po kliknięciu natywnego widżetu aparatu AI",
      "Zoptymalizowano obsługę intencji i skrótów Androida zapobiegając powtórnemu wywoływaniu akcji przy wznawianiu aplikacji",
      "Wdrożono defensywne sprawdzanie stanu magazynów i widżetów pulpitu"
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
  },
  {
    version: "6.0.57",
    date: "2026-10-05",
    title: "Poprawka Widżetu Aparatu AI i Stabilność Talerza",
    changes: [
      "Wyeliminowano błąd krytyczny (Cannot read properties of undefined reading length) przy uruchamianiu aplikacji z poziomu natywnego widżetu aparatu AI",
      "Wdrożono pancerne bezpieczniki stanu Talerza (sharedPlate) w Centrum Żywienia, pasku akcji oraz kreatorze dań",
      "Dodano automatyczną rehydratację i walidację pamięci podręcznej składników posiłku w magazynie lokalnym"
    ]
  },
  {
    version: "6.0.56",
    date: "2026-10-02",
    title: "Kompletne Statystyki Dzienne, Średnia Glikemia i Pełna Insulina",
    changes: [
      "Wdrożono wyświetlanie średniej glikemii (mg/dL) oraz wskaźnika TIR na kafelkach kalendarza dziennego, eliminując puste komórki",
      "Dodano pełne podsumowanie miesiąca o średnią glikemię i procent czasu w normie (TIR)",
      "Rozszerzono dekodowanie dawek insuliny (bolusów) ze wszystkich formatów Nightscout (units, dose, combo bolus, amount)",
      "Wydłużono lokalne przechowywanie historii odczytów glukozy CGM w bazie SQLite na telefonie do 90 dni (pełny kwartał)",
      "Zwiększono bufor synchronizacji Nightscout do 10 000 wpisów, zapewniając pełne pokrycie 35 dni pomiarów"
    ]
  },
  {
    version: "6.0.55",
    date: "2026-10-01",
    title: "Podwójne Strzałki CGM, Synchronizacja Leków i Powiadomienia Push",
    changes: [
      "Wdrożono czytelne podwójne strzałki trendu (↑↑ / ↓↓) na wykresie Canvas oraz ikony podwójnych strzałek na pulpicie przy gwałtownych skokach cukru (>= 3 mg/dL/min)",
      "Dodano pełną synchronizację zażytych leków w czasie rzeczywistym między telefonem a komputerem przez chmurę Firestore",
      "Wdrożono systemowe powiadomienia push w belce telefonu informujące o dostępności nowej wersji aplikacji",
      "Zneutralizowano porady w modułach Diety oraz GlikoTrening zgodnie z wymogami MDR SaMD (brak narzucania dawek insuliny)",
      "Zapewniono 100% dwujęzyczność (PL/EN) dla wszystkich nowych banerów medycznych i powiadomień"
    ]
  }
];

export const APK_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.59",
    date: "2026-10-06",
    title: "Stabilizacja Uruchamiania z Widżetu i Naprawa Zimnego Startu",
    changes: [
      "Wyeliminowano błąd krytyczny na zimnym starcie aplikacji (Cannot read properties of undefined reading length)",
      "Naprawiono wielokrotne i samoczynne otwieranie aparatu po kliknięciu natywnego widżetu aparatu AI",
      "Zoptymalizowano obsługę intencji i skrótów Androida zapobiegając powtórnemu wywoływaniu akcji przy wznawianiu aplikacji",
      "Wdrożono defensywne sprawdzanie stanu magazynów i widżetów pulpitu"
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
  },
  {
    version: "6.0.57",
    date: "2026-10-05",
    title: "Poprawka Widżetu Aparatu AI i Stabilność Talerza",
    changes: [
      "Wyeliminowano błąd krytyczny (Cannot read properties of undefined reading length) przy uruchamianiu aplikacji z poziomu natywnego widżetu aparatu AI",
      "Wdrożono pancerne bezpieczniki stanu Talerza (sharedPlate) w Centrum Żywienia, pasku akcji oraz kreatorze dań",
      "Dodano automatyczną rehydratację i walidację pamięci podręcznej składników posiłku w magazynie lokalnym"
    ]
  },
  {
    version: "6.0.56",
    date: "2026-10-02",
    title: "Kompletne Statystyki Dzienne, Średnia Glikemia i Pełna Insulina",
    changes: [
      "Wdrożono wyświetlanie średniej glikemii (mg/dL) oraz wskaźnika TIR na kafelkach kalendarza dziennego, eliminując puste komórki",
      "Dodano pełne podsumowanie miesiąca o średnią glikemię i procent czasu w normie (TIR)",
      "Rozszerzono dekodowanie dawek insuliny (bolusów) ze wszystkich formatów Nightscout (units, dose, combo bolus, amount)",
      "Wydłużono lokalne przechowywanie historii odczytów glukozy CGM w bazie SQLite na telefonie do 90 dni (pełny kwartał)",
      "Zwiększono bufor synchronizacji Nightscout do 10 000 wpisów, zapewniając pełne pokrycie 35 dni pomiarów"
    ]
  },
  {
    version: "6.0.55",
    date: "2026-10-01",
    title: "Podwójne Strzałki CGM, Synchronizacja Leków i Powiadomienia Push",
    changes: [
      "Wdrożono czytelne podwójne strzałki trendu (↑↑ / ↓↓) na wykresie Canvas oraz ikony podwójnych strzałek na pulpicie przy gwałtownych skokach cukru (>= 3 mg/dL/min)",
      "Dodano pełną synchronizację zażytych leków w czasie rzeczywistym między telefonem a komputerem przez chmurę Firestore",
      "Wdrożono systemowe powiadomienia push w belce telefonu informujące o dostępności nowej wersji aplikacji",
      "Zneutralizowano porady w modułach Diety oraz GlikoTrening zgodnie z wymogami MDR SaMD (brak narzucania dawek insuliny)",
      "Zapewniono 100% dwujęzyczność (PL/EN) dla wszystkich nowych banerów medycznych i powiadomień"
    ]
  }
];
