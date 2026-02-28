import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { fetchAllCabs, filterCabsByQuery } from "../store/slices/cabSlice";
import CabsSkeleton from "../components/skeleton/CabsSkeleton";
import Header from "../components/Header";

const FILTERS = ["All", "Car", "Bus", "Shared", "Private"];

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const formatTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

const normalizeBool = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return null;
};

const isSeatBooked = (seat) => {
  const direct = normalizeBool(seat?.isBooked ?? seat?.booked ?? seat?.isSeatBooked);
  if (direct !== null) return direct;

  const status = String(seat?.status || seat?.seatStatus || "").trim().toLowerCase();
  if (status.includes("book")) return true;
  if (status.includes("open") || status.includes("available") || status.includes("vacant")) return false;
  return false;
};

const getTotalSeats = (cab) => {
  const configured = Array.isArray(cab?.seatConfig) ? cab.seatConfig.length : 0;
  const seater = Number(cab?.seater);
  const declared = Number.isFinite(seater) && seater > 0 ? seater : 0;
  return Math.max(declared, configured);
};

const getBookedSeats = (cab) =>
  (Array.isArray(cab?.seatConfig) ? cab.seatConfig : []).filter((seat) => isSeatBooked(seat)).length;

const getFare = (cab) =>
  String(cab?.sharingType || "").toLowerCase() === "shared" ? cab?.perPersonCost : cab?.price;

const getCabId = (cab) =>
  String(
    cab?._id ??
      cab?.carId ??
      cab?.id ??
      cab?.cabId ??
      cab?.carID ??
      cab?.cabID ??
      ""
  ).trim();

const resolveCabBookingState = (cab) => {
  const isRunning = normalizeBool(cab?.isRunning);
  if (isRunning === false) {
    return { key: "unavailable", label: "Unavailable", canBook: false };
  }

  const totalSeats = getTotalSeats(cab);
  const bookedSeats = getBookedSeats(cab);
  if (totalSeats > 0 && bookedSeats >= totalSeats) {
    return { key: "fullyBooked", label: "Fully Booked", canBook: false };
  }

  const isAvailable = normalizeBool(cab?.isAvailable);
  if (isAvailable === false) {
    return { key: "unavailable", label: "Unavailable", canBook: false };
  }

  const status = String(cab?.runningStatus || "").trim().toLowerCase();
  if (status.includes("unavailable") || status.includes("not available")) {
    return { key: "unavailable", label: "Unavailable", canBook: false };
  }

  return { key: "available", label: "Available", canBook: true };
};

const matchesCabSearchQuery = (cab, query) => {
  if (!query) return true;
  const normalized = query.toLowerCase();
  const searchableFields = [
    cab?.make,
    cab?.model,
    cab?.vehicleNumber,
    cab?.fuelType,
    cab?.seater,
    cab?.pickupP,
    cab?.dropP,
    cab?.pickupD,
    cab?.dropD,
  ];
  return searchableFields.some((field) =>
    String(field ?? "").toLowerCase().includes(normalized)
  );
};

export default function Cabs({ navigation }) {
  const dispatch = useDispatch();
  const { items: cabItems, status, error } = useSelector((s) => s.cab || {});

  const [route, setRoute] = useState({ pickup: "", drop: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDock, setShowFilterDock] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    make: "",
    model: "",
    vehicleNumber: "",
    fuelType: "",
    seater: "",
    pickupD: "",
    dropD: "",
  });
  const [selectedCabType, setSelectedCabType] = useState("All");
  const [isSearching, setIsSearching] = useState(false);

  const [pickupDateTime, setPickupDateTime] = useState(new Date());
  const [hasEditedPickupDateTime, setHasEditedPickupDateTime] = useState(false);
  const [openPicker, setOpenPicker] = useState(null);

  const activeDockFilterCount = useMemo(() => {
    return Object.values(advancedFilters).filter((value) => String(value || "").trim()).length;
  }, [advancedFilters]);

  const queryParams = useMemo(() => {
    const next = {};
    const pickup = route.pickup.trim();
    const drop = route.drop.trim();
    const q = searchQuery.trim();

    if (q) {
      next.q = q;
      next.searchQuery = q;
    }
    if (pickup) next.pickupP = pickup;
    if (drop) next.dropP = drop;
    if (hasEditedPickupDateTime) next.pickupD = pickupDateTime.toISOString();
    if (advancedFilters.make.trim()) next.make = advancedFilters.make.trim();
    if (advancedFilters.model.trim()) next.model = advancedFilters.model.trim();
    if (advancedFilters.vehicleNumber.trim()) next.vehicleNumber = advancedFilters.vehicleNumber.trim();
    if (advancedFilters.fuelType.trim()) next.fuelType = advancedFilters.fuelType.trim();
    if (advancedFilters.seater.trim()) next.seater = advancedFilters.seater.trim();
    if (advancedFilters.pickupD.trim()) next.pickupD = advancedFilters.pickupD.trim();
    if (advancedFilters.dropD.trim()) next.dropD = advancedFilters.dropD.trim();

    const hasServerFilters = Object.keys(next).length > 0;
    if (hasServerFilters) {
      if (selectedCabType === "Car" || selectedCabType === "Bus") {
        next.vehicleType = selectedCabType.toLowerCase();
      }
      if (selectedCabType === "Shared" || selectedCabType === "Private") {
        next.sharingType = selectedCabType.toLowerCase();
      }
    }

    return next;
  }, [
    route.pickup,
    route.drop,
    searchQuery,
    hasEditedPickupDateTime,
    pickupDateTime,
    advancedFilters,
    selectedCabType,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(queryParams).length === 0) {
        dispatch(fetchAllCabs());
        return;
      }
      dispatch(filterCabsByQuery(queryParams));
    }, 350);

    return () => clearTimeout(timer);
  }, [dispatch, queryParams]);

  const filteredCabs = useMemo(() => {
    const pickup = route.pickup.trim().toLowerCase();
    const drop = route.drop.trim().toLowerCase();
    const query = searchQuery.trim().toLowerCase();

    return (Array.isArray(cabItems) ? cabItems : []).filter((cab) => {
      const vehicleType = String(cab?.vehicleType || "").toLowerCase();
      const sharingType = String(cab?.sharingType || "").toLowerCase();

      if (selectedCabType === "Car" && vehicleType !== "car") return false;
      if (selectedCabType === "Bus" && vehicleType !== "bus") return false;
      if (selectedCabType === "Shared" && sharingType !== "shared") return false;
      if (selectedCabType === "Private" && sharingType !== "private") return false;

      if (pickup && !String(cab?.pickupP || "").toLowerCase().includes(pickup)) return false;
      if (drop && !String(cab?.dropP || "").toLowerCase().includes(drop)) return false;
      if (!matchesCabSearchQuery(cab, query)) return false;

      return true;
    });
  }, [cabItems, selectedCabType, route.pickup, route.drop, searchQuery]);

  const handleSwap = () => setRoute((p) => ({ pickup: p.drop, drop: p.pickup }));

  const updateAdvancedFilter = (field, value) => {
    setAdvancedFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      make: "",
      model: "",
      vehicleNumber: "",
      fuelType: "",
      seater: "",
      pickupD: "",
      dropD: "",
    });
  };

  const runCabSearchRequest = async () => {
    if (Object.keys(queryParams).length === 0) {
      return dispatch(fetchAllCabs());
    }
    return dispatch(filterCabsByQuery(queryParams));
  };

  const handleCabSearch = async () => {
    setIsSearching(true);
    try {
      await runCabSearchRequest();
    } finally {
      setTimeout(() => setIsSearching(false), 250);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["left", "right", "bottom"]}>
      <Header
        compact
        showHero={false}
        showBack
        leftTitle="Book Your Ride"
        onBackPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            return;
          }
          navigation.navigate("Search");
        }}
      />
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]} // Index 1 is the sticky filter dock
      >
        {/* ========================================== */}
        {/* INDEX 0: SEARCH CARD                        */}
        {/* ========================================== */}
        <View className="bg-slate-100 border-b border-slate-200">
          {/* Overlapping Search Card */}
          <View className="mt-3 mx-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm elevation-3">
            
            {/* Transit Route Input */}
            <View className="flex-row items-center bg-slate-50 rounded-xl p-3.5 border border-slate-100 relative">
              
              <View className="items-center mr-3">
                <View className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <View className="w-[2px] h-8 bg-slate-300 rounded-full my-1" />
                <View className="h-2.5 w-2.5 rounded-[3px] bg-rose-500" />
              </View>

              <View className="flex-1">
                <TextInput
                  value={route.pickup}
                  onChangeText={(t) => setRoute((p) => ({ ...p, pickup: t }))}
                  placeholder="Enter Pickup Location"
                  placeholderTextColor="#94a3b8"
                  className="h-10 text-[15px] font-bold text-slate-900 p-0"
                />
                <View className="h-[1px] bg-slate-200 w-full my-1.5" />
                <TextInput
                  value={route.drop}
                  onChangeText={(t) => setRoute((p) => ({ ...p, drop: t }))}
                  placeholder="Enter Drop Location"
                  placeholderTextColor="#94a3b8"
                  className="h-10 text-[15px] font-bold text-slate-900 p-0"
                />
              </View>

              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={handleSwap}
                className="absolute right-3 top-1/2 -mt-[20px] h-10 w-10 rounded-full bg-white items-center justify-center border border-slate-200 shadow-sm elevation-2"
              >
                <Ionicons name="swap-vertical" size={18} color="#0d3b8f" />
              </TouchableOpacity>
            </View>

            {/* Date & Time Row */}
            <View className="flex-row mt-4 gap-3">
              <TouchableOpacity 
                style={{ flex: 1 }} 
                className="flex-row items-center justify-between bg-white rounded-xl border border-slate-200 px-3.5 py-3" 
                onPress={() => setOpenPicker("date")}
              >
                <View>
                  <Text className="text-[10px] font-extrabold text-slate-400 tracking-wider mb-0.5 uppercase">Date</Text>
                  <Text className="text-[14px] font-black text-slate-900">{formatDate(pickupDateTime)}</Text>
                </View>
                <Ionicons name="calendar" size={18} color="#0d3b8f" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flex: 1 }} 
                className="flex-row items-center justify-between bg-white rounded-xl border border-slate-200 px-3.5 py-3" 
                onPress={() => setOpenPicker("time")}
              >
                <View>
                  <Text className="text-[10px] font-extrabold text-slate-400 tracking-wider mb-0.5 uppercase">Time</Text>
                  <Text className="text-[14px] font-black text-slate-900">{formatTime(pickupDateTime)}</Text>
                </View>
                <Ionicons name="time" size={18} color="#0d3b8f" />
              </TouchableOpacity>
            </View>

            {/* Search Button */}
            <TouchableOpacity 
              className="mt-4 h-[52px] bg-[#0d3b8f] rounded-xl items-center justify-center" 
              activeOpacity={0.9} 
              onPress={handleCabSearch}
            >
              {isSearching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-[15px] font-black text-white tracking-wide">Find Cabs</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================== */}
        {/* INDEX 1: STICKY FILTERS                    */}
        {/* ========================================== */}
        <View className="bg-slate-100 py-3 border-b border-slate-200 z-10">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {FILTERS.map((type) => {
              const active = selectedCabType === type;
              return (
                <TouchableOpacity
                  key={type}
                  className={`h-[34px] rounded-full px-4 items-center justify-center bg-white border ${
                    active ? "bg-[#0d3b8f] border-[#0d3b8f]" : "border-slate-300"
                  }`}
                  onPress={() => setSelectedCabType(type)}
                  activeOpacity={0.8}
                >
                  <Text className={`text-[13px] font-extrabold ${active ? "text-black" : "text-slate-600"}`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View className="mt-2 px-4 flex-row items-center" style={{ gap: 8 }}>
            <View className="h-10 flex-1 rounded-xl bg-white border border-slate-200 px-3 flex-row items-center">
              <Ionicons name="search" size={16} color="#64748b" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search make, model, number..."
                placeholderTextColor="#94a3b8"
                className="flex-1 ml-2 text-[13px] font-semibold text-slate-800"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleCabSearch}
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1" activeOpacity={0.8}>
                  <Ionicons name="close-circle" size={17} color="#94a3b8" />
                </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity
              onPress={() => setShowFilterDock(true)}
              activeOpacity={0.8}
              className="h-10 w-10 rounded-xl bg-white border border-slate-300 items-center justify-center relative"
            >
              <Ionicons name="options-outline" size={17} color="#0d3b8f" />
              {activeDockFilterCount > 0 && (
                <View className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-[#0d3b8f] border border-white items-center justify-center px-1">
                  <Text className="text-[9px] font-black text-white">
                    {activeDockFilterCount > 9 ? "9+" : activeDockFilterCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================== */}
        {/* INDEX 2: CABS LIST & STATES                */}
        {/* ========================================== */}
        <View className="px-4 pt-2">
          {status === "failed" && (
            <Text className="text-[13px] font-bold text-red-500 mb-2">{error?.message || "Failed to load cabs"}</Text>
          )}

          {status === "loading" && filteredCabs.length === 0 ? (
            <View className="pt-1">
              <CabsSkeleton count={4} />
            </View>
          ) : filteredCabs.length === 0 ? (
            <View className="items-center justify-center py-16 opacity-70">
              <Ionicons name="car-sport" size={48} color="#94a3b8" />
              <Text className="mt-3 text-[16px] font-extrabold text-slate-900">No Cabs Available</Text>
              <Text className="mt-1 text-[14px] font-medium text-slate-500 text-center px-5">Try changing your route or dates to find available rides.</Text>
            </View>
          ) : (
            filteredCabs.map((cab, idx) => {
              const fare = getFare(cab);
              const seats = getTotalSeats(cab);
              const isShared = String(cab?.sharingType || "").toLowerCase() === "shared";
              const bookingState = resolveCabBookingState(cab);
              const canBook = bookingState.canBook;
              const statusChipClasses =
                bookingState.key === "available"
                  ? { chip: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" }
                  : bookingState.key === "fullyBooked"
                  ? { chip: "bg-amber-50 border-amber-200", text: "text-amber-700" }
                  : { chip: "bg-rose-50 border-rose-200", text: "text-rose-700" };

              return (
                <View key={getCabId(cab) || `cab-${idx}`} className="bg-white rounded-[20px] border border-slate-200 p-3 mb-3.5 shadow-sm elevation-2">
                  
                  {/* Top Row */}
                  <View className="flex-row">
                    <View className="h-[76px] w-[76px] rounded-xl bg-slate-100 overflow-hidden relative">
                      <Image
                        source={{ uri: cab?.images?.[0] || "https://via.placeholder.com/150?text=Cab" }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      <View className="absolute bottom-0 w-full bg-black/60 py-[3px] items-center">
                        <Text className="text-[9px] font-extrabold text-white uppercase tracking-wider">{isShared ? "Shared" : "Private"}</Text>
                      </View>
                    </View>

                    <View className="flex-1 ml-3.5 justify-center">
                      <View className="flex-row justify-between items-start">
                        <Text className="flex-1 text-[16px] font-black text-slate-900 pr-2" numberOfLines={1}>
                          {cab?.make} {cab?.model}
                        </Text>
                        <View className="items-end">
                          <Text className="text-[20px] font-black text-slate-900 leading-[22px]">{`\u20B9${fare ?? "N/A"}`}</Text>
                          <Text className="text-[10px] font-bold text-slate-400">{isShared ? "/ seat" : "/ trip"}</Text>
                        </View>
                      </View>

                      <Text className="text-[12px] font-bold text-slate-500 mt-0.5">
                        {cab?.vehicleType || "Car"} | {seats || 0} Seats | {cab?.fuelType || "Petrol"}
                      </Text>

                      <View className="flex-row items-center bg-slate-50 self-start px-2 py-1 rounded-md mt-2">
                        <Text className="text-[11px] font-extrabold text-slate-600 max-w-[90px]" numberOfLines={1}>
                          {cab?.pickupP || "Pickup"}
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={14} color="#94a3b8" style={{ marginHorizontal: 2 }} />
                        <Text className="text-[11px] font-extrabold text-slate-600 max-w-[90px]" numberOfLines={1}>
                          {cab?.dropP || "Drop"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Bottom Action Row */}
                  <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-slate-100">
                    <View className="flex-row items-center flex-1 pr-2">
                      <MaterialCommunityIcons name="shield-check" size={16} color="#10b981" />
                      <Text className="ml-1 text-[12px] font-extrabold text-[#0d3b8f]">Verified Partner</Text>
                      <View className={`ml-2 px-2 py-1 rounded-md border ${statusChipClasses.chip}`}>
                        <Text className={`text-[10px] font-extrabold ${statusChipClasses.text}`}>
                          {bookingState.label}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      disabled={!canBook}
                      className={`px-5 h-[34px] rounded-lg items-center justify-center ${
                        canBook ? "bg-[#0d3b8f]" : "bg-slate-300"
                      }`}
                      activeOpacity={canBook ? 0.8 : 1}
                      onPress={() => {
                        if (!canBook) return;
                        const cabId = getCabId(cab);
                        navigation.navigate("CabDetails", {
                          cabId: cabId || undefined,
                          cab,
                        });
                      }}
                    >
                      <Text className={`text-[13px] font-extrabold ${canBook ? "text-white" : "text-slate-500"}`}>
                        Book Now
                      </Text>
                    </TouchableOpacity>
                  </View>

                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showFilterDock}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterDock(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-4 pt-4 pb-5 max-h-[84%]">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-[17px] font-black text-slate-900">Filter Bar</Text>
                <Text className="text-[12px] text-slate-500 mt-0.5">
                  make, model, number, fuel, seats, pickup/drop dates
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFilterDock(false)}
                className="h-9 w-9 rounded-full bg-slate-100 items-center justify-center"
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row" style={{ gap: 10 }}>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-slate-600 mb-1">Make</Text>
                  <TextInput
                    value={advancedFilters.make}
                    onChangeText={(v) => updateAdvancedFilter("make", v)}
                    placeholder="Toyota"
                    placeholderTextColor="#94a3b8"
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-800"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-slate-600 mb-1">Model</Text>
                  <TextInput
                    value={advancedFilters.model}
                    onChangeText={(v) => updateAdvancedFilter("model", v)}
                    placeholder="Innova"
                    placeholderTextColor="#94a3b8"
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-800"
                  />
                </View>
              </View>

              <View className="mt-3">
                <Text className="text-[11px] font-bold text-slate-600 mb-1">Vehicle Number</Text>
                <TextInput
                  value={advancedFilters.vehicleNumber}
                  onChangeText={(v) => updateAdvancedFilter("vehicleNumber", v)}
                  placeholder="UP32AB1234"
                  placeholderTextColor="#94a3b8"
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-800"
                />
              </View>

              <View className="mt-3 flex-row" style={{ gap: 10 }}>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-slate-600 mb-1">Fuel Type</Text>
                  <TextInput
                    value={advancedFilters.fuelType}
                    onChangeText={(v) => updateAdvancedFilter("fuelType", v)}
                    placeholder="Petrol / Diesel"
                    placeholderTextColor="#94a3b8"
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-800"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-slate-600 mb-1">Seater</Text>
                  <TextInput
                    value={advancedFilters.seater}
                    onChangeText={(v) => updateAdvancedFilter("seater", v)}
                    placeholder="4"
                    keyboardType="number-pad"
                    placeholderTextColor="#94a3b8"
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-800"
                  />
                </View>
              </View>

              <View className="mt-3 flex-row" style={{ gap: 10 }}>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-slate-600 mb-1">Pickup Date</Text>
                  <TextInput
                    value={advancedFilters.pickupD}
                    onChangeText={(v) => updateAdvancedFilter("pickupD", v)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-800"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-bold text-slate-600 mb-1">Drop Date</Text>
                  <TextInput
                    value={advancedFilters.dropD}
                    onChangeText={(v) => updateAdvancedFilter("dropD", v)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] font-semibold text-slate-800"
                  />
                </View>
              </View>
            </ScrollView>

            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={clearAdvancedFilters}
                className="flex-1 h-11 rounded-xl bg-slate-100 items-center justify-center"
                activeOpacity={0.8}
              >
                <Text className="text-[13px] font-black text-slate-600">Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setShowFilterDock(false);
                  await handleCabSearch();
                }}
                className="flex-[1.4] h-11 rounded-xl bg-[#0d3b8f] items-center justify-center"
                activeOpacity={0.8}
              >
                <Text className="text-[13px] font-black text-white">Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date/Time Pickers */}
      <DateTimePickerModal
        isVisible={openPicker === "date"}
        mode="date"
        date={pickupDateTime}
        onCancel={() => setOpenPicker(null)}
        onConfirm={(d) => {
          setPickupDateTime((prev) => {
            const next = new Date(prev);
            next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
            return next;
          });
          setHasEditedPickupDateTime(true);
          setOpenPicker(null);
        }}
      />
      <DateTimePickerModal
        isVisible={openPicker === "time"}
        mode="time"
        date={pickupDateTime}
        onCancel={() => setOpenPicker(null)}
        onConfirm={(d) => {
          setPickupDateTime((prev) => {
            const next = new Date(prev);
            next.setHours(d.getHours(), d.getMinutes(), 0, 0);
            return next;
          });
          setHasEditedPickupDateTime(true);
          setOpenPicker(null);
        }}
      />
    </SafeAreaView>
  );
}
