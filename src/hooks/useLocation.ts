import { useEffect, useRef, useState } from "react";
import { pointPlace } from "../lib/domain";
import type { Place, View } from "../lib/domain";
import { reliableFix } from "../lib/live-location";
import type { LocationFix } from "../lib/live-location";

type Endpoint = "from" | "to";
type Options = {
  view: View;
  onLocated: (place: Place, endpoint?: Endpoint) => void;
  onNotice: (message: string) => void;
  onPosition: (fix: LocationFix) => void;
};

// Route loading/selection can change while locating; only the user's intended
// place or journey should invalidate the request.
function contextKey(view: View) {
  const placeKey = (place: Place | null) =>
    place && [place.id, ...place.coordinates];
  return JSON.stringify(
    view.kind === "explore"
      ? [view.kind, placeKey(view.place)]
      : [
          view.kind,
          placeKey(view.journey.from),
          placeKey(view.journey.to),
          view.journey.travelMode,
        ],
  );
}

export function useLocation(options: Options) {
  const [locating, setLocating] = useState(false);
  const [watching, setWatching] = useState(false);
  const generation = useRef(0);
  const latest = useRef(options);
  latest.current = options;
  const context = contextKey(options.view);
  useEffect(() => {
    setLocating(false);
    return () => {
      // getCurrentPosition has no cancellation API. Retire its callbacks by
      // bumping the live counter -- reading it at cleanup time is the point.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ++generation.current;
    };
  }, [context]);

  useEffect(() => {
    if (!watching || !navigator.geolocation) return;
    let watch: number | undefined;
    let generation = 0;
    function visibility() {
      const run = ++generation;
      if (watch !== undefined) navigator.geolocation.clearWatch(watch);
      watch = undefined;
      if (document.visibilityState !== "visible") return;
      watch = navigator.geolocation.watchPosition(
        ({ coords, timestamp }) => {
          if (run !== generation) return;
          const fix: LocationFix = {
            coordinates: [coords.longitude, coords.latitude],
            accuracy: coords.accuracy,
            timestamp,
          };
          if (reliableFix(fix)) latest.current.onPosition(fix);
        },
        (error) => {
          if (run === generation && error.code === 1) setWatching(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );
    }
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      ++generation;
      if (watch !== undefined) navigator.geolocation.clearWatch(watch);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [watching]);

  function locate(endpoint?: Endpoint) {
    if (!navigator.geolocation) {
      latest.current.onNotice(
        "Your browser doesn’t support location. Search for a starting point instead.",
      );
      return;
    }
    const run = ++generation.current;
    const requestedContext = contextKey(latest.current.view);
    const target =
      endpoint ??
      (latest.current.view.kind === "directions" ? "from" : undefined);
    const isCurrent = () =>
      run === generation.current &&
      requestedContext === contextKey(latest.current.view);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => {
        if (!isCurrent()) return;
        setLocating(false);
        latest.current.onPosition({
          coordinates: [coords.longitude, coords.latitude],
          accuracy: coords.accuracy,
          timestamp,
        });
        setWatching(true);
        latest.current.onLocated(
          {
            ...pointPlace([coords.longitude, coords.latitude], "Your location"),
            source: "location",
          },
          target,
        );
      },
      (error) => {
        if (!isCurrent()) return;
        setLocating(false);
        latest.current.onNotice(
          error.code === 1
            ? "Location access was declined. You can search for a place or click the map."
            : "We couldn’t find your location. Please try again or choose a point on the map.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 },
    );
  }
  const viewKind = options.view.kind;
  useEffect(() => {
    const view = latest.current.view;
    if (
      viewKind === "directions" &&
      view.kind === "directions" &&
      !view.journey.from
    )
      locate("from");
    // Only entering directions chooses a default. Clearing the field afterward
    // must leave it empty for address entry, and route refreshes must not locate.
  }, [viewKind]);
  return { locating, locate };
}
