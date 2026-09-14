// Adapted from Clair 3D 0.1.1. See public/trees/LICENSE.txt and THIRD_PARTY.txt.
import type { Feature, Geometry } from "geojson";
export type TreeRecord = {
  key: string;
  coordinates: [number, number];
  seed: number;
  height: number;
  radius: number;
};
const circumference = 40075016.68557849;
/** Local scene coordinates are metres: X east, Y up, Z south. */
export function mercator([lng, lat]: readonly number[]) {
  const radians =
    (Math.max(-85.051129, Math.min(85.051129, lat)) * Math.PI) / 180;
  return {
    x: (lng + 180) / 360,
    y: (1 - Math.log(Math.tan(Math.PI / 4 + radians / 2)) / Math.PI) / 2,
    scale: 1 / (circumference * Math.cos(radians)),
  };
}
export function seedFor(key: string) {
  let seed = 2166136261;
  for (const c of key) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  return (seed >>> 0) / 4294967296;
}
export function treeRecords(
  features: Feature<Geometry>[],
  center: readonly number[],
  limit = 3000,
): TreeRecord[] {
  const unique = new Map<string, TreeRecord>();
  for (const f of features) {
    const p = f.properties || {};
    if (
      f.geometry.type !== "Point" ||
      p.kind !== "tree" ||
      p.location === "underground" ||
      [true, "yes"].includes(p.underground) ||
      p.is_tunnel === true ||
      ![undefined, false, "no"].includes(p.tunnel) ||
      (Number(p.layer) < 0 &&
        p.location !== "overground" &&
        p.is_bridge !== true &&
        p.bridge !== "yes")
    )
      continue;
    const [lng, lat] = f.geometry.coordinates;
    if (
      !Number.isFinite(lng) ||
      !Number.isFinite(lat) ||
      Math.abs(lat) > 85.051129
    )
      continue;
    const longitude = ((((lng + 180) % 360) + 360) % 360) - 180;
    const key = `${longitude.toFixed(6)},${lat.toFixed(6)}`;
    if (unique.has(key)) continue;
    const seed = seedFor(key);
    const height = Number(p.height),
      crown = Number(p.diameter_crown ?? p.crown_diameter);
    unique.set(key, {
      key,
      seed,
      // Place the nearest world copy, including when panning across the date line.
      coordinates: [
        longitude + 360 * Math.round((center[0] - longitude) / 360),
        lat,
      ],
      height: height > 1 && height < 60 ? height : 7 + seed * 4,
      radius: crown > 1 && crown < 40 ? crown / 2 : 2.5 + seed * 1.3,
    });
  }
  const cos = Math.cos((center[1] * Math.PI) / 180);
  const distance = (t: TreeRecord) =>
    ((t.coordinates[0] - center[0]) * cos) ** 2 +
    (t.coordinates[1] - center[1]) ** 2;
  return [...unique.values()]
    .sort((a, b) => distance(a) - distance(b) || a.key.localeCompare(b.key))
    .slice(0, limit);
}
