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

export const filterToursByQuery = createAsyncThunk(
  "tour/filterToursByQuery",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/filter-tour/by-query", { params });
      return {
        items: normalizeTourResponse(response?.data),
        message: response?.data?.message || null,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to filter tours" }
      );
    }
  }
);

export const fetchTourById = createAsyncThunk(
  "tour/fetchTourById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/get-tour/${id}`);
      return response?.data?.data || response?.data || null;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to fetch tour details" }
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
    selectedTour: null,
    selectedTourStatus: "idle",
    selectedTourError: null,
  },
  reducers: {
    resetTourState: (state) => {
      state.items = [];
      state.status = "idle";
      state.error = null;
      state.message = null;
      state.selectedTour = null;
      state.selectedTourStatus = "idle";
      state.selectedTourError = null;
    },
    resetSelectedTour: (state) => {
      state.selectedTour = null;
      state.selectedTourStatus = "idle";
      state.selectedTourError = null;
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
      .addCase(filterToursByQuery.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(filterToursByQuery.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.message = action.payload?.message || null;
      })
      .addCase(filterToursByQuery.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Failed to filter tours" };
        state.items = [];
      })
      .addCase(fetchTourById.pending, (state) => {
        state.selectedTourStatus = "loading";
        state.selectedTourError = null;
      })
      .addCase(fetchTourById.fulfilled, (state, action) => {
        state.selectedTourStatus = "succeeded";
        state.selectedTour = action.payload || null;
      })
      .addCase(fetchTourById.rejected, (state, action) => {
        state.selectedTourStatus = "failed";
        state.selectedTourError = action.payload || { message: "Failed to load tour details" };
        state.selectedTour = null;
      });
  },
});

export const { resetTourState, resetSelectedTour } = tourSlice.actions;
export default tourSlice.reducer;
