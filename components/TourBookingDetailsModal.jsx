import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// --- Helpers (Kept logic same, just cleaner formatting) ---
const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
};

const cleanList = (value) => toList(value).map((item) => String(item || "").trim()).filter(Boolean);

const normalizeSeatLabels = (booking) => {
  const fromSeats = toList(booking?.seats)
    .map((seat) => {
      if (typeof seat === "string" || typeof seat === "number") return String(seat).trim();
      if (seat && typeof seat === "object") {
        return String(
          seat?.seatNumber ||
            seat?.seat ||
            seat?.number ||
            seat?.label ||
            seat?.code ||
            ""
        ).trim();
      }
      return "";
    })
    .filter(Boolean);

  const fromPassengers = toList(booking?.passengers)
    .map((p) => String(p?.seatNumber || p?.seat || p?.seatNo || "").trim())
    .filter(Boolean);

  const merged = [...fromSeats, ...fromPassengers];
  return Array.from(new Set(merged));
};

const formatCurrencyINR = (value) => {
  const n = toNumber(value);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${n.toLocaleString("en-IN")}`;
  }
};

const formatLongDate = (dateValue) => {
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const getStatusColor = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("confirm")) return { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" };
  if (s.includes("pending")) return { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" };
  if (s.includes("cancel")) return { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" };
  return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
};

// --- Sub-Components for Cleanliness ---
const SectionHeader = ({ iconName, title }) => (
  <View className="flex-row items-center mb-3">
    <Ionicons name={iconName} size={16} color="#737373" />
    <Text className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-2">{title}</Text>
  </View>
);

const InfoRow = ({ label, value, isLast }) => (
  <View className={`flex-row justify-between py-2 ${!isLast ? "border-b border-neutral-100" : ""}`}>
    <Text className="text-sm text-neutral-500">{label}</Text>
    <Text className="text-sm font-semibold text-neutral-800 text-right flex-1 ml-4">{value}</Text>
  </View>
);

const Tag = ({ text, type = "neutral" }) => (
  <View className="bg-neutral-100 px-2 py-1 rounded-md mr-2 mb-2">
    <Text className="text-xs text-neutral-600">{text}</Text>
  </View>
);

export default function TourBookingDetailsModal({ visible, onClose, booking }) {
  if (!visible) return null;

  // Process Data
  const statusStyle = getStatusColor(booking?.status || booking?.bookingStatus);
  const seats = normalizeSeatLabels(booking);
  const amenities = cleanList(booking?.amenities);
  const inclusions = cleanList(booking?.inclusion);
  const exclusions = cleanList(booking?.exclusion);
  const itinerary = toList(booking?.dayWise)
    .filter((d) => d && (d.day || d.description))
    .sort((a, b) => toNumber(a?.day) - toNumber(b?.day));

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        {/* Modal Container - Slides up to 90% height */}
        <View className="bg-neutral-50 h-[92%] rounded-t-3xl overflow-hidden shadow-2xl">
          
          {/* Header */}
          <View className="bg-white px-5 py-4 border-b border-neutral-200 flex-row items-start justify-between z-10">
            <View className="flex-1 pr-4">
              <View className={`self-start px-2.5 py-1 rounded-full border ${statusStyle.bg} ${statusStyle.border} mb-2`}>
                <Text className={`text-[10px] font-bold uppercase ${statusStyle.text}`}>
                  {booking?.status || booking?.bookingStatus || "Pending"}
                </Text>
              </View>
              <Text className="text-xl font-black text-neutral-900 leading-tight">
                {booking?.visitngPlaces || booking?.travelAgencyName || "Tour Details"}
              </Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="location-outline" size={12} color="#737373" />
                <Text className="text-xs text-neutral-500 ml-1">
                  {booking?.city || "-"}, {booking?.state || "-"}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              className="bg-neutral-100 p-2 rounded-full"
            >
              <Ionicons name="close" size={20} color="#171717" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            
            {/* 1. Quick Stats Grid */}
            <View className="flex-row flex-wrap bg-white p-4 mb-3 border-b border-neutral-200">
              <View className="w-1/2 p-2 border-r border-b border-neutral-100">
                <Text className="text-xs text-neutral-400 mb-1">Travel Date</Text>
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={14} color="#404040" />
                  <Text className="text-sm font-bold text-neutral-800 ml-1.5">
                    {formatLongDate(booking?.from || booking?.tourStartDate)}
                  </Text>
                </View>
              </View>
              <View className="w-1/2 p-2 border-b border-neutral-100 pl-4">
                 <Text className="text-xs text-neutral-400 mb-1">Duration</Text>
                 <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={14} color="#404040" />
                  <Text className="text-sm font-bold text-neutral-800 ml-1.5">
                    {toNumber(booking?.nights)}N / {toNumber(booking?.days)}D
                  </Text>
                </View>
              </View>
              <View className="w-1/2 p-2 border-r border-neutral-100 pt-3">
                 <Text className="text-xs text-neutral-400 mb-1">Travelers</Text>
                 <View className="flex-row items-center">
                  <Ionicons name="people-outline" size={14} color="#404040" />
                  <Text className="text-sm font-bold text-neutral-800 ml-1.5">
                    {toNumber(booking?.numberOfAdults)} Adt, {toNumber(booking?.numberOfChildren)} Chd
                  </Text>
                </View>
              </View>
              <View className="w-1/2 p-2 pl-4 pt-3">
                 <Text className="text-xs text-neutral-400 mb-1">Booking ID</Text>
                 <Text className="text-xs font-mono text-neutral-600">
                   #{booking?.bookingCode || booking?._id?.slice(-6) || "N/A"}
                 </Text>
              </View>
            </View>

            {/* 2. Price Section (Receipt Style) */}
            <View className="mx-4 mt-2 bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
              <SectionHeader iconName="card-outline" title="Payment Summary" />
              <InfoRow label="Base Price" value={formatCurrencyINR(booking?.basePrice)} />
              <InfoRow label="Seat Charges" value={formatCurrencyINR(booking?.seatPrice)} />
              <InfoRow label="Taxes" value={formatCurrencyINR(booking?.tax)} />
              <InfoRow label="Discount" value={`- ${formatCurrencyINR(booking?.discount)}`} />
              
              <View className="my-3 border-t border-dashed border-neutral-300" />
              
              <View className="flex-row justify-between items-end">
                <Text className="text-base font-bold text-neutral-900">Total Amount</Text>
                <Text className="text-xl font-black text-emerald-600">
                  {formatCurrencyINR(booking?.totalAmount || booking?.price)}
                </Text>
              </View>
            </View>

            {/* 3. Agency Info */}
            <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
              <SectionHeader iconName="briefcase-outline" title="Agency Contact" />
              <Text className="text-base font-semibold text-neutral-900">{booking?.travelAgencyName || "Unknown Agency"}</Text>
              <View className="mt-3 space-y-2">
                {booking?.agencyPhone && (
                  <View className="flex-row items-center">
                    <Ionicons name="call-outline" size={14} color="#525252" />
                    <Text className="text-sm text-neutral-600 ml-2">{booking?.agencyPhone}</Text>
                  </View>
                )}
                {booking?.agencyEmail && (
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="mail-outline" size={14} color="#525252" />
                    <Text className="text-sm text-neutral-600 ml-2">{booking?.agencyEmail}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* 4. Itinerary (Timeline) */}
            {itinerary.length > 0 && (
              <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
                <SectionHeader iconName="location-outline" title="Itinerary" />
                <View className="ml-1">
                  {itinerary.map((day, idx) => (
                    <View key={idx} className="flex-row mb-4 last:mb-0">
                      <View className="items-center mr-3">
                        <View className="w-6 h-6 rounded-full bg-neutral-900 items-center justify-center">
                          <Text className="text-[10px] font-bold text-white">{toNumber(day?.day)}</Text>
                        </View>
                        {idx !== itinerary.length - 1 && (
                          <View className="w-0.5 h-full bg-neutral-200 flex-1 my-1" />
                        )}
                      </View>
                      <View className="flex-1 pb-2">
                        <Text className="text-sm font-bold text-neutral-800">Day {toNumber(day?.day)}</Text>
                        <Text className="text-sm text-neutral-600 leading-relaxed mt-1">
                          {day?.description || "No description available."}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 5. Inclusions / Exclusions / Amenities */}
            <View className="mx-4 mt-4 flex-row justify-between">
              {/* Amenities */}
              {amenities.length > 0 && (
                <View className="flex-1 bg-white rounded-xl p-4 mr-2 shadow-sm border border-neutral-200">
                  <Text className="text-xs font-bold text-neutral-400 mb-2 uppercase">Amenities</Text>
                  {amenities.map((item, i) => (
                    <Text key={i} className="text-xs text-neutral-700 mb-1">• {item}</Text>
                  ))}
                </View>
              )}
               {/* Seats */}
               {seats.length > 0 && (
                <View className="flex-1 bg-white rounded-xl p-4 ml-2 shadow-sm border border-neutral-200">
                  <Text className="text-xs font-bold text-neutral-400 mb-2 uppercase">Seats</Text>
                  <View className="flex-row flex-wrap">
                    {seats.map((seat, i) => (
                      <View key={i} className="bg-neutral-100 border border-neutral-200 rounded px-2 py-1 mr-1 mb-1">
                         <Text className="text-xs font-bold text-neutral-700">{seat}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Inclusions & Exclusions */}
            {(inclusions.length > 0 || exclusions.length > 0) && (
               <View className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
                  <SectionHeader iconName="document-text-outline" title="Details" />
                  
                  {inclusions.length > 0 && (
                    <View className="mb-4">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
                        <Text className="text-sm font-bold text-neutral-800 ml-2">Inclusions</Text>
                      </View>
                      {inclusions.map((item, i) => (
                        <Text key={i} className="text-xs text-neutral-600 ml-6 mb-1">{item}</Text>
                      ))}
                    </View>
                  )}

                  {exclusions.length > 0 && (
                    <View>
                       <View className="flex-row items-center mb-2">
                        <Ionicons name="close-circle-outline" size={14} color="#ef4444" />
                        <Text className="text-sm font-bold text-neutral-800 ml-2">Exclusions</Text>
                      </View>
                      {exclusions.map((item, i) => (
                        <Text key={i} className="text-xs text-neutral-600 ml-6 mb-1">{item}</Text>
                      ))}
                    </View>
                  )}
               </View>
            )}

            {/* Footer Space */}
            <View className="h-6" />
          </ScrollView>

          {/* Sticky Footer Button */}
          <View className="p-4 bg-white border-t border-neutral-200">
            <TouchableOpacity 
              onPress={onClose} 
              activeOpacity={0.9}
              className="bg-neutral-900 rounded-xl h-12 flex-row items-center justify-center shadow-lg shadow-neutral-300"
            >
              <Text className="text-white font-bold text-base">Close Details</Text>
            </TouchableOpacity>
          </View>
          
        </View>
      </View>
    </Modal>
  );
}
