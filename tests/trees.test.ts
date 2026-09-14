import { describe, expect, it } from "vitest";
import type { Feature, Point } from "geojson";
import { InstancedMesh, Matrix4, Vector3 } from "three";
import { mercator, treeRecords } from "../src/lib/trees/geo";
import { createTrees, disposeObject } from "../src/lib/trees/geometry";
const feature = (coordinates: number[], properties = {}): Feature<Point> => ({
  type: "Feature",
  geometry: { type: "Point", coordinates },
  properties: { kind: "tree", ...properties },
});
describe("procedural trees", () => {
  it("deduplicates tile buffers, respects dimensions, and excludes underground or invalid locations", () => {
    const measured = feature([2, 48], { height: 12, diameter_crown: 8 });
    const trees = treeRecords(
      [
        measured,
        measured,
        feature([2.1, 48], { location: "underground" }),
        feature([2.2, 48], { tunnel: "yes" }),
        feature([2.3, 48], { layer: -1 }),
        feature([NaN, 48]),
      ],
      [2, 48],
    );
    expect(trees).toHaveLength(1);
    expect(trees[0]).toMatchObject({ height: 12, radius: 4 });
  });
  it("keeps the nearest trees with stable variation across tile arrival order", () => {
    const near = feature([2, 48]),
      far = feature([3, 48]);
    expect(treeRecords([near, far], [2, 48])).toEqual(
      treeRecords([far, near], [2, 48]),
    );
    expect(treeRecords([far, near], [2, 48], 1)[0].coordinates).toEqual([
      2, 48,
    ]);
  });
  it("selects the nearest world copy at the date line without creating duplicate trees", () => {
    const trees = treeRecords(
      [feature([-179.999, 0]), feature([180.001, 0])],
      [179.999, 0],
    );
    expect(trees).toHaveLength(1);
    expect(trees[0].coordinates[0]).toBeCloseTo(180.001);
    expect(
      Math.abs(mercator(trees[0].coordinates).x - mercator([179.999, 0]).x),
    ).toBeLessThan(0.00001);
  });
  it("uses two instanced meshes, raises them with terrain and releases their geometry", () => {
    const records = treeRecords([feature([2, 48], { height: 12 })], [2, 48]);
    const anchor = mercator([2, 48]);
    const flat = createTrees(records, anchor, () => 0),
      raised = createTrees(records, anchor, () => 75);
    expect(raised.children).toHaveLength(2);
    const position = (mesh: InstancedMesh) => {
      const matrix = new Matrix4();
      mesh.getMatrixAt(0, matrix);
      return new Vector3().setFromMatrixPosition(matrix);
    };
    raised.children.forEach((child, i) => {
      expect(child).toBeInstanceOf(InstancedMesh);
      const mesh = child as InstancedMesh;
      expect(mesh.count).toBe(1);
      expect(
        position(mesh).y - position(flat.children[i] as InstancedMesh).y,
      ).toBeCloseTo(75, 4);
    });
    let disposed = 0;
    raised.children.forEach((child) =>
      (child as InstancedMesh).geometry.addEventListener(
        "dispose",
        () => disposed++,
      ),
    );
    disposeObject(flat);
    disposeObject(raised);
    expect(disposed).toBe(2);
  });
});
