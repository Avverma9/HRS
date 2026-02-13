import './global.css';
import React, { useEffect, useState } from 'react';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { navigationRef } from './utils/navigation';
import { Provider } from 'react-redux';
import { store } from './store';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Text, View, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import ThemedStatusBar from './components/ThemedStatusBar';

import BootScreen from './screens/BootScreen';
import LoginPage from './screens/LoginRN';
import RegisterPage from './screens/Register';
import Home from './screens/Home';
import Cabs from './screens/Cabs';
import Tour from './screens/Tour';
import Hotels from './screens/Hotels';
import HotelDetails from './screens/HotelDetails';
import Profile from './screens/Profile';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const SearchStack = createNativeStackNavigator();

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

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {showBoot ? (
        <Stack.Screen name="Boot" component={BootScreen} />
      ) : isSignedIn === null ? (
        <Stack.Screen name="Loading" component={LoadingScreen} />
      ) : isSignedIn ? (
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginPage} />
          <Stack.Screen name="Register" component={RegisterPage} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <ThemedStatusBar />
            <NavigationContainer ref={navigationRef}>
              <RootNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  );
}
