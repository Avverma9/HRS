import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const readFirstAvailable = async (keys, reader) => {
  for (const key of keys) {
    const value = await reader(key);
    if (value) return value;
  }
  return null;
};

const sanitizeUserId = (value) => String(value || "").trim().replace(/[<>\s]/g, "");

export const getUserId = async () => {
  const secureValue = await readFirstAvailable(["userId", "rsUserId"], (key) =>
    SecureStore.getItemAsync(key)
  );
  if (secureValue) return sanitizeUserId(secureValue);
  const asyncValue = await readFirstAvailable(["userId", "rsUserId"], (key) => AsyncStorage.getItem(key));
  return sanitizeUserId(asyncValue);
};

export const getUserEmail = async () => {
  const secureValue = await SecureStore.getItemAsync("roomsstayUserEmail");
  if (secureValue) return secureValue;
  return AsyncStorage.getItem("roomsstayUserEmail");
};

export const getToken = async () => {
  const secureValue = await SecureStore.getItemAsync("rsToken");
  if (secureValue) return secureValue;
  return AsyncStorage.getItem("rsToken");
};

export const saveAuthSession = async ({ token, userId, email }) => {
  const safeToken = token ? String(token) : "";
  const safeUserId = sanitizeUserId(userId);
  const safeEmail = email ? String(email) : "";

  const tasks = [];
  if (safeToken) {
    tasks.push(SecureStore.setItemAsync("rsToken", safeToken));
    tasks.push(AsyncStorage.setItem("rsToken", safeToken));
  }
  if (safeUserId) {
    tasks.push(SecureStore.setItemAsync("userId", safeUserId));
    tasks.push(SecureStore.setItemAsync("rsUserId", safeUserId));
    tasks.push(AsyncStorage.setItem("userId", safeUserId));
    tasks.push(AsyncStorage.setItem("rsUserId", safeUserId));
  }
  if (safeEmail) {
    tasks.push(SecureStore.setItemAsync("roomsstayUserEmail", safeEmail));
    tasks.push(AsyncStorage.setItem("roomsstayUserEmail", safeEmail));
  }

  await Promise.all(tasks);
};

export const clearAuthSession = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync("rsToken"),
    SecureStore.deleteItemAsync("userId"),
    SecureStore.deleteItemAsync("rsUserId"),
    SecureStore.deleteItemAsync("roomsstayUserEmail"),
    AsyncStorage.multiRemove(["rsToken", "userId", "rsUserId", "roomsstayUserEmail"]),
  ]);
};
