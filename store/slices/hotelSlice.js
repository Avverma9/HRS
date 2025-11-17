import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Define the async thunk
export const searchHotel = createAsyncThunk(
  "hotel/searchHotel",
  async (searchParams, { rejectWithValue }) => {
    try {
      // Check if searchParams is empty or all values are empty/undefined
      if (
        !searchParams ||
        Object.values(searchParams).every(
          (value) =>
            value === undefined ||
            value === null ||
            (typeof value === "string" && value.trim() === "") ||
            (Array.isArray(value) && value.length === 0)
        )
      ) {
        // Return empty data early without API call
        return { data: [] };
      }

      const params = new URLSearchParams(searchParams);
      const response = await api.get(`/hotels/filters?${params.toString()}`);
      console.log(params.toString(), "here is ");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Create the slice
const hotelSlice = createSlice({
  name: "hotel",
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchHotel.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchHotel.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload?.data || action.payload || [];
      })
      .addCase(searchHotel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export the reducer to be used in the store configuration
export default hotelSlice.reducer;
