import type { Page } from "@playwright/test";
import type { Map } from "maplibre-gl";

declare global {
  interface Window {
    __map?: Map;
  }
}

/**
 * Publishes MapCanvas's live map on `window.__map` through the application's
 * dev-only `__onMapCreated` seam.
 *
 * The seam fires immediately after construction, before the style loads or any
 * layer is added, so `wrap` gets to install method spies ahead of the work it
 * needs to observe. Call before `page.goto`.
 *
 * `wrap` is stringified and evaluated in the page: it must be self-contained.
 */
export async function captureMap(page: Page, wrap?: (map: Map) => void) {
  await page.addInitScript((source: string) => {
    const install = source
      ? (eval(`(${source})`) as (map: unknown) => void)
      : null;
    window.__onMapCreated = (map) => {
      window.__map = map;
      install?.(map);
    };
  }, wrap?.toString() ?? "");
}
