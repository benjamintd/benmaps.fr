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
kept in memory only; share links contain coordinates and routing mode rather
than persisted Mapbox result metadata. Map, search, routing, and knowledge
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
