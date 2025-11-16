import { GoogleSignin } from '@react-native-google-signin/google-signin';
import MaterialCommunityIcons from '@react-native-vector-icons/material-community';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { OtpInput } from 'react-native-otp-entry';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LoginScreenProps {
  navigation: any;
}

type AuthMethod = 'password' | 'emailOtp' | 'mobileOtp' | 'google';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  // State for tab selection
  const [activeTab, setActiveTab] = useState<AuthMethod>('password');

  // Password Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Email OTP State
  const [emailOtpEmail, setEmailOtpEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  // Mobile OTP State
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [mobileOtpSent, setMobileOtpSent] = useState(false);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const insets = useSafeAreaInsets();
  const emailOtpRef = useRef(null);
  const mobileOtpRef = useRef(null);

  // Initialize Google Sign-In
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const configureGoogleSignIn = async () => {
    try {
      await GoogleSignin.configure({
        webClientId: 'YOUR_WEB_CLIENT_ID_HERE',
        offlineAccess: true,
        profileImageSize: 120,
      });
    } catch (error) {
      console.log('Google SignIn Config Error:', error);
    }
  };

  // Password Login Handler
  const handlePasswordLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // API call करें यहाँ
      console.log('Login with:', { email, password });
      // Example response
      // const response = await loginWithPassword(email, password);
      Alert.alert('Success', 'Login Successful');
      // navigation.replace('MainApp');
    } catch (error) {
      Alert.alert('Error', 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  // Send Email OTP
  const handleSendEmailOtp = async () => {
    if (!emailOtpEmail.trim()) {
      Alert.alert('Error', 'Please enter email');
      return;
    }

    setLoading(true);
    try {
      // API call
      console.log('Sending OTP to email:', emailOtpEmail);
      setEmailOtpSent(true);
      Alert.alert('Success', 'OTP sent to your email');
      // emailOtpRef.current?.focus();
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    if (!emailOtp.trim()) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }

    setVerifyingOtp(true);
    try {
      // API call
      console.log('Verifying email OTP:', emailOtp);
      Alert.alert('Success', 'Email verified successfully');
      // navigation.replace('MainApp');
    } catch (error) {
      Alert.alert('Error', 'Invalid OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Send Mobile OTP
  const handleSendMobileOtp = async () => {
    if (!mobileNumber.trim() || mobileNumber.length < 10) {
      Alert.alert('Error', 'Please enter valid mobile number');
      return;
    }

    setLoading(true);
    try {
      // API call
      console.log('Sending OTP to mobile:', mobileNumber);
      setMobileOtpSent(true);
      Alert.alert('Success', 'OTP sent to your mobile');
      // mobileOtpRef.current?.focus();
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Verify Mobile OTP
  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp.trim()) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }

    setVerifyingOtp(true);
    try {
      // API call
      console.log('Verifying mobile OTP:', mobileOtp);
      Alert.alert('Success', 'Mobile verified successfully');
      // navigation.replace('MainApp');
    } catch (error) {
      Alert.alert('Error', 'Invalid OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Google Sign In Handler
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      console.log('Google Sign-In Success:', response.data);

      // Send token to backend
      // const backendResponse = await loginWithGoogle(response.data.idToken);
      Alert.alert('Success', `Welcome ${response.data.user.name}`);
      // navigation.replace('MainApp');
    } catch (error: any) {
      if (error.code === 'CANCELED') {
        console.log('Google Sign-In cancelled');
      } else {
        Alert.alert('Error', 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Tab Component
  const TabButton = ({
    method,
    label,
    icon,
  }: {
    method: AuthMethod;
    label: string;
    icon: string;
  }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(method)}
      className={`flex-1 py-3 items-center justify-center border-b-2 ${
        activeTab === method ? 'border-blue-500' : 'border-gray-200'
      }`}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={activeTab === method ? '#3b82f6' : '#9ca3af'}
      />
      <Text
        className={`text-xs mt-1 font-medium ${
          activeTab === method ? 'text-blue-500' : 'text-gray-600'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 20,
          }}
          className="px-6 py-8"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </Text>
            <Text className="text-gray-600">
              Choose your preferred login method
            </Text>
          </View>

          {/* Tab Navigation */}
          <View className="flex-row bg-gray-50 rounded-lg mb-6 overflow-hidden">
            <TabButton
              method="password"
              label="Password"
              icon="lock"
            />
            <TabButton
              method="emailOtp"
              label="Email OTP"
              icon="email"
            />
            <TabButton
              method="mobileOtp"
              label="Mobile OTP"
              icon="phone"
            />
          </View>

          {/* Password Login Tab */}
          {activeTab === 'password' && (
            <View className="mb-6">
              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Email</Text>
                <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-3 border border-gray-200">
                  <MaterialCommunityIcons
                    name="email"
                    size={20}
                    color="#9ca3af"
                  />
                  <TextInput
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    placeholderTextColor="#d1d5db"
                    className="flex-1 ml-3 text-gray-900"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">
                  Password
                </Text>
                <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-3 border border-gray-200">
                  <MaterialCommunityIcons
                    name="lock"
                    size={20}
                    color="#9ca3af"
                  />
                  <TextInput
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#d1d5db"
                    className="flex-1 ml-3 text-gray-900"
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <MaterialCommunityIcons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me & Forgot Password */}
              <View className="flex-row justify-between items-center mb-6">
                <TouchableOpacity className="flex-row items-center">
                  <View className="w-5 h-5 border-2 border-gray-300 rounded mr-2" />
                  <Text className="text-gray-600">Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text className="text-blue-500 font-semibold">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                onPress={handlePasswordLogin}
                disabled={loading}
                className="bg-blue-500 rounded-lg py-4 items-center mb-4"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Login
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Email OTP Tab */}
          {activeTab === 'emailOtp' && (
            <View className="mb-6">
              {!emailOtpSent ? (
                <>
                  {/* Email Input */}
                  <View className="mb-4">
                    <Text className="text-gray-700 font-semibold mb-2">
                      Email Address
                    </Text>
                    <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-3 border border-gray-200">
                      <MaterialCommunityIcons
                        name="email"
                        size={20}
                        color="#9ca3af"
                      />
                      <TextInput
                        placeholder="Enter your email"
                        value={emailOtpEmail}
                        onChangeText={setEmailOtpEmail}
                        keyboardType="email-address"
                        placeholderTextColor="#d1d5db"
                        className="flex-1 ml-3 text-gray-900"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleSendEmailOtp}
                    disabled={loading}
                    className="bg-blue-500 rounded-lg py-4 items-center"
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg">
                        Send OTP
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* OTP Input */}
                  <View className="mb-6">
                    <Text className="text-gray-700 font-semibold mb-4 text-center">
                      Enter 6-digit OTP sent to {'\n'}
                      <Text className="text-blue-500">{emailOtpEmail}</Text>
                    </Text>

                    <OtpInput
                      numberOfDigits={6}
                      onTextChange={(text: string) => setEmailOtp(text)}
                      onFilled={(text: string) => setEmailOtp(text)}
                      focusColor="#3b82f6"
                      autoFocus={true}
                      placeholder="○"
                      theme={{
                        containerStyle: {
                          marginBottom: 24,
                        },
                        pinCodeContainerStyle: {
                          borderRadius: 8,
                          borderWidth: 2,
                          borderColor: '#e5e7eb',
                          backgroundColor: '#f9fafb',
                          paddingVertical: 12,
                        },
                        pinCodeTextStyle: {
                          fontSize: 24,
                          fontWeight: '600',
                          color: '#111827',
                        },
                        focusedPinCodeContainerStyle: {
                          borderColor: '#3b82f6',
                          backgroundColor: '#eff6ff',
                        },
                      }}
                    />
                  </View>

                  {/* Verify Button */}
                  <TouchableOpacity
                    onPress={handleVerifyEmailOtp}
                    disabled={verifyingOtp}
                    className="bg-blue-500 rounded-lg py-4 items-center mb-3"
                  >
                    {verifyingOtp ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg">
                        Verify OTP
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Resend OTP */}
                  <TouchableOpacity
                    onPress={() => {
                      setEmailOtpSent(false);
                      setEmailOtp('');
                    }}
                    className="py-3 items-center"
                  >
                    <Text className="text-blue-500 font-semibold">
                      Send OTP Again
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Mobile OTP Tab */}
          {activeTab === 'mobileOtp' && (
            <View className="mb-6">
              {!mobileOtpSent ? (
                <>
                  {/* Mobile Number Input */}
                  <View className="mb-4">
                    <Text className="text-gray-700 font-semibold mb-2">
                      Mobile Number
                    </Text>
                    <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-3 border border-gray-200">
                      <Text className="text-gray-600 font-semibold mr-2">
                        +91
                      </Text>
                      <TextInput
                        placeholder="Enter 10-digit mobile number"
                        value={mobileNumber}
                        onChangeText={(text: string) =>
                            setMobileNumber(text.replace(/[^0-9]/g, '').slice(0, 10))
                          }
                        keyboardType="numeric"
                        placeholderTextColor="#d1d5db"
                        className="flex-1 text-gray-900"
                        maxLength={10}
                        editable={!loading}
                      />
                    </View>
                    {mobileNumber && (
                      <Text className="text-gray-500 text-xs mt-1">
                        {mobileNumber.length}/10 digits
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={handleSendMobileOtp}
                    disabled={loading || mobileNumber.length < 10}
                    className={`rounded-lg py-4 items-center ${
                      loading || mobileNumber.length < 10
                        ? 'bg-gray-300'
                        : 'bg-blue-500'
                    }`}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg">
                        Send OTP
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* OTP Input */}
                  <View className="mb-6">
                    <Text className="text-gray-700 font-semibold mb-4 text-center">
                      Enter 6-digit OTP sent to {'\n'}
                      <Text className="text-blue-500">+91 {mobileNumber}</Text>
                    </Text>

                    <OtpInput
                      numberOfDigits={6}
                      onTextChange={(text: string) => setMobileOtp(text)}
                      onFilled={(text: string) => setMobileOtp(text)}
                      focusColor="#3b82f6"
                      autoFocus={true}
                      placeholder="○"
                      theme={{
                        containerStyle: {
                          marginBottom: 24,
                        },
                        pinCodeContainerStyle: {
                          borderRadius: 8,
                          borderWidth: 2,
                          borderColor: '#e5e7eb',
                          backgroundColor: '#f9fafb',
                          paddingVertical: 12,
                        },
                        pinCodeTextStyle: {
                          fontSize: 24,
                          fontWeight: '600',
                          color: '#111827',
                        },
                        focusedPinCodeContainerStyle: {
                          borderColor: '#3b82f6',
                          backgroundColor: '#eff6ff',
                        },
                      }}
                    />
                  </View>

                  {/* Verify Button */}
                  <TouchableOpacity
                    onPress={handleVerifyMobileOtp}
                    disabled={verifyingOtp}
                    className="bg-blue-500 rounded-lg py-4 items-center mb-3"
                  >
                    {verifyingOtp ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg">
                        Verify OTP
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Resend OTP */}
                  <TouchableOpacity
                    onPress={() => {
                      setMobileOtpSent(false);
                      setMobileOtp('');
                    }}
                    className="py-3 items-center"
                  >
                    <Text className="text-blue-500 font-semibold">
                      Send OTP Again
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-gray-300" />
            <Text className="mx-3 text-gray-500">OR</Text>
            <View className="flex-1 h-px bg-gray-300" />
          </View>

          {/* Google Sign In Button */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={loading}
            className="flex-row items-center justify-center bg-white border-2 border-gray-300 rounded-lg py-4 mb-6"
          >
            <MaterialCommunityIcons
              name="google"
              size={24}
              color="#db4437"
            />
            <Text className="text-gray-700 font-semibold ml-2 text-lg">
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-gray-600">Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text className="text-blue-500 font-bold">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}