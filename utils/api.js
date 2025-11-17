import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { baseURL as url } from "./baseUrl";

const api = axios.create({
  baseURL: url,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

export const getAccessToken = () => SecureStore.getItemAsync("rsToken");

api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
