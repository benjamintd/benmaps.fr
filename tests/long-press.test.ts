import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { installLongPress } from "../src/lib/map/long-press";

let canvas: HTMLElement;
let onPress = vi.fn<(point: [number, number]) => void>();
let suppressClick = vi.fn<() => void>();
let gesture: ReturnType<typeof installLongPress>;
function pointer(target: EventTarget, type: string, id = 1, x = 100, y = 100) {
  const event = new Event(type);
  Object.assign(event, {
    pointerId: id,
    pointerType: "touch",
    button: 0,
    clientX: x,
    clientY: y,
  });
  target.dispatchEvent(event);
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", new EventTarget());
  vi.stubGlobal("window", new EventTarget());
  canvas = Object.assign(new EventTarget(), {
    getBoundingClientRect: () => ({ left: 20, top: 30 }),
  }) as unknown as HTMLElement;
  onPress = vi.fn();
  suppressClick = vi.fn();
  gesture = installLongPress(canvas, {
    enabled: () => true,
    onPress,
    suppressClick,
  });
});
afterEach(() => {
  gesture.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("requires a sustained hold and suppresses the click even after a long release", () => {
  pointer(canvas, "pointerdown");
  vi.advanceTimersByTime(549);
  expect(onPress).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(onPress).toHaveBeenCalledExactlyOnceWith([80, 70]);
  vi.advanceTimersByTime(3000);
  pointer(document, "pointerup");
  expect(suppressClick).toHaveBeenCalledTimes(2);
  expect(onPress).toHaveBeenCalledTimes(1);
});
it("does not drop a pin on a quick tap", () => {
  pointer(canvas, "pointerdown");
  vi.advanceTimersByTime(200);
  pointer(document, "pointerup");
  vi.advanceTimersByTime(1000);
  expect(onPress).not.toHaveBeenCalled();
});
it("cancels when dragging, even if the finger returns to its start", () => {
  pointer(canvas, "pointerdown");
  pointer(document, "pointermove", 1, 115);
  pointer(document, "pointermove", 1, 100);
  vi.advanceTimersByTime(1000);
  expect(onPress).not.toHaveBeenCalled();
});
it("tolerates small finger movement", () => {
  pointer(canvas, "pointerdown");
  pointer(document, "pointermove", 1, 103, 104);
  vi.advanceTimersByTime(550);
  expect(onPress).toHaveBeenCalledTimes(1);
});
it("cancels a pinch and does not restart while another finger remains down", () => {
  pointer(canvas, "pointerdown");
  pointer(canvas, "pointerdown", 2);
  pointer(document, "pointerup", 2);
  vi.advanceTimersByTime(1000);
  expect(onPress).not.toHaveBeenCalled();
  pointer(document, "pointerup", 1);
  pointer(canvas, "pointerdown", 3);
  vi.advanceTimersByTime(550);
  expect(onPress).toHaveBeenCalledTimes(1);
});
it("cancels interrupted gestures, camera movement, and teardown", () => {
  for (const cancel of [
    () => pointer(document, "pointercancel"),
    () => window.dispatchEvent(new Event("blur")),
    () => document.dispatchEvent(new Event("visibilitychange")),
    () => gesture.cancel(),
    () => gesture.remove(),
  ]) {
    pointer(canvas, "pointerdown");
    cancel();
    vi.advanceTimersByTime(1000);
    expect(onPress).not.toHaveBeenCalled();
    pointer(document, "pointerup");
  }
});
