import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchTourList,
  filterToursByQuery,
} from "../store/slices/tourSlice";
import { useNavigation } from "@react-navigation/native";
import { TourCardSkeleton } from "../components/skeleton/TourSkeleton";
import Header from "../components/Header";

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

// API token matching for visitngPlaces/visitingPlaces supports optional "1N " style prefixes.
const normalizePlaceToken = (value) =>
  String(value || "")
    .replace(/^\s*\d+\s*N\s*/i, "")
    .trim();

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
    return `Rs ${amount}`;
  }
};

function PrimaryButton({ title, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="h-8 min-w-[86px] rounded-lg px-2.5 bg-[#0d3b8f] flex-row items-center justify-center shrink-0"
      style={{ gap: 4, maxWidth: 98 }}
    >
      <Text className="text-white font-extrabold text-[11px]" numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      <Ionicons name="arrow-forward" size={10} color="#ffffff" />
    </TouchableOpacity>
  );
}


function TourCard({ tour, onPressDetails }) {
  const rating = toNumber(tour?.starRating) || 0;
  const price = toNumber(tour?.price);
  const places = getTourPlaces(tour) || "-";
  const city = tour?.city || "-";
  const agency = tour?.travelAgencyName || "-";
  const nights = toNumber(tour?.nights) || 0;
  const days = toNumber(tour?.days) || 0;

  const theme = splitCsvText(tour?.themes)[0] || "";

  const badgeText = theme || `${nights}N/${days}D`;
  const mainImage = tour?.images?.[0] || "";

  return (
    <View className="mx-4 mb-2.5 bg-white rounded-xl border border-slate-200 p-2 overflow-hidden">
      <View className="flex-row h-[120px]">
        <View className="w-[98px] h-[120px] rounded-[10px] overflow-hidden bg-slate-200 relative">
          {mainImage ? (
            <Image source={{ uri: mainImage }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full bg-slate-300" />
          )}

          <View className="absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 bg-white/90 border border-slate-200 flex-row items-center">
            <Ionicons name="star" size={8} color="#f59e0b" />
            <Text className="text-[9px] font-black text-slate-800 ml-1">{rating.toFixed(1)}</Text>
          </View>
        </View>

        <View className="flex-1 ml-2.5 justify-between" style={{ minWidth: 0 }}>
          <View>
            <Text className="text-[13px] leading-[16px] font-black text-slate-900" numberOfLines={2} ellipsizeMode="tail">
              {places}
            </Text>

            <View className="flex-row items-center mt-0.5" style={{ minWidth: 0 }}>
              <Ionicons name="location-sharp" size={10} color="#334155" />
              <Text
                className="text-[11px] font-semibold text-slate-600 ml-1"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ flexShrink: 1 }}
              >
                {city}
              </Text>
            </View>

            <View className="flex-row items-center mt-1" style={{ minWidth: 0, gap: 6 }}>
              <View
                className="px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-200"
                style={{ maxWidth: "62%", flexShrink: 1 }}
              >
                <Text className="text-[9px] font-extrabold text-slate-600" numberOfLines={1} ellipsizeMode="tail">
                  {agency}
                </Text>
              </View>
              <View
                className="px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100"
                style={{ maxWidth: "36%", flexShrink: 1 }}
              >
                <Text className="text-[9px] font-extrabold text-[#0d3b8f]" numberOfLines={1} ellipsizeMode="tail">
                  {badgeText}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-end justify-between mt-1" style={{ minWidth: 0 }}>
            <View className="flex-1 pr-1.5" style={{ minWidth: 0 }}>
              <Text className="text-[8px] font-black tracking-wider text-slate-400">STARTING FROM</Text>
              <Text
                className="text-[18px] leading-[20px] font-black text-[#0d3b8f]"
                numberOfLines={1}
                style={{ flexShrink: 1 }}
              >
                {formatINR(price)}
              </Text>
              <Text className="text-[10px] font-semibold text-slate-500 mt-[-1px]">/ person</Text>
            </View>
            <PrimaryButton title="View" onPress={onPressDetails} />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function Tour() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tourState = useSelector((state) => state.tour);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");

  const [tourPriceRange, setTourPriceRange] = useState([0, 50000]);
  const [tourMinRating, setTourMinRating] = useState(0);
  const [tourSelectedAmenities, setTourSelectedAmenities] = useState([]);
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [sortOrderFilter, setSortOrderFilter] = useState("default");
  const [durationSortFilter, setDurationSortFilter] = useState("default");

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

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (normalizePlaceToken(fromCity)) count += 1;
    if (normalizePlaceToken(toCity)) count += 1;
    if (String(searchText || "").trim()) count += 1;

    if (tourPriceRange[0] !== 0 || tourPriceRange[1] !== 50000) count += 1;
    if (tourMinRating > 0) count += 1;

    count += selectedThemes.length;
    count += tourSelectedAmenities.length;

    if (sortOrderFilter !== "default") count += 1;
    if (durationSortFilter !== "default") count += 1;

    return count;
  }, [
    fromCity,
    toCity,
    searchText,
    tourPriceRange,
    tourMinRating,
    selectedThemes,
    tourSelectedAmenities,
    sortOrderFilter,
    durationSortFilter,
  ]);

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
    const from = normalizePlaceToken(fromCity);
    const to = normalizePlaceToken(toCity);
    const queryText = String(searchText || "").trim();

    const payload = {};

    if (from) payload.fromWhere = from;
    if (to) payload.to = to;

    // Keep free-text query only when from/to route filters are not being used.
    if (!from && !to && queryText) {
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
    const from = normalizePlaceToken(fromCity);
    const to = normalizePlaceToken(toCity);
    const q = String(searchText || "").trim();

    if (!from && !to && !q) {
      return undefined;
    }

    const timer = setTimeout(() => {
      const payload = buildFilterQueryPayload({ includeAdvanced: false });
      dispatch(filterToursByQuery(payload));
    }, 350);

    return () => clearTimeout(timer);
  }, [dispatch, fromCity, toCity, searchText]);

  const handleApplyFilters = async () => {
    const payload = buildFilterQueryPayload({ includeAdvanced: true });
    await dispatch(filterToursByQuery(payload));
    setShowFilterModal(false);
  };

  const handleClearAllFilters = async () => {
    setShowFilterModal(false);
    setTourPriceRange([0, 50000]);
    setTourMinRating(0);
    setTourSelectedAmenities([]);
    setSelectedThemes([]);
    setSortOrderFilter("default");
    setDurationSortFilter("default");
    setFromCity("");
    setToCity("");
    setSearchText("");
    await dispatch(fetchTourList());
  };

  const handleViewDetails = (tourId) => {
    if (!tourId) return;
    navigation.navigate("TourDetails", { tourId });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["left", "right", "bottom"]}>
      <ScrollView
        className="flex-1 bg-slate-100"
        contentContainerStyle={{ paddingBottom: 120 }}
        stickyHeaderIndices={[1]}
      >
        <Header
          compact
          showHero={false}
          showBack
          leftTitle="Explore Tours"
          onBackPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            navigation.navigate("Search");
          }}
        />

        <View className="pt-2 pb-3 bg-slate-100 z-20">
          <View className="mx-3 bg-white rounded-2xl border border-slate-200 px-3 py-2">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[17px] font-black text-slate-900">Find Your Tour</Text>
                <Text className="text-[12px] mt-0.5 text-slate-500">Search by route, city, or package</Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowFilterModal(true)}
                activeOpacity={0.9}
                className="h-10 w-10 rounded-2xl bg-white border border-slate-200 items-center justify-center relative"
              >
                <Ionicons name="options-outline" size={18} color="#0f172a" />
                {activeFilterCount > 0 && (
                  <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#be4a6a] border border-white items-center justify-center">
                    <Text className="text-white text-[10px] font-black">
                      {activeFilterCount > 99 ? "99+" : activeFilterCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* FROM / TO (compact) */}
            <View className="mt-3 flex-row" style={{ gap: 10 }}>
              <View className="flex-1 h-11 rounded-2xl bg-[#fff4ef] border border-[#f3d5cb] px-3 flex-row items-center" style={{ gap: 8 }}>
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
              <View className="flex-1 h-11 rounded-2xl bg-[#fff4ef] border border-[#f3d5cb] px-3 flex-row items-center" style={{ gap: 8 }}>
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
            <View className="mt-3 h-11 rounded-2xl bg-[#fff4ef] border border-[#f3d5cb] px-3 flex-row items-center">
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
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
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
                      style={{ maxWidth: "100%" }}
                    >
                      <Text className={`text-[12px] font-extrabold ${isSelected ? "text-blue-700" : "text-slate-600"}`} numberOfLines={1}>
                        {label}
                      </Text>
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
                <View className="flex-row flex-wrap" style={{ gap: 10 }}>
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
                        style={{ maxWidth: "100%" }}
                      >
                        <Text className={`text-[12px] font-semibold ${isSelected ? "text-blue-700" : "text-slate-600"}`} numberOfLines={1}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="mt-6">
                <Text className="text-[13px] font-black text-slate-900 mb-3">Sort By Duration</Text>
                <View className="flex-row flex-wrap" style={{ gap: 10 }}>
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
                        style={{ maxWidth: "100%" }}
                      >
                        <Text className={`text-[12px] font-semibold ${isSelected ? "text-blue-700" : "text-slate-600"}`} numberOfLines={1}>
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
                        style={{ maxWidth: "100%" }}
                      >
                        <Text
                          className={`text-[12px] font-semibold ${isSelected ? "text-blue-700" : "text-slate-500"}`}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{ maxWidth: 220 }}
                        >
                          {theme}
                        </Text>
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
                        style={{ maxWidth: "100%" }}
                      >
                        <Text
                          className={`text-[12px] font-semibold ${isSelected ? "text-blue-700" : "text-slate-500"}`}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={{ maxWidth: 220 }}
                        >
                          {amenity}
                        </Text>
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

    </SafeAreaView>
  );
}

