import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const PolicyScreen = ({ navigation, route }) => {
  const hotelName = String(route?.params?.hotelName || "Hotel").trim();

  const policyItems = useMemo(() => {
    const incoming = route?.params?.policyItems;
    if (!Array.isArray(incoming)) return [];
    return incoming.filter((item) => item?.label && item?.value);
  }, [route?.params?.policyItems]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-1">
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1 px-3">
          <Text className="text-base font-extrabold text-slate-900 text-center">
            All Policies
          </Text>
          <Text numberOfLines={1} className="text-[11px] text-slate-500 text-center mt-0.5">
            {hotelName}
          </Text>
        </View>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {policyItems.length === 0 ? (
          <View className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm">
            <Text className="text-xs text-slate-500">No policies available.</Text>
          </View>
        ) : (
          <View className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm">
            {policyItems.map((item, idx) => (
              <View
                key={`${item.key || "policy"}-${idx}`}
                className={idx === 0 ? "" : "pt-4 mt-4 border-t border-slate-100"}
              >
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name={item.icon || "document-text-outline"} size={15} color="#64748b" />
                  <Text className="text-xs font-bold text-slate-700 ml-2">{item.label}</Text>
                </View>
                <Text className="text-xs text-slate-600 leading-5">{item.value}</Text>
              </View>
            ))}
          </View>
        )}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PolicyScreen;
