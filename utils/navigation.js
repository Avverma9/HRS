import { createNavigationContainerRef, StackActions, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export const router = {
  isReady: () => navigationRef.isReady(),
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
