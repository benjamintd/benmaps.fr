const HOUR = 60 * 60 * 1000;
const SAVED = "x-benmaps-saved";
const FRESH = "x-benmaps-fresh-until";
const STALE = "x-benmaps-stale-until";

type Loader = (signal: AbortSignal) => Promise<Response>;
type Pending = {
  controller: AbortController;
  result: Promise<Response>;
  users: number;
};

/** Page-owned Cache Storage: no service worker or offline application shell. */
export function createTileCache({
  name = "benmaps-basemap-v1",
  maxEntries = 128,
  maxEntryBytes = 512 * 1024,
  now = Date.now,
} = {}) {
  // At most 64 MiB of tile bodies with the defaults. Oversized tiles still load.
  let opened: Promise<Cache | undefined> | undefined;
  let writes = Promise.resolve();
  const pending = new Map<string, Pending>();
  const open = () =>
    (opened ??= Promise.resolve()
      .then(() => caches.open(name))
      .catch(() => undefined));
  // Cache Storage only accepts HTTP(S) keys. Include the complete provider URL
  // (and credentials/version) so different sources can never share a tile.
  const cacheKey = (key: string) =>
    `${location.origin}/__tile_cache__/${encodeURIComponent(key)}`;

  async function save(key: string, response: Response) {
    const cache = await open();
    if (!cache) return;
    const control = response.headers.get("cache-control") ?? "";
    const forbidden = /\bno-store\b/i.test(control);
    if (!response.ok || response.status === 206) return;
    const bytes = forbidden ? undefined : await response.arrayBuffer();
    const saved = now();
    const maxAge = /(?:^|,)\s*max-age\s*=\s*"?(\d+)/i.exec(control);
    const age = Number(response.headers.get("age")) || 0;
    const expires = Date.parse(response.headers.get("expires") ?? "");
    const lifetime = maxAge
      ? (+maxAge[1] - age) * 1000
      : Number.isFinite(expires)
        ? expires - saved
        : 4 * HOUR;
    const requiresValidation = /\b(?:no-cache|must-revalidate)\b/i.test(
      control,
    );
    const freshUntil = /\bno-cache\b/i.test(control)
      ? saved
      : saved + Math.max(0, Math.min(4 * HOUR, lifetime));
    const headers = new Headers(response.headers);
    headers.delete("content-encoding");
    headers.delete("content-length");
    headers.set(SAVED, String(saved));
    headers.set(FRESH, String(freshUntil));
    headers.set(
      STALE,
      String(requiresValidation ? freshUntil : saved + 7 * 24 * HOUR),
    );
    // Serialize eviction and insertion, including across tabs when Web Locks
    // are available. Storage failures must never prevent a map from loading.
    const write = async () => {
      await cache.delete(key);
      if (!bytes || bytes.byteLength > maxEntryBytes) return;
      const keys = await cache.keys();
      for (const old of keys.slice(
        0,
        Math.max(0, keys.length - maxEntries + 1),
      ))
        await cache.delete(old);
      await cache.put(key, new Response(bytes, { headers }));
    };
    writes = writes
      .then(async () => {
        if (navigator.locks) await navigator.locks.request(name, write);
        else await write();
      })
      .catch(() => {});
    await writes;
  }

  function network(key: string, loader: Loader, signal: AbortSignal) {
    signal.throwIfAborted();
    let shared = pending.get(key);
    if (!shared) {
      const controller = new AbortController();
      const entry: Pending = {
        controller,
        users: 0,
        result: Promise.resolve()
          .then(async () => {
            const response = await loader(controller.signal);
            if (!response.ok)
              throw new Error(`Tile request failed (${response.status})`);
            controller.signal.throwIfAborted();
            await save(key, response.clone()).catch(() => {});
            return response;
          })
          .finally(() => {
            if (pending.get(key) === entry) pending.delete(key);
          }),
      };
      pending.set(key, entry);
      shared = entry;
    }
    const entry = shared;
    entry.users++;
    // Each caller owns its cancellation and response body. Aborting one map
    // request must not cancel a tile still needed by another request.
    return new Promise<Response>((resolve, reject) => {
      let finished = false;
      const finish = () => {
        if (finished) return false;
        finished = true;
        signal.removeEventListener("abort", abort);
        entry.users--;
        return true;
      };
      const abort = () => {
        if (finish()) {
          if (entry.users === 0) {
            entry.controller.abort();
            if (pending.get(key) === entry) pending.delete(key);
          }
          reject(signal.reason);
        }
      };
      signal.addEventListener("abort", abort, { once: true });
      entry.result.then(
        (response) => {
          if (finish()) resolve(response.clone());
        },
        (error: unknown) => {
          if (finish()) reject(error);
        },
      );
    });
  }

  return async (source: string, loader: Loader, signal: AbortSignal) => {
    signal.throwIfAborted();
    const key = cacheKey(source);
    const cache = await open();
    const cached = await cache?.match(key).catch(() => undefined);
    signal.throwIfAborted();
    if (cached) {
      const saved = Number(cached.headers.get(SAVED));
      const fresh = Number(cached.headers.get(FRESH));
      const stale = Number(cached.headers.get(STALE));
      if (saved > 0 && saved <= now() && now() < Math.max(fresh, stale)) {
        if (now() >= fresh)
          void network(key, loader, new AbortController().signal).catch(
            () => {},
          );
        return cached;
      }
    }
    return network(key, loader, signal);
  };
}
