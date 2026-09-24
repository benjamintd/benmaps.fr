import type { Coordinates, Route } from "./domain";
import { metersBetween } from "./geography";

export type LocationFix = {
  coordinates: Coordinates;
  accuracy: number;
  timestamp: number;
};
export const refreshInterval = 20_000;

export function reliableFix(fix: LocationFix, now = Date.now()) {
  return (
    Number.isFinite(fix.accuracy) &&
    fix.accuracy >= 0 &&
    fix.accuracy <= 100 &&
    now - fix.timestamp >= 0 &&
    now - fix.timestamp < 30_000 &&
    fix.coordinates.every(Number.isFinite)
  );
}

export function shouldRefresh(
  from: Coordinates,
  fix: LocationFix,
  lastAttempt: number,
  now = Date.now(),
) {
  return (
    reliableFix(fix, now) &&
    now - lastAttempt >= refreshInterval &&
    metersBetween(from, fix.coordinates) >= 50
  );
}

// Provider indices are not identities: alternatives can change order on refresh.
// Compare the new route against the remaining corridor of the old route.
export function matchingRoute(previous: Route, routes: Route[]) {
  const old = previous.geometry.coordinates;
  const distanceToRoute = (p: number[]) => {
    const scale = Math.cos((p[1] * Math.PI) / 180);
    let best = Infinity;
    for (let i = 1; i < old.length; i++) {
      const a = [(old[i - 1][0] - p[0]) * scale, old[i - 1][1] - p[1]];
      const b = [(old[i][0] - p[0]) * scale, old[i][1] - p[1]];
      const dx = b[0] - a[0],
        dy = b[1] - a[1];
      const t = Math.max(
        0,
        Math.min(1, -(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy || 1)),
      );
      best = Math.min(best, Math.hypot(a[0] + t * dx, a[1] + t * dy));
    }
    return best * 111_195;
  };
  const scores = routes.map((route) => {
    const points = route.geometry.coordinates;
    const samples = points.filter(
      (_, i) => i % Math.max(1, Math.floor(points.length / 32)) === 0,
    );
    return (
      samples.reduce((sum, p) => sum + distanceToRoute(p), 0) / samples.length
    );
  });
  const best = scores.indexOf(Math.min(...scores));
  return best >= 0 && scores[best] < 150 ? best : 0;
}
