import { combineReducers, configureStore, createAction } from "@reduxjs/toolkit";
import userSlice from "./slices/userSlice";
import locationSlice from "./slices/locationSlice";
import hotelSlice from "./slices/hotelSlice";
import additionalSlice from "./slices/additionalSlice";
import bookingSlice from "./slices/bookingSlice";
import profileUpdateSlice from "./slices/profileUpdateSlice";
import couponSlice from "./slices/couponSlice";
import complaintSlice from "./slices/complaintSlice";
import tourSlice from "./slices/tourSlice";
import cabSlice from "./slices/cabSlice";

export const resetAppState = createAction("app/resetAppState");

const appReducer = combineReducers({
  user: userSlice,
  location: locationSlice,
  hotel: hotelSlice,
  additional: additionalSlice,
  booking: bookingSlice,
  profileUpdate: profileUpdateSlice,
  coupons: couponSlice,
  complaints: complaintSlice,
  tour: tourSlice,
  cab: cabSlice,
});

const rootReducer = (state, action) => {
  if (action.type === resetAppState.type) {
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});

// Optional: export rooted types/hooks if you want to add them later
export default store;
