import React from "react";
import { View } from "react-native";
import SkeletonShimmer from "./SkeletonShimmer";

export default function HotelDetailsSkeleton() {
  return (
    <View className="flex-1 bg-slate-50">
      <SkeletonShimmer height={288} width="100%" radius={0} />

      <View className="-mt-8 bg-slate-50 rounded-t-[36px] px-5 pt-6 pb-8">
        <SkeletonShimmer height={24} width="70%" radius={8} />
        <SkeletonShimmer height={14} width="90%" radius={8} style={{ marginTop: 12 }} />
        <SkeletonShimmer height={14} width="70%" radius={8} style={{ marginTop: 8 }} />

        <View className="flex-row flex-wrap gap-2 mt-5">
          <SkeletonShimmer height={32} width={112} radius={16} />
          <SkeletonShimmer height={32} width={96} radius={16} />
          <SkeletonShimmer height={32} width={112} radius={16} />
        </View>

        <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm mt-5">
          <SkeletonShimmer height={14} width={96} radius={8} />
          <SkeletonShimmer height={12} width="100%" radius={8} style={{ marginTop: 12 }} />
          <SkeletonShimmer height={12} width="92%" radius={8} style={{ marginTop: 8 }} />
          <SkeletonShimmer height={12} width="80%" radius={8} style={{ marginTop: 8 }} />
        </View>

        <View className="mt-6">
          <SkeletonShimmer height={18} width={128} radius={8} style={{ marginBottom: 12 }} />
          <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm mb-4">
            <SkeletonShimmer height={12} width={64} radius={8} />
            <View className="flex-row gap-3 mt-3">
              <SkeletonShimmer height={64} width="100%" radius={12} style={{ flex: 1 }} />
              <SkeletonShimmer height={64} width="100%" radius={12} style={{ flex: 1 }} />
            </View>
            <SkeletonShimmer height={12} width={192} radius={8} style={{ marginTop: 16 }} />
          </View>
          <SkeletonShimmer height={80} width="100%" radius={24} style={{ marginBottom: 16 }} />
          <SkeletonShimmer height={80} width="100%" radius={24} />
        </View>

        <View className="mt-6">
          <SkeletonShimmer height={18} width={128} radius={8} style={{ marginBottom: 12 }} />
          <SkeletonShimmer height={40} width="100%" radius={24} style={{ marginBottom: 12 }} />
          <SkeletonShimmer height={40} width="86%" radius={24} />
        </View>

        <View className="mt-6">
          <SkeletonShimmer height={18} width={128} radius={8} style={{ marginBottom: 12 }} />
          <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm">
            <SkeletonShimmer height={160} width="100%" radius={16} />
            <SkeletonShimmer height={14} width="50%" radius={8} style={{ marginTop: 16 }} />
            <SkeletonShimmer height={12} width="35%" radius={8} style={{ marginTop: 8 }} />
            <SkeletonShimmer height={40} width="100%" radius={12} style={{ marginTop: 16 }} />
          </View>
        </View>
      </View>
    </View>
  );
}
