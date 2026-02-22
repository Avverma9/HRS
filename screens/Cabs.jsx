import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { fetchAllCabs } from "../store/slices/cabSlice";

const FILTERS = ["All", "Car", "Bus", "Shared", "Private"];

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const formatTime = (d) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

const getTotalSeats = (cab) => {
  const configured = Array.isArray(cab?.seatConfig) ? cab.seatConfig.length : 0;
  const seater = Number(cab?.seater);
  return Number.isFinite(seater) && seater > 0 ? seater : configured;
};

const getFare = (cab) =>
  String(cab?.sharingType || "").toLowerCase() === "shared" ? cab?.perPersonCost : cab?.price;

export default function Cabs() {
  const dispatch = useDispatch();
  const { items: cabItems, status, error } = useSelector((s) => s.cab || {});

  const [route, setRoute] = useState({ pickup: "", drop: "" });
  const [selectedCabType, setSelectedCabType] = useState("All");
  const [isSearching, setIsSearching] = useState(false);

  const [pickupDateTime, setPickupDateTime] = useState(new Date());
  const [openPicker, setOpenPicker] = useState(null);

  useEffect(() => {
    if (status === "idle") dispatch(fetchAllCabs());
  }, [dispatch, status]);

  const filteredCabs = useMemo(() => {
    const pickup = route.pickup.trim().toLowerCase();
    const drop = route.drop.trim().toLowerCase();

    return (Array.isArray(cabItems) ? cabItems : []).filter((cab) => {
      const vehicleType = String(cab?.vehicleType || "").toLowerCase();
      const sharingType = String(cab?.sharingType || "").toLowerCase();

      if (selectedCabType === "Car" && vehicleType !== "car") return false;
      if (selectedCabType === "Bus" && vehicleType !== "bus") return false;
      if (selectedCabType === "Shared" && sharingType !== "shared") return false;
      if (selectedCabType === "Private" && sharingType !== "private") return false;

      if (pickup && !String(cab?.pickupP || "").toLowerCase().includes(pickup)) return false;
      if (drop && !String(cab?.dropP || "").toLowerCase().includes(drop)) return false;

      return true;
    });
  }, [cabItems, selectedCabType, route.pickup, route.drop]);

  const handleSwap = () => setRoute((p) => ({ pickup: p.drop, drop: p.pickup }));

  const handleCabSearch = async () => {
    setIsSearching(true);
    try {
      await dispatch(fetchAllCabs());
    } finally {
      setTimeout(() => setIsSearching(false), 250);
    }
  };

  return (
    // SafeArea wrapper with dark slate background for top status bar area
    <SafeAreaView className="flex-1 bg-slate-900" edges={["top"]}>
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]} // Index 1 is the sticky filter
      >
        {/* ========================================== */}
        {/* INDEX 0: HEADER & SEARCH CARD              */}
        {/* ========================================== */}
        <View className="bg-slate-50">
          
          {/* Header Background */}
          <View className="bg-slate-900 px-5 pt-4 pb-16 rounded-b-[32px]">
            <Text className="text-[28px] font-black text-white tracking-tight">Book your ride</Text>
            <Text className="text-[14px] font-medium text-slate-400 mt-1">Comfortable & affordable intercity travel</Text>
          </View>

          {/* Overlapping Search Card */}
          <View className="-mt-11 mx-4 bg-white rounded-2xl p-3 border border-slate-200 shadow-sm elevation-3">
            
            {/* Transit Route Input */}
            <View className="flex-row items-center bg-slate-50 rounded-xl p-3 border border-slate-100 relative">
              
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
                  className="h-9 text-[15px] font-bold text-slate-900 p-0"
                />
                <View className="h-[1px] bg-slate-200 w-full my-1" />
                <TextInput
                  value={route.drop}
                  onChangeText={(t) => setRoute((p) => ({ ...p, drop: t }))}
                  placeholder="Enter Drop Location"
                  placeholderTextColor="#94a3b8"
                  className="h-9 text-[15px] font-bold text-slate-900 p-0"
                />
              </View>

              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={handleSwap}
                className="absolute right-3 top-1/2 -mt-[18px] h-9 w-9 rounded-full bg-white items-center justify-center border border-slate-200 shadow-sm elevation-2"
              >
                <Ionicons name="swap-vertical" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Date & Time Row */}
            <View className="flex-row mt-3 gap-3">
              <TouchableOpacity 
                style={{ flex: 1 }} 
                className="flex-row items-center justify-between bg-white rounded-xl border border-slate-200 px-3.5 py-2.5" 
                onPress={() => setOpenPicker("date")}
              >
                <View>
                  <Text className="text-[10px] font-extrabold text-slate-400 tracking-wider mb-0.5 uppercase">Date</Text>
                  <Text className="text-[14px] font-black text-slate-900">{formatDate(pickupDateTime)}</Text>
                </View>
                <Ionicons name="calendar" size={18} color="#0f172a" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flex: 1 }} 
                className="flex-row items-center justify-between bg-white rounded-xl border border-slate-200 px-3.5 py-2.5" 
                onPress={() => setOpenPicker("time")}
              >
                <View>
                  <Text className="text-[10px] font-extrabold text-slate-400 tracking-wider mb-0.5 uppercase">Time</Text>
                  <Text className="text-[14px] font-black text-slate-900">{formatTime(pickupDateTime)}</Text>
                </View>
                <Ionicons name="time" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Search Button */}
            <TouchableOpacity 
              className="mt-3 h-12 bg-slate-900 rounded-xl items-center justify-center" 
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
        <View className="bg-slate-50 py-3 border-b border-slate-200/50 z-10">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {FILTERS.map((type) => {
              const active = selectedCabType === type;
              return (
                <TouchableOpacity
                  key={type}
                  className={`h-[34px] rounded-full px-4 items-center justify-center bg-white border ${
                    active ? "bg-slate-100 border-slate-900" : "border-slate-300"
                  }`}
                  onPress={() => setSelectedCabType(type)}
                  activeOpacity={0.8}
                >
                  <Text className={`text-[13px] font-extrabold ${active ? "text-slate-900" : "text-slate-600"}`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ========================================== */}
        {/* INDEX 2: CABS LIST & STATES                */}
        {/* ========================================== */}
        <View className="px-4 pt-2">
          {status === "failed" && (
            <Text className="text-[13px] font-bold text-red-500 mb-2">{error?.message || "Failed to load cabs"}</Text>
          )}

          {status === "loading" && filteredCabs.length === 0 ? (
            <View className="items-center justify-center py-16 opacity-70">
              <ActivityIndicator color="#0f172a" size="large" />
              <Text className="mt-3 text-[16px] font-extrabold text-slate-900">Finding best rides...</Text>
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

              return (
                <View key={cab?._id || `cab-${idx}`} className="bg-white rounded-[20px] border border-slate-200 p-3 mb-3.5 shadow-sm elevation-2">
                  
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
                        {cab?.vehicleType || "Car"} • {seats || 0} Seats • {cab?.fuelType || "Petrol"}
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
                    <View className="flex-row items-center">
                      <MaterialCommunityIcons name="shield-check" size={16} color="#10b981" />
                      <Text className="ml-1 text-[12px] font-extrabold text-emerald-500">Verified Partner</Text>
                    </View>

                    <TouchableOpacity className="bg-slate-900 px-5 h-[34px] rounded-lg items-center justify-center" activeOpacity={0.8}>
                      <Text className="text-[13px] font-extrabold text-white">Book Now</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              );
            })
          )}
        </View>
      </ScrollView>

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
          setOpenPicker(null);
        }}
      />
    </SafeAreaView>
  );
}
