import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { captureMap } from "./support/map";

test("terrain sampling preserves the published landmark calibration", async ({
  page,
}) => {
  await captureMap(page);
  const dem = await readFile(
    new URL("./fixtures/terrain-gradient.png", import.meta.url),
  );
  await page.route("https://clair.benmaps.fr/extensions/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "export async function addClair3D() { return { remove() {} }; }",
    }),
  );
  await page.route("https://clair.benmaps.fr/styles/**", (route) =>
    route.fulfill({
      json: {
        version: 8,
        terrain: { source: "terrain" },
        sources: {
          terrain: {
            type: "raster-dem",
            tiles: ["https://terrain.test/{z}/{x}/{y}.png"],
            tileSize: 64,
            maxzoom: 0,
            encoding: "terrarium",
          },
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#f6f5f3" },
          },
        ],
      },
    }),
  );
  await page.route("https://terrain.test/**", (route) =>
    route.fulfill({ body: dem, contentType: "image/png" }),
  );
  await page.goto("/?3d=1#2/0/0/20/45");
  await expect
    .poll(() => page.evaluate(() => !!window.__map?.getSource("terrain")))
    .toBe(true);
  // Isolate MapLibre from the SDK and explicitly enable the fixture's DEM source.
  await page.evaluate(() => window.__map!.setTerrain({ source: "terrain" }));
  // The fixture stores 100*x + 10*y metres in each of its 64x64 pixels.
  // At (0,0), the authored sampling convention selects (32,32) = 3520 m.
  // Stock 6.9.1 shifts both axes by half a cell and instead reports 3465 m,
  // enough to reject the bridge's tightly bounded, previously valid footings.
  await expect
    .poll(() =>
      page.evaluate(() => window.__map?.queryTerrainElevation([0, 0]) ?? -1),
    )
    .toBeCloseTo(3520, 3);
});
