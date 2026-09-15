import { useEffect, useRef } from "react";
import {
  Check,
  Cube,
  Info,
  Layers,
  Map as MapIcon,
  Satellite,
  TrafficCone,
  X,
} from "./Icons";
import { config } from "../lib/config";
import type { MapSettings } from "../lib/domain";

export function MapAppearance({
  settings,
  open,
  onOpenChange,
  onSettingsChange,
  onAbout,
}: {
  settings: MapSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChange: (settings: Partial<MapSettings>) => void;
  onAbout: () => void;
}) {
  const layerPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !layerPanel.current?.contains(event.target)
      )
        onOpenChange(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [open, onOpenChange]);
  return (
    <div className="layers-anchor" ref={layerPanel}>
      {open && (
        <section className="layers-panel" aria-label="Map appearance">
          <header>
            <h2>Map type</h2>
            <button
              className="icon-button small"
              aria-label="Close map appearance"
              onClick={() => onOpenChange(false)}
            >
              <X size={17} />
            </button>
          </header>
          <div className="basemap-options">
            <button
              aria-pressed={settings.basemap === "clair"}
              className={settings.basemap === "clair" ? "active" : ""}
              onClick={() => onSettingsChange({ basemap: "clair" })}
            >
              <span className="basemap-thumbnail clair-thumbnail">
                <MapIcon size={29} />
              </span>
              <span>
                Clair {settings.basemap === "clair" && <Check size={15} />}
              </span>
            </button>
            <button
              disabled={!config.mapboxToken}
              aria-pressed={settings.basemap === "satellite"}
              className={settings.basemap === "satellite" ? "active" : ""}
              onClick={() => onSettingsChange({ basemap: "satellite" })}
            >
              <span className="basemap-thumbnail satellite-thumbnail">
                <Satellite size={29} />
              </span>
              <span>
                Satellite{" "}
                {settings.basemap === "satellite" && <Check size={15} />}
              </span>
            </button>
          </div>
          <label className="setting-row">
            <TrafficCone size={19} />
            <span>
              Live traffic<small>Current road conditions</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={settings.traffic}
              disabled={!config.mapboxToken}
              onChange={(e) => onSettingsChange({ traffic: e.target.checked })}
            />
          </label>
          <label className="setting-row">
            <Cube size={19} />
            <span>3D</span>
            <input
              type="checkbox"
              role="switch"
              checked={settings.threeDimensional}
              onChange={(e) =>
                onSettingsChange({ threeDimensional: e.target.checked })
              }
            />
          </label>
          {!config.mapboxToken && (
            <p className="setting-note">
              Satellite and traffic need a Mapbox token.
            </p>
          )}
        </section>
      )}
      <button
        className={`layers-toggle ${open ? "active" : ""}`}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <span className={`layer-mini ${settings.basemap}`}>
          <Layers size={20} />
        </span>
        <span>Layers</span>
      </button>
      <button
        className="map-control about-toggle"
        aria-label="About Benmaps"
        aria-haspopup="dialog"
        title="About Benmaps"
        onClick={() => onAbout()}
      >
        <Info size={20} />
      </button>
    </div>
  );
}
