import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import apiCaller from './api-caller/index';
import reducer from './reducers/index';

import App from './components/App';

import './index.css';

let store = createStore(
  reducer,
  compose(applyMiddleware(apiCaller), window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__())
);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
