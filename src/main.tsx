// src\main.tsx
try{ if('scrollRestoration' in history) history.scrollRestoration='manual'; window.scrollTo(0,0);}catch{}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
