import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import api from "./api";

const DEFAULT_ANDROID_CHANNEL_ID = "default";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const resolveExpoProjectId = () => {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    undefined
  );
};

export const ensureAndroidNotificationChannel = async () => {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(DEFAULT_ANDROID_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0d3b8f",
    sound: "default",
  });
};

export const registerForPushNotificationsAsync = async () => {
  if (!Device.isDevice) {
    return null;
  }

  await ensureAndroidNotificationChannel();

  const settings = await Notifications.getPermissionsAsync();
  let finalStatus = settings?.status;

  if (finalStatus !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request?.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = resolveExpoProjectId();
  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return tokenResponse?.data || null;
};

export const syncPushTokenWithServer = async ({ userId, pushToken }) => {
  if (!userId || !pushToken) return { ok: false };

  const payload = {
    userId: String(userId),
    pushToken: String(pushToken),
    provider: "expo",
    platform: Platform.OS,
  };

  try {
    await api.post("/app/notifications/register-device", payload);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};

export const resolveNotificationRoute = (response) => {
  const data = response?.notification?.request?.content?.data || {};

  if (typeof data?.screen === "string" && data.screen.trim()) {
    return { name: data.screen.trim(), params: data?.params || undefined };
  }

  return { name: "Notifications", params: undefined };
};
