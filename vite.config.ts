import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Preview URLs stay shareable but must not compete with the production site.
const production = process.env.VERCEL_ENV === "production";
const previewHost =
  process.env.VERCEL_GIT_COMMIT_REF === "next"
    ? "next.benmaps.fr"
    : process.env.VERCEL_URL || "next.benmaps.fr";
const siteOrigin = production ? "https://benmaps.fr" : `https://${previewHost}`;
export default defineConfig({
  plugins: [
    react(),
    {
      name: "site-metadata",
      transformIndexHtml(html) {
        return html
          .replaceAll("__SITE_ORIGIN__", siteOrigin)
          .replaceAll(
            "__ROBOTS__",
            production ? "index, follow" : "noindex, follow",
          );
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "robots.txt",
          source: production
            ? "User-agent: *\nAllow: /\nSitemap: https://benmaps.fr/sitemap.xml\n"
            : "User-agent: *\nDisallow: /\n",
        });
        this.emitFile({
          type: "asset",
          fileName: "sitemap.xml",
          source:
            '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
            (production ? "<url><loc>https://benmaps.fr/</loc></url>" : "") +
            "</urlset>\n",
        });
      },
    },
  ],
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
