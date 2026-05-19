import express from "express";
import { createServer as createViteServer } from "vite";
import * as path from "path";
import admin from "firebase-admin";
import crypto from "crypto";

// ... existing Firebase Admin init ...
// Users need to configure FIREBASE_SERVICE_ACCOUNT in the settings panel format: '{"project_id": "...", ...}'
let db: admin.firestore.Firestore | null = null;
try {
  let cert;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    cert = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT is missing. Fallback to Application Default Credentials.");
  }
  
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: cert ? admin.credential.cert(cert) : admin.credential.applicationDefault()
    });
  }
  db = admin.firestore();
  console.log("Firebase Admin Initialized successfully.");
} catch (e) {
  console.error("Failed to initialize Firebase Admin:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy is important for correct req.hostname/protocol in AI Studio
  app.set("trust proxy", true);

  // Needed for receiving xDrip payloads (often in JSON)
  app.use(express.json());

  // Health route
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      hostname: req.hostname, 
      protocol: req.protocol,
      originalUrl: req.originalUrl,
      trustProxy: app.get("trust proxy")
    });
  });

  // API route to manage API secrets securely (Admin SDK bypasses broken rules)
  app.post("/api/server/apiSecrets", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing token" });
      }
      
      const token = authHeader.split(" ")[1];
      const decoded = await admin.auth().verifyIdToken(token);
      
      const { newHash, oldHash, userId } = req.body;
      
      if (!db) return res.status(500).json({ error: "Firebase DB not connected" });
      
      if (oldHash) {
        await db.doc(`/artifacts/diacontrolapp/apiSecrets/${oldHash}`).delete();
      }
      
      if (newHash) {
        await db.doc(`/artifacts/diacontrolapp/apiSecrets/${newHash}`).set({
          userId: decoded.uid,
          createdAt: Date.now()
        });
      }
      
      res.json({ success: true });
    } catch(e) {
      console.error("Failed executing apiSecrets action", e);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // ========== NIGHTSCOUT COMPATIBILITY API ========== //
  app.post("/api/v1/entries", async (req, res) => {
    // xDrip+ sends an array of entries or a single entry
    const secretHash = req.headers['api-secret'] || req.headers['x-nitroscalenid']; // standard or fallback

    if (!secretHash || typeof secretHash !== 'string') {
      return res.status(401).json({ error: "Missing or invalid api-secret header" });
    }

    if (!db) {
      return res.status(500).json({ error: "Firebase DB not connected" });
    }

    try {
      // Find the user mapping for this hashed secret
      const mappingDoc = await db.doc(`/artifacts/diacontrolapp/apiSecrets/${secretHash}`).get();
      
      if (!mappingDoc.exists) {
        return res.status(401).json({ error: "Unauthorized: Invalid API Secret" });
      }

      const userId = mappingDoc.data()?.userId;
      if (!userId) {
        return res.status(500).json({ error: "Invalid mapping document" });
      }

      let entries = req.body;
      if (!Array.isArray(entries)) {
        entries = [entries];
      }

      const batch = db.batch();
      let count = 0;

      for (const entry of entries) {
        if (!entry.type && !entry.sgv) continue; // Skip invalid entries

        const bgValue = entry.sgv || entry.value;
        const timestamp = entry.date || new Date().getTime();
        
        let type = 'glucose';
        // Some Nightscout entries might have 'mbg' etc, but xDrip typical push is just sgv
        if (entry.type === 'mbg') type = 'glucose';

        const customId = crypto.randomUUID();
        const logsRef = db.doc(`/artifacts/diacontrolapp/users/${userId}/logs/${customId}`);
        
        const savePayload: any = {
          type,
          value: Number(bgValue),
          timestamp: Number(timestamp),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Standard direction map from NS
        if (entry.direction) {
          savePayload.direction = entry.direction;
        }

        batch.set(logsRef, savePayload);
        count++;
      }

      await batch.commit();

      console.log(`[Nightscout API] Successfully received & saved ${count} entries for user ${userId}`);
      res.status(200).json({ status: "ok", processed: count });

    } catch (e) {
      console.error("Error processing Nightscout /api/v1/entries:", e);
      res.status(500).json({ error: "Server error" });
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
    // Production Fallback
    const distPath = path.join(process.cwd(), 'dist');
    
    // Support serving from both root and /diab for testing
    app.use('/diab', express.static(distPath));
    app.use(express.static(distPath));
    
    app.get(['/diab/*', '*'], (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
