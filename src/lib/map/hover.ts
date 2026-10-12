import type { Map, MapMouseEvent, Point } from "maplibre-gl";
import { isPointerTarget } from "./picking";
import { routeAtPoint } from "./routes";

/** Coalesce hover checks and leave camera gestures free of feature queries. */
export function installMapHover(map: Map) {
  const canvas = map.getCanvas();
  const touch = window.matchMedia("(max-width: 700px), (pointer: coarse)");
  let point: Point | null = null;
  let frame: number | null = null;
  let moving = map.isMoving();

  function cancel() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  }
  function clear() {
    canvas.style.cursor = "";
  }
  function update() {
    frame = null;
    if (!point || moving || map.isMoving()) return;
    const cursor =
      routeAtPoint(map, point) !== undefined ||
      isPointerTarget(map, point, touch.matches)
        ? "pointer"
        : "";
    if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
  }
  function schedule() {
    if (point && !moving && frame === null)
      frame = requestAnimationFrame(update);
  }
  function onMouseMove(event: MapMouseEvent) {
    point = event.point;
    if (event.originalEvent.buttons) {
      cancel();
      clear();
      return;
    }
    schedule();
  }
  function onMoveStart() {
    moving = true;
    cancel();
    clear();
  }
  function onMoveEnd() {
    moving = false;
    schedule();
  }
  function onMouseOut() {
    point = null;
    cancel();
    clear();
  }

  map.on("mousemove", onMouseMove);
  map.on("mouseout", onMouseOut);
  map.on("movestart", onMoveStart);
  map.on("moveend", onMoveEnd);
  map.on("styledata", schedule);
  return () => {
    cancel();
    clear();
    map.off("mousemove", onMouseMove);
    map.off("mouseout", onMouseOut);
    map.off("movestart", onMoveStart);
    map.off("moveend", onMoveEnd);
    map.off("styledata", schedule);
  };
}
