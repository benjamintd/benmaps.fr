import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Coffee,
  Map as MapIcon,
  ExternalLink,
  Info,
  Layers,
  Leaf,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  Minus,
  Satellite,
  Share2,
  ShieldCheck,
  TrafficCone,
  Trees,
  Utensils,
  X,
  Landmark,
} from "./components/Icons";
import { reducer, pointPlace } from "./lib/domain";
import type { Coordinates, Place, Resource, View } from "./lib/domain";
import { defaultCamera, readCamera, readState, writeState } from "./lib/url";
import { config } from "./lib/config";
import { categorySearch, errorMessage } from "./lib/api";
import { useDirections } from "./hooks/useDirections";
import { SearchBox } from "./components/SearchBox";
import { PlaceEnrichment } from "./components/PlaceEnrichment";
import { DirectionsPanel } from "./components/DirectionsPanel";
import type { MapCommand } from "./components/MapCanvas";
const MapCanvas = lazy(() => import("./components/MapCanvas"));
const categories = [
  { id: "restaurant", label: "Restaurants", icon: Utensils, color: "orange" },
  { id: "cafe", label: "Coffee", icon: Coffee, color: "brown" },
  { id: "park", label: "Parks", icon: Trees, color: "green" },
  { id: "museum", label: "Museums", icon: Landmark, color: "purple" },
];
function Brand() {
  return (
    <span className="brand">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="13" fill="currentColor" />
        <path
          d="M12 9v21h9a8 8 0 1 0-9-8"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span>
        benmaps<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
const noPlaces: Place[] = [];
export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    readState(new URL(window.location.href)),
  );
  const currentView = useRef(state.view);
  currentView.current = state.view;
  const [center, setCenter] = useState<Coordinates>(defaultCamera.center);
  const [orientation, setOrientation] = useState<{
    bearing: number;
    pitch: number;
  }>(() => readCamera(new URL(window.location.href)));
  const [command, setCommand] = useState<MapCommand | null>(null);
  const commandId = useRef(0);
  const [layersOpen, setLayersOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [nearby, setNearby] = useState<Resource<Place[]>>({ status: "idle" });
  const [categoryCenter, setCategoryCenter] = useState(center);
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [routeRetry, setRouteRetry] = useState(0);
  const [notice, setNotice] = useState("");
  const [locating, setLocating] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const about = useRef<HTMLDialogElement>(null);
  const shareDialog = useRef<HTMLDialogElement>(null);
  const layerPanel = useRef<HTMLDivElement>(null);
  useDirections(state.view, dispatch, routeRetry);
  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      writeState(new URL(window.location.href), state),
    );
  }, [state]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!layersOpen) return;
    function dismiss(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !layerPanel.current?.contains(event.target)
      )
        setLayersOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setLayersOpen(false);
    }
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [layersOpen]);
  useEffect(() => {
    if (!category) {
      setNearby({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    const key = `${category}:${categoryCenter}`;
    setNearby({ status: "loading", key });
    categorySearch(category, categoryCenter, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setNearby({ status: "ready", key, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setNearby({ status: "error", key, message: errorMessage(error) });
      });
    return () => controller.abort();
  }, [category, categoryCenter, categoryRetry]);
  function fly(coordinates: Coordinates, zoom?: number) {
    setCommand({ id: ++commandId.current, type: "fly", coordinates, zoom });
  }
  function select(place: Place) {
    dispatch({ type: "select-place", place });
    fly(place.coordinates);
  }
  function pick(place: Place) {
    if (state.view.kind === "directions") {
      dispatch({
        type: "endpoint",
        endpoint: state.view.journey.from ? "to" : "from",
        place,
      });
    } else select(place);
  }
  function chooseCategory(id: string) {
    dispatch({ type: "explore" });
    setCategory((old) => (old === id ? null : id));
    setCategoryCenter(center);
  }
  async function share() {
    const url = writeState(new URL(window.location.href), state).toString();
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Link copied.");
    } catch {
      setShareUrl(url);
      shareDialog.current?.showModal();
    }
  }
  function requestLocation(onLocated: (place: Place, requested: View) => void) {
    if (!navigator.geolocation) {
      setNotice(
        "Your browser doesn’t support location. Search for a starting point instead.",
      );
      return;
    }
    setLocating(true);
    const requestedView = currentView.current;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const coordinates: Coordinates = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        const place: Place = {
          ...pointPlace(coordinates, "Your location"),
          source: "location",
        };
        onLocated(place, requestedView);
        fly(coordinates, 15);
      },
      (error) => {
        setLocating(false);
        setNotice(
          error.code === 1
            ? "Location access was declined. You can search for a place or click the map."
            : "We couldn’t find your location. Please try again or choose a point on the map.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }
  function locate() {
    requestLocation((place, requested) => {
      if (currentView.current !== requested) return;
      if (requested.kind === "directions")
        dispatch({ type: "endpoint", endpoint: "from", place });
      else dispatch({ type: "select-place", place });
    });
  }
  function useLocationEndpoint(endpoint: "from" | "to") {
    requestLocation((place) => dispatch({ type: "endpoint", endpoint, place }));
  }
  const place = state.view.kind === "explore" ? state.view.place : null;
  const categoryLabel = categories.find((c) => c.id === category)?.label;
  const places =
    nearby.status === "ready" && state.view.kind === "explore"
      ? nearby.data
      : noPlaces;
  return (
    <main
      className={`app ${state.view.kind === "directions" ? "routing" : ""} ${place || category ? "has-detail" : ""}`}
    >
      <Suspense
        fallback={
          <div className="map-loading">
            <LoaderCircle size={16} className="spin" />
            Loading map…
          </div>
        }
      >
        <MapCanvas
          state={state}
          places={places}
          command={command}
          onPick={pick}
          onSelectRoute={(index) => dispatch({ type: "route-select", index })}
          onDragEndpoint={(endpoint, coordinates) =>
            dispatch({
              type: "endpoint",
              endpoint,
              place: pointPlace(coordinates),
            })
          }
          onCenter={setCenter}
          onOrientation={setOrientation}
          onNotice={setNotice}
        />
      </Suspense>
      {state.view.kind === "explore" ? (
        <>
          <div className="explore-panel">
            <div className="search-bar">
              <SearchBox center={center} onSelect={select} />
              <span className="search-divider" />
              <button
                className="icon-button search-directions"
                aria-label="Plan a route"
                onClick={() => {
                  setCategory(null);
                  dispatch({ type: "directions" });
                }}
              >
                <Navigation size={22} />
              </button>
            </div>
            {place ? (
              <section className="panel place-panel" aria-label="Place details">
                <div className="place-body">
                  <button
                    className="icon-button place-close"
                    aria-label="Close place"
                    onClick={() => dispatch({ type: "explore" })}
                  >
                    <X size={19} />
                  </button>
                  <span className="eyebrow">
                    {place.category?.replaceAll("_", " ") ||
                      (place.source === "map" || place.source === "link"
                        ? "On the map"
                        : "Place")}
                  </span>
                  <h1>{place.name}</h1>
                  <p>{place.address}</p>
                  <div className="place-actions">
                    <button
                      className="primary-button"
                      onClick={() => {
                        setCategory(null);
                        dispatch({ type: "directions", to: place });
                      }}
                    >
                      <Navigation size={18} />
                      Directions
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => void share()}
                    >
                      <Share2 size={17} />
                      Share
                    </button>
                  </div>
                  <PlaceEnrichment key={place.id} place={place} />
                  <div className="place-meta">
                    <MapPin size={18} />
                    <span>
                      {place.coordinates[1].toFixed(5)},{" "}
                      {place.coordinates[0].toFixed(5)}
                      <small>Latitude, longitude</small>
                    </span>
                  </div>
                  <button
                    className="start-here"
                    onClick={() => {
                      setCategory(null);
                      dispatch({ type: "directions", from: place });
                    }}
                  >
                    <span>Directions from here</span>
                    <Navigation size={22} />
                  </button>
                </div>
              </section>
            ) : category ? (
              <section
                className="panel nearby-panel"
                aria-label="Nearby places"
              >
                <header className="panel-header">
                  <div>
                    <span className="eyebrow">Around this area</span>
                    <h1>{categoryLabel}</h1>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Close nearby search"
                    onClick={() => setCategory(null)}
                  >
                    <X size={20} />
                  </button>
                </header>
                <button
                  className="search-area"
                  onClick={() => {
                    setCategoryCenter(center);
                    setCategoryRetry((n) => n + 1);
                  }}
                >
                  <SearchAreaIcon />
                  Search this area
                </button>
                {nearby.status === "loading" && (
                  <p className="search-status">
                    <LoaderCircle className="spin" size={17} />
                    Finding nearby places…
                  </p>
                )}
                {nearby.status === "error" && (
                  <p className="search-status error" role="alert">
                    {nearby.message}
                  </p>
                )}
                {nearby.status === "ready" && (
                  <>
                    {!nearby.data.length && (
                      <p className="search-status">
                        No places found here. Move the map and try another area.
                      </p>
                    )}
                    <div className="nearby-list">
                      {nearby.data.map((p, i) => (
                        <button
                          className="nearby-place"
                          key={p.id}
                          onClick={() => select(p)}
                        >
                          <span className="nearby-number">{i + 1}</span>
                          <span>
                            <strong>{p.name}</strong>
                            <small>{p.address}</small>
                            <em>{p.category?.replaceAll("_", " ")}</em>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      ))}
                    </div>
                    <p className="search-credit">Search results © Mapbox</p>
                  </>
                )}
              </section>
            ) : null}
          </div>
          <div
            className="category-bar"
            role="group"
            aria-label="Discover nearby"
          >
            {categories.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                className={`${category === id ? "active" : ""} ${color}`}
                aria-pressed={category === id}
                onClick={() => chooseCategory(id)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <DirectionsPanel
          journey={state.view.journey}
          center={center}
          dispatch={dispatch}
          locate={locate}
          useLocation={useLocationEndpoint}
          locating={locating}
          fly={fly}
          retry={() => setRouteRetry((n) => n + 1)}
        />
      )}
      <div className="map-controls">
        <button
          className="map-control compass"
          aria-label="Reset bearing and tilt"
          title="Reset bearing and tilt"
          onClick={() => setCommand({ id: ++commandId.current, type: "north" })}
        >
          <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
            style={{
              transform: `rotateX(${orientation.pitch}deg) rotateZ(${-orientation.bearing}deg)`,
            }}
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.25"
            />
            <path d="M16 4 21 16 16 14 11 16Z" fill="#ce574c" />
            <path d="M16 28 11 16 16 18 21 16Z" fill="currentColor" />
            <circle cx="16" cy="16" r="1.5" fill="currentColor" />
          </svg>
        </button>
        <button
          className="map-control"
          aria-label="My location"
          title="My location"
          disabled={locating}
          onClick={locate}
        >
          {locating ? (
            <LoaderCircle className="spin" size={21} />
          ) : (
            <LocateFixed size={21} />
          )}
        </button>
        <div className="zoom-controls">
          <button
            className="map-control"
            aria-label="Zoom in"
            onClick={() =>
              setCommand({ id: ++commandId.current, type: "zoom-in" })
            }
          >
            <Plus size={22} />
          </button>
          <button
            className="map-control"
            aria-label="Zoom out"
            onClick={() =>
              setCommand({ id: ++commandId.current, type: "zoom-out" })
            }
          >
            <Minus size={22} />
          </button>
        </div>
      </div>
      <div className="layers-anchor" ref={layerPanel}>
        {layersOpen && (
          <section className="layers-panel" aria-label="Map appearance">
            <header>
              <h2>Map type</h2>
              <button
                className="icon-button small"
                aria-label="Close map appearance"
                onClick={() => setLayersOpen(false)}
              >
                <X size={17} />
              </button>
            </header>
            <div className="basemap-options">
              <button
                aria-pressed={state.settings.basemap === "clair"}
                className={state.settings.basemap === "clair" ? "active" : ""}
                onClick={() =>
                  dispatch({ type: "settings", settings: { basemap: "clair" } })
                }
              >
                <span className="basemap-thumbnail clair-thumbnail">
                  <MapIcon size={29} />
                </span>
                <span>
                  Clair{" "}
                  {state.settings.basemap === "clair" && <Check size={15} />}
                </span>
              </button>
              <button
                disabled={!config.mapboxToken}
                aria-pressed={state.settings.basemap === "satellite"}
                className={
                  state.settings.basemap === "satellite" ? "active" : ""
                }
                onClick={() =>
                  dispatch({
                    type: "settings",
                    settings: { basemap: "satellite" },
                  })
                }
              >
                <span className="basemap-thumbnail satellite-thumbnail">
                  <Satellite size={29} />
                </span>
                <span>
                  Satellite{" "}
                  {state.settings.basemap === "satellite" && (
                    <Check size={15} />
                  )}
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
                checked={state.settings.traffic}
                disabled={!config.mapboxToken}
                onChange={(e) =>
                  dispatch({
                    type: "settings",
                    settings: { traffic: e.target.checked },
                  })
                }
              />
            </label>
            <label className="setting-row">
              <Layers size={19} />
              <span>3D</span>
              <input
                type="checkbox"
                role="switch"
                checked={state.settings.threeDimensional}
                onChange={(e) =>
                  dispatch({
                    type: "settings",
                    settings: { threeDimensional: e.target.checked },
                  })
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
          className={`layers-toggle ${layersOpen ? "active" : ""}`}
          aria-expanded={layersOpen}
          onClick={() => setLayersOpen((v) => !v)}
        >
          <span className={`layer-mini ${state.settings.basemap}`}>
            <Layers size={20} />
          </span>
          <span>Layers</span>
        </button>
        <button
          className="map-control about-toggle"
          aria-label="About Benmaps"
          aria-haspopup="dialog"
          title="About Benmaps"
          onClick={() => about.current?.showModal()}
        >
          <Info size={20} />
        </button>
      </div>
      {state.settings.traffic && (
        <div className="traffic-legend">
          <span>Traffic</span>
          <i className="traffic-colors" />
          <small>Fast → Slow</small>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button
            className="icon-button small"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <dialog ref={about} className="about-dialog" aria-label="About Benmaps">
        <button
          className="icon-button dialog-close"
          aria-label="Close about"
          onClick={() => about.current?.close()}
        >
          <X size={21} />
        </button>
        <Brand />
        <p>
          Benmaps uses Clair cartography, Protomaps data, and MapLibre. Search
          and directions are provided by Mapbox.
        </p>
        <div className="about-item">
          <Leaf size={22} />
          <span>
            <strong>Made with Clair</strong>
            <small>
              <a
                href="https://clair.benmaps.fr"
                target="_blank"
                rel="noreferrer"
              >
                Clair
              </a>{" "}
              is a carefully designed basemap, crafted to be used with
              Protomaps.
            </small>
          </span>
        </div>
        <div className="about-item">
          <ShieldCheck size={22} />
          <span>
            <strong>Privacy</strong>
            <small>
              No analytics, accounts, cookies, or location history. Map tiles,
              searches, and route requests go anonymously to their respective
              providers. Your location is requested only when you ask and never
              shared with us.
            </small>
          </span>
        </div>
        <a
          className="secondary-button"
          href="https://clair.benmaps.fr"
          target="_blank"
          rel="noreferrer"
        >
          Clair website
          <ExternalLink size={16} />
        </a>
        <p className="about-fine">
          Clair ·{" "}
          <a href="/clair/LICENSE" target="_blank">
            Clair license
          </a>{" "}
          ·{" "}
          <a href="/clair/THIRD_PARTY.md" target="_blank">
            Map credits
          </a>
        </p>
      </dialog>
      <dialog ref={shareDialog} className="share-dialog">
        <button
          className="icon-button dialog-close"
          aria-label="Close share"
          onClick={() => shareDialog.current?.close()}
        >
          <X size={21} />
        </button>
        <h2>Share this view</h2>
        <p>Copy the link below.</p>
        <input
          aria-label="Share link"
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
        />
      </dialog>
    </main>
  );
}
function SearchAreaIcon() {
  return <LocateFixed size={16} />;
}
