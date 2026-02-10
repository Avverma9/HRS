import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  Platform
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { getHotelById } from "../store/slices/hotelSlice";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const HotelDetails = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { hotelId } = route.params || {};

  const dispatch = useDispatch();
  const { selectedHotel: hotel, selectedHotelLoading: loading, selectedHotelError: error } = useSelector((state) => state.hotel);

  useEffect(() => {
    if (hotelId) {
      dispatch(getHotelById(hotelId));
    }
  }, [dispatch, hotelId]);

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0d3b8f" />
        <Text className="text-slate-500 mt-4">Loading Hotel Details...</Text>
      </View>
    );
  }

  if (error || !hotel) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text className="text-xl font-bold text-slate-800 mt-4">Unable to load details</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-6 bg-[#0d3b8f] px-6 py-3 rounded-xl">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { basicInfo, pricingOverview, amenities, policies, rooms } = hotel;
  const mainImage = basicInfo?.images?.[0];
  const otherImages = basicInfo?.images?.slice(1, 5) || [];

  const topPadding = Platform.OS === 'android' ? StatusBar.currentHeight : 0;

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View className="relative h-72">
          {mainImage ? (
             <Image source={{ uri: mainImage }} className="w-full h-full" resizeMode="cover" />
          ) : (
             <View className="w-full h-full bg-slate-200 items-center justify-center">
                <Ionicons name="image-outline" size={40} color="#94a3b8" />
             </View>
          )}
          
          {/* Back Button Overlay */}
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="absolute top-10 left-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full items-center justify-center border border-white/30"
            style={{ marginTop: topPadding }}
          >
             <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          {/* Gallery Preview Overlay */}
           {otherImages.length > 0 && (
              <View className="absolute bottom-4 right-4 bg-black/50 px-3 py-1.5 rounded-lg flex-row items-center">
                 <Ionicons name="images-outline" size={16} color="white" />
                 <Text className="text-white text-xs font-bold ml-2">+{basicInfo.images.length - 1} Photos</Text>
              </View>
           )}
        </View>

        {/* Basic Info Container */}
        <View className="-mt-6 bg-slate-50 rounded-t-[32px] pt-6 px-5 pb-4">
            {/* Title & Rating */}
            <View className="flex-row justify-between items-start mb-2">
               <View className="flex-1 mr-4">
                  <Text className="text-2xl font-bold text-slate-900 leading-tight">
                    {basicInfo?.name}
                  </Text>
               </View>
               <View className="bg-green-600 px-2 py-1 rounded-lg flex-row items-center">
                  <Text className="text-white font-bold text-sm mr-1">{basicInfo?.starRating || 4.2}</Text>
                  <Ionicons name="star" size={12} color="white" />
               </View>
            </View>

            {/* Address */}
            <View className="flex-row items-start mb-4">
               <Ionicons name="location-sharp" size={18} color="#64748b" className="mt-0.5" />
               <Text className="text-slate-500 text-sm ml-1.5 flex-1 leading-5">
                 {basicInfo?.location?.address}, {basicInfo?.location?.city}, {basicInfo?.location?.state} - {basicInfo?.location?.pinCode}
               </Text>
            </View>

            {/* Price Preview */}
             {pricingOverview && (
                <View className="flex-row items-baseline mb-6">
                    <Text className="text-2xl font-extrabold text-[#0d3b8f]">
                      {pricingOverview.currencySymbol}{pricingOverview.lowestBasePrice}
                    </Text>
                    <Text className="text-slate-400 text-sm font-medium ml-1">/ night</Text>
                    <Text className="text-slate-400 text-xs ml-auto">
                        {pricingOverview.taxNote}
                    </Text>
                </View>
             )}

            {/* Divider */}
            <View className="h-[1px] bg-slate-200 mb-6" />

            {/* Amenities Grid */}
            <View className="mb-8">
               <Text className="text-lg font-bold text-slate-900 mb-4">Amenities</Text>
               <View className="flex-row flex-wrap gap-3">
                  {amenities && amenities.flat().map((item, idx) => (
                     <View key={idx} className="flex-row items-center bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm">
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                        <Text className="text-slate-700 text-xs font-semibold ml-2">{item}</Text>
                     </View>
                  ))}
               </View>
            </View>

            {/* Rooms Section */}
            <View className="mb-24">
                <Text className="text-lg font-bold text-slate-900 mb-4">Choose Room</Text>
                {rooms && rooms.map((room) => (
                    <View key={room.id} className="bg-white rounded-2xl p-4 mb-4 border border-slate-200 shadow-sm">
                        
                         {/* Room Image */}
                         {room.images?.[0] && (
                             <Image 
                                source={{ uri: room.images[0] }} 
                                className="w-full h-40 rounded-xl mb-3"
                                resizeMode="cover"
                             />
                         )}

                         <View className="flex-row justify-between items-start mb-2">
                             <View>
                                 <Text className="text-lg font-bold text-slate-900">{room.name}</Text>
                                 <Text className="text-slate-500 text-xs font-medium">{room.bedType}</Text>
                             </View>
                             {room.inventory?.isSoldOut && (
                                 <View className="bg-red-100 px-2 py-1 rounded text-red-700 text-[10px] font-bold">
                                     <Text className="text-red-600 text-[10px] font-bold">SOLD OUT</Text>
                                 </View>
                             )}
                         </View>

                         <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-slate-100">
                             <View>
                                 <Text className="text-xl font-bold text-[#0d3b8f]">{room.pricing?.displayPrice}</Text>
                                 <Text className="text-xs text-slate-400">+ {room.pricing?.currency}{room.pricing?.taxAmount} taxes</Text>
                             </View>
                             <TouchableOpacity 
                                disabled={room.inventory?.isSoldOut}
                                className={`px-5 py-2.5 rounded-xl ${room.inventory?.isSoldOut ? 'bg-slate-300' : 'bg-[#0d3b8f]'}`}
                             >
                                 <Text className="text-white font-bold text-sm">Select</Text>
                             </TouchableOpacity>
                         </View>
                    </View>
                ))}
            </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 flex-row items-center justify-between pb-8">
           <View>
               <Text className="text-slate-500 text-xs font-bold uppercase mb-0.5">Total Price</Text>
               <Text className="text-xl font-extrabold text-[#0d3b8f]">
                  {pricingOverview?.displayString.split("Starts from ")[1]}
               </Text>
           </View>
           <TouchableOpacity className="bg-[#0d3b8f] px-8 py-3.5 rounded-xl shadow-lg shadow-blue-900/30">
               <Text className="text-white font-bold text-base">Book Now</Text>
           </TouchableOpacity>
      </View>
    </View>
  );
};

export default HotelDetails;
