import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  ArrowDownLeftIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpLeftIcon,
  ArrowsUpDownIcon,
  ArrowPathIcon,
  BuildingLibraryIcon,
  CheckIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  MapIcon,
  MapPinIcon,
  MinusIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ShareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowTopRightOnSquareIcon,
  PhoneIcon,
  LinkIcon,
  PhotoIcon,
  ViewfinderCircleIcon,
} from "@heroicons/react/24/outline";
type IconProps = SVGProps<SVGSVGElement> & { size?: number };
const pixels = (size: number) =>
  size <= 18 ? 16 : size <= 22 ? 20 : size <= 30 ? 24 : 32;
function icon(Icon: ComponentType<SVGProps<SVGSVGElement>>) {
  return function ProductIcon({ size = 20, ...props }: IconProps) {
    return (
      <Icon
        width={pixels(size)}
        height={pixels(size)}
        aria-hidden="true"
        {...props}
      />
    );
  };
}
// Small semantic companions for concepts Heroicons doesn't include. They use
// the same 24px grid, 1.5px stroke, and rounded caps/joins as Heroicons outlines.
function companion(children: ReactNode) {
  return function CompanionIcon({ size = 20, ...props }: IconProps) {
    return (
      <svg
        width={pixels(size)}
        height={pixels(size)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    );
  };
}
export const Bike = companion(
  <>
    <circle cx="5.25" cy="16.75" r="3.5" />
    <circle cx="18.75" cy="16.75" r="3.5" />
    <path d="m5.25 16.75 4-8 4.5 8H5.25l10-8 3.5 8M8 8.75h4m2-3.5h2.5l1.25 3.5" />
  </>,
);
export const CarFront = companion(
  <>
    <path d="m4 10 2-5h12l2 5m-16 0h16v8H4zm1 8v2m14-2v2M2 10h2m16 0h2M7 14h2m6 0h2" />
  </>,
);
export const Footprints = companion(
  <>
    <circle cx="13.5" cy="4" r="1.5" />
    <path d="m9 21 3-7 3 3v4m-8-9 2-4 4-1 2 5 4 1M12 8l-1 6-4 3-2 4" />
  </>,
);
export const Coffee = companion(
  <>
    <path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zm12 1h2a3 3 0 0 1 0 6h-2M3 22h15M7 2v3m5-3v3" />
  </>,
);
export const Utensils = companion(
  <>
    <path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18m12 0V3c-3 1-5 4-5 8h5" />
  </>,
);
export const Trees = companion(
  <>
    <path d="m12 2-6 7h3l-5 7h6v6m2-20 6 7h-3l5 7h-6v6m-6 0h8" />
  </>,
);
export const Route = companion(
  <>
    <circle cx="6" cy="5" r="2" />
    <circle cx="18" cy="19" r="2" />
    <path d="M8 5h8a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h8" />
  </>,
);
export const TrafficCone = companion(
  <>
    <path d="m8 20 3-17h2l3 17M5 21h14M10 9h4M9 14h6" />
  </>,
);
export const ArrowDownLeft = icon(ArrowDownLeftIcon),
  ArrowDownUp = icon(ArrowsUpDownIcon),
  ArrowLeft = icon(ArrowLeftIcon),
  ArrowRight = icon(ArrowRightIcon),
  ArrowUpLeft = icon(ArrowUpLeftIcon),
  Check = icon(CheckIcon),
  ChevronRight = icon(ChevronRightIcon),
  Compass = icon(GlobeAltIcon),
  ExternalLink = icon(ArrowTopRightOnSquareIcon),
  Info = icon(InformationCircleIcon),
  Layers = icon(Squares2X2Icon),
  Leaf = icon(SparklesIcon),
  LoaderCircle = icon(ArrowPathIcon),
  LocateFixed = icon(ViewfinderCircleIcon),
  Map = icon(MapIcon),
  MapPin = icon(MapPinIcon),
  Navigation = icon(PaperAirplaneIcon),
  Plus = icon(PlusIcon),
  Minus = icon(MinusIcon),
  Satellite = icon(GlobeAltIcon),
  Share2 = icon(ShareIcon),
  ShieldCheck = icon(ShieldCheckIcon),
  SlidersHorizontal = icon(AdjustmentsHorizontalIcon),
  X = icon(XMarkIcon),
  Landmark = icon(BuildingLibraryIcon),
  Search = icon(MagnifyingGlassIcon),
  TriangleAlert = icon(ExclamationTriangleIcon),
  Phone = icon(PhoneIcon),
  Link = icon(LinkIcon),
  Photo = icon(PhotoIcon);
