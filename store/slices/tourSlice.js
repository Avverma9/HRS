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

export const sortToursByOrder = createAsyncThunk(
  "tour/sortToursByOrder",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/sort-tour/by-order", { params });
      return {
        items: normalizeTourResponse(response?.data),
        message: response?.data?.message || null,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to sort tours by order" }
      );
    }
  }
);

export const sortToursByPrice = createAsyncThunk(
  "tour/sortToursByPrice",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/sort-tour/by-price", { params });
      return {
        items: normalizeTourResponse(response?.data),
        message: response?.data?.message || null,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to sort tours by price" }
      );
    }
  }
);

export const sortToursByDuration = createAsyncThunk(
  "tour/sortToursByDuration",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/sort-tour/by-duration", { params });
      return {
        items: normalizeTourResponse(response?.data),
        message: response?.data?.message || null,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to sort tours by duration" }
      );
    }
  }
);

export const sortToursByThemes = createAsyncThunk(
  "tour/sortToursByThemes",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/sort-tour/by-themes", { params });
      return {
        items: normalizeTourResponse(response?.data),
        message: response?.data?.message || null,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to sort tours by themes" }
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
      })
      .addCase(sortToursByOrder.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(sortToursByOrder.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.message = action.payload?.message || null;
      })
      .addCase(sortToursByOrder.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Failed to sort tours by order" };
        state.items = [];
      })
      .addCase(sortToursByPrice.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(sortToursByPrice.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.message = action.payload?.message || null;
      })
      .addCase(sortToursByPrice.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Failed to sort tours by price" };
        state.items = [];
      })
      .addCase(sortToursByDuration.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(sortToursByDuration.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.message = action.payload?.message || null;
      })
      .addCase(sortToursByDuration.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Failed to sort tours by duration" };
        state.items = [];
      })
      .addCase(sortToursByThemes.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(sortToursByThemes.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.message = action.payload?.message || null;
      })
      .addCase(sortToursByThemes.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Failed to sort tours by themes" };
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
