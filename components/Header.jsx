import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Header = ({
  showHero = true,
  compact = false,
  subtitle = "Welcome back!",
  title = "Find Deals on Hotels",
  brandText = "HotelRoomsStay",
  showBrand = true,
  showBack = false,
  leftTitle = "",
  onBackPress = () => {},
}) => {
  const topPadding =
    Platform.OS === "android"
      ? (StatusBar.currentHeight || 0) + (compact ? 8 : 12)
      : compact
        ? 40
        : 60;

  return (
    <View
      className={`bg-[#0d3b8f] shadow-lg z-10 ${
        compact ? "px-4 rounded-b-[22px] pb-3" : "px-6 rounded-b-[32px] pb-8"
      }`}
      style={{ paddingTop: topPadding }}
    >
      {/* Top Bar */}
      <View
        className={`flex-row justify-between items-center ${showHero ? "mb-8" : "mb-0"}`}
      >
        {showBack ? (
          <View className="flex-row items-center">
            <TouchableOpacity
              className="w-10 h-10 bg-white/10 rounded-full items-center justify-center border border-white/20 mr-2"
              activeOpacity={0.7}
              onPress={onBackPress}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-bold tracking-wide">
              {leftTitle || "Profile Settings"}
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center">
            <View
              className={`bg-white rounded-xl items-center justify-center shadow-md mr-3 ${
                compact ? "w-9 h-9" : "w-10 h-10"
              }`}
            >
              <Text
                className={`text-[#0d3b8f] font-black ${compact ? "text-xl" : "text-2xl"}`}
              >
                H
              </Text>
            </View>
            {showBrand && (
              <Text
                className={`text-white font-bold tracking-wide ${compact ? "text-base" : "text-lg"}`}
              >
                {brandText}
              </Text>
            )}
          </View>
        )}

        {/* Right Actions */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="w-10 h-10 bg-white/10 rounded-full items-center justify-center border border-white/20"
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            className="w-10 h-10 bg-white/10 rounded-full items-center justify-center border border-white/20"
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Welcome Text */}
      {showHero && (
        <View className="mb-2">
          <Text className="text-blue-200 text-sm font-semibold mb-1 tracking-wide">
            {subtitle}
          </Text>
          <Text className="text-white text-[28px] font-extrabold shadow-sm leading-tight">
            {title}
          </Text>
        </View>
      )}
    </View>
  );
};

export default Header;
