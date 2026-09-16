import type { Map, MapGeoJSONFeature, Point } from "maplibre-gl";
import { pointPlace } from "../domain";
import type { Coordinates, Place } from "../domain";
import { wikidataId } from "../wikidata";

function labelled(feature: MapGeoJSONFeature): boolean {
  return (
    feature.layer.type === "symbol" &&
    Boolean(feature.properties?.name || feature.properties?.["name:en"])
  );
}

/** The basemap label under the pointer, if the pointer is over one. */
export function labelAtPoint(map: Map, point: Point) {
  return map.queryRenderedFeatures(point).find(labelled);
}

/** True when the pointer is over anything the user can click through to. */
export function isPointerTarget(map: Map, point: Point): boolean {
  return map
    .queryRenderedFeatures(point)
    .some((feature) => feature.layer.type === "symbol");
}

/**
 * The place a map click selects: the basemap label under the pointer when there
 * is one, otherwise a dropped pin at the clicked position.
 */
export function placeAtPoint(
  map: Map,
  point: Point,
  lngLat: { lng: number; lat: number },
): Place {
  const feature = labelAtPoint(map, point);
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
