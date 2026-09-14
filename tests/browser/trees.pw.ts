import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Map as LibreMap } from "maplibre-gl";

declare global {
  interface Window {
    treeTestMap: LibreMap;
    treeDraws: number;
  }
}

test("3D trees load on demand, render under labels in globe mode, and survive style changes", async ({
  page,
}, testInfo) => {
  const tile = await readFile(
    new URL("./fixtures/trees-14-8298-5636.mvt", import.meta.url),
  );
  const terrain = await readFile(
    new URL("./fixtures/flat-terrain.png", import.meta.url),
  );
  const requests: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  page.on("pageerror", (e) => errors.push(e.message));
  // Expose the real map only in the test-served module, never in application builds.
  await page.route("**/src/components/MapCanvas.tsx", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    expect(body).toContain("mapRef.current = map;");
    await route.fulfill({
      response,
      body: body.replace(
        "mapRef.current = map;",
        "window.treeTestMap = map; mapRef.current = map;",
      ),
    });
  });
  await page.route("**/src/lib/trees/renderer.ts", async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    expect(body).toContain("renderer.render(scene, camera);");
    await route.fulfill({
      response,
      body: body.replace(
        "renderer.render(scene, camera);",
        "renderer.render(scene, camera); window.treeDraws = (window.treeDraws || 0) + 1;",
      ),
    });
  });
  await page.route("https://clair.benmaps.fr/**", (r) =>
    r.fulfill({
      json: {
        version: 8,
        sources: {
          protomaps: { type: "vector", tiles: [], minzoom: 14, maxzoom: 14 },
          elevation: {
            type: "raster-dem",
            tiles: ["https://terrain.test/{z}/{x}/{y}.png"],
            maxzoom: 0,
            tileSize: 256,
            encoding: "terrarium",
          },
          labels: {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          },
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#f6f5f3" },
          },
          ...["tree-canopy", "tree-light"].map((id) => ({
            id,
            type: "circle",
            source: "protomaps",
            "source-layer": "pois",
            minzoom: 16,
            paint: { "circle-color": "#99c283", "circle-radius": 8 },
          })),
          { id: "labels", type: "symbol", source: "labels" },
        ],
      },
    }),
  );
  await page.route("https://api.protomaps.com/**", (r) =>
    r.fulfill({
      body: r.request().url().includes("/14/8298/5636.mvt")
        ? tile
        : Buffer.alloc(0),
      contentType: "application/x-protobuf",
    }),
  );
  await page.route("https://api.mapbox.com/v4/mapbox.satellite/**", (r) =>
    r.abort(),
  );
  await page.route(
    "https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/**",
    (route) =>
      route.fulfill({
        body: Buffer.alloc(0),
        contentType: "application/x-protobuf",
      }),
  );
  await page.route("https://terrain.test/**", (route) =>
    route.fulfill({ body: terrain, contentType: "image/png" }),
  );
  await page.goto("/#17.3/48.8606/2.3376/0/0");
  await page.locator(".maplibregl-canvas").waitFor();
  await expect
    .poll(() => page.evaluate(() => window.treeTestMap?.isStyleLoaded()))
    .toBe(true);
  expect(requests.some((url) => url.includes("/src/lib/trees/renderer"))).toBe(
    false,
  );
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const toggle = page.getByRole("switch", { name: "3D", exact: true });
  await toggle.check();
  await expect
    .poll(() => page.evaluate(() => window.treeDraws || 0))
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.treeTestMap.getLayoutProperty("tree-canopy", "visibility"),
      ),
    )
    .toBe("none");
  expect(
    await page.evaluate(() => window.treeTestMap.getProjection().type),
  ).toBe("globe");
  const order = await page.evaluate(() =>
    window.treeTestMap.getStyle().layers.map((l) => l.id),
  );
  expect(order.indexOf("benmaps-trees")).toBeLessThan(order.indexOf("labels"));
  await page.getByRole("button", { name: "Close map appearance" }).click();
  await page.screenshot({ path: testInfo.outputPath("trees.png") });
  // A style replacement must reconstruct the custom layer and render again.
  const before = await page.evaluate(() => window.treeDraws);
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.getByRole("switch", { name: /Live traffic/ }).check();
  await expect
    .poll(() => page.evaluate(() => window.treeDraws))
    .toBeGreaterThan(before);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.treeTestMap.getLayoutProperty("tree-canopy", "visibility"),
      ),
    )
    .toBe("none");
  await toggle.uncheck();
  await expect
    .poll(() =>
      page.evaluate(() => !!window.treeTestMap.getLayer("benmaps-trees")),
    )
    .toBe(false);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.treeTestMap.getLayoutProperty("tree-canopy", "visibility") ??
          "visible",
      ),
    )
    .toBe("visible");
  await toggle.check();
  await expect
    .poll(() =>
      page.evaluate(() => !!window.treeTestMap.getLayer("benmaps-trees")),
    )
    .toBe(true);
  await page.evaluate(() => window.treeTestMap.jumpTo({ zoom: 3 }));
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.treeTestMap.getLayoutProperty("tree-canopy", "visibility"),
      ),
    )
    .toBe("visible");
  const distantDraws = await page.evaluate(() => window.treeDraws);
  await page.evaluate(() => window.treeTestMap.triggerRepaint());
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.treeDraws)).toBe(distantDraws);
  await page.evaluate(() => window.treeTestMap.jumpTo({ zoom: 17.3 }));
  await expect
    .poll(() => page.evaluate(() => window.treeDraws))
    .toBeGreaterThan(distantDraws);
  expect(errors).toEqual([]);
  await expect(page.locator(".map-notice")).toHaveCount(0);
  await expect(page.getByText("3D trees couldn’t load.")).toHaveCount(0);
});
