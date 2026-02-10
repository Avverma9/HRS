import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import axios from "axios";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { baseURL } from "../utils/baseUrl";
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get("window");

const countryCodes = [
  { code: "+91", country: "IN", flag: "🇮🇳", name: "India" },
  { code: "+1", country: "US", flag: "🇺🇸", name: "United States" },
  { code: "+44", country: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+61", country: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "+33", country: "FR", flag: "🇫🇷", name: "France" },
  { code: "+49", country: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "+81", country: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "+82", country: "KR", flag: "🇰🇷", name: "South Korea" },
  { code: "+55", country: "BR", flag: "🇧🇷", name: "Brazil" },
];

// Country Code Dropdown with modern styling
function CountryCodeDropdown({ selectedCode, onSelect, disabled, isDark }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = countryCodes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.includes(searchTerm)
  );

  return (
    <View style={styles.countryDropdown}>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        style={[styles.countryButton, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
      >
        <Text style={[styles.countryCode, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
          {selectedCode}
        </Text>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={styles.modalContent}>
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#334155' : '#e2e8f0' }]}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>Select Country</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Search country..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={[styles.searchInput, { color: isDark ? '#f1f5f9' : '#0f172a', backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#334155' : '#cbd5e1' }]}
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            />
            <FlatList
              data={filtered}
              keyExtractor={(i) => i.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, { borderBottomColor: isDark ? '#334155' : '#f1f5f9' }]}
                  onPress={() => {
                    onSelect(item.code);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={[styles.countryName, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.countryCodeText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    {item.code}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <Text style={[styles.emptyText, { color: isDark ? '#64748b' : '#94a3b8' }]}>
                  No match found
                </Text>
              )}
            />
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

// Modern OTP Input
function SixDigitOTP({ disabled, onComplete, value = "", isDark }) {
  const [vals, setVals] = useState(Array(6).fill(""));
  const refs = useRef([]);

  useEffect(() => {
    if (value.length === 6) setVals(value.split(""));
    else if (value === "") setVals(Array(6).fill(""));
  }, [value]);

  const handleChange = (i, v) => {
    if (!/^[0-9]?$/.test(v)) return;
    const next = [...vals];
    next[i] = v;
    setVals(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
    onComplete(next.every((d) => d) ? next.join("") : "");
  };

  return (
    <View style={styles.otpContainer}>
      {vals.map((val, i) => (
        <TextInput
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={val}
          onChangeText={(t) => handleChange(i, t)}
          keyboardType="number-pad"
          maxLength={1}
          editable={!disabled}
          style={[
            styles.otpInput,
            val ? styles.otpInputFilled : (isDark ? styles.otpInputEmptyDark : styles.otpInputEmpty)
          ]}
        />
      ))}
    </View>
  );
}

// Main Professional Login Component
export default function LoginPage({ navigation }) {
  const { theme, isDark } = useTheme();
  const { signIn } = useAuth();
  const [mode, setMode] = useState("password");
  const [authMethod, setAuthMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    let interval;
    if (resendTimer > 0)
      interval = setInterval(() => setResendTimer((p) => p - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const showToast = (type, title, message) => {
    Toast.show({ type, text1: title, text2: message, position: "top" });
  };

  const handlePasswordLogin = async () => {
    if (!email || !password)
      return showToast("error", "Error", "Email and password required.");
    setLoading(true);
    try {
      const res = await axios.post(`${baseURL}/signIn`, { email, password });
  // Persist token and update app state through Auth context
  await AsyncStorage.setItem("roomsstayUserEmail", res.data.email || "");
  await signIn(res.data.rsToken, res.data.userId);
      showToast("success", "Success", "Logged in");
      navigation.replace("MainTabs");
    } catch (err) {
      showToast(
        "error",
        "Login Failed",
        err.response?.data?.message || "Login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    if (authMethod === "email" && !email)
      return showToast("error", "Error", "Please enter your email.");
    if (authMethod === "mobile" && !phone)
      return showToast("error", "Error", "Please enter your mobile number.");
    setLoading(true);
    try {
      let res;
      if (authMethod === "email")
        res = await axios.post(`${baseURL}/mail/send-otp`, { email });
      else {
        const full = countryCode + phone;
        res = await axios.post(`${baseURL}/send-otp`, {
          phoneNumber: full,
          mobile: full,
        });
      }
      showToast("success", "OTP Sent", res.data.message || "OTP sent successfully.");
      setOtpSent(true);
      setResendTimer(30);
    } catch (err) {
      showToast(
        "error",
        "Error",
        err.response?.data?.message || "Could not send OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp) return showToast("error", "Error", "Please enter the OTP.");
    setLoading(true);
    try {
      let res;
      if (authMethod === "email")
        res = await axios.post(`${baseURL}/mail/verify-otp/site`, {
          email,
          otp,
        });
      else {
        const full = countryCode + phone;
        res = await axios.post(`${baseURL}/verify-otp`, {
          phoneNumber: full,
          mobile: full,
          code: otp,
        });
      }
  await signIn(res.data.rsToken, res.data.userId);
      showToast("success", "Success", "Logged in");
      navigation.replace("MainTabs");
    } catch (err) {
      showToast(
        "error",
        "Invalid OTP",
        err.response?.data?.message || "Invalid OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === "password") handlePasswordLogin();
    else if (otpSent) handleOtpSubmit();
    else requestOtp();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDark ? ['#0f172a', '#1e293b', '#334155'] : ['#dbeafe', '#eff6ff', '#f8fafc']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                {/* Logo & Welcome */}
                <View style={styles.header}>
                  <View style={[styles.logoContainer, { backgroundColor: theme.activeBg }]}>
                    <MaterialCommunityIcons name="home-heart" size={48} color="#fff" />
                  </View>
                  <Text style={[styles.title, { color: theme.text }]}>Welcome to HRS</Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Your journey starts here
                  </Text>
                </View>

                {/* Login Card */}
                <BlurView intensity={isDark ? 60 : 90} tint={theme.blurTint} style={styles.card}>
                  <View style={[styles.cardInner, { backgroundColor: isDark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.7)' }]}>
                    
                    {/* Mode Tabs */}
                    <View style={styles.modeTabs}>
                      <TouchableOpacity
                        onPress={() => { setMode("password"); setOtpSent(false); }}
                        style={[styles.modeTab, mode === "password" && styles.modeTabActive]}
                      >
                        <Ionicons 
                          name="key" 
                          size={18} 
                          color={mode === "password" ? "#fff" : theme.textSecondary} 
                        />
                        <Text style={[styles.modeTabText, { color: mode === "password" ? "#fff" : theme.textSecondary }]}>
                          Password
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => { setMode("otp"); setOtpSent(false); }}
                        style={[styles.modeTab, mode === "otp" && styles.modeTabActive]}
                      >
                        <Ionicons 
                          name="phone-portrait" 
                          size={18} 
                          color={mode === "otp" ? "#fff" : theme.textSecondary} 
                        />
                        <Text style={[styles.modeTabText, { color: mode === "otp" ? "#fff" : theme.textSecondary }]}>
                          OTP
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Auth Method Toggle for OTP */}
                    {mode === "otp" && !otpSent && (
                      <View style={styles.authMethodContainer}>
                        <TouchableOpacity
                          onPress={() => setAuthMethod("email")}
                          style={[styles.authMethodBtn, authMethod === "email" && { backgroundColor: theme.activeColor }]}
                        >
                          <Text style={[styles.authMethodText, { color: authMethod === "email" ? "#fff" : theme.textSecondary }]}>
                            Email
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setAuthMethod("mobile")}
                          style={[styles.authMethodBtn, authMethod === "mobile" && { backgroundColor: theme.activeColor }]}
                        >
                          <Text style={[styles.authMethodText, { color: authMethod === "mobile" ? "#fff" : theme.textSecondary }]}>
                            Mobile
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Email Input */}
                    {(mode === "password" || authMethod === "email") && (
                      <View style={styles.inputGroup}>
                        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
                          <Ionicons name="mail" size={20} color={theme.iconColor} style={styles.inputIcon} />
                          <TextInput
                            placeholder="Email address"
                            value={email}
                            onChangeText={setEmail}
                            editable={!(mode === "otp" && otpSent)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={[styles.input, { color: theme.text }]}
                            placeholderTextColor={theme.textSecondary}
                          />
                        </View>
                      </View>
                    )}

                    {/* Mobile Input */}
                    {mode === "otp" && authMethod === "mobile" && (
                      <View style={styles.inputGroup}>
                        <View style={styles.phoneInputRow}>
                          <CountryCodeDropdown
                            selectedCode={countryCode}
                            onSelect={setCountryCode}
                            disabled={otpSent}
                            isDark={isDark}
                          />
                          <View style={[styles.inputContainer, styles.phoneInput, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
                            <Ionicons name="call" size={20} color={theme.iconColor} style={styles.inputIcon} />
                            <TextInput
                              placeholder="Mobile number"
                              value={phone}
                              onChangeText={(t) => setPhone(t.replace(/[^\d]/g, ""))}
                              editable={!otpSent}
                              keyboardType="phone-pad"
                              style={[styles.input, { color: theme.text }]}
                              placeholderTextColor={theme.textSecondary}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Password Input */}
                    {mode === "password" && (
                      <View style={styles.inputGroup}>
                        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
                          <Ionicons name="lock-closed" size={20} color={theme.iconColor} style={styles.inputIcon} />
                          <TextInput
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            style={[styles.input, { color: theme.text }]}
                            placeholderTextColor={theme.textSecondary}
                          />
                          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                            <Ionicons 
                              name={showPassword ? "eye-off" : "eye"} 
                              size={20} 
                              color={theme.iconColor} 
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* OTP Input */}
                    {mode === "otp" && otpSent && (
                      <View style={styles.inputGroup}>
                        <Text style={[styles.otpLabel, { color: theme.text }]}>
                          Enter 6-digit code
                        </Text>
                        <SixDigitOTP
                          disabled={loading}
                          onComplete={setOtp}
                          value={otp}
                          isDark={isDark}
                        />
                      </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                      onPress={handleSubmit}
                      disabled={loading || (mode === "otp" && otpSent && otp.length !== 6)}
                      style={[
                        styles.submitButton,
                        { backgroundColor: (loading || (mode === "otp" && otpSent && otp.length !== 6)) ? '#94a3b8' : theme.activeColor }
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.submitButtonText}>
                            {mode === "password" ? "Sign In" : otpSent ? "Verify & Sign In" : "Send OTP"}
                          </Text>
                          <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Resend Timer */}
                    {mode === "otp" && otpSent && (
                      <View style={styles.resendContainer}>
                        {resendTimer > 0 ? (
                          <Text style={[styles.resendText, { color: theme.textSecondary }]}>
                            Resend code in <Text style={{ color: theme.activeColor, fontWeight: 'bold' }}>{resendTimer}s</Text>
                          </Text>
                        ) : (
                          <TouchableOpacity onPress={requestOtp}>
                            <Text style={[styles.resendLink, { color: theme.activeColor }]}>
                              Resend code
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Divider */}
                    <View style={styles.divider}>
                      <View style={[styles.dividerLine, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} />
                      <Text style={[styles.dividerText, { color: theme.textSecondary }]}>OR</Text>
                      <View style={[styles.dividerLine, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} />
                    </View>

                    {/* Sign Up Link */}
                    <TouchableOpacity 
                      onPress={() => navigation.navigate("Register")}
                      style={styles.signupLink}
                    >
                      <Text style={[styles.signupText, { color: theme.textSecondary }]}>
                        Don't have an account?{" "}
                        <Text style={[styles.signupLinkText, { color: theme.activeColor }]}>
                          Create one
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                </BlurView>

                {/* Footer */}
                <View style={styles.footer}>
                  <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                    By continuing, you agree to our Terms & Privacy Policy
                  </Text>
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardInner: {
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  modeTabActive: {
    backgroundColor: '#2563eb',
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  authMethodContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  authMethodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  authMethodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 4,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  phoneInput: {
    flex: 1,
  },
  countryDropdown: {
    width: 80,
  },
  countryButton: {
    borderRadius: 14,
    borderWidth: 1.5,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  searchInput: {
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
    fontStyle: 'italic',
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    borderWidth: 2,
  },
  otpInputFilled: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
    color: '#1e40af',
  },
  otpInputEmpty: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    color: '#0f172a',
  },
  otpInputEmptyDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    color: '#f1f5f9',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
  },
  signupLink: {
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
  },
  signupLinkText: {
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
