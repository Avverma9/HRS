import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./slices/userSlice";
import locationSlice from "./slices/locationSlice";
import hotelSlice from "./slices/hotelSlice";
import additionalSlice from "./slices/additionalSlice";
import bookingSlice from "./slices/bookingSlice";

export const store = configureStore({
  reducer: {
    user: userSlice,
    location: locationSlice,
    hotel: hotelSlice,
    additional: additionalSlice,
    booking: bookingSlice,
  },
});

// Optional: export rooted types/hooks if you want to add them later
export default store;
