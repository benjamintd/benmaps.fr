# Benmaps

A map application built with React 19, TypeScript, MapLibre GL JS 6.9, and
[Clair](https://clair.benmaps.fr) 0.5.6. Commissioner is used for the interface
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

The current local preview uses an ignored `.env.development.local` file with
`VITE_PMTILES_URL=/__pmtiles/20260911.pmtiles`. Vite proxies range reads from that
public Protomaps build for development; it does not download the planet. Public
builds expire. Pick an available v4 archive from
[the build index](https://maps.protomaps.com/builds/) if needed. This adapter is
**development-only**, and is never selected by a production build. Host your own
archive or use a Protomaps API key for production.

## Vercel

Import this repository as a Vite project. `vercel.json` supplies the build
command, output directory, and SPA rewrites, including old Benmaps links.

Set these environment variables in Vercel before building:

- `VITE_PROTOMAPS_KEY`: a key permitted on `benmaps.fr` and the intended preview domains.
- `VITE_MAPBOX_TOKEN`: a public token for Search Box, Directions, satellite, and traffic.
- `VITE_PMTILES_URL` (optional): a publicly accessible, CORS-enabled Protomaps v4 archive; overrides the hosted vector source.

Variables are embedded at build time; redeploy after changing them. There is no
runtime server or database. No credentials are committed. Clair is pinned in
`vendor/`, so the build does not need the neighboring cartography repository or
an unpublished npm registry package.

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
- `src/components/MapCanvas.tsx`: owns a single MapLibre instance, disposes listeners
  and markers, and restores overlays after style replacement.
- `src/lib/wikidata.ts`: enrichment with bounded in-memory caching. Uses a valid
  Wikidata ID when present. Otherwise requires an exact normalized name/alias
  match and entity coordinates within 750 m. Uncertain matches are omitted.
  External links accept only HTTP(S); metadata HTML is converted to plain text.
- `src/lib/url.ts`: validates coordinates/camera values, supports legacy
  `/@lng,lat,zoom/+lng,lat` links, and serializes portable share URLs.

The old CRA/Redux/Mapbox GL application and middleware are replaced. Legacy
Mapillary v3 integration and the terrain tile-query elevation chart are not
carried forward in this first rewrite. Returning visitors' CRA service worker
registrations are retired when the new app starts.

## Checks

```sh
npm run check
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

Application code retains its MIT license. Clair is distributed under its own
license; fonts, map data, and imagery retain their upstream terms. The build
copies Clair assets and notices to `/clair/`; map attribution stays visible.
See [vendor/README.md](vendor/README.md) for the pinned dependency's provenance.

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
node scripts/prepare-assets.mjs
node scripts/generate-brand-assets.mjs
```

This uses the Chromium installation from the browser checks. No browser or
additional image-generation dependencies are required by the Vercel build.

## 3D trees and landmarks

The `next` application consumes Clair's versioned CDN SDK at
`https://clair.benmaps.fr/extensions/0.2.3/clair-3d.js`. The 3D toggle loads its
renderer and procedural trees together. Flat maps request no SDK, index or models.
The SDK owns style reloads; the application serializes asynchronous attachment
and removes late results when 3D is disabled or the map is destroyed.

Open Landmarks independently hosts the index, model files and editable sources.
This preview explicitly selects the draft Paris collection via `preview.json`;
the SDK resolves and pins its release for each map session. Configure
`VITE_OPEN_LANDMARKS_CATALOGUE_URL` to select a pinned catalogue or the approved
`latest.json` pointer.
`VITE_CLAIR_3D_URL` optionally overrides the pinned SDK URL.

Models load from zoom 15; instanced trees use real Protomaps points from zoom 16.
The SDK caps residency at three models and 1,500 trees. No model files or Three.js
renderer are bundled into the application. Both use Mercator and terrain elevation;
styles and traffic overlays can change without adding another renderer.

Credits link to Open Landmarks' component licenses and editable sources alongside
the existing map attribution. Model metadata carries per-model provenance. Basemap
replacement uses polygon-area overlap against loaded tile geometry and filters
matched feature IDs. Benmaps uses the default `replacementMode: "reserve"`: index
footprints are reserved before GLB downloads, including failed or capped models.
Each 3D style is prepared before `setStyle`, keeping extrusions transparent until
discovery and filtering settle. Metadata failures release that initial gate;
model failures leave a flat footprint. Snapshot-specific ID overrides remain unset
for the live Protomaps API.

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

