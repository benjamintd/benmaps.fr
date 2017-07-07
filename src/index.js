import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import _ from 'lodash';
import {createStore, applyMiddleware, compose, combineReducers} from 'redux';
import createHistory from 'history/createBrowserHistory';
import {Route} from 'react-router';
import {ConnectedRouter, routerReducer, routerMiddleware} from 'react-router-redux';
import {defaultState} from './reducers/index';
import apiCaller from './api-caller/index';
import reducers from './reducers/index';

import App from './components/App';

import './index.css';

const persistedState = localStorage.getItem('persistedState') ? JSON.parse(localStorage.getItem('persistedState')) : {};
const initialState = _.merge({}, defaultState, persistedState);
console.log(initialState);

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// Create a history of your choosing (we're using a browser history in this case)
const history = createHistory();

// Build the middleware for intercepting and dispatching navigation actions
const routerMid = routerMiddleware(history);

let store = createStore(
  combineReducers({
    ...reducers,
    router: routerReducer
  }),
  defaultState,
  composeEnhancers(applyMiddleware(routerMid, apiCaller))
);

store.subscribe(()=>{
  const state = store.getState();
  const keys = ['app.userLocation', 'app.mapCenter'];
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
