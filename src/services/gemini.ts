import { GoogleGenAI } from "@google/genai";

import { auth } from '../lib/firebase';

let genAI: GoogleGenAI | null = null;

function getApiKey(): { key: string, baseUrl?: string } {
  // First check env variables (Vite build)
  let key = import.meta.env.VITE_GEMINI_API_KEY;
  let baseUrl = import.meta.env.VITE_GEMINI_BASE_URL;

  // Then check localStorage as fallback
  if (!key) {
    let rawValue = localStorage.getItem('gemini_api_key');
    if (rawValue) {
      if (rawValue.includes('|')) {
        const parts = rawValue.split('|');
        key = parts[0].trim();
        baseUrl = parts[1]?.trim();
      } else {
        key = rawValue.trim();
      }
    }
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

  // Fallback to Cloudflare AI Gateway/Worker if no key is provided
  if (!key) {
    return {
      key: "proxy", // SDK requires a non-empty string
      baseUrl: "https://diacontrol-ai.pixelozapolska.workers.dev"
    };
  }

  return { key, baseUrl };
}

function getClient(): GoogleGenAI {
  const credentials = getApiKey();
  
  if (!genAI) {
     genAI = new GoogleGenAI({ 
       apiKey: credentials.key,
       ...(credentials.baseUrl ? { baseUrl: credentials.baseUrl } : {})
     });
  }
  return genAI;
}

export const geminiService = {
  async generateContent(prompt: string, imageData?: string) {
    const creds = getApiKey();
    const isProxyUrl = creds.baseUrl === "https://diacontrol-ai.pixelozapolska.workers.dev";
    
    // Prefer pro models for images/vision, flash for text (faster)
    const modelsToTry = imageData 
      ? ['gemini-3.1-pro', 'gemini-3-flash', 'gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-2.5-flash', 'gemini-1.5-flash']
      : ['gemini-3-flash', 'gemini-2.0-flash', 'gemini-3.1-pro', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'];

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

    if (isProxyUrl && !localStorage.getItem('gemini_api_key')) {
      const CLOUDFLARE_WORKER_URL = creds.baseUrl;
      let lastError = null;
      
      const payload = { 
        contents,
        uid: auth.currentUser?.uid || 'anonymous'
      };

      for (const model of modelsToTry) {
          try {
              console.log(`Próba użycia modelu (Proxy): ${model}...`);
              const response = await fetch(CLOUDFLARE_WORKER_URL!, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      model: model, 
                      payload: payload
                  })
              });
              
              const data = await response.json();

              if (response.ok) {
                  console.log(`Sukces z modelem (Proxy): ${model}`);
                  if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                      return data.candidates[0].content.parts.map((p: any) => p.text).join('') || "";
                  } else if (data.text) {
                      return data.text;
                  }
                  
                  return typeof data === 'string' ? data : JSON.stringify(data);
              }
              
              throw new Error(data.error?.message || `Błąd modelu ${model}`);
              
          } catch (error) {
              lastError = error;
              await new Promise(resolve => setTimeout(resolve, 1000));
              console.warn(`Model ${model} zawiódł, próbuję kolejnego...`);
          }
      }
      
      console.error("Wszystkie modele AI(Proxy) są obecnie zajęte.");
      throw new Error(`Wszystkie modele AI są obecnie zajęte. Ostatni błąd: ${(lastError as Error)?.message}`);
    }

    // Standardowa ścieżka z bezpośrednim kluczem API
    const client = getClient();
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        console.log(`Próba użycia modelu: ${model}...`);
        const result = await client.models.generateContent({
          model: model,
          contents: contents
        });
        
        console.log(`Sukces z modelem: ${model}`);
        return result.text || "";
      } catch (error) {
        lastError = error;
        console.warn(`Błąd dla modelu ${model}:`, error);
        
        // Zatrzymujemy od razu, jeśli klucz API jest nieważny
        if (error instanceof Error && (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID"))) {
          console.warn("Podany klucz API Gemini jest nieprawidłowy.");
          throw error;
        }
        // W innym przypadku kontynuujemy pętle i próbujemy następny model
      }
    }

    // Jeśli przeszliśmy przez wszystkie modele i żaden nie zadziałał
    console.error("Wszystkie dostepne modele zawiodly.", lastError);
    throw lastError || new Error("Wszystkie modele AI zawiodły.");
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
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text;
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
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Gemini Bolus Rec Error:", error);
      return null;
    }
  }
};
