import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getApiKey(): string | null {
  // First check localStorage
  let key = localStorage.getItem('gemini_api_key');
  if (key) return key;

  // Then check env variables (Vite build)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_GEMINI_API_KEY) {
      key = (import.meta as any).env.VITE_GEMINI_API_KEY;
    }
  } catch (e) {
    // Ignore
  }

  // Fallback check process.env if available
  if (!key) {
    try {
      if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
        key = process.env.GEMINI_API_KEY;
      }
    } catch (e) {
      // Ignore
    }
  }

  return key || null;
}

function getClient(): GoogleGenAI {
  const key = getApiKey();
  if (!key) {
    const userInput = window.prompt("Do korzystania ze sztucznej inteligencji wymagany jest klucz API Gemini (Google). Skopiuj swój darmowy klucz ze strony Google AI Studio i wklej go tutaj:");
    if (userInput && userInput.trim() !== '') {
      localStorage.setItem('gemini_api_key', userInput.trim());
      genAI = new GoogleGenAI({ apiKey: userInput.trim() });
      return genAI;
    }
    throw new Error("Brak klucza API. Nie można wywołać analizy AI.");
  }
  
  if (!genAI) {
     genAI = new GoogleGenAI({ apiKey: key });
  }
  return genAI;
}

export const geminiService = {
  async generateContent(prompt: string, imageData?: string) {
    try {
      const client = getClient();
      const model = 'gemini-3-flash-preview'; // or gemini-1.5-flash depending on support

      let contents;
      
      if (imageData) {
        contents = [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: imageData.split(',')[1] || imageData,
                  mimeType: "image/jpeg"
                }
              }
            ]
          }
        ];
      } else {
        contents = [{ role: 'user', parts: [{ text: prompt }] }];
      }

      const result = await client.models.generateContent({
        model: model,
        contents: contents
      });

      return result.text || "";
    } catch (error) {
      console.error("Gemini API Error:", error);
      
      // If error is about invalid key, clear local storage so user is prompted again
      if (error instanceof Error && (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID"))) {
         localStorage.removeItem('gemini_api_key');
         genAI = null;
         alert("Podany klucz API Gemini jest nieprawidłowy. Odśwież stronę i podaj poprawny klucz.");
      }
      
      throw error;
    }
  },
  
  async getLivePrediction(recentLogs: any[]) {
    const prompt = `Jesteś asystentem diabetyka. Przeanalizuj poniższe logi z ostatnich 2 godzin (najnowsze u góry): ${JSON.stringify(recentLogs)}. Zwróć odpowiedź w 3 krótkich punktach używając HTML (<b>, <ul>, <li>): 1. Sytuacja aktualna (oceń czy glikemia jest w normie, spada, rośnie, z czego to wynika). 2. Przewidywania (co może się stać przez najbliższe 2 godziny). 3. Zalecenie działania (np. podaj korektę, zjedz coś na podbicie, obserwuj). Zwięźle, naturalnie, po polsku. Bez znaków markdown typu gwiazdki.`;
    return this.generateContent(prompt);
  },

  async getPeriodAnalysis(period: 'week' | 'month', logs: any[]) {
    const days = period === 'week' ? 7 : 30;
    const periodName = period === 'week' ? 'Tygodniowy' : 'Miesięczny';
    const prompt = `Jesteś ekspertem diabetologii systemu GlikoControl. Przeanalizuj logi z ostatnich ${days} dni: ${JSON.stringify(logs)}. 
    Stwórz ${periodName} Raport Postępów.
    Struktura raportu (używaj HTML: <b>, <ul>, <li>, <br>):
    1. <b>Podsumowanie Okresu</b> (ogólny stan, średni cukier).
    2. <b>Największe Wyzwania</b> (momenty dnia z największymi wahaniami).
    3. <b>Pozytywne Trendy</b> (co udało się poprawić).
    4. <b>Cele na Kolejny Okres</b> (konkretne wskazówki).
    Pisz merytorycznie, po polsku, bez formatowania markdown (gwiazdek).`;
    return this.generateContent(prompt);
  },

  async getMasterAnalysis(logs: any[]) {
    const prompt = `Jesteś zaawansowanym systemem analizy cukrzycy GlikoControl. Przeanalizuj WSZYSTKIE dostępne dane: ${JSON.stringify(logs)}. 
    Twoim zadaniem jest stworzenie JEDNEGO, KOMPLEKSOWEGO RAPORTU eksperckiego.
    Struktura raportu (używaj HTML: <b>, <ul>, <li>, <br>):
    1. <b>Krótki przegląd obecnej sytuacji</b> (ostatnie wpisy).
    2. <b>Analiza trendów i wzorców</b> (kiedy cukier skacze, dlaczego, czy bolusy są trafne).
    3. <b>Ocena długoterminowa</b> (przewidywane HbA1c, czas w zakresie).
    4. <b>Konkretne rekomendacje</b> (co poprawić w diecie, dawkowaniu lub aktywności).
    Zwracaj uwagę na: nocne hipoglikemie, skoki po posiłkach, efektywność insuliny. 
    Pisz zwięźle, konkretnie, po polsku. Bez formatowania markdown (gwiazdek (**) ani (###)).`;
    return this.generateContent(prompt);
  },

  async analyzeMeal(imageData: string) {
    const prompt = `Przeanalizuj to zdjęcie posiłku. Wykryj składniki i oszacuj orientacyjną wagę, ilość węglowodanów (g), białek (g) i tłuszczy (g). 
    Zwróć odpowiedź w formacie JSON (tylko czysty JSON, bez markdown):
    {
      "mealName": "nazwa posiłku",
      "carbs": 0,
      "protein": 0,
      "fat": 0,
      "description": "krótki opis składników"
    }`;

    try {
      const text = await this.generateContent(prompt, imageData);
      // Clean possible markdown backticks
      const cleanJson = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Gemini Vision Error:", error);
      throw error;
    }
  },

  async getBolusRecommendation(currentBg: number, currentCarbs: number, calculatedDose: number, trend: string, iob: number, recentLogs: any[]) {
    const prompt = `Jesteś ekspertem diabetologii systemu GlikoControl.
    Zadanie: Przeanalizuj obecną sytuację pacjenta i oceń, czy sugerowana przez kalkulator dawka insuliny (${calculatedDose.toFixed(2)} j.) jest optymalna.

    Sytuacja obecna:
    - Glukoza: ${currentBg} mg/dL
    - Posiłek: ${currentCarbs} g węglowodanów
    - Trend: ${trend}
    - Aktywna insulina (IOB): ${iob.toFixed(2)} j.
    - Dawka wyliczona z kalkulatora (matematycznie): ${calculatedDose.toFixed(2)} j.

    Najnowsze logi z historii (do analizy reakcji na poprzednie posiłki/bolusy): 
    ${JSON.stringify(recentLogs.slice(0, 15))}

    Przeanalizuj historię pod kątem Time In Range (TIR) - czy pacjent nie wpada po bolusach często w hipo/hiperglikemię. Zwróć wynik jako JSON (czysty JSON bez markdownu):
    {
      "recommendedDose": number,
      "reasoning": "Krótkie uzasadnienie po polsku (max 2 zdania)",
      "confidence": "high" | "medium" | "low"
    }
    
    Zaproponuj ewentualną korektę (np. lekkie zmniejszenie jeśli pacjent miał hipo w ostatnich godzinach). Jeśli wyliczona dawka jest dobra, zwróć ją bez zmian.`;

    try {
      const text = await this.generateContent(prompt);
      const cleanJson = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Gemini Bolus Rec Error:", error);
      return null;
    }
  }
};
