import {appReducer, defaultAppState} from './appReducer';

const reducers = {
  app: appReducer
};

const defaultState = {
  app: defaultAppState
};

export default reducers;

export {defaultState};
