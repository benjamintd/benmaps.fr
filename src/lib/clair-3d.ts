import type { Map } from "maplibre-gl";

export const CLAIR_3D_URL =
  import.meta.env.VITE_CLAIR_3D_URL ||
  "https://clair.benmaps.fr/extensions/0.2.0/clair-3d.js";
// Explicitly select the growing draft collection for next.benmaps.fr.
export const LANDMARKS_CATALOGUE_URL =
  import.meta.env.VITE_OPEN_LANDMARKS_CATALOGUE_URL ||
  "https://open-landmarks.benmaps.fr/api/v1/collections/paris/preview.json";

type Extension = { remove(): void };
type SDK = {
  addClair3D(map: Map, options: Record<string, unknown>): Promise<Extension>;
};
type Options = {
  onError: (error: unknown) => void;
  loadSDK?: () => Promise<SDK>;
};

/** One serialized SDK lifetime per map, including rapid toggles during imports. */
export function createClair3D(
  map: Map,
  { onError, loadSDK = () => import(/* @vite-ignore */ CLAIR_3D_URL) }: Options,
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
