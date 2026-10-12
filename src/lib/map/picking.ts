import type { Map, MapGeoJSONFeature, Point } from "maplibre-gl";
import { pointPlace } from "../domain";
import type { Coordinates, Place } from "../domain";
import { wikidataId } from "../wikidata";

const labelLayers = new WeakMap<Map, { all: string[]; pois: string[] }>();
const observedMaps = new WeakSet<Map>();

function layersForLabels(map: Map, poisOnly: boolean): string[] {
  if (!observedMaps.has(map)) {
    const invalidate = () => labelLayers.delete(map);
    map.on("styledata", invalidate);
    map.on("remove", invalidate);
    observedMaps.add(map);
  }
  let cached = labelLayers.get(map);
  if (!cached) {
    const symbols = (map.getStyle()?.layers ?? []).filter(
      (layer) => layer.type === "symbol",
    );
    cached = {
      all: symbols.map((layer) => layer.id),
      pois: symbols
        .filter((layer) => layer["source-layer"] === "pois")
        .map((layer) => layer.id),
    };
    labelLayers.set(map, cached);
  }
  return poisOnly ? cached.pois : cached.all;
}

function labelled(feature: MapGeoJSONFeature): boolean {
  return (
    feature.layer.type === "symbol" &&
    Boolean(feature.properties?.name || feature.properties?.["name:en"])
  );
}

/** The basemap label under the pointer, if the pointer is over one. */
export function labelAtPoint(map: Map, point: Point, poisOnly = false) {
  const layers = layersForLabels(map, poisOnly);
  if (!layers.length) return undefined;
  return map
    .queryRenderedFeatures(point, { layers })
    .find(
      (feature) =>
        labelled(feature) && (!poisOnly || feature.sourceLayer === "pois"),
    );
}

/** True when the pointer is over anything the user can click through to. */
export function isPointerTarget(
  map: Map,
  point: Point,
  poisOnly = false,
): boolean {
  return Boolean(labelAtPoint(map, point, poisOnly));
}

/**
 * The place a map click selects: the basemap label under the pointer when there
 * is one, otherwise a dropped pin at the clicked position.
 */
export function placeAtPoint(
  map: Map,
  point: Point,
  lngLat: { lng: number; lat: number },
  poisOnly = false,
): Place | null {
  const feature = labelAtPoint(map, point, poisOnly);
  if (poisOnly && !feature) return null;
  const coordinates: Coordinates =
    feature?.geometry.type === "Point"
      ? [feature.geometry.coordinates[0], feature.geometry.coordinates[1]]
      : [lngLat.lng, lngLat.lat];
  return {
    ...pointPlace(
      coordinates,
      feature
        ? String(feature.properties.name || feature.properties["name:en"])
        : undefined,
    ),
    category: feature?.properties.kind,
    wikidata: wikidataId(feature?.properties.wikidata),
  };
}
