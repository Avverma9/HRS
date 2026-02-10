import React from "react";
import { View, Text, TouchableOpacity, StatusBar, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Header = () => {
  const topPadding = Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 60;

  return (
    <View
      className="bg-[#0d3b8f] px-6 rounded-b-[32px] shadow-lg z-10 pb-8"
      style={{ paddingTop: topPadding }}
    >
      {/* Top Bar */}
      <View className="flex-row justify-between items-center mb-8">
        
        {/* Logo Section */}
        <View className="flex-row items-center">
            <View className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-md mr-3">
                <Text className="text-[#0d3b8f] text-2xl font-black">H</Text>
            </View>
            <Text className="text-white text-lg font-bold tracking-wide">
                HotelRoomsStay
            </Text>
        </View>

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
                <Ionicons name="person-outline" size={20} color="white" />
             </TouchableOpacity>
        </View>
      </View>

      {/* Welcome Text */}
      <View className="mb-2">
        <Text className="text-blue-200 text-sm font-semibold mb-1 tracking-wide">Welcome back!</Text>
        <Text className="text-white text-[28px] font-extrabold shadow-sm leading-tight">
          Find Deals on Hotels
        </Text>
      </View>
    </View>
  );
};

export default Header;
