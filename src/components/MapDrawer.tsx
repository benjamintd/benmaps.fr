import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Drawer } from "vaul";

const media = "(max-width: 700px)";
function subscribe(listener: () => void) {
  const query = window.matchMedia(media);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
type Props = {
  className: string;
  label: string;
  onClose: () => void;
  children: (close: () => void, mobile: boolean) => ReactNode;
  compact?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

/** Non-modal drawers keep the map interactive while Vaul owns drag and snap. */
export function MapDrawer({
  className,
  label,
  onClose,
  children,
  compact,
  expanded,
  onExpandedChange,
}: Props) {
  const mobile = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(media).matches,
    () => false,
  );
  const [open, setOpen] = useState(true);
  // Wait for Vaul's exit transition for both swipe and close-button dismissal.
  // Cleanup prevents a departing drawer from closing a newly selected place.
  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(onClose, 500);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);
  const [detailSnap, setDetailSnap] = useState<number | string | null>(0.46);
  const isRoute = expanded !== undefined;
  const snap = isRoute ? (compact && !expanded ? "112px" : 0.6) : detailSnap;
  if (!mobile)
    return (
      <section className={className} aria-label={label}>
        {children(onClose, false)}
      </section>
    );
  return (
    <Drawer.Root
      open={open}
      onOpenChange={setOpen}
      modal={false}
      noBodyStyles
      snapPoints={isRoute ? (compact ? ["112px", 0.6] : [0.6]) : [0.46, 0.85]}
      activeSnapPoint={snap}
      setActiveSnapPoint={(point) => {
        if (isRoute) onExpandedChange?.(point !== "112px");
        else setDetailSnap(point);
      }}
      snapToSequentialPoint
      autoFocus={false}
    >
      <Drawer.Content
        className={`${className} mobile-map-drawer`}
        aria-describedby={undefined}
        data-map-inset={snap === "112px" ? 112 : snap}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <Drawer.Title className="visually-hidden">{label}</Drawer.Title>
        <div
          className={`drawer-viewport ${isRoute ? "route-drawer-viewport" : "detail-drawer-viewport"}`}
        >
          <Drawer.Handle
            preventCycle
            className="drawer-handle"
            aria-label="Drag drawer"
          />
          {children(() => setOpen(false), true)}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
