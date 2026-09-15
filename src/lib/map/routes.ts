import type * as GeoJSON from "geojson";
import type { Map, GeoJSONSource } from "maplibre-gl";
import type { View } from "../domain";

const routeLayers = ["journey-line", "journey-casing"];
export function routeAtPoint(
  map: Map,
  point: { x: number; y: number },
  radius = 8,
) {
  const layers = routeLayers.filter((id) => map.getLayer(id));
  if (!layers.length) return undefined;
  const hits = map.queryRenderedFeatures(
    [
      [point.x - radius, point.y - radius],
      [point.x + radius, point.y + radius],
    ],
    { layers },
  );
  const hit = hits.find((feature) => !feature.properties?.selected) ?? hits[0];
  const index = hit?.properties?.index;
  return Number.isInteger(index) ? (index as number) : undefined;
}
const empty: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

/** Recreates the route overlay after style swaps and updates its data. */
export function updateRoutes(map: Map, view: View) {
  const journey = view.kind === "directions" ? view.journey : null;
  const routes = journey?.routes.status === "ready" ? journey.routes.data : [];
  const selected = journey?.selected ?? 0;
  type RouteProps = {
    index: number;
    selected: boolean;
    congestion: string | null;
  };
  const features: GeoJSON.Feature<GeoJSON.LineString, RouteProps>[] = [];
  routes.forEach((route, i) => {
    const isSelected = i === selected;
    const coords = route.geometry.coordinates;
    const congestion = route.congestion;
    // Only paint congestion on the selected route, and only when the
    // annotation lines up with the geometry (driving-traffic mode).
    if (isSelected && congestion && congestion.length === coords.length - 1) {
      let start = 0;
      for (let s = 0; s < congestion.length; s++) {
        if (
          s === congestion.length - 1 ||
          congestion[s + 1] !== congestion[s]
        ) {
          features.push({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: coords.slice(start, s + 2),
            },
            properties: {
              index: i,
              selected: true,
              congestion: congestion[s],
            },
          });
          start = s + 1;
        }
      }
    } else {
      features.push({
        type: "Feature",
        geometry: route.geometry,
        properties: { index: i, selected: isSelected, congestion: null },
      });
    }
  });
  // Draw alternatives first so the selected route stays on top.
  features.sort(
    (a, b) => Number(a.properties.selected) - Number(b.properties.selected),
  );
  const data: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };
  if (!map.getSource("journey")) {
    // Keep route lines beneath the basemap labels so place names stay legible.
    const firstSymbol = map
      .getStyle()
      .layers?.find((layer) => layer.type === "symbol")?.id;
    map.addSource("journey", { type: "geojson", data: empty });
    map.addLayer(
      {
        id: "journey-casing",
        type: "line",
        source: "journey",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 10,
          "line-opacity": 0.95,
        },
      },
      firstSymbol,
    );
    map.addLayer(
      {
        id: "journey-line",
        type: "line",
        source: "journey",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          // Selected route: tint moderate/heavy/severe traffic; otherwise blue.
          // Alternatives stay a muted blue.
          "line-color": [
            "case",
            ["get", "selected"],
            [
              "match",
              ["coalesce", ["get", "congestion"], ""],
              "moderate",
              "#f0a03a",
              "heavy",
              "#e2603f",
              "severe",
              "#a63043",
              "#2e6ea2",
            ],
            "#97b8ee",
          ],
          "line-width": ["case", ["get", "selected"], 6, 4],
        },
      },
      firstSymbol,
    );
  }
  (map.getSource("journey") as GeoJSONSource).setData(data);
}
