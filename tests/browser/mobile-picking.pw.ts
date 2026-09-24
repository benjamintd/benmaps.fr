import { test, expect } from "@playwright/test";
import { captureMap } from "./support/map";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test("mobile blank taps and pans do not select places; a hold drops exactly one pin", async ({
  page,
  context,
}) => {
  await captureMap(page);
  await page.route("https://clair.benmaps.fr/styles/**", (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#eee" },
          },
        ],
      },
    }),
  );
  await page.goto("/#14/48.86/2.34/0/0");
  await expect
    .poll(() => page.evaluate(() => !!window.__map?.isStyleLoaded()))
    .toBe(true);
  await page.touchscreen.tap(190, 350);
  expect(new URL(page.url()).searchParams.has("pin")).toBe(false);
  const touch = await context.newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 190, y: 350 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 220, y: 350 }],
  });
  await page.waitForTimeout(650);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  expect(new URL(page.url()).searchParams.has("pin")).toBe(false);
  await page.waitForTimeout(1000);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 190, y: 350 }],
  });
  await page.waitForTimeout(650);
  await expect(
    page.getByRole("heading", { name: "Dropped pin", exact: true }),
  ).toBeVisible();
  const pin = new URL(page.url()).searchParams.get("pin");
  await page.waitForTimeout(1200);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(300);
  expect(new URL(page.url()).searchParams.get("pin")).toBe(pin);
  await expect(page.locator(".map-marker.selected")).toHaveCount(1);
  await expect(page.locator(".context-popup")).toHaveCount(0);
});
