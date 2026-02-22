import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import {
  createCabBooking,
  fetchAllCabs,
  fetchCabById,
  resetCabBookingState,
  resetSelectedCab,
} from "../store/slices/cabSlice";
import { useAppModal } from "../contexts/AppModalContext";
import { getUserId } from "../utils/credentials";

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getSeatStats = (cab) => {
  const seats = Array.isArray(cab?.seatConfig) ? cab.seatConfig : [];
  const declared = safeNumber(cab?.seater, 0);
  const total = Math.max(declared > 0 ? declared : 0, seats.length);
  const booked = seats.filter((seat) => isSeatBooked(seat)).length;
  return {
    total,
    booked,
    available: Math.max(total - booked, 0),
    seats,
  };
};

const normalizeBool = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return null;
};

const isSeatBooked = (seat) => {
  const direct = normalizeBool(seat?.isBooked ?? seat?.booked ?? seat?.isSeatBooked);
  if (direct !== null) return direct;

  const status = String(seat?.status || seat?.seatStatus || "").trim().toLowerCase();
  if (status.includes("book")) return true;
  if (status.includes("open") || status.includes("available") || status.includes("vacant")) return false;
  return false;
};

const resolveCabBookingState = (cab, seatStats) => {
  const isRunning = normalizeBool(cab?.isRunning);
  if (isRunning === false) {
    return { key: "unavailable", label: "Unavailable", canBook: false };
  }

  const totalSeats = Number(seatStats?.total || 0);
  const bookedSeats = Number(seatStats?.booked || 0);
  if (totalSeats > 0 && bookedSeats >= totalSeats) {
    return { key: "fullyBooked", label: "Fully Booked", canBook: false };
  }

  const isAvailable = normalizeBool(cab?.isAvailable);
  if (isAvailable === false) {
    return { key: "unavailable", label: "Unavailable", canBook: false };
  }

  const status = String(cab?.runningStatus || "").trim().toLowerCase();
  if (status.includes("unavailable") || status.includes("not available")) {
    return { key: "unavailable", label: "Unavailable", canBook: false };
  }

  return { key: "available", label: "Available", canBook: true };
};

const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const normalizeSeatToken = (seat) => {
  if (typeof seat === "number") return Number.isFinite(seat) ? seat : null;
  const text = String(seat || "").trim();
  if (!text) return null;
  const asNumber = Number(text);
  return Number.isFinite(asNumber) ? asNumber : text;
};

const getSeatId = (seat) => {
  const raw = seat?._id ?? seat?.id ?? seat?.seatId ?? seat?.seatID ?? null;
  const id = String(raw || "").trim();
  return id || null;
};

const getBookingResponseId = (response) =>
  response?.bookingId ||
  response?.data?.bookingId ||
  response?.data?._id ||
  response?.result?.bookingId ||
  response?._id ||
  null;

const InfoItem = ({ label, value }) => (
  <View className="w-[48%] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 mb-2.5">
    <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</Text>
    <Text className="text-[12px] font-bold text-slate-800 mt-1" numberOfLines={1}>
      {value || "-"}
    </Text>
  </View>
);

export default function CabDetails({ navigation, route }) {
  const dispatch = useDispatch();
  const { showError, showInfo, showSuccess } = useAppModal();
  const { cabId, cab: previewCab } = route?.params || {};
  const {
    selectedCab,
    selectedCabStatus,
    selectedCabError,
    cabBookingStatus,
  } = useSelector((state) => state.cab || {});

  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [bookedBy, setBookedBy] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);

  useEffect(() => {
    if (cabId) {
      dispatch(fetchCabById(cabId));
    }
    return () => {
      dispatch(resetSelectedCab());
      dispatch(resetCabBookingState());
    };
  }, [dispatch, cabId]);

  const cab = selectedCab || previewCab || null;
  const seatStats = useMemo(() => getSeatStats(cab), [cab]);
  const isShared = String(cab?.sharingType || "").toLowerCase() === "shared";
  const totalFare = isShared ? safeNumber(cab?.perPersonCost, 0) : safeNumber(cab?.price, 0);
  const bookingState = useMemo(
    () => resolveCabBookingState(cab, seatStats),
    [cab, seatStats]
  );
  const isAvailable = bookingState.canBook;
  const isBookingSubmitting = cabBookingStatus === "loading";

  const availableSeatChoices = useMemo(
    () =>
      (Array.isArray(seatStats?.seats) ? seatStats.seats : [])
        .filter((seat) => !isSeatBooked(seat))
        .map((seat) => {
          const seatId = getSeatId(seat);
          const seatLabel =
            normalizeSeatToken(seat?.seatNumber ?? seat?.number ?? seat?.seatNo) ??
            seatId?.slice(-4) ??
            "";
          return seatId ? { seatId, seatLabel } : null;
        })
        .filter(Boolean),
    [seatStats?.seats]
  );

  const closeBookingModal = useCallback(() => {
    if (isBookingSubmitting) return;
    setBookingModalVisible(false);
  }, [isBookingSubmitting]);

  const resetFormState = useCallback(() => {
    setBookedBy("");
    setCustomerMobile("");
    setCustomerEmail("");
    setSelectedSeatIds([]);
  }, []);

  const openBookingModal = useCallback(() => {
    if (!isAvailable) {
      showInfo(
        bookingState.key === "fullyBooked" ? "Fully Booked" : "Cab Unavailable",
        bookingState.key === "fullyBooked"
          ? "All seats are booked for this cab right now."
          : "This cab is currently unavailable for booking."
      );
      return;
    }
    setBookingModalVisible(true);
  }, [bookingState.key, isAvailable, showInfo]);

  const toggleSeatSelection = useCallback((seatId) => {
    const token = String(seatId);
    setSelectedSeatIds((prev) => {
      const exists = prev.some((item) => String(item) === token);
      if (exists) return prev.filter((item) => String(item) !== token);
      return [...prev, token];
    });
  }, []);

  const submitCabBooking = async () => {
    if (isBookingSubmitting) return;
    if (!cab?._id) {
      showError("Cab Not Found", "Unable to identify the selected cab.");
      return;
    }

    const loggedInUserId = await getUserId();
    if (!loggedInUserId) {
      showError("Login Required", "Please login to continue booking.");
      return;
    }

    const passengerName = String(bookedBy || "").trim();
    const mobile = String(customerMobile || "").replace(/[^\d]/g, "").trim();
    const email = String(customerEmail || "").trim();

    if (!passengerName) {
      showError("Missing Details", "Please enter customer name.");
      return;
    }
    if (!mobile || mobile.length < 10) {
      showError("Invalid Mobile", "Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!validateEmail(email)) {
      showError("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (isShared && availableSeatChoices.length === 0) {
      showError("Seat Data Missing", "No seat IDs found for this shared cab.");
      return;
    }

    if (isShared && availableSeatChoices.length > 0 && selectedSeatIds.length === 0) {
      showError("Select Seats", "Please select at least one seat for shared booking.");
      return;
    }

    if (isShared && selectedSeatIds.length > 0 && selectedSeatIds.length > seatStats.available) {
      showError("Seat Limit Exceeded", `Only ${seatStats.available} seats are available.`);
      return;
    }

    const vehicleNumber = String(cab?.vehicleNumber || "").trim();
    const pickupP = String(cab?.pickupP || "").trim();
    const dropP = String(cab?.dropP || "").trim();
    const pickupD = cab?.pickupD || null;
    const dropD = cab?.dropD || null;
    const gstPrice = safeNumber(cab?.gstPrice, 0);
    const seatCount = isShared ? selectedSeatIds.length : 1;
    const price = isShared
      ? safeNumber(cab?.perPersonCost, 0) * Math.max(seatCount, 1)
      : safeNumber(cab?.price, 0);

    if (!vehicleNumber || !pickupP || !dropP || !pickupD || !dropD) {
      showError("Missing Cab Data", "Vehicle route/date data missing. Please refresh cab details.");
      return;
    }

    const payload = {
      userId: String(loggedInUserId),
      sharingType: String(cab?.sharingType || "Private"),
      vehicleType: String(cab?.vehicleType || "Car"),
      carId: String(cab?._id),
      bookedBy: passengerName,
      customerMobile: mobile,
      customerEmail: email,
      bookingStatus: "Pending",
      vehicleNumber,
      pickupP,
      dropP,
      pickupD,
      dropD,
      price,
      gstPrice,
    };
    if (isShared) {
      payload.seats = selectedSeatIds;
    }

    try {
      const response = await dispatch(createCabBooking(payload)).unwrap();
      const bookingId = getBookingResponseId(response);

      setBookingModalVisible(false);
      resetFormState();
      dispatch(resetCabBookingState());
      dispatch(fetchCabById(cab?._id));
      dispatch(fetchAllCabs());

      showSuccess(
        "Booking Confirmed",
        bookingId
          ? `Cab booking created successfully.\nID: ${bookingId}`
          : "Cab booking created successfully."
      );
    } catch (error) {
      showError(
        "Booking Failed",
        String(error?.message || "Unable to create cab booking right now.")
      );
    }
  };

  if (selectedCabStatus === "loading" && !cab) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0d3b8f" />
        <Text className="text-[13px] font-semibold text-slate-500 mt-3">Loading cab details...</Text>
      </SafeAreaView>
    );
  }

  if (!cab) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 px-5 items-center justify-center">
        <Ionicons name="alert-circle-outline" size={42} color="#94a3b8" />
        <Text className="text-[16px] font-black text-slate-900 mt-3">Cab not found</Text>
        <Text className="text-[13px] font-medium text-slate-500 mt-1 text-center">
          {selectedCabError?.message || "Unable to load selected cab details."}
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (cabId) {
              dispatch(fetchCabById(cabId));
            } else {
              navigation.goBack();
            }
          }}
          className="mt-5 h-11 px-6 rounded-xl bg-[#0d3b8f] items-center justify-center"
          activeOpacity={0.85}
        >
          <Text className="text-[13px] font-black text-white">{cabId ? "Retry" : "Go Back"}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View className="bg-[#0d3b8f] px-4 pt-2 pb-5 rounded-b-[26px]">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="h-9 w-9 rounded-full bg-white/15 items-center justify-center border border-white/20"
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={18} color="#ffffff" />
            </TouchableOpacity>
            <Text className="text-[16px] font-black text-white">Cab Details</Text>
            <View className="w-9" />
          </View>
        </View>

        <View className="-mt-3 mx-4 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <View className="h-[200px] bg-slate-200">
            <Image
              source={{ uri: cab?.images?.[0] || "https://via.placeholder.com/800x500?text=Cab" }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          <View className="px-4 py-3">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-[18px] font-black text-slate-900" numberOfLines={1}>
                  {cab?.make} {cab?.model}
                </Text>
                <Text className="text-[12px] font-semibold text-slate-500 mt-0.5">
                  {cab?.vehicleType || "Car"} | {safeNumber(cab?.seater, seatStats.total)} Seats | {cab?.fuelType || "-"}
                </Text>
              </View>
              <View
                className={`px-2.5 py-1 rounded-full border ${
                  bookingState.key === "available"
                    ? "bg-emerald-50 border-emerald-200"
                    : bookingState.key === "fullyBooked"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-rose-50 border-rose-200"
                }`}
              >
                <Text
                  className={`text-[11px] font-black ${
                    bookingState.key === "available"
                      ? "text-emerald-700"
                      : bookingState.key === "fullyBooked"
                      ? "text-amber-700"
                      : "text-rose-700"
                  }`}
                >
                  {bookingState.label}
                </Text>
              </View>
            </View>

            <View className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
              <View className="flex-row items-center">
                <Ionicons name="location-sharp" size={14} color="#0d3b8f" />
                <Text className="ml-1 text-[12px] font-semibold text-slate-700" numberOfLines={1}>
                  {cab?.pickupP || "-"} to {cab?.dropP || "-"}
                </Text>
              </View>
              <Text className="text-[11px] font-semibold text-slate-500 mt-1">
                Pickup: {formatDateTime(cab?.pickupD)}
              </Text>
              <Text className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Drop: {formatDateTime(cab?.dropD)}
              </Text>
            </View>

            <View className="mt-3 flex-row items-end justify-between">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fare</Text>
                <Text className="text-[24px] leading-[26px] font-black text-[#0d3b8f]">
                  {`\u20B9${totalFare.toLocaleString("en-IN")}`}
                </Text>
                <Text className="text-[11px] font-semibold text-slate-500">
                  {isShared ? "per seat" : "total trip"}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status</Text>
                <Text className="text-[12px] font-bold text-slate-700 mt-1">
                  {cab?.runningStatus || "-"}
                </Text>
                <Text className="text-[12px] font-bold text-slate-700 mt-0.5">
                  {cab?.sharingType || "Private"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mx-4 mt-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
          <Text className="text-[13px] font-black text-slate-900 mb-2">Vehicle Info</Text>
          <View className="flex-row flex-wrap justify-between">
            <InfoItem label="Vehicle No." value={cab?.vehicleNumber} />
            <InfoItem label="Year" value={String(cab?.year || "-")} />
            <InfoItem label="Fuel" value={cab?.fuelType} />
            <InfoItem label="Transmission" value={cab?.transmission} />
            <InfoItem label="Mileage" value={cab?.mileage ? `${cab.mileage} km/l` : "-"} />
            <InfoItem label="Color" value={cab?.color} />
            <InfoItem label="Extra Km" value={cab?.extraKm ? `${cab.extraKm} km` : "-"} />
            <InfoItem
              label={isShared ? "Per Person" : "Trip Cost"}
              value={`\u20B9${safeNumber(isShared ? cab?.perPersonCost : cab?.price, 0).toLocaleString("en-IN")}`}
            />
          </View>
        </View>

        {isShared && (
          <View className="mx-4 mt-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
            <Text className="text-[13px] font-black text-slate-900">Seat Availability</Text>
            <View className="flex-row mt-2" style={{ gap: 10 }}>
              <View className="flex-1 rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                <Text className="text-[10px] font-black text-slate-400 uppercase">Total</Text>
                <Text className="text-[16px] font-black text-slate-900 mt-1">{seatStats.total}</Text>
              </View>
              <View className="flex-1 rounded-xl bg-rose-50 border border-rose-200 p-2.5">
                <Text className="text-[10px] font-black text-rose-500 uppercase">Booked</Text>
                <Text className="text-[16px] font-black text-rose-700 mt-1">{seatStats.booked}</Text>
              </View>
              <View className="flex-1 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5">
                <Text className="text-[10px] font-black text-emerald-500 uppercase">Available</Text>
                <Text className="text-[16px] font-black text-emerald-700 mt-1">{seatStats.available}</Text>
              </View>
            </View>

            {!!seatStats.seats.length && (
              <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                {seatStats.seats.slice(0, 12).map((seat) => {
                  const booked = isSeatBooked(seat);
                  return (
                  <View
                    key={seat?._id || `${seat?.seatNumber}`}
                    className={`w-[23%] rounded-lg px-2 py-1.5 border ${
                      booked ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"
                    }`}
                  >
                    <Text className={`text-[10px] font-black ${booked ? "text-rose-700" : "text-emerald-700"}`}>
                      S{seat?.seatNumber}
                    </Text>
                    <Text className="text-[9px] font-semibold text-slate-600 mt-0.5" numberOfLines={1}>
                      {booked ? "Booked" : "Open"}
                    </Text>
                  </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View className="mx-4 mt-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="shield-check" size={18} color="#10b981" />
            <Text className="ml-2 text-[12px] font-bold text-slate-700">Verified vehicle details</Text>
          </View>
          
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="slide"
        visible={bookingModalVisible}
        onRequestClose={closeBookingModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-black/45 justify-end"
        >
          <View className="bg-white rounded-t-3xl px-4 pt-4 pb-5 max-h-[86%]">
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-[18px] font-black text-slate-900">Complete Cab Booking</Text>
                <Text className="text-[12px] font-semibold text-slate-500 mt-0.5">
                  Fill passenger details and confirm booking
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeBookingModal}
                className="h-9 w-9 rounded-full bg-slate-100 items-center justify-center"
                disabled={isBookingSubmitting}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <Text className="text-[13px] font-black text-slate-900">
                  {cab?.make} {cab?.model}
                </Text>
                <Text className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {cab?.pickupP || "-"} to {cab?.dropP || "-"} | {cab?.sharingType || "Private"}
                </Text>
              </View>

              <View className="mt-3">
                <Text className="text-[11px] font-bold text-slate-600 mb-1">Booked By</Text>
                <TextInput
                  value={bookedBy}
                  onChangeText={setBookedBy}
                  placeholder="Customer full name"
                  placeholderTextColor="#94a3b8"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900"
                />
              </View>

              <View className="mt-3">
                <Text className="text-[11px] font-bold text-slate-600 mb-1">Customer Mobile</Text>
                <TextInput
                  value={customerMobile}
                  onChangeText={setCustomerMobile}
                  keyboardType="number-pad"
                  maxLength={15}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94a3b8"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900"
                />
              </View>

              <View className="mt-3">
                <Text className="text-[11px] font-bold text-slate-600 mb-1">Customer Email</Text>
                <TextInput
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="email@example.com"
                  placeholderTextColor="#94a3b8"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900"
                />
              </View>

              {isShared && availableSeatChoices.length > 0 ? (
                <View className="mt-3">
                  <Text className="text-[11px] font-bold text-slate-600 mb-1">Select Seats</Text>
                  <View className="flex-row flex-wrap">
                    {availableSeatChoices.map((seat) => {
                      const active = selectedSeatIds.some((item) => String(item) === String(seat.seatId));
                      return (
                        <TouchableOpacity
                          key={seat.seatId}
                          onPress={() => toggleSeatSelection(seat.seatId)}
                          className={`h-9 px-3 rounded-lg border items-center justify-center mr-2 mb-2 ${
                            active ? "bg-[#0d3b8f] border-[#0d3b8f]" : "bg-white border-slate-200"
                          }`}
                          activeOpacity={0.85}
                        >
                          <Text className={`text-[12px] font-black ${active ? "text-white" : "text-slate-700"}`}>
                            S{seat.seatLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    Selected: {selectedSeatIds.length}
                  </Text>
                </View>
              ) : isShared ? (
                <View className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <Text className="text-[12px] font-bold text-amber-700">
                    Seat IDs are not available for booking.
                  </Text>
                </View>
              ) : (
                <View className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Text className="text-[12px] font-semibold text-slate-600">
                    Private booking me full cab reserve hoti hai.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View className="mt-4 flex-row">
              <TouchableOpacity
                onPress={closeBookingModal}
                disabled={isBookingSubmitting}
                className="flex-1 h-11 rounded-xl bg-slate-100 items-center justify-center mr-2"
                activeOpacity={0.85}
              >
                <Text className="text-[13px] font-black text-slate-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitCabBooking}
                disabled={isBookingSubmitting}
                className={`flex-[1.4] h-11 rounded-xl items-center justify-center ${
                  isBookingSubmitting ? "bg-slate-300" : "bg-[#0d3b8f]"
                }`}
                activeOpacity={0.88}
              >
                {isBookingSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-[13px] font-black text-white">Confirm Booking</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View className="px-4 pb-4 pt-2 bg-white border-t border-slate-200">
        <TouchableOpacity
          disabled={!isAvailable}
          onPress={openBookingModal}
          className={`h-12 rounded-xl items-center justify-center ${
            isAvailable ? "bg-[#0d3b8f]" : "bg-slate-300"
          }`}
          activeOpacity={0.88}
        >
          <Text className="text-[14px] font-black text-white">
            {isAvailable
              ? "Proceed to Booking"
              : bookingState.key === "fullyBooked"
              ? "Fully Booked"
              : "Currently Unavailable"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
