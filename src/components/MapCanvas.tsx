import type * as GeoJSON from "geojson";
import { useEffect, useRef, useState } from "react";
import {
  Map,
  Marker,
  LngLatBounds,
  ScaleControl,
  AttributionControl,
  addProtocol,
  setWorkerUrl,
} from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyle } from "../lib/map-style";
import { hasBasemap } from "../lib/config";
import { wikidataId } from "../lib/wikidata";
import { pointPlace } from "../lib/domain";
import type { AppState, Coordinates, Place } from "../lib/domain";
import { cameraHash, readCamera } from "../lib/url";
import { LoaderCircle, MapPin, TriangleAlert } from "./Icons";
setWorkerUrl(workerUrl);
const protocol = new Protocol();
addProtocol("pmtiles", protocol.tile);
export type MapCommand =
  | { id: number; type: "zoom-in" | "zoom-out" | "north" }
  | { id: number; type: "fly"; coordinates: Coordinates; zoom?: number };
type Props = {
  state: AppState;
  places: Place[];
  command: MapCommand | null;
  onPick: (place: Place) => void;
  onCenter: (center: Coordinates) => void;
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
const empty: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};
export default function MapCanvas(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [status, setStatus] = useState("Loading map…");
  const [error, setError] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [retry, setRetry] = useState(0);
  const styleKey = JSON.stringify(props.state.settings);
  const appliedStyle = useRef(styleKey);
  const styleReady = useRef(false);
  useEffect(() => {
    if (!container.current || !hasBasemap) return;
    let map: Map;
    try {
      map = new Map({
        container: container.current,
        style: mapStyle(latest.current.state.settings),
        ...readCamera(new URL(window.location.href)),
        minZoom: 1,
        maxZoom: 20,
        maxPitch: 60,
        attributionControl: false,
      });
    } catch {
      setError(
        "Your browser couldn’t start the map. Try a browser with WebGL enabled.",
      );
      return;
    }
    mapRef.current = map;
    appliedStyle.current = JSON.stringify(latest.current.state.settings);
    setStatus("Loading map…");
    setError(null);
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution:
          '<a href="https://clair.benmaps.fr" target="_blank">Clair</a>',
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
    map.on("idle", () => {
      setStatus("");
    });
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
      setStatus("");
      setError(
        /403|401/.test(message)
          ? "The map provider denied this request. Check your key’s allowed domains."
          : "Some map details couldn’t load. Check your connection or try again.",
      );
    });
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
      if (
        event.originalEvent.target instanceof Element &&
        event.originalEvent.target.closest(".map-marker")
      )
        return;
      const features = map.queryRenderedFeatures(event.point);
      const feature = features.find(
        (f) =>
          f.layer.type === "symbol" &&
          (f.properties?.["name:en"] || f.properties?.name),
      );
      const coordinates: Coordinates =
        feature?.geometry.type === "Point"
          ? [feature.geometry.coordinates[0], feature.geometry.coordinates[1]]
          : [event.lngLat.lng, event.lngLat.lat];
      latest.current.onPick({
        ...pointPlace(
          coordinates,
          feature
            ? String(feature.properties["name:en"] || feature.properties.name)
            : undefined,
        ),
        category: feature?.properties.kind,
        wikidata: wikidataId(feature?.properties.wikidata),
      });
    });
    map.on("mousemove", (event) => {
      map.getCanvas().style.cursor = map
        .queryRenderedFeatures(event.point)
        .some((f) => f.layer.type === "symbol")
        ? "pointer"
        : "";
    });
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      styleReady.current = false;
    };
  }, [retry]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedStyle.current === styleKey) return;
    appliedStyle.current = styleKey;
    setError(null);
    styleReady.current = false;
    map.setStyle(mapStyle(props.state.settings));
    map.easeTo({
      pitch: props.state.settings.threeDimensional ? 30 : 0,
      duration: 600,
    });
  }, [styleKey, props.state.settings]);
  // Rehydrate sources after every style load; the React domain is the source of truth.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const view = props.state.view;
    const journey = view.kind === "directions" ? view.journey : null;
    const routes =
      journey?.routes.status === "ready" ? journey.routes.data : [];
    const selected = journey?.selected ?? 0;
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: routes
        .map((route, i) => ({
          type: "Feature" as const,
          geometry: route.geometry,
          properties: { selected: i === selected },
        }))
        .sort(
          (a, b) =>
            Number(a.properties.selected) - Number(b.properties.selected),
        ),
    };
    if (!map.getSource("journey")) {
      map.addSource("journey", { type: "geojson", data: empty });
      map.addLayer({
        id: "journey-casing",
        type: "line",
        source: "journey",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 10,
          "line-opacity": 0.95,
        },
      });
      map.addLayer({
        id: "journey-line",
        type: "line",
        source: "journey",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["case", ["get", "selected"], "#2e6ea2", "#97b8ee"],
          "line-width": ["case", ["get", "selected"], 6, 4],
        },
      });
    }
    (map.getSource("journey") as GeoJSONSource).setData(data);
  }, [props.state.view, epoch]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const view = props.state.view;
    const list: { place: Place; kind: string; label: string }[] =
      props.places.map((place, i) => ({
        place,
        kind: "result",
        label: String(i + 1),
      }));
    if (view.kind === "explore" && view.place)
      list.push({ place: view.place, kind: "selected", label: "" });
    if (view.kind === "directions") {
      if (view.journey.from)
        list.push({ place: view.journey.from, kind: "origin", label: "A" });
      if (view.journey.to)
        list.push({ place: view.journey.to, kind: "selected", label: "B" });
    }
    const markers = list.map(({ place, kind, label }) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `map-marker ${kind}`;
      el.setAttribute("aria-label", place.name);
      el.title = place.name;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 32 39");
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute(
        "d",
        "M16 1C7.7 1 1 7.7 1 16c0 10.6 15 22 15 22s15-11.4 15-22C31 7.7 24.3 1 16 1Z",
      );
      path.setAttribute("fill", kind === "origin" ? "#53646e" : "#2e6ea2");
      path.setAttribute("stroke", "white");
      path.setAttribute("stroke-width", "2");
      svg.appendChild(path);
      const graphic = document.createElement("div");
      graphic.className = "marker-graphic";
      graphic.appendChild(svg);
      el.appendChild(graphic);
      const inner = document.createElement("span");
      inner.textContent = label || "•";
      graphic.appendChild(inner);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        latest.current.onPick(place);
      });
      return new Marker({ element: el, anchor: "bottom" })
        .setLngLat(place.coordinates)
        .addTo(map);
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [props.state.view, props.places]);
  const route =
    props.state.view.kind === "directions" &&
    props.state.view.journey.routes.status === "ready"
      ? props.state.view.journey.routes.data[props.state.view.journey.selected]
      : null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;
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
    if (command.type === "zoom-in") map.zoomIn();
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
      ) : status ? (
        <div className="map-loading" role="status">
          <LoaderCircle size={15} className="spin" />
          {status}
        </div>
      ) : null}
    </>
  );
}
