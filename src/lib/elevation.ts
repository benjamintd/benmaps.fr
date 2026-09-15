import type { Coordinates } from "./domain";
import { interpolateCoordinates, metersBetween } from "./geography";

// Evenly-spaced sample points along the route (roughly every 100 m, capped).
export function sampleLine(coords: Coordinates[]): Coordinates[] {
  if (coords.length < 2) return coords;
  const cumulative = [0];
  for (let i = 1; i < coords.length; i++)
    cumulative.push(
      cumulative[i - 1] + metersBetween(coords[i - 1], coords[i]),
    );
  const total = cumulative[cumulative.length - 1];
  if (total === 0) return [coords[0]];
  const count = Math.min(40, Math.max(2, Math.ceil(total / 100) + 1));
  const samples: Coordinates[] = [];
  let segment = 0;
  for (let i = 0; i < count; i++) {
    const target = (i * total) / (count - 1);
    while (segment < coords.length - 2 && cumulative[segment + 1] < target)
      segment++;
    const span = cumulative[segment + 1] - cumulative[segment] || 1;
    const t = (target - cumulative[segment]) / span;
    const a = coords[segment];
    const b = coords[segment + 1];
    samples.push(interpolateCoordinates(a, b, t));
  }
  return samples;
}

// Missing samples remain gaps; never invent flat terrain or count jumps over gaps.
export function elevationStats(elevations: (number | null)[]) {
  const known = elevations.filter(
    (e): e is number => e !== null && Number.isFinite(e),
  );
  if (known.length < 2) return null;
  let ascent = 0,
    descent = 0;
  for (let i = 1; i < elevations.length; i++) {
    const a = elevations[i - 1],
      b = elevations[i];
    if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b))
      continue;
    const delta = b - a;
    ascent += Math.max(0, delta);
    descent += Math.max(0, -delta);
  }
  return {
    ascent,
    descent,
    min: Math.min(...known),
    max: Math.max(...known),
    partial: known.length !== elevations.length,
  };
}
