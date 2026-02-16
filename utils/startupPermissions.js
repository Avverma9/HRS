import { PermissionsAndroid, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

const STARTUP_PERMISSION_SCHEMA_VERSION = "v2";
const STARTUP_PERMISSION_KEY = `startup_permissions_requested_${STARTUP_PERMISSION_SCHEMA_VERSION}`;
const STARTUP_PERMISSION_RESULT_KEY = `startup_permissions_result_${STARTUP_PERMISSION_SCHEMA_VERSION}`;
const LEGACY_KEYS = ["startup_permissions_requested_v1", "startup_permissions_result_v1"];
const PERMISSION_TIMEOUT_MS = 12000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async (promiseFactory, fallbackValue, timeoutMs = PERMISSION_TIMEOUT_MS) => {
  try {
    return await Promise.race([
      Promise.resolve().then(promiseFactory),
      wait(timeoutMs).then(() => fallbackValue),
    ]);
  } catch {
    return fallbackValue;
  }
};

const safeRequestLocation = async () => {
  try {
    const response = await Location.requestForegroundPermissionsAsync();
    return response?.status || "unknown";
  } catch {
    return "error";
  }
};

const safeRequestMediaLibrary = async () => {
  try {
    const response = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return response?.status || "unknown";
  } catch {
    return "error";
  }
};

const safeRequestAndroidPermissions = async () => {
  if (Platform.OS !== "android") {
    return { contacts: "not_applicable", phone: "not_applicable" };
  }

  const requestPermission = async (permissionName) => {
    if (!permissionName) return "unavailable";
    try {
      const response = await PermissionsAndroid.request(permissionName);
      return response || "unknown";
    } catch {
      return "error";
    }
  };

  const contactsPermission = PermissionsAndroid.PERMISSIONS.READ_CONTACTS;
  const contacts = await withTimeout(
    () => requestPermission(contactsPermission),
    "timeout"
  );

  // Android 8+ supports READ_PHONE_NUMBERS. Fallback to READ_PHONE_STATE.
  const phonePermissionName =
    PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS ||
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE;
  const phone = await withTimeout(
    () => requestPermission(phonePermissionName),
    "timeout"
  );

  return { contacts, phone };
};

export async function resetStartupPermissionPromptState() {
  try {
    await AsyncStorage.multiRemove([
      STARTUP_PERMISSION_KEY,
      STARTUP_PERMISSION_RESULT_KEY,
      ...LEGACY_KEYS,
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function requestStartupPermissionsIfNeeded() {
  try {
    // Remove older marker keys so prompts can be shown again after schema updates.
    await AsyncStorage.multiRemove(LEGACY_KEYS);

    const alreadyRequested = await AsyncStorage.getItem(STARTUP_PERMISSION_KEY);
    if (alreadyRequested === "1" || alreadyRequested === "in_progress") {
      return { skipped: true };
    }
    await AsyncStorage.setItem(STARTUP_PERMISSION_KEY, "in_progress");

    // Request sequentially to avoid OS prompt collisions on first launch.
    const location = await withTimeout(safeRequestLocation, "timeout");
    const mediaLibrary = await withTimeout(safeRequestMediaLibrary, "timeout");
    const androidPermissions = await withTimeout(
      safeRequestAndroidPermissions,
      { contacts: "timeout", phone: "timeout" }
    );

    const result = {
      requestedAt: new Date().toISOString(),
      location,
      mediaLibrary,
      contacts: androidPermissions.contacts,
      phone: androidPermissions.phone,
    };

    await AsyncStorage.multiSet([
      [STARTUP_PERMISSION_KEY, "1"],
      [STARTUP_PERMISSION_RESULT_KEY, JSON.stringify(result)],
    ]);

    return { skipped: false, ...result };
  } catch {
    try {
      await AsyncStorage.multiSet([
        [STARTUP_PERMISSION_KEY, "1"],
        [
          STARTUP_PERMISSION_RESULT_KEY,
          JSON.stringify({ requestedAt: new Date().toISOString(), error: true }),
        ],
      ]);
    } catch {
      // no-op
    }
    return { skipped: false, error: true };
  }
}
