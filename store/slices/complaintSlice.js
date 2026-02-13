import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";
import { getUserId } from "../../utils/credentials";

const normalizeComplaintResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.complaints)) return payload.complaints;
  return [];
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

const complaintSlice = createSlice({
  name: "complaints",
  initialState: {
    items: [],
    status: "idle",
    error: null,
    chatStatus: "idle",
    chatError: null,
  },
  reducers: {
    resetComplaintsState: (state) => {
      state.items = [];
      state.status = "idle";
      state.error = null;
      state.chatStatus = "idle";
      state.chatError = null;
    },
    resetComplaintChatState: (state) => {
      state.chatStatus = "idle";
      state.chatError = null;
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
      });
  },
});

export const { resetComplaintsState, resetComplaintChatState } = complaintSlice.actions;
export default complaintSlice.reducer;
