import { afterEach, expect, it, vi } from "vitest";
import type { Map, MapMouseEvent } from "maplibre-gl";
import { installMapHover } from "../src/lib/map/hover";

afterEach(() => vi.unstubAllGlobals());

function fixture() {
  const frames = new globalThis.Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    frames.set(++nextFrame, fn);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
  const listeners = new globalThis.Map<
    string,
    Set<(event: MapMouseEvent) => void>
  >();
  const canvas = { style: { cursor: "" } };
  const label = {
    layer: { id: "poi", type: "symbol", "source-layer": "pois" },
    sourceLayer: "pois",
    properties: { name: "Cafe" },
  };
  const query = vi.fn(() => [label]);
  const map = {
    getCanvas: () => canvas,
    getStyle: () => ({ layers: [label.layer] }),
    getLayer: () => undefined,
    isMoving: () => false,
    queryRenderedFeatures: query,
    on: (name: string, fn: (event: MapMouseEvent) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
    },
    off: (name: string, fn: (event: MapMouseEvent) => void) =>
      listeners.get(name)?.delete(fn),
  } as unknown as Map;
  const remove = installMapHover(map);
  const fire = (name: string, x = 0, buttons = 0) => {
    for (const fn of listeners.get(name) ?? [])
      fn({ point: { x, y: 100 }, originalEvent: { buttons } } as MapMouseEvent);
  };
  const render = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((fn) => fn(0));
  };
  return { canvas, query, fire, render, remove };
}

it("checks the latest pointer once per frame and cancels hover when it leaves", () => {
  const f = fixture();
  for (let x = 1; x <= 20; x++) f.fire("mousemove", x);
  expect(f.query).not.toHaveBeenCalled();
  f.render();
  expect(f.query).toHaveBeenCalledExactlyOnceWith(
    { x: 20, y: 100 },
    { layers: ["poi"] },
  );
  expect(f.canvas.style.cursor).toBe("pointer");
  f.fire("mousemove", 21);
  f.fire("mouseout");
  f.render();
  expect(f.query).toHaveBeenCalledTimes(1);
  expect(f.canvas.style.cursor).toBe("");
  f.remove();
});

it("skips camera gestures and refreshes a stationary pointer when movement ends", () => {
  const f = fixture();
  f.fire("mousemove", 1);
  f.render();
  f.query.mockClear();
  f.fire("movestart");
  expect(f.canvas.style.cursor).toBe("");
  for (let x = 2; x <= 20; x++) {
    f.fire("mousemove", x, 1);
    f.render();
  }
  expect(f.query).not.toHaveBeenCalled();
  f.fire("moveend");
  f.render();
  expect(f.query).toHaveBeenCalledExactlyOnceWith(
    { x: 20, y: 100 },
    { layers: ["poi"] },
  );
  expect(f.canvas.style.cursor).toBe("pointer");
  f.fire("mousemove", 21);
  f.remove();
  f.render();
  f.fire("mousemove", 22);
  f.render();
  expect(f.query).toHaveBeenCalledTimes(1);
});
