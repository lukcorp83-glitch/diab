import { GoogleGenAI } from "@google/genai";
import { clampSafeBolus } from "../lib/physiologicalSafety";
import i18n from "../i18n";

import { auth } from "../lib/firebase";

import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

let genAITuple: { key: string; baseUrl?: string; client: GoogleGenAI } | null =
  null;

async function getApiKey(): Promise<{ key: string; baseUrl?: string }> {
  let key = "";
  let baseUrl: string | undefined = undefined;

  // 1. FIRST check SecureStorage (user override)
  if (typeof window !== "undefined") {
    let rawValue: string | null = null;
    try {
      const result = await SecureStoragePlugin.get({ key: "gemini_api_key" });
      if (result && result.value) rawValue = result.value;
    } catch (e) {
      // Key not found in secure storage
    }
    
    if (!rawValue) {
      rawValue = localStorage.getItem("gemini_api_key");
      if (rawValue) {
        try {
          await SecureStoragePlugin.set({ key: "gemini_api_key", value: rawValue });
        } catch (e) {}
        localStorage.removeItem("gemini_api_key");
      }
    }

    if (rawValue) {
      if (rawValue.includes("|")) {
        const parts = rawValue.split("|");
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
      if (
        typeof process !== "undefined" &&
        process.env &&
        process.env.GEMINI_API_KEY
      ) {
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
      baseUrl: "https://diacontrol-ai.pixelozapolska.workers.dev",
    };
  }

  return { key, baseUrl };
}

async function getClient(): Promise<GoogleGenAI> {
  const credentials = await getApiKey();

  if (
    !genAITuple ||
    genAITuple.key !== credentials.key ||
    genAITuple.baseUrl !== credentials.baseUrl
  ) {
    const client = new GoogleGenAI({
      apiKey: credentials.key,
      ...(credentials.baseUrl ? { baseUrl: credentials.baseUrl } : {}),
    });
    genAITuple = { ...credentials, client };
  }
  return genAITuple.client;
}

export const geminiService = {
  async generateContent(prompt: string, imageData?: string) {
    const creds = await getApiKey();
    const isProxyUrl =
      creds.baseUrl === "https://diacontrol-ai.pixelozapolska.workers.dev";

    const lang = localStorage.getItem('i18nextLng') || 'pl';
    const langInstruction = lang.startsWith('en') 
      ? "\n\n[SYSTEM INSTRUCTION: You must respond entirely in English.]\n"
      : "\n\n[SYSTEM INSTRUCTION: You must respond entirely in Polish.]\n";
    
    prompt = prompt + langInstruction;

    // Zaktualizowane modele zgodnie z nowymi wytycznymi
    let modelsToTry = imageData
      ? ["gemini-flash-latest", "gemini-2.0-flash", "gemini-2.5-flash"]
      : [
          "gemini-flash-latest",
          "gemini-2.5-flash",
          "gemini-pro-latest",
        ];

    // Proxy obsługuje tylko flash, nie doliczmy kosztów PRO do konta globalnego
    if (isProxyUrl) {
      modelsToTry = ["gemini-flash-latest", "gemini-2.0-flash"];
    }

    let contents;
    if (imageData) {
      let mimeType = "image/jpeg";
      if (imageData.startsWith("data:")) {
        const match = imageData.match(/data:([^;]+);/);
        if (match) mimeType = match[1];
      }
      contents = [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageData.split(",")[1] || imageData,
                mimeType: mimeType,
              },
            },
          ],
        },
      ];
    } else {
      contents = [{ role: "user", parts: [{ text: prompt }] }];
    }

    if (isProxyUrl && creds.key === "proxy") {
      const CLOUDFLARE_WORKER_URL = creds.baseUrl;
      let lastError = null;

      const payload = {
        contents,
      };

      for (const model of modelsToTry) {
        try {
          console.log(i18n.t('auto.proba_uzycia_modelu_proxy', { defaultValue: "Próba użycia modelu (Proxy): {{var0}}...", var0: model }));
          const response = await fetch(CLOUDFLARE_WORKER_URL!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: model,
              payload: payload,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            console.log(`Sukces z modelem (Proxy): ${model}`);
            if (
              data.candidates &&
              data.candidates.length > 0 &&
              data.candidates[0].content
            ) {
              return (
                data.candidates[0].content.parts
                  .map((p: any) => p.text)
                  .join("") || ""
              );
            } else if (data.text) {
              return data.text;
            }

            return typeof data === "string" ? data : JSON.stringify(data);
          }

          throw new Error(data.error?.message || i18n.t('auto.blad_modelu_var0', { defaultValue: "Błąd modelu {{var0}}", var0: model }));
        } catch (error) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.warn(i18n.t('auto.model_var0_zawiodl_probuj', { defaultValue: "Model {{var0}} zawiódł, próbuję kolejnego...", var0: model }));
        }
      }

      console.error(i18n.t('auto.wszystkie_modele_ai_proxy_sa_o', { defaultValue: i18n.t('auto.wszystkie_modele_ai_proxy', { defaultValue: "Wszystkie modele AI(Proxy) są obecnie zajęte lub zablokowane limitami Google dla naszego bezpłatnego serwera." }) }));
      throw new Error(
        i18n.t('gemini.proxy_limit_error_global', { defaultValue: i18n.t('auto.aby_przywrocic_dzialanie', { defaultValue: "Aby przywrócić działanie modułów Sztucznej Inteligencji (GlikoSense, Asystent), przejdź do: Mój Profil -> Opcje Zaawansowane -> Własny klucz API. Pobierz darmowy klucz Gemini ze strony aistudio.google.com i wprowadź go w aplikacji. Jest to konieczne, gdyż darmowy ogólnodostępny serwer osiągnął limity zapytań Google." }) })
      );
    }

    // Standardowa ścieżka z bezpośrednim kluczem API
    const client = await getClient();
    let lastError = null;

    // Use AbortSignal to timeout hanging generateContent calls
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(new Error("Request Timeout")),
      120000,
    );

    for (const model of modelsToTry) {
      try {
        console.log(i18n.t('auto.proba_uzycia_modelu_var0', { defaultValue: "Próba użycia modelu: {{var0}}...", var0: model }));

        // Race the actual call against a Rejecting Promise wrapped in timeout
        const result = await Promise.race([
          client.models.generateContent({
            model: model,
            contents: contents,
          }),
          new Promise<never>((_, reject) => {
            const id = setTimeout(() => {
              clearTimeout(id);
              reject(new Error("Timeout_AI"));
            }, 125000);
          }),
        ]);

        clearTimeout(timeoutId);
        console.log(`Sukces z modelem: ${model}`);
        return result.text || "";
      } catch (error: any) {
        lastError = error;
        console.warn(i18n.t('auto.blad_dla_modelu_var0', { defaultValue: "Błąd dla modelu {{var0}}:", var0: model }), error);

        const errMessage = error?.message || String(error) || "";
        // Zatrzymujemy od razu, jeśli klucz API jest nieważny
        if (
          errMessage.includes("API key not valid") ||
          errMessage.includes("API_KEY_INVALID")
        ) {
          clearTimeout(timeoutId);
          console.warn(i18n.t('auto.podany_klucz_api_gemini_jest_n', { defaultValue: i18n.t('auto.podany_klucz_api_gemini_j', { defaultValue: "Podany klucz API Gemini jest nieprawidłowy." }) }));
          throw error;
        }
        // W innym przypadku kontynuujemy pętle i próbujemy następny model
      }
    }

    clearTimeout(timeoutId);
    console.error("Wszystkie dostepne modele zawiodly.", lastError);
    throw lastError || new Error(i18n.t('auto.wszystkie_modele_ai_zawiodly', { defaultValue: i18n.t('auto.wszystkie_modele_ai_zawio', { defaultValue: "Wszystkie modele AI zawiodły." }) }));
  },

  async getLivePrediction(recentLogs: any[], settings?: any) {
    const formattedLogs = recentLogs.map((l) => ({
      typ: l.type,
      wartosc:
        typeof l.value === "number"
          ? l.type === "glucose"
            ? Math.round(l.value)
            : Number(l.value.toFixed(1))
          : l.value,
      czas: new Date(l.timestamp || l.createdAt).toLocaleString("pl-PL", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
    const dietInfo = settings?.activeDiet
      ? i18n.t('auto.uwaga_uzytkownik_jest_na', { defaultValue: "UWAGA: Użytkownik jest na diecie: {{var0}}. Zwróć na to uwagę przy zaleceniach.", var0: settings.activeDiet })
      : "";
    const prompt = i18n.t('auto.jestes_asystentem_diabety', { defaultValue: "Jesteś asystentem diabetyka. Przeanalizuj poniższe logi z ostatnich 2 godzin (najnowsze u góry): {{var0}}. {{var1}} Zwróć odpowiedź w 3 krótkich punktach używając HTML (<b>, <ul>, <li>): 1. Sytuacja aktualna (oceń czy glikemia jest w normie, spada, rośnie, z czego to wynika). 2. Przewidywania (co może się stać przez najbliższe 2 godziny). 3. Zalecenie działania (np. podaj korektę, zjedz coś na podbicie, obserwuj). Zwięźle, naturalnie, po polsku. Bez znaków markdown typu gwiazdki.", var0: JSON.stringify(formattedLogs), var1: dietInfo });
    return this.generateContent(prompt);
  },

  async getPeriodAnalysis(
    period: "day" | "week" | "month",
    logs: any[],
    settings?: any,
  ) {
    const days = period === "day" ? 1 : period === "week" ? 7 : 30;
    const periodName =
      period === "day"
        ? "Dzienny"
        : period === "week"
          ? "Tygodniowy"
          : i18n.t('auto.miesieczny', { defaultValue: i18n.t('auto.miesieczny', { defaultValue: "Miesięczny" }) });
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    let logsToAnalyze = logs.filter(
      (l) => (l.timestamp || new Date(l.createdAt).getTime()) >= cutoff,
    );
    const MAX_PERIOD_LOGS = 300;
    if (logsToAnalyze.length > MAX_PERIOD_LOGS) {
      const important = logsToAnalyze.filter(
        (l) => l.type !== "glucose" && !l.bg,
      );
      let bgLogs = logsToAnalyze.filter((l) => l.type === "glucose" || l.bg);

      bgLogs = bgLogs.sort(
        (a, b) =>
          (a.timestamp || new Date(a.createdAt).getTime()) -
          (b.timestamp || new Date(b.createdAt).getTime()),
      );

      const allowedBgCount = Math.max(50, MAX_PERIOD_LOGS - important.length);
      const decimationFactor = Math.max(
        1,
        Math.ceil(bgLogs.length / allowedBgCount),
      );
      const sampledBg = bgLogs.filter((_, i) => i % decimationFactor === 0);

      logsToAnalyze = [...important, ...sampledBg];
    }

    logsToAnalyze = logsToAnalyze.sort(
      (a, b) =>
        (a.timestamp || new Date(a.createdAt).getTime()) -
        (b.timestamp || new Date(b.createdAt).getTime()),
    );

    if (logsToAnalyze.length > MAX_PERIOD_LOGS) {
      logsToAnalyze = logsToAnalyze.slice(-MAX_PERIOD_LOGS);
    }

    const formattedLogs = logsToAnalyze.map((l) => ({
      typ: l.type,
      wartosc:
        typeof l.value === "number"
          ? l.type === "glucose"
            ? Math.round(l.value)
            : Number(l.value.toFixed(1))
          : l.value,
      czas: new Date(l.timestamp || l.createdAt).toLocaleString("pl-PL", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
    const dietInfo = settings?.activeDiet
      ? i18n.t('auto.dodatkowy_kontekst_uzytko', { defaultValue: "DODATKOWY KONTEKST: Użytkownik jest na diecie: {{var0}}. Skup się na ewaluacji tej diety.", var0: settings.activeDiet })
      : "";
    const prompt = i18n.t('auto.jestes_ekspertem_diabetol_raport_okresowy', { defaultValue: "Jesteś ekspertem diabetologii systemu GlikoControl. Przeanalizuj rozłożoną w czasie próbkę danych z {{var0}} ({{var1}} wpisów): {{var2}}. {{var3}}\n    Stwórz {{var4}} Raport Postępów (obejmujący CAŁY TEN OKRES, od najstarszych do najnowszych powierzonych danych).\n    Struktura raportu (używaj HTML: <b>, <ul>, <li>, <br>):\n    1. <b>Podsumowanie Okresu</b> (ogólny stan, średni cukier).\n    2. <b>Największe Wyzwania</b> (momenty dnia z największymi wahaniami).\n    3. <b>Pozytywne Trendy</b> (co udało się poprawić).\n    4. <b>Cele na Kolejny Okres</b> (konkretne wskazówki).\n    Pamiętaj: Odpowiadaj WYŁĄCZNIE W JĘZYKU POLSKIM. Pisz merytorycznie, zwięźle, bez formatowania markdown (gwiazdek).", var0: days === 1 ? "OSTATNIEJ DOBY" : `OSTATNICH ${days} DNI`, var1: formattedLogs.length, var2: JSON.stringify(formattedLogs), var3: dietInfo, var4: periodName });
    return this.generateContent(prompt);
  },

  async getMasterAnalysis(logs: any[], settings?: any) {
    const cutoff = Date.now() - 15 * 24 * 60 * 60 * 1000;
    let logsToAnalyze = logs.filter(
      (l) => (l.timestamp || new Date(l.createdAt).getTime()) >= cutoff,
    );
    const MAX_MASTER_LOGS = 400;

    if (logsToAnalyze.length > MAX_MASTER_LOGS) {
      const important = logsToAnalyze.filter(
        (l) => l.type !== "glucose" && !l.bg,
      );
      let bgLogs = logsToAnalyze.filter((l) => l.type === "glucose" || l.bg);

      // Sort chronologically for decimation
      bgLogs = bgLogs.sort(
        (a, b) =>
          (a.timestamp || new Date(a.createdAt).getTime()) -
          (b.timestamp || new Date(b.createdAt).getTime()),
      );

      const allowedBgCount = Math.max(50, MAX_MASTER_LOGS - important.length);
      const decimationFactor = Math.max(
        1,
        Math.ceil(bgLogs.length / allowedBgCount),
      );
      const sampledBg = bgLogs.filter((_, i) => i % decimationFactor === 0);

      logsToAnalyze = [...important, ...sampledBg];
    }

    // Zawsze sortujemy od najstarszych do najnowszych (chronologicznie) dla lepszego widzenia trendów przez AI
    logsToAnalyze = logsToAnalyze.sort(
      (a, b) =>
        (a.timestamp || new Date(a.createdAt).getTime()) -
        (b.timestamp || new Date(b.createdAt).getTime()),
    );

    if (logsToAnalyze.length > MAX_MASTER_LOGS) {
      // Jeśli nadal jest za dużo (np. bardzo dużo wpisów important), obcinamy z przodu, zostawiając nowsze
      logsToAnalyze = logsToAnalyze.slice(-MAX_MASTER_LOGS);
    }

    const formattedLogs = logsToAnalyze.map((l) => ({
      typ: l.type,
      wartosc:
        typeof l.value === "number"
          ? l.type === "glucose"
            ? Math.round(l.value)
            : Number(l.value.toFixed(1))
          : l.value,
      czas: new Date(l.timestamp || l.createdAt).toLocaleString("pl-PL", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
    const dietInfo = settings?.activeDiet
      ? i18n.t('auto.dodatkowy_kontekst_uzytko', { defaultValue: "DODATKOWY KONTEKST: Użytkownik przebywa na diecie: {{var0}}. Skup się na ewaluacji jak ta dieta na niego działa, uwzględnij rekomendacje żywieniowe dla niej.", var0: settings.activeDiet })
      : "";
    const prompt = i18n.t('auto.jestes_zaawansowanym_syst', { defaultValue: "Jesteś zaawansowanym systemem analizy cukrzycy GlikoControl (GlikoSense). Otrzymujesz rozłożoną w czasie próbkę danych z OSTATNICH 15 DNI (łącznie {{var0}} rzadkich próbek obejmujących cały ten okres): {{var1}}. {{var2}}\n    Twoim zadaniem jest stworzenie JEDNEGO, KOMPLEKSOWEGO RAPORTU eksperckiego bazującego na PEŁNYCH 15 Dniach (nie skupiaj się tylko na ostatnich wpisach!).\n    Struktura raportu (używaj HTML: <b>, <ul>, <li>, <br>):\n    1. <b>Krótki przegląd ostatnich 15 dni</b>.\n    2. <b>Analiza trendów i wzorców</b> (kiedy cukier skacze, dlaczego, czy bolusy są trafne na przestrzeni ostatnich dwóch tygodni).\n    3. <b>Ocena długoterminowa</b> (przewidywane HbA1c, czas w zakresie).\n    4. <b>Konkretne rekomendacje</b> (co poprawić w diecie, dawkowaniu lub aktywności).\n    5. <b>Sugestie profili godzinowych</b> (zaproponuj konkretne przedziały czasowe i wartości ISF oraz WW Ratio na podstawie zaobserwowanych trendów - np. zwiększony ISF rano jeśli cukier rośnie).\n    Zwracaj uwagę na: nocne hipoglikemie, skoki po posiłkach, efektywność insuliny z CAŁEGO okresu. \n    Ważne: Odpowiadaj WYŁĄCZNIE i ZAWSZE w JĘZYKU POLSKIM. Piszesz po polsku. Bez formatowania markdown (gwiazdek (**) ani (###)).", var0: formattedLogs.length, var1: JSON.stringify(formattedLogs), var2: dietInfo });
    return this.generateContent(prompt);
  },

  async analyzeMeal(imageData: string, settings?: any) {
    const dietInfo = settings?.activeDiet
      ? i18n.t('auto.uwaga_uzytkownik_przestrz', { defaultValue: "UWAGA: Użytkownik przestrzega diety: {{var0}}. Zwróć szczególną uwagę jak ten posiłek wpisuje się w jej zasady.", var0: settings.activeDiet })
      : "";
    const prompt = i18n.t('auto.przeanalizuj_to_zdjecie_p', { defaultValue: "Przeanalizuj to zdjęcie posiłku. Wykryj składniki i oszacuj CAŁKOWITĄ orientacyjną wagę posiłku (w gramach). Następnie oszacuj CAŁKOWITĄ ilość węglowodanów (g), białek (g) i tłuszczy (g) W CAŁYM WIDOCZNYM POSIŁKU (nie na 100g, lecz w całej szacowanej porcji). Podaj również indeks glikemiczny (IG - POWINIEN BYĆ KONKRETNĄ LICZBĄ). Dodaj szczegółową analizę dla diabetyka (\"analysis\") - co zawiera posiłek i jak może wpłynąć na glikemię. {{var0}}\n    Zwróć odpowiedź absolutnie w formacie JSON (tylko czysty JSON, bez markdown):\n    {\n      \"mealName\": \"nazwa posiłku\",\n      \"weight\": 0,\n      \"carbs\": 0,\n      \"protein\": 0,\n      \"fat\": 0,\n      \"ig\": 0,\n      \"analysis\": \"Krótka analiza posiłku...\"\n    }", var0: dietInfo });

    try {
      const text = await this.generateContent(prompt, imageData);
      console.log("Raw AI vision response:", text);
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      let cleanJson = jsonMatch ? jsonMatch[0] : text;
      // usuwamy ewentualne wiodące znaki przed klamrami jeśli regex uchwycił za dużo
      cleanJson = cleanJson
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Gemini Vision Error in analyzeMeal:", error);
      throw error;
    }
  },

  async getBolusRecommendation(
    currentBg: number,
    currentCarbs: number,
    calculatedDose: number,
    trend: string,
    iob: number,
    cob: number,
    recentLogs: any[],
    settings?: any,
  ) {
    const formattedLogs = recentLogs.slice(0, 15).map((l) => ({
      typ: l.type,
      wartosc: l.value,
      czas: new Date(l.timestamp || l.createdAt).toLocaleString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
    const prompt = i18n.t('auto.jestes_ekspertem_diabetol', { defaultValue: "Jesteś ekspertem diabetologii systemu GlikoControl.\n    Zadanie: Przeanalizuj obecną sytuację pacjenta i oceń, czy sugerowana przez kalkulator dawka insuliny ({{var0}} j.) jest optymalna.\n\n    Sytuacja obecna:\n    - Glukoza: {{var1}} mg/dL\n    - Posiłek: {{var2}} g węglowodanów\n    - Trend: {{var3}}\n    - Aktywna insulina (IOB): {{var4}} j.\n    - Aktywne węglowodany (COB): {{var5}} g\n    - Dawka wyliczona z kalkulatora (matematycznie): {{var6}} j.\n\n    Najnowsze logi z historii (do analizy reakcji na poprzednie posiłki/bolusy): \n    {{var7}}\n\n    Przeanalizuj historię pod kątem Time In Range (TIR) - czy pacjent nie wpada po bolusach często w hipo/hiperglikemię. Zwróć wynik jako JSON (czysty JSON bez markdownu):\n    {\n      \"recommendedDose\": number,\n      \"reasoning\": \"Krótkie uzasadnienie po polsku (max 2 zdania)\",\n      \"confidence\": \"high\" | \"medium\" | \"low\"\n    }\n    \n    Zaproponuj ewentualną korektę (np. lekkie zmniejszenie jeśli pacjent miał hipo w ostatnich godzinach). Jeśli wyliczona dawka jest dobra, zwróć ją bez zmian.", var0: calculatedDose.toFixed(2), var1: currentBg, var2: currentCarbs, var3: trend, var4: iob.toFixed(2), var5: cob.toFixed(0), var6: calculatedDose.toFixed(2), var7: JSON.stringify(formattedLogs) });

    try {
      const text = await this.generateContent(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      let cleanJson = jsonMatch ? jsonMatch[0] : text;
      cleanJson = cleanJson
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
      const parsedResult = JSON.parse(cleanJson);

      if (settings && parsedResult && parsedResult.recommendedDose !== undefined) {
        const isf = settings.isf || 50;
        const wwRatio = settings.wwRatio || 10;
        const targetMin = settings.targetMin || 70;

        const safetyCheck = clampSafeBolus(
          parsedResult.recommendedDose,
          currentBg,
          currentCarbs,
          iob,
          cob,
          isf,
          wwRatio,
          targetMin
        );

        if (safetyCheck.capped) {
          parsedResult.recommendedDose = safetyCheck.safeDose;
          parsedResult.reasoning = i18n.t('auto.var0_oryginalny_powod_ai', { defaultValue: "{{var0}} Oryginalny powód AI: {{var1}}", var0: safetyCheck.reason, var1: parsedResult.reasoning });
        }
      }

      return parsedResult;
    } catch (error) {
      console.error("Gemini Bolus Rec Error:", error);
      return null;
    }
  },

  async getAiStatus() {
    const creds = await getApiKey();
    const hasKey = creds.key !== "proxy";
    const isProxy =
      creds.baseUrl === "https://diacontrol-ai.pixelozapolska.workers.dev";

    if (hasKey)
      return {
        type: "custom",
        label: i18n.t('auto.wlasny_klucz_local', { defaultValue: i18n.t('auto.wlasny_klucz_local', { defaultValue: "Własny Klucz (Local)" }) }),
        color: "text-indigo-500",
      };
    if (isProxy)
      return {
        type: "proxy",
        label: i18n.t('auto.serwer_gliko_domyslny', { defaultValue: i18n.t('auto.serwer_gliko_domyslny', { defaultValue: "Serwer Gliko (Domyślny)" }) }),
        color: "text-amber-500",
      };
    return {
      type: "project",
      label: "Klucz Projektu (Vite/Env)",
      color: "text-emerald-500",
    };
  },

  async getGlikoChatResponse(
    message: string,
    history: { role: "user" | "model"; parts: { text: string }[] }[],
    petData: any,
  ) {
    const petName = petData?.name || "Gliko";
    const petType = petData?.type || "standard";

    const lang = localStorage.getItem('i18nextLng') || 'pl';
    const langNote = lang.startsWith('en')
      ? "IMPORTANT: You MUST respond in English! Your tone and wording should be entirely English."
      : "IMPORTANT: You MUST respond in Polish!";

    const systemInstruction = i18n.t('auto.jestes_var0_wesolym_i_mad', { defaultValue: "Jesteś {{var0}} - wesołym i mądrym stworkiem (typ: {{var1}}), który opiekuje się dziećmi z cukrzycą. \n    Twoim zadaniem jest pomaganie im w zrozumieniu choroby, wspieranie ich i odpowiadanie na pytania w sposób przystępny dla dzieci (prosty język, dużo empatii, wesoły ton). \n    Pamiętaj, że rozmawiasz z dzieckiem (lub rodzicem). Twoje odpowiedzi powinny być wesołe i pełne otuchy (używaj emotikonów ✨, 🐾, 🍎). \n    Jeśli pytanie dotyczy bezpośrednio medycyny, zachęcaj do rozmowy z lekarzem. Twoja wiedza o aplikacji to GlikoControl:\n    - Baza wiedzy i jedzenia, weryfikacja produktów.\n    - Ustawienia: ISF (wrażliwość na insulinę), WW (przydzielenie węgli), WBT, Docelowy poziom glikemii, wibracje (haptyka).\n    - Talerz: posiłki i bolusy. Jeśli użytkownik chce coś dodać do wpisów, robisz to!\n    \n    BARDZO WAŻNE - DODAWANIE DO TALERZA ORAZ AKCJE APLIKACJI: \n    Masz pełną integrację z moją aplikacją. Możesz zmieniać jej stan za pomocą ukrytych tagów na samym końcu wypowiedzi.\n    \n    1. Aby dodać posiłek do Talerza:\n    <plate_action>{\"action\": \"add\", \"item\": {\"name\": \"Jabłko\", \"carbs\": 15, \"protein\": 1, \"fat\": 0, \"kcal\": 60}}</plate_action>\n    \n    2. Aby zmienić ustawienia (np. dzienna dawka insuliny/isf, wyłączenie haptyki):\n    Używaj tych kluczy: \"isf\", \"targetMin\", \"targetMax\", \"wwRatio\", \"hapticsEnabled\".\n    <app_action>{\"action\": \"set_setting\", \"key\": \"hapticsEnabled\", \"value\": false}</app_action>\n    \n    3. Aby bezpośrednio zapisać do historii cukier, bolus lub wymianę (\"zapisz cukier\", \"wymieniłem wkłucie\"):\n    <app_action>{\"action\": \"add_log\", \"logData\": {\"type\": \"bolus\", \"value\": 3, \"notes\": \"Zalecono przez Gliko\"}}</app_action>\n    <app_action>{\"action\": \"add_log\", \"logData\": {\"type\": \"site_change\", \"value\": 0, \"notes\": \"Wymiana wkłucia\"}}</app_action>\n    W logData.type może być \"bolus\", \"glucose\", \"site_change\", \"sensor_change\".\n    \n    4. Aby nawigować użykownika do odpowiedniej sekcji (\"Gdzie są ustawienia?\", \"Pokaż mój profil\", \"Idźmy do talerza\"):\n    <app_action>{\"action\": \"navigate\", \"value\": \"profile\"}</app_action> (dostepne: dashboard, profile, database, meal, history)\n    \n    Napisz użytkownikowi w wiadomości co właśnie zrobiłeś, tag ukryj na samym końcu!\n    \n    {{var2}}", var0: petName, var1: petType, var2: langNote });

    const creds = await getApiKey();
    const isProxyUrl =
      creds.baseUrl === "https://diacontrol-ai.pixelozapolska.workers.dev";

    const fullHistory = [
      ...history,
      { role: "user", parts: [{ text: message }] },
    ];

    if (isProxyUrl && creds.key === "proxy") {
      try {
        const response = await fetch(creds.baseUrl!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-flash-latest",
            payload: {
              contents: fullHistory,
              systemInstruction: {
                role: "system",
                parts: [{ text: systemInstruction }],
              },
            },
          }),
        });
        const data = await response.json();
        if (response.ok) {
          if (data.candidates && data.candidates[0]?.content)
            return data.candidates[0].content.parts
              .map((p: any) => p.text)
              .join("");
          if (data.text) return data.text;
          return typeof data === "string" ? data : JSON.stringify(data);
        }
        throw new Error(data.error?.message || "Proxy error");
      } catch (e) {
        console.error("Chat proxy error", e);
        return i18n.t('gemini.proxy_limit_error_chat', { defaultValue: i18n.t('auto.serwer_padnal_lub_jego_da', { defaultValue: "Serwer padnął lub jego darmowy limit się wyczerpał! ✨ Przejdź do Mój Profil -> Ustawienia Cukrzycowe -> Opcje Zaawansowane i wprowadź swój własny (darmowy) Klucz Gemini API! ✨" }) });
      }
    }

    const client = await getClient();
    const model = "gemini-flash-latest";

    try {
      const response = await client.models.generateContent({
        model: model,
        contents: fullHistory,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
        },
      });
      return (
        response.text ||
        i18n.t('gemini.belly_confused', { defaultValue: i18n.t('auto.ojej_cos_mi_sie_pomieszal', { defaultValue: "Ojej, coś mi się pomieszało w brzuszku! Spróbuj jeszcze raz! 🐾" }) })
      );
    } catch (error) {
      console.error("Gliko Chat Error:", error);
      // Fallback if SDK fails or rate limited
      return i18n.t('gemini.fell_asleep', { defaultValue: i18n.t('auto.przepraszam_chyba_na_chwi', { defaultValue: "Przepraszam, chyba na chwilę zasnąłem... Możesz powtórzyć? ✨" }) });
    }
  },

  generateMealPlan: async (
    dietName: string,
    tdee: number,
    days: number = 3,
    allergies?: string,
  ) => {
    let allergyContext = "";
    if (allergies) {
      allergyContext = i18n.t('auto.bezwzglednie_wyklucz_z_di', { defaultValue: "\nBEZWZGLĘDNIE WYKLUCZ Z DIETY ORAZ UWZGLĘDNIJ ALERGIE/PREFERENCJE UZTKOWNIKA: {{var0}}. To sprawa życia i śmierci, żaden ze składników posiłków nie może na to pozwalać.", var0: allergies });
    }

    const prompt = i18n.t('auto.jestes_dietetykiem_klinic', { defaultValue: "Jesteś dietetykiem klinicznym. Przygotuj {{var0}}-dniowy wprowadzający jadłospis dla diety: {{var1}}.\nCałodzienny jadłospis musi idealnie sumować się do {{var2}} kcal dziennie. \nUwzględnij odpowiedni rozkład makroskładników dla tej diety na układ posiłków (np. 3 lub 4 posiłki).\nBARDZO WAŻNE: Każdy posiłek MUSI bezwzględnie przestrzegać zasad diety: {{var3}}.{{var4}}\nSkładniki posiłków zostaną poddane ostrej weryfikacji pod kątem rygoru tej diety. Nie patrz tylko na kalorie! Jeśli generujesz Keto, węglowodany muszą być drastycznie bliskie zera. Jeśli DASH, drastycznie mało sodu (użyj typowych składników).\nKażdy posiłek musi zawierać instrukcję gotowania krok po kroku dodaną jako \"recipe\".\nOdpowiedz TYLKO I WYŁĄCZNIE poprawnym JSON-em (bez formatowania markdown ```json) z taką strukturą:\n{\n  \"summary\": \"Krótkie podsumowanie założeń...\",\n  \"days\": [\n    {\n      \"dayNumber\": 1,\n      \"totalKcal\": 2000,\n      \"meals\": [\n        {\n          \"type\": \"Śniadanie\",\n          \"name\": \"Jajecznica z awokado\",\n          \"kcal\": 500,\n          \"carbs\": 10,\n          \"protein\": 25,\n          \"fat\": 40,\n          \"description\": \"3 jajka, pół awokado, masło, pomidorki\",\n          \"recipe\": \"Krok 1: Wbij jajka. Krok 2: Usmaż na maśle. Krok 3: Dodaj awokado i pomidorki.\"\n        }\n      ]\n    }\n  ]\n}", var0: days, var1: dietName, var2: tdee, var3: dietName, var4: allergyContext });

    try {
      const text = await geminiService.generateContent(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      let cleanJson = jsonMatch ? jsonMatch[0] : text;
      cleanJson = cleanJson
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Meal Plan Error:", error);
      return null;
    }
  },

  generateReplacementMeal: async (
    dietName: string,
    tdeeTargetForMeal: number,
    type: string,
    allergies?: string,
  ) => {
    let allergyContext = "";
    if (allergies) {
      allergyContext = i18n.t('auto.bezwzglednie_wyklucz_z_di', { defaultValue: "\nBEZWZGLĘDNIE WYKLUCZ Z DIETY ORAZ UWZGLĘDNIJ ALERGIE/PREFERENCJE UZTKOWNIKA: {{var0}}.", var0: allergies });
    }

    const prompt = i18n.t('auto.jestes_dietetykiem_wygene', { defaultValue: "Jesteś dietetykiem. Wygeneruj rygorystyczny posiłek dla diety: {{var0}}.\nPosiłek to: {{var1}}. Talerz musi opiewać na około {{var2}} kcal.{{var3}}\n\nWymagany ścisły rygor diety {{var4}}. Nie ignoruj wytycznych proporcji makroskładników danej diety.\nOdpowiedz TYLKO JSON-em (żadnego dodatkowego tekstu).\n{\n  \"type\": \"{{var5}}\",\n  \"name\": \"Tytuł nowego dania\",\n  \"kcal\": {{var6}},\n  \"carbs\": 10,\n  \"protein\": 25,\n  \"fat\": 40,\n  \"description\": \"Krótki opis składników\",\n  \"recipe\": \"Krok po kroku instrukcja przyrządzania posiłku.\"\n}", var0: dietName, var1: type, var2: tdeeTargetForMeal, var3: allergyContext, var4: dietName, var5: type, var6: tdeeTargetForMeal });

    try {
      const text = await geminiService.generateContent(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      let cleanJson = jsonMatch ? jsonMatch[0] : text;
      cleanJson = cleanJson
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error("Meal Replace Error:", error);
      return null;
    }
  },

  async getAssistantResponse(
    message: string,
    history: any[],
    logs: any[],
    settings: any,
    currentStatus?: { iob: number; cob: number; glucose: number },
    insights?: string[],
  ) {
    const now = new Date();
    const twentyFourHoursAgo = new Date(
      now.getTime() - 24 * 60 * 60 * 1000,
    ).getTime();

    // Process logs: filter 24h, sort chronological, take last 100
    const lastLogs = logs
      .filter((l) => {
        const ts = new Date(l.timestamp || l.createdAt).getTime();
        return ts >= twentyFourHoursAgo;
      })
      .sort(
        (a, b) =>
          new Date(a.timestamp || a.createdAt).getTime() -
          new Date(b.timestamp || b.createdAt).getTime(),
      )
      .slice(-100)
      .map((l) => ({
        typ: l.type,
        wartosc: l.value,
        jednostka:
          l.type === "glucose"
            ? "mg/dL"
            : l.type === "meal"
              ? i18n.t('auto.g_wegli', { defaultValue: i18n.t('auto.g_wegli', { defaultValue: "g węgli" }) })
              : "j. insuliny",
        czas: new Date(l.timestamp || l.createdAt).toLocaleString("pl-PL", {
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "short",
        }),
      }));

    const isChild = settings?.childMode ?? false;

    const insightsStr =
      insights && insights.length > 0
        ? i18n.t('auto.najnowsze_wnioski_glikose', { defaultValue: "\nNAJNOWSZE WNIOSKI GLIKOSENSE (Dostępne analizy): \n- {{var0}}\n", var0: insights.join("\n- ") })
        : "";

    const activeDietStr = settings?.activeDiet
      ? i18n.t('auto.uwaga_uzytkownik_ma_aktyw', { defaultValue: "\nUWAGA! Użytkownik ma aktywną dietę: {{var0}}. WSZYSTKIE TWOJE ANALIZY I SUGESTIE POSIŁKOWE (i GlikoSense) MUSZĄ JĄ UWZGLĘDNIAĆ!", var0: settings.activeDiet })
      : "";

    const currentDataStr = currentStatus
      ? i18n.t('auto.aktualny_status_urzadzen', { defaultValue: "\n    AKTUALNY STATUS URZĄDZEŃ (Stan na: {{var0}}):\n    - Bieżąca glikemia: {{var1}} mg/dL (To jest najnowszy odczyt!)\n    - Aktywna insulina (IOB): {{var2}} j.\n    - Aktywne węglowodany (COB): {{var3}} g\n    {{var4}}{{var5}}\n    ", var0: now.toLocaleString("pl-PL"), var1: currentStatus.glucose, var2: currentStatus.iob.toFixed(2), var3: currentStatus.cob.toFixed(0), var4: insightsStr, var5: activeDietStr })
      : `AKTUALNY CZAS: ${now.toLocaleString("pl-PL")}\n${insightsStr}${activeDietStr}`;

    let medicalRulesStr = "";
    if (typeof window !== "undefined") {
      try {
        const rules = JSON.parse(localStorage.getItem('glikosense_medical_rules') || '{}');
        if (rules.pkParams) {
          medicalRulesStr = i18n.t('auto.osobnicze_tempo_wchlanian', { defaultValue: "\nOsobnicze tempo wchłaniania pacjenta: metabolizm \"{{var0}}\" (czas wchłaniania standardowych węglowodanów: {{var1}}h). Wykorzystaj to w swoich poradach dotyczących wchłaniania powołując się na system GlikoSense!", var0: rules.pkParams.label, var1: rules.pkParams.normalCarbDuration });
        }
      } catch(e) {}
    }

    const systemInstruction = isChild
      ? i18n.t('auto.jestes_smart_asystentem_g', { defaultValue: "Jesteś Smart Asystentem Gliko w aplikacji GlikoControl. \n    Twoim zadaniem jest pomaganie dzieciom i ich rodzicom w codziennym zarządzaniu cukrzycą w sposób przyjazny, cierpliwy i zachęcający. Posiadasz pełną integrację aplikacyjną (wiedz o ustawieniach, dziennikach itd.).\n    {{var0}}\n    MASZ DOSTĘP DO DANYCH UŻYTKOWNIKA (z ostatnich 24 godzin):\n    - Ostatnie logi: {{var1}}\n    - Ustawienia (ISF, WW): {{var2}}{{var3}}\n    \n    ZASADY ODPOWIADANIA:\n    1. BĄDŹ ZWIĘZŁY: Przy prostych zapytaniach ogranicz odpowiedź do minimum. Nie generuj długich raportów (tym zajmuje się system GlikoSense). Odpowiadaj maksymalnie zwięźle.\n    2. AKCJE Z APLIKACJĄ I ZARZĄDZANIE DANYMI: Możesz wykonywać akcje! Na samym końcu wiadomości możesz wpisać poniższe tagi:\n       ZAPISANIE BOLUSA LUB CUKRU (np. \"zapisz cukier 120\" albo \"zapisz bolus 3j\"): <app_action>{\"action\": \"add_log\", \"logData\": {\"type\": \"glucose\", \"value\": 120, \"notes\": \"Cukier z AI\"}}</app_action>\n       ZAPISANIE WYMIANY (wkłucie/sensor, np. \"wymieniłem wkłucie\"): <app_action>{\"action\": \"add_log\", \"logData\": {\"type\": \"site_change\", \"value\": 1, \"notes\": \"wymiana wkłucia\"}}</app_action> (type jako site_change/sensor_change)\n       ZMIANA USTAWIEŃ (np. wyłącz wibracje, zmień isf): <app_action>{\"action\": \"set_setting\", \"key\": \"isf\", \"value\": 30}</app_action>\n       NAWIGACJA (np. \"gdzie jest dzienniczek\", \"pokaż mi jedzenie\"): <app_action>{\"action\": \"navigate\", \"value\": \"history\"}</app_action> (dashboard, profile, database, meal, history)\n    3. INTERAKCJA Z TALERZEM: Jeśli użytkownik chce dodać jedzenie np. (\"dodaj jabłko\"): <plate_action>{\"action\": \"add\", \"item\": {\"name\": \"Jabłko\", \"carbs\": 15, \"protein\": 1, \"fat\": 0, \"kcal\": 60}}</plate_action>\n    4. Formatuj odpowiedzi używając HTML (<b>, <ul>, <li>). NIE używaj markdown. Pamiętaj by poinformować użytkownika, że akcja została pomyślnie wykonana.\n    5. Wspieraj dziecko: chwal za dobre wyniki, pocieszaj przy gorszych.\n    6. Język: Polski.", var0: currentDataStr, var1: JSON.stringify(lastLogs), var2: JSON.stringify(settings), var3: medicalRulesStr })
      : i18n.t('auto.jestes_eksperckim_systeme', { defaultValue: "Jesteś Eksperckim Systemem Analizy Medycznej AI (GlikoControl z pełną integracją).\n    {{var0}}\n    DANE UŻYTKOWNIKA (24h):\n    - Logi: {{var1}}\n    - Parametry: {{var2}}{{var3}}\n \n    ZASADY:\n    1. AKCJE I DOSTĘP: Użytkownik może poprosić o zapisanie pomiaru, bolusa, bądź zmianę ustawień aplikacji lub ułatwienie nawigacji w samej aplikacji. Robi to za sprawą niewidzialnych tagów w Twoich wiadomościach:\n       - BOLUS/CUKIER: <app_action>{\"action\": \"add_log\", \"logData\": {\"type\": \"bolus\", \"value\": 3, \"notes\": \"Korekta\"}}</app_action>\n       - USTAWIENIA (targetMin, isf, wwRatio, hapticsEnabled itp.): <app_action>{\"action\": \"set_setting\", \"key\": \"hapticsEnabled\", \"value\": false}</app_action>\n       - NAWIGACJA (np. \"skoczmy do talerza\" value=meal/history/dashboard): <app_action>{\"action\": \"navigate\", \"value\": \"meal\"}</app_action>\n       - ZJEDZONY POSIŁEK: <plate_action>{\"action\": \"add\", \"item\": {\"name\": \"Nazwa\", \"carbs\": 20, \"protein\": 5, \"fat\": 2, \"kcal\": 150}}</plate_action>\n    2. BĄDŹ BARDZO ZWIĘZŁY: Odpowiadaj krótko i na temat. Absolutnie NIE generuj długich raportów, analiz medycznych ani podsumowań - tym zajmuje się wbudowany system GlikoSense. Odpowiadaj krótko, chyba że użytkownik prosi o rozwinięcie.\n    3. HTML formatting (<b>, <ul>). Zapisz tagi na DOKŁADNYM KOŃCU response'a! Poinformuj w treści, że dokonałeś operacji na rzecz użytkownika.", var0: currentDataStr, var1: JSON.stringify(lastLogs), var2: JSON.stringify(settings), var3: medicalRulesStr });

    let fullContents = [
      ...history,
      { role: "user", parts: [{ text: message }] },
    ];

    // Safety checks for Gemini API:
    // 1. Must alternate 'user' and 'model'
    // 2. Must start with 'user'
    let validContents = [];
    let expectedRole = "user";

    // We traverse from end to start to keep the most recent messages, ensuring the last is 'user'
    for (let i = fullContents.length - 1; i >= 0; i--) {
      if (fullContents[i].role === expectedRole) {
        validContents.unshift(fullContents[i]);
        expectedRole = expectedRole === "user" ? "model" : "user";
      } else if (fullContents[i].role === "user" && expectedRole === "user") {
        // Consecutive user messages? Merge them or just keep the latest user message
        // Here we just ignore older consecutive messages to maintain alternation
      }
    }

    // If we wound up with a first message being 'model', remove it (shouldn't happen with the logic above unless we added something weird)
    if (validContents.length > 0 && validContents[0].role !== "user") {
      validContents.shift();
    }

    fullContents = validContents;

    const creds = await getApiKey();
    const isProxyUrl =
      creds.baseUrl === "https://diacontrol-ai.pixelozapolska.workers.dev";

    if (isProxyUrl && creds.key === "proxy") {
      try {
        const response = await fetch(creds.baseUrl!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-flash-latest",
            payload: {
              contents: fullContents,
              systemInstruction: {
                role: "system",
                parts: [{ text: systemInstruction }],
              },
            },
          }),
        });
        const data = await response.json();
        if (response.ok) {
          if (data.candidates && data.candidates[0]?.content)
            return data.candidates[0].content.parts
              .map((p: any) => p.text)
              .join("");
          if (data.text) return data.text;
          return typeof data === "string" ? data : JSON.stringify(data);
        }
        throw new Error(data.error?.message || "Proxy error");
      } catch (e) {
        console.error("Assistant proxy error", e);
        return i18n.t('gemini.proxy_limit_error_assistant', { defaultValue: i18n.t('auto.serwer_padnal_lub_jego_li', { defaultValue: "Serwer padnął lub jego limit się wyczerpał. Przejdź do: Mój Profil -> Ustawienia Cukrzycowe -> Opcje Zaawansowane i wprowadź swój własny Klucz Gemini API." }) });
      }
    }

    const client = await getClient();
    const modelsToTry = [
      "gemini-flash-latest",
      "gemini-2.5-flash",
      "gemini-pro-latest",
    ];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const response = await client.models.generateContent({
          model: model,
          contents: fullContents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.4,
          },
        });
        return response.text || i18n.t('gemini.response_generation_failed', { defaultValue: i18n.t('auto.nie_udalo_mi_sie_wygenero', { defaultValue: "Nie udało mi się wygenerować odpowiedzi." }) });
      } catch (error) {
        console.warn(i18n.t('auto.assistant_blad_dla_modelu', { defaultValue: "Assistant - błąd dla modelu {{var0}}:", var0: model }), error);
        lastError = error;
      }
    }

    console.error("Assistant API Error:", lastError);
    return i18n.t('gemini.ai_communication_error', { defaultValue: i18n.t('auto.wystapil_blad_podczas_kom', { defaultValue: "Wystąpił błąd podczas komunikacji z AI. Sprawdź swoje połączenie lub klucz API." }) });
  },

  async translateProduct(name: string): Promise<{ namePl: string, nameEn: string }> {
    const prompt = `Translate this product name to both Polish and English. Return ONLY a valid JSON object in this exact format, nothing else: {"namePl": "Polish name", "nameEn": "English name"}. Product name: "${name}"`;
    const result = await this.generateContent(prompt);
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn("Failed to parse translated product", e);
    }
    // Fallback to original name
    return { namePl: name, nameEn: name };
  }
};
