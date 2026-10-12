import { expect, it, vi } from "vitest";
import type { Map, MapGeoJSONFeature, Point } from "maplibre-gl";
import { isPointerTarget, placeAtPoint } from "../src/lib/map/picking";

const point = { x: 100, y: 100 } as Point;
const coordinate = { lng: 2.33, lat: 48.86 };
function feature(sourceLayer: string, name?: string) {
  return {
    sourceLayer,
    layer: {
      id: `label-${sourceLayer}`,
      type: "symbol",
      "source-layer": sourceLayer,
    },
    properties: { name, kind: "cafe", wikidata: "Q42" },
    geometry: { type: "Point", coordinates: [2.34, 48.87] },
  } as unknown as MapGeoJSONFeature;
}
function map(...features: MapGeoJSONFeature[]) {
  return {
    on: () => {},
    getStyle: () => ({ layers: features.map((feature) => feature.layer) }),
    queryRenderedFeatures: () => features,
  } as unknown as Map;
}
it("mobile taps ignore empty space, road and locality labels, and unnamed features", () => {
  for (const features of [
    [],
    [feature("roads", "Rue de Rivoli")],
    [feature("places", "Paris")],
    [feature("pois")],
  ]) {
    expect(placeAtPoint(map(...features), point, coordinate, true)).toBeNull();
    expect(isPointerTarget(map(...features), point, true)).toBe(false);
  }
});

it("limits picking to label layers and refreshes them after style changes", () => {
  const cafe = feature("pois", "Cafe");
  const road = feature("roads", "Rue de Rivoli");
  let layers = [
    { id: "buildings", type: "fill-extrusion" },
    cafe.layer,
    road.layer,
  ];
  const listeners = new globalThis.Map<string, () => void>();
  const query = vi.fn(() => [cafe]);
  const style = vi.fn(() => ({ layers }));
  const m = {
    on: (event: string, listener: () => void) => listeners.set(event, listener),
    getStyle: style,
    queryRenderedFeatures: query,
  } as unknown as Map;
  expect(isPointerTarget(m, point)).toBe(true);
  expect(query).toHaveBeenLastCalledWith(point, {
    layers: ["label-pois", "label-roads"],
  });
  expect(isPointerTarget(m, point, true)).toBe(true);
  expect(query).toHaveBeenLastCalledWith(point, { layers: ["label-pois"] });
  expect(style).toHaveBeenCalledTimes(1);

  layers = [road.layer];
  listeners.get("styledata")!();
  expect(isPointerTarget(m, point, true)).toBe(false);
  expect(query).toHaveBeenCalledTimes(2);
  expect(style).toHaveBeenCalledTimes(2);
});
it("mobile taps select a named POI even underneath a road label", () => {
  const m = map(feature("roads", "Rue de Rivoli"), feature("pois", "Cafe"));
  expect(placeAtPoint(m, point, coordinate, true)).toMatchObject({
    name: "Cafe",
    coordinates: [2.34, 48.87],
    wikidata: "Q42",
  });
  expect(isPointerTarget(m, point, true)).toBe(true);
});
it("desktop clicks retain label selection and pin dropping", () => {
  expect(placeAtPoint(map(), point, coordinate)).toMatchObject({
    name: "Dropped pin",
    coordinates: [2.33, 48.86],
  });
  expect(
    placeAtPoint(map(feature("roads", "Rue de Rivoli")), point, coordinate)
      ?.name,
  ).toBe("Rue de Rivoli");
});
