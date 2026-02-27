import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";

const sanitizeUserId = (value) => String(value || "").trim().replace(/[<>\s]/g, "");

const getCabId = (cab) =>
  String(
    cab?._id ??
      cab?.carId ??
      cab?.id ??
      cab?.cabId ??
      cab?.carID ??
      cab?.cabID ??
      ""
  ).trim();

const normalizeCabList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.cars)) return payload.cars;
  return [];
};

const normalizeCabBookingList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data?.bookings)) return payload.data.bookings;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const normalizeCabItem = (payload) => {
  if (!payload) return null;
  if (getCabId(payload)) return payload;
  if (getCabId(payload?.data)) return payload.data;
  if (getCabId(payload?.car)) return payload.car;
  if (Array.isArray(payload?.data) && getCabId(payload.data[0])) return payload.data[0];
  if (Array.isArray(payload) && getCabId(payload[0])) return payload[0];
  return null;
};

const sanitizeCabFilterParams = (params = {}) =>
  Object.entries(params).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;

    if (typeof value === "string") {
      const normalized = value.trim();
      if (!normalized) return acc;
      acc[key] = normalized;
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});

const normalizeSeatsPayload = (seats) => {
  if (Array.isArray(seats)) {
    const normalized = seats
      .map((seat) => {
        if (typeof seat === "number") return Number.isFinite(seat) ? String(seat) : null;
        const text = String(seat || "").trim();
        if (!text) return null;
        return text;
      })
      .filter((seat) => seat !== null);

    return normalized;
  }

  if (typeof seats === "number") {
    return Number.isFinite(seats) ? [String(seats)] : [];
  }

  const stringValue = String(seats || "").trim();
  if (!stringValue) return [];

  return [stringValue];
};

const sanitizeCabBookingPayload = (payload = {}) => {
  const sharingType = String(payload?.sharingType || "").trim();
  const safePrice = Number(payload?.price);
  const safeGstPrice = Number(payload?.gstPrice);
  const bookingPayload = {
    userId: String(payload?.userId || "").trim(),
    sharingType,
    vehicleType: String(payload?.vehicleType || "").trim(),
    carId: String(payload?.carId || "").trim(),
    bookedBy: String(payload?.bookedBy || "").trim(),
    customerMobile: String(payload?.customerMobile || "").trim(),
    customerEmail: String(payload?.customerEmail || "").trim(),
    bookingStatus: String(payload?.bookingStatus || "Pending").trim(),
    vehicleNumber: String(payload?.vehicleNumber || "").trim(),
    pickupP: String(payload?.pickupP || "").trim(),
    dropP: String(payload?.dropP || "").trim(),
    pickupD: payload?.pickupD || null,
    dropD: payload?.dropD || null,
    price: Number.isFinite(safePrice) ? safePrice : 0,
    gstPrice: Number.isFinite(safeGstPrice) ? safeGstPrice : 0,
  };

  if (payload?.seats !== undefined) {
    bookingPayload.seats = normalizeSeatsPayload(payload?.seats);
  }

  return bookingPayload;
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

export const filterCabsByQuery = createAsyncThunk(
  "cab/filterCabsByQuery",
  async (params = {}, { rejectWithValue }) => {
    try {
      const queryParams = sanitizeCabFilterParams(params);
      if (__DEV__) {
        console.log("[filterCabsByQuery] request params:", queryParams);
      }
      const response = await api.get("/travel/filter-car/by-query", {
        params: queryParams,
      });
      const items = normalizeCabList(response?.data);
      if (__DEV__) {
        console.log("[filterCabsByQuery] response count:", items.length);
        console.log("[filterCabsByQuery] response data:", response?.data);
      }
      return {
        items,
        message: response?.data?.message || null,
      };
    } catch (error) {
      if (__DEV__) {
        console.error("[filterCabsByQuery] error:", error?.response?.data || error);
      }
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to filter cabs" }
      );
    }
  }
);

export const fetchCabById = createAsyncThunk(
  "cab/fetchCabById",
  async (id, { rejectWithValue }) => {
    try {
      const cabId = String(id || "").trim();
      if (!cabId) {
        return rejectWithValue({ message: "Cab id is required." });
      }

      const response = await api.get(`/travel/get-a-car/${cabId}`);
      const cab = normalizeCabItem(response?.data);

      if (!cab) {
        return rejectWithValue({ message: "Cab details not found." });
      }

      return {
        cab,
        message: response?.data?.message || null,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to fetch cab details" }
      );
    }
  }
);

export const createCabBooking = createAsyncThunk(
  "cab/createCabBooking",
  async (payload = {}, { rejectWithValue }) => {
    try {
      const bookingPayload = sanitizeCabBookingPayload(payload);

      if (!bookingPayload.carId) {
        return rejectWithValue({ message: "Car id is required." });
      }
      if (!bookingPayload.userId) {
        return rejectWithValue({ message: "User id is required." });
      }
      if (!bookingPayload.bookedBy) {
        return rejectWithValue({ message: "Booked by is required." });
      }
      if (!bookingPayload.customerMobile) {
        return rejectWithValue({ message: "Customer mobile is required." });
      }
      if (!bookingPayload.customerEmail) {
        return rejectWithValue({ message: "Customer email is required." });
      }
      if (!bookingPayload.vehicleNumber) {
        return rejectWithValue({ message: "Vehicle number is required." });
      }
      if (!bookingPayload.pickupP) {
        return rejectWithValue({ message: "Pickup location is required." });
      }
      if (!bookingPayload.dropP) {
        return rejectWithValue({ message: "Drop location is required." });
      }
      if (!bookingPayload.pickupD) {
        return rejectWithValue({ message: "Pickup date is required." });
      }
      if (!bookingPayload.dropD) {
        return rejectWithValue({ message: "Drop date is required." });
      }
      if (
        String(bookingPayload.sharingType || "").toLowerCase() === "shared" &&
        (!Array.isArray(bookingPayload.seats) || bookingPayload.seats.length === 0)
      ) {
        return rejectWithValue({ message: "Seat id(s) required for shared booking." });
      }

      const response = await api.post("/travel//create-travel/booking", bookingPayload);
      return response?.data || {};
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to create cab booking" }
      );
    }
  }
);

export const fetchUserCabBookings = createAsyncThunk(
  "cab/fetchUserCabBookings",
  async (payload = {}, { rejectWithValue }) => {
    try {
      const rawUserId =
        payload && typeof payload === "object" ? payload?.userId : payload;
      const userId = sanitizeUserId(rawUserId);
      if (!userId) {
        return rejectWithValue({ message: "User id is required." });
      }

      const queryParams = sanitizeCabFilterParams({
        page: payload?.page,
        limit: payload?.limit,
        selectedStatus: payload?.selectedStatus,
      });

      const response = await api.get(`/travel/get-bookings-by/user/${userId}`, {
        params: queryParams,
      });

      return {
        items: normalizeCabBookingList(response?.data),
        message: response?.data?.message || null,
        pagination:
          response?.data?.pagination ||
          response?.data?.meta ||
          response?.data?.data?.pagination ||
          null,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to fetch cab bookings" }
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
    selectedCab: null,
    selectedCabStatus: "idle",
    selectedCabError: null,
    cabBookingStatus: "idle",
    cabBookingError: null,
    cabBookingData: null,
    userCabBookings: [],
    userCabBookingsStatus: "idle",
    userCabBookingsError: null,
    userCabBookingsPagination: null,
  },
  reducers: {
    resetCabState: (state) => {
      state.items = [];
      state.status = "idle";
      state.error = null;
      state.message = null;
      state.selectedCab = null;
      state.selectedCabStatus = "idle";
      state.selectedCabError = null;
      state.cabBookingStatus = "idle";
      state.cabBookingError = null;
      state.cabBookingData = null;
      state.userCabBookings = [];
      state.userCabBookingsStatus = "idle";
      state.userCabBookingsError = null;
      state.userCabBookingsPagination = null;
    },
    resetSelectedCab: (state) => {
      state.selectedCab = null;
      state.selectedCabStatus = "idle";
      state.selectedCabError = null;
    },
    resetCabBookingState: (state) => {
      state.cabBookingStatus = "idle";
      state.cabBookingError = null;
      state.cabBookingData = null;
    },
    resetUserCabBookings: (state) => {
      state.userCabBookings = [];
      state.userCabBookingsStatus = "idle";
      state.userCabBookingsError = null;
      state.userCabBookingsPagination = null;
    }
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
      })
      .addCase(filterCabsByQuery.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(filterCabsByQuery.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.message = action.payload?.message || null;
      })
      .addCase(filterCabsByQuery.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Failed to filter cabs" };
        state.items = [];
      })
      .addCase(fetchCabById.pending, (state) => {
        state.selectedCabStatus = "loading";
        state.selectedCabError = null;
      })
      .addCase(fetchCabById.fulfilled, (state, action) => {
        state.selectedCabStatus = "succeeded";
        state.selectedCab = action.payload?.cab || null;
      })
      .addCase(fetchCabById.rejected, (state, action) => {
        state.selectedCabStatus = "failed";
        state.selectedCabError = action.payload || { message: "Failed to fetch cab details" };
        state.selectedCab = null;
      })
      .addCase(createCabBooking.pending, (state) => {
        state.cabBookingStatus = "loading";
        state.cabBookingError = null;
      })
      .addCase(createCabBooking.fulfilled, (state, action) => {
        state.cabBookingStatus = "succeeded";
        state.cabBookingData = action.payload || null;
      })
      .addCase(createCabBooking.rejected, (state, action) => {
        state.cabBookingStatus = "failed";
        state.cabBookingError = action.payload || { message: "Failed to create cab booking" };
      })
      .addCase(fetchUserCabBookings.pending, (state) => {
        state.userCabBookingsStatus = "loading";
        state.userCabBookingsError = null;
      })
      .addCase(fetchUserCabBookings.fulfilled, (state, action) => {
        state.userCabBookingsStatus = "succeeded";
        state.userCabBookings = Array.isArray(action.payload?.items) ? action.payload.items : [];
        state.userCabBookingsPagination = action.payload?.pagination || null;
      })
      .addCase(fetchUserCabBookings.rejected, (state, action) => {
        state.userCabBookingsStatus = "failed";
        state.userCabBookingsError = action.payload || { message: "Failed to fetch cab bookings" };
        state.userCabBookings = [];
        state.userCabBookingsPagination = null;
      });
  },
});

export const { resetCabState, resetSelectedCab, resetCabBookingState, resetUserCabBookings } = cabSlice.actions;
export default cabSlice.reducer;
