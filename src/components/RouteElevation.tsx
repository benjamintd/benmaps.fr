import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Spinner } from "./Icons";
import { getElevations } from "../lib/api";
import { config } from "../lib/config";
import { distance } from "../lib/domain";
import type { Coordinates, Route } from "../lib/domain";
import { sampleLine, elevationStats } from "../lib/elevation";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; elevations: (number | null)[] };

export function RouteElevation({ route }: { route: Route }) {
  const points = useMemo(
    () => sampleLine(route.geometry.coordinates as Coordinates[]),
    [route],
  );
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    if (!config.mapboxToken || points.length < 2) {
      setState({ status: "error" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    getElevations(points, controller.signal)
      .then((raw) => {
        if (controller.signal.aborted) return;
        setState(
          elevationStats(raw)
            ? { status: "ready", elevations: raw }
            : { status: "error" },
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [points, retry]);

  if (state.status === "error")
    return (
      <div className="elevation elevation-loading">
        <span>Elevation unavailable</span>
        <button className="text-button" onClick={() => setRetry((n) => n + 1)}>
          Retry
        </button>
      </div>
    );
  if (state.status === "loading")
    return (
      <div className="elevation elevation-loading">
        <Spinner className="spin" size={16} />
        Reading elevation…
      </div>
    );

  const { elevations } = state;
  const stats = elevationStats(elevations)!;
  const { ascent: ups, descent: downs, min, max, partial } = stats;
  // Keep small changes in level routes from looking like steep hills.
  const range = Math.max(20, max - min);
  const floor = (min + max - range) / 2;
  const W = 100,
    H = 40;
  const x = (i: number) => (i / (elevations.length - 1)) * W;
  const y = (e: number) => H - 4 - ((e - floor) / range) * (H - 8);
  const segments: string[][] = [];
  elevations.forEach((e, i) => {
    if (e === null) return;
    if (i === 0 || elevations[i - 1] === null) segments.push([]);
    segments[segments.length - 1].push(`${x(i)},${y(e)}`);
  });

  return (
    <div className="elevation" aria-label="Cycling elevation">
      <div className="elevation-summary">
        <span aria-label={`Estimated ascent: ${Math.round(ups)} metres`}>
          <ArrowUp size={14} />
          {Math.round(ups)} m
        </span>
        <span aria-label={`Estimated descent: ${Math.round(downs)} metres`}>
          <ArrowDown size={14} />
          {Math.round(downs)} m
        </span>
        {partial && <small>Partial profile</small>}
      </div>
      <svg
        className="elevation-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-label={`Elevation profile: ${Math.round(ups)} metres up, ${Math.round(downs)} metres down`}
      >
        {segments.map((points, i) => (
          <path
            key={i}
            d={`M${points.join(" L")}`}
            className="elevation-stroke"
          />
        ))}
      </svg>
      <div className="elevation-axis">
        <span>0 km</span>
        <span>{distance(route.distance)}</span>
      </div>
    </div>
  );
}
