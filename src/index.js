import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import _ from "lodash";
import { createStore, applyMiddleware, compose } from "redux";
import { defaultState, reducer } from "./reducers/index";
import apiCaller from "./middlewares/apiCaller";
import * as serviceWorker from "./serviceWorker";

import App from "./components/App";

import "./index.css";

// Read persisted state from the local storage and put that in the initial state.
const persistedState = localStorage.getItem("persistedState")
  ? JSON.parse(localStorage.getItem("persistedState"))
  : {};
const initialState = _.merge({}, defaultState, persistedState);

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

let store = createStore(
  reducer,
  initialState,
  composeEnhancers(applyMiddleware(apiCaller))
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
    <App />
  </Provider>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.register();
