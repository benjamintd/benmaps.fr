import { useEffect } from "react";
import type { Dispatch } from "react";
import { journeyKey } from "../lib/domain";
import type { Action, View } from "../lib/domain";
import { errorMessage, getRoutes } from "../lib/api";
export function useDirections(
  view: View,
  dispatch: Dispatch<Action>,
  retry: number,
) {
  const journey = view.kind === "directions" ? view.journey : null;
  const key = journey && journeyKey(journey);
  const from = journey?.from,
    to = journey?.to,
    mode = journey?.travelMode;
  useEffect(() => {
    if (!key || !from || !to || !mode) return;
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
}
