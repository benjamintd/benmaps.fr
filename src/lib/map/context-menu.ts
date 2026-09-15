import { Popup } from "maplibre-gl";
import type { Map } from "maplibre-gl";

type Options = { onCopied: (message: string) => void };

/**
 * Right-click menu pinned to a point, offering its copyable coordinates.
 * Owns its popup: the returned handle replaces or removes the previous one.
 */
export function createContextMenu(map: Map, { onCopied }: Options) {
  let popup: Popup | null = null;
  return {
    openAt(lngLat: { lng: number; lat: number }) {
      const text = `${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}`;
      popup?.remove();
      const menu = document.createElement("div");
      menu.className = "context-menu";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "context-coords";
      const value = document.createElement("strong");
      value.textContent = text;
      const hint = document.createElement("small");
      hint.textContent = "Copy coordinates";
      button.append(value, hint);
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(text);
          onCopied("Coordinates copied.");
        } catch {
          onCopied(text);
        }
        popup?.remove();
      });
      menu.appendChild(button);
      popup = new Popup({
        closeButton: false,
        closeOnClick: true,
        className: "context-popup",
        offset: 12,
      })
        .setLngLat([lngLat.lng, lngLat.lat])
        .setDOMContent(menu)
        .addTo(map);
    },
    remove() {
      popup?.remove();
      popup = null;
    },
  };
}
