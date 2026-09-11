import {
  Bike as BikeIcon,
  CarFront as CarFrontIcon,
  PersonStanding as PersonStandingIcon,
  Coffee as CoffeeIcon,
  Utensils as UtensilsIcon,
  Trees as TreesIcon,
  Route as RouteIcon,
  TrafficCone as TrafficConeIcon,
  Compass as CompassIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
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
// Use maintained Lucide artwork for categories not covered by Heroicons.
export const Bike = icon(BikeIcon),
  CarFront = icon(CarFrontIcon),
  Footprints = icon(PersonStandingIcon),
  Coffee = icon(CoffeeIcon),
  Utensils = icon(UtensilsIcon),
  Trees = icon(TreesIcon),
  Route = icon(RouteIcon),
  TrafficCone = icon(TrafficConeIcon);
export const ArrowDownLeft = icon(ArrowDownLeftIcon),
  ArrowDownUp = icon(ArrowsUpDownIcon),
  ArrowLeft = icon(ArrowLeftIcon),
  ArrowRight = icon(ArrowRightIcon),
  ArrowUpLeft = icon(ArrowUpLeftIcon),
  Check = icon(CheckIcon),
  ChevronRight = icon(ChevronRightIcon),
  Compass = icon(CompassIcon),
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
