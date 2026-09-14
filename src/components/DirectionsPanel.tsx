import type { Dispatch } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  Bike,
  Car,
  Footprints,
  LocateFixed,
  LoaderCircle,
  MapPin,
  X,
} from "./Icons";
import { SearchBox } from "./SearchBox";
import { RouteElevation } from "./RouteElevation";
import { distance, duration } from "../lib/domain";
import type {
  Action,
  Coordinates,
  Journey,
  Place,
  TravelMode,
} from "../lib/domain";
const modes: { value: TravelMode; label: string; icon: typeof Car }[] = [
  { value: "driving-traffic", label: "Drive", icon: Car },
  { value: "walking", label: "Walk", icon: Footprints },
  { value: "cycling", label: "Cycle", icon: Bike },
];
type Props = {
  journey: Journey;
  center: Coordinates;
  dispatch: Dispatch<Action>;
  locate: () => void;
  useLocation: (endpoint: "from" | "to") => void;
  locating: boolean;
  fly: (coordinates: Coordinates) => void;
  retry: () => void;
  searches: { from: string; to: string };
  onSearchChange: (endpoint: "from" | "to", value: string) => void;
};
export function DirectionsPanel({
  journey,
  center,
  dispatch,
  locate,
  useLocation,
  locating,
  fly,
  retry,
  searches,
  onSearchChange,
}: Props) {
  const selected =
    journey.routes.status === "ready"
      ? journey.routes.data[journey.selected]
      : null;
  const endpoint = (key: "from" | "to", place: Place | null) => (
    <div className="endpoint-row">
      <span className={`endpoint-dot ${key}`}>
        {key === "from" ? "A" : "B"}
      </span>
      {place ? (
        <div className="chosen-endpoint">
          <button onClick={() => fly(place.coordinates)} title={place.address}>
            {place.name}
          </button>
          <button
            className="icon-button small"
            aria-label={`Clear ${key === "from" ? "starting point" : "destination"}`}
            onClick={() =>
              dispatch({ type: "endpoint", endpoint: key, place: null })
            }
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <SearchBox
          key={key}
          compact
          value={searches[key]}
          onValueChange={(value) => onSearchChange(key, value)}
          center={center}
          onSelect={(place) =>
            dispatch({ type: "endpoint", endpoint: key, place })
          }
          placeholder={
            key === "from" ? "Choose starting point" : "Choose destination"
          }
          label={key === "from" ? "Starting point" : "Destination"}
          onUseLocation={() => useLocation(key)}
          locating={locating}
        />
      )}
    </div>
  );
  return (
    <section className="panel directions-panel" aria-label="Route planner">
      <header className="panel-header">
        <h1>Directions</h1>
        <button
          className="icon-button"
          aria-label="Close directions"
          onClick={() => dispatch({ type: "explore" })}
        >
          <X size={21} />
        </button>
      </header>
      <div className="travel-modes" role="group" aria-label="Travel mode">
        {modes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            aria-pressed={journey.travelMode === value}
            className={journey.travelMode === value ? "active" : ""}
            onClick={() => dispatch({ type: "travel-mode", mode: value })}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="endpoints">
        <div className="endpoint-fields">
          {endpoint("from", journey.from)}
          {endpoint("to", journey.to)}
        </div>
        <button
          className="icon-button swap"
          aria-label="Swap starting point and destination"
          onClick={() => dispatch({ type: "swap" })}
        >
          <ArrowDownUp size={20} />
        </button>
      </div>
      {!journey.from && (
        <button className="location-link" onClick={locate} disabled={locating}>
          {locating ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <LocateFixed size={17} />
          )}
          Use my location
        </button>
      )}
      <div className="route-content" aria-live="polite">
        {journey.routes.status === "loading" && (
          <div className="route-empty">
            <LoaderCircle className="spin" size={28} />
            <h2>Finding a route…</h2>
          </div>
        )}
        {journey.routes.status === "error" && (
          <div className="route-empty error">
            <MapPin size={28} />
            <h2>Route unavailable</h2>
            <p>{journey.routes.message}</p>
            <button className="secondary-button" onClick={retry}>
              Try again
            </button>
          </div>
        )}
        {journey.routes.status === "ready" && (
          <>
            <div className="route-list">
              {journey.routes.data.map((route, i) => (
                <button
                  className={`route-option ${i === journey.selected ? "active" : ""}`}
                  aria-pressed={i === journey.selected}
                  key={route.id}
                  onClick={() => dispatch({ type: "route-select", index: i })}
                >
                  <span className="route-option-top">
                    <strong>{duration(route.duration)}</strong>
                    <span>{distance(route.distance)}</span>
                  </span>
                  <span className="route-summary">via {route.summary}</span>
                  <span className="route-caption">
                    {i === 0 ? "Recommended" : "Alternative route"}
                    {journey.travelMode === "driving-traffic"
                      ? " · Current traffic"
                      : ""}
                  </span>
                </button>
              ))}
            </div>
            {selected && journey.travelMode === "cycling" && (
              <RouteElevation key={selected.id} route={selected} />
            )}
            {selected && (
              <div className="steps">
                <h2>
                  Step by step <span>{selected.steps.length} steps</span>
                </h2>
                <ol>
                  {selected.steps.map((step, i) => (
                    <li key={i}>
                      <button onClick={() => fly(step.coordinates)}>
                        <span className="step-symbol">
                          {i === selected.steps.length - 1 ? (
                            <MapPin size={18} />
                          ) : (
                            <ArrowRight
                              size={18}
                              style={{
                                transform: step.modifier?.includes("left")
                                  ? "rotate(180deg)"
                                  : step.modifier?.includes("right")
                                    ? undefined
                                    : "rotate(-90deg)",
                              }}
                            />
                          )}
                        </span>
                        <span>
                          {step.instruction}
                          <small>
                            {step.distance > 0
                              ? distance(step.distance)
                              : "You’ve arrived"}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <p className="route-disclaimer">
              Directions by Mapbox · Follow local signs and conditions.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
