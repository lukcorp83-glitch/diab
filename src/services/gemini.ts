import { GoogleGenAI } from "@google/genai";

import { auth } from '../lib/firebase';

let genAITuple: { key: string, baseUrl?: string, client: GoogleGenAI } | null = null;

function getApiKey(): { key: string, baseUrl?: string } {
  let key = '';
  let baseUrl: string | undefined = undefined;

  // 1. FIRST check localStorage (user override)
  if (typeof window !== 'undefined') {
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

  // 2. THEN check env variables (Vite build)
  if (!key && import.meta.env.VITE_GEMINI_API_KEY) {
    key = import.meta.env.VITE_GEMINI_API_KEY;
    baseUrl = import.meta.env.VITE_GEMINI_BASE_URL;
  }

  // 3. Fallback check process.env if available
  if (!key) {
    try {
      if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
        key = process.env.GEMINI_API_KEY;
      }
    } catch (e) {
      // Ignore
    }
  }

  // 4. Fallback to Cloudflare AI Gateway/Worker if no key is provided
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
  
  if (!genAITuple || genAITuple.key !== credentials.key || genAITuple.baseUrl !== credentials.baseUrl) {
     const client = new GoogleGenAI({ 
       apiKey: credentials.key,
       ...(credentials.baseUrl ? { baseUrl: credentials.baseUrl } : {})
     });
     genAITuple = { ...credentials, client };
  }
  return genAITuple.client;
}

export const geminiService = {
  async generateContent(prompt: string, imageData?: string) {
    const creds = getApiKey();
    const isProxyUrl = creds.baseUrl === "https://diacontrol-ai.pixelozapolska.workers.dev";
    
    // Zaktualizowane modele zgodnie z nowymi wytycznymi
    let modelsToTry = imageData 
      ? ['gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest']
      : ['gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];

    // Proxy obsługuje tylko flash, nie doliczmy kosztów PRO do konta globalnego
    if (isProxyUrl) {
      modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
    }

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
        contents
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
    const formattedLogs = recentLogs.map(l => ({
      typ: l.type,
      wartosc: typeof l.value === 'number' ? (l.type === 'glucose' ? Math.round(l.value) : Number(l.value.toFixed(1))) : l.value,
      czas: new Date(l.timestamp || l.createdAt).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })
    }));
    const prompt = `Jesteś asystentem diabetyka. Przeanalizuj poniższe logi z ostatnich 2 godzin (najnowsze u góry): ${JSON.stringify(formattedLogs)}. Zwróć odpowiedź w 3 krótkich punktach używając HTML (<b>, <ul>, <li>): 1. Sytuacja aktualna (oceń czy glikemia jest w normie, spada, rośnie, z czego to wynika). 2. Przewidywania (co może się stać przez najbliższe 2 godziny). 3. Zalecenie działania (np. podaj korektę, zjedz coś na podbicie, obserwuj). Zwięźle, naturalnie, po polsku. Bez znaków markdown typu gwiazdki.`;
    return this.generateContent(prompt);
  },

  async getPeriodAnalysis(period: 'day' | 'week' | 'month', logs: any[]) {
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const periodName = period === 'day' ? 'Dzienny' : period === 'week' ? 'Tygodniowy' : 'Miesięczny';
    const formattedLogs = logs.map(l => ({
      typ: l.type,
      wartosc: typeof l.value === 'number' ? (l.type === 'glucose' ? Math.round(l.value) : Number(l.value.toFixed(1))) : l.value,
      czas: new Date(l.timestamp || l.createdAt).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })
    }));
    const prompt = `Jesteś ekspertem diabetologii systemu GlikoControl. Przeanalizuj logi z ostatnich ${days} dni: ${JSON.stringify(formattedLogs)}. 
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
    const formattedLogs = logs.map(l => ({
      typ: l.type,
      wartosc: typeof l.value === 'number' ? (l.type === 'glucose' ? Math.round(l.value) : Number(l.value.toFixed(1))) : l.value,
      czas: new Date(l.timestamp || l.createdAt).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })
    }));
    const prompt = `Jesteś zaawansowanym systemem analizy cukrzycy GlikoControl. Przeanalizuj WSZYSTKIE dostępne dane: ${JSON.stringify(formattedLogs)}. 
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
    const prompt = `Przeanalizuj to zdjęcie posiłku. Wykryj składniki i oszacuj orientacyjną wagę, ilość węglowodanów (g), białek (g), tłuszczy (g) oraz ładunek glikemiczny (ŁG - jeśli to możliwe) i indeks glikemiczny (IG - wpisz liczbę lub tekst NISKI/ŚREDNI/WYSOKI). Dodaj szczegółową analizę dla diabetyka ("analysis") - co zawiera posiłek i jak może wpłynąć na glikemię uwzględniając ŁG i IG.
    Zwróć odpowiedź absolutnie w formacie JSON (tylko czysty JSON, bez markdown):
    {
      "mealName": "nazwa posiłku",
      "carbs": 0,
      "protein": 0,
      "fat": 0,
      "ig": "NISKI",
      "analysis": "Krótka analiza posiłku..."
    }`;

    try {
      const text = await this.generateContent(prompt, imageData);
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      let cleanJson = jsonMatch ? jsonMatch[0] : text;
      // usuwamy ewentualne wiodące znaki przed klamrami jeśli regex uchwycił za dużo
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Gemini Vision Error:", error);
      throw error;
    }
  },

  async getBolusRecommendation(currentBg: number, currentCarbs: number, calculatedDose: number, trend: string, iob: number, recentLogs: any[]) {
    const formattedLogs = recentLogs.slice(0, 15).map(l => ({
      typ: l.type,
      wartosc: l.value,
      czas: new Date(l.timestamp || l.createdAt).toLocaleString('pl-PL', { hour: '2-digit', minute:'2-digit' })
    }));
    const prompt = `Jesteś ekspertem diabetologii systemu GlikoControl.
    Zadanie: Przeanalizuj obecną sytuację pacjenta i oceń, czy sugerowana przez kalkulator dawka insuliny (${calculatedDose.toFixed(2)} j.) jest optymalna.

    Sytuacja obecna:
    - Glukoza: ${currentBg} mg/dL
    - Posiłek: ${currentCarbs} g węglowodanów
    - Trend: ${trend}
    - Aktywna insulina (IOB): ${iob.toFixed(2)} j.
    - Dawka wyliczona z kalkulatora (matematycznie): ${calculatedDose.toFixed(2)} j.

    Najnowsze logi z historii (do analizy reakcji na poprzednie posiłki/bolusy): 
    ${JSON.stringify(formattedLogs)}

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
      let cleanJson = jsonMatch ? jsonMatch[0] : text;
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Gemini Bolus Rec Error:", error);
      return null;
    }
  },

  async getGlikoChatResponse(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], petData: any) {
    const petName = petData?.name || 'Gliko';
    const petType = petData?.type || 'standard';
    
    const systemInstruction = `Jesteś ${petName} - wesołym i mądrym stworkiem (typ: ${petType}), który opiekuje się dziećmi z cukrzycą. 
    Twoim zadaniem jest pomaganie im w zrozumieniu choroby, wspieranie ich i odpowiadanie na pytania w sposób przystępny dla dzieci (prosty język, dużo empatii, wesoły ton). 
    Pamiętaj, że rozmawiasz z dzieckiem. Twoje odpowiedzi powinny być krótkie, pomocne i pełne otuchy (używaj emotikonów ✨, 🐾, 🍎). 
    Jeśli pytanie dotyczy bezpośrednio medycyny lub dawkowania, zawsze zachęcaj do rozmowy z rodzicami lub lekarzem. 
    Nie podawaj konkretnych dawek insuliny, tylko ogólne zasady i wsparcie.`;

    const creds = getApiKey();
    const isProxyUrl = creds.baseUrl === "https://diacontrol-ai.pixelozapolska.workers.dev";
    
    const fullHistory = [
      ...history,
       { role: 'user', parts: [{ text: message }] }
    ];

    if (isProxyUrl && !localStorage.getItem('gemini_api_key')) {
      try {
        const response = await fetch(creds.baseUrl!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model: 'gemini-1.5-flash', 
                payload: { contents: fullHistory, systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] } }
            })
        });
        const data = await response.json();
        if (response.ok) {
           if (data.candidates && data.candidates[0]?.content) return data.candidates[0].content.parts.map((p:any)=>p.text).join('');
           if (data.text) return data.text;
           return typeof data === 'string' ? data : JSON.stringify(data);
        }
      } catch (e) {
        console.error("Chat proxy error", e);
        return "Przepraszam, chyba na chwilę zasnąłem... Możesz powtórzyć? ✨";
      }
    }

    const client = getClient();
    const model = 'gemini-2.5-flash';

    try {
      const response = await client.models.generateContent({
        model: model,
        contents: fullHistory,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
        }
      });
      return response.text || "Ojej, coś mi się pomieszało w brzuszku! Spróbuj jeszcze raz! 🐾";
    } catch (error) {
      console.error("Gliko Chat Error:", error);
      // Fallback if SDK fails or rate limited
      return "Przepraszam, chyba na chwilę zasnąłem... Możesz powtórzyć? ✨";
    }
  }
};
