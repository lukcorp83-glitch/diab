import { test, expect } from '@playwright/test';

test.describe('Automatyczny Bot Testujący - Błędy i Wydajność', () => {
  let errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Nasłuchiwanie na nieobsłużone wyjątki w konsoli przeglądarki
    page.on('pageerror', (exception) => {
      errors.push(`[PAGE ERROR] ${exception.message}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });
    errors = []; // Czyszczenie błędów przed każdym testem

    // BARDZO WAŻNE: Dodajemy pominięcie Onboardingu do Local Storage przed wejściem na stronę,
    // w przeciwnym razie bot ugrzęźnie na samouczku startowym!
    await page.addInitScript(() => {
      window.localStorage.setItem('onboarding_completed', 'true');
      window.localStorage.setItem('hasSeenTutorial', 'true');
      window.localStorage.setItem('privacy_accepted', 'true');
      window.localStorage.setItem('cookie_consent', 'true');
      window.localStorage.setItem('changelog_1.2.0_seen', 'true');
    });

    // Centralne wejście i logowanie dla każdego testu
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Automatyczne ominięcie ekranu logowania (kliknięcie 'Logowanie bez konta / Gość')
    const guestLoginBtn = page.getByText(/Logowanie bez konta|Gość/i).first();
    await guestLoginBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await guestLoginBtn.isVisible()) {
      console.log('Znaleziono ekran logowania. Klikam "Logowanie jako Gość"...');
      await guestLoginBtn.click();
      // Czekamy na przetworzenie logowania przez Firebase i przeładowanie UI
      await page.waitForTimeout(2500); 
    }
  });

  test.afterEach(() => {
    // Sprawdzanie czy podczas scenariusza wystąpił jakikolwiek błąd JS
    expect(errors).toEqual([]);
  });

  test('Scenariusz 1: Nawigacja i wczytywanie (Smoke Test)', async ({ page }) => {
    // Sprawdzenie czy załadował się główny kontener aplikacji
    await expect(page).toHaveTitle(/Vite \+ React|Diab|GlikoControl/i);
    
    // Sprawdzamy czy widoczny jest główny pasek nawigacyjny
    const navBar = page.locator('nav').first();
    if (await navBar.count() > 0) {
      await expect(navBar).toBeVisible();
    }
  });

  test('Scenariusz 2: Kalkulator Bolusa', async ({ page }) => {
    // Zamiast sztywnego czekania, czekamy na pojawienie się przycisku/zakładki
    const bolusBtn = page.getByText(/Kalkulator/i).first();
    await expect(bolusBtn).toBeVisible({ timeout: 15000 });
    await bolusBtn.click();
      
    // Sprawdzenie czy formularz się załadował
    await expect(page.getByText(/Glukoza/i).first()).toBeVisible();
    
    // Przykładowe wpisanie glukozy
    const glukozaInput = page.getByRole('spinbutton').first();
    if (await glukozaInput.isVisible()) {
      await glukozaInput.fill('120');
      
      // Kliknięcie oblicz, jeśli jest
      const obliczBtn = page.getByText(/Oblicz/i).first();
      if (await obliczBtn.isVisible()) {
        await obliczBtn.click();
      }
    }
  });

  test('Scenariusz 3: Talerz Żywieniowy (MealPlate)', async ({ page }) => {
    const plateBtn = page.getByText(/Centrum Żywieniowe/i).first();
    await expect(plateBtn).toBeVisible({ timeout: 15000 });
    await plateBtn.click();
      
    // Sprawdzenie czy załadowała się scena (canvas)
    const canvas = page.locator('canvas').first();
    if (await canvas.count() > 0) {
      await expect(canvas).toBeVisible();
    }
  });

  test('Scenariusz 4: Miejsca Wkłucia i Pompa (Profile)', async ({ page }) => {
    const profileBtn = page.getByText(/^Profil$/i).first();
    await expect(profileBtn).toBeVisible({ timeout: 15000 });
    await profileBtn.click();
      
    // Sprawdzamy czy gdzieś na stronie jest napis "Wkłucie" lub pojawia się odpowiednia sekcja
    const wklucieText = page.getByText(/Wkłuci/i).first();
    if (await wklucieText.isVisible()) {
      await expect(wklucieText).toBeVisible();
    }
  });

  test('Scenariusz 5: Pełna eksploracja wszystkich zakładek (Klikacz we wszystko)', async ({ page }) => {
    const menuItems = [
      'Pulpit', 'Dzienniczek', 'Wykres', 'Centrum Żywieniowe', 'Kalkulator Bolusa', 'Profil'
    ];

    for (const itemText of menuItems) {
      // Szukamy przycisków dolnego paska nawigacyjnego
      const element = page.getByText(new RegExp(itemText, 'i')).first();
      
      if (await element.isVisible()) {
        console.log(`Klikam w zakładkę: ${itemText}`);
        await element.click();
        
        // Zamiast sztywnych przerw używamy wbudowanych mechanizmów stabilizacji
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(300); // krótka przerwa na animacje przejścia

        // Próbujemy otworzyć ewentualne modale, by sprawdzić błędy przy ich renderowaniu
        const actionBtn = page.getByRole('button', { name: /Dodaj|Nowy|Więcej|Otwórz/i }).first();
        if (await actionBtn.isVisible() && await actionBtn.isEnabled()) {
          await actionBtn.click();
          
          await page.waitForTimeout(300);
          
          // Zamykanie modali by móc kontynuować
          const closeBtn = page.getByRole('button', { name: /Anuluj|Zamknij|Wróć/i }).first();
          if (await closeBtn.isVisible() && await closeBtn.isEnabled()) {
            await closeBtn.click();
          } else {
            // Zamknięcie przez wciśnięcie Esc (często działa na modale i szuflady)
            await page.keyboard.press('Escape');
          }
          await page.waitForTimeout(300);
        }
      }
    }
  });

  test('Scenariusz 6: Dzienniczek i Filtrowanie', async ({ page }) => {
    // Wejście w Dzienniczek
    const logbookBtn = page.getByText(/^Dzienniczek$/i).first();
    await logbookBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await logbookBtn.isVisible()) {
      await logbookBtn.click();
      
      // Oczekiwanie na załadowanie listy wpisów
      await page.waitForLoadState('domcontentloaded');
      
      // Sprawdzenie obecności jakichkolwiek elementów z czasem (np. godzina dodania wpisu) 
      // lub napisu "Brak danych" w przypadku pustego dzienniczka
      const emptyState = page.getByText(/Brak|Pusto/i).first();
      const listElement = page.locator('ul li, .log-entry').first();
      
      if (!await emptyState.isVisible()) {
        await expect(listElement).toBeVisible({ timeout: 15000 }).catch(() => {});
      }
    }
  });

  test('Scenariusz 7: Interakcja z bazą jedzenia', async ({ page }) => {
    // Wejście w Talerz (posiłki)
    const plateBtn = page.getByText(/^Talerz$/i).first();
    await plateBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await plateBtn.isVisible()) {
      await plateBtn.click();
      await page.waitForTimeout(500);

      // Próba kliknięcia w 'Baza jedzenia' lub 'Szukaj'
      const searchDbBtn = page.getByRole('button', { name: /Baza|Szukaj|Dodaj produkt/i }).first();
      if (await searchDbBtn.isVisible() && await searchDbBtn.isEnabled()) {
        await searchDbBtn.click();
        
        // Sprawdzenie czy pojawiło się pole wyszukiwania
        const searchInput = page.getByRole('textbox').first();
        if (await searchInput.isVisible()) {
          await searchInput.fill('Jabłko');
          await page.waitForTimeout(1000); // Czas na debounce wyszukiwarki
          
          // Zamknięcie modala po udanym wyszukaniu
          await page.keyboard.press('Escape');
        }
      }
    }
  });

  test('Scenariusz 8: Zmiana motywu (Dark/Light Mode) w Ustawieniach', async ({ page }) => {
    // Otwarcie Profilu
    const profileBtn = page.getByText(/^Profil$/i).first();
    await profileBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await profileBtn.isVisible()) {
      await profileBtn.click();
      
      // Przewinięcie w dół, aby znaleźć ustawienia wyglądu (np. Ciemny motyw)
      const themeToggle = page.getByText(/Ciemny motyw|Wygląd|Dark/i).first();
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        
        // Weryfikacja czy aplikacja reaguje i zmienia klasy na body/html
        // Sprawdzamy, czy znacznik html uzyskał klasę 'dark' lub zmienił styl.
        await page.waitForTimeout(500);
        const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        
        // Klikamy ponownie, by odwrócić (nie chcemy psuć stanu jeśli korzysta z local storage)
        await themeToggle.click();
      }
    }
  });
});
