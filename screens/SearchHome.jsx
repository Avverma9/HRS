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
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { data: locations, loading, error } = useSelector((state) => state.location);

  const handleSelect = async (title) => {
    try {
      setSelectedLocation(title);
      setSearchCity(title);
      // dispatch search and wait for result so Hotels opens with data ready
      await dispatch(searchHotel({ city: title })).unwrap();
      navigation.navigate("Hotels", { searchQuery: title });
    } catch (err) {
      Alert.alert('Search failed', err?.toString() || 'Unable to search');
      // still navigate so user can see empty/error state
      navigation.navigate("Hotels", { searchQuery: title });
    }
  };

  const handleSearch = async () => {
    if (!searchCity || searchCity.trim() === "") {
      Alert.alert("Enter Location", "Please enter a city or location to search");
      return;
    }
    const city = searchCity.trim();
    try {
      await dispatch(searchHotel({ city })).unwrap();
      navigation.navigate("Hotels", { searchQuery: city });
    } catch (err) {
      Alert.alert('Search failed', err?.toString() || 'Unable to search');
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
          await dispatch(searchHotel({ city })).unwrap();
          navigation.navigate("Hotels", { searchQuery: city });
        } catch (err) {
          Alert.alert('Search failed', err?.toString() || 'Unable to search');
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
        colors={["#0052cc", "#0d3b8f"]}
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
        <Text className="mt-10 text-white text-lg font-bold">
          Book top-rated budget hotels
        </Text>
      </LinearGradient>

      <View className="-mt-10 mx-4 bg-white rounded-2xl px-4 pt-4 pb-3 shadow-lg">
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
          <Text className="text-base font-semibold text-slate-900">
            Mon, 17 Nov — Tue, 18 Nov
          </Text>
        </View>

        <View className="h-px bg-gray-200" />

        <View className="py-2.5">
          <Text className="text-sm font-semibold text-slate-400 mb-1">
            Guests
          </Text>
          <Text className="text-base font-semibold text-slate-900">
            2 guests
          </Text>
        </View>

        <TouchableOpacity
          className="mt-4 mb-1 bg-amber-400 rounded-full flex-row items-center justify-center py-2.5"
          activeOpacity={0.85}
          onPress={handleSearch}
        >
          <Text className="text-lg mr-2">🔍</Text>
          <Text className="text-lg font-bold text-slate-900">Search</Text>
        </TouchableOpacity>
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
