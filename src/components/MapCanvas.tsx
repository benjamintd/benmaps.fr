import { useEffect, useRef, useState } from "react";
import {
  Map,
  LngLatBounds,
  ScaleControl,
  AttributionControl,
  setWorkerUrl,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import { addPlaceMarkers, addUserLocationMarker } from "../lib/map/markers";
import { routeAtPoint, updateRoutes } from "../lib/map/routes";
import { isPointerTarget, placeAtPoint } from "../lib/map/picking";
import { createContextMenu } from "../lib/map/context-menu";
import { mapStyle } from "../lib/map-style";
import { registerTileProtocols } from "../lib/map/tile-protocols";
import { hasBasemap } from "../lib/config";
import { createClair3D } from "../lib/clair-3d";
import { journeyKey } from "../lib/domain";
import type { AppState, Coordinates, Place } from "../lib/domain";
import { cameraHash, cameraOrDefault, readCamera } from "../lib/url";
import type { Camera } from "../lib/url";
import { Spinner, MapPin, TriangleAlert } from "./Icons";
setWorkerUrl(workerUrl);
registerTileProtocols();
declare global {
  interface Window {
    __onMapCreated?: (map: Map) => void;
  }
}
export type MapCommand =
  | { id: number; type: "camera"; camera: Camera }
  | { id: number; type: "zoom-in" | "zoom-out" | "north" }
  | { id: number; type: "fly"; coordinates: Coordinates; zoom?: number };
type Props = {
  state: AppState;
  places: Place[];
  userLocation: Coordinates | null;
  command: MapCommand | null;
  onPick: (place: Place) => void;
  onSelectRoute: (index: number) => void;
  onDragEndpoint: (endpoint: "from" | "to", coordinates: Coordinates) => void;
  onCenter: (center: Coordinates) => void;
  onOrientation: (orientation: { bearing: number; pitch: number }) => void;
  onNotice: (message: string) => void;
};
function padding(kind: "explore" | "directions") {
  if (window.innerWidth > 700)
    return { top: 100, right: 85, bottom: 90, left: 420 };
  return kind === "directions"
    ? { top: window.innerHeight * 0.48 + 28, right: 55, bottom: 50, left: 35 }
    : {
        top: 140,
        right: 55,
        bottom: window.innerHeight * 0.46 + 45,
        left: 35,
      };
}
export default function MapCanvas(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const threeD = useRef<ReturnType<typeof createClair3D> | null>(null);
  const contextMenu = useRef<ReturnType<typeof createContextMenu> | null>(null);
  const suppressClickUntil = useRef(0);
  const latest = useRef(props);
  latest.current = props;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [retry, setRetry] = useState(0);
  const styleKey = JSON.stringify(props.state.settings);
  const appliedStyle = useRef(styleKey);
  const styleReady = useRef(false);
  const applied3D = useRef(props.state.settings.threeDimensional);
  const appliedCameraCommand = useRef<number | null>(null);
  const preserveRouteCamera = useRef(
    readCamera(new URL(window.location.href)) !== null &&
      props.state.view.kind === "directions"
      ? journeyKey(props.state.view.journey)
      : null,
  );
  useEffect(() => {
    if (!container.current || !hasBasemap) return;
    let map: Map;
    try {
      const url = new URL(window.location.href);
      map = new Map({
        container: container.current,
        ...cameraOrDefault(url),
        // Without a shared framing, 3D opens tilted rather than flat.
        ...(readCamera(url)
          ? {}
          : { pitch: latest.current.state.settings.threeDimensional ? 30 : 0 }),
        minZoom: 1,
        maxZoom: 20,
        maxPitch: 60,
        attributionControl: false,
        canvasContextAttributes: { antialias: true },
      });
    } catch {
      setError(
        "Your browser couldn’t start the map. Try a browser with WebGL enabled.",
      );
      return;
    }
    mapRef.current = map;
    // Development-only seam for browser tests: hands over the live map before
    // any style or layer work, so a test can observe or wrap it. Tree-shaken
    // out of production builds, where import.meta.env.DEV is statically false.
    if (import.meta.env.DEV) window.__onMapCreated?.(map);
    threeD.current = createClair3D(map, {
      onError: () => latest.current.onNotice("Some 3D details couldn’t load."),
    });
    const initialStyleKey = JSON.stringify(latest.current.state.settings);
    appliedStyle.current = initialStyleKey;
    setLoading(true);
    setError(null);
    // Clair's style is fetched over the network, so apply it once it arrives.
    mapStyle(latest.current.state.settings)
      .then((style) => {
        if (mapRef.current === map && appliedStyle.current === initialStyleKey)
          map.setStyle(style);
      })
      .catch(() => {
        if (mapRef.current === map && appliedStyle.current === initialStyleKey)
          setError(
            "Some map details couldn’t load. Check your connection or try again.",
          );
      });
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution: [
          '<a href="https://clair.benmaps.fr" target="_blank" rel="noopener">Clair</a>',
          '<a href="https://open-landmarks.benmaps.fr/licenses/" target="_blank" rel="noopener">Open Landmarks contributors · CC BY 4.0</a>',
        ],
      }),
      "bottom-right",
    );
    map.addControl(
      new ScaleControl({ unit: "metric", maxWidth: 100 }),
      "bottom-left",
    );
    map.on("style.load", () => {
      styleReady.current = true;
      setEpoch((n) => n + 1);
    });
    map.on("idle", () => setLoading(false));
    map.on("error", (event) => {
      const message = event.error?.message ?? "";
      if (/abort/i.test(message)) return;
      // Preserve useful local diagnostics without leaking browser API credentials.
      if (import.meta.env.DEV)
        console.error(
          "[Benmaps map]",
          message.replace(
            /([?&](?:key|access_token)=)[^&\s)]+/g,
            "$1[redacted]",
          ),
        );
      setLoading(false);
      // Individual tile failures are recoverable and common on slow networks.
      // Keep the map usable without turning each resource error into an alert.
    });
    // Update during gestures and camera animations, not just after they end.
    const syncOrientation = () =>
      latest.current.onOrientation({
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    map.on("rotate", syncOrientation);
    map.on("pitch", syncOrientation);
    syncOrientation();
    map.on("moveend", () => {
      const c = map.getCenter();
      const center: Coordinates = [c.lng, c.lat];
      latest.current.onCenter(center);
      const url = new URL(window.location.href);
      url.hash = cameraHash({
        center,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
      window.history.replaceState(null, "", url);
    });
    map.on("click", (event) => {
      if (performance.now() < suppressClickUntil.current) return;
      if (
        event.originalEvent.target instanceof Element &&
        event.originalEvent.target.closest(".map-marker")
      )
        return;
      const index = routeAtPoint(
        map,
        event.point,
        "touches" in event.originalEvent ? 14 : 8,
      );
      if (index !== undefined) {
        latest.current.onSelectRoute(index);
        return;
      }
      latest.current.onPick(placeAtPoint(map, event.point, event.lngLat));
    });
    map.on("mousemove", (event) => {
      map.getCanvas().style.cursor =
        routeAtPoint(map, event.point) !== undefined ||
        isPointerTarget(map, event.point)
          ? "pointer"
          : "";
    });
    // Right-click drops a popup pinned to the point with copyable coordinates.
    contextMenu.current = createContextMenu(map, {
      onCopied: (message) => latest.current.onNotice(message),
    });
    map.on("contextmenu", (event) => contextMenu.current?.openAt(event.lngLat));
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      contextMenu.current?.remove();
      contextMenu.current = null;
      void threeD.current?.remove();
      threeD.current = null;
      map.remove();
      mapRef.current = null;
      styleReady.current = false;
    };
  }, [retry]);
  // Equal settings restored from the URL must not cancel an in-flight style.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedStyle.current === styleKey) return;
    appliedStyle.current = styleKey;
    const dimensionalityChanged =
      applied3D.current !== props.state.settings.threeDimensional;
    applied3D.current = props.state.settings.threeDimensional;
    const restoringCamera =
      props.command?.type === "camera" &&
      props.command.id !== appliedCameraCommand.current;
    setError(null);
    styleReady.current = false;
    let cancelled = false;
    mapStyle(props.state.settings)
      .then((style) => {
        if (cancelled || mapRef.current !== map) return;
        map.setStyle(style);
        if (dimensionalityChanged && !restoringCamera)
          map.easeTo({
            pitch: props.state.settings.threeDimensional ? 30 : 0,
            duration: 600,
          });
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Some map details couldn’t load. Check your connection or try again.",
          );
      });
    return () => {
      cancelled = true;
    };
    // styleKey already encodes every setting; command is read as a one-shot
    // snapshot, so widening these deps would re-run the style swap spuriously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey]);
  useEffect(() => {
    void threeD.current?.setEnabled(props.state.settings.threeDimensional);
  }, [props.state.settings.threeDimensional, retry]);
  // Rehydrate sources after every style load; the React domain is the source of truth.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    updateRoutes(map, props.state.view);
  }, [props.state.view, epoch]);
  const viewKind = props.state.view.kind;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.userLocation) return;
    return addUserLocationMarker(map, props.userLocation);
  }, [props.userLocation, retry]);
  const selectedPlace =
    props.state.view.kind === "explore" ? props.state.view.place : null;
  const from =
    props.state.view.kind === "directions"
      ? props.state.view.journey.from
      : null;
  const to =
    props.state.view.kind === "directions" ? props.state.view.journey.to : null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    return addPlaceMarkers(map, latest.current.state.view, props.places, {
      onPick: (place) => latest.current.onPick(place),
      onDragEndpoint: (endpoint, coordinates) => {
        suppressClickUntil.current = performance.now() + 250;
        latest.current.onDragEndpoint(endpoint, coordinates);
      },
    });
  }, [viewKind, selectedPlace, from, to, props.places, retry]);
  const route =
    props.state.view.kind === "directions" &&
    props.state.view.journey.routes.status === "ready"
      ? props.state.view.journey.routes.data[props.state.view.journey.selected]
      : null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;
    const key =
      latest.current.state.view.kind === "directions"
        ? journeyKey(latest.current.state.view.journey)
        : null;
    if (key && preserveRouteCamera.current === key) {
      preserveRouteCamera.current = null;
      return;
    }
    preserveRouteCamera.current = null;
    const bounds = new LngLatBounds();
    route.geometry.coordinates.forEach((c) => bounds.extend([c[0], c[1]]));
    // fitBounds adds its padding to any existing camera padding.
    map.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
    map.fitBounds(bounds, {
      padding: padding("directions"),
      maxZoom: 16,
      duration: 800,
    });
  }, [route]);
  useEffect(() => {
    const map = mapRef.current,
      command = props.command;
    if (!map || !command) return;
    if (command.type === "camera") {
      appliedCameraCommand.current = command.id;
      preserveRouteCamera.current =
        latest.current.state.view.kind === "directions"
          ? journeyKey(latest.current.state.view.journey)
          : null;
      map.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
      map.jumpTo(command.camera);
    } else if (command.type === "zoom-in") map.zoomIn();
    else if (command.type === "zoom-out") map.zoomOut();
    else if (command.type === "north") map.easeTo({ bearing: 0, pitch: 0 });
    else if (command.type === "fly") {
      const inset = padding(latest.current.state.view.kind);
      map.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
      map.flyTo({
        center: command.coordinates,
        zoom: command.zoom ?? Math.max(15, map.getZoom()),
        offset: [
          (inset.left - inset.right) / 2,
          (inset.top - inset.bottom) / 2,
        ],
        duration: 900,
      });
    }
  }, [props.command]);
  return (
    <>
      <div
        ref={container}
        className="map-canvas"
        aria-label="Interactive map"
      />
      {!hasBasemap ? (
        <div className="map-fallback">
          <MapPin size={36} />
          <h2>Map configuration needed</h2>
          <p>Add a Protomaps key or PMTiles URL to load your map.</p>
          <code>VITE_PROTOMAPS_KEY</code>
          <small>See the project README for Vercel setup.</small>
        </div>
      ) : error ? (
        <div className="map-notice" role="alert">
          <TriangleAlert size={16} />
          <span>{error}</span>
          <button
            onClick={() => {
              setError(null);
              setRetry((n) => n + 1);
            }}
          >
            Retry
          </button>
          <button aria-label="Dismiss map error" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      ) : loading ? (
        <div className="map-loading" role="status">
          <Spinner size={15} className="spin" />
          Loading map…
        </div>
      ) : null}
    </>
  );
}
