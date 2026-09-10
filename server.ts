// server.ts

/**
 * Serveur minimal InstaWear pour Vercel
 * - Sert l'app React en production
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
// const PORT = 3000;
const PORT = parseInt(process.env.PORT || "3000", 10); // fonction pour tenter plusieurs ports si le premier est occupé

app.use(express.json({ limit: "10mb" }));

// ── Démarrage ───────────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[InstaWear] Serveur prêt sur le port ${PORT}`);
  });
}

startServer();
