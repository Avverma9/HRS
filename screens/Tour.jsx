import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import {
  fetchTourList,
  filterToursByQuery,
  fetchTourById,
  resetSelectedTour,
} from "../store/slices/tourSlice";
import { useNavigation } from "@react-navigation/native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const splitCsvText = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const getTourPlaces = (tour) => {
  const raw = tour?.visitngPlaces || tour?.visitingPlaces || "";
  const chunks = String(raw)
    .split(/\||,/) // split by | or ,
    .map((item) => item.trim())
    .filter(Boolean);
  return chunks.slice(0, 4).join(", ");
};

const formatINR = (value) => {
  const amount = toNumber(value);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
};

function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className={`rounded-full px-3 py-2 mr-2 border ${
        active ? "bg-blue-50 border-blue-400" : "bg-white border-slate-200"
      }`}
    >
      <Text className={`text-[12px] font-semibold ${active ? "text-blue-700" : "text-slate-700"}`} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PrimaryButton({ title, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="h-10 rounded-xl items-center justify-center px-4 bg-[#0d3b8f]"
    >
      <Text className="text-white font-extrabold text-[13px]">{title}</Text>
    </TouchableOpacity>
  );
}

function SkeletonShimmer({ height = 12, width = "100%", radius = 14, style }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: "rgba(148, 163, 184, 0.22)",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "40%",
          transform: [{ translateX }],
          backgroundColor: "rgba(255,255,255,0.55)",
        }}
      />
    </View>
  );
}

function TourCardSkeleton() {
  return (
    <View className="mx-4 mb-4 bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <SkeletonShimmer height={150} width="100%" radius={0} />
      <View className="p-3">
        <View className="flex-row items-center justify-between">
          <SkeletonShimmer height={18} width={86} radius={10} />
          <SkeletonShimmer height={18} width={70} radius={10} />
        </View>
        <SkeletonShimmer height={14} width={230} radius={10} style={{ marginTop: 10 }} />
        <SkeletonShimmer height={10} width={120} radius={8} style={{ marginTop: 10 }} />
        <View className="h-px bg-slate-100 my-3" />
        <View className="flex-row items-end justify-between">
          <SkeletonShimmer height={28} width={130} radius={12} />
          <SkeletonShimmer height={40} width={110} radius={14} />
        </View>
      </View>
    </View>
  );
}

function TourCard({ tour, onPressDetails }) {
  const rating = toNumber(tour?.starRating) || 0;
  const price = toNumber(tour?.price);
  const places = getTourPlaces(tour) || "-";
  const city = tour?.city || "-";
  const agency = tour?.travelAgencyName || "-";
  const nights = toNumber(tour?.nights);
  const days = toNumber(tour?.days);

  const theme = splitCsvText(tour?.themes)[0] || "";

  const amenities = Array.isArray(tour?.amenities)
    ? tour.amenities.map((a) => String(a || "").trim()).filter(Boolean)
    : splitCsvText(tour?.amenities);

  return (
    <View className="mx-4 mb-4 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <View className="relative h-[150px] bg-slate-200">
        {tour?.images?.[0] ? (
          <Image source={{ uri: tour.images[0] }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="w-full h-full bg-slate-300" />
        )}

        <View className="absolute top-3 left-3 bg-white/95 rounded-full px-2 py-1 flex-row items-center" style={{ gap: 6 }}>
          <Ionicons name="star" size={12} color="#f59e0b" />
          <Text className="text-[12px] font-black text-slate-800">{rating.toFixed(1)}</Text>
        </View>

        <View className="absolute top-3 right-3 bg-white/95 rounded-full px-2 py-1 flex-row items-center" style={{ gap: 6 }}>
          <Ionicons name="moon" size={12} color="#0f429e" />
          <Text className="text-[12px] font-black text-slate-800">{`${nights || 0}N / ${days || 0}D`}</Text>
        </View>

        <View className="absolute left-0 right-0 bottom-0 px-3 pb-2 pt-8" style={{ backgroundColor: "rgba(15,23,42,0.55)" }}>
          <Text className="text-white text-[18px] leading-6 font-black" numberOfLines={2}>
            {places}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="location-sharp" size={12} color="#ffffff" />
            <Text className="text-white/95 text-[12px] ml-1" numberOfLines={1}>
              {city}
            </Text>
          </View>
        </View>
      </View>

      <View className="p-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200" style={{ gap: 6, maxWidth: "70%" }}>
            <Ionicons name="business" size={12} color="#334155" />
            <Text className="text-[12px] font-bold text-slate-700" numberOfLines={1}>
              {agency}
            </Text>
          </View>

          {!!theme && (
            <View className="px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-100">
              <Text className="text-[11px] font-bold text-blue-700" numberOfLines={1}>
                {theme}
              </Text>
            </View>
          )}
        </View>

        {!!amenities.length && (
          <View className="flex-row flex-wrap mt-2" style={{ gap: 6 }}>
            {amenities.slice(0, 2).map((am, idx) => (
              <View key={`${am}-${idx}`} className="px-2 py-1 rounded-lg border border-slate-200 bg-white">
                <Text className="text-[10px] text-slate-500">{am}</Text>
              </View>
            ))}
          </View>
        )}

        <View className="h-px bg-slate-100 my-3" />

        <View className="flex-row items-end justify-between">
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text className="text-[10px] font-black tracking-wider text-slate-400">STARTING FROM</Text>
            <Text className="text-[22px] leading-7 font-black text-[#113d90]" numberOfLines={1}>
              {formatINR(price)}
              <Text className="text-[11px] font-semibold text-slate-500"> / person</Text>
            </Text>
          </View>
          <PrimaryButton title="View details" onPress={onPressDetails} />
        </View>
      </View>
    </View>
  );
}

export default function Tour() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { isDark } = useTheme();
  const tourState = useSelector((state) => state.tour);
  const selectedTour = tourState?.selectedTour;
  const selectedTourStatus = tourState?.selectedTourStatus;

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTourDetailModal, setShowTourDetailModal] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");

  const [tourPriceRange, setTourPriceRange] = useState([0, 50000]);
  const [tourMinRating, setTourMinRating] = useState(0);
  const [tourSelectedAmenities, setTourSelectedAmenities] = useState([]);
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [sortOrderFilter, setSortOrderFilter] = useState("default");
  const [durationSortFilter, setDurationSortFilter] = useState("default");
  const [showTopFilterBar, setShowTopFilterBar] = useState(true);

  const tours = Array.isArray(tourState?.items) ? tourState.items : [];
  const isLoading = tourState?.status === "loading";

  const tourThemesList = useMemo(() => {
    const themes = tours.flatMap((tour) => splitCsvText(tour?.themes));
    return [...new Set(themes)].filter(Boolean);
  }, [tours]);

  const tourAmenitiesList = useMemo(() => {
    const amenities = tours.flatMap((tour) => {
      if (Array.isArray(tour?.amenities)) {
        return tour.amenities.map((item) => String(item || "").trim()).filter(Boolean);
      }
      return splitCsvText(tour?.amenities);
    });
    return [...new Set(amenities)].filter(Boolean);
  }, [tours]);

  const filteredTours = tours;

  const toggleTheme = (theme) => {
    setSelectedThemes((prev) => (prev.includes(theme) ? prev.filter((item) => item !== theme) : [...prev, theme]));
  };

  const toggleAmenity = (amenity) => {
    setTourSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((item) => item !== amenity) : [...prev, amenity]
    );
  };

  useEffect(() => {
    dispatch(fetchTourList());
  }, [dispatch]);

  const buildFilterQueryPayload = ({ includeAdvanced = true } = {}) => {
    const from = String(fromCity || "").trim();
    const to = String(toCity || "").trim();
    const queryText = String(searchText || "").trim();

    const payload = {
      page: 1,
      limit: 50,
    };

    if (from && to) {
      payload.q = `${from} ${to} ${queryText}`.trim();
      payload.city = to;
    } else if (from) {
      payload.q = `${from} ${queryText}`.trim();
    } else if (to) {
      payload.q = `${to} ${queryText}`.trim();
      payload.city = to;
    } else if (queryText) {
      payload.q = queryText;
    }

    if (includeAdvanced) {
      if (selectedThemes.length) payload.themes = selectedThemes.join(",");
      if (tourSelectedAmenities.length) payload.amenities = tourSelectedAmenities.join(",");
      if (tourPriceRange[0] !== 0) payload.minPrice = tourPriceRange[0];
      if (tourPriceRange[1] !== 50000) payload.maxPrice = tourPriceRange[1];
      if (tourMinRating > 0) payload.minRating = tourMinRating;

      if (durationSortFilter !== "default") {
        payload.sortBy = "nights";
        payload.sortOrder = durationSortFilter;
      } else if (sortOrderFilter !== "default") {
        payload.sortBy = "createdAt";
        payload.sortOrder = sortOrderFilter;
      }
    }

    return payload;
  };

  useEffect(() => {
    const from = String(fromCity || "").trim();
    const to = String(toCity || "").trim();
    const q = String(searchText || "").trim();

    if (!from && !to && !q) {
      return undefined;
    }

    const timer = setTimeout(() => {
      const payload = buildFilterQueryPayload({ includeAdvanced: false });
      console.log("[Tour Filters] realtime /filter-tour/by-query payload", payload);
      dispatch(filterToursByQuery(payload));
    }, 350);

    return () => clearTimeout(timer);
  }, [dispatch, fromCity, toCity, searchText]);

  const handleApplyFilters = async () => {
    console.log("[Tour Filters] current-state", {
      from: String(fromCity || "").trim(),
      to: String(toCity || "").trim(),
      tourPriceRange,
      tourMinRating,
      selectedThemes,
      tourSelectedAmenities,
      sortOrderFilter,
      durationSortFilter,
    });

    const payload = buildFilterQueryPayload({ includeAdvanced: true });
    console.log("[Tour Filters] API /filter-tour/by-query payload", payload);
    await dispatch(filterToursByQuery(payload));

    setShowFilterModal(false);
    setShowTopFilterBar(false);
  };

  const handleClearAllFilters = async () => {
    setTourPriceRange([0, 50000]);
    setTourMinRating(0);
    setTourSelectedAmenities([]);
    setSelectedThemes([]);
    setSortOrderFilter("default");
    setDurationSortFilter("default");
    setFromCity("");
    setToCity("");
    setSearchText("");
    setShowTopFilterBar(true);

    console.log("[Tour Filters] clear-all -> refetch payload", {});
    await dispatch(fetchTourList());
  };

  const handleViewDetails = async (tourId) => {
    if (!tourId) return;
    setShowTourDetailModal(true);
    await dispatch(fetchTourById(tourId));
  };

  const closeTourDetailModal = () => {
    setShowTourDetailModal(false);
    dispatch(resetSelectedTour());
  };

  const headerBg = isDark ? "bg-slate-950" : "bg-slate-100";
  const titleColor = isDark ? "text-white" : "text-slate-900";

  return (
    <SafeAreaView className={`flex-1 ${headerBg}`}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-4 pt-2 pb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.9}
                className="h-10 w-10 rounded-2xl bg-white border border-slate-200 items-center justify-center"
              >
                <Ionicons name="arrow-back" size={18} color="#0f172a" />
              </TouchableOpacity>
              <View>
                <Text className={`text-[17px] font-black ${titleColor}`}>Explore Tours</Text>
                <Text className={`${isDark ? "text-slate-300" : "text-slate-600"} text-[12px] mt-0.5`}>
                  Compact search • better filters
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              activeOpacity={0.9}
              className="h-10 w-10 rounded-2xl bg-white border border-slate-200 items-center justify-center"
            >
              <Ionicons name="options-outline" size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {/* FROM / TO (compact) */}
          <View className="mt-3 flex-row" style={{ gap: 10 }}>
            <View className="flex-1 h-11 rounded-2xl bg-white border border-slate-200 px-3 flex-row items-center" style={{ gap: 8 }}>
              <Ionicons name="radio-button-on" size={14} color="#10b981" />
              <TextInput
                value={fromCity}
                onChangeText={setFromCity}
                placeholder="From"
                placeholderTextColor="#94a3b8"
                className="flex-1 text-slate-800 font-semibold"
                autoCorrect={false}
              />
            </View>
            <View className="flex-1 h-11 rounded-2xl bg-white border border-slate-200 px-3 flex-row items-center" style={{ gap: 8 }}>
              <Ionicons name="location" size={14} color="#3b82f6" />
              <TextInput
                value={toCity}
                onChangeText={setToCity}
                placeholder="To"
                placeholderTextColor="#94a3b8"
                className="flex-1 text-slate-800 font-semibold"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Search */}
          <View className="mt-3 h-11 rounded-2xl bg-white border border-slate-200 px-3 flex-row items-center">
            <Ionicons name="search" size={16} color="#64748b" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search packages, agency, city..."
              placeholderTextColor="#94a3b8"
              className="flex-1 ml-2 text-slate-800 font-semibold"
              autoCorrect={false}
              returnKeyType="search"
            />
            {!!searchText && (
              <TouchableOpacity onPress={() => setSearchText("")} className="p-2">
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {showTopFilterBar && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              {tourThemesList.slice(0, 10).map((theme) => (
                <Chip key={theme} label={theme} active={selectedThemes.includes(theme)} onPress={() => toggleTheme(theme)} />
              ))}
            </ScrollView>
          )}

          {!!(selectedThemes.length || tourSelectedAmenities.length || tourMinRating || tourPriceRange[0] !== 0 || fromCity || toCity || searchText) && (
            <View className="mt-3 flex-row flex-wrap items-center" style={{ gap: 8 }}>
              <View className="px-3 py-1.5 rounded-full bg-slate-900">
                <Text className="text-[12px] font-extrabold text-white">{filteredTours.length} results</Text>
              </View>
              <TouchableOpacity
                onPress={handleClearAllFilters}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200"
              >
                <Text className="text-[12px] font-extrabold text-slate-600">Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isLoading && (
          <View>
            {[...Array(5)].map((_, idx) => (
              <TourCardSkeleton key={`sk-${idx}`} />
            ))}
          </View>
        )}

        {tourState?.status === "failed" && (
          <View className="mx-4 bg-white rounded-2xl p-4 border border-red-200">
            <Text className="text-red-600 text-[13px] font-semibold">
              {String(tourState?.error?.message || tourState?.error || "Failed to load tours")}
            </Text>
          </View>
        )}

        {!isLoading && tourState?.status !== "failed" && !tours.length && (
          <View className="mx-4 bg-white rounded-2xl p-4 border border-slate-200">
            <Text className="text-slate-500 text-[13px]">No tours available right now.</Text>
          </View>
        )}

        {!isLoading && !!tours.length && !filteredTours.length && (
          <View className="mx-4 bg-white rounded-2xl p-4 border border-slate-200">
            <Text className="text-slate-500 text-[13px]">No tours match current filters.</Text>
          </View>
        )}

        {!isLoading &&
          filteredTours.map((tour) => (
            <TourCard
              key={tour?._id || `${tour?.travelAgencyName || "tour"}-${tour?.createdAt || Math.random()}`}
              tour={tour}
              onPressDetails={() => {
                handleViewDetails(tour?._id);
              }}
            />
          ))}
      </ScrollView>

      <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white w-full rounded-t-3xl p-5 h-[82%]">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-[18px] font-black text-slate-900">Filters</Text>
                <Text className="text-[12px] text-slate-500 mt-1">Refine by price, rating, theme, amenities</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} className="p-2 bg-slate-100 rounded-full">
                <Ionicons name="close" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <Text className="text-[13px] font-black text-slate-900 mb-3">Price Range</Text>
              <View className="flex-row" style={{ gap: 10 }}>
                {[0, 5000, 15000].map((start) => {
                  const end = start === 0 ? 5000 : start === 5000 ? 15000 : 50000;
                  const label = start === 15000 ? "₹15000+" : `₹${start} - ₹${end}`;
                  const isSelected = tourPriceRange[0] === start;
                  return (
                    <TouchableOpacity
                      key={start}
                      onPress={() => setTourPriceRange([start, end])}
                      activeOpacity={0.9}
                      className={`px-3 py-2 border rounded-xl ${isSelected ? "bg-blue-50 border-blue-500" : "border-slate-200"}`}
                    >
                      <Text className={`text-[12px] font-extrabold ${isSelected ? "text-blue-700" : "text-slate-600"}`}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View className="mt-6">
                <Text className="text-[13px] font-black text-slate-900 mb-3">Star Rating</Text>
                <View className="flex-row" style={{ gap: 10 }}>
                  {[3, 4, 5].map((stars) => {
                    const isSelected = tourMinRating === stars;
                    return (
                      <TouchableOpacity
                        key={stars}
                        onPress={() => setTourMinRating((prev) => (prev === stars ? 0 : stars))}
                        activeOpacity={0.9}
                        className={`flex-1 py-2.5 border rounded-xl flex-row items-center justify-center ${
                          isSelected ? "bg-blue-50 border-blue-500" : "border-slate-200"
                        }`}
                      >
                        <Text className={`font-black ${isSelected ? "text-blue-700" : "text-slate-600"}`}>{stars}</Text>
                        <Ionicons name="star" size={12} color={isSelected ? "#1d4ed8" : "#64748b"} style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="mt-6">
                <Text className="text-[13px] font-black text-slate-900 mb-3">Sort By Order</Text>
                <View className="flex-row" style={{ gap: 10 }}>
                  {[
                    { id: "default", label: "Default" },
                    { id: "asc", label: "A-Z" },
                    { id: "desc", label: "Z-A" },
                  ].map((item) => {
                    const isSelected = sortOrderFilter === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => setSortOrderFilter(item.id)}
                        activeOpacity={0.9}
                        className={`px-3 py-2 border rounded-xl ${isSelected ? "bg-blue-50 border-blue-500" : "border-slate-200"}`}
                      >
                        <Text className={`text-[12px] font-semibold ${isSelected ? "text-blue-700" : "text-slate-600"}`}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="mt-6">
                <Text className="text-[13px] font-black text-slate-900 mb-3">Sort By Duration</Text>
                <View className="flex-row" style={{ gap: 10 }}>
                  {[
                    { id: "default", label: "Default" },
                    { id: "asc", label: "Short first" },
                    { id: "desc", label: "Long first" },
                  ].map((item) => {
                    const isSelected = durationSortFilter === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => setDurationSortFilter(item.id)}
                        activeOpacity={0.9}
                        className={`px-3 py-2 border rounded-xl ${isSelected ? "bg-blue-50 border-blue-500" : "border-slate-200"}`}
                      >
                        <Text className={`text-[12px] font-semibold ${isSelected ? "text-blue-700" : "text-slate-600"}`}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="mt-6">
                <Text className="text-[13px] font-black text-slate-900 mb-3">Themes</Text>
                <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                  {tourThemesList.map((theme, index) => {
                    const isSelected = selectedThemes.includes(theme);
                    return (
                      <TouchableOpacity
                        key={`${theme}-${index}`}
                        onPress={() => toggleTheme(theme)}
                        activeOpacity={0.9}
                        className={`px-3 py-2 border rounded-xl ${isSelected ? "bg-blue-50 border-blue-500" : "border-slate-200"}`}
                      >
                        <Text className={`text-[12px] font-semibold ${isSelected ? "text-blue-700" : "text-slate-500"}`}>{theme}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="mt-6">
                <Text className="text-[13px] font-black text-slate-900 mb-3">Amenities</Text>
                <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                  {tourAmenitiesList.map((amenity, index) => {
                    const isSelected = tourSelectedAmenities.includes(amenity);
                    return (
                      <TouchableOpacity
                        key={`${amenity}-${index}`}
                        onPress={() => toggleAmenity(amenity)}
                        activeOpacity={0.9}
                        className={`px-3 py-2 border rounded-xl ${isSelected ? "bg-blue-50 border-blue-500" : "border-slate-200"}`}
                      >
                        <Text className={`text-[12px] font-semibold ${isSelected ? "text-blue-700" : "text-slate-500"}`}>{amenity}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View className="flex-row mt-5 pt-4 border-t border-slate-100" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={handleClearAllFilters}
                activeOpacity={0.9}
                className="flex-1 h-12 rounded-xl items-center justify-center bg-slate-100"
              >
                <Text className="font-black text-slate-600">Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApplyFilters}
                activeOpacity={0.9}
                className="flex-[2] h-12 rounded-xl items-center justify-center bg-[#0d3b8f]"
              >
                <Text className="text-white font-black">Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTourDetailModal}
        transparent
        animationType="slide"
        onRequestClose={closeTourDetailModal}
      >
        <View className="flex-1 bg-black/45 justify-end">
          <View className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[19px] font-black text-slate-900">Tour Details</Text>
              <TouchableOpacity onPress={closeTourDetailModal} className="p-2 rounded-full bg-slate-100">
                <Ionicons name="close" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {selectedTourStatus === "loading" && (
              <View className="py-6 items-center justify-center">
                <ActivityIndicator size="small" color="#1d4ed8" />
                <Text className="text-slate-500 mt-2">Loading details...</Text>
              </View>
            )}

            {selectedTourStatus !== "loading" && !!selectedTour && (
              <View>
                <Text className="text-[18px] font-black text-slate-900">{selectedTour?.travelAgencyName || "Tour"}</Text>
                <Text className="text-[13px] text-slate-600 mt-1">
                  {getTourPlaces(selectedTour) || selectedTour?.city || "-"}
                </Text>
                <Text className="text-[13px] text-slate-500 mt-1">
                  {`${toNumber(selectedTour?.nights)}N / ${toNumber(selectedTour?.days)}D`} • {formatINR(selectedTour?.price)} / person
                </Text>
                {!!selectedTour?.overview && (
                  <Text className="text-[13px] text-slate-600 mt-3" numberOfLines={6}>
                    {selectedTour.overview}
                  </Text>
                )}
              </View>
            )}

            {selectedTourStatus === "failed" && (
              <Text className="text-red-600 text-[13px] font-semibold">Unable to load tour details.</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
