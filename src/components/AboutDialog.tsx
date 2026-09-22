import { useEffect, useRef } from "react";
import { ExternalLink, Sparkles, ShieldCheck, X } from "./Icons";

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
export function AboutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="about-dialog"
      aria-label="About Benmaps"
      onClose={() => onClose()}
      onCancel={() => onClose()}
    >
      <button
        className="icon-button dialog-close"
        aria-label="Close about"
        onClick={() => onClose()}
      >
        <X size={21} />
      </button>
      <Brand />
      <p>
        Benmaps uses Clair cartography, Protomaps data, and MapLibre. Search and
        directions are provided by Mapbox.
      </p>
      <div className="about-item">
        <Sparkles size={22} />
        <span>
          <strong>Made with Clair</strong>
          <small>
            <a href="https://clair.benmaps.fr" target="_blank" rel="noreferrer">
              Clair
            </a>{" "}
            is a carefully designed basemap, crafted to be used with Protomaps.
          </small>
        </span>
      </div>
      <div className="about-item">
        <ShieldCheck size={22} />
        <span>
          <strong>Privacy</strong>
          <small>
            No analytics, accounts, or cookies. Recently viewed basemap tiles
            are cached on your device for faster return visits. Map tiles,
            searches, and route requests go directly to their respective
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
        <a href="https://clair.benmaps.fr/license" target="_blank">
          Clair license
        </a>{" "}
        ·{" "}
        <a href="https://clair.benmaps.fr/third-party.txt" target="_blank">
          Map credits
        </a>
      </p>
    </dialog>
  );
}
