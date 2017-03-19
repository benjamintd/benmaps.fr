import polyline from '@mapbox/polyline';

const defaultState = {
  // Mapbox Access Token
  mapboxAccessToken: 'pk.eyJ1IjoiYmVuamFtaW50ZCIsImEiOiJjaW83enIwNjYwMnB1dmlsejN6cDBzbm93In0.0ZOGwSLp8OjW6vCaEKYFng',
  // Map
  mapStyle: 'mapbox://styles/benjamintd/cj06a6mi5004p2sroifies8t9',
  mapCenter: [-122.4, 37.8],
  mapZoom: 10,
  // Mode
  mode: 'search',
  modality: 'car',
  // Search
  searchString: '',
  searchLocation: null,
  needMapUpdate: false,
  needMapRepan: false,
  placeInfo: null,
  // User
  userLocation: null,
  // Directions
  directionsFromString: '',
  directionsFrom: null,
  directionsToString: '',
  directionsTo: null,
  route: null,
  routeStatus: 'idle',
  lastQueried: 0
};

const reducer = (state = defaultState, action) => {
  switch (action.type) {

  case 'SET_CENTER':
    return Object.assign({}, state, {
      mapCenter: action.coordinates
    });

  case 'SET_ZOOM':
    return Object.assign({}, state, {
      mapZoom: action.zoom
    });

  case 'WRITE_SEARCH':
    return Object.assign({}, state, {
      searchString: action.searchString
    });

  case 'SET_SEARCH_LOCATION':
    return Object.assign({}, state, {
      searchLocation: action.location,
      needMapUpdate: true
    });

  case 'TRIGGER_MAP_UPDATE':
    return Object.assign({}, state, {
      needMapUpdate: true,
      needMapRepan: action.needMapRepan
    });

  case 'SET_USER_LOCATION':
    return Object.assign({}, state, {
      userLocation: {
        place_name: 'My Location',
        center: action.coordinates,
        geometry: {
          type: 'Point',
          coordinates: action.coordinates
        }
      },
    });

  case 'SET_MODE':
    return Object.assign({}, state, {
      mode: action.mode,
    });

  case 'SET_DIRECTIONS_LOCATION': {
    if (action.kind === 'from') {
      return Object.assign({}, state, {
        directionsFrom: action.location
      });
    } else if (action.kind === 'to') {
      return Object.assign({}, state, {
        directionsTo: action.location
      });
    } else return state;
  }

  case 'SET_MODALITY':
    return Object.assign({}, state, {
      modality: action.modality,
    });

  case 'SET_ROUTE': {
    if (action.data.routes.length > 0) {
      const route = action.data.routes[0];

      const geojsonLine = polyline.toGeoJSON(route.geometry);
      route.geometry = geojsonLine

      return Object.assign({}, state, {
        route: route
      });
    } else {
      return Object.assign({}, state, {
        routeStatus: 'error'
      });
    }
  }

  case 'SET_PLACE_INFO': {
    console.log(action.info);
    return Object.assign({}, state, {
      placeInfo: action.info
    });
  }

  // Some generic case. When possible, prefer some more expressive
  // action name above.
  case 'SET_STATE_VALUE': {
    const modifiedState = {};
    modifiedState[action.key] = action.value
    return Object.assign({}, state, modifiedState);
  }

  default:
    return state;
  }
};

export default reducer;
export {reducer, defaultState};
