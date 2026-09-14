import { expect, it, vi } from "vitest";
import type { Map } from "maplibre-gl";
import { createClair3D, LANDMARKS_CATALOGUE_URL } from "../src/lib/clair-3d";
const map = {} as Map;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}
it("flat maps do not import the SDK; disabling during import prevents attachment", async () => {
  const addClair3D = vi.fn(async () => ({ remove: vi.fn() }));
  const imported = deferred<{ addClair3D: typeof addClair3D }>();
  const loadSDK = vi.fn(() => imported.promise);
  const controller = createClair3D(map, { onError: vi.fn(), loadSDK });
  await controller.setEnabled(false);
  expect(loadSDK).not.toHaveBeenCalled();
  const loading = controller.setEnabled(true);
  await Promise.resolve();
  const disabled = controller.setEnabled(false);
  imported.resolve({ addClair3D });
  await Promise.all([loading, disabled]);
  expect(addClair3D).not.toHaveBeenCalled();
});
it("rapid toggles remove a late attachment before starting the next one", async () => {
  const first = deferred<{ remove(): void }>();
  const started = deferred<void>();
  const removeFirst = vi.fn();
  const removeSecond = vi.fn();
  const addClair3D = vi
    .fn()
    .mockImplementationOnce(() => {
      started.resolve();
      return first.promise;
    })
    .mockResolvedValue({ remove: removeSecond });
  const onError = vi.fn();
  const controller = createClair3D(map, {
    onError,
    loadSDK: async () => ({ addClair3D }),
  });
  const one = controller.setEnabled(true);
  await started.promise;
  void controller.setEnabled(false);
  const two = controller.setEnabled(true);
  expect(addClair3D).toHaveBeenCalledTimes(1);
  first.resolve({ remove: removeFirst });
  await Promise.all([one, two]);
  expect(removeFirst).toHaveBeenCalledTimes(1);
  expect(addClair3D).toHaveBeenCalledTimes(2);
  expect(removeFirst.mock.invocationCallOrder[0]).toBeLessThan(
    addClair3D.mock.invocationCallOrder[1],
  );
  expect(addClair3D).toHaveBeenLastCalledWith(
    map,
    expect.objectContaining({
      trees: true,
      landmarks: true,
      maxResident: 3,
      catalogueUrl: LANDMARKS_CATALOGUE_URL,
    }),
  );
  await controller.remove();
  await controller.remove();
  expect(removeSecond).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
});
it("destroying the map retires a pending attachment and ignores its callbacks", async () => {
  const attachment = deferred<{ remove(): void }>();
  const started = deferred<void>();
  let report!: (error: unknown) => void;
  const onError = vi.fn();
  const remove = vi.fn();
  const controller = createClair3D(map, {
    onError,
    loadSDK: async () => ({
      addClair3D: async (_map, options) => {
        report = options.onError as typeof report;
        started.resolve();
        return attachment.promise;
      },
    }),
  });
  const pending = controller.setEnabled(true);
  await started.promise;
  void controller.remove();
  report(new Error("stale error"));
  attachment.resolve({ remove });
  await pending;
  expect(remove).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
});
it("failed imports report an error and can retry on the next toggle", async () => {
  const failure = new Error("offline");
  const addClair3D = vi.fn().mockResolvedValue({ remove: vi.fn() });
  const loadSDK = vi
    .fn()
    .mockRejectedValueOnce(failure)
    .mockResolvedValue({ addClair3D });
  const onError = vi.fn();
  const controller = createClair3D(map, { loadSDK, onError });
  await controller.setEnabled(true);
  expect(onError).toHaveBeenCalledWith(failure);
  await controller.setEnabled(true);
  expect(addClair3D).toHaveBeenCalledTimes(1);
  await controller.remove();
});
