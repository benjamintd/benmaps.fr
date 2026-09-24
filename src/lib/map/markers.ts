import { MapMouseEvent, MapTouchEvent, Marker } from "maplibre-gl";
import type { Map } from "maplibre-gl";
import type { Coordinates, Place, View } from "../domain";

type Callbacks = {
  onPick: (place: Place) => void;
  onDragEndpoint: (endpoint: "from" | "to", coordinates: Coordinates) => void;
};

/** Keep the user's position independent of selected places and route markers. */
export function addUserLocationMarker(map: Map, coordinates: Coordinates) {
  const el = document.createElement("div");
  el.className = "user-location-marker";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", "Your location");
  const marker = new Marker({ element: el, anchor: "center" })
    .setLngLat(coordinates)
    .addTo(map);
  return () => {
    marker.remove();
  };
}

/** Owns marker DOM, gestures and document listeners until the returned cleanup. */
export function addPlaceMarkers(
  map: Map,
  view: View,
  places: Place[],
  callbacks: Callbacks,
) {
  const selectedPlace = view.kind === "explore" ? view.place : null;
  const from = view.kind === "directions" ? view.journey.from : null;
  const to = view.kind === "directions" ? view.journey.to : null;
  const list: {
    place: Place;
    kind: string;
    label: string;
    endpoint?: "from" | "to";
  }[] = places.map((place, i) => ({
    place,
    kind: "result",
    label: String(i + 1),
  }));
  if (selectedPlace && selectedPlace.source !== "location")
    list.push({ place: selectedPlace, kind: "selected", label: "" });
  if (view.kind === "directions") {
    if (from && from.source !== "location")
      list.push({
        place: from,
        kind: "origin",
        label: "",
        endpoint: "from",
      });
    if (to)
      list.push({
        place: to,
        kind: "selected",
        label: "",
        endpoint: "to",
      });
  }
  const cleanups: (() => void)[] = [];
  const markers = list.map(({ place, kind, label, endpoint }) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `map-marker ${kind}${endpoint ? " draggable" : ""}`;
    el.setAttribute(
      "aria-label",
      endpoint
        ? `${endpoint === "from" ? "Starting point" : "Destination"}: ${place.name}`
        : place.name,
    );
    el.title = endpoint ? `${place.name} — drag to move` : place.name;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 32 39");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
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
    if (kind !== "origin") graphic.appendChild(svg);
    el.appendChild(graphic);
    const inner = document.createElement("span");
    inner.textContent = label || "•";
    if (kind !== "origin") graphic.appendChild(inner);
    let dragged = false;
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      // A drag ends with a synthetic click; ignore it so we don't re-pick.
      if (dragged) {
        dragged = false;
        return;
      }
      if (!endpoint) callbacks.onPick(place);
    });
    const marker = new Marker({
      element: el,
      anchor: kind === "origin" ? "center" : "bottom",
      draggable: Boolean(endpoint),
    })
      .setLngLat(place.coordinates)
      .addTo(map);
    if (endpoint) {
      // MapLibre listens for release on its canvas. Controls and panels are
      // siblings of that canvas, so forward outside releases to finish the drag.
      const finishOutsideMap = (event: MouseEvent | TouchEvent) => {
        if (
          !el.classList.contains("dragging") ||
          (event.target instanceof Node &&
            map.getContainer().contains(event.target))
        )
          return;
        if (event.type === "mouseup")
          map.fire(new MapMouseEvent("mouseup", map, event as MouseEvent));
        else map.fire(new MapTouchEvent("touchend", map, event as TouchEvent));
      };
      document.addEventListener("mouseup", finishOutsideMap, true);
      document.addEventListener("touchend", finishOutsideMap, true);
      cleanups.push(() => {
        document.removeEventListener("mouseup", finishOutsideMap, true);
        document.removeEventListener("touchend", finishOutsideMap, true);
      });
      marker.on("dragstart", () => {
        dragged = true;
        el.classList.add("dragging");
      });
      marker.on("dragend", () => {
        el.classList.remove("dragging");
        const { lng, lat } = marker.getLngLat();
        callbacks.onDragEndpoint(endpoint, [lng, lat]);
      });
    }
    return marker;
  });
  return () => {
    cleanups.forEach((cleanup) => cleanup());
    markers.forEach((marker) => marker.remove());
  };
}
