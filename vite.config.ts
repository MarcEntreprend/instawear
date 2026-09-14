import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      historyApiFallback: true,
      hmr: process.env.DISABLE_HMR !== "true",
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
    publicDir: "public",
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            supabase: ["@supabase/supabase-js"],
            motion: ["motion", "lottie-react"],
            // PAS de chunk "stripe" volontairement : @stripe/* doit rester dans
            // le chunk lazy de CheckoutFlow. Un manualChunk dédié inversait la
            // dépendance (l'entry importait le chunk au boot) et @stripe/stripe-js
            // auto-injecte js.stripe.com à l'évaluation du module (P1 perf).
          },
        },
      },
    },
  };
});
