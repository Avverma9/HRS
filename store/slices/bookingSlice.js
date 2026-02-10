import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Fetch Monthly Pricing Data (Optional, based on MD)
export const fetchMonthlyData = createAsyncThunk(
  "booking/fetchMonthlyData",
  async (hotelId, { rejectWithValue }) => {
    try {
      // Monthly price override data
      const response = await api.get(`/monthly-set-room-price/get/by/${hotelId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Apply Coupon Code
export const applyCouponCode = createAsyncThunk(
  "booking/applyCouponCode",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await api.patch("/user-coupon/apply/a/coupon-to-room/user", payload);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Unable to apply coupon";
      return rejectWithValue(message);
    }
  }
);

// Get GST for Hotel
export const getGstForHotelData = createAsyncThunk(
  "booking/getGstForHotelData",
  async ({ type = "Hotel", gstThreshold }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (type) params.append("type", type);
      if (gstThreshold !== undefined && gstThreshold !== null) {
        const thresholdValue = Array.isArray(gstThreshold)
          ? gstThreshold.join(",")
          : gstThreshold;
        params.append("gstThreshold", thresholdValue);
      }

      const response = await api.get(`/gst/get-single-gst?${params.toString()}`);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Unable to fetch GST data";
      return rejectWithValue(message);
    }
  }
);

// Create Booking
export const createBooking = createAsyncThunk(
  "booking/createBooking",
  async (bookingPayload, { rejectWithValue }) => {
    try {
      const response = await api.post("/booking/create", bookingPayload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Verify Coupon
export const verifyCoupon = createAsyncThunk(
  "booking/verifyCoupon",
  async ({ code, hotelId, totalAmount }, { rejectWithValue }) => {
    try {
      const response = await api.post("/coupons/verify", { code, hotelId, totalAmount });
      return response.data; // Should return discount amount or percentage
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const bookingSlice = createSlice({
  name: "booking",
  initialState: {
    monthlyData: [],
    monthlyLoading: false,
    monthlyError: null,

    gstStatus: "idle",
    gstError: null,
    gstAmount: 0,
    gstData: null,
    
    bookingStatus: 'idle', // idle | loading | succeeded | failed
    bookingError: null,
    bookingReference: null,

    couponStatus: 'idle',
    couponError: null,
    discountAmount: 0,
    appliedCoupon: null,
  },
  reducers: {
    resetBookingState: (state) => {
      state.bookingStatus = 'idle';
      state.bookingError = null;
      state.bookingReference = null;
    },
    resetCoupon: (state) => {
      state.couponStatus = 'idle';
      state.couponError = null;
      state.discountAmount = 0;
      state.appliedCoupon = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Monthly Data
      .addCase(fetchMonthlyData.pending, (state) => {
        state.monthlyLoading = true;
      })
      .addCase(fetchMonthlyData.fulfilled, (state, action) => {
        state.monthlyLoading = false;
        console.log("📦 Monthly Data RAW payload:", JSON.stringify(action.payload, null, 2));
        // Handle array directly or wrapped in data property
        const payloadData = action.payload?.data || action.payload;
        console.log("📦 Monthly Data PARSED:", JSON.stringify(payloadData, null, 2));
        state.monthlyData = Array.isArray(payloadData) ? payloadData : [];
        console.log("📦 Monthly Data STORED (length):", state.monthlyData.length);
      })
      .addCase(fetchMonthlyData.rejected, (state, action) => {
        state.monthlyLoading = false;
        state.monthlyError = action.payload;
      })
      
      // Create Booking
      .addCase(createBooking.pending, (state) => {
        state.bookingStatus = 'loading';
        state.bookingError = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.bookingStatus = 'succeeded';
        state.bookingReference = action.payload?.bookingId || action.payload?.data?.bookingId;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.bookingStatus = 'failed';
        state.bookingError = action.payload;
      })

      // Coupon
      .addCase(verifyCoupon.pending, (state) => {
        state.couponStatus = 'loading';
        state.couponError = null;
      })
      .addCase(verifyCoupon.fulfilled, (state, action) => {
        state.couponStatus = 'succeeded';
        state.discountAmount = action.payload?.discountAmount || 0;
        state.appliedCoupon = action.meta.arg.code;
      })
      .addCase(verifyCoupon.rejected, (state, action) => {
        state.couponStatus = 'failed';
        state.couponError = action.payload;
        state.discountAmount = 0;
        state.appliedCoupon = null;
      })

      // Apply Coupon
      .addCase(applyCouponCode.pending, (state) => {
        state.couponStatus = "loading";
        state.couponError = null;
      })
      .addCase(applyCouponCode.fulfilled, (state, action) => {
        state.couponStatus = "succeeded";
        state.discountAmount =
          action.payload?.discountPrice ||
          action.payload?.discountAmount ||
          0;
        state.appliedCoupon =
          action.meta.arg?.couponCode || action.meta.arg?.code || null;
      })
      .addCase(applyCouponCode.rejected, (state, action) => {
        state.couponStatus = "failed"; 
        state.couponError = action.payload;
        state.discountAmount = 0;
        state.appliedCoupon = null;
      })

      // GST
      .addCase(getGstForHotelData.pending, (state) => {
        state.gstStatus = "loading";
        state.gstError = null;
      })
      .addCase(getGstForHotelData.fulfilled, (state, action) => {
        state.gstStatus = "succeeded";
        state.gstData = action.payload?.data || action.payload || null;
        state.gstAmount =
          action.payload?.gstAmount ||
          action.payload?.data?.gstAmount ||
          0;
      })
      .addCase(getGstForHotelData.rejected, (state, action) => {
        state.gstStatus = "failed";
        state.gstError = action.payload;
        state.gstAmount = 0;
      });
  },
});

export const { resetBookingState, resetCoupon } = bookingSlice.actions;
export default bookingSlice.reducer;
