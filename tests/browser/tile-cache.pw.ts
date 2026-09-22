import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { captureMap } from "./support/map";
import { singleTileArchive } from "./support/pmtiles";

for (const provider of ["Protomaps", "PMTiles"]) {
  test(`${provider} renders cached tiles after a reload with its tile provider unavailable`, async ({
    page,
  }) => {
    await captureMap(page);
    const tile = await readFile(
      new URL("./fixtures/trees-14-8298-5636.mvt", import.meta.url),
    );
    const archive = singleTileArchive(tile);
    const source = provider === "PMTiles" ? "archive" : "protomaps";
    let requests = 0;
    let offline = false;
    await page.route("https://api.protomaps.com/**", (route) => {
      requests++;
      return offline
        ? route.abort()
        : route.fulfill({
            body: tile,
            contentType: "application/x-protobuf",
            headers: { "cache-control": "public, max-age=14400" },
          });
    });
    await page.route("https://archive.test/paris.pmtiles", (route) => {
      requests++;
      if (offline) return route.abort();
      const range = /bytes=(\d+)-(\d+)/.exec(route.request().headers().range);
      if (!range) throw new Error("Expected a PMTiles range request");
      const start = Number(range[1]);
      const end = Math.min(Number(range[2]), archive.length - 1);
      return route.fulfill({
        status: 206,
        body: archive.subarray(start, end + 1),
        headers: {
          "content-range": `bytes ${start}-${end}/${archive.length}`,
          "access-control-allow-origin": "*",
          "access-control-expose-headers": "Content-Range, ETag",
          etag: '"fixture-v1"',
        },
      });
    });
    await page.route("https://clair.benmaps.fr/styles/**", (route) =>
      route.fulfill({
        json: {
          version: 8,
          sources: {
            [source]:
              provider === "PMTiles"
                ? {
                    type: "vector",
                    url: "pmtiles://https://archive.test/paris.pmtiles",
                  }
                : { type: "vector", tiles: [], minzoom: 14, maxzoom: 14 },
          },
          layers: [
            {
              id: "trees",
              type: "circle",
              source,
              "source-layer": "pois",
              paint: { "circle-radius": 5 },
            },
          ],
        },
      }),
    );
    await page.goto("/#16/48.8603/2.3372/0/0");
    await expect
      .poll(() =>
        page.evaluate(() => window.__map?.queryRenderedFeatures().length ?? 0),
      )
      .toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => window.__map?.loaded()))
      .toBe(true);
    const initial = requests;
    expect(initial).toBeGreaterThan(0);
    offline = true;
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => window.__map?.queryRenderedFeatures().length ?? 0),
      )
      .toBeGreaterThan(0);
    await expect
      .poll(() => page.evaluate(() => window.__map?.loaded()))
      .toBe(true);
    expect(requests).toBe(initial);
  });
}

test.beforeEach(async ({ page }) => {
  // An empty page on the dev origin provides genuine Cache Storage without
  // booting the app in the lower-level persistence and cancellation checks.
  await page.route("**/cache-test", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Cache test</title>",
    }),
  );
});

test("stale tiles return before revalidation, update in the background, and survive failed refreshes", async ({
  page,
}) => {
  await page.goto("/cache-test");
  const result = await page.evaluate(async () => {
    const modulePath = "/src/lib/tile-cache.ts";
    const { createTileCache } = (await import(
      modulePath
    )) as typeof import("../../src/lib/tile-cache");
    let time = Date.now();
    const cache = createTileCache({ now: () => time });
    const signal = new AbortController().signal;
    await cache("tile", async () => new Response("old"), signal);
    time += 5 * 60 * 60 * 1000;
    let release!: (r: Response) => void;
    const delayed = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const stale = await (await cache("tile", () => delayed, signal)).text();
    release(new Response("new"));
    // Wait for the actual background write, not an arbitrary timeout.
    const storage = await caches.open("benmaps-basemap-v1");
    for (;;) {
      const entries = await storage.matchAll();
      if ((await entries[0]?.text()) === "new") break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const fresh = await (
      await cache(
        "tile",
        async () => {
          throw new Error("offline");
        },
        signal,
      )
    ).text();
    time += 5 * 60 * 60 * 1000;
    const offline = await (
      await cache(
        "tile",
        async () => {
          throw new Error("offline");
        },
        signal,
      )
    ).text();
    time += 8 * 24 * 60 * 60 * 1000;
    const expired = await cache(
      "tile",
      async () => {
        throw new Error("offline");
      },
      signal,
    ).then(
      () => false,
      () => true,
    );
    return { stale, fresh, offline, expired };
  });
  expect(result).toEqual({
    stale: "old",
    fresh: "new",
    offline: "new",
    expired: true,
  });
});

test("storage is bounded and provider cache restrictions are respected", async ({
  page,
}) => {
  await page.goto("/cache-test");
  const result = await page.evaluate(async () => {
    const modulePath = "/src/lib/tile-cache.ts";
    const { createTileCache } = (await import(
      modulePath
    )) as typeof import("../../src/lib/tile-cache");
    const cache = createTileCache({ maxEntries: 2, maxEntryBytes: 4 });
    const signal = new AbortController().signal;
    const load = (key: string, value = key, control = "") =>
      cache(
        key,
        async () =>
          new Response(value, { headers: { "cache-control": control } }),
        signal,
      );
    await Promise.all([load("a"), load("b"), load("c")]);
    const storage = await caches.open("benmaps-basemap-v1");
    const bounded = (await storage.keys()).length;
    await load("large", "12345");
    await load("private", "x", "no-store");
    const bodies = await Promise.all(
      (await storage.matchAll()).map((r) => r.text()),
    );
    await load("validate", "old", "no-cache, max-age=3600");
    const validated = await (await load("validate", "new")).text();
    await load("expired", "old", "must-revalidate, max-age=0");
    const expired = await (await load("expired", "new")).text();
    return { bounded, bodies, validated, expired };
  });
  expect(result.bounded).toBe(2);
  expect(result.bodies).toHaveLength(2);
  expect(result.bodies).not.toContain("12345");
  expect(result.bodies).not.toContain("x");
  expect(result.validated).toBe("new");
  expect(result.expired).toBe("new");
});

test("concurrent readers share a request but cancel independently; unavailable storage falls back to fetch", async ({
  page,
}) => {
  await page.goto("/cache-test");
  const result = await page.evaluate(async () => {
    const modulePath = "/src/lib/tile-cache.ts";
    const { createTileCache } = (await import(
      modulePath
    )) as typeof import("../../src/lib/tile-cache");
    const cache = createTileCache();
    const a = new AbortController(),
      b = new AbortController();
    let calls = 0,
      upstream!: AbortSignal;
    let release!: (r: Response) => void;
    const loader = (signal: AbortSignal) => {
      calls++;
      upstream = signal;
      return new Promise<Response>((resolve) => {
        release = resolve;
      });
    };
    const first = cache("same", loader, a.signal).then(
      () => "unexpected",
      (e: Error) => e.name,
    );
    const second = cache("same", loader, b.signal);
    // Both reads must finish their asynchronous Cache Storage lookup.
    while (!upstream) await new Promise((resolve) => setTimeout(resolve, 10));
    await new Promise((resolve) => setTimeout(resolve, 50));
    a.abort();
    const aborted = await first;
    const otherStillRunning = !upstream.aborted;
    release(new Response("tile"));
    const body = await (await second).text();
    Object.defineProperty(window, "caches", {
      configurable: true,
      get() {
        throw new Error("denied");
      },
    });
    const fallback = createTileCache();
    const response = await fallback(
      "blocked-storage",
      (signal) => fetch("data:text/plain,network", { signal }),
      new AbortController().signal,
    );
    return {
      calls,
      aborted,
      otherStillRunning,
      body,
      fallback: await response.text(),
    };
  });
  expect(result).toEqual({
    calls: 1,
    aborted: "AbortError",
    otherStillRunning: true,
    body: "tile",
    fallback: "network",
  });
});
