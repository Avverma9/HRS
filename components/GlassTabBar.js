import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GlassTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrapper, { bottom: (Platform.OS === 'ios' ? 28 : 20) + insets.bottom }]} pointerEvents="box-none">
      <BlurView intensity={80} tint="light" style={styles.blur}>
        <View style={styles.container}>
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
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

            const color = isFocused ? '#2563eb' : '#94a3b8';

            // choose icon per route
            const Icon = () => {
              switch (route.name) {
                case 'Cabs':
                  return <MaterialCommunityIcons name="car" size={22} color={color} />;
                case 'Holidays':
                  return <Ionicons name="sunny" size={20} color={color} />;
                case 'Tour':
                  return <FontAwesome5 name="map-marked-alt" size={18} color={color} />;
                default:
                  return <MaterialCommunityIcons name="circle" size={20} color={color} />;
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
                style={styles.tabButton}
                activeOpacity={0.85}
              >
                <View style={[styles.iconWrap, isFocused ? styles.iconWrapActive : null]}>
                  <Icon />
                </View>
                {/* show label only for active tab to keep UI minimal */}
                {isFocused && <Text style={[styles.label, styles.labelActive]}>{label}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 88,
    alignItems: 'center',
  },
  blur: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapActive: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: 'rgba(37,99,235,0.18)',
    transform: [{ translateY: -12 }],
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 12,
  },
  label: {
    fontSize: 11,
    marginTop: 4,
    color: '#94a3b8',
  },
  labelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
