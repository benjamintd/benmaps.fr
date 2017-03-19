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

    let profile = 'driving-traffic';
    if (action.modality === 'car') profile = 'driving-traffic';
    if (action.modality === 'bike') profile = 'cycling';
    if (action.modality === 'walk') profile = 'walking';

    const fromCoordinates = action.directionsFrom.geometry.coordinates.join(',');
    const toCoordinates = action.directionsTo.geometry.coordinates.join(',');

    const url = baseUrl + profile + '/' + fromCoordinates + ';' + toCoordinates +
      '?access_token=' + action.accessToken +
      '&overview=full';

    // Fetch
    fetch(url, {method: 'get'})
      .then(res => {
        if (res.ok) {
          return res.json();
        } else { // 4xx or 5xx response
          var err = new Error(res.statusText);
          next({
            type: 'SET_STATE_VALUE',
            key: 'routeStatus',
            value: 'error'
          });
          return Promise.reject(err);
        }
      })
      .then(data => {
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
          type: 'TRIGGER_MAP_UPDATE'
        });
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
      console.log(data);
      const entity = data.entities[action.id];
      const simplifiedClaims = wdk.simplifyClaims(entity.claims);
      const description = entity.descriptions.en.value;
      const label = entity.labels.en.value;
      next({
        type: 'SET_PLACE_INFO',
        info: {
          claims: simplifiedClaims,
          description,
          label
        }
      });
    })
    .catch(() => {});
    break;
  }

  default:
    next(action); // let through as default
    break;
  }

  return;
};

export default apiCaller;
