import express from "express";
import { createServer as createViteServer } from "vite";
import * as path from "path";
import admin from "firebase-admin";
import crypto from "crypto";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

const RP_ID = process.env.VITE_APP_DOMAIN || 'localhost';
const RP_NAME = 'Gliko Passkeys';

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
    res.json({ status: "ok" });
  });

  // Global security and permissions headers to enable WebAuthn
  app.use((req, res, next) => {
    // Explicitly allow WebAuthn in this document and delegate if needed
    // Using * to cover all bases in proxied/AI Studio environments
    res.setHeader('Permissions-Policy', 'publickey-credentials-create=*, publickey-credentials-get=*, camera=*, microphone=*');
    // Feature-Policy is legacy but still used by some browsers/environments
    res.setHeader('Feature-Policy', 'publickey-credentials-create *; publickey-credentials-get *; camera *; microphone *');
    
    next();
  });

  // ========== WEBAUTHN ENDPOINTS ========== //

  // 1. Generate Registration Options (Requires Auth)
  app.post("/api/webauthn/register-options", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
      const token = authHeader.split(" ")[1];
      const decoded = await admin.auth().verifyIdToken(token);
      const user = await admin.auth().getUser(decoded.uid);

      if (!db) return res.status(500).json({ error: "DB not connected" });

      const userAuthenticators = await db.collection(`/artifacts/diacontrolapp/users/${decoded.uid}/authenticators`).get();
      const excludeCredentials = userAuthenticators.docs.map(doc => ({
        id: doc.id,
        transports: doc.data().transports,
      }));

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: req.hostname === 'localhost' ? 'localhost' : req.hostname,
        userID: Buffer.from(decoded.uid),
        userName: user.email || decoded.uid,
        attestationType: 'none',
        excludeCredentials,
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform',
        },
      });

      // Store challenge in DB
      await db.doc(`/artifacts/diacontrolapp/webauthnChallenges/${decoded.uid}`).set({
        challenge: options.challenge,
        expiresAt: Date.now() + 60000, 
      });

      res.json(options);
    } catch (e) {
      console.error("WebAuthn register-options error", e);
      res.status(500).json({ error: "Failed to generate registration options" });
    }
  });

  // 2. Verify Registration Response (Requires Auth)
  app.post("/api/webauthn/register-verify", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
      const token = authHeader.split(" ")[1];
      const decoded = await admin.auth().verifyIdToken(token);

      const body: RegistrationResponseJSON = req.body;
      if (!db) return res.status(500).json({ error: "DB not connected" });

      const challengeDoc = await db.doc(`/artifacts/diacontrolapp/webauthnChallenges/${decoded.uid}`).get();
      if (!challengeDoc.exists) return res.status(400).json({ error: "Challenge not found" });
      const { challenge, expiresAt } = challengeDoc.data()!;
      if (Date.now() > expiresAt) return res.status(400).json({ error: "Challenge expired" });

      const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: challenge,
        expectedOrigin: `${req.protocol}://${req.get('host')}`,
        expectedRPID: req.hostname === 'localhost' ? 'localhost' : req.hostname,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential, deviceType, backedUp } = (verification.registrationInfo as any);
        const { id, publicKey, counter } = credential;
        
        const credentialIdBase64 = Buffer.from(id).toString('base64url');
        const publicKeyBase64 = Buffer.from(publicKey).toString('base64url');
        
        // Store the new authenticator
        await db.doc(`/artifacts/diacontrolapp/users/${decoded.uid}/authenticators/${credentialIdBase64}`).set({
          credentialID: credentialIdBase64,
          credentialPublicKey: publicKeyBase64,
          counter,
          credentialDeviceType: deviceType,
          credentialBackedUp: backedUp,
          transports: body.response.transports || [],
          createdAt: Date.now()
        });

        await db.doc(`/artifacts/diacontrolapp/webauthnChallenges/${decoded.uid}`).delete();
        res.json({ verified: true });
      } else {
        res.status(400).json({ verified: false, error: "Verification failed" });
      }
    } catch (e) {
      console.error("WebAuthn register-verify error", e);
      res.status(500).json({ error: "Failed to verify registration" });
    }
  });

  // 3. Generate Authentication Options (Login)
  app.post("/api/webauthn/login-options", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });
      if (!db) return res.status(500).json({ error: "DB not connected" });

      const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);
      if (!userRecord) return res.status(404).json({ error: "User not found" });

      const userAuthenticators = await db.collection(`/artifacts/diacontrolapp/users/${userRecord.uid}/authenticators`).get();
      if (userAuthenticators.empty) return res.status(400).json({ error: "No passkeys registered for this user" });

      const options = await generateAuthenticationOptions({
        rpID: req.hostname === 'localhost' ? 'localhost' : req.hostname,
        allowCredentials: userAuthenticators.docs.map(doc => ({
          id: doc.data().credentialID,
          type: 'public-key' as const,
          transports: doc.data().transports,
        })),
        userVerification: 'preferred',
      });

      // Store challenge indexed by a temporary ID (we could use email or a random ID)
      const loginChallengeId = crypto.randomUUID();
      await db.doc(`/artifacts/diacontrolapp/webauthnChallenges/${loginChallengeId}`).set({
        challenge: options.challenge,
        userId: userRecord.uid,
        expiresAt: Date.now() + 60000,
      });

      res.json({ ...options, loginChallengeId });
    } catch (e) {
      console.error("WebAuthn login-options error", e);
      res.status(500).json({ error: "Failed to generate login options" });
    }
  });

  // 4. Verify Authentication Response (Login)
  app.post("/api/webauthn/login-verify", async (req, res) => {
    try {
      const { response, loginChallengeId } = req.body;
      if (!response || !loginChallengeId) return res.status(400).json({ error: "Missing data" });
      if (!db) return res.status(500).json({ error: "DB not connected" });

      const challengeDoc = await db.doc(`/artifacts/diacontrolapp/webauthnChallenges/${loginChallengeId}`).get();
      if (!challengeDoc.exists) return res.status(400).json({ error: "Challenge not found" });
      const { challenge, userId, expiresAt } = challengeDoc.data()!;
      if (Date.now() > expiresAt) return res.status(400).json({ error: "Challenge expired" });

      const body: AuthenticationResponseJSON = response;
      const authenticatorDoc = await db.doc(`/artifacts/diacontrolapp/users/${userId}/authenticators/${body.id}`).get();
      if (!authenticatorDoc.exists) return res.status(400).json({ error: "Authenticator not found" });
      const authenticator = authenticatorDoc.data()!;

      const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: challenge,
        expectedOrigin: `${req.protocol}://${req.get('host')}`,
        expectedRPID: req.hostname === 'localhost' ? 'localhost' : req.hostname,
        credential: {
          id: authenticator.credentialID,
          publicKey: Buffer.from(authenticator.credentialPublicKey, 'base64url'),
          counter: authenticator.counter,
          transports: authenticator.transports,
        },
      });

      if (verification.verified) {
        // Update counter
        await db.doc(`/artifacts/diacontrolapp/users/${userId}/authenticators/${body.id}`).update({
          counter: verification.authenticationInfo.newCounter,
        });

        // Generate Firebase custom token
        const customToken = await admin.auth().createCustomToken(userId);
        
        await db.doc(`/artifacts/diacontrolapp/webauthnChallenges/${loginChallengeId}`).delete();
        res.json({ verified: true, customToken });
      } else {
        res.status(400).json({ verified: false, error: "Verification failed" });
      }
    } catch (e) {
      console.error("WebAuthn login-verify error", e);
      res.status(500).json({ error: "Failed to verify login" });
    }
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
