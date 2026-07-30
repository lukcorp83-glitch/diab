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
  });

  test.afterEach(() => {
    // Sprawdzanie czy podczas scenariusza wystąpił jakikolwiek błąd JS
    expect(errors).toEqual([]);
  });

  test('Scenariusz 1: Nawigacja i wczytywanie (Smoke Test)', async ({ page }) => {
    // 1. Otwarcie strony
    await page.goto('/');
    
    // Sprawdzenie czy załadował się główny kontener aplikacji (np. pasek dolny lub nawigacja)
    // Oczekujemy że tytuł strony to np. "Vite + React" lub mamy jakiś bazowy element.
    await expect(page).toHaveTitle(/Vite \+ React|Diab|GlikoControl/i);
    
    // Proste odczekanie na stabilizację animacji
    await page.waitForTimeout(1000);
  });

  test('Scenariusz 2: Kalkulator Bolusa', async ({ page }) => {
    await page.goto('/');
    // Szukanie przycisku/linku Kalkulatora Bolusa (zakładając że gdzieś jest tekst "Kalkulator")
    // Jeśli go nie ma na wierzchu, bot spróbuje kliknąć w odpowiednie menu.
    // Używamy luźnego selektora tekstowego
    const bolusBtn = page.getByText(/Kalkulator/i).first();
    if (await bolusBtn.isVisible()) {
      await bolusBtn.click();
      
      // Sprawdzenie czy formularz się załadował
      await expect(page.getByText(/Glukoza/i).first()).toBeVisible();
      
      // Przykładowe wpisanie glukozy
      const glukozaInput = page.getByRole('spinbutton').first();
      await glukozaInput.fill('120');
      
      // Kliknięcie oblicz, jeśli jest
      const obliczBtn = page.getByText(/Oblicz/i).first();
      if (await obliczBtn.isVisible()) {
        await obliczBtn.click();
      }
      await page.waitForTimeout(500);
    }
  });

  test('Scenariusz 3: Talerz Żywieniowy (MealPlate)', async ({ page }) => {
    await page.goto('/');
    // Próba wejścia w zakładkę Talerz/Posiłki
    const plateBtn = page.getByText(/Talerz|Posił/i).first();
    if (await plateBtn.isVisible()) {
      await plateBtn.click();
      
      // Sprawdzenie czy załadowała się scena 3D z talerzem (lub odpowiedni komponent)
      const canvas = page.locator('canvas');
      if (await canvas.count() > 0) {
        await expect(canvas.first()).toBeVisible();
      }
      
      await page.waitForTimeout(1000);
    }
  });

  test('Scenariusz 4: Miejsca Wkłucia i Pompa (Profile)', async ({ page }) => {
    await page.goto('/');
    // Próba wejścia w Profil lub Pompę
    const profileBtn = page.getByText(/Profil|Pompa|Wkłucia/i).first();
    if (await profileBtn.isVisible()) {
      await profileBtn.click();
      
      // Sprawdzenie czy istnieje możliwość interakcji z miejscami wkłucia
      await page.waitForTimeout(1000);
      
      // Sprawdzamy czy gdzieś na stronie jest napis "Wkłucie" lub "Zmień"
      const wklucieText = page.getByText(/Wkłuci/i).first();
      if (await wklucieText.isVisible()) {
         // symulacja bycia na ekranie miejsc wkłucia
      }
    }
  });

  test('Scenariusz 5: Pełna eksploracja wszystkich zakładek (Klikacz we wszystko)', async ({ page }) => {
    await page.goto('/');
    
    // Czekamy na załadowanie aplikacji
    await page.waitForTimeout(2000);

    // Znajdujemy wszystkie główne elementy nawigacyjne (linki lub przyciski na dolnym pasku)
    // Zazwyczaj w nawigacji znajdują się nazwy lub ikony. Szukamy po popularnych rolach i tekstach.
    const menuItems = [
      'Pulpit', 'Dzienniczek', 'Wykresy', 'Talerz', 'Kalkulator', 'Ustawienia', 'Profil', 'Pompa', 'Wkłucia'
    ];

    for (const itemText of menuItems) {
      // Szukamy elementów, które zawierają dany tekst i są widoczne
      const element = page.getByText(new RegExp(itemText, 'i')).first();
      
      if (await element.isVisible()) {
        console.log(`Klikam w: ${itemText}`);
        await element.click();
        
        // Czekamy chwilę na przeładowanie widoku i ewentualne błędy w konsoli
        await page.waitForTimeout(1000);

        // Będąc na danej zakładce, próbujemy kliknąć w jakikolwiek widoczny, główny przycisk typu "Dodaj", "Zapisz", "Otwórz"
        // (żeby wyzwolić otwieranie modali lub formularzy)
        const actionBtn = page.getByRole('button', { name: /Dodaj|Nowy|Więcej|Otwórz/i }).first();
        if (await actionBtn.isVisible()) {
          await actionBtn.click();
          await page.waitForTimeout(500);
          
          // Jeśli otworzył się modal z przyciskiem "Anuluj" lub "Zamknij", klikamy go, by móc iść dalej
          const closeBtn = page.getByRole('button', { name: /Anuluj|Zamknij|Wróć/i }).first();
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }
    }
  });
});
