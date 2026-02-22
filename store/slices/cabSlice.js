import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";

const normalizeCabList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.cars)) return payload.cars;
  return [];
};

export const fetchAllCabs = createAsyncThunk(
  "cab/fetchAllCabs",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/travel/get-all-car");
      return {
        items: normalizeCabList(response?.data),
        message: response?.data?.message || null,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to fetch cabs" }
      );
    }
  }
);

const cabSlice = createSlice({
  name: "cab",
  initialState: {
    items: [],
    status: "idle",
    error: null,
    message: null,
  },
  reducers: {
    resetCabState: (state) => {
      state.items = [];
      state.status = "idle";
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllCabs.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAllCabs.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.message = action.payload?.message || null;
      })
      .addCase(fetchAllCabs.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Failed to fetch cabs" };
        state.items = [];
      });
  },
});

export const { resetCabState } = cabSlice.actions;
export default cabSlice.reducer;
