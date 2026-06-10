export interface VersionEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const CURRENT_VERSION = '5.3.0';

export const PWA_VERSIONS: VersionEntry[] = [
  {
    version: "5.3.0",
    date: "2026-06-10",
    title: "Android Auto & Standard AGP",
    changes: [
      "Nowość: Pełna integracja z Android Auto! W trybie dewelopera GlikoControl wyświetla bieżący poziom glikemii bezpośrednio na ekranie samochodu.",
      "Nowość: Dodano profesjonalne raporty AGP w zakładce 'Raporty AI', wyposażone w matematykę percentyli i wspaniały, szklisty interfejs (Glassmorphism).",
      "Poprawka: Stabilizacja renderowania na słabszych urządzeniach i drobne szlify animacji."
    ]
  },
  {
    version: "5.2.1",
    date: "2026-06-08",
    title: "Gliko Apteczka & Smart Skaner",
    changes: [
      "Nowość: Nowa, ogromna aktualizacja systemów PWA.",
      "Nowość: Dodano nowoczesny skaner kodów kreskowych za pomocą kamery aparatu.",
      "Automatyzacja: Zeskanowane wkłucia i sensory automatycznie aktualizują Twoje stany w Apteczce.",
      "Poprawka: Przeprojektowano i uszeregowano listy aktualizacji dla wersji PWA oraz natywnej APK."
    ]
  },
  {
    version: "4.1.1",
    date: "2026-05-28",
    title: "Najnowsza Wersja 4.1.1",
    changes: [
      "Nowość! ✨ Możesz teraz zmieniać kształt wybranych ikon i kafelków na pulpicie, dopasowując go bardziej do własnych upodobań.",
      "Ulepszono działanie i płynność edycji pulpitu oraz znacznie zoptymalizowano zapisy jego układu w chmurze (Firebase).",
      "Usprawniono proces pobierania najnowszych aktualizacji dla wydania APK aplikacji.",
    ]
  },
  {
    version: "4.1",
    date: "2026-05-27",
    title: "Najnowsza Wersja 4.1",
    changes: [
      "Możliwość edycji i kustomizacji pulpitu",
      "Drobne poprawy UI",
      "Ulepszenie widżetu wchłaniania posiłków",
      "Możliwość pobrania natywnej aplikacji Android (APK)"
    ]
  },
  {
    version: "4.0",
    date: "2026-05-26",
    title: "Aktualizacja 4.0: Gotowość na pliki APK i ulepszony GlikoSense",
    changes: [
      "Nowe wsparcie dla aplikacji APK na system Android: Dodano bezpieczny eksport i import modelu oraz danych za pomocą plików JSON, chroniąc przed utratą danych w trybie gościa.",
      "Zaawansowana analiza wchłaniania posiłków: Lepsze szacowanie uwalniania się węglowodanów złożonych, białek i tłuszczów w czasie.",
      "Ulepszony i dokładniejszy asystent prognoz GlikoSense: Zwiększona dokładność predykcji przyszłych trendów glikemicznych i dawkowań.",
      "Liczne podręczne poprawki w UI: Przebudowany interfejs widgetów, zoptymalizowana nawigacja oraz lepsza responsywność na ekranach dotykowych.",
      "Naprawa błędów: Usunięcie problemów z synchronizacją bazy oraz drobnych błędów działania algorytmów."
    ]
  },
  {
    version: "3.5.3",
    date: "2026-05-22",
    title: "Aktualizacja 3.5.3: Wizualne Strzałki, Optymalizacja Sync i Okno Czatu",
    changes: [
      "Nowość: Dodano graficzne strzałki trendów w czasie rzeczywistym (np. ↑, ↓, ↗) bezpośrednio przy najnowszym punkcie glikemii na głównym wykresie.",
      "Optymalizacja: Wdrożono inteligentną warstwę buforowania (caching layer) dla zapytań Nightscout (buforowanie na 5 minut przy zapytaniach w tle) w celu oszczędzania baterii i transferu danych.",
      "Ulepszenie: Wprowadzono opcję natychmiastowego wymuszenia pełnej synchronizacji przy ręcznym odświeżeniu.",
      "Interfejs: Pełne dostosowanie i optymalizacja okna Gliko Czat w trybie poziomym (landscape) na telefonach (kompaktowy nagłówek, zmniejszony avatar, ulepszone pole wpisywania oraz prawidłowe wypełnienie wysokości ekranu).",
      "Stabilność: Drobne udoskonalenia interfejsu wykresów oraz poprawki wydajnościowe na telefonach i tabletach (usunięcie błędu typowania delta w integracji Nightscout)."
    ]
  },
  {
    version: "3.5.2",
    date: "2026-05-20",
    title: "Najnowsza Wersja 3.5.2",
    changes: [
      "Nowe animacje i zaktualizowane, super nowoczesne okno nowości (pop-up) po pomyślnym załadowaniu aktualizacji.",
      "Dodano dodatkowe wsparcie i lepszą responsywność dla większych ekranów.",
      "Poprawki wydajnościowe i optymalizacja działania pod maską aplikacji.",
      "Zwiększono niezawodność wyświetlania statystyk i ulepszono walidację formularzy."
    ]
  },
  {
    version: "3.5.1",
    date: "2026-05-18",
    title: "Ulepszenia Gliko Czat i Profilu",
    changes: [
      "Nowość: Czat Gliko lepiej rozumie komendy, np. wystarczy zapytać o jadłospis.",
      "Poprawka: Dodanie do talerza z Gliko Czat wymaga teraz komendy 'dodaj do talerza'.",
      "Interfejs: Zmniejszono odstępy ikon w profilu (kafelki Więcej), co ułatwia nawigację bez przewijania.",
      "Objaśnienia: Ekran powitalny (Onboarding) otrzymał informację o Dietach oraz opcjach pogodowych."
    ]
  },
  {
    version: "3.5.0",
    date: "2026-05-18",
    title: "Pogoda, Diety i Nowe Funkcje 3.5.0",
    changes: [
      "Dodano inteligentny widżet pogody – możliwość sprawdzania aktualnych warunków bezpośrednio na pulpicie.",
      "Wprowadzono analizę wpływu środowiska – GlikoSense uwzględnia temperaturę i ciśnienie w prognozach.",
      "Powiększono bazę produktów o setki pozycji (Keto, Wege, Low-GI) – dla jeszcze łatwiejszego liczenia.",
      "Wprowadzono funkcję 'Puste Węgle' w kalkulatorze bolusa – do precyzyjnego odejmowania polioli i pustych węglowodanów.",
      "Ulepszono asystenta AI – teraz sprawniej dodaje produkty prosto na Talerz.",
      "Odświeżono interfejs – ulepszona nawigacja i dopracowane detale wizualne."
    ]
  },
  {
    version: "3.4.3",
    date: "2026-05-15",
    title: "Automatyka GI i Ulepszona Haptyka",
    changes: [
      "Nowość: Dodano opcję automatycznego pobierania Indeksu Glikemicznego (IG) i Ładunku (ŁG) dla własnych produktów w ustawieniach.",
      "Ulepszenie: Zoptymalizowano system haptyczny (wibracje) dla płynniejszej i bardziej naturalnej reakcji interfejsu.",
      "Interfejs: Usunięto nakładające się elementy na wykresie glikemii w trybie swobodnym.",
      "Stabilność: Poprawki drobnych błędów w synchronizacji danych Nightscout."
    ]
  },
  {
    version: "3.4.2",
    date: "2026-05-14",
    title: "Haptyka i Precyzja Bolusa",
    changes: [
      "Nowość: Dodano haptyczne sprzężenie zwrotne (wibracje) przy interakcjach z UI (wymaga wsparcia Vibrations API).",
      "Poprawka: Usprawniono zaokrąglanie wartości insuliny pobieranych z Talerza do Kalkulatora Bolusa.",
      "Stabilność: Naprawiono błąd startowy serwera związany z typami ścieżek Node.js.",
      "Poprawka: Czytelniejsze wyświetlanie ładunków glikemicznych i wartości WW w historii."
    ]
  },
  {
    version: "3.4.1",
    date: "2026-05-13",
    title: "RODO i Optymalizacja Talerza",
    changes: [
      "RODO: Dodano uproszczoną klauzulę zgody bez wymogu podpisu odręcznego.",
      "Talerz: Wprowadzono usprawnienia w zarządzaniu produktami na talerzu oraz ich trwałość.",
      "Interfejs: Szereg poprawek wizualnych i optymalizacja UI dla lepszej czytelności."
    ]
  },
  {
    version: "3.4.0",
    date: "2026-05-12",
    title: "Nowy Wymiar Elegancji: Bento 2.0",
    changes: [
      "Interfejs: Całkowicie nowy layout 'Bento' na pulpicie – lepsza organizacja i czytelność.",
      "Design: Nowa typografia (Space Grotesk) dla technicznego, nowoczesnego wyglądu.",
      "Mood: Wprowadzono dynamiczne kolory akcentów zależne od bieżącego stanu glikemii (opcjonalnie).",
      "Wydajność: Zoptymalizowano renderowanie wykresów przy dużych zestawach danych (10k+ rekordów).",
      "PWA: Ulepszony tryb offline i stabilniejsze ikony skrótów."
    ]
  },
  {
    version: "3.3.7",
    date: "2026-05-12",
    title: "Giga-Aktualizacja: Wydajność i Offline",
    changes: [
      "Nowość: Tryb Offline – dzięki IndexedDB aplikacja działa bez internetu i oszczędza transfer (pobiera tylko nowe dane).",
      "Analityka: Pełne 30-dniowe statystyki TIR na ekranie głównym (zwiększony limit do 10 000 rekordów).",
      "Stabilność: Naprawiono krytyczne błędy połączenia z bazą danych i poprawiono buforowanie widoków.",
      "Poprawka: Stabilizacja wyświetlania danych z Nightscout i precyzyjniejsza konwersja jednostek czasu."
    ]
  },
  {
    version: "3.3.5",
    date: "2026-05-11",
    title: "Wirtualny Asystent i Kalkulator Alkoholu",
    changes: [
      "Nowość: Czat z inteligentnym asystentem AI posiadającym wiedzę na temat Twoich dziennych wyników i pomiarów (analiza do 24h wstecz).",
      "Nowość: Kalkulator Alkoholu pomagający ustalić wpływ poszczególnych rodzajów alkoholu na Glikemię i dawkę insuliny.",
      "Poprawka: Stabilizacja połączenia z modelem AI – wyeliminowano błędy 'initial-message' i poprawiono wydajność odpowiedzi.",
      "Ulepszenie: GlikoSense generuje teraz bardziej spersonalizowane i precyzyjne dziennie raporty.",
      "Optymalizacja: Przyspieszono ładowanie modułów asystenta i zaktualizowano listę modeli rezerwowych."
    ]
  },
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
];

export const APK_VERSIONS: VersionEntry[] = [
  {
    version: "5.3.0",
    date: "2026-06-10",
    title: "Wsparcie dla Android Auto",
    changes: [
      "Usługa w tle: Komunikacja natywna z pulpitem deski rozdzielczej Android Auto (wymaga Trybu Programisty).",
      "Usprawnienie: Nowa nazwa wyjściowa kompilatora (GlikoControl.apk)."
    ]
  },
  {
    version: "1.5.7",
    date: "2026-06-08",
    title: "Gliko Family: Zdalne Komunikaty",
    changes: [
      "Nowość: Pełnoekranowe powiadomienia (Gliko Family) wysyłane ze sparowanych urządzeń",
      "Nowość: Potwierdzanie zrozumienia ważnych komunikatów na drugim ekranie",
      "Poprawka: Nowa, bardzo elegancka i subtelna animacja po instalacji aktualizacji"
    ]
  },
  {
    version: "1.5.6",
    date: "2026-06-08",
    title: "Aktualizacja 1.5.6",
    changes: [
      "Poprawka pobierania paczek OTA: Przejście na nowy format kompresji",
      "Dodano systemowe uprawnienie stanu sieci dla pobierania w tle",
      "Naprawiono błędny adres pobierania pliku APK w wersji PWA"
    ]
  },
  {
    version: "1.5.2",
    date: "2026-06-08",
    title: "Patch 1.5.2",
    changes: [
      "Hotfix: Naprawiono błąd wyświetlania zakładki System (brakujący import ikonki)"
    ]
  },
  {
    version: "1.5.1",
    date: "2026-06-08",
    title: "Aktualizacja 1.5.1",
    changes: [
      "Test aktualizacji OTA (Over-The-Air)",
      "Poprawka migającej listy urządzeń WebSocket",
      "Dodano przycisk do ręcznego wymuszania aktualizacji",
      "Oznaczenie własnego urządzenia '(Ty)' na liście pokoju"
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
