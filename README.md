# Benmaps

A map application built with React 19, TypeScript, MapLibre GL JS 6.9, and
[Clair](https://clair.benmaps.fr) hosted cartography. Commissioner is used for the interface
and map labels. The interface uses Heroicons with matching semantic companion
icons for transport and POI categories missing from that set.

## Development

```sh
npm ci
cp .env.example .env.local
# Set VITE_PROTOMAPS_KEY and VITE_MAPBOX_TOKEN.
npm run dev
```

Open the printed URL using **localhost**, which must be permitted by your
provider tokens. `127.0.0.1` is a different origin. Keys are browser-visible;
use public tokens with the minimum required scopes and allowed domains.

For a Protomaps v4 PMTiles archive, set `VITE_PMTILES_URL` instead of using the
hosted Protomaps API. This source must permit CORS and HTTP Range requests.
Clair's relief still uses the attributed Mapzen Terrarium elevation service.

For keyless local development, the optional `/__pmtiles/<build>.pmtiles` Vite
proxy supports range reads from public Protomaps builds without downloading the
planet. Choose an available v4 archive from [the build index](https://maps.protomaps.com/builds/)
and set `VITE_PMTILES_URL` in your ignored `.env.development.local`. Public builds
expire. This proxy is development-only; use your own archive or a Protomaps API
key for production.

## Vercel

Import this repository as a Vite project. `vercel.json` supplies the build
command, output directory, and SPA rewrites, including old Benmaps links.

Set these environment variables in Vercel before building:

- `VITE_PROTOMAPS_KEY`: a key permitted on `benmaps.fr` and the intended preview domains.
- `VITE_MAPBOX_TOKEN`: a public token for Search Box, Directions, satellite, and traffic.
- `VITE_PMTILES_URL` (optional): a publicly accessible, CORS-enabled Protomaps v4 archive; overrides the hosted vector source.

Variables are embedded at build time; redeploy after changing them. There is no
runtime server or database. No credentials are committed. Clair styles are fetched from its hosted `latest`
endpoint; its 3D renderer URL is configured in `src/lib/clair-3d.ts`. The build
needs neither a neighboring repository nor a vendored style factory.

## Features

- Protomaps/PMTiles basemap, Clair cartography, 3D buildings and terrain.
- Mapbox Search Box autocomplete with per-field sessions and nearby categories.
- Driving with traffic, walking, and cycling directions, alternatives, and steps.
- Mapbox satellite imagery and traffic overlays; route overlays survive map switches.
- Map click selection, geolocation on request, shared pins/routes/cameras.
- Wikidata descriptions, official websites, telephone numbers, and Wikipedia links.
  Commons photos include creator and license credits when image metadata is available.
- Responsive panels, keyboard search navigation, focus styles, reduced-motion support,
  explicit loading/error/retry states, and a render error boundary.

No Benmaps analytics, accounts, or location history. Provider search results are
kept in memory only; shared URLs carry coordinates, place display details and
view settings. Provider session tokens and result lists are not serialized. Map, search, routing, and knowledge
requests go to the relevant providers.

## State and boundaries

- `src/lib/domain.ts`: closed, discriminated app/view/resource states and explicit
  transitions. Endpoint and mode changes immediately invalidate routes; late
  results are rejected unless their request key matches the current journey.
- `src/lib/api.ts`: abortable Mapbox requests and Zod validation at the network boundary.
- `src/hooks/useDirections.ts`: request lifecycle; no I/O inside reducers or map rendering.
- `src/components/MapCanvas.tsx`: owns the MapLibre instance, camera and style lifecycle.
  `src/lib/map/` owns route overlays, hit testing and marker lifetime.
- `src/hooks/useLocation.ts`: retires location callbacks after the user changes view,
  starts a new request or leaves the app; only the current request can select or fly.
- `src/components/MapAppearance.tsx` and `AboutDialog.tsx`: own their respective
  controls, dismissal and dialog lifecycle; `App.tsx` composes them with app state.
- `src/lib/wikidata.ts`: enrichment with bounded in-memory caching. Uses a valid
  Wikidata ID when present. Otherwise requires an exact normalized name/alias
  match and entity coordinates within 750 m. Uncertain matches are omitted.
  External links accept only HTTP(S); metadata HTML is converted to plain text.
- `src/lib/url.ts`: validates coordinates/camera values, supports legacy
  `/@lng,lat,zoom/+lng,lat` links, and serializes portable share URLs.

The old CRA/Redux/Mapbox GL application and middleware are replaced. Legacy
Mapillary v3 integration is removed. Cycling elevation is implemented with bounded
Mapbox terrain contour sampling and explicit missing-data gaps. Returning visitors' CRA service worker
registrations are retired when the new app starts.

## Checks

```sh
npm run check
npm run lint
npm test
npm run build
npm run format:check
# One-time browser install, then map gesture and responsive layout checks:
npx playwright install chromium --only-shell
npm run test:browser
```

Tests cover route invalidation, stale responses, route selection bounds,
provider validation, URL compatibility, and conservative Wikidata matching.
MapLibre's ESM worker is bundled with Vite's `?worker&url` pipeline, so the
production worker includes its shared dependencies.

## Licenses

Application code retains its MIT license. Clair's hosted cartography and SDK
retain their own terms; the About dialog links to Clair's license and notices.
Map attribution stays visible. Only the existing Commissioner interface font is
self-hosted, with its OFL license and provenance in
[public/fonts/commissioner/README.md](public/fonts/commissioner/README.md).
Map fonts, sprites, landmark models and renderer code load from their providers.

Cycling profiles use sampled Mapbox terrain contours, so ascent/descent values
are estimates. Missing samples appear as gaps. The browser tests use provider
fixtures while exercising real MapLibre rendering, route selection, endpoint
dragging, the elevation chart, and search focus spacing.

## Site identity

`index.html` supplies the description, canonical URL, Open Graph and Twitter
previews, favicon links, and web app manifest. `vite.config.ts` uses Vercel's
build environment to enable indexing and the sitemap only in production;
preview builds use `noindex` and their own origin for social images. The `next`
branch uses `next.benmaps.fr`. The canonical URL remains `https://benmaps.fr/`.

The manifest includes regular and maskable home-screen icons. Installed views
still need an internet connection for maps, search, and directions. To regenerate
the committed PNG/ICO assets and social preview from the existing SVG logo:

```sh
node scripts/generate-brand-assets.mjs
```

This uses the Chromium installation from the browser checks. No browser or
additional image-generation dependencies are required by the Vercel build.

## 3D trees and landmarks

The application consumes Clair's CDN SDK at
`https://clair.benmaps.fr/extensions/latest/clair-3d.js`. The 3D toggle loads its
renderer and procedural trees together. Flat maps request no SDK, index or models.
The SDK owns style reloads; the application serializes asynchronous attachment
and removes late results when 3D is disabled or the map is destroyed.

Open Landmarks independently hosts the index, model files and editable sources.
This preview explicitly selects the draft Paris collection via `preview.json`;
the SDK resolves and pins its release for each map session. Configure
`VITE_OPEN_LANDMARKS_CATALOGUE_URL` to select a pinned catalogue or the approved
`latest.json` pointer.
`VITE_CLAIR_3D_URL` optionally overrides the SDK URL. The moving alias resolves to an immutable versioned SDK.

Models load from zoom 15; instanced trees use real Protomaps points from zoom 16.
The SDK caps residency at three models and 1,500 trees. No model files or Three.js
renderer are bundled into the application. Both use Mercator and terrain elevation;
styles and traffic overlays can change without adding another renderer.
Tree generation and landmark rendering belong to the Clair SDK; keep this repo's
3D code limited to SDK configuration and lifecycle. Integration checks live in
`tests/clair-3d.test.ts` and `tests/browser/trees.pw.ts`.

Credits link to Open Landmarks' component licenses and editable sources alongside
the existing map attribution. Model metadata carries per-model provenance. Basemap
replacement uses polygon-area overlap against loaded tile geometry and filters
matched feature IDs. Benmaps selects `replacementMode: "loaded"`: ordinary buildings remain until
models are ready and return when models are unavailable. Stable fallback layers
hide complete OSM extrusions, including their roofs. Zooming retains learned IDs
and cached meshes; FIFO eviction occurs only under cache capacity pressure.
The basemap loads independently of SDK/catalogue requests. Snapshot-specific ID
overrides remain unset for the live Protomaps API.

## Shared views

The URL restores `basemap=satellite`, `traffic=1`, `3d=1`, selected places and
endpoints (including names, addresses, categories and Wikidata IDs), travel mode,
and the selected alternative (`route=2` means the second route). Camera centre,
zoom, bearing and pitch remain in the hash; loading a shared route keeps that
camera instead of fitting the route again.

Nearby categories retain their search centre (`category`, `near`). Search drafts
use `q`, `from_q` and `to_q`; `layers=1` and `about=1` restore the open panels.
Defaults are omitted, values are validated and text lengths are bounded.
Browser history and direct hash changes are reflected in the application.
Routes, search results, photos and current traffic are fetched again; provider
changes or a different screen size may change those details. Ephemeral loading
states, notices, focus and geolocation permissions are not part of a shared view.

## Persistent basemap cache

Protomaps vector tiles and extracted PMTiles tiles/TileJSON use the page's Cache
Storage API, without a service worker. Returning to a previously viewed area can
reuse tiles across reloads and browser sessions. The cache uses complete source
URLs, including archive versions and provider keys, to keep sources separate.

Tiles are fresh for at most four hours (shorter provider freshness, exposed Age,
and Expires headers are honored). Older tiles may be displayed immediately for
up to seven days while one shared request refreshes them in the background.
Refresh failures leave the cached tile available; refreshed data is used on the
next tile load. `no-store`, `no-cache`, and `must-revalidate` are respected.

The cache keeps the latest 128 inserted/refreshed entries, each no larger than
512 KiB: at most 64 MiB of tile bodies, plus storage metadata. Larger tiles still
load normally. Writes coordinate between tabs using Web Locks where supported.
Storage denial, eviction, or quota errors fall back to ordinary network loading.
Clearing Benmaps' site data clears the cache. Browsers may also evict it.

This covers the vector basemap, not satellite, traffic, elevation, search,
routing, styles, fonts, or models. It does not make the entire app available
offline. Cached tile coordinates reveal previously viewed areas on this device;
Benmaps does not collect them or store a location timeline. Prefer versioned
PMTiles archive URLs when replacing a dataset.
