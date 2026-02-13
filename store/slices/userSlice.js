import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";
import { getUserEmail, getUserId } from "../../utils/credentials";

export const fetchProfileData = createAsyncThunk(
  "profile/fetchProfileData",
  async (_, { rejectWithValue }) => {
    const userId = await getUserId();
    if (!userId) {
      return rejectWithValue({ message: "User ID not found. Please login again." });
    }

    try {
      const response = await api.get(`/get/${userId}`);
      return response.data?.data || null;
    } catch (err) {
      return rejectWithValue(err?.response?.data || { message: err?.message || "Unable to fetch profile" });
    }
  }
);

export const updateProfileData = createAsyncThunk(
  "profile/updateProfileData",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.put("/update", formData);
      return response.data;
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again.";
      return rejectWithValue(error?.response?.data);
    }
  }
);

export const fetchDefaultCoupon = createAsyncThunk(
  "profile/fetchDefaultCoupon",
  async (_, { rejectWithValue }) => {
    try {
      const userEmail = await getUserEmail();
      if (!userEmail) {
        return rejectWithValue({ message: "User email not found." });
      }

      const response = await api.post("/user-coupon/get-default-coupon/user", {
        email: userEmail,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data);
    }
  }
);

const user = createSlice({
  name: "user",
  initialState: {
    data: null,
    coupon: [],
    loading: false,
    error: null,
    updateSuccess: false,
    bookingData: null,
    bookingLoading: false,
    bookingError: null,
  },
  reducers: {
    clearUpdateSuccess: (state) => {
      state.updateSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfileData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfileData.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(fetchProfileData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateProfileData.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateProfileData.fulfilled, (state) => {
        state.loading = false;
        state.updateSuccess = true;
      })
      .addCase(updateProfileData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.updateSuccess = false;
      })
      .addCase(fetchDefaultCoupon.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDefaultCoupon.fulfilled, (state, action) => {
        state.loading = false;
        state.coupon = action.payload;
      })
      .addCase(fetchDefaultCoupon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearUpdateSuccess } = user.actions;
export default user.reducer;
