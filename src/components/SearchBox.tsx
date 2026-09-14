import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowUpLeft,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Search,
  X,
} from "./Icons";
import { errorMessage, retrieve, suggest } from "../lib/api";
import type { Suggestion } from "../lib/api";
import type { Coordinates, Place } from "../lib/domain";
import { config } from "../lib/config";
type Props = {
  center: Coordinates;
  onSelect: (place: Place) => void;
  placeholder?: string;
  label?: string;
  compact?: boolean;
  onUseLocation?: () => void;
  locating?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
};
export function SearchBox({
  center,
  onSelect,
  placeholder = "Search",
  label = "Search places",
  compact = false,
  onUseLocation,
  locating = false,
  value,
  onValueChange,
}: Props) {
  const [localQuery, setLocalQuery] = useState("");
  const query = value ?? localQuery;
  function setQuery(next: string) {
    setLocalQuery(next);
    onValueChange?.(next);
  }
  const [results, setResults] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "retrieving" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(Boolean(value));
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const session = useRef(crypto.randomUUID());
  const retrieval = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  useEffect(() => {
    retrieval.current?.abort();
    if (query.trim().length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    setActive(-1);
    setResults([]);
    const timer = setTimeout(() => {
      suggest(query.trim(), center, session.current, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            setResults(data);
            setStatus("ready");
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            setError(errorMessage(error));
            setStatus("error");
          }
        });
    }, 280);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, center, retry]);
  useEffect(() => () => retrieval.current?.abort(), []);
  async function select(item: Suggestion) {
    retrieval.current?.abort();
    const controller = new AbortController();
    retrieval.current = controller;
    setStatus("retrieving");
    try {
      const place = await retrieve(
        item.mapbox_id,
        session.current,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      session.current = crypto.randomUUID();
      setQuery("");
      setOpen(false);
      onSelect(place);
      input.current?.blur();
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(errorMessage(error));
        setStatus("error");
      }
    }
  }
  const hasQuery = query.trim().length >= 2;
  // Open on focus (even with no text) when a "use my location" shortcut exists.
  const expanded = open && (hasQuery || Boolean(onUseLocation));
  return (
    <div
      className={`search-box ${compact ? "compact" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          retrieval.current?.abort();
        }
      }}
    >
      <div className="search-input-wrap">
        <Search size={compact ? 18 : 21} className="search-icon" />
        <input
          ref={input}
          aria-label={label}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={hasQuery ? listId : undefined}
          aria-activedescendant={
            active >= 0 ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          maxLength={256}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              retrieval.current?.abort();
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((n) => Math.min(n + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((n) => Math.max(n - 1, 0));
            }
            if (
              event.key === "Enter" &&
              results.length &&
              status !== "retrieving"
            ) {
              event.preventDefault();
              void select(results[Math.max(0, active)]);
            }
          }}
        />
        {status === "retrieving" ? (
          <LoaderCircle size={18} className="spin" />
        ) : (
          query && (
            <button
              className="icon-button small"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
            >
              <X size={17} />
            </button>
          )
        )}
      </div>
      {expanded && (
        <div className="suggestions">
          {onUseLocation && (
            <button
              type="button"
              className="suggestion location-suggestion"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                setQuery("");
                onUseLocation();
              }}
            >
              <span className="result-icon location-icon">
                {locating ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <LocateFixed size={18} />
                )}
              </span>
              <span>
                <strong>Your location</strong>
              </span>
            </button>
          )}
          {hasQuery && (
            <>
              <div id={listId} role="listbox" aria-label="Search suggestions">
                {(status === "loading" || status === "retrieving") && (
                  <p className="search-status" role="status">
                    <LoaderCircle className="spin" size={16} />
                    {status === "retrieving"
                      ? "Finding this place…"
                      : "Searching…"}
                  </p>
                )}
                {status === "error" && (
                  <div className="search-status error" role="alert">
                    {error}
                    <button
                      className="text-button"
                      onClick={() => setRetry((n) => n + 1)}
                    >
                      Try again
                    </button>
                  </div>
                )}
                {status === "ready" && !results.length && (
                  <p className="search-status">
                    No places found. Try a city or a fuller address.
                  </p>
                )}
                {status === "ready" &&
                  results.map((item, i) => (
                    <button
                      type="button"
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      key={item.mapbox_id}
                      className={`suggestion ${i === active ? "active" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void select(item)}
                    >
                      <span className="result-icon">
                        <MapPin size={18} />
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>
                          {item.full_address ?? item.place_formatted}
                        </small>
                      </span>
                      <ArrowUpLeft size={16} />
                    </button>
                  ))}
              </div>
              {config.mapboxToken && (
                <div className="search-credit">
                  Search by{" "}
                  <a
                    href="https://www.mapbox.com/about/maps/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Mapbox
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
