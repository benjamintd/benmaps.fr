import { z } from "zod";
import { coordinatesSchema } from "./domain";
import type { Coordinates, Place, Route, TravelMode } from "./domain";
import { config } from "./config";
const suggestionSchema = z.object({
  mapbox_id: z.string(),
  name: z.string(),
  place_formatted: z.string().optional(),
  full_address: z.string().optional(),
  feature_type: z.string().optional(),
});
export type Suggestion = z.infer<typeof suggestionSchema>;
const featureSchema = z.object({
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: coordinatesSchema,
  }),
  properties: z.object({
    mapbox_id: z.string().optional(),
    name: z.string(),
    full_address: z.string().optional(),
    place_formatted: z.string().optional(),
    poi_category: z.array(z.string()).optional(),
  }),
});
const featureCollection = z.object({ features: z.array(featureSchema) });
const routeSchema = z.object({
  distance: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(coordinatesSchema).min(2),
  }),
  legs: z.array(
    z.object({
      summary: z.string().optional(),
      steps: z
        .array(
          z.object({
            distance: z.number().nonnegative(),
            maneuver: z.object({
              instruction: z.string(),
              location: coordinatesSchema,
              type: z.string(),
              modifier: z.string().optional(),
            }),
          }),
        )
        .optional(),
    }),
  ),
});
async function request(
  path: string,
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<unknown> {
  if (!config.mapboxToken)
    throw new Error(
      "Search and directions are not configured yet. You can still explore the map.",
    );
  const url = new URL(`https://api.mapbox.com/${path}`);
  url.search = new URLSearchParams({
    ...params,
    access_token: config.mapboxToken,
  }).toString();
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Mapbox could not authorize this request. Check the access token and allowed domains."
        : response.status === 429
          ? "Too many requests. Please try again in a moment."
          : "This service is unavailable right now. Please try again.",
    );
  return response.json();
}
export async function suggest(
  query: string,
  proximity: Coordinates,
  session: string,
  signal: AbortSignal,
) {
  const data = await request(
    "search/searchbox/v1/suggest",
    {
      q: query.slice(0, 256),
      proximity: proximity.join(","),
      session_token: session,
      language: "en",
      limit: "6",
      types: "poi,address,place,locality,neighborhood,street,region,country",
    },
    signal,
  );
  return z.object({ suggestions: z.array(suggestionSchema) }).parse(data)
    .suggestions;
}
function toPlace(feature: z.infer<typeof featureSchema>): Place {
  const p = feature.properties;
  return {
    id: p.mapbox_id ?? feature.geometry.coordinates.join(","),
    name: p.name,
    address: p.full_address ?? p.place_formatted ?? "",
    coordinates: feature.geometry.coordinates,
    category: p.poi_category?.[0],
    source: "search",
  };
}
export async function retrieve(
  id: string,
  session: string,
  signal: AbortSignal,
): Promise<Place> {
  const data = featureCollection.parse(
    await request(
      `search/searchbox/v1/retrieve/${encodeURIComponent(id)}`,
      { session_token: session, language: "en" },
      signal,
    ),
  );
  if (!data.features[0])
    throw new Error("This place is no longer available. Please search again.");
  return toPlace(data.features[0]);
}
export async function categorySearch(
  category: string,
  proximity: Coordinates,
  signal: AbortSignal,
): Promise<Place[]> {
  const data = featureCollection.parse(
    await request(
      `search/searchbox/v1/category/${encodeURIComponent(category)}`,
      { proximity: proximity.join(","), limit: "10", language: "en" },
      signal,
    ),
  );
  return data.features.map(toPlace);
}
export async function getRoutes(
  from: Coordinates,
  to: Coordinates,
  mode: TravelMode,
  signal: AbortSignal,
): Promise<Route[]> {
  const data = z
    .object({ code: z.string(), routes: z.array(routeSchema).optional() })
    .parse(
      await request(
        `directions/v5/mapbox/${mode}/${from.join(",")};${to.join(",")}`,
        {
          alternatives: "true",
          geometries: "geojson",
          overview: "full",
          steps: "true",
          language: "en",
        },
        signal,
      ),
    );
  if (data.code === "NoRoute" || data.code === "NoSegment") return [];
  if (data.code !== "Ok")
    throw new Error(
      "We couldn’t calculate this route. Try moving one of the points.",
    );
  return (data.routes ?? []).map((route, i) => ({
    id: String(i),
    distance: route.distance,
    duration: route.duration,
    geometry: route.geometry,
    summary:
      route.legs
        .map((leg) => leg.summary)
        .filter(Boolean)
        .join(", ") || "Suggested route",
    steps: route.legs.flatMap((leg) =>
      (leg.steps ?? []).map((step) => ({
        instruction: step.maneuver.instruction,
        distance: step.distance,
        coordinates: step.maneuver.location,
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
      })),
    ),
  }));
}
export const errorMessage = (error: unknown) =>
  error instanceof z.ZodError
    ? "The service returned an unexpected response. Please try again."
    : error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
