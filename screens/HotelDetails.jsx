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
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { getHotelById } from "../store/slices/hotelSlice";
import {
  createBooking,
  resetBookingState,
  applyCouponCode,
  resetCoupon,
  fetchMonthlyData,
  getGstForHotelData,
} from "../store/slices/bookingSlice";
import { getUserId } from "../utils/credentials";
import { getAmenityDisplayName, getAmenityIconName } from "../utils/amenities";

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
const MAX_GUESTS = 20;
const MAX_ROOMS = 10;
const MAX_GUESTS_PER_ROOM = 3;
const getRequiredRoomsForGuests = (guests) => {
  const normalizedGuests = clamp(Number(guests) || 1, 1, MAX_GUESTS);
  return Math.max(1, Math.ceil(normalizedGuests / MAX_GUESTS_PER_ROOM));
};

const parseNumber = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
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

  const {
    bookingStatus,
    bookingError,
    monthlyData,
    gstData,
    couponStatus,
    couponError,
    discountAmount,
    appliedCoupon,
    couponResult,
  } = useSelector((state) => state.booking);
  const userState = useSelector((state) => state.user);
  const user = userState?.user || userState?.data || null;

  const [checkInDate, setCheckInDate] = useState(paramCheckIn ? new Date(paramCheckIn) : new Date());
  const [checkOutDate, setCheckOutDate] = useState(
    paramCheckOut ? new Date(paramCheckOut) : new Date(Date.now() + 86400000)
  );

  const initialGuestsCount = clamp(Number(paramGuests) || 2, 1, MAX_GUESTS);
  const requiredRoomsForInitialGuests = getRequiredRoomsForGuests(initialGuestsCount);
  const initialRoomsCount = Math.max(
    clamp(Number(paramRooms) || 1, 1, MAX_ROOMS),
    requiredRoomsForInitialGuests
  );

  const [guestsCount, setGuestsCount] = useState(initialGuestsCount);
  const [roomsCount, setRoomsCount] = useState(initialRoomsCount);
  // Always select the first available room by default
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [guestName, setGuestName] = useState(user?.userName || "");
  const [guestEmail, setGuestEmail] = useState(user?.email || "");
  const [guestPhone, setGuestPhone] = useState(user?.mobile || "");

  const [showDateModal, setShowDateModal] = useState(false);
  const [dateModalTarget, setDateModalTarget] = useState("in");
  const [calendarBase, setCalendarBase] = useState(new Date());
  const lastGstQueryRef = useRef(null);
  const couponRoomKeyRef = useRef(null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showPoliciesModal, setShowPoliciesModal] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [galleryModalVisible, setGalleryModalVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryScrollRef = useRef(null);

  useEffect(() => {
    if (!hotelId) return;
    dispatch(getHotelById(hotelId));
    dispatch(fetchMonthlyData(hotelId));
    dispatch(resetCoupon());
    setCouponCodeInput("");
    couponRoomKeyRef.current = null;
  }, [dispatch, hotelId]);

  useEffect(() => {
    if ((user?.userName || user?.name) && !guestName) setGuestName(user?.userName || user?.name);
    if (user?.email && !guestEmail) setGuestEmail(user.email);
    if ((user?.mobile || user?.phone) && !guestPhone) setGuestPhone(user?.mobile || user?.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const getRoomId = useCallback((room) => room?.id ?? room?._id ?? room?.roomId ?? null, []);
  const getAvailableCount = useCallback((room) => {
    return parseNumber(
      room?.inventory?.available ??
        room?.inventory?.availableCount ??
        room?.inventory?.roomsLeft ??
        room?.inventory?.count ??
        room?.countRooms ??
        room?.availableRooms
    );
  }, []);
  const isRoomSoldOut = useCallback(
    (room) => {
      if (typeof room?.inventory?.isSoldOut === "boolean") return room.inventory.isSoldOut;
      const availableCount = getAvailableCount(room);
      if (availableCount > 0) return false;

      const knownTotal = parseNumber(room?.countRooms ?? room?.inventory?.total);
      if (knownTotal === 0 && (room?.countRooms !== undefined || room?.inventory?.total !== undefined)) {
        return true;
      }
      return false;
    },
    [getAvailableCount]
  );

  // ✅ Monthly override picker (your monthlyData sample supported)
  const pickMonthlyOverride = useCallback((data, roomId, inDate, outDate) => {
    if (!Array.isArray(data) || !roomId) return null;

    // Filter relevant overrides for this room
    const relevantOverrides = data.filter((entry) => {
      const entryRoomId = entry?.roomId ?? entry?._id ?? entry?.id;
      if (!entryRoomId || String(entryRoomId) !== String(roomId)) return false;
      return true;
    });

    if (!relevantOverrides.length) return null;

    const bookingStart = toDateOnly(new Date(inDate));
    const bookingEnd = toDateOnly(new Date(outDate));

    // If date range is provided, apply when booking overlaps that window.
    // If dates are missing, treat as always applicable for that room.
    const validOverride = relevantOverrides.find((entry) => {
      if (!entry?.startDate || !entry?.endDate) return true;
      return dateRangesOverlap(bookingStart, bookingEnd, entry.startDate, entry.endDate);
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

  const monthlyDataSource = useMemo(() => {
    if (Array.isArray(monthlyData) && monthlyData.length) return monthlyData;
    if (Array.isArray(hotel?.monthlyData) && hotel.monthlyData.length) return hotel.monthlyData;
    if (Array.isArray(hotel?.monthlyPrices) && hotel.monthlyPrices.length) return hotel.monthlyPrices;
    if (Array.isArray(hotel?.monthlyRoomPrices) && hotel.monthlyRoomPrices.length)
      return hotel.monthlyRoomPrices;
    if (Array.isArray(hotel?.monthlyPricing) && hotel.monthlyPricing.length)
      return hotel.monthlyPricing;
    return [];
  }, [monthlyData, hotel]);

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

  const galleryImages = useMemo(() => toList(basicInfo?.images).filter(Boolean), [basicInfo?.images]);
  const mainImage = galleryImages[0];
  const otherImages = galleryImages.slice(1, 9);

  const openGalleryAt = useCallback(
    (index) => {
      if (!galleryImages.length) return;
      const safeIndex = clamp(index, 0, galleryImages.length - 1);
      setGalleryIndex(safeIndex);
      setGalleryModalVisible(true);
    },
    [galleryImages]
  );

  const screenWidth = Dimensions.get("window").width;

  const goToGalleryIndex = useCallback(
    (index, animated = true) => {
      if (!galleryImages.length) return;
      const safeIndex = clamp(index, 0, galleryImages.length - 1);
      setGalleryIndex(safeIndex);
      galleryScrollRef.current?.scrollTo({ x: safeIndex * screenWidth, y: 0, animated });
    },
    [galleryImages.length, screenWidth]
  );

  useEffect(() => {
    if (!galleryModalVisible) return;
    const rafId = requestAnimationFrame(() => {
      galleryScrollRef.current?.scrollTo({ x: galleryIndex * screenWidth, y: 0, animated: false });
    });
    return () => cancelAnimationFrame(rafId);
  }, [galleryModalVisible, galleryIndex, screenWidth]);

  const roomsWithPricing = useMemo(() => {
    const rooms = Array.isArray(hotel?.rooms) ? hotel.rooms : [];
    return rooms.map((room) => {
      const roomId = getRoomId(room);
      const monthlyOverride = pickMonthlyOverride(
        monthlyDataSource,
        roomId,
        checkInDate,
        checkOutDate
      );

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
  }, [
    hotel,
    monthlyDataSource,
    checkInDate,
    checkOutDate,
    getRoomId,
    getRoomBasePrice,
    pickMonthlyOverride,
  ]);

  // Always select the first available room if none is selected or if the selected room is no longer available
  useEffect(() => {
    if (!roomsWithPricing.length) return;
    const available = roomsWithPricing.find((r) => !isRoomSoldOut(r) && getRoomId(r));
    if (!selectedRoomId || !roomsWithPricing.some(r => String(getRoomId(r)) === String(selectedRoomId) && !isRoomSoldOut(r))) {
      if (available) setSelectedRoomId(getRoomId(available));
    }
  }, [roomsWithPricing, selectedRoomId, getRoomId, isRoomSoldOut]);

  useEffect(() => {
    if (!selectedRoomId) return;
    const roomKey = `${String(hotelId || "")}:${String(selectedRoomId)}`;

    if (couponRoomKeyRef.current && couponRoomKeyRef.current !== roomKey) {
      dispatch(resetCoupon());
      setCouponCodeInput("");
    }
    couponRoomKeyRef.current = roomKey;
  }, [dispatch, hotelId, selectedRoomId]);

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
        discount: 0,
        finalTotal: 0,
        couponApplied: false,
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
    const isMonthlyOverrideApplied = !!selectedRoomData?.__pricing?.isOverrideApplied;

    let gstTotal = 0;
    let appliedTaxPercent = 0;
    let taxLabel = "";

    if (isMonthlyOverrideApplied) {
      appliedTaxPercent = 12;
      gstTotal = (baseTotal * appliedTaxPercent) / 100;
      taxLabel = "GST (12%)";
    } else if (gstData?.gstPrice) {
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

    const rawDiscount = parseNumber(
      discountAmount ||
        couponResult?.discountPrice ||
        couponResult?.discountAmount
    );
    const grossTotal = baseTotal + gstTotal;
    const discountValue = Math.min(Math.max(rawDiscount, 0), Math.max(grossTotal, 0));

    return {
      base: baseTotal,
      tax: gstTotal,
      total: grossTotal,
      discount: discountValue,
      finalTotal: Math.max(grossTotal - discountValue, 0),
      couponApplied: discountValue > 0,
      perNight: pricePerNight,
      appliedTaxPercent,
      taxLabel,
    };
  }, [
    selectedRoomData,
    roomsCount,
    nights,
    getRoomBasePrice,
    gstData,
    gstConfig,
    discountAmount,
    couponResult,
  ]);

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
      return;
    }
    setBookingModalVisible(true);
  };

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

  const handleGuestsCountChange = useCallback((nextGuests) => {
    const normalizedGuests = clamp(nextGuests, 1, MAX_GUESTS);
    const requiredRooms = clamp(getRequiredRoomsForGuests(normalizedGuests), 1, MAX_ROOMS);

    setGuestsCount(normalizedGuests);
    // Keep rooms synced both ways: guests + => rooms +, guests - => rooms -
    setRoomsCount(requiredRooms);
  }, []);

  const handleRoomsCountChange = useCallback((nextRooms) => {
    const normalizedRooms = clamp(nextRooms, 1, MAX_ROOMS);
    const maxGuestsAllowed = normalizedRooms * MAX_GUESTS_PER_ROOM;

    setRoomsCount(normalizedRooms);
    // If rooms reduced manually, trim guests to allowed capacity.
    setGuestsCount((prevGuests) => clamp(Math.min(prevGuests, maxGuestsAllowed), 1, MAX_GUESTS));
  }, []);

  const handleCouponInputChange = (value) => {
    const normalized = String(value || "")
      .trimStart()
      .toUpperCase();
    setCouponCodeInput(normalized);

    if (
      couponStatus !== "idle" ||
      appliedCoupon ||
      discountAmount > 0
    ) {
      dispatch(resetCoupon());
    }
  };

  const handleApplyCoupon = async () => {
    const code = String(couponCodeInput || "").trim().toUpperCase();
    if (!code) {
      return;
    }
    if (!hotelId || !selectedRoomId) {
      return;
    }

    const userId = await getUserId();
    if (!userId) {
      return;
    }

    try {
      await dispatch(
        applyCouponCode({
          hotelId: String(hotelId),
          roomId: String(selectedRoomId),
          couponCode: code,
          userId: String(userId),
        })
      ).unwrap();
      setCouponCodeInput(code);
    } catch {
      // Error toast is shown from thunk
    }
  };

  const handleClearCoupon = () => {
    dispatch(resetCoupon());
    setCouponCodeInput("");
  };

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
    if (guestsCount > roomsCount * MAX_GUESTS_PER_ROOM) {
      Alert.alert(
        "Guest Limit Exceeded",
        `Only ${MAX_GUESTS_PER_ROOM} guests are allowed per room.`
      );
      return;
    }

    const userId = await getUserId();
    if (!userId) {
      Alert.alert("Login Required", "Please login to continue booking.");
      return;
    }

    const selectedRoomPrice = parseNumber(
      selectedRoomData?.__pricing?.nightlyPrice ?? getRoomBasePrice(selectedRoomData)
    );

    const payload = {
      userId: String(userId),
      hotelId: String(hotelId),
      checkInDate: toDateOnly(checkInDate).toISOString(),
      checkOutDate: toDateOnly(checkOutDate).toISOString(),
      guests: guestsCount,
      numRooms: roomsCount,
      guestDetails: {
        fullName: name,
        mobile: phone,
        email,
      },
      foodDetails: [],
      roomDetails: [
        {
          roomId: String(selectedRoomId),
          type: String(selectedRoomData?.name || selectedRoomData?.type || "Room"),
          bedTypes: String(selectedRoomData?.bedTypes || selectedRoomData?.bedType || ""),
          price: selectedRoomPrice,
        },
      ],
      pm: "Online",
      bookingSource: "App",
      bookingStatus: "Confirmed",
      couponCode: appliedCoupon || undefined,
      discountPrice: pricing.discount || 0,
      isPartialBooking: false,
      partialAmount: 0,
      destination:
        basicInfo?.location?.city || basicInfo?.location?.state || hotel?.destination || "",
      hotelName: basicInfo?.name || hotel?.hotelName || "",
      hotelEmail: basicInfo?.email || hotel?.email || hotel?.hotelEmail || "",
      hotelCity: basicInfo?.location?.city || hotel?.hotelCity || "",
      hotelOwnerName:
        basicInfo?.ownerName || hotel?.hotelOwnerName || hotel?.createdBy?.user || "",
    };

  
    dispatch(createBooking(payload))
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

  const amenityRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < amenitiesToShow.length; i += 2) {
      rows.push(amenitiesToShow.slice(i, i + 2));
    }
    return rows;
  }, [amenitiesToShow]);

  const previewPolicies = useMemo(() => policyItems.slice(0, 5), [policyItems]);

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
              <TouchableOpacity activeOpacity={0.95} onPress={() => openGalleryAt(0)}>
                <Image source={{ uri: mainImage }} className="w-full h-full" resizeMode="cover" />
              </TouchableOpacity>
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
                <TouchableOpacity key={`${img}-${idx}`} activeOpacity={0.9} onPress={() => openGalleryAt(idx + 1)}>
                  <Image
                    source={{ uri: img }}
                    className="w-16 h-16 rounded-2xl border border-white/40"
                  />
                </TouchableOpacity>
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
          <View className="mt-5">
            <SectionTitle title="Your Stay" />

            <View className="bg-white rounded-[16px] border border-slate-300 overflow-hidden">
              <View className="p-2">
                <View className="bg-slate-50 border border-slate-300 rounded-xl px-2 py-3 flex-row items-center">
                  <TouchableOpacity onPress={openCheckIn} className="flex-1 items-center px-2">
                    <Text className="text-xs font-bold text-slate-700">Check-in:</Text>
                    <Text className="text-lg font-extrabold text-slate-900 mt-0.5">
                      {formatFullDate(checkInDate)}
                    </Text>
                  </TouchableOpacity>

                  <View className="px-1">
                    <Ionicons name="arrow-forward" size={22} color="#0f172a" />
                  </View>

                  <TouchableOpacity onPress={openCheckOut} className="flex-1 items-center px-2">
                    <Text className="text-xs font-bold text-slate-700">Check-out:</Text>
                    <Text className="text-lg font-extrabold text-slate-900 mt-0.5">
                      {formatFullDate(checkOutDate)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="px-3 pb-2 flex-row items-center justify-between">
                <Text className="flex-1 text-xs font-semibold text-slate-700">
                  {guestsCount} Guest{guestsCount > 1 ? "s" : ""} {"\u2022"} {roomsCount} Room
                  {roomsCount > 1 ? "s" : ""}
                </Text>
                <Text className="flex-1 text-xs font-semibold text-slate-700 text-right">
                  {formatShortDate(checkInDate)} {"\u2192"} {formatShortDate(checkOutDate)}
                </Text>
              </View>

              <View className="h-[1px] bg-slate-300" />

              <View className="px-3 py-4 flex-row items-center">
                <View className="flex-1 items-center">
                  <Text className="text-sm font-extrabold text-slate-800 mb-2">Guests:</Text>
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => handleGuestsCountChange(guestsCount - 1)}
                      disabled={guestsCount <= 1}
                      className={`w-9 h-9 rounded-lg items-center justify-center border ${
                        guestsCount <= 1
                          ? "bg-slate-100 border-slate-200"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      <Ionicons
                        name="remove"
                        size={14}
                        color={guestsCount <= 1 ? "#94a3b8" : "#0f172a"}
                      />
                    </TouchableOpacity>

                    <Text className="w-9 text-center text-sm font-extrabold text-slate-900">
                      {guestsCount}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleGuestsCountChange(guestsCount + 1)}
                      disabled={guestsCount >= MAX_GUESTS}
                      className={`w-9 h-9 rounded-lg items-center justify-center border ${
                        guestsCount >= MAX_GUESTS
                          ? "bg-slate-100 border-slate-200"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      <Ionicons
                        name="add"
                        size={14}
                        color={guestsCount >= MAX_GUESTS ? "#94a3b8" : "#0f172a"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="flex-1 items-center">
                  <Text className="text-sm font-extrabold text-slate-800 mb-2">Rooms:</Text>
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => handleRoomsCountChange(roomsCount - 1)}
                      disabled={roomsCount <= 1}
                      className={`w-9 h-9 rounded-lg items-center justify-center border ${
                        roomsCount <= 1
                          ? "bg-slate-100 border-slate-200"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      <Ionicons
                        name="remove"
                        size={14}
                        color={roomsCount <= 1 ? "#94a3b8" : "#0f172a"}
                      />
                    </TouchableOpacity>

                    <Text className="w-9 text-center text-sm font-extrabold text-slate-900">
                      {roomsCount}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleRoomsCountChange(roomsCount + 1)}
                      disabled={roomsCount >= MAX_ROOMS}
                      className={`w-9 h-9 rounded-lg items-center justify-center border ${
                        roomsCount >= MAX_ROOMS
                          ? "bg-slate-100 border-slate-200"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      <Ionicons
                        name="add"
                        size={14}
                        color={roomsCount >= MAX_ROOMS ? "#94a3b8" : "#0f172a"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
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
                {amenityRows.map((row, rowIdx) => (
                  <View
                    key={`amenity-row-${rowIdx}`}
                    className={`flex-row ${rowIdx < amenityRows.length - 1 ? "mb-2" : ""}`}
                  >
                    {row.map((item, colIdx) => {
                      const rawAmenityName =
                        typeof item === "string"
                          ? item
                          : item?.name || item?.title || item?.label || String(item);
                      const amenityLabel = getAmenityDisplayName(rawAmenityName);
                      const amenityIcon = getAmenityIconName(rawAmenityName);

                      return (
                        <View
                          key={`${String(item)}-${rowIdx}-${colIdx}`}
                          className={`flex-1 flex-row items-center px-3 py-2 rounded-full border border-slate-200 bg-white ${
                            colIdx === 0 ? "mr-2" : ""
                          }`}
                        >
                          <Ionicons name={amenityIcon} size={16} color="#16a34a" />
                          <Text
                            numberOfLines={1}
                            className="text-slate-700 text-xs font-bold ml-2 flex-1"
                          >
                            {amenityLabel}
                          </Text>
                        </View>
                      );
                    })}
                    {row.length === 1 && <View className="flex-1 ml-2" />}
                  </View>
                ))}
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
              const soldOut = isRoomSoldOut(room);

              const nightlyPrice = room.__pricing?.nightlyPrice ?? getRoomBasePrice(room);
              const roomTaxPercent = parseNumber(
                room?.pricing?.taxPercent || room?.pricing?.gstPercent
              );
              const taxDisplay = roomTaxPercent
                ? `${roomTaxPercent}%`
                : room?.__pricing?.isOverrideApplied
                ? "12%"
                : pricing.appliedTaxPercent
                ? `${pricing.appliedTaxPercent}%`
                : "12%";

              const availableCount = getAvailableCount(room);
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

          {/* Coupon */}
          <View className="mt-1 mb-4">
            <SectionTitle title="Apply Coupon" />
            <View className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm">
              <View className="flex-row items-center">
                <View className="flex-1 flex-row items-center border border-slate-200 rounded-xl px-3 h-11 bg-slate-50">
                  <Ionicons name="ticket-outline" size={16} color="#64748b" />
                  <TextInput
                    value={couponCodeInput}
                    onChangeText={handleCouponInputChange}
                    placeholder="Enter coupon code"
                    autoCapitalize="characters"
                    className="flex-1 ml-2 text-slate-900 font-bold text-xs"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <TouchableOpacity
                  onPress={appliedCoupon ? handleClearCoupon : handleApplyCoupon}
                  disabled={couponStatus === "loading"}
                  className={`ml-2 px-4 h-11 rounded-xl items-center justify-center ${
                    couponStatus === "loading" ? "bg-slate-300" : appliedCoupon ? "bg-slate-200" : "bg-[#0d3b8f]"
                  }`}
                >
                  {couponStatus === "loading" ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text
                      className={`font-extrabold text-xs ${
                        appliedCoupon ? "text-slate-700" : "text-white"
                      }`}
                    >
                      {appliedCoupon ? "Remove" : "Apply"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {!!appliedCoupon && pricing.discount > 0 && (
                <View className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex-row items-center justify-between">
                  <Text className="text-[11px] font-bold text-emerald-700">
                    {appliedCoupon} applied
                  </Text>
                  <Text className="text-[11px] font-extrabold text-emerald-700">
                    -{currencySymbol}{Math.round(pricing.discount).toLocaleString()}
                  </Text>
                </View>
              )}

              {couponStatus === "failed" && !!couponError && (
                <Text className="mt-2 text-[11px] font-bold text-rose-600">{couponError}</Text>
              )}
            </View>
          </View>

          {/* Policies */}
          <View className="mt-2">
            <SectionTitle title="Policies" />
            <View className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm">
              {policyItems.length === 0 ? (
                <Text className="text-xs text-slate-500">No policies available.</Text>
              ) : (
                previewPolicies.map((item, idx) => (
                  <View key={`${item.key}-${idx}`}>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-row items-center">
                        <Ionicons name={item.icon} size={14} color="#64748b" />
                        <Text className="text-xs font-bold text-slate-500 ml-2">{item.label}</Text>
                      </View>
                      <Text className="text-xs font-extrabold text-slate-900 ml-4 flex-1 text-right">
                        {item.value}
                      </Text>
                    </View>
                    {idx < previewPolicies.length - 1 && <View className="h-[1px] bg-slate-100 my-3" />}
                  </View>
                ))
              )}
              {policyItems.length > 5 && (
                <>
                  <View className="h-[1px] bg-slate-100 my-3" />
                  <TouchableOpacity
                    onPress={() => setShowPoliciesModal(true)}
                    className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  >
                    <Text className="text-xs font-extrabold text-[#0d3b8f]">See Terms & Conditions</Text>
                    <Ionicons name="chevron-forward" size={14} color="#0d3b8f" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={galleryModalVisible}
        onRequestClose={() => setGalleryModalVisible(false)}
      >
        <View className="flex-1 bg-black">
          <View
            className="absolute left-0 right-0 z-10 flex-row items-center justify-between px-4"
            style={{ top: 12 + topPadding }}
          >
            <TouchableOpacity
              onPress={() => setGalleryModalVisible(false)}
              className="w-10 h-10 rounded-full bg-black/40 items-center justify-center border border-white/20"
            >
              <Ionicons name="close" size={22} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xs font-bold bg-black/40 px-3 py-1.5 rounded-full">
              {galleryImages.length ? `${galleryIndex + 1} / ${galleryImages.length}` : "0 / 0"}
            </Text>
          </View>

          <ScrollView
            ref={galleryScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            className="flex-1"
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setGalleryIndex(clamp(nextIndex, 0, Math.max(galleryImages.length - 1, 0)));
            }}
          >
            {galleryImages.map((img, idx) => (
              <View key={`${img}-${idx}`} style={{ width: screenWidth }} className="flex-1 items-center justify-center px-2">
                <Image source={{ uri: img }} className="w-full h-[75%]" resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          {galleryImages.length > 1 && (
            <View className="absolute bottom-10 left-0 right-0 px-8 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => goToGalleryIndex(galleryIndex > 0 ? galleryIndex - 1 : galleryImages.length - 1)}
                className="w-11 h-11 rounded-full bg-black/40 items-center justify-center border border-white/20"
              >
                <Ionicons name="chevron-back" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => goToGalleryIndex(galleryIndex < galleryImages.length - 1 ? galleryIndex + 1 : 0)}
                className="w-11 h-11 rounded-full bg-black/40 items-center justify-center border border-white/20"
              >
                <Ionicons name="chevron-forward" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        animationType="slide"
        visible={showPoliciesModal}
        onRequestClose={() => setShowPoliciesModal(false)}
      >
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
            <TouchableOpacity onPress={() => setShowPoliciesModal(false)} className="p-1">
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-base font-extrabold text-slate-900">Terms & Conditions</Text>
            <View className="w-6" />
          </View>

          <ScrollView className="flex-1 px-5 pt-4">
            <View className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm">
              {policyItems.map((item, idx) => (
                <View key={`full-${item.key}-${idx}`}>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center pr-2">
                      <Ionicons name={item.icon} size={15} color="#64748b" />
                      <Text className="text-xs font-bold text-slate-500 ml-2">{item.label}</Text>
                    </View>
                    <Text className="text-xs font-extrabold text-slate-900 ml-4 flex-1 text-right">
                      {item.value}
                    </Text>
                  </View>
                  {idx < policyItems.length - 1 && <View className="h-[1px] bg-slate-100 my-3" />}
                </View>
              ))}
            </View>
            <View className="h-6" />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 flex-row items-center justify-between pb-8 shadow-lg z-10">
        <View>
          <Text className="text-slate-500 text-[10px] font-bold uppercase mb-0.5">
            {roomsCount} Room • {guestsCount} Guest • {nights} Night
          </Text>
          <Text className="text-2xl font-extrabold text-[#0d3b8f]">
            {currencySymbol}{Math.round(pricing.finalTotal).toLocaleString()}
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

                  {pricing.couponApplied && (
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-emerald-600 text-xs font-bold">
                        Coupon Discount {appliedCoupon ? `(${appliedCoupon})` : ""}
                      </Text>
                      <Text className="text-emerald-700 font-extrabold text-xs">
                        -{currencySymbol}{Math.round(pricing.discount).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  <View className="h-[1px] bg-slate-200 my-2" />

                  <View className="flex-row justify-between">
                    <Text className="text-slate-900 font-extrabold text-sm">Total Amount</Text>
                    <Text className="text-[#0d3b8f] font-extrabold text-lg">
                      {currencySymbol}{Math.round(pricing.finalTotal).toLocaleString()}
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
