import './global.css';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './utils/navigation';
import { Provider } from 'react-redux';
import { store } from './store';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import ThemedStatusBar from './components/ThemedStatusBar';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Text, View, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import Toast from 'react-native-toast-message';

// Import screen components
import Home from './screens/Home';
import BootScreen from './screens/BootScreen';
import Cabs from './screens/Cabs';
import Holidays from './screens/Holidays';
import Tour from './screens/Tour';
import Hotels from './screens/Hotels';
import HotelDetails from './screens/HotelDetails';
import LoginPage from './screens/LoginRN';
import RegisterPage from './screens/Register';
import Profile from './screens/Profile';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Professional Tab Bar Component
function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  
  return (
    <View 
      className="bg-white border-t border-gray-200"
      style={{ 
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8 
      }}
    >
      <View className="flex-row justify-around items-center h-16 px-2">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

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
            navigation.emit({ 
              type: 'tabLongPress', 
              target: route.key 
            });
          };

          // Active color matches the Header's brand blue
          const color = isFocused ? '#0d3b8f' : '#64748b'; 

          // Icon component per route using only Ionicons
          const IconComp = () => {
            const size = 26; // Slightly larger for better visibility
            let iconName = "alert-circle";

            switch (route.name) {
              case 'Search':
                // Image: Magnifying glass
                iconName = isFocused ? "search" : "search-outline";
                break;
              case 'Cabs':
                // Image: Car (Front view logic: Ionicons 'car' is side, 'car-sport' is side. 
                // Closest in Ionicons is 'car' or 'bus' for front, but sticking to 'car' for semantic match)
                 iconName = isFocused ? "car" : "car-outline";
                break;
              case 'Holidays':
                // Image: Sun
                iconName = isFocused ? "sunny" : "sunny-outline";
                break;
              case 'Tour':
                // Image: Map
                iconName = isFocused ? "map" : "map-outline";
                break;
              case 'Profile':
                // Image: Person in circle
                iconName = isFocused ? "person-circle" : "person-circle-outline";
                break;
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          };

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
                <IconComp />
                <Text 
                  style={{ color: color }}
                  className={`text-[10px] font-medium mt-1`}
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

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen
        name="Search"
        component={Home}
        options={{
          title: 'Search',
        }}
      />
      <Tab.Screen
        name="Cabs"
        component={Cabs}
        options={{
          title: 'Cabs',
          headerTitle: 'Book Your Ride',
        }}
      />
      <Tab.Screen
        name="Holidays"
        component={Holidays}
        options={{
          title: 'Holidays',
          headerTitle: 'Holiday Packages',
        }}
      />
      <Tab.Screen
        name="Tour"
        component={Tour}
        options={{
          title: 'Tours',
          headerTitle: 'Guided Tours',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [showBoot, setShowBoot] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowBoot(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Provider store={store}>
      <AuthProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <NavigationContainer ref={navigationRef}>
              <ThemedStatusBar />
              {showBoot ? (
                <BootScreen />
              ) : (
                <ThemedApp />
              )}
              <Toast />
            </NavigationContainer>
          </SafeAreaProvider>
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  );
}

function ThemedApp() {
  const { theme } = useTheme();
  const { isSignedIn } = useAuth();
  
  // Show loading screen while checking auth status
  if (isSignedIn === null) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isSignedIn ? (
        // Authenticated routes
        <>
          <Stack.Screen name="Home" component={TabNavigator} />
          <Stack.Screen name="Hotels" component={Hotels} />
          <Stack.Screen name="HotelDetails" component={HotelDetails} />
        </>
      ) : (
        // Unauthenticated routes
        <>
          <Stack.Screen name="Login" component={LoginPage} />
          <Stack.Screen name="Register" component={RegisterPage} />
          <Stack.Screen name="Home" component={TabNavigator} />
          <Stack.Screen name="Hotels" component={Hotels} />
          <Stack.Screen name="HotelDetails" component={HotelDetails} />
        </>
      )}
    </Stack.Navigator>
  );
}
