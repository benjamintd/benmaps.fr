import { z } from "zod";
import type { Coordinates, Place } from "./domain";
export type PlaceInfo = {
  id: string;
  label: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  wikipedia?: string;
  image?: {
    url: string;
    page: string;
    credit: string;
    license: string;
    licenseUrl?: string;
  };
};
const value = z.object({ value: z.string() });
const claim = z.object({
  rank: z.string().optional(),
  mainsnak: z.object({
    datavalue: z.object({ value: z.unknown() }).optional(),
  }),
});
const entitySchema = z.object({
  id: z.string(),
  labels: z.record(z.string(), value).optional(),
  descriptions: z.record(z.string(), value).optional(),
  aliases: z.record(z.string(), z.array(value)).optional(),
  claims: z.record(z.string(), z.array(claim)).optional(),
  sitelinks: z
    .record(
      z.string(),
      z.object({ url: z.string().optional(), title: z.string().optional() }),
    )
    .optional(),
});
type Entity = z.infer<typeof entitySchema>;
const cache = new Map<string, PlaceInfo>();
export const wikidataId = (id: unknown): string | undefined =>
  typeof id === "string" && /^Q[1-9]\d*$/.test(id) ? id : undefined;
export function safeWebUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return;
  }
}
function bestClaims(entity: Entity, property: string): unknown[] {
  const claims = (entity.claims?.[property] ?? []).filter(
    (c) => c.rank !== "deprecated",
  );
  const preferred = claims.filter((c) => c.rank === "preferred");
  return (preferred.length ? preferred : claims).map(
    (c) => c.mainsnak.datavalue?.value,
  );
}
function stringClaim(entity: Entity, key: string) {
  return bestClaims(entity, key).find((v) => typeof v === "string") as
    string | undefined;
}
function normalize(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export function metersBetween(a: Coordinates, b: Coordinates) {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad,
    dLon = (b[0] - a[0]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function matchesPlace(entity: Entity, place: Place): boolean {
  const names = [
    ...Object.values(entity.labels ?? {}).map((n) => n.value),
    ...Object.values(entity.aliases ?? {})
      .flat()
      .map((n) => n.value),
  ];
  if (!names.some((n) => normalize(n) === normalize(place.name))) return false;
  return bestClaims(entity, "P625").some((value) => {
    const c = z
      .object({ longitude: z.number(), latitude: z.number() })
      .safeParse(value);
    return (
      c.success &&
      metersBetween(place.coordinates, [c.data.longitude, c.data.latitude]) <
        750
    );
  });
}
async function wikiRequest(
  host: string,
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<unknown> {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({
    format: "json",
    origin: "*",
    ...params,
  }).toString();
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  });
  if (!response.ok)
    throw new Error("Place details are temporarily unavailable.");
  return response.json();
}
async function entities(ids: string[], signal: AbortSignal): Promise<Entity[]> {
  const result = z
    .object({ entities: z.record(z.string(), z.unknown()) })
    .parse(
      await wikiRequest(
        "www.wikidata.org",
        {
          action: "wbgetentities",
          ids: ids.join("|"),
          props: "labels|descriptions|aliases|claims|sitelinks/urls",
          languages: "en|fr",
          languagefallback: "1",
        },
        signal,
      ),
    );
  return Object.values(result.entities).flatMap((v) => {
    const e = entitySchema.safeParse(v);
    return e.success ? [e.data] : [];
  });
}
function plainText(html: string) {
  return (
    new DOMParser()
      .parseFromString(html, "text/html")
      .body.textContent?.trim() ?? ""
  );
}
export async function imageInfo(
  filename: string,
  signal: AbortSignal,
): Promise<PlaceInfo["image"]> {
  // Ignore unrelated metadata: Commons includes numeric extension versions.
  const metadata = z.object({
    Artist: value.optional(),
    LicenseShortName: value.optional(),
    LicenseUrl: value.optional(),
  });
  const schema = z.object({
    query: z.object({
      pages: z.record(
        z.string(),
        z.object({
          imageinfo: z
            .array(
              z.object({
                thumburl: z.string().optional(),
                descriptionurl: z.string(),
                extmetadata: metadata.optional(),
              }),
            )
            .optional(),
        }),
      ),
    }),
  });
  const data = schema.parse(
    await wikiRequest(
      "commons.wikimedia.org",
      {
        action: "query",
        titles: `File:${filename}`,
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "720",
      },
      signal,
    ),
  );
  const info = Object.values(data.query.pages).flatMap(
    (page) => page.imageinfo ?? [],
  )[0];
  if (!info?.thumburl) return;
  const url = safeWebUrl(info.thumburl),
    page = safeWebUrl(info.descriptionurl);
  if (
    !url ||
    !page ||
    !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(
      new URL(url).hostname,
    )
  )
    return;
  return {
    url,
    page,
    credit: plainText(info.extmetadata?.Artist?.value ?? "Wikimedia Commons"),
    license: plainText(
      info.extmetadata?.LicenseShortName?.value ?? "See image license",
    ),
    licenseUrl: safeWebUrl(info.extmetadata?.LicenseUrl?.value),
  };
}
export async function getPlaceInfo(
  place: Place,
  signal: AbortSignal,
): Promise<PlaceInfo | null> {
  if (place.wikidata && cache.has(place.wikidata))
    return cache.get(place.wikidata)!;
  let entity: Entity | undefined;
  if (place.wikidata) entity = (await entities([place.wikidata], signal))[0];
  else {
    if (
      [
        "Dropped pin",
        "Shared pin",
        "Your location",
        "Starting point",
        "Destination",
      ].includes(place.name)
    )
      return null;
    const result = z
      .object({ search: z.array(z.object({ id: z.string() })) })
      .parse(
        await wikiRequest(
          "www.wikidata.org",
          {
            action: "wbsearchentities",
            search: place.name,
            language: "en",
            uselang: "en",
            type: "item",
            limit: "5",
          },
          signal,
        ),
      );
    const ids = result.search
      .map((s) => wikidataId(s.id))
      .filter((id): id is string => Boolean(id));
    if (!ids.length) return null;
    entity = (await entities(ids, signal)).find((e) => matchesPlace(e, place));
  }
  if (!entity || !wikidataId(entity.id)) return null;
  const info: PlaceInfo = {
    id: entity.id,
    label: entity.labels?.en?.value ?? entity.labels?.fr?.value ?? place.name,
    description:
      entity.descriptions?.en?.value ?? entity.descriptions?.fr?.value,
    website: safeWebUrl(stringClaim(entity, "P856")),
    phone: stringClaim(entity, "P1329"),
    address: stringClaim(entity, "P969"),
    wikipedia: safeWebUrl(
      entity.sitelinks?.enwiki?.url ?? entity.sitelinks?.frwiki?.url,
    ),
  };
  const filename = stringClaim(entity, "P18");
  if (filename) {
    try {
      info.image = await imageInfo(filename, signal);
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(entity.id, info);
  return info;
}
