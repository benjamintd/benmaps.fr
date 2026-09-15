import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

// Optional integration checks against the neighboring SDK and model checkouts.
export default defineConfig(config, { testDir: "./tests/local" });
