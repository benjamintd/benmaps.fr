import { test, expect, type Page } from "@playwright/test";

const from = [2.33, 48.86],
  to = [2.35, 48.85];
const midpoint = [2.34, 48.855];
const alternate = [2.347, 48.861];
async function project(page: Page, coordinate: number[]) {
  const box = (await page.locator(".maplibregl-canvas").boundingBox())!;
  const [zoom, lat, lng] = new URL(page.url()).hash
    .slice(1)
    .split("/")
    .map(Number);
  const world = 512 * 2 ** zoom;
  const mercatorY = (lat: number) =>
    (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
  return {
    x: box.x + box.width / 2 + ((coordinate[0] - lng) / 360) * world,
    y:
      box.y +
      box.height / 2 +
      (mercatorY(coordinate[1]) - mercatorY(lat)) * world,
  };
}

test("select a map alternative, drag both endpoints, and show flat cycling elevation", async ({
  page,
}, testInfo) => {
  const calls: string[] = [];
  // Only providers are fixtures: real React state, MapLibre, workers and mouse gestures run.
  await page.route("https://clair.benmaps.fr/**", async (route) =>
    route.fulfill({
      json: {
        version: 8,
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#f6f5f3" },
          },
          { id: "labels", type: "symbol", source: "labels", layout: {} },
        ],
        // Empty symbols are sufficient to exercise insertion before the label layer.
        ...{
          sources: {
            labels: {
              type: "geojson",
              data: { type: "FeatureCollection", features: [] },
            },
          },
        },
      },
    }),
  );
  await page.route("https://api.mapbox.com/directions/**", async (route) => {
    calls.push(route.request().url());
    const pair = new URL(route.request().url()).pathname
      .split("/")
      .at(-1)!
      .split(";")
      .map((p) => p.split(",").map(Number));
    await route.fulfill({
      json: {
        code: "Ok",
        routes: [midpoint, alternate].map((middle, i) => ({
          distance: 2000 + i * 400,
          duration: 600 + i * 60,
          geometry: {
            type: "LineString",
            coordinates: [pair[0], middle, pair[1]],
          },
          legs: [
            { summary: i ? "Alternative street" : "Main street", steps: [] },
          ],
        })),
      },
    });
  });
  await page.route("https://api.mapbox.com/v4/**", (route) =>
    route.fulfill({ json: { features: [{ properties: { ele: 30 } }] } }),
  );
  await page.goto(
    "/?from=" +
      from.join(",") +
      "&to=" +
      to.join(",") +
      "&mode=driving-traffic",
  );
  await expect(
    page.getByRole("button", { name: /10 min.*Main street/ }),
  ).toHaveAttribute("aria-pressed", "true");
  // Wait for the worker's route geometry and the camera animation, not just the route API.
  await expect
    .poll(async () => {
      if (!new URL(page.url()).hash) return "";
      const point = await project(page, alternate);
      await page.mouse.move(point.x + 6, point.y);
      return page
        .locator(".maplibregl-canvas")
        .evaluate((el) => el.style.cursor);
    })
    .toBe("pointer");
  const hit = await project(page, alternate);
  await page.mouse.click(hit.x + 6, hit.y);
  await expect(
    page.getByRole("button", { name: /11 min.*Alternative street/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(1000);
  for (const endpoint of ["from", "to"] as const) {
    const selector =
      endpoint === "from" ? ".map-marker.origin" : ".map-marker.selected";
    const marker = page.locator(selector);
    const box = (await marker.boundingBox())!;
    const previous = new URL(page.url()).searchParams.get(endpoint);
    const other = endpoint === "from" ? "to" : "from";
    const otherBefore = new URL(page.url()).searchParams.get(other);
    const requestsBefore = calls.length;
    expect(
      await page.evaluate(
        ({ x, y }) =>
          document
            .elementFromPoint(x, y)
            ?.closest(".map-marker")
            ?.getAttribute("aria-label"),
        { x: box.x + box.width / 2, y: box.y + 15 },
      ),
    ).toContain(endpoint === "from" ? "A:" : "B:");
    await page.mouse.move(box.x + box.width / 2, box.y + 15);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 45, box.y + 45, {
      steps: 12,
    });
    await page.mouse.up();
    await expect
      .poll(() => new URL(page.url()).searchParams.get(endpoint))
      .not.toBe(previous);
    expect(new URL(page.url()).searchParams.get(other)).toBe(otherBefore);
    await expect.poll(() => calls.length).toBeGreaterThan(requestsBefore);
    await expect(
      page.getByRole("button", { name: /10 min.*Main street/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(1100);
  }
  await page.getByRole("button", { name: "Cycle", exact: true }).click();
  await expect(page.locator(".elevation-chart")).toBeVisible();
  await expect(page.locator(".elevation-chart")).toHaveAttribute(
    "aria-label",
    /0 metres up, 0 metres down/,
  );
  await page.screenshot({ path: testInfo.outputPath("cycling.png") });
  await expect(
    page.getByRole("button", { name: "Share directions" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close directions" }).click();
  await expect(
    page.getByRole("combobox", { name: "Search places" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Route planner" })).toHaveCount(
    0,
  );
});

test("search focus has equal insets and directions CTA uses the same icon", async ({
  page,
}, testInfo) => {
  await page.route("https://clair.benmaps.fr/**", (route) =>
    route.fulfill({ json: { version: 8, sources: {}, layers: [] } }),
  );
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/?pin=2.33,48.86");
    await page.getByRole("combobox", { name: "Search places" }).focus();
    const geometry = await page.locator(".search-bar").evaluate((bar) => {
      const box = bar.getBoundingClientRect(),
        field = bar
          .querySelector(".search-input-wrap")!
          .getBoundingClientRect();
      return {
        left: field.left - box.left,
        top: field.top - box.top,
        bottom: box.bottom - field.bottom,
      };
    });
    expect(geometry).toEqual({ left: 6, top: 6, bottom: 6 });
    const searchIcon = await page.locator(".search-directions svg").innerHTML();
    expect(await page.locator(".start-here svg").innerHTML()).toBe(searchIcon);
    const cta = await page.locator(".start-here").evaluate((el) => ({
      last: el.lastElementChild!.tagName,
      count: el.querySelectorAll("svg").length,
    }));
    expect(cta).toEqual({ last: "svg", count: 1 });
  }
  await page.screenshot({ path: testInfo.outputPath("focus.png") });
});
