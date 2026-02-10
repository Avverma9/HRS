import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Fetch Beds
export const getBeds = createAsyncThunk(
  "additional/getBeds",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/additional/get-bed");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Fetch Rooms
export const getRooms = createAsyncThunk(
  "additional/getRooms",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/additional/get-room");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const additionalSlice = createSlice({
  name: "additional",
  initialState: {
    beds: [],
    rooms: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Beds
      .addCase(getBeds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBeds.fulfilled, (state, action) => {
        state.loading = false;
        state.beds = action.payload;
      })
      .addCase(getBeds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Rooms
      .addCase(getRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload;
      })
      .addCase(getRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default additionalSlice.reducer;
