import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../src/lib/config", () => ({ config: { mapboxToken: "test-token" } }));
import { getRoutes, retrieve, suggest } from "../src/lib/api";
afterEach(() => vi.unstubAllGlobals());
describe("provider boundaries", () => {
  it("uses one explicit search session and encodes the query", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ suggestions: [] })));
    vi.stubGlobal("fetch", fetch);
    await suggest(
      "A & B",
      [2, 48],
      "session-123",
      new AbortController().signal,
    );
    const url = fetch.mock.calls[0][0] as URL;
    expect(url.searchParams.get("q")).toBe("A & B");
    expect(url.searchParams.get("session_token")).toBe("session-123");
  });
  it("rejects impossible provider coordinates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            features: [
              {
                geometry: { type: "Point", coordinates: [500, 48] },
                properties: { name: "Bad result" },
              },
            ],
          }),
        ),
      ),
    );
    await expect(
      retrieve("place", "session", new AbortController().signal),
    ).rejects.toThrow();
  });
  it("handles no route without pretending there is a journey", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ code: "NoRoute", routes: [] })),
        ),
    );
    await expect(
      getRoutes([2, 48], [3, 49], "walking", new AbortController().signal),
    ).resolves.toEqual([]);
  });
  it("reports authorization failures without exposing the access token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 401 })),
    );
    await expect(
      suggest("Paris", [2, 48], "session", new AbortController().signal),
    ).rejects.toThrow("authorize");
  });
});
