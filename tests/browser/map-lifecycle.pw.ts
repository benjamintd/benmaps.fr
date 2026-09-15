import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { captureMap } from "./support/map";

test.beforeEach(async ({ page }) => {
  await captureMap(page);
  await page.route("https://clair.benmaps.fr/extensions/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "export async function addClair3D() { return { remove() {} }; }",
    }),
  );
});

test("clicking an endpoint keeps the journey unchanged and style swaps restore its route", async ({
  page,
}) => {
  await page.route("https://clair.benmaps.fr/styles/**", (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {},
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
  await page.route("https://api.mapbox.com/directions/**", (route) =>
    route.fulfill({
      json: {
        code: "Ok",
        routes: [
          {
            distance: 2000,
            duration: 600,
            geometry: {
              type: "LineString",
              coordinates: [
                [2.33, 48.86],
                [2.35, 48.85],
              ],
            },
            legs: [{ summary: "Main street", steps: [] }],
          },
        ],
      },
    }),
  );
  await page.route("https://api.mapbox.com/v4/**", (route) =>
    route.fulfill({
      body: Buffer.alloc(0),
      contentType: "application/x-protobuf",
    }),
  );
  await page.goto(
    "/?from=2.33,48.86&to=2.35,48.85&mode=driving-traffic#14/48.855/2.34/0/0",
  );
  await expect(
    page.getByRole("button", { name: /10 min.*Main street/ }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!window.__map?.getLayer("journey-line")))
    .toBe(true);
  for (const selector of [".map-marker.origin", ".map-marker.selected"]) {
    await page.locator(selector).click();
    // Allow React and the URL persistence effect to settle before checking the endpoints.
    await expect(
      page.getByRole("button", { name: /10 min.*Main street/ }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get("from")).toBe("2.33,48.86");
    expect(new URL(page.url()).searchParams.get("to")).toBe("2.35,48.85");
  }
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.getByRole("switch", { name: "Live traffic" }).check();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !!window.__map?.getLayer("traffic-flow") &&
          !!window.__map?.getLayer("journey-line"),
      ),
    )
    .toBe(true);
});

test("restoring equal settings during a pending style request does not cancel the requested style", async ({
  page,
}) => {
  const terrain = await readFile(
    new URL("./fixtures/flat-terrain.png", import.meta.url),
  );
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested3D = false;
  await page.route("https://clair.benmaps.fr/styles/**", async (route) => {
    const is3D = new URL(route.request().url()).searchParams.has("3d");
    if (is3D) {
      requested3D = true;
      await pending;
    }
    await route.fulfill({
      json: {
        version: 8,
        sources: {
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
            id: is3D ? "three-dimensional" : "flat",
            type: "background",
            paint: { "background-color": "#f6f5f3" },
          },
        ],
      },
    });
  });
  await page.route("https://terrain.test/**", (route) =>
    route.fulfill({ body: terrain, contentType: "image/png" }),
  );
  await page.goto("/?layers=1#14/48.855/2.34/0/0");
  await expect
    .poll(() => page.evaluate(() => !!window.__map?.getLayer("flat")))
    .toBe(true);
  await page.getByRole("switch", { name: "3D", exact: true }).check();
  await expect.poll(() => requested3D).toBe(true);
  await page.evaluate(() => {
    const url = new URL(location.href);
    url.hash = "14/48.856/2.341/0/0";
    history.replaceState(null, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect
    .poll(() => page.evaluate(() => window.__map!.getCenter().lat))
    .toBeCloseTo(48.856);
  release!();
  await expect
    .poll(() =>
      page.evaluate(() => !!window.__map?.getLayer("three-dimensional")),
    )
    .toBe(true);
});
