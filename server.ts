// server.ts

/**
 * Serveur minimal InstaWear pour Vercel
 * - API Gemini (génération IA)
 * - Sert l'app React en production
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY || "";
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
}

app.use(express.json({ limit: "10mb" }));

// ── API Gemini ──────────────────────────────────────────────────────────
app.post("/api/gemini/generate-description", async (req, res) => {
  const { prompt, category, eventType, style } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "Prompt manquant." });
    return;
  }

  if (!ai) {
    res.status(503).json({
      error: "Service IA non configuré.",
      demoFallback: {
        title: `T-Shirt "${prompt.toUpperCase()}"`,
        description: `Design événementiel ${eventType} de style ${style}.`,
        tags: [eventType || "festival", "tshirt", "custom"],
      },
    });
    return;
  }

  try {
    const systemInstruction = `Tu es le copywriter de la marque InstaWear. Génère un JSON avec "title", "description" (avec puces) et "tags" (5 mots-clés). Contexte : catégorie "${category}", événement "${eventType}", style "${style}".`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // version mise à jour
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["title", "description", "tags"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err: any) {
    console.error("Erreur Gemini:", err);
    res.status(500).json({ error: "Erreur IA", details: err.message });
  }
});

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
