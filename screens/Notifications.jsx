import React, { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Header from "../components/Header";

export default function Notifications({ navigation }) {
  const notifications = useMemo(
    () => [
      {
        id: "n1",
        title: "Booking Confirmed",
        message: "Your hotel booking has been confirmed successfully.",
        time: "Just now",
        icon: "checkmark-circle",
        iconColor: "#059669",
      },
      {
        id: "n2",
        title: "Price Alert",
        message: "Cab fare dropped on your frequent route.",
        time: "20 min ago",
        icon: "pricetag",
        iconColor: "#2563eb",
      },
      {
        id: "n3",
        title: "Offer Unlocked",
        message: "A new coupon is available in your profile.",
        time: "Today",
        icon: "gift",
        iconColor: "#be4a6a",
      },
    ],
    []
  );

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Search");
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["left", "right", "bottom"]}>
      <Header
        compact
        showHero={false}
        showBrand={false}
        showBack
        showNotification={false}
        leftTitle="Notifications"
        onBackPress={handleBack}
      />

      <ScrollView className="flex-1 px-4 pt-3" contentContainerStyle={{ paddingBottom: 24 }}>
        {notifications.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.85}
            className="mb-3 bg-white rounded-2xl border border-slate-200 p-4"
          >
            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3">
                <Ionicons name={item.icon} size={18} color={item.iconColor} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-black text-slate-900">{item.title}</Text>
                <Text className="text-[12px] font-medium text-slate-600 mt-1">{item.message}</Text>
                <Text className="text-[11px] font-semibold text-slate-400 mt-2">{item.time}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
