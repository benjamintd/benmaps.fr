import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, LoaderCircle } from "./Icons";
import { getElevations } from "../lib/api";
import { config } from "../lib/config";
import type { Coordinates, Route } from "../lib/domain";

function haversine(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Evenly-spaced sample points along the route (roughly every 500 m, capped).
function sampleLine(coords: Coordinates[]): Coordinates[] {
  if (coords.length < 2) return coords;
  const cumulative = [0];
  for (let i = 1; i < coords.length; i++)
    cumulative.push(cumulative[i - 1] + haversine(coords[i - 1], coords[i]));
  const total = cumulative[cumulative.length - 1];
  if (total === 0) return [coords[0]];
  const count = Math.min(40, Math.max(2, Math.round(total / 500)));
  const samples: Coordinates[] = [];
  let segment = 0;
  for (let i = 0; i < count; i++) {
    const target = (i * total) / (count - 1);
    while (segment < coords.length - 2 && cumulative[segment + 1] < target)
      segment++;
    const span = cumulative[segment + 1] - cumulative[segment] || 1;
    const t = (target - cumulative[segment]) / span;
    const a = coords[segment];
    const b = coords[segment + 1];
    samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return samples;
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; elevations: number[] };

export function RouteElevation({ route }: { route: Route }) {
  const points = useMemo(
    () => sampleLine(route.geometry.coordinates as Coordinates[]),
    [route],
  );
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
        // Carry the last known value across gaps so the profile stays continuous.
        let last = raw.find((e): e is number => e != null) ?? 0;
        const elevations = raw.map((e) => (e == null ? last : (last = e)));
        setState({ status: "ready", elevations });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => controller.abort();
  }, [points]);

  if (state.status === "error") return null;
  if (state.status === "loading")
    return (
      <div className="elevation elevation-loading">
        <LoaderCircle className="spin" size={16} />
        Reading elevation…
      </div>
    );

  const { elevations } = state;
  let ups = 0;
  let downs = 0;
  for (let i = 1; i < elevations.length; i++) {
    const delta = elevations[i] - elevations[i - 1];
    if (delta > 0) ups += delta;
    else downs -= delta;
  }
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const range = max - min || 1;
  const W = 100;
  const H = 40;
  const pad = 4;
  const x = (i: number) => (i / (elevations.length - 1)) * W;
  const y = (e: number) => H - pad - ((e - min) / range) * (H - pad * 2);
  const line = elevations.map((e, i) => `${x(i)},${y(e)}`).join(" ");
  const area = `M0,${H} L${line} L${W},${H} Z`;

  if (ups < 20 && downs < 20)
    return (
      <div className="elevation elevation-flat">
        <span>
          <ArrowUp size={14} />
          {Math.round(ups)} m
        </span>
        <span>
          <ArrowDown size={14} />
          {Math.round(downs)} m
        </span>
        <em>mostly flat</em>
      </div>
    );

  return (
    <div className="elevation">
      <div className="elevation-summary">
        <span>
          <ArrowUp size={14} />
          {Math.round(ups)} m
        </span>
        <span>
          <ArrowDown size={14} />
          {Math.round(downs)} m
        </span>
      </div>
      <svg
        className="elevation-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-label={`Elevation profile: ${Math.round(ups)} metres up, ${Math.round(downs)} metres down`}
      >
        <path d={area} className="elevation-fill" />
        <polyline points={line} className="elevation-stroke" />
      </svg>
    </div>
  );
}
