import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { frontHotels } from "../store/slices/hotelSlice";
import { Ionicons } from "@expo/vector-icons";

// ---------- helpers ----------
const safeText = (v, fallback = "") =>
  typeof v === "string" ? v.trim() || fallback : fallback;

const getFirstImage = (hotel) =>
  hotel?.images?.[0] || hotel?.rooms?.[0]?.images?.[0] || "";

const getMinPrice = (hotel) => {
  const prices = (hotel?.rooms || [])
    .map((r) => Number(r?.price))
    .filter((p) => Number.isFinite(p) && p > 0);
  return prices.length ? Math.min(...prices) : null;
};

const formatRating = (r) => {
  const n = Number(r);
  if (!Number.isFinite(n) || n <= 0) return "4.2"; // Default fallback for design
  return Math.max(0, Math.min(5, n)).toFixed(1);
};

const HotelCard = ({ hotel, onPress }) => {
  const title = safeText(hotel?.hotelName, "Hotel Name");
  const city = safeText(hotel?.city, "Location");
  const rating = formatRating(hotel?.rating);
  const img = getFirstImage(hotel);
  const price = getMinPrice(hotel) || 1500;
  // Calculate a fake "original" price for display purposes (e.g. +20-40%)
  const originalPrice = Math.round(price * 1.35);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="w-[260px] mr-4 mb-2"
    >
      <View className="bg-white rounded-[18px] shadow-sm elevation-3 border border-slate-100 overflow-hidden pb-3">
        {/* Image */}
        <View className="relative">
          {img ? (
            <Image 
              source={{ uri: img }} 
              className="w-full h-40 bg-slate-200" 
              resizeMode="cover" 
            />
          ) : (
            <View className="w-full h-40 bg-slate-200 items-center justify-center">
              <Ionicons name="image-outline" size={32} color="#cbd5e1" />
            </View>
          )}
        </View>

        {/* Content */}
        <View className="px-3 pt-3">
          {/* Title & Rating Row */}
          <View className="flex-row items-start justify-between">
            <Text 
              className="text-slate-900 font-bold text-[16px] flex-1 mr-2 leading-tight" 
              numberOfLines={1}
            >
              {title}
            </Text>
            
            {/* Rating Badge */}
            <View className="bg-green-600 px-1.5 py-0.5 rounded flex-row items-center shadow-sm">
              <Text className="text-white font-bold text-[11px] mr-0.5">{rating}</Text>
              <Ionicons name="star" size={9} color="white" />
            </View>
          </View>

          {/* Location Row */}
          <View className="flex-row items-center mt-1">
            <Ionicons name="location-outline" size={13} color="#94a3b8" style={{marginLeft: -2}} />
            <Text className="text-slate-500 text-[12px] font-medium ml-0.5" numberOfLines={1}>
              {city}
            </Text>
          </View>

          {/* Price Row */}
          <View className="flex-row items-baseline mt-3">
            <Text className="text-[#0d3b8f] font-extrabold text-[18px]">
              ₹{price.toLocaleString()}
            </Text>
            <Text className="text-slate-400 text-[12px] font-medium line-through ml-2">
              ₹{originalPrice.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SkeletonCard = () => (
  <View className="w-[270px] mr-4 bg-white rounded-[22px] overflow-hidden border border-slate-100">
    <View className="w-full h-40 bg-slate-200" />
    <View className="p-3">
      <View className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
      <View className="h-3 bg-slate-200 rounded w-1/2 mb-3" />
      <View className="h-4 bg-slate-200 rounded w-1/3" />
    </View>
  </View>
);

export default function HomeScreenFrontHotels() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  // Use separate featured* state properties
  const { featuredData: hotelsRaw, featuredLoading: loading, featuredError: error } = useSelector((state) => state.hotel);

  useEffect(() => {
    dispatch(frontHotels());
  }, [dispatch]);

  const hotels = useMemo(() => (Array.isArray(hotelsRaw) ? hotelsRaw : []), [hotelsRaw]);

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-4">
        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-[18px] font-extrabold text-slate-900">
              Featured Hotels
            </Text>
            <Text className="text-[12px] text-slate-500 font-semibold mt-0.5">
              Handpicked stays for you
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Hotels")}
            className="px-3 py-1.5 rounded-full bg-slate-100"
          >
            <Text className="text-[11px] font-extrabold text-slate-700">
              View all →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* States */}
      {loading ? (
        <View className="mt-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
          >
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </ScrollView>
          <View className="items-center mt-2">
            <ActivityIndicator size="small" color="#0d3b8f" />
            <Text className="text-[11px] text-slate-500 font-semibold mt-2">
              Loading featured hotels...
            </Text>
          </View>
        </View>
      ) : error ? (
        <View className="px-4 mt-6">
          <View className="p-4 rounded-2xl bg-red-50 border border-red-100">
            <Text className="text-red-600 font-extrabold text-[13px]">
              Something went wrong
            </Text>
            <Text className="text-red-600/90 text-[12px] font-semibold mt-1">
              {String(error)}
            </Text>

            <TouchableOpacity
              onPress={() => dispatch(frontHotels())}
              activeOpacity={0.85}
              className="mt-3 bg-red-600 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-extrabold">Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : hotels.length === 0 ? (
        <View className="px-4 mt-10 items-center">
          <View className="w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center">
            <Text className="text-[22px]">🏨</Text>
          </View>
          <Text className="text-slate-900 font-extrabold text-[14px] mt-3">
            No featured hotels yet
          </Text>
          <Text className="text-slate-500 font-semibold text-[12px] mt-1 text-center">
            Try again in a moment.
          </Text>
          <TouchableOpacity
            onPress={() => dispatch(frontHotels())}
            activeOpacity={0.85}
            className="mt-4 bg-[#0d3b8f] rounded-2xl px-5 py-3"
          >
            <Text className="text-white font-extrabold">Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        >
          {hotels.map((hotel) => (
            <HotelCard
              key={hotel._id}
              hotel={hotel}
              onPress={() => navigation.navigate("HotelDetails", { hotelId: hotel._id })}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
