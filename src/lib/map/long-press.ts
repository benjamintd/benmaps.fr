/** Touch gestures own their timer and never prevent MapLibre's pan or pinch. */
export function installLongPress(
  canvas: HTMLElement,
  options: {
    enabled: (event: PointerEvent) => boolean;
    onPress: (point: [number, number]) => void;
    suppressClick: () => void;
  },
) {
  const pointers = new Set<number>();
  let start: { id: number; x: number; y: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pressed = false;
  function cancel() {
    clearTimeout(timer);
    timer = undefined;
    start = null;
  }
  function down(event: PointerEvent) {
    if (!options.enabled(event) || event.button !== 0) return;
    pointers.add(event.pointerId);
    cancel();
    if (pointers.size !== 1) return;
    pressed = false;
    start = { id: event.pointerId, x: event.clientX, y: event.clientY };
    timer = setTimeout(() => {
      if (!start) return;
      const rect = canvas.getBoundingClientRect();
      const point: [number, number] = [start.x - rect.left, start.y - rect.top];
      pressed = true;
      cancel();
      options.suppressClick();
      options.onPress(point);
    }, 550);
  }
  function move(event: PointerEvent) {
    if (
      start?.id === event.pointerId &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10
    )
      cancel();
  }
  function up(event: PointerEvent) {
    if (!pointers.delete(event.pointerId)) return;
    cancel();
    // Refresh suppression on release, even after holding for several seconds.
    if (pressed) options.suppressClick();
    if (!pointers.size) pressed = false;
  }
  function reset() {
    cancel();
    pointers.clear();
    pressed = false;
  }
  function contextMenu(event: Event) {
    if (pointers.size) event.preventDefault();
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("contextmenu", contextMenu, true);
  document.addEventListener("pointermove", move, true);
  document.addEventListener("pointerup", up, true);
  document.addEventListener("pointercancel", up, true);
  window.addEventListener("blur", reset);
  document.addEventListener("visibilitychange", reset);
  return {
    cancel,
    remove() {
      reset();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("contextmenu", contextMenu, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", reset);
    },
  };
}
