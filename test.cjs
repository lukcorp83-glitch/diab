const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/');
  try {
    await page.waitForSelector('label[for="pizzaMode"]', { timeout: 10000 });
    
    // Evaluate to type carbs
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="number"]');
      inputs[1].value = '11';
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Check dose
    const doseText = await page.evaluate(() => document.querySelector('input.text-5xl').value);
    console.log("Calculated dose with carbs=11:", doseText);
    
    // Click button
    await page.evaluate(() => document.querySelector('button.bg-accent-600').click());
    console.log("Clicked button. Waiting to see if anything happens...");
    await new Promise(r => setTimeout(r, 2000));
    
    // Check if error toast exists
    const hasError = await page.evaluate(() => document.body.innerHTML.includes('Uzupełnij przynajmniej jedno pole'));
    console.log("Has error toast:", hasError);
    
    const url = await page.url();
    console.log("Current URL:", url);
  } catch (e) {
    console.log("Failed:", e);
  }
  await browser.close();
})();
