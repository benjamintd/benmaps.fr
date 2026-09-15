import type { Coordinates } from "./domain";

export function metersBetween(a: Coordinates, b: Coordinates) {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad,
    dLon = (b[0] - a[0]) * rad;
  const h = Math.min(
    1,
    Math.sin(dLat / 2) ** 2 +
      Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2,
  );
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Follow the short segment across the date line, preserving exact endpoints.
export function interpolateCoordinates(
  a: Coordinates,
  b: Coordinates,
  t: number,
): Coordinates {
  if (t === 0) return [...a];
  if (t === 1) return [...b];
  const delta = ((b[0] - a[0] + 540) % 360) - 180;
  return [((a[0] + delta * t + 540) % 360) - 180, a[1] + (b[1] - a[1]) * t];
}
