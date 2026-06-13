import i18n from "../i18n";

export interface VersionEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const CURRENT_VERSION = '5.3.1';

export const PWA_VERSIONS: VersionEntry[] = [
  {
    version: "5.3.1",
    date: "2026-06-10",
    title: "Android Auto & Standard AGP",
    changes: [
      i18n.t('auto.nowosc_pelna_integracja_z_andr', { defaultValue: "Nowość: Pełna integracja z Android Auto! W trybie dewelopera GlikoControl wyświetla bieżący poziom glikemii bezpośrednio na ekranie samochodu." }),
      i18n.t('auto.nowosc_dodano_profesjonalne_ra', { defaultValue: "Nowość: Dodano profesjonalne raporty AGP w zakładce 'Raporty AI', wyposażone w matematykę percentyli i wspaniały, szklisty interfejs (Glassmorphism)." }),
      i18n.t('auto.poprawka_stabilizacja_renderow', { defaultValue: "Poprawka: Stabilizacja renderowania na słabszych urządzeniach i drobne szlify animacji." })
    ]
  },
  {
    version: "5.2.1",
    date: "2026-06-08",
    title: "Gliko Apteczka & Smart Skaner",
    changes: [
      i18n.t('auto.nowosc_nowa_ogromna_aktualizac', { defaultValue: "Nowość: Nowa, ogromna aktualizacja systemów PWA." }),
      i18n.t('auto.nowosc_dodano_nowoczesny_skane', { defaultValue: "Nowość: Dodano nowoczesny skaner kodów kreskowych za pomocą kamery aparatu." }),
      i18n.t('auto.automatyzacja_zeskanowane_wklu', { defaultValue: "Automatyzacja: Zeskanowane wkłucia i sensory automatycznie aktualizują Twoje stany w Apteczce." }),
      "Poprawka: Przeprojektowano i uszeregowano listy aktualizacji dla wersji PWA oraz natywnej APK."
    ]
  },
  {
    version: "4.1.1",
    date: "2026-05-28",
    title: "Najnowsza Wersja 4.1.1",
    changes: [
      i18n.t('auto.nowosc_mozesz_teraz_zmieniac_k', { defaultValue: "Nowość! ✨ Możesz teraz zmieniać kształt wybranych ikon i kafelków na pulpicie, dopasowując go bardziej do własnych upodobań." }),
      i18n.t('auto.ulepszono_dzialanie_i_plynnosc', { defaultValue: "Ulepszono działanie i płynność edycji pulpitu oraz znacznie zoptymalizowano zapisy jego układu w chmurze (Firebase)." }),
      "Usprawniono proces pobierania najnowszych aktualizacji dla wydania APK aplikacji.",
    ]
  },
  {
    version: "4.1",
    date: "2026-05-27",
    title: "Najnowsza Wersja 4.1",
    changes: [
      i18n.t('auto.mozliwosc_edycji_i_kustomizacj', { defaultValue: "Możliwość edycji i kustomizacji pulpitu" }),
      "Drobne poprawy UI",
      i18n.t('auto.ulepszenie_widzetu_wchlaniania', { defaultValue: "Ulepszenie widżetu wchłaniania posiłków" }),
      i18n.t('auto.mozliwosc_pobrania_natywnej_ap', { defaultValue: "Możliwość pobrania natywnej aplikacji Android (APK)" })
    ]
  },
  {
    version: "4.0",
    date: "2026-05-26",
    title: i18n.t('auto.aktualizacja_4_0_gotowosc_na_p', { defaultValue: "Aktualizacja 4.0: Gotowość na pliki APK i ulepszony GlikoSense" }),
    changes: [
      i18n.t('auto.nowe_wsparcie_dla_aplikacji_ap', { defaultValue: "Nowe wsparcie dla aplikacji APK na system Android: Dodano bezpieczny eksport i import modelu oraz danych za pomocą plików JSON, chroniąc przed utratą danych w trybie gościa." }),
      i18n.t('auto.zaawansowana_analiza_wchlanian', { defaultValue: "Zaawansowana analiza wchłaniania posiłków: Lepsze szacowanie uwalniania się węglowodanów złożonych, białek i tłuszczów w czasie." }),
      i18n.t('auto.ulepszony_i_dokladniejszy_asys', { defaultValue: "Ulepszony i dokładniejszy asystent prognoz GlikoSense: Zwiększona dokładność predykcji przyszłych trendów glikemicznych i dawkowań." }),
      i18n.t('auto.liczne_podreczne_poprawki_w_ui', { defaultValue: "Liczne podręczne poprawki w UI: Przebudowany interfejs widgetów, zoptymalizowana nawigacja oraz lepsza responsywność na ekranach dotykowych." }),
      i18n.t('auto.naprawa_bledow_usuniecie_probl', { defaultValue: "Naprawa błędów: Usunięcie problemów z synchronizacją bazy oraz drobnych błędów działania algorytmów." })
    ]
  },
  {
    version: "3.5.3",
    date: "2026-05-22",
    title: i18n.t('auto.aktualizacja_3_5_3_wizualne_st', { defaultValue: "Aktualizacja 3.5.3: Wizualne Strzałki, Optymalizacja Sync i Okno Czatu" }),
    changes: [
      i18n.t('auto.nowosc_dodano_graficzne_strzal', { defaultValue: "Nowość: Dodano graficzne strzałki trendów w czasie rzeczywistym (np. ↑, ↓, ↗) bezpośrednio przy najnowszym punkcie glikemii na głównym wykresie." }),
      i18n.t('auto.optymalizacja_wdrozono_intelig', { defaultValue: "Optymalizacja: Wdrożono inteligentną warstwę buforowania (caching layer) dla zapytań Nightscout (buforowanie na 5 minut przy zapytaniach w tle) w celu oszczędzania baterii i transferu danych." }),
      i18n.t('auto.ulepszenie_wprowadzono_opcje_n', { defaultValue: "Ulepszenie: Wprowadzono opcję natychmiastowego wymuszenia pełnej synchronizacji przy ręcznym odświeżeniu." }),
      i18n.t('auto.interfejs_pelne_dostosowanie_i', { defaultValue: "Interfejs: Pełne dostosowanie i optymalizacja okna Gliko Czat w trybie poziomym (landscape) na telefonach (kompaktowy nagłówek, zmniejszony avatar, ulepszone pole wpisywania oraz prawidłowe wypełnienie wysokości ekranu)." }),
      i18n.t('auto.stabilnosc_drobne_udoskonaleni', { defaultValue: "Stabilność: Drobne udoskonalenia interfejsu wykresów oraz poprawki wydajnościowe na telefonach i tabletach (usunięcie błędu typowania delta w integracji Nightscout)." })
    ]
  },
  {
    version: "3.5.2",
    date: "2026-05-20",
    title: "Najnowsza Wersja 3.5.2",
    changes: [
      i18n.t('auto.nowe_animacje_i_zaktualizowane', { defaultValue: "Nowe animacje i zaktualizowane, super nowoczesne okno nowości (pop-up) po pomyślnym załadowaniu aktualizacji." }),
      i18n.t('auto.dodano_dodatkowe_wsparcie_i_le', { defaultValue: "Dodano dodatkowe wsparcie i lepszą responsywność dla większych ekranów." }),
      i18n.t('auto.poprawki_wydajnosciowe_i_optym', { defaultValue: "Poprawki wydajnościowe i optymalizacja działania pod maską aplikacji." }),
      i18n.t('auto.zwiekszono_niezawodnosc_wyswie', { defaultValue: "Zwiększono niezawodność wyświetlania statystyk i ulepszono walidację formularzy." })
    ]
  },
  {
    version: "3.5.1",
    date: "2026-05-18",
    title: "Ulepszenia Gliko Czat i Profilu",
    changes: [
      i18n.t('auto.nowosc_czat_gliko_lepiej_rozum', { defaultValue: "Nowość: Czat Gliko lepiej rozumie komendy, np. wystarczy zapytać o jadłospis." }),
      "Poprawka: Dodanie do talerza z Gliko Czat wymaga teraz komendy 'dodaj do talerza'.",
      i18n.t('auto.interfejs_zmniejszono_odstepy', { defaultValue: "Interfejs: Zmniejszono odstępy ikon w profilu (kafelki Więcej), co ułatwia nawigację bez przewijania." }),
      i18n.t('auto.objasnienia_ekran_powitalny_on', { defaultValue: "Objaśnienia: Ekran powitalny (Onboarding) otrzymał informację o Dietach oraz opcjach pogodowych." })
    ]
  },
  {
    version: "3.5.0",
    date: "2026-05-18",
    title: "Pogoda, Diety i Nowe Funkcje 3.5.0",
    changes: [
      i18n.t('auto.dodano_inteligentny_widzet_pog', { defaultValue: "Dodano inteligentny widżet pogody – możliwość sprawdzania aktualnych warunków bezpośrednio na pulpicie." }),
      i18n.t('auto.wprowadzono_analize_wplywu_sro', { defaultValue: "Wprowadzono analizę wpływu środowiska – GlikoSense uwzględnia temperaturę i ciśnienie w prognozach." }),
      i18n.t('auto.powiekszono_baze_produktow_o_s', { defaultValue: "Powiększono bazę produktów o setki pozycji (Keto, Wege, Low-GI) – dla jeszcze łatwiejszego liczenia." }),
      i18n.t('auto.wprowadzono_funkcje_puste_wegl', { defaultValue: "Wprowadzono funkcję 'Puste Węgle' w kalkulatorze bolusa – do precyzyjnego odejmowania polioli i pustych węglowodanów." }),
      "Ulepszono asystenta AI – teraz sprawniej dodaje produkty prosto na Talerz.",
      i18n.t('auto.odswiezono_interfejs_ulepszona', { defaultValue: "Odświeżono interfejs – ulepszona nawigacja i dopracowane detale wizualne." })
    ]
  },
  {
    version: "3.4.3",
    date: "2026-05-15",
    title: "Automatyka GI i Ulepszona Haptyka",
    changes: [
      i18n.t('auto.nowosc_dodano_opcje_automatycz', { defaultValue: "Nowość: Dodano opcję automatycznego pobierania Indeksu Glikemicznego (IG) i Ładunku (ŁG) dla własnych produktów w ustawieniach." }),
      i18n.t('auto.ulepszenie_zoptymalizowano_sys', { defaultValue: "Ulepszenie: Zoptymalizowano system haptyczny (wibracje) dla płynniejszej i bardziej naturalnej reakcji interfejsu." }),
      i18n.t('auto.interfejs_usunieto_nakladajace', { defaultValue: "Interfejs: Usunięto nakładające się elementy na wykresie glikemii w trybie swobodnym." }),
      i18n.t('auto.stabilnosc_poprawki_drobnych_b', { defaultValue: "Stabilność: Poprawki drobnych błędów w synchronizacji danych Nightscout." })
    ]
  },
  {
    version: "3.4.2",
    date: "2026-05-14",
    title: "Haptyka i Precyzja Bolusa",
    changes: [
      i18n.t('auto.nowosc_dodano_haptyczne_sprzez', { defaultValue: "Nowość: Dodano haptyczne sprzężenie zwrotne (wibracje) przy interakcjach z UI (wymaga wsparcia Vibrations API)." }),
      i18n.t('auto.poprawka_usprawniono_zaokragla', { defaultValue: "Poprawka: Usprawniono zaokrąglanie wartości insuliny pobieranych z Talerza do Kalkulatora Bolusa." }),
      i18n.t('auto.stabilnosc_naprawiono_blad_sta', { defaultValue: "Stabilność: Naprawiono błąd startowy serwera związany z typami ścieżek Node.js." }),
      i18n.t('auto.poprawka_czytelniejsze_wyswiet', { defaultValue: "Poprawka: Czytelniejsze wyświetlanie ładunków glikemicznych i wartości WW w historii." })
    ]
  },
  {
    version: "3.4.1",
    date: "2026-05-13",
    title: "RODO i Optymalizacja Talerza",
    changes: [
      i18n.t('auto.rodo_dodano_uproszczona_klauzu', { defaultValue: "RODO: Dodano uproszczoną klauzulę zgody bez wymogu podpisu odręcznego." }),
      i18n.t('auto.talerz_wprowadzono_usprawnieni', { defaultValue: "Talerz: Wprowadzono usprawnienia w zarządzaniu produktami na talerzu oraz ich trwałość." }),
      i18n.t('auto.interfejs_szereg_poprawek_wizu', { defaultValue: "Interfejs: Szereg poprawek wizualnych i optymalizacja UI dla lepszej czytelności." })
    ]
  },
  {
    version: "3.4.0",
    date: "2026-05-12",
    title: "Nowy Wymiar Elegancji: Bento 2.0",
    changes: [
      i18n.t('auto.interfejs_calkowicie_nowy_layo', { defaultValue: "Interfejs: Całkowicie nowy layout 'Bento' na pulpicie – lepsza organizacja i czytelność." }),
      i18n.t('auto.design_nowa_typografia_space_g', { defaultValue: "Design: Nowa typografia (Space Grotesk) dla technicznego, nowoczesnego wyglądu." }),
      i18n.t('auto.mood_wprowadzono_dynamiczne_ko', { defaultValue: "Mood: Wprowadzono dynamiczne kolory akcentów zależne od bieżącego stanu glikemii (opcjonalnie)." }),
      i18n.t('auto.wydajnosc_zoptymalizowano_rend', { defaultValue: "Wydajność: Zoptymalizowano renderowanie wykresów przy dużych zestawach danych (10k+ rekordów)." }),
      i18n.t('auto.pwa_ulepszony_tryb_offline_i_s', { defaultValue: "PWA: Ulepszony tryb offline i stabilniejsze ikony skrótów." })
    ]
  },
  {
    version: "3.3.7",
    date: "2026-05-12",
    title: i18n.t('auto.giga_aktualizacja_wydajnosc_i', { defaultValue: "Giga-Aktualizacja: Wydajność i Offline" }),
    changes: [
      i18n.t('auto.nowosc_tryb_offline_dzieki_ind', { defaultValue: "Nowość: Tryb Offline – dzięki IndexedDB aplikacja działa bez internetu i oszczędza transfer (pobiera tylko nowe dane)." }),
      i18n.t('auto.analityka_pelne_30_dniowe_stat', { defaultValue: "Analityka: Pełne 30-dniowe statystyki TIR na ekranie głównym (zwiększony limit do 10 000 rekordów)." }),
      i18n.t('auto.stabilnosc_naprawiono_krytyczn', { defaultValue: "Stabilność: Naprawiono krytyczne błędy połączenia z bazą danych i poprawiono buforowanie widoków." }),
      i18n.t('auto.poprawka_stabilizacja_wyswietl', { defaultValue: "Poprawka: Stabilizacja wyświetlania danych z Nightscout i precyzyjniejsza konwersja jednostek czasu." })
    ]
  },
  {
    version: "3.3.5",
    date: "2026-05-11",
    title: "Wirtualny Asystent i Kalkulator Alkoholu",
    changes: [
      i18n.t('auto.nowosc_czat_z_inteligentnym_as', { defaultValue: "Nowość: Czat z inteligentnym asystentem AI posiadającym wiedzę na temat Twoich dziennych wyników i pomiarów (analiza do 24h wstecz)." }),
      i18n.t('auto.nowosc_kalkulator_alkoholu_pom', { defaultValue: "Nowość: Kalkulator Alkoholu pomagający ustalić wpływ poszczególnych rodzajów alkoholu na Glikemię i dawkę insuliny." }),
      i18n.t('auto.poprawka_stabilizacja_polaczen', { defaultValue: "Poprawka: Stabilizacja połączenia z modelem AI – wyeliminowano błędy 'initial-message' i poprawiono wydajność odpowiedzi." }),
      "Ulepszenie: GlikoSense generuje teraz bardziej spersonalizowane i precyzyjne dziennie raporty.",
      i18n.t('auto.optymalizacja_przyspieszono_la', { defaultValue: "Optymalizacja: Przyspieszono ładowanie modułów asystenta i zaktualizowano listę modeli rezerwowych." })
    ]
  },
  {
    version: "3.3.4",
    date: "2026-05-10",
    title: i18n.t('auto.notatnik_ladunek_glikemiczny_i', { defaultValue: "Notatnik, Ładunek Glikemiczny i Inteligentniejszy GlikoSense" }),
    changes: [
      i18n.t('auto.nowosc_osobisty_notatnik_i_kom', { defaultValue: "Nowość: Osobisty notatnik i kompendium wiedzy do szybkiego zapisywania przemyśleń." }),
      "Poprawienie logiki GlikoSense – trafniejsze i skuteczniejsze wnioski i alerty.",
      i18n.t('auto.dodano_wyliczanie_ladunku_glik', { defaultValue: "Dodano wyliczanie Ładunku Glikemicznego (ŁG) dla posiłków i produktów – dla jeszcze lepszej kontroli." })
    ]
  },
  {
    version: "3.3.3",
    date: "2026-05-09",
    title: i18n.t('auto.poprawki_wyswietlania_zaokragl', { defaultValue: "Poprawki wyświetlania (Zaokrąglanie)" }),
    changes: [
      i18n.t('auto.poprawiono_zaokraglanie_wartos', { defaultValue: "Poprawiono zaokrąglanie wartości insuliny (bolusów, bazy) oraz jednostek na wykresie i statusie pompy, ukrywając niepotrzebne liczby po przecinku." })
    ]
  },
  {
    version: "3.3.2",
    date: "2026-05-09",
    title: "Poprawka API Gemini",
    changes: [
      i18n.t('auto.naprawiono_priorytetyzacje_i_z', { defaultValue: "Naprawiono priorytetyzację i zapisywanie własnego klucza API Gemini." }),
      i18n.t('auto.poprawki_drobnych_bledow_z_ins', { defaultValue: "Poprawki drobnych błędów z instalacją i stabilnością." })
    ]
  },
  {
    version: "3.3.1",
    date: "2026-05-08",
    title: "Poprawki Instalacji (PWA)",
    changes: [
      i18n.t('auto.naprawiono_blad_z_niepoprawnym', { defaultValue: "Naprawiono błąd z niepoprawnym adresem URL przy instalacji aplikacji PWA z uciętym `/diab/`." }),
      "Aktualizacja silnika i drobne poprawki."
    ]
  },
  {
    version: "3.3.0",
    date: "2026-05-08",
    title: "GlikoSense 2.5 - Deep Analysis & UI",
    changes: [
      i18n.t('auto.nowy_ekskluzywny_wyglad_widget', { defaultValue: "Nowy, ekskluzywny wygląd widgetu GlikoSense (Glassmorphism, dynamiczne tło, animacje predykcji)" }),
      i18n.t('auto.rozszerzenie_okresu_wyciagania', { defaultValue: "Rozszerzenie okresu wyciągania wniosków przez GlikoSense z 7 do 14 dni" }),
      i18n.t('auto.przebudowany_uklad_najwazniejs', { defaultValue: "Przebudowany układ najważniejszych metryk: 'Kierunek za 1h' i 'Pewność Modelu' mają teraz wyższy priorytet" }),
      "Bardziej precyzyjne komunikaty algorytmu i poprawki gramatyczne",
      i18n.t('auto.nowe_ulepszone_metryki_rozklad', { defaultValue: "Nowe, ulepszone metryki rozkładu dni (analiza dni w których cukier bywa trudniejszy)" })
    ]
  },
  {
    version: "3.2.0",
    date: "2026-05-05",
    title: "GlikoSense Engine 2.4 – Inteligencja Offline",
    changes: [
      i18n.t('auto.nowy_detektor_zuzytego_wklucia', { defaultValue: "Nowy detektor zużytego wkłucia: Alert przy braku reakcji na insulinę przez 4h" }),
      i18n.t('auto.analiza_cyklu_dobowego_wykrywa', { defaultValue: "Analiza cyklu dobowego: Wykrywanie zmiennej wrażliwości w ciągu dnia (Feature F)" }),
      i18n.t('auto.branding_glikosense_wszystkie', { defaultValue: "Branding GlikoSense: Wszystkie analizy algorytmu są teraz wyraźnie oznaczone" }),
      "Wersja silnika GlikoSense (v2.4.1) widoczna w ustawieniach profilu",
      i18n.t('auto.nowy_salon_gier_gliko_arcade_s', { defaultValue: "Nowy salon gier: Gliko Arcade (Sky Higher, Zagadka Talerzy, Memory, Ogród TIR)" }),
      i18n.t('auto.mealplate_ux_wykres_makrosklad', { defaultValue: "MealPlate UX: Wykres makroskładników (%) oraz pływający przycisk nawigacji do talerza" }),
      i18n.t('auto.ulepszona_predykcja_krzyzowa_z', { defaultValue: "Ulepszona predykcja krzyżowa (zjawisko brzasku i modelowanie nocne)" })
    ]
  },
  {
    version: "3.1.0",
    date: "2026-05-05",
    title: i18n.t('auto.aktualizacja_majowa_madry_glik', { defaultValue: "Aktualizacja Majowa - Mądry Gliko & UX" }),
    changes: [
      "Nowy interaktywny Quiz Edukacyjny dla dzieci o cukrzycy (Gliko Quiz)",
      i18n.t('auto.system_historii_zmian_changelo', { defaultValue: "System historii zmian (Changelog) dostępny w profilu" }),
      i18n.t('auto.wskaznik_energii_gliko_bazujac', { defaultValue: "Wskaźnik energii Gliko bazujący na Aktywnej Insulinie (IOB)" }),
      "Nowe animacje reakcji Gliko na poziomy cukru",
      i18n.t('auto.poprawiona_stabilnosc_bazy_dan', { defaultValue: "Poprawiona stabilność bazy danych i synchronizacji" }),
      i18n.t('auto.optymalizacja_interfejsu_uzytk', { defaultValue: "Optymalizacja interfejsu użytkownika i poprawki wizualne" }),
      i18n.t('auto.dodano_mozliwosc_zamykania_pow', { defaultValue: "Dodano możliwość zamykania powiadomień systemowych GlikoSense" })
    ]
  },
  {
    version: "2.8.0",
    date: "2026-05-04",
    title: "System Personalizacji i Sklep",
    changes: [
      i18n.t('auto.wprowadzenie_sklepu_z_akcesori', { defaultValue: "Wprowadzenie sklepu z akcesoriami i nowymi skórkami" }),
      i18n.t('auto.system_misji_dziennych_i_pozio', { defaultValue: "System misji dziennych i poziomów doświadczenia XP" }),
      i18n.t('auto.dodano_mini_gre_celuj_w_cukier', { defaultValue: "Dodano mini-grę 'Celuj w Cukier'" }),
      i18n.t('auto.mozliwosc_zmiany_tla_pokoju_gl', { defaultValue: "Możliwość zmiany tła pokoju Gliko" })
    ]
  },
];

export const APK_VERSIONS: VersionEntry[] = [
  {
    version: "5.3.1",
    date: "2026-06-10",
    title: "Wsparcie dla Android Auto",
    changes: [
      i18n.t('auto.usluga_w_tle_komunikacja_natyw', { defaultValue: "Usługa w tle: Komunikacja natywna z pulpitem deski rozdzielczej Android Auto (wymaga Trybu Programisty)." }),
      i18n.t('auto.usprawnienie_nowa_nazwa_wyjsci', { defaultValue: "Usprawnienie: Nowa nazwa wyjściowa kompilatora (GlikoControl.apk)." })
    ]
  },
  {
    version: "1.5.7",
    date: "2026-06-08",
    title: "Gliko Family: Zdalne Komunikaty",
    changes: [
      i18n.t('auto.nowosc_pelnoekranowe_powiadomi', { defaultValue: "Nowość: Pełnoekranowe powiadomienia (Gliko Family) wysyłane ze sparowanych urządzeń" }),
      i18n.t('auto.nowosc_potwierdzanie_zrozumien', { defaultValue: "Nowość: Potwierdzanie zrozumienia ważnych komunikatów na drugim ekranie" }),
      "Poprawka: Nowa, bardzo elegancka i subtelna animacja po instalacji aktualizacji"
    ]
  },
  {
    version: "1.5.6",
    date: "2026-06-08",
    title: "Aktualizacja 1.5.6",
    changes: [
      i18n.t('auto.poprawka_pobierania_paczek_ota', { defaultValue: "Poprawka pobierania paczek OTA: Przejście na nowy format kompresji" }),
      "Dodano systemowe uprawnienie stanu sieci dla pobierania w tle",
      i18n.t('auto.naprawiono_bledny_adres_pobier', { defaultValue: "Naprawiono błędny adres pobierania pliku APK w wersji PWA" })
    ]
  },
  {
    version: "1.5.2",
    date: "2026-06-08",
    title: "Patch 1.5.2",
    changes: [
      i18n.t('auto.hotfix_naprawiono_blad_wyswiet', { defaultValue: "Hotfix: Naprawiono błąd wyświetlania zakładki System (brakujący import ikonki)" })
    ]
  },
  {
    version: "1.5.1",
    date: "2026-06-08",
    title: "Aktualizacja 1.5.1",
    changes: [
      "Test aktualizacji OTA (Over-The-Air)",
      i18n.t('auto.poprawka_migajacej_listy_urzad', { defaultValue: "Poprawka migającej listy urządzeń WebSocket" }),
      i18n.t('auto.dodano_przycisk_do_recznego_wy', { defaultValue: "Dodano przycisk do ręcznego wymuszania aktualizacji" }),
      i18n.t('auto.oznaczenie_wlasnego_urzadzenia', { defaultValue: "Oznaczenie własnego urządzenia '(Ty)' na liście pokoju" })
    ]
  },
  {
    version: "1.0.0",
    date: "2026-04-15",
    title: "Start aplikacji GlikoControl",
    changes: [
      "Podstawowy system opieki nad wirtualnym przyjacielem",
      i18n.t('auto.integracja_z_logami_glukozy_i', { defaultValue: "Integracja z logami glukozy i posiłków" }),
      i18n.t('auto.system_powiadomien_o_niskim_i', { defaultValue: "System powiadomień o niskim i wysokim cukrze" })
    ]
  }
];
