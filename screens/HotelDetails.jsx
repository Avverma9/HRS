import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { getHotelById } from "../store/slices/hotelSlice";
import {
  createBooking,
  resetBookingState,
  fetchMonthlyData,
  getGstForHotelData,
} from "../store/slices/bookingSlice";
import { getUserId } from "../utils/credentials";

/**
 * ✅ What this version fixes/does:
 * 1) Modern UI (clean cards, chips, sections, better spacing)
 * 2) MonthlyPrice override:
 *    - monthlyData[] like:
 *      { roomId, startDate, endDate, monthPrice }
 *    - If user-selected date range overlaps entry range => room nightly price becomes monthPrice
 * 3) GST:
 *    - Uses hotel.gstConfig if enabled
 *    - If you still want server GST logic, it’s supported (getGstForHotelData)
 * 4) Foods section:
 *    - Automatically shows if hotel.basicInfo.foods OR hotel.foods OR hotel.menu exists
 *    - (You can map your real API shape inside `extractFoods`)
 */

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const parseNumber = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const toDateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const formatShortDate = (d) => {
  try {
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
};

const formatFullDate = (d) => {
  try {
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const getMonthMatrix = (date) => {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const startWeekday = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const weeks = [];
  let week = [];

  const prevMonthEnd = new Date(date.getFullYear(), date.getMonth(), 0).getDate();

  for (let i = 0; i < startWeekday; i++) {
    week.push({
      day: prevMonthEnd - (startWeekday - 1 - i),
      inMonth: false,
      monthOffset: -1,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    week.push({ day: d, inMonth: true, monthOffset: 0 });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  let nextDay = 1;
  while (week.length < 7 && week.length > 0) {
    week.push({ day: nextDay++, inMonth: false, monthOffset: 1 });
  }
  if (week.length > 0) weeks.push(week);

  return weeks;
};

// Inclusive overlap check for date ranges
const dateRangesOverlap = (aStart, aEnd, bStart, bEnd) => {
  const aS = toDateOnly(new Date(aStart)).getTime();
  const aE = toDateOnly(new Date(aEnd)).getTime();
  const bS = toDateOnly(new Date(bStart)).getTime();
  const bE = toDateOnly(new Date(bEnd)).getTime();
  return aS <= bE && bS <= aE;
};

// Safe extractor for foods/menu (adjust this to your real schema)
const extractFoods = (hotel) => {
  const direct =
    hotel?.basicInfo?.foods ||
    hotel?.foods ||
    hotel?.menu ||
    hotel?.basicInfo?.menu ||
    null;

  // If your API returns array of strings:
  if (Array.isArray(direct)) return direct;

  // If your API returns object like { items: [...] }
  if (direct?.items && Array.isArray(direct.items)) return direct.items;

  // If your API returns categories
  if (direct?.categories && Array.isArray(direct.categories)) return direct.categories;

  return [];
};

const Chip = ({ icon, text, tone = "neutral" }) => {
  const toneMap = {
    neutral: "bg-white border-slate-200",
    success: "bg-emerald-50 border-emerald-200",
    info: "bg-blue-50 border-blue-200",
    warn: "bg-amber-50 border-amber-200",
  };
  return (
    <View
      className={`flex-row items-center px-3 py-1.5 rounded-full border shadow-sm ${toneMap[tone] || toneMap.neutral}`}
    >
      {icon}
      <Text className="text-xs font-bold text-slate-700 ml-2">{text}</Text>
    </View>
  );
};

const SectionTitle = ({ title, right }) => (
  <View className="flex-row items-center justify-between mb-3">
    <View className="flex-row items-center">
      <View className="w-1.5 h-5 rounded-full bg-[#0d3b8f] mr-2" />
      <Text className="text-lg font-extrabold text-slate-900">{title}</Text>
    </View>
    {!!right && right}
  </View>
);

const Stepper = ({ label, value, onDec, onInc, min, max, subtitle }) => (
  <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm mb-4">
    <View className="flex-row justify-between items-center">
      <View>
        <Text className="text-sm font-extrabold text-slate-900">{label}</Text>
        {!!subtitle && <Text className="text-xs text-slate-500 mt-0.5">{subtitle}</Text>}
      </View>
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={onDec}
          disabled={value <= min}
          className={`w-10 h-10 rounded-xl items-center justify-center border ${
            value <= min ? "bg-slate-100 border-slate-200" : "bg-white border-slate-200"
          }`}
        >
          <Ionicons name="remove" size={18} color={value <= min ? "#94a3b8" : "#0f172a"} />
        </TouchableOpacity>

        <View className="w-12 items-center">
          <Text className="text-base font-extrabold text-slate-900">{value}</Text>
        </View>

        <TouchableOpacity
          onPress={onInc}
          disabled={value >= max}
          className={`w-10 h-10 rounded-xl items-center justify-center border ${
            value >= max ? "bg-slate-100 border-slate-200" : "bg-white border-slate-200"
          }`}
        >
          <Ionicons name="add" size={18} color={value >= max ? "#94a3b8" : "#0f172a"} />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const SkeletonBlock = ({ className = "" }) => (
  <View className={`bg-slate-200/80 overflow-hidden ${className}`}>
    <View className="absolute inset-0 bg-slate-200/80" />
  </View>
);

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

const HotelDetails = ({ navigation, route }) => {
  const dispatch = useDispatch();

  const {
    hotelId,
    checkInDate: paramCheckIn,
    checkOutDate: paramCheckOut,
    guests: paramGuests,
    countRooms: paramRooms,
  } = route?.params || {};

  const {
    selectedHotel: hotel,
    selectedHotelLoading: loading,
    selectedHotelError: error,
  } = useSelector((state) => state.hotel);

  const { bookingStatus, bookingError, monthlyData, gstData } = useSelector((state) => state.booking);
  const { user } = useSelector((state) => state.user);

  const [checkInDate, setCheckInDate] = useState(paramCheckIn ? new Date(paramCheckIn) : new Date());
  const [checkOutDate, setCheckOutDate] = useState(
    paramCheckOut ? new Date(paramCheckOut) : new Date(Date.now() + 86400000)
  );

  const [guestsCount, setGuestsCount] = useState(clamp(Number(paramGuests) || 2, 1, 20));
  const [roomsCount, setRoomsCount] = useState(clamp(Number(paramRooms) || 1, 1, 10));
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [guestName, setGuestName] = useState(user?.name || "");
  const [guestEmail, setGuestEmail] = useState(user?.email || "");
  const [guestPhone, setGuestPhone] = useState(user?.phone || "");

  const [showDateModal, setShowDateModal] = useState(false);
  const [dateModalTarget, setDateModalTarget] = useState("in");
  const [calendarBase, setCalendarBase] = useState(new Date());
  const lastGstQueryRef = useRef(null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showAllPolicies, setShowAllPolicies] = useState(false);

  useEffect(() => {
    if (!hotelId) return;
    dispatch(getHotelById(hotelId));
    dispatch(fetchMonthlyData(hotelId));
  }, [dispatch, hotelId]);

  useEffect(() => {
    if (user?.name && !guestName) setGuestName(user.name);
    if (user?.email && !guestEmail) setGuestEmail(user.email);
    if (user?.phone && !guestPhone) setGuestPhone(user.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getRoomId = useCallback((room) => room?.id ?? room?._id ?? room?.roomId ?? null, []);

  // ✅ Monthly override picker (your monthlyData sample supported)
  const pickMonthlyOverride = useCallback((data, roomId, inDate, outDate) => {
    if (!Array.isArray(data) || !roomId) return null;

    // Filter relevant overrides for this room
    const relevantOverrides = data.filter((entry) => {
      const entryRoomId = entry?.roomId ?? entry?._id ?? entry?.id;
      if (!entryRoomId || String(entryRoomId) !== String(roomId)) return false;
      if (!entry?.startDate || !entry?.endDate) return false;
      return true;
    });

    if (!relevantOverrides.length) return null;

    // We check IF the booking range falls *within* or *overlaps* the special pricing window.
    // The user requirement: "is date range me price 4000 hai" => if we book within this range, price is 4000.
    // Given the data is often specific days (Jan 1 to Jan 2), if our checkIn hits this, we use it.
    // Priority: Find an override that covers the checkIn date.
    const validOverride = relevantOverrides.find((entry) => {
       const start = new Date(entry.startDate).getTime();
       const end = new Date(entry.endDate).getTime();
       const checkIn = toDateOnly(inDate).getTime();
       
       // Simple logic: If check-in date is within the special price window [start, end]
       return checkIn >= start && checkIn <= end;
    });

    return validOverride || null;
  }, []);

  const getRoomBasePrice = useCallback((room) => {
    const pricing = room?.pricing || {};
    // basePrice: pre-tax, finalPrice: post-tax, price fallback
    return (
      parseNumber(pricing.basePrice) ||
      parseNumber(pricing.finalPrice) ||
      parseNumber(pricing.price) ||
      parseNumber(room?.price) ||
      0
    );
  }, []);

  const nights = useMemo(() => {
    const inD = toDateOnly(checkInDate).getTime();
    const outD = toDateOnly(checkOutDate).getTime();
    const diff = Math.ceil((outD - inD) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkInDate, checkOutDate]);

  // ✅ Integrate hotelData response shapes
  const basicInfo = hotel?.basicInfo || {};
  const pricingOverview = hotel?.pricingOverview || {};
  const policies = hotel?.policies || {};
  const gstConfig = hotel?.gstConfig || null;
  const amenities = hotel?.amenities || [];
  const foods = useMemo(() => extractFoods(hotel), [hotel]);

  const formatPolicyValue = (key, value) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "boolean") {
      const lower = String(key).toLowerCase();
      if (lower.includes("required")) return value ? "Required" : "Not required";
      if (lower.includes("allowed")) return value ? "Allowed" : "Not allowed";
      return value ? "Yes" : "No";
    }
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  const policyItems = useMemo(() => {
    const restrictions = policies?.restrictions || {};
    const candidates = [
      { key: "checkIn", label: "Check-in Time", icon: "log-in-outline", source: policies },
      { key: "checkOut", label: "Check-out Time", icon: "log-out-outline", source: policies },
      { key: "unmarriedCouplesAllowed", label: "Unmarried Couples", icon: "heart-outline", source: policies },
      { key: "idProofRequired", label: "ID Proof", icon: "card-outline", source: policies },
      { key: "petsAllowed", label: "Pets", icon: "paw-outline", source: restrictions },
      { key: "smokingAllowed", label: "Smoking", icon: "flame-outline", source: restrictions },
      { key: "alcoholAllowed", label: "Alcohol", icon: "wine-outline", source: restrictions },
      { key: "childPolicy", label: "Child Policy", icon: "people-outline", source: policies },
      { key: "extraBed", label: "Extra Bed", icon: "bed-outline", source: policies },
      { key: "cancellationText", label: "Cancellation", icon: "calendar-outline", source: policies },
      { key: "ageRestriction", label: "Age Restriction", icon: "alert-circle-outline", source: policies },
    ];

    const baseItems = candidates
      .map((item) => {
        const value = formatPolicyValue(item.key, item.source?.[item.key]);
        return value ? { ...item, value } : null;
      })
      .filter(Boolean);

    const rules = Array.isArray(policies?.rules) ? policies.rules : [];
    if (rules.length > 0) {
      baseItems.push({
        key: "rules",
        label: "House Rules",
        icon: "list-outline",
        value: rules.join(" • "),
      });
    }

    return baseItems;
  }, [policies]);

  const mainImage = basicInfo?.images?.[0];
  const otherImages = basicInfo?.images?.slice(1, 9) || [];

  const roomsWithPricing = useMemo(() => {
    const rooms = Array.isArray(hotel?.rooms) ? hotel.rooms : [];
    return rooms.map((room) => {
      const roomId = getRoomId(room);
      const monthlyOverride = pickMonthlyOverride(monthlyData, roomId, checkInDate, checkOutDate);

      const basePrice = getRoomBasePrice(room);
      const overridePrice = parseNumber(monthlyOverride?.monthPrice);

      // ✅ If selected date overlaps, apply override monthPrice as nightly
      const nightlyPrice = overridePrice > 0 ? overridePrice : basePrice;

      return {
        ...room,
        __pricing: {
          basePrice,
          nightlyPrice,
          monthlyOverride,
          isOverrideApplied: overridePrice > 0,
        },
      };
    });
  }, [hotel, monthlyData, checkInDate, checkOutDate, getRoomId, getRoomBasePrice, pickMonthlyOverride]);

  useEffect(() => {
    if (!roomsWithPricing.length) return;
    if (selectedRoomId) return;
    const available = roomsWithPricing.find((r) => !r?.inventory?.isSoldOut && getRoomId(r));
    if (available) setSelectedRoomId(getRoomId(available));
  }, [roomsWithPricing, selectedRoomId, getRoomId]);

  const selectedRoomData = useMemo(() => {
    return roomsWithPricing.find((r) => String(getRoomId(r)) === String(selectedRoomId));
  }, [roomsWithPricing, selectedRoomId, getRoomId]);

  const currencySymbol =
    pricingOverview?.currencySymbol ||
    selectedRoomData?.pricing?.currencySymbol ||
    selectedRoomData?.pricing?.currency ||
    "₹";

  // ✅ GST + Monthly pricing integrated
  const pricing = useMemo(() => {
    if (!selectedRoomData) {
      return {
        base: 0,
        tax: 0,
        total: 0,
        perNight: 0,
        appliedTaxPercent: 0,
        taxLabel: "",
      };
    }

    const pricePerNight = selectedRoomData.__pricing?.nightlyPrice ?? getRoomBasePrice(selectedRoomData);
    const baseTotal = pricePerNight * roomsCount * nights;

    // Priority GST decision:
    // 1) Server gstData.gstPrice (if you want remote config)
    // 2) Hotel gstConfig if enabled
    // 3) Room pricing taxPercent / taxAmount
    // 4) Fallback slabs
    const roomTaxAmount = parseNumber(selectedRoomData?.pricing?.taxAmount);
    const roomTaxPercent = parseNumber(
      selectedRoomData?.pricing?.taxPercent || selectedRoomData?.pricing?.gstPercent
    );

    let gstTotal = 0;
    let appliedTaxPercent = 0;
    let taxLabel = "";

    if (gstData?.gstPrice) {
      appliedTaxPercent = parseNumber(gstData.gstPrice);
      gstTotal = (baseTotal * appliedTaxPercent) / 100;
      taxLabel = `GST (${appliedTaxPercent}%)`;
    } else if (gstConfig?.enabled && parseNumber(gstConfig?.rate) >= 0) {
      appliedTaxPercent = parseNumber(gstConfig.rate);
      gstTotal = (baseTotal * appliedTaxPercent) / 100;
      taxLabel = `GST (${appliedTaxPercent}%)`;
    } else if (roomTaxAmount > 0) {
      gstTotal = roomTaxAmount * roomsCount * nights;
      taxLabel = "Taxes";
    } else if (roomTaxPercent > 0) {
      appliedTaxPercent = roomTaxPercent;
      gstTotal = (baseTotal * appliedTaxPercent) / 100;
      taxLabel = `GST (${appliedTaxPercent}%)`;
    } else {
      // fallback slabs (your earlier rule)
      if (pricePerNight > 7500) appliedTaxPercent = 18;
      else if (pricePerNight > 1000) appliedTaxPercent = 12;
      else appliedTaxPercent = 0;

      gstTotal = (baseTotal * appliedTaxPercent) / 100;
      taxLabel = appliedTaxPercent ? `GST (${appliedTaxPercent}%)` : "No GST";
    }

    return {
      base: baseTotal,
      tax: gstTotal,
      total: baseTotal + gstTotal,
      perNight: pricePerNight,
      appliedTaxPercent,
      taxLabel,
    };
  }, [selectedRoomData, roomsCount, nights, getRoomBasePrice, gstData, gstConfig]);

  // Optional: if you still want server GST data refresh based on perNight
  useEffect(() => {
    if (!pricing?.perNight) return;
    if (lastGstQueryRef.current === pricing.perNight && gstData) return;
    lastGstQueryRef.current = pricing.perNight;

    // call only if you really need it, else remove this effect
    dispatch(getGstForHotelData({ type: "Hotel", gstThreshold: pricing.perNight }));
  }, [dispatch, pricing?.perNight, gstData]);

  useEffect(() => {
    if (bookingStatus === "succeeded") {
      setBookingModalVisible(false);
      dispatch(resetBookingState());
      Alert.alert("Success", "Booking Request Sent Successfully!", [
        { text: "OK", onPress: () => navigation.navigate("Home") },
      ]);
    }
    if (bookingStatus === "failed") {
      Alert.alert("Booking Failed", bookingError || "Something went wrong.");
      dispatch(resetBookingState());
    }
  }, [bookingStatus, bookingError, dispatch, navigation]);

  // Tab bar hidden via Tab Navigator options (App.js)

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

  const applySelectedDate = (selected) => {
    const picked = toDateOnly(new Date(selected));
    if (dateModalTarget === "in") {
      const newIn = picked;
      setCheckInDate(newIn);
      if (toDateOnly(checkOutDate).getTime() <= newIn.getTime()) {
        setCheckOutDate(new Date(newIn.getTime() + 86400000));
      }
    } else {
      const newOut = picked;
      const inD = toDateOnly(checkInDate).getTime();
      if (newOut.getTime() <= inD) setCheckOutDate(new Date(inD + 86400000));
      else setCheckOutDate(newOut);
    }
    setShowDateModal(false);
  };

  const handleBookNow = () => {
    if (!selectedRoomId) {
      Toast.show({ type: "error", text1: "Please select a room" });
      return;
    }
    setBookingModalVisible(true);
  };

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

  const submitBooking = async () => {
    const name = String(guestName || "").trim();
    const phone = String(guestPhone || "").trim();
    const email = String(guestEmail || "").trim();

    if (!name || !phone || !email) {
      Alert.alert("Missing Details", "Please fill all guest details.");
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (!selectedRoomId) {
      Alert.alert("Select Room", "Please select a room first.");
      return;
    }

    const userId = await getUserId();

    const payload = {
      userId: userId || "guest_user",
      hotelId,
      roomId: selectedRoomId,
      checkInDate: toDateOnly(checkInDate).toISOString(),
      checkOutDate: toDateOnly(checkOutDate).toISOString(),
      guests: guestsCount,
      rooms: roomsCount,
      guestName: name,
      guestEmail: email,
      guestPhone: phone,
      totalAmount: pricing.total,
      // helpful debug fields (optional)
      appliedTaxPercent: pricing.appliedTaxPercent,
      pricingSource: selectedRoomData?.__pricing?.isOverrideApplied ? "monthlyOverride" : "default",
    };

    dispatch(createBooking(payload));
  };

  const handleGoBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      navigation.navigate("Home");
    }
  };

  const topPadding = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const safeAmenities = useMemo(() => {
    if (!amenities) return [];
    if (Array.isArray(amenities)) return amenities.flat?.() ? amenities.flat() : amenities;
    return [];
  }, [amenities]);

  const amenitiesToShow = useMemo(() => {
    const limit = 8;
    return showAllAmenities ? safeAmenities : safeAmenities.slice(0, limit);
  }, [safeAmenities, showAllAmenities]);

  const policiesToShow = useMemo(() => {
    const limit = 6;
    return showAllPolicies ? policyItems : policyItems.slice(0, limit);
  }, [policyItems, showAllPolicies]);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50">
        {/* Hero skeleton */}
        <SkeletonShimmer height={288} width="100%" radius={0} />

        {/* Content skeleton */}
        <View className="-mt-8 bg-slate-50 rounded-t-[36px] px-5 pt-6 pb-8">
          <SkeletonShimmer height={24} width="70%" radius={8} />
          <SkeletonShimmer height={14} width="90%" radius={8} style={{ marginTop: 12 }} />
          <SkeletonShimmer height={14} width="70%" radius={8} style={{ marginTop: 8 }} />

          <View className="flex-row flex-wrap gap-2 mt-5">
            <SkeletonShimmer height={32} width={112} radius={16} />
            <SkeletonShimmer height={32} width={96} radius={16} />
            <SkeletonShimmer height={32} width={112} radius={16} />
          </View>

          <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm mt-5">
            <SkeletonShimmer height={14} width={96} radius={8} />
            <SkeletonShimmer height={12} width="100%" radius={8} style={{ marginTop: 12 }} />
            <SkeletonShimmer height={12} width="92%" radius={8} style={{ marginTop: 8 }} />
            <SkeletonShimmer height={12} width="80%" radius={8} style={{ marginTop: 8 }} />
          </View>

          <View className="mt-6">
            <SkeletonShimmer height={18} width={128} radius={8} style={{ marginBottom: 12 }} />
            <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm mb-4">
              <SkeletonShimmer height={12} width={64} radius={8} />
              <View className="flex-row gap-3 mt-3">
                <SkeletonShimmer height={64} width="100%" radius={12} style={{ flex: 1 }} />
                <SkeletonShimmer height={64} width="100%" radius={12} style={{ flex: 1 }} />
              </View>
              <SkeletonShimmer height={12} width={192} radius={8} style={{ marginTop: 16 }} />
            </View>
            <SkeletonShimmer height={80} width="100%" radius={24} style={{ marginBottom: 16 }} />
            <SkeletonShimmer height={80} width="100%" radius={24} />
          </View>

          <View className="mt-6">
            <SkeletonShimmer height={18} width={128} radius={8} style={{ marginBottom: 12 }} />
            <SkeletonShimmer height={40} width="100%" radius={24} style={{ marginBottom: 12 }} />
            <SkeletonShimmer height={40} width="86%" radius={24} />
          </View>

          <View className="mt-6">
            <SkeletonShimmer height={18} width={128} radius={8} style={{ marginBottom: 12 }} />
            <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm">
              <SkeletonShimmer height={160} width="100%" radius={16} />
              <SkeletonShimmer height={14} width="50%" radius={8} style={{ marginTop: 16 }} />
              <SkeletonShimmer height={12} width="35%" radius={8} style={{ marginTop: 8 }} />
              <SkeletonShimmer height={40} width="100%" radius={12} style={{ marginTop: 16 }} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (error || !hotel) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text className="text-xl font-bold text-slate-800 mt-4">Unable to load details</Text>
        <TouchableOpacity onPress={handleGoBack} className="mt-6 bg-[#0d3b8f] px-6 py-3 rounded-xl">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <View className="relative">
          <View className="h-80">
            {mainImage ? (
              <Image source={{ uri: mainImage }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full bg-slate-200 items-center justify-center">
                <Ionicons name="image-outline" size={40} color="#94a3b8" />
              </View>
            )}
          </View>

          {/* Top bar */}
          <View
            className="absolute left-0 right-0 flex-row items-center justify-between px-4"
            style={{ top: 12 + topPadding }}
          >
            <TouchableOpacity
              onPress={handleGoBack}
              className="w-10 h-10 bg-black/40 rounded-full items-center justify-center border border-white/20"
            >
              <Ionicons name="arrow-back" size={22} color="white" />
            </TouchableOpacity>

            <View className="bg-black/40 px-3 py-2 rounded-full border border-white/20 flex-row items-center">
              <Ionicons name="star" size={14} color="white" />
              <Text className="text-white font-extrabold ml-2 text-xs">
                {basicInfo?.starRating || 0}
              </Text>
            </View>
          </View>

          {!!otherImages.length && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="absolute bottom-4 left-0 right-0"
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            >
              {otherImages.map((img, idx) => (
                <Image
                  key={`${img}-${idx}`}
                  source={{ uri: img }}
                  className="w-16 h-16 rounded-2xl border border-white/40"
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* CONTENT */}
        <View className="-mt-8 bg-slate-50 rounded-t-[36px] px-5 pt-6 pb-28">
          {/* Hotel Header Card */}
          <View className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-2xl font-extrabold text-slate-900 leading-tight">
                  {basicInfo?.name || "Hotel"}
                </Text>

                {!!basicInfo?.location && (
                  <View className="flex-row items-start mt-2">
                    <Ionicons name="location-sharp" size={18} color="#64748b" className="mt-0.5" />
                    <Text className="text-slate-500 text-sm ml-1.5 flex-1 leading-5">
                      {basicInfo?.location?.address || ""}
                      {basicInfo?.location?.city ? `, ${basicInfo.location.city}` : ""}
                      {basicInfo?.location?.state ? `, ${basicInfo.location.state}` : ""}
                      {basicInfo?.location?.pinCode ? ` - ${basicInfo.location.pinCode}` : ""}
                    </Text>
                  </View>
                )}
              </View>

              <View className="bg-emerald-600 px-2.5 py-1.5 rounded-xl flex-row items-center">
                <Ionicons name="star" size={12} color="white" />
                <Text className="text-white font-extrabold ml-1 text-xs">
                  {basicInfo?.starRating || 0}
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-2 mt-4">
              {!!pricingOverview?.lowestBasePrice && (
                <Chip
                  tone="info"
                  icon={<Ionicons name="pricetag-outline" size={14} color="#0d3b8f" />}
                  text={`From ${currencySymbol}${parseNumber(pricingOverview.lowestBasePrice).toLocaleString()}`}
                />
              )}
              {!!policies?.checkIn && (
                <Chip
                  icon={<Ionicons name="time-outline" size={14} color="#0f172a" />}
                  text={`Check-in ${policies.checkIn}`}
                />
              )}
              {!!policies?.checkOut && (
                <Chip
                  icon={<Ionicons name="time-outline" size={14} color="#0f172a" />}
                  text={`Check-out ${policies.checkOut}`}
                />
              )}
              {!!gstConfig?.enabled && (
                <Chip
                  tone="success"
                  icon={<Ionicons name="receipt-outline" size={14} color="#047857" />}
                  text={`GST Enabled (${parseNumber(gstConfig.rate)}%)`}
                />
              )}
            </View>
          </View>

          {!!basicInfo?.description && (
            <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm mt-4">
              <Text className="text-slate-900 font-extrabold mb-2">About</Text>
              <Text className="text-slate-600 text-sm leading-6">{basicInfo.description}</Text>
            </View>
          )}

          {/* Stay card */}
          <View className="mt-6">
            <SectionTitle
              title="Your Stay"
              right={
                <View className="bg-blue-50 px-3 py-1.5 rounded-full flex-row items-center">
                  <Ionicons name="moon-outline" size={14} color="#0d3b8f" />
                  <Text className="text-[#0d3b8f] text-xs font-extrabold ml-2">
                    {nights} night{nights > 1 ? "s" : ""}
                  </Text>
                </View>
              }
            />

            <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm mb-4">
              <Text className="text-[10px] font-bold text-slate-500 uppercase">Dates</Text>

              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity onPress={openCheckIn} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase">Check-in</Text>
                  <Text className="text-sm font-extrabold text-slate-900 mt-1">
                    {formatShortDate(checkInDate)}
                  </Text>
                  <Text className="text-[10px] text-slate-400 mt-0.5">{formatFullDate(checkInDate)}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={openCheckOut} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase">Check-out</Text>
                  <Text className="text-sm font-extrabold text-slate-900 mt-1">
                    {formatShortDate(checkOutDate)}
                  </Text>
                  <Text className="text-[10px] text-slate-400 mt-0.5">{formatFullDate(checkOutDate)}</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center justify-between mt-4">
                <View className="flex-row items-center">
                  <Ionicons name="people-outline" size={16} color="#64748b" />
                  <Text className="text-xs text-slate-500 ml-2">
                    {guestsCount} guest • {roomsCount} room
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={16} color="#64748b" />
                  <Text className="text-xs text-slate-500 ml-2">
                    {formatShortDate(checkInDate)} → {formatShortDate(checkOutDate)}
                  </Text>
                </View>
              </View>
            </View>

            <Stepper
              label="Guests"
              subtitle="How many people are staying?"
              value={guestsCount}
              min={1}
              max={20}
              onDec={() => setGuestsCount((v) => clamp(v - 1, 1, 20))}
              onInc={() => setGuestsCount((v) => clamp(v + 1, 1, 20))}
            />

            <Stepper
              label="Rooms"
              subtitle="How many rooms do you need?"
              value={roomsCount}
              min={1}
              max={10}
              onDec={() => setRoomsCount((v) => clamp(v - 1, 1, 10))}
              onInc={() => setRoomsCount((v) => clamp(v + 1, 1, 10))}
            />
          </View>

          {/* Foods (NEW) */}
          {!!foods.length && (
            <View className="mt-2">
              <SectionTitle title="Foods / Restaurant" />
              <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm">
                <View className="flex-row flex-wrap gap-2">
                  {foods.slice(0, 24).map((f, idx) => {
                    const label = typeof f === "string" ? f : f?.name || f?.title || JSON.stringify(f);
                    return (
                      <View key={`${label}-${idx}`} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-full">
                        <Text className="text-xs font-bold text-slate-700">{label}</Text>
                      </View>
                    );
                  })}
                </View>
                {foods.length > 24 && (
                  <Text className="text-[10px] text-slate-400 mt-3">
                    Showing 24 items. You can expand this list from API if needed.
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Amenities */}
          {!!safeAmenities.length && (
            <View className="mt-6">
              <SectionTitle
                title="Amenities"
                right={
                  safeAmenities.length > 8 ? (
                    <TouchableOpacity onPress={() => setShowAllAmenities((v) => !v)}>
                      <Text className="text-xs font-extrabold text-[#0d3b8f]">
                        {showAllAmenities ? "Show less" : "View all"}
                      </Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
              <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm">
                <View className="flex-row flex-wrap gap-2">
                  {amenitiesToShow.map((item, idx) => (
                    <View key={`${String(item)}-${idx}`} className="flex-row items-center px-3 py-2 rounded-full border border-slate-200 bg-white">
                      <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                      <Text className="text-slate-700 text-xs font-bold ml-2">
                        {typeof item === "string" ? item : String(item)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Rooms */}
          <View className="mt-6 mb-8">
            <SectionTitle
              title="Choose Room"
              right={
                !!selectedRoomData ? (
                  <View className="bg-blue-50 px-3 py-1.5 rounded-full flex-row items-center">
                    <Ionicons name="pricetag-outline" size={14} color="#0d3b8f" />
                    <Text className="text-[#0d3b8f] text-xs font-extrabold ml-2">
                      {currencySymbol}{Math.round(pricing.perNight).toLocaleString()} / night
                    </Text>
                  </View>
                ) : null
              }
            />

            {roomsWithPricing.map((room, idx) => {
              const roomId = getRoomId(room);
              const isSelected = String(selectedRoomId) === String(roomId);
              const soldOut = !!room?.inventory?.isSoldOut;

              const nightlyPrice = room.__pricing?.nightlyPrice ?? getRoomBasePrice(room);
              const roomTaxPercent = parseNumber(
                room?.pricing?.taxPercent || room?.pricing?.gstPercent
              );
              const taxDisplay = roomTaxPercent
                ? `${roomTaxPercent}%`
                : pricing.appliedTaxPercent
                ? `${pricing.appliedTaxPercent}%`
                : "12%";

              const availableCount = parseNumber(
                room?.inventory?.available ??
                  room?.inventory?.availableCount ??
                  room?.inventory?.roomsLeft ??
                  room?.inventory?.count
              );
              const availabilityText = soldOut
                ? "Sold Out"
                : availableCount > 0
                ? `${availableCount} available`
                : "Available";

              const key = roomId ?? room?.name ?? idx;

              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (soldOut || !roomId) return;
                    setSelectedRoomId(roomId);
                  }}
                  className={`bg-white rounded-[22px] p-3 mb-3 border shadow-sm ${
                    isSelected ? "border-blue-600 bg-blue-50/40 shadow-blue-100" : "border-slate-200"
                  }`}
                >
                  <View className="flex-row">
                    {room?.images?.[0] ? (
                      <Image
                        source={{ uri: room.images[0] }}
                        className="w-[100px] h-[100px] rounded-xl"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-[100px] h-[100px] rounded-xl bg-slate-200 items-center justify-center">
                        <Ionicons name="image-outline" size={20} color="#94a3b8" />
                      </View>
                    )}

                    <View className="flex-1 ml-3 justify-between">
                      <View>
                        <View className="flex-row items-start justify-between">
                          <Text className="text-[14px] font-extrabold text-slate-900 flex-1 pr-2" numberOfLines={1}>
                            {room?.name || "Room"}
                          </Text>
                          {isSelected && !soldOut && (
                            <View className="bg-blue-600 px-2 py-0.5 rounded-full flex-row items-center">
                              <Ionicons name="checkmark" size={10} color="white" />
                              <Text className="text-white text-[9px] font-bold ml-1">Selected</Text>
                            </View>
                          )}
                        </View>
                        {!!room?.bedType && (
                          <Text className="text-slate-500 text-[10px] font-medium mt-0.5">
                            {room.bedType}
                          </Text>
                        )}

                        <View className="flex-row items-center gap-2 mt-1">
                          <View
                            className={`flex-row items-center px-2 py-0.5 rounded-full border ${
                              soldOut
                                ? "bg-orange-50 border-orange-200"
                                : "bg-emerald-50 border-emerald-200"
                            }`}
                          >
                            <Ionicons
                              name={soldOut ? "alert-circle-outline" : "checkmark-circle-outline"}
                              size={10}
                              color={soldOut ? "#f97316" : "#10b981"}
                            />
                            <Text
                              className={`text-[9px] font-bold ml-1 ${
                                soldOut ? "text-orange-600" : "text-emerald-700"
                              }`}
                            >
                              {availabilityText}
                            </Text>
                          </View>

                          {!!room?.__pricing?.isOverrideApplied && (
                            <View className="flex-row items-center px-2 py-0.5 rounded-full border bg-blue-50 border-blue-200">
                              <Ionicons name="flash-outline" size={10} color="#2563eb" />
                              <Text className="text-blue-700 text-[9px] font-bold ml-1">
                                Monthly price
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View className="flex-row items-center justify-between mt-2">
                        <View>
                          <Text className="text-[16px] font-extrabold text-slate-900">
                            {currencySymbol}{Math.round(nightlyPrice).toLocaleString()}
                          </Text>
                          <Text className="text-[9px] text-slate-400">
                            GST ({taxDisplay}) at checkout
                          </Text>
                        </View>

                        <TouchableOpacity
                          disabled={soldOut}
                          onPress={() => !soldOut && setSelectedRoomId(roomId)}
                          className={`px-3 py-1.5 rounded-lg ${
                            soldOut
                              ? "bg-slate-100"
                              : isSelected
                              ? "bg-blue-600"
                              : "border border-blue-200 bg-white"
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-bold ${
                              soldOut
                                ? "text-slate-400"
                                : isSelected
                                ? "text-white"
                                : "text-blue-700"
                            }`}
                          >
                            {soldOut ? "Unavailable" : isSelected ? "Selected" : "Select"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Policies */}
          <View className="mt-2">
            <SectionTitle
              title="Policies"
              right={
                policyItems.length > 6 ? (
                  <TouchableOpacity onPress={() => setShowAllPolicies((v) => !v)}>
                    <Text className="text-xs font-extrabold text-[#0d3b8f]">
                      {showAllPolicies ? "Show less" : "View all"}
                    </Text>
                  </TouchableOpacity>
                ) : null
              }
            />
            <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm">
              {policyItems.length === 0 ? (
                <Text className="text-xs text-slate-500">No policies available.</Text>
              ) : (
                policiesToShow.map((item, idx) => (
                  <View key={`${item.key}-${idx}`}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons name={item.icon} size={14} color="#64748b" />
                        <Text className="text-xs font-bold text-slate-500 ml-2">{item.label}</Text>
                      </View>
                      <Text className="text-xs font-extrabold text-slate-900">{item.value}</Text>
                    </View>
                    {idx < policiesToShow.length - 1 && <View className="h-[1px] bg-slate-100 my-3" />}
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 flex-row items-center justify-between pb-8 shadow-lg z-10">
        <View>
          <Text className="text-slate-500 text-[10px] font-bold uppercase mb-0.5">
            {roomsCount} Room • {guestsCount} Guest • {nights} Night
          </Text>
          <Text className="text-2xl font-extrabold text-[#0d3b8f]">
            {currencySymbol}{Math.round(pricing.total).toLocaleString()}
          </Text>
          <Text className="text-[10px] text-slate-400 mt-1">
            {pricing.taxLabel ? `${pricing.taxLabel} included in estimate` : "Taxes calculated"}
          </Text>
        </View>

        <TouchableOpacity onPress={handleBookNow} className="bg-[#0d3b8f] px-8 py-4 rounded-2xl">
          <Text className="text-white font-extrabold text-base">Book Now</Text>
        </TouchableOpacity>
      </View>

      {/* Booking Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={bookingModalVisible}
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl h-[88%]">
              <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-100">
                <Text className="text-lg font-extrabold text-slate-800">Confirm Booking</Text>
                <TouchableOpacity onPress={() => setBookingModalVisible(false)} className="bg-slate-100 p-2 rounded-full">
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView className="p-6" keyboardShouldPersistTaps="handled">
                <View className="bg-blue-50 p-4 rounded-2xl mb-6 flex-row gap-3">
                  {!!selectedRoomData?.images?.[0] && (
                    <Image source={{ uri: selectedRoomData.images[0] }} className="w-16 h-16 rounded-2xl bg-slate-200" />
                  )}
                  <View className="flex-1">
                    <Text className="font-extrabold text-slate-900 text-sm mb-1">{basicInfo?.name}</Text>
                    <Text className="text-slate-600 text-xs mb-1">
                      {selectedRoomData?.name} • {roomsCount} room • {guestsCount} guest
                    </Text>
                    <Text className="text-[#0d3b8f] font-extrabold text-xs">
                      {formatFullDate(checkInDate)} - {formatFullDate(checkOutDate)}
                    </Text>
                    {!!selectedRoomData?.__pricing?.isOverrideApplied && (
                      <Text className="text-[10px] font-extrabold text-emerald-700 mt-1">
                        Monthly price applied for selected dates
                      </Text>
                    )}
                  </View>
                </View>

                <Text className="text-slate-900 font-extrabold mb-3 text-base">Guest Details</Text>

                <View className="mb-6">
                  <Text className="text-xs font-bold text-slate-500 mb-1.5 uppercase ml-1">Full Name</Text>
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-12 mb-4">
                    <Ionicons name="person-outline" size={18} color="#64748b" />
                    <TextInput className="flex-1 ml-3 text-slate-900 font-bold" placeholder="John Doe" value={guestName} onChangeText={setGuestName} />
                  </View>

                  <Text className="text-xs font-bold text-slate-500 mb-1.5 uppercase ml-1">Phone Number</Text>
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-12 mb-4">
                    <Ionicons name="call-outline" size={18} color="#64748b" />
                    <TextInput className="flex-1 ml-3 text-slate-900 font-bold" placeholder="+91 98765 43210" keyboardType="phone-pad" value={guestPhone} onChangeText={setGuestPhone} />
                  </View>

                  <Text className="text-xs font-bold text-slate-500 mb-1.5 uppercase ml-1">Email Address</Text>
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-12">
                    <Ionicons name="mail-outline" size={18} color="#64748b" />
                    <TextInput className="flex-1 ml-3 text-slate-900 font-bold" placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" value={guestEmail} onChangeText={setGuestEmail} />
                  </View>
                </View>

                <View className="bg-slate-50 rounded-2xl p-4 mb-8">
                  <Text className="text-slate-900 font-extrabold mb-3 text-sm">Price Breakdown</Text>

                  <View className="flex-row justify-between mb-2">
                    <Text className="text-slate-500 text-xs">
                      Room Subtotal ({nights} night{nights > 1 ? "s" : ""})
                    </Text>
                    <Text className="text-slate-700 font-bold text-xs">
                      {currencySymbol}{Math.round(pricing.base).toLocaleString()}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-2">
                    <Text className="text-slate-500 text-xs">
                      {pricing.taxLabel || "GST / Taxes"} {pricing.appliedTaxPercent ? `(${pricing.appliedTaxPercent}%)` : ""}
                    </Text>
                    <Text className="text-slate-700 font-bold text-xs">
                      {currencySymbol}{Math.round(pricing.tax).toLocaleString()}
                    </Text>
                  </View>

                  <View className="h-[1px] bg-slate-200 my-2" />

                  <View className="flex-row justify-between">
                    <Text className="text-slate-900 font-extrabold text-sm">Total Amount</Text>
                    <Text className="text-[#0d3b8f] font-extrabold text-lg">
                      {currencySymbol}{Math.round(pricing.total).toLocaleString()}
                    </Text>
                  </View>

                  <Text className="text-[10px] text-slate-400 mt-2">
                    * Final amount depends on hotel confirmation.
                  </Text>
                </View>

                <View className="h-20" />
              </ScrollView>

              <View className="p-5 border-t border-slate-100">
                <TouchableOpacity
                  onPress={submitBooking}
                  disabled={bookingStatus === "loading"}
                  className={`py-4 rounded-2xl items-center ${bookingStatus === "loading" ? "bg-slate-400" : "bg-[#0d3b8f]"}`}
                >
                  {bookingStatus === "loading" ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-extrabold text-lg">Confirm & Pay</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Modal */}
      <Modal animationType="fade" transparent visible={showDateModal} onRequestClose={() => setShowDateModal(false)}>
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white w-full rounded-2xl p-4">
            <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-slate-100">
              <Text className="text-lg font-extrabold text-slate-800">
                Select {dateModalTarget === "in" ? "Check-in" : "Check-out"} Date
              </Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between items-center mb-4 px-2">
              <TouchableOpacity onPress={() => setCalendarBase(new Date(calendarBase.getFullYear(), calendarBase.getMonth() - 1, 1))}>
                <Ionicons name="chevron-back" size={24} color="#334155" />
              </TouchableOpacity>

              <Text className="text-base font-extrabold text-slate-700">
                {calendarBase.toLocaleString("default", { month: "long", year: "numeric" })}
              </Text>

              <TouchableOpacity onPress={() => setCalendarBase(new Date(calendarBase.getFullYear(), calendarBase.getMonth() + 1, 1))}>
                <Ionicons name="chevron-forward" size={24} color="#334155" />
              </TouchableOpacity>
            </View>

            <View className="mb-2">
              <View className="flex-row justify-between mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <Text key={i} className="text-slate-400 font-bold w-[13%] text-center text-xs">
                    {d}
                  </Text>
                ))}
              </View>

              {getMonthMatrix(calendarBase).map((week, wIdx) => (
                <View key={wIdx} className="flex-row justify-between mb-2">
                  {week.map((dayObj, dIdx) => {
                    const selectedDate = new Date(
                      calendarBase.getFullYear(),
                      calendarBase.getMonth() + dayObj.monthOffset,
                      dayObj.day
                    );

                    const activeDate = dateModalTarget === "in" ? checkInDate : checkOutDate;
                    const isSelected =
                      toDateOnly(selectedDate).toDateString() === toDateOnly(activeDate).toDateString();

                    const disabled = !dayObj.inMonth;

                    return (
                      <TouchableOpacity
                        key={dIdx}
                        disabled={disabled}
                        onPress={() => applySelectedDate(selectedDate)}
                        className={`w-[13%] aspect-square items-center justify-center rounded-full ${isSelected ? "bg-blue-600" : ""}`}
                      >
                        <Text className={`${disabled ? "text-transparent" : isSelected ? "text-white font-extrabold" : "text-slate-700 font-bold"}`}>
                          {dayObj.day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <View className="flex-row justify-between mt-2">
              <TouchableOpacity onPress={() => setCalendarBase(new Date())} className="px-4 py-3 rounded-xl bg-slate-100">
                <Text className="text-slate-700 font-extrabold text-xs">Today</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowDateModal(false)} className="px-4 py-3 rounded-xl bg-[#0d3b8f]">
                <Text className="text-white font-extrabold text-xs">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HotelDetails;
