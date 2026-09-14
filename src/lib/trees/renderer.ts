// Adapted from Clair 3D 0.1.1. See public/trees/LICENSE.txt and THIRD_PARTY.txt.
import {
  Camera,
  Scene,
  Group,
  HemisphereLight,
  DirectionalLight,
  WebGLRenderer,
  Matrix4,
  Vector3,
  NoToneMapping,
} from "three";
import type {
  Map as LibreMap,
  CustomLayerInterface,
  VisibilitySpecification,
} from "maplibre-gl";
import { mercator, treeRecords } from "./geo";
import { createTrees, disposeObject } from "./geometry";

const layerId = "benmaps-trees";
const minZoom = 16;
const maxTrees = 3000;
const flatLayers = ["tree-canopy", "tree-light"];
export type TreeController = { remove: () => void };
/** Owns one custom layer, survives style switches, and restores flat canopies. */
export function attachTrees(
  map: LibreMap,
  onError: () => void,
): TreeController {
  let removed = false;
  let installing = false;
  function install() {
    if (removed || installing || !map.getStyle() || map.getLayer(layerId))
      return;
    installing = true;
    try {
      const before = map
        .getStyle()
        .layers.find((layer) => layer.type === "symbol")?.id;
      map.addLayer(makeLayer(map, onError), before);
    } catch {
      onError();
    } finally {
      installing = false;
    }
  }
  function destroyed() {
    removed = true;
    map.off("style.load", install);
    map.off("styledata", install);
  }
  map.on("style.load", install);
  map.on("styledata", install);
  map.on("remove", destroyed);
  // The style can accept layers before all source tiles have finished loading.
  // Style diffs also emit styledata without another style.load event.
  install();
  return {
    remove() {
      if (removed) return;
      removed = true;
      map.off("style.load", install);
      map.off("styledata", install);
      map.off("remove", destroyed);
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    },
  };
}
function makeLayer(map: LibreMap, onError: () => void): CustomLayerInterface {
  let renderer: WebGLRenderer | undefined;
  const scene = new Scene(),
    camera = new Camera();
  const matrix = new Matrix4(),
    local = new Matrix4(),
    rotation = new Matrix4().makeRotationX(Math.PI / 2);
  let anchor: ReturnType<typeof mercator> | undefined;
  let trees: Group | undefined;
  let treeKey = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false,
    failed = false;
  const visibility = new Map<string, VisibilitySpecification>();
  function flatCanopies(hide: boolean) {
    for (const id of flatLayers)
      if (map.getLayer(id)) {
        if (!visibility.has(id))
          visibility.set(
            id,
            map.getLayoutProperty(id, "visibility") ?? "visible",
          );
        const desired = hide ? "none" : visibility.get(id)!;
        if (map.getLayoutProperty(id, "visibility") !== desired)
          map.setLayoutProperty(id, "visibility", desired);
      }
  }
  const elevation = (coordinates: [number, number]) =>
    map.getTerrain() ? (map.queryTerrainElevation(coordinates) ?? 0) : 0;
  function fail() {
    if (failed || disposed) return;
    failed = true;
    flatCanopies(false);
    onError();
  }
  function refresh() {
    timer = undefined;
    if (disposed || failed || !map.getLayer(layerId)) return;
    try {
      const center = map.getCenter().toArray();
      const zoom = map.getZoom();
      const bounds = map.getBounds();
      const features =
        zoom >= minZoom && map.getSource("protomaps")
          ? map
              .querySourceFeatures("protomaps", {
                sourceLayer: "pois",
                filter: ["==", "kind", "tree"],
              })
              .filter(
                (f) =>
                  f.geometry.type === "Point" &&
                  bounds.contains(f.geometry.coordinates as [number, number]) &&
                  zoom >= (Number(f.properties.min_zoom) || minZoom),
              )
          : [];
      const records = treeRecords(features, center, maxTrees);
      const heights = new Map(
        records.map((tree) => [tree.coordinates, elevation(tree.coordinates)]),
      );
      const key = records
        .map(
          (tree) =>
            `${tree.key}:${tree.coordinates[0]}:${tree.height}:${tree.radius}:${heights.get(tree.coordinates)!.toFixed(1)}`,
        )
        .join("|");
      if (key !== treeKey) {
        // Build before replacing: a failure leaves flat tree coverage available.
        const nextAnchor = mercator(center);
        const next = records.length
          ? createTrees(
              records,
              nextAnchor,
              (coordinates) => heights.get(coordinates) ?? 0,
            )
          : undefined;
        if (trees) {
          scene.remove(trees);
          disposeObject(trees);
        }
        trees = next;
        anchor = nextAnchor;
        treeKey = key;
        if (trees) scene.add(trees);
      }
      // Retain complete flat coverage if the safety cap may have omitted trees.
      flatCanopies(records.length > 0 && records.length < maxTrees);
      map.triggerRepaint();
    } catch {
      fail();
    }
  }
  function schedule(event?: { type: string; sourceId?: string }) {
    if (
      disposed ||
      failed ||
      (event?.sourceId &&
        event.sourceId !== "protomaps" &&
        event.sourceId !== map.getTerrain()?.source)
    )
      return;
    // Coalesce tile arrivals without starving updates during a long tile load.
    if (timer === undefined) timer = setTimeout(refresh, 120);
  }
  return {
    id: layerId,
    type: "custom",
    renderingMode: "3d",
    onAdd(_map, gl) {
      try {
        scene.add(new HemisphereLight(0xfff9ed, 0x8c967d, 1.5));
        const sun = new DirectionalLight(0xfff5e3, 1);
        sun.position.set(-200, 400, 150);
        scene.add(sun);
        renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl });
        renderer.autoClear = false;
        renderer.toneMapping = NoToneMapping;
        map.on("moveend", schedule);
        map.on("sourcedata", schedule);
        map.on("terrain", schedule);
        map.on("projectiontransition", schedule);
        // onAdd precedes insertion into the style's layer table.
        schedule();
      } catch {
        fail();
      }
    },
    render(_gl, args) {
      // Globe transitions to Mercator by z12; trees start at z16. Never send a
      // spherical projection matrix to the local, metre-based Three.js scene.
      if (
        disposed ||
        failed ||
        !renderer ||
        !anchor ||
        !trees ||
        map.getZoom() < minZoom ||
        args.defaultProjectionData.projectionTransition > 0
      )
        return;
      try {
        matrix.fromArray(args.defaultProjectionData.mainMatrix);
        local
          .makeTranslation(anchor.x, anchor.y, 0)
          .scale(new Vector3(anchor.scale, -anchor.scale, anchor.scale))
          .multiply(rotation);
        camera.projectionMatrix.copy(matrix).multiply(local);
        renderer.resetState();
        renderer.render(scene, camera);
        renderer.resetState();
      } catch {
        renderer.resetState();
        fail();
      }
    },
    onRemove() {
      disposed = true;
      clearTimeout(timer);
      map.off("moveend", schedule);
      map.off("sourcedata", schedule);
      map.off("terrain", schedule);
      map.off("projectiontransition", schedule);
      flatCanopies(false);
      disposeObject(scene);
      renderer?.dispose();
    },
  };
}
