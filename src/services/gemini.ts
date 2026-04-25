import { GoogleGenAI } from "@google/genai";

let apiKey = "";
try {
  if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
    apiKey = process.env.GEMINI_API_KEY;
  } else if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_GEMINI_API_KEY) {
    apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
  }
} catch (e) {
  // ignore
}

// Wyciszamy tymczasowo brak klucza by nie psuć buildu
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const geminiService = {
  async generateContent(prompt: string, imageData?: string) {
    if (!genAI) throw new Error("Brak klucza VITE_GEMINI_API_KEY w konfiguracji.");
    
    try {
      const model = 'gemini-3-flash-preview';
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

      const result = await genAI.models.generateContent({
        model: model,
        contents: contents
      });
      return result.text || "";
    } catch (error) {
      console.error("Gemini API Error:", error);
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
  }
};
