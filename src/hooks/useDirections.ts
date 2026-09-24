import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import { journeyKey, pointPlace } from "../lib/domain";
import type { Action, View } from "../lib/domain";
import { errorMessage, getRoutes } from "../lib/api";
import { shouldRefresh } from "../lib/live-location";
import type { LocationFix } from "../lib/live-location";
export function useDirections(
  view: View,
  dispatch: Dispatch<Action>,
  retry: number,
  position: LocationFix | null,
) {
  const journey = view.kind === "directions" ? view.journey : null;
  const key = journey && journeyKey(journey);
  const latest = useRef({ journey, position });
  latest.current = { journey, position };
  const from = journey?.from,
    to = journey?.to,
    mode = journey?.travelMode;
  useEffect(() => {
    if (!key || !from || !to || !mode) return;
    // Live refreshes commit their origin and route together, so no second fetch.
    const routes = latest.current.journey?.routes;
    if (routes?.status === "ready" && routes.key === key) return;
    const controller = new AbortController();
    dispatch({ type: "route-loading", key });
    getRoutes(from.coordinates, to.coordinates, mode, controller.signal)
      .then((routes) => {
        if (!controller.signal.aborted)
          dispatch({ type: "route-result", key, routes });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          dispatch({ type: "route-error", key, message: errorMessage(error) });
      });
    return () => controller.abort();
  }, [key, from, to, mode, dispatch, retry]);

  useEffect(() => {
    if (!key || from?.source !== "location" || !to || !mode) return;
    let lastAttempt = Date.now();
    let pending: AbortController | null = null;
    const tick = () => {
      const { position, journey } = latest.current;
      if (
        document.visibilityState !== "visible" ||
        pending ||
        !position ||
        journey?.routes.status !== "ready" ||
        !shouldRefresh(from.coordinates, position, lastAttempt)
      )
        return;
      const origin = {
        ...pointPlace(position.coordinates, from.name),
        source: "location" as const,
      };
      const controller = new AbortController();
      pending = controller;
      lastAttempt = Date.now();
      getRoutes(origin.coordinates, to.coordinates, mode, controller.signal)
        .then((routes) => {
          if (!controller.signal.aborted)
            dispatch({ type: "route-refresh", key, from: origin, routes });
        })
        // The existing route remains useful during temporary network failures.
        .catch(() => {})
        .finally(() => {
          if (pending === controller) pending = null;
        });
    };
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(timer);
      pending?.abort();
    };
  }, [key, from, to, mode, dispatch]);
}
