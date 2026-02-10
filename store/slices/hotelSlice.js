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
      return response.data;
    } catch (error) {
      // Extract the error message from the error object
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);


export const frontHotels = createAsyncThunk(
  "hotel/frontHotels",
  async (_, { rejectWithValue }) => { 
    try {
      const response = await api.get("/get/offers/main/hotels");
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const getHotelById = createAsyncThunk(
  "hotel/getHotelById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/hotels/get-by-id/${id}`);
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
    data: [], // For search results
    loading: false,
    error: null,
    // Separate state for featured/front hotels
    featuredData: [],
    featuredLoading: false,
    featuredError: null,
    // Separate state for selected hotel details
    selectedHotel: null,
    selectedHotelLoading: false,
    selectedHotelError: null,
  },
  extraReducers: (builder) => {
    builder
      // --- Search Hotels Cases ---
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
      })
      
      // --- Featured/Front Hotels Cases ---
      .addCase(frontHotels.pending, (state) => {
        state.featuredLoading = true;
        state.featuredError = null;
      })
      .addCase(frontHotels.fulfilled, (state, action) => {
        state.featuredLoading = false;
        state.featuredData = action.payload?.data || action.payload || [];
      })
      .addCase(frontHotels.rejected, (state, action) => {
        state.featuredLoading = false;
        state.featuredError = action.payload;
      })

      // --- Get Hotel By ID Cases ---
      .addCase(getHotelById.pending, (state) => {
        state.selectedHotelLoading = true;
        state.selectedHotelError = null;
        state.selectedHotel = null;
      })
      .addCase(getHotelById.fulfilled, (state, action) => {
        state.selectedHotelLoading = false;
        state.selectedHotel = action.payload?.data || null;
      })
      .addCase(getHotelById.rejected, (state, action) => {
        state.selectedHotelLoading = false;
        state.selectedHotelError = action.payload;
      });
  },
});

// Export the reducer to be used in the store configuration
export default hotelSlice.reducer;