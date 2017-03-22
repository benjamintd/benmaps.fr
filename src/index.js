import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {createStore, applyMiddleware, compose} from 'redux';
import {defaultState} from './reducers/index';
import apiCaller from './api-caller/index';
import reducer from './reducers/index';

import App from './components/App';

import './index.css';

const persistedState = localStorage.getItem('persistedState') ? JSON.parse(localStorage.getItem('persistedState')) : {};
const initialState = Object.assign({}, defaultState, persistedState);

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

let store = createStore(
  reducer,
  initialState,
  composeEnhancers(applyMiddleware(apiCaller))
);

store.subscribe(()=>{
  const state = store.getState();
  const keys = ['userLocation'];
  const persistedState = {};
  keys.forEach((key) => {
    persistedState[key] = state[key];
  });
  localStorage.setItem('persistedState', JSON.stringify(persistedState));
});

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
