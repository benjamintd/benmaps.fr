import { describe, expect, it } from "vitest";
import { sampleLine, elevationStats } from "../src/lib/elevation";

describe("cycling elevation", () => {
  it("samples short rides densely and includes both endpoints", () => {
    const points = sampleLine([
      [2, 48],
      [2.01, 48],
    ]);
    expect(points.length).toBeGreaterThan(5);
    expect(points[0]).toEqual([2, 48]);
    expect(points.at(-1)).toEqual([2.01, 48]);
    expect(
      sampleLine([
        [0, 0],
        [10, 0],
      ]),
    ).toHaveLength(40);
  });
  it("handles repeated coordinates without producing invalid samples", () => {
    expect(
      sampleLine([
        [2, 48],
        [2, 48],
      ]),
    ).toEqual([[2, 48]]);
    const points = sampleLine([
      [2, 48],
      [2, 48],
      [2.01, 48],
    ]);
    expect(points.flat().every(Number.isFinite)).toBe(true);
  });
  it("keeps genuine flat profiles and never turns absent data into flat terrain", () => {
    expect(elevationStats([30, 30, 30])).toMatchObject({
      ascent: 0,
      descent: 0,
    });
    expect(elevationStats([null, null])).toBeNull();
    expect(elevationStats([30, null])).toBeNull();
  });
  it("totals ascents and descents without connecting unknown sections", () => {
    expect(elevationStats([10, 20, 15, null, 100, 90])).toEqual({
      ascent: 10,
      descent: 15,
      min: 10,
      max: 100,
      partial: true,
    });
  });
});
