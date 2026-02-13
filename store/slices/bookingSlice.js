import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";
import Toast from "react-native-toast-message";
import { getUserId } from "../../utils/credentials";

const parseNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeResponse = (response) => {
  const payload = response?.data;
  if (!payload) return null;

  if (payload?.data && typeof payload.data === "object") {
    return { ...payload.data, message: payload.message || payload.data?.message };
  }
  return payload;
};

const stripHtmlField = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const { html, ...rest } = payload;
  return rest;
};

export const fetchMonthlyData = createAsyncThunk(
  "booking/fetchMonthlyData",
  async (hotelId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/monthly-set-room-price/get/by/${hotelId}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err?.message || "Failed");
    }
  }
);

export const applyCouponCode = createAsyncThunk(
  "booking/applyCouponCode",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.patch("/user-coupon/apply/a/coupon-to-room/user", payload);
      const parsed = normalizeResponse(res);

      Toast.show({
        type: "success",
        text1: parsed?.message || "Coupon applied successfully",
      });

      return parsed;
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Unable to apply coupon";
      Toast.show({ type: "error", text1: message });
      return rejectWithValue(message);
    }
  }
);

export const getGstForHotelData = createAsyncThunk(
  "booking/getGstForHotelData",
  async ({ type = "Hotel", gstThreshold }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (type) params.append("type", type);

      if (gstThreshold !== undefined && gstThreshold !== null) {
        params.append(
          "gstThreshold",
          Array.isArray(gstThreshold) ? gstThreshold.join(",") : String(gstThreshold)
        );
      }

      const res = await api.get(`/gst/get-single-gst?${params.toString()}`);
      return res.data;
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Unable to fetch GST data";
      return rejectWithValue(message);
    }
  }
);

export const createBooking = createAsyncThunk(
  "booking/createBooking",
  async (bookingPayload, { rejectWithValue }) => {
    try {
      const res = await api.post("/booking/create", bookingPayload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || err?.message || "Failed");
    }
  }
);

export const fetchFilteredBooking = createAsyncThunk(
  "booking/fetchFilteredBooking",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const resolvedUserId = filters?.userId || (await getUserId());

      const params = new URLSearchParams();
      Object.entries({ ...filters, userId: resolvedUserId }).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
      });

      const relativeUrl = `/get/all/users-filtered/booking/by?${params.toString()}`;

    

      const res = await api.get(relativeUrl);

    

      const raw = res?.data ?? null;

   

      const { html, ...sanitized } = raw || {};
   

      return sanitized;
    } catch (err) {
     

      return rejectWithValue(
        err?.response?.data?.message || err?.message || "Failed to fetch bookings"
      );
    }
  }
);


const initialState = {
  monthlyData: [],
  monthlyLoading: false,
  monthlyError: null,

  gstStatus: "idle",
  gstError: null,
  gstAmount: 0,
  gstData: null,

  bookingStatus: "idle",
  bookingError: null,
  bookingReference: null,

  couponStatus: "idle",
  couponError: null,
  discountAmount: 0,
  appliedCoupon: null,
  couponResult: null,

  filteredBookingsStatus: "idle",
  filteredBookingsError: null,
  filteredBookings: null,
};

const bookingSlice = createSlice({
  name: "booking",
  initialState,
  reducers: {
    resetBookingState(state) {
      state.bookingStatus = "idle";
      state.bookingError = null;
      state.bookingReference = null;
    },
    resetCoupon(state) {
      state.couponStatus = "idle";
      state.couponError = null;
      state.discountAmount = 0;
      state.appliedCoupon = null;
      state.couponResult = null;
    },
    resetFilteredBookings(state) {
      state.filteredBookingsStatus = "idle";
      state.filteredBookingsError = null;
      state.filteredBookings = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMonthlyData.pending, (state) => {
        state.monthlyLoading = true;
        state.monthlyError = null;
      })
      .addCase(fetchMonthlyData.fulfilled, (state, action) => {
        state.monthlyLoading = false;
        const payloadData = action.payload?.data || action.payload;
        state.monthlyData = Array.isArray(payloadData) ? payloadData : [];
      })
      .addCase(fetchMonthlyData.rejected, (state, action) => {
        state.monthlyLoading = false;
        state.monthlyError = action.payload || "Failed";
      })

      .addCase(createBooking.pending, (state) => {
        state.bookingStatus = "loading";
        state.bookingError = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.bookingStatus = "succeeded";
        state.bookingReference = action.payload?.bookingId || action.payload?.data?.bookingId || null;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.bookingStatus = "failed";
        state.bookingError = action.payload || "Failed";
      })

      .addCase(applyCouponCode.pending, (state) => {
        state.couponStatus = "loading";
        state.couponError = null;
      })
      .addCase(applyCouponCode.fulfilled, (state, action) => {
        state.couponStatus = "succeeded";

        const originalPrice = parseNumber(action.payload?.originalPrice);
        const finalPrice = parseNumber(action.payload?.finalPrice);

        const explicitDiscount =
          parseNumber(action.payload?.discountPrice) || parseNumber(action.payload?.discountAmount);

        const derivedDiscount =
          originalPrice > 0 && finalPrice >= 0 && originalPrice >= finalPrice
            ? originalPrice - finalPrice
            : 0;

        state.discountAmount = explicitDiscount || derivedDiscount || 0;
        state.appliedCoupon = action.meta.arg?.couponCode || action.meta.arg?.code || null;
        state.couponResult = action.payload || null;
      })
      .addCase(applyCouponCode.rejected, (state, action) => {
        state.couponStatus = "failed";
        state.couponError = action.payload || "Failed";
        state.discountAmount = 0;
        state.appliedCoupon = null;
        state.couponResult = null;
      })

      .addCase(getGstForHotelData.pending, (state) => {
        state.gstStatus = "loading";
        state.gstError = null;
      })
      .addCase(getGstForHotelData.fulfilled, (state, action) => {
        state.gstStatus = "succeeded";
        state.gstData = action.payload?.data || action.payload || null;
        state.gstAmount = action.payload?.gstAmount || action.payload?.data?.gstAmount || 0;
      })
      .addCase(getGstForHotelData.rejected, (state, action) => {
        state.gstStatus = "failed";
        state.gstError = action.payload || "Failed";
        state.gstAmount = 0;
      })

      .addCase(fetchFilteredBooking.pending, (state) => {
        state.filteredBookingsStatus = "loading";
        state.filteredBookingsError = null;
      })
      .addCase(fetchFilteredBooking.fulfilled, (state, action) => {
        state.filteredBookingsStatus = "succeeded";
        state.filteredBookings = action.payload || null;
      })
      .addCase(fetchFilteredBooking.rejected, (state, action) => {
        state.filteredBookingsStatus = "failed";
        state.filteredBookingsError = action.payload || "Failed to fetch bookings";
      });
  },
});

export const { resetBookingState, resetCoupon, resetFilteredBookings } = bookingSlice.actions;
export default bookingSlice.reducer;
