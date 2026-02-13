import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../utils/api";
import { getUserId } from "../../utils/credentials";

const getFileNameFromUri = (uri) => {
  if (!uri) return `profile_${Date.now()}.jpg`;
  const split = String(uri).split("/");
  return split[split.length - 1] || `profile_${Date.now()}.jpg`;
};

const getMimeType = (uri) => {
  const extension = String(uri || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic" || extension === "heif") return "image/heic";
  return "image/jpeg";
};

const normalizeImageAsset = (asset) => {
  if (!asset) return null;
  if (typeof asset === "string") return null;
  if (!asset?.uri) return null;

  return {
    uri: asset.uri,
    name: asset.name || asset.fileName || getFileNameFromUri(asset.uri),
    type: asset.type || asset.mimeType || getMimeType(asset.uri),
  };
};

export const updateUserProfile = createAsyncThunk(
  "profileUpdate/updateUserProfile",
  async (payload = {}, { rejectWithValue }) => {
    try {
      const userId = payload?.userId || (await getUserId());
      const formData = new FormData();

      const fields = {
        uid: payload?.uid,
        userId,
        userName: payload?.userName,
        email: payload?.email,
        mobile: payload?.mobile,
        address: payload?.address,
        password: payload?.password,
      };

      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          formData.append(key, String(value).trim());
        }
      });

      const images = Array.isArray(payload?.images) ? payload.images : [];
      images.forEach((image) => {
        const normalized = normalizeImageAsset(image);
        if (!normalized) return;
        formData.append("images", normalized);
      });

      const response = await api.put("/update", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return response?.data || null;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || { message: error?.message || "Unable to update profile" }
      );
    }
  }
);

const profileUpdateSlice = createSlice({
  name: "profileUpdate",
  initialState: {
    status: "idle",
    error: null,
    message: "",
    data: null,
  },
  reducers: {
    resetProfileUpdateState: (state) => {
      state.status = "idle";
      state.error = null;
      state.message = "";
      state.data = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.message = "";
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.data = action.payload;
        state.message = action.payload?.message || "Profile updated successfully";
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || { message: "Profile update failed" };
        state.message = "";
      });
  },
});

export const { resetProfileUpdateState } = profileUpdateSlice.actions;
export default profileUpdateSlice.reducer;
