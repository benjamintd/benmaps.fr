import { addProtocol } from "maplibre-gl";
import { Protocol } from "pmtiles";
import { createTileCache } from "../tile-cache";

const cached = createTileCache();
const pmtiles = new Protocol();

export function registerTileProtocols() {
  addProtocol("cached-tiles", async (params, controller) => {
    const url = params.url.slice("cached-tiles://".length);
    const response = await cached(
      url,
      (signal) => fetch(url, { signal, cache: "reload" }),
      controller.signal,
    );
    const data = await response.arrayBuffer();
    controller.signal.throwIfAborted();
    // The persistent cache owns freshness; avoid MapLibre independently
    // scheduling expired-tile reloads while background revalidation runs.
    return { data };
  });
  addProtocol("pmtiles", async (params, controller) => {
    const response = await cached(
      `${params.type}:${params.url}`,
      async (signal) => {
        const upstream = new AbortController();
        const abort = () => upstream.abort(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
        try {
          signal.throwIfAborted();
          const result = await pmtiles.tilev4(params, upstream);
          return new Response(
            params.type === "json"
              ? JSON.stringify(result.data)
              : (result.data as Uint8Array<ArrayBuffer>),
            {
              headers: {
                ...(result.cacheControl
                  ? { "cache-control": result.cacheControl }
                  : {}),
                ...(result.expires ? { expires: result.expires } : {}),
              },
            },
          );
        } finally {
          signal.removeEventListener("abort", abort);
        }
      },
      controller.signal,
    );
    const data =
      params.type === "json"
        ? await response.json()
        : await response.arrayBuffer();
    controller.signal.throwIfAborted();
    return { data };
  });
}
