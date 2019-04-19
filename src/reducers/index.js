import { appReducer, defaultAppState } from "./appReducer";
import { combineReducers } from "redux";
import { createBrowserHistory } from "history";
import { connectRouter } from "connected-react-router";

const createRootReducer = history => {
  if (!history) history = createBrowserHistory();
  return combineReducers({
    router: connectRouter(history),
    app: appReducer
  });
};

const defaultState = {
  app: defaultAppState
};

export default createRootReducer;
export { defaultState };
