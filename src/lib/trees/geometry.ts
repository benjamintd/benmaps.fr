// Adapted from Clair 3D 0.1.1. See public/trees/LICENSE.txt and THIRD_PARTY.txt.
import {
  Group,
  SphereGeometry,
  CylinderGeometry,
  MeshLambertMaterial,
  InstancedMesh,
  Object3D,
  Color,
} from "three";
import { mercator } from "./geo";
import type { TreeRecord } from "./geo";
import type { BufferGeometry, Material } from "three";
const canopyColor = "#99c283"; // Clair's tree palette.

/** Shared low-poly crowns with broad, smooth lobes. All sizes are world metres. */
export function createTrees(
  records: TreeRecord[],
  anchor: ReturnType<typeof mercator>,
  elevation: (coordinates: [number, number]) => number,
) {
  const group = new Group();
  const crown = new SphereGeometry(1, 10, 7);
  const positions = crown.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    const warp = 1 + 0.095 * Math.sin(x * 5 + y * 3) * Math.cos(z * 5 - y * 2);
    positions.setXYZ(i, x * warp, y * warp, z * warp);
  }
  crown.computeVertexNormals();
  const canopy = new InstancedMesh(
    crown,
    new MeshLambertMaterial({
      color: "#ffffff",
      emissive: canopyColor,
      // Keep shaded faces near the lightness of Clair’s flat tree canopies.
      emissiveIntensity: 0.55,
    }),
    records.length,
  );
  const trunks = new InstancedMesh(
    new CylinderGeometry(0.13, 0.22, 1, 5),
    new MeshLambertMaterial({ color: "#95816b" }),
    records.length,
  );
  canopy.frustumCulled = trunks.frustumCulled = false;
  const transform = new Object3D(),
    color = new Color();
  records.forEach((t, i) => {
    const point = mercator(t.coordinates),
      x = (point.x - anchor.x) / anchor.scale,
      z = (point.y - anchor.y) / anchor.scale;
    const ratio = point.scale / anchor.scale;
    const base = elevation(t.coordinates) * ratio;
    const crownHeight = t.height * 0.73;
    transform.position.set(
      x,
      base + (t.height - crownHeight * 0.45) * ratio,
      z,
    );
    transform.rotation.set(0, t.seed * Math.PI * 2, 0);
    transform.scale.set(
      t.radius * ratio,
      crownHeight * 0.55 * ratio,
      t.radius * (0.88 + t.seed * 0.2) * ratio,
    );
    transform.updateMatrix();
    canopy.setMatrixAt(i, transform.matrix);
    // Use the basemap's actual canopy color; vary brightness, never hue.
    color.set(canopyColor).multiplyScalar(0.96 + t.seed * 0.08);
    canopy.setColorAt(i, color);
    transform.position.set(x, base + t.height * 0.24 * ratio, z);
    transform.scale.set(ratio, t.height * 0.48 * ratio, ratio);
    transform.updateMatrix();
    trunks.setMatrixAt(i, transform.matrix);
  });
  canopy.instanceMatrix.needsUpdate = trunks.instanceMatrix.needsUpdate = true;
  if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true;
  group.add(trunks, canopy);
  return group;
}
export function disposeObject(object: Object3D) {
  const geometries = new Set<BufferGeometry>(),
    materials = new Set<Material>();
  object.traverse((child) => {
    const mesh = child as InstancedMesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material])
      if (material) materials.add(material);
    if (mesh.isInstancedMesh) mesh.dispose();
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
