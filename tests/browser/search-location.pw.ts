import { test, expect } from "@playwright/test";
import { captureMap } from "./support/map";

declare global {
  interface Window {
    completeLocation: PositionCallback;
  }
}

test.beforeEach(async ({ page }) => {
  await page.route("https://clair.benmaps.fr/styles/**", (route) =>
    route.fulfill({ json: { version: 8, sources: {}, layers: [] } }),
  );
  await page.route("https://www.wikidata.org/**", (route) =>
    route.fulfill({ json: { search: [] } }),
  );
});

test("a delayed location result cannot change a new view or move its camera", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (success) => {
      window.completeLocation = success;
    };
  });
  await page.goto("/?mode=walking#13/48.86/2.34/0/0");
  await page.getByRole("button", { name: "My location", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "My location", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Close directions" }).click();
  await page.getByRole("button", { name: "Plan a route" }).click();
  const before = page.url();
  await page.evaluate(() =>
    window.completeLocation({
      coords: {
        longitude: 4,
        latitude: 45,
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition),
  );
  // An erroneous flyTo schedules a camera animation; wait beyond its duration.
  await page.waitForTimeout(1100);
  const after = new URL(page.url());
  expect(after.search).toBe(new URL(before).search);
  const camera = (url: string) =>
    new URL(url).hash.slice(1).split("/").map(Number);
  expect(camera(page.url())).toEqual(camera(before));
  await expect(
    page.getByRole("button", { name: "My location", exact: true }),
  ).toBeEnabled();
});

test("a current location result selects the place", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (success) => {
      window.completeLocation = success;
    };
  });
  await page.goto("/#13/48.86/2.34/0/0");
  await page.getByRole("button", { name: "My location", exact: true }).click();
  await page.evaluate(() =>
    window.completeLocation({
      coords: {
        longitude: 2.35,
        latitude: 48.87,
        accuracy: 1,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as GeolocationPosition),
  );
  await expect(
    page.getByRole("heading", { name: "Your location", exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("pin")).toBe("2.35,48.87");
});

for (const located of [false, true]) {
  test(`searches use ${located ? "the user location" : "the map center"} after moving the map`, async ({
    page,
    context,
  }) => {
    await captureMap(page);
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ longitude: 2.35, latitude: 48.87 });
    const categoryRequests: URL[] = [];
    const suggestionRequests: URL[] = [];
    await page.route(
      "https://api.mapbox.com/search/searchbox/v1/category/**",
      (route) => {
        categoryRequests.push(new URL(route.request().url()));
        return route.fulfill({ json: { features: [] } });
      },
    );
    await page.route(
      "https://api.mapbox.com/search/searchbox/v1/suggest?**",
      (route) => {
        suggestionRequests.push(new URL(route.request().url()));
        return route.fulfill({ json: { suggestions: [] } });
      },
    );
    await page.goto("/#13/48.86/2.34/0/0");
    await expect.poll(() => page.evaluate(() => !!window.__map)).toBe(true);
    if (located) {
      await page
        .getByRole("button", { name: "My location", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Your location", exact: true }),
      ).toBeVisible();
    }
    await page.evaluate(() => {
      window.__map!.stop();
      window.__map!.jumpTo({ center: [4, 45], zoom: 13 });
    });
    const expectedCenter = located ? [2.35, 48.87] : [4, 45];
    const proximity = (url: URL) =>
      url.searchParams.get("proximity")!.split(",").map(Number);
    for (const name of ["Restaurants", "Coffee"]) {
      const before = categoryRequests.length;
      await page.getByRole("button", { name, exact: true }).click();
      await expect.poll(() => categoryRequests.length).toBe(before + 1);
      const actual = proximity(categoryRequests.at(-1)!);
      expect(actual[0]).toBeCloseTo(expectedCenter[0], 5);
      expect(actual[1]).toBeCloseTo(expectedCenter[1], 5);
    }
    const before = categoryRequests.length;
    await page
      .getByRole("button", {
        name: located ? "Search near me" : "Search this area",
        exact: true,
      })
      .click();
    await expect.poll(() => categoryRequests.length).toBe(before + 1);
    expect(proximity(categoryRequests.at(-1)!)[0]).toBeCloseTo(
      expectedCenter[0],
      5,
    );
    expect(proximity(categoryRequests.at(-1)!)[1]).toBeCloseTo(
      expectedCenter[1],
      5,
    );
    await page.getByRole("combobox", { name: "Search places" }).fill("Cafe");
    await expect.poll(() => suggestionRequests.length).toBeGreaterThan(0);
    expect(proximity(suggestionRequests.at(-1)!)[0]).toBeCloseTo(
      expectedCenter[0],
      5,
    );
    expect(proximity(suggestionRequests.at(-1)!)[1]).toBeCloseTo(
      expectedCenter[1],
      5,
    );
  });
}

test("dismissing a pending search retrieval restores usable suggestions", async ({
  page,
}) => {
  await page.route(
    "https://api.mapbox.com/search/searchbox/v1/suggest?**",
    (route) =>
      route.fulfill({
        json: {
          suggestions: [{ mapbox_id: "test-place", name: "Test place" }],
        },
      }),
  );
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "https://api.mapbox.com/search/searchbox/v1/retrieve/**",
    async (route) => {
      await pending;
      await route.fulfill({
        json: {
          features: [
            {
              geometry: { type: "Point", coordinates: [2.35, 48.87] },
              properties: { name: "Test place" },
            },
          ],
        },
      });
    },
  );
  await page.goto("/");
  const search = page.getByRole("combobox", { name: "Search places" });
  await search.fill("Test");
  await page.getByRole("option", { name: "Test place" }).click();
  await expect(page.getByText("Finding this place…")).toBeVisible();
  await search.press("Escape");
  await search.press("Enter");
  await search.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Test place" })).toBeVisible();
  await expect(page.getByText("Finding this place…")).toHaveCount(0);
  release();
  await expect(page.getByRole("heading", { name: "Test place" })).toHaveCount(
    0,
  );
});
