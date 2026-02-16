import React from "react";
import { View } from "react-native";

export default function HomeScreenFrontHotelsSkeleton() {
  return (
    <View className="w-[270px] mr-4 bg-white rounded-[22px] overflow-hidden border border-slate-100">
      <View className="w-full h-40 bg-slate-200" />
      <View className="p-3">
        <View className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
        <View className="h-3 bg-slate-200 rounded w-1/2 mb-3" />
        <View className="h-4 bg-slate-200 rounded w-1/3" />
      </View>
    </View>
  );
}
