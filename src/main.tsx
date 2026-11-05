// src\main.tsx
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch {}

import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Page d'aperçu du Hero Studio (iframe admin) : monte UNIQUEMENT ce composant,
// jamais l'App complète. La garde admin est dans le composant lui-même.
const HeroPreviewFrame = lazy(() => import("./admin/HeroPreviewFrame.tsx"));
const isHeroPreview = window.location.pathname === "/admin/hero-preview";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isHeroPreview ? (
      <Suspense fallback={null}>
        <HeroPreviewFrame />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
