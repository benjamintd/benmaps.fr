import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { captureMap } from "./support/map";

declare global {
  interface Window {
    treeDraws: number;
  }
}

test("3D trees load on demand, render under labels through the Clair CDN SDK, and survive style changes", async ({
  page,
}, testInfo) => {
  if (process.env.CLAIR_3D_BUNDLE) {
    await page.route("https://clair.benmaps.fr/extensions/**", (route) =>
      route.fulfill({
        path: process.env.CLAIR_3D_BUNDLE!,
        contentType: "text/javascript",
      }),
    );
  }
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
  // Wrap addLayer at creation time so the tree layer is instrumented before
  // the SDK ever renders it. Runs in the page: keep self-contained.
  await captureMap(page, (map: any) => {
    const addLayer = map.addLayer.bind(map);
    map.addLayer = (layer: any, before: any) => {
      if (layer.id === "open-landmarks-trees") {
        const render = layer.render.bind(layer);
        // Count GPU draws, since the SDK also receives render callbacks
        // below the tree zoom threshold and returns without drawing.
        layer.render = (gl: any, ...args: any[]) => {
          const methods = ["drawElementsInstanced", "drawArraysInstanced"];
          const originals = methods.map((method) => gl[method]);
          methods.forEach((method, i) => {
            gl[method] = (...drawArgs: any[]) => {
              window.treeDraws = (window.treeDraws || 0) + 1;
              return originals[i].apply(gl, drawArgs);
            };
          });
          try {
            return render(gl, ...args);
          } finally {
            methods.forEach((method, i) => {
              gl[method] = originals[i];
            });
          }
        };
      }
      return addLayer(layer, before);
    };
  });
  await page.route("https://clair.benmaps.fr/styles/**", (r) =>
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
  await page.route("https://open-landmarks.benmaps.fr/**", (route) => {
    if (route.request().url().endsWith("/preview.json"))
      return route.fulfill({ json: { catalogue: "./test/catalogue.json" } });
    return route.fulfill({
      json: {
        bounds: [2.224, 48.815, 2.422, 48.903],
        maxHeightM: 0,
        index: { zoom: 12, template: "/unused/{x}/{y}.json", occupied: [] },
        assetBase: "/",
      },
    });
  });
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
    .poll(() => page.evaluate(() => window.__map?.isStyleLoaded()))
    .toBe(true);
  expect(
    requests.some((url) => url.includes("open-landmarks.benmaps.fr")),
  ).toBe(false);
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const toggle = page.getByRole("switch", { name: "3D", exact: true });
  await toggle.check();
  await expect
    .poll(() => page.evaluate(() => window.treeDraws || 0))
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      requests.some((url) => url.endsWith("/api/v1/test/catalogue.json")),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__map!.getLayoutProperty("tree-canopy", "visibility") === "none"
          ? 0
          : window.__map!.getPaintProperty("tree-canopy", "circle-opacity"),
      ),
    )
    .toBe(0);
  if (process.env.CLAIR_3D_BUNDLE) {
    expect(
      await page.evaluate(() =>
        window.__map!.getLayoutProperty("tree-canopy", "visibility"),
      ),
    ).not.toBe("none");
  }
  expect(await page.evaluate(() => window.__map!.getProjection().type)).toBe(
    "mercator",
  );
  const order = await page.evaluate(() =>
    window.__map!.getStyle().layers.map((l) => l.id),
  );
  expect(order.indexOf("open-landmarks-trees")).toBeLessThan(
    order.indexOf("labels"),
  );
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
        window.__map!.getLayoutProperty("tree-canopy", "visibility") === "none"
          ? 0
          : window.__map!.getPaintProperty("tree-canopy", "circle-opacity"),
      ),
    )
    .toBe(0);
  await toggle.uncheck();
  await expect
    .poll(() =>
      page.evaluate(() => !!window.__map!.getLayer("open-landmarks-trees")),
    )
    .toBe(false);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__map!.getPaintProperty("tree-canopy", "circle-opacity") ?? 1,
      ),
    )
    .toBe(1);
  await toggle.check();
  await expect
    .poll(() =>
      page.evaluate(() => !!window.__map!.getLayer("open-landmarks-trees")),
    )
    .toBe(true);
  await page.evaluate(() => window.__map!.jumpTo({ zoom: 3 }));
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__map!.getPaintProperty("tree-canopy", "circle-opacity") ?? 1,
      ),
    )
    .toBe(1);
  const distantDraws = await page.evaluate(() => window.treeDraws);
  await page.evaluate(() => window.__map!.triggerRepaint());
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.treeDraws)).toBe(distantDraws);
  await page.evaluate(() => window.__map!.jumpTo({ zoom: 17.3 }));
  await expect
    .poll(() => page.evaluate(() => window.treeDraws))
    .toBeGreaterThan(distantDraws);
  expect(errors).toEqual([]);
  await expect(page.locator(".map-notice")).toHaveCount(0);
  await expect(page.getByText("Some 3D details couldn’t load.")).toHaveCount(0);
});
