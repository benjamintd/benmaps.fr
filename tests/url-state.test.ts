import { expect, it } from "vitest";
import {
  readState,
  writeState,
  readCamera,
  cameraOrDefault,
} from "../src/lib/url";
import { reducer, journeyKey } from "../src/lib/domain";
import { defaultState } from "./fixtures";
import type { Route } from "../src/lib/domain";
it("round trips layers, pin details, nearby context and open panels without changing the camera", () => {
  const original = new URL(
    "https://benmaps.fr/?basemap=satellite&traffic=1&3d=1&pin=2.343689,48.861514&pin_name=Maison&pin_address=12+rue+du+Louvre&pin_category=museum&pin_wikidata=Q19675&category=cafe&near=2.31,48.85&layers=1&about=1&q=coffee#18.543/48.8615142/2.3433801/22.15/43.75",
  );
  const state = readState(original);
  const restored = writeState(original, state);
  expect(readState(restored)).toEqual(state);
  expect(restored.hash).toBe(original.hash);
  expect(state.settings).toEqual({
    basemap: "satellite",
    traffic: true,
    threeDimensional: true,
  });
  expect(readCamera(restored)?.pitch).toBe(43.75);
  expect(state.view.kind === "explore" && state.view.place?.wikidata).toBe(
    "Q19675",
  );
});
it("restores an empty route planner and its unfinished endpoint searches", () => {
  const url = new URL(
    "https://benmaps.fr/?mode=cycling&from_q=Louvre&to_q=Orsay",
  );
  expect(readState(url).view.kind).toBe("directions");
  const roundtrip = writeState(url, readState(url));
  expect(roundtrip.searchParams.get("from_q")).toBe("Louvre");
  expect(roundtrip.searchParams.get("to_q")).toBe("Orsay");
});
it("keeps the requested alternative while routes load and bounds it against the returned routes", () => {
  let state = readState(
    new URL("https://benmaps.fr/?from=2,48&to=3,49&mode=walking&route=2"),
  );
  if (state.view.kind !== "directions") throw new Error("Expected directions");
  const key = journeyKey(state.view.journey)!;
  const route: Route = {
    id: "a",
    distance: 100,
    duration: 100,
    geometry: {
      type: "LineString",
      coordinates: [
        [2, 48],
        [3, 49],
      ],
    },
    summary: "A",
    steps: [],
  };
  state = reducer(state, { type: "route-loading", key });
  expect(state.view.kind === "directions" && state.view.journey.selected).toBe(
    1,
  );
  state = reducer(state, {
    type: "route-result",
    key,
    routes: [route, { ...route, id: "b" }],
  });
  expect(state.view.kind === "directions" && state.view.journey.selected).toBe(
    1,
  );
  state = reducer(state, { type: "route-loading", key });
  state = reducer(state, { type: "route-result", key, routes: [route] });
  expect(state.view.kind === "directions" && state.view.journey.selected).toBe(
    0,
  );
});
it("ignores invalid enums, coordinates and route indices and bounds display text", () => {
  const url = new URL(
    "https://benmaps.fr/?mode=invalid&basemap=unknown&traffic=no&3d=no&category=invalid&near=500,NaN&pin=2,48&pin_wikidata=Q42%26x=1&pin_name=" +
      "x".repeat(1000),
  );
  const state = readState(url);
  expect(state.settings).toEqual(defaultState.settings);
  expect(state.ui.category).toBeNull();
  expect(state.ui.categoryCenter).toEqual(cameraOrDefault(url).center);
  expect(state.view.kind === "explore" && state.view.place?.name).toHaveLength(
    200,
  );
  expect(
    state.view.kind === "explore" && state.view.place?.wikidata,
  ).toBeUndefined();
});
it("clears stale view parameters and keeps unrelated URL parameters", () => {
  const url = writeState(
    new URL(
      "https://benmaps.fr/?from=2,48&from_name=Louvre&from_q=x&mode=cycling&route=2&3d=1&campaign=test",
    ),
    defaultState,
  );
  for (const key of ["from", "from_name", "from_q", "mode", "route", "3d"])
    expect(url.searchParams.has(key)).toBe(false);
  expect(url.searchParams.get("campaign")).toBe("test");
});
