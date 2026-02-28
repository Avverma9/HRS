import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../utils/api";
import { getUserId } from "../utils/credentials";
import { router } from "../utils/navigation";

const HEADER_BG = "#f7a78f";
const HEADER_TEXT = "#4f2b24";
const HEADER_SUBTEXT = "#7c4439";
const ICON_TINT = "#5f3129";
const BRAND_ACCENT = "#be4a6a";
const NOTIFICATION_POLL_MS = 20000;

const extractNotificationList = (payload) =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

const resolveSeenState = (item, userId) => {
  if (typeof item?.seen === "boolean") return item.seen;
  const seenBy = item?.seenBy;
  if (seenBy && typeof seenBy === "object") {
    return Boolean(seenBy[String(userId)]);
  }
  return true;
};

const Header = ({
  showHero = true,
  compact = false,
  subtitle = "Welcome back!",
  title = "Find Deals on Hotels",
  brandText = "HotelRoomsStay",
  showBrand = true,
  showLogo = true,
  showNotification = true,
  showBack = false,
  leftTitle = "",
  onBackPress = () => {},
  onNotificationPress,
}) => {
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const unreadPulse = useRef(new Animated.Value(0)).current;
  const topPadding =
    Platform.OS === "android"
      ? (StatusBar.currentHeight || 0) + (compact ? 6 : 10)
      : compact
        ? 30
        : 50;

  const handleNotificationPress = () => {
    if (typeof onNotificationPress === "function") {
      onNotificationPress();
      return;
    }
    router.navigate("Notifications");
  };

  useEffect(() => {
    if (!showNotification) return undefined;

    let cancelled = false;

    const checkUnreadNotifications = async () => {
      try {
        const userId = await getUserId();
        if (!userId) {
          if (!cancelled) setHasUnreadNotifications(false);
          return;
        }

        const response = await api.get(
          `/app/notifications/user/${encodeURIComponent(userId)}`,
        );
        const notifications = extractNotificationList(response?.data);
        const hasUnread = notifications.some(
          (item) => !resolveSeenState(item, userId),
        );
        if (!cancelled) setHasUnreadNotifications(hasUnread);
      } catch {
        if (!cancelled) setHasUnreadNotifications(false);
      }
    };

    checkUnreadNotifications();
    const intervalId = setInterval(
      checkUnreadNotifications,
      NOTIFICATION_POLL_MS,
    );

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [showNotification]);

  useEffect(() => {
    if (!showNotification || !hasUnreadNotifications) {
      unreadPulse.stopAnimation();
      unreadPulse.setValue(0);
      return undefined;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(unreadPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(unreadPulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [hasUnreadNotifications, showNotification, unreadPulse]);

  return (
    <View
      className={`shadow-lg z-10 ${
        compact ? "px-4 rounded-b-[22px] pb-3" : "px-6 rounded-b-[32px] pb-8"
      }`}
      style={{ paddingTop: topPadding, backgroundColor: HEADER_BG }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={HEADER_BG} />
      {/* Top Bar */}
      <View
        className={`flex-row justify-between items-center ${showHero ? "mb-8" : "mb-0"}`}
      >
        {showBack ? (
          <View className="flex-row items-center">
            <TouchableOpacity
              className="w-10 h-10 rounded-full items-center justify-center border mr-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.45)",
                borderColor: "rgba(79,43,36,0.12)",
              }}
              activeOpacity={0.7}
              onPress={onBackPress}
            >
              <Ionicons name="arrow-back" size={20} color={ICON_TINT} />
            </TouchableOpacity>
            <Text
              className="text-lg font-bold tracking-wide"
              style={{ color: HEADER_TEXT }}
            >
              {leftTitle || "Profile Settings"}
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center">
            {showLogo ? (
              <>
                <View
                  className={`bg-white rounded-xl items-center justify-center shadow-md mr-3 ${
                    compact ? "w-9 h-9" : "w-10 h-10"
                  }`}
                >
                  <Text
                    className={`font-black ${compact ? "text-xl" : "text-2xl"}`}
                    style={{ color: BRAND_ACCENT }}
                  >
                    H
                  </Text>
                </View>
                {showBrand && (
                  <Text
                    className={`font-bold tracking-wide ${compact ? "text-base" : "text-lg"}`}
                    style={{ color: HEADER_TEXT }}
                  >
                    {brandText}
                  </Text>
                )}
              </>
            ) : (
              <Text
                className={`font-bold tracking-wide ${compact ? "text-base" : "text-lg"}`}
                style={{ color: HEADER_TEXT }}
              >
                {leftTitle || title}
              </Text>
            )}
          </View>
        )}

        {/* Right Actions */}
        {showNotification ? (
          <View className="flex-row">
            <View className="relative">
              <TouchableOpacity
                className="w-10 h-10 rounded-full items-center justify-center border"
                style={{
                  backgroundColor: "rgba(255,255,255,0.45)",
                  borderColor: "rgba(79,43,36,0.12)",
                }}
                activeOpacity={0.7}
                onPress={handleNotificationPress}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={ICON_TINT}
                />
              </TouchableOpacity>

              {hasUnreadNotifications && (
                <>
                  <Animated.View
                    pointerEvents="none"
                    className="absolute rounded-full"
                    style={{
                      width: 14,
                      height: 14,
                      top: -2,
                      right: -2,
                      backgroundColor: "rgba(239,68,68,0.35)",
                      opacity: unreadPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 0],
                      }),
                      transform: [
                        {
                          scale: unreadPulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.9],
                          }),
                        },
                      ],
                    }}
                  />
                  <View
                    className="absolute rounded-full border border-white"
                    style={{
                      width: 10,
                      height: 10,
                      top: -1,
                      right: -1,
                      backgroundColor: "#ef4444",
                    }}
                  />
                </>
              )}
            </View>
          </View>
        ) : (
          <View className="w-10 h-10" />
        )}
      </View>

      {/* Welcome Text */}
      {showHero && (
        <View className="mb-2">
          <Text
            className="text-sm font-semibold mb-1 tracking-wide"
            style={{ color: HEADER_SUBTEXT }}
          >
            {subtitle}
          </Text>
          <Text
            className="text-[28px] font-extrabold shadow-sm leading-tight"
            style={{ color: HEADER_TEXT }}
          >
            {title}
          </Text>
        </View>
      )}
    </View>
  );
};

export default Header;
