export const config = {
  protomapsKey: import.meta.env.VITE_PROTOMAPS_KEY as string | undefined,
  mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN as string | undefined,
  pmtilesUrl: import.meta.env.VITE_PMTILES_URL as string | undefined,
};
export const hasBasemap = Boolean(config.protomapsKey || config.pmtilesUrl);
