import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { searchHotel } from "../store/slices/hotelSlice";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;

const Hotels = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { searchQuery } = route.params || {};
  
  const { data: hotels, loading, error } = useSelector((state) => state.hotel);

  useEffect(() => {
    if (searchQuery) {
      // Only send the 'where to' query (city/location)
      dispatch(searchHotel({ city: searchQuery }));
    }
  }, [searchQuery, dispatch]);

  const renderStars = (rating) => {
    const stars = [];
    const numRating = parseInt(rating) || 0;
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i < numRating ? "star" : "star-outline"}
          size={14}
          color={i < numRating ? "#facc15" : "#cbd5e1"}
        />
      );
    }
    return stars;
  };

  const HotelCard = ({ hotel }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const mainImage = hotel.images?.[currentImageIndex] || hotel.images?.[0];
    const lowestPrice = hotel.rooms?.length > 0 
      ? Math.min(...hotel.rooms.map(r => r.price))
      : 0;

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        className="bg-white rounded-3xl mb-4 overflow-hidden shadow-lg"
        style={{ width: CARD_WIDTH }}
      >
        {/* Image Gallery */}
        <View className="relative">
          <Image
            source={{ uri: mainImage }}
            style={{ width: CARD_WIDTH, height: 240 }}
            resizeMode="cover"
          />
          
          {/* Image indicators */}
          {hotel.images?.length > 1 && (
            <View className="absolute bottom-3 left-0 right-0 flex-row justify-center">
              {hotel.images.slice(0, 5).map((_, idx) => (
                <View
                  key={idx}
                  className={`h-1.5 mx-1 rounded-full ${
                    idx === currentImageIndex
                      ? "bg-white w-6"
                      : "bg-white/50 w-1.5"
                  }`}
                />
              ))}
            </View>
          )}

          {/* Star Rating Badge */}
          <View className="absolute top-3 left-3 bg-white/95 px-3 py-1.5 rounded-full flex-row items-center">
            {renderStars(hotel.starRating)}
          </View>

          {/* On Front Badge */}
          {hotel.onFront && (
            <View className="absolute top-3 right-3 bg-amber-400 px-3 py-1.5 rounded-full">
              <Text className="text-xs font-bold text-slate-900">Featured</Text>
            </View>
          )}

          {/* Image Navigation */}
          {hotel.images?.length > 1 && (
            <>
              <TouchableOpacity
                onPress={() =>
                  setCurrentImageIndex((prev) =>
                    prev > 0 ? prev - 1 : hotel.images.length - 1
                  )
                }
                className="absolute left-2 top-1/2 -mt-5 bg-black/40 w-10 h-10 rounded-full items-center justify-center"
              >
                <Ionicons name="chevron-back" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setCurrentImageIndex((prev) =>
                    prev < hotel.images.length - 1 ? prev + 1 : 0
                  )
                }
                className="absolute right-2 top-1/2 -mt-5 bg-black/40 w-10 h-10 rounded-full items-center justify-center"
              >
                <Ionicons name="chevron-forward" size={20} color="white" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Hotel Info */}
        <View className="p-4">
          {/* Hotel Name & Location */}
          <Text className="text-xl font-bold text-slate-900 mb-1">
            {hotel.hotelName}
          </Text>
          <View className="flex-row items-center mb-3">
            <Ionicons name="location" size={14} color="#64748b" />
            <Text className="text-sm text-slate-600 ml-1">
              {hotel.landmark}, {hotel.city}, {hotel.state}
            </Text>
          </View>

          {/* Description */}
          <Text className="text-sm text-slate-600 mb-3" numberOfLines={2}>
            {hotel.description}
          </Text>

          {/* Amenities Preview */}
          {hotel.amenities?.[0]?.amenities && (
            <View className="flex-row flex-wrap mb-3">
              {hotel.amenities[0].amenities.slice(0, 4).map((amenity, idx) => (
                <View
                  key={idx}
                  className="bg-blue-50 px-2.5 py-1 rounded-full mr-2 mb-2"
                >
                  <Text className="text-xs text-blue-700 font-medium">
                    {amenity}
                  </Text>
                </View>
              ))}
              {hotel.amenities[0].amenities.length > 4 && (
                <View className="bg-slate-100 px-2.5 py-1 rounded-full">
                  <Text className="text-xs text-slate-600 font-medium">
                    +{hotel.amenities[0].amenities.length - 4} more
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Property Type & Contact */}
          <View className="flex-row items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="home-city" size={16} color="#64748b" />
              <Text className="text-sm text-slate-600 ml-1">
                {hotel.propertyType?.[0] || "Hotel"}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="call" size={14} color="#2563eb" />
              <Text className="text-sm text-blue-600 ml-1 font-medium">
                {hotel.contact}
              </Text>
            </View>
          </View>

          {/* Room Info & Price */}
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-slate-500 mb-1">Starting from</Text>
              <View className="flex-row items-end">
                <Text className="text-2xl font-bold text-slate-900">
                  ₹{lowestPrice}
                </Text>
                <Text className="text-sm text-slate-500 ml-1 mb-1">/night</Text>
              </View>
              {hotel.rooms?.length > 0 && (
                <Text className="text-xs text-green-600 font-medium">
                  {hotel.rooms.reduce((sum, r) => sum + (r.totalRooms - r.countRooms), 0)} rooms available
                </Text>
              )}
            </View>
            <TouchableOpacity className="bg-blue-600 px-6 py-3 rounded-xl">
              <Text className="text-white font-bold text-sm">View Details</Text>
            </TouchableOpacity>
          </View>

          {/* Review Count */}
          {hotel.reviewCount > 0 && (
            <View className="mt-3 pt-3 border-t border-slate-100 flex-row items-center">
              <Ionicons name="star" size={14} color="#facc15" />
              <Text className="text-xs text-slate-600 ml-1">
                {hotel.reviewCount} {hotel.reviewCount === 1 ? "review" : "reviews"}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-slate-600 mt-4 text-base">Searching hotels...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text className="text-slate-900 text-xl font-bold mt-4 text-center">
          Oops! Something went wrong
        </Text>
        <Text className="text-slate-600 mt-2 text-center">{error}</Text>
        <TouchableOpacity
          onPress={() => dispatch(searchHotel({ city: searchQuery }))}
          className="bg-blue-600 px-6 py-3 rounded-xl mt-6"
        >
          <Text className="text-white font-bold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <LinearGradient
        colors={["#0052cc", "#0d3b8f"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-14 pb-6 px-5"
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">
              Hotels in {searchQuery}
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              {hotels?.length || 0} properties found
            </Text>
          </View>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
            <Ionicons name="options" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Hotels List */}
      {hotels?.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="bed-outline" size={80} color="#cbd5e1" />
          <Text className="text-slate-900 text-xl font-bold mt-6 text-center">
            No hotels found
          </Text>
          <Text className="text-slate-600 mt-2 text-center">
            Try searching for a different location
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-blue-600 px-6 py-3 rounded-xl mt-6"
          >
            <Text className="text-white font-bold">Back to Search</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={hotels}
          renderItem={({ item }) => <HotelCard hotel={item} />}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default Hotels;
