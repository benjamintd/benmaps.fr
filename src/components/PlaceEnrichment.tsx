import { useEffect, useState } from "react";
import type { Place, Resource } from "../lib/domain";
import { getPlaceInfo } from "../lib/wikidata";
import type { PlaceInfo } from "../lib/wikidata";
import { ExternalLink, Info, Link, LoaderCircle, Phone } from "./Icons";
export function PlaceEnrichment({ place }: { place: Place }) {
  const [info, setInfo] = useState<Resource<PlaceInfo | null>>({
    status: "idle",
  });
  const [retry, setRetry] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const key = place.id;
    setInfo({ status: "loading", key });
    setImageFailed(false);
    getPlaceInfo(place, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setInfo({ status: "ready", key, data });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setInfo({
            status: "error",
            key,
            message: "Extra place details are unavailable right now.",
          });
      });
    return () => controller.abort();
  }, [place, retry]);
  if (info.status === "loading")
    return (
      <p className="enrichment-loading">
        <LoaderCircle size={16} className="spin" />
        Looking up this place…
      </p>
    );
  if (info.status === "error")
    return (
      <div className="enrichment-error">
        <Info size={16} />
        <span>{info.message}</span>
        <button onClick={() => setRetry((n) => n + 1)}>Retry</button>
      </div>
    );
  if (info.status !== "ready" || !info.data) return null;
  const data = info.data;
  return (
    <section className="enrichment" aria-label="About this place">
      {data.image && !imageFailed && (
        <figure>
          <a href={data.image.page} target="_blank" rel="noreferrer">
            <img
              src={data.image.url}
              alt={data.label}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          </a>
          <figcaption>
            <a href={data.image.page} target="_blank" rel="noreferrer">
              {data.image.credit}
            </a>{" "}
            ·{" "}
            {data.image.licenseUrl ? (
              <a href={data.image.licenseUrl} target="_blank" rel="noreferrer">
                {data.image.license}
              </a>
            ) : (
              data.image.license
            )}
          </figcaption>
        </figure>
      )}
      {data.description && (
        <p className="place-description">{data.description}</p>
      )}
      {data.address && <p className="enrichment-address">{data.address}</p>}
      {data.website && (
        <a
          className="enrichment-link"
          href={data.website}
          target="_blank"
          rel="noreferrer"
        >
          <Link size={18} />
          <span>Official website</span>
          <ExternalLink size={15} />
        </a>
      )}
      {data.phone && /^[+()\d\s.-]+$/.test(data.phone) && (
        <a
          className="enrichment-link"
          href={`tel:${data.phone.replace(/[^+\d]/g, "")}`}
        >
          <Phone size={18} />
          <span>{data.phone}</span>
        </a>
      )}
      {data.wikipedia && (
        <a
          className="enrichment-link"
          href={data.wikipedia}
          target="_blank"
          rel="noreferrer"
        >
          <Info size={18} />
          <span>Read more on Wikipedia</span>
          <ExternalLink size={15} />
        </a>
      )}
      <div className="enrichment-source">
        Open knowledge from{" "}
        <a
          href={`https://www.wikidata.org/wiki/${data.id}`}
          target="_blank"
          rel="noreferrer"
        >
          Wikidata <ExternalLink size={10} />
        </a>
      </div>
    </section>
  );
}
