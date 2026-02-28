import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Header from "../components/Header";
import api from "../utils/api";
import { getUserId } from "../utils/credentials";

const getNotificationId = (item) =>
  String(item?._id || item?.id || item?.notificationId || "").trim();

const getEventIcon = (eventType) => {
  const type = String(eventType || "").toLowerCase();
  if (type.includes("coupon")) return { name: "pricetag", color: "#2563eb" };
  if (type.includes("booking"))
    return { name: "checkmark-circle", color: "#059669" };
  if (type.includes("complaint"))
    return { name: "chatbubble-ellipses", color: "#d97706" };
  if (type.includes("password"))
    return { name: "lock-closed", color: "#7c3aed" };
  return { name: "notifications", color: "#be4a6a" };
};

const resolveSeen = (item, userId) => {
  if (typeof item?.seen === "boolean") return item.seen;
  if (!userId || !item?.seenBy || typeof item.seenBy !== "object") return false;
  return Boolean(item.seenBy[String(userId)]);
};

const formatNotificationTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour)
    return `${Math.max(1, Math.floor(diffMs / minute))} min ago`;
  if (diffMs < day) return `${Math.max(1, Math.floor(diffMs / hour))} hr ago`;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function Notifications({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [deletingIds, setDeletingIds] = useState({});
  const [isClearingAll, setIsClearingAll] = useState(false);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Search");
  };

  const fetchNotifications = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadError("");

    try {
      const userId = await getUserId();
      if (!userId) {
        setNotifications([]);
        setCurrentUserId("");
        setLoadError("Please login to view notifications.");
        return;
      }

      setCurrentUserId(userId);
      const response = await api.get(
        `/app/notifications/user/${encodeURIComponent(userId)}`,
      );
      const rawItems = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : [];

      const normalized = rawItems.map((item) => ({
        ...item,
        seen: resolveSeen(item, userId),
      }));
      setNotifications(normalized);
    } catch (error) {
      setLoadError(
        String(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load notifications.",
        ),
      );
    } finally {
      if (refresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  const handleNotificationPress = useCallback(
    async (item) => {
      const notificationId = getNotificationId(item);
      if (!notificationId || !currentUserId || item?.seen) return;

      setNotifications((prev) =>
        prev.map((entry) =>
          getNotificationId(entry) === notificationId
            ? { ...entry, seen: true }
            : entry,
        ),
      );

      try {
        await api.patch(
          `/app/notifications/${encodeURIComponent(notificationId)}/seen/${encodeURIComponent(currentUserId)}`,
          {},
        );
      } catch {
        // Keep local seen state for smoother UX; server state will sync on next fetch.
      }
    },
    [currentUserId],
  );

  const handleDeleteNotification = useCallback(async (item) => {
    const notificationId = getNotificationId(item);
    if (!notificationId) return;

    setActionError("");
    setDeletingIds((prev) => ({ ...prev, [notificationId]: true }));

    try {
      await api.delete(
        `/find/all/by/list/of/user/for/notification/and-delete/user/${encodeURIComponent(notificationId)}`,
      );

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setNotifications((prev) =>
        prev.filter((entry) => getNotificationId(entry) !== notificationId),
      );
    } catch (error) {
      setActionError(
        String(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to clear notification. Please try again.",
        ),
      );
    } finally {
      setDeletingIds((prev) => {
        const next = { ...prev };
        delete next[notificationId];
        return next;
      });
    }
  }, []);

  const handleClearAllNotifications = useCallback(async () => {
    if (isClearingAll) return;

    const ids = notifications
      .map((item) => getNotificationId(item))
      .filter(Boolean);

    if (!ids.length) return;

    setActionError("");
    setIsClearingAll(true);
    setDeletingIds((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = true;
      });
      return next;
    });

    try {
      const responses = await Promise.allSettled(
        ids.map((id) =>
          api.delete(
            `/find/all/by/list/of/user/for/notification/and-delete/user/${encodeURIComponent(id)}`,
          ),
        ),
      );

      const deletedIds = ids.filter(
        (_id, idx) => responses[idx]?.status === "fulfilled",
      );

      if (deletedIds.length) {
        const deletedSet = new Set(deletedIds);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setNotifications((prev) =>
          prev.filter((item) => !deletedSet.has(getNotificationId(item))),
        );
      }

      if (deletedIds.length !== ids.length) {
        setActionError(
          "Some notifications could not be cleared. Please try again.",
        );
      }
    } catch (error) {
      setActionError(
        String(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to clear notifications. Please try again.",
        ),
      );
    } finally {
      setDeletingIds((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      setIsClearingAll(false);
    }
  }, [isClearingAll, notifications]);

  return (
    <SafeAreaView
      className="flex-1 bg-slate-50"
      edges={["left", "right", "bottom"]}
    >
      <Header
        compact
        showHero={false}
        showBrand={false}
        showBack
        showNotification={false}
        leftTitle="Notifications"
        onBackPress={handleBack}
      />

      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchNotifications({ refresh: true })}
            tintColor="#0d3b8f"
            colors={["#0d3b8f"]}
          />
        }
      >
        {!!actionError && (
          <View className="mb-3 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            <Text className="text-[12px] font-semibold text-rose-700">
              {actionError}
            </Text>
          </View>
        )}

        {!!notifications.length && (
          <View className="mb-3 flex-row items-center justify-end">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleClearAllNotifications}
              disabled={isClearingAll}
              className={`h-9 px-3 rounded-full border flex-row items-center ${
                isClearingAll
                  ? "bg-slate-100 border-slate-200"
                  : "bg-white border-slate-300"
              }`}
            >
              {isClearingAll ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={14} color="#475569" />
                  <Text className="ml-1.5 text-[12px] font-bold text-slate-600">
                    Clear all
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <View className="flex-1 items-center justify-center py-16">
            <ActivityIndicator size="small" color="#0d3b8f" />
            <Text className="text-[12px] font-semibold text-slate-500 mt-2">
              Loading notifications...
            </Text>
          </View>
        ) : loadError ? (
          <View className="bg-white rounded-2xl border border-rose-200 p-4">
            <Text className="text-[13px] font-bold text-rose-600">
              {loadError}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => fetchNotifications({ refresh: true })}
              className="mt-3 self-start px-4 py-2 rounded-xl bg-[#0d3b8f]"
            >
              <Text className="text-white text-[12px] font-extrabold">
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : notifications.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Ionicons
              name="notifications-off-outline"
              size={38}
              color="#94a3b8"
            />
            <Text className="text-[14px] font-bold text-slate-700 mt-3">
              No notifications yet
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => fetchNotifications({ refresh: true })}
              className={`mt-4 w-11 h-11 rounded-full items-center justify-center ${
                isRefreshing ? "bg-slate-300" : "bg-[#0d3b8f]"
              }`}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <ActivityIndicator
                  size="small"
                  color="rgba(255,255,255,0.82)"
                />
              ) : (
                <Ionicons
                  name="refresh"
                  size={20}
                  color="rgba(255,255,255,0.82)"
                />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          notifications.map((item) => {
            const id =
              getNotificationId(item) ||
              `${item?.createdAt || ""}-${item?.name || ""}`;
            const notificationId = getNotificationId(item);
            const icon = getEventIcon(item?.eventType);
            const seen = Boolean(item?.seen);
            const isDeleting = Boolean(
              notificationId && deletingIds[notificationId],
            );

            return (
              <TouchableOpacity
                key={id}
                activeOpacity={0.85}
                onPress={() => handleNotificationPress(item)}
                className={`mb-3 rounded-2xl border p-4 ${seen ? "bg-white border-slate-200" : "bg-blue-50 border-blue-200"}`}
              >
                <View className="flex-row items-start">
                  <View
                    className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${seen ? "bg-slate-100" : "bg-blue-100"}`}
                  >
                    <Ionicons name={icon.name} size={18} color={icon.color} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[15px] font-black text-slate-900 flex-1 pr-2">
                        {String(item?.name || "Notification")}
                      </Text>
                      <View className="flex-row items-center">
                        {!seen && (
                          <View className="w-2 h-2 rounded-full bg-blue-600 mr-2" />
                        )}
                        {!!notificationId && (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            disabled={isDeleting}
                            onPress={(event) => {
                              event?.stopPropagation?.();
                              handleDeleteNotification(item);
                            }}
                            className={`w-7 h-7 rounded-full items-center justify-center ${
                              isDeleting ? "bg-slate-200" : "bg-slate-100"
                            }`}
                          >
                            {isDeleting ? (
                              <ActivityIndicator size="small" color="#475569" />
                            ) : (
                              <Ionicons
                                name="close"
                                size={16}
                                color="#475569"
                              />
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <Text className="text-[12px] font-medium text-slate-600 mt-1">
                      {String(item?.message || "")}
                    </Text>
                    <Text className="text-[11px] font-semibold text-slate-400 mt-2">
                      {formatNotificationTime(item?.createdAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {!!notifications.length && (
          <View className="items-center py-2">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => fetchNotifications({ refresh: true })}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                isRefreshing ? "bg-slate-300" : "bg-[#0d3b8f]"
              }`}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <ActivityIndicator
                  size="small"
                  color="rgba(255,255,255,0.82)"
                />
              ) : (
                <Ionicons
                  name="refresh"
                  size={20}
                  color="rgba(255,255,255,0.82)"
                />
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
