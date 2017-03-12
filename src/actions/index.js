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
