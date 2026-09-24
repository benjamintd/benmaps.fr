import { MapDrawer } from "./components/MapDrawer";
import { lazy, Suspense, useEffect, useReducer, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Coffee,
  Spinner,
  Crosshair,
  MapPin,
  Directions,
  Plus,
  Minus,
  Share,
  Trees,
  Utensils,
  X,
  Landmark,
} from "./components/Icons";
import { reducer, pointPlace } from "./lib/domain";
import type { AppState, Coordinates, Place, Resource } from "./lib/domain";
import { categories } from "./lib/categories";
import type { CategoryId } from "./lib/categories";
import { cameraOrDefault, readState, writeState } from "./lib/url";
import { categorySearch, errorMessage } from "./lib/api";
import { useLocation } from "./hooks/useLocation";
import { useDirections } from "./hooks/useDirections";
import type { LocationFix } from "./lib/live-location";
import { SearchBox } from "./components/SearchBox";
import { PlaceEnrichment } from "./components/PlaceEnrichment";
import { DirectionsPanel } from "./components/DirectionsPanel";
import type { MapCommand } from "./components/MapCanvas";
import { AboutDialog } from "./components/AboutDialog";
import { MapAppearance } from "./components/MapAppearance";
const MapCanvas = lazy(() => import("./components/MapCanvas"));
// Typed against CategoryId so adding a category cannot forget its icon.
const categoryIcons: Record<CategoryId, typeof Utensils> = {
  restaurant: Utensils,
  cafe: Coffee,
  park: Trees,
  museum: Landmark,
};
const noPlaces: Place[] = [];
export default function App() {
  const [initialUrl] = useState(() => new URL(window.location.href));
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    readState(initialUrl),
  );
  const [center, setCenter] = useState<Coordinates>(
    () => cameraOrDefault(initialUrl).center,
  );
  const [position, setPosition] = useState<LocationFix | null>(null);
  const userLocation = position?.coordinates ?? null;
  const [directionsExpanded, setDirectionsExpanded] = useState(false);
  const searchCenter = userLocation ?? center;
  const [orientation, setOrientation] = useState<{
    bearing: number;
    pitch: number;
  }>(() => cameraOrDefault(initialUrl));
  const [command, setCommand] = useState<MapCommand | null>(null);
  const commandId = useRef(0);
  const [nearby, setNearby] = useState<Resource<Place[]>>({ status: "idle" });
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [routeRetry, setRouteRetry] = useState(0);
  const [notice, setNotice] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const shareDialog = useRef<HTMLDialogElement>(null);
  const { category, categoryCenter, search } = state.ui;
  useDirections(state.view, dispatch, routeRetry, position);
  const setUi = (ui: Partial<AppState["ui"]>) => dispatch({ type: "ui", ui });
  useEffect(() => {
    function restore() {
      const url = new URL(window.location.href),
        camera = cameraOrDefault(url);
      dispatch({ type: "restore", state: readState(url) });
      setCenter(camera.center);
      setCommand({ id: ++commandId.current, type: "camera", camera });
    }
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
    };
  }, []);
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
  function chooseCategory(id: CategoryId) {
    dispatch({ type: "choose-category", id, center: searchCenter });
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
  const { locating, locate } = useLocation({
    view: state.view,
    onNotice: setNotice,
    onPosition: setPosition,
    onLocated: (place, endpoint) => {
      if (category) setUi({ categoryCenter: place.coordinates });
      if (endpoint) dispatch({ type: "endpoint", endpoint, place });
      else dispatch({ type: "select-place", place });
      fly(place.coordinates, 15);
    },
  });
  const place = state.view.kind === "explore" ? state.view.place : null;
  const routeReady =
    state.view.kind === "directions" &&
    state.view.journey.routes.status === "ready";
  const sheetExpanded = !routeReady || directionsExpanded;
  useEffect(() => {
    setDirectionsExpanded(false);
  }, [routeReady]);
  const categoryLabel = categories.find((c) => c.id === category)?.label;
  const places =
    nearby.status === "ready" && state.view.kind === "explore"
      ? nearby.data
      : noPlaces;
  return (
    <main
      className={`app ${state.view.kind === "directions" ? `routing ${sheetExpanded ? "directions-expanded" : "directions-collapsed"}` : ""} ${place || category ? "has-detail" : ""}`}
    >
      <Suspense fallback={null}>
        <MapCanvas
          state={state}
          places={places}
          userLocation={userLocation}
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
              <SearchBox
                center={searchCenter}
                onSelect={select}
                value={search}
                onValueChange={(value) => setUi({ search: value })}
              />
              <span className="search-divider" />
              <button
                className="icon-button search-directions"
                aria-label="Plan a route"
                onClick={() => dispatch({ type: "directions" })}
              >
                <Directions size={22} />
              </button>
            </div>
            {place ? (
              <MapDrawer
                key={place.id}
                className="panel place-panel"
                label="Place details"
                onClose={() => dispatch({ type: "explore" })}
              >
                {(close) => (
                  <>
                    <div className="place-body">
                      <button
                        className="icon-button place-close"
                        aria-label="Close place"
                        onClick={close}
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
                          onClick={() =>
                            dispatch({ type: "directions", to: place })
                          }
                        >
                          <Directions size={18} />
                          Directions
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => void share()}
                        >
                          <Share size={17} />
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
                    </div>
                  </>
                )}
              </MapDrawer>
            ) : category ? (
              <MapDrawer
                key={category}
                className="panel nearby-panel"
                label="Nearby places"
                onClose={() => setUi({ category: null })}
              >
                {(close) => (
                  <>
                    <header className="panel-header">
                      <div>
                        <span className="eyebrow">
                          {userLocation ? "Around you" : "Around this area"}
                        </span>
                        <h1>{categoryLabel}</h1>
                      </div>
                      <button
                        className="icon-button"
                        aria-label="Close nearby search"
                        onClick={close}
                      >
                        <X size={20} />
                      </button>
                    </header>
                    <button
                      className="search-area"
                      onClick={() => {
                        setUi({ categoryCenter: searchCenter });
                        setCategoryRetry((n) => n + 1);
                      }}
                    >
                      <Crosshair size={16} />
                      {userLocation ? "Search near me" : "Search this area"}
                    </button>
                    {nearby.status === "loading" && (
                      <p className="search-status">
                        <Spinner className="spin" size={17} />
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
                            {userLocation
                              ? "No places found near you. Try another category."
                              : "No places found here. Move the map and try another area."}
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
                  </>
                )}
              </MapDrawer>
            ) : null}
          </div>
          <div
            className="category-bar"
            role="group"
            aria-label="Discover nearby"
          >
            {categories.map(({ id, label, color }) => {
              const Icon = categoryIcons[id];
              return (
                <button
                  key={id}
                  className={`${category === id ? "active" : ""} ${color}`}
                  aria-pressed={category === id}
                  onClick={() => chooseCategory(id)}
                >
                  <Icon size={16} />
                  {label}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <DirectionsPanel
          expanded={sheetExpanded}
          onExpandedChange={setDirectionsExpanded}
          journey={state.view.journey}
          center={searchCenter}
          dispatch={dispatch}
          locate={locate}
          locating={locating}
          fly={fly}
          retry={() => setRouteRetry((n) => n + 1)}
          searches={{ from: state.ui.fromSearch, to: state.ui.toSearch }}
          onSearchChange={(endpoint, value) =>
            setUi(
              endpoint === "from" ? { fromSearch: value } : { toSearch: value },
            )
          }
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
          aria-label={
            userLocation && state.view.kind === "directions"
              ? "Recenter"
              : "My location"
          }
          title={
            userLocation && state.view.kind === "directions"
              ? "Recenter"
              : "My location"
          }
          disabled={locating}
          onClick={() =>
            userLocation && state.view.kind === "directions"
              ? setCommand({
                  id: ++commandId.current,
                  type: "locate",
                  coordinates: userLocation,
                })
              : locate()
          }
        >
          {locating ? (
            <Spinner className="spin" size={21} />
          ) : (
            <Crosshair size={21} />
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
      <MapAppearance
        settings={state.settings}
        open={state.ui.layersOpen}
        onOpenChange={(layersOpen) => setUi({ layersOpen })}
        onSettingsChange={(settings) =>
          dispatch({ type: "settings", settings })
        }
        onAbout={() => setUi({ aboutOpen: true })}
      />
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
      <AboutDialog
        open={state.ui.aboutOpen}
        onClose={() => setUi({ aboutOpen: false })}
      />
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
