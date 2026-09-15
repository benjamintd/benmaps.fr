import { describe, expect, it } from "vitest";
import { journeyKey, pointPlace, reducer } from "../src/lib/domain";
import { defaultState } from "./fixtures";
import type { AppState, Journey, Route } from "../src/lib/domain";
import {
  cameraHash,
  cameraOrDefault,
  defaultCamera,
  readCamera,
  readState,
  writeState,
} from "../src/lib/url";
import { matchesPlace, safeWebUrl, wikidataId } from "../src/lib/wikidata";
const from = pointPlace([2.33, 48.86], "Louvre");
const to = pointPlace([2.35, 48.85], "Notre-Dame");
const route: Route = {
  id: "0",
  duration: 600,
  distance: 2000,
  geometry: {
    type: "LineString",
    coordinates: [from.coordinates, to.coordinates],
  },
  summary: "Seine",
  steps: [],
};
function journey(state: AppState): Journey {
  if (state.view.kind !== "directions") throw new Error("Expected journey");
  return state.view.journey;
}
describe("journey state invariants", () => {
  it("starts from a selected place without also using it as the destination", () => {
    const state = reducer(defaultState, { type: "select-place", place: from });
    expect(journey(reducer(state, { type: "directions", from })).to).toBeNull();
    expect(journey(reducer(state, { type: "directions" })).to).toEqual(from);
  });
  it("invalidates routes synchronously when an endpoint or mode changes", () => {
    let state = reducer(defaultState, { type: "directions", from, to });
    const key = journeyKey(journey(state))!;
    state = reducer(state, { type: "route-loading", key });
    state = reducer(state, { type: "route-result", key, routes: [route] });
    expect(journey(state).routes.status).toBe("ready");
    for (const action of [
      { type: "endpoint", endpoint: "to", place: null },
      { type: "swap" },
      { type: "travel-mode", mode: "walking" },
    ] as const)
      expect(journey(reducer(state, action)).routes.status).toBe("idle");
  });
  it("rejects stale successes and errors after the route changes or closes", () => {
    let state = reducer(defaultState, { type: "directions", from, to });
    const key = journeyKey(journey(state))!;
    state = reducer(state, { type: "route-loading", key });
    state = reducer(state, { type: "swap" });
    expect(reducer(state, { type: "route-result", key, routes: [route] })).toBe(
      state,
    );
    expect(reducer(state, { type: "route-error", key, message: "late" })).toBe(
      state,
    );
    state = reducer(state, { type: "explore" });
    expect(reducer(state, { type: "route-result", key, routes: [route] })).toBe(
      state,
    );
  });
  it("makes an empty route result a useful error and prevents invalid selections", () => {
    let state = reducer(defaultState, { type: "directions", from, to });
    const key = journeyKey(journey(state))!;
    state = reducer(state, { type: "route-loading", key });
    state = reducer(state, { type: "route-result", key, routes: [] });
    expect(journey(state).routes.status).toBe("error");
    expect(reducer(state, { type: "route-select", index: 1 })).toBe(state);
    state = reducer(state, { type: "route-loading", key });
    state = reducer(state, { type: "route-result", key, routes: [route] });
    for (const index of [-1, 1, 0.5, NaN])
      expect(reducer(state, { type: "route-select", index })).toBe(state);
  });
  it("keeps map settings separate from the selected place and journey", () => {
    const state = reducer(defaultState, { type: "directions", from, to });
    expect(
      reducer(state, {
        type: "settings",
        settings: { basemap: "satellite", traffic: true },
      }).view,
    ).toBe(state.view);
  });
});
describe("share links and legacy URLs", () => {
  it("round trips coordinates, modes and place display names", () => {
    const state = reducer(defaultState, { type: "directions", from, to });
    const url = writeState(
      new URL("https://benmaps.fr/?pin=1,2#14/48.86/2.33"),
      state,
    );
    expect(url.searchParams.has("pin")).toBe(false);
    expect(url.searchParams.get("from_name")).toBe("Louvre");
    const restored = journey(readState(url));
    expect(restored.from?.coordinates).toEqual(from.coordinates);
    expect(restored.to?.coordinates).toEqual(to.coordinates);
  });
  it("accepts old Benmaps camera and pin links", () => {
    const url = new URL(
      "https://benmaps.fr/@2.33,48.86,14/+2.35,48.85/~Notre-Dame",
    );
    expect(readCamera(url)?.center).toEqual([2.33, 48.86]);
    expect(readState(url).view.kind).toBe("explore");
  });
  it("rejects malformed, impossible and non-finite camera values", () => {
    for (const hash of ["#99/48/2", "#13/91/2", "#13/48/NaN", "#13/48/2/0/99"])
      expect(readCamera(new URL("https://benmaps.fr/" + hash))).toBeNull();
    // A URL carrying no camera is distinguishable from one that happens to
    // encode the default framing.
    expect(readCamera(new URL("https://benmaps.fr/"))).toBeNull();
    expect(
      readCamera(new URL("https://benmaps.fr/" + cameraHash(defaultCamera))),
    ).toEqual(defaultCamera);
    expect(cameraOrDefault(new URL("https://benmaps.fr/"))).toEqual(
      defaultCamera,
    );
    expect(readState(new URL("https://benmaps.fr/?pin=181,0")).view).toEqual({
      kind: "explore",
      place: null,
    });
  });
});
describe("Wikidata trust boundary", () => {
  it("rejects unsafe external links and malformed entity IDs", () => {
    expect(safeWebUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeWebUrl("data:text/html,x")).toBeUndefined();
    expect(safeWebUrl("https://user:pass@example.com")).toBeUndefined();
    expect(safeWebUrl("https://louvre.fr")).toBe("https://louvre.fr/");
    expect(wikidataId("Q19675")).toBe("Q19675");
    expect(wikidataId("Q42&other=x")).toBeUndefined();
  });
  it("requires both the name and nearby coordinates; never matches by name alone", () => {
    const entity = {
      id: "Q1",
      labels: { en: { value: "Louvre" } },
      claims: {
        P625: [
          {
            mainsnak: {
              datavalue: { value: { longitude: 2.33, latitude: 48.86 } },
            },
          },
        ],
      },
    };
    expect(matchesPlace(entity, from)).toBe(true);
    expect(matchesPlace(entity, { ...from, coordinates: [0, 0] })).toBe(false);
    expect(matchesPlace(entity, { ...from, name: "Different museum" })).toBe(
      false,
    );
  });
});
