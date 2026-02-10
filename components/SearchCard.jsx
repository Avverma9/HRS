import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const CompactCounter = ({ label, value, onMinus, onPlus }) => (
  <View className="flex-1 px-3 py-2.5">
    <Text className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-1.5">
      {label}
    </Text>
    <View className="flex-row items-center justify-between">
      <TouchableOpacity
        onPress={onMinus}
        activeOpacity={0.7}
        className="w-8 h-8 rounded-lg items-center justify-center bg-slate-100 active:bg-slate-200"
      >
        <MaterialCommunityIcons name="minus" size={16} color="#475569" />
      </TouchableOpacity>

      <Text className="text-slate-900 font-bold text-lg px-2">
        {value}
      </Text>

      <TouchableOpacity
        onPress={onPlus}
        activeOpacity={0.7}
        className="w-8 h-8 rounded-lg items-center justify-center bg-blue-600 active:bg-blue-700"
      >
        <MaterialCommunityIcons name="plus" size={16} color="#ffffff" />
      </TouchableOpacity>
    </View>
  </View>
);

const DateField = ({ label, value, onPress, showBorder }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className={`flex-1 px-3 py-2.5 ${showBorder ? "border-r border-slate-200" : ""}`}
  >
    <Text className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-1">
      {label}
    </Text>
    <Text className="text-sm font-semibold text-slate-900">
      {value}
    </Text>
  </TouchableOpacity>
);

const SearchCard = ({
  searchCity,
  setSearchCity,
  checkInDateDisplay,
  checkOutDateDisplay,
  onOpenCheckIn,
  onOpenCheckOut,
  guests,
  setGuests,
  rooms,
  setRooms,
  isSearching,
  onSearch,
}) => {
  return (
    <View className="-mt-6 mx-4 bg-white rounded-3xl shadow-xl shadow-slate-900/5 elevation-8 z-50">
      {/* Destination Input */}
      <View className="p-4 border-b border-slate-100">
        <Text className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2">
          Destination
        </Text>
        <View className="flex-row items-center">
          <MaterialCommunityIcons 
            name="map-marker" 
            size={20} 
            color="#3b82f6" 
            style={{ marginRight: 10 }}
          />
          <TextInput
            placeholder="Search city or hotel"
            placeholderTextColor="#94a3b8"
            value={searchCity}
            onChangeText={setSearchCity}
            className="flex-1 text-base font-semibold text-slate-900 p-0"
            selectionColor="#3b82f6"
            returnKeyType="search"
          />
          {!!searchCity && (
            <TouchableOpacity
              onPress={() => setSearchCity("")}
              activeOpacity={0.7}
              className="ml-2 w-6 h-6 rounded-full items-center justify-center bg-slate-100"
            >
              <MaterialCommunityIcons name="close" size={14} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Dates Section */}
      <View className="flex-row border-b border-slate-100">
        <DateField
          label="Check In"
          value={checkInDateDisplay}
          onPress={onOpenCheckIn}
          showBorder
        />
        <DateField
          label="Check Out"
          value={checkOutDateDisplay}
          onPress={onOpenCheckOut}
        />
      </View>

      {/* Guests & Rooms Section */}
      <View className="flex-row border-b border-slate-100">
        <CompactCounter
          label="Guests"
          value={guests}
          onMinus={() => setGuests(Math.max(1, guests - 1))}
          onPlus={() => setGuests(guests + 1)}
        />
        <View className="w-px bg-slate-200" />
        <CompactCounter
          label="Rooms"
          value={rooms}
          onMinus={() => setRooms(Math.max(1, rooms - 1))}
          onPlus={() => setRooms(rooms + 1)}
        />
      </View>

      {/* Search Button */}
      <View className="p-4">
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={isSearching ? null : onSearch}
          disabled={isSearching}
          className={`rounded-2xl py-4 items-center justify-center ${
            isSearching ? "bg-blue-500" : "bg-blue-600 active:bg-blue-700"
          }`}
        >
          {isSearching ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="white" size="small" />
              <Text className="text-white font-bold text-base ml-2">
                Searching...
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="magnify" size={20} color="#ffffff" />
              <Text className="text-white font-bold text-base ml-2">
                Search Hotels
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SearchCard;
