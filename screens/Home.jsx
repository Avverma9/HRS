import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  StatusBar,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import * as Location from "expo-location";
import { fetchLocation } from "../store/slices/locationSlice";
import { searchHotel } from "../store/slices/hotelSlice";
import Header from "../components/Header";
import SearchCard from "../components/SearchCard";
import PopularDestinations from "../components/PopularDestinations";
import HomeScreenFrontHotels from "./HomeScreenFrontHotels";
import HomeScreenFrontTour from "./HomeScreenFrontTour";
import HomeScreenFrontCabs from "./HomeScreenFrontCabs";

const Home = ({ navigation }) => {
  // --- State Management ---
  const [searchCity, setSearchCity] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocatingCurrentLocation, setIsLocatingCurrentLocation] =
    useState(false);
  const [countRooms, setCountRooms] = useState(1);
  const [guests, setGuests] = useState(2);

  // --- Date Logic ---
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Helper: Format Date to YYYY-MM-DD
  const iso = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper: Display Date (e.g., "10 Feb")
  const display = (d) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  const [checkInDate, setCheckInDate] = useState(iso(today));
  const [checkOutDate, setCheckOutDate] = useState(iso(tomorrow));
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateModalTarget, setDateModalTarget] = useState("in"); // 'in' or 'out'
  const [calendarBase, setCalendarBase] = useState(new Date(checkInDate));

  const checkInDateDisplay = display(new Date(checkInDate));
  const checkOutDateDisplay = display(new Date(checkOutDate));

  // --- Redux & Navigation ---
  const dispatch = useDispatch();
  const { data: locations } = useSelector((state) => state.location);

  const isMountedRef = useRef(true);

  useEffect(() => {
    dispatch(fetchLocation());
    return () => {
      isMountedRef.current = false;
    };
  }, [dispatch]);

  // --- Calendar Matrix Generator ---
  const startOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const getMonthMatrix = (date) => {
    const first = startOfMonth(date);
    const last = endOfMonth(date);
    const startWeekday = first.getDay();
    const daysInMonth = last.getDate();
    const weeks = [];
    let week = [];

    const prevMonthEnd = new Date(
      date.getFullYear(),
      date.getMonth(),
      0,
    ).getDate();
    for (let i = 0; i < startWeekday; i++) {
      const dayNum = prevMonthEnd - (startWeekday - 1 - i);
      week.push({ day: dayNum, inMonth: false, monthOffset: -1 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      week.push({ day: d, inMonth: true, monthOffset: 0 });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    let nextDay = 1;
    while (week.length < 7) {
      week.push({ day: nextDay++, inMonth: false, monthOffset: 1 });
    }
    weeks.push(week);
    return weeks;
  };

  // --- Handlers ---
  const handleSelect = async (title) => {
    try {
      setSearchCity(title);
      if (isMountedRef.current) setIsSearching(true);
      await dispatch(
        searchHotel({
          city: title,
          checkInDate,
          checkOutDate,
          countRooms,
          guests,
        }),
      ).unwrap();
      navigation.navigate("Hotels", { searchQuery: title });
    } catch (err) {
      Alert.alert("Search failed", err?.toString());
      navigation.navigate("Hotels", { searchQuery: title });
    } finally {
      if (isMountedRef.current) setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchCity || searchCity.trim() === "") {
      Alert.alert("Enter Location", "Please enter a city or location.");
      return;
    }
    const city = searchCity.trim();
    try {
      if (isMountedRef.current) setIsSearching(true);
      await dispatch(
        searchHotel({ city, checkInDate, checkOutDate, countRooms, guests }),
      ).unwrap();
      navigation.navigate("Hotels", {
        searchQuery: city,
        checkInDate,
        checkOutDate,
        guests,
        countRooms,
      });
    } catch (err) {
      Alert.alert("Search failed", err?.toString());
      navigation.navigate("Hotels", {
        searchQuery: city,
        checkInDate,
        checkOutDate,
        guests,
        countRooms,
      });
    } finally {
      if (isMountedRef.current) setIsSearching(false);
    }
  };

  const withTimeout = (promise, timeoutMs = 10000) =>
    Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Location request timed out")),
          timeoutMs,
        );
      }),
    ]);

  const handleUseCurrentLocation = async () => {
    try {
      if (isMountedRef.current) setIsLocatingCurrentLocation(true);

      let permission = await Location.getForegroundPermissionsAsync();
      if (permission?.status !== "granted") {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission?.status !== "granted") {
        Alert.alert(
          "Location permission required",
          "Allow location access to auto-fill your city.",
        );
        return;
      }

      const position = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        12000,
      );

      const geocode = await withTimeout(
        Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
        12000,
      );

      const place = geocode?.[0] || {};
      const cityName =
        place.city ||
        place.subregion ||
        place.district ||
        place.region ||
        place.name ||
        "";

      if (!cityName) {
        Alert.alert(
          "City not found",
          "Could not detect your city from current location.",
        );
        return;
      }

      setSearchCity(String(cityName).trim());
    } catch (error) {
      Alert.alert(
        "Location error",
        "Unable to get your current city. Please try again.",
      );
    } finally {
      if (isMountedRef.current) setIsLocatingCurrentLocation(false);
    }
  };

  const openCheckIn = () => {
    setDateModalTarget("in");
    setCalendarBase(new Date(checkInDate));
    setShowDateModal(true);
  };

  const openCheckOut = () => {
    setDateModalTarget("out");
    setCalendarBase(new Date(checkOutDate));
    setShowDateModal(true);
  };

  // --- Main Render ---
  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f7a78f" />
      <Header compact showHero={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingTop: 28, paddingBottom: 20 }}
      >
        <SearchCard
          searchCity={searchCity}
          setSearchCity={setSearchCity}
          checkInDateDisplay={checkInDateDisplay}
          checkOutDateDisplay={checkOutDateDisplay}
          onOpenCheckIn={openCheckIn}
          onOpenCheckOut={openCheckOut}
          guests={guests}
          setGuests={setGuests}
          rooms={countRooms}
          setRooms={setCountRooms}
          isSearching={isSearching}
          onSearch={handleSearch}
          isLocatingCurrentLocation={isLocatingCurrentLocation}
          onUseCurrentLocation={handleUseCurrentLocation}
        />

        <PopularDestinations
          locations={locations}
          onSelectLocation={handleSelect}
        />
        <HomeScreenFrontHotels />
        <HomeScreenFrontTour />
        <HomeScreenFrontCabs />

        {/* Footer Brand */}
        <View className="px-4 mt-6 mb-0">
          <View className="rounded-3xl bg-slate-100/80 border border-slate-200/70 py-7 px-6 items-center overflow-hidden">
            {/* Soft pattern */}
            <View className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-slate-200/40" />
            <View className="absolute -bottom-12 -left-10 w-36 h-36 rounded-full bg-slate-200/40" />
            <View className="absolute top-6 right-10 w-14 h-14 rounded-full bg-blue-100/60" />

            <Text className="text-[12px] font-extrabold text-slate-500 tracking-[4px]">
              HOTELROOMSSTAY
            </Text>
            <Text className="text-sm text-slate-400 font-medium mt-2 text-center">
              Find stays you'll love, anywhere you go.
            </Text>
          </View>
        </View>
      </ScrollView>
      <Modal visible={showDateModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          <View className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-lg font-bold text-slate-900">
                  Select {dateModalTarget === "in" ? "Check-in" : "Check-out"}
                </Text>
                <Text className="text-xs text-slate-500">
                  {calendarBase.toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View className="flex-row space-x-2 bg-slate-50 rounded-full p-1 border border-slate-100">
                <TouchableOpacity
                  onPress={() =>
                    setCalendarBase(
                      (c) => new Date(c.getFullYear(), c.getMonth() - 1, 1),
                    )
                  }
                  className="w-8 h-8 items-center justify-center bg-white rounded-full shadow-sm"
                >
                  <Text className="font-bold text-slate-700">{"<"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setCalendarBase(
                      (c) => new Date(c.getFullYear(), c.getMonth() + 1, 1),
                    )
                  }
                  className="w-8 h-8 items-center justify-center bg-white rounded-full shadow-sm"
                >
                  <Text className="font-bold text-slate-700">{">"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row justify-between mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => (
                <Text
                  key={w}
                  className="text-xs font-bold text-slate-400 text-center w-10"
                >
                  {w}
                </Text>
              ))}
            </View>

            <View>
              {getMonthMatrix(calendarBase).map((week, wi) => (
                <View key={wi} className="flex-row justify-between mb-2">
                  {week.map((cell, ci) => {
                    const month =
                      calendarBase.getMonth() + (cell.monthOffset || 0);
                    let year = calendarBase.getFullYear();
                    if (month < 0) year--;
                    if (month > 11) year++;
                    const cellDate = new Date(
                      year,
                      (month + 12) % 12,
                      cell.day,
                    );
                    const cellISO = iso(cellDate);

                    const isStart = cellISO === checkInDate;
                    const isEnd = cellISO === checkOutDate;
                    const inRange =
                      new Date(cellISO) > new Date(checkInDate) &&
                      new Date(cellISO) < new Date(checkOutDate);

                    const handlePress = () => {
                      if (dateModalTarget === "in") {
                        setCheckInDate(cellISO);
                        if (new Date(checkOutDate) <= new Date(cellISO)) {
                          const next = new Date(cellDate);
                          next.setDate(next.getDate() + 1);
                          setCheckOutDate(iso(next));
                        }
                      } else {
                        if (new Date(cellISO) <= new Date(checkInDate)) return;
                        setCheckOutDate(cellISO);
                      }
                    };

                    return (
                      <TouchableOpacity
                        key={ci}
                        disabled={!cell.inMonth}
                        onPress={handlePress}
                        className={`w-10 h-10 items-center justify-center rounded-full
                          ${!cell.inMonth ? "opacity-0" : "opacity-100"}
                          ${isStart || isEnd ? "bg-[#0d3b8f]" : inRange ? "bg-blue-100" : "bg-transparent"}
                        `}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            isStart || isEnd
                              ? "text-white"
                              : inRange
                                ? "text-blue-800"
                                : "text-slate-800"
                          }`}
                        >
                          {cell.day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <TouchableOpacity
              className="mt-5 bg-[#0d3b8f] py-3.5 rounded-2xl items-center shadow-lg shadow-blue-900/20"
              onPress={() => setShowDateModal(false)}
            >
              <Text className="text-white font-bold tracking-wide">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Home;
