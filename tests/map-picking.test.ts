import { expect, it } from "vitest";
import type { Map, MapGeoJSONFeature, Point } from "maplibre-gl";
import { isPointerTarget, placeAtPoint } from "../src/lib/map/picking";

const point = { x: 100, y: 100 } as Point;
const coordinate = { lng: 2.33, lat: 48.86 };
function feature(sourceLayer: string, name?: string) {
  return {
    sourceLayer,
    layer: { type: "symbol" },
    properties: { name, kind: "cafe", wikidata: "Q42" },
    geometry: { type: "Point", coordinates: [2.34, 48.87] },
  } as unknown as MapGeoJSONFeature;
}
function map(...features: MapGeoJSONFeature[]) {
  return { queryRenderedFeatures: () => features } as unknown as Map;
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
