import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
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
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";

import { baseURL } from "../utils/baseUrl";

const { width, height } = Dimensions.get("window");

const BG_ICONS = [
  "bed-outline",
  "camera-outline",
  "restaurant-outline",
  "airplane-outline",
  "key-outline",
  "business-outline",
];

const getFileNameFromUri = (uri) => {
  if (!uri) return "profile.jpg";
  const parts = uri.split("/");
  return parts[parts.length - 1] || "profile.jpg";
};

const getMimeType = (uri) => {
  const ext = (uri || "").split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
};

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

export default function RegisterPage({ navigation }) {
  const [username, setUsername] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (type, title, message) => {
  };

  const handlePickFile = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file?.uri) return;

      setSelectedImage({
        uri: file.uri,
        name: file.fileName || getFileNameFromUri(file.uri),
        type: file.mimeType || getMimeType(file.uri),
      });
    } catch (err) {
      showToast("error", "Error", "Could not open file picker.");
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !mobile.trim() || !password.trim()) {
      showToast("error", "Error", "Please fill all required fields.");
      return;
    }

    if (password.trim().length < 6) {
      showToast("error", "Error", "Password should be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const generatedUid = `uid_${Date.now()}`;
      const payload = {
        uid: generatedUid,
        userName: username.trim(),
        address: address.trim() || undefined,
        email: email.trim(),
        mobile: mobile.trim(),
        password,
        images: [],
      };

      let response;
      if (selectedImage?.uri) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            formData.append(key, value);
          }
        });

        formData.append("images", {
          uri: selectedImage.uri,
          name: selectedImage.name,
          type: selectedImage.type,
        });

        response = await axios.post(`${baseURL}/Signup`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        response = await axios.post(`${baseURL}/Signup`, payload);
      }

      showToast(
        "success",
        "Success",
        response?.data?.message || "Registration successful. Please sign in."
      );
      navigation.navigate("Login");
    } catch (err) {
      showToast(
        "error",
        "Register Failed",
        err?.response?.data?.message || "Unable to register right now."
      );
    } finally {
      setLoading(false);
    }
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
            <View style={styles.hero}>
              <Text style={styles.brandWordmark}>Hotelroomsstay</Text>
              <Text style={styles.heroTitle}>Welcome to HRS</Text>
              <Text style={styles.heroSubtitle}>Your journey starts here</Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.row}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Your name"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="mail" size={18} color="#94a3b8" style={styles.leadingIcon} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Your email"
                      placeholderTextColor="#9ca3af"
                      style={styles.inputText}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Mobile</Text>
                  <TextInput
                    value={mobile}
                    onChangeText={(val) => setMobile(val.replace(/[^\d]/g, ""))}
                    placeholder="Your mobile"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons
                      name="lock-closed"
                      size={18}
                      color="#94a3b8"
                      style={styles.leadingIcon}
                    />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="........"
                      placeholderTextColor="#9ca3af"
                      style={styles.inputText}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={18}
                        color="#94a3b8"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.addressField}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter address (optional)"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                />
              </View>

              <View style={styles.fileField}>
                <Text style={styles.label}>Profile Picture (Optional)</Text>
                <View style={styles.filePickerWrap}>
                  <TouchableOpacity style={styles.chooseFileButton} onPress={handlePickFile}>
                    <Text style={styles.chooseFileText}>Choose File</Text>
                  </TouchableOpacity>
                  <Text numberOfLines={1} style={styles.fileNameText}>
                    {selectedImage?.name || "No file chosen"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                style={styles.submitTouchable}
              >
                <LinearGradient
                  colors={["#245ecf", "#3b82f6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>Sign Up</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.bottomText}>
                  Already have an account? <Text style={styles.bottomLink}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>
              By continuing, you agree to our Terms & Privacy Policy
            </Text>
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
    backgroundColor: "transparent",
  },
  patternIcon: {
    position: "absolute",
    opacity: 0.18,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    color: "#101828",
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#374151",
  },
  formCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#e8edf3",
    borderWidth: 1.2,
    borderColor: "#d1d9e3",
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: "#334155",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderWidth: 1.2,
    borderColor: "#c7d0dd",
    borderRadius: 11,
    paddingHorizontal: 14,
    backgroundColor: "#f6f8fb",
    color: "#111827",
    fontSize: 15,
  },
  inputWithIcon: {
    height: 50,
    borderWidth: 1.2,
    borderColor: "#c7d0dd",
    borderRadius: 11,
    backgroundColor: "#f6f8fb",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  leadingIcon: {
    marginRight: 8,
  },
  inputText: {
    flex: 1,
    color: "#111827",
    fontSize: 15,
    paddingVertical: 0,
  },
  addressField: {
    marginBottom: 10,
  },
  fileField: {
    marginBottom: 12,
  },
  filePickerWrap: {
    height: 50,
    borderWidth: 1.2,
    borderColor: "#c7d0dd",
    borderRadius: 11,
    backgroundColor: "#f6f8fb",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  chooseFileButton: {
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  chooseFileText: {
    color: "#4f46e5",
    fontSize: 14,
    fontWeight: "700",
  },
  fileNameText: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
  },
  submitTouchable: {
    marginTop: 4,
  },
  submitButton: {
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  bottomText: {
    marginTop: 14,
    textAlign: "center",
    color: "#111827",
    fontSize: 14,
  },
  bottomLink: {
    color: "#111827",
    fontWeight: "800",
  },
  footerText: {
    marginTop: 10,
    textAlign: "center",
    color: "#111827",
    fontSize: 12,
  },
});
