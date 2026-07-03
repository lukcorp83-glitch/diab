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

export const CURRENT_VERSION = '5.4.16';

import versionData from '../../version.json';
export const CURRENT_OTA_REVISION = versionData.otaRevision || 0;

export const PWA_VERSIONS: VersionEntry[] = [
  {
    version: "5.4.16",
    date: "2026-07-03",
    title: "Szyfrowanie bazy danych i poprawki aktualizacji",
    changes: [
      "Bezpieczeństwo: Pełne sprzętowe szyfrowanie lokalnej bazy danych SQLite dla bezpieczeństwa wrażliwych danych medycznych.",
      "Naprawa: Rozwiązano problem fałszywych komunikatów o aktualizacji OTA po świeżej instalacji aplikacji.",
      "Logika: Automatyczna migracja starej bazy poprzez bezpieczne zaciągnięcie historii z chmury Firebase."
    ]
  },
  {
    version: "5.4.13",
    date: "2026-06-30",
    title: "Optymalizacja pamięci podręcznej",
    changes: [
      "Poprawki i usunięcie błędu z pamięcią podręczną Vite (usunięto stary folder testowy) oraz wyczyszczenie przycisków telemetrii."
    ]
  },


  {
    version: "5.4.12",
    date: "2026-06-30",
    title: "Poprawki bazy produktów",
    changes: [
      "Naprawa importu mikrofonu w bazie produktów oraz weryfikacja poprawności filtrowania wyszukiwania."
    ]
  },

  {
    version: "5.4.11",
    date: "2026-06-30",
    title: "Natywny mikrofon Android",
    changes: [
      "Nowość: Oparto wyszukiwanie głosowe w 100% na usługach natywnych systemu Android w celu optymalizacji i naprawy błędu odmowy dostępu.",
      "Naprawa: Zredukowano finalny rozmiar aktualizacji OTA."
    ]
  },

  {
    version: "5.4.8",
    date: "2026-06-30",
    title: "Łatki dla mikrofonu (Android 11+)",
    changes: [
      "Nowość: Dodano regułę 'queries' do AndroidManifest, przez którą asystent głosowy ubijał aplikację.",
      "Poprawka: Downgrade wtyczki Capacitor z v7 do v6 dla uniknięcia błędów mostka Java na starszych smartfonach.",
      "Usunięcie: Całkowicie wycięto sekcję telemetrii GlikoSense z kodu, aplikacja działa teraz szybciej i uczy się w 100% lokalnie!"
    ]
  },
  {
    version: "5.4.7",
    date: "2026-06-30",
    title: "Stabilizacja pulpitu i integracja natywna",
    changes: [
      "Nowość: Eleganckie strzałki do zmiany kolejności kafelków – eliminuje zawieszanie się starszych smartfonów.",
      "Poprawka: Ponowna instalacja natywnego asystenta głosowego Google (mikrofon) wraz z zabezpieczeniem awaryjnym (fallback)."
    ]
  },
  {
    version: "5.4.6",
    date: "2026-06-30",
    title: "Naprawa mikrofonu i przeciągania na pulpicie",
    changes: [
      "Poprawka: Wymuszenie systemowych uprawnień do mikrofonu dla WebView (Capacitor), przywracając działanie GlikoChat.",
      "Poprawka: Naprawiono błąd układu powodujący spowolnienie lub zamrożenie aplikacji podczas przeciągania widżetów na pulpicie."
    ]
  },
  {
    version: "5.4.5",
    date: "2026-06-30",
    title: "Kanał Testowy Beta (OTA)",
    changes: [
      "Nowość: Wprowadzono w ustawieniach nowy przełącznik \"Program testów Beta\". Pozwala na instalowanie eksperymentalnych aktualizacji OTA.",
      "Poprawka: Aplikacja pobiera z osobnej puli testowej, by uchronić stabilne wydanie przed błędami."
    ]
  },
  {
    version: "5.4.2",
    date: "2026-06-29",
    title: 'auto.wersja_5_4_2',
    changes: [
      "auto.poprawki_plynnosci_przesuwania_widzetow",
      "auto.natywny_silnik_rozpoznawania_mowy"
    ]
  },
  {
    version: "5.4.0",
    date: "2026-06-29",
    title: 'auto.wersja_5_4_0',
    changes: [
      "auto.poprawki_asystenta_glosowego",
      "auto.przebudowa_systemu_ota"
    ]
  },
  {
    version: "5.3.9",
    date: "2026-06-29",
    title: 'changelog.v539_title',
    changes: [
      "changelog.v539_change_1",
      "changelog.v539_change_2"
    ]
  },
  {
    version: "5.3.8",
    date: "2026-06-29",
    title: 'Pełna automatyzacja aktualizacji i powiadomień',
    changes: [
      "Rozwiązano błędy z zapętlaniem się okienka aktualizacji",
      "Wdrożono system wydawniczy oparty na stałej paczce aktualizacji",
      "Dodano dodatkowe poprawki kompatybilności OTA"
    ]
  },
  {
    version: "5.3.7",
    date: "2026-06-29",
    title: 'Zmiana kolorystyki i nowy system OTA',
    changes: [
      "Nowy system dystrybucji OTA i APK bazujący na GitHub Actions",
      "Poprawka kolorystyki widgetów na Dashboardzie (Violet i Cyan)"
    ]
  },
  {
    version: "5.3.5",
    date: "2026-06-25",
    title: 'auto.co_nowego_w_wersji_5_3_5',
    changes: [
      {
        categoryKey: "kategoria_aktualizacje",
        icon: "CloudCog",
        colorClass: "bg-purple-50 text-purple-500 dark:bg-purple-950/40 dark:text-purple-400",
        descriptionKey: "auto.nowosc_ota_system"
      },
      {
        categoryKey: "kategoria_wersja_apk_mobilna",
        icon: "Smartphone",
        colorClass: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400",
        descriptionKey: "auto.naprawa_mechanizmu_apk"
      },
      {
        categoryKey: "kategoria_wersja_apk_mobilna",
        icon: "Smartphone",
        colorClass: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400",
        descriptionKey: "auto.naprawa_przycisk_apk"
      },
      {
        categoryKey: "kategoria_aktualizacje",
        icon: "Wrench",
        colorClass: "bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400",
        descriptionKey: "auto.ulepszenie_wersje_ujednolicone"
      }
    ]
  },
  {
    version: "5.3.1",
    date: "2026-06-10",
    title: "Android Auto & Standard AGP",
    changes: [
      i18n.t('auto.nowosc_pelna_integracja_z_andr', { defaultValue: i18n.t('auto.nowosc_pelna_integracja_z', { defaultValue: "Nowość: Pełna integracja z Android Auto! W trybie dewelopera GlikoControl wyświetla bieżący poziom glikemii bezpośrednio na ekranie samochodu." }) }),
      i18n.t('auto.nowosc_dodano_profesjonalne_ra', { defaultValue: i18n.t('auto.nowosc_dodano_profesjonal', { defaultValue: "Nowość: Dodano profesjonalne raporty AGP w zakładce 'Raporty AI', wyposażone w matematykę percentyli i wspaniały, szklisty interfejs (Glassmorphism)." }) }),
      i18n.t('auto.poprawka_stabilizacja_renderow', { defaultValue: i18n.t('auto.poprawka_stabilizacja_ren', { defaultValue: "Poprawka: Stabilizacja renderowania na słabszych urządzeniach i drobne szlify animacji." }) })
    ]
  },
  {
    version: "5.2.1",
    date: "2026-06-08",
    title: "Gliko Apteczka & Smart Skaner",
    changes: [
      i18n.t('auto.nowosc_nowa_ogromna_aktualizac', { defaultValue: i18n.t('auto.nowosc_nowa_ogromna_aktua', { defaultValue: "Nowość: Nowa, ogromna aktualizacja systemów PWA." }) }),
      i18n.t('auto.nowosc_dodano_nowoczesny_skane', { defaultValue: i18n.t('auto.nowosc_dodano_nowoczesny', { defaultValue: "Nowość: Dodano nowoczesny skaner kodów kreskowych za pomocą kamery aparatu." }) }),
      i18n.t('auto.automatyzacja_zeskanowane_wklu', { defaultValue: i18n.t('auto.automatyzacja_zeskanowane', { defaultValue: "Automatyzacja: Zeskanowane wkłucia i sensory automatycznie aktualizują Twoje stany w Apteczce." }) }),
      "Poprawka: Przeprojektowano i uszeregowano listy aktualizacji dla wersji PWA oraz natywnej APK."
    ]
  },
  {
    version: "4.1.1",
    date: "2026-05-28",
    title: "Najnowsza Wersja 4.1.1",
    changes: [
      i18n.t('auto.nowosc_mozesz_teraz_zmieniac_k', { defaultValue: i18n.t('auto.nowosc_mozesz_teraz_zmien', { defaultValue: "Nowość! ✨ Możesz teraz zmieniać kształt wybranych ikon i kafelków na pulpicie, dopasowując go bardziej do własnych upodobań." }) }),
      i18n.t('auto.ulepszono_dzialanie_i_plynnosc', { defaultValue: i18n.t('auto.ulepszono_dzialanie_i_ply', { defaultValue: "Ulepszono działanie i płynność edycji pulpitu oraz znacznie zoptymalizowano zapisy jego układu w chmurze (Firebase)." }) }),
      "Usprawniono proces pobierania najnowszych aktualizacji dla wydania APK aplikacji.",
    ]
  },
  {
    version: "4.1",
    date: "2026-05-27",
    title: "Najnowsza Wersja 4.1",
    changes: [
      i18n.t('auto.mozliwosc_edycji_i_kustomizacj', { defaultValue: i18n.t('auto.mozliwosc_edycji_i_kustom', { defaultValue: "Możliwość edycji i kustomizacji pulpitu" }) }),
      "Drobne poprawy UI",
      i18n.t('auto.ulepszenie_widzetu_wchlaniania', { defaultValue: i18n.t('auto.ulepszenie_widzetu_wchlan', { defaultValue: "Ulepszenie widżetu wchłaniania posiłków" }) }),
      i18n.t('auto.mozliwosc_pobrania_natywnej_ap', { defaultValue: i18n.t('auto.mozliwosc_pobrania_natywn', { defaultValue: "Możliwość pobrania natywnej aplikacji Android (APK)" }) })
    ]
  },
  {
    version: "4.0",
    date: "2026-05-26",
    title: i18n.t('auto.aktualizacja_4_0_gotowosc_na_p', { defaultValue: i18n.t('auto.aktualizacja_4_0_gotowosc', { defaultValue: "Aktualizacja 4.0: Gotowość na pliki APK i ulepszony GlikoSense" }) }),
    changes: [
      i18n.t('auto.nowe_wsparcie_dla_aplikacji_ap', { defaultValue: i18n.t('auto.nowe_wsparcie_dla_aplikac', { defaultValue: "Nowe wsparcie dla aplikacji APK na system Android: Dodano bezpieczny eksport i import modelu oraz danych za pomocą plików JSON, chroniąc przed utratą danych w trybie gościa." }) }),
      i18n.t('auto.zaawansowana_analiza_wchlanian', { defaultValue: i18n.t('auto.zaawansowana_analiza_wchl', { defaultValue: "Zaawansowana analiza wchłaniania posiłków: Lepsze szacowanie uwalniania się węglowodanów złożonych, białek i tłuszczów w czasie." }) }),
      i18n.t('auto.ulepszony_i_dokladniejszy_asys', { defaultValue: i18n.t('auto.ulepszony_i_dokladniejszy', { defaultValue: "Ulepszony i dokładniejszy asystent prognoz GlikoSense: Zwiększona dokładność predykcji przyszłych trendów glikemicznych i dawkowań." }) }),
      i18n.t('auto.liczne_podreczne_poprawki_w_ui', { defaultValue: i18n.t('auto.liczne_podreczne_poprawki', { defaultValue: "Liczne podręczne poprawki w UI: Przebudowany interfejs widgetów, zoptymalizowana nawigacja oraz lepsza responsywność na ekranach dotykowych." }) }),
      i18n.t('auto.naprawa_bledow_usuniecie_probl', { defaultValue: i18n.t('auto.naprawa_bledow_usuniecie', { defaultValue: "Naprawa błędów: Usunięcie problemów z synchronizacją bazy oraz drobnych błędów działania algorytmów." }) })
    ]
  },
  {
    version: "3.5.3",
    date: "2026-05-22",
    title: i18n.t('auto.aktualizacja_3_5_3_wizualne_st', { defaultValue: i18n.t('auto.aktualizacja_3_5_3_wizual', { defaultValue: "Aktualizacja 3.5.3: Wizualne Strzałki, Optymalizacja Sync i Okno Czatu" }) }),
    changes: [
      i18n.t('auto.nowosc_dodano_graficzne_strzal', { defaultValue: i18n.t('auto.nowosc_dodano_graficzne_s', { defaultValue: "Nowość: Dodano graficzne strzałki trendów w czasie rzeczywistym (np. ↑, ↓, ↗) bezpośrednio przy najnowszym punkcie glikemii na głównym wykresie." }) }),
      i18n.t('auto.optymalizacja_wdrozono_intelig', { defaultValue: i18n.t('auto.optymalizacja_wdrozono_in', { defaultValue: "Optymalizacja: Wdrożono inteligentną warstwę buforowania (caching layer) dla zapytań Nightscout (buforowanie na 5 minut przy zapytaniach w tle) w celu oszczędzania baterii i transferu danych." }) }),
      i18n.t('auto.ulepszenie_wprowadzono_opcje_n', { defaultValue: i18n.t('auto.ulepszenie_wprowadzono_op', { defaultValue: "Ulepszenie: Wprowadzono opcję natychmiastowego wymuszenia pełnej synchronizacji przy ręcznym odświeżeniu." }) }),
      i18n.t('auto.interfejs_pelne_dostosowanie_i', { defaultValue: i18n.t('auto.interfejs_pelne_dostosowa', { defaultValue: "Interfejs: Pełne dostosowanie i optymalizacja okna Gliko Czat w trybie poziomym (landscape) na telefonach (kompaktowy nagłówek, zmniejszony avatar, ulepszone pole wpisywania oraz prawidłowe wypełnienie wysokości ekranu)." }) }),
      i18n.t('auto.stabilnosc_drobne_udoskonaleni', { defaultValue: i18n.t('auto.stabilnosc_drobne_udoskon', { defaultValue: "Stabilność: Drobne udoskonalenia interfejsu wykresów oraz poprawki wydajnościowe na telefonach i tabletach (usunięcie błędu typowania delta w integracji Nightscout)." }) })
    ]
  },
  {
    version: "3.5.2",
    date: "2026-05-20",
    title: "Najnowsza Wersja 3.5.2",
    changes: [
      i18n.t('auto.nowe_animacje_i_zaktualizowane', { defaultValue: i18n.t('auto.nowe_animacje_i_zaktualiz', { defaultValue: "Nowe animacje i zaktualizowane, super nowoczesne okno nowości (pop-up) po pomyślnym załadowaniu aktualizacji." }) }),
      i18n.t('auto.dodano_dodatkowe_wsparcie_i_le', { defaultValue: i18n.t('auto.dodano_dodatkowe_wsparcie', { defaultValue: "Dodano dodatkowe wsparcie i lepszą responsywność dla większych ekranów." }) }),
      i18n.t('auto.poprawki_wydajnosciowe_i_optym', { defaultValue: i18n.t('auto.poprawki_wydajnosciowe_i', { defaultValue: "Poprawki wydajnościowe i optymalizacja działania pod maską aplikacji." }) }),
      i18n.t('auto.zwiekszono_niezawodnosc_wyswie', { defaultValue: i18n.t('auto.zwiekszono_niezawodnosc_w', { defaultValue: "Zwiększono niezawodność wyświetlania statystyk i ulepszono walidację formularzy." }) })
    ]
  },
  {
    version: "3.5.1",
    date: "2026-05-18",
    title: "Ulepszenia Gliko Czat i Profilu",
    changes: [
      i18n.t('auto.nowosc_czat_gliko_lepiej_rozum', { defaultValue: i18n.t('auto.nowosc_czat_gliko_lepiej', { defaultValue: "Nowość: Czat Gliko lepiej rozumie komendy, np. wystarczy zapytać o jadłospis." }) }),
      "Poprawka: Dodanie do talerza z Gliko Czat wymaga teraz komendy 'dodaj do talerza'.",
      i18n.t('auto.interfejs_zmniejszono_odstepy', { defaultValue: i18n.t('auto.interfejs_zmniejszono_ods', { defaultValue: "Interfejs: Zmniejszono odstępy ikon w profilu (kafelki Więcej), co ułatwia nawigację bez przewijania." }) }),
      i18n.t('auto.objasnienia_ekran_powitalny_on', { defaultValue: i18n.t('auto.objasnienia_ekran_powital', { defaultValue: "Objaśnienia: Ekran powitalny (Onboarding) otrzymał informację o Dietach oraz opcjach pogodowych." }) })
    ]
  },
  {
    version: "3.5.0",
    date: "2026-05-18",
    title: "Pogoda, Diety i Nowe Funkcje 3.5.0",
    changes: [
      i18n.t('auto.dodano_inteligentny_widzet_pog', { defaultValue: i18n.t('auto.dodano_inteligentny_widze', { defaultValue: "Dodano inteligentny widżet pogody – możliwość sprawdzania aktualnych warunków bezpośrednio na pulpicie." }) }),
      i18n.t('auto.wprowadzono_analize_wplywu_sro', { defaultValue: i18n.t('auto.wprowadzono_analize_wplyw', { defaultValue: "Wprowadzono analizę wpływu środowiska – GlikoSense uwzględnia temperaturę i ciśnienie w prognozach." }) }),
      i18n.t('auto.powiekszono_baze_produktow_o_s', { defaultValue: i18n.t('auto.powiekszono_baze_produkto', { defaultValue: "Powiększono bazę produktów o setki pozycji (Keto, Wege, Low-GI) – dla jeszcze łatwiejszego liczenia." }) }),
      i18n.t('auto.wprowadzono_funkcje_puste_wegl', { defaultValue: i18n.t('auto.wprowadzono_funkcje_puste', { defaultValue: "Wprowadzono funkcję 'Puste Węgle' w kalkulatorze bolusa – do precyzyjnego odejmowania polioli i pustych węglowodanów." }) }),
      "Ulepszono asystenta AI – teraz sprawniej dodaje produkty prosto na Talerz.",
      i18n.t('auto.odswiezono_interfejs_ulepszona', { defaultValue: i18n.t('auto.odswiezono_interfejs_ulep', { defaultValue: "Odświeżono interfejs – ulepszona nawigacja i dopracowane detale wizualne." }) })
    ]
  },
  {
    version: "3.4.3",
    date: "2026-05-15",
    title: "Automatyka GI i Ulepszona Haptyka",
    changes: [
      i18n.t('auto.nowosc_dodano_opcje_automatycz', { defaultValue: i18n.t('auto.nowosc_dodano_opcje_autom', { defaultValue: "Nowość: Dodano opcję automatycznego pobierania Indeksu Glikemicznego (IG) i Ładunku (ŁG) dla własnych produktów w ustawieniach." }) }),
      i18n.t('auto.ulepszenie_zoptymalizowano_sys', { defaultValue: i18n.t('auto.ulepszenie_zoptymalizowan', { defaultValue: "Ulepszenie: Zoptymalizowano system haptyczny (wibracje) dla płynniejszej i bardziej naturalnej reakcji interfejsu." }) }),
      i18n.t('auto.interfejs_usunieto_nakladajace', { defaultValue: i18n.t('auto.interfejs_usunieto_naklad', { defaultValue: "Interfejs: Usunięto nakładające się elementy na wykresie glikemii w trybie swobodnym." }) }),
      i18n.t('auto.stabilnosc_poprawki_drobnych_b', { defaultValue: i18n.t('auto.stabilnosc_poprawki_drobn', { defaultValue: "Stabilność: Poprawki drobnych błędów w synchronizacji danych Nightscout." }) })
    ]
  },
  {
    version: "3.4.2",
    date: "2026-05-14",
    title: "Haptyka i Precyzja Bolusa",
    changes: [
      i18n.t('auto.nowosc_dodano_haptyczne_sprzez', { defaultValue: i18n.t('auto.nowosc_dodano_haptyczne_s', { defaultValue: "Nowość: Dodano haptyczne sprzężenie zwrotne (wibracje) przy interakcjach z UI (wymaga wsparcia Vibrations API)." }) }),
      i18n.t('auto.poprawka_usprawniono_zaokragla', { defaultValue: i18n.t('auto.poprawka_usprawniono_zaok', { defaultValue: "Poprawka: Usprawniono zaokrąglanie wartości insuliny pobieranych z Talerza do Kalkulatora Bolusa." }) }),
      i18n.t('auto.stabilnosc_naprawiono_blad_sta', { defaultValue: i18n.t('auto.stabilnosc_naprawiono_bla', { defaultValue: "Stabilność: Naprawiono błąd startowy serwera związany z typami ścieżek Node.js." }) }),
      i18n.t('auto.poprawka_czytelniejsze_wyswiet', { defaultValue: i18n.t('auto.poprawka_czytelniejsze_wy', { defaultValue: "Poprawka: Czytelniejsze wyświetlanie ładunków glikemicznych i wartości WW w historii." }) })
    ]
  },
  {
    version: "3.4.1",
    date: "2026-05-13",
    title: "RODO i Optymalizacja Talerza",
    changes: [
      i18n.t('auto.rodo_dodano_uproszczona_klauzu', { defaultValue: i18n.t('auto.rodo_dodano_uproszczona_k', { defaultValue: "RODO: Dodano uproszczoną klauzulę zgody bez wymogu podpisu odręcznego." }) }),
      i18n.t('auto.talerz_wprowadzono_usprawnieni', { defaultValue: i18n.t('auto.talerz_wprowadzono_uspraw', { defaultValue: "Talerz: Wprowadzono usprawnienia w zarządzaniu produktami na talerzu oraz ich trwałość." }) }),
      i18n.t('auto.interfejs_szereg_poprawek_wizu', { defaultValue: i18n.t('auto.interfejs_szereg_poprawek', { defaultValue: "Interfejs: Szereg poprawek wizualnych i optymalizacja UI dla lepszej czytelności." }) })
    ]
  },
  {
    version: "3.4.0",
    date: "2026-05-12",
    title: "Nowy Wymiar Elegancji: Bento 2.0",
    changes: [
      i18n.t('auto.interfejs_calkowicie_nowy_layo', { defaultValue: i18n.t('auto.interfejs_calkowicie_nowy', { defaultValue: "Interfejs: Całkowicie nowy layout 'Bento' na pulpicie – lepsza organizacja i czytelność." }) }),
      i18n.t('auto.design_nowa_typografia_space_g', { defaultValue: i18n.t('auto.design_nowa_typografia_sp', { defaultValue: "Design: Nowa typografia (Space Grotesk) dla technicznego, nowoczesnego wyglądu." }) }),
      i18n.t('auto.mood_wprowadzono_dynamiczne_ko', { defaultValue: i18n.t('auto.mood_wprowadzono_dynamicz', { defaultValue: "Mood: Wprowadzono dynamiczne kolory akcentów zależne od bieżącego stanu glikemii (opcjonalnie)." }) }),
      i18n.t('auto.wydajnosc_zoptymalizowano_rend', { defaultValue: i18n.t('auto.wydajnosc_zoptymalizowano', { defaultValue: "Wydajność: Zoptymalizowano renderowanie wykresów przy dużych zestawach danych (10k+ rekordów)." }) }),
      i18n.t('auto.pwa_ulepszony_tryb_offline_i_s', { defaultValue: i18n.t('auto.pwa_ulepszony_tryb_offlin', { defaultValue: "PWA: Ulepszony tryb offline i stabilniejsze ikony skrótów." }) })
    ]
  },
  {
    version: "3.3.7",
    date: "2026-05-12",
    title: i18n.t('auto.giga_aktualizacja_wydajnosc_i', { defaultValue: i18n.t('auto.giga_aktualizacja_wydajno', { defaultValue: "Giga-Aktualizacja: Wydajność i Offline" }) }),
    changes: [
      i18n.t('auto.nowosc_tryb_offline_dzieki_ind', { defaultValue: i18n.t('auto.nowosc_tryb_offline_dziek', { defaultValue: "Nowość: Tryb Offline – dzięki IndexedDB aplikacja działa bez internetu i oszczędza transfer (pobiera tylko nowe dane)." }) }),
      i18n.t('auto.analityka_pelne_30_dniowe_stat', { defaultValue: i18n.t('auto.analityka_pelne_30_dniowe', { defaultValue: "Analityka: Pełne 30-dniowe statystyki TIR na ekranie głównym (zwiększony limit do 10 000 rekordów)." }) }),
      i18n.t('auto.stabilnosc_naprawiono_krytyczn', { defaultValue: i18n.t('auto.stabilnosc_naprawiono_kry', { defaultValue: "Stabilność: Naprawiono krytyczne błędy połączenia z bazą danych i poprawiono buforowanie widoków." }) }),
      i18n.t('auto.poprawka_stabilizacja_wyswietl', { defaultValue: i18n.t('auto.poprawka_stabilizacja_wys', { defaultValue: "Poprawka: Stabilizacja wyświetlania danych z Nightscout i precyzyjniejsza konwersja jednostek czasu." }) })
    ]
  },
  {
    version: "3.3.5",
    date: "2026-05-11",
    title: "Wirtualny Asystent i Kalkulator Alkoholu",
    changes: [
      i18n.t('auto.nowosc_czat_z_inteligentnym_as', { defaultValue: i18n.t('auto.nowosc_czat_z_inteligentn', { defaultValue: "Nowość: Czat z inteligentnym asystentem AI posiadającym wiedzę na temat Twoich dziennych wyników i pomiarów (analiza do 24h wstecz)." }) }),
      i18n.t('auto.nowosc_kalkulator_alkoholu_pom', { defaultValue: i18n.t('auto.nowosc_kalkulator_alkohol', { defaultValue: "Nowość: Kalkulator Alkoholu pomagający ustalić wpływ poszczególnych rodzajów alkoholu na Glikemię i dawkę insuliny." }) }),
      i18n.t('auto.poprawka_stabilizacja_polaczen', { defaultValue: i18n.t('auto.poprawka_stabilizacja_pol', { defaultValue: "Poprawka: Stabilizacja połączenia z modelem AI – wyeliminowano błędy 'initial-message' i poprawiono wydajność odpowiedzi." }) }),
      "Ulepszenie: GlikoSense generuje teraz bardziej spersonalizowane i precyzyjne dziennie raporty.",
      i18n.t('auto.optymalizacja_przyspieszono_la', { defaultValue: i18n.t('auto.optymalizacja_przyspieszo', { defaultValue: "Optymalizacja: Przyspieszono ładowanie modułów asystenta i zaktualizowano listę modeli rezerwowych." }) })
    ]
  },
  {
    version: "3.3.4",
    date: "2026-05-10",
    title: i18n.t('auto.notatnik_ladunek_glikemiczny_i', { defaultValue: i18n.t('auto.notatnik_ladunek_glikemic', { defaultValue: "Notatnik, Ładunek Glikemiczny i Inteligentniejszy GlikoSense" }) }),
    changes: [
      i18n.t('auto.nowosc_osobisty_notatnik_i_kom', { defaultValue: i18n.t('auto.nowosc_osobisty_notatnik', { defaultValue: "Nowość: Osobisty notatnik i kompendium wiedzy do szybkiego zapisywania przemyśleń." }) }),
      "Poprawienie logiki GlikoSense – trafniejsze i skuteczniejsze wnioski i alerty.",
      i18n.t('auto.dodano_wyliczanie_ladunku_glik', { defaultValue: i18n.t('auto.dodano_wyliczanie_ladunku', { defaultValue: "Dodano wyliczanie Ładunku Glikemicznego (ŁG) dla posiłków i produktów – dla jeszcze lepszej kontroli." }) })
    ]
  },
  {
    version: "3.3.3",
    date: "2026-05-09",
    title: i18n.t('auto.poprawki_wyswietlania_zaokragl', { defaultValue: i18n.t('auto.poprawki_wyswietlania_zao', { defaultValue: "Poprawki wyświetlania (Zaokrąglanie)" }) }),
    changes: [
      i18n.t('auto.poprawiono_zaokraglanie_wartos', { defaultValue: i18n.t('auto.poprawiono_zaokraglanie_w', { defaultValue: "Poprawiono zaokrąglanie wartości insuliny (bolusów, bazy) oraz jednostek na wykresie i statusie pompy, ukrywając niepotrzebne liczby po przecinku." }) })
    ]
  },
  {
    version: "3.3.2",
    date: "2026-05-09",
    title: "Poprawka API Gemini",
    changes: [
      i18n.t('auto.naprawiono_priorytetyzacje_i_z', { defaultValue: i18n.t('auto.naprawiono_priorytetyzacj', { defaultValue: "Naprawiono priorytetyzację i zapisywanie własnego klucza API Gemini." }) }),
      i18n.t('auto.poprawki_drobnych_bledow_z_ins', { defaultValue: i18n.t('auto.poprawki_drobnych_bledow', { defaultValue: "Poprawki drobnych błędów z instalacją i stabilnością." }) })
    ]
  },
  {
    version: "3.3.1",
    date: "2026-05-08",
    title: "Poprawki Instalacji (PWA)",
    changes: [
      i18n.t('auto.naprawiono_blad_z_niepoprawnym', { defaultValue: i18n.t('auto.naprawiono_blad_z_niepopr', { defaultValue: "Naprawiono błąd z niepoprawnym adresem URL przy instalacji aplikacji PWA z uciętym `/diab/`." }) }),
      "Aktualizacja silnika i drobne poprawki."
    ]
  },
  {
    version: "3.3.0",
    date: "2026-05-08",
    title: "GlikoSense 2.5 - Deep Analysis & UI",
    changes: [
      i18n.t('auto.nowy_ekskluzywny_wyglad_widget', { defaultValue: i18n.t('auto.nowy_ekskluzywny_wyglad_w', { defaultValue: "Nowy, ekskluzywny wygląd widgetu GlikoSense (Glassmorphism, dynamiczne tło, animacje predykcji)" }) }),
      i18n.t('auto.rozszerzenie_okresu_wyciagania', { defaultValue: i18n.t('auto.rozszerzenie_okresu_wycia', { defaultValue: "Rozszerzenie okresu wyciągania wniosków przez GlikoSense z 7 do 14 dni" }) }),
      i18n.t('auto.przebudowany_uklad_najwazniejs', { defaultValue: i18n.t('auto.przebudowany_uklad_najwaz', { defaultValue: "Przebudowany układ najważniejszych metryk: 'Kierunek za 1h' i 'Pewność Modelu' mają teraz wyższy priorytet" }) }),
      "Bardziej precyzyjne komunikaty algorytmu i poprawki gramatyczne",
      i18n.t('auto.nowe_ulepszone_metryki_rozklad', { defaultValue: i18n.t('auto.nowe_ulepszone_metryki_ro', { defaultValue: "Nowe, ulepszone metryki rozkładu dni (analiza dni w których cukier bywa trudniejszy)" }) })
    ]
  },
  {
    version: "3.2.0",
    date: "2026-05-05",
    title: "GlikoSense Engine 2.4 – Inteligencja Offline",
    changes: [
      i18n.t('auto.nowy_detektor_zuzytego_wklucia', { defaultValue: i18n.t('auto.nowy_detektor_zuzytego_wk', { defaultValue: "Nowy detektor zużytego wkłucia: Alert przy braku reakcji na insulinę przez 4h" }) }),
      i18n.t('auto.analiza_cyklu_dobowego_wykrywa', { defaultValue: i18n.t('auto.analiza_cyklu_dobowego_wy', { defaultValue: "Analiza cyklu dobowego: Wykrywanie zmiennej wrażliwości w ciągu dnia (Feature F)" }) }),
      i18n.t('auto.branding_glikosense_wszystkie', { defaultValue: i18n.t('auto.branding_glikosense_wszys', { defaultValue: "Branding GlikoSense: Wszystkie analizy algorytmu są teraz wyraźnie oznaczone" }) }),
      "Wersja silnika GlikoSense (v2.4.1) widoczna w ustawieniach profilu",
      i18n.t('auto.nowy_salon_gier_gliko_arcade_s', { defaultValue: i18n.t('auto.nowy_salon_gier_gliko_arc', { defaultValue: "Nowy salon gier: Gliko Arcade (Sky Higher, Zagadka Talerzy, Memory, Ogród TIR)" }) }),
      i18n.t('auto.mealplate_ux_wykres_makrosklad', { defaultValue: i18n.t('auto.mealplate_ux_wykres_makro', { defaultValue: "MealPlate UX: Wykres makroskładników (%) oraz pływający przycisk nawigacji do talerza" }) }),
      i18n.t('auto.ulepszona_predykcja_krzyzowa_z', { defaultValue: i18n.t('auto.ulepszona_predykcja_krzyz', { defaultValue: "Ulepszona predykcja krzyżowa (zjawisko brzasku i modelowanie nocne)" }) })
    ]
  },
  {
    version: "3.1.0",
    date: "2026-05-05",
    title: i18n.t('auto.aktualizacja_majowa_madry_glik', { defaultValue: i18n.t('auto.aktualizacja_majowa_madry', { defaultValue: "Aktualizacja Majowa - Mądry Gliko & UX" }) }),
    changes: [
      "Nowy interaktywny Quiz Edukacyjny dla dzieci o cukrzycy (Gliko Quiz)",
      i18n.t('auto.system_historii_zmian_changelo', { defaultValue: i18n.t('auto.system_historii_zmian_cha', { defaultValue: "System historii zmian (Changelog) dostępny w profilu" }) }),
      i18n.t('auto.wskaznik_energii_gliko_bazujac', { defaultValue: i18n.t('auto.wskaznik_energii_gliko_ba', { defaultValue: "Wskaźnik energii Gliko bazujący na Aktywnej Insulinie (IOB)" }) }),
      "Nowe animacje reakcji Gliko na poziomy cukru",
      i18n.t('auto.poprawiona_stabilnosc_bazy_dan', { defaultValue: i18n.t('auto.poprawiona_stabilnosc_baz', { defaultValue: "Poprawiona stabilność bazy danych i synchronizacji" }) }),
      i18n.t('auto.optymalizacja_interfejsu_uzytk', { defaultValue: i18n.t('auto.optymalizacja_interfejsu', { defaultValue: "Optymalizacja interfejsu użytkownika i poprawki wizualne" }) }),
      i18n.t('auto.dodano_mozliwosc_zamykania_pow', { defaultValue: i18n.t('auto.dodano_mozliwosc_zamykani', { defaultValue: "Dodano możliwość zamykania powiadomień systemowych GlikoSense" }) })
    ]
  },
  {
    version: "2.8.0",
    date: "2026-05-04",
    title: "System Personalizacji i Sklep",
    changes: [
      i18n.t('auto.wprowadzenie_sklepu_z_akcesori', { defaultValue: i18n.t('auto.wprowadzenie_sklepu_z_akc', { defaultValue: "Wprowadzenie sklepu z akcesoriami i nowymi skórkami" }) }),
      i18n.t('auto.system_misji_dziennych_i_pozio', { defaultValue: i18n.t('auto.system_misji_dziennych_i', { defaultValue: "System misji dziennych i poziomów doświadczenia XP" }) }),
      i18n.t('auto.dodano_mini_gre_celuj_w_cukier', { defaultValue: i18n.t('auto.dodano_mini_gre_celuj_w_c', { defaultValue: "Dodano mini-grę 'Celuj w Cukier'" }) }),
      i18n.t('auto.mozliwosc_zmiany_tla_pokoju_gl', { defaultValue: i18n.t('auto.mozliwosc_zmiany_tla_poko', { defaultValue: "Możliwość zmiany tła pokoju Gliko" }) })
    ]
  },
];

export const APK_VERSIONS: VersionEntry[] = [
  {
    version: "5.4.16",
    date: "2026-07-03",
    title: "Szyfrowanie bazy danych i poprawki aktualizacji",
    changes: [
      "Bezpieczeństwo: Pełne sprzętowe szyfrowanie lokalnej bazy danych SQLite dla bezpieczeństwa wrażliwych danych medycznych.",
      "Naprawa: Rozwiązano problem fałszywych komunikatów o aktualizacji OTA po świeżej instalacji aplikacji.",
      "Logika: Automatyczna migracja starej bazy poprzez bezpieczne zaciągnięcie historii z chmury Firebase."
    ]
  },
  {
    version: "5.4.13",
    date: "2026-06-30",
    title: "Optymalizacja pamięci podręcznej",
    changes: [
      "Poprawki i usunięcie błędu z pamięcią podręczną Vite (usunięto stary folder testowy) oraz wyczyszczenie przycisków telemetrii."
    ]
  },


  {
    version: "5.4.12",
    date: "2026-06-30",
    title: "Poprawki bazy produktów",
    changes: [
      "Naprawa importu mikrofonu w bazie produktów oraz weryfikacja poprawności filtrowania wyszukiwania."
    ]
  },

  {
    version: "5.4.11",
    date: "2026-06-30",
    title: "Natywny mikrofon Android",
    changes: [
      "Nowość: Oparto wyszukiwanie głosowe w 100% na usługach natywnych systemu Android w celu optymalizacji i naprawy błędu odmowy dostępu.",
      "Naprawa: Zredukowano finalny rozmiar aktualizacji OTA."
    ]
  },

  {
    version: "5.4.8",
    date: "2026-06-30",
    title: "Łatki dla mikrofonu (Android 11+)",
    changes: [
      "Nowość: Dodano regułę 'queries' do AndroidManifest, przez którą asystent głosowy ubijał aplikację.",
      "Poprawka: Downgrade wtyczki Capacitor z v7 do v6 dla uniknięcia błędów mostka Java na starszych smartfonach.",
      "Usunięcie: Całkowicie wycięto sekcję telemetrii GlikoSense z kodu, aplikacja działa teraz szybciej i uczy się w 100% lokalnie!"
    ]
  },
  {
    version: "5.4.7",
    date: "2026-06-30",
    title: "Stabilizacja pulpitu i integracja natywna",
    changes: [
      "Nowość: Eleganckie strzałki do zmiany kolejności kafelków – eliminuje zawieszanie się starszych smartfonów.",
      "Poprawka: Ponowna instalacja natywnego asystenta głosowego Google (mikrofon) wraz z zabezpieczeniem awaryjnym (fallback)."
    ]
  },
  {
    version: "5.4.6",
    date: "2026-06-30",
    title: "Naprawa mikrofonu i przeciągania na pulpicie",
    changes: [
      {
        categoryKey: "kategoria_wersja_apk_mobilna",
        icon: "Smartphone",
        colorClass: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400",
        descriptionKey: "Poprawka: Wymuszenie uprawnień do mikrofonu (WebRTC) dla GlikoChat pod Android WebView."
      },
      {
        categoryKey: "kategoria_interfejs",
        icon: "Paintbrush",
        colorClass: "bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400",
        descriptionKey: "Poprawka: Naprawa problemu z cieniem przeciąganych elementów (layout thrashing) zwieszających ekran."
      }
    ]
  },
  {
    version: "5.4.5",
    date: "2026-06-30",
    title: "Kanał Testowy Beta (OTA)",
    changes: [
      {
        categoryKey: "kategoria_aktualizacje",
        icon: "CloudCog",
        colorClass: "bg-purple-50 text-purple-500 dark:bg-purple-950/40 dark:text-purple-400",
        descriptionKey: "Nowość: Wprowadzono w ustawieniach nowy przełącznik Program testów Beta, omijający stabilne usterki."
      }
    ]
  },
  {
    version: "5.4.2",
    date: "2026-06-29",
    title: 'auto.wersja_5_4_2',
    changes: [
      {
        categoryKey: "kategoria_wersja_apk_mobilna",
        icon: "Smartphone",
        colorClass: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400",
        descriptionKey: "auto.natywny_silnik_rozpoznawania_mowy"
      },
      {
        categoryKey: "kategoria_aktualizacje",
        icon: "CloudCog",
        colorClass: "bg-purple-50 text-purple-500 dark:bg-purple-950/40 dark:text-purple-400",
        descriptionKey: "auto.poprawki_plynnosci_przesuwania_widzetow"
      }
    ]
  },
  {
    version: "5.4.0",
    date: "2026-06-29",
    title: 'auto.wersja_5_4_0',
    changes: [
      {
        categoryKey: "kategoria_aktualizacje",
        icon: "CloudCog",
        colorClass: "bg-purple-50 text-purple-500 dark:bg-purple-950/40 dark:text-purple-400",
        descriptionKey: "auto.nowy_silnik_ota"
      },
      {
        categoryKey: "kategoria_wersja_apk_mobilna",
        icon: "Smartphone",
        colorClass: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400",
        descriptionKey: "auto.poprawki_asystenta_glosowego"
      }
    ]
  },
  {
    version: "5.3.9",
    date: "2026-06-29",
    title: 'changelog.v539_title',
    changes: [
      {
        categoryKey: "kategoria_aktualizacje",
        icon: "CloudCog",
        colorClass: "bg-purple-50 text-purple-500 dark:bg-purple-950/40 dark:text-purple-400",
        descriptionKey: "changelog.v539_apk_change_1"
      }
    ]
  },
  {
    version: "5.3.8",
    date: "2026-06-29",
    title: 'Pełna automatyzacja aktualizacji i powiadomień',
    changes: [
      {
        categoryKey: "kategoria_aktualizacje",
        icon: "CloudCog",
        colorClass: "bg-purple-50 text-purple-500 dark:bg-purple-950/40 dark:text-purple-400",
        descriptionKey: "Rozwiązano błędy z zapętlaniem i ignorowaniem okienka OTA, wdrożono stałą paczkę 'aktualizacja'."
      }
    ]
  },
  {
    version: "5.3.7",
    date: "2026-06-29",
    title: 'Zmiana kolorystyki i nowy system OTA',
    changes: [
      {
        categoryKey: "kategoria_aktualizacje",
        icon: "CloudCog",
        colorClass: "bg-purple-50 text-purple-500 dark:bg-purple-950/40 dark:text-purple-400",
        descriptionKey: "Nowy, w pełni automatyczny system dystrybucji OTA przez GitHub Actions"
      },
      {
        categoryKey: "kategoria_interfejs",
        icon: "Paintbrush",
        colorClass: "bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400",
        descriptionKey: "Poprawka kolorystyki widgetów: Sensor -> Violet, Wkłucie -> Cyan"
      }
    ]
  },
  {
    version: "5.3.5",
    date: "2026-06-25",
    title: 'auto.co_nowego_w_wersji_5_3_5',
    changes: [
      {
        categoryKey: "kategoria_aktualizacje",
        icon: "CloudCog",
        colorClass: "bg-purple-50 text-purple-500 dark:bg-purple-950/40 dark:text-purple-400",
        descriptionKey: "auto.nowosc_ota_system"
      },
      {
        categoryKey: "kategoria_wersja_apk_mobilna",
        icon: "Smartphone",
        colorClass: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400",
        descriptionKey: "auto.naprawa_mechanizmu_apk"
      },
      {
        categoryKey: "kategoria_wersja_apk_mobilna",
        icon: "Smartphone",
        colorClass: "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400",
        descriptionKey: "auto.naprawa_przycisk_apk"
      },
      {
        categoryKey: "kategoria_aktualizacje",
        icon: "Wrench",
        colorClass: "bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400",
        descriptionKey: "auto.ulepszenie_wersje_ujednolicone"
      }
    ]
  },
  {
    version: "5.3.2",
    date: "2026-06-16",
    title: "Poprawka GlikoSense i Alarmów",
    changes: [
      i18n.t('auto.naprawa_glikosense_android', { defaultValue: "Naprawa działania GlikoSense na urządzeniach Android (wymuszenie CPU)." }),
      i18n.t('auto.naprawa_dzwiekow_alarmu', { defaultValue: "Przywrócenie dźwięków wbudowanego alarmu (critical_alarm.wav)." }),
      i18n.t('auto.poprawka_paska_statusu_w_oknach', { defaultValue: "Korekty interfejsu (Safe Area) uodparniające okna modalne na nachodzący pasek baterii telefonu." })
    ]
  },
  {
    version: "5.3.1",
    date: "2026-06-10",
    title: "Wsparcie dla Android Auto",
    changes: [
      i18n.t('auto.usluga_w_tle_komunikacja_natyw', { defaultValue: i18n.t('auto.usluga_w_tle_komunikacja', { defaultValue: "Usługa w tle: Komunikacja natywna z pulpitem deski rozdzielczej Android Auto (wymaga Trybu Programisty)." }) }),
      i18n.t('auto.usprawnienie_nowa_nazwa_wyjsci', { defaultValue: i18n.t('auto.usprawnienie_nowa_nazwa_w', { defaultValue: "Usprawnienie: Nowa nazwa wyjściowa kompilatora (GlikoControl.apk)." }) })
    ]
  },
  {
    version: "1.5.7",
    date: "2026-06-08",
    title: "Gliko Family: Zdalne Komunikaty",
    changes: [
      i18n.t('auto.nowosc_pelnoekranowe_powiadomi', { defaultValue: i18n.t('auto.nowosc_pelnoekranowe_powi', { defaultValue: "Nowość: Pełnoekranowe powiadomienia (Gliko Family) wysyłane ze sparowanych urządzeń" }) }),
      i18n.t('auto.nowosc_potwierdzanie_zrozumien', { defaultValue: i18n.t('auto.nowosc_potwierdzanie_zroz', { defaultValue: "Nowość: Potwierdzanie zrozumienia ważnych komunikatów na drugim ekranie" }) }),
      "Poprawka: Nowa, bardzo elegancka i subtelna animacja po instalacji aktualizacji"
    ]
  },
  {
    version: "1.5.6",
    date: "2026-06-08",
    title: "Aktualizacja 1.5.6",
    changes: [
      i18n.t('auto.poprawka_pobierania_paczek_ota', { defaultValue: i18n.t('auto.poprawka_pobierania_pacze', { defaultValue: "Poprawka pobierania paczek OTA: Przejście na nowy format kompresji" }) }),
      "Dodano systemowe uprawnienie stanu sieci dla pobierania w tle",
      i18n.t('auto.naprawiono_bledny_adres_pobier', { defaultValue: i18n.t('auto.naprawiono_bledny_adres_p', { defaultValue: "Naprawiono błędny adres pobierania pliku APK w wersji PWA" }) })
    ]
  },
  {
    version: "1.5.2",
    date: "2026-06-08",
    title: "Patch 1.5.2",
    changes: [
      i18n.t('auto.hotfix_naprawiono_blad_wyswiet', { defaultValue: i18n.t('auto.hotfix_naprawiono_blad_wy', { defaultValue: "Hotfix: Naprawiono błąd wyświetlania zakładki System (brakujący import ikonki)" }) })
    ]
  },
  {
    version: "1.5.1",
    date: "2026-06-08",
    title: "Aktualizacja 1.5.1",
    changes: [
      "Test aktualizacji OTA (Over-The-Air)",
      i18n.t('auto.poprawka_migajacej_listy_urzad', { defaultValue: i18n.t('auto.poprawka_migajacej_listy', { defaultValue: "Poprawka migającej listy urządzeń WebSocket" }) }),
      i18n.t('auto.dodano_przycisk_do_recznego_wy', { defaultValue: i18n.t('auto.dodano_przycisk_do_reczne', { defaultValue: "Dodano przycisk do ręcznego wymuszania aktualizacji" }) }),
      i18n.t('auto.oznaczenie_wlasnego_urzadzenia', { defaultValue: i18n.t('auto.oznaczenie_wlasnego_urzad', { defaultValue: "Oznaczenie własnego urządzenia '(Ty)' na liście pokoju" }) })
    ]
  },
  {
    version: "1.0.0",
    date: "2026-04-15",
    title: "Start aplikacji GlikoControl",
    changes: [
      "Podstawowy system opieki nad wirtualnym przyjacielem",
      i18n.t('auto.integracja_z_logami_glukozy_i', { defaultValue: i18n.t('auto.integracja_z_logami_gluko', { defaultValue: "Integracja z logami glukozy i posiłków" }) }),
      i18n.t('auto.system_powiadomien_o_niskim_i', { defaultValue: i18n.t('auto.system_powiadomien_o_nisk', { defaultValue: "System powiadomień o niskim i wysokim cukrze" }) })
    ]
  }
];






