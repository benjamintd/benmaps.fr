import { test, expect } from "@playwright/test";
import { captureMap } from "./support/map";

declare global {
  interface Window {
    __rootCommits: number;
  }
}

test("the compass tracks animation without React commits and survives UI updates", async ({
  page,
}) => {
  await captureMap(page);
  await page.addInitScript(() => {
    window.__rootCommits = 0;
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      renderers: new Map(),
      inject(renderer: unknown) {
        this.renderers.set(1, renderer);
        return 1;
      },
      onCommitFiberRoot: () => window.__rootCommits++,
      onCommitFiberUnmount: () => {},
    };
  });
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
  await page.goto("/#14/48.855/2.34/25/35");
  const needle = page.locator(".compass svg");
  await expect
    .poll(() => page.evaluate(() => window.__map?.loaded()))
    .toBe(true);
  await expect
    .poll(() => needle.evaluate((el) => (el as SVGElement).style.transform))
    .toBe("rotateX(35deg) rotateZ(-25deg)");
  // Verify that the React observer is attached before using it as a counter.
  expect(await page.evaluate(() => window.__rootCommits)).toBeGreaterThan(0);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            window.__rootCommits = 0;
            window.__map!.easeTo({ bearing: 115, pitch: 55, duration: 1500 });
            resolve();
          }),
        );
      }),
  );
  await expect
    .poll(() => page.evaluate(() => window.__map!.getBearing()))
    .toBeGreaterThan(35);
  const during = await page.evaluate(() => ({
    bearing: window.__map!.getBearing(),
    pitch: window.__map!.getPitch(),
    moving: window.__map!.isMoving(),
    commits: window.__rootCommits,
    transform:
      document.querySelector<SVGElement>(".compass svg")!.style.transform,
  }));
  expect(during.moving).toBe(true);
  const angles = during.transform.match(
    /rotateX\(([-\d.]+)deg\) rotateZ\(([-\d.]+)deg\)/,
  )!;
  expect(Number(angles[1])).toBeCloseTo(during.pitch, 3);
  expect(Number(angles[2])).toBeCloseTo(-during.bearing, 3);
  expect(during.commits).toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.__map!.isMoving()))
    .toBe(false);
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await expect
    .poll(() => needle.evaluate((el) => (el as SVGElement).style.transform))
    .toBe("rotateX(55deg) rotateZ(-115deg)");
  await page.getByRole("button", { name: "Reset bearing and tilt" }).click();
  await expect
    .poll(() => needle.evaluate((el) => (el as SVGElement).style.transform))
    .toBe("rotateX(0deg) rotateZ(0deg)");
});
