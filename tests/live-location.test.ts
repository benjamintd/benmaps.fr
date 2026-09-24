import { metersBetween } from "../src/lib/geography";
import { describe, expect, it } from "vitest";
import { matchingRoute, shouldRefresh } from "../src/lib/live-location";
import { journeyKey, pointPlace, reducer } from "../src/lib/domain";
import type { Action, Coordinates, Journey, Route } from "../src/lib/domain";
import { defaultState } from "./fixtures";

const origin: Coordinates = [2.33, 48.86];
const destination: Coordinates = [2.35, 48.85];
const route = (middle: Coordinates, summary = "Main street"): Route => ({
  id: "0",
  distance: 2000,
  duration: 600,
  summary,
  steps: [],
  geometry: { type: "LineString", coordinates: [origin, middle, destination] },
});

describe("live route refresh", () => {
  it("requires displacement, a cooldown, and a fresh accurate position", () => {
    const now = 100_000;
    const fix = {
      coordinates: [2.331, 48.86] as Coordinates,
      accuracy: 10,
      timestamp: now,
    };
    expect(metersBetween(origin, fix.coordinates)).toBeGreaterThan(50);
    expect(metersBetween(origin, fix.coordinates)).toBeLessThan(200);
    expect(shouldRefresh(origin, fix, now - 20_000, now)).toBe(true);
    expect(shouldRefresh(origin, fix, now - 19_999, now)).toBe(false);
    expect(
      shouldRefresh(origin, { ...fix, coordinates: [2.3301, 48.86] }, 0, now),
    ).toBe(false);
    expect(shouldRefresh(origin, { ...fix, accuracy: 400 }, 0, now)).toBe(
      false,
    );
    expect(
      shouldRefresh(origin, { ...fix, timestamp: now - 31_000 }, 0, now),
    ).toBe(false);
  });

  it("preserves the selected corridor when alternatives reorder", () => {
    const main = route([2.34, 48.853]);
    const alternative = route([2.345, 48.865], "River");
    expect(matchingRoute(alternative, [main, alternative])).toBe(1);
    expect(matchingRoute(alternative, [alternative, main])).toBe(0);
  });

  it("atomically advances the origin and rejects late refreshes after edits", () => {
    const from = { ...pointPlace(origin), source: "location" as const };
    let state = reducer(defaultState, {
      type: "directions",
      from,
      to: pointPlace(destination),
    });
    const journey = (): Journey => {
      if (state.view.kind !== "directions") throw new Error("Expected journey");
      return state.view.journey;
    };
    const key = journeyKey(journey())!;
    const main = route([2.34, 48.853]),
      alternative = route([2.345, 48.865], "River");
    state = reducer(state, { type: "route-loading", key });
    state = reducer(state, {
      type: "route-result",
      key,
      routes: [main, alternative],
    });
    state = reducer(state, { type: "route-select", index: 1 });
    const refresh = {
      type: "route-refresh",
      key,
      from: { ...from, coordinates: [2.334, 48.86] as Coordinates },
      routes: [alternative, main],
    } satisfies Action;
    expect(reducer(state, { ...refresh, routes: [] })).toBe(state);
    const fixed = reducer(state, {
      type: "endpoint",
      endpoint: "from",
      place: pointPlace(origin),
    });
    expect(reducer(fixed, refresh)).toBe(fixed);
    const closed = reducer(state, { type: "explore" });
    expect(reducer(closed, refresh)).toBe(closed);
    state = reducer(state, refresh);
    expect(journey().from?.coordinates).toEqual(refresh.from.coordinates);
    expect(journey().routes.status).toBe("ready");
    expect(journey().selected).toBe(0);
    expect(journey().liveRevision).toBe(1);
    expect(reducer(state, refresh)).toBe(state);
  });
});
