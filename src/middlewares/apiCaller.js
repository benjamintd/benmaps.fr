import wdk from 'wikidata-sdk/dist/wikidata-sdk.js';

const apiCaller = (store) => (next) => (action) => { // eslint-disable-line

  switch (action.type) {
  // ---------------------------------------------------------------------------
  case 'GET_ROUTE': {
    // Dispatch pending action
    next({
      type: 'SET_STATE_VALUE',
      key: 'routeStatus',
      value: 'pending'
    });

    const baseUrl = 'https://api.mapbox.com/directions/v5/mapbox/';

    let profile = 'driving-traffic'; // default
    let annotationsParam = '';
    if (action.modality === 'car') {
      profile = 'driving-traffic';
      annotationsParam = '&annotations=congestion';
    }
    if (action.modality === 'bike') profile = 'cycling';
    if (action.modality === 'walk') profile = 'walking';

    const fromCoordinates = action.directionsFrom.geometry.coordinates.join(',');
    const toCoordinates = action.directionsTo.geometry.coordinates.join(',');

    const url = baseUrl + profile + '/' + fromCoordinates + ';' + toCoordinates
      + '?access_token=' + action.accessToken
      + '&overview=full'
      + annotationsParam;

    // Fetch
    fetch(url, {method: 'get'})
      .then(res => {
        if (res.ok) {
          return res.json();
        } else { // 4xx or 5xx response
          var err = new Error(res.statusText);
          return Promise.reject(err);
        }
      })
      .then(data => {
        if (data.code !== 'Ok') return Promise.reject();
        else {
          // Success
          next({
            type: 'SET_ROUTE',
            data: data
          });
          next({
            type: 'SET_STATE_VALUE',
            key: 'routeStatus',
            value: 'idle'
          });
          next({
            type: 'TRIGGER_MAP_UPDATE',
            needMapRepan: true
          });

          return Promise.resolve();
        }
      })
      .catch(() => next({
        type: 'SET_STATE_VALUE',
        key: 'routeStatus',
        value: 'error'
      }));
    break;
  }

  case 'GET_PLACE_INFO': {
    const url = wdk.getEntities({
      ids: action.id,
      languages: ['en'],
    });

    fetch(url, {method: 'get'})
      .then(res => {
        if (res.ok) {
          return res.json();
        } else { // 4xx or 5xx response
          var err = new Error(res.statusText);
          return Promise.reject(err);
        }
      })
      .then(data => {
        // Success
        const entity = data.entities[action.id];
        const simplifiedClaims = wdk.simplifyClaims(entity.claims);
        const description = entity.descriptions.en.value;
        const label = entity.labels.en.value;
        next({
          type: 'SET_STATE_VALUE',
          key: 'placeInfo',
          value: {
            claims: simplifiedClaims,
            description,
            label
          }
        });
      })
      .catch(() => {});
    break;
  }

  case 'GET_REVERSE_GEOCODE': {
    const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
      + action.coordinates.join(',') + '.json'
      + '?access_token=' + action.accessToken;

    next({
      'type': 'SET_STATE_VALUE',
      'key': action.key,
      'value': {
        'place_name': '__loading',
        'geometry': {
          'type': 'Point',
          'coordinates': action.coordinates
        }
      }
    });

    fetch(url, {method: 'get'})
      .then(res => {
        if (res.ok) {
          return res.json();
        } else { // 4xx or 5xx response
          var err = new Error(res.statusText);
          return Promise.reject(err);
        }
      })
      .then(data => {
        // Success
        if (data.features && data.features.length > 0) {
          return next({
            'type': 'SET_STATE_VALUE',
            'key': action.key,
            'value': {
              'place_name': data.features[0].place_name,
              'geometry': {
                'type': 'Point',
                'coordinates': action.coordinates
              }
            }
          });
        } else return Promise.reject();
      })
      .catch(() => {
        next({
          'type': 'SET_STATE_VALUE',
          'key': action.key,
          'value': {
            'place_name': 'Dropped pin',
            'geometry': {
              'type': 'Point',
              'coordinates': action.coordinates
            }
          }
        });
      });
    break;
  }

  default:
    next(action); // let through as default
    break;
  }

  return;
};

export default apiCaller;
