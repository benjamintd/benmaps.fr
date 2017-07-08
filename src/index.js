import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import _ from 'lodash';
import {createStore, applyMiddleware, compose, combineReducers} from 'redux';
import createHistory from 'history/createBrowserHistory';
import {Route} from 'react-router';
import {ConnectedRouter, routerReducer, routerMiddleware} from 'react-router-redux';
import {defaultState} from './reducers/index';
import apiCaller from './middlewares/apiCaller';
import urlTinkerer from './middlewares/urlTinkerer';
import reducers from './reducers/index';

import App from './components/App';

import './index.css';

// Read persisted state from the local storage and put that in the initial state.
const persistedState = localStorage.getItem('persistedState') ? JSON.parse(localStorage.getItem('persistedState')) : {};
const initialState = _.merge({}, defaultState, persistedState);

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Create history and router middleware
const history = createHistory();
const routerMid = routerMiddleware(history);

let store = createStore(
  combineReducers({
    ...reducers,
    router: routerReducer
  }),
  initialState,
  composeEnhancers(applyMiddleware(apiCaller, urlTinkerer, routerMid))
);

// Store subscription that will keep the persisted state in local storage in sync with the state.
store.subscribe(() => {
  const state = store.getState();
  const keys = ['app.userLocation', 'app.mapCoords'];
  const persistedState = {};
  keys.forEach((key) => {
    var val = _.get(state, key);
    if (val) _.set(persistedState, key, val);
  });
  localStorage.setItem('persistedState', JSON.stringify(persistedState));
});

ReactDOM.render(
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <Route path="*" component={App}/>
    </ConnectedRouter>
  </Provider>,
  document.getElementById('root')
);
