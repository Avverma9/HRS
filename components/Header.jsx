import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const HEADER_BG = "#f7a78f";
const HEADER_TEXT = "#4f2b24";
const HEADER_SUBTEXT = "#7c4439";
const ICON_TINT = "#5f3129";
const BRAND_ACCENT = "#be4a6a";

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
  const navigation = useNavigation();
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
    navigation.navigate("Notifications");
  };

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
              style={{ backgroundColor: "rgba(255,255,255,0.45)", borderColor: "rgba(79,43,36,0.12)" }}
              activeOpacity={0.7}
              onPress={onBackPress}
            >
              <Ionicons name="arrow-back" size={20} color={ICON_TINT} />
            </TouchableOpacity>
            <Text className="text-lg font-bold tracking-wide" style={{ color: HEADER_TEXT }}>
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
            <TouchableOpacity
              className="w-10 h-10 rounded-full items-center justify-center border"
              style={{ backgroundColor: "rgba(255,255,255,0.45)", borderColor: "rgba(79,43,36,0.12)" }}
              activeOpacity={0.7}
              onPress={handleNotificationPress}
            >
              <Ionicons name="notifications-outline" size={20} color={ICON_TINT} />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="w-10 h-10" />
        )}
      </View>

      {/* Welcome Text */}
      {showHero && (
        <View className="mb-2">
          <Text className="text-sm font-semibold mb-1 tracking-wide" style={{ color: HEADER_SUBTEXT }}>
            {subtitle}
          </Text>
          <Text className="text-[28px] font-extrabold shadow-sm leading-tight" style={{ color: HEADER_TEXT }}>
            {title}
          </Text>
        </View>
      )}
    </View>
  );
};

export default Header;
