import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      className="bg-white border-t border-gray-200"
      style={{ 
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8 
      }}
    >
      <View className="flex-row justify-around items-center h-16 px-4">
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

          const color = isFocused ? '#2563eb' : '#64748b';

          // Choose icon per route
          const Icon = () => {
            switch (route.name) {
              case 'Cabs':
                return <MaterialCommunityIcons name="car" size={24} color={color} />;
              case 'Holidays':
                return <Ionicons name="sunny" size={24} color={color} />;
              case 'Tour':
                return <FontAwesome5 name="map-marked-alt" size={20} color={color} />;
              default:
                return <MaterialCommunityIcons name="circle" size={24} color={color} />;
            }
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
                <Icon />
                <Text 
                  className={`text-xs mt-1 ${
                    isFocused 
                      ? 'text-blue-600 font-semibold' 
                      : 'text-slate-500 font-normal'
                  }`}
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
