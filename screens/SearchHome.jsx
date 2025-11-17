import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import { fetchLocation } from "../store/slices/locationSlice";
import { searchHotel } from "../store/slices/hotelSlice";
import { useNavigation } from "@react-navigation/native";

const SearchHome = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchCity, setSearchCity] = useState("");
  // default check-in / check-out (ISO format). Using today and tomorrow as defaults.
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  // Local ISO date (YYYY-MM-DD) using local date parts to avoid timezone shifts
  const iso = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const display = (d) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  // Calendar helpers for month-grid picker
  const startOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const getMonthMatrix = (date) => {
    const first = startOfMonth(date);
    const last = endOfMonth(date);
    const startWeekday = first.getDay(); // 0=Sun..6
    const daysInMonth = last.getDate();
    const weeks = [];
    let week = [];
    // fill previous month's tail
    const prevMonthEnd = new Date(
      date.getFullYear(),
      date.getMonth(),
      0
    ).getDate();
    for (let i = 0; i < startWeekday; i++) {
      const dayNum = prevMonthEnd - (startWeekday - 1 - i);
      // mark as previous month (offset -1)
      week.push({ day: dayNum, inMonth: false, monthOffset: -1 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      week.push({ day: d, inMonth: true, monthOffset: 0 });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    // fill next month's head
    let nextDay = 1;
    while (week.length < 7) {
      week.push({ day: nextDay++, inMonth: false, monthOffset: 1 });
    }
    weeks.push(week);
    return weeks;
  };

  const formatISO = (y, m, d) => {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };
  const [checkInDate, setCheckInDate] = useState(iso(today));
  const [checkOutDate, setCheckOutDate] = useState(iso(tomorrow));
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateModalTarget, setDateModalTarget] = useState("in");
  const [calendarBase, setCalendarBase] = useState(new Date(checkInDate));
  const [isSearching, setIsSearching] = useState(false);
  const [countRooms, setCountRooms] = useState(1);
  const [guests, setGuests] = useState(2);
  const checkInDateDisplay = `${display(new Date(checkInDate))}`;
  const checkOutDateDisplay = `${display(new Date(checkOutDate))}`;
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const {
    data: locations,
    loading,
    error,
  } = useSelector((state) => state.location);

  const handleSelect = async (title) => {
    try {
      setSelectedLocation(title);
      setSearchCity(title);
      // dispatch search and wait for result so Hotels opens with data ready
      setIsSearching(true);
      await dispatch(
        searchHotel({
          city: title,
          checkInDate,
          checkOutDate,
          countRooms,
          guests,
        })
      ).unwrap();
      navigation.navigate("Hotels", { searchQuery: title });
      setIsSearching(false);
    } catch (err) {
      setIsSearching(false);
      Alert.alert("Search failed", err?.toString() || "Unable to search");
      // still navigate so user can see empty/error state
      navigation.navigate("Hotels", { searchQuery: title });
    }
  };

  const handleSearch = async () => {
    if (!searchCity || searchCity.trim() === "") {
      Alert.alert(
        "Enter Location",
        "Please enter a city or location to search"
      );
      return;
    }
    const city = searchCity.trim();
    try {
      setIsSearching(true);
      await dispatch(
        searchHotel({ city, checkInDate, checkOutDate, countRooms, guests })
      ).unwrap();
      navigation.navigate("Hotels", { searchQuery: city });
      setIsSearching(false);
    } catch (err) {
      setIsSearching(false);
      Alert.alert("Search failed", err?.toString() || "Unable to search");
      navigation.navigate("Hotels", { searchQuery: city });
    }
  };

  const NearByItem = () => {
    const [loading, setLoading] = useState(false);
    const [label, setLabel] = useState("Near You");

    const handleNearMe = async () => {
      try {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission required",
            "Location permission is needed to find places near you."
          );
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const rev = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const city =
          rev && rev[0] ? rev[0].city || rev[0].region || "Nearby" : "Nearby";
        setLabel(city);
        setLoading(false);
        try {
          await dispatch(
            searchHotel({ city, checkInDate, checkOutDate, countRooms, guests })
          ).unwrap();
          navigation.navigate("Hotels", { searchQuery: city });
        } catch (err) {
          Alert.alert("Search failed", err?.toString() || "Unable to search");
          navigation.navigate("Hotels", { searchQuery: city });
        }
      } catch (e) {
        setLoading(false);
        Alert.alert("Error", "Unable to get location");
      }
    };

    return (
      <TouchableOpacity
        style={{ width: 72, alignItems: "center", marginRight: 12 }}
        activeOpacity={0.8}
        onPress={handleNearMe}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#e6f0ff",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          )}
        </View>
        <Text style={{ marginTop: 6, fontSize: 12, color: "#0f172a" }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };
  useEffect(() => {
    dispatch(fetchLocation());
  }, [dispatch]);
  return (
    <View className="flex-1 bg-slate-100">
      <LinearGradient
        colors={["#ffff", "#ffff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-14 px-5 pb-8"
      >
        <Image
          source={require("../assets/app-logo.png")}
          style={{ width: 120, height: 28, marginBottom: 4 }}
          resizeMode="contain"
        />
        <View className="absolute right-4 top-14 flex-row items-center">
          <TouchableOpacity
            className="w-8 h-8 rounded-full bg-white/20 items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className="text-white text-xs font-semibold">📞</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
 {/* Title below the search card as requested */}
      <View className="px-6 mt-4">
        <Text className="text-center text-lg font-bold text-slate-900">Welcome, Glad to See You</Text>

      </View>

      {/* place search card lower so it doesn't overlap the header/logo */}
      {/* blue rounded container matching header color; white card sits inset to show colored curved sides */}
      <View
        className="mt-6 mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#0d3b8f", paddingVertical: 10 }}
      >
        <View
          className="bg-white rounded-xl px-4 pt-4 pb-3 shadow-lg"
          style={{ marginHorizontal: 10 }}
        >
          <View className="py-2.5">
            <Text className="text-sm font-semibold text-slate-400 mb-1">
              Where to?
            </Text>
            <TextInput
              placeholder="Search city, area or hotel"
              placeholderTextColor="#ef4444"
              value={searchCity}
              onChangeText={setSearchCity}
              className="text-base font-semibold text-slate-900"
              style={{ padding: 0, margin: 0 }}
            />
          </View>

          <View className="h-px bg-gray-200" />

          <View className="py-2.5">
            <Text className="text-sm font-semibold text-slate-400 mb-1">
              Check-in & check-out
            </Text>
            <View className="flex-row items-center space-x-2">
              <TouchableOpacity
                onPress={() => {
                  setDateModalTarget("in");
                  setCalendarBase(new Date(checkInDate));
                  setShowDateModal(true);
                }}
                className="flex-1 border border-gray-200 px-3 py-2 rounded-md"
                activeOpacity={0.8}
              >
                <Text className="text-sm text-slate-900">
                  {checkInDateDisplay}
                </Text>
              </TouchableOpacity>
              <Text className="text-sm text-slate-400">to</Text>
              <TouchableOpacity
                onPress={() => {
                  setDateModalTarget("out");
                  setCalendarBase(new Date(checkOutDate));
                  setShowDateModal(true);
                }}
                className="flex-1 border border-gray-200 px-3 py-2 rounded-md"
                activeOpacity={0.8}
              >
                <Text className="text-sm text-slate-900">
                  {checkOutDateDisplay}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Calendar-style modal picker (month grid) */}
            <Modal visible={showDateModal} transparent animationType="fade">
              <View className="flex-1 bg-black/40 justify-center items-center px-4">
                <View className="bg-white rounded-2xl p-4 w-full max-w-md">
                  <View className="flex-row justify-between items-center mb-3">
                    <TouchableOpacity
                      onPress={() => setShowDateModal(false)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text className="text-slate-500">Close</Text>
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold">Select dates</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setCalendarBase(new Date(checkInDate));
                      }}
                    >
                      <Text className="text-slate-500">Today</Text>
                    </TouchableOpacity>
                  </View>

                  {/* month nav */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <TouchableOpacity
                        onPress={() =>
                          setCalendarBase(
                            (c) =>
                              new Date(c.getFullYear(), c.getMonth() - 1, 1)
                          )
                        }
                        className="px-3 py-1"
                      >
                        <Text>{"<"}</Text>
                      </TouchableOpacity>
                      <Text className="text-base font-semibold">
                        {calendarBase.toLocaleDateString("en-GB", {
                          month: "long",
                          year: "numeric",
                        })}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setCalendarBase(
                            (c) =>
                              new Date(c.getFullYear(), c.getMonth() + 1, 1)
                          )
                        }
                        className="px-3 py-1"
                      >
                        <Text>{">"}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text className="text-sm text-slate-500">
                      {dateModalTarget === "in"
                        ? "Selecting check-in"
                        : "Selecting check-out"}
                    </Text>
                  </View>

                  {/* weekdays header */}
                  <View className="flex-row justify-between mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (w) => (
                        <Text
                          key={w}
                          className="text-xs text-slate-500 text-center w-10"
                        >
                          {w}
                        </Text>
                      )
                    )}
                  </View>

                  {/* month grid */}
                  <View>
                    {getMonthMatrix(calendarBase).map((week, wi) => (
                      <View key={wi} className="flex-row justify-between mb-1">
                        {week.map((cell, ci) => {
                          // compute exact date using monthOffset provided by getMonthMatrix
                          const month =
                            calendarBase.getMonth() + (cell.monthOffset || 0);
                          let year = calendarBase.getFullYear();
                          if (month < 0) year = year - 1;
                          if (month > 11) year = year + 1;
                          const realMonth = (month + 12) % 12;
                          const cellDate = new Date(year, realMonth, cell.day);
                          const cellISO = iso(cellDate);
                          const startISO = checkInDate;
                          const endISO = checkOutDate;
                          const inRange =
                            new Date(cellISO) >= new Date(startISO) &&
                            new Date(cellISO) <= new Date(endISO);
                          const isStart = cellISO === startISO;
                          const isEnd = cellISO === endISO;
                          const disabled = !cell.inMonth;
                          return (
                            <TouchableOpacity
                              key={ci}
                              activeOpacity={0.8}
                              className={`w-10 h-10 items-center justify-center rounded ${isStart || isEnd ? "bg-indigo-600" : inRange ? "bg-indigo-300" : ""}`}
                              onPress={() => {
                                if (dateModalTarget === "in") {
                                  setCheckInDate(cellISO);
                                  if (
                                    new Date(checkOutDate) <= new Date(cellISO)
                                  ) {
                                    const next = new Date(cellDate);
                                    next.setDate(next.getDate() + 1);
                                    setCheckOutDate(iso(next));
                                  }
                                } else {
                                  if (
                                    new Date(cellISO) <= new Date(checkInDate)
                                  ) {
                                    Alert.alert(
                                      "Invalid date",
                                      "Check-out must be after check-in"
                                    );
                                    return;
                                  }
                                  setCheckOutDate(cellISO);
                                }
                              }}
                              disabled={disabled}
                              style={{ opacity: disabled ? 0.3 : 1 }}
                            >
                              <Text
                                className={`${isStart || isEnd ? "text-white font-bold" : "text-slate-800"}`}
                              >
                                {cell.day}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>

                  <View className="flex-row justify-end mt-3">
                    <TouchableOpacity
                      onPress={() => setShowDateModal(false)}
                      className="px-4 py-2 rounded-full bg-slate-100"
                    >
                      <Text>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>

          <View className="h-px bg-gray-200" />

          <View className="py-2.5">
            <Text className="text-sm font-semibold text-slate-400 mb-1">
              Guests
            </Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Text className="text-sm text-slate-600 mr-3">Guests</Text>
                <View className="flex-row items-center bg-gray-100 rounded-md">
                  <TouchableOpacity
                    onPress={() => setGuests((g) => Math.max(1, g - 1))}
                    className="px-3 py-2"
                  >
                    <Text className="text-lg">−</Text>
                  </TouchableOpacity>
                  <Text className="px-4 text-base font-semibold">{guests}</Text>
                  <TouchableOpacity
                    onPress={() => setGuests((g) => g + 1)}
                    className="px-3 py-2"
                  >
                    <Text className="text-lg">+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row items-center">
                <Text className="text-sm text-slate-600 mr-3">Rooms</Text>
                <View className="flex-row items-center bg-gray-100 rounded-md">
                  <TouchableOpacity
                    onPress={() => setCountRooms((r) => Math.max(1, r - 1))}
                    className="px-3 py-2"
                  >
                    <Text className="text-lg">−</Text>
                  </TouchableOpacity>
                  <Text className="px-4 text-base font-semibold">
                    {countRooms}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCountRooms((r) => r + 1)}
                    className="px-3 py-2"
                  >
                    <Text className="text-lg">+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            className={`mt-4 mb-1 rounded-full flex-row items-center justify-center py-2.5 ${isSearching ? "bg-amber-200" : "bg-amber-400"}`}
            activeOpacity={0.85}
            onPress={isSearching ? null : handleSearch}
          >
            {isSearching ? (
              <>
                <ActivityIndicator
                  color="#0f172a"
                  style={{ marginRight: 10 }}
                />
                <Text className="text-lg font-bold text-slate-900">
                  Searching...
                </Text>
              </>
            ) : (
              <>
                <Text className="text-lg mr-2">🔍</Text>
                <Text className="text-lg font-bold text-slate-900">Search</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Popular destinations horizontal list */}
      <View className="mt-3 pl-4 pb-1">
        <Text className="text-sm font-bold text-slate-900 mb-2">
          Popular destinations
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 18 }}
        >
          <NearByItem />
          {locations?.map((d) => (
            <TouchableOpacity
              key={d._id}
              className="items-center mr-3"
              activeOpacity={0.8}
              onPress={() => handleSelect(d?.location)}
            >
              <Image
                source={{ uri: d?.images[0] }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
              />
              <Text className="mt-1 text-xs text-slate-900">{d.location}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

export default SearchHome;
