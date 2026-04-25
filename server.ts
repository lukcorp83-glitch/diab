import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' })); // Increased limit for image uploads

  // Lazy Firebase Admin Initialization
  let firebaseAdminApp: admin.app.App | null = null;

  function getFirebaseAdmin() {
    if (!firebaseAdminApp) {
      const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!serviceAccountVar) {
        console.warn("FIREBASE_SERVICE_ACCOUNT is not defined. Server-side Firebase features may be limited.");
        return null;
      }

      try {
        const serviceAccount = JSON.parse(serviceAccountVar);
        firebaseAdminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully.");
      } catch (error) {
        console.error("Failed to initialize Firebase Admin:", error);
        return null;
      }
    }
    return firebaseAdminApp;
  }

  // Example API route using Firebase Admin
  app.get("/api/health", (req, res) => {
    const adminApp = getFirebaseAdmin();
    res.json({ 
      status: "ok", 
      firebaseAdmin: !!adminApp 
    });
  });

  // Nightscout Proxy to bypass CORS
  app.get("/api/nightscout-proxy", async (req, res) => {
    const { url, path: apiPath } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "Missing Nightscout URL" });
    }

    try {
      const baseUrl = url.replace(/\/$/, '');
      const targetUrl = `${baseUrl}${apiPath || ''}`;
      let finalUrl = targetUrl;
      const secret = req.headers['api-secret'];
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      if (secret && typeof secret === 'string') {
        let hashedSecret = secret;
        // Nightscout expects SHA-1 hash of the secret if it's the admin API_SECRET
        if (!/^[a-f0-9]{40}$/i.test(secret) && !secret.includes('-')) {
             const crypto = await import('crypto');
             hashedSecret = crypto.createHash('sha1').update(secret).digest('hex');
             headers['api-secret'] = hashedSecret;
        } else {
             headers['api-secret'] = secret;
             // If it's a token (usually contains a dash), also append to URL
             if (secret.includes('-')) {
                 const separator = finalUrl.includes('?') ? '&' : '?';
                 finalUrl = `${finalUrl}${separator}token=${secret}`;
             }
        }
      }
      
      console.log(`Proxying request to: ${finalUrl}`);
      
      const response = await fetch(finalUrl, { headers });
      if (!response.ok) {
        throw new Error(`Nightscout responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Nightscout Proxy Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal Server Error" });
    }
  });

  // Gemini AI Proxy
  app.post("/api/ai-analyze", async (req, res) => {
    const { prompt, imageData, model = "gemini-3-flash-preview" } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    try {
      const genAI = new GoogleGenAI(apiKey);
      const aiModel = genAI.getGenerativeModel({ model });

      let contents;
      if (imageData) {
        // Image analysis
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
        // Text only
        contents = [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ];
      }

      const result = await aiModel.generateContent({ contents });
      const response = await result.response;
      const text = response.text();
      
      res.json({ text });
    } catch (error) {
      console.error("Gemini Proxy Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "AI Analysis failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
