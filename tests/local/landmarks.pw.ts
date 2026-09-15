import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { captureMap } from "../browser/support/map";

declare global {
  interface Window {
    filterChanges: number;
  }
}

// DEVELOPMENT-ONLY. This suite is not part of `npm run test:browser`: it reads
// fixtures from sibling `clair/` and `open-landmarks/` checkouts next to this
// repository, so it only runs on a machine laid out that way. Run it against a
// freshly bundled Clair SDK before publishing one:
//
//   CLAIR_3D_BUNDLE=../clair/packages/clair-3d/dist/clair-3d.js \
//     npx playwright test --config playwright.local.config.ts
const bundle = process.env.CLAIR_3D_BUNDLE;
test.use({
  launchOptions: {
    args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
  },
});
test.skip(!bundle, "Set CLAIR_3D_BUNDLE to test an unpublished Clair SDK");

for (const emptyModel of [false, true])
  test(`landmarks retain tiles and LODs; failed models restore buildings (empty model: ${emptyModel})`, async ({
    page,
  }, testInfo) => {
    // This case exercises thirteen camera changes plus two SDK lifetimes.
    test.setTimeout(60_000);
    const fixture = JSON.parse(
      await readFile(
        new URL(
          "../../../clair/packages/clair-3d/tests/fixtures/notre-dame.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const modelRoot = new URL(
      "../../../open-landmarks/public-project/collection/notre-dame/",
      import.meta.url,
    );
    const asset = JSON.parse(
      await readFile(new URL("asset.json", modelRoot), "utf8"),
    );
    const terrain = await readFile(
      new URL("../browser/fixtures/flat-terrain.png", import.meta.url),
    );
    let finishModel!: () => void;
    const pendingModel = new Promise<void>((resolve) => {
      finishModel = resolve;
    });
    let requested = 0;
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await captureMap(page, (map: any) => {
      window.filterChanges = 0;
      const originalFilter = map.setFilter.bind(map);
      map.setFilter = (...args: any[]) => {
        window.filterChanges++;
        return originalFilter(...args);
      };
    });
    await page.route("https://clair.benmaps.fr/extensions/**", (r) =>
      r.fulfill({ path: bundle!, contentType: "text/javascript" }),
    );
    await page.route("https://clair.benmaps.fr/styles/**", (r) =>
      r.fulfill({
        json: {
          version: 8,
          sources: {
            ground: {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [2, 48.5],
                      [2.7, 48.5],
                      [2.7, 49.2],
                      [2, 49.2],
                      [2, 48.5],
                    ],
                  ],
                },
              },
            },
            buildings: {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: fixture.features.map((f: any) => ({
                  ...f,
                  properties: { height: 25 },
                })),
              },
            },
            elevation: {
              type: "raster-dem",
              tiles: ["https://terrain.test/{z}/{x}/{y}.png"],
              maxzoom: 0,
              tileSize: 256,
              encoding: "terrarium",
            },
          },
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#e0e0e0" },
            },
            {
              id: "ground",
              type: "fill",
              source: "ground",
              paint: { "fill-color": "#228844" },
            },
            {
              id: "building-extrusion",
              type: "fill-extrusion",
              source: "buildings",
              paint: {
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-color": "#a59788",
              },
            },
          ],
        },
      }),
    );
    await page.route("https://terrain.test/**", (r) =>
      r.fulfill({ body: terrain, contentType: "image/png" }),
    );
    await page.route("https://open-landmarks.benmaps.fr/**", async (r) => {
      const url = r.request().url();
      if (url.endsWith(".glb")) {
        requested++;
        await pendingModel;
        return r.fulfill({
          body: emptyModel
            ? Buffer.from(
                JSON.stringify({
                  asset: { version: "2.0" },
                  scene: 0,
                  scenes: [{ nodes: [] }],
                  nodes: [],
                }),
              )
            : await readFile(
                new URL(
                  url.endsWith("low.glb") ? "low.glb" : "detail.glb",
                  modelRoot,
                ),
              ),
          contentType: "model/gltf-binary",
        });
      }
      if (url.endsWith("preview.json"))
        return r.fulfill({ json: { catalogue: "./test/catalogue.json" } });
      if (url.endsWith("catalogue.json"))
        return r.fulfill({
          json: {
            bounds: [2.2, 48.8, 2.5, 48.95],
            assetBase: "./",
            maxHeightM: 96,
            index: { zoom: 0, template: "index.json", occupied: ["0/0"] },
          },
        });
      return r.fulfill({ json: { assets: [asset] } });
    });
    await page.goto("/?layers=1#17.1/48.853/2.3499/20/60");
    await page.getByRole("switch", { name: "3D", exact: true }).check();
    await expect.poll(() => requested, { timeout: 15_000 }).toBe(1);
    const inspect = () =>
      page.evaluate((id) => {
        const map = window.__map!;
        return {
          opacity:
            map.getPaintProperty(
              "building-extrusion",
              "fill-extrusion-opacity",
            ) ?? 1,
          replaced: map
            .getStyle()
            .layers.some(
              (layer: any) =>
                layer.metadata?.["clair:replacement-owners"] &&
                layer.paint?.["fill-extrusion-opacity"] === 0 &&
                JSON.stringify(layer.filter).includes(String(id)),
            ),
          filters: window.filterChanges,
          loaded: map.isSourceLoaded("buildings"),
        };
      }, fixture.expectedIds[0]);
    expect(await inspect()).toMatchObject({
      opacity: 1,
      replaced: false,
      loaded: true,
    });
    const expectGroundVisible = async () => {
      const color = await page.evaluate(async () => {
        const map = window.__map!;
        return new Promise<number[]>((resolve) => {
          map.once("render", () => {
            const gl = map.getCanvas().getContext("webgl2")!;
            const pixel = new Uint8Array(4);
            // This corner stays outside the fixture buildings at the tested bearing.
            gl.readPixels(
              Math.floor(gl.drawingBufferWidth * 0.9),
              Math.floor(gl.drawingBufferHeight * 0.7),
              1,
              1,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              pixel,
            );
            resolve([...pixel]);
          });
          map.triggerRepaint();
        });
      });
      expect(color[1]).toBeGreaterThan(color[0] + 30);
      expect(color[1]).toBeGreaterThan(color[2] + 20);
    };
    finishModel();
    await expect.poll(async () => (await inspect()).replaced).toBe(true);
    const partitionFilters = (await inspect()).filters;
    for (let i = 0; i < 6; i++) {
      await page.evaluate(async (i) => {
        const map = window.__map!;
        await new Promise<void>((resolve) => {
          map.once("moveend", () => resolve());
          map.easeTo({
            zoom: i % 2 ? 17.08 : 16.92,
            bearing: 20 + i * 8,
            duration: 200,
          });
        });
      }, i);
      await page.waitForTimeout(300);
      expect(await inspect()).toMatchObject({
        opacity: 1,
        replaced: true,
        filters: partitionFilters,
        loaded: true,
      });
    }
    expect(requested).toBe(1);
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => window.__map!.jumpTo({ zoom: 14.7 }));
      await expect.poll(async () => (await inspect()).replaced).toBe(false);
      await page.evaluate(() => window.__map!.jumpTo({ zoom: 17.1 }));
      await expect.poll(async () => (await inspect()).replaced).toBe(true);
      expect(requested).toBe(1);
      await expectGroundVisible();
    }
    if (emptyModel) {
      // An empty replacement deliberately exposes the ground beneath the building.
      // Height=0 still leaves a beige roof here; opacity=0 must reveal green.
      const feature = fixture.features.find(
        (f: any) => f.id === fixture.expectedIds[0],
      );
      const ring =
        feature.geometry.type === "Polygon"
          ? feature.geometry.coordinates[0]
          : feature.geometry.coordinates[0][0];
      const points = ring.slice(0, -1);
      const center = points.reduce(
        (sum: number[], p: number[]) => [
          sum[0] + p[0] / points.length,
          sum[1] + p[1] / points.length,
        ],
        [0, 0],
      );
      await page.evaluate(
        (center) =>
          window.__map!.jumpTo({
            center,
            zoom: 19,
            pitch: 0,
            bearing: 0,
          }),
        center,
      );
      await page.waitForTimeout(1000);
      const color = await page.evaluate(
        () =>
          new Promise<number[]>((resolve) => {
            const map = window.__map!;
            map.once("render", () => {
              const gl = map.getCanvas().getContext("webgl2")!,
                pixel = new Uint8Array(4);
              gl.readPixels(
                Math.floor(gl.drawingBufferWidth / 2),
                Math.floor(gl.drawingBufferHeight / 2),
                1,
                1,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                pixel,
              );
              resolve([...pixel]);
            });
            map.triggerRepaint();
          }),
      );
      expect(color[1]).toBeGreaterThan(color[0] + 30);
      expect(color[1]).toBeGreaterThan(color[2] + 20);
    }
    await page.screenshot({ path: testInfo.outputPath("landmarks.png") });
    await page.getByRole("switch", { name: "3D", exact: true }).uncheck();
    await page.route("https://open-landmarks.benmaps.fr/**/*.glb", (r) =>
      r.fulfill({ status: 503, body: "unavailable" }),
    );
    await page.getByRole("switch", { name: "3D", exact: true }).check();
    await expect(
      page.getByText("Some 3D details couldn’t load."),
    ).toBeVisible();
    expect(await inspect()).toMatchObject({
      opacity: 1,
      replaced: false,
      loaded: true,
    });
    expect(errors).toEqual([]);
  });
