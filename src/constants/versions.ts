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

export const CURRENT_VERSION = '6.0.33';

import versionData from '../../version.json';
export const CURRENT_OTA_REVISION = versionData.otaRevision || 0;

export const PWA_VERSIONS: VersionEntry[] = [
  {
    version: "6.0.33",
    date: "2026-08-31",
    title: "Dodawanie Posiłków przez AI na Talerz, Wielokierunkowa Edycja Kafelków i Nowe Sterowanie",
    changes: [
      "Asystent AI dodaje posiłki na Talerz – po komendzie głosowej lub tekstowej składniki z makroskładnikami trafiają od razu na Talerz",
      "Nowy, 4-kierunkowy tryb edycji kafelków w zakładce Więcej (góra, dół, lewo, prawo) bez lagów i nakładania się",
      "Funkcja 'Kliknij i Wstaw tutaj' oraz alternatywny widok listy do płynnego przeciągania kafelków",
      "Poprawki widoczności okna powitalnego i polityki prywatności przy pierwszym uruchomieniu"
    ]
  },
  {
    version: "6.0.32",
    date: "2026-08-30",
    title: "Dynamiczna Ikona Minut na Pasku Androida, Alerty MP3 gliko_glucose_alerts_v25, Naprawa Stopera i Badge Talerza",
    changes: [
      "Dynamiczna ikona minut na górnej belce stanu Androida (Status Bar) – odliczanie w dół (15->14->1->OK) w stylu aplikacji dostawy jedzenia",
      "Dedykowany kanał alertów Androida (gliko_glucose_alerts_v25) z gwarantowanym dźwiękiem status_clear.mp3",
      "Nowy stoper przedposiłkowy – płynne odliczanie, brak ujemnego czasu i szybki przycisk „Zjadłem”",
      "Zewnętrzna odznaka liczby składników na Talerzu w prawym górnym rogu przycisku akcji",
      "Poprawka kompilacji manifestu Health Connect w procesie tworzenia APK"
    ]
  },
  {
    version: "6.0.31",
    date: "2026-08-29",
    title: "Natywny Krokomierz Androida, Zunifikowany Widżet Treningu, Konfiguracja Zbiorniczka w Apteczce i Płynne Zakładki",
    changes: [
      "Natywny sprzętowy krokomierz Androida – bezpośredni odczyt kroków z sensora telefonu oraz synchronizacja z Google Health",
      "Zunifikowany widżet Aktywność & Trening – licznik kroków, edycja celu (🎯) i szybki start modułu GlikoTrening",
      "Konfiguracja pojemności zbiorniczka w Apteczce (160U, 180U, 200U, 300U) i automatyczne przeliczanie pigułki na Pulpicie",
      "Błyskawiczne i stabilne przełączanie zakładek bez czarnego ekranu (optymalizacja animacji wait)",
      "Automatyczna synchronizacja glikemii z Google Health Connect w czasie rzeczywistym"
    ]
  },
  {
    version: "6.0.30",
    date: "2026-08-29",
    title: "Dynamiczny Cukier na Wykresie, Auto-Stoper na Pasku, Spójne Alerty MP3 i Poprawki Treningów",
    changes: [
      "Dynamiczny wskaźnik i pigułka aktualnego cukru na prawej krawędzi wykresu (styl Dexcom / TradingView)",
      "Automatyczny stoper przedposiłkowy na pasku Androida z ikoną pigułki czasu na bieżąco",
      "Pełna synchronizacja alertów i dźwięków MP3 z systemem Android oraz ustawieniami profilu",
      "Poprawione zatrzymywanie oraz błyskawiczne usuwanie treningów z historii w GlikoTrening",
      "Zablokowano niepożądane zaznaczanie i kopiowanie tekstu na dolnej belce nawigacji (select-none)"
    ]
  },
  {
    version: "6.0.29",
    date: "2026-08-28",
    title: "Własna Domena glikocontrol.pl, Pancerne Uruchamianie Treningu, Stoper Przedposiłkowy i Nowe SEO",
    changes: [
      "Wdrożono i zabezpieczono oficjalną domenę glikocontrol.pl z bezpiecznym certyfikatem SSL i nagłówkiem HSTS",
      "Naprawiono uruchamianie treningu sportowego (GlikoTrening) – natychmiastowy start, historia i status na pulpicie",
      "Automatyczny start stopera przedposiłkowego dla każdego bolusa z pompy i kalkulatora",
      "Pełna synchronizacja wybranego sposobu leczenia (Dieta/Insulina/Pompa) z kontem w chmurze i pamięcią urządzenia",
      "Wzbogacone metatagi SEO i OpenGraph dla wyszukiwarki Google oraz podglądu linków na Facebooku"
    ]
  },
  {
    version: "6.0.28",
    date: "2026-08-28",
    title: "GlikoSense 4.0, Automatyczne Wykrywanie Osprzętu, Nowa Budowa Aplikacji i Odświeżony Wykres",
    changes: [
      "GlikoSense 4.0 – nowa sieć neuronowa z bezszwowym kotwiczeniem krzywej predykcji cukru do aktualnego pomiaru",
      "Automatyczne wykrywanie wymiany osprzętu (Smart Equipment) oraz pełna możliwość edycji i cofania wymian",
      "Odświeżenie aplikacji i nowoczesny interfejs użytkownika z nowym systemem widżetów",
      "Całkowicie nowa, zoptymalizowana budowa aplikacji i modułowa architektura",
      "Odświeżony wykres glikemii z chmurą pewności i płynną linią trendu"
    ]
  },
  {
    version: "6.0.27",
    date: "2026-08-28",
    title: "Stoper Live na Belce, Synchronizacja Miejsc Wkłuć, Edycja Osprzętu i Porządki Alertów",
    changes: [
      "Wdrożono natychmiastowy stoper przedposiłkowy (Live Chronometer) na pasku stanu Androida odliczający sekunda po sekundzie",
      "Pełna synchronizacja miejsc wkłuć pomiędzy profilem, automatycznym wykrywaniem i widżetem rotacji na pulpicie (eliminacja błędu z 'L. Brzuch')",
      "Naprawiono edycję dat założenia osprzętu (wkłucie, sensor, zbiorniczek) w Profilu – zapisuje wybraną datę bez cofania i bez dublowania historii",
      "Wyeliminowano podwójne alarmy i zdublowany dźwięk alertów glikemii na systemowym pasku Androida",
      "Wdrożono obsługę systemowego przycisku Wstecz (Android Back Gesture) dla wszystkich okien modalnych i raportów",
      "Dodano oficjalne wzory medyczne ISF, WW i korekty w procedurze awaryjnej pompy oraz ulepszono Asystenta Podróży (Jet-Lag)"
    ]
  },
  {
    version: "6.0.26",
    date: "2026-08-25",
    title: "Pancerny Dźwięk Alarmu MP3, Nowy Kanał Powiadomień i Ochrona Hipo AI",
    changes: [
      "Przywrócono i wzmocniono silnik odtwarzania dźwięków MP3 (status_clear.mp3) przy alertach niskiego i wysokiego cukru (4-stopniowy fallback i autounlock)",
      "Nowy dedykowany kanał powiadomień Androida (glucose_alerts_v17) z jawnym głośnym dźwiękiem alarmowym status_clear.mp3",
      "Wyeliminowano fałszywe powiadomienia „Ochrona przed hipo (AI)” przy wysokim cukrze dzięki fizjologicznym guardrailom w silniku GlikoSense",
      "Dodano narzędzie testowania dźwięku alarmu MP3 bezpośrednio w Centrum Powiadomień (Ustawienia -> Dźwięk alarmu glikemii)",
      "Zoptymalizowano cache PWA Workbox dla plików dźwiękowych"
    ]
  },
  {
    version: "6.0.25",
    date: "2026-08-24",
    title: "Najnowsze Modele Gemini (3.6/2.5), Widżet Posiłków, Szybkie Skróty i Nowy Czat",
    changes: [
      "Nowy kaskadowy silnik AI – automatyczne łączenie z najnowszymi modelami Gemini (3.7 / 3.6 / 2.5 Flash) oraz podgląd aktywnego modelu na żywo",
      "Nowy widżet „Zapisane Posiłki & Przepisy” na Pulpicie z obsługą przeciągania myszką w przeglądarce i 1-Click wrzucaniem na Talerz",
      "Zastąpienie systemowych okienek przeglądarki autorskim, eleganckim modalem czyszczenia historii rozmowy",
      "Dodano stałe ostrzeżenia medyczne o konieczności konsultacji dawek z lekarzem diabetologiem",
      "Inteligentne wyszukiwanie produktów z wagami prefiksowymi i pełną tolerancją polskich znaków diakrytycznych"
    ]
  },
  {
    version: "6.0.24",
    date: "2026-08-24",
    title: "Nowy Dzienny TIR, Pierścień Rotacji Wkłuć i Uporządkowane Alerty",
    changes: [
      "Nowy wizualny widżet Dziennego TIR: pierścień tarczy z neonowym blaskiem na normie, tłem toru i trójkolorowymi kapsułkami",
      "Nowy pierścień Smart Rotation Ring na pulpicie: cykl stref, czytelna typografia i nowoczesna pigułka rekomendacji",
      "Uporządkowano i naprawiono system powiadomień Androida oraz alertów glikemii (brak spamu przy otwarciu, głośny dźwięk systemowy)",
      "Trwała synchronizacja preferencji powiadomień i eliminacja fałszywych alarmów o zagięciu kaniuli",
      "Dodano modal potwierdzenia dla przycisku „Zjadłem teraz” oraz naprawiono edycję dat osprzętu bez duplikatów"
    ]
  },
  {
    version: "6.0.23",
    date: "2026-08-19",
    title: "Inteligentna Rotacja Wkłuć, Regeneracja Tkanek i Auto-Nauka",
    changes: [
      "Wdrożono inteligentnego asystenta rotacji wkłuć – system automatycznie uczy się naturalnej sekwencji pacjenta z historii wymian",
      "Dodano interaktywny modal rotacji (Przód / Tył) z mapą cieplną regeneracji tkanek, profilami wchłaniania i 1-Click wymianą z apteczką",
      "Wprowadzono konfigurator „Moje Strefy” umożliwiający wykluczenie nieużywanych miejsc i automatyczne omijanie sensora CGM",
      "Odblokowano przełącznik wyświetlania informacji o glikemii na pasku powiadomień w telefonie dla wszystkich platform"
    ]
  },
  {
    version: "6.0.22",
    date: "2026-08-18",
    title: "Inteligentny Kafel Bolusa, Asystent Posiłku i Kody QR",
    changes: [
      "Kafel Szybkiego Bolusa na pulpicie automatycznie wylicza i sugeruje dawkę korekty (BG-cel/ISF-IOB)",
      "Pigułka nawigacyjna zyskała wysuwany w bok asystent oczekującego posiłku z bazą dań i instant wyliczaniem makroskładników przez AI",
      "Wdrożono nowoczesne kody QR w stylu Android 14 Material You z celownikami skanera i odliczaniem czasu wygaśnięcia",
      "Płynny morfing animacji fizyki sprężynowej i jednorazowe wyciszanie powiadomień posiłków"
    ]
  },
  {
    version: "6.0.21",
    date: "2026-08-16",
    title: "Szybka Korekta i Przypomnienia Sprzętowe w Pigułce",
    changes: [
      "Zintegrowano funkcję Sugerowanej Szybkiej Korekty bezpośrednio w Inteligentnej Pigułce, usuwając stary widżet z pulpitu",
      "Dodano system przypomnień o sprzęcie (sensor, wkłucie) widoczny na 2 godziny przed wygaśnięciem w miejscu domyślnej Pigułki",
      "Poprawiono wymuszanie systemowego powiadomienia dźwiękowego (Custom MP3) dla alarmów glikemii na urządzeniach z systemem Android"
    ]
  },
  {
    version: "6.0.20",
    date: "2026-08-15",
    title: "Poprawa czytelności pulpitu i edycji kroków",
    changes: [
      "Poprawa edycji na urządzeniach mobilnych w widżecie Aktywności (lepsza klawiatura, większe przyciski)",
      "Nowy poziomy układ widżetu Statusu Pompy z wyświetlaniem dokładnego modelu urządzenia",
      "Odchudzenie pigułek powiadomień na górnym pasku w celu zaoszczędzenia miejsca na małych ekranach",
      "Naprawa błędu blokującego ustawienie szerokiego układu widżetu pompy na pulpicie"
    ]
  },
  {
    version: "6.0.19",
    date: "2026-08-14",
    title: "Szybkie Menu Dolne, Skanery Kodów & Smart Equipment",
    changes: [
      "Zoptymalizowano ładowanie zakładek z menu dolnego (prefetching w tle oraz przejście popLayout)",
      "Odblokowano skaner kodów kreskowych w widoku Bazy Produktów",
      "Wyeliminowano pętlę restartowania skanera w sekcji Talerz",
      "Poprawiono testowanie połączenia z własnym kluczem Gemini AI w Profilu",
      "Dodano bezawaryjny backend CPU dla GlikoSense ML Web Workera",
      "Naprawiono nasłuch powiadomień w tle na Androidzie oraz dodano modal z automatycznym odejmowaniem elementów z apteczki przy wymianie osprzętu"
    ]
  },
  {
    version: "6.0.18",
    date: "2026-08-12",
    title: "Efekty Wykresu, Cień Insuliny & Uniesienia przy Dołkach",
    changes: [
      "Nowe efekty wizualne wykresu (Opcja 1: Neon Ambient Glow oraz Opcja 5: Glass Target Band 70–140 mg/dL)",
      "Wyraźny cień aktywnej insuliny (IOB) z dynamicznym obrysem krzywej opadania",
      "Uniesione pigułki z liniami prowadzącymi aktywowane ściśle przy niskich dołkach glikemii (<85 mg/dL)",
      "Zaokrąglenie jednostek insuliny na wykresie do 1 miejsca po przecinku (np. 2.3J)"
    ]
  },
  {
    version: "6.0.17",
    date: "2026-08-12",
    title: "Naprawa Błędu Autoryzacji (setupForegroundListener)",
    changes: [
      "Poprawiono alias metody setupForegroundListener w notificationService.ts naprawiając wyjście TypeError z useAuthStore.ts"
    ]
  },
  {
    version: "6.0.16",
    date: "2026-08-12",
    title: "Przycisk Wycisz na Pasku Androida & Brak Dublowania",
    changes: [
      "Dodano natywny przycisk 'Wycisz alarm' bezpośrednio na pasku powiadomień Androida",
      "Wyeliminowano podwójny dźwięk po nakładaniu się kanału systemowego i odtwarzacza wewnątrz aplikacji",
      "Obsłużono akcję otwarcia z powiadomienia Androida bez ponownego uruchamiania dźwięku po wejściu do aplikacji"
    ]
  },
  {
    version: "6.0.15",
    date: "2026-08-12",
    title: "Natywny Dźwięk Paska Powiadomień Android (v14)",
    changes: [
      "Nowy natywny kanał powiadomień Android (glucose_alerts_v14) wymuszający odtwarzanie pliku status_clear.mp3 na systemowym pasku Androida",
      "Gwarantowany dźwięk powiadomienia na pasku nawet gdy aplikacja jest zminimalizowana lub zamknięta",
      "Przycisk Wycisz i Zatrzymaj Dźwięk w stałym okienku alarmowym"
    ]
  },
  {
    version: "6.0.14",
    date: "2026-08-12",
    title: "Alerty MP3, Filtrowanie & Poprawki Talerza",
    changes: [
      "Usunięcie zduplikowanych zakładek w sekcji Talerza posiłków",
      "Zaokrąglenie wartości odżywczych (carbs, protein, fat) w historii posiłków",
      "Odrzucanie generycznych kalkulatorów bolusa w GlikoSense Nutri (tylko nazwane dania ze składem)",
      "Zmieniono jednostkę pod-statystyki Korekty z 'j' na '×'",
      "Pancerny silnik odtwarzania MP3 (status_clear.mp3) z autounlock i syntezą sygnału beepera",
      "Odnawialne alarmy MP3 przy utrzymującym się niskim (15 min) i wysokim cukrze (30 min)",
      "Przycisk testu dźwięku MP3 w Centrum Powiadomień"
    ]
  },
  {
    version: "6.0.13",
    date: "2026-08-11",
    title: "GlikoSense Odżywianie & Poprawki UI",
    changes: [
      "Nowy płynny algorytm tolerancji posiłków (zamiast binarnego 0/100%)",
      "Naprawiono wskaźnik spójności trawienia (nie pokazuje już zawsze 50%)",
      "Analizowane są tylko nazwane dania ze składem (filtr generycznych wpisów)",
      "Rozbudowane statystyki posiłków: średni szczyt, czas powrotu, korekty, spójność",
      "Wyszukiwarka, sortowanie i limit TOP 6 z rozwijanym przyciskiem",
      "Poprawiona polska odmiana liczebników (1 pozycja, 3 pozycje, 5 pozycji)",
      "Wskaźnik aktywnej diety widoczny na telefonie"
    ]
  },
  {
    version: "6.0.12",
    date: new Date().toISOString().split('T')[0],
    title: "Naprawa Zapisów & 35 Dni Historii",
    changes: [
      "Wyeliminowano 'Błąd zapisu' SQLite podczas zapisu pomiarów i bolusów",
      "Zwiększono bufor pobierania z chmury do 35+ dni i obsłużono eksport pełnych 18k logów z PC",
      "Wdrożono trwałość wyboru motywu i wyłączania Dynamicznych Kolorów po restarcie",
      "Naprawiono odtwarzanie własnego dźwięku MP3 w alertach glikemii na Androidzie"
    ]
  },
  {
    version: "6.0.11",
    date: new Date().toISOString().split('T')[0],
    title: "Skaner Hybrydowy & Stabilność Powiadomień",
    changes: [
      "Naprawiono błąd 'znikającego cukru' (napis 'Pętla zamknięta...') podczas usypiania powiadomienia",
      "Przebudowano Skaner Jedzenia na hybrydowy (natywny ML Kit + PWA)",
      "Wyeliminowano problem blokującego się sprzętowo aparatu przy przejściu na odczyt OCR"
    ]
  },
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
    version: "6.0.33",
    date: "2026-08-31",
    title: "Dodawanie Posiłków przez AI na Talerz, Wielokierunkowa Edycja Kafelków i Nowe Sterowanie",
    changes: [
      "Asystent AI dodaje posiłki na Talerz – po komendzie głosowej lub tekstowej składniki z makroskładnikami trafiają od razu na Talerz",
      "Nowy, 4-kierunkowy tryb edycji kafelków w zakładce Więcej (góra, dół, lewo, prawo) bez lagów i nakładania się",
      "Funkcja 'Kliknij i Wstaw tutaj' oraz alternatywny widok listy do płynnego przeciągania kafelków",
      "Poprawki widoczności okna powitalnego i polityki prywatności przy pierwszym uruchomieniu"
    ]
  },
  {
    version: "6.0.32",
    date: "2026-08-30",
    title: "Dynamiczna Ikona Minut na Pasku Androida, Alerty MP3 gliko_glucose_alerts_v25, Naprawa Stopera i Badge Talerza",
    changes: [
      "Dynamiczna ikona minut na górnej belce stanu Androida (Status Bar) – odliczanie w dół (15->14->1->OK) w stylu aplikacji dostawy jedzenia",
      "Dedykowany kanał alertów Androida (gliko_glucose_alerts_v25) z gwarantowanym dźwiękiem status_clear.mp3",
      "Nowy stoper przedposiłkowy – płynne odliczanie, brak ujemnego czasu i szybki przycisk „Zjadłem”",
      "Zewnętrzna odznaka liczby składników na Talerzu w prawym górnym rogu przycisku akcji",
      "Poprawka kompilacji manifestu Health Connect w procesie tworzenia APK"
    ]
  },
  {
    version: "6.0.31",
    date: "2026-08-29",
    title: "Natywny Krokomierz Androida, Zunifikowany Widżet Treningu, Konfiguracja Zbiorniczka w Apteczce i Płynne Zakładki",
    changes: [
      "Natywny sprzętowy krokomierz Androida – bezpośredni odczyt kroków z sensora telefonu oraz synchronizacja z Google Health",
      "Zunifikowany widżet Aktywność & Trening – licznik kroków, edycja celu (🎯) i szybki start modułu GlikoTrening",
      "Konfiguracja pojemności zbiorniczka w Apteczce (160U, 180U, 200U, 300U) i automatyczne przeliczanie pigułki na Pulpicie",
      "Błyskawiczne i stabilne przełączanie zakładek bez czarnego ekranu (optymalizacja animacji wait)",
      "Automatyczna synchronizacja glikemii z Google Health Connect w czasie rzeczywistym"
    ]
  },
  {
    version: "6.0.30",
    date: "2026-08-29",
    title: "Dynamiczny Cukier na Wykresie, Auto-Stoper na Pasku, Spójne Alerty MP3 i Poprawki Treningów",
    changes: [
      "Dynamiczny wskaźnik i pigułka aktualnego cukru na prawej krawędzi wykresu (styl Dexcom / TradingView)",
      "Automatyczny stoper przedposiłkowy na pasku Androida z ikoną pigułki czasu na bieżąco",
      "Pełna synchronizacja alertów i dźwięków MP3 z systemem Android oraz ustawieniami profilu",
      "Poprawione zatrzymywanie oraz błyskawiczne usuwanie treningów z historii w GlikoTrening",
      "Zablokowano niepożądane zaznaczanie i kopiowanie tekstu na dolnej belce nawigacji (select-none)"
    ]
  },
  {
    version: "6.0.29",
    date: "2026-08-28",
    title: "Własna Domena glikocontrol.pl, Pancerne Uruchamianie Treningu, Stoper Przedposiłkowy i Nowe SEO",
    changes: [
      "Wdrożono i zabezpieczono oficjalną domenę glikocontrol.pl z bezpiecznym certyfikatem SSL i nagłówkiem HSTS",
      "Naprawiono uruchamianie treningu sportowego (GlikoTrening) – natychmiastowy start, historia i status na pulpicie",
      "Automatyczny start stopera przedposiłkowego dla każdego bolusa z pompy i kalkulatora",
      "Pełna synchronizacja wybranego sposobu leczenia (Dieta/Insulina/Pompa) z kontem w chmurze i pamięcią urządzenia",
      "Wzbogacone metatagi SEO i OpenGraph dla wyszukiwarki Google oraz podglądu linków na Facebooku"
    ]
  },
  {
    version: "6.0.28",
    date: "2026-08-28",
    title: "GlikoSense 4.0, Automatyczne Wykrywanie Osprzętu, Nowa Budowa Aplikacji i Odświeżony Wykres",
    changes: [
      "GlikoSense 4.0 – nowa sieć neuronowa z bezszwowym kotwiczeniem krzywej predykcji cukru do aktualnego pomiaru",
      "Automatyczne wykrywanie wymiany osprzętu (Smart Equipment) oraz pełna możliwość edycji i cofania wymian",
      "Odświeżenie aplikacji i nowoczesny interfejs użytkownika z nowym systemem widżetów",
      "Całkowicie nowa, zoptymalizowana budowa aplikacji i modułowa architektura",
      "Odświeżony wykres glikemii z chmurą pewności i płynną linią trendu"
    ]
  },
  {
    version: "6.0.27",
    date: "2026-08-28",
    title: "Stoper Live na Belce, Synchronizacja Miejsc Wkłuć, Edycja Osprzętu i Porządki Alertów",
    changes: [
      "Wdrożono natychmiastowy stoper przedposiłkowy (Live Chronometer) na pasku stanu Androida odliczający sekunda po sekundzie",
      "Pełna synchronizacja miejsc wkłuć pomiędzy profilem, automatycznym wykrywaniem i widżetem rotacji na pulpicie (eliminacja błędu z 'L. Brzuch')",
      "Naprawiono edycję dat założenia osprzętu (wkłucie, sensor, zbiorniczek) w Profilu – zapisuje wybraną datę bez cofania i bez dublowania historii",
      "Wyeliminowano podwójne alarmy i zdublowany dźwięk alertów glikemii na systemowym pasku Androida",
      "Wdrożono obsługę systemowego przycisku Wstecz (Android Back Gesture) dla wszystkich okien modalnych i raportów",
      "Dodano oficjalne wzory medyczne ISF, WW i korekty w procedurze awaryjnej pompy oraz ulepszono Asystenta Podróży (Jet-Lag)"
    ]
  },
  {
    version: "6.0.26",
    date: "2026-08-25",
    title: "Pancerny Dźwięk Alarmu MP3, Nowy Kanał Powiadomień i Ochrona Hipo AI",
    changes: [
      "Przywrócono i wzmocniono silnik odtwarzania dźwięków MP3 (status_clear.mp3) przy alertach niskiego i wysokiego cukru (4-stopniowy fallback i autounlock)",
      "Nowy dedykowany kanał powiadomień Androida (glucose_alerts_v17) z jawnym głośnym dźwiękiem alarmowym status_clear.mp3",
      "Wyeliminowano fałszywe powiadomienia „Ochrona przed hipo (AI)” przy wysokim cukrze dzięki fizjologicznym guardrailom w silniku GlikoSense",
      "Dodano narzędzie testowania dźwięku alarmu MP3 bezpośrednio w Centrum Powiadomień (Ustawienia -> Dźwięk alarmu glikemii)",
      "Zoptymalizowano cache PWA Workbox dla plików dźwiękowych"
    ]
  },
  {
    version: "6.0.25",
    date: "2026-08-24",
    title: "Najnowsze Modele Gemini (3.6/2.5), Widżet Posiłków, Szybkie Skróty i Nowy Czat",
    changes: [
      "Nowy kaskadowy silnik AI – automatyczne łączenie z najnowszymi modelami Gemini (3.7 / 3.6 / 2.5 Flash) oraz podgląd aktywnego modelu na żywo",
      "Nowy widżet „Zapisane Posiłki & Przepisy” na Pulpicie z obsługą przeciągania myszką w przeglądarce i 1-Click wrzucaniem na Talerz",
      "Zastąpienie systemowych okienek przeglądarki autorskim, eleganckim modalem czyszczenia historii rozmowy",
      "Dodano stałe ostrzeżenia medyczne o konieczności konsultacji dawek z lekarzem diabetologiem",
      "Inteligentne wyszukiwanie produktów z wagami prefiksowymi i pełną tolerancją polskich znaków diakrytycznych"
    ]
  },
  {
    version: "6.0.24",
    date: "2026-08-24",
    title: "Nowy Dzienny TIR, Pierścień Rotacji Wkłuć i Uporządkowane Alerty",
    changes: [
      "Nowy wizualny widżet Dziennego TIR: pierścień tarczy z neonowym blaskiem na normie, tłem toru i trójkolorowymi kapsułkami",
      "Nowy pierścień Smart Rotation Ring na pulpicie: cykl stref, czytelna typografia i nowoczesna pigułka rekomendacji",
      "Uporządkowano i naprawiono system powiadomień Androida oraz alertów glikemii (brak spamu przy otwarciu, głośny dźwięk systemowy)",
      "Trwała synchronizacja preferencji powiadomień i eliminacja fałszywych alarmów o zagięciu kaniuli",
      "Dodano modal potwierdzenia dla przycisku „Zjadłem teraz” oraz naprawiono edycję dat osprzętu bez duplikatów"
    ]
  },
  {
    version: "6.0.23",
    date: "2026-08-19",
    title: "Inteligentna Rotacja Wkłuć, Regeneracja Tkanek i Auto-Nauka",
    changes: [
      "Wdrożono inteligentnego asystenta rotacji wkłuć – system automatycznie uczy się naturalnej sekwencji pacjenta z historii wymian",
      "Dodano interaktywny modal rotacji (Przód / Tył) z mapą cieplną regeneracji tkanek, profilami wchłaniania i 1-Click wymianą z apteczką",
      "Wprowadzono konfigurator „Moje Strefy” umożliwiający wykluczenie nieużywanych miejsc i automatyczne omijanie sensora CGM",
      "Odblokowano przełącznik wyświetlania informacji o glikemii na pasku powiadomień w telefonie dla wszystkich platform"
    ]
  },
  {
    version: "6.0.22",
    date: "2026-08-18",
    title: "Inteligentny Kafel Bolusa, Asystent Posiłku i Kody QR",
    changes: [
      "Kafel Szybkiego Bolusa na pulpicie automatycznie wylicza i sugeruje dawkę korekty (BG-cel/ISF-IOB)",
      "Pigułka nawigacyjna zyskała wysuwany w bok asystent oczekującego posiłku z bazą dań i instant wyliczaniem makroskładników przez AI",
      "Wdrożono nowoczesne kody QR w stylu Android 14 Material You z celownikami skanera i odliczaniem czasu wygaśnięcia",
      "Płynny morfing animacji fizyki sprężynowej i jednorazowe wyciszanie powiadomień posiłków"
    ]
  },
  {
    version: "6.0.21",
    date: "2026-08-16",
    title: "Szybka Korekta i Przypomnienia Sprzętowe w Pigułce",
    changes: [
      "Zintegrowano funkcję Sugerowanej Szybkiej Korekty bezpośrednio w Inteligentnej Pigułce, usuwając stary widżet z pulpitu",
      "Dodano system przypomnień o sprzęcie (sensor, wkłucie) widoczny na 2 godziny przed wygaśnięciem w miejscu domyślnej Pigułki",
      "Poprawiono wymuszanie systemowego powiadomienia dźwiękowego (Custom MP3) dla alarmów glikemii na urządzeniach z systemem Android"
    ]
  },
  {
    version: "6.0.20",
    date: "2026-08-15",
    title: "Poprawa czytelności pulpitu i edycji kroków",
    changes: [
      "Poprawa edycji na urządzeniach mobilnych w widżecie Aktywności (lepsza klawiatura, większe przyciski)",
      "Nowy poziomy układ widżetu Statusu Pompy z wyświetlaniem dokładnego modelu urządzenia",
      "Odchudzenie pigułek powiadomień na górnym pasku w celu zaoszczędzenia miejsca na małych ekranach",
      "Naprawa błędu blokującego ustawienie szerokiego układu widżetu pompy na pulpicie"
    ]
  },
  {
    version: "6.0.19",
    date: "2026-08-14",
    title: "Szybkie Menu Dolne, Skanery Kodów & Smart Equipment",
    changes: [
      "Zoptymalizowano ładowanie zakładek z menu dolnego (prefetching w tle oraz przejście popLayout)",
      "Odblokowano skaner kodów kreskowych w widoku Bazy Produktów",
      "Wyeliminowano pętlę restartowania skanera w sekcji Talerz",
      "Poprawiono testowanie połączenia z własnym kluczem Gemini AI w Profilu",
      "Dodano bezawaryjny backend CPU dla GlikoSense ML Web Workera",
      "Naprawiono nasłuch powiadomień w tle na Androidzie oraz dodano modal z automatycznym odejmowaniem elementów z apteczki przy wymianie osprzętu"
    ]
  },
  {
    version: "6.0.18",
    date: "2026-08-12",
    title: "Efekty Wykresu, Cień Insuliny & Uniesienia przy Dołkach",
    changes: [
      "Nowe efekty wizualne wykresu (Opcja 1: Neon Ambient Glow oraz Opcja 5: Glass Target Band 70–140 mg/dL)",
      "Wyraźny cień aktywnej insuliny (IOB) z dynamicznym obrysem krzywej opadania",
      "Uniesione pigułki z liniami prowadzącymi aktywowane ściśle przy niskich dołkach glikemii (<85 mg/dL)",
      "Zaokrąglenie jednostek insuliny na wykresie do 1 miejsca po przecinku (np. 2.3J)"
    ]
  },
  {
    version: "6.0.17",
    date: "2026-08-12",
    title: "Naprawa Błędu Autoryzacji (setupForegroundListener)",
    changes: [
      "Poprawiono alias metody setupForegroundListener w notificationService.ts naprawiając wyjście TypeError z useAuthStore.ts"
    ]
  },
  {
    version: "6.0.16",
    date: "2026-08-12",
    title: "Przycisk Wycisz na Pasku Androida & Brak Dublowania",
    changes: [
      "Dodano natywny przycisk 'Wycisz alarm' bezpośrednio na pasku powiadomień Androida",
      "Wyeliminowano podwójny dźwięk po nakładaniu się kanału systemowego i odtwarzacza wewnątrz aplikacji",
      "Obsłużono akcję otwarcia z powiadomienia Androida bez ponownego uruchamiania dźwięku po wejściu do aplikacji"
    ]
  },
  {
    version: "6.0.15",
    date: "2026-08-12",
    title: "Natywny Dźwięk Paska Powiadomień Android (v14)",
    changes: [
      "Nowy natywny kanał powiadomień Android (glucose_alerts_v14) wymuszający odtwarzanie pliku status_clear.mp3 na systemowym pasku Androida",
      "Gwarantowany dźwięk powiadomienia na pasku nawet gdy aplikacja jest zminimalizowana lub zamknięta",
      "Przycisk Wycisz i Zatrzymaj Dźwięk w stałym okienku alarmowym"
    ]
  },
  {
    version: "6.0.14",
    date: "2026-08-12",
    title: "Alerty MP3, Filtrowanie & Poprawki Talerza",
    changes: [
      "Usunięcie zduplikowanych zakładek w sekcji Talerza posiłków",
      "Zaokrąglenie wartości odżywczych (carbs, protein, fat) w historii posiłków",
      "Odrzucanie generycznych kalkulatorów bolusa w GlikoSense Nutri (tylko nazwane dania ze składem)",
      "Zmieniono jednostkę pod-statystyki Korekty z 'j' na '×'",
      "Pancerny silnik odtwarzania MP3 (status_clear.mp3) z autounlock i syntezą sygnału beepera",
      "Odnawialne alarmy MP3 przy utrzymującym się niskim (15 min) i wysokim cukrze (30 min)",
      "Przycisk testu dźwięku MP3 w Centrum Powiadomień"
    ]
  },
  {
    version: "6.0.13",
    date: "2026-08-11",
    title: "GlikoSense Odżywianie & Poprawki UI",
    changes: [
      "Nowy płynny algorytm tolerancji posiłków (zamiast binarnego 0/100%)",
      "Naprawiono wskaźnik spójności trawienia (nie pokazuje już zawsze 50%)",
      "Analizowane są tylko nazwane dania ze składem (filtr generycznych wpisów)",
      "Rozbudowane statystyki posiłków: średni szczyt, czas powrotu, korekty, spójność",
      "Wyszukiwarka, sortowanie i limit TOP 6 z rozwijanym przyciskiem",
      "Poprawiona polska odmiana liczebników (1 pozycja, 3 pozycje, 5 pozycji)",
      "Wskaźnik aktywnej diety widoczny na telefonie"
    ]
  },
  {
    version: "6.0.12",
    date: new Date().toISOString().split('T')[0],
    title: "Naprawa Zapisów & 35 Dni Historii",
    changes: [
      "Wyeliminowano 'Błąd zapisu' SQLite podczas zapisu pomiarów i bolusów",
      "Zwiększono bufor pobierania z chmury do 35+ dni i obsłużono eksport pełnych 18k logów z PC",
      "Wdrożono trwałość wyboru motywu i wyłączania Dynamicznych Kolorów po restarcie",
      "Naprawiono odtwarzanie własnego dźwięku MP3 w alertach glikemii na Androidzie"
    ]
  },
  {
    version: "6.0.11",
    date: new Date().toISOString().split('T')[0],
    title: "Skaner Hybrydowy & Stabilność Powiadomień",
    changes: [
      "Naprawiono błąd 'znikającego cukru' (napis 'Pętla zamknięta...') podczas usypiania powiadomienia w tle przez Androida",
      "Przebudowano Skaner Jedzenia na hybrydowy (natywny ML Kit + PWA)",
      "Wyeliminowano problem blokującego się sprzętowo aparatu przy przejściu na odczyt etykiet AI"
    ]
  },
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
