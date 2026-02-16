import React, { useEffect, useMemo, useContext, useRef } from "react";
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
import { frontHotels } from "../store/slices/hotelSlice";
import { Ionicons } from "@expo/vector-icons";
import HomeScreenFrontHotelsSkeleton from "../components/skeleton/HomeScreenFrontHotelsSkeleton";

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

export default function HomeScreenFrontHotels() {
  const navigation = useContext(NavigationContext);
  const dispatch = useDispatch();
  // Use separate featured* state properties
  const { featuredData: hotelsRaw, featuredLoading: loading, featuredError: error } = useSelector((state) => state.hotel);

  useEffect(() => {
    dispatch(frontHotels());
  }, [dispatch]);

  const handleNavigate = (hotelId) => {
    if (navigation) {
        navigation.navigate("HotelDetails", { hotelId });
    } else {
        console.warn("Navigation context is missing in HomeScreenFrontHotels");
    }
  };

  const handleNavigateAll = () => {
    if (navigation) {
        const parentNavigation = navigation.getParent?.();
        if (parentNavigation) {
          parentNavigation.navigate("HotelsTab", {
            screen: "Hotels",
            params: { showAll: true },
          });
          return;
        }

        navigation.navigate("Hotels", { showAll: true });
    }
  };

  const hotels = useMemo(() => (Array.isArray(hotelsRaw) ? hotelsRaw : []), [hotelsRaw]);

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-4">
        <View className="flex-row items-end justify-between">
          <View>
            <View className="flex-row items-center" style={{ gap: 5 }}>
              <Text className="text-[18px] font-extrabold text-slate-900">
                Featured Hotels
              </Text>
              <TinyFireIcon />
            </View>
            <Text className="text-[12px] text-slate-500 font-semibold mt-0.5">
              Handpicked stays for you
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleNavigateAll}
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
            <HomeScreenFrontHotelsSkeleton />
            <HomeScreenFrontHotelsSkeleton />
            <HomeScreenFrontHotelsSkeleton />
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
          {hotels.map((hotel, idx) => (
            <HotelCard
              key={hotel._id || hotel.hotelId || idx}
              hotel={hotel}
              onPress={() => handleNavigate(hotel.hotelId)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
