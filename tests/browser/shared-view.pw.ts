import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { captureMap } from "./support/map";
test("shared views restore buildings, layers, pin metadata, camera, categories and drafts", async ({
  page,
}) => {
  const terrain = await readFile(
    new URL("./fixtures/flat-terrain.png", import.meta.url),
  );
  const styleUrls: string[] = [];
  await captureMap(page);
  await page.route("https://clair.benmaps.fr/**", (route) => {
    styleUrls.push(route.request().url());
    const threeD =
      new URL(route.request().url()).searchParams.get("3d") === "1";
    return route.fulfill({
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
          buildings: {
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
          ...(threeD
            ? [
                {
                  id: "building-extrusion",
                  type: "fill-extrusion",
                  source: "buildings",
                  paint: { "fill-extrusion-height": 12 },
                },
              ]
            : []),
        ],
      },
    });
  });
  await page.route("https://terrain.test/**", (route) =>
    route.fulfill({ body: terrain, contentType: "image/png" }),
  );
  await page.route("https://api.mapbox.com/v4/**", (route) =>
    route.fulfill({
      body: Buffer.alloc(0),
      contentType: "application/x-protobuf",
    }),
  );
  await page.route("https://api.mapbox.com/search/**", (route) =>
    route.fulfill({ json: { suggestions: [], features: [] } }),
  );
  await page.goto(
    "/?3d=1&traffic=1&layers=1&pin=2.34369,48.861514&pin_name=Maison&pin_address=12+rue+du+Louvre#18.543/48.8615142/2.3433801/22.15/43.75",
  );
  const switch3D = page.getByRole("switch", { name: "3D", exact: true });
  await expect(switch3D).toBeChecked();
  await expect(
    page.getByRole("heading", { name: "Maison", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => !!window.__map?.getLayer("building-extrusion")),
    )
    .toBe(true);
  const camera = () =>
    page.evaluate(() => {
      const map = window.__map;
      if (!map) return null;
      const c = map.getCenter();
      return [
        map.getZoom(),
        c.lat,
        c.lng,
        map.getBearing(),
        map.getPitch(),
      ].map((v) => Number(v.toFixed(5)));
    });
  const original = await camera();
  expect(original).toEqual([18.543, 48.86151, 2.34338, 22.15, 43.75]);
  await page.getByRole("switch", { name: /Live traffic/ }).uncheck();
  await expect.poll(camera).toEqual(original);
  expect(new URL(page.url()).searchParams.has("traffic")).toBe(false);
  await page.reload();
  await expect(switch3D).toBeChecked();
  await expect(
    page.getByRole("heading", { name: "Maison", exact: true }),
  ).toBeVisible();
  await expect.poll(camera).toEqual(original);
  expect(
    styleUrls.some((url) => new URL(url).searchParams.get("3d") === "1"),
  ).toBe(true);
  await page
    .getByRole("button", { name: "About Benmaps", exact: true })
    .click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("about"))
    .toBe("1");
  await page.reload();
  await expect(
    page.getByRole("dialog", { name: "About Benmaps" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect
    .poll(() => new URL(page.url()).searchParams.has("about"))
    .toBe(false);
  await page.getByRole("button", { name: "Coffee", exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("category"))
    .toBe("cafe");
  const near = new URL(page.url()).searchParams.get("near");
  expect(near).toBeTruthy();
  await page
    .getByRole("combobox", { name: "Search places" })
    .fill("Boulangerie");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe("Boulangerie");
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Search places" }),
  ).toHaveValue("Boulangerie");
  await expect(
    page.getByRole("button", { name: "Coffee", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(new URL(page.url()).searchParams.get("near")).toBe(near);
  await page.getByRole("button", { name: "Plan a route" }).click();
  await page.getByRole("button", { name: "Cycle", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Starting point", exact: true })
    .fill("Louvre");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("from_q"))
    .toBe("Louvre");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Cycle", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("combobox", { name: "Starting point", exact: true }),
  ).toHaveValue("Louvre");
  // Navigation restores the supplied camera even when the 3D setting changes.
  await page.evaluate(() => {
    history.pushState(null, "", "/?layers=1#16/48.85/2.35/10/50");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(switch3D).not.toBeChecked();
  await expect.poll(camera).toEqual([16, 48.85, 2.35, 10, 50]);
  await expect
    .poll(() =>
      page.evaluate(() => !!window.__map!.getLayer("building-extrusion")),
    )
    .toBe(false);
});
