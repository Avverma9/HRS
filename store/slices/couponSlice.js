import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";
import { getUserEmail, getUserId } from "../../utils/credentials";

const normalizeCouponResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.coupons)) return payload.coupons;
  return [];
};

export const fetchUserCoupons = createAsyncThunk(
  "coupons/fetchUserCoupons",
  async (input = {}, { rejectWithValue }) => {
    try {
      const userEmail = input?.email || (await getUserEmail());
      const userId = input?.userId || (await getUserId());

      const payload = {};
      if (userEmail) payload.email = userEmail;
      if (userId) payload.userId = userId;

      if (!payload.email && !payload.userId) {
        return rejectWithValue({ message: "Missing user context for coupons." });
      }

      const response = await api.post("/user-coupon/get-default-coupon/user", payload);
      return normalizeCouponResponse(response?.data);
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to fetch coupons" }
      );
    }
  }
);

const couponSlice = createSlice({
  name: "coupons",
  initialState: {
    items: [],
    status: "idle",
    error: null,
  },
  reducers: {
    resetCouponsState: (state) => {
      state.items = [];
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserCoupons.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserCoupons.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchUserCoupons.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Failed to load coupons" };
        state.items = [];
      });
  },
});

export const { resetCouponsState } = couponSlice.actions;
export default couponSlice.reducer;
