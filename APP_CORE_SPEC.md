# GlikoControl - Specyfikacja Istoty Aplikacji (Core Specification)

## Cel Aplikacji
GlikoControl to zaawansowany asystent dla osób z cukrzycą typu 1, który łączy dane medyczne z Nightscout z analizą wizualną jedzenia przez AI (Gemini). Aplikacja ma na celu precyzyjne wyliczanie dawek insuliny i analizę trendów.

## Kluczowe Funkcje (Features)
1. **Integracja Nightscout:** Pobieranie danych CGM (ciągły monitoring glikemii) w czasie rzeczywistym.
2. **AI Food Scanner (Gemini):** Rozpoznawanie jedzenia na zdjęciach, szacowanie gramatury, węglowodanów (WW), białek i tłuszczów (WBT).
3. **Kalkulator Bolusa:** Zaawansowana matematyka przeliczania insuliny na posiłek oraz korekty (uwzględnia wrażliwość na insulinę, przelicznik węglowodanowy i aktualny poziom cukru).
4. **Baza Danych Posiłków:** Synchronizacja z Firebase Firestore (posiłki własne i społecznościowe).
5. **Analiza Profili:** Raporty AI analizujące zmienność glikemii i sugerujące zmiany w ustawieniach bazy lub przeliczników.

## Model Danych (Data Models)
- **Profile:** (insulinSensitivity, carbRatio, targetGlucose, isfHours, nightscoutUrl).
- **Meal:** (timestamp, foodsList, totalCarbs, totalCalories, bolusSuggested, photoUrl, authorUid).
- **GlucoseReading:** (value, trend, timestamp).

## Kluczowe Algorytmy (Business Logic)
- **Instrukcja dla AI (Prompting):** Gemini musi zwracać dane o jedzeniu w formacie JSON (name, carbs_per_100g, weight, fats, proteins).
- **Matematyka Bolusa:**
  `Bolus = (Węglowodany / CarbRatio) + ((AktualnyCukier - DocelowyCukier) / ISF)`

## Stos Technologiczny (Tech Stack)
- **Frontend (obecnie):** React + Tailwind (szukamy odpowiedników w Jetpack Compose).
- **Backend:** Firebase (Auth, Firestore, Storage).
- **AI:** Google Generative AI (Gemini Flash).

## Uwagi dla Android AI (System Instructions for Kotlin)
- Używaj **Jetpack Compose** dla nowoczesnego UI.
- Implementuj **Repository Pattern** dla danych z Firebase i Nightscout.
- Wykorzystaj **Hilt/Koin** do wstrzykiwania zależności.
- Zadbaj o **Material 3 Design** z motywem medycznym (czytelne wykresy).
