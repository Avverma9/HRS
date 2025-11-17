import * as SecureStore from "expo-secure-store";

// SecureStore methods are async. Export helper functions that return promises
// instead of calling them at module-evaluation time.
export const getUserId = async () => await SecureStore.getItemAsync("userId");
export const getUserEmail = async () =>
  await SecureStore.getItemAsync("roomsstayUserEmail");
export const getToken = async () => await SecureStore.getItemAsync("rsToken");

// Convenience synchronous-like accessor (returns Promise)
// Usage: const token = await getToken();
