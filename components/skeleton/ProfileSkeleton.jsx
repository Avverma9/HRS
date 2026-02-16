import React from "react";
import { View } from "react-native";
import SkeletonShimmer from "./SkeletonShimmer";

export const ProfileHeaderSkeleton = () => (
  <View className="px-4 py-2 flex-row items-center justify-between" style={{ marginTop: 20 }}>
    <View className="flex-1 flex-row items-center">
      <SkeletonShimmer height={56} width={56} radius={999} />
      <View className="flex-1 ml-3">
        <SkeletonShimmer height={20} width="58%" radius={6} />
        <SkeletonShimmer height={12} width="72%" radius={6} style={{ marginTop: 8 }} />
        <SkeletonShimmer height={12} width="48%" radius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
    <SkeletonShimmer height={40} width={40} radius={999} style={{ marginLeft: 12 }} />
  </View>
);

export const ProfileTabSkeleton = () => (
  <View>
    <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3 shadow-sm">
      <SkeletonShimmer height={10} width={140} radius={6} style={{ marginBottom: 18 }} />
      {[0, 1, 2].map((index) => (
        <View key={index}>
          <View className="flex-row items-center mb-4">
            <SkeletonShimmer height={40} width={40} radius={10} />
            <View className="flex-1 ml-3">
              <SkeletonShimmer height={10} width="42%" radius={6} />
              <SkeletonShimmer height={14} width="70%" radius={6} style={{ marginTop: 8 }} />
            </View>
          </View>
          {index < 2 && <View className="h-[1px] bg-slate-100 my-3" />}
        </View>
      ))}
    </View>

    <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3 shadow-sm">
      <SkeletonShimmer height={10} width={110} radius={6} style={{ marginBottom: 18 }} />
      <SkeletonShimmer height={14} width="56%" radius={6} />
      <SkeletonShimmer height={14} width="40%" radius={6} style={{ marginTop: 14 }} />
    </View>
  </View>
);

export const TourBookingCardSkeleton = () => (
  <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
    <View className="flex-row items-start justify-between">
      <View className="flex-1 mr-3">
        <SkeletonShimmer height={16} width="78%" radius={7} />
        <SkeletonShimmer height={11} width="62%" radius={6} style={{ marginTop: 8 }} />
      </View>
      <SkeletonShimmer height={28} width={92} radius={999} />
    </View>

    <View className="mt-3 flex-row items-center justify-between">
      <SkeletonShimmer height={11} width={84} radius={6} />
      <SkeletonShimmer height={18} width={90} radius={6} />
    </View>
  </View>
);

export const HotelBookingCardSkeleton = () => (
  <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
    <View className="flex-row items-start justify-between">
      <View className="flex-1 mr-3">
        <SkeletonShimmer height={16} width="54%" radius={7} />
        <SkeletonShimmer height={11} width="66%" radius={6} style={{ marginTop: 8 }} />
        <SkeletonShimmer height={10} width="44%" radius={6} style={{ marginTop: 6 }} />
      </View>
      <SkeletonShimmer height={26} width={86} radius={999} />
    </View>

    <View className="mt-3 bg-slate-50 rounded-xl border border-slate-100 p-3">
      <View className="flex-row items-center justify-between">
        <View>
          <SkeletonShimmer height={10} width={68} radius={6} />
          <SkeletonShimmer height={13} width={82} radius={6} style={{ marginTop: 6 }} />
        </View>
        <SkeletonShimmer height={10} width={14} radius={6} />
        <View style={{ alignItems: "flex-end" }}>
          <SkeletonShimmer height={10} width={68} radius={6} />
          <SkeletonShimmer height={13} width={82} radius={6} style={{ marginTop: 6 }} />
        </View>
      </View>
    </View>

    <View className="flex-row mt-3">
      <View className="flex-1 mr-3">
        <SkeletonShimmer height={11} width="86%" radius={6} />
      </View>
      <View className="flex-1">
        <SkeletonShimmer height={11} width="78%" radius={6} />
      </View>
    </View>

    <View className="mt-3 border-t border-slate-100 pt-3 flex-row items-center justify-between">
      <View>
        <SkeletonShimmer height={10} width={92} radius={6} />
        <SkeletonShimmer height={22} width={120} radius={6} style={{ marginTop: 8 }} />
      </View>
      <SkeletonShimmer height={40} width={110} radius={10} />
    </View>
  </View>
);

export const CouponCardSkeleton = () => (
  <View className="bg-white rounded-xl border-2 border-dashed border-blue-200 p-4 mb-3">
    <View className="flex-row items-start justify-between">
      <View className="flex-1 mr-3">
        <SkeletonShimmer height={28} width={160} radius={7} />
        <SkeletonShimmer height={12} width="58%" radius={6} style={{ marginTop: 8 }} />
      </View>
      <SkeletonShimmer height={40} width={40} radius={10} />
    </View>
    <View className="h-[1px] bg-slate-200 my-3" />
    <View className="flex-row items-center justify-between">
      <SkeletonShimmer height={11} width={126} radius={6} />
      <SkeletonShimmer height={14} width={88} radius={6} />
    </View>
  </View>
);

export const ComplaintCardSkeleton = () => (
  <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3 shadow-sm">
    <View className="flex-row items-center mb-3">
      <SkeletonShimmer height={40} width={40} radius={999} />
      <View className="flex-1 ml-3 mr-3">
        <SkeletonShimmer height={14} width="66%" radius={6} />
        <SkeletonShimmer height={10} width="42%" radius={6} style={{ marginTop: 8 }} />
      </View>
      <SkeletonShimmer height={24} width={74} radius={6} />
    </View>

    <View className="pt-3 border-t border-slate-100 flex-row items-center justify-between">
      <SkeletonShimmer height={11} width={124} radius={6} />
      <SkeletonShimmer height={30} width={94} radius={8} />
    </View>
  </View>
);
