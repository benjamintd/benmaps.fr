import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import _ from "lodash";
import { createStore, applyMiddleware, compose } from "redux";
import { createBrowserHistory } from "history";
import { routerMiddleware, ConnectedRouter } from "connected-react-router";
import createRootReducer, { defaultState } from "./reducers";
import apiCaller from "./middlewares/apiCaller";
import urlTinkerer from "./middlewares/urlTinkerer";
import * as serviceWorker from "./serviceWorker";

import App from "./components/App";

import "./index.css";

// Read persisted state from the local storage and put that in the initial state.
const persistedState = localStorage.getItem("persistedState")
  ? JSON.parse(localStorage.getItem("persistedState"))
  : {};
const initialState = _.merge({}, defaultState, persistedState);

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const history = createBrowserHistory();

const store = createStore(
  createRootReducer(history), // root reducer with router state
  initialState,
  composeEnhancers(
    applyMiddleware(urlTinkerer, apiCaller, routerMiddleware(history))
  )
);

// Store subscription that will keep the persisted state in local storage in sync with the state.
store.subscribe(() => {
  const state = store.getState();
  const keys = ["app.userLocation", "app.mapCoords"];
  const persistedState = {};
  keys.forEach(key => {
    var val = _.get(state, key);
    if (val) _.set(persistedState, key, val);
  });
  localStorage.setItem("persistedState", JSON.stringify(persistedState));
});

ReactDOM.render(
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <App />
    </ConnectedRouter>
  </Provider>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.register();
