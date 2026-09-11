declare module "@clair-maps/style" {
  import type { StyleSpecification, SourceSpecification } from "maplibre-gl";
  export function createStyle(options: {
    apiKey?: string;
    font?: "commissioner" | "google-sans";
    language?: string;
    bilingual?: boolean;
    density?: "balanced" | "quiet";
    fontBase?: string;
    source?: SourceSpecification;
    relief?: boolean;
    terrain?: boolean;
    trees?: boolean;
    extrusions?: boolean;
    iconStyle?: "soft" | "line";
    groups?: { pois?: boolean; labels?: boolean; buildings?: boolean };
  }): StyleSpecification;
}
