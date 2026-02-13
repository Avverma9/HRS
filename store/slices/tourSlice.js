import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";

const normalizeTourResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const fetchTourList = createAsyncThunk(
  "tour/fetchTourList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/get-tour-list");
      return {
        items: normalizeTourResponse(response?.data),
        message: response?.data?.message || null,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to fetch tour list" }
      );
    }
  }
);

export const searchToursFromTo = createAsyncThunk(
  "tour/searchToursFromTo",
  async ({ from = "", to = "" } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/search-tours/from-to", {
        params: {
          from: String(from || "").trim(),
          to: String(to || "").trim(),
        },
      });

      return {
        items: normalizeTourResponse(response?.data),
        message: response?.data?.message || null,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to search tours" }
      );
    }
  }
);

const tourSlice = createSlice({
  name: "tour",
  initialState: {
    items: [],
    status: "idle",
    error: null,
    message: null,
  },
  reducers: {
    resetTourState: (state) => {
      state.items = [];
      state.status = "idle";
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTourList.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTourList.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.message = action.payload?.message || null;
      })
      .addCase(fetchTourList.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Failed to fetch tours" };
        state.items = [];
      })
      .addCase(searchToursFromTo.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(searchToursFromTo.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.message = action.payload?.message || null;
      })
      .addCase(searchToursFromTo.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Failed to search tours" };
        state.items = [];
      });
  },
});

export const { resetTourState } = tourSlice.actions;
export default tourSlice.reducer;
