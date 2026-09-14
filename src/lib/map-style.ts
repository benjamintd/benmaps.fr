import type { StyleSpecification } from "maplibre-gl";
import { config } from "./config";
import type { MapSettings } from "./domain";
// Clair's hosted style ships fonts, sprites and an empty Protomaps vector
// source that we point at our own tile provider. "latest" tracks the newest
// release; pin a versioned URL here if you need reproducible cartography.
const STYLE_URL = "https://clair.benmaps.fr/styles/latest/light.json";
const baseStyles = new Map<boolean, Promise<StyleSpecification>>();
function loadBaseStyle(threeDimensional: boolean): Promise<StyleSpecification> {
  let pending = baseStyles.get(threeDimensional);
  if (!pending) {
    pending = fetch(`${STYLE_URL}${threeDimensional ? "?3d=1" : ""}`)
      .then((response) => {
        if (!response.ok)
          throw new Error(`Clair style request failed (${response.status})`);
        return response.json() as Promise<StyleSpecification>;
      })
      .catch((error) => {
        baseStyles.delete(threeDimensional);
        throw error;
      });
    baseStyles.set(threeDimensional, pending);
  }
  return pending;
}
export async function mapStyle(
  settings: MapSettings,
): Promise<StyleSpecification> {
  const style = structuredClone(await loadBaseStyle(settings.threeDimensional));
  // Clair 3D renders in Mercator; terrain and extrusions remain independent.
  style.projection = { type: "mercator" };
  // Fill Clair's empty vector source with our tiles (PMTiles or Protomaps API).
  const protomaps = style.sources.protomaps as unknown as {
    type: string;
    tiles?: string[];
    url?: string;
  };
  if (protomaps) {
    if (config.pmtilesUrl) {
      protomaps.type = "vector";
      delete protomaps.tiles;
      protomaps.url = `pmtiles://${new URL(config.pmtilesUrl, window.location.origin).href}`;
    } else if (config.protomapsKey) {
      protomaps.tiles = [
        `https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=${encodeURIComponent(config.protomapsKey)}`,
      ];
    }
  }
  if (settings.threeDimensional)
    style.terrain = { source: "elevation", exaggeration: 1 };
  const token = config.mapboxToken;
  if (settings.basemap === "satellite" && token) {
    style.sources.satellite = {
      type: "raster",
      tiles: [
        `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${encodeURIComponent(token)}`,
      ],
      tileSize: 256,
      maxzoom: 22,
      attribution:
        '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © Maxar',
    };
    const labels = style.layers.filter((layer) => layer.type === "symbol");
    for (const layer of labels) {
      if (layer.type === "symbol" && layer.layout?.["text-field"])
        layer.paint = {
          ...layer.paint,
          "text-color": "#ffffff",
          "text-halo-color": "#263731",
          "text-halo-width": 1.5,
        };
    }
    style.layers = [
      { id: "satellite", type: "raster", source: "satellite" },
      ...style.layers.filter((layer) => layer.type === "fill-extrusion"),
      ...labels,
    ];
  }
  if (settings.traffic && token) {
    style.sources.traffic = {
      type: "vector",
      tiles: [
        `https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/{z}/{x}/{y}.vector.pbf?access_token=${encodeURIComponent(token)}`,
      ],
      maxzoom: 15,
      attribution:
        'Traffic © <a href="https://www.mapbox.com/about/maps/">Mapbox</a>',
    };
    const at = style.layers.findIndex((layer) => layer.type === "symbol");
    style.layers.splice(at < 0 ? style.layers.length : at, 0, {
      id: "traffic-flow",
      type: "line",
      source: "traffic",
      "source-layer": "traffic",
      minzoom: 7,
      filter: [
        "in",
        ["get", "congestion"],
        ["literal", ["low", "moderate", "heavy", "severe"]],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": [
          "match",
          ["get", "congestion"],
          "low",
          "#54b98a",
          "moderate",
          "#ffc048",
          "heavy",
          "#ee6a5b",
          "severe",
          "#a63043",
          "#54b98a",
        ],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          7,
          1,
          13,
          2.5,
          18,
          6,
        ],
        "line-opacity": 0.9,
      },
    });
  }
  return style;
}
