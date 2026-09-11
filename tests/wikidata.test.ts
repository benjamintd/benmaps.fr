import { afterEach, describe, expect, it, vi } from "vitest";
import { imageInfo } from "../src/lib/wikidata";

afterEach(() => vi.unstubAllGlobals());

describe("Commons photos", () => {
  function response(host: string) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            query: {
              pages: {
                "6926930": {
                  imageinfo: [
                    {
                      thumburl: `https://${host}/wikipedia/commons/thumb/a/a8/Tour_Eiffel.jpg/960px-Tour_Eiffel.jpg`,
                      descriptionurl:
                        "https://commons.wikimedia.org/wiki/File:Tour_Eiffel.jpg",
                      extmetadata: {
                        CommonsMetadataExtension: { value: 1.2 },
                        Artist: { value: "Benh LIEU SONG" },
                        LicenseShortName: { value: "Public domain" },
                      },
                    },
                  ],
                },
              },
            },
          }),
        ),
      ),
    );
    // These fixtures contain plain text; HTML extraction is provided by the browser.
    vi.stubGlobal(
      "DOMParser",
      class {
        parseFromString(text: string) {
          return { body: { textContent: text } };
        }
      },
    );
  }
  it.each(["thumb.wikimedia.org", "upload.wikimedia.org"])(
    "accepts Commons thumbnails from %s and numeric extension metadata",
    async (host) => {
      response(host);
      const image = await imageInfo(
        "Tour Eiffel.jpg",
        new AbortController().signal,
      );
      expect(image).toMatchObject({
        credit: "Benh LIEU SONG",
        license: "Public domain",
        page: "https://commons.wikimedia.org/wiki/File:Tour_Eiffel.jpg",
      });
      expect(new URL(image!.url).hostname).toBe(host);
    },
  );
  it("rejects a thumbnail on an unrelated host", async () => {
    response("unrelated.example");
    expect(
      await imageInfo("Tour Eiffel.jpg", new AbortController().signal),
    ).toBeUndefined();
  });
});
