# Clair dependency

`clair-maps-style-0.5.6.tgz` is the standalone `@clair-maps/style` 0.5.6 package,
packed from the production source checkout at
`benmaps-update/release/clair/packages/clair-style` on 2026-09-11.

Tarball SHA-1: `6487f2c7259206084d09c725c1e98f1585c82b05`.
The lockfile records SHA-512 integrity. The package contains its LICENSE,
THIRD_PARTY notices, font licenses, sources, and asset provenance. It has no
API credentials or dependency on the cartography lab.

To upgrade, pack a new explicit release from the production Clair checkout,
put the new archive here, update the file dependency, and run `npm install`.
Then run Benmaps checks and visually verify the map. Never replace the contents
of an already-pinned version silently.

Benmaps selects `font: 'commissioner'` through the public style factory API.
It overlays satellite, traffic, routes and selection markers without modifying
Clair's underlying cartographic modules.
