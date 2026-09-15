import {
  Bike as BikeIcon,
  Car as CarIcon,
  Coffee as CoffeeIcon,
  Utensils as UtensilsIcon,
  Trees as TreesIcon,
  Route as RouteIcon,
  TrafficCone as TrafficConeIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpLeftIcon,
  ArrowsUpDownIcon,
  ArrowPathIcon,
  BuildingLibraryIcon,
  CubeTransparentIcon,
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
  Square3Stack3DIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  PhoneIcon,
  LinkIcon,
  ViewfinderCircleIcon,
} from "@heroicons/react/24/outline";
type IconProps = SVGProps<SVGSVGElement> & { size?: number };
const pixels = (size: number) =>
  size <= 18 ? 16 : size <= 22 ? 20 : size <= 30 ? 24 : 32;
// Inlined so we get one Material Design glyph without pulling in the whole set.
// Icon from Google Material Icons (Apache-2.0) — material-icons/material-icons.
function IcBaselineDirectionsWalk(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2s-2 .9-2 2s.9 2 2 2M9.8 8.9L7 23h2.1l1.8-8l2.1 2v6h2v-7.5l-2.1-2l.6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1c-.3 0-.5.1-.8.1L6 8.3V13h2V9.6z"
      />
    </svg>
  );
}
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
// Use maintained Lucide artwork for categories not covered by Heroicons.
export const Bike = icon(BikeIcon),
  Car = icon(CarIcon),
  Footprints = icon(IcBaselineDirectionsWalk),
  Coffee = icon(CoffeeIcon),
  Utensils = icon(UtensilsIcon),
  Trees = icon(TreesIcon),
  Route = icon(RouteIcon),
  TrafficCone = icon(TrafficConeIcon);
// Names describe the glyph that actually renders, or the single role it fills.
export const ArrowDown = icon(ArrowDownIcon),
  ArrowsUpDown = icon(ArrowsUpDownIcon),
  ArrowRight = icon(ArrowRightIcon),
  ArrowUp = icon(ArrowUpIcon),
  ArrowUpLeft = icon(ArrowUpLeftIcon),
  Check = icon(CheckIcon),
  ChevronRight = icon(ChevronRightIcon),
  Crosshair = icon(ViewfinderCircleIcon),
  Cube = icon(CubeTransparentIcon),
  Directions = icon(PaperAirplaneIcon),
  ExternalLink = icon(ArrowTopRightOnSquareIcon),
  Info = icon(InformationCircleIcon),
  Layers = icon(Square3Stack3DIcon),
  Map = icon(MapIcon),
  MapPin = icon(MapPinIcon),
  Plus = icon(PlusIcon),
  Minus = icon(MinusIcon),
  Satellite = icon(GlobeAltIcon),
  Share = icon(ShareIcon),
  ShieldCheck = icon(ShieldCheckIcon),
  Sparkles = icon(SparklesIcon),
  Spinner = icon(ArrowPathIcon),
  X = icon(XMarkIcon),
  Landmark = icon(BuildingLibraryIcon),
  Search = icon(MagnifyingGlassIcon),
  TriangleAlert = icon(ExclamationTriangleIcon),
  Phone = icon(PhoneIcon),
  Link = icon(LinkIcon);
