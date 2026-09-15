import type { Map } from "maplibre-gl";

const CLAIR_3D_URL =
  import.meta.env.VITE_CLAIR_3D_URL ||
  "https://clair.benmaps.fr/extensions/latest/clair-3d.js";
// Follow the global preview dataset; the approved channel currently has no models.
export const LANDMARKS_CATALOGUE_URL =
  import.meta.env.VITE_OPEN_LANDMARKS_CATALOGUE_URL ||
  "https://open-landmarks.benmaps.fr/api/v1/preview.json";

type Extension = { remove(): void };
type SDK = {
  addClair3D(map: Map, options: Record<string, unknown>): Promise<Extension>;
};
type Options = {
  onError: (error: unknown) => void;
  loadSDK?: () => Promise<SDK>;
};

let sdkModule: Promise<SDK> | undefined;
function loadHostedSDK(): Promise<SDK> {
  return (sdkModule ??= import(/* @vite-ignore */ CLAIR_3D_URL).catch(
    (error) => {
      sdkModule = undefined;
      throw error;
    },
  ));
}
/** One serialized SDK lifetime per map, including rapid toggles during imports. */
export function createClair3D(
  map: Map,
  { onError, loadSDK = loadHostedSDK }: Options,
) {
  let extension: Extension | undefined;
  let generation = 0;
  let disposed = false;
  let pending = Promise.resolve();
  return {
    setEnabled(enabled: boolean) {
      const run = ++generation;
      extension?.remove();
      extension = undefined;
      pending = pending
        .then(async () => {
          if (!enabled || disposed || run !== generation) return;
          const sdk = await loadSDK();
          if (disposed || run !== generation) return;
          const next = await sdk.addClair3D(map, {
            catalogueUrl: LANDMARKS_CATALOGUE_URL,
            trees: true,
            landmarks: true,
            maxResident: 3,
            // Keep basemap buildings until a replacement actually exists.
            replacementMode: "loaded",
            maxCached: 6,
            maxCacheBytes: 16 * 1024 * 1024,
            maxTrees: 1500,
            replacementLayerIds: ["building-extrusion"],
            onError: (error: unknown) => {
              if (!disposed && run === generation) onError(error);
            },
          });
          if (disposed || run !== generation) next.remove();
          else extension = next;
        })
        .catch((error: unknown) => {
          if (!disposed && run === generation) onError(error);
        });
      return pending;
    },
    remove() {
      disposed = true;
      ++generation;
      extension?.remove();
      extension = undefined;
      return pending;
    },
  };
}
