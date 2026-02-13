import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./slices/userSlice";
import locationSlice from "./slices/locationSlice";
import hotelSlice from "./slices/hotelSlice";
import additionalSlice from "./slices/additionalSlice";
import bookingSlice from "./slices/bookingSlice";
import profileUpdateSlice from "./slices/profileUpdateSlice";
import couponSlice from "./slices/couponSlice";

export const store = configureStore({
  reducer: {
    user: userSlice,
    location: locationSlice,
    hotel: hotelSlice,
    additional: additionalSlice,
    booking: bookingSlice,
    profileUpdate: profileUpdateSlice,
    coupons: couponSlice,
  },
});

// Optional: export rooted types/hooks if you want to add them later
export default store;
