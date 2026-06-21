/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { Product, PrintfulSettings } from "./src/types";
import assets from "./data/assets.json" with { type: "json" };
import { DEFAULT_PRODUCTS } from "./src/data/defaultProducts";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Ensure local persistence directories exist
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// Initialize local data files
if (!fs.existsSync(PRODUCTS_FILE)) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2), "utf8");
}

if (!fs.existsSync(SETTINGS_FILE)) {
  const initialSettings: PrintfulSettings = {
    apiKey: "",
    isConnected: false,
    storeName: "Ma Super Boutique InstaWear",
    syncStatus: "idle",
    productsSyncedCount: 0,
  };
  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(initialSettings, null, 2),
    "utf8",
  );
}

// Helpers to read/write persistent data
function readProducts(): Product[] {
  try {
    const fileContent = fs.readFileSync(PRODUCTS_FILE, "utf8");
    const customProducts = JSON.parse(fileContent) as Product[];
    return [...DEFAULT_PRODUCTS, ...customProducts];
  } catch (error) {
    console.error(
      "Error reading products file, returning default ones:",
      error,
    );
    return DEFAULT_PRODUCTS;
  }
}

function writeProducts(customProducts: Product[]): void {
  fs.writeFileSync(
    PRODUCTS_FILE,
    JSON.stringify(customProducts, null, 2),
    "utf8",
  );
}

function readSettings(): PrintfulSettings {
  try {
    const fileContent = fs.readFileSync(SETTINGS_FILE, "utf8");
    return JSON.parse(fileContent) as PrintfulSettings;
  } catch (error) {
    console.error("Error reading settings files:", error);
    return {
      apiKey: "",
      isConnected: false,
      storeName: "Ma Super Boutique InstaWear",
      syncStatus: "idle",
      productsSyncedCount: 0,
    };
  }
}

function writeSettings(settings: PrintfulSettings): void {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}

// Initialize Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY || "";
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Middlewares
app.use(express.json({ limit: "10mb" }));

// ---- API ENDPOINTS ----

/**
 * GET /api/products
 * Fetch all available products (static defaults + user custom creations)
 */
app.get("/api/products", (req, res) => {
  const allProducts = readProducts();
  res.json(allProducts);
});

/**
 * POST /api/products
 * Create a new custom apparel design (Print on Demand)
 */
app.post("/api/products", (req, res) => {
  try {
    const newDesign = req.body;
    if (!newDesign.title || !newDesign.category || !newDesign.eventType) {
      res.status(400).json({ error: "Missing mandatory design fields" });
      return;
    }

    const fileContent = fs.readFileSync(PRODUCTS_FILE, "utf8");
    const customProducts = JSON.parse(fileContent) as Product[];

    // Map input to rich Product model structure
    const mappedProduct: Product = {
      id: `custom-prod-${Date.now()}`,
      title: newDesign.title,
      brand: "INSTAWEAR CREATOR",
      description:
        newDesign.description ||
        "Nouveau design personnalisé prêt pour impression.",
      fullDescription:
        newDesign.fullDescription ||
        `• Design créé sur mesure\n• Impression à la demande\n• Coton peigné qualitatif`,
      price: Number(newDesign.price) || 24.99,
      originalPrice: Number(newDesign.price)
        ? Number(newDesign.price) * 1.5
        : 39.99,
      image: newDesign.image || assets.PLACEHOLDER_IMG,
      gallery: [newDesign.image || assets.PLACEHOLDER_IMG],
      colors:
        newDesign.colors && newDesign.colors.length > 0
          ? newDesign.colors
          : ["#FFFFFF", "#1E1E1E"],
      colorNames:
        newDesign.colorNames && newDesign.colorNames.length > 0
          ? newDesign.colorNames
          : ["Blanc", "Noir"],
      sizes: ["S", "M", "L", "XL"],
      ratings: { score: 5.0, count: 1 },
      boughtLastMonth: 0,
      tags: newDesign.tags || [],
      eventType: newDesign.eventType,
      category: newDesign.category,
      style: newDesign.style || "street",
    };

    customProducts.unshift(mappedProduct);
    writeProducts(customProducts);

    res.status(201).json(mappedProduct);
  } catch (error) {
    console.error("Error creating custom product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

/**
 * DELETE /api/products/:id
 * Delete a custom design
 */
app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  try {
    const fileContent = fs.readFileSync(PRODUCTS_FILE, "utf8");
    const customProducts = JSON.parse(fileContent) as Product[];
    const filtered = customProducts.filter((p) => p.id !== id);
    writeProducts(filtered);
    res.json({ success: true, message: "Custom design deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

/**
 * POST /api/gemini/generate-description
 * Calls Gemini client server-side to generate SEO title, description and tags
 * from design raw concept.
 */
app.post("/api/gemini/generate-description", async (req, res) => {
  const { prompt, category, eventType, style } = req.body;

  if (!prompt) {
    res
      .status(400)
      .json({ error: "Veuillez fournir une idée de design pour l'IA." });
    return;
  }

  if (!ai) {
    res.status(503).json({
      error:
        "Le service d'intelligence artificielle Gemini n'est pas initialisé. Veuillez configurer la clé de secrets dans l'onglet Settings > Secrets.",
      demoFallback: {
        title: `T-Shirt Premium "${prompt.toUpperCase()}"`,
        description: `Ce superbe vêtement célèbre l'événement ${eventType}. Un graphisme unique d'inspiration ${style} dessiné avec goût.\n• Coton brossé de qualité supérieure\n• Confort respirant et coutures renforcées.`,
        tags: [eventType || "festival", "tshirt", "custom", "ai-design"],
      },
    });
    return;
  }

  try {
    const systemInstruction = `Tu es le copywriter officiel haut de gamme de la marque InstaWear, une boutique moderne de vêtements Print-on-Demand (t-shirts, hoodies, tasses, accessoires) célébrant les événements mondiaux (sport, musique, culture).
Génère une réponse structurée au format JSON contenant :
- "title": Un titre accrocheur, court et optimisé pour le SEO (en Français).
- "description": Une description commerciale captivante et persuasive rédigée en Français dans l'esprit AliExpress/Amazon avec des puces descriptives claires pour les matériaux, l'impression, la coupe.
- "tags": Une liste de 5 mots-clés (tags) pertinents par rapport au produit et au type d'événement pour le référencement.

Contexte produit : catégorie "${category}", événement "${eventType}", style artistique "${style}".`;

    const userPrompt = `Rédige le contenu pour ce design d'apparence ou d'idée : "${prompt}".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Titre SEO du produit",
            },
            description: {
              type: Type.STRING,
              description:
                "Description de style commerce riche en détails et listes à puces.",
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "5 mots clefs importants",
            },
          },
          required: ["title", "description", "tags"],
        },
      },
    });

    const outputText = response.text || "";
    const parsedResult = JSON.parse(outputText.trim());
    res.json(parsedResult);
  } catch (err: any) {
    console.error("Error generating AI description:", err);
    res.status(500).json({
      error: "Erreur lors de la génération avec l'IA.",
      details: err.message,
    });
  }
});

/**
 * GET /api/printful/settings
 * Retrieve current Printful/Printify connection status
 */
app.get("/api/printful/settings", (req, res) => {
  const settings = readSettings();
  res.json(settings);
});

/**
 * POST /api/printful/settings
 * Configure printful API credentials
 */
app.post("/api/printful/settings", (req, res) => {
  try {
    const { apiKey, storeName } = req.body;
    const settings = readSettings();

    settings.apiKey = apiKey || "";
    settings.storeName = storeName || "My Custom InstaWear Shop";
    settings.isConnected = settings.apiKey.length > 5;
    settings.syncStatus = settings.isConnected ? "synced" : "idle";

    writeSettings(settings);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

/**
 * POST /api/printful/sync
 * Simulate/test sync with Printful (reading inventory sizes and mapping mockup files)
 */
app.post("/api/printful/sync", async (req, res) => {
  try {
    const settings = readSettings();
    if (!settings.apiKey) {
      res
        .status(400)
        .json({ error: "Configurez d'abord votre clé API Printful !" });
      return;
    }

    settings.syncStatus = "syncing";
    writeSettings(settings);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const totalActiveProducts = readProducts().length;

    settings.syncStatus = "synced";
    settings.productsSyncedCount = totalActiveProducts;
    settings.lastSynced = new Date().toLocaleString("fr-FR");
    writeSettings(settings);

    res.json(settings);
  } catch (error) {
    const settings = readSettings();
    settings.syncStatus = "error";
    writeSettings(settings);
    res.status(500).json({ error: "Sync failed" });
  }
});

// Configure Vite or Static Fallback
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      // `[InstaWear] Full stack server running on http://0.0.0.0:${PORT}`,
      console.log(
        `[InstaWear] Full stack server running on http://localhost:${PORT}`,
      ),
    );
  });
}

startServer();
