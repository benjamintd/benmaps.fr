import {toUrl, parseUrl} from '../utils/urls';

const CALL_HISTORY_METHOD = '@@router/CALL_HISTORY_METHOD';

const urlTinkerer = (store) => (next) => (action) => { // eslint-disable-line

  switch (action.type) {
  case 'SET_STATE_VALUE': {
    next(action);

    let actionPayload = getActionPayload(action.key, action.value);
    const url = updateUrlWithPayload(store.getState().router.location.pathname, actionPayload);
    if (store.getState().router.location.pathname !== url) {
      next({
        type: CALL_HISTORY_METHOD,
        payload: {
          method: 'replace',
          args: [url]
        }
      });
    }
    break;
  }

  case 'SET_STATE_VALUES': {
    next(action);

    let url = store.getState().router.location.pathname;
    Object.keys(action.modifiedState).forEach(k => {
      let actionPayload = getActionPayload(k, action.modifiedState[k]);
      url = updateUrlWithPayload(url, actionPayload);
    });
    if (store.getState().router.location.pathname !== url) {
      next({
        type: CALL_HISTORY_METHOD,
        payload: {
          method: 'replace',
          args: [url]
        }
      });
    }

    break;
  }

  case 'RESET_STATE_KEYS': {
    next(action);

    if (action.keys.indexOf('searchLocation') > -1) {
      let url = updateUrlWithPayload(store.getState().router.location.pathname, {
        searchCoords: null,
        searchPlace: null
      });

      if (store.getState().router.location.pathname !== url) {
        next({
          type: CALL_HISTORY_METHOD,
          payload: {
            method: 'replace',
            args: [url]
          }
        });
      }
    }
    break;
  }

  case 'SET_STATE_FROM_URL': {
    let url = store.getState().router.location.pathname;
    const params = parseUrl(url);
    if (params.searchCoords) {
      next({
        type: 'SET_STATE_VALUES',
        modifiedState: {
          searchLocation: {
            'place_name': params.searchPlace,
            geometry: {
              type: 'Point',
              coordinates: params.searchCoords
            }
          },
          mapCoords: params.searchCoords.concat([13])
        }
      });
      next({
        type: 'TRIGGER_MAP_UPDATE',
        needMapRepan: true
      });
    }
    break;
  }

  default:
    next(action); // let through as default
    break;
  }

};

function getActionPayload(key, value) {
  let actionPayload = {};
  if (key === 'mapCoords') {
    actionPayload = {
      coords: value
    };
  } else if (key === 'searchLocation') {
    actionPayload = {
      searchCoords: value.geometry.coordinates,
      searchPlace: value.place_name.split(',')[0]
    };
  }
  return actionPayload;
}

function updateUrlWithPayload(url, actionPayload) {
  var props = parseUrl(url);
  return toUrl(Object.assign({}, props, actionPayload));
}

export default urlTinkerer;
