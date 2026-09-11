import { coordinatesSchema, defaultState, pointPlace } from "./domain";
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
export function readState(url: URL): AppState {
  const get = (key: string): Place | null => {
    const c = coords(url.searchParams.get(key));
    return c
      ? {
          ...pointPlace(
            c,
            key === "from"
              ? "Starting point"
              : key === "to"
                ? "Destination"
                : "Shared pin",
          ),
          source: "link",
        }
      : null;
  };
  const from = get("from"),
    to = get("to");
  const mode = url.searchParams.get("mode");
  if (from || to)
    return {
      ...defaultState,
      view: {
        kind: "directions",
        journey: {
          from,
          to,
          travelMode:
            mode === "walking" || mode === "cycling" ? mode : "driving-traffic",
          routes: { status: "idle" },
          selected: 0,
        },
      },
    };
  const legacy = coords(
    url.pathname
      .split("/")
      .find((p) => p.startsWith("+"))
      ?.slice(1) ?? null,
  );
  return {
    ...defaultState,
    view: {
      kind: "explore",
      place: get("pin") ?? (legacy ? pointPlace(legacy) : null),
    },
  };
}
export function writeState(url: URL, state: AppState): URL {
  const next = new URL(url);
  next.pathname = "/";
  for (const key of ["pin", "from", "to", "mode"])
    next.searchParams.delete(key);
  if (state.view.kind === "explore" && state.view.place)
    next.searchParams.set("pin", state.view.place.coordinates.join(","));
  if (state.view.kind === "directions") {
    const { from, to, travelMode } = state.view.journey;
    if (from) next.searchParams.set("from", from.coordinates.join(","));
    if (to) next.searchParams.set("to", to.coordinates.join(","));
    next.searchParams.set("mode", travelMode);
  }
  return next;
}
export function cameraHash(camera: Camera): string {
  return `#${camera.zoom.toFixed(2)}/${camera.center[1].toFixed(5)}/${camera.center[0].toFixed(5)}/${camera.bearing.toFixed(1)}/${camera.pitch.toFixed(1)}`;
}
