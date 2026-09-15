import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

// Deliberately narrow. This codebase is effect-heavy and hand-maintains several
// dependency arrays; `rules-of-hooks` and `exhaustive-deps` are here to guard
// exactly that. Formatting belongs to Prettier and types belong to `tsc -b`.
//
// react-hooks v7 also ships compiler-era rules (`refs`, `set-state-in-effect`).
// They are off: this app deliberately mirrors props into a ref to bridge React
// with MapLibre's imperative API, and resets resources to "loading" at the top
// of fetch effects. Both are intentional and correct here.
export default tseslint.config(
  { ignores: ["dist/", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat["recommended-latest"],
  {
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-unused-vars": "off", // tsc noUnusedLocals covers this
    },
  },
  {
    // Build scripts run in Node but evaluate callbacks inside a Chromium page.
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Browser tests reach into untyped page globals they install themselves.
    files: ["tests/browser/**/*.ts", "tests/local/**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
);
