import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { LinearGradient } from "expo-linear-gradient";
import {
  fetchTourById,
  resetSelectedTour,
  tourBooking,
} from "../store/slices/tourSlice";
import TourDetailsSkeleton from "../components/skeleton/TourDetailsSkeleton";
import { useAppModal } from "../contexts/AppModalContext";
// --- Helper Functions ---
const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatValue = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

const formatINR = (value) => {
  const amount = toNumber(value);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹ ${amount}`;
  }
};

const splitValues = (value) => {
  if (Array.isArray(value))
    return value.map((x) => String(x || "").trim()).filter(Boolean);
  return String(value || "")
    .split(/[|,]/)
    .map((x) => x.trim())
    .filter(Boolean);
};

const formatDateLabel = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatLongText = (value, fallback = "") => {
  if (!value) return fallback;
  return String(value).trim();
};

const normalizeBool = (value) => {
  if (typeof value === "boolean") return value;
  const v = String(value || "").trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
};

const humanizeKey = (key) =>
  String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const COLUMN_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const parseSeaterType = (value) => {
  const match = String(value || "").match(/(\d+)\s*[*xX]\s*(\d+)/);
  if (!match) return null;
  return {
    left: toNumber(match[1]),
    right: toNumber(match[2]),
  };
};

const normalizePatternByColumns = (left, right, fallbackColumnsCount) => {
  if (fallbackColumnsCount <= 0) {
    return { left, right, aisle: right > 0 };
  }

  let nextLeft = Math.max(0, left);
  let nextRight = Math.max(0, right);
  const total = nextLeft + nextRight;

  if (total > fallbackColumnsCount) {
    if (nextLeft >= fallbackColumnsCount) {
      nextLeft = fallbackColumnsCount;
      nextRight = 0;
    } else {
      nextRight = Math.max(0, fallbackColumnsCount - nextLeft);
    }
  } else if (total < fallbackColumnsCount) {
    nextRight += fallbackColumnsCount - total;
  }

  return { left: nextLeft, right: nextRight, aisle: nextRight > 0 };
};

const resolveSeatPattern = (vehicle, fallbackColumnsCount = 0) => {
  const config = vehicle?.seatConfig || {};
  const cfgLeft = toNumber(config?.left);
  const cfgRight = toNumber(config?.right);
  const cfgAisle = config?.aisle !== false;

  if (cfgLeft > 0 || cfgRight > 0) {
    const left = cfgLeft > 0 ? cfgLeft : Math.max(1, fallbackColumnsCount - cfgRight);
    const right = cfgRight > 0 ? cfgRight : Math.max(0, fallbackColumnsCount - left);
    const normalized = normalizePatternByColumns(left, right, fallbackColumnsCount);
    return { ...normalized, aisle: cfgAisle && normalized.right > 0 };
  }

  const parsed = parseSeaterType(vehicle?.seaterType);
  if (parsed && (parsed.left > 0 || parsed.right > 0)) {
    const normalized = normalizePatternByColumns(
      Math.max(parsed.left, 1),
      Math.max(parsed.right, 0),
      fallbackColumnsCount
    );
    return normalized;
  }

  if (fallbackColumnsCount <= 0) return { left: 2, right: 1, aisle: true };
  if (fallbackColumnsCount <= 2) {
    return { left: fallbackColumnsCount, right: 0, aisle: false };
  }

  const left = Math.ceil(fallbackColumnsCount / 2);
  const right = Math.max(0, fallbackColumnsCount - left);
  return { left, right, aisle: right > 0 };
};

const buildSeatDeckModel = (allSeatLabels, vehicle) => {
  const rowsMap = {};
  const detectedColumns = new Set();

  allSeatLabels.forEach((seat) => {
    const match = String(seat).match(/^(\d+)([A-Za-z]+)$/);
    if (!match) return;
    const row = match[1];
    const col = String(match[2]).toUpperCase();
    if (!rowsMap[row]) rowsMap[row] = {};
    rowsMap[row][col] = seat;
    detectedColumns.add(col);
  });

  const orderedRows = Object.keys(rowsMap).sort((a, b) => Number(a) - Number(b));
  const cols = Array.from(detectedColumns).sort((a, b) => a.localeCompare(b));
  const pattern = resolveSeatPattern(vehicle, cols.length);
  const totalNeeded = Math.max(cols.length, pattern.left + (pattern.aisle ? pattern.right : 0));

  const enrichedCols = [...cols];
  for (const letter of COLUMN_LETTERS) {
    if (enrichedCols.length >= totalNeeded) break;
    if (!enrichedCols.includes(letter)) enrichedCols.push(letter);
  }

  const orderedColumns = enrichedCols.sort((a, b) => a.localeCompare(b));
  let leftColumns = orderedColumns.slice(0, pattern.left);
  let rightColumns = pattern.aisle
    ? orderedColumns.slice(pattern.left, pattern.left + pattern.right)
    : [];

  if (!leftColumns.length && orderedColumns.length) {
    leftColumns = orderedColumns.slice(0, Math.ceil(orderedColumns.length / 2));
  }
  if (pattern.aisle && !rightColumns.length && orderedColumns.length > leftColumns.length) {
    rightColumns = orderedColumns.slice(leftColumns.length);
  }

  const rows = orderedRows.map((row) => ({
    row,
    leftSeats: leftColumns.map((col) => rowsMap[row]?.[col] || null),
    rightSeats: rightColumns.map((col) => rowsMap[row]?.[col] || null),
  }));

  return {
    rows,
    leftColumns,
    rightColumns,
    hasAisle: Boolean(pattern.aisle && rightColumns.length > 0),
  };
};

const extractVehicleSeats = (vehicle) => {
  if (!vehicle) return [];
  const direct = Array.isArray(vehicle.seats) ? vehicle.seats : null;

  if (direct?.length) {
    return direct
      .map((seat) => {
        if (typeof seat === "string")
          return { seatNumber: seat, isBooked: false };
        return {
          seatNumber: String(
            seat?.seatNumber || seat?.number || seat?.label || "",
          ),
          isBooked: Boolean(seat?.isBooked),
        };
      })
      .filter((x) => x.seatNumber);
  }

  const seatLayout = Array.isArray(vehicle?.seatLayout) ? vehicle.seatLayout : [];
  if (seatLayout.length) {
    return seatLayout
      .map((seat) => ({ seatNumber: String(seat || "").trim(), isBooked: false }))
      .filter((x) => x.seatNumber);
  }

  const totalSeats = Math.max(
    toNumber(vehicle.totalSeats),
    toNumber(vehicle.capacity),
    toNumber(vehicle.numberOfSeats),
    0,
  );
  if (!totalSeats) return [];

  const pattern = resolveSeatPattern(vehicle, 0);
  const totalCols = Math.max(1, pattern.left + (pattern.aisle ? pattern.right : 0));
  const columns = COLUMN_LETTERS.slice(0, totalCols);
  const generated = [];
  let count = 0;
  let row = 1;
  while (count < totalSeats) {
    for (let c = 0; c < columns.length && count < totalSeats; c += 1) {
      generated.push({ seatNumber: `${row}${columns[c]}`, isBooked: false });
      count += 1;
    }
    row += 1;
  }
  return generated;
};

const seatSort = (a, b) => {
  const matchA = String(a || "").match(/^(\d+)([A-Za-z]+)$/);
  const matchB = String(b || "").match(/^(\d+)([A-Za-z]+)$/);
  if (!matchA || !matchB) return String(a).localeCompare(String(b));
  const rowDiff = Number(matchA[1]) - Number(matchB[1]);
  if (rowDiff !== 0) return rowDiff;
  return String(matchA[2]).localeCompare(String(matchB[2]));
};

// --- Components ---

const StepIndicator = ({ current }) => {
  const steps = [
    { id: 1, label: "Select Seats" },
    { id: 2, label: "Details" },
    { id: 3, label: "Payment" },
  ];

  return (
    <View className="bg-white px-6 py-4 border-b border-gray-100 z-10">
      <View className="flex-row items-center justify-between relative">
        {/* Connector Lines Background */}
        <View className="absolute top-[14px] left-4 right-4 h-[2px] bg-gray-100 -z-10 flex-row">
            <View className={`flex-1 h-full ${current >= 2 ? 'bg-blue-600' : 'bg-transparent'}`} />
            <View className={`flex-1 h-full ${current >= 3 ? 'bg-blue-600' : 'bg-transparent'}`} />
        </View>

        {steps.map((step, index) => {
          const active = current >= step.id;
          const currentStep = current === step.id;
          return (
            <View key={step.id} className="items-center">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                  active
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white border-gray-200"
                } ${currentStep ? "shadow-md shadow-blue-200" : ""}`}
              >
                {active && !currentStep && step.id < 3 ? (
                   <Ionicons name="checkmark" size={16} color="white" />
                ) : (
                   <Text className={`text-[12px] font-bold ${active ? "text-white" : "text-gray-400"}`}>
                     {step.id}
                   </Text>
                )}
              </View>
              <Text
                className={`text-[10px] mt-1.5 font-semibold uppercase tracking-wide ${
                  active ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const SeatButton = ({ seat, selected, booked, onPress }) => {
  return (
    <TouchableOpacity
      disabled={booked}
      onPress={onPress}
      activeOpacity={0.8}
      className={`w-11 h-10 rounded-lg border items-center justify-center shadow-sm ${
        booked
          ? "bg-gray-100 border-gray-200"
          : selected
            ? "bg-blue-600 border-blue-600 shadow-blue-200"
            : "bg-white border-gray-200"
      }`}
    >
      <Text
        className={`text-[13px] font-bold ${
          booked ? "text-gray-300" : selected ? "text-white" : "text-gray-700"
        }`}
      >
        {seat}
      </Text>
    </TouchableOpacity>
  );
};

export default function TourDetails({ navigation, route }) {
  const dispatch = useDispatch();
  const { showError, showSuccess } = useAppModal();
  const {
    selectedTour,
    selectedTourStatus,
    selectedTourError,
    tourBookingStatus,
  } = useSelector((state) => state.tour);

  const tourId = route?.params?.tourId || route?.params?.id || null;

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [mobileNumber, setMobileNumber] = useState("");
  const [activeSeatTab, setActiveSeatTab] = useState("");
  const [passengerForm, setPassengerForm] = useState({});
  const [payType, setPayType] = useState("advance");
  const [showAllDays, setShowAllDays] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState("overview");
  const [showFullOverview, setShowFullOverview] = useState(false);

  useEffect(() => {
    if (tourId) {
      dispatch(fetchTourById(tourId));
    }
    return () => {
      dispatch(resetSelectedTour());
    };
  }, [dispatch, tourId]);

  const tour = selectedTour || {};
  const vehicles = Array.isArray(tour?.vehicles) ? tour.vehicles : [];

  useEffect(() => {
    if (!vehicles.length) {
      setSelectedVehicleId(null);
      return;
    }
    if (
      !selectedVehicleId ||
      !vehicles.some((x) => String(x?._id) === String(selectedVehicleId))
    ) {
      setSelectedVehicleId(String(vehicles[0]?._id || ""));
    }
  }, [vehicles, selectedVehicleId]);

  const selectedVehicle = useMemo(
    () =>
      vehicles.find((x) => String(x?._id) === String(selectedVehicleId)) ||
      vehicles[0] ||
      null,
    [vehicles, selectedVehicleId],
  );

  const vehiclePrice = toNumber(selectedVehicle?.pricePerSeat);
  const baseTourPrice = toNumber(tour?.price);
  const defaultSeatPrice = vehiclePrice > 0 ? vehiclePrice : baseTourPrice;
  const bookedSeats = useMemo(
    () =>
      (Array.isArray(selectedVehicle?.bookedSeats)
        ? selectedVehicle.bookedSeats
        : []
      )
        .map((x) => String(x))
        .filter(Boolean),
    [selectedVehicle],
  );
  const seatsMaster = useMemo(
    () => extractVehicleSeats(selectedVehicle),
    [selectedVehicle],
  );
  const allSeatLabels = useMemo(
    () =>
      seatsMaster
        .map((x) => String(x.seatNumber))
        .filter(Boolean)
        .sort(seatSort),
    [seatsMaster],
  );

  const seatDeck = useMemo(
    () => buildSeatDeckModel(allSeatLabels, selectedVehicle),
    [allSeatLabels, selectedVehicle],
  );
  const seatLayoutLabel = useMemo(() => {
    const effective = seatDeck.hasAisle
      ? `${seatDeck.leftColumns.length}*${seatDeck.rightColumns.length}`
      : `${seatDeck.leftColumns.length}`;

    const configured = parseSeaterType(selectedVehicle?.seaterType);
    if (
      configured &&
      configured.left === seatDeck.leftColumns.length &&
      configured.right === seatDeck.rightColumns.length
    ) {
      return `${configured.left}*${configured.right}`;
    }

    return effective;
  }, [seatDeck, selectedVehicle]);
  const totalSeatCount = allSeatLabels.length || toNumber(selectedVehicle?.totalSeats);

  const places = splitValues(tour?.visitngPlaces || tour?.visitingPlaces).join(
    ", ",
  );
  const rating = toNumber(tour?.starRating) || 4;
  const days = toNumber(tour?.days);
  const nights = toNumber(tour?.nights);
  const fromDate = formatValue(tour?.from || tour?.tourStartDate, "");
  const toDate = formatValue(tour?.to, "");
  const startDateLabel = formatDateLabel(fromDate || tour?.tourStartDate);
  const endDateLabel = formatDateLabel(toDate);
  const inclusion = splitValues(tour?.inclusion);
  const exclusion = splitValues(tour?.exclusion);
  const amenities = splitValues(tour?.amenities);
  const overview = formatLongText(tour?.overview);
  const itinerary = Array.isArray(tour?.dayWise) ? tour.dayWise : [];
  const locationLabel = [tour?.city, tour?.state].filter(Boolean).join(", ");
  const isCustomizable = normalizeBool(tour?.isCustomizable);
  const hasVehicleService = vehicles.length > 0 && allSeatLabels.length > 0;
  const hasLongOverview = overview.length > 240;
  const termsEntries = useMemo(() => {
    if (!tour?.termsAndConditions || typeof tour.termsAndConditions !== "object") {
      return [];
    }
    return Object.entries(tour.termsAndConditions)
      .map(([key, value]) => ({
        key,
        label: humanizeKey(key),
        value: formatLongText(value),
      }))
      .filter((item) => !!item.value);
  }, [tour?.termsAndConditions]);

  // Itinerary logic for show more/less
  const visibleItinerary = showAllDays ? itinerary : itinerary.slice(0, 4);

  useEffect(() => {
    setShowAllDays(false);
    setShowFullOverview(false);
    setActiveInfoTab("overview");
  }, [tourId]);

  const seatTotal = selectedSeats.length * defaultSeatPrice;
  const packagePrice = baseTourPrice || defaultSeatPrice;
  const totalAmount = Math.max(packagePrice + seatTotal, defaultSeatPrice);
  const advanceAmount = Math.round(totalAmount * 0.2);
  const payableAmount = payType === "full" ? totalAmount : advanceAmount;

  // Initialize form when seats change
  useEffect(() => {
    if (!selectedSeats.length) {
      setPassengerForm({});
      setActiveSeatTab("");
      return;
    }
    setPassengerForm((prev) => {
      const next = { ...prev };
      selectedSeats.forEach((seat) => {
        if (!next[seat]) {
          next[seat] = {
            type: "Adult",
            name: "",
            age: "",
            dob: "", 
            gender: "Male",
          };
        }
      });
      Object.keys(next).forEach((seat) => {
        if (!selectedSeats.includes(seat)) delete next[seat];
      });
      return next;
    });
    if (!activeSeatTab || !selectedSeats.includes(activeSeatTab)) {
      setActiveSeatTab(selectedSeats[0]);
    }
  }, [selectedSeats]);

  const toggleSeat = (seat) => {
    if (bookedSeats.includes(seat)) return;
    setSelectedSeats((prev) => {
      if (prev.includes(seat)) return prev.filter((x) => x !== seat);
      return [...prev, seat].sort(seatSort);
    });
  };

  const openBooking = () => {
    if (!selectedVehicle?._id || !allSeatLabels.length) {
      showError(
        "No seats available",
        "No seats available for this tour right now.",
      );
      return;
    }
    setBookingOpen(true);
    setBookingStep(1);
  };

  const closeBooking = () => {
    if (tourBookingStatus === "loading") return;
    setBookingOpen(false);
    setBookingStep(1);
  };

  const validatePassengerDetails = () => {
    if (!selectedSeats.length) return "Please select at least one seat.";
    if (!mobileNumber || mobileNumber.replace(/\D/g, "").length < 10) {
      return "Please enter a valid 10-digit mobile number.";
    }
    for (const seat of selectedSeats) {
      const data = passengerForm?.[seat];
      if (!data?.name?.trim())
        return `Passenger name missing for seat ${seat}.`;
      
      // Validation Logic
      if (data?.type === "Adult") {
         if (!toNumber(data?.age)) return `Passenger age missing for seat ${seat}.`;
      } else {
         if (!data?.dob?.trim() || data.dob.length < 8) return `Please enter valid Date of Birth (DD/MM/YYYY) for Child in seat ${seat}.`;
      }
    }
    return null;
  };

  const submitBooking = async () => {
    if (!selectedVehicle?._id) {
      showError("Error", "Vehicle not selected");
      return;
    }
    const detailsError = validatePassengerDetails();
    if (detailsError) {
      showError("Incomplete Details", detailsError);
      return;
    }

    const passengers = selectedSeats.map((seat) => {
      const data = passengerForm?.[seat] || {};
      const isChild = data.type === "Child";
      return {
        seatNumber: seat,
        type: data.type || "Adult",
        name: formatValue(data.name, ""),
        age: isChild ? 0 : toNumber(data.age), 
        dob: isChild ? data.dob : null,        
        gender: formatValue(data.gender, "Male"),
        mobile: mobileNumber,
      };
    });

    const adults = passengers.filter(
      (x) => String(x.type).toLowerCase() === "adult",
    ).length;
    const children = passengers.filter(
      (x) => String(x.type).toLowerCase() === "child",
    ).length;

    const payload = {
      tourId: tour?._id || tourId,
      vehicleId: selectedVehicle?._id,
      seats: selectedSeats,
      numberOfAdults: adults,
      numberOfChildren: children,
      passengers,
      from: fromDate || tour?.tourStartDate,
      to: toDate,
      tourStartDate: fromDate || tour?.tourStartDate,
      bookingSource: "App",
      tax: 0,
      discount: 0,
      payment: {
        method: "online",
        amount: payableAmount,
        totalAmount,
        payType,
        status: "pending",
      },
    };

    try {
      const res = await dispatch(tourBooking(payload)).unwrap();
      const bookingId =
        res?.data?.bookingId ||
        res?.data?._id ||
        res?.data?.data?.bookingId ||
        null;
      showSuccess(
        "Success",
        bookingId
          ? `Booking confirmed!\nID: ${bookingId}`
          : "Booking confirmed successfully!",
        { onPrimary: () => {
            setBookingOpen(false);
            setBookingStep(1);
            setSelectedSeats([]);
            setPassengerForm({});
            setMobileNumber("");
            navigation.goBack();
        }}
      );
    } catch (err) {
      showError(
        "Booking Failed",
        String(err?.message || "Unable to create booking"),
      );
    }
  };

  const isTourLoading = selectedTourStatus === "loading" && !tour?._id;
  const isTourFailed = selectedTourStatus === "failed" && !tour?._id;

  if (!tourId) return null;

  if (isTourLoading) {
    return <TourDetailsSkeleton onBack={() => navigation.goBack()} />;
  }

  if (isTourFailed) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text className="text-gray-900 font-bold text-lg mt-4 text-center">Something went wrong</Text>
        <Text className="text-gray-500 text-sm mt-2 text-center mb-6">{String(selectedTourError?.message || "Unable to load details")}</Text>
        <TouchableOpacity onPress={() => dispatch(fetchTourById(tourId))} className="bg-blue-600 px-6 py-3 rounded-full">
            <Text className="text-white font-bold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 relative">
        <ScrollView
          className="flex-1 bg-gray-50"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
            {/* Hero Image Section */}
            <View className="h-[350px] relative w-full">
                <Image 
                    source={{ uri: tour?.images?.[0] || 'https://via.placeholder.com/400' }} 
                    className="w-full h-full"
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.85)']}
                    className="absolute inset-0"
                />

                {/* Hero Content - Compact & Modern */}
                <View className="absolute bottom-0 left-0 right-0 p-6 pb-12">
                    <View className="flex-row items-center mb-3">
                        <View className="bg-blue-600/90 backdrop-blur-md px-3 py-1 rounded-full mr-2 shadow-sm border border-blue-500/30">
                            <Text className="text-white text-[10px] font-extrabold uppercase tracking-widest">{nights}N / {days}D</Text>
                        </View>
                        <View className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-full flex-row items-center border border-white/10">
                            <Ionicons name="star" size={12} color="#FBBF24" />
                            <Text className="text-white text-[10px] font-bold ml-1.5">{rating.toFixed(1)}</Text>
                        </View>
                    </View>
                    <Text 
                        className="text-white text-2xl font-bold leading-tight shadow-sm mb-2 pr-4" 
                        numberOfLines={2}
                    >
                        {places || "Tour Details"}
                    </Text>
                    <View className="flex-row items-center opacity-80">
                        <Ionicons name="location-sharp" size={14} color="white" />
                        <Text className="text-white text-xs ml-1 font-medium tracking-wide">{locationLabel}</Text>
                    </View>
                </View>
            </View>

            {/* Content Container - Compact Layout */}
            <View className="-mt-8 bg-gray-50 rounded-t-[32px] pt-6 px-5 min-h-screen shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                
                {/* Agency Card - Compact Row */}
                <View className="flex-row items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
                    <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mr-3 border border-blue-100">
                        <Ionicons name="business" size={22} color="#2563EB" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-bold text-gray-900 mb-0.5" numberOfLines={1}>
                            {formatValue(tour?.travelAgencyName)}
                        </Text>
                        <Text className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                            Verified Partner
                        </Text>
                    </View>
                    <TouchableOpacity className="w-9 h-9 bg-gray-50 rounded-full items-center justify-center border border-gray-200 ml-2">
                        <Ionicons name="call-outline" size={16} color="#4B5563" />
                    </TouchableOpacity>
                </View>

                <View className="flex-row flex-wrap mb-6">
                    <View className="bg-white border border-gray-200 rounded-xl px-3 py-2 mr-2 mb-2 flex-row items-center">
                        <Ionicons name="construct-outline" size={13} color="#374151" />
                        <Text className="text-[11px] font-semibold text-gray-700 ml-1.5">
                            Customizable: {isCustomizable === null ? "-" : isCustomizable ? "Yes" : "No"}
                        </Text>
                    </View>
                </View>

                {/* Details Tabs */}
                <View className="bg-white rounded-2xl border border-gray-200 p-1 mb-6 flex-row">
                    {[
                      { id: "overview", label: "Overview & Inclusions" },
                      { id: "itinerary", label: "Itinerary" },
                      { id: "policies", label: "Policies" },
                    ].map((tab) => {
                      const isActive = activeInfoTab === tab.id;
                      return (
                        <TouchableOpacity
                          key={tab.id}
                          onPress={() => setActiveInfoTab(tab.id)}
                          className={`flex-1 py-2.5 rounded-xl items-center justify-center ${
                            isActive ? "bg-blue-600" : "bg-transparent"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              isActive ? "text-white" : "text-gray-600"
                            }`}
                            numberOfLines={1}
                          >
                            {tab.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>

                {activeInfoTab === "overview" && (
                  <View className="mb-28">
                    {!!overview && (
                      <View className="mb-6">
                        <View className="flex-row items-center mb-3">
                          <Ionicons name="document-text-outline" size={16} color="#1F2937" />
                          <Text className="text-gray-900 text-sm font-bold ml-2">Overview</Text>
                        </View>
                        <View className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                          <Text
                            className="text-gray-500 text-xs leading-5"
                            numberOfLines={showFullOverview ? undefined : 4}
                          >
                            {overview}
                          </Text>
                          {hasLongOverview && (
                            <TouchableOpacity
                              onPress={() => setShowFullOverview((prev) => !prev)}
                              className="mt-3 self-start bg-blue-50 px-3 py-1.5 rounded-lg"
                            >
                              <Text className="text-[11px] font-bold text-blue-700">
                                {showFullOverview ? "See Less" : "See More"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}

                    <View className="flex-row gap-3 mb-6">
                      <View className="flex-1 bg-green-50/60 p-4 rounded-2xl border border-green-100">
                        <Text className="text-green-800 font-bold text-xs mb-2 uppercase tracking-wide">
                          Inclusions
                        </Text>
                        {!!inclusion.length ? (
                          inclusion.map((item, idx) => (
                            <View key={idx} className="flex-row items-start mb-1.5">
                              <Text className="text-green-600 text-[10px] mr-1">•</Text>
                              <Text className="text-green-700 text-[10px] flex-1">{item}</Text>
                            </View>
                          ))
                        ) : (
                          <Text className="text-green-700 text-[10px]">No inclusions available.</Text>
                        )}
                      </View>
                      <View className="flex-1 bg-red-50/60 p-4 rounded-2xl border border-red-100">
                        <Text className="text-red-800 font-bold text-xs mb-2 uppercase tracking-wide">
                          Exclusions
                        </Text>
                        {!!exclusion.length ? (
                          exclusion.map((item, idx) => (
                            <View key={idx} className="flex-row items-start mb-1.5">
                              <Text className="text-red-600 text-[10px] mr-1">•</Text>
                              <Text className="text-red-700 text-[10px] flex-1">{item}</Text>
                            </View>
                          ))
                        ) : (
                          <Text className="text-red-700 text-[10px]">No exclusions available.</Text>
                        )}
                      </View>
                    </View>

                    <View>
                      <View className="flex-row items-center mb-3">
                        <Ionicons name="sparkles-outline" size={16} color="#1F2937" />
                        <Text className="text-gray-900 text-sm font-bold ml-2">Amenities</Text>
                      </View>
                      {!!amenities.length ? (
                        <View className="flex-row flex-wrap">
                          {amenities.map((item, i) => (
                            <View
                              key={`${item}-${i}`}
                              className="bg-white px-3 py-2 rounded-xl border border-gray-200 mr-2 mb-2 flex-row items-center"
                            >
                              <Ionicons name="checkmark-circle" size={14} color="#2563EB" />
                              <Text className="text-gray-600 font-medium text-[11px] ml-1.5">{item}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View className="bg-white border border-gray-100 rounded-2xl p-4">
                          <Text className="text-gray-500 text-xs">No amenities listed.</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {activeInfoTab === "itinerary" && (
                  <View className="mb-28">
                    <View className="flex-row items-center justify-between mb-4">
                      <View className="flex-row items-center">
                        <Ionicons name="map-outline" size={16} color="#1F2937" />
                        <Text className="text-gray-900 text-sm font-bold ml-2">Itinerary</Text>
                      </View>
                      <View className="bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                        <Text className="text-[10px] font-bold text-gray-500">{days} Days</Text>
                      </View>
                    </View>

                    {!!itinerary.length ? (
                      <>
                        <View className="pl-2">
                          {visibleItinerary.map((day, i) => (
                            <View key={day?._id || i} className="flex-row mb-0 relative">
                              <View className="items-center mr-4 w-6">
                                <View className="w-2.5 h-2.5 rounded-full bg-blue-600 z-10 ring-4 ring-white" />
                                {i !== visibleItinerary.length - 1 && (
                                  <View className="w-[1px] bg-gray-200 flex-1 my-1" />
                                )}
                              </View>
                              <View className="flex-1 pb-6">
                                <Text className="text-gray-900 font-bold text-sm mb-1">
                                  Day {toNumber(day?.day) || i + 1}
                                </Text>
                                <Text className="text-gray-500 text-xs leading-5" numberOfLines={2}>
                                  {formatValue(day?.description || day?.desc)}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>

                        {itinerary.length > 4 && (
                          <TouchableOpacity
                            onPress={() => setShowAllDays(!showAllDays)}
                            className="mt-2 py-3 bg-white border border-gray-200 rounded-xl items-center justify-center flex-row"
                          >
                            <Text className="text-xs font-bold text-gray-700 mr-1">
                              {showAllDays ? "Show Less" : "View Full Itinerary"}
                            </Text>
                            <Ionicons
                              name={showAllDays ? "chevron-up" : "chevron-down"}
                              size={14}
                              color="#374151"
                            />
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <View className="bg-white border border-gray-100 rounded-2xl p-4">
                        <Text className="text-gray-500 text-xs">No itinerary available.</Text>
                      </View>
                    )}
                  </View>
                )}

                {activeInfoTab === "policies" && (
                  <View className="mb-28">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="shield-checkmark-outline" size={16} color="#1F2937" />
                      <Text className="text-gray-900 text-sm font-bold ml-2">Policies</Text>
                    </View>
                    {!!termsEntries.length ? (
                      <View className="bg-white rounded-2xl border border-gray-100 p-4">
                        {termsEntries.map((entry, idx) => (
                          <View
                            key={`${entry.key}-${idx}`}
                            className={`pb-3 mb-3 ${idx !== termsEntries.length - 1 ? "border-b border-gray-100" : ""}`}
                          >
                            <Text className="text-[11px] font-bold text-gray-900 mb-1">
                              {entry.label}
                            </Text>
                            <Text className="text-[11px] text-gray-600 leading-5">
                              {entry.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View className="bg-white border border-gray-100 rounded-2xl p-4">
                        <Text className="text-gray-500 text-xs">No policy details available.</Text>
                      </View>
                    )}
                  </View>
                )}

            </View>
        </ScrollView>

        {/* Floating Bottom Bar - Compact */}
        <View className="absolute bottom-0 left-0 right-0 bg-white px-5 pt-3 pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] rounded-t-[24px] border-t border-gray-50 flex-row items-center justify-between z-20">
            <View>
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Total Price</Text>
                <View className="flex-row items-baseline">
                    <Text className="text-xl font-extrabold text-gray-900">{formatINR(defaultSeatPrice)}</Text>
                    <Text className="text-gray-400 text-[10px] font-medium ml-1">/ person</Text>
                </View>
                {!hasVehicleService && (
                  <Text className="text-[10px] font-semibold text-orange-600 mt-1">
                    No seats available
                  </Text>
                )}
            </View>
            <TouchableOpacity 
                onPress={openBooking}
                className={`px-6 py-3.5 rounded-xl flex-row items-center ${
                  hasVehicleService
                    ? "bg-blue-600 shadow-lg shadow-blue-200"
                    : "bg-gray-300"
                }`}
            >
                <Text className="text-white font-bold text-sm mr-1.5">
                  {hasVehicleService ? "Select Seats" : "No seats available"}
                </Text>
                {hasVehicleService && <Ionicons name="arrow-forward" size={16} color="white" />}
            </TouchableOpacity>
        </View>
      </View>

      {/* --- BOOKING MODAL --- */}
      <Modal
        visible={bookingOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeBooking}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1 relative">
              
              {/* Modal Header */}
              <View className="px-5 py-4 border-b border-gray-100 flex-row items-center bg-white z-10">
                  <TouchableOpacity onPress={bookingStep === 1 ? closeBooking : () => setBookingStep(bookingStep - 1)} className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center -ml-2">
                      <Ionicons name="chevron-back" size={24} color="#111827" />
                  </TouchableOpacity>
                  <Text className="text-xl font-extrabold text-gray-900 ml-3">
                      {bookingStep === 1 ? "Select Seats" : bookingStep === 2 ? "Passenger Details" : "Review & Pay"}
                  </Text>
              </View>

              <StepIndicator current={bookingStep} />

              {/* --- STEP 1: SEATS --- */}
              {bookingStep === 1 && (
                <View className="flex-1 bg-white">
                  <View className="px-5 pt-4 pb-3 border-b border-gray-100">
                      <Text className="text-xs text-gray-500 font-semibold tracking-wide">
                        {formatValue(selectedVehicle?.name, "Bus")} • {seatLayoutLabel} Layout - {totalSeatCount} Seats
                      </Text>
                      <View className="mt-3 rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 flex-row items-center justify-center" style={{ gap: 18 }}>
                        <View className="flex-row items-center">
                          <View className="w-3.5 h-3.5 rounded bg-white border border-gray-300 mr-2" />
                          <Text className="text-xs text-gray-600 font-semibold">Avail</Text>
                        </View>
                        <View className="flex-row items-center">
                          <View className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-600 mr-2" />
                          <Text className="text-xs text-gray-600 font-semibold">Selected</Text>
                        </View>
                        <View className="flex-row items-center">
                          <View className="w-3.5 h-3.5 rounded bg-gray-200 border border-gray-200 mr-2" />
                          <Text className="text-xs text-gray-600 font-semibold">Booked</Text>
                        </View>
                      </View>
                  </View>

                  <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, alignItems: 'center', paddingBottom: 100 }}>
                      <View className="w-full max-w-[360px] mb-5">
                        <View className="flex-row justify-end items-center opacity-60 pr-1">
                          <Ionicons name="options-outline" size={18} color="#9CA3AF" />
                          <Text className="text-[10px] font-bold text-gray-500 ml-1.5 uppercase tracking-wider">Driver</Text>
                        </View>
                        <View className="mt-3 border-t border-dashed border-gray-200" />
                      </View>

                      <View className="w-full max-w-[360px]">
                          <View className="mb-3 px-1.5">
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row" style={{ gap: 12 }}>
                                {seatDeck.leftColumns.map((col) => (
                                  <Text key={`col-left-${col}`} className="w-11 text-center text-xs font-extrabold text-gray-300">
                                    {col}
                                  </Text>
                                ))}
                              </View>
                              {seatDeck.hasAisle && <View className="w-8" />}
                              {!!seatDeck.rightColumns.length && (
                                <View className="flex-row" style={{ gap: 12 }}>
                                  {seatDeck.rightColumns.map((col) => (
                                    <Text key={`col-right-${col}`} className="w-11 text-center text-xs font-extrabold text-gray-300">
                                      {col}
                                    </Text>
                                  ))}
                                </View>
                              )}
                            </View>
                          </View>

                          {seatDeck.rows.map((row) => (
                            <View key={row.row} className="flex-row items-center justify-between mb-3">
                              <View className="flex-row" style={{ gap: 12 }}>
                                {row.leftSeats.map((seat, index) => (
                                  <View key={`${row.row}-left-${index}`} className="w-11 h-11">
                                    {seat ? (
                                      <SeatButton
                                        seat={seat}
                                        booked={bookedSeats.includes(seat)}
                                        selected={selectedSeats.includes(seat)}
                                        onPress={() => toggleSeat(seat)}
                                      />
                                    ) : (
                                      <View className="w-11 h-11" />
                                    )}
                                  </View>
                                ))}
                              </View>

                              {seatDeck.hasAisle && (
                                <View className="w-8 items-center">
                                  <Text className="text-[10px] font-bold text-gray-300">{row.row}</Text>
                                </View>
                              )}

                              {!!row.rightSeats.length && (
                                <View className="flex-row" style={{ gap: 12 }}>
                                  {row.rightSeats.map((seat, index) => (
                                    <View key={`${row.row}-right-${index}`} className="w-11 h-11">
                                      {seat ? (
                                        <SeatButton
                                          seat={seat}
                                          booked={bookedSeats.includes(seat)}
                                          selected={selectedSeats.includes(seat)}
                                          onPress={() => toggleSeat(seat)}
                                        />
                                      ) : (
                                        <View className="w-11 h-11" />
                                      )}
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          ))}

                          <View className="mt-4 pt-3 border-t border-dashed border-gray-200 items-center">
                            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-[2px]">Rear Of Bus</Text>
                          </View>
                      </View>
                  </ScrollView>

                  <View className="p-5 border-t border-gray-100 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.03)] pb-8">
                      <View className="flex-row justify-between items-center mb-4">
                          <View>
                              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Selected Seats</Text>
                              <Text className="text-lg font-extrabold text-gray-900">{selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}</Text>
                          </View>
                          <View className="items-end">
                              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Price</Text>
                              <Text className="text-2xl font-extrabold text-blue-600">{formatINR(seatTotal)}</Text>
                          </View>
                      </View>
                      <TouchableOpacity 
                          disabled={selectedSeats.length === 0}
                          onPress={() => setBookingStep(2)}
                          className={`w-full py-4 rounded-2xl flex-row justify-center items-center shadow-lg ${selectedSeats.length > 0 ? 'bg-blue-600 shadow-blue-200' : 'bg-gray-100 shadow-none'}`}
                      >
                          <Text className={`font-bold text-base ${selectedSeats.length > 0 ? 'text-white' : 'text-gray-400'}`}>Continue</Text>
                          <Ionicons name="arrow-forward" size={18} color={selectedSeats.length > 0 ? 'white' : '#9CA3AF'} style={{marginLeft: 8}} />
                      </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* --- STEP 2: PASSENGERS --- */}
              {bookingStep === 2 && (
                <View className="flex-1 bg-gray-50/50">
                   <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
                      {/* Tab Selector for Seats */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 -mx-2 px-2">
                          {selectedSeats.map(seat => (
                              <TouchableOpacity 
                                  key={seat}
                                  onPress={() => setActiveSeatTab(seat)}
                                  className={`mr-3 px-5 py-2.5 rounded-xl border shadow-sm ${activeSeatTab === seat ? 'bg-blue-600 border-blue-600 shadow-blue-200' : 'bg-white border-gray-200'}`}
                              >
                                  <Text className={`font-bold text-xs ${activeSeatTab === seat ? 'text-white' : 'text-gray-600'}`}>SEAT {seat}</Text>
                              </TouchableOpacity>
                          ))}
                      </ScrollView>

                      {/* Form Card */}
                      <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
                           <View className="flex-row justify-between items-center mb-6">
                               <View className="bg-blue-50 px-3 py-1.5 rounded-lg">
                                   <Text className="text-xs font-bold text-blue-700 uppercase tracking-wide">Editing Seat {activeSeatTab}</Text>
                               </View>
                           </View>

                           {/* Type Toggle */}
                           <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Passenger Type</Text>
                           <View className="flex-row gap-3 mb-6">
                               {['Adult', 'Child'].map(type => (
                                   <TouchableOpacity 
                                      key={type}
                                      onPress={() => setPassengerForm(prev => ({
                                          ...prev,
                                          [activeSeatTab]: { ...prev[activeSeatTab], type }
                                      }))}
                                      className={`flex-1 py-3.5 rounded-xl border items-center flex-row justify-center gap-2 transition-all ${
                                          passengerForm[activeSeatTab]?.type === type 
                                          ? 'bg-blue-50 border-blue-600' 
                                          : 'bg-white border-gray-200'
                                      }`}
                                   >
                                       <Ionicons name={type === 'Adult' ? 'person' : 'happy'} size={16} color={passengerForm[activeSeatTab]?.type === type ? '#2563EB' : '#9CA3AF'} />
                                       <Text className={`font-bold text-sm ${passengerForm[activeSeatTab]?.type === type ? 'text-blue-700' : 'text-gray-500'}`}>{type}</Text>
                                   </TouchableOpacity>
                               ))}
                           </View>

                           {/* Name Input */}
                           <View className="mb-6">
                              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Full Name</Text>
                              <TextInput 
                                  placeholder="e.g. John Doe"
                                  value={passengerForm[activeSeatTab]?.name || ''}
                                  onChangeText={(text) => setPassengerForm(prev => ({...prev, [activeSeatTab]: {...prev[activeSeatTab], name: text}}))}
                                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-semibold text-base"
                              />
                           </View>

                           <View className="flex-row gap-4 mb-2">
                               {/* Dynamic Age / DOB Input */}
                               <View className="flex-1">
                                   <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                       {passengerForm[activeSeatTab]?.type === 'Child' ? 'Date of Birth' : 'Age'}
                                   </Text>
                                   <TextInput 
                                       placeholder={passengerForm[activeSeatTab]?.type === 'Child' ? 'DD/MM/YYYY' : 'Years'}
                                       value={passengerForm[activeSeatTab]?.type === 'Child' ? (passengerForm[activeSeatTab]?.dob || '') : (passengerForm[activeSeatTab]?.age || '')}
                                       onChangeText={(text) => {
                                           const isChild = passengerForm[activeSeatTab]?.type === 'Child';
                                           setPassengerForm(prev => ({
                                               ...prev, 
                                               [activeSeatTab]: {
                                                   ...prev[activeSeatTab], 
                                                   [isChild ? 'dob' : 'age']: text 
                                               }
                                           }))
                                       }}
                                       keyboardType={passengerForm[activeSeatTab]?.type === 'Child' ? 'numbers-and-punctuation' : 'number-pad'}
                                       className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-semibold text-base"
                                   />
                               </View>
                               
                               {/* Gender */}
                               <View className="flex-1">
                                   <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Gender</Text>
                                   <View className="flex-row h-[52px] bg-gray-50 border border-gray-200 rounded-xl p-1">
                                       {['Male', 'Female'].map(g => (
                                           <TouchableOpacity 
                                              key={g}
                                              onPress={() => setPassengerForm(prev => ({...prev, [activeSeatTab]: {...prev[activeSeatTab], gender: g}}))}
                                              className={`flex-1 rounded-lg items-center justify-center ${passengerForm[activeSeatTab]?.gender === g ? 'bg-white shadow-sm' : 'bg-transparent'}`}
                                           >
                                               <Text className={`font-bold text-xs ${passengerForm[activeSeatTab]?.gender === g ? 'text-blue-600' : 'text-gray-400'}`}>{g.charAt(0)}</Text>
                                           </TouchableOpacity>
                                       ))}
                                   </View>
                               </View>
                           </View>
                      </View>

                      {/* Contact Info Card */}
                      <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                          <View className="flex-row items-center mb-4">
                              <View className="w-8 h-8 bg-orange-50 rounded-full items-center justify-center mr-3">
                                  <Ionicons name="call" size={16} color="#EA580C" />
                              </View>
                              <Text className="text-gray-900 font-bold text-base">Contact Details</Text>
                          </View>
                          <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Primary Mobile Number</Text>
                          <TextInput 
                              placeholder="10-digit mobile number"
                              value={mobileNumber}
                              onChangeText={setMobileNumber}
                              keyboardType="number-pad"
                              maxLength={10}
                              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-semibold text-base"
                          />
                          <Text className="text-xs text-gray-400 mt-2 ml-1">Booking confirmation will be sent here.</Text>
                      </View>
                   </ScrollView>

                   <View className="p-5 border-t border-gray-100 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.03)] pb-8">
                      <TouchableOpacity 
                          onPress={() => {
                              const err = validatePassengerDetails();
                              if(err) showError("Missing Details", err);
                              else setBookingStep(3);
                          }}
                          className="w-full bg-blue-600 py-4 rounded-2xl flex-row justify-center items-center shadow-lg shadow-blue-200"
                      >
                          <Text className="font-bold text-base text-white">Review & Pay</Text>
                          <Ionicons name="arrow-forward" size={18} color="white" style={{marginLeft: 8}} />
                      </TouchableOpacity>
                   </View>
                </View>
              )}

              {/* --- STEP 3: PAYMENT --- */}
              {bookingStep === 3 && (
                <View className="flex-1 bg-gray-50/50">
                   <ScrollView contentContainerStyle={{ padding: 20 }}>
                       {/* Payment Summary Card */}
                       <View className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
                           <Text className="text-lg font-extrabold text-gray-900 mb-6">Order Summary</Text>
                           
                           <View className="flex-row justify-between mb-3">
                               <Text className="text-gray-500 font-medium">Ticket Price (x{selectedSeats.length})</Text>
                               <Text className="text-gray-900 font-bold">{formatINR(seatTotal)}</Text>
                           </View>
                           <View className="flex-row justify-between mb-3">
                               <Text className="text-gray-500 font-medium">Taxes & Fees</Text>
                               <Text className="text-green-600 font-bold">Free</Text>
                           </View>
                           
                           <View className="h-[1px] bg-gray-100 my-4" />
                           
                           <View className="flex-row justify-between items-center mb-6">
                               <Text className="text-xl font-bold text-blue-900">Total Amount</Text>
                               <Text className="text-3xl font-extrabold text-blue-600">{formatINR(totalAmount)}</Text>
                           </View>

                           <View className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex-row justify-between items-center">
                               <View>
                                   <Text className="text-orange-800 font-bold text-sm uppercase tracking-wide">Advance Payable</Text>
                                   <Text className="text-orange-600 text-xs mt-0.5">20% to confirm booking</Text>
                               </View>
                               <Text className="text-orange-700 font-extrabold text-2xl">{formatINR(advanceAmount)}</Text>
                           </View>
                       </View>

                       {/* Payment Options */}
                       <Text className="text-[10px] font-bold text-gray-400 uppercase mb-3 ml-2 tracking-widest">Payment Method</Text>
                       {['Pay 20% Advance', 'Pay Full Amount'].map((opt, i) => (
                           <TouchableOpacity 
                              key={i}
                              onPress={() => setPayType(i === 0 ? 'advance' : 'full')}
                              className={`p-5 rounded-2xl border mb-3 flex-row items-center justify-between shadow-sm ${
                                  (payType === 'advance' && i === 0) || (payType === 'full' && i === 1) 
                                  ? 'bg-white border-blue-500 ring-2 ring-blue-100' 
                                  : 'bg-white border-gray-100'
                              }`}
                           >
                               <View className="flex-row items-center">
                                   <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-4 ${(payType === 'advance' && i === 0) || (payType === 'full' && i === 1) ? 'border-blue-600' : 'border-gray-200'}`}>
                                       {((payType === 'advance' && i === 0) || (payType === 'full' && i === 1)) && <View className="w-3 h-3 rounded-full bg-blue-600" />}
                                   </View>
                                   <View>
                                      <Text className="font-bold text-gray-900 text-base">{opt}</Text>
                                      <Text className="text-xs text-gray-400 mt-0.5 font-medium">{i === 0 ? 'Instant Confirmation' : 'Complete Payment'}</Text>
                                   </View>
                               </View>
                               <Text className="font-extrabold text-blue-700 text-lg">{formatINR(i === 0 ? advanceAmount : totalAmount)}</Text>
                           </TouchableOpacity>
                       ))}
                   </ScrollView>

                   <View className="p-5 border-t border-gray-100 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.03)] pb-8">
                      <TouchableOpacity 
                          onPress={submitBooking}
                          disabled={tourBookingStatus === 'loading'}
                          className={`w-full py-4 rounded-2xl flex-row justify-center items-center shadow-lg ${tourBookingStatus === 'loading' ? 'bg-gray-300 shadow-none' : 'bg-blue-600 shadow-blue-200'}`}
                      >
                          {tourBookingStatus === 'loading' ? (
                              <ActivityIndicator color="white" />
                          ) : (
                              <>
                                  <Ionicons name="lock-closed" size={18} color="white" style={{marginRight: 8}} />
                                  <Text className="font-bold text-base text-white">Pay Securely</Text>
                              </>
                          )}
                      </TouchableOpacity>
                   </View>
                </View>
              )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
