import { appReducer, defaultAppState } from "./appReducer";
import { combineReducers } from "redux";
import { connectRouter } from "connected-react-router";

const createRootReducer = history =>
  combineReducers({
    router: connectRouter(history),
    app: appReducer
  });

const defaultState = {
  app: defaultAppState
};

export default createRootReducer;
export { defaultState };
