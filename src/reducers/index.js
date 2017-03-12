const defaultState = {
  // Mapbox Access Token
  mapboxAccessToken: 'pk.eyJ1IjoiYmVuamFtaW50ZCIsImEiOiJjaW83enIwNjYwMnB1dmlsejN6cDBzbm93In0.0ZOGwSLp8OjW6vCaEKYFng',
  // Map
  map: null,
  mapStyle: 'mapbox://styles/benjamintd/cj06a6mi5004p2sroifies8t9',
  mapCenter: [-122.4, 37.8],
  mapZoom: 10,
  // Search
  searchString: '',
  searchSubmitted: false,
  // Directions
  directionsFrom: null,
  directionsTo: null
};

const reducer = (state = defaultState, action) => {
  switch (action.type) {
  case 'WRITE_SEARCH':
    return Object.assign({}, state, {
      searchString: action.input
    });

  case 'SUBMIT_SEARCH':
    return Object.assign({}, state, {
      searchSubmitted: action.submitted
    });

  case 'SET_MAP':
    return Object.assign({}, state, {
      map: action.map
    });


  default:
    return state;
  }
};

export default reducer;
export {reducer, defaultState};
