var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var path = __toESM(require("path"), 1);
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var db = null;
try {
  let cert;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    cert = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    console.warn("\u26A0\uFE0F FIREBASE_SERVICE_ACCOUNT is missing. Fallback to Application Default Credentials.");
  }
  if (import_firebase_admin.default.apps.length === 0) {
    import_firebase_admin.default.initializeApp({
      credential: cert ? import_firebase_admin.default.credential.cert(cert) : import_firebase_admin.default.credential.applicationDefault()
    });
  }
  db = import_firebase_admin.default.firestore();
  console.log("Firebase Admin Initialized successfully.");
} catch (e) {
  console.error("Failed to initialize Firebase Admin:", e);
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.set("trust proxy", true);
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hostname: req.hostname,
      protocol: req.protocol,
      originalUrl: req.originalUrl,
      trustProxy: app.get("trust proxy")
    });
  });
  app.get(["/pobierz/glikocontrol.apk", "/diab/pobierz/glikocontrol.apk"], (req, res) => {
    const isProd = process.env.NODE_ENV === "production";
    const dirName = isProd ? "dist" : "public";
    const filePath = path.join(process.cwd(), dirName, "pobierz/glikocontrol.apk");
    console.log(`[APK Download] Serving from path: ${filePath}`);
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", 'attachment; filename="glikocontrol.apk"');
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("[APK Download] Failed to send APK file:", err);
        if (!res.headersSent) {
          res.status(404).send("Wyst\u0105pi\u0142 b\u0142\u0105d: brak pliku APK na serwerze.");
        }
      }
    });
  });
  app.post("/api/server/apiSecrets", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing token" });
      }
      const token = authHeader.split(" ")[1];
      const decoded = await import_firebase_admin.default.auth().verifyIdToken(token);
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
    } catch (e) {
      console.error("Failed executing apiSecrets action", e);
      res.status(500).json({ error: "Internal error" });
    }
  });
  app.post("/api/v1/entries", async (req, res) => {
    const secretHash = req.headers["api-secret"] || req.headers["x-nitroscalenid"];
    if (!secretHash || typeof secretHash !== "string") {
      return res.status(401).json({ error: "Missing or invalid api-secret header" });
    }
    if (!db) {
      return res.status(500).json({ error: "Firebase DB not connected" });
    }
    try {
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
        if (!entry.type && !entry.sgv) continue;
        const bgValue = entry.sgv || entry.value;
        const timestamp = entry.date || (/* @__PURE__ */ new Date()).getTime();
        let type = "glucose";
        if (entry.type === "mbg") type = "glucose";
        const customId = import_crypto.default.randomUUID();
        const logsRef = db.doc(`/artifacts/diacontrolapp/users/${userId}/logs/${customId}`);
        const savePayload = {
          type,
          value: Number(bgValue),
          timestamp: Number(timestamp),
          createdAt: import_firebase_admin.default.firestore.FieldValue.serverTimestamp()
        };
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use("/diab", import_express.default.static(distPath));
    app.use(import_express.default.static(distPath));
    app.get(["/diab/*", "*"], (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
