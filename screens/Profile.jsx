import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header";
import { fetchProfileData } from "../store/slices/userSlice";
import { fetchUserCoupons } from "../store/slices/couponSlice";
import {
  resetProfileUpdateState,
  updateUserProfile,
} from "../store/slices/profileUpdateSlice";
import { fetchFilteredBooking } from "../store/slices/bookingSlice";
import {
  createHotelComplaint,
  fetchUserComplaints,
  resetCreateComplaintState,
  resetComplaintChatState,
  sendComplaintChat,
} from "../store/slices/complaintSlice";
import { fetchUserTourBookings } from "../store/slices/tourSlice";
import { fetchUserCabBookings } from "../store/slices/cabSlice";
import {
  ComplaintCardSkeleton,
  CouponCardSkeleton,
  HotelBookingCardSkeleton,
  ProfileHeaderSkeleton,
  ProfileTabSkeleton,
  TourBookingCardSkeleton,
} from "../components/skeleton/ProfileSkeleton";
import HotelBookingsDetailModal from "../components/HotelBookingsDetailModal";
import TourBookingDetailsModal from "../components/TourBookingDetailsModal";
import { getUserId } from "../utils/credentials";

const TABS = ["Bookings", "Coupons", "Complaints", "Profile"];
const BOOKING_TYPES = ["Tour", "Cabs", "Hotel"];
const BOOKING_STATUS_OPTIONS = [
  "All",
  "Confirmed",
  "Pending",
  "Checked-in",
  "Checked-out",
  "Cancelled",
];
const COMPLAINT_REGARDING_OPTIONS = ["Booking", "Hotel", "Website"];
const INITIAL_COMPLAINT_FORM = {
  hotelId: "",
  regarding: "Booking",
  hotelName: "",
  hotelEmail: "",
  bookingId: "",
  issue: "",
};

const FALLBACK_COMPLAINTS = [
  {
    id: "c1",
    title: "AC not working",
    complaintId: "TFK-9823",
    raisedOn: "12 Oct 2023",
    status: "Resolved",
  },
  {
    id: "c2",
    title: "Refund Amount Pending",
    complaintId: "TFK-9941",
    raisedOn: "01 Nov 2023",
    status: "In Progress",
  },
];

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
};

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
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

const getFileName = (uri) =>
  String(uri || "").split("/").pop() || `profile_${Date.now()}.jpg`;

const getMimeType = (uri) => {
  const ext = String(uri || "").split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
};

const formatLongDate = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateValue) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const isExpiredCoupon = (coupon) => {
  if (coupon?.expired) return true;
  const validityDate = new Date(coupon?.validity);
  if (Number.isNaN(validityDate.getTime())) return false;
  return validityDate.getTime() < Date.now();
};

const statusPillClasses = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("confirm")) return "bg-emerald-50 border-emerald-200 text-emerald-700";
  if (s.includes("pending")) return "bg-amber-50 border-amber-200 text-amber-700";
  if (s.includes("cancel")) return "bg-red-50 border-red-200 text-red-700";
  if (s.includes("check")) return "bg-indigo-50 border-indigo-200 text-indigo-700";
  return "bg-slate-50 border-slate-200 text-slate-700";
};

const calculateBookingCosts = (booking) => {
  const totalPaid = toNumber(booking?.price);
  const foodTotal = toList(booking?.foodDetails).reduce(
    (sum, item) => sum + toNumber(item?.price) * toNumber(item?.quantity || 1),
    0
  );

  const baseAmount = totalPaid > 0 ? Math.round(totalPaid / 1.12) : 0;
  const gst = totalPaid - baseAmount;
  const roomBase = Math.max(0, baseAmount - foodTotal);

  return {
    roomBase,
    foodTotal,
    gst,
    totalPaid,
  };
};

const cleanList = (value) =>
  toList(value)
    .map((item) => String(item || "").trim())
    .filter(Boolean);

const normalizeTourSeatLabels = (booking) => {
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

  return Array.from(new Set([...fromSeats, ...fromPassengers]));
};

const getTourSeatCount = (booking) => {
  const seats = normalizeTourSeatLabels(booking);
  if (seats.length) return seats.length;
  return toNumber(booking?.numberOfAdults) + toNumber(booking?.numberOfChildren);
};

const getCabDisplayName = (booking) => {
  const make = booking?.carId?.make || booking?.make || "";
  const model = booking?.carId?.model || booking?.model || "";
  const combined = `${make} ${model}`.trim();
  if (combined) return combined;
  return booking?.vehicleType || "Cab Booking";
};

const sanitizeUserId = (value) => String(value || "").trim().replace(/[<>\s]/g, "");
const normalizeText = (value) => String(value || "").trim();

const resolveBookedHotelDetails = (booking) => {
  if (!booking || typeof booking !== "object") return null;

  const bookingIdCandidates = [
    booking?.bookingId,
    booking?.bookingID,
    booking?.booking_id,
    booking?.bookingCode,
  ];
  const hotelIdCandidates = [
    booking?.hotelId,
    booking?.hotelID,
    booking?.hotel_id,
    booking?.hotelDetails?.hotelId,
    booking?.hotelDetails?.hotelID,
    booking?.hotel?.hotelId,
    booking?.hotel?.hotelID,
  ];

  const bookingId = bookingIdCandidates.map(normalizeText).find(Boolean) || "";
  const hotelId = hotelIdCandidates.map(normalizeText).find(Boolean) || "";
  if (!bookingId || !hotelId) return null;

  const hotelName = [
    booking?.hotelName,
    booking?.hotelDetails?.hotelName,
    booking?.hotelDetails?.name,
    booking?.hotel?.hotelName,
  ]
    .map(normalizeText)
    .find(Boolean) || "";
  const hotelEmail = [
    booking?.hotelEmail,
    booking?.hotelDetails?.hotelEmail,
    booking?.hotelDetails?.email,
    booking?.hotel?.hotelEmail,
    booking?.hotel?.email,
  ]
    .map(normalizeText)
    .find(Boolean) || "";

  return {
    key: `${bookingId}::${hotelId}`,
    bookingId,
    hotelId,
    hotelName,
    hotelEmail,
  };
};

const BookingCard = ({ item, onViewBooking }) => {
  const hotelName = item?.hotelDetails?.hotelName || "Hotel";
  const destination = item?.destination || item?.hotelDetails?.destination || "-";
  const status = item?.bookingStatus || "-";
  const roomType = item?.roomDetails?.[0]?.type || "-";
  const guests = toNumber(item?.guests || 0);
  const amount = formatCurrencyINR(item?.price);

  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-base font-extrabold text-slate-900" numberOfLines={1}>
            {hotelName}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="location-outline" size={14} color="#94a3b8" />
            <Text className="text-xs text-slate-500 ml-1" numberOfLines={1}>
              {destination}
            </Text>
          </View>
          <Text className="text-[11px] text-slate-400 mt-1">Booking ID: {item?.bookingId || "-"}</Text>
        </View>

        <View className={`px-3 py-1.5 rounded-full border ${statusPillClasses(status)}`}>
          <Text className="text-[10px] font-bold uppercase">{String(status || "-")}</Text>
        </View>
      </View>

      <View className="mt-3 bg-slate-50 rounded-xl border border-slate-100 p-3 flex-row items-center justify-between">
        <View>
          <Text className="text-[10px] font-bold text-slate-400">CHECK-IN</Text>
          <Text className="text-sm font-bold text-slate-800">{formatLongDate(item?.checkInDate)}</Text>
        </View>

        <Ionicons name="arrow-forward" size={18} color="#94a3b8" />

        <View style={{ alignItems: "flex-end" }}>
          <Text className="text-[10px] font-bold text-slate-400">CHECK-OUT</Text>
          <Text className="text-sm font-bold text-slate-800">{formatLongDate(item?.checkOutDate)}</Text>
        </View>
      </View>

      <View className="flex-row mt-3">
        <View className="flex-1 flex-row items-center">
          <Ionicons name="people-outline" size={16} color="#64748b" />
          <Text className="text-xs text-slate-600 ml-2">{guests} Guest{guests === 1 ? "" : "s"}</Text>
        </View>
        <View className="flex-1 flex-row items-center">
          <Ionicons name="bed-outline" size={16} color="#64748b" />
          <Text className="text-xs text-slate-600 ml-2" numberOfLines={1}>
            {roomType}
          </Text>
        </View>
      </View>

      {!!toList(item?.foodDetails).length && (
        <View className="mt-3 border-t border-slate-100 pt-3">
          <Text className="text-[10px] font-bold text-slate-400 tracking-wider">FOOD & BEVERAGES</Text>
          {toList(item?.foodDetails).map((f, idx) => (
            <View key={`${f?._id || f?.foodId || idx}`} className="flex-row items-center justify-between mt-2">
              <Text className="text-xs text-slate-700" numberOfLines={1}>
                {f?.name || "Item"} {f?.quantity ? `x${f.quantity}` : ""}
              </Text>
              <Text className="text-xs font-bold text-slate-700">{formatCurrencyINR(f?.price)}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="mt-3 border-t border-slate-100 pt-3 flex-row items-center justify-between">
        <View>
          <Text className="text-[11px] text-slate-400">Total Amount</Text>
          <Text className="text-xl font-black text-slate-900">{amount}</Text>
        </View>

        <TouchableOpacity
          className="px-4 h-10 rounded-xl bg-slate-900 items-center justify-center"
          onPress={() => onViewBooking?.(item)}
        >
          <Text className="text-xs font-bold text-white">View Booking</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Profile = ({ navigation }) => {
  const dispatch = useDispatch();
  const { signOut } = useAuth();

  const [activeTab, setActiveTab] = useState("Bookings");
  const [bookingType, setBookingType] = useState("Hotel");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("All");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedBookingType, setSelectedBookingType] = useState("Hotel");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showComplaintChatModal, setShowComplaintChatModal] = useState(false);
  const [showCreateComplaintModal, setShowCreateComplaintModal] = useState(false);
  const [complaintForm, setComplaintForm] = useState(INITIAL_COMPLAINT_FORM);
  const [complaintImages, setComplaintImages] = useState([]);
  const [selectedComplaintBookingKey, setSelectedComplaintBookingKey] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const complaintChatScrollRef = useRef(null);
  const [storedUserId, setStoredUserId] = useState(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [updateForm, setUpdateForm] = useState({
    userName: "",
    email: "",
    mobile: "",
    address: "",
    password: "",
  });

  // --- Redux State ---
  const userState = useSelector((state) => state.user);
  const couponsState = useSelector((state) => state.coupons);
  const complaintsState = useSelector((state) => state.complaints);
  const profileUpdateState = useSelector((state) => state.profileUpdate);
  const tourState = useSelector((state) => state.tour);

  // bookingSlice should store these keys (adjust if your slice uses different names)
  const bookingState = useSelector((state) => state.booking);
  const filteredBookingsEnvelope = bookingState?.filteredBookings || {};
  const filteredBookings = useMemo(
    () => (Array.isArray(filteredBookingsEnvelope?.data) ? filteredBookingsEnvelope.data : []),
    [filteredBookingsEnvelope?.data]
  );
  const bookingLoading = bookingState?.filteredBookingsStatus === "loading";
  const bookingError = bookingState?.filteredBookingsError;
  const bookingPagination = filteredBookingsEnvelope?.pagination || null;
  const tourBookings = Array.isArray(tourState?.userTourBookings) ? tourState.userTourBookings : [];
  const tourBookingsLoading = tourState?.userTourBookingsStatus === "loading";
  const tourBookingsError = tourState?.userTourBookingsError;
  const cabState = useSelector((state) => state.cab);
  const cabBookings = Array.isArray(cabState?.userCabBookings) ? cabState.userCabBookings : [];
  const cabBookingsLoading = cabState?.userCabBookingsStatus === "loading";
  const cabBookingsError = cabState?.userCabBookingsError;
  const cabBookingsPagination = cabState?.userCabBookingsPagination || null;

  const user = userState?.data || {};
  const coupons = toList(couponsState?.items);
  const bookingHistory = useMemo(
    () => toList(userState?.bookingData),
    [userState?.bookingData]
  );
  const complaints = toList(complaintsState?.items);
  const isComplaintCreating = complaintsState?.createStatus === "loading";

  const profileImages = Array.isArray(user?.images) ? user.images.filter(Boolean) : [];
  const profileImage = profileImages[0] || user?.profile?.[0] || null;

  const bookingCount = bookingHistory.length;

  const complaintItems = useMemo(
    () => (complaints.length ? complaints : FALLBACK_COMPLAINTS),
    [complaints]
  );

  const complaintChats = useMemo(() => {
    const chats = toList(selectedComplaint?.chats);
    return [...chats].sort(
      (first, second) =>
        new Date(first?.timestamp || 0).getTime() - new Date(second?.timestamp || 0).getTime()
    );
  }, [selectedComplaint?.chats]);

  const normalizedBookedHotels = useMemo(() => {
    const source = [...filteredBookings, ...bookingHistory];
    const uniqueMap = new Map();

    source.forEach((booking) => {
      const details = resolveBookedHotelDetails(booking);
      if (!details) return;
      if (!uniqueMap.has(details.key)) {
        uniqueMap.set(details.key, details);
      }
    });

    return Array.from(uniqueMap.values());
  }, [filteredBookings, bookingHistory]);

  const userId = useMemo(
    () => {
      const candidates = [
        storedUserId,
        user?.userId,
        user?.id,
        user?._id,
        userState?.userId,
        userState?.id,
        userState?._id,
      ];
      for (const candidate of candidates) {
        const normalized = sanitizeUserId(candidate);
        if (normalized) return normalized;
      }
      return null;
    },
    [storedUserId, user?.userId, user?.id, user?._id, userState?.userId, userState?.id, userState?._id]
  );

  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    dispatch(fetchProfileData());
    dispatch(fetchUserCoupons());
  }, [dispatch]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const authUserId = await getUserId();
        if (mounted) {
          setStoredUserId(authUserId || null);
        }
      } catch {
        if (mounted) {
          setStoredUserId(null);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchUserComplaints({ userId }));
  }, [dispatch, userId]);

  useEffect(() => {
    setSelectedComplaintBookingKey((prev) => {
      if (!prev) return prev;
      return normalizedBookedHotels.some((item) => item.key === prev) ? prev : "";
    });
  }, [normalizedBookedHotels]);

  useEffect(() => {
    if (!userId || activeTab !== "Complaints") return;
    dispatch(
      fetchFilteredBooking({
        userId,
        page: 1,
        limit: 50,
        selectedStatus: "All",
      })
    );
  }, [dispatch, userId, activeTab]);

  useEffect(() => {
    if (!selectedComplaint) return;
    const updatedComplaint = complaintItems.find(
      (complaint) =>
        String(complaint?._id || "") === String(selectedComplaint?._id || "") ||
        String(complaint?.complaintId || "") === String(selectedComplaint?.complaintId || "")
    );
    if (updatedComplaint) {
      setSelectedComplaint(updatedComplaint);
    }
  }, [complaintItems, selectedComplaint]);

  useEffect(() => {
    if (!showComplaintChatModal) return;
    const timer = setTimeout(() => {
      complaintChatScrollRef.current?.scrollToEnd({ animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, [showComplaintChatModal, complaintChats.length]);

  // Reset pagination when booking type/status changes
  useEffect(() => {
    setPage(1);
  }, [bookingType, bookingStatusFilter]);

  // Fetch bookings based on selected booking type
  useEffect(() => {
    if (activeTab !== "Bookings") return;
    if (!userId) return;

    const payload = {
      userId,
      page,
      limit,
    };

    if (bookingType === "Hotel" && bookingStatusFilter !== "All") {
      payload.selectedStatus = bookingStatusFilter;
    }

    if (bookingType === "Hotel") {
      dispatch(fetchFilteredBooking(payload));
      return;
    }

    if (bookingType === "Tour") {
      dispatch(fetchUserTourBookings(payload));
      return;
    }

    if (bookingType === "Cabs") {
      dispatch(fetchUserCabBookings(payload));
    }
  }, [dispatch, activeTab, bookingType, bookingStatusFilter, userId, page]);

  useEffect(() => {
    if (profileUpdateState?.status === "succeeded") {
      dispatch(fetchProfileData());
      setShowUpdateModal(false);
      setSelectedImages([]);
      dispatch(resetProfileUpdateState());
      return;
    }

    if (profileUpdateState?.status === "failed" && profileUpdateState?.error) {
    }
  }, [dispatch, profileUpdateState?.error, profileUpdateState?.message, profileUpdateState?.status]);



  const openUpdateModal = () => {
    setUpdateForm({
      userName: user?.userName || "",
      email: user?.email || "",
      mobile: user?.mobile || "",
      address: user?.address || "",
      password: "",
    });
    setSelectedImages([]);
    dispatch(resetProfileUpdateState());
    setShowUpdateModal(true);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    dispatch(resetProfileUpdateState());
  };

  const handleProfileHeaderBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    navigation?.navigate?.("Search");
  };

  const handlePickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: false,
        selectionLimit: 1,
        quality: 0.8,
      });

      if (result?.canceled) return;
      const nextImages = (result?.assets || [])
        .filter((asset) => asset?.uri)
        .map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || getFileName(asset.uri),
          type: asset.mimeType || getMimeType(asset.uri),
        }));

      if (!nextImages.length) return;
      setSelectedImages(nextImages.slice(0, 1));
    } catch {
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await dispatch(
        updateUserProfile({
          userName: updateForm.userName?.trim(),
          email: updateForm.email?.trim(),
          mobile: updateForm.mobile?.trim(),
          address: updateForm.address?.trim(),
          password: updateForm.password?.trim(),
          images: selectedImages,
        })
      ).unwrap();
    } catch {
      // handled by effect
    }
  };

  const handleOpenBookingModal = (booking, type = bookingType) => {
    if (!booking) return;
    setSelectedBooking(booking);
    setSelectedBookingType(type);
    setShowBookingModal(true);
  };

  const handleCloseBookingModal = () => {
    setShowBookingModal(false);
    setSelectedBooking(null);
    setSelectedBookingType("Hotel");
  };

  const handleOpenComplaintChat = (complaint) => {
    if (!complaint) return;
    setSelectedComplaint(complaint);
    setChatMessage("");
    setShowComplaintChatModal(true);
    dispatch(resetComplaintChatState());
  };

  const handleCloseComplaintChat = () => {
    setShowComplaintChatModal(false);
    setSelectedComplaint(null);
    setChatMessage("");
    dispatch(resetComplaintChatState());
  };

  const handleOpenCreateComplaintModal = () => {
    const primaryBookedHotel = normalizedBookedHotels[0] || null;
    setSelectedComplaintBookingKey(primaryBookedHotel?.key || "");
    setComplaintForm({
      ...INITIAL_COMPLAINT_FORM,
      hotelId: primaryBookedHotel?.hotelId || "",
      hotelName: primaryBookedHotel?.hotelName || "",
      hotelEmail: primaryBookedHotel?.hotelEmail || "",
      bookingId: primaryBookedHotel?.bookingId || "",
    });
    setComplaintImages([]);
    dispatch(resetCreateComplaintState());
    setShowCreateComplaintModal(true);
  };

  const handleSelectComplaintBooking = (bookingDetails) => {
    if (!bookingDetails) return;
    setSelectedComplaintBookingKey(bookingDetails.key || "");
    setComplaintForm((prev) => ({
      ...prev,
      hotelId: bookingDetails.hotelId || "",
      hotelName: bookingDetails.hotelName || "",
      hotelEmail: bookingDetails.hotelEmail || prev.hotelEmail || "",
      bookingId: bookingDetails.bookingId || "",
    }));
  };

  const handleCloseCreateComplaintModal = () => {
    if (isComplaintCreating) return;
    setShowCreateComplaintModal(false);
    setSelectedComplaintBookingKey("");
  };

  const handlePickComplaintImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 3,
        quality: 0.8,
      });

      if (result?.canceled) return;

      const nextImages = (result?.assets || [])
        .filter((asset) => asset?.uri)
        .map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || getFileName(asset.uri),
          type: asset.mimeType || getMimeType(asset.uri),
        }));

      if (!nextImages.length) return;
      setComplaintImages((prev) => [...prev, ...nextImages].slice(0, 3));
    } catch {
    }
  };

  const handleRemoveComplaintImage = (uri) => {
    setComplaintImages((prev) => prev.filter((image) => image?.uri !== uri));
  };

  const handleCreateComplaint = async () => {
    if (!userId) return;

    try {
      await dispatch(
        createHotelComplaint({
          userId,
          hotelId: complaintForm.hotelId?.trim(),
          regarding: complaintForm.regarding?.trim(),
          hotelName: complaintForm.hotelName?.trim(),
          hotelEmail: complaintForm.hotelEmail?.trim(),
          bookingId: complaintForm.bookingId?.trim(),
          issue: complaintForm.issue?.trim(),
          images: complaintImages,
        })
      ).unwrap();

      setShowCreateComplaintModal(false);
      setComplaintForm(INITIAL_COMPLAINT_FORM);
      setComplaintImages([]);
      setSelectedComplaintBookingKey("");
      dispatch(resetCreateComplaintState());
      dispatch(fetchUserComplaints({ userId }));
    } catch {
    }
  };

  const handleSendComplaintMessage = async () => {
    const message = String(chatMessage || "").trim();
    const complaintId = selectedComplaint?.complaintId;
    if (!complaintId || !message) return;

    try {
      await dispatch(
        sendComplaintChat({
          complaintId,
          message,
          sender: user?.userName || user?.name || user?.email || "You",
          receiver: "Admin",
        })
      ).unwrap();

      setChatMessage("");
      if (userId) {
        dispatch(fetchUserComplaints({ userId }));
      }
    } catch {
    }
  };

  const onCopyCoupon = (code) => {
    // Optional: use Clipboard API if you have expo-clipboard
  };

  const renderBookings = () => {
    const isHotel = bookingType === "Hotel";
    const isTour = bookingType === "Tour";
    const isCab = bookingType === "Cabs";

    return (
      <View className="flex-1">
        <View className="flex-row bg-white border border-slate-200 rounded-xl p-1 mb-3">
          {BOOKING_TYPES.map((type) => {
            const active = bookingType === type;
            return (
              <TouchableOpacity
                key={type}
                className={`flex-1 h-9 rounded-lg items-center justify-center ${active ? "bg-blue-900" : "bg-transparent"}`}
                onPress={() => setBookingType(type)}
              >
                <Text className={`text-xs font-bold ${active ? "text-white" : "text-slate-500"}`}>{type}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isTour ? (
          <View className="flex-1">
            {tourBookingsLoading && (
              <View>
                {[0, 1, 2].map((idx) => (
                  <TourBookingCardSkeleton key={`tour-skeleton-${idx}`} />
                ))}
              </View>
            )}

            {!!tourBookingsError && !tourBookingsLoading && (
              <View className="bg-white rounded-xl border border-red-200 p-4">
                <Text className="text-xs text-red-600 font-bold">
                  {String(tourBookingsError?.message || tourBookingsError || "Unable to load tour bookings")}
                </Text>
              </View>
            )}

            {!tourBookingsLoading && !tourBookingsError && (
              <>
                {tourBookings.length ? (
                  tourBookings.map((item, index) => (
                    <View
                      key={item?._id || item?.bookingId || String(index)}
                      className="bg-white rounded-2xl border border-slate-200 p-4 mb-3"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-3">
                          <Text className="text-base font-extrabold text-slate-900" numberOfLines={2}>
                            {item?.visitngPlaces || item?.travelAgencyName || "Tour Booking"}
                          </Text>
                          <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
                            {item?.city || item?.state || "-"} • {item?.travelAgencyName || "-"}
                          </Text>
                        </View>

                        <View className={`px-3 py-1.5 rounded-full border ${statusPillClasses(item?.status || item?.bookingStatus)}`}>
                          <Text className="text-[10px] font-bold uppercase">
                            {String(item?.status || item?.bookingStatus || "pending")}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-3 flex-row items-center justify-between">
                        <View>
                          <Text className="text-xs text-slate-500">
                            Booking: {item?.bookingCode || item?._id || "-"}
                          </Text>
                          <Text className="text-xs text-slate-500 mt-1">
                            Seats: {getTourSeatCount(item)} | Adults: {toNumber(item?.numberOfAdults)} | Children: {toNumber(item?.numberOfChildren)}
                          </Text>
                          {!!normalizeTourSeatLabels(item).length && (
                            <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
                              Seat No: {normalizeTourSeatLabels(item).join(", ")}
                            </Text>
                          )}
                        </View>
                        <Text className="text-base font-black text-slate-900">
                          {formatCurrencyINR(item?.totalAmount || item?.price)}
                        </Text>
                      </View>

                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-[11px] text-slate-400">
                          {formatLongDate(item?.from || item?.tourStartDate)} - {formatLongDate(item?.to)}
                        </Text>
                        <Text className="text-[11px] text-slate-400">
                          {toNumber(item?.nights)}N / {toNumber(item?.days)}D
                        </Text>
                      </View>

                      <View className="mt-3 border-t border-slate-100 pt-3 flex-row items-center justify-between">
                        <View>
                          <Text className="text-[11px] text-slate-400">Seat Price</Text>
                          <Text className="text-sm font-bold text-slate-800">
                            {formatCurrencyINR(item?.seatPrice || item?.basePrice || item?.price)}
                          </Text>
                        </View>

                        <TouchableOpacity
                          className="px-4 h-10 rounded-xl bg-slate-900 items-center justify-center"
                          onPress={() => handleOpenBookingModal(item, "Tour")}
                        >
                          <Text className="text-xs font-bold text-white">View Booking</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View className="py-10 items-center justify-center bg-white rounded-xl border border-slate-200">
                    <Text className="text-sm font-bold text-slate-700">No tour bookings found</Text>
                  </View>
                )}
              </>
            )}
          </View>
        ) : isCab ? (
          <View className="flex-1">
            {cabBookingsLoading && (
              <View>
                {[0, 1, 2].map((idx) => (
                  <HotelBookingCardSkeleton key={`cab-skeleton-${idx}`} />
                ))}
              </View>
            )}

            {!!cabBookingsError && !cabBookingsLoading && (
              <View className="bg-white rounded-xl border border-red-200 p-4">
                <Text className="text-xs text-red-600 font-bold">
                  {String(cabBookingsError?.message || cabBookingsError || "Unable to load cab bookings")}
                </Text>
              </View>
            )}

            {!cabBookingsLoading && !cabBookingsError && (
              <>
                {cabBookings.length ? (
                  cabBookings.map((item, index) => {
                    const status = item?.bookingStatus || item?.status || "Pending";
                    const seats = toList(item?.seats);
                    const seatSummary = seats.length ? `${seats.length} seat(s)` : "Private trip";
                    const vehicleNumber = item?.vehicleNumber || item?.carId?.vehicleNumber || "-";
                    const cabName = getCabDisplayName(item);

                    return (
                      <View
                        key={item?._id || item?.bookingId || String(index)}
                        className="bg-white rounded-2xl border border-slate-200 p-4 mb-3"
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 mr-3">
                            <Text className="text-base font-extrabold text-slate-900" numberOfLines={1}>
                              {cabName}
                            </Text>
                            <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
                              {vehicleNumber} • {item?.sharingType || "Private"}
                            </Text>
                            <Text className="text-[11px] text-slate-400 mt-1">
                              Booking ID: {item?.bookingId || item?._id || "-"}
                            </Text>
                          </View>

                          <View className={`px-3 py-1.5 rounded-full border ${statusPillClasses(status)}`}>
                            <Text className="text-[10px] font-bold uppercase">{String(status)}</Text>
                          </View>
                        </View>

                        <View className="mt-3 bg-slate-50 rounded-xl border border-slate-100 p-3">
                          <View className="flex-row items-center">
                            <Ionicons name="navigate-outline" size={14} color="#64748b" />
                            <Text className="text-xs text-slate-700 ml-2" numberOfLines={1}>
                              {item?.pickupP || "-"} -> {item?.dropP || "-"}
                            </Text>
                          </View>
                          <View className="flex-row items-center justify-between mt-2">
                            <Text className="text-[11px] text-slate-500">
                              {formatLongDate(item?.pickupD)} - {formatLongDate(item?.dropD)}
                            </Text>
                            <Text className="text-[11px] font-bold text-slate-700">{seatSummary}</Text>
                          </View>
                        </View>

                        <View className="mt-3 border-t border-slate-100 pt-3 flex-row items-center justify-between">
                          <View>
                            <Text className="text-[11px] text-slate-400">Total Amount</Text>
                            <Text className="text-lg font-black text-slate-900">
                              {formatCurrencyINR(item?.price)}
                            </Text>
                          </View>
                          <View className="px-3 py-1.5 rounded-lg bg-slate-100">
                            <Text className="text-[11px] font-bold text-slate-600">
                              {item?.customerMobile || "-"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View className="py-10 items-center justify-center bg-white rounded-xl border border-slate-200">
                    <Text className="text-sm font-bold text-slate-700">No cab bookings found</Text>
                  </View>
                )}

                {cabBookingsPagination ? (
                  <View className="flex-row items-center justify-between py-3">
                    <Text className="text-xs text-slate-500">
                      Page {cabBookingsPagination?.currentPage || page} / {cabBookingsPagination?.totalPages || 1}
                    </Text>
                    <View className="flex-row">
                      <TouchableOpacity
                        disabled={!cabBookingsPagination?.hasPrevPage}
                        onPress={() => setPage((p) => Math.max(1, p - 1))}
                        className={`px-3 h-10 rounded-xl border items-center justify-center mr-2 ${
                          cabBookingsPagination?.hasPrevPage ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-100"
                        }`}
                      >
                        <Text className={`text-xs font-bold ${cabBookingsPagination?.hasPrevPage ? "text-slate-700" : "text-slate-300"}`}>
                          Previous
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={!cabBookingsPagination?.hasNextPage}
                        onPress={() => setPage((p) => p + 1)}
                        className={`px-3 h-10 rounded-xl border items-center justify-center ${
                          cabBookingsPagination?.hasNextPage ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-100"
                        }`}
                      >
                        <Text className={`text-xs font-bold ${cabBookingsPagination?.hasNextPage ? "text-slate-700" : "text-slate-300"}`}>
                          Next
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ height: 12 }} />
                )}
              </>
            )}
          </View>
        ) : (
          <View className="flex-1">
            <View className="flex-row flex-wrap mb-3">
              {BOOKING_STATUS_OPTIONS.map((statusOption) => {
                const active = bookingStatusFilter === statusOption;
                return (
                  <TouchableOpacity
                    key={statusOption}
                    className={`px-3 h-8 rounded-full border mr-2 mb-2 items-center justify-center ${
                      active ? "bg-blue-900 border-blue-900" : "bg-white border-slate-200"
                    }`}
                    onPress={() => setBookingStatusFilter(statusOption)}
                  >
                    <Text className={`text-[11px] font-bold ${active ? "text-white" : "text-slate-600"}`}>
                      {statusOption}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {bookingLoading && (
              <View>
                {[0, 1, 2].map((idx) => (
                  <HotelBookingCardSkeleton key={`hotel-skeleton-${idx}`} />
                ))}
              </View>
            )}

            {!!bookingError && !bookingLoading && (
              <View className="bg-white rounded-xl border border-red-200 p-4">
                <Text className="text-xs text-red-600 font-bold">
                  {String(bookingError?.message || bookingError || "Unable to load bookings")}
                </Text>
              </View>
            )}

            {!bookingLoading && !bookingError && (
              <>
                {filteredBookings.length ? (
                  filteredBookings.map((item, index) => (
                    <BookingCard
                      key={item?._id || item?.bookingId || String(index)}
                      item={item}
                      onViewBooking={(booking) => handleOpenBookingModal(booking, "Hotel")}
                    />
                  ))
                ) : (
                  <View className="py-10 items-center justify-center bg-white rounded-xl border border-slate-200">
                    <Text className="text-sm font-bold text-slate-700">No bookings found</Text>
                    <Text className="text-xs text-slate-500 mt-2 text-center px-4">
                      Status: {bookingStatusFilter} | Page: {page}
                    </Text>
                  </View>
                )}

                {bookingPagination ? (
                  <View className="flex-row items-center justify-between py-3">
                    <Text className="text-xs text-slate-500">
                      Page {bookingPagination?.currentPage || page} / {bookingPagination?.totalPages || 1}
                    </Text>
                    <View className="flex-row">
                      <TouchableOpacity
                        disabled={!bookingPagination?.hasPrevPage}
                        onPress={() => setPage((p) => Math.max(1, p - 1))}
                        className={`px-3 h-10 rounded-xl border items-center justify-center mr-2 ${
                          bookingPagination?.hasPrevPage ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-100"
                        }`}
                      >
                        <Text className={`text-xs font-bold ${bookingPagination?.hasPrevPage ? "text-slate-700" : "text-slate-300"}`}>
                          Previous
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={!bookingPagination?.hasNextPage}
                        onPress={() => setPage((p) => p + 1)}
                        className={`px-3 h-10 rounded-xl border items-center justify-center ${
                          bookingPagination?.hasNextPage ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-100"
                        }`}
                      >
                        <Text className={`text-xs font-bold ${bookingPagination?.hasNextPage ? "text-slate-700" : "text-slate-300"}`}>
                          Next
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ height: 12 }} />
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

const renderCoupons = () => (
    <View>
      {couponsState?.status === "loading" && (
        <View>
          {[0, 1, 2].map((idx) => (
            <CouponCardSkeleton key={`coupon-skeleton-${idx}`} />
          ))}
        </View>
      )}

      {couponsState?.status === "failed" && (
        <Text className="text-xs text-red-600 font-bold mb-3">
          {String(couponsState?.error?.message || couponsState?.error || "Unable to load coupons")}
        </Text>
      )}

      {coupons.map((coupon, index) => {
        const expired = isExpiredCoupon(coupon);
        const code = coupon?.couponCode || `COUPON${index + 1}`;
        return (
          <View
            key={coupon?._id || `${code}-${index}`}
            className={`bg-white rounded-xl border-2 border-dashed border-blue-200 p-4 mb-3 ${expired ? "opacity-50" : ""}`}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-2xl font-black text-slate-900">{code}</Text>
                <Text className="text-sm text-slate-500 mt-1 font-medium">{coupon?.couponName || "Special Offer"}</Text>
              </View>

              {expired ? (
                <View className="bg-slate-100 px-3 py-1.5 rounded">
                  <Text className="text-[10px] font-bold text-slate-400">EXPIRED</Text>
                </View>
              ) : (
                <TouchableOpacity
                  className="w-10 h-10 rounded-lg bg-blue-50 items-center justify-center"
                  onPress={() => onCopyCoupon(code)}
                >
                  <Ionicons name="copy-outline" size={18} color="#3b82f6" />
                </TouchableOpacity>
              )}
            </View>

            <View className="h-[1px] bg-slate-200 my-3" />

            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] text-slate-400">Valid till: {formatLongDate(coupon?.validity)}</Text>
              <Text className="text-sm font-bold text-emerald-600">
                Save {formatCurrencyINR(coupon?.discountPrice)}
              </Text>
            </View>
          </View>
        );
      })}

      {!coupons.length && couponsState?.status !== "loading" && (
        <Text className="text-sm text-slate-500 font-medium text-center py-8">No coupons available</Text>
      )}
    </View>
  );

  const renderComplaints = () => {
    const renderComplaintList = () => {
      if (complaintsState?.status === "loading") {
        return (
          <View>
            {[0, 1, 2].map((idx) => (
              <ComplaintCardSkeleton key={`complaint-skeleton-${idx}`} />
            ))}
          </View>
        );
      }

      if (complaintsState?.status === "failed") {
        return (
          <Text className="text-xs text-red-600 font-bold mb-3">
            {String(complaintsState?.error?.message || complaintsState?.error || "Unable to load complaints")}
          </Text>
        );
      }

      return complaintItems.map((complaint, index) => {
        const status = String(complaint?.status || "In Progress");
        const resolved = status.toLowerCase().includes("resolve");
        const messageCount = toList(complaint?.chats).length;

        return (
          <View
            key={complaint?.id || complaint?._id || `complaint-${index}`}
            className="bg-white rounded-xl border border-slate-200 p-4 mb-3 shadow-sm"
          >
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-3">
                <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
              </View>

              <View className="flex-1 mr-3">
                <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
                  {complaint?.issue || complaint?.title || complaint?.regarding || "Complaint"}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">ID: {complaint?.complaintId || "-"}</Text>
              </View>

              <View className={`px-3 py-1.5 rounded ${resolved ? "bg-emerald-50" : "bg-orange-50"}`}>
                <Text className={`text-[10px] font-bold ${resolved ? "text-emerald-600" : "text-orange-600"}`}>
                  {status}
                </Text>
              </View>
            </View>

            <View className="pt-3 border-t border-slate-100 flex-row items-center justify-between">
              <Text className="text-[11px] text-slate-400">Raised on: {formatLongDate(complaint?.createdAt || complaint?.raisedOn)}</Text>
              <TouchableOpacity
                className="h-8 px-3 rounded-lg bg-indigo-600 items-center justify-center flex-row"
                onPress={() => handleOpenComplaintChat(complaint)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={13} color="#fff" />
                <Text className="text-xs font-bold text-white ml-1.5">Open Chat</Text>
                {!!messageCount && (
                  <View className="ml-2 px-1.5 h-4 rounded-full bg-white/25 items-center justify-center">
                    <Text className="text-[10px] font-black text-white">{messageCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      });
    };

    return (
      <View>
        <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-extrabold text-slate-900">Raise a New Complaint</Text>
              <Text className="text-xs text-slate-500 mt-1">
                Booking issue ho to yahan se direct complaint create karein.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleOpenCreateComplaintModal}
              disabled={!userId || isComplaintCreating}
              className={`h-10 px-4 rounded-xl items-center justify-center ${
                !userId || isComplaintCreating ? "bg-slate-300" : "bg-red-600"
              }`}
            >
              {isComplaintCreating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-xs font-black text-white">Create</Text>
              )}
            </TouchableOpacity>
          </View>
          {!userId && (
            <Text className="text-[11px] text-red-500 mt-2">Login required to create complaint.</Text>
          )}
          {complaintsState?.createStatus === "failed" && (
            <Text className="text-[11px] text-red-500 mt-2">
              {String(complaintsState?.createError?.message || complaintsState?.createError || "Unable to create complaint")}
            </Text>
          )}
        </View>

        {renderComplaintList()}
      </View>
    );
  };

  const renderProfileTab = () => (
    userState?.loading ? (
      <ProfileTabSkeleton />
    ) : (
    <View>
      <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3 shadow-sm">
        <Text className="text-xs font-bold text-slate-400 tracking-wider mb-4">CONTACT INFORMATION</Text>

        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 rounded-lg bg-blue-50 items-center justify-center mr-3">
            <Ionicons name="call-outline" size={18} color="#1d4ed8" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-slate-400 tracking-wide">MOBILE NUMBER</Text>
            <Text className="text-sm font-semibold text-slate-900 mt-0.5">{user?.mobile ? `+91 ${user.mobile}` : "-"}</Text>
          </View>
        </View>

        <View className="h-[1px] bg-slate-100 my-3" />

        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 rounded-lg bg-blue-50 items-center justify-center mr-3">
            <Ionicons name="location-outline" size={18} color="#1d4ed8" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-slate-400 tracking-wide">SAVED ADDRESS</Text>
            <Text className="text-sm font-semibold text-slate-900 mt-0.5">{user?.address || "-"}</Text>
          </View>
        </View>

        <View className="h-[1px] bg-slate-100 my-3" />

        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-lg bg-blue-50 items-center justify-center mr-3">
            <Ionicons name="person-outline" size={18} color="#1d4ed8" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-slate-400 tracking-wide">FULL NAME</Text>
            <Text className="text-sm font-semibold text-slate-900 mt-0.5">{user?.userName || "-"}</Text>
          </View>
        </View>
      </View>

      <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3 shadow-sm">
        <Text className="text-xs font-bold text-slate-400 tracking-wider mb-4">APP SETTINGS</Text>

        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-sm font-medium text-slate-900">Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
            thumbColor={notificationsEnabled ? "#1d4ed8" : "#f1f5f9"}
          />
        </View>

        <View className="h-[1px] bg-slate-100 my-3" />

        <TouchableOpacity>
          <Text className="text-sm font-medium text-red-500">Delete Account</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="bg-red-50 rounded-xl h-12 flex-row items-center justify-center"
        onPress={signOut}
      >
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text className="text-sm font-bold text-red-500 ml-2">Sign Out</Text>
      </TouchableOpacity>
    </View>
    )
  );

  const renderTabContent = () => {
    if (activeTab === "Bookings") return renderBookings();
    if (activeTab === "Coupons") return renderCoupons();
    if (activeTab === "Complaints") return renderComplaints();
    return renderProfileTab();
  };

  const isTourBookingSelected =
    selectedBookingType === "Tour" || Boolean(selectedBooking?.tourId);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["left", "right", "bottom"]}>
      <View className="flex-1">
        <Header
          compact
          showHero={false}
          showBrand={false}
          showBack
          leftTitle="Profile Settings"
          onBackPress={handleProfileHeaderBack}
        />

        {userState?.loading ? (
          <ProfileHeaderSkeleton />
        ) : (
          <View className="px-4 py-2 flex-row items-center justify-between" style={{ marginTop: 20 }}>
            <View className="flex-1 flex-row items-center">
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  className="w-14 h-14 rounded-full bg-slate-200"
                />
              ) : (
                <View className="w-14 h-14 rounded-full bg-slate-200" />
              )}
              <View className="flex-1 ml-3">
                <Text className="text-xl font-black text-slate-900" numberOfLines={1}>
                  {user?.userName || "-"}
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5 font-medium" numberOfLines={1}>
                  {user?.email || "-"}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                  {user?.address || "-"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="w-10 h-10 rounded-full border border-blue-200 bg-blue-50 items-center justify-center"
              onPress={openUpdateModal}
            >
              <Ionicons name="create-outline" size={20} color="#1d4ed8" />
            </TouchableOpacity>
          </View>
        )}

        <View className="border-t border-b border-slate-200 bg-white flex-row px-2">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                className="flex-1 items-center justify-center py-3"
                onPress={() => setActiveTab(tab)}
              >
                <Text className={`text-xs font-bold ${active ? "text-blue-900" : "text-slate-400"}`}>{tab}</Text>
                {active && <View className="absolute bottom-0 w-16 h-0.5 bg-blue-900 rounded-t-full" />}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          className="flex-1 px-3"
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {!!userState?.error && (
            <Text className="text-xs text-red-600 font-bold mb-3">
              {String(userState?.error?.message || userState?.error)}
            </Text>
          )}

          {renderTabContent()}
        </ScrollView>
      </View>

      <TourBookingDetailsModal
        visible={showBookingModal && isTourBookingSelected}
        onClose={handleCloseBookingModal}
        booking={selectedBooking}
      />

      <HotelBookingsDetailModal
        visible={showBookingModal && !isTourBookingSelected}
        onClose={handleCloseBookingModal}
        booking={selectedBooking}
      />

      <Modal
        animationType="slide"
        transparent
        visible={showCreateComplaintModal}
        onRequestClose={handleCloseCreateComplaintModal}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-black/45 justify-end">
            <View className="bg-white rounded-t-3xl px-4 pt-4 pb-5 max-h-[88%]">
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-[18px] font-black text-slate-900">Create Complaint</Text>
                  <Text className="text-[12px] text-slate-500 mt-0.5">Hotel support ticket raise karein</Text>
                </View>
                <TouchableOpacity
                  onPress={handleCloseCreateComplaintModal}
                  className="h-9 w-9 rounded-full bg-slate-100 items-center justify-center"
                  disabled={isComplaintCreating}
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {!!normalizedBookedHotels.length && (
                  <View className="mb-3">
                    <Text className="text-[11px] font-bold text-slate-600 mb-1">Your Booked Hotels</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 4 }}
                    >
                      {normalizedBookedHotels.map((details) => {
                        const active = selectedComplaintBookingKey === details.key;
                        return (
                          <TouchableOpacity
                            key={details.key}
                            onPress={() => handleSelectComplaintBooking(details)}
                            className={`mr-2 px-3 py-2 rounded-xl border min-w-[170px] ${
                              active ? "bg-blue-50 border-blue-500" : "bg-white border-slate-200"
                            }`}
                          >
                            <Text className={`text-[11px] font-black ${active ? "text-blue-700" : "text-slate-700"}`}>
                              {details.bookingId}
                            </Text>
                            <Text className="text-[10px] text-slate-500 mt-0.5" numberOfLines={1}>
                              Hotel ID: {details.hotelId}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <Text className="text-[10px] text-slate-400 mt-1">
                      Booking select karne par Booking ID aur Hotel ID auto-fill ho jayega.
                    </Text>
                  </View>
                )}

                <Text className="text-[11px] font-bold text-slate-600 mb-1">Hotel ID</Text>
                <TextInput
                  value={complaintForm.hotelId}
                  onChangeText={(text) => {
                    setSelectedComplaintBookingKey("");
                    setComplaintForm((prev) => ({ ...prev, hotelId: text }));
                  }}
                  placeholder="67b0f53a7a0a3d4ec1234567"
                  placeholderTextColor="#94a3b8"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900"
                />

                <Text className="text-[11px] font-bold text-slate-600 mt-3 mb-1">Hotel Name (Optional)</Text>
                <TextInput
                  value={complaintForm.hotelName}
                  onChangeText={(text) => {
                    setSelectedComplaintBookingKey("");
                    setComplaintForm((prev) => ({ ...prev, hotelName: text }));
                  }}
                  placeholder="Hotel Blue Star"
                  placeholderTextColor="#94a3b8"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900"
                />

                <Text className="text-[11px] font-bold text-slate-600 mt-3 mb-1">Hotel Email (Optional)</Text>
                <TextInput
                  value={complaintForm.hotelEmail}
                  onChangeText={(text) => {
                    setSelectedComplaintBookingKey("");
                    setComplaintForm((prev) => ({ ...prev, hotelEmail: text }));
                  }}
                  placeholder="support@hotel.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900"
                />

                <Text className="text-[11px] font-bold text-slate-600 mt-3 mb-1">Booking ID (Optional)</Text>
                <TextInput
                  value={complaintForm.bookingId}
                  onChangeText={(text) => {
                    setSelectedComplaintBookingKey("");
                    setComplaintForm((prev) => ({ ...prev, bookingId: text }));
                  }}
                  placeholder="BK-90211"
                  placeholderTextColor="#94a3b8"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900"
                />

                <Text className="text-[11px] font-bold text-slate-600 mt-3 mb-1">Regarding</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {COMPLAINT_REGARDING_OPTIONS.map((option) => {
                    const active = complaintForm.regarding === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => setComplaintForm((prev) => ({ ...prev, regarding: option }))}
                        className={`px-3 py-2 rounded-xl border ${
                          active ? "bg-blue-50 border-blue-500" : "bg-white border-slate-200"
                        }`}
                      >
                        <Text className={`text-[12px] font-bold ${active ? "text-blue-700" : "text-slate-600"}`}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text className="text-[10px] text-slate-400 mt-1">
                  Allowed: Booking / Hotel / Website
                </Text>

                <Text className="text-[11px] font-bold text-slate-600 mt-3 mb-1">Issue</Text>
                <TextInput
                  value={complaintForm.issue}
                  onChangeText={(text) => setComplaintForm((prev) => ({ ...prev, issue: text }))}
                  placeholder="Room was not cleaned on check-in"
                  placeholderTextColor="#94a3b8"
                  multiline
                  textAlignVertical="top"
                  className="h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-900"
                />

                <View className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[11px] font-bold text-slate-600">
                      Attach Images ({complaintImages.length}/3)
                    </Text>
                    <TouchableOpacity
                      onPress={handlePickComplaintImages}
                      className="px-3 h-8 rounded-lg bg-slate-900 items-center justify-center"
                    >
                      <Text className="text-[11px] font-bold text-white">Add</Text>
                    </TouchableOpacity>
                  </View>

                  {!!complaintImages.length && (
                    <View className="mt-2">
                      {complaintImages.map((image, index) => (
                        <View
                          key={image?.uri || `complaint-image-${index}`}
                          className="flex-row items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2 mb-2"
                        >
                          <Text className="flex-1 text-[11px] font-semibold text-slate-700 mr-2" numberOfLines={1}>
                            {image?.name || `Image ${index + 1}`}
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveComplaintImage(image?.uri)}>
                            <Ionicons name="close-circle" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Text className="text-[10px] text-slate-400 mt-1">Images (Optional)</Text>
              </ScrollView>

              <View className="mt-4 flex-row">
                <TouchableOpacity
                  onPress={handleCloseCreateComplaintModal}
                  disabled={isComplaintCreating}
                  className="flex-1 h-11 rounded-xl bg-slate-100 items-center justify-center mr-2"
                >
                  <Text className="text-[13px] font-black text-slate-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateComplaint}
                  disabled={isComplaintCreating || !userId}
                  className={`flex-[1.4] h-11 rounded-xl items-center justify-center ${
                    isComplaintCreating || !userId ? "bg-slate-300" : "bg-red-600"
                  }`}
                >
                  {isComplaintCreating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-[13px] font-black text-white">Submit Complaint</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={showComplaintChatModal}
        onRequestClose={handleCloseComplaintChat}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-black/45 justify-end">
            <View className="bg-white rounded-t-3xl h-[82%] overflow-hidden">
              <View className="px-4 py-3 bg-indigo-700 flex-row items-center justify-between">
                <View>
                  <Text className="text-white text-lg font-black">Complaint Chat</Text>
                  <Text className="text-indigo-100 text-xs mt-0.5">ID: {selectedComplaint?.complaintId || "-"}</Text>
                </View>
                <TouchableOpacity onPress={handleCloseComplaintChat} className="w-8 h-8 rounded-full items-center justify-center bg-white/20">
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={complaintChatScrollRef}
                className="flex-1 bg-slate-50 px-3 pt-3"
                contentContainerStyle={{ paddingBottom: 14 }}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                  if (showComplaintChatModal) {
                    complaintChatScrollRef.current?.scrollToEnd({ animated: true });
                  }
                }}
              >
                {complaintChats.length ? (
                  complaintChats.map((chat, idx) => {
                    const sender = String(chat?.sender || "").toLowerCase();
                    const mine =
                      sender === String(user?.userName || "").toLowerCase() ||
                      sender === String(user?.name || "").toLowerCase() ||
                      sender === String(user?.email || "").toLowerCase() ||
                      sender.includes("you");

                    return (
                      <View key={chat?._id || `${chat?.timestamp || "chat"}-${idx}`} className={`mb-3 ${mine ? "items-end" : "items-start"}`}>
                        <View className={`max-w-[82%] px-3 py-2 rounded-2xl ${mine ? "bg-indigo-600" : "bg-white border border-slate-200"}`}>
                          <Text className={`text-xs font-bold mb-1 ${mine ? "text-indigo-100" : "text-indigo-600"}`}>
                            {mine ? "You" : chat?.sender || "Support Team"}
                          </Text>
                          <Text className={`text-base ${mine ? "text-white" : "text-slate-800"}`}>{chat?.content || "-"}</Text>
                          <Text className={`text-[11px] mt-1 ${mine ? "text-indigo-100" : "text-slate-500"}`}>
                            {formatDateTime(chat?.timestamp)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View className="items-center py-10">
                    <Text className="text-sm text-slate-500 font-medium">No messages yet</Text>
                  </View>
                )}
              </ScrollView>

              <View className="p-3 border-t border-slate-200 bg-white flex-row items-center">
                <TextInput
                  value={chatMessage}
                  onChangeText={setChatMessage}
                  placeholder="Type your message..."
                  className="flex-1 h-11 border border-slate-300 rounded-full px-4 text-slate-900"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  onPress={handleSendComplaintMessage}
                  disabled={complaintsState?.chatStatus === "loading" || !String(chatMessage || "").trim()}
                  className={`ml-2 h-11 px-4 rounded-full items-center justify-center ${
                    complaintsState?.chatStatus === "loading" || !String(chatMessage || "").trim()
                      ? "bg-indigo-300"
                      : "bg-indigo-600"
                  }`}
                >
                  {complaintsState?.chatStatus === "loading" ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-bold">Send</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={showUpdateModal}
        onRequestClose={closeUpdateModal}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-slate-50">
          <View className="flex-1 bg-slate-50">
            <View className="px-4 py-3 border-b border-slate-200 flex-row items-center">
              <TouchableOpacity onPress={closeUpdateModal} className="mr-3">
                <Ionicons name="arrow-back" size={22} color="#0f172a" />
              </TouchableOpacity>
              <Text className="text-[17px] leading-8 font-black text-slate-900">Edit Profile</Text>
            </View>

            <ScrollView
              className="flex-1 px-5 pt-5"
              contentContainerStyle={{ paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="items-center mb-6">
                <View className="relative">
                  {selectedImages[0]?.uri || profileImage ? (
                    <Image
                      source={{
                        uri: selectedImages[0]?.uri || profileImage,
                      }}
                      className="w-24 h-24 rounded-full bg-slate-200"
                    />
                  ) : (
                    <View className="w-24 h-24 rounded-full bg-slate-200" />
                  )}
                  <TouchableOpacity
                    onPress={handlePickImages}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-800 items-center justify-center border-2 border-white"
                  >
                    <Ionicons name="camera-outline" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handlePickImages}>
                  <Text className="text-blue-900 font-bold text-base mt-2">Change Photo</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-[10px] font-bold text-slate-500 tracking-wide mb-2">FULL NAME</Text>
              <View className="h-12 border border-slate-300 rounded-xl bg-slate-50 flex-row items-center px-3 mb-4">
                <Ionicons name="person-outline" size={16} color="#94a3b8" />
                <TextInput
                  value={updateForm.userName}
                  onChangeText={(text) => setUpdateForm((prev) => ({ ...prev, userName: text }))}
                  placeholder="Full name"
                  className="flex-1 ml-2 text-slate-900 text-base"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <Text className="text-[10px] font-bold text-slate-500 tracking-wide mb-2">EMAIL ADDRESS</Text>
              <View className="h-12 border border-slate-300 rounded-xl bg-slate-50 flex-row items-center px-3 mb-4">
                <Ionicons name="mail-outline" size={16} color="#94a3b8" />
                <TextInput
                  value={updateForm.email}
                  onChangeText={(text) => setUpdateForm((prev) => ({ ...prev, email: text }))}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 ml-2 text-slate-900 text-base"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <Text className="text-[10px] font-bold text-slate-500 tracking-wide mb-2">PHONE NUMBER</Text>
              <View className="h-12 border border-slate-300 rounded-xl bg-slate-50 flex-row items-center px-3 mb-4">
                <Ionicons name="phone-portrait-outline" size={16} color="#94a3b8" />
                <TextInput
                  value={updateForm.mobile}
                  onChangeText={(text) =>
                    setUpdateForm((prev) => ({ ...prev, mobile: text.replace(/[^\d]/g, "") }))
                  }
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  className="flex-1 ml-2 text-slate-900 text-base"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <Text className="text-[10px] font-bold text-slate-500 tracking-wide mb-2">ADDRESS</Text>
              <View className="h-12 border border-slate-300 rounded-xl bg-slate-50 flex-row items-center px-3 mb-4">
                <Ionicons name="location-outline" size={16} color="#94a3b8" />
                <TextInput
                  value={updateForm.address}
                  onChangeText={(text) => setUpdateForm((prev) => ({ ...prev, address: text }))}
                  placeholder="Address"
                  className="flex-1 ml-2 text-slate-900 text-base"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <Text className="text-[10px] font-bold text-slate-500 tracking-wide mb-2">PASSWORD</Text>
              <View className="h-12 border border-slate-300 rounded-xl bg-slate-50 flex-row items-center px-3 mb-4">
                <Ionicons name="lock-closed-outline" size={16} color="#94a3b8" />
                <TextInput
                  value={updateForm.password}
                  onChangeText={(text) => setUpdateForm((prev) => ({ ...prev, password: text }))}
                  placeholder="Change password (optional)"
                  secureTextEntry
                  className="flex-1 ml-2 text-slate-900 text-base"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </ScrollView>

            <View className="px-4 py-4 border-t border-slate-200 bg-slate-50">
              <TouchableOpacity
                onPress={handleUpdateProfile}
                disabled={profileUpdateState?.status === "loading"}
                className={`h-12 rounded-xl items-center justify-center ${
                  profileUpdateState?.status === "loading" ? "bg-slate-300" : "bg-blue-900"
                }`}
              >
                {profileUpdateState?.status === "loading" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-lg font-bold">Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;
