import React from "react";
import { View } from "react-native";
import SkeletonShimmer from "./SkeletonShimmer";

export function TourCardSkeleton() {
  return (
    <View className="mx-4 mb-4 bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <SkeletonShimmer height={150} width="100%" radius={0} baseColor="rgba(148, 163, 184, 0.22)" highlightColor="rgba(255,255,255,0.55)" duration={1100} />
      <View className="p-3">
        <View className="flex-row items-center justify-between">
          <SkeletonShimmer height={18} width={86} radius={10} baseColor="rgba(148, 163, 184, 0.22)" highlightColor="rgba(255,255,255,0.55)" duration={1100} />
          <SkeletonShimmer height={18} width={70} radius={10} baseColor="rgba(148, 163, 184, 0.22)" highlightColor="rgba(255,255,255,0.55)" duration={1100} />
        </View>
        <SkeletonShimmer height={14} width={230} radius={10} style={{ marginTop: 10 }} baseColor="rgba(148, 163, 184, 0.22)" highlightColor="rgba(255,255,255,0.55)" duration={1100} />
        <SkeletonShimmer height={10} width={120} radius={8} style={{ marginTop: 10 }} baseColor="rgba(148, 163, 184, 0.22)" highlightColor="rgba(255,255,255,0.55)" duration={1100} />
        <View className="h-px bg-slate-100 my-3" />
        <View className="flex-row items-end justify-between">
          <SkeletonShimmer height={28} width={130} radius={12} baseColor="rgba(148, 163, 184, 0.22)" highlightColor="rgba(255,255,255,0.55)" duration={1100} />
          <SkeletonShimmer height={40} width={110} radius={14} baseColor="rgba(148, 163, 184, 0.22)" highlightColor="rgba(255,255,255,0.55)" duration={1100} />
        </View>
      </View>
    </View>
  );
}
