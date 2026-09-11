import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(
  dirname(fileURLToPath(import.meta.resolve("@clair-maps/style"))),
  "..",
);
await mkdir("public/clair", { recursive: true });
await cp(resolve(root, "assets"), "public/clair", { recursive: true });
for (const name of ["LICENSE", "THIRD_PARTY.md"])
  await cp(resolve(root, name), `public/clair/${name}`);
