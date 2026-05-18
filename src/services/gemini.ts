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

    // Use AbortSignal to timeout hanging generateContent calls
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(new Error("Request Timeout")), 120000);

    for (const model of modelsToTry) {
      try {
        console.log(`Próba użycia modelu: ${model}...`);
        
        // Race the actual call against a Rejecting Promise wrapped in timeout
        const result = await Promise.race([
          client.models.generateContent({
             model: model,
             contents: contents
          }),
          new Promise<never>((_, reject) => {
             const id = setTimeout(() => {
                clearTimeout(id);
                reject(new Error("Timeout_AI"));
             }, 125000);
          })
        ]);
        
        clearTimeout(timeoutId);
        console.log(`Sukces z modelem: ${model}`);
        return result.text || "";
      } catch (error: any) {
        lastError = error;
        console.warn(`Błąd dla modelu ${model}:`, error);
        
        const errMessage = error?.message || String(error) || "";
        // Zatrzymujemy od razu, jeśli klucz API jest nieważny
        if (errMessage.includes("API key not valid") || errMessage.includes("API_KEY_INVALID")) {
          clearTimeout(timeoutId);
          console.warn("Podany klucz API Gemini jest nieprawidłowy.");
          throw error;
        }
        // W innym przypadku kontynuujemy pętle i próbujemy następny model
      }
    }
    
    clearTimeout(timeoutId);
    console.error("Wszystkie dostepne modele zawiodly.", lastError);
    throw lastError || new Error("Wszystkie modele AI zawiodły.");
  },
  
  async getLivePrediction(recentLogs: any[], settings?: any) {
    const formattedLogs = recentLogs.map(l => ({
      typ: l.type,
      wartosc: typeof l.value === 'number' ? (l.type === 'glucose' ? Math.round(l.value) : Number(l.value.toFixed(1))) : l.value,
      czas: new Date(l.timestamp || l.createdAt).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })
    }));
    const dietInfo = settings?.activeDiet ? `UWAGA: Użytkownik jest na diecie: ${settings.activeDiet}. Zwróć na to uwagę przy zaleceniach.` : '';
    const prompt = `Jesteś asystentem diabetyka. Przeanalizuj poniższe logi z ostatnich 2 godzin (najnowsze u góry): ${JSON.stringify(formattedLogs)}. ${dietInfo} Zwróć odpowiedź w 3 krótkich punktach używając HTML (<b>, <ul>, <li>): 1. Sytuacja aktualna (oceń czy glikemia jest w normie, spada, rośnie, z czego to wynika). 2. Przewidywania (co może się stać przez najbliższe 2 godziny). 3. Zalecenie działania (np. podaj korektę, zjedz coś na podbicie, obserwuj). Zwięźle, naturalnie, po polsku. Bez znaków markdown typu gwiazdki.`;
    return this.generateContent(prompt);
  },

  async getPeriodAnalysis(period: 'day' | 'week' | 'month', logs: any[], settings?: any) {
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const periodName = period === 'day' ? 'Dzienny' : period === 'week' ? 'Tygodniowy' : 'Miesięczny';
    
    let logsToAnalyze = logs;
    const MAX_PERIOD_LOGS = 300;
    if (logsToAnalyze.length > MAX_PERIOD_LOGS) {
       const important = logs.filter(l => l.type !== 'glucose' && !l.bg);
       const bgLogs = logs.filter(l => l.type === 'glucose' || l.bg);
       const decimationFactor = Math.ceil(bgLogs.length / Math.max(1, (MAX_PERIOD_LOGS - important.length)));
       const sampledBg = bgLogs.filter((_, i) => i % (decimationFactor > 0 ? decimationFactor : 1) === 0);
       logsToAnalyze = [...important, ...sampledBg].sort((a,b) => (b.timestamp || new Date(b.createdAt).getTime()) - (a.timestamp || new Date(a.createdAt).getTime())).slice(0, MAX_PERIOD_LOGS);
    }

    const formattedLogs = logsToAnalyze.map(l => ({
      typ: l.type,
      wartosc: typeof l.value === 'number' ? (l.type === 'glucose' ? Math.round(l.value) : Number(l.value.toFixed(1))) : l.value,
      czas: new Date(l.timestamp || l.createdAt).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })
    }));
    const dietInfo = settings?.activeDiet ? `DODATKOWY KONTEKST: Użytkownik jest na diecie: ${settings.activeDiet}. Skup się na ewaluacji tej diety.` : '';
    const prompt = `Jesteś ekspertem diabetologii systemu GlikoControl. Przeanalizuj logi z ostatnich ${days} dni (próbka ${formattedLogs.length} wpisów): ${JSON.stringify(formattedLogs)}. ${dietInfo}
    Stwórz ${periodName} Raport Postępów.
    Struktura raportu (używaj HTML: <b>, <ul>, <li>, <br>):
    1. <b>Podsumowanie Okresu</b> (ogólny stan, średni cukier).
    2. <b>Największe Wyzwania</b> (momenty dnia z największymi wahaniami).
    3. <b>Pozytywne Trendy</b> (co udało się poprawić).
    4. <b>Cele na Kolejny Okres</b> (konkretne wskazówki).
    Pisz merytorycznie, po polsku, bez formatowania markdown (gwiazdek).`;
    return this.generateContent(prompt);
  },

  async getMasterAnalysis(logs: any[], settings?: any) {
    let logsToAnalyze = logs;
    const MAX_MASTER_LOGS = 400;
    // Podobieństwo heurystyczne z GlikoSense: ograniczamy ilość by uchronić AI przed Payload Too Large.
    if (logsToAnalyze.length > MAX_MASTER_LOGS) {
       // Starajmy się brać nowsze wpisy, ew. dając priorytet posiłkom i bolusom, oraz pomijając niektóre CGMy.
       const important = logs.filter(l => l.type !== 'glucose' && !l.bg);
       const bgLogs = logs.filter(l => l.type === 'glucose' || l.bg);
       
       // Decimate BG logs jeśli jest ich dużo
       const decimationFactor = Math.ceil(bgLogs.length / Math.max(1, (MAX_MASTER_LOGS - important.length)));
       const sampledBg = bgLogs.filter((_, i) => i % (decimationFactor > 0 ? decimationFactor : 1) === 0);
       
       logsToAnalyze = [...important, ...sampledBg].sort((a,b) => (b.timestamp || new Date(b.createdAt).getTime()) - (a.timestamp || new Date(a.createdAt).getTime())).slice(0, MAX_MASTER_LOGS);
    }
    
    const formattedLogs = logsToAnalyze.map(l => ({
      typ: l.type,
      wartosc: typeof l.value === 'number' ? (l.type === 'glucose' ? Math.round(l.value) : Number(l.value.toFixed(1))) : l.value,
      czas: new Date(l.timestamp || l.createdAt).toLocaleString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })
    }));
    const dietInfo = settings?.activeDiet ? `DODATKOWY KONTEKST: Użytkownik przebywa na diecie: ${settings.activeDiet}. Skup się na ewaluacji jak ta dieta na niego działa, uwzględnij rekomendacje żywieniowe dla niej.` : '';
    const prompt = `Jesteś zaawansowanym systemem analizy cukrzycy GlikoControl. Przeanalizuj reprezentatywną próbkę danych (${formattedLogs.length} wpisów): ${JSON.stringify(formattedLogs)}. ${dietInfo}
    Twoim zadaniem jest stworzenie JEDNEGO, KOMPLEKSOWEGO RAPORTU eksperckiego.
    Struktura raportu (używaj HTML: <b>, <ul>, <li>, <br>):
    1. <b>Krótki przegląd obecnej sytuacji</b> (ostatnie wpisy).
    2. <b>Analiza trendów i wzorców</b> (kiedy cukier skacze, dlaczego, czy bolusy są trafne).
    3. <b>Ocena długoterminowa</b> (przewidywane HbA1c, czas w zakresie).
    4. <b>Konkretne rekomendacje</b> (co poprawić w diecie, dawkowaniu lub aktywności).
    5. <b>Sugestie profili godzinowych</b> (zaproponuj konkretne przedziały czasowe i wartości ISF oraz WW Ratio na podstawie zaobserwowanych trendów - np. zwiększony ISF rano jeśli cukier rośnie).
    Zwracaj uwagę na: nocne hipoglikemie, skoki po posiłkach, efektywność insuliny. 
    Pisz zwięźle, konkretnie, po polsku. Bez formatowania markdown (gwiazdek (**) ani (###)).`;
    return this.generateContent(prompt);
  },

  async analyzeMeal(imageData: string, settings?: any) {
    const dietInfo = settings?.activeDiet ? `UWAGA: Użytkownik przestrzega diety: ${settings.activeDiet}. Zwróć szczególną uwagę jak ten posiłek wpisuje się w jej zasady.` : '';
    const prompt = `Przeanalizuj to zdjęcie posiłku. Wykryj składniki i oszacuj orientacyjną wagę, ilość węglowodanów (g), białek (g), tłuszczy (g) oraz ładunek glikemiczny (ŁG - jeśli to możliwe) i indeks glikemiczny (IG - POWINIEN BYĆ KONKRETNĄ LICZBĄ, korzystaj z profesjonalnych tabel wartości odżywczych). Dodaj szczegółową analizę dla diabetyka ("analysis") - co zawiera posiłek i jak może wpłynąć na glikemię uwzględniając ŁG i IG. ${dietInfo}
    Zwróć odpowiedź absolutnie w formacie JSON (tylko czysty JSON, bez markdown):
    {
      "mealName": "nazwa posiłku",
      "carbs": 0,
      "protein": 0,
      "fat": 0,
      "ig": 0,
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

  async getBolusRecommendation(currentBg: number, currentCarbs: number, calculatedDose: number, trend: string, iob: number, cob: number, recentLogs: any[]) {
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
    - Aktywne węglowodany (COB): ${cob.toFixed(0)} g
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

  getAiStatus() {
    const creds = getApiKey();
    const hasLocalStorage = typeof window !== 'undefined' && !!localStorage.getItem('gemini_api_key');
    const isProxy = creds.baseUrl === "https://diacontrol-ai.pixelozapolska.workers.dev";
    
    if (hasLocalStorage) return { type: 'custom', label: 'Własny Klucz (Local)', color: 'text-indigo-500' };
    if (isProxy) return { type: 'proxy', label: 'Serwer Gliko (Domyślny)', color: 'text-amber-500' };
    return { type: 'project', label: 'Klucz Projektu (Vite/Env)', color: 'text-emerald-500' };
  },

  async getGlikoChatResponse(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], petData: any) {
    const petName = petData?.name || 'Gliko';
    const petType = petData?.type || 'standard';
    
    const systemInstruction = `Jesteś ${petName} - wesołym i mądrym stworkiem (typ: ${petType}), który opiekuje się dziećmi z cukrzycą. 
    Twoim zadaniem jest pomaganie im w zrozumieniu choroby, wspieranie ich i odpowiadanie na pytania w sposób przystępny dla dzieci (prosty język, dużo empatii, wesoły ton). 
    Pamiętaj, że rozmawiasz z dzieckiem (lub rodzicem). Twoje odpowiedzi powinny być wesołe i pełne otuchy (używaj emotikonów ✨, 🐾, 🍎). 
    Jeśli pytanie dotyczy bezpośrednio medycyny, zachęcaj do rozmowy z lekarzem. Twoja wiedza o aplikacji to GlikoControl:
    - Baza wiedzy i jedzenia, weryfikacja produktów.
    - Ustawienia: ISF (wrażliwość na insulinę), WW (przydzielenie węgli), WBT, Docelowy poziom glikemii, wibracje (haptyka).
    - Talerz: posiłki i bolusy. Jeśli użytkownik chce coś dodać do wpisów, robisz to!
    
    BARDZO WAŻNE - DODAWANIE DO TALERZA ORAZ AKCJE APLIKACJI: 
    Masz pełną integrację z naszą aplikacją. Możesz zmieniać jej stan za pomocą ukrytych tagów na samym końcu wypowiedzi.
    
    1. Aby dodać posiłek do Talerza:
    <plate_action>{"action": "add", "item": {"name": "Jabłko", "carbs": 15, "protein": 1, "fat": 0, "kcal": 60}}</plate_action>
    
    2. Aby zmienić ustawienia (np. dzienna dawka insuliny/isf, wyłączenie haptyki):
    Używaj tych kluczy: "isf", "targetMin", "targetMax", "wwRatio", "hapticsEnabled".
    <app_action>{"action": "set_setting", "key": "hapticsEnabled", "value": false}</app_action>
    
    3. Aby bezpośrednio zapisać do historii cukier, bolus lub wymianę ("zapisz cukier", "wymieniłem wkłucie"):
    <app_action>{"action": "add_log", "logData": {"type": "bolus", "value": 3, "notes": "Zalecono przez Gliko"}}</app_action>
    <app_action>{"action": "add_log", "logData": {"type": "site_change", "value": 0, "notes": "Wymiana wkłucia"}}</app_action>
    W logData.type może być "bolus", "glucose", "site_change", "sensor_change".
    
    4. Aby nawigować użykownika do odpowiedniej sekcji ("Gdzie są ustawienia?", "Pokaż mój profil", "Idźmy do talerza"):
    <app_action>{"action": "navigate", "value": "profile"}</app_action> (dostepne: dashboard, profile, database, meal, history)
    
    Napisz użytkownikowi w wiadomości co właśnie zrobiłeś, tag ukryj na samym końcu!`;

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
        throw new Error(data.error?.message || "Proxy error");
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
  },

  generateMealPlan: async (dietName: string, tdee: number, days: number = 3, allergies?: string) => {
    let allergyContext = "";
    if (allergies) {
      allergyContext = `\nBEZWZGLĘDNIE WYKLUCZ Z DIETY ORAZ UWZGLĘDNIJ ALERGIE/PREFERENCJE UZTKOWNIKA: ${allergies}. To sprawa życia i śmierci, żaden ze składników posiłków nie może na to pozwalać.`;
    }

    const prompt = `Jesteś dietetykiem klinicznym. Przygotuj ${days}-dniowy wprowadzający jadłospis dla diety: ${dietName}.
Całodzienny jadłospis musi idealnie sumować się do ${tdee} kcal dziennie. 
Uwzględnij odpowiedni rozkład makroskładników dla tej diety na układ posiłków (np. 3 lub 4 posiłki).
BARDZO WAŻNE: Każdy posiłek MUSI bezwzględnie przestrzegać zasad diety: ${dietName}.${allergyContext}
Składniki posiłków zostaną poddane ostrej weryfikacji pod kątem rygoru tej diety. Nie patrz tylko na kalorie! Jeśli generujesz Keto, węglowodany muszą być drastycznie bliskie zera. Jeśli DASH, drastycznie mało sodu (użyj typowych składników).
Każdy posiłek musi zawierać instrukcję gotowania krok po kroku dodaną jako "recipe".
Odpowiedz TYLKO I WYŁĄCZNIE poprawnym JSON-em (bez formatowania markdown \`\`\`json) z taką strukturą:
{
  "summary": "Krótkie podsumowanie założeń...",
  "days": [
    {
      "dayNumber": 1,
      "totalKcal": 2000,
      "meals": [
        {
          "type": "Śniadanie",
          "name": "Jajecznica z awokado",
          "kcal": 500,
          "carbs": 10,
          "protein": 25,
          "fat": 40,
          "description": "3 jajka, pół awokado, masło, pomidorki",
          "recipe": "Krok 1: Wbij jajka. Krok 2: Usmaż na maśle. Krok 3: Dodaj awokado i pomidorki."
        }
      ]
    }
  ]
}`;
    
    try {
      const text = await geminiService.generateContent(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      let cleanJson = jsonMatch ? jsonMatch[0] : text;
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Meal Plan Error:", error);
      return null;
    }
  },

  generateReplacementMeal: async (dietName: string, tdeeTargetForMeal: number, type: string, allergies?: string) => {
    let allergyContext = "";
    if (allergies) {
      allergyContext = `\nBEZWZGLĘDNIE WYKLUCZ Z DIETY ORAZ UWZGLĘDNIJ ALERGIE/PREFERENCJE UZTKOWNIKA: ${allergies}.`;
    }

    const prompt = `Jesteś dietetykiem. Wygeneruj rygorystyczny posiłek dla diety: ${dietName}.
Posiłek to: ${type}. Talerz musi opiewać na około ${tdeeTargetForMeal} kcal.${allergyContext}

Wymagany ścisły rygor diety ${dietName}. Nie ignoruj wytycznych proporcji makroskładników danej diety.
Odpowiedz TYLKO JSON-em (żadnego dodatkowego tekstu).
{
  "type": "${type}",
  "name": "Tytuł nowego dania",
  "kcal": ${tdeeTargetForMeal},
  "carbs": 10,
  "protein": 25,
  "fat": 40,
  "description": "Krótki opis składników",
  "recipe": "Krok po kroku instrukcja przyrządzania posiłku."
}`;

    try {
      const text = await geminiService.generateContent(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      let cleanJson = jsonMatch ? jsonMatch[0] : text;
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Meal Replace Error:", error);
      return null;
    }
  },

  async getAssistantResponse(message: string, history: any[], logs: any[], settings: any, currentStatus?: { iob: number, cob: number, glucose: number }, insights?: string[]) {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).getTime();
    
    // Process logs: filter 24h, sort chronological, take last 100
    const lastLogs = logs
      .filter(l => {
        const ts = new Date(l.timestamp || l.createdAt).getTime();
        return ts >= twentyFourHoursAgo;
      })
      .sort((a, b) => new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime())
      .slice(-100)
      .map(l => ({
        typ: l.type,
        wartosc: l.value,
        jednostka: l.type === 'glucose' ? 'mg/dL' : (l.type === 'meal' ? 'g węgli' : 'j. insuliny'),
        czas: new Date(l.timestamp || l.createdAt).toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
      }));

    const isChild = settings?.childMode ?? true;

    const insightsStr = insights && insights.length > 0 
      ? `\nNAJNOWSZE WNIOSKI GLIKOSENSE (Dostępne analizy): \n- ${insights.join('\n- ')}\n` 
      : '';

    const activeDietStr = settings?.activeDiet 
      ? `\nUWAGA! Użytkownik ma aktywną dietę: ${settings.activeDiet}. WSZYSTKIE TWOJE ANALIZY I SUGESTIE POSIŁKOWE (i GlikoSense) MUSZĄ JĄ UWZGLĘDNIAĆ!` 
      : '';

    const currentDataStr = currentStatus ? `
    AKTUALNY STATUS URZĄDZEŃ (Stan na: ${now.toLocaleString('pl-PL')}):
    - Bieżąca glikemia: ${currentStatus.glucose} mg/dL (To jest najnowszy odczyt!)
    - Aktywna insulina (IOB): ${currentStatus.iob.toFixed(2)} j.
    - Aktywne węglowodany (COB): ${currentStatus.cob.toFixed(0)} g
    ${insightsStr}${activeDietStr}
    ` : `AKTUALNY CZAS: ${now.toLocaleString('pl-PL')}\n${insightsStr}${activeDietStr}`;
    
    const systemInstruction = isChild ? `Jesteś Smart Asystentem Gliko w aplikacji GlikoControl. 
    Twoim zadaniem jest pomaganie dzieciom i ich rodzicom w codziennym zarządzaniu cukrzycą w sposób przyjazny, cierpliwy i zachęcający. Posiadasz pełną integrację aplikacyjną (wiedz o ustawieniach, dziennikach itd.).
    ${currentDataStr}
    MASZ DOSTĘP DO DANYCH UŻYTKOWNIKA (z ostatnich 24 godzin):
    - Ostatnie logi: ${JSON.stringify(lastLogs)}
    - Ustawienia (ISF, WW): ${JSON.stringify(settings)}
    
    ZASADY ODPOWIADANIA:
    1. BĄDŹ ZWIĘZŁY: Przy prostych zapytaniach ogranicz odpowiedź do minimum. 
    2. AKCJE Z APLIKACJĄ I ZARZĄDZANIE DANYMI: Możesz wykonywać akcje! Na samym końcu wiadomości możesz wpisać poniższe tagi:
       ZAPISANIE BOLUSA LUB CUKRU (np. "zapisz cukier 120" albo "zapisz bolus 3j"): <app_action>{"action": "add_log", "logData": {"type": "glucose", "value": 120, "notes": "Cukier z AI"}}</app_action>
       ZAPISANIE WYMIANY (wkłucie/sensor, np. "wymieniłem wkłucie"): <app_action>{"action": "add_log", "logData": {"type": "site_change", "value": 0, "notes": "wymiana wkłucia"}}</app_action> (type jako site_change/sensor_change)
       ZMIANA USTAWIEŃ (np. wyłącz wibracje, zmień isf): <app_action>{"action": "set_setting", "key": "isf", "value": 30}</app_action>
       NAWIGACJA (np. "gdzie jest dzienniczek", "pokaż mi jedzenie"): <app_action>{"action": "navigate", "value": "history"}</app_action> (dashboard, profile, database, meal, history)
    3. INTERAKCJA Z TALERZEM: Jeśli użytkownik chce dodać jedzenie np. ("dodaj jabłko"): <plate_action>{"action": "add", "item": {"name": "Jabłko", "carbs": 15, "protein": 1, "fat": 0, "kcal": 60}}</plate_action>
    4. Formatuj odpowiedzi używając HTML (<b>, <ul>, <li>). NIE używaj markdown. Pamiętaj by poinformować użytkownika, że akcja została pomyślnie wykonana.
    5. Wspieraj dziecko: chwal za dobre wyniki, pocieszaj przy gorszych.
    6. Język: Polski.` : `Jesteś Eksperckim Systemem Analizy Medycznej AI (GlikoControl z pełną integracją).
    ${currentDataStr}
    DANE UŻYTKOWNIKA (24h):
    - Logi: ${JSON.stringify(lastLogs)}
    - Parametry: ${JSON.stringify(settings)}
 
    ZASADY:
    1. AKCJE I DOSTĘP: Użytkownik może poprosić o zapisanie pomiaru, bolusa, bądź zmianę ustawień aplikacji lub ułatwienie nawigacji w samej aplikacji. Robi to za sprawą niewidzialnych tagów w Twoich wiadomościach:
       - BOLUS/CUKIER: <app_action>{"action": "add_log", "logData": {"type": "bolus", "value": 3, "notes": "Korekta"}}</app_action>
       - USTAWIENIA (targetMin, isf, wwRatio, hapticsEnabled itp.): <app_action>{"action": "set_setting", "key": "hapticsEnabled", "value": false}</app_action>
       - NAWIGACJA (np. "skoczmy do talerza" value=meal/history/dashboard): <app_action>{"action": "navigate", "value": "meal"}</app_action>
       - ZJEDZONY POSIŁEK: <plate_action>{"action": "add", "item": {"name": "Nazwa", "carbs": 20, "protein": 5, "fat": 2, "kcal": 150}}</plate_action>
    2. ANALIZA DANYCH: Skup się na trendach i GlikoSense.
    3. HTML formatting (<b>, <ul>). Zapisz tagi na DOKŁADNYM KOŃCU response'a! Poinformuj w treści, że dokonałeś operacji na rzecz użytkownika.`;

    let fullContents = [
      ...history,
      { role: 'user', parts: [{ text: message }] }
    ];

    // Safety checks for Gemini API:
    // 1. Must alternate 'user' and 'model'
    // 2. Must start with 'user'
    let validContents = [];
    let expectedRole = 'user';
    
    // We traverse from end to start to keep the most recent messages, ensuring the last is 'user'
    for (let i = fullContents.length - 1; i >= 0; i--) {
      if (fullContents[i].role === expectedRole) {
        validContents.unshift(fullContents[i]);
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      } else if (fullContents[i].role === 'user' && expectedRole === 'user') {
         // Consecutive user messages? Merge them or just keep the latest user message
         // Here we just ignore older consecutive messages to maintain alternation
      }
    }
    
    // If we wound up with a first message being 'model', remove it (shouldn't happen with the logic above unless we added something weird)
    if (validContents.length > 0 && validContents[0].role !== 'user') {
      validContents.shift();
    }
    
    fullContents = validContents;

    const creds = getApiKey();
    const isProxyUrl = creds.baseUrl === "https://diacontrol-ai.pixelozapolska.workers.dev";

    if (isProxyUrl && !localStorage.getItem('gemini_api_key')) {
      try {
        const response = await fetch(creds.baseUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            model: 'gemini-1.5-flash', 
            payload: { 
              contents: fullContents, 
              systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] } 
            }
          })
        });
        const data = await response.json();
        if (response.ok) {
           if (data.candidates && data.candidates[0]?.content) return data.candidates[0].content.parts.map((p:any)=>p.text).join('');
           if (data.text) return data.text;
           return typeof data === 'string' ? data : JSON.stringify(data);
        }
        throw new Error(data.error?.message || "Proxy error");
      } catch (e) {
        console.error("Assistant proxy error", e);
        return "Przepraszam, mam problem z połączeniem z moją bazą wiedzy. Spróbuj później.";
      }
    }

    const client = getClient();
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const response = await client.models.generateContent({
          model: model,
          contents: fullContents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.4,
          }
        });
        return response.text || "Nie udało mi się wygenerować odpowiedzi.";
      } catch (error) {
        console.warn(`Assistant - błąd dla modelu ${model}:`, error);
        lastError = error;
      }
    }
    
    console.error("Assistant API Error:", lastError);
    return "Wystąpił błąd podczas komunikacji z AI. Sprawdź swoje połączenie lub klucz API.";
  }
};
