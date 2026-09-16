import { afterEach, expect, it, vi } from "vitest";
vi.mock("../src/lib/clair-3d", () => {
  throw new Error("Style loading must not depend on the optional 3D SDK");
});
vi.mock("../src/lib/config", () => ({ config: { mapboxToken: "test-token" } }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("requests and caches local-language Clair variants, preserving 3D buildings in both basemaps", async () => {
  const request = vi.fn(async (input: string) => ({
    ok: true,
    json: async () => ({
      version: 8,
      sources: {
        elevation: { type: "raster-dem", tiles: ["https://example.test/dem"] },
        ...(input.includes("terrain=1")
          ? {
              terrain: {
                type: "raster-dem",
                tiles: ["https://example.test/dem"],
              },
            }
          : {}),
      },
      ...(input.includes("terrain=1")
        ? { terrain: { source: "terrain", exaggeration: 1 } }
        : {}),
      layers: [
        { id: "ground", type: "background" },
        ...(new URL(input).searchParams.get("3d") === "1"
          ? [
              {
                id: "building-extrusion",
                type: "fill-extrusion",
                source: "protomaps",
                "source-layer": "buildings",
                paint: { "fill-extrusion-height": 12 },
              },
            ]
          : []),
      ],
      ...(new URL(input).searchParams.get("3d") === "1"
        ? { light: { intensity: 0.4 } }
        : {}),
    }),
  }));
  vi.stubGlobal("fetch", request);
  const { mapStyle } = await import("../src/lib/map-style");
  const settings = {
    basemap: "clair" as const,
    traffic: false,
    threeDimensional: false,
  };
  const flat = await mapStyle(settings);
  expect(flat.layers.some((l) => l.type === "fill-extrusion")).toBe(false);
  const volume = await mapStyle({ ...settings, threeDimensional: true });
  expect(volume.layers.some((l) => l.type === "fill-extrusion")).toBe(true);
  const buildings = volume.layers.find((l) => l.id === "building-extrusion");
  expect(buildings?.paint).toEqual({ "fill-extrusion-height": 12 });
  expect(volume.light).toEqual({ intensity: 0.4 });
  expect(volume.projection).toEqual({ type: "mercator" });
  expect(volume.terrain?.source).toBe("terrain");
  expect(volume.sources.terrain).not.toBe(volume.sources.elevation);
  const satellite = await mapStyle({
    ...settings,
    threeDimensional: true,
    basemap: "satellite",
  });
  expect(satellite.layers.map((l) => l.id)).toContain("building-extrusion");
  const restored = await mapStyle(settings);
  expect(restored.layers.some((l) => l.type === "fill-extrusion")).toBe(false);
  expect(restored.terrain).toBeUndefined();
  expect(restored.projection).toEqual({ type: "mercator" });
  expect(request.mock.calls.map(([url]) => url)).toEqual([
    "https://clair.benmaps.fr/styles/latest/light.json?lang=local",
    "https://clair.benmaps.fr/styles/latest/light.json?lang=local&3d=1&terrain=1",
  ]);
});
