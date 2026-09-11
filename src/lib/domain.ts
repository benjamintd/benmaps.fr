import type * as GeoJSON from "geojson";
import { z } from "zod";

export const coordinatesSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-85.051129).max(85.051129),
]);
export type Coordinates = z.infer<typeof coordinatesSchema>;
export type Place = {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  category?: string;
  wikidata?: string;
  source: "map" | "search" | "location" | "link";
};
export type TravelMode = "driving-traffic" | "walking" | "cycling";
export type Step = {
  instruction: string;
  distance: number;
  coordinates: Coordinates;
  type: string;
  modifier?: string;
};
export type Route = {
  id: string;
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  summary: string;
  steps: Step[];
};
export type Resource<T> =
  | { status: "idle" }
  | { status: "loading"; key: string }
  | { status: "ready"; key: string; data: T }
  | { status: "error"; key: string; message: string };
export type Journey = {
  from: Place | null;
  to: Place | null;
  travelMode: TravelMode;
  routes: Resource<Route[]>;
  selected: number;
};
export type View =
  | { kind: "explore"; place: Place | null }
  | { kind: "directions"; journey: Journey };
export type MapSettings = {
  basemap: "clair" | "satellite";
  traffic: boolean;
  threeDimensional: boolean;
};
export type AppState = { view: View; settings: MapSettings };
export type Action =
  | { type: "explore" }
  | { type: "select-place"; place: Place }
  | { type: "directions"; from?: Place; to?: Place }
  | { type: "endpoint"; endpoint: "from" | "to"; place: Place | null }
  | { type: "swap" }
  | { type: "travel-mode"; mode: TravelMode }
  | { type: "route-loading"; key: string }
  | { type: "route-result"; key: string; routes: Route[] }
  | { type: "route-error"; key: string; message: string }
  | { type: "route-select"; index: number }
  | { type: "settings"; settings: Partial<MapSettings> };
export const defaultState: AppState = {
  view: { kind: "explore", place: null },
  settings: { basemap: "clair", traffic: false, threeDimensional: false },
};
export function journeyKey(journey: Journey): string | null {
  return journey.from && journey.to
    ? `${journey.travelMode}:${journey.from.coordinates.join(",")};${journey.to.coordinates.join(",")}`
    : null;
}
const emptyRoutes = { status: "idle" } as const;
export function reducer(state: AppState, action: Action): AppState {
  if (action.type === "explore")
    return { ...state, view: { kind: "explore", place: null } };
  if (action.type === "select-place")
    return { ...state, view: { kind: "explore", place: action.place } };
  if (action.type === "settings")
    return { ...state, settings: { ...state.settings, ...action.settings } };
  if (action.type === "directions")
    return {
      ...state,
      view: {
        kind: "directions",
        journey: {
          from: action.from ?? null,
          to:
            action.to ??
            (!action.from && state.view.kind === "explore"
              ? state.view.place
              : null),
          travelMode: "driving-traffic",
          routes: emptyRoutes,
          selected: 0,
        },
      },
    };
  if (state.view.kind !== "directions") return state;
  const journey = state.view.journey;
  const update = (next: Partial<Journey>): AppState => ({
    ...state,
    view: { kind: "directions", journey: { ...journey, ...next } },
  });
  switch (action.type) {
    case "endpoint":
      return update({
        [action.endpoint]: action.place,
        routes: emptyRoutes,
        selected: 0,
      });
    case "swap":
      return update({
        from: journey.to,
        to: journey.from,
        routes: emptyRoutes,
        selected: 0,
      });
    case "travel-mode":
      return update({
        travelMode: action.mode,
        routes: emptyRoutes,
        selected: 0,
      });
    case "route-loading":
      return journeyKey(journey) === action.key
        ? update({
            routes: { status: "loading", key: action.key },
            selected: 0,
          })
        : state;
    case "route-result":
      if (
        journeyKey(journey) !== action.key ||
        journey.routes.status !== "loading" ||
        journey.routes.key !== action.key
      )
        return state;
      return update({
        routes: action.routes.length
          ? { status: "ready", key: action.key, data: action.routes }
          : {
              status: "error",
              key: action.key,
              message:
                "No route found. Try different points or a different travel mode.",
            },
        selected: 0,
      });
    case "route-error":
      return journeyKey(journey) === action.key &&
        journey.routes.status === "loading" &&
        journey.routes.key === action.key
        ? update({
            routes: {
              status: "error",
              key: action.key,
              message: action.message,
            },
          })
        : state;
    case "route-select":
      return journey.routes.status === "ready" &&
        Number.isInteger(action.index) &&
        action.index >= 0 &&
        action.index < journey.routes.data.length
        ? update({ selected: action.index })
        : state;
  }
}
export const distance = (meters: number) =>
  meters > 0 && meters < 10
    ? "<10 m"
    : meters < 1000
      ? `${Math.round(meters / 10) * 10} m`
      : `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
export function duration(seconds: number) {
  const mins = Math.max(1, Math.round(seconds / 60));
  return mins < 60
    ? `${mins} min`
    : `${Math.floor(mins / 60)} hr${mins % 60 ? ` ${mins % 60} min` : ""}`;
}
export function pointPlace(
  coordinates: Coordinates,
  name = "Dropped pin",
): Place {
  return {
    id: coordinates.join(","),
    name,
    coordinates,
    address: `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`,
    source: "map",
  };
}
