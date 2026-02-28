import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";
import { getUserId } from "../../utils/credentials";

const sanitizeUserId = (value) => String(value || "").trim().replace(/[<>\s]/g, "");
const COMPLAINT_CREATE_PATHS = [
  "/create-a-complaint/on/hotel",
  "/api/create-a-complaint/on/hotel",
];
const ALLOWED_REGARDING_VALUES = new Set(["booking", "hotel", "website"]);

const normalizeComplaintResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.complaints)) return payload.complaints;
  return [];
};

const shouldRetryWithAltPath = (error) => {
  const statusCode = Number(error?.response?.status || 0);
  const message = String(error?.response?.data?.message || error?.message || "").toLowerCase();
  return statusCode === 404 || message.includes("cannot post") || message.includes("cannot get");
};

const postHotelComplaint = async (payload, config = {}) => {
  let lastError = null;

  for (let index = 0; index < COMPLAINT_CREATE_PATHS.length; index += 1) {
    const path = COMPLAINT_CREATE_PATHS[index];
    try {
      return await api.post(path, payload, config);
    } catch (error) {
      lastError = error;
      const hasNextPath = index < COMPLAINT_CREATE_PATHS.length - 1;
      if (!hasNextPath || !shouldRetryWithAltPath(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Unable to create complaint");
};

const toUploadFile = (image, index) => {
  if (!image) return null;

  if (typeof image === "string") {
    const uri = image.trim();
    if (!uri) return null;
    return {
      uri,
      name: `complaint-image-${Date.now()}-${index + 1}.jpg`,
      type: "image/jpeg",
    };
  }

  const uri = String(image?.uri || "").trim();
  if (!uri) return null;
  return {
    uri,
    name: image?.name || `complaint-image-${Date.now()}-${index + 1}.jpg`,
    type: image?.type || "image/jpeg",
  };
};

export const fetchUserComplaints = createAsyncThunk(
  "complaints/fetchUserComplaints",
  async (input = {}, { rejectWithValue }) => {
    try {
      const resolvedUserId = input?.userId || (await getUserId());

      if (!resolvedUserId) {
        return rejectWithValue({ message: "Missing userId for complaints." });
      }

      const response = await api.get(`/complaints/${resolvedUserId}`);
      return normalizeComplaintResponse(response?.data);
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to fetch complaints" }
      );
    }
  }
);

export const sendComplaintChat = createAsyncThunk(
  "complaints/sendComplaintChat",
  async ({ complaintId, message, sender, receiver = "Admin" }, { rejectWithValue }) => {
    try {
      if (!complaintId) {
        return rejectWithValue({ message: "Missing complaintId." });
      }
      const text = String(message || "").trim();
      if (!text) {
        return rejectWithValue({ message: "Message is required." });
      }

      const payload = {
        sender: sender || "User",
        receiver,
        content: text,
        message: text,
        text,
      };

      const response = await api.post(`/do/chat-support/${complaintId}`, payload);
      return response?.data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to send message" }
      );
    }
  }
);

export const createHotelComplaint = createAsyncThunk(
  "complaints/createHotelComplaint",
  async (input = {}, { rejectWithValue }) => {
    try {
      const resolvedUserId = sanitizeUserId(input?.userId || (await getUserId()));
      const hotelId = String(input?.hotelId || "").trim();
      const regarding = String(input?.regarding || "").trim();
      const hotelName = String(input?.hotelName || "").trim();
      const hotelEmail = String(input?.hotelEmail || "").trim();
      const bookingId = String(input?.bookingId || "").trim();
      const issue = String(input?.issue || "").trim();
      const status = String(input?.status || "").trim();
      const regardingKey = regarding.toLowerCase();

      if (
        !resolvedUserId ||
        !hotelId ||
        !regarding ||
        !issue
      ) {
        return rejectWithValue({
          message: "Required fields: userId, hotelId, regarding, issue.",
        });
      }

      if (!ALLOWED_REGARDING_VALUES.has(regardingKey)) {
        return rejectWithValue({
          message: "regarding must be one of: Booking, Hotel, Website.",
        });
      }

      const images = Array.isArray(input?.images) ? input.images : [];
      const uploadFiles = images
        .map((image, index) => toUploadFile(image, index))
        .filter(Boolean);

      if (uploadFiles.length > 0) {
        const formData = new FormData();
        formData.append("userId", resolvedUserId);
        formData.append("hotelId", hotelId);
        formData.append("regarding", regarding);
        formData.append("issue", issue);
        if (status) formData.append("status", status);
        if (hotelName) formData.append("hotelName", hotelName);
        if (hotelEmail) formData.append("hotelEmail", hotelEmail);
        if (bookingId) formData.append("bookingId", bookingId);
        uploadFiles.forEach((file) => {
          formData.append("images", file);
        });

        const response = await postHotelComplaint(formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return response?.data || null;
      }

      const response = await postHotelComplaint({
        userId: resolvedUserId,
        hotelId,
        regarding,
        issue,
        ...(status ? { status } : {}),
        ...(hotelName ? { hotelName } : {}),
        ...(hotelEmail ? { hotelEmail } : {}),
        ...(bookingId ? { bookingId } : {}),
      });
      return response?.data || null;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to create complaint" }
      );
    }
  }
);

const complaintSlice = createSlice({
  name: "complaints",
  initialState: {
    items: [],
    status: "idle",
    error: null,
    chatStatus: "idle",
    chatError: null,
    createStatus: "idle",
    createError: null,
    createData: null,
  },
  reducers: {
    resetComplaintsState: (state) => {
      state.items = [];
      state.status = "idle";
      state.error = null;
      state.chatStatus = "idle";
      state.chatError = null;
      state.createStatus = "idle";
      state.createError = null;
      state.createData = null;
    },
    resetComplaintChatState: (state) => {
      state.chatStatus = "idle";
      state.chatError = null;
    },
    resetCreateComplaintState: (state) => {
      state.createStatus = "idle";
      state.createError = null;
      state.createData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserComplaints.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUserComplaints.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchUserComplaints.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Failed to load complaints" };
        state.items = [];
      })
      .addCase(sendComplaintChat.pending, (state) => {
        state.chatStatus = "loading";
        state.chatError = null;
      })
      .addCase(sendComplaintChat.fulfilled, (state) => {
        state.chatStatus = "succeeded";
      })
      .addCase(sendComplaintChat.rejected, (state, action) => {
        state.chatStatus = "failed";
        state.chatError = action.payload || { message: "Failed to send message" };
      })
      .addCase(createHotelComplaint.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(createHotelComplaint.fulfilled, (state, action) => {
        state.createStatus = "succeeded";
        state.createData = action.payload || null;
      })
      .addCase(createHotelComplaint.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload || { message: "Failed to create complaint" };
      });
  },
});

export const { resetComplaintsState, resetComplaintChatState, resetCreateComplaintState } = complaintSlice.actions;
export default complaintSlice.reducer;
