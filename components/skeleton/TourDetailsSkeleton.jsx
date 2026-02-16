import React from "react";
import { ScrollView, StatusBar, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import SkeletonShimmer from "./SkeletonShimmer";

const SkeletonKeyValueRow = ({ keyWidth = "34%", valueWidth = "56%", className = "" }) => (
  <View className={`flex-row items-center justify-between py-2 ${className}`}>
    <SkeletonShimmer height={11} width={keyWidth} />
    <SkeletonShimmer height={11} width={valueWidth} />
  </View>
);

export default function TourDetailsSkeleton({ onBack }) {
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView className="flex-1">
        <View className="flex-1 relative">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View className="h-[350px] relative w-full">
              <SkeletonShimmer height={350} width="100%" radius={0} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />

              <SafeAreaView className="absolute top-0 left-0 right-0 z-10">
                <View className="px-5 pt-2">
                  <TouchableOpacity
                    onPress={onBack}
                    className="w-10 h-10 rounded-full bg-white/85 border border-slate-200 items-center justify-center"
                  >
                    <Ionicons name="chevron-back" size={22} color="#0f172a" />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>

              <View className="absolute bottom-0 left-0 right-0 p-6 pb-12">
                <SkeletonShimmer height={20} width={112} radius={999} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                <SkeletonShimmer height={30} width="82%" style={{ marginTop: 12 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                <SkeletonShimmer height={14} width="45%" style={{ marginTop: 12 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
              </View>
            </View>

            <View className="-mt-8 bg-gray-50 rounded-t-[32px] pt-6 px-5">
              <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-6">
                <View className="flex-row items-center">
                  <SkeletonShimmer height={48} width={48} radius={999} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                  <View className="flex-1 ml-3">
                    <SkeletonShimmer height={14} width="62%" baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                    <SkeletonShimmer height={10} width="36%" style={{ marginTop: 8 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                  </View>
                  <SkeletonShimmer height={36} width={36} radius={999} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                </View>
              </View>

              <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-6">
                <SkeletonShimmer height={14} width={120} style={{ marginBottom: 8 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                <SkeletonKeyValueRow keyWidth="30%" valueWidth="48%" />
                <SkeletonKeyValueRow keyWidth="24%" valueWidth="58%" />
                <SkeletonKeyValueRow keyWidth="28%" valueWidth="46%" />
                <SkeletonKeyValueRow keyWidth="32%" valueWidth="52%" />
                <SkeletonKeyValueRow keyWidth="26%" valueWidth="40%" />
                <SkeletonKeyValueRow keyWidth="36%" valueWidth="44%" className="pb-0" />
              </View>

              <View className="bg-white rounded-2xl border border-gray-200 p-1 mb-6 flex-row">
                <SkeletonShimmer height={36} style={{ flex: 1, marginRight: 6 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                <SkeletonShimmer height={36} style={{ flex: 1, marginRight: 6 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                <SkeletonShimmer height={36} style={{ flex: 1 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
              </View>

              <View className="mb-6">
                <SkeletonShimmer height={16} width={150} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                <View className="bg-white p-4 rounded-2xl border border-gray-100 mt-3">
                  <SkeletonShimmer height={11} width="100%" style={{ marginBottom: 8 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                  <SkeletonShimmer height={11} width="92%" style={{ marginBottom: 8 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                  <SkeletonShimmer height={11} width="88%" baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                </View>
              </View>

              <View className="flex-row mb-6" style={{ gap: 12 }}>
                <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
                  <SkeletonShimmer height={12} width={95} style={{ marginBottom: 12 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                  <SkeletonShimmer height={10} width="100%" style={{ marginBottom: 8 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                  <SkeletonShimmer height={10} width="84%" baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                </View>
                <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
                  <SkeletonShimmer height={12} width={95} style={{ marginBottom: 12 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                  <SkeletonShimmer height={10} width="100%" style={{ marginBottom: 8 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                  <SkeletonShimmer height={10} width="84%" baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                </View>
              </View>

              <View className="mb-6">
                <SkeletonShimmer height={14} width={92} style={{ marginBottom: 12 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                <View className="flex-row flex-wrap">
                  {Array.from({ length: 7 }).map((_, idx) => (
                    <SkeletonShimmer
                      key={idx}
                      height={28}
                      width={idx % 3 === 0 ? 110 : idx % 2 === 0 ? 88 : 96}
                      radius={10}
                      style={{ marginRight: 8, marginBottom: 8 }}
                      baseColor="rgba(226,232,240,0.72)"
                      highlightColor="rgba(255,255,255,0.62)"
                      duration={1100}
                    />
                  ))}
                </View>
              </View>

              <View className="mb-6">
                <SkeletonShimmer height={14} width={76} style={{ marginBottom: 12 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                {Array.from({ length: 4 }).map((_, idx) => (
                  <View key={idx} className="flex-row mb-2">
                    <View className="w-6 items-center">
                      <SkeletonShimmer height={8} width={8} radius={999} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                      {idx !== 3 && (
                        <SkeletonShimmer height={42} width={2} radius={999} style={{ marginTop: 4 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                      )}
                    </View>
                    <View className="flex-1 bg-white p-3 rounded-xl border border-gray-100 ml-3 mb-3">
                      <SkeletonShimmer height={12} width={68} style={{ marginBottom: 8 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                      <SkeletonShimmer height={10} width="96%" style={{ marginBottom: 6 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                      <SkeletonShimmer height={10} width="72%" baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                    </View>
                  </View>
                ))}
              </View>

              {[1, 2].map((item) => (
                <View key={item} className="bg-white p-4 rounded-2xl border border-gray-100 mb-3">
                  <SkeletonShimmer height={12} width={108} style={{ marginBottom: 10 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                  <SkeletonShimmer height={10} width="100%" style={{ marginBottom: 6 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                  <SkeletonShimmer height={10} width="92%" style={{ marginBottom: 6 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                  <SkeletonShimmer height={10} width="70%" baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
                </View>
              ))}

              <View className="h-24" />
            </View>
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 bg-white px-5 pt-3 pb-6 border-t border-gray-100 flex-row items-center justify-between">
            <View style={{ flex: 1 }}>
              <SkeletonShimmer height={10} width={90} style={{ marginBottom: 8 }} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
              <SkeletonShimmer height={22} width={130} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
            </View>
            <SkeletonShimmer height={48} width={150} radius={12} baseColor="rgba(226,232,240,0.72)" highlightColor="rgba(255,255,255,0.62)" duration={1100} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
