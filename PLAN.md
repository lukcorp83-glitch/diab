# Odbudowa GlikoControl na React

Zadanie polega na migracji aplikacji "GlikoControl" z pojedynczego pliku HTML/JS na nowoczesny stos technologiczny:
- React 19 + TypeScript
- Tailwind CSS v4
- Firebase (Auth + Firestore)
- Integracja Gemini AI przez oficjalny SDK (@google/genai)
- Wykorzystanie Motion do animacji
- Obsługa Nightscout

## Plan krok po kroku:
1. Konfiguracja Firebase (użycie dostarczonych kluczy w .env).
2. Przygotowanie struktury komponentów (Pulpit, Baza, Talerz, Raporty, Profil).
3. Implementacja logiki wykresu (Canvas lub Recharts - preferowany Canvas dla spójności z oryginałem).
4. Przeniesienie logiki kalkulatora bolusa.
5. Integracja AI Gemini do analizy raportów.
6. Dodanie obsługi skanera kodów QR (html5-qrcode).
7. Stylizacja zgodnie z oryginałem (Glassmorphism, Dark mode).
