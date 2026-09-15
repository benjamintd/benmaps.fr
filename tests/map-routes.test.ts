import { expect, it, vi } from "vitest";
import type { Map } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { routeAtPoint, updateRoutes } from "../src/lib/map/routes";
import type { Route, View } from "../src/lib/domain";

function fixture() {
  let source: { setData: ReturnType<typeof vi.fn> } | undefined;
  const setData = vi.fn();
  const map = {
    getSource: () => source,
    addSource: vi.fn(() => {
      source = { setData };
    }),
    addLayer: vi.fn(),
    getStyle: () => ({ layers: [{ id: "labels", type: "symbol" }] }),
    getLayer: vi.fn(() => true),
    queryRenderedFeatures: vi.fn(),
  };
  return {
    map: map as unknown as Map,
    calls: map,
    setData,
    clearStyle: () => {
      source = undefined;
    },
  };
}
const route: Route = {
  id: "primary",
  distance: 400,
  duration: 90,
  summary: "Main street",
  steps: [],
  geometry: {
    type: "LineString",
    coordinates: [
      [2, 48],
      [2.01, 48],
      [2.02, 48],
      [2.03, 48],
    ],
  },
  congestion: ["low", "low", "heavy"],
};
function view(routes: Route[]): View {
  return {
    kind: "directions",
    journey: {
      from: null,
      to: null,
      travelMode: "driving-traffic",
      routes: { status: "ready", key: "route", data: routes },
      selected: 0,
    },
  };
}
it("keeps congestion segments contiguous and alternatives beneath the selected route", () => {
  const { map, calls, setData } = fixture();
  updateRoutes(map, view([route, { ...route, id: "alternative" }]));
  const data = setData.mock.calls[0][0] as FeatureCollection;
  expect(data.features.map((f) => f.properties)).toEqual([
    { index: 1, selected: false, congestion: null },
    { index: 0, selected: true, congestion: "low" },
    { index: 0, selected: true, congestion: "heavy" },
  ]);
  expect(data.features.slice(1).map((f) => f.geometry)).toEqual([
    { type: "LineString", coordinates: route.geometry.coordinates.slice(0, 3) },
    { type: "LineString", coordinates: route.geometry.coordinates.slice(2) },
  ]);
  expect(calls.addLayer.mock.calls.map((c) => c[1])).toEqual([
    "labels",
    "labels",
  ]);
});
it("falls back to full geometry for misaligned congestion and restores overlays after a style swap", () => {
  const { map, calls, setData, clearStyle } = fixture();
  const state = view([{ ...route, congestion: ["heavy"] }]);
  updateRoutes(map, state);
  expect(setData.mock.calls[0][0].features).toMatchObject([
    { geometry: route.geometry, properties: { congestion: null } },
  ]);
  clearStyle();
  updateRoutes(map, state);
  expect(calls.addSource).toHaveBeenCalledTimes(2);
  updateRoutes(map, { kind: "explore", place: null });
  expect(setData.mock.lastCall?.[0].features).toEqual([]);
  expect(calls.addSource).toHaveBeenCalledTimes(2);
});
it("selects an overlapping alternative and tolerates a style without route layers", () => {
  const { map, calls } = fixture();
  calls.queryRenderedFeatures.mockReturnValue([
    { properties: { index: 0, selected: true } },
    { properties: { index: 1, selected: false } },
  ]);
  expect(routeAtPoint(map, { x: 10, y: 20 })).toBe(1);
  calls.getLayer.mockReturnValue(false);
  expect(routeAtPoint(map, { x: 10, y: 20 })).toBeUndefined();
  expect(calls.queryRenderedFeatures).toHaveBeenCalledTimes(1);
});
