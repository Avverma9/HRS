import './global.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { navigationRef } from './utils/navigation';
import { Provider, useDispatch } from 'react-redux';
import { resetAppState, store } from './store';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Text, View, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AppModalProvider } from './contexts/AppModalContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import ThemedStatusBar from './components/ThemedStatusBar';
import { requestStartupPermissionsIfNeeded } from './utils/startupPermissions';
import { baseURL } from './utils/baseUrl';

import BootScreen from './screens/BootScreen';
import LoginPage from './screens/LoginRN';
import RegisterPage from './screens/Register';
import Home from './screens/Home';
import Cabs from './screens/Cabs';
import Tour from './screens/Tour';
import TourDetails from './screens/TourDetails';
import Hotels from './screens/Hotels';
import HotelDetails from './screens/HotelDetails';
import CabDetails from './screens/CabDetails';
import Profile from './screens/Profile';
import ServerUnavailable from './screens/ServerUnavailable';
import { fetchLocation } from './store/slices/locationSlice';
import { searchHotel, frontHotels } from './store/slices/hotelSlice';
import { getBeds, getRooms } from './store/slices/additionalSlice';
import { fetchProfileData } from './store/slices/userSlice';
import { fetchUserCoupons } from './store/slices/couponSlice';
import { fetchFilteredBooking } from './store/slices/bookingSlice';
import { fetchUserComplaints } from './store/slices/complaintSlice';
import { fetchAllCabs } from './store/slices/cabSlice';
import { fetchTourList, fetchUserTourBookings } from './store/slices/tourSlice';
import { getUserId } from './utils/credentials';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const SearchStack = createNativeStackNavigator();
const HotelStack = createNativeStackNavigator();
const HEALTH_POLL_INTERVAL_MS = 8000;
const HEALTH_TIMEOUT_MS = 5000;

// Professional Tab Bar Component
function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  if (!state?.routes || !descriptors) return null;

  const focusedOptions = descriptors[state.routes[state.index].key]?.options;
  if (focusedOptions?.tabBarStyle?.display === 'none' || focusedOptions?.tabBarVisible === false) {
    return null;
  }
  
  return (
    <View 
      className="bg-white border-t border-gray-200"
      style={{ paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8 }}
    >
      <View className="flex-row justify-around items-center h-16 px-2">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          let label = options.tabBarLabel ?? options.title ?? route.name;
          if (route.name === 'Search') label = 'Home';
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          const color = isFocused ? '#0d3b8f' : '#64748b'; 
          const size = 26; 
          let iconName = "alert-circle";
          switch (route.name) {
            case 'Search': iconName = isFocused ? "home" : "home-outline"; break; // home icon
            case 'HotelsTab': iconName = isFocused ? "bed" : "bed-outline"; break;
            case 'Cabs': iconName = isFocused ? "car" : "car-outline"; break;
            case 'Tour': iconName = isFocused ? "map" : "map-outline"; break;
            case 'Profile': iconName = isFocused ? "person-circle" : "person-circle-outline"; break;
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              className="flex-1 items-center justify-center py-2"
              activeOpacity={0.7}
            >
              <View className="items-center">
                <Ionicons name={iconName} size={size} color={color} />
                <Text 
                  style={{ color }}
                  className="text-[10px] font-medium mt-1"
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SearchStackNavigator() {
  return (
    <SearchStack.Navigator screenOptions={{ headerShown: false }}>
      <SearchStack.Screen name="Home" component={Home} />
      <SearchStack.Screen name="Hotels" component={Hotels} />
      <SearchStack.Screen name="HotelDetails" component={HotelDetails} />
    </SearchStack.Navigator>
  );
}

function HotelStackNavigator() {
  return (
    <HotelStack.Navigator screenOptions={{ headerShown: false }}>
      <HotelStack.Screen name="Hotels" component={Hotels} initialParams={{ showAll: true }} />
      <HotelStack.Screen name="HotelDetails" component={HotelDetails} />
    </HotelStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen
        name="Search"
        component={SearchStackNavigator}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? "Home";
          return {
            title: 'Home',
            tabBarLabel: 'Home',
            tabBarStyle: routeName === "HotelDetails" ? { display: "none" } : undefined,
          };
        }}
      />
      <Tab.Screen
        name="HotelsTab"
        component={HotelStackNavigator}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? "Hotels";
          return {
            title: 'Hotels',
            tabBarLabel: 'Hotels',
            tabBarStyle: routeName === "HotelDetails" ? { display: "none" } : undefined,
          };
        }}
      />
      <Tab.Screen name="Cabs" component={Cabs} options={{ title: 'Cabs' }} />
      <Tab.Screen name="Tour" component={Tour} options={{ title: 'Tours' }} />
      <Tab.Screen name="Profile" component={Profile} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#fff'}}>
      <ActivityIndicator size="large" color="#0d3b8f" />
    </View>
  );
}

function RootNavigator() {
  const [showBoot, setShowBoot] = useState(true);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setShowBoot(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showBoot) return undefined;

    (async () => {
      try {
        await requestStartupPermissionsIfNeeded();
      } catch {
        // Keep app startup non-blocking even if permission request fails.
      }
    })();

    return undefined;
  }, [showBoot]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {showBoot ? (
        <Stack.Screen name="Boot" component={BootScreen} />
      ) : isSignedIn === null ? (
        <Stack.Screen name="Loading" component={LoadingScreen} />
      ) : isSignedIn ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="TourDetails" component={TourDetails} />
          <Stack.Screen name="CabDetails" component={CabDetails} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginPage} />
          <Stack.Screen name="Register" component={RegisterPage} />
        </>
      )}
    </Stack.Navigator>
  );
}

function HealthAwareNavigator() {
  const dispatch = useDispatch();
  const { isSignedIn } = useAuth();

  const [healthStatus, setHealthStatus] = useState("checking");
  const [isRetrying, setIsRetrying] = useState(false);
  const [navigationReloadKey, setNavigationReloadKey] = useState(0);

  const wasServerDownRef = useRef(false);
  const mountedRef = useRef(true);

  const refetchGlobalData = useCallback(async () => {
    dispatch(fetchLocation());
    dispatch(frontHotels());
    dispatch(fetchTourList());
    dispatch(fetchAllCabs());
    dispatch(getBeds());
    dispatch(getRooms());
    dispatch(searchHotel({ page: 1, limit: 50, countRooms: 1 }));

    if (isSignedIn) {
      const userId = await getUserId();
      dispatch(fetchProfileData());
      dispatch(fetchUserCoupons());

      if (userId) {
        dispatch(fetchFilteredBooking({ userId, page: 1, limit: 10 }));
        dispatch(fetchUserTourBookings({ userId, page: 1, limit: 10 }));
        dispatch(fetchUserComplaints({ userId }));
      }
    }
  }, [dispatch, isSignedIn]);

  const handleServerRecovered = useCallback(() => {
    dispatch(resetAppState());
    setNavigationReloadKey((prev) => prev + 1);

    setTimeout(() => {
      if (!mountedRef.current) return;
      void refetchGlobalData();
    }, 60);
  }, [dispatch, refetchGlobalData]);

  const checkHealth = useCallback(
    async ({ isManual = false } = {}) => {
      if (isManual) {
        setIsRetrying(true);
      }

      try {
        const response = await axios.get(`${baseURL}/health`, {
          timeout: HEALTH_TIMEOUT_MS,
        });
        const isHealthy = response?.status >= 200 && response?.status < 300;
        if (!isHealthy) {
          throw new Error("Health check failed");
        }

        if (!mountedRef.current) return false;

        setHealthStatus("up");
        if (wasServerDownRef.current) {
          wasServerDownRef.current = false;
          handleServerRecovered();
        }
        return true;
      } catch {
        if (!mountedRef.current) return false;

        wasServerDownRef.current = true;
        setHealthStatus("down");
        return false;
      } finally {
        if (isManual) {
          setIsRetrying(false);
        }
      }
    },
    [handleServerRecovered]
  );

  useEffect(() => {
    mountedRef.current = true;
    checkHealth({ isManual: true });

    const intervalId = setInterval(() => {
      checkHealth();
    }, HEALTH_POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [checkHealth]);

  if (healthStatus === "down") {
    return (
      <ServerUnavailable
        onRetry={() => checkHealth({ isManual: true })}
        isRetrying={isRetrying}
      />
    );
  }

  if (healthStatus !== "up") {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer key={`nav-${navigationReloadKey}`} ref={navigationRef}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <ThemedStatusBar />
            <AppModalProvider>
              <HealthAwareNavigator />
            </AppModalProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  );
}
