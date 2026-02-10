import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from "react-native";
import * as Location from "expo-location";

// NOTE: LinearGradient import hata diya hai kyunki ab uski zaroorat nahi hai.

const PopularDestinations = ({ locations = [], onSelectLocation }) => {
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleNearMe = async () => {
    try {
      if (!isMounted.current) return;
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted.current) return;
      if (status !== "granted") {
        Alert.alert("Permission required", "Location needed.");
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!isMounted.current) return;
      const rev = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (!isMounted.current) return;
      const city = rev?.[0]?.city || rev?.[0]?.region || "Nearby";
      setLoading(false);
      if (onSelectLocation) onSelectLocation(city);
    } catch (e) {
      if (isMounted.current) {
        setLoading(false);
        Alert.alert("Error", "Unable to get location");
      }
    }
  };

  return (
    <View className="mt-8 pl-6">
      <View className="flex-row justify-between items-end pr-6 mb-4">
        <Text className="text-lg font-bold text-slate-900">Popular Destinations</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24 }}>
        {/* Near Me Button (Already Circular) */}
        <TouchableOpacity className="mr-4 items-center" activeOpacity={0.8} onPress={handleNearMe}>
          <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center border border-blue-100 mb-2 shadow-sm">
            {loading ? (
              <ActivityIndicator color="#0d3b8f" />
            ) : (
              <Text className="text-2xl">{"\u{1F4CD}"}</Text>
            )}
          </View>
          <Text className="text-xs font-bold text-slate-600">Near Me</Text>
        </TouchableOpacity>

        {/* Location Items (Now Circular) */}
        {locations?.map((d) => (
          <TouchableOpacity
            key={d._id}
            // Container aligns image and text centrally
            className="mr-4 items-center"
            activeOpacity={0.8}
            onPress={() => (onSelectLocation ? onSelectLocation(d?.location) : null)}
          >
            {/* Image Container: Circular shape with shadow & border matching Near Me */}
            <View className="w-16 h-16 rounded-full overflow-hidden shadow-sm bg-slate-200 border border-slate-100 mb-2">
              <Image
                source={{ uri: d?.images[0] }}
                // Image fills the circular container
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            {/* Text is now below the image container */}
            <Text className="text-xs font-bold text-slate-600 text-center w-20" numberOfLines={1}>
              {d.location}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default PopularDestinations;