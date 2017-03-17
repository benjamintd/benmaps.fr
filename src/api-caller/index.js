const apiCaller = (store) => (next) => (action) => { // eslint-disable-line

  switch (action.type) {
  // ---------------------------------------------------------------------------
  case 'GET_ROUTE':
    // Dispatch pending action
    next({
      type: 'SET_STATE_VALUE',
      key: 'routeStatus',
      value: 'pending'
    });

    // Fetch
    fetch('https://google.com', {method: 'get'})
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
      })
      .catch(err => console.log(err));
    break;

  default:
    next(action); // let through as default
    break;
  }

  return;
};

export default apiCaller;
