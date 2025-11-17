import './global.css';
import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef, router as navigationRouter } from './utils/navigation';
import { Provider } from 'react-redux';
import { store } from './store';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import ThemedStatusBar from './components/ThemedStatusBar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Text, View, ActivityIndicator, StyleSheet, Platform, TouchableOpacity, Animated } from 'react-native';
import Toast from 'react-native-toast-message';

// Import screen components
import SearchHome from './screens/SearchHome';
import BootScreen from './screens/BootScreen';
import Cabs from './screens/Cabs';
import Holidays from './screens/Holidays';
import Tour from './screens/Tour';
import Hotels from './screens/Hotels';
import LoginPage from './screens/LoginRN';
import RegisterPage from './screens/Register';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import Profile from './screens/Profile';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Simple icon component using text emojis
const TabIcon = ({ emoji, focused, title }) => {
  const { theme } = useTheme();
  return (
    <View className="items-center justify-center">
      <Text className={`text-2xl mb-1 ${focused ? 'opacity-100' : 'opacity-60'}`}>
        {emoji}
      </Text>
      <Text style={{ fontSize: 12, color: focused ? theme.activeColor : theme.textSecondary, fontWeight: focused ? '600' : '400' }}>
        {title}
      </Text>
    </View>
  );
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarShowLabel: false,
        tabBarStyle: { display: 'none' }, // hide native bar since we use custom floating bar
      }}
      tabBar={(props) => <GlassTabBar {...props} />}
    >
      <Tab.Screen
        name="Search"
        component={SearchHome}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="magnify" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Cabs"
        component={Cabs}
        options={{
          headerTitle: 'Book Your Ride',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🚗" focused={focused} title="Cabs" />
          ),
        }}
      />
      <Tab.Screen
        name="Holidays"
        component={Holidays}
        options={{
          headerTitle: 'Holiday Packages',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏖️" focused={focused} title="Holidays" />
          ),
        }}
      />
      <Tab.Screen
        name="Tour"
        component={Tour}
        options={{
          headerTitle: 'Guided Tours',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🗺️" focused={focused} title="Tours" />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" size={size ?? 22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Inline Glass Tab Bar (glassmorphism) — defined here per your request (no separate file)
function GlassTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  // Animated blob x position
  const BLOB_W = 70;
  const itemCenters = useRef([]);
  const blobLeft = useRef(new Animated.Value(0)).current;
  const containerWidth = useRef(0);
  const pillHeight = useRef(0);

  useEffect(() => {
    // animate when index changes and we have measurements
    const c = itemCenters.current[state.index];
    if (typeof c === 'number') {
      Animated.spring(blobLeft, { toValue: c - BLOB_W / 2, useNativeDriver: true, stiffness: 200, damping: 20 }).start();
    }
  }, [state.index]);

  return (
    <View pointerEvents="box-none" style={[pillStyles.wrapper, { bottom: (Platform.OS === 'ios' ? 22 : 12) + insets.bottom }] }>
      <BlurView intensity={95} tint={theme.blurTint} style={pillStyles.blur}>
        <View
          style={[pillStyles.pill, { backgroundColor: theme.pillBg, borderColor: theme.border }]}
          onLayout={(e) => {
            containerWidth.current = e.nativeEvent.layout.width;
            pillHeight.current = e.nativeEvent.layout.height;
          }}
        >
          {/* inner subtle overlay to increase glass depth */}
          <View style={pillStyles.pillInner} pointerEvents="none" />

          {/* animated blob (single element) positioned absolutely and centered vertically */}
          <Animated.View
            pointerEvents="none"
            style={[
              pillStyles.activeBlob,
              { 
                transform: [{ translateX: blobLeft }], 
                position: 'absolute', 
                left: 0, 
                top: (pillHeight.current ? (pillHeight.current - 50) / 2 : 5),
                backgroundColor: theme.activeBg
              },
            ]}
          />

          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            const IconComp = () => {
              // Show icons for all tabs. Use active color when focused.
              const color = isFocused ? theme.activeColor : theme.iconColor;
              const size = 22;
              switch (route.name) {
                case 'Search':
                  return <MaterialCommunityIcons name="magnify" size={size} color={color} />;
                case 'Cabs':
                  return <MaterialCommunityIcons name="car" size={size} color={color} />;
                case 'Holidays':
                  return <Ionicons name="sunny" size={size} color={color} />;
                case 'Tour':
                  return <FontAwesome5 name="map-marked-alt" size={20} color={color} />;
                case 'Profile':
                  return <MaterialCommunityIcons name="account-circle" size={size} color={color} />;
                default:
                  return <MaterialCommunityIcons name="circle" size={size} color={color} />;
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={pillStyles.itemWrap}
                activeOpacity={0.85}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  // store center x (relative to pill)
                  itemCenters.current[index] = x + width / 2;
                  // count measurements and set blob initial position when all items measured
                  if (!itemCenters.current._measured) itemCenters.current._measured = 0;
                  itemCenters.current._measured++;
                  if (itemCenters.current._measured === state.routes.length) {
                    // position blob under current index without animation
                    const c = itemCenters.current[state.index];
                    if (typeof c === 'number') blobLeft.setValue(c - BLOB_W / 2);
                  }
                }}
              >
                <View style={[pillStyles.iconBox, isFocused ? pillStyles.iconBoxActive : { backgroundColor: 'transparent' }]}>
                  <IconComp />
                </View>
                <Text
                  style={[
                    pillStyles.label,
                    { 
                      color: isFocused ? theme.activeColor : theme.textSecondary,
                      fontWeight: isFocused ? '800' : '600',
                      maxWidth: BLOB_W - 10,
                      textAlign: 'center',
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {descriptors[route.key].options.title ?? route.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

// CustomHeader moved into components/Header.jsx

const tabStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 78,
    alignItems: 'center',
  },
  blur: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: 'rgba(37,99,235,0.12)', transform: [{ translateY: -10 }], shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  label: { fontSize: 11, marginTop: 4, color: '#94a3b8' },
  labelActive: { color: '#2563eb', fontWeight: '700' },
});

const pillStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    alignItems: 'center',
  },
  blur: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  pill: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 10,
  },
  itemWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  iconBox: {
    width: 52,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    zIndex: 3,
  },
  iconBoxActive: {
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  activeBlob: {
    position: 'absolute',
    width: 70,
    height: 50,
    borderRadius: 16,
    opacity: 0.95,
    transform: [{ rotate: '-5deg' }],
    zIndex: 0,
  },
  pillInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
    borderWidth: 0,
    borderColor: 'transparent'
  },
  label: { 
    fontSize: 12, 
    marginTop: 2, 
    zIndex: 4,
  },
  labelActive: { 
    fontWeight: '800', 
    fontSize: 12 
  },
});

export default function App() {
  const [showBoot, setShowBoot] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowBoot(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Provider store={store}>
      <AuthProvider>
        <ThemeProvider>
          {showBoot ? <BootScreen /> : <ThemedApp />}
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  );
}

function ThemedApp() {
  const { theme } = useTheme();
  const { isSignedIn } = useAuth();
  
  // while we read storage, show a loading screen
  if (isSignedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
          <NavigationContainer ref={navigationRef}>
          <ThemedStatusBar />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isSignedIn ? (
              // If signed in, don't include the Login screen so user can't go back to it
              <>
                <Stack.Screen name="Home" component={TabNavigator} />
                <Stack.Screen name="Hotels" component={Hotels} />
              </>
            ) : (
              // If not signed in, show Login first, but keep Home so app can navigate after login
              <>
                <Stack.Screen name="Login" component={LoginPage} />
                <Stack.Screen name="Register" component={RegisterPage} />
                <Stack.Screen name="Home" component={TabNavigator} />
                <Stack.Screen name="Hotels" component={Hotels} />
              </>
            )}
          </Stack.Navigator>
          <Toast />
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}
