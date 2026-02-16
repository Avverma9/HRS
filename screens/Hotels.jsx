import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  Animated,
  Easing
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { searchHotel } from "../store/slices/hotelSlice";
import { getBeds, getRooms } from "../store/slices/additionalSlice";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from "@expo/vector-icons";
import SearchCard from "../components/SearchCard";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;

const SkeletonShimmer = ({ height = 12, width = "100%", radius = 8, style }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: "rgba(226,232,240,0.6)",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: "40%",
          transform: [{ translateX }],
          backgroundColor: "rgba(255,255,255,0.25)",
        }}
      />
    </View>
  );
};

const SkeletonHotelCard = () => (
  <View className="bg-white rounded-[16px] mb-4 overflow-hidden border border-slate-200 shadow-sm mx-4">
    <SkeletonShimmer height={200} width="100%" radius={0} />
    <View className="p-3">
      <SkeletonShimmer height={16} width="60%" radius={8} />
      <SkeletonShimmer height={12} width="40%" radius={8} style={{ marginTop: 8 }} />
      <SkeletonShimmer height={10} width="30%" radius={8} style={{ marginTop: 10 }} />
      <View className="flex-row items-center justify-between mt-4">
        <SkeletonShimmer height={20} width="40%" radius={8} />
        <SkeletonShimmer height={32} width={70} radius={12} />
      </View>
    </View>
  </View>
);

const Hotels = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const safeParams = route?.params || {};
  const { searchQuery, checkInDate, checkOutDate, guests, countRooms, showAll } = safeParams;
  
  const { data: hotels, loading, error } = useSelector((state) => state.hotel);
  const { beds, rooms: roomTypes } = useSelector((state) => state.additional);

  // Filter Modal State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateModalTarget, setDateModalTarget] = useState("in"); 

  const iso = (d) => { try { return d.toISOString().split("T")[0]; } catch(e) { return "2026-02-10"; } }; 
  const display = (d) => { try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); } catch(e) { return ""; } };

  // Local Search state (for the modal)
  const [localCity, setLocalCity] = useState(searchQuery || "");
  const [localRooms, setLocalRooms] = useState(Number(countRooms) || 1);
  const [localGuests, setLocalGuests] = useState(Number(guests) || 2);
  const [localCheckIn, setLocalCheckIn] = useState(checkInDate || iso(new Date()));
  const [localCheckOut, setLocalCheckOut] = useState(checkOutDate || iso(new Date(Date.now() + 86400000)));
  const [calendarBase, setCalendarBase] = useState(new Date(localCheckIn));

  // Filter States
  const [priceRange, setPriceRange] = useState(null); 
  const [selectedStar, setSelectedStar] = useState(null); 
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedBedTypes, setSelectedBedTypes] = useState([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState([]);

  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;

  useEffect(() => {
    dispatch(getBeds());
    dispatch(getRooms());
  }, [dispatch]);

  // Helper to construct filter params and dispatch search
  const performSearch = (extras = {}) => {
    // Construct base payload
    const payload = {
      city: localCity,
      checkInDate: localCheckIn,
      checkOutDate: localCheckOut,
      guests: localGuests ? Number(localGuests) : 1,
      countRooms: localRooms ? Number(localRooms) : 1,
      ...extras // e.g. minPrice, maxPrice, starRating, amenities
    };

    dispatch(searchHotel(payload));
  };

  useEffect(() => {
     if (searchQuery) setLocalCity(searchQuery);
     if (checkInDate) setLocalCheckIn(checkInDate);
     if (checkOutDate) setLocalCheckOut(checkOutDate);
     if (guests) {
         setLocalGuests(Number(guests)); 
       }
     if (countRooms) setLocalRooms(Number(countRooms));
  }, [searchQuery, checkInDate, checkOutDate, guests, countRooms]);

  // Initial load:
  // - If a search query is passed, run that specific search.
  // - If "View all" is requested (or no query is provided), fetch broad hotel list.
  useEffect(() => {
    const hasQuery = !!String(searchQuery || "").trim();

    if (hasQuery) {
      dispatch(
        searchHotel({
          city: searchQuery,
          checkInDate,
          checkOutDate,
          guests,
          countRooms,
        })
      );
      return;
    }

    if (showAll || !hasQuery) {
      dispatch(searchHotel({ page: 1, limit: 50 }));
    }
  }, [dispatch, searchQuery, checkInDate, checkOutDate, guests, countRooms, showAll]);

  const toggleAmenity = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(prev => prev.filter(a => a !== amenity));
    } else {
      setSelectedAmenities(prev => [...prev, amenity]);
    }
  };

  const toggleBedType = (bed) => {
    if (selectedBedTypes.includes(bed)) {
      setSelectedBedTypes(prev => prev.filter(b => b !== bed));
    } else {
      setSelectedBedTypes(prev => [...prev, bed]);
    }
  };

  const toggleRoomType = (room) => {
    if (selectedRoomTypes.includes(room)) {
      setSelectedRoomTypes(prev => prev.filter(r => r !== room));
    } else {
      setSelectedRoomTypes(prev => [...prev, room]);
    }
  };

  const clearFilters = () => {
    setPriceRange(null);
    setSelectedStar(null);
    setSelectedAmenities([]);
    setSelectedBedTypes([]);
    setSelectedRoomTypes([]);
  };

  const applyFilters = () => {
    let minPrice, maxPrice;
    if (priceRange === '₹0 - ₹1500') { minPrice = 0; maxPrice = 1500; }
    else if (priceRange === '₹1500 - ₹3000') { minPrice = 1500; maxPrice = 3000; }
    else if (priceRange === '₹3000+') { minPrice = 3000; }

    const amenitiesStr = selectedAmenities.length > 0 ? selectedAmenities.join(',') : undefined;
    const bedTypeStr = selectedBedTypes.length > 0 ? selectedBedTypes.join(',') : undefined;
    const roomTypeStr = selectedRoomTypes.length > 0 ? selectedRoomTypes.join(',') : undefined;

    performSearch({
      minPrice,
      maxPrice,
      starRating: selectedStar,
      amenities: amenitiesStr,
      bedType: bedTypeStr,
      roomType: roomTypeStr
    });

    setShowFilterModal(false);
  };

  const handleSearchSubmit = () => {
    performSearch();
    setShowSearchModal(false);
  };

  const openCheckIn = () => {
    setDateModalTarget("in");
    setCalendarBase(new Date(localCheckIn));
    setShowDateModal(true);
  };

  const openCheckOut = () => {
    setDateModalTarget("out");
    setCalendarBase(new Date(localCheckOut));
    setShowDateModal(true);
  };

  // Date Logic for Modal 
  const getMonthMatrix = (date) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const startWeekday = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();
    const weeks = [];
    let week = [];
    const prevMonthEnd = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
    
    for (let i = 0; i < startWeekday; i++) {
        week.push({ day: prevMonthEnd - (startWeekday - 1 - i), inMonth: false, monthOffset: -1 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        week.push({ day: d, inMonth: true, monthOffset: 0 });
        if (week.length === 7) { weeks.push(week); week = []; }
    }
    let nextDay = 1;
    while (week.length < 7 && week.length > 0) {
        week.push({ day: nextDay++, inMonth: false, monthOffset: 1 });
    }
    if (week.length > 0) weeks.push(week);
    return weeks;
  };

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
    const title = hotel.hotelName || "Hotel Name";
    const city = hotel.city || "Location";
    const rating = hotel.rating || "4.2";
    
    // Price logic
    const lowestPrice = hotel.rooms?.length > 0 
      ? Math.min(...hotel.rooms.map(r => r.price))
      : 2499;
    const originalPrice = Math.round(lowestPrice * 1.4); // Mock original price

    const mainImage = hotel.images?.[0] || null;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("HotelDetails", { hotelId: hotel.hotelId })}
        className="bg-white rounded-[16px] mb-4 overflow-hidden border border-slate-200 shadow-sm mx-4"
      >
        {/* Image Section */}
        <View className="relative h-[200px] w-full bg-slate-200">
          {mainImage ? (
            <Image
              source={{ uri: mainImage }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Ionicons name="image-outline" size={40} color="#cbd5e1" />
            </View>
          )}

          {/* Rating Badge - Top Right */}
          <View className="absolute top-3 right-3 bg-white px-2 py-1 rounded flex-row items-center shadow-sm">
             <Text className="text-slate-900 font-bold text-xs mr-1">{rating}</Text>
             <Ionicons name="star" size={10} color="#16a34a" />
          </View>

          {/* Overlay Icons - Bottom Left */}
          <View className="absolute bottom-3 left-3 flex-row space-x-2">
            <View className="w-6 h-6 rounded-full bg-black/60 items-center justify-center">
                <MaterialCommunityIcons name="wifi" size={14} color="white" />
            </View>
            <View className="w-6 h-6 rounded-full bg-black/60 items-center justify-center">
                <MaterialCommunityIcons name="silverware-fork-knife" size={14} color="white" />
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View className="p-3">
          {/* Title */}
          <Text className="text-[17px] font-bold text-[#0f172a] mb-0.5">
            {title}
          </Text>
          
          {/* Location */}
          <View className="flex-row items-center mb-2">
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text className="text-sm text-slate-500 ml-1">{city}</Text>
          </View>

          {/* Feature Badge */}
          <Text className="text-green-600 text-[11px] font-bold uppercase tracking-wide mb-3">
            Free Cancellation
          </Text>

          {/* Price & Action Row */}
          <View className="flex-row items-center justify-between mt-1">
             <View>
                 <View className="flex-row items-baseline">
                     <Text className="text-[20px] font-extrabold text-[#0d3b8f]">
                        ₹{lowestPrice}
                     </Text>
                     <Text className="text-xs text-slate-400 font-medium line-through ml-2">
                        ₹{originalPrice}
                     </Text>
                     <Text className="text-xs text-slate-500 font-medium ml-1">/ night</Text>
                 </View>
             </View>

             <TouchableOpacity 
                className="bg-[#0d3b8f] px-5 py-2 rounded-lg"
             >
                 <Text className="text-white font-bold text-[13px]">View</Text>
             </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50" style={{ paddingTop: topPadding }}>
        {/* Header skeleton */}
        <View className="bg-white px-4 py-3 border-b border-slate-100">
          <SkeletonShimmer height={16} width="50%" radius={8} />
          <SkeletonShimmer height={12} width="70%" radius={8} style={{ marginTop: 6 }} />
        </View>

        {/* Filter chips skeleton */}
        <View className="bg-white pb-3 pt-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            <SkeletonShimmer height={28} width={90} radius={14} style={{ marginRight: 8 }} />
            <SkeletonShimmer height={28} width={110} radius={14} style={{ marginRight: 8 }} />
            <SkeletonShimmer height={28} width={90} radius={14} style={{ marginRight: 8 }} />
            <SkeletonShimmer height={28} width={80} radius={14} />
          </ScrollView>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonHotelCard />
          <SkeletonHotelCard />
          <SkeletonHotelCard />
        </ScrollView>
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
          onPress={() =>
            dispatch(
              searchHotel(
                String(searchQuery || "").trim()
                  ? { city: searchQuery }
                  : { page: 1, limit: 50 }
              )
            )
          }
          className="bg-blue-600 px-6 py-3 rounded-xl mt-6"
        >
          <Text className="text-white font-bold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: topPadding }}>
      {/* Custom Header */}
      <View className="bg-white px-4 py-3 flex-row items-center justify-between border-b border-slate-100">
          <View className="flex-row items-center flex-1">
              <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                  <Ionicons name="arrow-back" size={24} color="#1e293b" />
              </TouchableOpacity>
              <TouchableOpacity className="flex-1" onPress={() => setShowSearchModal(true)}>
                  <Text className="text-[17px] font-bold text-slate-900 leading-tight" numberOfLines={1}>
                    {localCity || (showAll ? "All Hotels" : "Where to?")}
                  </Text>
                  <Text className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {display(localCheckIn)} - {display(localCheckOut)} • {localGuests} Guest{localGuests > 1 ? 's' : ''}
                  </Text>
              </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowSearchModal(true)}>
             <Ionicons name="create-outline" size={24} color="#475569" />
          </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View className="bg-white pb-3 pt-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              <TouchableOpacity 
                onPress={() => setShowFilterModal(true)}
                className="flex-row items-center border border-slate-300 rounded-full px-3 py-1.5 mr-2 bg-slate-50"
              >
                  <Ionicons name="options-outline" size={16} color="#0f172a" style={{ marginRight: 6}} />
                  <Text className="text-xs font-bold text-slate-900">Filters</Text>
              </TouchableOpacity>

              <TouchableOpacity className="border border-slate-300 rounded-full px-3 py-1.5 mr-2">
                  <Text className="text-xs font-medium text-slate-600">Price: Low to High</Text>
              </TouchableOpacity>

              <TouchableOpacity className="border border-slate-300 rounded-full px-3 py-1.5 mr-2">
                  <Text className="text-xs font-medium text-slate-600">4★ & above</Text>
              </TouchableOpacity>

              <TouchableOpacity className="border border-slate-300 rounded-full px-3 py-1.5 mr-2">
                   <Text className="text-xs font-medium text-slate-600">Near Me</Text>
              </TouchableOpacity>
          </ScrollView>
      </View>

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
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl h-[85%] w-full">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <Text className="text-xl font-extrabold text-slate-900">Filters</Text>
              <TouchableOpacity 
                onPress={() => setShowFilterModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-5 pt-2" showsVerticalScrollIndicator={false}>
              
              {/* Price Range */}
              <View className="mt-4">
                <Text className="text-sm font-bold text-slate-900 mb-3">Price Range (Per Night)</Text>
                <View className="flex-row flex-wrap gap-3">
                  {['₹0 - ₹1500', '₹1500 - ₹3000', '₹3000+'].map((range, idx) => {
                     const isSelected = priceRange === range;
                     return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setPriceRange(isSelected ? null : range)}
                        className={`px-4 py-2.5 rounded-xl border ${
                          isSelected ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-200'
                        }`}
                      >
                        <Text className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                          {range}
                        </Text>
                      </TouchableOpacity>
                     );
                  })}
                </View>
              </View>

              {/* Star Rating */}
              <View className="mt-8">
                <Text className="text-sm font-bold text-slate-900 mb-3">Star Rating</Text>
                <View className="flex-row gap-3">
                  {[3, 4, 5].map((star) => {
                    const isSelected = selectedStar === star;
                    return (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setSelectedStar(isSelected ? null : star)}
                        className={`flex-1 py-3 rounded-xl border items-center justify-center ${
                          isSelected ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-200'
                        }`}
                      >
                        <Text className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                          {star} ★
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bed Types */}
              {beds && beds.length > 0 && (
                <View className="mt-8">
                  <Text className="text-sm font-bold text-slate-900 mb-3">Bed Types</Text>
                  <View className="flex-row flex-wrap gap-3">
                    {beds.map((bed, idx) => {
                      const isSelected = selectedBedTypes.includes(bed.name);
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => toggleBedType(bed.name)}
                          className={`px-4 py-3 rounded-xl border ${
                            isSelected ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-200'
                          }`}
                        >
                          <Text className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                            {bed.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Room Types */}
              {roomTypes && roomTypes.length > 0 && (
                <View className="mt-8">
                  <Text className="text-sm font-bold text-slate-900 mb-3">Room Types</Text>
                  <View className="flex-row flex-wrap gap-3">
                    {roomTypes.map((room, idx) => {
                      const isSelected = selectedRoomTypes.includes(room.name);
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => toggleRoomType(room.name)}
                          className={`px-4 py-3 rounded-xl border ${
                            isSelected ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-200'
                          }`}
                        >
                          <Text className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                            {room.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Amenities */}
              <View className="mt-8 mb-10">
                <Text className="text-sm font-bold text-slate-900 mb-3">Amenities</Text>
                <View className="flex-row flex-wrap gap-3">
                  {[
                    { label: 'Free Wifi', icon: 'wifi' },
                    { label: 'AC', icon: 'air-conditioner' }, // material: hvac? using general for now
                    { label: 'Pool', icon: 'pool' },
                    { label: 'Breakfast', icon: 'coffee-outline', font: 'Ionicons' }, // custom logic for icon set
                    { label: 'TV', icon: 'television' },
                  ].map((item, idx) => {
                    const isSelected = selectedAmenities.includes(item.label);
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => toggleAmenity(item.label)}
                        className={`w-[30%] py-4 rounded-xl border items-center justify-center ${
                          isSelected ? 'bg-blue-50 border-blue-600' : 'bg-white border-slate-200'
                        }`}
                      > 
                        {item.font === 'Ionicons' ? (
                           <Ionicons name={item.icon} size={20} color={isSelected ? '#2563eb' : '#64748b'} />
                        ) : (
                           <MaterialCommunityIcons name={item.icon} size={20} color={isSelected ? '#2563eb' : '#64748b'} />
                        )}
                        <Text className={`text-xs font-semibold mt-2 ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

            </ScrollView>

            {/* Footer Buttons */}
            <View className="p-5 border-t border-slate-100 flex-row items-center gap-4 bg-white pb-8">
              <TouchableOpacity 
                onPress={clearFilters}
                className="flex-1 py-3.5 items-center justify-center"
              >
                <Text className="text-slate-600 font-bold text-base">Clear All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={applyFilters}
                className="flex-2 w-[60%] py-3.5 bg-[#0d3b8f] rounded-xl items-center justify-center shadow-lg shadow-blue-900/20"
              >
                <Text className="text-white font-bold text-base">Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Search Modification Modal --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSearchModal}
        onRequestClose={() => setShowSearchModal(false)}
      >
        <TouchableOpacity 
            activeOpacity={1}
            onPress={() => setShowSearchModal(false)}
            className="flex-1 bg-black/40 justify-start pt-28 px-4"
        >
            <TouchableOpacity 
                activeOpacity={1}
                className="bg-white rounded-2xl p-4 shadow-2xl w-full"
            >
                
                {/* Header / Title */}
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                        Update Search Criteria
                    </Text>
                    <TouchableOpacity 
                        onPress={() => setShowSearchModal(false)} 
                    >
                        <Ionicons name="close-circle" size={22} color="#cbd5e1" />
                    </TouchableOpacity>
                </View>
                
                {/* Destination Input - Ultra Compact */}
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 h-11 mb-3">
                    <Ionicons name="location" size={16} color="#0d3b8f" />
                    <TextInput 
                        className="flex-1 ml-2 text-sm text-[#0f172a] font-bold"
                        placeholder="Destination?"
                        placeholderTextColor="#94a3b8"
                        value={localCity}
                        onChangeText={setLocalCity}
                    />
                </View>

                {/* Dates Row - Compact Grid */}
                <View className="flex-row gap-2 mb-3">
                    <TouchableOpacity 
                        onPress={openCheckIn} 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex-row justify-between items-center"
                    >
                        <View>
                            <Text className="text-[9px] font-bold text-slate-400 uppercase">Check-in</Text>
                            <Text className="text-xs font-bold text-[#0f172a] mt-0.5">{display(localCheckIn)}</Text>
                        </View>
                        <Ionicons name="calendar-outline" size={14} color="#64748b" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={openCheckOut} 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex-row justify-between items-center"
                    >
                        <View>
                            <Text className="text-[9px] font-bold text-slate-400 uppercase">Check-out</Text>
                            <Text className="text-xs font-bold text-[#0f172a] mt-0.5">{display(localCheckOut)}</Text>
                        </View>
                        <Ionicons name="calendar-outline" size={14} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Guests & Rooms - Compact Row */}
                <View className="flex-row gap-2 mb-4">
                     {/* Guests */}
                     <View className="flex-1 flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
                         <View>
                             <Text className="text-[9px] font-bold text-slate-400 uppercase">Guests</Text>
                             <Text className="text-sm font-bold text-[#0f172a]">{localGuests}</Text>
                         </View>
                         <View className="flex-row items-center gap-1.5">
                             <TouchableOpacity 
                                 onPress={() => setLocalGuests(Math.max(1, localGuests - 1))}
                                 className="w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center"
                             >
                                 <Ionicons name="remove" size={12} color="#64748b" />
                             </TouchableOpacity>
                             <TouchableOpacity 
                                 onPress={() => setLocalGuests(localGuests + 1)}
                                 className="w-6 h-6 bg-[#0d3b8f] rounded-full items-center justify-center"
                             >
                                 <Ionicons name="add" size={12} color="white" />
                             </TouchableOpacity>
                         </View>
                     </View>

                     {/* Rooms */}
                     <View className="flex-1 flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
                         <View>
                             <Text className="text-[9px] font-bold text-slate-400 uppercase">Rooms</Text>
                             <Text className="text-sm font-bold text-[#0f172a]">{localRooms}</Text>
                         </View>
                         <View className="flex-row items-center gap-1.5">
                             <TouchableOpacity 
                                 onPress={() => setLocalRooms(Math.max(1, localRooms - 1))}
                                 className="w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center"
                             >
                                 <Ionicons name="remove" size={12} color="#64748b" />
                             </TouchableOpacity>
                             <TouchableOpacity 
                                 onPress={() => setLocalRooms(localRooms + 1)}
                                 className="w-6 h-6 bg-[#0d3b8f] rounded-full items-center justify-center"
                             >
                                 <Ionicons name="add" size={12} color="white" />
                             </TouchableOpacity>
                         </View>
                     </View>
                </View>

                {/* Search Button */}
                <TouchableOpacity 
                    onPress={handleSearchSubmit}
                    className="bg-[#0d3b8f] py-3 rounded-xl flex-row justify-center items-center shadow-md shadow-blue-900/20"
                >
                    <Ionicons name="search" size={16} color="white" className="mr-1.5" />
                    <Text className="text-white font-bold text-sm ml-1">Search Hotels</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* --- Date Picker Modal --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDateModal}
        onRequestClose={() => setShowDateModal(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
            <View className="bg-white w-full rounded-2xl p-4 shadow-2xl">
                <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-slate-100">
                    <Text className="text-lg font-bold text-slate-800">
                       Select {dateModalTarget === "in" ? "Check-in" : "Check-out"} Date
                    </Text>
                    <TouchableOpacity onPress={() => setShowDateModal(false)}>
                        <Ionicons name="close-circle" size={24} color="#94a3b8" />
                    </TouchableOpacity>
                </View>

                {/* Month Navigator */}
                <View className="flex-row justify-between items-center mb-4 px-2">
                    <TouchableOpacity onPress={() => setCalendarBase(new Date(calendarBase.setMonth(calendarBase.getMonth() - 1)))}>
                        <Ionicons name="chevron-back" size={24} color="#334155" />
                    </TouchableOpacity>
                    <Text className="text-base font-bold text-slate-700">
                        {calendarBase.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity onPress={() => setCalendarBase(new Date(calendarBase.setMonth(calendarBase.getMonth() + 1)))}>
                        <Ionicons name="chevron-forward" size={24} color="#334155" />
                    </TouchableOpacity>
                </View>

                {/* Calendar Grid */}
                <View className="mb-2">
                    <View className="flex-row justify-between mb-2">
                         {['S','M','T','W','T','F','S'].map((d, i) => (
                             <Text key={i} className="text-slate-400 font-bold w-[13%] text-center text-xs">{d}</Text>
                         ))}
                    </View>
                    {getMonthMatrix(calendarBase).map((week, wIdx) => (
                        <View key={wIdx} className="flex-row justify-between mb-2">
                            {week.map((dayObj, dIdx) => {
                                const dateStr = `${calendarBase.getFullYear()}-${String(calendarBase.getMonth() + 1 + dayObj.monthOffset).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                                const isSelected = dateStr === (dateModalTarget === "in" ? localCheckIn : localCheckOut);
                                
                                return (
                                    <TouchableOpacity 
                                       key={dIdx} 
                                       disabled={!dayObj.inMonth}
                                       onPress={() => {
                                           if (dateModalTarget === "in") setLocalCheckIn(dateStr);
                                           else setLocalCheckOut(dateStr);
                                           setShowDateModal(false);
                                       }}
                                       className={`w-[13%] aspect-square items-center justify-center rounded-full ${isSelected ? 'bg-blue-600' : ''}`}
                                    >
                                        <Text className={`${!dayObj.inMonth ? 'text-transparent' : isSelected ? 'text-white font-bold' : 'text-slate-700 font-medium'}`}>
                                            {dayObj.day}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </View>
        </View>
      </Modal>

    </View>
  );
};

export default Hotels;
