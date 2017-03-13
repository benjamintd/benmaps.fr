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
