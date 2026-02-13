import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";

import { baseURL } from "../utils/baseUrl";
import { useAuth } from "../contexts/AuthContext";

const { width, height } = Dimensions.get("window");

const COUNTRY_CODES = [
  { code: "+91", name: "India" },
  { code: "+1", name: "United States" },
  { code: "+44", name: "United Kingdom" },
  { code: "+61", name: "Australia" },
  { code: "+971", name: "UAE" },
];

const BG_ICONS = [
  "bed-outline",
  "camera-outline",
  "restaurant-outline",
  "airplane-outline",
  "key-outline",
  "business-outline",
];

function PatternBackground() {
  const iconSize = 24;
  const stepX = 56;
  const stepY = 56;
  const rows = Math.ceil(height / stepY) + 2;
  const cols = Math.ceil(width / stepX) + 2;

  const cells = useMemo(() => {
    const result = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const left = c * stepX + (r % 2 ? 14 : 0);
        const top = r * stepY + 2;
        const iconName = BG_ICONS[(r + c) % BG_ICONS.length];
        result.push({ key: `${r}-${c}`, left, top, iconName });
      }
    }
    return result;
  }, [rows, cols]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {cells.map((cell) => (
        <Ionicons
          key={cell.key}
          name={cell.iconName}
          size={iconSize}
          color="#94a3b8"
          style={[styles.patternIcon, { left: cell.left, top: cell.top }]}
        />
      ))}
    </View>
  );
}

function CountryCodePicker({ selectedCode, onSelect, disabled }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.countryButton, disabled && styles.countryButtonDisabled]}
        disabled={disabled}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.countryButtonText}>{selectedCode}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.countryModalBackdrop}>
          <View style={styles.countryModal}>
            <View style={styles.countryModalHeader}>
              <Text style={styles.countryModalTitle}>Select country code</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={20} color="#334155" />
              </TouchableOpacity>
            </View>

            {COUNTRY_CODES.map((item) => (
              <TouchableOpacity
                key={item.code}
                style={styles.countryItem}
                onPress={() => {
                  onSelect(item.code);
                  setOpen(false);
                }}
              >
                <Text style={styles.countryItemName}>{item.name}</Text>
                <Text style={styles.countryItemCode}>{item.code}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

function SixDigitOTP({ value, onComplete, disabled }) {
  const [digits, setDigits] = useState(Array(6).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!value) {
      setDigits(Array(6).fill(""));
      return;
    }
    if (value.length === 6) setDigits(value.split(""));
  }, [value]);

  const onChangeDigit = (index, text) => {
    if (!/^[0-9]?$/.test(text)) return;
    const next = [...digits];
    next[index] = text;
    setDigits(next);
    if (text && index < 5) inputRefs.current[index + 1]?.focus();
    const joined = next.join("");
    onComplete(joined.length === 6 ? joined : "");
  };

  return (
    <View style={styles.otpWrap}>
      {digits.map((d, index) => (
        <TextInput
          key={`${index}`}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          value={d}
          onChangeText={(text) => onChangeDigit(index, text)}
          style={[styles.otpInput, d ? styles.otpInputFilled : null]}
          keyboardType="number-pad"
          maxLength={1}
          editable={!disabled}
        />
      ))}
    </View>
  );
}

export default function LoginPage({ navigation }) {
  const { signIn } = useAuth();

  const [mode, setMode] = useState("password");
  const [authMethod, setAuthMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (resendTimer <= 0) return undefined;
    const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const showToast = (type, title, message) => {
  };

  const extractAuthPayload = (response) => {
    const body = response?.data || {};
    const nested = body?.data && typeof body.data === "object" ? body.data : {};

    return {
      token: body?.rsToken || nested?.rsToken || body?.token || nested?.token || "",
      userId: body?.userId || nested?.userId || "",
      email: body?.email || nested?.email || email || "",
    };
  };

  const handlePasswordLogin = async () => {
    if (!email || !password) {
      showToast("error", "Error", "Email and password required.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${baseURL}/signIn`, { email, password });
      const authData = extractAuthPayload(res);
      if (!authData.token || !authData.userId) {
        throw new Error("Login response is missing token or userId.");
      }
      await signIn(authData.token, authData.userId, authData.email);
      showToast("success", "Success", "Logged in");
      navigation.replace("MainTabs");
    } catch (err) {
      showToast("error", "Login Failed", err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    if (authMethod === "email" && !email) {
      showToast("error", "Error", "Please enter your email.");
      return;
    }

    if (authMethod === "mobile" && !phone) {
      showToast("error", "Error", "Please enter your mobile number.");
      return;
    }

    setLoading(true);
    try {
      let response;
      if (authMethod === "email") {
        response = await axios.post(`${baseURL}/mail/send-otp`, { email });
      } else {
        const fullPhone = `${countryCode}${phone}`;
        response = await axios.post(`${baseURL}/send-otp`, {
          phoneNumber: fullPhone,
          mobile: fullPhone,
        });
      }
      showToast("success", "OTP Sent", response.data?.message || "OTP sent successfully.");
      setOtpSent(true);
      setResendTimer(30);
    } catch (err) {
      showToast("error", "Error", err.response?.data?.message || "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showToast("error", "Error", "Please enter a valid OTP.");
      return;
    }

    setLoading(true);
    try {
      let response;
      if (authMethod === "email") {
        response = await axios.post(`${baseURL}/mail/verify-otp/site`, { email, otp });
      } else {
        const fullPhone = `${countryCode}${phone}`;
        response = await axios.post(`${baseURL}/verify-otp`, {
          phoneNumber: fullPhone,
          mobile: fullPhone,
          code: otp,
        });
      }

      const authData = extractAuthPayload(response);
      if (!authData.token || !authData.userId) {
        throw new Error("OTP response is missing token or userId.");
      }
      await signIn(authData.token, authData.userId, authData.email);
      showToast("success", "Success", "Logged in");
      navigation.replace("MainTabs");
    } catch (err) {
      showToast("error", "Invalid OTP", err.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = () => {
    if (mode === "password") {
      handlePasswordLogin();
      return;
    }
    if (!otpSent) requestOtp();
    else verifyOtp();
  };

  return (
    <View style={styles.screen}>
      <PatternBackground />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.content,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <View style={styles.hero}>
                <Text style={styles.brandWordmark}>Hotelroomsstay</Text>
                <Text style={styles.heroTitle}>Welcome to HRS</Text>
                <Text style={styles.heroSubtitle}>Your journey starts here</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.modeSwitch}>
                  <TouchableOpacity
                    style={[styles.modeButton, mode === "password" && styles.modeButtonActive]}
                    onPress={() => {
                      setMode("password");
                      setOtpSent(false);
                    }}
                  >
                    <Ionicons
                      name="key"
                      size={15}
                      color={mode === "password" ? "#ffffff" : "#0f172a"}
                    />
                    <Text
                      style={[
                        styles.modeButtonText,
                        mode === "password" && styles.modeButtonTextActive,
                      ]}
                    >
                      Password
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeButton, mode === "otp" && styles.modeButtonActive]}
                    onPress={() => {
                      setMode("otp");
                      setOtpSent(false);
                    }}
                  >
                    <Ionicons
                      name="phone-portrait"
                      size={15}
                      color={mode === "otp" ? "#ffffff" : "#0f172a"}
                    />
                    <Text
                      style={[styles.modeButtonText, mode === "otp" && styles.modeButtonTextActive]}
                    >
                      OTP
                    </Text>
                  </TouchableOpacity>
                </View>

                {mode === "otp" && !otpSent && (
                  <View style={styles.subSwitch}>
                    <TouchableOpacity
                      style={[styles.subSwitchButton, authMethod === "email" && styles.subSwitchActive]}
                      onPress={() => setAuthMethod("email")}
                    >
                      <Text
                        style={[
                          styles.subSwitchText,
                          authMethod === "email" && styles.subSwitchTextActive,
                        ]}
                      >
                        Email
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.subSwitchButton, authMethod === "mobile" && styles.subSwitchActive]}
                      onPress={() => setAuthMethod("mobile")}
                    >
                      <Text
                        style={[
                          styles.subSwitchText,
                          authMethod === "mobile" && styles.subSwitchTextActive,
                        ]}
                      >
                        Mobile
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {(mode === "password" || authMethod === "email") && (
                  <View style={styles.inputWrap}>
                    <Ionicons name="mail" size={20} color="#0f2c5c" style={styles.inputIcon} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      editable={!(mode === "otp" && otpSent)}
                      placeholder="Email address"
                      placeholderTextColor="#64748b"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.input}
                    />
                  </View>
                )}

                {mode === "otp" && authMethod === "mobile" && (
                  <View style={styles.phoneRow}>
                    <CountryCodePicker
                      selectedCode={countryCode}
                      onSelect={setCountryCode}
                      disabled={otpSent}
                    />
                    <View style={[styles.inputWrap, styles.phoneInputWrap]}>
                      <Ionicons name="call" size={20} color="#0f2c5c" style={styles.inputIcon} />
                      <TextInput
                        value={phone}
                        onChangeText={(text) => setPhone(text.replace(/[^\d]/g, ""))}
                        editable={!otpSent}
                        placeholder="Mobile number"
                        placeholderTextColor="#64748b"
                        keyboardType="phone-pad"
                        style={styles.input}
                      />
                    </View>
                  </View>
                )}

                {mode === "password" && (
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed" size={20} color="#0f2c5c" style={styles.inputIcon} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Password"
                      placeholderTextColor="#64748b"
                      style={styles.input}
                    />
                    <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                      <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#0f2c5c" />
                    </TouchableOpacity>
                  </View>
                )}

                {mode === "otp" && otpSent && (
                  <View style={styles.otpSection}>
                    <Text style={styles.otpHeading}>Enter 6-digit code</Text>
                    <SixDigitOTP disabled={loading} value={otp} onComplete={setOtp} />
                  </View>
                )}

                <TouchableOpacity
                  style={styles.submitTouchable}
                  onPress={onSubmit}
                  disabled={loading || (mode === "otp" && otpSent && otp.length !== 6)}
                >
                  <LinearGradient
                    colors={["#245ecf", "#3f73df"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.submitButton,
                      loading || (mode === "otp" && otpSent && otp.length !== 6)
                        ? styles.submitButtonDisabled
                        : null,
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Text style={styles.submitButtonText}>
                          {mode === "password" ? "Sign In" : otpSent ? "Verify & Sign In" : "Send OTP"}
                        </Text>
                        <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {mode === "otp" && otpSent && (
                  <View style={styles.resendWrap}>
                    {resendTimer > 0 ? (
                      <Text style={styles.resendText}>Resend code in {resendTimer}s</Text>
                    ) : (
                      <TouchableOpacity onPress={requestOtp}>
                        <Text style={styles.resendLink}>Resend code</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                  <Text style={styles.bottomText}>
                    Don't have an account? <Text style={styles.bottomLink}>Create one</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  safeArea: {
    flex: 1,
  },
  patternIcon: {
    position: "absolute",
    opacity: 0.16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: 10,
  },
  brandWordmark: {
    color: "#1d4ed8",
    fontSize: 30,
    lineHeight: 34,
    marginBottom: 4,
    fontWeight: "700",
    fontStyle: "italic",
    fontFamily: Platform.select({ ios: "Snell Roundhand", android: "cursive", default: "cursive" }),
  },
  heroTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: "#0f2757",
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
  },
  card: {
    width: "100%",
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1.5,
    borderColor: "#5f8fcf",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: "#1e3a8a",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  modeSwitch: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "#81a2d1",
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    padding: 4,
    marginBottom: 10,
  },
  modeButton: {
    flex: 1,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: "#3568d4",
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  modeButtonText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  modeButtonTextActive: {
    color: "#ffffff",
  },
  subSwitch: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 8,
    overflow: "hidden",
  },
  subSwitchButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
  },
  subSwitchActive: {
    backgroundColor: "#e0e7ff",
  },
  subSwitchText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  subSwitchTextActive: {
    color: "#1e40af",
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  countryButton: {
    width: 74,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.3,
    borderColor: "#5f8fcf",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  countryButtonDisabled: {
    opacity: 0.65,
  },
  countryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  countryModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  countryModal: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  countryModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  countryModalTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
  countryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  countryItemName: {
    color: "#334155",
    fontSize: 15,
  },
  countryItemCode: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  inputWrap: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.3,
    borderColor: "#5f8fcf",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  phoneInputWrap: {
    flex: 1,
    marginBottom: 0,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#111827",
    fontSize: 16,
    fontWeight: "500",
  },
  otpSection: {
    marginBottom: 8,
  },
  otpHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  otpWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 7,
  },
  otpInput: {
    width: 38,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.3,
    borderColor: "#cbd5e1",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  otpInputFilled: {
    borderColor: "#3568d4",
    backgroundColor: "#eef2ff",
  },
  submitTouchable: {
    marginTop: 2,
  },
  submitButton: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
  },
  resendWrap: {
    marginTop: 8,
    alignItems: "center",
  },
  resendText: {
    color: "#475569",
    fontSize: 13,
  },
  resendLink: {
    color: "#245ecf",
    fontSize: 13,
    fontWeight: "700",
  },
  dividerRow: {
    marginTop: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#cbd5e1",
  },
  dividerText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },
  bottomText: {
    textAlign: "center",
    color: "#334155",
    fontSize: 14,
    fontWeight: "500",
  },
  bottomLink: {
    color: "#245ecf",
    fontWeight: "800",
  },
});
