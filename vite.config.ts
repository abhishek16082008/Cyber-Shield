import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vite build/dev configuration.
// The "@" alias lets us import from "src" as "@/..." (shadcn convention).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // expose on the local network so you can test on a phone/tablet
    port: 5173,
  },
});
