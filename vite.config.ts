import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // pdfjs-dist v5 is ESM-only with no exports map; point Rollup to the explicit entry
      "pdfjs-dist": path.resolve(__dirname, "node_modules/pdfjs-dist/build/pdf.mjs"),
    },
  },
  server: {
    host: "::",
    port: 8080,
  },
  optimizeDeps: {
    include: ["pdfjs-dist"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "chart-vendor": ["recharts"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "motion-vendor": ["framer-motion"],
          "xlsx-vendor": ["xlsx", "papaparse"],
          "pdf-vendor": ["pdfjs-dist"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
