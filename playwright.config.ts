import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.pw.ts",
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    baseURL: "http://localhost:5180",
    viewport: { width: 1200, height: 850 },
  },
  webServer: {
    command: "npm run dev -- --port 5180 --strictPort",
    url: "http://localhost:5180",
    env: {
      VITE_MAPBOX_TOKEN: "test-token",
      VITE_PROTOMAPS_KEY: "test-key",
      VITE_PMTILES_URL: "",
    },
  },
});
