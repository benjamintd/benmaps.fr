import type { AppState } from "../src/lib/domain";

// Reducer starting point. The application always builds its initial state from
// the URL, so this baseline exists only for tests.
export const defaultState: AppState = {
  view: { kind: "explore", place: null },
  settings: { basemap: "clair", traffic: false, threeDimensional: false },
  ui: {
    layersOpen: false,
    aboutOpen: false,
    category: null,
    categoryCenter: [2.3508, 48.8576],
    search: "",
    fromSearch: "",
    toSearch: "",
  },
};
