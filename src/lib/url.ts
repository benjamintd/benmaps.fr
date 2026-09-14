import { coordinatesSchema, pointPlace } from "./domain";
import type { AppState, Coordinates, Place } from "./domain";
export type Camera = {
  center: Coordinates;
  zoom: number;
  bearing: number;
  pitch: number;
};
export const defaultCamera: Camera = {
  center: [2.3508, 48.8576],
  zoom: 13.2,
  bearing: 0,
  pitch: 0,
};
function coords(text: string | null): Coordinates | null {
  if (!text) return null;
  const result = coordinatesSchema.safeParse(text.split(",").map(Number));
  return result.success ? result.data : null;
}
export function readCamera(url: URL): Camera {
  const values = url.hash.slice(1).split("/").map(Number);
  if (values.length >= 3) {
    const [zoom, lat, lng, bearing = 0, pitch = 0] = values;
    const center = coordinatesSchema.safeParse([lng, lat]);
    if (
      center.success &&
      values.every(Number.isFinite) &&
      zoom >= 1 &&
      zoom <= 20 &&
      Math.abs(bearing) <= 360 &&
      pitch >= 0 &&
      pitch <= 60
    )
      return { center: center.data, zoom, bearing, pitch };
  }
  const legacy = url.pathname
    .split("/")
    .find((p) => p.startsWith("@"))
    ?.slice(1)
    .split(",")
    .map(Number);
  if (
    legacy &&
    legacy.length === 3 &&
    coordinatesSchema.safeParse(legacy.slice(0, 2)).success &&
    Number.isFinite(legacy[2]) &&
    legacy[2] >= 1 &&
    legacy[2] <= 20
  )
    return {
      ...defaultCamera,
      center: [legacy[0], legacy[1]],
      zoom: legacy[2],
    };
  return defaultCamera;
}
const categoryIds = ["restaurant", "cafe", "park", "museum"];
export type SharedUiState = {
  layersOpen: boolean;
  aboutOpen: boolean;
  category: string | null;
  categoryCenter: Coordinates;
  search: string;
  fromSearch: string;
  toSearch: string;
};
function textParam(url: URL, key: string, max: number): string {
  return (url.searchParams.get(key) ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, max);
}
export function readUiState(url: URL): SharedUiState {
  const category = url.searchParams.get("category");
  return {
    layersOpen: url.searchParams.get("layers") === "1",
    aboutOpen: url.searchParams.get("about") === "1",
    category: category && categoryIds.includes(category) ? category : null,
    categoryCenter:
      coords(url.searchParams.get("near")) ?? readCamera(url).center,
    search: textParam(url, "q", 256),
    fromSearch: textParam(url, "from_q", 256),
    toSearch: textParam(url, "to_q", 256),
  };
}
export function readState(url: URL): AppState {
  const get = (key: string): Place | null => {
    const c = coords(url.searchParams.get(key));
    if (!c) return null;
    const fallback =
      key === "from"
        ? "Starting point"
        : key === "to"
          ? "Destination"
          : "Shared pin";
    const place = pointPlace(
      c,
      textParam(url, `${key}_name`, 200).trim() || fallback,
    );
    const wikidata = textParam(url, `${key}_wikidata`, 20);
    return {
      ...place,
      address: textParam(url, `${key}_address`, 500).trim() || place.address,
      category: textParam(url, `${key}_category`, 80).trim() || undefined,
      wikidata: /^Q[1-9]\d{0,15}$/.test(wikidata) ? wikidata : undefined,
      source: "link",
    };
  };
  const settings = {
    basemap:
      url.searchParams.get("basemap") === "satellite"
        ? ("satellite" as const)
        : ("clair" as const),
    traffic: url.searchParams.get("traffic") === "1",
    threeDimensional: url.searchParams.get("3d") === "1",
  };
  const from = get("from"),
    to = get("to");
  const mode = url.searchParams.get("mode");
  if (
    from ||
    to ||
    ["driving-traffic", "walking", "cycling"].includes(mode ?? "")
  ) {
    const requestedRoute = Number(url.searchParams.get("route"));
    return {
      settings,
      view: {
        kind: "directions",
        journey: {
          from,
          to,
          travelMode:
            mode === "walking" || mode === "cycling" ? mode : "driving-traffic",
          routes: { status: "idle" },
          selected:
            Number.isInteger(requestedRoute) &&
            requestedRoute >= 1 &&
            requestedRoute <= 10
              ? requestedRoute - 1
              : 0,
        },
      },
    };
  }
  const legacy = coords(
    url.pathname
      .split("/")
      .find((p) => p.startsWith("+"))
      ?.slice(1) ?? null,
  );
  return {
    settings,
    view: {
      kind: "explore",
      place: get("pin") ?? (legacy ? pointPlace(legacy) : null),
    },
  };
}
export function writeState(
  url: URL,
  state: AppState,
  ui: SharedUiState = readUiState(url),
): URL {
  const next = new URL(url);
  next.pathname = "/";
  for (const key of ["pin", "from", "to"]) {
    for (const suffix of ["", "_name", "_address", "_category", "_wikidata"])
      next.searchParams.delete(key + suffix);
  }
  for (const key of [
    "mode",
    "route",
    "basemap",
    "traffic",
    "3d",
    "layers",
    "about",
    "category",
    "near",
    "q",
    "from_q",
    "to_q",
  ])
    next.searchParams.delete(key);
  const putPlace = (key: string, place: Place | null) => {
    if (!place) return;
    next.searchParams.set(key, place.coordinates.join(","));
    next.searchParams.set(`${key}_name`, place.name.slice(0, 200));
    if (
      place.address &&
      place.address !== pointPlace(place.coordinates).address
    )
      next.searchParams.set(`${key}_address`, place.address.slice(0, 500));
    if (place.category)
      next.searchParams.set(`${key}_category`, place.category.slice(0, 80));
    if (place.wikidata)
      next.searchParams.set(`${key}_wikidata`, place.wikidata);
  };
  if (state.settings.basemap === "satellite")
    next.searchParams.set("basemap", "satellite");
  if (state.settings.traffic) next.searchParams.set("traffic", "1");
  if (state.settings.threeDimensional) next.searchParams.set("3d", "1");
  if (ui.layersOpen) next.searchParams.set("layers", "1");
  if (ui.aboutOpen) next.searchParams.set("about", "1");
  if (state.view.kind === "explore") {
    putPlace("pin", state.view.place);
    if (ui.search) next.searchParams.set("q", ui.search.slice(0, 256));
    if (ui.category && categoryIds.includes(ui.category)) {
      next.searchParams.set("category", ui.category);
      next.searchParams.set("near", ui.categoryCenter.join(","));
    }
  } else {
    const { from, to, travelMode, selected } = state.view.journey;
    putPlace("from", from);
    putPlace("to", to);
    next.searchParams.set("mode", travelMode);
    if (selected > 0) next.searchParams.set("route", String(selected + 1));
    if (!from && ui.fromSearch)
      next.searchParams.set("from_q", ui.fromSearch.slice(0, 256));
    if (!to && ui.toSearch)
      next.searchParams.set("to_q", ui.toSearch.slice(0, 256));
  }
  return next;
}
export function hasCamera(url: URL): boolean {
  return readCamera(url) !== defaultCamera;
}
export function cameraHash(camera: Camera): string {
  return `#${camera.zoom.toFixed(3)}/${camera.center[1].toFixed(7)}/${camera.center[0].toFixed(7)}/${camera.bearing.toFixed(2)}/${camera.pitch.toFixed(2)}`;
}
