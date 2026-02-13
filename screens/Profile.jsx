import React, { useEffect, useMemo, useState } from "react";
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
          <Text className="text-sm font-bold text-slate-800">{item?.checkInDate || "-"}</Text>
        </View>

        <Ionicons name="arrow-forward" size={18} color="#94a3b8" />

        <View style={{ alignItems: "flex-end" }}>
          <Text className="text-[10px] font-bold text-slate-400">CHECK-OUT</Text>
          <Text className="text-sm font-bold text-slate-800">{item?.checkOutDate || "-"}</Text>
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
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

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
  const profileUpdateState = useSelector((state) => state.profileUpdate);

  // bookingSlice should store these keys (adjust if your slice uses different names)
  const bookingState = useSelector((state) => state.booking);
  const filteredBookingsEnvelope = bookingState?.filteredBookings || {};
  const filteredBookings = Array.isArray(filteredBookingsEnvelope?.data)
    ? filteredBookingsEnvelope.data
    : [];
  const bookingLoading = bookingState?.filteredBookingsStatus === "loading";
  const bookingError = bookingState?.filteredBookingsError;
  const bookingPagination = filteredBookingsEnvelope?.pagination || null;

  const user = userState?.data || {};
  const coupons = toList(couponsState?.items);
  const bookingHistory = toList(userState?.bookingData);
  const complaints = toList(userState?.complaints);

  const profileImages = Array.isArray(user?.images) ? user.images.filter(Boolean) : [];
  const profileImage = profileImages[0] || user?.profile?.[0] || null;

  const bookingCount = bookingHistory.length;

  const complaintItems = useMemo(
    () => (complaints.length ? complaints : FALLBACK_COMPLAINTS),
    [complaints]
  );

  const userId = useMemo(
    () => user?.userId || userState?.userId || null,
    [user?.userId, userState?.userId]
  );

  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    dispatch(fetchProfileData());
    dispatch(fetchUserCoupons());
  }, [dispatch]);

  // Reset pagination when booking type/status changes
  useEffect(() => {
    setPage(1);
  }, [bookingType, bookingStatusFilter]);

  // Fetch filtered bookings (Hotel tab only)
  useEffect(() => {
    if (activeTab !== "Bookings") return;
    if (bookingType !== "Hotel") return;
    if (!userId) return;

    const payload = {
      userId,
      page,
      limit,
    };

    if (bookingStatusFilter !== "All") {
      payload.selectedStatus = bookingStatusFilter;
    }

    dispatch(fetchFilteredBooking(payload));
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

  const handleOpenBookingModal = (booking) => {
    if (!booking) return;
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  const handleCloseBookingModal = () => {
    setShowBookingModal(false);
    setSelectedBooking(null);
  };
  const onCopyCoupon = (code) => {
    // Optional: use Clipboard API if you have expo-clipboard
  };

  const renderBookings = () => {
    const isHotel = bookingType === "Hotel";

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

        {!isHotel ? (
          <View className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
            <Text className="text-xs text-slate-500 font-medium text-center">
              {bookingType} bookings are not available yet.
            </Text>
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
              <View className="flex-row items-center justify-center bg-white rounded-xl border border-slate-200 py-8">
                <ActivityIndicator size="small" color="#1d4ed8" />
                <Text className="text-sm text-slate-600 ml-2 font-medium">Loading bookings...</Text>
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
                      onViewBooking={handleOpenBookingModal}
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
        <View className="flex-row items-center mb-3">
          <ActivityIndicator size="small" color="#2563eb" />
          <Text className="text-sm text-slate-600 ml-2 font-medium">Loading coupons...</Text>
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

  const renderComplaints = () =>
    complaintItems.map((complaint, index) => {
      const status = String(complaint?.status || "In Progress");
      const resolved = status.toLowerCase().includes("resolve");

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
                {complaint?.title || "Complaint"}
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
            <Text className="text-[11px] text-slate-400">Raised on: {complaint?.raisedOn || "-"}</Text>
            <TouchableOpacity>
              <Text className="text-xs font-bold text-blue-700">View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });

  const renderProfileTab = () => (
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
  );

  const renderTabContent = () => {
    if (activeTab === "Bookings") return renderBookings();
    if (activeTab === "Coupons") return renderCoupons();
    if (activeTab === "Complaints") return renderComplaints();
    return renderProfileTab();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1">
        <Header
          compact
          showHero={false}
          showBrand={false}
          showBack
          leftTitle="Profile Settings"
          onBackPress={handleProfileHeaderBack}
        />

        <View className="px-4 py-2 flex-row items-center justify-between" style={{ marginTop: 20 }}>
          <View className="flex-1 flex-row items-center">
            <Image
              source={{
                uri:
                  profileImage ||
                  "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=300&auto=format&fit=crop",
              }}
              className="w-14 h-14 rounded-full bg-slate-200"
            />
            <View className="flex-1 ml-3">
              <Text className="text-xl font-black text-slate-900" numberOfLines={1}>
                {user?.userName || "Rahul Sharma"}
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5 font-medium" numberOfLines={1}>
                {user?.email || "rahul.sharma@example.com"}
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

        <View className="px-3 py-2 flex-row justify-between">
          <View className="flex-1 mx-1 bg-blue-50 border border-blue-100 rounded-xl py-3 items-center">
            <Text className="text-2xl font-black text-blue-900">{String(bookingCount).padStart(2, "0")}</Text>
            <Text className="text-[10px] font-bold text-blue-700 tracking-wide mt-1">BOOKINGS</Text>
          </View>

          <View className="flex-1 mx-1 bg-emerald-50 border border-emerald-100 rounded-xl py-3 items-center">
            <Text className="text-2xl font-black text-emerald-900">{String(coupons.length).padStart(2, "0")}</Text>
            <Text className="text-[10px] font-bold text-emerald-700 tracking-wide mt-1">COUPONS</Text>
          </View>

          <View className="flex-1 mx-1 bg-purple-50 border border-purple-100 rounded-xl py-3 items-center">
            <Text className="text-2xl font-black text-purple-900">{String(complaintItems.length).padStart(2, "0")}</Text>
            <Text className="text-[10px] font-bold text-purple-700 tracking-wide mt-1">COMPLAINTS</Text>
          </View>
        </View>

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
          {userState?.loading && (
            <View className="flex-row items-center mb-3">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-sm text-slate-600 ml-2 font-medium">Loading profile...</Text>
            </View>
          )}

          {!!userState?.error && (
            <Text className="text-xs text-red-600 font-bold mb-3">
              {String(userState?.error?.message || userState?.error)}
            </Text>
          )}

          {renderTabContent()}
        </ScrollView>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={showBookingModal}
        onRequestClose={handleCloseBookingModal}
      >
        <SafeAreaView className="flex-1 bg-black/35 items-center justify-center px-2">
          <View className="w-full max-w-[370px] bg-white rounded-2xl border border-slate-200 shadow-lg p-0 overflow-hidden">
            {/* Header */}
            <View className="px-5 pt-5 pb-2">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-2">
                  <Text className="text-[22px] leading-7 font-extrabold text-slate-900" numberOfLines={2}>
                    {selectedBooking?.hotelDetails?.hotelName || "Hotel"}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="location-outline" size={12} color="#64748b" />
                    <Text className="text-[11px] text-slate-500 ml-1">
                      {selectedBooking?.destination || selectedBooking?.hotelDetails?.destination || "-"}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View className={`px-2 py-0.5 rounded border ${statusPillClasses(selectedBooking?.bookingStatus)}`}
                    style={{ minWidth: 70, alignItems: 'center' }}>
                    <Text className="text-[10px] font-bold uppercase tracking-wider">
                      {selectedBooking?.bookingStatus || "-"}
                    </Text>
                  </View>
                  <Text className="text-[10px] text-slate-400 mt-1">
                    ID: #{String(selectedBooking?.bookingId || "-").slice(-6)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Dates */}
            <View className="flex-row items-center justify-between bg-slate-50 border-y border-slate-100 px-5 py-3">
              <View>
                <Text className="text-[9px] font-bold text-slate-400">CHECK-IN</Text>
                <Text className="text-lg font-extrabold text-slate-900 mt-0.5">{selectedBooking?.checkInDate || "-"}</Text>
              </View>
              <View>
                <Text className="text-[10px] font-semibold text-slate-400">1 Night</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text className="text-[9px] font-bold text-slate-400">CHECK-OUT</Text>
                <Text className="text-lg font-extrabold text-slate-900 mt-0.5">{selectedBooking?.checkOutDate || "-"}</Text>
              </View>
            </View>

            {/* Guest & Room */}
            <View className="flex-row px-5 pt-3 pb-1">
              <View className="flex-1 mr-2">
                <Text className="text-[9px] font-bold text-slate-400">GUEST NAME</Text>
                <Text className="text-[13px] font-bold text-slate-800 mt-0.5" numberOfLines={1}>
                  {selectedBooking?.guestDetails?.fullName || selectedBooking?.user?.name || "-"}
                </Text>
              </View>
              <View className="flex-1" style={{ alignItems: "flex-end" }}>
                <Text className="text-[9px] font-bold text-slate-400">ROOM TYPE</Text>
                <Text className="text-[13px] font-bold text-slate-800 mt-0.5" numberOfLines={1}>
                  {selectedBooking?.roomDetails?.[0]?.type || "-"}
                  <Text className="text-slate-400 font-semibold"> ({toNumber(selectedBooking?.guests)} Guests)</Text>
                </Text>
              </View>
            </View>

            {/* Food Orders */}
            {!!toList(selectedBooking?.foodDetails).length && (
              <View className="px-5 pt-2 pb-1">
                <Text className="text-[9px] font-bold text-orange-500 tracking-wider">FOOD ORDERS</Text>
                {toList(selectedBooking?.foodDetails).map((food, index) => (
                  <View key={`${food?._id || food?.foodId || index}`} className="flex-row items-center justify-between mt-1.5">
                    <Text className="text-[12px] text-slate-700">
                      {food?.name || "Item"}
                      <Text className="text-slate-400"> {food?.quantity ? `x${food.quantity}` : ""}</Text>
                    </Text>
                    <Text className="text-[12px] font-semibold text-slate-700">
                      {formatCurrencyINR(toNumber(food?.price) * toNumber(food?.quantity || 1))}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Cost Breakdown */}
            <View className="bg-slate-50 border-t border-slate-100 px-5 pt-3 pb-2 mt-1">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[13px] text-slate-500">Room Base Price</Text>
                <Text className="text-[13px] text-slate-500">{formatCurrencyINR(calculateBookingCosts(selectedBooking).roomBase)}</Text>
              </View>
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[13px] text-slate-500">Food & Beverages</Text>
                <Text className="text-[13px] text-slate-500">{formatCurrencyINR(calculateBookingCosts(selectedBooking).foodTotal)}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-slate-500">GST & Taxes (12%)</Text>
                <Text className="text-[13px] text-slate-500">{formatCurrencyINR(calculateBookingCosts(selectedBooking).gst)}</Text>
              </View>

              <View className="h-px bg-slate-200 my-2" />

              <View className="flex-row items-center justify-between">
                <Text className="text-[15px] font-extrabold text-slate-900">Total Paid</Text>
                <Text className="text-[28px] leading-8 font-black text-slate-900">
                  {formatCurrencyINR(calculateBookingCosts(selectedBooking).totalPaid).replace("₹", "₹")}
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={handleCloseBookingModal}
              className="mx-5 my-4 h-10 rounded-lg bg-slate-900 items-center justify-center"
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-base">Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
              <Text className="text-[29px] leading-8 font-black text-slate-900">Edit Profile</Text>
            </View>

            <ScrollView
              className="flex-1 px-5 pt-5"
              contentContainerStyle={{ paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="items-center mb-6">
                <View className="relative">
                  <Image
                    source={{
                      uri:
                        selectedImages[0]?.uri ||
                        profileImage ||
                        "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=300&auto=format&fit=crop",
                    }}
                    className="w-24 h-24 rounded-full bg-slate-200"
                  />
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
