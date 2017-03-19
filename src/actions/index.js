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

export const triggerMapUpdate = () => ({
  type: 'TRIGGER_MAP_UPDATE'
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

export const getRoute = (directionsFrom, directionsTo, modality, accessToken) => ({
  type: 'GET_ROUTE',
  directionsFrom,
  directionsTo,
  modality,
  accessToken
});

export const getPlaceInfo = (wikidataId) => ({
  type: 'GET_PLACE_INFO',
  id: wikidataId
});

// Some generic action. When existant, prefer one of the above.
export const setStateValue = (key, value) => ({
  type: 'SET_STATE_VALUE',
  key,
  value
});
