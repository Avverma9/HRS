import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Define the async thunk
export const searchHotel = createAsyncThunk(
  "hotel/searchHotel",
  async (searchParams, { rejectWithValue }) => {
    try {
      // Normalize params: map city -> search (backend expects `search=Patna`)
      const paramsObj = { ...(searchParams || {}) };
      if (paramsObj.city && !paramsObj.search) {
        paramsObj.search = paramsObj.city;
        delete paramsObj.city;
      }

      const params = new URLSearchParams(paramsObj);
      let qs = params.toString();
      // replace + with %20 for spaces
      qs = qs.replace(/\+/g, "%20");
      if (!qs) return { data: [] };
      const response = await api.get(`/hotels/filters?${qs}`);
      console.log('searchHotel response:', response.data);
      return response.data;
    } catch (error) {
      // Extract the error message from the error object
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
        // API returns { success: true, data: [...] }, so extract the data array
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