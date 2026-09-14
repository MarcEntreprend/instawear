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
            // PAS de chunk "stripe" ni "motion" volontairement : @stripe/* reste
            // dans le chunk lazy de CheckoutFlow (P1), et motion/lottie-react
            // sont désinstallés (P2, 0 usage dans src — le chunk faisait 0KB
            // tout en étant préchargé pour rien).
          },
        },
      },
    },
  };
});
