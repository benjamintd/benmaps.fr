import type { Plugin } from "vite";

/**
 * Golden Gate Bridge's bounded footings were calibrated to 6.9.0 DEM samples.
 * 6.9.1 shifted CPU and GPU sampling by half a DEM cell (upstream #8420),
 * exceeding those bounds and hiding the entire bridge. Keep their previous
 * alignment until the authored footings are recalibrated; preserve the other
 * 6.9.1 fixes, including its parent-tile transform and navigation improvements.
 * These tokens belong to the pinned 6.9.1 distribution. Fail on source changes.
 */
export function maplibreTerrainCompatibility(): Plugin {
  return {
    name: "maplibre-landmark-terrain-compatibility",
    enforce: "pre",
    transform(code, id) {
      if (!id.split("?")[0].endsWith("/maplibre-gl/dist/maplibre-gl.mjs"))
        return null;
      const replacements = [
        ["gc=-.5", "gc=0"],
        ["u_terrain_dim+1.5", "u_terrain_dim+2.0"],
      ];
      if (!code.includes("c=a[12]*i.dim+gc,l=a[13]*i.dim+gc"))
        throw new Error(
          "MapLibre terrain sampler changed; review compatibility",
        );
      for (const [before, after] of replacements) {
        if (code.split(before).length !== 2)
          throw new Error(
            "MapLibre terrain alignment changed; review compatibility",
          );
        code = code.replace(before, after);
      }
      return { code, map: null };
    },
  };
}
