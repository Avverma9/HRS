import { createNavigationContainerRef, StackActions, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const router = {
  isReady: () => navigationRef.isReady(),
  canGoBack: () => {
    if (!navigationRef.isReady() || typeof navigationRef.canGoBack !== "function") {
      return false;
    }
    return navigationRef.canGoBack();
  },
  goBack: () => {
    if (navigationRef.isReady() && typeof navigationRef.goBack === "function") {
      navigationRef.goBack();
    }
  },
  navigate: (name, params) => {
    if (navigationRef.isReady()) navigationRef.navigate(name, params);
  },
  push: (name, params) => {
    if (navigationRef.isReady()) navigationRef.dispatch(StackActions.push(name, params));
  },
  replace: (name, params) => {
    if (navigationRef.isReady()) navigationRef.dispatch(StackActions.replace(name, params));
  },
  resetRoot: (routes) => {
    if (navigationRef.isReady()) navigationRef.dispatch(CommonActions.reset({ index: 0, routes }));
  },
};
