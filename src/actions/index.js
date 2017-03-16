export const setCenter = (coordinates) => ({
  type: 'SET_CENTER',
  coordinates
});

export const setZoom = (zoom) => ({
  type: 'SET_ZOOM',
  zoom
});

export const writeSearch = (searchString) => ({
  type: 'WRITE_SEARCH',
  searchString
});

export const setSearchLocation = (location) => ({
  type: 'SET_SEARCH_LOCATION',
  location
});

export const setMapUpdated = (bool) => ({
  type: 'SET_MAP_UPDATED',
  mapUpdated: bool
});

export const setUserLocation = (coordinates) => ({
  type: 'SET_USER_LOCATION',
  coordinates
});

export const setMode = (mode) => ({
  type: 'SET_MODE',
  mode: mode
});

export const setDirectionsLocation = (kind, location) => ({
  type: 'SET_DIRECTIONS_LOCATION',
  kind,
  location
});

export const setModality = (modality) => ({
  type: 'SET_MODALITY',
  modality
});

// Some generic action. When existant, prefer one of the above.
export const setStateValue = (key, value) => ({
  type: 'SET_STATE_VALUE',
  key,
  value
});
