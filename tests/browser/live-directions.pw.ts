import { test, expect, type Page } from "@playwright/test";
import { captureMap } from "./support/map";

declare global {
  interface Window {
    livePosition?: PositionCallback;
    locationWatches: number;
    locationClears: number;
    locationVisible: boolean;
  }
}
const epoch = Date.UTC(2026, 8, 22, 12);
let calls: string[];
let fail: boolean;
let hold: Promise<void> | null;

async function position(page: Page, longitude: number, accuracy = 10) {
  await page.evaluate(
    ({ longitude, accuracy }) =>
      window.livePosition?.({
        coords: { longitude, latitude: 48.86, accuracy },
        timestamp: Date.now(),
      } as GeolocationPosition),
    { longitude, accuracy },
  );
}

test.beforeEach(async ({ page }) => {
  calls = [];
  fail = false;
  hold = null;
  await captureMap(page);
  await page.clock.setFixedTime(epoch);
  await page.addInitScript(() => {
    window.locationWatches = 0;
    window.locationClears = 0;
    window.locationVisible = true;
    Object.defineProperty(document, "visibilityState", {
      get: () => (window.locationVisible ? "visible" : "hidden"),
    });
    navigator.geolocation.getCurrentPosition = (success) =>
      success({
        coords: { longitude: 2.33, latitude: 48.86, accuracy: 10 },
        timestamp: Date.now(),
      } as GeolocationPosition);
    navigator.geolocation.watchPosition = (success) => {
      window.livePosition = success;
      return ++window.locationWatches;
    };
    navigator.geolocation.clearWatch = () => {
      window.locationClears++;
    };
  });
  await page.route("https://clair.benmaps.fr/styles/**", (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#edf1ed" },
          },
        ],
      },
    }),
  );
  await page.route("https://api.mapbox.com/directions/**", async (route) => {
    calls.push(route.request().url());
    const from = new URL(route.request().url()).pathname
      .split("/")
      .at(-1)!
      .split(";")[0]
      .split(",")
      .map(Number);
    if (hold) await hold;
    if (fail) {
      await route.abort();
      return;
    }
    await route.fulfill({
      json: {
        code: "Ok",
        routes: [
          {
            distance: calls.length === 1 ? 2400 : 2100,
            duration: calls.length === 1 ? 1800 : 1600,
            geometry: {
              type: "LineString",
              coordinates: [from, [2.34, 48.86], [2.35, 48.85]],
            },
            legs: [{ summary: "Rue de Rivoli", steps: [] }],
          },
        ],
      },
    });
  });
});

async function start(page: Page) {
  await page.goto("/?to=2.35,48.85&to_name=Notre-Dame&mode=walking");

  await expect(page.locator(".route-option")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => !!window.__map?.getLayer("journey-line")))
    .toBe(true);
  await expect.poll(() => page.evaluate(() => window.locationWatches)).toBe(1);
  await page.waitForTimeout(1000);
}

test("updates the dot, refreshes quietly after 50 m, and retries without losing the route or camera", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.__map!.stop();
    window.__map!.jumpTo({ center: [2.34, 48.86], zoom: 14, bearing: 25 });
  });
  const camera = new URL(page.url()).hash;
  const dot = page.getByRole("img", { name: "Your location", exact: true });
  const before = await dot.boundingBox();
  await page.clock.setFixedTime(epoch + 21_000);
  await position(page, 2.3305);
  await expect
    .poll(async () => (await dot.boundingBox())?.x)
    .not.toBe(before?.x);
  await page.waitForTimeout(1100);
  expect(calls).toHaveLength(1);
  await position(page, 2.331, 500);
  await page.waitForTimeout(1100);
  expect(calls).toHaveLength(1);
  fail = true;
  await position(page, 2.331);
  await expect.poll(() => calls.length).toBe(2);
  await expect(page.locator(".route-option")).toContainText("30 min");
  expect(new URL(page.url()).searchParams.get("from")).toBe("2.33,48.86");
  expect(new URL(page.url()).hash).toBe(camera);
  await expect(page.locator(".toast, .map-loading, .map-notice")).toHaveCount(
    0,
  );
  fail = false;
  await page.clock.setFixedTime(epoch + 42_000);
  await position(page, 2.335);
  let release!: () => void;
  hold = new Promise((resolve) => {
    release = resolve;
  });
  await expect.poll(() => calls.length).toBe(3);
  await expect(page.locator(".route-option")).toContainText("30 min");
  release();
  hold = null;
  await expect
    .poll(() => new URL(page.url()).searchParams.get("from"))
    .toBe("2.335,48.86");
  await expect(page.locator(".route-option")).toContainText("27 min");
  await page.waitForTimeout(1100);
  expect(calls).toHaveLength(3);
  expect(new URL(page.url()).hash).toBe(camera);
  // A fixed starting point disables refreshing, even if its coordinates match.
  await page
    .getByRole("button", { name: "Swap starting point and destination" })
    .click();
  await expect.poll(() => calls.length).toBe(4);
  await page.clock.setFixedTime(epoch + 65_000);
  await position(page, 2.345);
  await page.waitForTimeout(1100);
  expect(calls).toHaveLength(4);
});

test("pauses the location watch while hidden and uses a fresh fix after resuming", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.locationVisible = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => page.evaluate(() => window.locationClears)).toBe(1);
  await page.clock.setFixedTime(epoch + 40_000);
  await position(page, 2.34);
  await page.waitForTimeout(1100);
  expect(calls).toHaveLength(1);
  await page.evaluate(() => {
    window.locationVisible = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => page.evaluate(() => window.locationWatches)).toBe(2);
  await page.waitForTimeout(1100);
  expect(calls).toHaveLength(1);
  await position(page, 2.34);
  await expect.poll(() => calls.length).toBe(2);
});

test("a refresh arriving after directions close cannot restore them", async ({
  page,
}) => {
  await start(page);
  let release!: () => void;
  hold = new Promise((resolve) => {
    release = resolve;
  });
  await page.clock.setFixedTime(epoch + 21_000);
  await position(page, 2.334);
  await expect.poll(() => calls.length).toBe(2);
  await page
    .getByRole("button", { name: "Close directions", exact: true })
    .click();
  release();
  hold = null;
  await expect(page.getByRole("region", { name: "Route planner" })).toHaveCount(
    0,
  );
  await page.waitForTimeout(1100);
  expect(new URL(page.url()).searchParams.has("from")).toBe(false);
});

test("mobile drawer drags between snap points and recentres without changing endpoints or zoom", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Vaul measures elapsed gesture time; let the clock advance in this test.
  await page.clock.install({ time: epoch });
  await start(page);
  await expect(
    page.locator(".directions-panel[data-vaul-drawer]"),
  ).toBeVisible();
  await expect(page.locator(".map-marker.origin")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Your location", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Walk", exact: true }),
  ).toBeHidden();
  const sheet = (await page.locator(".directions-panel").boundingBox())!;
  expect(844 - sheet.y).toBeLessThan(125);
  expect(sheet.y).toBeGreaterThan(650);
  const box = (await page
    .getByRole("button", { name: "Recenter", exact: true })
    .boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.y + box.height).toBeLessThan(sheet.y);
  await page.locator(".route-sheet-summary").click();
  await page.locator("[data-vaul-handle]").click();
  await page.waitForTimeout(200);
  expect(
    (await page.locator(".directions-panel").boundingBox())!.y,
  ).toBeCloseTo(sheet.y, 0);
  await dragDrawer(page, -380);
  await expect(
    page.getByRole("button", { name: "Walk", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("mobile-expanded.png") });
  await dragDrawer(page, 330);
  await page.clock.setFixedTime(epoch + 5000);
  await position(page, 2.331);
  const from = new URL(page.url()).searchParams.get("from");
  const zoom = await page.evaluate(() => window.__map!.getZoom());
  await page.getByRole("button", { name: "Recenter", exact: true }).click();
  await page.waitForTimeout(700);
  expect(new URL(page.url()).searchParams.get("from")).toBe(from);
  expect(await page.evaluate(() => window.__map!.getZoom())).toBeCloseTo(
    zoom,
    5,
  );
  await page.screenshot({ path: testInfo.outputPath("mobile-overview.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page
    .getByRole("button", { name: "Close directions", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "Route planner" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("combobox", { name: "Search places" }),
  ).toBeVisible();
});

test("place drawers drag up and down without blocking search and dismiss on a downward swipe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: epoch });
  await page.goto("/?pin=2.33,48.86");
  const drawer = page.getByRole("dialog", { name: "Place details" });
  await expect(drawer).toBeVisible();
  await page.waitForTimeout(600);
  const search = page.getByRole("combobox", { name: "Search places" });
  await search.focus();
  await expect(search).toBeFocused();
  await dragDrawer(page, -330);
  expect((await drawer.boundingBox())!.y).toBeLessThan(150);
  await dragDrawer(page, 330);
  expect((await drawer.boundingBox())!.y).toBeGreaterThan(440);
  await dragDrawer(page, 290);
  await expect(drawer).toHaveCount(0);
  await expect(search).toBeVisible();
});

async function dragDrawer(page: Page, distance: number) {
  const box = (await page.locator("[data-vaul-handle]").boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + distance, { steps: 20 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(600);
}
