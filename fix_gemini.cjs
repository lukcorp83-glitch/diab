const fs = require('fs');
const file = 'C:/Users/luk/Downloads/diab/src/services/gemini.ts';
let content = fs.readFileSync(file, 'utf8');

// Szukamy bloku dla generateContent
const generateContentRegex = /for \(const model of modelsToTry\) \{\s*try \{\s*console\.log\(i18n\.t\('auto\.proba_uzycia_modelu_var0'[\s\S]*?const result = await Promise\.race\(\[\s*client\.models\.generateContent\(\{[\s\S]*?\}\),\s*new Promise<never>\(\(_, reject\) => \{[\s\S]*?\}\),\s*\]\);/g;

// Wymieniamy na blok sprawdzający, czy isProxyUrl, i uruchamiający fetch w razie potrzeby
const replacement = `if (isProxyUrl && creds.key === "proxy") {
        const CLOUDFLARE_WORKER_URL = creds.baseUrl;
        const payload = { contents };
        for (const model of modelsToTry) {
          try {
            console.log(i18n.t('auto.proba_uzycia_modelu_proxy', { defaultValue: "Próba użycia modelu (Proxy): {{var0}}...", var0: model }));
            const response = await fetch(CLOUDFLARE_WORKER_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ model: model, payload: payload }),
            });
            const data = await response.json();
            if (response.ok) {
              console.log(\`Sukces z modelem (Proxy): \${model}\`);
              if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                return data.candidates[0].content.parts.map(p => p.text).join("") || "";
              } else if (data.text) {
                return data.text;
              }
              return typeof data === "string" ? data : JSON.stringify(data);
            }
            throw new Error(data.error?.message || "Proxy Error");
          } catch (error) {
            console.warn("Proxy model failed", error);
          }
        }
        throw new Error("Wszystkie modele AI(Proxy) są obecnie zajęte.");
      }

      for (const model of modelsToTry) {
        try {
          console.log(i18n.t('auto.proba_uzycia_modelu_var0', { defaultValue: "Próba użycia modelu: {{var0}}...", var0: model }));

          // Race the actual call against a Rejecting Promise wrapped in timeout
          const result = await Promise.race([
            client.models.generateContent({`;

if (content.match(generateContentRegex)) {
  content = content.replace(generateContentRegex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully updated gemini.ts!');
} else {
  console.log('Regex did not match!');
}
