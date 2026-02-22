import React from "react";
import { View } from "react-native";
import SkeletonShimmer from "./SkeletonShimmer";

function CabCardSkeleton() {
  return (
    <View className="bg-white rounded-[20px] border border-slate-200 p-3 mb-3.5 shadow-sm elevation-2">
      <View className="flex-row">
        <SkeletonShimmer height={76} width={76} radius={12} />
        <View className="flex-1 ml-3.5">
          <View className="flex-row items-start justify-between">
            <SkeletonShimmer height={16} width="55%" radius={8} />
            <SkeletonShimmer height={12} width={56} radius={6} />
          </View>
          <SkeletonShimmer height={11} width="70%" radius={7} style={{ marginTop: 8 }} />
          <SkeletonShimmer height={24} width="60%" radius={8} style={{ marginTop: 10 }} />
        </View>
      </View>

      <View className="h-[1px] bg-slate-100 mt-3 mb-3" />

      <View className="flex-row justify-between items-end">
        <View>
          <View className="flex-row items-center">
            <SkeletonShimmer height={12} width={58} radius={6} />
            <SkeletonShimmer height={12} width={70} radius={6} style={{ marginLeft: 8 }} />
          </View>
          <SkeletonShimmer height={22} width={96} radius={8} style={{ marginTop: 10 }} />
        </View>
        <SkeletonShimmer height={34} width={100} radius={10} />
      </View>
    </View>
  );
}

export default function CabsSkeleton({ count = 3 }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <CabCardSkeleton key={`cab-skeleton-${index}`} />
      ))}
    </View>
  );
}

