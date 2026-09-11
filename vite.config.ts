import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  // The public build archive supports byte ranges but not browser CORS. This
  // local-only adapter makes development possible without a hosted API key.
  server: {
    proxy: {
      "/__pmtiles": {
        target: "https://build.protomaps.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__pmtiles/, ""),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre: ["maplibre-gl"],
          clair: ["@clair-maps/style"],
        },
      },
    },
  },
});
