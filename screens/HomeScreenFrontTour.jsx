import React, { useContext, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Animated,
  Easing,
} from "react-native";
import { NavigationContext } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { fetchTourList } from "../store/slices/tourSlice";

const safeText = (v, fallback = "") =>
  typeof v === "string" ? v.trim() || fallback : fallback;

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getPlaces = (tour) => {
  const raw = safeText(tour?.visitngPlaces || tour?.visitingPlaces || "");
  if (!raw) return "Tour Package";
  const places = raw
    .split(/\||,/)
    .map((item) => item.trim())
    .filter(Boolean);
  return places.slice(0, 2).join(", ") || "Tour Package";
};

const getFirstImage = (tour) => tour?.images?.[0] || "";

const formatINR = (value) => {
  const amount = toNumber(value);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `Rs ${amount}`;
  }
};

function TinyFireIcon() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name="flame" size={13} color="#f97316" />
    </Animated.View>
  );
}

const TourCard = ({ tour, onPress }) => {
  const title = getPlaces(tour);
  const city = safeText(tour?.city, "Location");
  const rating = toNumber(tour?.starRating) || 4.2;
  const nights = toNumber(tour?.nights);
  const days = toNumber(tour?.days);
  const image = getFirstImage(tour);
  const price = toNumber(tour?.price) || 9999;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="w-[260px] mr-4 mb-2"
    >
      <View className="bg-white rounded-[18px] shadow-sm elevation-3 border border-slate-100 overflow-hidden pb-3">
        <View className="relative">
          {image ? (
            <Image source={{ uri: image }} className="w-full h-40 bg-slate-200" resizeMode="cover" />
          ) : (
            <View className="w-full h-40 bg-slate-200 items-center justify-center">
              <Ionicons name="images-outline" size={30} color="#cbd5e1" />
            </View>
          )}

          <View className="absolute top-2 left-2 px-2 py-1 rounded-full bg-white/95 border border-slate-200 flex-row items-center">
            <Ionicons name="star" size={10} color="#f59e0b" />
            <Text className="text-[10px] text-slate-800 font-extrabold ml-1">{rating.toFixed(1)}</Text>
          </View>

          <View className="absolute top-2 right-2 px-2 py-1 rounded-full bg-white/95 border border-slate-200 flex-row items-center">
            <Ionicons name="moon" size={10} color="#1e3a8a" />
            <Text className="text-[10px] text-slate-800 font-extrabold ml-1">{`${nights || 0}N / ${days || 0}D`}</Text>
          </View>
        </View>

        <View className="px-3 pt-3">
          <Text className="text-slate-900 font-bold text-[15px] leading-tight" numberOfLines={2}>
            {title}
          </Text>

          <View className="flex-row items-center mt-1">
            <Ionicons name="location-outline" size={13} color="#94a3b8" />
            <Text className="text-slate-500 text-[12px] font-medium ml-1" numberOfLines={1}>
              {city}
            </Text>
          </View>

          <View className="flex-row items-baseline mt-3">
            <Text className="text-[#0d3b8f] font-extrabold text-[18px]">
              {formatINR(price)}
            </Text>
            <Text className="text-slate-500 text-[11px] font-semibold ml-1">/ person</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SkeletonCard = () => (
  <View className="w-[260px] mr-4 bg-white rounded-[18px] overflow-hidden border border-slate-100">
    <View className="w-full h-40 bg-slate-200" />
    <View className="p-3">
      <View className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
      <View className="h-3 bg-slate-200 rounded w-1/2 mb-3" />
      <View className="h-4 bg-slate-200 rounded w-1/3" />
    </View>
  </View>
);

export default function HomeScreenFrontTour() {
  const navigation = useContext(NavigationContext);
  const dispatch = useDispatch();
  const { items: toursRaw, status, error } = useSelector((state) => state.tour);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchTourList());
    }
  }, [dispatch, status]);

  const tours = useMemo(() => (Array.isArray(toursRaw) ? toursRaw : []), [toursRaw]);
  const topTours = useMemo(() => tours.slice(0, 5), [tours]);

  const navigateToTours = () => {
    if (!navigation) return;
    const parent = navigation.getParent?.();
    if (parent?.navigate) {
      parent.navigate("Tour");
      return;
    }
    navigation.navigate?.("Tour");
  };

  const openTourDetails = (tourId) => {
    if (!tourId) {
      navigateToTours();
      return;
    }
    navigation?.navigate?.("TourDetails", { tourId });
  };

  return (
    <View className="flex-1 bg-white mt-1">
      <View className="px-4 pt-4">
        <View className="flex-row items-end justify-between">
          <View>
            <View className="flex-row items-center" style={{ gap: 5 }}>
              <Text className="text-[18px] font-extrabold text-slate-900">Explore Tours</Text>
              <TinyFireIcon />
            </View>
            <Text className="text-[12px] text-slate-500 font-semibold mt-0.5">
              Top 5 tours right now
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={navigateToTours}
            className="px-3 py-1.5 rounded-full bg-slate-100"
          >
            <Text className="text-[11px] font-extrabold text-slate-700">  View all →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {status === "loading" ? (
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
              Loading tours...
            </Text>
          </View>
        </View>
      ) : status === "failed" ? (
        <View className="px-4 mt-6">
          <View className="p-4 rounded-2xl bg-red-50 border border-red-100">
            <Text className="text-red-600 font-extrabold text-[13px]">
              Unable to fetch tours
            </Text>
            <Text className="text-red-600/90 text-[12px] font-semibold mt-1">
              {String(error?.message || error || "Please try again.")}
            </Text>

            <TouchableOpacity
              onPress={() => dispatch(fetchTourList())}
              activeOpacity={0.85}
              className="mt-3 bg-red-600 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-extrabold">Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : topTours.length === 0 ? (
        <View className="px-4 mt-10 items-center">
          <View className="w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center">
            <Ionicons name="map-outline" size={24} color="#94a3b8" />
          </View>
          <Text className="text-slate-900 font-extrabold text-[14px] mt-3">
            No tours available
          </Text>
          <Text className="text-slate-500 font-semibold text-[12px] mt-1 text-center">
            Please check again shortly.
          </Text>
          <TouchableOpacity
            onPress={() => dispatch(fetchTourList())}
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
          {topTours.map((tour, idx) => (
            <TourCard
              key={tour?._id || `${tour?.travelAgencyName || "tour"}-${idx}`}
              tour={tour}
              onPress={() => openTourDetails(tour?._id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
