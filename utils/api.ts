import axios from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { url } from "./url";

const api = axios.create({
  baseURL: url,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

let cachedUserId: string | null = null;

const getAccessToken = () => SecureStore.getItemAsync("accessToken");
const getRefreshToken = () => SecureStore.getItemAsync("refreshToken");
const getUserId = () => cachedUserId;

const setAccessToken = (token: string) =>
  SecureStore.setItemAsync("accessToken", token);
const setRefreshToken = (token: string) =>
  SecureStore.setItemAsync("refreshToken", token);

const setUserId = async (userId: string) => {
  cachedUserId = userId;
  await SecureStore.setItemAsync("userId", userId);
};

const loadUserId = async () => {
  const storedUserId = await SecureStore.getItemAsync("userId");
  if (storedUserId) {
    cachedUserId = storedUserId;
  }
};

const clearTokens = async () => {
  cachedUserId = null;
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");
  await SecureStore.deleteItemAsync("userId");
};

const parseJwtPayload = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
};

loadUserId();

api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      const payload = parseJwtPayload(token);
      if (payload?.userId) {
        await setUserId(payload.userId);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token as string);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url?.includes("/refresh-token")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          await clearTokens();
          router.replace("/login");
          return Promise.reject(error);
        }

        const { data } = await axios.post(
          `${url}/email/auth/refresh-token`,
          { token: refreshToken },
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!data?.accessToken) {
          throw new Error("Invalid refresh response");
        }

        await setAccessToken(data.accessToken);

        const payload = parseJwtPayload(data.accessToken);
        if (payload?.userId) {
          await setUserId(payload.userId);
        }

        processQueue(null, data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        await clearTokens();
        router.replace("/login");
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { clearTokens, setAccessToken, setRefreshToken, getUserId };