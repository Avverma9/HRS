import React from "react";
import { View } from "react-native";
import SkeletonShimmer from "./SkeletonShimmer";

export function HotelCardSkeleton() {
  return (
    <View className="bg-white rounded-[16px] mb-4 overflow-hidden border border-slate-200 shadow-sm mx-4">
      <SkeletonShimmer height={200} width="100%" radius={0} />
      <View className="p-3">
        <SkeletonShimmer height={16} width="60%" radius={8} />
        <SkeletonShimmer height={12} width="40%" radius={8} style={{ marginTop: 8 }} />
        <SkeletonShimmer height={10} width="30%" radius={8} style={{ marginTop: 10 }} />
        <View className="flex-row items-center justify-between mt-4">
          <SkeletonShimmer height={20} width="40%" radius={8} />
          <SkeletonShimmer height={32} width={70} radius={12} />
        </View>
      </View>
    </View>
  );
}
